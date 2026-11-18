#!/usr/bin/env node
// test-intake-pipeline.mjs — Cross-platform unit + protocol + E2E tests for:
//   Bloque 3 · Paso 1: Net KPI (saved - corrections), Studio edits, PowerGovernor, wake, visibility polling
//   Bloque 3 · Paso 2: IMAP4rev1 incremental UID/UIDVALIDITY (BODY.PEEK), Fanal-Inbox watcher/dedupe,
//                      VoIP/SMS noise-filter bypass, Reprise Matinale, encrypted IMAP storage.
// Created by J.Franco. MIT license. Node >= 24 builtins only.

import assert from "node:assert/strict";
import net from "node:net";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import crypto from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const req = createRequire(import.meta.url);

const powerKpi = req(path.join(ROOT, "supervisor", "power-kpi.js"));
const intake = req(path.join(ROOT, "supervisor", "intake-engine.js"));
const brainCatalog = req(path.join(ROOT, "supervisor", "brain-catalog.js"));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function getFreePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.unref();
    s.on("error", reject);
    s.listen(0, "127.0.0.1", () => {
      const addr = s.address();
      const port = addr && typeof addr === "object" ? addr.port : 0;
      s.close(() => resolve(port));
    });
  });
}

async function waitForHttp(baseUrl, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(baseUrl + "/api/setup-status");
      if (r.ok) return;
    } catch {}
    await sleep(150);
  }
  throw new Error("Supervisor failed to start within " + timeoutMs + "ms");
}

function createMockImapServer() {
  let uidValidity = 1001;
  let messages = [];
  const seenCommands = [];

  const server = net.createServer((sock) => {
    sock.write("* OK [CAPABILITY IMAP4rev1 AUTH=PLAIN] Mock Fanal IMAP ready\r\n");
    let buf = "";
    sock.on("data", (chunk) => {
      buf += chunk.toString("utf8");
      while (buf.includes("\n")) {
        const idx = buf.indexOf("\n");
        const rawLine = buf.slice(0, idx).replace(/\r$/, "");
        buf = buf.slice(idx + 1);
        if (!rawLine.trim()) continue;
        seenCommands.push(rawLine);

        const sp = rawLine.indexOf(" ");
        if (sp < 0) continue;
        const tag = rawLine.slice(0, sp);
        const rest = rawLine.slice(sp + 1);
        const upper = rest.toUpperCase();

        if (upper.startsWith("LOGIN ")) {
          sock.write(`${tag} OK LOGIN completed\r\n`);
        } else if (upper.startsWith("EXAMINE ")) {
          const maxUid = messages.reduce((m, x) => Math.max(m, x.uid), 0);
          sock.write(`* ${messages.length} EXISTS\r\n`);
          sock.write(`* OK [UIDVALIDITY ${uidValidity}] UIDs valid\r\n`);
          sock.write(`* OK [UIDNEXT ${maxUid + 1}] Predicted next UID\r\n`);
          sock.write(`${tag} OK [READ-ONLY] EXAMINE completed\r\n`);
        } else if (upper.startsWith("UID SEARCH ")) {
          let filtered = messages.map((m) => m.uid);
          const mRange = /UID\s+(\d+):(\*|\d+)/i.exec(rest);
          if (mRange) {
            const minU = Number(mRange[1]);
            const maxU = mRange[2] === "*" ? Infinity : Number(mRange[2]);
            filtered = filtered.filter((u) => u >= minU && u <= maxU);
          }
          sock.write(`* SEARCH${filtered.length ? " " + filtered.join(" ") : ""}\r\n`);
          sock.write(`${tag} OK UID SEARCH completed\r\n`);
        } else if (upper.startsWith("UID FETCH ")) {
          const uidMatch = /^UID FETCH\s+(\d+)/i.exec(rest);
          const targetUid = uidMatch ? Number(uidMatch[1]) : 0;
          const msg = messages.find((m) => m.uid === targetUid);
          if (!msg) {
            sock.write(`${tag} OK UID FETCH completed (empty)\r\n`);
            continue;
          }
          const hdrBuf = Buffer.from(msg.headers + "\r\n", "utf8");
          const bodyBuf = Buffer.from(msg.body, "utf8");
          sock.write(
            `* 1 FETCH (UID ${msg.uid} INTERNALDATE "14-Nov-2026 09:30:00 -0500" BODY[HEADER.FIELDS (FROM TO SUBJECT DATE MESSAGE-ID LIST-UNSUBSCRIBE PRECEDENCE AUTO-SUBMITTED CONTENT-TYPE CONTENT-TRANSFER-ENCODING)] {${hdrBuf.length}}\r\n`
          );
          sock.write(hdrBuf);
          sock.write(` BODY[TEXT]<0> {${bodyBuf.length}}\r\n`);
          sock.write(bodyBuf);
          sock.write(`)\r\n${tag} OK UID FETCH completed\r\n`);
        } else if (upper === "LOGOUT") {
          sock.write(`* BYE Fanal Mock IMAP closing\r\n${tag} OK LOGOUT completed\r\n`);
          sock.end();
        } else {
          sock.write(`${tag} BAD Unsupported test command\r\n`);
        }
      }
    });
  });

  return {
    start: () =>
      new Promise((resolve) => {
        server.listen(0, "127.0.0.1", () => {
          const addr = server.address();
          resolve(typeof addr === "object" ? addr.port : 0);
        });
      }),
    stop: () => new Promise((resolve) => server.close(() => resolve())),
    setMailbox(nextUidValidity, nextMessages) {
      uidValidity = nextUidValidity;
      messages = [...nextMessages];
    },
    getCommands: () => [...seenCommands],
  };
}

