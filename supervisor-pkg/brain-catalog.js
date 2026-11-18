// supervisor/brain-catalog.js — Closed Apple-style curated AI brain catalog:
// exclusive DeepSeek + Google Gemini dual-hemisphere synergy, Dual BYOK key
// isolation, and AES-256-GCM silo encryption compatibility.
// Created by J.Franco. MIT license.
"use strict";

const crypto = require("node:crypto");

const DEEPSEEK_CHAT_URL = "https://api.deepseek.com/chat/completions";
const GEMINI_OPENAI_BASE = "https://generativelanguage.googleapis.com/v1beta/openai";

const CURATED_BRAIN_MODES = Object.freeze({
  dual_cloud: Object.freeze({
    id: "dual_cloud",
    local: false,
    fast: Object.freeze({ provider: "deepseek", baseUrl: DEEPSEEK_CHAT_URL, model: "deepseek-flash" }),
    deep: Object.freeze({ provider: "deepseek", baseUrl: DEEPSEEK_CHAT_URL, model: "deepseek-v4-pro" }),
    rescue: Object.freeze({
      provider: "gemini",
      baseUrl: GEMINI_OPENAI_BASE,
      model: "gemini-3.8-flash",
      deepModel: "gemini-4-argon",
    }),
  }),
});

function trimStr(v) {
  return typeof v === "string" ? v.trim() : "";
}

function maskKeyTail(rawKey) {
  const s = trimStr(rawKey);
  if (!s) return "";
  return s.length > 8 ? "••••" + s.slice(-4) : "••••";
}

function encryptSecretValue(plainText, masterKey) {
  const plain = String(plainText || "");
  if (!plain || !masterKey) return plain;
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(String(masterKey), salt, 32);
  const iv = crypto.randomBytes(12);
  const ci = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([ci.update(plain, "utf8"), ci.final()]);
  return "AESGCM2:" + salt.toString("base64") + ":" + iv.toString("base64") + ":" + ci.getAuthTag().toString("base64") + ":" + enc.toString("base64");
}

function decryptSecretValue(storedValue, masterKey) {
  const s = String(storedValue || "");
  if (!s) return "";
  if (s.startsWith("AESGCM2:")) {
    if (!masterKey) return "";
    try {
      const parts = s.slice(8).split(":");
      if (parts.length !== 4) return "";
      const [saltB64, ivB64, tagB64, encB64] = parts;
      const salt = Buffer.from(saltB64, "base64");
      const iv = Buffer.from(ivB64, "base64");
      const tag = Buffer.from(tagB64, "base64");
      const enc = Buffer.from(encB64, "base64");
      if (salt.length < 16 || iv.length !== 12 || tag.length !== 16) return "";
      const key = crypto.scryptSync(String(masterKey), salt, 32);
      const dec = crypto.createDecipheriv("aes-256-gcm", key, iv);
      dec.setAuthTag(tag);
      return Buffer.concat([dec.update(enc), dec.final()]).toString("utf8");
    } catch {
      return "";
    }
  }
  return s;
}

function sealSettingsObject(obj, masterKey) {
  const copy = obj && typeof obj === "object" ? { ...obj } : {};
  const mk = trimStr(masterKey);
  if (!mk) return copy;
  if (typeof copy.apiKey === "string" && copy.apiKey.trim() && !copy.apiKey.startsWith("AESGCM2:")) {
    copy.apiKey = encryptSecretValue(copy.apiKey.trim(), mk);
  }
  if (typeof copy.geminiApiKey === "string" && copy.geminiApiKey.trim() && !copy.geminiApiKey.startsWith("AESGCM2:")) {
    copy.geminiApiKey = encryptSecretValue(copy.geminiApiKey.trim(), mk);
  }
  if (copy.intake && typeof copy.intake === "object" && copy.intake.imap && typeof copy.intake.imap === "object") {
    copy.intake = { ...copy.intake, imap: { ...copy.intake.imap } };
    const pw = copy.intake.imap.password;
    if (typeof pw === "string" && pw.trim() && !pw.startsWith("AESGCM2:")) {
      copy.intake.imap.password = encryptSecretValue(pw.trim(), mk);
    }
  }
  if (copy.affluence && typeof copy.affluence === "object" && typeof copy.affluence.googleMapsApiKey === "string") {
    copy.affluence = { ...copy.affluence };
    const gk = copy.affluence.googleMapsApiKey;
    if (gk.trim() && !gk.startsWith("AESGCM2:")) {
      copy.affluence.googleMapsApiKey = encryptSecretValue(gk.trim(), mk);
    }
  }
  return copy;
}

