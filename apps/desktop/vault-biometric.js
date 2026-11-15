// Fanal Desktop vault & platform biometric verification helpers.
// Extracted from main.js so both the Electron main process and cross-platform
// CI unit tests (macOS/Linux/Windows) can exercise Windows Hello fallback and
// Loi 25 brute-force cooldown logic deterministically.
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");

const DEFAULT_SCRYPT_OPTS = { N: 65536, r: 8, p: 1, maxmem: 128 * 1024 * 1024 };
const VAULT_AUTH_FILE = "vault-auth.json";
const VAULT_BINDING_FILE = "vault-binding.bin";
const NON_INTRUSION_UNAVAILABLE_CODES = new Set([
  "WINDOWS_HELLO_UNAVAILABLE",
  "TOUCH_ID_UNAVAILABLE",
  "PLATAFORMA_SIN_BIOMETRIA",
  "SAFE_STORAGE_UNAVAILABLE",
  "MISSING_PROTECTED_KEY",
  "BIOMETRIC_CANCELLED",
]);

function readCooldownDecision(archiveDir, machineBindingSecret, nowMs) {
  const stateFile = path.join(archiveDir, "vault_guard_state.json");
  let state = { failedAttempts: 0, lockedUntilMs: 0, lastFailIso: null };

  if (fs.existsSync(stateFile)) {
    try {
      const raw = JSON.parse(fs.readFileSync(stateFile, "utf8"));
      const payloadStr = raw.failedAttempts + ":" + raw.lockedUntilMs + ":" + raw.lastFailIso;
      const expectedHex = crypto.createHmac("sha256", machineBindingSecret).update(payloadStr).digest("hex");
      const rawBuf = Buffer.from(String(raw.hmac || ""), "hex");
      const expBuf = Buffer.from(expectedHex, "hex");
      if (rawBuf.length === expBuf.length && rawBuf.length > 0 && crypto.timingSafeEqual(rawBuf, expBuf)) {
        state = { failedAttempts: raw.failedAttempts, lockedUntilMs: raw.lockedUntilMs, lastFailIso: raw.lastFailIso };
      } else {
        state = { failedAttempts: 6, lockedUntilMs: nowMs + 900000, lastFailIso: new Date(nowMs).toISOString() };
      }
    } catch {
      state = { failedAttempts: 3, lockedUntilMs: nowMs + 60000, lastFailIso: new Date(nowMs).toISOString() };
    }
  }

  if (nowMs < state.lockedUntilMs) {
    const waitSeconds = Math.ceil((state.lockedUntilMs - nowMs) / 1000);
    return {
      blocked: true,
      stateFile,
      state,
      response: {
        ok: false,
        status: "COOLDOWN_ACTIVE",
        failedAttempts: state.failedAttempts,
        waitSeconds,
        uiMessage: "⏳ Protección activa: espera " + waitSeconds + " s antes de volver a intentar.",
      },
    };
  }
  return { blocked: false, stateFile, state };
}

function clearCooldownOnSuccess(stateFile, state) {
  if (state.failedAttempts > 0 && fs.existsSync(stateFile)) {
    try { fs.unlinkSync(stateFile); } catch {}
  }
  return { ok: true, status: "UNLOCKED", failedAttempts: 0, waitSeconds: 0 };
}

