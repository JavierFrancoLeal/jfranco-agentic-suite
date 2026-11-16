// supervisor/usage-telemetry.js — Precision per-user / per-model / per-task
// token & cost telemetry ledger and pure fixed-buffet pool economics
// calibrated via jfranco-deepseek-prices (Loi 25 pseudonymized).
// Created by J.Franco. MIT license.
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const USD_TO_CAD = 1.40;
const WORKSPACE_USD_CAP = 5.0;

// Canonical DeepSeek pricing rates (USD per 1M tokens) mirrored from
// jfranco-deepseek-prices/lib/index.js (verified 2026-11-08) + Gemini refs.
const CHINESE_HOLIDAYS_2026 = new Set([
  "2026-01-01",
  "2026-02-16", "2026-02-17", "2026-02-18", "2026-02-19", "2026-02-20", "2026-02-21", "2026-02-22",
  "2026-04-04", "2026-04-05", "2026-04-06",
  "2026-05-01", "2026-05-02", "2026-05-03", "2026-05-04", "2026-05-05",
  "2026-06-19", "2026-06-20", "2026-06-21",
  "2026-09-25", "2026-09-26", "2026-09-27",
  "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05", "2026-10-06", "2026-10-07",
]);

const MODEL_RATES_USD_PER_M = {
  "deepseek-flash": {
    provider: "deepseek",
    cacheHit: { peak: 0.006, offPeak: 0.003 },
    cacheMiss: { peak: 0.30, offPeak: 0.15 },
    output: { peak: 1.20, offPeak: 0.60 },
  },
  "deepseek-v4-pro": {
    provider: "deepseek",
    cacheHit: { peak: 0.044, offPeak: 0.022 },
    cacheMiss: { peak: 1.32, offPeak: 0.66 },
    output: { peak: 3.96, offPeak: 1.98 },
  },
  "gemini-3.8-flash": {
    provider: "gemini",
    cacheHit: { peak: 0.025, offPeak: 0.025 },
    cacheMiss: { peak: 0.10, offPeak: 0.10 },
    output: { peak: 0.40, offPeak: 0.40 },
  },
  "gemini-4-argon": {
    provider: "gemini",
    cacheHit: { peak: 0.31, offPeak: 0.31 },
    cacheMiss: { peak: 1.25, offPeak: 1.25 },
    output: { peak: 5.00, offPeak: 5.00 },
  },
  deterministic: {
    provider: "deterministic",
    cacheHit: { peak: 0, offPeak: 0 },
    cacheMiss: { peak: 0, offPeak: 0 },
    output: { peak: 0, offPeak: 0 },
  },
};

function isDeepSeekPeakUtc(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (Number.isNaN(d.getTime())) return false;
  const isoDay = d.toISOString().slice(0, 10);
  if (CHINESE_HOLIDAYS_2026.has(isoDay)) return false;
  const dow = d.getUTCDay(); // 0=Sun .. 6=Sat
  if (dow === 0 || dow === 6) return false;
  const mins = d.getUTCHours() * 60 + d.getUTCMinutes();
  // Peak windows UTC: 01:00-04:00 (60..240) and 06:00-10:00 (360..600)
  return (mins >= 60 && mins < 240) || (mins >= 360 && mins < 600);
}

function normalizeModelKey(rawModel, providerHint) {
  const s = String(rawModel || "").toLowerCase();
  if (s === "deterministic" || s === "local_rule" || s === "none") return "deterministic";
  if (s.includes("v4-pro") || s.includes("reasoner") || s === "deep") return "deepseek-v4-pro";
  if (s.includes("argon") || (s.includes("gemini") && s.includes("pro"))) return "gemini-4-argon";
  if (s.includes("gemini") || providerHint === "gemini") return "gemini-3.8-flash";
  return "deepseek-flash";
}

