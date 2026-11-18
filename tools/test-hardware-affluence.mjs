#!/usr/bin/env node
// test-hardware-affluence.mjs — Deterministic tests for:
//   1) pricing-catalog.json Single Source of Truth (jfranco-deepseek-prices <-> supervisor/usage-telemetry.js)
//   2) affluence-forecast.js (sector gating, deterministic tourism score, POS Z-report CSV parser, zero cache Maps ToS)
//   3) multimodal-bridge.js (TPS 5% + TVQ 9.975% arithmetic check, A2DP live daily minute cap enforcement)
// Created by J.Franco. MIT license. Node >= 24 builtins only.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const req = createRequire(import.meta.url);

const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "supervisor", "pricing-catalog.json"), "utf8"));
const pluginPrices = req(path.join(ROOT, "jfranco-deepseek-prices", "lib", "index.js"));
const telemetry = req(path.join(ROOT, "supervisor", "usage-telemetry.js"));
const affluence = req(path.join(ROOT, "supervisor", "affluence-forecast.js"));
const bridge = req(path.join(ROOT, "supervisor", "multimodal-bridge.js"));

async function main() {
  // 1. Pricing SSOT parity across DSH plugin & Fanal supervisor
  assert.equal(catalog.schemaVersion, "TRASUNTO-PRICING-CATALOG-V2");
  assert.equal(telemetry.USD_TO_CAD, catalog.usdToCad);
  assert.equal(pluginPrices.PRICING.models["deepseek-flash"].inputCacheMiss.offPeak, catalog.modelsUsdPer1M["deepseek-flash"].cacheMiss.offPeak);
  assert.equal(pluginPrices.PRICING.models["deepseek-v4-pro"].output.peak, catalog.modelsUsdPer1M["deepseek-v4-pro"].output.peak);
  assert.deepEqual(pluginPrices.PRICING.chineseHolidays2026, catalog.chineseHolidays2026);
  assert.equal(telemetry.MODEL_RATES_USD_PER_M["deepseek-flash"].cacheMiss.offPeak, catalog.modelsUsdPer1M["deepseek-flash"].cacheMiss.offPeak);
  assert.equal(telemetry.normalizeModelKey("gemini-3.5-live-translate-preview"), "gemini-3.5-live-translate-preview");
  assert.equal(telemetry.normalizeModelKey("gemini-3.8-flash"), "gemini-3.8-flash");

  // 2. Sector gating & affluence computation (charlevoix hardcoded alert replaced by tourism sector opt-in)
  assert.equal(affluence.isTourismAffluenceSector({ scaleType: "SME_CELL", sector: "restaurant" }), true);
  assert.equal(affluence.isTourismAffluenceSector({ scaleType: "MICRO_SINGLE_OWNER", sector: "tourisme" }), true);
  assert.equal(affluence.isTourismAffluenceSector({ scaleType: "SME_CELL", sector: "hotel" }), true);
  assert.equal(affluence.isTourismAffluenceSector({ scaleType: "SME_CELL", sector: "agroalimentaire" }), true);
  assert.equal(affluence.isTourismAffluenceSector({ scaleType: "AUTONOMOUS_SOLO", sector: "restaurant" }), false, "Solo mode keeps affluence off");
  assert.equal(affluence.isTourismAffluenceSector({ scaleType: "SME_CELL", sector: "cpa" }), false);
  assert.equal(affluence.isTourismAffluenceSector({ scaleType: "SME_CELL", sector: "clinique" }), false);

  const satSummerNice = affluence.computeRegionalAffluence({
    config: { enabled: true, sectorEligible: true, regionName: "Charlevoix Test" },
    weather: { rainProbTodayPct: 10, tempMaxC: 24 },
    zImports: [{ totalSalesCad: 4250 }, { totalSalesCad: 3980 }],
    transientTraffic: { available: true, durationMinutes: 95, baselineMinutes: 70, congestionDeltaPct: 36, cached: false },
    now: "2026-07-25T15:00:00Z", // Saturday during QC construction holidays!
  });
  const wedRainyNovember = affluence.computeRegionalAffluence({
    config: { enabled: true, sectorEligible: true, regionName: "Charlevoix Test" },
    weather: { rainProbTodayPct: 85, tempMaxC: 4 },
    zImports: [],
    transientTraffic: null,
    now: "2026-11-18T15:00:00Z", // Rainy Wednesday Nov
  });
  assert.equal(satSummerNice.schemaVersion, "FANAL-AFFLUENCE-V1");
  assert.ok(satSummerNice.score >= 75 && satSummerNice.band === "POINTE_TOURISTIQUE", `Expected high summer Saturday peak, got ${satSummerNice.score} (${satSummerNice.band})`);
  assert.ok(satSummerNice.score > wedRainyNovember.score + 30, "Construction Saturday + traffic must strongly outscore rainy Nov weekday");
  assert.equal(satSummerNice.zHistoryBaseline.sampleDays, 2);
  assert.equal(satSummerNice.transientTraffic.cached, false, "Google Routes traffic check must explicitly stay uncached");
  assert.ok(satSummerNice.tosNotice.includes("Popular-Times"), "Must carry Maps ToS compliance notice");

  // 3. Passive MEV-WEB POS Z-report parser
  assert.equal(affluence.parsePosZReport("").ok, false);
  const zCsv = affluence.parsePosZReport(
    "date,total_sales,cash,card,tps,tvq,transactions,declared\n2026-11-15,3420.50,410.00,3010.50,148.75,296.76,88,3420.50",
    "mev-z-20261115.csv"
  );
  assert.equal(zCsv.ok, true);
  assert.equal(zCsv.dateIso, "2026-11-15");
  assert.equal(zCsv.totalSalesCad, 3420.5);
  assert.equal(zCsv.tpsCad, 148.75);
  assert.equal(zCsv.tvqCad, 296.76);
  assert.equal(zCsv.txCount, 88);

  const zSummary = affluence.parsePosZReport(
    "Rapport Z Fin de journee 2026-11-14\nVentes totales: 1850,00 $\nTPS (5%): 92,50 $\nTVQ (9,975%): 184,54 $\nComptant: 300,00 $\nCartes: 1550,00 $",
    "z-caisse.txt"
  );
  assert.equal(zSummary.ok, true);
  assert.equal(zSummary.totalSalesCad, 1850);
  assert.equal(zSummary.tpsCad, 92.5);
  assert.equal(zSummary.tvqCad, 184.54);

  // 4. Quebec TPS 5% + TVQ 9.975% deterministic verification (fail closed RED on math mismatch)
  const validInv = bridge.verifyQuebecInvoiceMath({ subtotalCad: 100.0, tpsCad: 5.0, tvqCad: 9.98, totalCad: 114.98 });
  assert.equal(validInv.validMath, true);
  assert.equal(validInv.semaphore, "GREEN");

  const badTpsInv = bridge.verifyQuebecInvoiceMath({ subtotalCad: 100.0, tpsCad: 10.0, tvqCad: 9.98, totalCad: 119.98 });
  assert.equal(badTpsInv.validMath, false);
  assert.equal(badTpsInv.semaphore, "RED", "Tampered TPS must trigger RED audit escalation");
  assert.ok(badTpsInv.issues.some((i) => i.startsWith("TPS_MISMATCH")));

  // 5. Counter Live A2DP daily minutes cap enforcement (protects $5 USD BYOK cap)
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fanal-hw-test-"));
  try {
    const noKeyRes = await bridge.createCounterLiveSessionToken({ apiKey: "", dataDir: tmpDir });
    assert.equal(noKeyRes.ok, false);
    assert.equal(noKeyRes.error, "ERR_GEMINI_KEY_REQUIRED_FOR_LIVE");

    const settings = { counterLive: { dailyMinutesCap: 10 } };
    const u1 = bridge.recordLiveTranslateUsageSeconds(tmpDir, 600, settings, "cashier1");
    assert.equal(u1.minutesUsed, 10);
    assert.equal(u1.remainingMinutes, 0);

    const cappedRes = await bridge.createCounterLiveSessionToken({ apiKey: "AIzaFakeTestKey123", dataDir: tmpDir, settings });
    assert.equal(cappedRes.ok, false);
    assert.equal(cappedRes.status, 429);
    assert.equal(cappedRes.error, "ERR_DAILY_LIVE_MINUTES_CAP_REACHED");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  console.log("HARDWARE_AFFLUENCE_TESTS PASSED");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