function recordCooldownFailure({ archiveDir, stateFile, state, machineBindingSecret, attemptMethod, nowMs, extra }) {
  const loi25File = path.join(archiveDir, "registre_incidents_loi25.jsonl");
  const next = {
    failedAttempts: state.failedAttempts + 1,
    lockedUntilMs: state.lockedUntilMs,
    lastFailIso: new Date(nowMs).toISOString(),
  };
  let penaltySeconds = 0;
  if (next.failedAttempts >= 3) {
    penaltySeconds = Math.min(3600, 30 * Math.pow(2, next.failedAttempts - 3));
    next.lockedUntilMs = nowMs + penaltySeconds * 1000;
  }

  const newPayloadStr = next.failedAttempts + ":" + next.lockedUntilMs + ":" + next.lastFailIso;
  const hmac = crypto.createHmac("sha256", machineBindingSecret).update(newPayloadStr).digest("hex");
  try {
    fs.mkdirSync(archiveDir, { recursive: true, mode: 0o700 });
    fs.writeFileSync(
      stateFile,
      JSON.stringify({ failedAttempts: next.failedAttempts, lockedUntilMs: next.lockedUntilMs, lastFailIso: next.lastFailIso, hmac }),
      { mode: 0o600 }
    );
  } catch {}

  if (next.failedAttempts >= 3) {
    const rec = {
      dateDetection: next.lastFailIso,
      circumstances:
        "Intento de desbloqueo físico no autorizado #"
        + next.failedAttempts
        + " vía "
        + (attemptMethod || "MASTER_PASSWORD")
        + " en sesión OS '"
        + os.userInfo().username
        + "' ("
        + os.hostname()
        + ").",
      natureOfPersonalInfo: ["Bóveda local cifrada AES-256-GCM (0 bytes expuestos)"],
      personsAffectedCount: 0,
      seriousHarmRiskAssessed: false,
      notifiedCaiAndPersonsAt: null,
      mitigationMeasuresTaken:
        "Bloqueo exponencial activado por " + penaltySeconds + " segundos y llave maestra purgada de memoria RAM.",
    };
    try { fs.appendFileSync(loi25File, JSON.stringify(rec) + "\n", { mode: 0o600 }); } catch {}
  }

  return {
    ...(extra || {}),
    ok: false,
    status: next.failedAttempts >= 3 ? "INTRUSION_LOCKOUT_LOGGED" : "INVALID_CREDENTIAL",
    failedAttempts: next.failedAttempts,
    waitSeconds: penaltySeconds,
    uiMessage: penaltySeconds > 0
      ? ("🔒 Intento #" + next.failedAttempts + " fallido. Bóveda bloqueada por " + penaltySeconds + " s (Registrado en la bitácora Loi 25).")
      : ("Clave incorrecta (" + (3 - next.failedAttempts) + " intento(s) antes del bloqueo temporal)."),
  };
}

function guardVaultUnlockAttempt(o) {
  const nowMs = typeof o.nowMs === "number" ? o.nowMs : Date.now();
  const check = readCooldownDecision(o.archiveDir, o.machineBindingSecret, nowMs);
  if (check.blocked) return check.response;

  const result = o.verifyCredentialsFn ? o.verifyCredentialsFn() : false;
  if (result && typeof result.then === "function") {
    throw new Error("guardVaultUnlockAttempt requires a synchronous verifier; use guardVaultUnlockAttemptAsync");
  }
  if (Boolean(result)) return clearCooldownOnSuccess(check.stateFile, check.state);

  return recordCooldownFailure({
    archiveDir: o.archiveDir,
    stateFile: check.stateFile,
    state: check.state,
    machineBindingSecret: o.machineBindingSecret,
    attemptMethod: o.attemptMethod,
    nowMs,
  });
}

async function guardVaultUnlockAttemptAsync(o) {
  const nowMs = typeof o.nowMs === "number" ? o.nowMs : Date.now();
  const check = readCooldownDecision(o.archiveDir, o.machineBindingSecret, nowMs);
  if (check.blocked) return check.response;

  const raw = o.verifyCredentialsFn ? await o.verifyCredentialsFn() : false;
  if (raw === true || (raw && typeof raw === "object" && raw.ok)) {
    const out = clearCooldownOnSuccess(check.stateFile, check.state);
    if (raw && typeof raw === "object" && raw.keyBuf) out.keyBuf = raw.keyBuf;
    return out;
  }

  const code = raw && typeof raw === "object" ? raw.code : undefined;
  const error = raw && typeof raw === "object" ? raw.error : undefined;
  if (code && NON_INTRUSION_UNAVAILABLE_CODES.has(code)) {
    return {
      ok: false,
      status: code,
      code,
      failedAttempts: check.state.failedAttempts,
      waitSeconds: 0,
      error,
      uiMessage: error || code,
    };
  }

  return recordCooldownFailure({
    archiveDir: o.archiveDir,
    stateFile: check.stateFile,
    state: check.state,
    machineBindingSecret: o.machineBindingSecret,
    attemptMethod: o.attemptMethod,
    nowMs,
    extra: code || error ? { code, error } : undefined,
  });
}

