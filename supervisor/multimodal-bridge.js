// supervisor/multimodal-bridge.js — Zero-New-Hardware Multimodal Bridge:
//   1) Gemini Interactions REST client (gemini-3.8-flash, store: false) for:
//      - Existing Office ADF Scanner PDFs/Images -> Accounting & TPS/TVQ triage
//      - Existing VoIP/PBX Voicemail .mp3/.wav/.m4a email/folder forwards
//      - Existing Counter USB/Laptop Webcam JPEG snapshots
//   2) Deterministic Quebec TPS (5%) + TVQ (9.975%) arithmetic auditor
//   3) Ephemeral Token minter for Counter Fixed-Mic + Bluetooth A2DP Live Translation
//      (gemini-3.5-live-translate-preview) with daily minutes cap & zero raw-key leak.
// Created by J.Franco. MIT license. Node >= 24 builtins only.
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { appendUsageEvent } = require("./usage-telemetry");

const PRICING_CATALOG = JSON.parse(
  fs.readFileSync(path.join(__dirname, "pricing-catalog.json"), "utf8")
);

const GEMINI_INTERACTIONS_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";
const GEMINI_AUTH_TOKENS_URL = "https://generativelanguage.googleapis.com/v1beta/auth_tokens";
const GEMINI_LIVE_WS_CONSTRAINED =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained";

const LIVE_TRANSLATE_MODEL = "gemini-3.5-live-translate-preview";
const MULTIMODAL_MODEL = "gemini-3.8-flash";

const EXT_MEDIA_MAP = Object.freeze({
  ".pdf": { type: "document", mimeType: "application/pdf", hwOrigin: "scanner_adf" },
  ".png": { type: "image", mimeType: "image/png", hwOrigin: "scanner_adf" },
  ".jpg": { type: "image", mimeType: "image/jpeg", hwOrigin: "scanner_adf" },
  ".jpeg": { type: "image", mimeType: "image/jpeg", hwOrigin: "scanner_adf" },
  ".webp": { type: "image", mimeType: "image/webp", hwOrigin: "scanner_adf" },
  ".mp3": { type: "audio", mimeType: "audio/mp3", hwOrigin: "voip_voicemail" },
  ".wav": { type: "audio", mimeType: "audio/wav", hwOrigin: "voip_voicemail" },
  ".m4a": { type: "audio", mimeType: "audio/mp4", hwOrigin: "voip_voicemail" },
  ".ogg": { type: "audio", mimeType: "audio/ogg", hwOrigin: "voip_voicemail" },
  ".webm": { type: "audio", mimeType: "audio/webm", hwOrigin: "voip_voicemail" },
});

function classifyExtMedia(ext) {
  return EXT_MEDIA_MAP[String(ext || "").toLowerCase()] || null;
}

function extractInteractionOutputText(resp) {
  if (!resp || typeof resp !== "object") return "";
  if (typeof resp.output_text === "string" && resp.output_text.trim()) return resp.output_text.trim();
  const steps = Array.isArray(resp.steps) ? resp.steps : [];
  for (let i = steps.length - 1; i >= 0; i -= 1) {
    const st = steps[i];
    if (st && (st.type === "model_output" || st.role === "model") && Array.isArray(st.content)) {
      const texts = st.content.filter((c) => c && c.type === "text" && typeof c.text === "string").map((c) => c.text);
      if (texts.length) return texts.join("\n").trim();
    }
  }
  const outputs = Array.isArray(resp.outputs) ? resp.outputs : [];
  for (let i = outputs.length - 1; i >= 0; i -= 1) {
    const o = outputs[i];
    if (o && typeof o.text === "string" && o.text.trim()) return o.text.trim();
  }
  return "";
}

/**
 * Call Gemini Interactions API (store: false for Loi 25 minimal cloud retention).
 */
async function callGeminiMultimodalInteraction({
  apiKey,
  model = MULTIMODAL_MODEL,
  prompt,
  mediaType,
  mimeType,
  base64Data,
  telemetryDir = "",
  taskType = "multimodal_hardware",
  actor = "system",
  actorRole = "intake",
} = {}) {
  const key = String(apiKey || "").trim();
  if (!key) return { ok: false, error: "ERR_GEMINI_KEY_MISSING" };
  if (!base64Data || !mediaType || !mimeType) return { ok: false, error: "ERR_MEDIA_PAYLOAD_REQUIRED" };

  const body = {
    model,
    store: false,
    input: [
      {
        type: mediaType,
        mime_type: mimeType,
        data: String(base64Data).replace(/^data:[^;]+;base64,/i, ""),
      },
      {
        type: "text",
        text: String(prompt || "Analyze concisely."),
      },
    ],
  };

  try {
    const r = await fetch(GEMINI_INTERACTIONS_URL, {
      method: "POST",
      signal: AbortSignal.timeout(45000),
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify(body),
    });
    const rawText = await r.text();
    let parsed = null;
    try { parsed = JSON.parse(rawText); } catch {}
    if (!r.ok) {
      return { ok: false, status: r.status, error: (parsed && parsed.error && parsed.error.message) || `HTTP_${r.status}` };
    }
    const text = extractInteractionOutputText(parsed);
    const usage = (parsed && parsed.usage) || {};
    if (telemetryDir) {
      appendUsageEvent(telemetryDir, {
        model,
        provider: "gemini",
        taskType,
        actor,
        actorRole,
        promptTokens: Number(usage.input_tokens || usage.total_input_tokens || 1200),
        completionTokens: Number(usage.output_tokens || usage.total_output_tokens || 250),
      });
    }
    return { ok: true, model, text, raw: parsed };
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e) };
  }
}

