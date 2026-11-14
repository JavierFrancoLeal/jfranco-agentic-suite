#!/usr/bin/env node
// test-diagnostic-export.mjs — cross-platform unit & regression tests for Fanal's
// shared diagnostic sanitizer, secret/path redaction, legacy vault-object stripping,
// and server/main wiring.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const req = createRequire(import.meta.url);
const ds = req(join(ROOT, "supervisor", "diagnostic-sanitizer.js"));

const {
  redactSecretsAndPaths,
  extractSanitizedText,
  sanitizeTicketRecord,
  buildSanitizedDiagnosticReport,
} = ds;

function run() {
  // 1. Deterministic redaction of API keys, Bearer/GitHub tokens, URL creds, CLI flags & local usernames
  const dirty = [
    "Authorization: Bearer super_secret_token_value_123",
    "DeepSeek key sk-proj1234567890abcdef failed",
    "Gemini key AIzaSyDTestSecretKey1234567890abcd failed",
    "GitHub token ghp_1234567890abcdef123456",
    "Spawned server.js init --owner Bob --password MySecretPassword99",
    "macOS path /Users/jfranco/Documents/client-files/tax.pdf",
    "Linux path /home/jfranco/cases/secret.pdf",
    "Windows path C:\\Users\\jfranco\\Documents\\Client\\t4.pdf",
    "Contact jean.tremblay@example.ca or 514-555-0199",
    'JSON {"apiKey": "sk-abc12345678", "geminiApiKey": "AIzaSecretGemini9876543210abcdef", "gemini_api_key": "gemSnakeSecret99", "deepseek_key": "dsSnakeSecret88", "deepseek_api_key": "dsApiSnakeSecret77", "osProtectedKeyB64": "AAAA", "salt": "deadbeef", "hash": "cafe", "key": "secret"}',
    "bare hash: barehash999, bare key=supersecret123, bare salt: cafebabe02, privateKey=privval42",
    "-----BEGIN PRIVATE KEY-----\nMIIBVwIBADANBgkqhkiG9w0BAQEFAASCAT8wggE7\n-----END PRIVATE KEY-----",
    "Diagnostic code preserved: FNL-SANDBOX-502#A1B2",
  ].join("\n");

  const cleaned = redactSecretsAndPaths(dirty);
  for (const forbidden of [
    "super_secret_token_value_123",
    "sk-proj1234567890abcdef",
    "AIzaSyDTestSecretKey1234567890abcd",
    "AIzaSecretGemini9876543210abcdef",
    "gemSnakeSecret99",
    "dsSnakeSecret88",
    "dsApiSnakeSecret77",
    "ghp_1234567890abcdef123456",
    "MySecretPassword99",
    "/Users/jfranco",
    "/home/jfranco",
    "C:\\Users\\jfranco",
    "jean.tremblay@example.ca",
    "514-555-0199",
    "sk-abc12345678",
    "deadbeef",
    "barehash999",
    "supersecret123",
    "cafebabe02",
    "privval42",
    "MIIBVwIBADANBgkqhkiG9w0BAQEFAASCAT8wggE7",
  ]) {
    assert.equal(cleaned.includes(forbidden), false, `must redact "${forbidden}"`);
  }
  assert.ok(cleaned.includes("/Users/[USER]"));
  assert.ok(cleaned.includes("C:\\Users\\[USER]"));
  assert.ok(cleaned.includes("FNL-SANDBOX-502#A1B2"), "support diagnostic token must remain intact");

  // 2. Legacy pre-Paso-2 `{ text, vault }` ticket objects must drop `.vault` completely
  const legacyObj = {
    text: "Client [PER_1] failed at /Users/alice/case.pdf with sk-leak123456789",
    vault: { "[PER_1]": "Jean Tremblay REAL SECRET NAME" },
  };
  const extracted = extractSanitizedText(legacyObj);
  assert.equal(extracted.includes("Jean Tremblay"), false);
  assert.equal(extracted.includes("alice"), false);
  assert.equal(extracted.includes("sk-leak123456789"), false);
  assert.ok(extracted.includes("[PER_1]"));

  const cleanedTicket = sanitizeTicketRecord({
    ticketId: "BUG-TEST1",
    createdAtIso: "2026-11-14T19:00:00Z",
    clientId: "should-be-dropped",
    sanitizedUserReport: legacyObj,
    sanitizedDocStructureSample: { text: "Doc [PER_1]", vault: { "[PER_1]": "Secret Name" } },
    sanitizedRecentLogs: [legacyObj],
  });
  assert.equal("clientId" in cleanedTicket, false);
  assert.equal(typeof cleanedTicket.sanitizedUserReport, "string");
  assert.equal(JSON.stringify(cleanedTicket).includes("Jean Tremblay"), false);
  assert.equal(cleanedTicket.loi25AttestationHash.length, 16);

  // 3. Diagnostic bundle allowlists vault booleans and never passes secret vault fields
  const report = buildSanitizedDiagnosticReport({
    appVersion: "0.1.0",
    platform: "win32",
    vaultStatus: {
      configured: true,
      locked: false,
      biometricLinked: true,
      osProtectedKeyB64: "MUST_NEVER_APPEAR",
      passwordHashHex: "MUST_NEVER_APPEAR_HASH",
    },
    startupLogs: ["2026-11-14 UNCAUGHT at C:\\Users\\marie\\AppData\\main.js --password TopSecret123"],
    recentTickets: [cleanedTicket],
  });
  const serialized = JSON.stringify(report);
  for (const secret of ["MUST_NEVER_APPEAR", "marie", "TopSecret123", "Jean Tremblay"]) {
    assert.equal(serialized.includes(secret), false, `bundle leaked: ${secret}`);
  }
  assert.equal(report.bundle.vaultStatus.configured, true);
  assert.equal(report.bundle.vaultStatus.biometricLinked, true);
  assert.ok(report.markdown.includes("Sanitized Diagnostic Export (Loi 25)"));

  // 4. Server, desktop & dashboard UI wiring assertions
  const serverSrc = readFileSync(join(ROOT, "supervisor", "server.js"), "utf8");
  const mainSrc = readFileSync(join(ROOT, "apps", "desktop", "main.js"), "utf8");
  const preloadSrc = readFileSync(join(ROOT, "apps", "desktop", "preload.js"), "utf8");
  const dashSrc = readFileSync(join(ROOT, "supervisor", "dashboard.html"), "utf8");
  assert.ok(serverSrc.includes("persistVault: false"), "server.js must support persistVault: false in veil()");
  assert.ok(serverSrc.includes('"/api/diagnostic/export"'), "server.js must expose /api/diagnostic/export");
  assert.ok(mainSrc.includes('"fanal:export-diagnostic"'), "main.js must register fanal:export-diagnostic");
  assert.ok(preloadSrc.includes("exportDiagnostic"), "preload.js must expose exportDiagnostic");
  assert.ok(dashSrc.includes('id="diagExportMdBtn"'), "dashboard.html must wire diagExportMdBtn");
  assert.ok(dashSrc.includes('id="diagExportJsonBtn"'), "dashboard.html must wire diagExportJsonBtn");
  assert.ok(dashSrc.includes("fanalIPC.exportDiagnostic"), "dashboard.html must invoke fanalIPC.exportDiagnostic");
  assert.ok(dashSrc.includes("/api/diagnostic/export"), "dashboard.html must support /api/diagnostic/export fallback");

  console.log("DIAGNOSTIC_EXPORT_TESTS PASSED");
}

run();
