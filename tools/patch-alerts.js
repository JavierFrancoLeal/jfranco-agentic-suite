// Patch supervisor/server.js: alerts engine (evidence layer) + shift checklists.
const fs = require("fs");
let s = fs.readFileSync("supervisor/server.js", "utf8");
const fails = [];
const rep = (a, b) => { if (s.includes(a)) s = s.replace(a, b); else fails.push(a.slice(0, 50)); };

// 1. State files
rep('const REG_FILE = path.join(DATA_DIR, "register.json");',
'const REG_FILE = path.join(DATA_DIR, "register.json");\nconst ALERTS_FILE = path.join(DATA_DIR, "alerts.json");\nconst SHIFT_FILE = path.join(DATA_DIR, "shift.json");');

// 2. Core helpers after regView
const helpers = `function alertsRead() { try { return JSON.parse(fs.readFileSync(ALERTS_FILE, "utf8")); } catch { return { items: [] }; } }
function alertsWrite(a) { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(ALERTS_FILE, JSON.stringify(a, null, 2)); }
function shiftRead() { try { return JSON.parse(fs.readFileSync(SHIFT_FILE, "utf8")); } catch { return { date: "", opened: null, closed: null }; } }
function shiftWrite(sh) { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(SHIFT_FILE, JSON.stringify(sh, null, 2)); }
function todayStr() { return new Date().toISOString().slice(0, 10); }
// Weather: the EVIDENCE layer. Real data in (configurable source), never our predictions.
async function fetchWeather() {
  const lat = process.env.DSH_WEATHER_LAT || "47.66";
  const lon = process.env.DSH_WEATHER_LON || "-70.15";
  const url = process.env.DSH_WEATHER_URL ||
    "https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon + "&hourly=precipitation_probability&forecast_days=1";
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}
// Alert creation: only on MEASURED facts (precipitation probability next 3 hours).
async function weatherCheck() {
  const w = await fetchWeather();
  if (!w || !w.hourly || !w.hourly.precipitation_probability) return;
  const probs = w.hourly.precipitation_probability;
  const hours = (w.hourly.time || []).map((t) => Number(t.slice(11, 13)));
  const now = new Date().getHours();
  let maxPct = 0, inHour = -1;
  for (let i = 0; i < probs.length; i++) {
    const h = hours[i];
    if (h >= now && h < now + 3 && probs[i] > maxPct) { maxPct = probs[i]; inHour = h - now; }
  }
  if (maxPct < 60) return; // threshold: only a meaningful rain risk
  const a = alertsRead();
  const key = todayStr() + "-rain-" + inHour;
  if (a.items.some((x) => x.key === key)) return; // one alert per event
  a.items.push({ id: "a" + Date.now(), key, kind: "rain", pct: maxPct, inHour, ts: ts(), status: "active", decision: null, source: "weather" });
  alertsWrite(a);
}`;
rep('function regView() { const r = regRead(); const recorded = Math.round((r.sales || []).reduce((a, x) => a + (x.total || 0), 0) * 100) / 100; return { ...r, recorded, variance: r.declared == null ? null : Math.round((r.declared - recorded) * 100) / 100 }; }',
'function regView() { const r = regRead(); const recorded = Math.round((r.sales || []).reduce((a, x) => a + (x.total || 0), 0) * 100) / 100; return { ...r, recorded, variance: r.declared == null ? null : Math.round((r.declared - recorded) * 100) / 100 }; }\n' + helpers);

