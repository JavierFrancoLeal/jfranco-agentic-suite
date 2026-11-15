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
  DEFAULT_SCRYPT_OPTS,
  guardVaultUnlockAttempt,
  guardVaultUnlockAttemptAsync,
  deriveKeyFromMasterPassword,
  verifyMasterPassword,
  resolveBiometricLink,
  unlockFanalVaultData,
  readStoredVaultAuth,
  hasVaultAuthConfigured,
  getOrCreateMachineBindingSecret,
  setupVaultAuth,
  linkVaultBiometricKey,
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

  // 3b. macOS TouchID unavailable (canPromptTouchID === false or un-enrolled error) fails fast
  const linkMacCantPrompt = await resolveBiometricLink({
    platform: "darwin",
    systemPreferences: {
      canPromptTouchID: () => false,
      promptTouchID: async () => { throw new Error("should not call promptTouchID"); },
    },
  });
  assert.deepEqual(linkMacCantPrompt, { success: false, error: "TOUCH_ID_UNAVAILABLE" });

  const unlockMacCantPrompt = await unlockFanalVaultData({
    method: "BIOMETRIC",
    platform: "darwin",
    systemPreferences: {
      canPromptTouchID: () => false,
      promptTouchID: async () => { throw new Error("should not call promptTouchID"); },
    },
    safeStorage: { isEncryptionAvailable: () => true },
    storedVaultAuth: { osProtectedKeyB64: Buffer.from("cipher").toString("base64") },
  });
  assert.equal(unlockMacCantPrompt.ok, false);
  assert.equal(unlockMacCantPrompt.code, "TOUCH_ID_UNAVAILABLE");

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

    // Sync guard must fail loudly if passed an async verifier
    assert.throws(
      () => guardVaultUnlockAttempt({ archiveDir: join(tmpDir, "sync-guard-check"), machineBindingSecret: secret, verifyCredentialsFn: async () => true, nowMs: t0 }),
      /guardVaultUnlockAttemptAsync/
    );
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }

  // 6. Async guard: WINDOWS_HELLO_UNAVAILABLE does not burn attempts; invalid password locks out on #3
  const asyncDir = mkdtempSync(join(tmpdir(), "fanal-vault-async-"));
  try {
    const secret = getOrCreateMachineBindingSecret(asyncDir, { isEncryptionAvailable: () => false });
    assert.ok(typeof secret === "string" && secret.length === 64);
    const t0 = 1_700_001_000_000;
    const hwMissing = await guardVaultUnlockAttemptAsync({
      archiveDir: asyncDir,
      machineBindingSecret: secret,
      attemptMethod: "WINDOWS_HELLO",
      nowMs: t0,
      verifyCredentialsFn: async () => ({ ok: false, code: "WINDOWS_HELLO_UNAVAILABLE", error: "Use Master Password" }),
    });
    assert.equal(hwMissing.ok, false);
    assert.equal(hwMissing.code, "WINDOWS_HELLO_UNAVAILABLE");
    assert.equal(hwMissing.failedAttempts, 0);
    assert.equal(existsSync(join(asyncDir, "vault_guard_state.json")), false);

    // 7. End-to-end setupVaultAuth + DPAPI linkVaultBiometricKey + unlock + fallback
    const fastScrypt = { ...DEFAULT_SCRYPT_OPTS, N: 1024 };
    assert.equal(hasVaultAuthConfigured(asyncDir), false);
    const weak = setupVaultAuth({ archiveDir: asyncDir, masterPassword: "short", scryptOpts: fastScrypt });
    assert.equal(weak.ok, false);
    assert.equal(weak.code, "WEAK_MASTER_PASSWORD");

    const mockSafeStorage = {
      isEncryptionAvailable: () => true,
      encryptString: (plain) => Buffer.from("DPAPI:" + plain, "utf8"),
      decryptString: (buf) => {
        const s = Buffer.from(buf).toString("utf8");
        if (!s.startsWith("DPAPI:")) throw new Error("DPAPI decrypt failed");
        return s.slice("DPAPI:".length);
      },
    };
    const setupOk = setupVaultAuth({
      archiveDir: asyncDir,
      masterPassword: "Fanal-Loi25-Strong-Key!",
      scryptOpts: fastScrypt,
      safeStorage: mockSafeStorage,
    });
    assert.equal(setupOk.ok, true);
    assert.equal(setupOk.keyBuf.length, 32);
    assert.equal(hasVaultAuthConfigured(asyncDir), true);

    const linked = await linkVaultBiometricKey({
      archiveDir: asyncDir,
      keyBuf: setupOk.keyBuf,
      platform: "win32",
      safeStorage: mockSafeStorage,
    });
    assert.deepEqual(linked, { success: true });

    const storedAfterLink = readStoredVaultAuth(asyncDir);
    assert.ok(storedAfterLink && storedAfterLink.osProtectedKeyB64);

    // Biometric unlock yields identical 32-byte vault key
    const bioUnlock = await guardVaultUnlockAttemptAsync({
      archiveDir: asyncDir,
      machineBindingSecret: getOrCreateMachineBindingSecret(asyncDir, mockSafeStorage),
      attemptMethod: "WINDOWS_HELLO",
      nowMs: t0 + 100,
      verifyCredentialsFn: () => unlockFanalVaultData({
        method: "BIOMETRIC",
        platform: "win32",
        safeStorage: mockSafeStorage,
        storedVaultAuth: storedAfterLink,
      }),
    });
    assert.equal(bioUnlock.ok, true);
    assert.equal(bioUnlock.keyBuf.equals(setupOk.keyBuf), true);
    bioUnlock.keyBuf.fill(0);

    // Fallback to master password when DPAPI is unavailable yields same key
    const dpapiOff = { isEncryptionAvailable: () => false };
    const bioFallback = await guardVaultUnlockAttemptAsync({
      archiveDir: asyncDir,
      machineBindingSecret: getOrCreateMachineBindingSecret(asyncDir, dpapiOff),
      attemptMethod: "WINDOWS_HELLO",
      nowMs: t0 + 200,
      verifyCredentialsFn: () => unlockFanalVaultData({
        method: "BIOMETRIC",
        platform: "win32",
        safeStorage: dpapiOff,
        storedVaultAuth: storedAfterLink,
      }),
    });
    assert.equal(bioFallback.ok, false);
    assert.equal(bioFallback.code, "WINDOWS_HELLO_UNAVAILABLE");

    const pwUnlock = await guardVaultUnlockAttemptAsync({
      archiveDir: asyncDir,
      machineBindingSecret: getOrCreateMachineBindingSecret(asyncDir, dpapiOff),
      attemptMethod: "MASTER_PASSWORD",
      nowMs: t0 + 300,
      verifyCredentialsFn: () => unlockFanalVaultData({
        method: "MASTER_PASSWORD",
        passwordInput: "Fanal-Loi25-Strong-Key!",
        storedVaultAuth: storedAfterLink,
        scryptOpts: fastScrypt,
      }),
    });
    assert.equal(pwUnlock.ok, true);
    assert.equal(pwUnlock.keyBuf.equals(setupOk.keyBuf), true);
    pwUnlock.keyBuf.fill(0);
    setupOk.keyBuf.fill(0);

    // 7b. User cancelling TouchID returns BIOMETRIC_CANCELLED and does NOT increment intrusion counter;
    // whereas corrupt DPAPI decryption (SAFE_STORAGE_DECRYPT_FAILED) DOES count toward lockout.
    const bioCancelDir = mkdtempSync(join(tmpdir(), "fanal-vault-cancel-"));
    try {
      const bioCancelSecret = getOrCreateMachineBindingSecret(bioCancelDir, dpapiOff);
      const darwinCancel = await guardVaultUnlockAttemptAsync({
        archiveDir: bioCancelDir,
        machineBindingSecret: bioCancelSecret,
        attemptMethod: "TOUCH_ID",
        nowMs: t0 + 400,
        verifyCredentialsFn: () => unlockFanalVaultData({
          method: "BIOMETRIC",
          platform: "darwin",
          systemPreferences: { promptTouchID: async () => { throw new Error("User canceled Touch ID"); } },
          safeStorage: mockSafeStorage,
          storedVaultAuth: storedAfterLink,
        }),
      });
      assert.equal(darwinCancel.ok, false);
      assert.equal(darwinCancel.code, "BIOMETRIC_CANCELLED");
      assert.equal(darwinCancel.failedAttempts, 0);
      assert.equal(existsSync(join(bioCancelDir, "vault_guard_state.json")), false);

      const decryptFail = await guardVaultUnlockAttemptAsync({
        archiveDir: bioCancelDir,
        machineBindingSecret: bioCancelSecret,
        attemptMethod: "WINDOWS_HELLO",
        nowMs: t0 + 500,
        verifyCredentialsFn: () => unlockFanalVaultData({
          method: "BIOMETRIC",
          platform: "win32",
          safeStorage: { isEncryptionAvailable: () => true, decryptString: () => { throw new Error("bad cipher"); } },
          storedVaultAuth: storedAfterLink,
        }),
      });
      assert.equal(decryptFail.ok, false);
      assert.equal(decryptFail.code, "SAFE_STORAGE_DECRYPT_FAILED");
      assert.equal(decryptFail.failedAttempts, 1);
    } finally {
      rmSync(bioCancelDir, { recursive: true, force: true });
    }
  } finally {
    rmSync(asyncDir, { recursive: true, force: true });
  }

  // 8. Static runtime wiring contract across preload.js, main.js, and dashboard.html
  const preloadSrc = readFileSync(join(ROOT, "apps", "desktop", "preload.js"), "utf8");
  for (const sym of ["fanalIPC", "electronAPI", "setupVault", "unlockVault", "lockVault", "getVaultStatus", "linkBiometric", "fanal:vault-locked", "fanal:vault-unlocked"]) {
    assert.ok(preloadSrc.includes(sym), `preload.js missing ${sym}`);
  }
  const mainSrc = readFileSync(join(ROOT, "apps", "desktop", "main.js"), "utf8");
  for (const ch of ["fanal:vault-status", "fanal:setup-vault", "fanal:unlock-vault", "fanal:lock-vault", "fanal:link-biometric", "startBankGradeSecurityWatchdog("]) {
    assert.ok(mainSrc.includes(ch), `main.js missing ${ch}`);
  }
  const dashSrc = readFileSync(join(ROOT, "supervisor", "dashboard.html"), "utf8");
  for (const fn of ["triggerBiometricUnlock", "triggerPasswordUnlock", "fanal:vault-locked", "setupVault", "vaultSaved"]) {
    assert.ok(dashSrc.includes(fn), `dashboard.html missing ${fn}`);
  }

  console.log("VAULT_BIOMETRIC_TESTS PASSED");
}

main().catch((err) => {
  console.error("test-vault-biometric FAILED:", err && err.stack ? err.stack : err);
  process.exit(1);
});
