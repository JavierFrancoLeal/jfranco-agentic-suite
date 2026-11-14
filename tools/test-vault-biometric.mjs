#!/usr/bin/env node
// test-vault-biometric.mjs — deterministic unit tests for Fanal Desktop's
// Windows Hello fallback (`WINDOWS_HELLO_UNAVAILABLE`), TouchID/safeStorage
// guards, scrypt master-password verification, and Loi 25 brute-force lockout.

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import crypto from "node:crypto";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const req = createRequire(import.meta.url);
const vb = req(join(ROOT, "apps", "desktop", "vault-biometric.js"));

const {
  guardVaultUnlockAttempt,
  deriveKeyFromMasterPassword,
  verifyMasterPassword,
  resolveBiometricLink,
  unlockFanalVaultData,
} = vb;

async function main() {
  // 1. Windows without Windows Hello / DPAPI safeStorage -> explicit WINDOWS_HELLO_UNAVAILABLE
  const linkWinUnavailable = await resolveBiometricLink({
    platform: "win32",
    safeStorage: { isEncryptionAvailable: () => false },
  });
  assert.deepEqual(linkWinUnavailable, { success: false, error: "WINDOWS_HELLO_UNAVAILABLE" });

  const unlockWinUnavailable = await unlockFanalVaultData({
    method: "BIOMETRIC",
    platform: "win32",
    safeStorage: { isEncryptionAvailable: () => false, decryptString: () => { throw new Error("must not decrypt"); } },
    storedVaultAuth: { osProtectedKeyB64: Buffer.from("x").toString("base64") },
  });
  assert.equal(unlockWinUnavailable.ok, false);
  assert.equal(unlockWinUnavailable.code, "WINDOWS_HELLO_UNAVAILABLE");

  // 2. Windows with DPAPI available -> decrypts valid 32-byte hex key; rejects corrupted key
  const goodHex = "a".repeat(64);
  const linkWinOk = await resolveBiometricLink({
    platform: "win32",
    safeStorage: { isEncryptionAvailable: () => true },
  });
  assert.deepEqual(linkWinOk, { success: true });

  const unlockWinOk = await unlockFanalVaultData({
    method: "BIOMETRIC",
    platform: "win32",
    safeStorage: { isEncryptionAvailable: () => true, decryptString: () => goodHex },
    storedVaultAuth: { osProtectedKeyB64: Buffer.from("cipher").toString("base64") },
  });
  assert.equal(unlockWinOk.ok, true);
  assert.equal(Buffer.isBuffer(unlockWinOk.keyBuf), true);
  assert.equal(unlockWinOk.keyBuf.length, 32);

  const unlockBadHex = await unlockFanalVaultData({
    method: "BIOMETRIC",
    platform: "win32",
    safeStorage: { isEncryptionAvailable: () => true, decryptString: () => "not-hex" },
    storedVaultAuth: { osProtectedKeyB64: Buffer.from("cipher").toString("base64") },
  });
  assert.equal(unlockBadHex.ok, false);
  assert.equal(unlockBadHex.code, "INVALID_VAULT_KEY");

  // 3. macOS TouchID cancellation fails closed; Linux reports unsupported
  const unlockMacCancelled = await unlockFanalVaultData({
    method: "BIOMETRIC",
    platform: "darwin",
    systemPreferences: { promptTouchID: async () => { throw new Error("canceled"); } },
    safeStorage: { isEncryptionAvailable: () => true },
    storedVaultAuth: { osProtectedKeyB64: Buffer.from("cipher").toString("base64") },
  });
  assert.equal(unlockMacCancelled.ok, false);
  assert.equal(unlockMacCancelled.code, "BIOMETRIC_CANCELLED");

  const linkLinux = await resolveBiometricLink({ platform: "linux" });
  assert.deepEqual(linkLinux, { success: false, error: "PLATAFORMA_SIN_BIOMETRIA" });

  // 4. Master password scrypt derivation + NFKC + timing-safe verifier (production N=65536 once)
  const saltHex = "01".repeat(16);
  const masterKey = deriveKeyFromMasterPassword("Fanal-Test-Key!", saltHex);
  assert.ok(masterKey && masterKey.length === 32);
  const verifierHmacHex = crypto.createHmac("sha256", masterKey).update("FANAL_VAULT_VERIFIER_V1").digest("hex");
  const stored = { saltHex, verifierHmacHex };

  const wrongPw = verifyMasterPassword("wrong", stored);
  assert.equal(wrongPw, null);
  const okPw = await unlockFanalVaultData({
    method: "MASTER_PASSWORD",
    passwordInput: "Fanal-Test-Key!",
    storedVaultAuth: stored,
  });
  assert.equal(okPw.ok, true);
  assert.equal(okPw.keyBuf.equals(masterKey), true);
  masterKey.fill(0);
  okPw.keyBuf.fill(0);

  // 5. Brute-force guard + Loi 25 incident logging + HMAC tamper lockout
  const tmpDir = mkdtempSync(join(tmpdir(), "fanal-vault-test-"));
  const archiveDir = join(tmpDir, "nested-archive");
  try {
    const secret = "machine-secret-test";
    const t0 = 1_700_000_000_000;
    const f1 = guardVaultUnlockAttempt({ archiveDir, machineBindingSecret: secret, verifyCredentialsFn: () => false, nowMs: t0 });
    assert.equal(f1.ok, false);
    assert.equal(f1.status, "INVALID_CREDENTIAL");
    const f2 = guardVaultUnlockAttempt({ archiveDir, machineBindingSecret: secret, verifyCredentialsFn: () => false, nowMs: t0 + 1000 });
    assert.equal(f2.status, "INVALID_CREDENTIAL");
    const f3 = guardVaultUnlockAttempt({ archiveDir, machineBindingSecret: secret, verifyCredentialsFn: () => false, attemptMethod: "WINDOWS_HELLO", nowMs: t0 + 2000 });
    assert.equal(f3.status, "INTRUSION_LOCKOUT_LOGGED");
    assert.equal(f3.waitSeconds, 30);

    const loiFile = join(archiveDir, "registre_incidents_loi25.jsonl");
    assert.equal(existsSync(loiFile), true);
    const lines = readFileSync(loiFile, "utf8").trim().split("\n");
    assert.equal(lines.length, 1);
    assert.ok(JSON.parse(lines[0]).circumstances.includes("WINDOWS_HELLO"));

    const blocked = guardVaultUnlockAttempt({ archiveDir, machineBindingSecret: secret, verifyCredentialsFn: () => true, nowMs: t0 + 5000 });
    assert.equal(blocked.ok, false);
    assert.equal(blocked.status, "COOLDOWN_ACTIVE");

    // After cooldown clears, correct unlock clears state file
    const unlocked = guardVaultUnlockAttempt({ archiveDir, machineBindingSecret: secret, verifyCredentialsFn: () => true, nowMs: t0 + 40_000 });
    assert.equal(unlocked.ok, true);
    assert.equal(unlocked.status, "UNLOCKED");
    assert.equal(existsSync(join(archiveDir, "vault_guard_state.json")), false);

    // Tampered state HMAC fails closed
    writeFileSync(join(archiveDir, "vault_guard_state.json"), JSON.stringify({ failedAttempts: 0, lockedUntilMs: 0, lastFailIso: null, hmac: "00".repeat(32) }));
    const tampered = guardVaultUnlockAttempt({ archiveDir, machineBindingSecret: secret, verifyCredentialsFn: () => true, nowMs: t0 + 50_000 });
    assert.equal(tampered.ok, false);
    assert.equal(tampered.status, "COOLDOWN_ACTIVE");
    assert.equal(tampered.waitSeconds, 900);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }

  console.log("VAULT_BIOMETRIC_TESTS PASSED");
}

main().catch((err) => {
  console.error("test-vault-biometric FAILED:", err && err.stack ? err.stack : err);
  process.exit(1);
});