async function runUnitTests() {
  // 1. Net KPI calculation (positive, edited, negative verdict, zero double counting)
  const tel = powerKpi.ensureTelemetryTotals({
    actions: [{ tier: "GREEN", what: "Répondant read the visible conversation (gmail.com)" }],
  });
  let sum = powerKpi.computeNetKpiSummary(tel);
  assert.equal(sum.productiveSecs, 30);
  assert.equal(sum.correctiveSecs, 0);
  assert.equal(sum.netSavedSecs, 30);
  assert.equal(sum.verdict, "positive");

  // Re-normalizing must never double-count backfilled actions
  const tel2 = powerKpi.ensureTelemetryTotals(tel);
  assert.equal(powerKpi.computeNetKpiSummary(tel2).productiveSecs, 30);

  // Studio approval with human edit subtracts correctionSecs cleanly WITHOUT penalizing ok / successRate
  const telEditOnly = powerKpi.ensureTelemetryTotals({});
  powerKpi.recordKpiOutcome(telEditOnly, { kind: "task_approved", edited: true, correctionSecs: 90, savedSecs: 240 });
  const editOnlySum = powerKpi.computeNetKpiSummary(telEditOnly);
  assert.equal(editOnlySum.tasks, 1);
  assert.equal(editOnlySum.ok, 1, "Edited and approved task must still count as succeeded (ok=1)");
  assert.equal(editOnlySum.successRate, 100, "Success rate must stay 100% when edited draft is approved");
  assert.equal(editOnlySum.editedCount, 1);
  assert.equal(editOnlySum.corrections, 1);
  assert.equal(editOnlySum.netSavedSecs, 150);

  powerKpi.recordKpiOutcome(tel, { kind: "task_approved", edited: true, correctionSecs: 90, savedSecs: 240 });
  sum = powerKpi.computeNetKpiSummary(tel);
  assert.equal(sum.productiveSecs, 270);
  assert.equal(sum.correctiveSecs, 90);
  assert.equal(sum.netSavedSecs, 180);
  assert.equal(sum.editedCount, 1);
  assert.equal(sum.corrections, 1);

  // Multiple dismissed drafts push net KPI honestly negative
  for (let i = 0; i < 3; i++) {
    powerKpi.recordKpiOutcome(tel, { kind: "task_dismissed", correctionSecs: 120 });
  }
  sum = powerKpi.computeNetKpiSummary(tel);
  assert.equal(sum.correctiveSecs, 450);
  assert.equal(sum.netSavedSecs, 270 - 450);
  assert.equal(sum.verdict, "negative");
  assert.equal(sum.dismissedCount, 3);

  // 2. PowerGovernor sleep/wake & battery saver logic
  let fakeClock = 1000000;
  const gov = powerKpi.createPowerGovernor({ now: () => fakeClock, batterySaver: true });
  assert.equal(gov.shouldDeferBackgroundCompute({ manual: false }).defer, false);
  gov.onSleep("suspend");
  assert.deepEqual(gov.shouldDeferBackgroundCompute({ manual: false }), {
    defer: true,
    reason: "sleeping",
  });
  assert.equal(gov.shouldDeferBackgroundCompute({ manual: true }).defer, false);
  fakeClock += 28800000; // 8 hours sleep
  const wakeEvt = gov.onWake("os_resume");
  assert.equal(wakeEvt.sleepDurationMs, 28800000);
  assert.equal(wakeEvt.state.wakeCount, 1);

  gov.onPowerChange({ onBattery: true });
  assert.deepEqual(gov.shouldDeferBackgroundCompute({ manual: false }), {
    defer: true,
    reason: "battery_saver",
  });
  assert.equal(gov.shouldDeferBackgroundCompute({ manual: true }).defer, false);
  gov.onPowerChange({ onBattery: false });
  assert.equal(gov.shouldDeferBackgroundCompute({ manual: false }).defer, false);

  // 3. Crypto seal/unseal of IMAP password & public masking
  const masterKey = crypto.randomBytes(32).toString("hex");
  const plainSettings = {
    apiKey: "sk-test-1234",
    intake: { imap: { enabled: true, host: "imap.example.ca", port: 993, user: "info@example.ca", password: "AppPassword!99" } },
  };
  const sealed = brainCatalog.sealSettingsObject(plainSettings, masterKey);
  assert.ok(sealed.intake.imap.password.startsWith("AESGCM2:"), "IMAP password must be sealed at rest");
  assert.equal(plainSettings.intake.imap.password, "AppPassword!99", "caller object must not be mutated");
  const unsealed = brainCatalog.unsealSettingsObject(sealed, masterKey);
  assert.equal(unsealed.intake.imap.password, "AppPassword!99");
  const masked = intake.maskImapConfigPublic(unsealed.intake.imap);
  assert.equal(masked.configured, true);
  assert.equal(masked.hasPassword, true);
  assert.equal("password" in masked, false, "public masked config must never include raw password");

  // 4. Noise filter + VoIP/SMS protection + priority scoring
  const newsletter = intake.classifyIntakeItem({
    source: "email_imap",
    from: "no-reply@promo-blast.example.com",
    subject: "50% off weekly catalog",
    body: "Unsubscribe anytime at our website.",
    headers: { "list-unsubscribe": "<mailto:unsub@promo-blast.example.com>" },
  });
  assert.equal(newsletter.accepted, false);
  assert.equal(newsletter.filteredReason, "newsletter_list_unsubscribe");

  const voipForward = intake.classifyIntakeItem({
    source: "email_imap",
    from: "noreply@gateway.voip.ms",
    subject: "New Voicemail from +15145550144 (0:25)",
    body: "Transcript: Bonjour, je veux réserver pour vendredi soir pour 4 personnes.",
    headers: { "list-unsubscribe": "" },
  });
  assert.equal(voipForward.accepted, true, "VoIP/SMS forwarding must bypass generic noreply filter");
  assert.equal(voipForward.priority, "YELLOW");

  const urgentLegal = intake.classifyIntakeItem({
    source: "email_imap",
    from: "client@example.ca",
    subject: "URGENT: Mise en demeure reçue",
    body: "Merci de nous rappeler aujourd'hui avant 17h.",
  });
  assert.equal(urgentLegal.accepted, true);
  assert.equal(urgentLegal.priority, "RED");

  // 5. IMAP4rev1 Mock Protocol test (UID incremental, RFC 2047 UTF-8, BODY.PEEK read-only, UIDVALIDITY reset)
  const mockImap = createMockImapServer();
  const imapPort = await mockImap.start();
  try {
    mockImap.setMailbox(1001, [
      {
        uid: 41,
        headers:
          "From: =?UTF-8?B?UmVuw6kgVHJlbmJsYXk=?= <rene@example.ca>\r\n" +
          "Subject: =?UTF-8?Q?R=C3=A9servation_urgente_demain?=\r\n" +
          "Content-Type: text/plain; charset=utf-8",
        body: "Bonjour, c'est urgent pour demain matin.",
      },
      {
        uid: 42,
        headers:
          "From: shop@newsletter.example\r\nSubject: Big Weekend Sale\r\nList-Unsubscribe: <mailto:off@newsletter.example>\r\nContent-Type: text/html; charset=utf-8",
        body: "<p>Promo <b>20%</b> click here</p>",
      },
    ]);

    const res1 = await intake.fetchImapIncremental({
      host: "127.0.0.1",
      port: imapPort,
      tls: false,
      user: "owner@example.ca",
      password: "mockpass",
      lastUid: 0,
      uidValidity: 0,
    });
    assert.equal(res1.uidValidity, 1001);
    assert.equal(res1.lastUid, 42);
    assert.equal(res1.messages.length, 2);
    assert.ok(res1.messages[0].from.includes("René"), "RFC 2047 UTF-8 Base64 header must decode");
    assert.ok(res1.messages[0].subject.includes("Réservation"), "RFC 2047 Quoted-Printable header must decode");
    assert.ok(res1.messages[1].body.includes("Promo 20%"), "HTML snippet must be stripped cleanly");

    const cmds = mockImap.getCommands().join("\n");
    assert.ok(cmds.includes("EXAMINE "), "Must open mailbox read-only with EXAMINE");
    assert.ok(cmds.includes("BODY.PEEK["), "Must use BODY.PEEK to preserve unseen flags");
    assert.equal(/\bSTORE\b/i.test(cmds), false, "Must NEVER issue STORE commands");

    // Second incremental sync with no new mail returns 0 messages
    const res2 = await intake.fetchImapIncremental({
      host: "127.0.0.1",
      port: imapPort,
      tls: false,
      user: "owner@example.ca",
      password: "mockpass",
      lastUid: res1.lastUid,
      uidValidity: 1001,
    });
    assert.equal(res2.messages.length, 0);
    assert.equal(res2.lastUid, 42);

    // Append UID 43 -> third sync fetches ONLY UID 43
    mockImap.setMailbox(1001, [
      { uid: 41, headers: "From: a@b.c\r\nSubject: Old", body: "old" },
      { uid: 42, headers: "From: a@b.c\r\nSubject: Old2", body: "old2" },
      { uid: 43, headers: "From: client@qc.ca\r\nSubject: Devis SDB", body: "Bonjour, quel est votre prix?" },
    ]);
    const res3 = await intake.fetchImapIncremental({
      host: "127.0.0.1",
      port: imapPort,
      tls: false,
      user: "owner@example.ca",
      password: "mockpass",
      lastUid: res2.lastUid,
      uidValidity: 1001,
    });
    assert.equal(res3.messages.length, 1);
    assert.equal(res3.messages[0].uid, 43);

    // UIDVALIDITY change forces clean cursor reset
    mockImap.setMailbox(2002, [
      { uid: 1, headers: "From: new@qc.ca\r\nSubject: Reset folder", body: "Fresh UID sequence" },
    ]);
    const res4 = await intake.fetchImapIncremental({
      host: "127.0.0.1",
      port: imapPort,
      tls: false,
      user: "owner@example.ca",
      password: "mockpass",
      lastUid: 43,
      uidValidity: 1001,
    });
    assert.equal(res4.uidValidityReset, true);
    assert.equal(res4.uidValidity, 2002);
    assert.equal(res4.messages.length, 1);
    assert.equal(res4.messages[0].uid, 1);

    // Incremental batching when >maxMessages arrive after cursor must process oldest-first without skipping
    mockImap.setMailbox(2002, [
      { uid: 1, headers: "From: a@b.c\r\nSubject: First", body: "one" },
      { uid: 2, headers: "From: a@b.c\r\nSubject: Batch1-A", body: "two" },
      { uid: 3, headers: "From: a@b.c\r\nSubject: Batch1-B", body: "three" },
      { uid: 4, headers: "From: a@b.c\r\nSubject: Batch2-A", body: "four" },
      { uid: 5, headers: "From: a@b.c\r\nSubject: Batch2-B", body: "five" },
      { uid: 6, headers: "From: a@b.c\r\nSubject: Batch3-A", body: "six" },
    ]);
    const b1 = await intake.fetchImapIncremental({ host: "127.0.0.1", port: imapPort, tls: false, user: "o@e.ca", password: "p", lastUid: 1, uidValidity: 2002, maxMessages: 2 });
    assert.deepEqual(b1.messages.map((m) => m.uid), [2, 3]);
    assert.equal(b1.lastUid, 3);
    const b2 = await intake.fetchImapIncremental({ host: "127.0.0.1", port: imapPort, tls: false, user: "o@e.ca", password: "p", lastUid: b1.lastUid, uidValidity: 2002, maxMessages: 2 });
    assert.deepEqual(b2.messages.map((m) => m.uid), [4, 5]);
    assert.equal(b2.lastUid, 5);
    const b3 = await intake.fetchImapIncremental({ host: "127.0.0.1", port: imapPort, tls: false, user: "o@e.ca", password: "p", lastUid: b2.lastUid, uidValidity: 2002, maxMessages: 2 });
    assert.deepEqual(b3.messages.map((m) => m.uid), [6]);
    assert.equal(b3.lastUid, 6);

    // Multipart VoIP voicemail (.mp3 base64) attachment extraction via IMAP (without dropping text transcript)
    const mp3B64 = Buffer.from("ID3_FAKE_MP3_VOICEMAIL_PAYLOAD_FOR_TESTING_0123456789").toString("base64");
    mockImap.setMailbox(3003, [
      {
        uid: 10,
        headers:
          "From: pbx@voip.ms\r\n" +
          "Subject: New Voicemail +14185550199\r\n" +
          'Content-Type: multipart/mixed; boundary="FANALMIX1"',
        body:
          "--FANALMIX1\r\n" +
          "Content-Type: text/plain; charset=utf-8\r\n\r\n" +
          "Message vocal entrant pour reservation samedi.\r\n" +
          "--FANALMIX1\r\n" +
          'Content-Type: audio/mpeg; name="msg-102.mp3"\r\n' +
          'Content-Disposition: attachment; filename="msg-102.mp3"\r\n' +
          "Content-Transfer-Encoding: base64\r\n\r\n" +
          mp3B64 + "\r\n" +
          "--FANALMIX1--\r\n",
      },
    ]);
    const resVoipAudio = await intake.fetchImapIncremental({ host: "127.0.0.1", port: imapPort, tls: false, user: "o@e.ca", password: "p", lastUid: 0, uidValidity: 3003 });
    assert.equal(resVoipAudio.messages.length, 1);
    assert.ok(resVoipAudio.messages[0].body.includes("Message vocal entrant"));
    assert.ok(resVoipAudio.messages[0].mediaAttachment, "Multipart .mp3 attachment must be extracted");
    assert.equal(resVoipAudio.messages[0].mediaAttachment.hardwareOrigin, "voip_voicemail");
    assert.equal(resVoipAudio.messages[0].mediaAttachment.mimeType, "audio/mp3");
    assert.equal(resVoipAudio.messages[0].mediaAttachment.filename, "msg-102.mp3");
  } finally {
    await mockImap.stop();
  }

  // 6. Folder watcher hardware adapters: ADF scanner PDF + POS Z-report CSV in Fanal-Inbox
  const hwTmp = fs.mkdtempSync(path.join(os.tmpdir(), "fanal-hw-inbox-"));
  const hwDataDir = path.join(hwTmp, "data");
  const hwInbox = path.join(hwDataDir, "fanal-inbox");
  fs.mkdirSync(hwInbox, { recursive: true });
  try {
    fs.writeFileSync(path.join(hwInbox, "facture-scanner.pdf"), "%PDF-1.4\n1 0 obj<<>>endobj\n%%EOF\n");
    fs.writeFileSync(path.join(hwInbox, "rapport-z-caisse.csv"), "date,total_sales,tps,tvq\n2026-11-15,980.00,49.00,97.76\n");
    const dispatched = [];
    const eng = intake.createIntakeEngine({
      dataDir: hwDataDir,
      getSettings: () => ({ intake: { imap: { enabled: false }, folder: { enabled: true } } }),
      powerGovernor: { shouldDeferBackgroundCompute: () => ({ defer: false, reason: null }) },
      onDispatchItem: async (item) => {
        dispatched.push(item);
        return { taskId: "t_hw_" + dispatched.length };
      },
    });
    const scanOut = await eng.syncNow({ reason: "hardware-test", manual: true });
    assert.equal(scanOut.arrivedCount, 2, "Expected PDF scan + POS Z CSV to enqueue from Fanal-Inbox");
    const pdfItem = dispatched.find((x) => x.hardwareMeta && x.hardwareMeta.hardwareOrigin === "scanner_adf");
    const csvItem = dispatched.find((x) => x.hardwareMeta && x.hardwareMeta.hardwareOrigin === "pos_z_csv");
    assert.ok(pdfItem, "ADF PDF scan must tag hardwareOrigin=scanner_adf");
    assert.equal(pdfItem.hardwareMeta.mimeType, "application/pdf");
    assert.ok(csvItem, "POS Z CSV must tag hardwareOrigin=pos_z_csv");
    assert.equal(csvItem.hardwareMeta.mimeType, "text/csv");
  } finally {
    fs.rmSync(hwTmp, { recursive: true, force: true });
  }
}

