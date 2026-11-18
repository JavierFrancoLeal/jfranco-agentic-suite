// supervisor/affluence-forecast.js — Regional Demand & Tourism Affluence Forecaster
// + Passive MEV-WEB POS Z-Report Parser (zero external dependencies, Google Maps ToS safe).
//
// Key design principles:
//   1) Replaces hardcoded Charlevoix rain alert for all accounts with opt-in sector-scoped
//      Affluence Forecasting (active for tourism/hospitality/retail sectors only).
//   2) Google Maps Places "Popular Times" scraping is strictly forbidden; Google Routes API
//      traffic checks run transiently on demand and are NEVER cached to disk.
//   3) Crosses Open-Meteo regional forecast + Quebec tourism/holiday calendar + own local
//      MEV-WEB Z-report sales history to limit uncertainty on staffing and stock.
// Created by J.Franco. MIT license.
"use strict";

const TOURISM_AFFLUENCE_SECTORS = new Set([
  "restaurant",
  "tourisme",
  "hotel",
  "agroalimentaire",
]);

const DEFAULT_AFFLUENCE_CONFIG = Object.freeze({
  enabled: true,
  regionName: "Charlevoix (Route 138 / Baie-Saint-Paul)",
  lat: 47.4419,
  lon: -70.4986,
  corridorOrigin: "Quebec City, QC",
  corridorDestination: "Baie-Saint-Paul, QC",
});

function isTourismAffluenceSector(profileOrSector) {
  if (!profileOrSector) return false;
  if (typeof profileOrSector === "string") {
    return TOURISM_AFFLUENCE_SECTORS.has(profileOrSector.trim().toLowerCase());
  }
  const st = String(profileOrSector.scaleType || "").trim().toUpperCase();
  if (st === "AUTONOMOUS_SOLO") return false;
  const sec = String(profileOrSector.sector || "").trim().toLowerCase();
  return TOURISM_AFFLUENCE_SECTORS.has(sec);
}

function normalizeAffluenceConfig(settings = {}, constitution = {}, profile = {}) {
  const cfg = (settings && typeof settings.affluence === "object" && settings.affluence) || {};
  const regionGeo = (constitution && constitution.legalIdentity && constitution.legalIdentity.regionGeo) || {};
  const sectorEnabled = isTourismAffluenceSector(profile);
  const explicitEnabled = typeof cfg.enabled === "boolean" ? cfg.enabled : sectorEnabled;
  const lat = Number.isFinite(Number(cfg.lat ?? regionGeo.lat))
    ? Math.max(-90, Math.min(90, Number(cfg.lat ?? regionGeo.lat)))
    : DEFAULT_AFFLUENCE_CONFIG.lat;
  const lon = Number.isFinite(Number(cfg.lon ?? regionGeo.lon))
    ? Math.max(-180, Math.min(180, Number(cfg.lon ?? regionGeo.lon)))
    : DEFAULT_AFFLUENCE_CONFIG.lon;
  return {
    enabled: explicitEnabled,
    sectorEligible: sectorEnabled,
    regionName: String(cfg.regionName || regionGeo.regionName || DEFAULT_AFFLUENCE_CONFIG.regionName).trim().slice(0, 80),
    lat,
    lon,
    corridorOrigin: String(cfg.corridorOrigin || DEFAULT_AFFLUENCE_CONFIG.corridorOrigin).trim().slice(0, 120),
    corridorDestination: String(cfg.corridorDestination || DEFAULT_AFFLUENCE_CONFIG.corridorDestination).trim().slice(0, 120),
    hasGoogleMapsKey: Boolean(String(cfg.googleMapsApiKey || process.env.GOOGLE_MAPS_API_KEY || "").trim()),
  };
}

/**
 * Deterministic Quebec/North America tourism demand calendar (holidays + peak windows).
 */