/**
 * Deterministic Quebec invoice math & tax ID validator (TPS 5% + TVQ 9.975%).
 * Zero reliance on LLM arithmetic.
 */
function verifyQuebecInvoiceMath(extracted = {}) {
  const subtotal = Number(extracted.subtotalCad);
  const tps = Number(extracted.tpsCad);
  const tvq = Number(extracted.tvqCad);
  const total = Number(extracted.totalCad);
  const issues = [];
  let semaphore = "GREEN";

  if (!Number.isFinite(subtotal) || subtotal < 0) {
    return { semaphore: "YELLOW", validMath: false, issues: ["SUBTOTAL_UNVERIFIED"] };
  }

  const expectedTps = Math.round(subtotal * 0.05 * 100) / 100;
  const expectedTvq = Math.round(subtotal * 0.09975 * 100) / 100;
  const expectedTtc = Math.round((subtotal + expectedTps + expectedTvq) * 100) / 100;

  if (Number.isFinite(tps) && tps > 0 && Math.abs(tps - expectedTps) > 0.04) {
    issues.push(`TPS_MISMATCH: attendu ${expectedTps.toFixed(2)} $, vu ${tps.toFixed(2)} $`);
    semaphore = "RED";
  }
  if (Number.isFinite(tvq) && tvq > 0 && Math.abs(tvq - expectedTvq) > 0.05) {
    issues.push(`TVQ_MISMATCH: attendu ${expectedTvq.toFixed(2)} $, vu ${tvq.toFixed(2)} $`);
    semaphore = "RED";
  }
  if (Number.isFinite(total) && total > 0) {
    const taxCharged = (Number.isFinite(tps) ? tps : 0) + (Number.isFinite(tvq) ? tvq : 0);
    const lineSum = Math.round((subtotal + taxCharged) * 100) / 100;
    if (Math.abs(total - lineSum) > 0.05 && Math.abs(total - expectedTtc) > 0.05) {
      issues.push(`TOTAL_MISMATCH: total=${total.toFixed(2)} $ vs attendu=${lineSum.toFixed(2)} $`);
      semaphore = "RED";
    }
  }
  if (extracted.tpsNumber && !/^\d{9}RT\d{4}$/i.test(String(extracted.tpsNumber).replace(/[\s-]/g, ""))) {
    issues.push("TPS_FORMAT_SUSPECT");
    if (semaphore !== "RED") semaphore = "YELLOW";
  }
  if (extracted.tvqNumber && !/^\d{10}TQ\d{4}$/i.test(String(extracted.tvqNumber).replace(/[\s-]/g, ""))) {
    issues.push("TVQ_FORMAT_SUSPECT");
    if (semaphore !== "RED") semaphore = "YELLOW";
  }

  return {
    semaphore,
    validMath: issues.length === 0,
    expectedTpsCad: expectedTps,
    expectedTvqCad: expectedTvq,
    expectedTotalTtcCad: expectedTtc,
    issues,
  };
}

// ---------- Counter Fixed-Mic + A2DP Live Translate Usage & Ephemeral Token ----------

function liveTranslateUsagePath(dataDir) {
  return path.join(String(dataDir || "."), "counter-live-usage.json");
}

function readLiveTranslateUsage(dataDir, settings = {}) {
  const defaultCap = Number(PRICING_CATALOG?.liveCounterLimits?.defaultDailyMinutesCap || 30);
  const maxCap = Number(PRICING_CATALOG?.liveCounterLimits?.maxDailyMinutesCap || 120);
  const capMin = Math.max(5, Math.min(maxCap, Number(settings?.counterLive?.dailyMinutesCap || defaultCap)));
  const today = new Date().toISOString().slice(0, 10);
  let raw = { date: today, secondsUsed: 0, sessions: 0 };
  try {
    const j = JSON.parse(fs.readFileSync(liveTranslateUsagePath(dataDir), "utf8"));
    if (j && j.date === today) {
      raw = { date: today, secondsUsed: Math.max(0, Number(j.secondsUsed) || 0), sessions: Math.max(0, Number(j.sessions) || 0) };
    }
  } catch {}
  const minutesUsed = Math.round((raw.secondsUsed / 60) * 100) / 100;
  const estUsdRate = Number(PRICING_CATALOG?.modelsUsdPer1M?.[LIVE_TRANSLATE_MODEL]?.estimatedUsdPerActiveMinute || 0.023);
  return {
    date: today,
    secondsUsed: raw.secondsUsed,
    minutesUsed,
    dailyMinutesCap: capMin,
    remainingMinutes: Math.max(0, Math.round((capMin - minutesUsed) * 100) / 100),
    sessions: raw.sessions,
    estimatedUsdToday: Math.round(minutesUsed * estUsdRate * 10000) / 10000,
    model: LIVE_TRANSLATE_MODEL,
  };
}

