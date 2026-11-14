// supervisor/intake-engine.js — Autonomous Intake Bus:
//   1) Zero-dependency IMAP4rev1 incremental UID + UIDVALIDITY fetcher (BODY.PEEK)
//   2) Fanal-Inbox OS folder fs.watch + SHA-256 deduplicated scanner
//   3) Unified normalized POST /api/intake bus with pre-LLM spam filter & RED/YELLOW/GREEN triage
//   4) Adaptive backoff polling + Reprise Matinale catch-up on laptop wake
// Created by J.Franco. MIT license. Node >= 24 builtins only.
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const net = require("node:net");
const tls = require("node:tls");
const crypto = require("node:crypto");

const MAX_SEEN_HASHES = 1000;
const MAX_QUEUE_ITEMS = 250;
const MAX_FOLDER_READ_BYTES = 5 * 1024 * 1024;
const IGNORED_EXACT_NAMES = new Set([".DS_Store", "Thumbs.db", "desktop.ini", "Icon\r"]);
const IGNORED_EXTS = new Set([".tmp", ".part", ".crdownload", ".download", ".swp", ".lock"]);
const TEXT_EXTS = new Set([".txt", ".md", ".csv", ".tsv", ".json", ".log", ".eml", ".ics", ".vcf"]);

function trimStr(v) {
  return typeof v === "string" ? v.trim() : "";
}

function safeJsonRead(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function atomicWriteJson(filePath, data) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const tmp = filePath + ".tmp." + process.pid + "." + Date.now();
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, filePath);
}