function computeCallCost({
  model,
  provider,
  promptTokens = 0,
  cacheHitTokens = 0,
  cacheMissTokens = 0,
  completionTokens = 0,
  totalTokens = 0,
  ts,
}) {
  const key = normalizeModelKey(model, provider);
  const rates = MODEL_RATES_USD_PER_M[key] || MODEL_RATES_USD_PER_M["deepseek-flash"];
  const peak = isDeepSeekPeakUtc(ts);
  const band = peak ? "peak" : "offPeak";

  let hit = Math.max(0, Number(cacheHitTokens) || 0);
  let miss = Math.max(0, Number(cacheMissTokens) || 0);
  let out = Math.max(0, Number(completionTokens) || 0);
  const prompt = Math.max(0, Number(promptTokens) || 0);
  const tot = Math.max(0, Number(totalTokens) || 0);

  if (hit === 0 && miss === 0) {
    if (prompt > 0) {
      miss = prompt;
    } else if (tot > 0 && out === 0) {
      // Split aggregate total conservatively (80% input miss, 20% output)
      miss = Math.round(tot * 0.8);
      out = Math.max(0, tot - miss);
    } else if (tot > out) {
      miss = tot - out;
    }
  }

  const usd =
    (hit / 1e6) * rates.cacheHit[band] +
    (miss / 1e6) * rates.cacheMiss[band] +
    (out / 1e6) * rates.output[band];

  const roundedUsd = Number(usd.toFixed(6));
  const roundedCad = Number((usd * USD_TO_CAD).toFixed(6));

  return {
    modelKey: key,
    provider: rates.provider,
    isPeakUtc: peak,
    cacheHitTokens: hit,
    cacheMissTokens: miss,
    completionTokens: out,
    totalTokens: tot || hit + miss + out,
    estimatedUsd: roundedUsd,
    estimatedCad: roundedCad,
  };
}

function pseudonymizeActor(name) {
  const s = String(name || "").trim();
  if (!s || s === "system" || s === "server" || s === "Fanal Intake") return s || "system";
  const digest = crypto.createHash("sha256").update("FANAL_ACTOR:" + s).digest("hex").slice(0, 8);
  return "usr_" + digest;
}

function computeInstanceHash(dataDir) {
  return crypto
    .createHash("sha256")
    .update("FANAL_INST:" + String(dataDir || "default"))
    .digest("hex")
    .slice(0, 12);
}

function classifyTaskType(rawHint) {
  const s = String(rawHint || "").trim().toLowerCase();
  if (!s) return "general_ai";
  if (s.includes("triage")) return "deterministic_triage";
  if (s.includes("invoice") || s.includes("symmetry")) return "deterministic_invoice";
  if (s.includes("transcript") || s.includes("field")) return "transcript_live";
  if (s.includes("translat")) return "translate";
  if (s.includes("deep")) return "deep_reasoning";
  if (s.includes("phone") || s.includes("telephon")) return "phone_call";
  if (s.includes("secretaire") || s.includes("form")) return "secretaire_form";
  if (s.includes("repondant") || s.includes("reply")) return "repondant_reply";
  if (s.includes("intake")) return "intake_ingest";
  if (s.includes("studio")) return "studio_draft";
  return s.replace(/[^a-z0-9_]/g, "_").slice(0, 32) || "general_ai";
}

function ledgerFilePath(dataDir) {
  return path.join(String(dataDir || "."), "usage-ledger.jsonl");
}

function appendUsageEvent(dataDir, evt = {}) {
  const timestamp = String(evt.ts || new Date().toISOString());
  const cost = computeCallCost({
    model: evt.model || "deepseek-flash",
    provider: evt.provider,
    promptTokens: evt.promptTokens,
    cacheHitTokens: evt.cacheHitTokens,
    cacheMissTokens: evt.cacheMissTokens,
    completionTokens: evt.completionTokens,
    totalTokens: evt.totalTokens,
    ts: timestamp,
  });

  const record = {
    ts: timestamp,
    day: timestamp.slice(0, 10),
    month: timestamp.slice(0, 7),
    instanceId: String(evt.instanceId || computeInstanceHash(dataDir)),
    edition: String(evt.edition || "client"),
    scaleType: String(evt.scaleType || "AUTONOMOUS_SOLO"),
    sector: String(evt.sector || "generic"),
    professionKey: String(evt.professionKey || ""),
    actorId: evt.actorRaw === false ? String(evt.actor || "system") : pseudonymizeActor(evt.actor || "system"),
    actorRole: String(evt.actorRole || "system"),
    taskType: classifyTaskType(evt.taskType || evt.routeName),
    provider: cost.provider,
    model: cost.modelKey,
    promptTokens: Math.max(0, Number(evt.promptTokens) || cost.cacheHitTokens + cost.cacheMissTokens),
    cacheHitTokens: cost.cacheHitTokens,
    cacheMissTokens: cost.cacheMissTokens,
    completionTokens: cost.completionTokens,
    totalTokens: cost.totalTokens,
    estimatedUsd: cost.estimatedUsd,
    estimatedCad: cost.estimatedCad,
    isPeakUtc: cost.isPeakUtc,
  };

  try {
    fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
    fs.appendFileSync(ledgerFilePath(dataDir), JSON.stringify(record) + "\n", { mode: 0o600 });
  } catch {}
  return record;
}