function unsealSettingsObject(obj, masterKey) {
  const copy = obj && typeof obj === "object" ? { ...obj } : {};
  const mk = trimStr(masterKey);
  if (typeof copy.apiKey === "string" && copy.apiKey.startsWith("AESGCM2:")) {
    const plain = decryptSecretValue(copy.apiKey, mk);
    if (plain) copy.apiKey = plain;
    else delete copy.apiKey;
  }
  if (typeof copy.geminiApiKey === "string" && copy.geminiApiKey.startsWith("AESGCM2:")) {
    const plain = decryptSecretValue(copy.geminiApiKey, mk);
    if (plain) copy.geminiApiKey = plain;
    else delete copy.geminiApiKey;
  }
  if (copy.intake && typeof copy.intake === "object" && copy.intake.imap && typeof copy.intake.imap === "object") {
    copy.intake = { ...copy.intake, imap: { ...copy.intake.imap } };
    const pw = copy.intake.imap.password;
    if (typeof pw === "string" && pw.startsWith("AESGCM2:")) {
      const plain = decryptSecretValue(pw, mk);
      if (plain) copy.intake.imap.password = plain;
      else delete copy.intake.imap.password;
    }
  }
  if (copy.affluence && typeof copy.affluence === "object" && typeof copy.affluence.googleMapsApiKey === "string") {
    copy.affluence = { ...copy.affluence };
    const gk = copy.affluence.googleMapsApiKey;
    if (gk.startsWith("AESGCM2:")) {
      const plain = decryptSecretValue(gk, mk);
      if (plain) copy.affluence.googleMapsApiKey = plain;
      else delete copy.affluence.googleMapsApiKey;
    }
  }
  return copy;
}