function recordLiveTranslateUsageSeconds(dataDir, addSeconds, settings = {}, actor = "counter") {
  const cur = readLiveTranslateUsage(dataDir, settings);
  const sec = Math.max(0, Math.min(600, Math.round(Number(addSeconds) || 0)));
  const next = {
    date: cur.date,
    secondsUsed: cur.secondsUsed + sec,
    sessions: cur.sessions + (sec > 0 ? 0 : 1),
  };
  try {
    fs.mkdirSync(String(dataDir || "."), { recursive: true, mode: 0o700 });
    fs.writeFileSync(liveTranslateUsagePath(dataDir), JSON.stringify(next, null, 2), { mode: 0o600 });
  } catch {}
  if (sec > 0 && dataDir) {
    // Convert active audio seconds into equivalent input/output audio tokens (~25 tok/sec combined)
    const min = sec / 60;
    appendUsageEvent(dataDir, {
      model: LIVE_TRANSLATE_MODEL,
      provider: "gemini_live",
      taskType: "counter_live_translate",
      actor,
      actorRole: "counter",
      cacheMissTokens: Math.round(min * 1650),
      completionTokens: Math.round(min * 1500),
    });
  }
  return readLiveTranslateUsage(dataDir, settings);
}

async function createCounterLiveSessionToken({
  apiKey,
  dataDir,
  settings = {},
  targetLanguageCode = "fr",
  echoTargetLanguage = true,
  actor = "counter",
} = {}) {
  const key = String(apiKey || "").trim();
  if (!key) return { ok: false, status: 400, error: "ERR_GEMINI_KEY_REQUIRED_FOR_LIVE" };

  const usage = readLiveTranslateUsage(dataDir, settings);
  if (usage.remainingMinutes <= 0.1) {
    return { ok: false, status: 429, error: "ERR_DAILY_LIVE_MINUTES_CAP_REACHED", usage };
  }

  const targetLang = String(targetLanguageCode || "fr").slice(0, 5).toLowerCase();
  const maxSessionMinutes = Math.min(
    Number(PRICING_CATALOG?.liveCounterLimits?.maxSessionMinutes || 10),
    Math.max(1, Math.ceil(usage.remainingMinutes))
  );
  const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const newSessionExpireTime = new Date(Date.now() + 2 * 60 * 1000).toISOString();

  const body = {
    uses: 1,
    expireTime,
    newSessionExpireTime,
    liveConnectConstraints: {
      model: "models/" + LIVE_TRANSLATE_MODEL,
      config: {
        responseModalities: ["AUDIO"],
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        translationConfig: {
          targetLanguageCode: targetLang,
          echoTargetLanguage: Boolean(echoTargetLanguage),
        },
      },
    },
  };

  try {
    const r = await fetch(GEMINI_AUTH_TOKENS_URL, {
      method: "POST",
      signal: AbortSignal.timeout(10000),
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify(body),
    });
    const raw = await r.text();
    let parsed = null;
    try { parsed = JSON.parse(raw); } catch {}
    if (!r.ok || !parsed || !parsed.name) {
      return {
        ok: false,
        status: r.status || 502,
        error: (parsed && parsed.error && parsed.error.message) || "ERR_EPHEMERAL_TOKEN_FAILED",
      };
    }

    // Increment session counter (0 seconds consumed yet)
    recordLiveTranslateUsageSeconds(dataDir, 0, settings, actor);

    return {
      ok: true,
      ephemeralToken: parsed.name,
      wsUrl: `${GEMINI_LIVE_WS_CONSTRAINED}?access_token=${encodeURIComponent(parsed.name)}`,
      model: LIVE_TRANSLATE_MODEL,
      targetLanguageCode: targetLang,
      maxSessionMinutes,
      audioPolicy: {
        inputMimeType: "audio/pcm;rate=16000",
        outputSampleRateHz: 24000,
        a2dpDecoupledGuidance: true,
      },
      usage: readLiveTranslateUsage(dataDir, settings),
    };
  } catch (e) {
    return { ok: false, status: 502, error: String(e && e.message ? e.message : e) };
  }
}

module.exports = {
  PRICING_CATALOG,
  GEMINI_INTERACTIONS_URL,
  GEMINI_AUTH_TOKENS_URL,
  GEMINI_LIVE_WS_CONSTRAINED,
  LIVE_TRANSLATE_MODEL,
  MULTIMODAL_MODEL,
  EXT_MEDIA_MAP,
  classifyExtMedia,
  extractInteractionOutputText,
  callGeminiMultimodalInteraction,
  verifyQuebecInvoiceMath,
  readLiveTranslateUsage,
  recordLiveTranslateUsageSeconds,
  createCounterLiveSessionToken,
};