function deriveKeyFromMasterPassword(plain, saltHex, scryptOpts = DEFAULT_SCRYPT_OPTS) {
  try {
    return crypto.scryptSync(String(plain).normalize("NFKC"), Buffer.from(saltHex, "hex"), 32, scryptOpts);
  } catch {
    return null;
  }
}

function verifyMasterPassword(plain, stored, scryptOpts = DEFAULT_SCRYPT_OPTS) {
  try {
    if (!stored || !stored.saltHex || !stored.verifierHmacHex) return null;
    const cand = deriveKeyFromMasterPassword(plain, stored.saltHex, scryptOpts);
    if (!cand) return null;
    const verifier = crypto.createHmac("sha256", cand).update("FANAL_VAULT_VERIFIER_V1").digest();
    const expected = Buffer.from(stored.verifierHmacHex, "hex");
    if (verifier.length !== expected.length || !crypto.timingSafeEqual(verifier, expected)) {
      cand.fill(0);
      return null;
    }
    return cand;
  } catch {
    return null;
  }
}

function hasSafeStorage(safeStorage) {
  try {
    return Boolean(safeStorage && typeof safeStorage.isEncryptionAvailable === "function" && safeStorage.isEncryptionAvailable());
  } catch {
    return false;
  }
}

async function resolveBiometricLink({ platform = process.platform, systemPreferences, safeStorage, reason } = {}) {
  try {
    if (platform === "darwin") {
      if (!systemPreferences || typeof systemPreferences.promptTouchID !== "function") {
        return { success: false, error: "TOUCH_ID_UNAVAILABLE" };
      }
      if (typeof systemPreferences.canPromptTouchID === "function" && !systemPreferences.canPromptTouchID()) {
        return { success: false, error: "TOUCH_ID_UNAVAILABLE" };
      }
      await systemPreferences.promptTouchID(reason || "vincular la biometría a la bóveda Fanal (Loi 25)");
      return { success: true };
    }
    if (platform === "win32") {
      return hasSafeStorage(safeStorage)
        ? { success: true }
        : { success: false, error: "WINDOWS_HELLO_UNAVAILABLE" };
    }
    return { success: false, error: "PLATAFORMA_SIN_BIOMETRIA" };
  } catch (e) {
    const msg = String(e && e.message ? e.message : e || "");
    if (/not available|unavailable|not enrolled|disabled|no identity/i.test(msg)) {
      return { success: false, error: "TOUCH_ID_UNAVAILABLE" };
    }
    return { success: false, error: msg || "TOUCH_ID_UNAVAILABLE" };
  }
}

