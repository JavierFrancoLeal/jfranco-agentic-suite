// supervisor/brain-catalog.js — Closed Apple-style curated AI brain modes,
// dual-hemisphere BYOK key isolation (DeepSeek + Google Gemini), local sovereign
// allowlist, and optional AES-256-GCM silo encryption compatibility.
// Created by J.Franco. MIT license.
"use strict";

const crypto = require("node:crypto");

const DEEPSEEK_CHAT_URL = "https://api.deepseek.com/chat/completions";
const GEMINI_OPENAI_BASE = "https://generativelanguage.googleapis.com/v1beta/openai";
const LOCAL_OLLAMA_BASE = "http://localhost:11434/v1";

const CURATED_LOCAL_MODELS = Object.freeze(["qwen2.5:7b", "llama3.2:3b"]);

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
  local_sovereign: Object.freeze({
    id: "local_sovereign",
    local: true,
    baseUrl: LOCAL_OLLAMA_BASE,
    defaultModel: "qwen2.5:7b",
    allowedModels: CURATED_LOCAL_MODELS,
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

function normalizeBrainMode(settings = {}, providers = {}) {
  const sMode = settings && typeof settings.brainMode === "string" ? settings.brainMode.trim() : "";
  if (sMode === "local_sovereign" || sMode === "dual_cloud") return sMode;
  const pMode = providers && typeof providers.mode === "string" ? providers.mode.trim() : "";
  if (pMode === "local_sovereign" || pMode === "dual_cloud") return pMode;
  const fastUrl = providers && providers.fast && providers.fast.baseUrl ? String(providers.fast.baseUrl) : "";
  if (/localhost|127\.0\.0\.1/.test(fastUrl)) return "local_sovereign";
  return "dual_cloud";
}

function normalizeLocalModel(candidate) {
  const raw = trimStr(candidate);
  if (CURATED_LOCAL_MODELS.includes(raw)) return raw;
  for (const allowed of CURATED_LOCAL_MODELS) {
    if (raw.startsWith(allowed + ":") || raw === allowed) return allowed;
  }
  return CURATED_BRAIN_MODES.local_sovereign.defaultModel;
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
  // Reject arbitrary open model/endpoint overrides at the API boundary.
  if (payload.baseUrl !== undefined || payload.fast !== undefined || payload.deep !== undefined || payload.rescue !== undefined) {
    return {
      ok: false,
      status: 400,
      error: "closed_curated_catalog",
      message: "Fanal operates exclusively in curated modes: dual_cloud or local_sovereign.",
    };
  }
  if (payload.mode !== undefined) {
    if (payload.mode !== "dual_cloud" && payload.mode !== "local_sovereign") {
      return {
        ok: false,
        status: 400,
        error: "invalid_curated_mode",
        message: "Allowed modes: dual_cloud, local_sovereign.",
      };
    }
  }
  if (payload.localModel !== undefined && payload.localModel !== "") {
    if (typeof payload.localModel !== "string" || !CURATED_LOCAL_MODELS.includes(payload.localModel.trim())) {
      return {
        ok: false,
        status: 400,
        error: "invalid_curated_local_model",
        message: "Allowed curated local models: " + CURATED_LOCAL_MODELS.join(", "),
      };
    }
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
  const mode = normalizeBrainMode(settings, providers);
  const modelStr = String(model || "");
  let tier = String(tierArg || "").trim();
  if (!tier) {
    if (/gemini/i.test(modelStr)) tier = "rescue";
    else if (/v4-pro|reasoner|\bdeep\b|argon/i.test(modelStr)) tier = "deep";
    else tier = "fast";
  }

  if (mode === "local_sovereign") {
    const localModel = normalizeLocalModel(settings.localModel || (providers.fast && providers.fast.model));
    return {
      mode: "local_sovereign",
      provider: "local",
      isLocal: true,
      tier,
      baseUrl: LOCAL_OLLAMA_BASE,
      model: localModel,
      key: "",
    };
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

function buildDerivedProvidersRecord(settings = {}, existingProviders = {}) {
  const mode = normalizeBrainMode(settings, existingProviders);
  const localModel = normalizeLocalModel(settings.localModel || (existingProviders.fast && existingProviders.fast.model));
  const out = {};
  if (existingProviders && existingProviders.local) out.local = existingProviders.local;
  out.mode = mode;
  if (mode === "local_sovereign") {
    out.fast = { baseUrl: LOCAL_OLLAMA_BASE, model: localModel, provider: "local" };
    out.deep = { baseUrl: LOCAL_OLLAMA_BASE, model: localModel, provider: "local" };
    out.rescue = { baseUrl: LOCAL_OLLAMA_BASE, model: localModel, provider: "local" };
  } else {
    out.fast = { baseUrl: DEEPSEEK_CHAT_URL, model: CURATED_BRAIN_MODES.dual_cloud.fast.model, provider: "deepseek" };
    out.deep = { baseUrl: DEEPSEEK_CHAT_URL, model: CURATED_BRAIN_MODES.dual_cloud.deep.model, provider: "deepseek" };
    out.rescue = { baseUrl: GEMINI_OPENAI_BASE, model: CURATED_BRAIN_MODES.dual_cloud.rescue.model, provider: "gemini" };
  }
  return out;
}

function buildBrainHttpRequest({ rt, prompt, maxTokens } = {}) {
  let url = String((rt && rt.baseUrl) || "");
  if (!/chat\/completions/.test(url)) url = url.replace(/\/$/, "") + "/chat/completions";
  const isLocal = Boolean((rt && rt.isLocal) || /localhost|127\.0\.0\.1/.test(url));
  const model = String((rt && rt.model) || "");
  const payload = {
    model,
    messages: [{ role: "user", content: String(prompt || "") }],
    max_tokens: maxTokens || (model.includes("v4-pro") ? 12000 : 8000),
    temperature: 0,
  };
  if (isLocal) payload.response_format = { type: "json_object" };
  const headers = { "Content-Type": "application/json" };
  const key = trimStr(rt && rt.key);
  if (!isLocal && key) headers.Authorization = "Bearer " + key;
  return { url, isLocal, headers, payload };
}

function buildBrainPublicSummary({ settings = {}, providers = {}, env = process.env } = {}) {
  const mode = normalizeBrainMode(settings, providers);
  const localModel = normalizeLocalModel(settings.localModel || (providers.fast && providers.fast.model));
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
    mode,
    localModel,
    allowedLocalModels: [...CURATED_LOCAL_MODELS],
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
    fast: mode === "local_sovereign"
      ? { model: localModel, provider: "local", configured: true }
      : { model: CURATED_BRAIN_MODES.dual_cloud.fast.model, provider: "deepseek", configured: Boolean(dsKey) },
    deep: mode === "local_sovereign"
      ? { model: localModel, provider: "local", configured: true }
      : { model: CURATED_BRAIN_MODES.dual_cloud.deep.model, provider: "deepseek", configured: Boolean(dsKey) },
    rescue: mode === "local_sovereign"
      ? { model: localModel, provider: "local", configured: true }
      : { model: CURATED_BRAIN_MODES.dual_cloud.rescue.model, deepModel: CURATED_BRAIN_MODES.dual_cloud.rescue.deepModel, provider: "gemini", configured: Boolean(gemKey) },
  };
}

module.exports = {
  DEEPSEEK_CHAT_URL,
  GEMINI_OPENAI_BASE,
  LOCAL_OLLAMA_BASE,
  CURATED_LOCAL_MODELS,
  CURATED_BRAIN_MODES,
  maskKeyTail,
  encryptSecretValue,
  decryptSecretValue,
  sealSettingsObject,
  unsealSettingsObject,
  decryptProvidersText,
  encryptProvidersText,
  normalizeBrainMode,
  normalizeLocalModel,
  resolveDeepseekKey,
  resolveGeminiKey,
  validateClosedBrainUpdate,
  routeBrainRequest,
  buildDerivedProvidersRecord,
  buildBrainHttpRequest,
  buildBrainPublicSummary,
};
