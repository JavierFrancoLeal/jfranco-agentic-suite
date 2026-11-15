#!/usr/bin/env node
// test-api-closed-brain.mjs — cross-platform (Windows/macOS/Linux) HTTP API smoke
// for the closed curated brain catalog, encrypted settings.json storage, Dual BYOK
// masking, open-override 400 rejection, and Loi 25 diagnostic export isolation.

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:net";
import { spawn } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function getFreePort() {
  return new Promise((resolvePort, reject) => {
    const srv = createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      srv.close((err) => (err ? reject(err) : resolvePort(port)));
    });
  });
}

async function waitForHealth(baseUrl, child) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`server.js exited prematurely with code ${child.exitCode}`);
    }
    try {
      const r = await fetch(`${baseUrl}/api/health`);
      if (r.ok) {
        const j = await r.json();
        if (j && j.ok) return j;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error("Timed out waiting for supervisor /api/health");
}

async function run() {
  const port = await getFreePort();
  const dataDir = mkdtempSync(join(tmpdir(), "fanal-api-closed-brain-"));
  const baseUrl = `http://127.0.0.1:${port}`;
  const masterKey = "fanal-ci-master-key-32-bytes-minimum";

  const child = spawn(process.execPath, [join(ROOT, "supervisor", "server.js")], {
    env: {
      ...process.env,
      DSH_SUPERVISOR_DATA: dataDir,
      DSH_SUPERVISOR_PORT: String(port),
      FANAL_MASTER_KEY: masterKey,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  try {
    await waitForHealth(baseUrl, child);

    const setupRes = await fetch(`${baseUrl}/api/setup`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Fanal-CSRF": "1" },
      body: JSON.stringify({ user: "Owner", password: "password12345", sector: "accounting" }),
    });
    assert.equal(setupRes.status, 200);
    const setupJson = await setupRes.json();
    assert.ok(setupJson.token);

    const authHeaders = {
      Authorization: `Bearer ${setupJson.token}`,
      "Content-Type": "application/json",
      "X-Fanal-CSRF": "1",
    };

    const getInitial = await (await fetch(`${baseUrl}/api/settings/brain`, { headers: authHeaders })).json();
    assert.equal(getInitial.closedCatalog, true);
    assert.equal(getInitial.keysEncryptedAtRest, true);
    assert.equal(JSON.stringify(getInitial).includes("gemini-3.1-pro"), false);

    // Arbitrary model / baseUrl must fail with 400 closed_curated_catalog
    const badRes = await fetch(`${baseUrl}/api/settings/brain`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ fast: { baseUrl: "https://evil.example/v1", model: "gpt-4o" } }),
    });
    assert.equal(badRes.status, 400);
    const badJson = await badRes.json();
    assert.equal(badJson.error, "closed_curated_catalog");

    // Retired local Ollama mode/model and /auto endpoint must be rejected cleanly
    const badLocalRes = await fetch(`${baseUrl}/api/settings/brain`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ mode: "local_sovereign" }),
    });
    assert.equal(badLocalRes.status, 400);
    const autoRes = await fetch(`${baseUrl}/api/settings/brain/auto`, {
      method: "POST",
      headers: authHeaders,
      body: "{}",
    });
    assert.equal(autoRes.status, 410);
    const autoJson = await autoRes.json();
    assert.equal(autoJson.error, "local_engine_removed");

    // Save Dual BYOK keys and verify encrypted-at-rest storage + GET masking + diag redaction
    const dsKey = "sk-win-linux-mac-ds-9988";
    const gemKey = "AIzaSyWinLinuxMacGemKey77665544";
    const saveRes = await fetch(`${baseUrl}/api/settings/brain`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ mode: "dual_cloud", deepseekKey: dsKey, geminiKey: gemKey }),
    });
    assert.equal(saveRes.status, 200);
    const saveJson = await saveRes.json();
    assert.equal(saveJson.ok, true);
    assert.equal(saveJson.deepseek.configured, true);
    assert.equal(saveJson.gemini.configured, true);
    assert.equal(JSON.stringify(saveJson).includes(dsKey), false);
    assert.equal(JSON.stringify(saveJson).includes(gemKey), false);

    const diskSettingsRaw = readFileSync(join(dataDir, "settings.json"), "utf8");
    const diskSettings = JSON.parse(diskSettingsRaw);
    assert.ok(diskSettings.apiKey.startsWith("AESGCM2:"), "settings.json apiKey must be encrypted when FANAL_MASTER_KEY is set");
    assert.ok(diskSettings.geminiApiKey.startsWith("AESGCM2:"), "settings.json geminiApiKey must be encrypted when FANAL_MASTER_KEY is set");
    assert.equal(diskSettingsRaw.includes(dsKey), false, "plaintext DeepSeek key must not be on disk");
    assert.equal(diskSettingsRaw.includes(gemKey), false, "plaintext Gemini key must not be on disk");

    const statusJson = await (await fetch(`${baseUrl}/api/settings/status`, { headers: authHeaders })).json();
    assert.equal(statusJson.hasKey, true);
    assert.equal(statusJson.hasGeminiKey, true);
    assert.equal(statusJson.keysEncryptedAtRest, true);
    assert.equal(JSON.stringify(statusJson).includes(dsKey), false);
    assert.equal(JSON.stringify(statusJson).includes(gemKey), false);

    const diagJsonText = await (await fetch(`${baseUrl}/api/diagnostic/export`, { headers: authHeaders })).text();
    const diagMdText = await (await fetch(`${baseUrl}/api/diagnostic/export?format=md`, { headers: authHeaders })).text();
    assert.equal(diagJsonText.includes(dsKey), false);
    assert.equal(diagJsonText.includes(gemKey), false);
    assert.equal(diagMdText.includes(dsKey), false);
    assert.equal(diagMdText.includes(gemKey), false);
    assert.ok(diagMdText.includes("Sanitized Diagnostic Export"));

    // Verify dynamic vault-key handoff (POST /api/internal/vault-key): rotation, lock, and unlock
    const rotatedKeyHex = "b".repeat(64);
    const vkRes = await fetch(`${baseUrl}/api/internal/vault-key`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ masterKeyHex: rotatedKeyHex, locked: false }),
    });
    assert.equal(vkRes.status, 200);
    const vkJson = await vkRes.json();
    assert.equal(vkJson.ok, true);
    assert.equal(vkJson.keysEncryptedAtRest, true);

    const statusAfterRotate = await (await fetch(`${baseUrl}/api/settings/status`, { headers: authHeaders })).json();
    assert.equal(statusAfterRotate.hasKey, true, "DeepSeek key must survive master key rotation");
    assert.equal(statusAfterRotate.hasGeminiKey, true, "Gemini key must survive master key rotation");

    // Lock vault -> RAM key cleared, disk remains AESGCM2-sealed
    const lockRes = await fetch(`${baseUrl}/api/internal/vault-key`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ locked: true }),
    });
    assert.equal(lockRes.status, 200);
    const diskWhileLocked = JSON.parse(readFileSync(join(dataDir, "settings.json"), "utf8"));
    assert.ok(diskWhileLocked.apiKey.startsWith("AESGCM2:"), "disk apiKey must stay AESGCM2-sealed while locked");

    // Unlock again with rotatedKeyHex -> keys available again in RAM
    const unlockRes = await fetch(`${baseUrl}/api/internal/vault-key`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ masterKeyHex: rotatedKeyHex, locked: false }),
    });
    assert.equal(unlockRes.status, 200);
    const statusAfterUnlock = await (await fetch(`${baseUrl}/api/settings/status`, { headers: authHeaders })).json();
    assert.equal(statusAfterUnlock.hasKey, true, "DeepSeek key must be available after unlock");
    assert.equal(statusAfterUnlock.hasGeminiKey, true, "Gemini key must be available after unlock");

    console.log("API_CLOSED_BRAIN_TESTS PASSED");
  } finally {
    try {
      if (child.exitCode === null) {
        child.kill("SIGTERM");
        await new Promise((r) => {
          const t = setTimeout(r, 1500);
          child.once("exit", () => { clearTimeout(t); r(); });
        });
      }
    } catch {}
    try { rmSync(dataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); } catch {}
  }
}

run();