async function unlockFanalVaultData(o) {
  const platform = o.platform || process.platform;
  try {
    if (o.method === "BIOMETRIC") {
      if (platform === "darwin") {
        if (!o.systemPreferences || typeof o.systemPreferences.promptTouchID !== "function") {
          return { ok: false, code: "TOUCH_ID_UNAVAILABLE", error: "Touch ID no disponible. Usa tu Contraseña Maestra." };
        }
        if (typeof o.systemPreferences.canPromptTouchID === "function" && !o.systemPreferences.canPromptTouchID()) {
          return { ok: false, code: "TOUCH_ID_UNAVAILABLE", error: "Touch ID no disponible. Usa tu Contraseña Maestra." };
        }
        try {
          await o.systemPreferences.promptTouchID("déverrouiller la voûte fiduciaire Fanal (Loi 25)");
        } catch (bioErr) {
          const msg = String(bioErr && bioErr.message ? bioErr.message : bioErr || "");
          if (/not available|unavailable|not enrolled|disabled/i.test(msg)) {
            return { ok: false, code: "TOUCH_ID_UNAVAILABLE", error: "Touch ID no disponible. Usa tu Contraseña Maestra." };
          }
          if (/cancel/i.test(msg)) {
            return { ok: false, code: "BIOMETRIC_CANCELLED", error: "Biometría cancelada. Usa tu Contraseña Maestra." };
          }
          return { ok: false, code: "BIOMETRIC_FAILED", error: "Biometría no reconocida. Usa tu Contraseña Maestra." };
        }
      } else if (platform === "win32") {
        if (!hasSafeStorage(o.safeStorage)) {
          return {
            ok: false,
            code: "WINDOWS_HELLO_UNAVAILABLE",
            error: "Windows Hello / cifrado DPAPI no disponible. Usa tu Contraseña Maestra.",
          };
        }
      } else {
        return { ok: false, code: "PLATAFORMA_SIN_BIOMETRIA", error: "Biometría no soportada en esta plataforma. Usa tu Contraseña Maestra." };
      }

      if (!hasSafeStorage(o.safeStorage) || typeof o.safeStorage.decryptString !== "function") {
        return { ok: false, code: "SAFE_STORAGE_UNAVAILABLE", error: "Almacenamiento seguro del sistema no disponible. Usa tu Contraseña Maestra." };
      }
      const b64 = o.storedVaultAuth && o.storedVaultAuth.osProtectedKeyB64;
      if (!b64 || typeof b64 !== "string") {
        return { ok: false, code: "MISSING_PROTECTED_KEY", error: "Llave biométrica no configurada. Usa tu Contraseña Maestra." };
      }
      const encBuf = Buffer.from(b64, "base64");
      let hexKey = "";
      try {
        hexKey = String(o.safeStorage.decryptString(encBuf) || "").trim();
      } catch {
        return { ok: false, code: "SAFE_STORAGE_DECRYPT_FAILED", error: "No se pudo descifrar la llave protegida. Usa tu Contraseña Maestra." };
      }
      if (!/^[a-f0-9]{64}$/i.test(hexKey)) {
        return { ok: false, code: "INVALID_VAULT_KEY", error: "Llave protegida inválida. Usa tu Contraseña Maestra." };
      }
      return { ok: true, keyBuf: Buffer.from(hexKey, "hex") };
    }

    const derived = verifyMasterPassword(o.passwordInput, o.storedVaultAuth, o.scryptOpts);
    if (!derived) {
      return { ok: false, code: "INVALID_MASTER_PASSWORD", error: "Contraseña maestra incorrecta." };
    }
    return { ok: true, keyBuf: derived };
  } catch {
    return { ok: false, code: "BIOMETRIC_FAILED", error: "Biometría no reconocida. Usa tu Contraseña Maestra." };
  }
}

function readStoredVaultAuth(archiveDir) {
  try {
    const file = path.join(archiveDir, VAULT_AUTH_FILE);
    if (!fs.existsSync(file)) return null;
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!raw || !/^[a-f0-9]{32}$/i.test(String(raw.saltHex || "")) || !/^[a-f0-9]{64}$/i.test(String(raw.verifierHmacHex || ""))) {
      return null;
    }
    return raw;
  } catch {
    return null;
  }
}

function hasVaultAuthConfigured(archiveDir) {
  return Boolean(readStoredVaultAuth(archiveDir));
}