// 3. Endpoints (before /api/register GET)
const eps = `if (pathname === "/api/alerts" && req.method === "GET") { if (!auth(req)) return send(res, 401, { error: "unauthorized" }); const a = alertsRead(); const active = a.items.find((x) => x.status === "active"); return send(res, 200, { active: active || null, last: a.items.slice(-3).reverse() }); }
  if (pathname === "/api/alerts/decide" && req.method === "POST") { const u = auth(req); if (!u) return send(res, 401, { error: "unauthorized" }); const b = await json(req); const a = alertsRead(); const it = a.items.find((x) => x.id === b.id); if (!it || it.status !== "active") return send(res, 200, { ok: false }); it.status = "done"; it.decision = b.decision === "yes" ? "yes" : "no"; it.decidedBy = u.name; it.decidedAt = ts(); alertsWrite(a); if (b.decision === "yes") { const l = liveRead(); l.notices = l.notices || []; l.notices.push({ ts: ts(), from: u.name, text: "Pluie probable (~" + it.pct + "%) dans ~" + it.inHour + " h — préparez-vous." }); liveWrite(l); } return send(res, 200, { ok: true }); }
  if (pathname === "/api/shift" && req.method === "GET") { if (!auth(req)) return send(res, 401, { error: "unauthorized" }); const sh = shiftRead(); const same = sh.date === todayStr(); return send(res, 200, { opened: same ? sh.opened : null, closed: same ? sh.closed : null }); }
  if (pathname === "/api/shift/mark" && req.method === "POST") { const u = auth(req); if (!u) return send(res, 401, { error: "unauthorized" }); const b = await json(req); const sh = shiftRead(); if (sh.date !== todayStr()) { sh.date = todayStr(); sh.opened = null; sh.closed = null; } const phase = sh.opened ? "close" : "open"; const bucket = phase === "open" ? (sh.openSteps = sh.openSteps || []) : (sh.closeSteps = sh.closeSteps || []); const list = phase === "open" ? SECTOR_OPEN : SECTOR_CLOSE; const cur = list.map((st) => ({ id: st.id, label: st.label, done: bucket.some((x) => x.id === st.id) })); const step = cur.find((x) => x.id === b.stepId); if (!step) return send(res, 200, { ok: false }); if (b.done) { if (!bucket.some((x) => x.id === b.stepId)) bucket.push({ id: b.stepId, by: u.name, ts: ts() }); } else { sh[phase === "open" ? "openSteps" : "closeSteps"] = bucket.filter((x) => x.id !== b.stepId); } const doneAll = list.every((st) => bucket.some((x) => x.id === st.id)); if (doneAll) { if (phase === "open") sh.opened = { by: u.name, ts: ts(), steps: bucket }; else sh.closed = { by: u.name, ts: ts(), steps: bucket }; } shiftWrite(sh); return send(res, 200, { ok: true, phase, doneAll, done: b.done }); }
  if (pathname === "/api/register" && req.method === "GET") {`;
rep('if (pathname === "/api/register" && req.method === "GET") {', eps);

// 4. Sector steps (default restaurant; a sector pack can override)
const steps = `const SECTOR_OPEN = [
  { id: "temp", label: "Vérifier les températures (réfrigérateurs, congélateurs)" },
  { id: "hygiene", label: "Contrôle d'hygiène des postes et des mains" },
  { id: "equipment", label: "Allumer et vérifier les équipements" },
  { id: "register", label: "Ouvrir la caisse et vérifier le fond de caisse" }
];
const SECTOR_CLOSE = [
  { id: "close_register", label: "Fermer la caisse et déclarer le total (Z-rapport)" },
  { id: "close_equipment", label: "Éteindre les équipements et vérifier les portes" },
  { id: "close_clean", label: "Nettoyage et rangement des postes" },
  { id: "close_lights", label: "Lumières, chauffage et alarme" }
];
const VERSION = "`;
rep('const VERSION = "', steps);

// 5. Weather polling
rep('console.log("J.Franco supervisor running',
'setInterval(weatherCheck, 15 * 60 * 1000);\nsetTimeout(weatherCheck, 4000);\nconsole.log("J.Franco supervisor running');

fs.writeFileSync("supervisor/server.js", s);
console.log("servidor: alertas + jornada. Pendientes:", fails.length ? fails.join(" | ") : "ninguno");