function readUsageEvents(dataDir, { periodDays = 30 } = {}) {
  const f = ledgerFilePath(dataDir);
  if (!fs.existsSync(f)) return [];
  const cutoffMs = periodDays > 0 ? Date.now() - periodDays * 86400 * 1000 : 0;
  const out = [];
  try {
    const raw = fs.readFileSync(f, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      if (!line) continue;
      try {
        const j = JSON.parse(line);
        if (cutoffMs && j.ts && Date.parse(j.ts) < cutoffMs) continue;
        out.push(j);
      } catch {}
    }
  } catch {}
  return out;
}

function percentile(sortedNums, p) {
  if (!sortedNums.length) return 0;
  const idx = Math.min(sortedNums.length - 1, Math.max(0, Math.floor((sortedNums.length - 1) * p)));
  return sortedNums[idx];
}

function aggregateUsageEvents(events = [], opts = {}) {
  const activeClients = Math.max(1, Number(opts.activeClientsCount || 1));
  const totals = {
    events: events.length,
    aiCalls: 0,
    deterministicOps: 0,
    totalTokens: 0,
    cacheHitTokens: 0,
    cacheMissTokens: 0,
    completionTokens: 0,
    estimatedUsd: 0,
    estimatedCad: 0,
    deterministicRatioPct: 0,
    offPeakSharePct: 0,
  };

  const byModel = new Map();
  const byProvider = new Map();
  const byTaskType = new Map();
  const byActor = new Map();
  const byProfile = new Map();
  const instanceCost = new Map();
  let offPeakCount = 0;

  const bump = (map, key, patch) => {
    const cur = map.get(key) || {
      key,
      calls: 0,
      totalTokens: 0,
      cacheHitTokens: 0,
      cacheMissTokens: 0,
      completionTokens: 0,
      estimatedUsd: 0,
      estimatedCad: 0,
      ...patch,
    };
    return cur;
  };

  for (const e of events) {
    const tokens = Number(e.totalTokens || 0);
    const hit = Number(e.cacheHitTokens || 0);
    const miss = Number(e.cacheMissTokens || 0);
    const out = Number(e.completionTokens || 0);
    const usd = Number(e.estimatedUsd || 0);
    const cad = Number(e.estimatedCad || 0);
    const isDet = e.provider === "deterministic" || e.model === "deterministic";

    if (isDet) totals.deterministicOps++;
    else {
      totals.aiCalls++;
      if (!e.isPeakUtc) offPeakCount++;
    }

    totals.totalTokens += tokens;
    totals.cacheHitTokens += hit;
    totals.cacheMissTokens += miss;
    totals.completionTokens += out;
    totals.estimatedUsd += usd;
    totals.estimatedCad += cad;

    for (const [map, k, extra] of [
      [byModel, String(e.model || "unknown"), { provider: String(e.provider || "unknown") }],
      [byProvider, String(e.provider || "unknown"), {}],
      [byTaskType, String(e.taskType || "general_ai"), {}],
      [byActor, String(e.actorId || "system") + " (" + String(e.actorRole || "system") + ")", { actorId: e.actorId, role: e.actorRole }],
      [byProfile, `${e.scaleType || "?"} · ${e.professionKey || e.sector || "generic"}`, { scaleType: e.scaleType, sector: e.sector, professionKey: e.professionKey || "" }],
    ]) {
      const b = bump(map, k, extra);
      b.calls += 1;
      b.totalTokens += tokens;
      b.cacheHitTokens += hit;
      b.cacheMissTokens += miss;
      b.completionTokens += out;
      b.estimatedUsd = Number((b.estimatedUsd + usd).toFixed(6));
      b.estimatedCad = Number((b.estimatedCad + cad).toFixed(6));
      map.set(k, b);
    }

    const instKey = String(e.instanceId || "local");
    instanceCost.set(instKey, (instanceCost.get(instKey) || 0) + cad);
  }

  totals.estimatedUsd = Number(totals.estimatedUsd.toFixed(4));
  totals.estimatedCad = Number(totals.estimatedCad.toFixed(4));
  totals.deterministicRatioPct = totals.events > 0
    ? Number(((totals.deterministicOps / totals.events) * 100).toFixed(1))
    : 0;
  totals.offPeakSharePct = totals.aiCalls > 0
    ? Number(((offPeakCount / totals.aiCalls) * 100).toFixed(1))
    : 100;

  const sortMap = (map) =>
    [...map.values()]
      .map((r) => ({
        ...r,
        estimatedUsd: Number(r.estimatedUsd.toFixed(4)),
        estimatedCad: Number(r.estimatedCad.toFixed(4)),
        shareTokensPct: totals.totalTokens > 0 ? Number(((r.totalTokens / totals.totalTokens) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.estimatedCad - a.estimatedCad || b.totalTokens - a.totalTokens || b.calls - a.calls);

  const perInstanceSorted = [...instanceCost.values()].sort((a, b) => a - b);
  const avgInstanceCad = perInstanceSorted.length
    ? Number((perInstanceSorted.reduce((s, x) => s + x, 0) / perInstanceSorted.length).toFixed(4))
    : 0;
  const monthlyBuffetRevCad = activeClients * 350;
  const heavyOutliers = perInstanceSorted.filter((c) => c > WORKSPACE_USD_CAP * USD_TO_CAD * 0.7).length;

  return {
    generatedAt: new Date().toISOString(),
    billingModel: "PURE_FIXED_BUFFET_BETA",
    pricingPlansCad: { soloMonthly: 350, equipeMonthly: 490, padFee: 1.5, workspaceCapUsd: WORKSPACE_USD_CAP },
    totals,
    byModel: sortMap(byModel),
    byProvider: sortMap(byProvider),
    byTaskType: sortMap(byTaskType),
    byActor: sortMap(byActor),
    byProfile: sortMap(byProfile),
    buffetPoolMetrics: {
      observedInstances: Math.max(perInstanceSorted.length, activeClients),
      avgCostPerInstanceCad: avgInstanceCad,
      p50CostCad: Number(percentile(perInstanceSorted, 0.5).toFixed(4)),
      p90CostCad: Number(percentile(perInstanceSorted, 0.9).toFixed(4)),
      maxCostCad: Number((perInstanceSorted[perInstanceSorted.length - 1] || 0).toFixed(4)),
      heavyOutliersCount: heavyOutliers,
      poolEstimatedMarginPct: monthlyBuffetRevCad > 0
        ? Number((((monthlyBuffetRevCad - totals.estimatedCad - activeClients * 1.5) / monthlyBuffetRevCad) * 100).toFixed(2))
        : 99.0,
    },
  };
}

function summarizeUsageLedger(dataDir, opts = {}) {
  const events = readUsageEvents(dataDir, opts);
  return aggregateUsageEvents(events, opts);
}

module.exports = {
  USD_TO_CAD,
  WORKSPACE_USD_CAP,
  MODEL_RATES_USD_PER_M,
  isDeepSeekPeakUtc,
  normalizeModelKey,
  computeCallCost,
  pseudonymizeActor,
  computeInstanceHash,
  classifyTaskType,
  appendUsageEvent,
  readUsageEvents,
  aggregateUsageEvents,
  summarizeUsageLedger,
};