function getOrCreateMachineBindingSecret(archiveDir, safeStorage) {
  const file = path.join(archiveDir, VAULT_BINDING_FILE);
  try {
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
      if (parsed && parsed.mode === "enc" && typeof parsed.data === "string"
        && hasSafeStorage(safeStorage) && typeof safeStorage.decryptString === "function") {
        const plain = safeStorage.decryptString(Buffer.from(parsed.data, "base64"));
        if (plain) return plain;
      }
      if (parsed && parsed.mode === "raw" && typeof parsed.data === "string" && parsed.data) {
        return parsed.data;
      }
    }
  } catch {}

  const secretHex = crypto.randomBytes(32).toString("hex");
  try {
    fs.mkdirSync(archiveDir, { recursive: true, mode: 0o700 });
    let record = { mode: "raw", data: secretHex };
    if (hasSafeStorage(safeStorage) && typeof safeStorage.encryptString === "function") {
      record = { mode: "enc", data: safeStorage.encryptString(secretHex).toString("base64") };
    }
    fs.writeFileSync(file, JSON.stringify(record), { mode: 0o600 });
  } catch {}
  return secretHex;
}

function setupVaultAuth({ archiveDir, masterPassword, scryptOpts = DEFAULT_SCRYPT_OPTS, safeStorage }) {
  const normalized = typeof masterPassword === "string" ? masterPassword.normalize("NFKC") : "";
  if (normalized.length < 12) {
    return {
      ok: false,
      code: "WEAK_MASTER_PASSWORD",
      error: "La contraseña maestra debe tener al menos 12 caracteres.",
    };
  }
  const saltHex = crypto.randomBytes(16).toString("hex");
  const keyBuf = deriveKeyFromMasterPassword(normalized, saltHex, scryptOpts);
  if (!keyBuf) {
    return { ok: false, code: "KEY_DERIVATION_FAILED", error: "No se pudo derivar la llave de la bóveda." };
  }
  const verifierHmacHex = crypto.createHmac("sha256", keyBuf).update("FANAL_VAULT_VERIFIER_V1").digest("hex");
  const existing = readStoredVaultAuth(archiveDir);
  const record = {
    version: 1,
    saltHex,
    verifierHmacHex,
    createdAtIso: existing?.createdAtIso || new Date().toISOString(),
    updatedAtIso: new Date().toISOString(),
  };
  fs.mkdirSync(archiveDir, { recursive: true, mode: 0o700 });
  fs.writeFileSync(path.join(archiveDir, VAULT_AUTH_FILE), JSON.stringify(record, null, 2), { mode: 0o600 });
  getOrCreateMachineBindingSecret(archiveDir, safeStorage);
  return { ok: true, keyBuf };
}

async function linkVaultBiometricKey({ archiveDir, keyBuf, platform = process.platform, systemPreferences, safeStorage, reason }) {
  const stored = readStoredVaultAuth(archiveDir);
  if (!stored) {
    return { success: false, error: "Configura tu Contraseña Maestra primero antes de vincular biometría." };
  }
  if (!Buffer.isBuffer(keyBuf) || keyBuf.length !== 32) {
    return { success: false, error: "Desbloquea la bóveda con tu Contraseña Maestra antes de vincular biometría." };
  }
  const linkRes = await resolveBiometricLink({ platform, systemPreferences, safeStorage, reason });
  if (!linkRes || !linkRes.success) return linkRes;

  if (!hasSafeStorage(safeStorage) || typeof safeStorage.encryptString !== "function") {
    return {
      success: false,
      error: platform === "win32" ? "WINDOWS_HELLO_UNAVAILABLE" : "SAFE_STORAGE_UNAVAILABLE",
    };
  }
  try {
    const encBuf = safeStorage.encryptString(keyBuf.toString("hex"));
    const updated = {
      ...stored,
      osProtectedKeyB64: encBuf.toString("base64"),
      biometricLinkedAtIso: new Date().toISOString(),
    };
    fs.writeFileSync(path.join(archiveDir, VAULT_AUTH_FILE), JSON.stringify(updated, null, 2), { mode: 0o600 });
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e && e.message ? e.message : e) };
  }
}

module.exports = {
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
};
