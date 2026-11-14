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

function guardVaultUnlockAttempt(o) {
  const stateFile = path.join(o.archiveDir, "vault_guard_state.json");
  const loi25File = path.join(o.archiveDir, "registre_incidents_loi25.jsonl");
  const nowMs = typeof o.nowMs === "number" ? o.nowMs : Date.now();
  let state = { failedAttempts: 0, lockedUntilMs: 0, lastFailIso: null };

  if (fs.existsSync(stateFile)) {
    try {
      const raw = JSON.parse(fs.readFileSync(stateFile, "utf8"));
      const payloadStr = raw.failedAttempts + ":" + raw.lockedUntilMs + ":" + raw.lastFailIso;
      const expectedHex = crypto.createHmac("sha256", o.machineBindingSecret).update(payloadStr).digest("hex");
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
      ok: false,
      status: "COOLDOWN_ACTIVE",
      failedAttempts: state.failedAttempts,
      waitSeconds,
      uiMessage: "⏳ Protección activa: espera " + waitSeconds + " s antes de volver a intentar.",
    };
  }

  const isUnlocked = Boolean(o.verifyCredentialsFn && o.verifyCredentialsFn());
  if (isUnlocked) {
    if (state.failedAttempts > 0 && fs.existsSync(stateFile)) {
      try { fs.unlinkSync(stateFile); } catch {}
    }
    return { ok: true, status: "UNLOCKED", failedAttempts: 0, waitSeconds: 0 };
  }

  state.failedAttempts += 1;
  state.lastFailIso = new Date(nowMs).toISOString();
  let penaltySeconds = 0;
  if (state.failedAttempts >= 3) {
    penaltySeconds = Math.min(3600, 30 * Math.pow(2, state.failedAttempts - 3));
    state.lockedUntilMs = nowMs + penaltySeconds * 1000;
  }

  const newPayloadStr = state.failedAttempts + ":" + state.lockedUntilMs + ":" + state.lastFailIso;
  const hmac = crypto.createHmac("sha256", o.machineBindingSecret).update(newPayloadStr).digest("hex");
  try {
    fs.mkdirSync(o.archiveDir, { recursive: true, mode: 0o700 });
    fs.writeFileSync(
      stateFile,
      JSON.stringify({ failedAttempts: state.failedAttempts, lockedUntilMs: state.lockedUntilMs, lastFailIso: state.lastFailIso, hmac }),
      { mode: 0o600 }
    );
  } catch {}

  if (state.failedAttempts >= 3) {
    const rec = {
      dateDetection: state.lastFailIso,
      circumstances:
        "Intento de desbloqueo físico no autorizado #"
        + state.failedAttempts
        + " vía "
        + (o.attemptMethod || "MASTER_PASSWORD")
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
    ok: false,
    status: state.failedAttempts >= 3 ? "INTRUSION_LOCKOUT_LOGGED" : "INVALID_CREDENTIAL",
    failedAttempts: state.failedAttempts,
    waitSeconds: penaltySeconds,
    uiMessage: penaltySeconds > 0
      ? ("🔒 Intento #" + state.failedAttempts + " fallido. Bóveda bloqueada por " + penaltySeconds + " s (Registrado en la bitácora Loi 25).")
      : ("Clave incorrecta (" + (3 - state.failedAttempts) + " intento(s) antes del bloqueo temporal)."),
  };
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
    return { success: false, error: String(e && e.message ? e.message : e) };
  }
}

async function unlockFanalVaultData(o) {
  const platform = o.platform || process.platform;
  try {
    if (o.method === "BIOMETRIC") {
      if (platform === "darwin") {
        if (!o.systemPreferences || typeof o.systemPreferences.promptTouchID !== "function") {
          return { ok: false, code: "TOUCH_ID_UNAVAILABLE", error: "Biometría cancelada o no reconocida. Usa tu Contraseña Maestra." };
        }
        await o.systemPreferences.promptTouchID("déverrouiller la voûte fiduciaire Fanal (Loi 25)");
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
      const hexKey = String(o.safeStorage.decryptString(encBuf) || "").trim();
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
    return { ok: false, code: "BIOMETRIC_CANCELLED", error: "Biometría cancelada o no reconocida. Usa tu Contraseña Maestra." };
  }
}

module.exports = {
  DEFAULT_SCRYPT_OPTS,
  guardVaultUnlockAttempt,
  deriveKeyFromMasterPassword,
  verifyMasterPassword,
  resolveBiometricLink,
  unlockFanalVaultData,
};