function getTourismCalendarSignal(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  const validDate = Number.isNaN(d.getTime()) ? new Date() : d;
  const month = validDate.getUTCMonth() + 1;
  const day = validDate.getUTCDate();
  const dow = validDate.getUTCDay(); // 0=Sun, 5=Fri, 6=Sat
  const mmdd = String(month).padStart(2, "0") + "-" + String(day).padStart(2, "0");

  const signals = [];
  let boost = 0;

  if (dow === 5 || dow === 6 || dow === 0) {
    boost += dow === 6 ? 24 : 18;
    signals.push(dow === 6 ? "WEEKEND_SATURDAY_PEAK" : dow === 5 ? "FRIDAY_ARRIVAL_WAVE" : "SUNDAY_DEPARTURE");
  }

  // Quebec fixed/key tourism windows
  if (mmdd === "06-24" || mmdd === "07-01" || mmdd === "01-01" || mmdd === "12-25") {
    boost += 25;
    signals.push("STATUTORY_HOLIDAY_" + mmdd);
  }
  // Vacances de la construction (last 2 full weeks of July approx July 19 - Aug 3)
  if ((month === 7 && day >= 19) || (month === 8 && day <= 4)) {
    boost += 28;
    signals.push("QC_CONSTRUCTION_HOLIDAYS");
  } else if ((month === 6 && day >= 24) || month === 7 || (month === 8 && day <= 31)) {
    boost += 18;
    signals.push("SUMMER_HIGH_SEASON");
  } else if ((month === 9 && day >= 15) || (month === 10 && day <= 15)) {
    boost += 15;
    signals.push("AUTUMN_COLORS_PEAK");
  } else if (month === 3 && day <= 15) {
    boost += 14;
    signals.push("QC_MARCH_BREAK");
  } else if ((month === 12 && day >= 20) || month === 1 || month === 2) {
    boost += 10;
    signals.push("WINTER_SKI_SEASON");
  }

  // Known movable Monday peaks around Labor Day / Thanksgiving / Victoria Day
  if (dow === 1 && ((month === 5 && day >= 18 && day <= 25) || (month === 9 && day <= 7) || (month === 10 && day >= 7 && day <= 14))) {
    boost += 22;
    signals.push("LONG_WEEKEND_MONDAY");
  }

  return { boost: Math.min(55, boost), signals, isWeekend: dow === 5 || dow === 6 || dow === 0 };
}

/**
 * Fetch open regional weather (Open-Meteo daily + next 24h precipitation probability).
 */