async function runHttpE2ETests() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fanal-intake-e2e-"));
  const dataDir = path.join(tmpDir, "data");
  const inboxDir = path.join(tmpDir, "Fanal-Inbox");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(inboxDir, { recursive: true });

  const port = await getFreePort();
  const internalToken = crypto.randomBytes(24).toString("hex");
  const masterKey = crypto.randomBytes(32).toString("hex");
  const baseUrl = `http://127.0.0.1:${port}`;

  // Seed owner user cleanly
  const initRes = spawnSync(
    process.execPath,
    [path.join(ROOT, "supervisor", "server.js"), "init", "--owner", "javier", "--password", "OwnerPass!234"],
    {
      cwd: ROOT,
      env: { ...process.env, DSH_SUPERVISOR_DATA: dataDir },
      encoding: "utf8",
      timeout: 15000,
    }
  );
  assert.equal(initRes.status, 0, "server.js init failed: " + (initRes.stderr || initRes.stdout));

  const mockImap = createMockImapServer();
  const imapPort = await mockImap.start();
  mockImap.setMailbox(5500, [
    {
      uid: 10,
      headers: "From: Marie Gagnon <marie@client.ca>\r\nSubject: Urgent dossier fiscal\r\nContent-Type: text/plain; charset=utf-8",
      body: "URGENT: J'ai reçu une mise en demeure de Revenu Québec aujourd'hui.",
    },
    {
      uid: 11,
      headers: "From: no-reply@ads.example\r\nSubject: Weekly digest\r\nList-Unsubscribe: <mailto:off@ads.example>",
      body: "Buy our stuff now",
    },
  ]);

  const srv = spawn(process.execPath, [path.join(ROOT, "supervisor", "server.js")], {
    cwd: ROOT,
    env: {
      ...process.env,
      DSH_SUPERVISOR_DATA: dataDir,
      DSH_SUPERVISOR_PORT: String(port),
      FANAL_INTERNAL_TOKEN: internalToken,
      FANAL_MASTER_KEY: masterKey,
    },
    stdio: "pipe",
  });

  let srvErr = "";
  srv.stderr.on("data", (d) => { srvErr += d.toString(); });
  srv.on("exit", (code, sig) => {
    if (code && code !== 0) console.error("SUPERVISOR EXIT", code, sig, srvErr);
  });

  try {
    await waitForHttp(baseUrl);

    // Verify CSRF guard cleanly rejects missing X-Fanal-Csrf without crashing server
    const csrfBlocked = await fetch(baseUrl + "/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: "javier", password: "OwnerPass!234" }),
    });
    assert.equal(csrfBlocked.status, 403, "Missing X-Fanal-Csrf header must return 403 without crashing");

    // Owner login
    const loginRes = await fetch(baseUrl + "/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Fanal-Csrf": "1" },
      body: JSON.stringify({ user: "javier", password: "OwnerPass!234" }),
    }).then((r) => r.json());
    assert.ok(loginRes.token, "Owner login must succeed");
    const authHeaders = {
      "Content-Type": "application/json",
      "X-Fanal-Csrf": "1",
      Authorization: "Bearer " + loginRes.token,
    };

    // Unauthenticated access to internal endpoints is blocked
    const unauthWake = await fetch(baseUrl + "/api/system/wake", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Fanal-Csrf": "1" },
      body: JSON.stringify({ reason: "attacker" }),
    });
    assert.equal(unauthWake.status, 403, "Unauthenticated /api/system/wake must fail 403");

    // Configure mock IMAP + custom Fanal-Inbox via owner API
    const cfgRes = await fetch(baseUrl + "/api/intake/config", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        imap: {
          enabled: true,
          host: "127.0.0.1",
          port: imapPort,
          tls: false,
          user: "javier@trasunto.ca",
          password: "TopSecretImapPassword!1",
          mailbox: "INBOX",
        },
        folder: { enabled: true, path: inboxDir },
        batterySaver: true,
      }),
    }).then((r) => r.json());
    assert.equal(cfgRes.ok, true);
    assert.equal(cfgRes.imap.configured, true);
    assert.equal(cfgRes.imap.hasPassword, true);
    assert.equal("password" in cfgRes.imap, false, "API response must never leak raw IMAP password");

    // Verify password is encrypted at rest on disk
    const settingsDisk = fs.readFileSync(path.join(dataDir, "settings.json"), "utf8");
    assert.equal(settingsDisk.includes("TopSecretImapPassword!1"), false, "Disk settings.json must seal IMAP password");
    assert.ok(settingsDisk.includes("AESGCM2:"), "Disk settings.json must store AESGCM2: ciphertext");

    // Updating non-password IMAP field preserves existing password
    const cfgKeepPw = await fetch(baseUrl + "/api/intake/config", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ imap: { mailbox: "INBOX" } }),
    }).then((r) => r.json());
    assert.equal(cfgKeepPw.imap.hasPassword, true);

    // Drop a valid client .txt + an ignored .tmp file into Fanal-Inbox
    fs.writeFileSync(path.join(inboxDir, "note-client.txt"), "Demande de soumission toiture — Jean Caron", "utf8");
    fs.writeFileSync(path.join(inboxDir, "~$draft.tmp"), "temporary lock noise", "utf8");
    fs.writeFileSync(path.join(inboxDir, ".DS_Store"), "mac metadata", "utf8");

    // Startup app_ready while already awake must NOT bump wakeCount
    const readyPowerRes = await fetch(baseUrl + "/api/system/power", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Fanal-Csrf": "1", "X-Fanal-Internal": internalToken },
      body: JSON.stringify({ sleeping: false, reason: "app_ready" }),
    }).then((r) => r.json());
    assert.equal(readyPowerRes.power.state, "awake");
    assert.equal(readyPowerRes.power.wakeCount, 0, "app_ready while awake must not inflate wakeCount");

    // Desktop sleep notification (via FANAL_INTERNAL_TOKEN)
    const sleepRes = await fetch(baseUrl + "/api/system/power", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Fanal-Csrf": "1", "X-Fanal-Internal": internalToken },
      body: JSON.stringify({ sleeping: true, reason: "suspend" }),
    }).then((r) => r.json());
    assert.equal(sleepRes.power.state, "sleeping");

    // Morning wake triggers Reprise Matinale catch-up (IMAP + Fanal-Inbox, filtered spam)
    const wakeRes = await fetch(baseUrl + "/api/system/wake", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Fanal-Csrf": "1", "X-Fanal-Internal": internalToken },
      body: JSON.stringify({ reason: "os_resume" }),
    }).then((r) => r.json());
    assert.equal(wakeRes.ok, true);
    assert.equal(wakeRes.power.state, "awake");
    assert.equal(wakeRes.arrivedCount, 2, "Must accept 1 urgent IMAP + 1 Fanal-Inbox file (dropping newsletter + tmp)");
    assert.equal(wakeRes.reprise.redCount, 1);
    assert.equal(wakeRes.reprise.yellowCount, 1);
    assert.equal(wakeRes.reprise.filteredCount, 1);

    // Repeated wake without new files produces 0 duplicates (SHA-256 + UID dedupe)
    const wake2 = await fetch(baseUrl + "/api/system/wake", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Fanal-Csrf": "1", "X-Fanal-Internal": internalToken },
      body: JSON.stringify({ reason: "unlock_screen" }),
    }).then((r) => r.json());
    assert.equal(wake2.arrivedCount, 0, "Deduplication must avoid re-importing existing email/files");

    // Studio inbox contains captured items; edit + approve one and check Net KPI math
    const studioList = await fetch(baseUrl + "/api/studio", { headers: authHeaders }).then((r) => r.json());
    assert.ok(studioList.tasks.length >= 2);
    const targetTask = studioList.tasks[0];
    const approveRes = await fetch(baseUrl + "/api/studio/send", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        id: targetTask.id,
        decision: "send",
        edited: true,
        editedText: "Bonjour, nous traitons votre demande en priorité.",
        correctionSecs: 45,
      }),
    }).then((r) => r.json());
    assert.equal(approveRes.ok, true);
    assert.equal(approveRes.edited, true);

    const kpiRes = await fetch(baseUrl + "/api/kpi", { headers: authHeaders }).then((r) => r.json());
    assert.ok(kpiRes.productiveSecs >= 240);
    assert.equal(kpiRes.correctiveSecs, 45);
    assert.equal(kpiRes.netSavedSecs, kpiRes.productiveSecs - 45);
    assert.equal(kpiRes.ok, 1, "Approved edited Studio task must still count toward ok");
    assert.equal(kpiRes.successRate, 100);
    assert.equal(kpiRes.editedCount, 1);
    assert.equal(kpiRes.verdict, "positive");

    // Privacy & CORS check: /api/studio/inbox and /api/live must not expose external intake PII or wildcard CORS
    const studioInboxHttp = await fetch(baseUrl + "/api/studio/inbox", { headers: authHeaders });
    assert.equal(studioInboxHttp.headers.get("access-control-allow-origin"), null, "/api/studio/inbox must not emit wildcard CORS");
    const studioInboxData = await studioInboxHttp.json();
    const liveData = await fetch(baseUrl + "/api/live", { headers: authHeaders }).then((r) => r.json());
    const combinedLeakCheck = JSON.stringify({ studioInboxData, liveData });
    assert.equal(combinedLeakCheck.includes("Jean Caron"), false, "Intake client PII must not leak to live/studio-inbox feeds");
    assert.equal(combinedLeakCheck.includes("Demande de soumission toiture"), false, "Intake body must not leak to live/studio-inbox feeds");

    // Concurrent fs.watch + manual sync on newly dropped file must deduplicate without double-dispatch
    fs.writeFileSync(path.join(inboxDir, "concurrent-watch.txt"), "Demande urgente soumission toit concurrent", "utf8");
    await Promise.all([
      fetch(baseUrl + "/api/intake/sync", { method: "POST", headers: authHeaders, body: JSON.stringify({ manual: true }) }),
      sleep(40).then(() => fetch(baseUrl + "/api/intake/sync", { method: "POST", headers: authHeaders, body: JSON.stringify({ manual: true }) })),
    ]);
    await sleep(200);
    const studioAfterWatch = await fetch(baseUrl + "/api/studio", { headers: authHeaders }).then((r) => r.json());
    const watchMatches = (studioAfterWatch.tasks || []).filter((x) => String(x.text || "").includes("Demande urgente soumission toit concurrent"));
    assert.equal(watchMatches.length, 1, "withStateLock must prevent duplicate ingestion under concurrent watch + sync");

    // Battery saver defers automatic background intake dispatch until AC power returns
    await fetch(baseUrl + "/api/system/power", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Fanal-Csrf": "1", "X-Fanal-Internal": internalToken },
      body: JSON.stringify({ onBattery: true, reason: "on_battery" }),
    });

    const deferredIngest = await fetch(baseUrl + "/api/intake", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        source: "whatsapp",
        from: "Lucie Bouchard",
        subject: "Question horaire",
        body: "Êtes-vous ouverts samedi?",
        manual: false,
      }),
    }).then((r) => r.json());
    assert.equal(deferredIngest.accepted, true);
    assert.equal(deferredIngest.deferredCount, 1, "Background intake dispatch must defer on battery when batterySaver is active");

    // Plugging back into AC automatically drains deferred items
    await fetch(baseUrl + "/api/system/power", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Fanal-Csrf": "1", "X-Fanal-Internal": internalToken },
      body: JSON.stringify({ onBattery: false, reason: "on_ac" }),
    });
    await sleep(250);
    const statusAfterAc = await fetch(baseUrl + "/api/intake", { headers: authHeaders }).then((r) => r.json());
    assert.equal(statusAfterAc.deferredCount, 0, "Returning to AC power must drain deferred intake items");
  } finally {
    try {
      srv.kill("SIGTERM");
    } catch {}
    await sleep(150);
    try {
      srv.kill("SIGKILL");
    } catch {}
    await mockImap.stop();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function runDashboardAndI18nChecks() {
  // Verify all 10 locales have required Step 1+2 keys & UTF-8 cleanliness
  const i18nSrc = fs.readFileSync(path.join(ROOT, "supervisor", "dashboard-i18n.js"), "utf8");
  const ctx = { window: {} };
  vm.runInNewContext(i18nSrc, ctx);
  const locales = ["en", "es", "fr", "de", "it", "pt", "zh", "ja", "ko", "ar"];
  const keys = [
    "kpiNet",
    "repriseLabel",
    "intakeCardTitle",
    "intakeCardHint",
    "imapEnabledLbl",
    "imapHostLbl",
    "imapPortLbl",
    "imapUserLbl",
    "imapPassLbl",
    "imapTlsLbl",
    "intakeFolderLbl",
    "batterySaverLbl",
    "intakeSaveBtn",
    "intakeSyncBtn",
    "intakeSyncing",
    "intakeSyncedOk",
  ];
  for (const loc of locales) {
    for (const k of keys) {
      assert.ok(ctx.window.I18N[loc] && typeof ctx.window.I18N[loc][k] === "string" && ctx.window.I18N[loc][k].length > 0, `Missing ${loc}.${k}`);
    }
  }
  assert.equal(ctx.window.I18N.ja.alertWaiting.includes("等待"), false, "ja.alertWaiting must be Japanese, not Simplified Chinese");
  assert.ok(ctx.window.I18N.zh.alertWaiting.includes("等待管理层"), "zh.alertWaiting must remain Simplified Chinese");

  // Verify dashboard.html uses visibility-aware scheduler and preserves smoke test
  const dashSrc = fs.readFileSync(path.join(ROOT, "supervisor", "dashboard.html"), "utf8").replace(/\r\n/g, "\n");
  const rawSetIntervals = dashSrc.match(/setInterval\s*\(/g) || [];
  assert.equal(rawSetIntervals.length, 1, "Only scheduleVisiblePoll should wrap setInterval in dashboard.html");
  assert.ok(dashSrc.includes('visibilitychange'), "dashboard.html must listen to visibilitychange safely");
  assert.ok(dashSrc.includes('fanal:system-wake'), "dashboard.html must wire fanal:system-wake push");
  assert.ok(/id=\\?"inboxDraftEdit\\?"/.test(dashSrc), "dashboard.html Studio decision must support editable draft");

  // Functional VM verification of scheduleVisiblePoll + visibilitychange + fanal:system-wake
  const startTok = "const __visiblePolls=new Map();";
  const endMarker = "window.fanalIPC.on(\"fanal:power-state\",()=>{if(me)pollKpi();});\n}";
  const sIdx = dashSrc.indexOf(startTok);
  const eIdx = dashSrc.indexOf(endMarker, sIdx);
  assert.ok(sIdx >= 0 && eIdx > sIdx, "Could not locate visibility poll scheduler block in dashboard.html");
  const schedSnippet = dashSrc.slice(sIdx, eIdx + endMarker.length);
  const listeners = {};
  const winListeners = {};
  const ipcListeners = {};
  const timers = [];
  let pollTicks = 0;
  let resumeCalls = { kpi: 0, studio: 0, state: 0, alerts: 0, intake: 0 };
  const docMock = { hidden: false, addEventListener: (ev, fn) => { (listeners[ev] = listeners[ev] || []).push(fn); } };
  const winMock = {
    addEventListener: (ev, fn) => { (winListeners[ev] = winListeners[ev] || []).push(fn); },
    fanalIPC: { on: (ch, fn) => { ipcListeners[ch] = fn; } },
  };
  const vmCtx = {
    document: docMock,
    window: winMock,
    location: { search: "" },
    me: { role: "owner" },
    pollKpi: () => { resumeCalls.kpi++; },
    loadStudio: () => { resumeCalls.studio++; },
    pollState: () => { resumeCalls.state++; },
    pollAlerts: () => { resumeCalls.alerts++; },
    loadIntakeStatus: () => { resumeCalls.intake++; },
    setInterval: (fn) => { const entry = { fn, cleared: false }; timers.push(entry); return entry; },
    clearInterval: (entry) => { if (entry) entry.cleared = true; },
  };
  vm.runInNewContext(schedSnippet, vmCtx);
  vmCtx.scheduleVisiblePoll("testKey", () => { pollTicks++; }, 100);
  assert.equal(timers.length, 1);
  timers[0].fn();
  assert.equal(pollTicks, 1, "Visible document must invoke scheduled poll callback");
  docMock.hidden = true;
  timers[0].fn();
  assert.equal(pollTicks, 1, "Hidden document must pause scheduled poll callback");
  docMock.hidden = false;
  for (const fn of (listeners.visibilitychange || [])) fn();
  assert.equal(resumeCalls.kpi, 1, "Returning visible must trigger resume sync");
  assert.equal(resumeCalls.studio, 1);
  assert.equal(resumeCalls.intake, 1);

  const smokeRes = spawnSync(process.execPath, [path.join(ROOT, "tools", "smoke-dashboard.js")], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 10000,
  });
  assert.equal(smokeRes.status, 0, "tools/smoke-dashboard.js failed: " + (smokeRes.stdout || smokeRes.stderr));
}

async function main() {
  await runUnitTests();
  await runHttpE2ETests();
  runDashboardAndI18nChecks();
  console.log("INTAKE_POWER_KPI_TESTS PASSED");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