function sha256Hex(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function stripImapControls(str) {
  return String(str || "").replace(/[\r\n\x00]/g, "");
}

function quoteImapString(str) {
  const clean = stripImapControls(str);
  return '"' + clean.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}

function decodeEncodedWords(input) {
  const str = String(input || "");
  // Unfold adjacent encoded words separated only by whitespace (RFC 2047 §6.2)
  const joined = str.replace(/\?=\s+=\?/g, "?==?");
  return joined.replace(/=\?([A-Za-z0-9_-]+)\?([BbQq])\?([^?]*)\?=/g, (_, charset, enc, payload) => {
    try {
      let buf;
      if (enc.toUpperCase() === "B") {
        buf = Buffer.from(payload, "base64");
      } else {
        const qp = payload.replace(/_/g, " ").replace(/=([0-9A-Fa-f]{2})/g, (__, hex) =>
          String.fromCharCode(parseInt(hex, 16))
        );
        buf = Buffer.from(qp, "latin1");
      }
      const cs = charset.toLowerCase();
      if (cs === "utf-8" || cs === "utf8") return buf.toString("utf8");
      try {
        return new TextDecoder(cs).decode(buf);
      } catch {
        return buf.toString("latin1");
      }
    } catch {
      return _;
    }
  });
}

function decodeQuotedPrintable(input) {
  const softFixed = String(input || "").replace(/=\r?\n/g, "");
  const bytes = [];
  for (let i = 0; i < softFixed.length; i++) {
    if (softFixed[i] === "=" && /^[0-9A-Fa-f]{2}$/.test(softFixed.slice(i + 1, i + 3))) {
      bytes.push(parseInt(softFixed.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      const code = softFixed.charCodeAt(i);
      bytes.push(code <= 255 ? code : 63);
    }
  }
  return Buffer.from(bytes).toString("utf8");
}

function stripHtmlBasic(html) {
  return String(html || "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, d) => {
      const cp = Number(d);
      return Number.isFinite(cp) && cp >= 32 && cp < 0x10ffff ? String.fromCodePoint(cp) : " ";
    })
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseHeaders(rawHeaders) {
  const unfolded = String(rawHeaders || "").replace(/\r?\n[ \t]+/g, " ");
  const out = {};
  for (const line of unfolded.split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const val = decodeEncodedWords(line.slice(idx + 1).trim());
    if (out[key]) out[key] += ", " + val;
    else out[key] = val;
  }
  return out;
}

function extractReadableBody(rawBody, topContentType = "", topTransferEnc = "") {
  let body = String(rawBody || "");
  if (!body.trim()) return "";

  const ct = String(topContentType || "").toLowerCase();
  const boundaryMatch = /boundary=["']?([^"';\s]+)["']?/i.exec(topContentType || "");
  if (boundaryMatch && ct.includes("multipart/")) {
    const boundary = boundaryMatch[1];
    const parts = body.split(new RegExp("--" + boundary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?:--)?\\s*\\r?\\n"));
    let plainCandidate = "";
    let htmlCandidate = "";
    for (const part of parts.slice(1)) {
      const splitIdx = part.search(/\r?\n\r?\n/);
      if (splitIdx < 0) continue;
      const pHdrs = parseHeaders(part.slice(0, splitIdx));
      const pBodyRaw = part.slice(splitIdx).replace(/^\r?\n\r?\n/, "");
      const pCt = (pHdrs["content-type"] || "text/plain").toLowerCase();
      const pEnc = (pHdrs["content-transfer-encoding"] || "").toLowerCase();
      let decoded = pBodyRaw;
      if (pEnc.includes("quoted-printable")) decoded = decodeQuotedPrintable(pBodyRaw);
      else if (pEnc.includes("base64")) {
        try {
          decoded = Buffer.from(pBodyRaw.replace(/\s+/g, ""), "base64").toString("utf8");
        } catch {}
      }
      if (pCt.includes("text/plain") && !plainCandidate) plainCandidate = decoded.trim();
      else if (pCt.includes("text/html") && !htmlCandidate) htmlCandidate = stripHtmlBasic(decoded);
    }
    body = plainCandidate || htmlCandidate || body;
  } else {
    const enc = String(topTransferEnc || "").toLowerCase();
    if (enc.includes("quoted-printable")) body = decodeQuotedPrintable(body);
    else if (enc.includes("base64") && !/\s/.test(body.trim().slice(0, 40))) {
      try {
        body = Buffer.from(body.replace(/\s+/g, ""), "base64").toString("utf8");
      } catch {}
    }
    if (ct.includes("text/html") || /^\s*</.test(body)) {
      body = stripHtmlBasic(body);
    }
  }

  return body.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, 4000);
}

function parseRfc2822Message(rawText) {
  const s = String(rawText || "");
  const sep = s.search(/\r?\n\r?\n/);
  if (sep < 0) {
    return { headers: {}, body: s.trim().slice(0, 4000) };
  }
  const hdrBlock = s.slice(0, sep);
  const bodyBlock = s.slice(sep).replace(/^\r?\n\r?\n/, "");
  const headers = parseHeaders(hdrBlock);
  const body = extractReadableBody(bodyBlock, headers["content-type"], headers["content-transfer-encoding"]);
  return { headers, body };
}

// ---------- Buffered IMAP4rev1 Socket Reader ----------

function createImapConnection({ host, port = 993, useTls = true, timeoutMs = 12000, rejectUnauthorized = true }) {
  return new Promise((resolve, reject) => {
    const h = trimStr(host);
    const p = Number(port) || (useTls ? 993 : 143);
    if (!h) return reject(new Error("IMAP host is required"));

    let settled = false;
    const sock = useTls
      ? tls.connect({ host: h, port: p, servername: h, rejectUnauthorized: rejectUnauthorized !== false })
      : net.createConnection({ host: h, port: p });

    let acc = Buffer.alloc(0);
    let closed = false;
    let closeErr = null;
    let waiters = [];

    function failAll(err) {
      if (closed) return;
      closed = true;
      closeErr = err;
      const pending = waiters.splice(0, waiters.length);
      for (const w of pending) w.reject(err);
    }

    function pumpWaiters() {
      while (waiters.length > 0) {
        const w = waiters[0];
        if (w.kind === "line") {
          const idx = acc.indexOf("\n");
          if (idx < 0) break;
          let lineBuf = acc.subarray(0, idx);
          if (lineBuf.length > 0 && lineBuf[lineBuf.length - 1] === 13) {
            lineBuf = lineBuf.subarray(0, lineBuf.length - 1);
          }
          acc = acc.subarray(idx + 1);
          waiters.shift();
          w.resolve(lineBuf.toString("utf8"));
        } else if (w.kind === "bytes") {
          if (acc.length < w.count) break;
          const chunk = acc.subarray(0, w.count);
          acc = acc.subarray(w.count);
          waiters.shift();
          w.resolve(chunk);
        }
      }
    }

    sock.setTimeout(timeoutMs);
    sock.on("data", (chunk) => {
      acc = Buffer.concat([acc, chunk]);
      pumpWaiters();
    });
    sock.on("timeout", () => {
      const err = new Error("IMAP socket timeout");
      sock.destroy(err);
      if (!settled) {
        settled = true;
        reject(err);
      }
      failAll(err);
    });
    sock.on("error", (err) => {
      const safeErr = new Error("IMAP socket error: " + (err && err.code ? err.code : err.message || "unknown"));
      if (!settled) {
        settled = true;
        reject(safeErr);
      }
      failAll(safeErr);
    });
    sock.on("close", () => {
      const err = closeErr || new Error("IMAP connection closed unexpectedly");
      if (!settled) {
        settled = true;
        reject(err);
      }
      failAll(err);
    });

    function readLine() {
      return new Promise((res, rej) => {
        if (closed && !acc.includes(10)) return rej(closeErr || new Error("IMAP closed"));
        waiters.push({ kind: "line", resolve: res, reject: rej });
        pumpWaiters();
      });
    }

    function readExact(count) {
      return new Promise((res, rej) => {
        if (count <= 0) return res(Buffer.alloc(0));
        if (closed && acc.length < count) return rej(closeErr || new Error("IMAP closed"));
        waiters.push({ kind: "bytes", count, resolve: res, reject: rej });
        pumpWaiters();
      });
    }

    async function readLogicalLine() {
      const line = await readLine();
      const literals = [];
      let cur = line;
      while (true) {
        const m = /\{(\d+)\+?\}$/.exec(cur);
        if (!m) break;
        const n = Math.min(Number(m[1]) || 0, 2 * 1024 * 1024);
        const lit = await readExact(n);
        literals.push({ marker: cur, data: lit.toString("utf8") });
        cur = await readLine();
      }
      return { line, tail: cur, literals };
    }

    let tagSeq = 0;
    async function command(cmd) {
      const tag = "F" + String(++tagSeq).padStart(3, "0");
      sock.write(tag + " " + cmd + "\r\n");
      const lines = [];
      while (true) {
        const entry = await readLogicalLine();
        lines.push(entry);
        const l = entry.tail || entry.line;
        if (l.startsWith(tag + " ")) {
          const rest = l.slice(tag.length + 1);
          const status = rest.split(" ", 1)[0].toUpperCase();
          if (status !== "OK") {
            throw new Error("IMAP " + cmd.split(" ")[0] + " failed: " + rest.slice(0, 120));
          }
          return { lines, okLine: rest };
        }
      }
    }

    function close() {
      try {
        sock.end();
        sock.destroy();
      } catch {}
    }

    const connectEvt = useTls ? "secureConnect" : "connect";
    sock.once(connectEvt, async () => {
      if (settled) return;
      settled = true;
      try {
        const greeting = await readLine();
        resolve({ greeting, command, close });
      } catch (err) {
        close();
        reject(err);
      }
    });
  });
}

function parseSearchUids(lines) {
  const uids = [];
  for (const entry of lines) {
    const raw = entry.line;
    if (/^\*\s+SEARCH\b/i.test(raw)) {
      const rest = raw.replace(/^\*\s+SEARCH\b/i, "").trim();
      for (const tok of rest.split(/\s+/)) {
        const n = Number(tok);
        if (Number.isInteger(n) && n > 0) uids.push(n);
      }
    }
  }
  return [...new Set(uids)].sort((a, b) => a - b);
}

/**
 * Incrementally fetch unseen-to-Fanal emails over IMAP4rev1 using read-only EXAMINE + BODY.PEEK.
 */
async function fetchImapIncremental(cfg = {}) {
  const host = stripImapControls(cfg.host);
  const port = Number(cfg.port || (cfg.tls === false ? 143 : 993));
  const useTls = cfg.tls !== false;
  const user = stripImapControls(cfg.user);
  const password = stripImapControls(cfg.password);
  const mailbox = stripImapControls(cfg.mailbox || "INBOX") || "INBOX";
  const maxMessages = Math.max(1, Math.min(25, Number(cfg.maxMessages || 10)));
  const maxSnippetBytes = Math.max(1024, Math.min(65536, Number(cfg.maxSnippetBytes || 16384)));
  const initialLookbackCount = Math.max(1, Math.min(25, Number(cfg.initialLookbackCount || 10)));
  const prevUidValidity = Number(cfg.uidValidity || 0);
  let cursorUid = Math.max(0, Number(cfg.lastUid || 0));

  if (!host || !user || !password) {
    throw new Error("IMAP configuration incomplete (host, user, password required)");
  }

  const conn = await createImapConnection({
    host,
    port,
    useTls,
    timeoutMs: Number(cfg.timeoutMs || 12000),
    rejectUnauthorized: cfg.rejectUnauthorized !== false,
  });

  try {
    if (!/^\*\s+PREAUTH/i.test(conn.greeting)) {
      await conn.command("LOGIN " + quoteImapString(user) + " " + quoteImapString(password));
    }

    const examineRes = await conn.command("EXAMINE " + quoteImapString(mailbox));
    let serverUidValidity = 0;
    let serverUidNext = 0;
    let exists = 0;
    for (const entry of examineRes.lines) {
      const uv = /\[UIDVALIDITY\s+(\d+)\]/i.exec(entry.line);
      if (uv) serverUidValidity = Number(uv[1]);
      const un = /\[UIDNEXT\s+(\d+)\]/i.exec(entry.line);
      if (un) serverUidNext = Number(un[1]);
      const ex = /^\*\s+(\d+)\s+EXISTS\b/i.exec(entry.line);
      if (ex) exists = Number(ex[1]);
    }

    let uidValidityReset = false;
    if (prevUidValidity > 0 && serverUidValidity > 0 && prevUidValidity !== serverUidValidity) {
      cursorUid = 0;
      uidValidityReset = true;
    }

    let candidateUids = [];
    let isInitialSeed = false;
    if (cursorUid > 0) {
      const sr = await conn.command("UID SEARCH UID " + (cursorUid + 1) + ":*");
      candidateUids = parseSearchUids(sr.lines).filter((u) => u > cursorUid);
    } else if (exists > 0 || serverUidNext > 1) {
      isInitialSeed = true;
      if (serverUidNext > 1) {
        const startUid = Math.max(1, serverUidNext - initialLookbackCount);
        const sr = await conn.command("UID SEARCH UID " + startUid + ":*");
        candidateUids = parseSearchUids(sr.lines);
      } else {
        const sr = await conn.command("UID SEARCH ALL");
        candidateUids = parseSearchUids(sr.lines);
      }
      candidateUids = candidateUids.slice(-maxMessages);
    }

    // For incremental syncs (cursorUid > 0), process oldest UIDs first so excess mail is never skipped
    const targetUids = isInitialSeed ? candidateUids.slice(-maxMessages) : candidateUids.slice(0, maxMessages);
    const messages = [];
    let highestUid = cursorUid;

    for (const uid of targetUids) {
      const fr = await conn.command(
        "UID FETCH " +
          uid +
          " (UID INTERNALDATE BODY.PEEK[HEADER.FIELDS (FROM TO SUBJECT DATE MESSAGE-ID LIST-UNSUBSCRIBE PRECEDENCE AUTO-SUBMITTED CONTENT-TYPE CONTENT-TRANSFER-ENCODING)] BODY.PEEK[TEXT]<0." +
          maxSnippetBytes +
          ">)"
      );

      let hdrRaw = "";
      let bodyRaw = "";
      let internalDate = "";
      let fetchedUid = uid;

      for (const entry of fr.lines) {
        const um = /\bUID\s+(\d+)/i.exec(entry.line);
        if (um) fetchedUid = Number(um[1]) || uid;
        const dm = /\bINTERNALDATE\s+"([^"]+)"/i.exec(entry.line);
        if (dm) internalDate = dm[1];
        for (const lit of entry.literals) {
          if (/HEADER\.FIELDS/i.test(lit.marker)) hdrRaw += lit.data;
          else if (/BODY\[TEXT\]/i.test(lit.marker)) bodyRaw += lit.data;
        }
      }

      const headers = parseHeaders(hdrRaw);
      const body = extractReadableBody(bodyRaw, headers["content-type"], headers["content-transfer-encoding"]);
      if (fetchedUid > highestUid) highestUid = fetchedUid;

      messages.push({
        uid: fetchedUid,
        uidValidity: serverUidValidity,
        messageId: headers["message-id"] || "",
        from: headers.from || "unknown",
        to: headers.to || "",
        subject: headers.subject || "(no subject)",
        date: headers.date || internalDate || new Date().toISOString(),
        headers,
        body,
      });
    }

    if (targetUids.length === 0 && serverUidNext > 1 && cursorUid === 0) {
      highestUid = serverUidNext - 1;
    }

    try {
      await conn.command("LOGOUT");
    } catch {}

    return {
      ok: true,
      mailbox,
      uidValidity: serverUidValidity,
      uidValidityReset,
      uidNext: serverUidNext,
      previousUid: cursorUid,
      lastUid: Math.max(cursorUid, highestUid),
      fetchedCount: messages.length,
      messages,
    };
  } finally {
    conn.close();
  }
}

// ---------- Deterministic Noise Filter & Priority Triage ----------

const VOIP_OR_ACTIONABLE_SIGNAL =
  /\b(voicemail|sms|text message|missed call|transcript|répondeur|message vocal|appel manqué|buzón|mensaje de voz|urg|booking|réservation|reservation|reserva|devis|quote|cotización|facture|invoice|paiement|payment|annul|cancel|client|dossier|case|rendez-vous|appointment|cita)\b/i;

const URGENT_RED_SIGNAL =
  /\b(urgent|asap|immédiat|immediat|urgence|emergenc|mise en demeure|huissier|tribunal|court|avocat|lawyer|legal|litige|lawsuit|plainte|complaint|réclamation|reclamation|échec|failed payment|paiement refusé|chargeback|fraude|fraud|annulation immédiate|cancel immediately|dernier avis|final notice|deadline|échéance aujourd'hui|sinistre)\b/i;

const AUTOMATED_SENDER_RE = /^(?:no-?reply|donotreply|do-not-reply|mailer-daemon|postmaster|newsletter|marketing|promotions?|digest|bounces?)[@+.]/i;

const INFO_GREEN_SIGNAL =
  /\b(confirmation de réception|receipt|reçu|delivered|livré|paid in full|payé en totalité|fyi|pour information)\b/i;

function classifyIntakeItem(raw = {}) {
  const source = trimStr(raw.source || "manual_api").toLowerCase();
  const from = trimStr(raw.from || "unknown");
  const subject = trimStr(raw.subject || "");
  const body = trimStr(raw.body || "");
  const headers = raw.headers && typeof raw.headers === "object" ? raw.headers : {};
  const combined = `${from}\n${subject}\n${body}`;

  // Empty check
  if (!subject && !body) {
    return { accepted: false, priority: "GREEN", bucket: "noise", filteredReason: "empty_body" };
  }

  // Filter automated marketing/bulk email before spending any LLM tokens (preserving VoIP/SMS forwards!)
  if (source === "email_imap" || source === "email") {
    const hasVoipOrAction = VOIP_OR_ACTIONABLE_SIGNAL.test(combined);
    const hasListUnsub = Boolean(headers["list-unsubscribe"]);
    const prec = trimStr(headers.precedence || "").toLowerCase();
    const autoSub = trimStr(headers["auto-submitted"] || "").toLowerCase();
    const senderLocal = from.replace(/^.*</, "").replace(/>.*$/, "").trim();

    if ((prec === "bulk" || prec === "junk" || prec === "list") && !hasVoipOrAction) {
      return { accepted: false, priority: "GREEN", bucket: "noise", filteredReason: "bulk_precedence" };
    }
    if (autoSub && autoSub !== "no" && !hasVoipOrAction) {
      return { accepted: false, priority: "GREEN", bucket: "noise", filteredReason: "auto_submitted" };
    }
    if (hasListUnsub && !hasVoipOrAction && !URGENT_RED_SIGNAL.test(combined)) {
      return { accepted: false, priority: "GREEN", bucket: "noise", filteredReason: "newsletter_list_unsubscribe" };
    }
    if (AUTOMATED_SENDER_RE.test(senderLocal) && !hasVoipOrAction && !URGENT_RED_SIGNAL.test(combined)) {
      return { accepted: false, priority: "GREEN", bucket: "noise", filteredReason: "noreply_auto" };
    }
  }

  const explicitPrio = trimStr(raw.priority).toUpperCase();
  if (explicitPrio === "RED" || URGENT_RED_SIGNAL.test(combined)) {
    return { accepted: true, priority: "RED", bucket: "urgent", filteredReason: null };
  }
  if (explicitPrio === "GREEN" || (INFO_GREEN_SIGNAL.test(combined) && !combined.includes("?"))) {
    return { accepted: true, priority: "GREEN", bucket: "info", filteredReason: null };
  }
  return { accepted: true, priority: "YELLOW", bucket: "action", filteredReason: null };
}

function priorityRank(priority) {
  if (priority === "RED") return 0;
  if (priority === "YELLOW") return 1;
  return 2;
}

// ---------- Intake Bus + Adaptive Backoff + Fanal-Inbox Watcher ----------

function defaultIntakeState() {
  return {
    imap: { uidValidity: 0, lastUid: 0, lastSyncAt: null, lastError: null },
    folder: { seenHashes: [], lastScanAt: null, lastError: null },
    seenExternalIds: [],
    queue: [],
    reprise: {
      lastRunAt: null,
      reason: null,
      sleepDurationMs: 0,
      arrivedCount: 0,
      redCount: 0,
      yellowCount: 0,
      greenCount: 0,
      filteredCount: 0,
      deferredCount: 0,
      items: [],
    },
  };
}

function maskImapConfigPublic(imap = {}) {
  const host = trimStr(imap.host);
  const user = trimStr(imap.user);
  const hasPassword = Boolean(trimStr(imap.password));
  return {
    enabled: Boolean(imap.enabled),
    host,
    port: Number(imap.port || (imap.tls === false ? 143 : 993)),
    tls: imap.tls !== false,
    user,
    mailbox: trimStr(imap.mailbox || "INBOX") || "INBOX",
    configured: Boolean(host && user && hasPassword),
    hasPassword,
  };
}

/**
 * Orchestrates email IMAP, Fanal-Inbox fs.watch, POST /api/intake normalization,
 * adaptive backoff scheduling, and Reprise Matinale catch-up.
 */
function createIntakeEngine({
  dataDir,
  getSettings,
  saveSettings,
  powerGovernor,
  isLocalSovereign,
  onDispatchItem,
  onBatchTelemetry,
  imapFetcher = fetchImapIncremental,
  basePollMs = 120000,
  maxPollMs = 600000,
} = {}) {
  const stateFile = path.join(dataDir, "intake-state.json");
  let watcher = null;
  let watchedDir = null;
  let pollTimer = null;
  let started = false;
  let syncing = false;
  let consecutiveEmptyPolls = 0;
  let consecutiveErrors = 0;
  const debounceTimers = new Map();
  let stateLock = Promise.resolve();

  function withStateLock(fn) {
    const run = stateLock.then(fn, fn);
    stateLock = run.catch(() => {});
    return run;
  }

  function loadState() {
    const raw = safeJsonRead(stateFile, {});
    const def = defaultIntakeState();
    return {
      imap: { ...def.imap, ...(raw.imap || {}) },
      folder: {
        ...def.folder,
        ...(raw.folder || {}),
        seenHashes: Array.isArray(raw.folder && raw.folder.seenHashes) ? raw.folder.seenHashes.slice(-MAX_SEEN_HASHES) : [],
      },
      seenExternalIds: Array.isArray(raw.seenExternalIds) ? raw.seenExternalIds.slice(-MAX_SEEN_HASHES) : [],
      queue: Array.isArray(raw.queue) ? raw.queue.slice(-MAX_QUEUE_ITEMS) : [],
      reprise: { ...def.reprise, ...(raw.reprise || {}) },
    };
  }

  function saveState(st) {
    st.folder.seenHashes = (st.folder.seenHashes || []).slice(-MAX_SEEN_HASHES);
    st.seenExternalIds = (st.seenExternalIds || []).slice(-MAX_SEEN_HASHES);
    st.queue = (st.queue || []).slice(-MAX_QUEUE_ITEMS);
    atomicWriteJson(stateFile, st);
  }

  function getIntakeConfig() {
    const s = typeof getSettings === "function" ? getSettings() : {};
    const cfg = s && s.intake && typeof s.intake === "object" ? s.intake : {};
    const defaultInbox = path.join(dataDir, "fanal-inbox");
    const folderPath = trimStr(cfg.folder && cfg.folder.path) || defaultInbox;
    return {
      imap: cfg.imap && typeof cfg.imap === "object" ? cfg.imap : {},
      folder: {
        enabled: cfg.folder ? cfg.folder.enabled !== false : true,
        path: folderPath,
        isCustom: Boolean(trimStr(cfg.folder && cfg.folder.path)),
      },
    };
  }

  function resolveWatchDir() {
    const { folder } = getIntakeConfig();
    if (!folder.enabled) return null;
    if (!folder.isCustom) {
      try {
        fs.mkdirSync(folder.path, { recursive: true, mode: 0o700 });
      } catch {}
      return folder.path;
    }
    const subInbox = path.join(folder.path, "Fanal-Inbox");
    if (fs.existsSync(subInbox)) return subInbox;
    return folder.path;
  }

  function isIgnoredFileName(name) {
    if (!name || IGNORED_EXACT_NAMES.has(name)) return true;
    if (name.startsWith(".") || name.startsWith("~$")) return true;
    const ext = path.extname(name).toLowerCase();
    return IGNORED_EXTS.has(ext);
  }

  function enqueueNormalizedItem(st, raw) {
    const source = trimStr(raw.source || "manual_api").toLowerCase();
    const from = trimStr(raw.from || "unknown").slice(0, 180);
    const subject = trimStr(raw.subject || "(no subject)").slice(0, 240);
    const body = trimStr(raw.body || "").slice(0, 4000);
    const extId =
      trimStr(raw.externalId) ||
      source + ":" + sha256Hex(source + "|" + from + "|" + subject + "|" + body.slice(0, 500)).slice(0, 24);

    if (st.seenExternalIds.includes(extId)) {
      return { duplicate: true, externalId: extId };
    }
    st.seenExternalIds.push(extId);

    const triaged = classifyIntakeItem({ source, from, subject, body, headers: raw.headers, priority: raw.priority });
    const item = {
      id: "intk_" + Date.now() + "_" + crypto.randomBytes(3).toString("hex"),
      source,
      externalId: extId,
      from,
      subject,
      body,
      receivedAt: trimStr(raw.receivedAt) || new Date().toISOString(),
      priority: triaged.priority,
      bucket: triaged.bucket,
      filteredReason: triaged.filteredReason,
      status: triaged.accepted ? "queued" : "filtered",
      taskId: null,
    };
    st.queue.push(item);
    return { duplicate: false, accepted: triaged.accepted, item };
  }

  function ingestFileAt(filePath, st) {
    const name = path.basename(filePath);
    if (isIgnoredFileName(name)) return { skipped: "ignored_name" };
    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch {
      return { skipped: "missing" };
    }
    if (!stat.isFile() || stat.size <= 0) return { skipped: "empty_or_dir" };

    const fd = fs.openSync(filePath, "r");
    let sliceBuf;
    try {
      const readLen = Math.min(stat.size, MAX_FOLDER_READ_BYTES);
      sliceBuf = Buffer.allocUnsafe(readLen);
      fs.readSync(fd, sliceBuf, 0, readLen, 0);
    } finally {
      fs.closeSync(fd);
    }

    const hash = sha256Hex(Buffer.concat([sliceBuf, Buffer.from("|" + stat.size)]));
    if (st.folder.seenHashes.some((entry) => entry.hash === hash)) {
      return { skipped: "duplicate_hash" };
    }
    st.folder.seenHashes.push({ hash, name, seenAt: new Date().toISOString() });

    const ext = path.extname(name).toLowerCase();
    let parsedFrom = "Fanal-Inbox (" + name + ")";
    let parsedSubject = "File: " + name;
    let parsedBody = "";
    let headers = {};

    if (ext === ".eml") {
      const parsed = parseRfc2822Message(sliceBuf.toString("utf8"));
      parsedFrom = parsed.headers.from || parsedFrom;
      parsedSubject = parsed.headers.subject || parsedSubject;
      parsedBody = parsed.body || "(empty .eml file)";
      headers = parsed.headers;
    } else if (TEXT_EXTS.has(ext)) {
      parsedBody = sliceBuf.toString("utf8").replace(/\0/g, "").trim().slice(0, 4000);
    } else {
      parsedBody =
        "New client file placed in Fanal-Inbox: " +
        name +
        " (" +
        Math.max(1, Math.round(stat.size / 1024)) +
        " KB, type " +
        (ext || "file") +
        "). Review and prepare follow-up.";
    }

    return enqueueNormalizedItem(st, {
      source: "folder",
      externalId: "folder:" + hash,
      from: parsedFrom,
      subject: parsedSubject,
      body: parsedBody,
      headers,
    });
  }

  function scanFolderIntoState(st) {
    const dir = resolveWatchDir();
    const added = [];
    let filtered = 0;
    if (!dir || !fs.existsSync(dir)) {
      st.folder.lastScanAt = new Date().toISOString();
      return { dir, added, filtered };
    }
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const ent of entries) {
        if (!ent.isFile() || isIgnoredFileName(ent.name)) continue;
        const res = ingestFileAt(path.join(dir, ent.name), st);
        if (res && !res.skipped && !res.duplicate) {
          if (res.accepted) added.push(res.item);
          else filtered++;
        }
      }
      st.folder.lastError = null;
    } catch (e) {
      st.folder.lastError = String(e.message || e);
    }
    st.folder.lastScanAt = new Date().toISOString();
    return { dir, added, filtered };
  }

  function scanFolderOnly() {
    const st = loadState();
    const res = scanFolderIntoState(st);
    saveState(st);
    return res;
  }

  async function drainQueueToStudio(st, { manual = false, reason = "sync" } = {}) {
    const localSov = typeof isLocalSovereign === "function" ? Boolean(isLocalSovereign()) : false;
    const guard = powerGovernor
      ? powerGovernor.shouldDeferBackgroundCompute({ isLocalSovereign: localSov, manual })
      : { defer: false, reason: null };

    const pending = st.queue
      .filter((x) => x.status === "queued" || x.status === "deferred_battery" || x.status === "deferred_sleeping")
      .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));

    let dispatched = 0;
    let deferred = 0;

    if (guard.defer) {
      for (const it of pending) {
        it.status = guard.reason === "battery_saver" ? "deferred_battery" : "deferred_sleeping";
        deferred++;
      }
      return { dispatched, deferred, deferReason: guard.reason };
    }

    for (const it of pending) {
      if (typeof onDispatchItem === "function") {
        const res = await onDispatchItem(it);
        it.taskId = res && res.taskId ? res.taskId : it.taskId;
      }
      it.status = "dispatched";
      it.dispatchedAt = new Date().toISOString();
      it.dispatchedReason = reason;
      dispatched++;
    }

    return { dispatched, deferred, deferReason: null };
  }

  async function syncNow({ reason = "poll", manual = false, sleepDurationMs = 0 } = {}) {
    if (syncing) return { ok: true, busy: true };
    syncing = true;
    try {
      return await withStateLock(async () => {
        const cfg = getIntakeConfig();
        const st = loadState();
        const folderScan = scanFolderIntoState(st);
        const arrived = [...folderScan.added];
        let filtered = folderScan.filtered;

        if (cfg.imap && cfg.imap.enabled && cfg.imap.host && cfg.imap.user && cfg.imap.password) {
          try {
            const imapRes = await imapFetcher({
              ...cfg.imap,
              lastUid: st.imap.lastUid,
              uidValidity: st.imap.uidValidity,
            });
            st.imap.uidValidity = imapRes.uidValidity || st.imap.uidValidity;
            st.imap.lastUid = imapRes.lastUid;
            st.imap.lastSyncAt = new Date().toISOString();
            st.imap.lastError = null;
            consecutiveErrors = 0;
            for (const msg of imapRes.messages) {
              const enq = enqueueNormalizedItem(st, {
                source: "email_imap",
                externalId: "imap:" + (msg.uidValidity || 0) + ":" + msg.uid,
                from: msg.from,
                subject: msg.subject,
                body: msg.body,
                receivedAt: msg.date,
                headers: msg.headers,
              });
              if (!enq.duplicate) {
                if (enq.accepted) arrived.push(enq.item);
                else filtered++;
              }
            }
          } catch (err) {
            st.imap.lastSyncAt = new Date().toISOString();
            st.imap.lastError = String(err && err.message ? err.message : err).slice(0, 180);
            consecutiveErrors++;
          }
        }

        const dispatchRes = await drainQueueToStudio(st, { manual, reason });
        const activeQueued = st.queue.filter((x) =>
          x.status === "queued" || x.status === "dispatched" || x.status === "deferred_battery" || x.status === "deferred_sleeping"
        );

        if (arrived.length > 0 || dispatchRes.dispatched > 0) consecutiveEmptyPolls = 0;
        else consecutiveEmptyPolls++;

        if (arrived.length > 0 || filtered > 0) {
          if (typeof onBatchTelemetry === "function") {
            onBatchTelemetry({ accepted: arrived.length, filtered, reason });
          }
        }

        if (reason !== "poll" || arrived.length > 0 || dispatchRes.dispatched > 0) {
          const prioritized = [...arrived]
            .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority))
            .slice(0, 12)
            .map((x) => ({
              id: x.id,
              source: x.source,
              priority: x.priority,
              subject: x.subject.slice(0, 80),
              from: x.from.slice(0, 60),
              receivedAt: x.receivedAt,
            }));
          st.reprise = {
            lastRunAt: new Date().toISOString(),
            reason,
            sleepDurationMs: Number(sleepDurationMs || 0),
            arrivedCount: arrived.length,
            dispatchedCount: dispatchRes.dispatched,
            deferredCount: dispatchRes.deferred,
            deferReason: dispatchRes.deferReason,
            redCount: arrived.filter((x) => x.priority === "RED").length,
            yellowCount: arrived.filter((x) => x.priority === "YELLOW").length,
            greenCount: arrived.filter((x) => x.priority === "GREEN").length,
            filteredCount: filtered,
            pendingQueueCount: activeQueued.filter((x) => x.status !== "dispatched").length,
            items: prioritized,
          };
        }

        saveState(st);
        if (started) scheduleNextPoll();
        return {
          ok: true,
          reason,
          arrivedCount: arrived.length,
          filteredCount: filtered,
          dispatchedCount: dispatchRes.dispatched,
          deferredCount: dispatchRes.deferred,
          deferReason: dispatchRes.deferReason,
          reprise: st.reprise,
        };
      });
    } finally {
      syncing = false;
    }
  }

  function ingestManual(payload = {}) {
    return withStateLock(async () => {
      const st = loadState();
      const res = enqueueNormalizedItem(st, {
        source: payload.source || "manual_api",
        externalId: payload.externalId,
        from: payload.from,
        subject: payload.subject,
        body: payload.body || payload.text,
        receivedAt: payload.receivedAt,
        headers: payload.headers,
        priority: payload.priority,
      });
      if (res.duplicate) {
        return { ok: true, duplicate: true, externalId: res.externalId };
      }
      if (!res.accepted) {
        saveState(st);
        if (typeof onBatchTelemetry === "function") onBatchTelemetry({ accepted: 0, filtered: 1, reason: "manual_api" });
        return { ok: true, accepted: false, filteredReason: res.item.filteredReason, item: res.item };
      }
      const dispatchRes = await drainQueueToStudio(st, { manual: payload.manual !== false, reason: "manual_api" });
      saveState(st);
      if (typeof onBatchTelemetry === "function") onBatchTelemetry({ accepted: 1, filtered: 0, reason: "manual_api" });
      return {
        ok: true,
        accepted: true,
        item: res.item,
        dispatchedCount: dispatchRes.dispatched,
        deferredCount: dispatchRes.deferred,
      };
    });
  }

  async function waitStableFile(fullPath) {
    try {
      const s1 = fs.statSync(fullPath);
      if (!s1.isFile() || s1.size <= 0) return false;
      await new Promise((r) => setTimeout(r, 60));
      const s2 = fs.statSync(fullPath);
      return s2.isFile() && s2.size === s1.size && s2.mtimeMs === s1.mtimeMs;
    } catch {
      return false;
    }
  }

  function refreshWatcher() {
    const dir = resolveWatchDir();
    if (watcher && watchedDir === dir) return;
    if (watcher) {
      try {
        watcher.close();
      } catch {}
      watcher = null;
      watchedDir = null;
    }
    if (!dir || !fs.existsSync(dir)) return;
    try {
      watcher = fs.watch(dir, { persistent: false }, (_eventType, filename) => {
        const key = filename ? path.join(dir, String(filename)) : "__SCAN_DIR__";
        if (filename && isIgnoredFileName(String(filename))) return;
        if (debounceTimers.has(key)) clearTimeout(debounceTimers.get(key));
        const t = setTimeout(() => {
          debounceTimers.delete(key);
          if (key === "__SCAN_DIR__") {
            withStateLock(async () => {
              const st = loadState();
              const scan = scanFolderIntoState(st);
              if (scan.added.length > 0 || scan.filtered > 0) {
                await drainQueueToStudio(st, { manual: false, reason: "fs_watch" });
                saveState(st);
                if (typeof onBatchTelemetry === "function") {
                  onBatchTelemetry({ accepted: scan.added.length, filtered: scan.filtered, reason: "fs_watch" });
                }
              }
            }).catch(() => {});
            return;
          }
          waitStableFile(key)
            .then((stable) => {
              if (!stable) return;
              return withStateLock(async () => {
                const st = loadState();
                const res = ingestFileAt(key, st);
                if (res && !res.skipped && !res.duplicate) {
                  if (res.accepted) {
                    await drainQueueToStudio(st, { manual: false, reason: "fs_watch" });
                    saveState(st);
                    if (typeof onBatchTelemetry === "function") onBatchTelemetry({ accepted: 1, filtered: 0, reason: "fs_watch" });
                  } else {
                    saveState(st);
                    if (typeof onBatchTelemetry === "function") onBatchTelemetry({ accepted: 0, filtered: 1, reason: "fs_watch" });
                  }
                }
              });
            })
            .catch(() => {});
        }, 450);
        if (typeof t.unref === "function") t.unref();
        debounceTimers.set(key, t);
      });
      if (watcher && typeof watcher.on === "function") {
        watcher.on("error", () => {});
      }
      watchedDir = dir;
    } catch {}
  }

  function nextPollDelayMs() {
    if (powerGovernor && powerGovernor.getState().state === "sleeping") {
      return null;
    }
    if (consecutiveErrors > 0) {
      return Math.min(1800000, basePollMs * Math.pow(2, Math.min(4, consecutiveErrors)));
    }
    const factor = Math.pow(2, Math.min(3, Math.floor(consecutiveEmptyPolls / 2)));
    return Math.min(maxPollMs, Math.round(basePollMs * factor));
  }

  function scheduleNextPoll() {
    if (pollTimer) {
      clearTimeout(pollTimer);
      pollTimer = null;
    }
    const delay = nextPollDelayMs();
    if (delay === null) return;
    pollTimer = setTimeout(() => {
      syncNow({ reason: "poll", manual: false }).catch(() => {});
    }, delay);
    if (typeof pollTimer.unref === "function") pollTimer.unref();
  }

  function start() {
    started = true;
    refreshWatcher();
    scheduleNextPoll();
  }

  function stop() {
    started = false;
    if (pollTimer) {
      clearTimeout(pollTimer);
      pollTimer = null;
    }
    for (const t of debounceTimers.values()) clearTimeout(t);
    debounceTimers.clear();
    if (watcher) {
      try {
        watcher.close();
      } catch {}
      watcher = null;
      watchedDir = null;
    }
  }

  function setInboxFolder(folderPath) {
    const clean = trimStr(folderPath);
    if (!clean) return { ok: false, error: "folder path required" };
    const s = typeof getSettings === "function" ? getSettings() : {};
    s.intake = s.intake && typeof s.intake === "object" ? s.intake : {};
    s.intake.folder = s.intake.folder && typeof s.intake.folder === "object" ? s.intake.folder : {};
    s.intake.folder.enabled = true;
    s.intake.folder.path = clean;
    if (typeof saveSettings === "function") saveSettings(s);
    refreshWatcher();
    return { ok: true, folderPath: resolveWatchDir() };
  }

  function getPublicStatus() {
    const st = loadState();
    const cfg = getIntakeConfig();
    const activeDir = resolveWatchDir();
    const deferredItems = st.queue.filter((x) => x.status === "deferred_battery" || x.status === "deferred_sleeping");
    return {
      imap: {
        ...maskImapConfigPublic(cfg.imap),
        lastUid: st.imap.lastUid,
        uidValidity: st.imap.uidValidity,
        lastSyncAt: st.imap.lastSyncAt,
        lastError: st.imap.lastError,
      },
      folder: {
        enabled: cfg.folder.enabled,
        path: activeDir || cfg.folder.path,
        watching: Boolean(watcher),
        seenFilesCount: st.folder.seenHashes.length,
        lastScanAt: st.folder.lastScanAt,
        lastError: st.folder.lastError,
      },
      scheduler: {
        started,
        nextPollMs: nextPollDelayMs(),
        powerState: powerGovernor ? powerGovernor.getState() : null,
      },
      deferredCount: deferredItems.length,
      reprise: st.reprise,
      recent: st.queue.slice(-20).reverse().map((x) => ({
        id: x.id,
        source: x.source,
        priority: x.priority,
        bucket: x.bucket,
        status: x.status,
        filteredReason: x.filteredReason,
        from: x.from,
        subject: x.subject,
        receivedAt: x.receivedAt,
        taskId: x.taskId,
      })),
    };
  }

  return {
    start,
    stop,
    syncNow,
    scanFolderOnly,
    ingestManual,
    refreshWatcher,
    setInboxFolder,
    getPublicStatus,
    nextPollDelayMs,
  };
}

module.exports = {
  parseHeaders,
  decodeEncodedWords,
  decodeQuotedPrintable,
  stripHtmlBasic,
  parseRfc2822Message,
  fetchImapIncremental,
  classifyIntakeItem,
  maskImapConfigPublic,
  createIntakeEngine,
};