async function fetchOpenMeteoRegional(lat, lon) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}` +
    "&daily=temperature_2m_max,precipitation_probability_max&hourly=precipitation_probability&forecast_days=3&timezone=America%2FToronto";
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (!r.ok) return null;
    const j = await r.json();
    const maxPrecipToday = Number(j?.daily?.precipitation_probability_max?.[0] ?? 0);
    const maxPrecipNext = Number(j?.daily?.precipitation_probability_max?.[1] ?? maxPrecipToday);
    const tempMaxToday = Number(j?.daily?.temperature_2m_max?.[0] ?? 12);
    const hourly = Array.isArray(j?.hourly?.precipitation_probability) ? j.hourly.precipitation_probability.slice(0, 6) : [];
    const next6hMaxRain = hourly.reduce((m, x) => Math.max(m, Number(x) || 0), 0);
    return {
      source: "open-meteo",
      tempMaxC: Math.round(tempMaxToday * 10) / 10,
      rainProbTodayPct: Math.round(maxPrecipToday),
      rainProbTomorrowPct: Math.round(maxPrecipNext),
      rainNext6hPct: Math.round(next6hMaxRain),
    };
  } catch {
    return null;
  }
}

/**
 * Official Google Maps Routes API v2 live corridor congestion check.
 * Google Maps Platform Terms compliance: NEVER cache or persist traffic outputs to disk.
 */
async function fetchTransientGoogleRoutesCorridor({ origin, destination, googleMapsApiKey }) {
  const key = String(googleMapsApiKey || "").trim();
  if (!key || !origin || !destination) return null;
  try {
    const r = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      signal: AbortSignal.timeout(6000),
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "routes.duration,routes.staticDuration,routes.distanceMeters",
      },
      body: JSON.stringify({
        origin: { address: origin },
        destination: { address: destination },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
      }),
    });
    if (!r.ok) return { available: false, error: `HTTP_${r.status}`, transient: true, cached: false };
    const j = await r.json();
    const route = Array.isArray(j.routes) ? j.routes[0] : null;
    if (!route) return null;
    const durSec = parseInt(String(route.duration || "0s"), 10) || 0;
    const staticSec = parseInt(String(route.staticDuration || durSec + "s"), 10) || durSec;
    const delayRatio = staticSec > 0 ? Math.round(((durSec - staticSec) / staticSec) * 100) : 0;
    return {
      available: true,
      transient: true,
      cached: false,
      tosCompliant: true,
      corridor: `${origin} -> ${destination}`,
      durationMinutes: Math.round(durSec / 60),
      baselineMinutes: Math.round(staticSec / 60),
      congestionDeltaPct: Math.max(0, delayRatio),
    };
  } catch {
    return { available: false, error: "NETWORK", transient: true, cached: false };
  }
}

/**
 * Deterministic regional affluence scoring combining calendar + weather + local POS Z history + optional live corridor.
 */
function computeRegionalAffluence({ config, weather, zImports = [], transientTraffic = null, now } = {}) {
  const cal = getTourismCalendarSignal(now);
  let score = 28 + cal.boost;

  const rainPct = weather ? Number(weather.rainProbTodayPct || 0) : 20;
  const tempC = weather ? Number(weather.tempMaxC ?? 15) : 15;
  if (rainPct >= 70) score -= 18;
  else if (rainPct >= 45) score -= 8;
  else if (rainPct <= 25 && tempC >= 12) score += 12;
  if (tempC >= 18 && tempC <= 29 && rainPct < 35) score += 8;

  if (transientTraffic && transientTraffic.available) {
    if (transientTraffic.congestionDeltaPct >= 25) score += 12;
    else if (transientTraffic.congestionDeltaPct >= 10) score += 6;
  }

  const recentZ = Array.isArray(zImports) ? zImports.slice(-14) : [];
  const avgSales = recentZ.length
    ? Math.round((recentZ.reduce((s, z) => s + (Number(z.totalSalesCad) || 0), 0) / recentZ.length) * 100) / 100
    : null;

  const clamped = Math.max(5, Math.min(100, Math.round(score)));
  const band = clamped >= 75 ? "POINTE_TOURISTIQUE" : clamped >= 55 ? "ACHALANDÉ" : clamped >= 35 ? "MODÉRÉ" : "CALME";

  let prepAdvice = "Effectif standard recommandé.";
  if (band === "POINTE_TOURISTIQUE") {
    prepAdvice = "Forte affluence régionale prévue — prévoir renfort cuisine/accueil et stock de pointe (+25 %).";
  } else if (band === "ACHALANDÉ") {
    prepAdvice = "Achalandage soutenu — vérifier stocks clés et rotation de quart avant le service.";
  } else if (band === "CALME") {
    prepAdvice = "Journée calme estimée — optimiser la préparation et éviter le surstock périssable.";
  }

  return {
    schemaVersion: "FANAL-AFFLUENCE-V1",
    enabled: Boolean(config && config.enabled),
    sectorEligible: Boolean(config && config.sectorEligible),
    regionName: (config && config.regionName) || DEFAULT_AFFLUENCE_CONFIG.regionName,
    score: clamped,
    band,
    prepAdvice,
    calendarSignals: cal.signals,
    weatherSummary: weather || null,
    zHistoryBaseline: { sampleDays: recentZ.length, avgDailySalesCad: avgSales },
    transientTraffic: transientTraffic || { available: false, transient: true, cached: false },
    tosNotice: "Zero Places Popular-Times scraping; optional Routes traffic is ephemeral only (never persisted).",
  };
}

/**
 * Deterministic passive MEV-WEB POS Z-report parser (CSV, TSV, or structured text summary).
 * Avoids forcing dual cash entry when restaurant uses certified Lightspeed/Maitre'D/Square POS.
 */
function parsePosZReport(rawText, filename = "") {
  const txt = String(rawText || "").replace(/\r\n/g, "\n").trim();
  if (!txt) return { ok: false, error: "ERR_EMPTY_Z_REPORT" };

  const parseCad = (s) => {
    const clean = String(s || "").replace(/\u00a0/g, " ").replace(/[$CAD\s]/gi, "").replace(/,(\d{2})$/, ".$1").replace(/,/g, "");
    const n = Number(clean);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
  };

  let totalSalesCad = null;
  let cashCad = null;
  let cardCad = null;
  let tpsCad = null;
  let tvqCad = null;
  let declaredCad = null;
  let txCount = null;
  let dateIso = new Date().toISOString().slice(0, 10);

  const dateM = /\b(202\d-\d{2}-\d{2})\b/.exec(txt);
  if (dateM) dateIso = dateM[1];

  const lines = txt.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    // Colon key: value summary (supports labels like "TVQ (9,975%): 184,54 $") OR CSV/TSV key,value
    const colonKv = /^([^:\t]{2,80})\s*:\s*"?([$0-9.,\s-]+(?:\s*CAD)?)"?$/i.exec(line);
    const kv = colonKv || /^"?([^",;:\t]+)"?\s*[,;\t]\s*"?([$0-9.,\s-]+)"?$/.exec(line);
    if (kv) {
      const k = kv[1].toLowerCase();
      const val = parseCad(kv[2]);
      if (val === null) continue;
      if (/total.*(vente|sale|net|gross|brut|ttc)|^total$/i.test(k) && totalSalesCad === null) totalSalesCad = val;
      else if (/argent|comptant|cash|esp[eè]ce/i.test(k) && cashCad === null) cashCad = val;
      else if (/carte|card|interac|debit|cr[eé]dit|terminal/i.test(k) && cardCad === null) cardCad = (cardCad || 0) + val;
      else if (/tps|gst/i.test(k) && tpsCad === null) tpsCad = val;
      else if (/tvq|qst/i.test(k) && tvqCad === null) tvqCad = val;
      else if (/d[eé]clar|counted|compt[eé]/i.test(k) && declaredCad === null) declaredCad = val;
      else if (/transactions?|factures?|bills?|tickets?|tx/i.test(k) && txCount === null) txCount = Math.round(val);
    }
  }

  // Tabular header CSV fallback (e.g. "date,total_sales,tps,tvq,cash,card,declared")
  if (totalSalesCad === null && lines.length >= 2 && /[,;\t]/.test(lines[0])) {
    const sep = lines[0].includes(";") ? ";" : lines[0].includes("\t") ? "\t" : ",";
    const headers = lines[0].split(sep).map((h) => h.trim().toLowerCase().replace(/["']/g, ""));
    let sumTotal = 0;
    let sumCash = 0;
    let sumCard = 0;
    let sumTps = 0;
    let sawTps = false;
    let sumTvq = 0;
    let sawTvq = false;
    let sumDecl = 0;
    let sawDecl = false;
    let sumTx = 0;
    let sawTx = false;
    let rowCount = 0;
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(sep).map((c) => c.trim().replace(/["']/g, ""));
      const getCol = (re) => {
        const idx = headers.findIndex((h) => re.test(h));
        return idx >= 0 ? parseCad(cols[idx]) : null;
      };
      const rowTot = getCol(/total|amount|montant|sales|ventes|gross/);
      if (rowTot !== null) {
        sumTotal += rowTot;
        rowCount++;
        sumCash += getCol(/cash|comptant|argent/) || 0;
        sumCard += getCol(/card|carte|terminal|interac/) || 0;
        const tpsVal = getCol(/tps|gst/);
        if (tpsVal !== null) { sumTps += tpsVal; sawTps = true; }
        const tvqVal = getCol(/tvq|qst/);
        if (tvqVal !== null) { sumTvq += tvqVal; sawTvq = true; }
        const txVal = getCol(/transactions?|tx_?count|^tx$|factures?|bills?|tickets?/);
        if (txVal !== null) { sumTx += Math.round(txVal); sawTx = true; }
        const dVal = getCol(/declared|declare|counted|compte/);
        if (dVal !== null) {
          sumDecl += dVal;
          sawDecl = true;
        }
      }
    }
    if (rowCount > 0) {
      totalSalesCad = Math.round(sumTotal * 100) / 100;
      if (sumCash > 0) cashCad = Math.round(sumCash * 100) / 100;
      if (sumCard > 0) cardCad = Math.round(sumCard * 100) / 100;
      if (sawTps) tpsCad = Math.round(sumTps * 100) / 100;
      if (sawTvq) tvqCad = Math.round(sumTvq * 100) / 100;
      if (sawDecl) declaredCad = Math.round(sumDecl * 100) / 100;
      txCount = sawTx ? sumTx : (txCount ?? rowCount);
    }
  }

  if (totalSalesCad === null && (cashCad !== null || cardCad !== null)) {
    totalSalesCad = Math.round(((cashCad || 0) + (cardCad || 0)) * 100) / 100;
  }
  if (totalSalesCad === null) {
    return { ok: false, error: "ERR_UNRECOGNIZED_Z_FORMAT" };
  }

  const finalDeclared = declaredCad !== null ? declaredCad : totalSalesCad;
  const varianceCad = Math.round((finalDeclared - totalSalesCad) * 100) / 100;

  return {
    ok: true,
    sourceFile: String(filename || "z-report.csv").slice(0, 120),
    dateIso,
    totalSalesCad,
    cashCad: cashCad ?? 0,
    cardCad: cardCad ?? 0,
    tpsCad: tpsCad ?? null,
    tvqCad: tvqCad ?? null,
    txCount: txCount ?? null,
    declaredCad: finalDeclared,
    varianceCad,
    mevWebPassiveSync: true,
    importedAt: new Date().toISOString(),
  };
}

module.exports = {
  TOURISM_AFFLUENCE_SECTORS,
  DEFAULT_AFFLUENCE_CONFIG,
  isTourismAffluenceSector,
  normalizeAffluenceConfig,
  getTourismCalendarSignal,
  fetchOpenMeteoRegional,
  fetchTransientGoogleRoutesCorridor,
  computeRegionalAffluence,
  parsePosZReport,
};