function decryptProvidersText(rawText, masterKey) {
  const s = String(rawText || "").trim();
  if (!s) return {};
  if (s.startsWith("AESGCM2:")) {
    const plain = decryptSecretValue(s, masterKey);
    if (!plain) return {};
    try {
      const parsed = JSON.parse(plain);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  if (s.startsWith("AESGCM:")) {
    if (!masterKey) return {};
    try {
      const buf = Buffer.from(s.slice(7), "base64");
      if (buf.length <= 28) return {};
      const key = crypto.createHash("sha256").update(String(masterKey)).digest();
      const iv = buf.subarray(0, 12);
      const tag = buf.subarray(12, 28);
      const enc = buf.subarray(28);
      const dec = crypto.createDecipheriv("aes-256-gcm", key, iv);
      dec.setAuthTag(tag);
      const plain = Buffer.concat([dec.update(enc), dec.final()]).toString("utf8");
      const parsed = JSON.parse(plain);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  try {
    const parsed = JSON.parse(s);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function encryptProvidersText(obj, masterKey) {
  const raw = JSON.stringify(obj || {});
  if (!masterKey) return raw;
  return encryptSecretValue(raw, masterKey);
}

function normalizeBrainMode() {
  // Fanal closes brain selection to the curated DeepSeek + Gemini synergy (dual_cloud).
  return "dual_cloud";
}

function resolveDeepseekKey(settings = {}, env = process.env) {
  return trimStr(settings.apiKey) || trimStr(env.DEEPSEEK_API_KEY) || "";
}

function resolveGeminiKey(settings = {}, providers = {}, env = process.env) {
  const pKey = providers && providers.rescue && typeof providers.rescue.key === "string" ? providers.rescue.key : "";
  return trimStr(settings.geminiApiKey) || trimStr(pKey) || trimStr(env.GEMINI_API_KEY) || "";
}

function validateClosedBrainUpdate(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, status: 400, error: "invalid_payload", message: "Request body must be a JSON object." };
  }
  // Reject arbitrary open model/endpoint/localModel overrides at the API boundary.
  if (
    payload.baseUrl !== undefined
    || payload.fast !== undefined
    || payload.deep !== undefined
    || payload.rescue !== undefined
    || payload.localModel !== undefined
  ) {
    return {
      ok: false,
      status: 400,
      error: "closed_curated_catalog",
      message: "Fanal operates exclusively with the curated DeepSeek + Gemini dual brain (dual_cloud).",
    };
  }
  if (payload.mode !== undefined && payload.mode !== "dual_cloud") {
    return {
      ok: false,
      status: 400,
      error: "invalid_curated_mode",
      message: "Allowed mode: dual_cloud (DeepSeek + Gemini).",
    };
  }
  for (const field of ["deepseekKey", "geminiKey"]) {
    if (payload[field] !== undefined) {
      if (typeof payload[field] !== "string" || /[\r\n]/.test(payload[field])) {
        return {
          ok: false,
          status: 400,
          error: "invalid_key_format",
          message: `${field} must be a single-line string.`,
        };
      }
    }
  }
  return { ok: true };
}

function routeBrainRequest({ model = "", tierArg = "", settings = {}, providers = {}, env = process.env } = {}) {
  const modelStr = String(model || "");
  let tier = String(tierArg || "").trim();
  if (!tier) {
    if (/gemini/i.test(modelStr)) tier = "rescue";
    else if (/v4-pro|reasoner|\bdeep\b|argon/i.test(modelStr)) tier = "deep";
    else tier = "fast";
  }

  if (tier === "rescue") {
    const deepGemini = /argon|\bdeep\b/i.test(modelStr) && !/3\.8-flash|flash/i.test(modelStr);
    return {
      mode: "dual_cloud",
      provider: "gemini",
      isLocal: false,
      tier: "rescue",
      baseUrl: CURATED_BRAIN_MODES.dual_cloud.rescue.baseUrl,
      model: deepGemini ? CURATED_BRAIN_MODES.dual_cloud.rescue.deepModel : CURATED_BRAIN_MODES.dual_cloud.rescue.model,
      key: resolveGeminiKey(settings, providers, env),
    };
  }

  if (tier === "deep") {
    return {
      mode: "dual_cloud",
      provider: "deepseek",
      isLocal: false,
      tier: "deep",
      baseUrl: CURATED_BRAIN_MODES.dual_cloud.deep.baseUrl,
      model: CURATED_BRAIN_MODES.dual_cloud.deep.model,
      key: resolveDeepseekKey(settings, env),
    };
  }

  return {
    mode: "dual_cloud",
    provider: "deepseek",
    isLocal: false,
    tier: "fast",
    baseUrl: CURATED_BRAIN_MODES.dual_cloud.fast.baseUrl,
    model: CURATED_BRAIN_MODES.dual_cloud.fast.model,
    key: resolveDeepseekKey(settings, env),
  };
}

function buildDerivedProvidersRecord() {
  return {
    mode: "dual_cloud",
    fast: { baseUrl: DEEPSEEK_CHAT_URL, model: CURATED_BRAIN_MODES.dual_cloud.fast.model, provider: "deepseek" },
    deep: { baseUrl: DEEPSEEK_CHAT_URL, model: CURATED_BRAIN_MODES.dual_cloud.deep.model, provider: "deepseek" },
    rescue: { baseUrl: GEMINI_OPENAI_BASE, model: CURATED_BRAIN_MODES.dual_cloud.rescue.model, provider: "gemini" },
  };
}

function buildBrainHttpRequest({ rt, prompt, maxTokens } = {}) {
  let url = String((rt && rt.baseUrl) || "");
  if (!/chat\/completions/.test(url)) url = url.replace(/\/$/, "") + "/chat/completions";
  const model = String((rt && rt.model) || "");
  const payload = {
    model,
    messages: [{ role: "user", content: String(prompt || "") }],
    max_tokens: maxTokens || (model.includes("v4-pro") ? 12000 : 8000),
    temperature: 0,
  };
  const headers = { "Content-Type": "application/json" };
  const key = trimStr(rt && rt.key);
  if (key) headers.Authorization = "Bearer " + key;
  return { url, isLocal: false, headers, payload };
}

function buildBrainPublicSummary({ settings = {}, providers = {}, env = process.env } = {}) {
  const dsClient = trimStr(settings.apiKey);
  const dsKey = resolveDeepseekKey(settings, env);
  const gemProvider = providers && providers.rescue && typeof providers.rescue.key === "string" ? trimStr(providers.rescue.key) : "";
  const gemClient = trimStr(settings.geminiApiKey) || gemProvider;
  const gemKey = resolveGeminiKey(settings, providers, env);
  const encryptedAtRest = Boolean(trimStr(env.FANAL_MASTER_KEY));

  return {
    closedCatalog: true,
    keysEncryptedAtRest: encryptedAtRest,
    keyStorageMode: encryptedAtRest ? "aes256gcm_scrypt" : "silo_0o600",
    mode: "dual_cloud",
    deepseek: {
      configured: Boolean(dsKey),
      source: dsClient ? "silo" : (trimStr(env.DEEPSEEK_API_KEY) ? "env" : "none"),
      masked: maskKeyTail(dsKey),
      models: {
        fast: CURATED_BRAIN_MODES.dual_cloud.fast.model,
        deep: CURATED_BRAIN_MODES.dual_cloud.deep.model,
      },
    },
    gemini: {
      configured: Boolean(gemKey),
      source: gemClient ? "silo" : (trimStr(env.GEMINI_API_KEY) ? "env" : "none"),
      masked: maskKeyTail(gemKey),
      models: {
        fast: CURATED_BRAIN_MODES.dual_cloud.rescue.model,
        deep: CURATED_BRAIN_MODES.dual_cloud.rescue.deepModel,
      },
    },
    fast: { model: CURATED_BRAIN_MODES.dual_cloud.fast.model, provider: "deepseek", configured: Boolean(dsKey) },
    deep: { model: CURATED_BRAIN_MODES.dual_cloud.deep.model, provider: "deepseek", configured: Boolean(dsKey) },
    rescue: {
      model: CURATED_BRAIN_MODES.dual_cloud.rescue.model,
      deepModel: CURATED_BRAIN_MODES.dual_cloud.rescue.deepModel,
      provider: "gemini",
      configured: Boolean(gemKey),
    },
  };
}

module.exports = {
  DEEPSEEK_CHAT_URL,
  GEMINI_OPENAI_BASE,
  CURATED_BRAIN_MODES,
  maskKeyTail,
  encryptSecretValue,
  decryptSecretValue,
  sealSettingsObject,
  unsealSettingsObject,
  decryptProvidersText,
  encryptProvidersText,
  normalizeBrainMode,
  resolveDeepseekKey,
  resolveGeminiKey,
  validateClosedBrainUpdate,
  routeBrainRequest,
  buildDerivedProvidersRecord,
  buildBrainHttpRequest,
  buildBrainPublicSummary,
};
