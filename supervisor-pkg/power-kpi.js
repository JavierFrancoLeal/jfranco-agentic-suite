// supervisor/power-kpi.js — Honest Net KPI accounting & laptop power/battery governor.
// Created by J.Franco. MIT license. Zero dependencies: Node >= 24 builtins only.
"use strict";

const KPI_BASELINES = {
  studioApprovedSecs: 240,
  repondantReadSecs: 30,
  repondantReplySecs: 90,
  publicationPreparedSecs: 120,
  formFieldSecs: 15,
  intakeTriageSecs: 30,
  defaultEditCorrectionSecs: 45,
  defaultDismissCorrectionSecs: 60,
  minCorrectionSecs: 5,
  maxCorrectionSecs: 1800,
};

function clampNumber(val, min, max, fallback) {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function emptyKpiTotals() {
  return {
    savedSecs: 0,
    correctiveSecs: 0,
    tasks: 0,
    approved: 0,
    edited: 0,
    dismissed: 0,
    intakeAccepted: 0,
    intakeFiltered: 0,
  };
}

/**
 * Derive incremental KPI deltas from a single telemetry action entry.
 */
function inferActionKpiDelta(action) {
  const d = emptyKpiTotals();
  if (!action || typeof action !== "object" || action.countForKpi === false) return d;

  if (
    action.savedSecs !== undefined ||
    action.correctiveSecs !== undefined ||
    action.edited !== undefined ||
    action.dismissed !== undefined ||
    action.approved !== undefined
  ) {
    d.savedSecs = clampNumber(action.savedSecs, 0, 86400, 0);
    d.correctiveSecs = clampNumber(action.correctiveSecs, 0, 86400, 0);
    if (action.approved) {
      d.approved = 1;
      d.tasks = 1;
    }
    if (action.edited) {
      d.edited = 1;
      if (!d.tasks) d.tasks = 1;
    }
    if (action.dismissed) {
      d.dismissed = 1;
      d.tasks = 1;
    }
    return d;
  }

  const tier = String(action.tier || "");
  const what = String(action.what || "");
  if (tier === "GREEN" && /read the visible conversation/i.test(what)) {
    d.savedSecs += KPI_BASELINES.repondantReadSecs;
  }
  if (/proposed a reply/i.test(what)) {
    d.savedSecs += KPI_BASELINES.repondantReplySecs;
    d.tasks += 1;
    d.approved += 1;
  }
  if (/Publication prepared/i.test(what)) {
    d.savedSecs += KPI_BASELINES.publicationPreparedSecs;
  }
  const fieldsMatch = /filled (\d+) form fields/i.exec(what);
  if (fieldsMatch) {
    d.savedSecs += clampNumber(fieldsMatch[1], 0, 500, 0) * KPI_BASELINES.formFieldSecs;
  }
  if (/draft|Studio/i.test(what) && tier === "SEMI") {
    d.savedSecs += KPI_BASELINES.studioApprovedSecs;
    d.tasks += 1;
    d.approved += 1;
  }
  if (/dismissed/i.test(what)) {
    d.correctiveSecs += KPI_BASELINES.defaultDismissCorrectionSecs;
    d.tasks += 1;
    d.dismissed += 1;
  }
  return d;
}

/**
 * Ensure telemetry objects have cumulative Net KPI totals backfilled cleanly once.
 */
function ensureTelemetryTotals(tel) {
  const obj = tel && typeof tel === "object" ? tel : {};
  if (!Array.isArray(obj.actions)) obj.actions = [];
  if (!obj.kpiTotals || typeof obj.kpiTotals !== "object") {
    const seeded = emptyKpiTotals();
    for (const a of obj.actions) {
      const d = inferActionKpiDelta(a);
      seeded.savedSecs += d.savedSecs;
      seeded.correctiveSecs += d.correctiveSecs;
      seeded.tasks += d.tasks;
      seeded.approved += d.approved;
      seeded.edited += d.edited;
      seeded.dismissed += d.dismissed;
    }
    obj.kpiTotals = seeded;
  } else {
    const base = emptyKpiTotals();
    for (const key of Object.keys(base)) {
      obj.kpiTotals[key] = clampNumber(obj.kpiTotals[key], 0, 1e9, 0);
    }
  }
  return obj;
}

function addDeltaToTotals(totals, delta) {
  totals.savedSecs += clampNumber(delta.savedSecs, 0, 86400, 0);
  totals.correctiveSecs += clampNumber(delta.correctiveSecs, 0, 86400, 0);
  totals.tasks += clampNumber(delta.tasks, 0, 10000, 0);
  totals.approved += clampNumber(delta.approved, 0, 10000, 0);
  totals.edited += clampNumber(delta.edited, 0, 10000, 0);
  totals.dismissed += clampNumber(delta.dismissed, 0, 10000, 0);
  totals.intakeAccepted += clampNumber(delta.intakeAccepted, 0, 10000, 0);
  totals.intakeFiltered += clampNumber(delta.intakeFiltered, 0, 10000, 0);
}

/**
 * Record a discrete Studio decision or intake metric into cumulative telemetry totals.
 */
function recordKpiOutcome(tel, evt) {
  const obj = ensureTelemetryTotals(tel);
  const t = obj.kpiTotals;
  const e = evt && typeof evt === "object" ? evt : {};

  if (e.kind === "task_approved") {
    const saved = clampNumber(e.savedSecs, 0, 86400, KPI_BASELINES.studioApprovedSecs);
    const edited = e.edited === true;
    const corr = edited
      ? clampNumber(e.correctionSecs, KPI_BASELINES.minCorrectionSecs, KPI_BASELINES.maxCorrectionSecs, KPI_BASELINES.defaultEditCorrectionSecs)
      : 0;
    addDeltaToTotals(t, { savedSecs: saved, correctiveSecs: corr, tasks: 1, approved: 1, edited: edited ? 1 : 0 });
    return { savedSecs: saved, correctiveSecs: corr, edited };
  }

  if (e.kind === "task_dismissed") {
    const corr = clampNumber(
      e.correctionSecs,
      KPI_BASELINES.minCorrectionSecs,
      KPI_BASELINES.maxCorrectionSecs,
      KPI_BASELINES.defaultDismissCorrectionSecs
    );
    addDeltaToTotals(t, { savedSecs: 0, correctiveSecs: corr, tasks: 1, dismissed: 1 });
    return { savedSecs: 0, correctiveSecs: corr, dismissed: true };
  }

  if (e.kind === "intake_batch") {
    const accepted = clampNumber(e.accepted, 0, 10000, 0);
    const filtered = clampNumber(e.filtered, 0, 10000, 0);
    const saved = accepted * KPI_BASELINES.intakeTriageSecs;
    addDeltaToTotals(t, { savedSecs: saved, intakeAccepted: accepted, intakeFiltered: filtered });
    return { savedSecs: saved, accepted, filtered };
  }

  return { savedSecs: 0, correctiveSecs: 0 };
}

/**
 * Compute full Net KPI summary from cumulative totals or legacy action logs.
 */
function computeNetKpiSummary(tel) {
  let totals;
  if (tel && tel.kpiTotals && typeof tel.kpiTotals === "object") {
    totals = ensureTelemetryTotals({ ...tel }).kpiTotals;
  } else {
    totals = emptyKpiTotals();
    const acts = tel && Array.isArray(tel.actions) ? tel.actions : [];
    for (const a of acts) {
      const d = inferActionKpiDelta(a);
      addDeltaToTotals(totals, d);
    }
  }

  const productiveSecs = totals.savedSecs;
  const correctiveSecs = totals.correctiveSecs;
  const netSavedSecs = productiveSecs - correctiveSecs;
  const tasks = totals.tasks;
  const corrections = totals.dismissed + totals.edited;
  const ok = Math.max(0, tasks - totals.dismissed);
  const verdict = netSavedSecs > 0 ? "positive" : netSavedSecs < 0 ? "negative" : "neutral";

  return {
    timeSavedMin: Math.round(productiveSecs / 60),
    timeSavedHr: (productiveSecs / 3600).toFixed(2),
    netSavedSecs,
    netSavedMin: Math.round(netSavedSecs / 60),
    netSavedHr: (netSavedSecs / 3600).toFixed(2),
    productiveMin: Math.round(productiveSecs / 60),
    correctiveMin: Math.round(correctiveSecs / 60),
    tasks,
    ok,
    corrections,
    approvedCount: totals.approved,
    editedCount: totals.edited,
    dismissedCount: totals.dismissed,
    intakeAccepted: totals.intakeAccepted,
    intakeFiltered: totals.intakeFiltered,
    successRate: tasks ? Math.round((ok / tasks) * 100) : 100,
    productiveSecs,
    correctiveSecs,
    verdict,
  };
}

/**
 * Laptop efficiency & sleep/wake governor.
 * Keeps resource usage minimal when asleep or running heavy local AI on battery.
 */
function createPowerGovernor(options = {}) {
  const nowFn = typeof options.now === "function" ? options.now : () => Date.now();
  const state = {
    powerState: "awake", // "awake" | "sleeping"
    onBattery: Boolean(options.onBattery),
    batterySaver: options.batterySaver !== false,
    screenLocked: false,
    lastSleepAt: null,
    lastSleepMs: null,
    lastWakeAt: null,
    lastWakeReason: null,
    wakeCount: 0,
    powerChanges: 0,
  };

  function onSleep(reason = "suspend") {
    const nowMs = nowFn();
    state.powerState = "sleeping";
    state.screenLocked = reason === "lock-screen" || reason === "OS_SCREEN_LOCKED";
    state.lastSleepAt = new Date(nowMs).toISOString();
    state.lastSleepMs = nowMs;
    return getState();
  }

  function onWake(reason = "resume") {
    const nowMs = nowFn();
    const sleepDurationMs = state.lastSleepMs ? Math.max(0, nowMs - state.lastSleepMs) : 0;
    state.powerState = "awake";
    state.screenLocked = false;
    state.lastWakeAt = new Date(nowMs).toISOString();
    state.lastWakeReason = String(reason || "resume");
    state.wakeCount += 1;
    state.lastSleepMs = null;
    return {
      wokeUp: true,
      reason: state.lastWakeReason,
      sleepDurationMs,
      wakeAt: state.lastWakeAt,
      state: getState(),
    };
  }

  function onPowerChange(update = {}) {
    if (typeof update.onBattery === "boolean" && update.onBattery !== state.onBattery) {
      state.onBattery = update.onBattery;
      state.powerChanges += 1;
    }
    if (typeof update.batterySaver === "boolean") {
      state.batterySaver = update.batterySaver;
    }
    return getState();
  }

  function shouldDeferBackgroundCompute({ isLocalSovereign = false, manual = false } = {}) {
    if (manual) return { defer: false, reason: null };
    if (state.powerState === "sleeping") return { defer: true, reason: "sleeping" };
    if (state.batterySaver && state.onBattery && isLocalSovereign) {
      return { defer: true, reason: "battery_saver" };
    }
    return { defer: false, reason: null };
  }

  function getState() {
    return {
      state: state.powerState,
      onBattery: state.onBattery,
      batterySaver: state.batterySaver,
      screenLocked: state.screenLocked,
      lastSleepAt: state.lastSleepAt,
      lastWakeAt: state.lastWakeAt,
      lastWakeReason: state.lastWakeReason,
      wakeCount: state.wakeCount,
      powerChanges: state.powerChanges,
    };
  }

  return {
    onSleep,
    onWake,
    onPowerChange,
    shouldDeferBackgroundCompute,
    getState,
  };
}

module.exports = {
  KPI_BASELINES,
  emptyKpiTotals,
  inferActionKpiDelta,
  ensureTelemetryTotals,
  recordKpiOutcome,
  computeNetKpiSummary,
  createPowerGovernor,
};
