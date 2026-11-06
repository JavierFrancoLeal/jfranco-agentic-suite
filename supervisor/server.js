#!/usr/bin/env node
// supervisor/server.js — J.Franco suite supervisor backend.
// Created by J.Franco. MIT license. Zero dependencies: runs with any Node ≥24.
//
// Real local logins (scrypt-hashed passwords), owner/lead/employee roles,
// field reports, a feedback queue, a decisions.md editor, and the central
// dashboard — the business owner's control panel for the agentic suite.
//
// Storage modes:
//   default  — markdown files (simple, perfect for small businesses)
//   --db     — SQLite (node:sqlite) for 100+ employee deployments
// Network modes:
//   --lan    — bind 0.0.0.0 so tablets/phones on the WiFi can reach it
//   --https  — also serve HTTPS on port 8443 (certificates in ~/.dsh/certs,
//              generated with tools/make-cert.sh)
//
// Usage:
//   node server.js init --owner <name> --password <pw> [--employee <name> --employee-password <pw>] [--db]
//   node server.js [--lan] [--https] [--db]
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");

const PORT = Number(process.env.DSH_SUPERVISOR_PORT || 8787);
const HTTPS_PORT = Number(process.env.DSH_SUPERVISOR_HTTPS_PORT || 8443);
const ARGS = process.argv.slice(2);
const LAN = ARGS.includes("--lan");
const HTTPS_ON = ARGS.includes("--https");
const USE_DB = ARGS.includes("--db");
const HOST = process.env.DSH_SUPERVISOR_HOST || (LAN ? "0.0.0.0" : "127.0.0.1");
const ROOT = path.join(__dirname, "..");
const UI_DIR = path.join(ROOT, "ui");
const DATA_DIR = process.env.DSH_SUPERVISOR_DATA || path.join(os.homedir(), ".dsh");
const USERS_FILE = path.join(DATA_DIR, "supervisor-users.json");
const REPORTS_FILE = path.join(DATA_DIR, "supervision.md");
const FEEDBACK_FILE = path.join(DATA_DIR, "feedback.md");
const DECISIONS_FILE = path.join(DATA_DIR, "decisions.md");
const DB_FILE = path.join(DATA_DIR, "supervisor.db");
const USAGE_FILE = path.join(DATA_DIR, "usage.md");
const LIVE_FILE = path.join(DATA_DIR, "live.json");
const SECTOR_FILE = path.join(DATA_DIR, "sector.json");
const REG_FILE = path.join(DATA_DIR, "register.json");
const ALERTS_FILE = path.join(DATA_DIR, "alerts.json");
const SHIFT_FILE = path.join(DATA_DIR, "shift.json");
const TASKS_FILE = path.join(DATA_DIR, "tasks.json");
const PRICE_PER_MILLION = Number(process.env.DSH_PRICE_PER_MILLION || 0.28);
const SECTOR_OPEN = [
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
const VERSION = "1.0.96";
// Homeostasis: the daily token budget (metabolic limit). The brain rests
// when the budget is spent — no runaway costs.
const DAILY_BUDGET_USD = Number(process.env.DSH_DAILY_BUDGET_USD || 0); // 0 = unlimited: consumption is the business
function todayCostUsd() {
  const day = new Date().toISOString().slice(0, 10);
  let tokens = 0;
  if (db) {
    try { tokens = db.prepare("SELECT COALESCE(SUM(tokens),0) t FROM usage WHERE ts >= ?").get(day + "T00:00:00.000Z").t || 0; } catch {}
  } else {
    try {
      for (const line of fs.readFileSync(USAGE_FILE, "utf8").split("\n")) {
        if (line.indexOf(day) < 0) continue;
        const m = /(\d+) tokens/.exec(line);
        if (m) tokens += Number(m[1]);
      }
    } catch {}
  }
  return Math.round((tokens / 1e6) * PRICE_PER_MILLION * 100) / 100;
}
function budgetOk() { return DAILY_BUDGET_USD <= 0 || todayCostUsd() < DAILY_BUDGET_USD; }
const TLS_KEY = process.env.DSH_TLS_KEY || path.join(DATA_DIR, "certs", "key.pem");
const TLS_CERT = process.env.DSH_TLS_CERT || path.join(DATA_DIR, "certs", "cert.pem");
const SESSION_TTL = 8 * 60 * 60 * 1000;
// Login brute-force protection: per-IP escalating lockout.
const loginAttempts = new Map();
const MAX_FAILS = 8, BASE_LOCK_MS = 60 * 1000;
function loginBlocked(ip) {
  const a = loginAttempts.get(ip);
  if (!a) return null;
  if (a.lockUntil && Date.now() < a.lockUntil) return Math.ceil((a.lockUntil - Date.now()) / 1000);
  if (a.fails >= MAX_FAILS) { a.lockUntil = Date.now() + BASE_LOCK_MS * Math.pow(2, a.lockCount || 0); a.lockCount = (a.lockCount || 0) + 1; a.fails = 0; return Math.ceil((a.lockUntil - Date.now()) / 1000); }
  return null;
}
function loginFail(ip) { const a = loginAttempts.get(ip) || { fails: 0 }; a.fails += 1; loginAttempts.set(ip, a); }
function loginOk(ip) { loginAttempts.delete(ip); }

// ---------- SQLite storage (--db) ----------
let db = null;
if (USE_DB) {
  const { DatabaseSync } = require("node:sqlite");
  fs.mkdirSync(DATA_DIR, { recursive: true });
  db = new DatabaseSync(DB_FILE);
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (name TEXT PRIMARY KEY, salt TEXT, hash TEXT, role TEXT, created TEXT);
    CREATE TABLE IF NOT EXISTS reports (id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT, worker TEXT, text TEXT);
    CREATE TABLE IF NOT EXISTS feedback (id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT, worker TEXT, role TEXT, category TEXT, text TEXT);
    CREATE TABLE IF NOT EXISTS decisions (id INTEGER PRIMARY KEY CHECK (id = 1), content TEXT, updated TEXT);
    CREATE TABLE IF NOT EXISTS usage (id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT, worker TEXT, tokens INTEGER, model TEXT);
  `);
}

// ---------- CLI: init ----------
if (ARGS[0] === "init") {
  const get = (k) => { const i = ARGS.indexOf(k); return i >= 0 && ARGS[i + 1] ? ARGS[i + 1] : undefined; };
  const owner = get("--owner"), opw = get("--password");
  if (!owner || !opw) {
    console.error("usage: node server.js init --owner <name> --password <pw> [--owner-label <label>] [--employee <name> --employee-password <pw> --employee-label <label>] [--lead <name> --lead-password <pw> --lead-label <label>] [--db]");
    process.exit(1);
  }
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (db) { db.exec("CREATE TABLE IF NOT EXISTS users (name TEXT PRIMARY KEY, salt TEXT, hash TEXT, role TEXT, label TEXT, created TEXT)"); try { db.exec("ALTER TABLE users ADD COLUMN label TEXT"); } catch {} }
  const add = (name, pw, role, label) => {
    if (String(pw).length < 8) { console.error("init: password for " + name + " must be at least 8 characters"); process.exit(1); }
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.scryptSync(pw, salt, 64).toString("hex");
    if (db) db.prepare("INSERT OR REPLACE INTO users (name,salt,hash,role,label,created) VALUES (?,?,?,?,?,?)").run(name, salt, hash, role, label || name, new Date().toISOString());
    else { const u = loadUsers(); u[name] = { salt, hash, role, label: label || name }; saveUsers(u); }
  };
  add(owner, opw, "owner", get("--owner-label"));
  const ename = get("--employee"), epw = get("--employee-password");
  if (ename && epw) add(ename, epw, "employee", get("--employee-label"));
  const lname = get("--lead"), lpw = get("--lead-password");
  if (lname && lpw) add(lname, lpw, "lead", get("--lead-label"));
  console.log("Users created (" + (db ? "sqlite" : "json") + "): " + owner + " (owner)" + (ename && epw ? ", " + ename + " (employee)" : "") + (lname && lpw ? ", " + lname + " (lead)" : ""));
  console.log("Now run: node server.js" + (USE_DB ? " --db" : "") + (LAN ? " --lan" : ""));
  process.exit(0);
}

// ---------- storage helpers (file or sqlite) ----------
function loadUsers() {
  if (db) {
    const out = {};
    for (const r of db.prepare("SELECT name,salt,hash,role,label FROM users").all()) out[r.name] = { salt: r.salt, hash: r.hash, role: r.role, label: r.label };
    return out;
  }
  try { return JSON.parse(fs.readFileSync(USERS_FILE, "utf8")); } catch { return {}; }
}
function saveUsers(u) {
  if (db) { /* inserts handled per-user */ return; }
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(USERS_FILE, JSON.stringify(u, null, 2));
}
function hashPw(pw, salt) { return crypto.scryptSync(pw, salt, 64).toString("hex"); }
function ts() { return new Date().toISOString(); }
// ── The dual brain, INSIDE the app ─────────────────────────────
// When DEEPSEEK_API_KEY is set, the server calls the official API directly:
// real-time demand → deepseek-flash; deep analysis → deepseek-v4-pro.
// Without the key, the standby agent (tools/agent-standby.sh) takes over.
const BRAIN_BASE = "https://api.deepseek.com/chat/completions";
async function brain(model, prompt, maxTokens) {
  const key = clientKey() || process.env.DEEPSEEK_API_KEY || "";
  if (!key) throw new Error("no DEEPSEEK_API_KEY");
  const r = await fetch(BRAIN_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key },
    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], max_tokens: maxTokens || (model.startsWith("deepseek-v4-pro") ? 12000 : 8000), temperature: 0.4 }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.choices) throw new Error((j.error && j.error.message) || ("HTTP " + r.status));
  try { appendUsage("server", Number(j.usage && j.usage.total_tokens) || 0, model); } catch {}
  try { telemetryTick("call", { model, tokens: Number(j.usage && j.usage.total_tokens) || 0 }); } catch {}
  const m = j.choices[0].message || {};
  return m.content || m.reasoning_content || "";
}
function jsonBlock(text) {
  const a = String(text).indexOf("{"), b = String(text).lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(String(text).slice(a, b + 1)); } catch { return null; }
}
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
function settingsRead() { try { return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8")); } catch { return {}; } }
function settingsWrite(obj) { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(SETTINGS_FILE, JSON.stringify(obj, null, 2)); }
function clientKey() { const s0 = settingsRead(); return (s0.apiKey && String(s0.apiKey).trim()) || ""; }
function brainOn() { return !!clientKey() || !!process.env.DEEPSEEK_API_KEY; }
function constitutionRead() {
  try { const p = path.join(DATA_DIR, "constitution.json"); return JSON.parse(fs.readFileSync(p, "utf8")); }
  catch (e) { return { philosophy: "", tone: "", policies: "", discountRule: "", minPrice: "", escalation: "" }; }
}
function constitutionWrite(c) { try { fs.writeFileSync(path.join(DATA_DIR, "constitution.json"), JSON.stringify(c)); } catch (e) {} }
function memoryRead() {
  try { const p = path.join(DATA_DIR, "memory.json"); return JSON.parse(fs.readFileSync(p, "utf8")); }
  catch (e) { return { contacts: [] }; }
}
function memoryWrite(m) { try { fs.writeFileSync(path.join(DATA_DIR, "memory.json"), JSON.stringify(m)); } catch (e) {} }
function constitutionCtx() {
  const c = constitutionRead();
  return "Constitution du client: " + [c.philosophy, c.tone, c.policies, c.discountRule, c.minPrice ? "prix minimum: " + c.minPrice : "", c.escalation].filter(Boolean).join(" | ") + ". ";
}
function memoryCtx() {
  const m = memoryRead();
  const cs = (m.contacts || []).slice(0, 15).map((x) => x.name + " (" + (x.type || "contact") + ")" + (x.ids ? " identifiants: " + x.ids : "") + ": " + (x.order || "") + " " + (x.address ? "adresse " + x.address : "") + (x.price ? " prix " + x.price : "")).join(" · ");
  return cs ? "Mémoire (clients, fournisseurs, 'lo de siempre'): " + cs + ". " : "";
}
// The VISIBLE browser pilot: the machine announces itself — always.
let BROWSER = null;
function browserBridge() { if (!BROWSER) { try { BROWSER = require(path.join(__dirname, "browser-cdp.js")); } catch (e) { BROWSER = null; } } return BROWSER; }
// ── The orchestration layer: routing table, telemetry, executor ──
const ROUTES = {
  transcript: { model: "deepseek-flash", budget: 0.002 },
  translate:  { model: "deepseek-flash", budget: 0.002 },
  studio:     { model: "deepseek-flash", budget: 0.002 },
  deep:       { model: "deepseek-v4-pro", budget: 0.05 },
};
const TELE_FILE = path.join(DATA_DIR, "telemetry.json");
function telemetry() {
  try { return JSON.parse(fs.readFileSync(TELE_FILE, "utf8")); }
  catch { return { day: ts().slice(0, 10), calls: {}, tiers: { GREEN: 0, SEMI: 0, YELLOW: 0, RED: 0 }, decisions: { alertsYes: 0, alertsNo: 0, confirmed: 0, send: 0, nosend: 0 }, actions: [] }; }
}
function telemetryTick(kind, extra) {
  const t = telemetry();
  const day = ts().slice(0, 10);
  if (t.day !== day) { t.day = day; t.calls = {}; t.tiers = { GREEN: 0, SEMI: 0, YELLOW: 0, RED: 0 }; t.decisions = { alertsYes: 0, alertsNo: 0, confirmed: 0, send: 0, nosend: 0 }; }
  if (kind === "call") { const m = String(extra && extra.model || "?"); t.calls[m] = t.calls[m] || { n: 0, tokens: 0 }; t.calls[m].n++; t.calls[m].tokens += Number(extra && extra.tokens) || 0; }
  if (kind === "tier" && extra) { t.tiers[extra] = (t.tiers[extra] || 0) + 1; }
  if (kind === "decision" && extra) { t.decisions[extra] = (t.decisions[extra] || 0) + 1; }
  if (kind === "action" && extra) { t.actions.unshift({ ts: ts(), tier: extra.tier, what: extra.what }); t.actions = t.actions.slice(0, 40); }
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(TELE_FILE, JSON.stringify(t)); } catch {}
}
function autonomyLevel() {
  const t = telemetry();
  const n = Object.values(t.tiers).reduce((a, b) => a + b, 0);
  if (!n) return 1;
  const auto = (t.tiers.GREEN || 0) / n;
  return auto > 0.8 ? 5 : auto > 0.6 ? 4 : auto > 0.4 ? 3 : auto > 0.2 ? 2 : 1;
}
// El EJECUTOR: acciones automáticas con semáforo (GREEN registrada para verificación)
function executorAct(tier, what) {
  telemetryTick("action", { tier, what });
  if (tier === "GREEN") appendReport("Executor", what);
}
const LANG_NAMES = { es: "Spanish", fr: "French", en: "English", de: "German", it: "Italian", pt: "Portuguese", zh: "Chinese", ja: "Japanese", ko: "Korean", ar: "Arabic" };
function processTranscript(b) {
  const appLang = String(b.lang || "fr").slice(0, 2).toLowerCase();
  const appLangName = LANG_NAMES[appLang] || appLang;
  const prompt = "Live mirror mode. A worker captured this conversation from the field: " + String(b.text || "") + " Decode it: split by person (Person 1, Person 2…) and keep ONLY the actionable requests — orders, reservations, modifications, questions a client asks. IGNORE greetings, jokes, chit-chat, and any noise that needs no action. Write every request text strictly in " + appLangName + ": translate anything that is not already in " + appLangName + " into " + appLangName + ". Assign each request its tier (GREEN/SEMI/YELLOW/RED). If nothing needs action, return an empty speakers array. Reply with ONLY one JSON object: {\"speakers\":[{\"name\":\"<person>\",\"requests\":[{\"text\":\"<request>\",\"tier\":\"<tier>\"}]}]}";
  brain("deepseek-flash", prompt).then((out) => {
    let j = jsonBlock(out);
    if (!j || !Array.isArray(j.speakers)) {
      console.error("flash transcript: respuesta sin JSON:", String(out).slice(0, 200));
      // fallback: un resumen mínimo en lugar de nada
      j = { speakers: [{ name: "Person 1", requests: [{ text: String(b.text || "").slice(0, 300), tier: "GREEN" }] }] };
    }
    const s0 = liveRead();
    if (s0.worker && b.worker && s0.worker !== b.worker) return; // stale brain reply: never clobber a newer session
    s0.status = "summary";
    s0.worker = b.worker || s0.worker;
    s0.speakers = j.speakers.map((p, i) => ({ id: "p" + (i + 1), name: p.name || ("Person " + (i + 1)), requests: (p.requests || []).map((r, j2) => { const tier = r.tier || "GREEN"; telemetryTick("tier", tier); return { id: "p" + (i + 1) + "-r" + (j2 + 1), text: String(r.text || ""), tier, status: "pending" }; }) }));
    liveWrite(s0);
    executorAct("GREEN", "Field summary written: " + s0.speakers.map(p => p.name + " — " + (p.requests || []).map(r => r.text).join("; ")).join(" | "));
  }).catch((e) => console.error("flash transcript:", e.message));
}
function processDeep(item) {
  const prompt = "Deep analysis. Question: " + String(item.text || "") + " Think deeply and answer thoroughly, in French if the question is in French or Spanish. Keep it useful for a business owner.";
  // 1) Borrador rápido (flash, ~5 s): la respuesta llega YA, marcada como borrador
  brain("deepseek-flash", "Short draft: answer this business question in 2-3 sentences, in French: " + String(item.text || "")).then((draft) => {
    const s2 = liveRead();
    s2.deepAnswers = s2.deepAnswers || [];
    s2.deepAnswers.push({ id: item.id, text: item.text, answer: String(draft || ""), ts: ts(), phase: "draft" });
    liveWrite(s2);
  }).catch(() => {});
  // 2) La respuesta profunda (v4-pro): reemplaza el borrador cuando madura
  brain("deepseek-v4-pro", prompt).then((out) => {
    appendReport("Reasoner", out);
    const s2 = liveRead();
    s2.deepAnswers = s2.deepAnswers || [];
    const i = s2.deepAnswers.findIndex(x => x.id === item.id);
    const entry = { id: item.id, text: item.text, answer: out, ts: ts(), phase: "final" };
    if (i >= 0) s2.deepAnswers[i] = entry; else s2.deepAnswers.push(entry);
    liveWrite(s2);
  }).catch((e) => console.error("deep v4-pro:", e.message));
}
function processStudio(item) {
  const prompt = "Decision center kitchen (Trasunto). The owner asked this task: " + String(item.text || "") + " Draft a short professional French response AND write in one sentence your reasoning (why this reply, based on what). Reply with ONLY one JSON object: {\"result\":\"<your draft>\",\"rationale\":\"<your reasoning>\"}";
  brain("deepseek-flash", prompt).then((out) => {
    const j = jsonBlock(out);
    if (!j || !j.result) return;
    const tk = tasksRead();
    const it = tk.tasks.find((x) => x.id === item.id);
    if (it && it.status === "pending") {
      it.result = String(j.result); it.rationale = String(j.rationale || ""); it.status = "done"; it.doneAt = ts(); tasksWrite(tk);
    }
  }).catch((e) => console.error("flash studio:", e.message));
}
function appendReport(worker, text) {
  if (db) db.prepare("INSERT INTO reports (ts,worker,text) VALUES (?,?,?)").run(ts(), worker, String(text || "").trim());
  else {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const head = fs.existsSync(REPORTS_FILE) ? "" : "# supervision.md — generated by the supervisor backend.\n\n";
    fs.appendFileSync(REPORTS_FILE, head + "## " + ts() + " — report by " + worker + "\n\n" + String(text || "").trim() + "\n\n");
  }
}
function appendFeedback(worker, role, category, text) {
  if (db) db.prepare("INSERT INTO feedback (ts,worker,role,category,text) VALUES (?,?,?,?,?)").run(ts(), worker || "anonymous", role || "", category || "feedback", String(text || "").trim());
  else {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const head = fs.existsSync(FEEDBACK_FILE) ? "" : "# feedback.md — generated by the supervisor backend.\n\n";
    fs.appendFileSync(FEEDBACK_FILE, head + "## " + ts() + " — " + (category || "feedback") + " from " + (worker || "anonymous") + (role ? " (" + role + ")" : "") + "\n\n" + String(text || "").trim() + "\n\n");
  }
}
function readReports(n = 200) {
  if (db) return db.prepare("SELECT ts,worker,text FROM reports ORDER BY id DESC LIMIT ?").all(n).reverse()
    .map((r) => "## " + r.ts + " — report by " + r.worker + "\n\n" + r.text).join("\n\n");
  return readTail(REPORTS_FILE, n);
}
function readFeedback(n = 200) {
  if (db) return db.prepare("SELECT ts,worker,role,category,text FROM feedback ORDER BY id DESC LIMIT ?").all(n).reverse()
    .map((f) => "## " + f.ts + " — " + f.category + " from " + f.worker + (f.role ? " (" + f.role + ")" : "") + "\n\n" + f.text).join("\n\n");
  return readTail(FEEDBACK_FILE, n);
}
function readDecisions() {
  if (db) { const r = db.prepare("SELECT content FROM decisions WHERE id=1").get(); return r ? r.content : ""; }
  try { return fs.readFileSync(DECISIONS_FILE, "utf8"); } catch { return ""; }
}
function writeDecisions(content) {
  if (db) db.prepare("INSERT INTO decisions (id,content,updated) VALUES (1,?,?) ON CONFLICT(id) DO UPDATE SET content=excluded.content, updated=excluded.updated").run(String(content || ""), ts());
  else fs.writeFileSync(DECISIONS_FILE, String(content || ""));
}
function appendUsage(worker, tokens, model) {
  if (db) db.prepare("INSERT INTO usage (ts,worker,tokens,model) VALUES (?,?,?,?)").run(ts(), worker || "anonymous", Number(tokens) || 0, model || "unknown");
  else {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const head = fs.existsSync(USAGE_FILE) ? "" : "# usage.md — token usage reported per session.\n\n";
    fs.appendFileSync(USAGE_FILE, head + "## " + ts() + " — " + (worker || "anonymous") + " — " + (Number(tokens) || 0) + " tokens (" + (model || "unknown") + ")\n");
  }
}
function usageRows() {
  if (db) return db.prepare("SELECT worker, COUNT(*) sessions, SUM(tokens) tokens FROM usage GROUP BY worker ORDER BY tokens DESC").all()
    .map((r) => ({ worker: r.worker, sessions: r.sessions, tokens: r.tokens || 0, cost: Math.round(((r.tokens || 0) / 1e6) * PRICE_PER_MILLION * 100) / 100 }));
  const rows = new Map();
  try {
    for (const line of fs.readFileSync(USAGE_FILE, "utf8").split("\n")) {
      const m = /^## .+ — (\S+) — (\d+) tokens/.exec(line);
      if (!m) continue;
      const r = rows.get(m[1]) || { worker: m[1], sessions: 0, tokens: 0 };
      r.sessions += 1; r.tokens += Number(m[2]);
      rows.set(m[1], r);
    }
  } catch {}
  return [...rows.values()].map((r) => ({ ...r, cost: Math.round((r.tokens / 1e6) * PRICE_PER_MILLION * 100) / 100 })).sort((a, b) => b.tokens - a.tokens);
}
function readTail(f, n = 200) { try { const t = fs.readFileSync(f, "utf8"); return t.split("\n").slice(-n).join("\n"); } catch { return ""; } }
function liveRead() { try { const s = JSON.parse(fs.readFileSync(LIVE_FILE, "utf8")); s.inbox = s.inbox || []; s.deep = s.deep || []; return s; } catch { return { status: "idle", worker: null, startedAt: null, speakers: [], orders: [], inbox: [], deep: [] }; } }
function liveWrite(s) { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(LIVE_FILE, JSON.stringify(s, null, 2)); }
function regRead() { try { return JSON.parse(fs.readFileSync(REG_FILE, "utf8")); } catch { return { status: "closed", openedAt: null, items: [], sales: [], declared: null }; } }
function regWrite(r) { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(REG_FILE, JSON.stringify(r, null, 2)); }
function regView() { const r = regRead(); const recorded = Math.round((r.sales || []).reduce((a, x) => a + (x.total || 0), 0) * 100) / 100; return { ...r, recorded, variance: r.declared == null ? null : Math.round((r.declared - recorded) * 100) / 100 }; }
function alertsRead() { try { return JSON.parse(fs.readFileSync(ALERTS_FILE, "utf8")); } catch { return { items: [] }; } }
function alertsWrite(a) { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(ALERTS_FILE, JSON.stringify(a, null, 2)); }
function shiftRead() { try { return JSON.parse(fs.readFileSync(SHIFT_FILE, "utf8")); } catch { return { date: "", opened: null, closed: null }; } }
function shiftWrite(sh) { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(SHIFT_FILE, JSON.stringify(sh, null, 2)); }
function todayStr() { return new Date().toISOString().slice(0, 10); }
function tasksRead() { try { return JSON.parse(fs.readFileSync(TASKS_FILE, "utf8")); } catch { return { tasks: [] }; } }
function tasksWrite(tk) { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(TASKS_FILE, JSON.stringify(tk, null, 2)); }
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
}
function metrics() {
  if (db) {
    const q = (sql) => db.prepare(sql).get().n;
    return {
      reports: q("SELECT COUNT(*) n FROM reports"),
      reportsWeek: q("SELECT COUNT(*) n FROM reports WHERE ts >= datetime('now','-7 days')"),
      feedback: q("SELECT COUNT(*) n FROM feedback"),
      feedbackWeek: q("SELECT COUNT(*) n FROM feedback WHERE ts >= datetime('now','-7 days')"),
      workers: q("SELECT COUNT(DISTINCT worker) n FROM (SELECT worker FROM reports UNION SELECT worker FROM feedback)"),
      lastReport: (db.prepare("SELECT ts FROM reports ORDER BY id DESC LIMIT 1").get() || {}).ts || null,
      lastFeedback: (db.prepare("SELECT ts FROM feedback ORDER BY id DESC LIMIT 1").get() || {}).ts || null,
    };
  }
  const parse = (file) => {
    try {
      const out = [];
      for (const line of fs.readFileSync(file, "utf8").split("\n")) {
        const m = /^## (\d{4}-\d{2}-\d{2}T[\d:.]+Z) — (.+)$/.exec(line);
        if (m) out.push({ date: m[1], desc: m[2] });
      }
      return out;
    } catch { return []; }
  };
  const reps = parse(REPORTS_FILE), fb = parse(FEEDBACK_FILE);
  const week = 7 * 24 * 3600e3, now = Date.now();
  const inWeek = (e) => now - new Date(e.date).getTime() < week;
  const workers = new Set();
  fb.forEach((e) => { const m = /from (\S+)/.exec(e.desc); if (m) workers.add(m[1]); });
  reps.forEach((e) => { const m = /by (\S+)/.exec(e.desc); if (m) workers.add(m[1]); });
  return {
    reports: reps.length, reportsWeek: reps.filter(inWeek).length,
    feedback: fb.length, feedbackWeek: fb.filter(inWeek).length,
    workers: workers.size,
    lastReport: reps.length ? reps[reps.length - 1].date : null,
    lastFeedback: fb.length ? fb[fb.length - 1].date : null,
  };
}

// ---------- sessions ----------
const sessions = new Map();
function issue(name, role, label) { const token = crypto.randomBytes(24).toString("hex"); sessions.set(token, { name, role, label: label || name, expires: Date.now() + SESSION_TTL }); return token; }
function auth(req) {
  const h = req.headers.authorization || "";
  const m = /^Bearer (.+)$/.exec(h);
  let token = m ? m[1] : null;
  if (!token && req.headers.cookie) {
    const c = req.headers.cookie.split(";").find((x) => x.trim().startsWith("dsh_sup="));
    if (c) token = c.split("=")[1];
  }
  if (!token) return null;
  const s = sessions.get(token);
  if (!s) return null;
  if (s.expires < Date.now()) { sessions.delete(token); return null; }
  return s;
}
function ownerOnly(res, req) {
  const s = auth(req);
  if (!s || s.role !== "owner") { res.writeHead(403, { "Content-Type": "application/json" }); res.end(JSON.stringify({ error: "owner only" })); return false; }
  return true;
}
function managerOnly(res, req) {
  const s = auth(req);
  if (!s || (s.role !== "owner" && s.role !== "lead")) { res.writeHead(403, { "Content-Type": "application/json" }); res.end(JSON.stringify({ error: "manager only" })); return false; }
  return true;
}
function json(req) {
  return new Promise((ok) => {
    let b = "";
    req.on("data", (d) => { b += d; if (b.length > 1e6) req.destroy(); });
    req.on("end", () => { try { ok(b ? JSON.parse(b) : {}); } catch { ok({}); } });
  });
}
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
const GATE_TOKEN = process.env.SUPERVISOR_TOKEN || "";
const GATE_COOKIE = "fanal_token";
function readCookies(req) {
  const h = String(req.headers.cookie || "");
  const out = {};
  h.split(";").forEach(p => { const i = p.indexOf("="); if (i > 0) out[p.slice(0, i).trim()] = p.slice(i + 1).trim(); });
  return out;
}
function gatePass(req) {
  if (!GATE_TOKEN) return true;
  const c = readCookies(req);
  if (c[GATE_COOKIE] === GATE_TOKEN) return true;
  if ((req.url || "").includes("token=" + GATE_TOKEN)) return true;
  return req.headers["x-supervisor-token"] === GATE_TOKEN;
}
const GATE_PAGE = "<!DOCTYPE html><html lang=\"fr\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Fanal — Accès</title><style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:linear-gradient(160deg,#4D6BFE,#7c5cff 60%,#a78bfa);min-height:100vh;display:flex;align-items:center;justify-content:center}form{background:#fff;border-radius:20px;padding:30px 28px;box-shadow:0 24px 60px rgba(15,23,42,.3);text-align:center;width:min(380px,92vw)}h1{margin:0 0 6px;font-size:20px}p{color:#667085;font-size:14px;margin:0 0 16px}input{width:100%;border:1.5px solid rgba(77,107,254,.35);border-radius:12px;padding:12px;font-size:15px;margin-bottom:12px;box-sizing:border-box}button{width:100%;border:none;border-radius:12px;padding:13px;font-size:15px;font-weight:700;color:#fff;background:linear-gradient(135deg,#4D6BFE,#7c5cff);cursor:pointer}</style></head><body><form method=\"post\" action=\"/api/gate\"><h1>👁️ Fanal</h1><p>Cette installation est protégée. Entrez la clé d'accès fournie avec votre Fanal.</p><input type=\"password\" name=\"token\" placeholder=\"Clé d'accès\" autofocus><button>Entrer</button></form></body></html>";
function send(res, code, obj, pub) { const h = { "Content-Type": "application/json; charset=utf-8" }; if (pub) Object.assign(h, CORS); res.writeHead(code, h); res.end(JSON.stringify(obj)); }

// ---------- API ----------
async function api(req, res, pathname) {
  if (req.method === "OPTIONS") { res.writeHead(204, CORS); return res.end(); }
  if (pathname === "/api/login" && req.method === "POST") {
    const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "?").toString().split(",")[0].trim();
    const wait = loginBlocked(ip);
    if (wait) return send(res, 429, { error: "too many attempts — retry in " + wait + " s" });
    const b = await json(req);
    const users = loadUsers();
    const u = users[b.user];
    if (!u || hashPw(String(b.password || ""), u.salt) !== u.hash) { loginFail(ip); return send(res, 401, { error: "bad credentials" }); }
    loginOk(ip);
    const token = issue(b.user, u.role, u.label);
    res.setHeader("Set-Cookie", "dsh_sup=" + token + "; Path=/; HttpOnly; SameSite=Lax");
    return send(res, 200, { token, name: b.user, role: u.role }, true);
  }
  if (pathname === "/api/logout" && req.method === "POST") { const s = auth(req); if (s) for (const [t, v] of sessions) if (v.name === s.name) sessions.delete(t); return send(res, 200, { ok: true }); }
  if (pathname === "/api/me") { const s = auth(req); return send(res, 200, s ? { name: s.name, role: s.role, label: s.label || s.name } : { error: "unauthorized" }); }
  if (pathname === "/api/feedback" && req.method === "POST") {
    const b = await json(req);
    appendFeedback(b.worker, b.role, b.category, b.text);
    return send(res, 200, { ok: true }, true);
  }
  if (pathname === "/api/feedback" && req.method === "GET") { if (!managerOnly(res, req)) return; return send(res, 200, { content: readFeedback(200) }); }
  if (pathname === "/api/report" && req.method === "POST") {
    const s = auth(req); if (!s) return send(res, 401, { error: "unauthorized" });
    const b = await json(req);
    appendReport(s.name, b.text);
    return send(res, 200, { ok: true });
  }
  if (pathname === "/api/reports" && req.method === "GET") { if (!managerOnly(res, req)) return; return send(res, 200, { content: readReports(200) }); }
  if (pathname === "/api/metrics" && req.method === "GET") { if (!managerOnly(res, req)) return; return send(res, 200, metrics()); }
  // Usage: workers/agents report token counts per session; managers see cost per worker.
  if (pathname === "/api/usage" && req.method === "POST") {
    const b = await json(req);
    appendUsage(b.worker, b.tokens, b.model);
    return send(res, 200, { ok: true });
  }
  if (pathname === "/api/usage" && req.method === "GET") {
    if (!managerOnly(res, req)) return;
    return send(res, 200, { pricePerMillion: PRICE_PER_MILLION, rows: usageRows() });
  }
  // Export the records as a downloadable Markdown file (owner/lead).
  if (pathname === "/api/export" && req.method === "GET") {
    if (!managerOnly(res, req)) return;
    const q = new URL(req.url, "http://localhost").searchParams;
    const type = q.get("type") || "reports";
    let body = "", name = "le-veilleux-reports.md";
    if (type === "orders") {
      const lv = liveRead();
      body = "# Fanal — orders & bill\n\n" + ts() + "\n\n" +
        (lv.orders || []).map((o) => "- " + (o.table ? "Table " + o.table + " · " : "") + o.person + ": " + o.request + " (" + o.status + (o.paid ? ", paid" : ", pending") + ")").join("\n") +
        "\n\nTotal items: " + (lv.orders || []).length + "\n";
      name = "le-veilleux-orders.md";
    } else if (type === "register") {
      const r = regView();
      body = "# Fanal — Z-report (counter-register)\n\n" + ts() + "\n\n" +
        (r.sales || []).map((x, i) => "| " + (i + 1) + " | " + x.ts.slice(11, 16) + " | " + x.items.map((it) => it.name + " ($" + it.price + ")").join(", ") + " | $" + x.total + " |").join("\n") +
        "\n\nRecorded (Fanal): $" + r.recorded + "\nDeclared (terminal): $" + (r.declared == null ? "—" : r.declared) + "\nVariance: $" + (r.variance == null ? "—" : r.variance) + "\n";
      name = "le-veilleux-zreport.md";
    } else if (type === "usage") {
      body = "# Fanal — usage & cost\n\n" + ts() + "\n\n| Worker | Sessions | Tokens | Est. cost |\n|---|---|---|---|\n" +
        usageRows().map((r) => "| " + r.worker + " | " + r.sessions + " | " + r.tokens + " | $" + r.cost.toFixed(2) + " |").join("\n") + "\n";
      name = "le-veilleux-usage.md";
    } else {
      body = fs.existsSync(REPORTS_FILE) ? fs.readFileSync(REPORTS_FILE, "utf8") : "# Fanal — no reports yet\n";
    }
    res.writeHead(200, { "Content-Type": "text/markdown; charset=utf-8", "Content-Disposition": 'attachment; filename="' + name + '"' });
    return res.end(body);
  }
  // Public wallboard feed: aggregated numbers only, no secrets.
  if (pathname === "/api/wall" && req.method === "GET") {
    const m = metrics();
    const lv = liveRead();
    lv.notices = lv.notices || [];
    return send(res, 200, { notice: lv.notices.length ? lv.notices[lv.notices.length - 1] : null, ...m, orders: (lv.orders || []).length, ordersTail: (lv.orders || []).slice(-3).map((o) => (o.table ? "M" + o.table + " · " : "") + o.person + " — " + o.request), feedbackTail: readFeedback(60) }, true);
  }
  // Live conversation flow: worker screens, per-person summary, orders to
  // the kitchen and the central system (the supervisor itself).
  if (pathname === "/api/live" && req.method === "GET") {
    return send(res, 200, liveRead());
  }
  // The active sector pack: one dashboard skeleton, many business skins.
  if (pathname === "/api/studio" && req.method === "GET") { const u = auth(req); if (!u || (u.role !== "owner" && u.role !== "lead")) return send(res, 401, { error: "unauthorized" }); const tk = tasksRead(); return send(res, 200, { tasks: tk.tasks.slice(-20).reverse() }); }
  if (pathname === "/api/studio" && req.method === "POST") { const u = auth(req); if (!u || (u.role !== "owner" && u.role !== "lead")) return send(res, 401, { error: "unauthorized" }); const b = await json(req); const tk = tasksRead(); const id = "t" + Date.now(); tk.tasks.push({ id, type: String(b.type || "other"), text: String(b.text || ""), by: u.name, ts: ts(), status: "pending", result: null }); tasksWrite(tk); const l = liveRead(); l.inbox = l.inbox || []; l.inbox.push({ from: u.name, kind: "studio", id, text: String(b.type || "") + " :: " + String(b.text || "") }); liveWrite(l); if (brainOn()) { processStudio({ id, text: String(b.type || "") + " :: " + String(b.text || "") }); } if (process.env.DSH_DEMO_MODE === "1" && !brainOn()) setTimeout(() => { const t2 = tasksRead(); const it = t2.tasks.find((x) => x.id === id); if (it && it.status === "pending") { it.result = "[Brouillon de démonstration — " + String(b.type || "autre") + "] " + String(b.text || ""); it.rationale = "Le client pose une question simple ; une réponse courte et chaleureuse renforce le lien et invite à venir. (Démonstration — la cuisine réelle argumente avec les données de l'entreprise.)"; it.status = "done"; it.doneAt = ts(); tasksWrite(t2); } }, 3000); return send(res, 200, { ok: true, id }); }
  if (pathname === "/api/studio/send" && req.method === "POST") { const u = auth(req); if (!u || (u.role !== "owner" && u.role !== "lead")) return send(res, 401, { error: "unauthorized" }); const b = await json(req); const tk = tasksRead(); const it = tk.tasks.find((x) => x.id === b.id); if (!it || it.status !== "done") return send(res, 200, { ok: false }); it.status = b.decision === "send" ? "sent" : "dismissed"; it.decidedBy = u.name; it.decidedAt = ts(); tasksWrite(tk); return send(res, 200, { ok: true }); }
  if (pathname === "/api/bridge/message" && req.method === "POST") { const bt = process.env.DSH_BRIDGE_TOKEN; const given = req.headers["x-bridge-token"] || ""; if (bt && given !== bt) return send(res, 401, { error: "bad bridge token" }); if (!bt) { const u = auth(req); if (!u || (u.role !== "owner" && u.role !== "lead")) return send(res, 401, { error: "unauthorized" }); } const b = await json(req); const tk = tasksRead(); const id = "t" + Date.now(); tk.tasks.push({ id, type: "email", text: String(b.from || "client") + " : " + String(b.text || ""), by: "Facebook", ts: ts(), status: "pending", result: null }); tasksWrite(tk); const l = liveRead(); l.inbox = l.inbox || []; l.inbox.push({ from: "Facebook", kind: "studio", id, text: String(b.from || "client") + " :: " + String(b.text || "") }); liveWrite(l); return send(res, 200, { ok: true, id }); }
  if (pathname === "/api/studio/inbox" && req.method === "GET") { const l = liveRead(); const tk = tasksRead(); const doneIds = new Set(tk.tasks.filter((x) => x.status === "done").map((x) => x.id)); const items = (l.inbox || []).filter((x) => x.kind === "studio" && !doneIds.has(x.id)); return send(res, 200, { items }, true); }
  if (pathname === "/api/studio/result" && req.method === "POST") { const b = await json(req); const tk = tasksRead(); const it = tk.tasks.find((x) => x.id === b.id); if (!it) return send(res, 200, { ok: false }); it.result = String(b.result || ""); it.rationale = String(b.rationale || ""); it.status = "done"; it.doneAt = ts(); tasksWrite(tk); return send(res, 200, { ok: true }); }
  if (pathname === "/api/demo/alert" && req.method === "POST") { if (process.env.DSH_DEMO_MODE !== "1") return send(res, 403, { error: "demo mode disabled" }); const a = alertsRead(); a.items.push({ id: "a" + Date.now(), key: "demo-" + Date.now(), kind: "rain", pct: 85, inHour: 1, ts: ts(), status: "active", decision: null, source: "demo" }); alertsWrite(a); return send(res, 200, { ok: true }); }
  if (pathname === "/api/demo-login" && req.method === "POST") { if (process.env.DSH_DEMO_MODE !== "1") return send(res, 403, { error: "demo mode disabled" }); const b = await json(req); const u = loadUsers(); const name = Object.keys(u).find((n) => u[n].role === String(b.role || "owner")); if (!name) return send(res, 404, { error: "no demo user for that role" }); const token = issue(name, u[name].role, u[name].label || name); return send(res, 200, { token, name, role: u[name].role, label: u[name].label || name }, true); }
  if (pathname === "/api/alerts" && req.method === "GET") { if (!auth(req)) return send(res, 401, { error: "unauthorized" }); const a = alertsRead(); const active = a.items.find((x) => x.status === "active"); return send(res, 200, { active: active || null, last: a.items.slice(-3).reverse() }); }
  if (pathname === "/api/secretaire/scan" && req.method === "POST") {
    if (!ownerOnly(res, req)) return;
    const br = browserBridge();
    if (!br || !br.chromeExists()) return send(res, 200, { ok: false, error: "Chrome not found" });
    try {
      const r = await br.evalJs("JSON.stringify({h:location.hostname,fields:Array.from(document.querySelectorAll('input,select,textarea')).slice(0,40).map(f=>({n:f.name||'',id:f.id||'',p:f.placeholder||'',t:f.type||'',l:f.getAttribute('aria-label')||''}))})");
      const raw = String((r && r.result && r.result.value) || "{}");
      let page = { h: "", fields: [] };
      try { page = JSON.parse(raw); } catch (e) {}
      if (!(page.fields || []).length) return send(res, 200, { ok: false, error: "no form fields found — open the form page" });
      telemetryTick("action", { tier: "GREEN", what: "Secrétaire read the form fields (" + String(page.h || "page") + ")" });
      if (!brainOn()) return send(res, 200, { ok: true, fields: page.fields, values: {}, summary: "sans clé" });
      const st = settingsRead() || {};
      const ctx = "Entreprise: " + String(st.bizName || "inconnue") + ". Secteur: " + String(st.sector || "inconnu") + ". Site: " + String(page.h || "inconnu") + ".";
      const pr = await brain("flash", "Le Secrétaire de Fanal. " + ctx + " Voici les champs du formulaire (JSON): " + JSON.stringify(page.fields).slice(0, 1600) + " Propose des valeurs PLAUSIBLES pour les champs évidents (nom, adresse, courriel, montants, dates, notes) avec des données d'exemple cohérentes de l'entreprise. Laisse VIDE tout champ incertain (sécurité, gouvernement, montants inconnus). Réponds UNIQUEMENT en JSON: {\"values\":{\"<name ou id du champ>\":\"valeur\",...},\"summary\":\"une phrase en français: ce qui a été rempli et ce qui reste à l'humain\"}", 900);
      let parsed = { values: {}, summary: "" };
      try { parsed = JSON.parse(String(pr).match(/\{[\s\S]*\}/)?.[0] || "{}"); } catch (e) {}
      telemetryTick("action", { tier: "SEMI", what: "Secrétaire proposed form values (human submits)" });
      return send(res, 200, { ok: true, fields: page.fields, values: parsed.values || {}, summary: parsed.summary || "" });
    } catch (e) { return send(res, 200, { ok: false, error: e.message }); }
  }
  if (pathname === "/api/secretaire/fill" && req.method === "POST") {
    if (!ownerOnly(res, req)) return;
    const b = await json(req);
    const values = b.values && typeof b.values === "object" ? b.values : {};
    const n = Object.keys(values).length;
    if (!n) return send(res, 400, { error: "values required" });
    try {
      const js = "(function(){var v=" + JSON.stringify(values) + ";var done=0;Object.keys(v).forEach(function(k){var el=document.querySelector('[name=\\''+k+'\\']')||document.getElementById(k);if(el&&v[k]){el.value=v[k];try{el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}catch(e){}done++;}});return done;})()";
      const r = await browserBridge().evalJs(js);
      telemetryTick("action", { tier: "SEMI", what: "Secrétaire filled " + n + " form fields (human verifies and submits)" });
      return send(res, 200, { ok: true, filled: r && r.result && r.result.value, status: "Champs remplis — VÉRIFIEZ et SOUMETTEZ vous-même." });
    } catch (e) { return send(res, 200, { ok: false, error: e.message }); }
  }
  if (pathname === "/api/repondant/scan" && req.method === "POST") {
    if (!ownerOnly(res, req)) return;
    const br = browserBridge();
    if (!br || !br.chromeExists()) return send(res, 200, { ok: false, error: "Chrome not found" });
    try {
      const r = await br.evalJs("JSON.stringify({t:document.body.innerText.slice(-1800),h:location.hostname,ti:document.title})");
      const raw = String((r && r.result && r.result.value) || "");
      let page = { t: "", h: "", ti: "" };
      try { page = JSON.parse(raw); } catch (e) { page.t = raw; }
      const conv = String(page.t || "").trim();
      if (conv.length < 20) return send(res, 200, { ok: false, error: "nothing to read — open the conversation (Messenger, Gmail, Airbnb, Expedia…)" });
      telemetryTick("action", { tier: "GREEN", what: "Répondant read the visible conversation (" + String(page.h || "page") + ")" });
      if (!brainOn()) return send(res, 200, { ok: true, conv, reply: "", why: "", langName: "" });
      const pr = await brain("flash", "Le Répondant de Fanal. " + constitutionCtx() + memoryCtx() + "Site: " + String(page.h || "inconnu") + " (" + String(page.ti || "").slice(0, 80) + "). Conversation: " + conv.slice(-1200) + " 1) Détecte la langue parmi: es fr en de it pt zh ja ko ar. 2) Propose une réponse COURTE, polie et professionnelle DANS CETTE LANGUE. 3) Adapte le ton au site: airbnb → hôte professionnel; expedia/booking → gestionnaire de réservations; page de gestion de restaurant → professionnel de la restauration; sinon → réponse d'affaires. 4) why en FRANÇAIS, une phrase. 5) sender: identifie l'expéditeur visible de la conversation (nom + téléphone/courriel/compte). Si la Mémoire contient UN contact dont un identifiant correspond, réponds ce contact; si le NOM est ambigu (plusieurs personnes du même nom sans identifiant clair), réponds sender:\"ambigu\". Réponds UNIQUEMENT en JSON: {\"lang\":\"<code>\",\"reply\":\"...\",\"why\":\"...\",\"sender\":\"<identité ou ambigu>\"}", 800);
      let parsed = { lang: "", reply: "", why: "", sender: "" };
      try { parsed = JSON.parse(String(pr).match(/\{[\s\S]*\}/)?.[0] || "{}"); } catch (e) {}
      telemetryTick("action", { tier: "SEMI", what: "Répondant proposed a reply in " + String(parsed.lang || "?") + " for " + String(parsed.sender || "?") + " (human sends)" });
      return send(res, 200, { ok: true, conv: conv.slice(-900), reply: parsed.reply || "", why: parsed.why || "", langName: LANG_NAMES[parsed.lang] || parsed.lang || "", sender: parsed.sender || "" });
    } catch (e) { return send(res, 200, { ok: false, error: e.message }); }
  }
  if (pathname === "/api/repondant/prepare" && req.method === "POST") {
    if (!ownerOnly(res, req)) return;
    const b = await json(req);
    const text = String(b.text || "").trim();
    if (!text) return send(res, 400, { error: "text required" });
    try {
      await browserBridge().evalJs("navigator.clipboard.writeText(" + JSON.stringify(text) + ").then(function(){return 'copié'}).catch(function(){return 'pega tú'})");
      telemetryTick("action", { tier: "SEMI", what: "Répondant prepared the reply (clipboard, human sends)" });
      return send(res, 200, { ok: true, status: "La réponse est copiée — collez-la dans le fil et ENVOYEZ vous-même." });
    } catch (e) { return send(res, 200, { ok: false, error: e.message }); }
  }
  if (pathname === "/api/facebook/prepare" && req.method === "POST") {
    if (!ownerOnly(res, req)) return;
    const b = await json(req);
    const text = String(b.text || "").trim();
    if (!text) return send(res, 400, { error: "text required" });
    const br = browserBridge();
    if (!br || !br.chromeExists()) return send(res, 200, { ok: false, error: "Chrome not found" });
    try {
      let opened = false;
      try { const t = await br.targets(); opened = t.length > 0; } catch (e) {}
      if (!opened) await br.launch("https://www.facebook.com/");
      else await br.nav("https://www.facebook.com/");
      // El texto viaja al portapapeles del navegador (robusto, sin selectores frágiles):
      // el HUMANO lo pega en el recuadro y pulsa Publicar — el envío es suyo.
      await br.evalJs("navigator.clipboard.writeText(" + JSON.stringify(text) + ").then(function(){return 'copié'}).catch(function(){return 'pega tú'})");
      telemetryTick("action", { tier: "SEMI", what: "Publication prepared in Facebook (text to clipboard, badge on)" });
      return send(res, 200, { ok: true, status: "Facebook ouvert, le texte est copié — collez-le dans le recuadro et publiez vous-même." });
    } catch (e) { return send(res, 200, { ok: false, error: e.message }); }
  }
  if (pathname === "/api/kpi" && req.method === "GET") {
    if (!managerOnly(res, req)) return;
    const tel = telemetry();
    const acts = tel.actions || [];
    let saved = 0, corrections = 0, tasks = 0;
    for (const a of acts) {
      if (a.tier === "GREEN" && /read the visible conversation/i.test(String(a.what))) saved += 30;
      if (/proposed a reply/i.test(String(a.what))) { saved += 90; tasks++; }
      if (/Publication prepared/i.test(String(a.what))) saved += 120;
      if (/filled (\d+) form fields/i.test(String(a.what))) saved += Number(String(a.what).match(/filled (\d+) form fields/i)[1]) * 15;
      if (/draft|Studio/i.test(String(a.what)) && a.tier === "SEMI") { saved += 240; tasks++; }
      if (/dismissed/i.test(String(a.what))) { corrections++; tasks++; }
    }
    const ok = Math.max(0, tasks - corrections);
    return send(res, 200, {
      timeSavedMin: Math.round(saved / 60),
      timeSavedHr: (saved / 3600).toFixed(2),
      tasks, ok, corrections,
      successRate: tasks ? Math.round((ok / tasks) * 100) : 100,
      productiveSecs: saved, correctiveSecs: corrections * 60,
    });
  }
  if (pathname === "/api/constitution" && req.method === "GET") {
    if (!managerOnly(res, req)) return;
    return send(res, 200, constitutionRead());
  }
  if (pathname === "/api/constitution" && req.method === "POST") {
    if (!ownerOnly(res, req)) return;
    const b = await json(req);
    constitutionWrite({ philosophy: String(b.philosophy || ""), tone: String(b.tone || ""), policies: String(b.policies || ""), discountRule: String(b.discountRule || ""), minPrice: String(b.minPrice || ""), escalation: String(b.escalation || "") });
    telemetryTick("action", { tier: "GREEN", what: "Constitution updated" });
    return send(res, 200, { ok: true });
  }
  if (pathname === "/api/memory" && req.method === "GET") {
    if (!managerOnly(res, req)) return;
    return send(res, 200, memoryRead());
  }
  if (pathname === "/api/memory" && req.method === "POST") {
    if (!ownerOnly(res, req)) return;
    const b = await json(req);
    const m = memoryRead();
    const c = { name: String(b.name || ""), type: String(b.type || "client"), order: String(b.order || ""), address: String(b.address || ""), price: String(b.price || ""), ids: String(b.ids || "") };
    if (b.idx !== undefined && m.contacts[b.idx]) m.contacts[b.idx] = c; else m.contacts.push(c);
    memoryWrite(m);
    telemetryTick("action", { tier: "GREEN", what: "Memory contact saved (" + c.name + ")" });
    return send(res, 200, { ok: true });
  }
  if (pathname === "/api/browser/start" && req.method === "POST") {
    if (!ownerOnly(res, req)) return;
    const b = await json(req);
    const br = browserBridge();
    if (!br || !br.chromeExists()) return send(res, 200, { ok: false, error: "Chrome not found on this machine" });
    try { const r = await br.launch(String(b.url || "https://www.charlevoix.com")); telemetryTick("action", { tier: "GREEN", what: "Browser pilot started (badge always visible)" }); return send(res, 200, r); }
    catch (e) { return send(res, 200, { ok: false, error: e.message }); }
  }
  if (pathname === "/api/browser/nav" && req.method === "POST") {
    if (!ownerOnly(res, req)) return;
    const b = await json(req);
    try { const r = await browserBridge().nav(String(b.url || "")); telemetryTick("action", { tier: "GREEN", what: "Browser navigated to " + String(b.url || "") }); return send(res, 200, r); }
    catch (e) { return send(res, 200, { ok: false, error: e.message }); }
  }
  if (pathname === "/api/browser/eval" && req.method === "POST") {
    if (!ownerOnly(res, req)) return;
    const b = await json(req);
    if (!b.confirm) return send(res, 200, { ok: false, error: "this executes code in the page — send {confirm:true} to proceed (SEMI, logged)" });
    try { const r = await browserBridge().evalJs(String(b.js || "")); telemetryTick("action", { tier: "SEMI", what: "Browser script executed: " + String(b.js || "").slice(0, 80) }); return send(res, 200, r); }
    catch (e) { return send(res, 200, { ok: false, error: e.message }); }
  }
  if (pathname === "/api/browser/stop" && req.method === "POST") {
    if (!ownerOnly(res, req)) return;
    const r = browserBridge() ? browserBridge().stop() : { ok: true };
    telemetryTick("action", { tier: "GREEN", what: "Browser pilot stopped" });
    return send(res, 200, r);
  }
  if (pathname === "/api/browser/status" && req.method === "GET") {
    if (!ownerOnly(res, req)) return;
    const br = browserBridge();
    if (!br) return send(res, 200, { running: false, badgeAlwaysOn: true });
    try { const t = await br.targets(); return send(res, 200, { running: t.length > 0, pages: t.filter(x => x.type === "page").map(x => x.title), badgeAlwaysOn: true }); }
    catch (e) { return send(res, 200, { running: false, badgeAlwaysOn: true }); }
  }
  if (pathname === "/api/telemetry" && req.method === "GET") {
    if (!managerOnly(res, req)) return;
    return send(res, 200, { ...telemetry(), autonomy: autonomyLevel() });
  }
  if (pathname === "/api/alerts/decide" && req.method === "POST") { const u = auth(req); if (!u || (u.role !== "owner" && u.role !== "lead")) return send(res, 401, { error: "unauthorized" }); const b = await json(req); const a = alertsRead(); const it = a.items.find((x) => x.id === b.id); if (!it || it.status !== "active") return send(res, 200, { ok: false }); it.status = "done"; it.decision = b.decision === "yes" ? "yes" : "no"; it.decidedBy = u.name; it.decidedAt = ts(); alertsWrite(a); if (b.decision === "yes") { const l = liveRead(); l.notices = l.notices || []; l.notices.push({ ts: ts(), from: u.name, text: "Pluie probable (~" + it.pct + "%) dans ~" + it.inHour + " h — préparez-vous." }); liveWrite(l); } return send(res, 200, { ok: true }); }
  if (pathname === "/api/shift" && req.method === "GET") { if (!auth(req)) return send(res, 401, { error: "unauthorized" }); const sh = shiftRead(); const same = sh.date === todayStr(); const opened = same ? sh.opened : null; const closed = same ? sh.closed : null; const phase = !opened ? "open" : (!closed ? "close" : "done"); const steps = phase === "open" ? SECTOR_OPEN : phase === "close" ? SECTOR_CLOSE : []; const bucket = phase === "open" ? (sh.openSteps || []) : (sh.closeSteps || []); return send(res, 200, { opened, closed, phase, steps: steps.map((st) => ({ id: st.id, label: st.label, done: bucket.some((x) => x.id === st.id) })) }); }
  if (pathname === "/api/shift/mark" && req.method === "POST") { const u = auth(req); if (!u) return send(res, 401, { error: "unauthorized" }); const b = await json(req); const sh = shiftRead(); if (sh.date !== todayStr()) { sh.date = todayStr(); sh.opened = null; sh.closed = null; } const phase = sh.opened ? "close" : "open"; const bucket = phase === "open" ? (sh.openSteps = sh.openSteps || []) : (sh.closeSteps = sh.closeSteps || []); const list = phase === "open" ? SECTOR_OPEN : SECTOR_CLOSE; const cur = list.map((st) => ({ id: st.id, label: st.label, done: bucket.some((x) => x.id === st.id) })); const step = cur.find((x) => x.id === b.stepId); if (!step) return send(res, 200, { ok: false }); if (b.done) { if (!bucket.some((x) => x.id === b.stepId)) bucket.push({ id: b.stepId, by: u.name, ts: ts() }); } else { sh[phase === "open" ? "openSteps" : "closeSteps"] = bucket.filter((x) => x.id !== b.stepId); } const doneAll = list.every((st) => bucket.some((x) => x.id === st.id)); if (doneAll) { if (phase === "open") sh.opened = { by: u.name, ts: ts(), steps: bucket }; else sh.closed = { by: u.name, ts: ts(), steps: bucket }; } shiftWrite(sh); return send(res, 200, { ok: true, phase, doneAll, done: b.done }); }
  if (pathname === "/api/register" && req.method === "GET") { if (!auth(req)) return send(res, 401, { error: "unauthorized" }); return send(res, 200, regView()); }
  if (pathname === "/api/register/open" && req.method === "POST") { if (!auth(req)) return send(res, 401, { error: "unauthorized" }); const b = await json(req); regWrite({ status: "open", openedAt: ts(), worker: b.worker || "worker", items: [], sales: [], declared: null }); return send(res, 200, { ok: true }); }
  if (pathname === "/api/register/add" && req.method === "POST") { if (!auth(req)) return send(res, 401, { error: "unauthorized" }); const b = await json(req); const r = regRead(); r.items.push({ name: String(b.name || ""), price: Number(b.price) || 0 }); regWrite(r); return send(res, 200, { ok: true }); }
  if (pathname === "/api/register/charge" && req.method === "POST") { const u = auth(req); if (!u) return send(res, 401, { error: "unauthorized" }); const b = await json(req); const r = regRead(); if (!r.items.length) return send(res, 400, { error: "no items" }); const total = Math.round(r.items.reduce((a, x) => a + x.price, 0) * 100) / 100; r.sales.push({ ts: ts(), worker: u.name, method: b.method || "terminal", items: r.items, total }); r.items = []; regWrite(r); return send(res, 200, { ok: true, total }); }
  if (pathname === "/api/register/close" && req.method === "POST") { if (!auth(req)) return send(res, 401, { error: "unauthorized" }); const b = await json(req); const r = regRead(); if (!r.items.length || true) { const leftover = r.items.length ? Math.round(r.items.reduce((a, x) => a + x.price, 0) * 100) / 100 : 0; if (leftover) r.sales.push({ ts: ts(), items: r.items, total: leftover }); r.items = []; } r.status = "closed"; r.closedAt = ts(); r.declared = Number(b.declared) || 0; regWrite(r); return send(res, 200, regView()); }
  if (pathname === "/api/setup-status" && req.method === "GET") {
    return send(res, 200, { users: Object.keys(loadUsers()).length }, true);
  }
  if (pathname === "/api/setup" && req.method === "POST") {
    const b = await json(req);
    const u = loadUsers();
    if (Object.keys(u).length > 0) return send(res, 409, { error: "setup already done — log in instead" });
    if (!b.user || String(b.password).length < 8) return send(res, 400, { error: "name and a password of at least 8 characters are required" });
    const salt = crypto.randomBytes(16).toString("hex");
    u[b.user] = { salt, hash: hashPw(String(b.password), salt), role: "owner", label: b.user };
    saveUsers(u);
    if (b.sector) { try { const dir = process.env.DSH_SECTOR_PACKS_DIR || path.join(ROOT, "docs", "sector-packs"); fs.copyFileSync(path.join(dir, String(b.sector) + ".json"), SECTOR_FILE); } catch {} }
    const token = issue(b.user, "owner", b.user);
    return send(res, 200, { token, name: b.user, role: "owner", label: b.user }, true);
  }
  if (pathname === "/api/settings/key" && req.method === "POST") {
    if (!ownerOnly(res, req)) return;
    const b = await json(req);
    const s0 = settingsRead();
    if (String(b.key || "").trim()) s0.apiKey = String(b.key).trim();
    else delete s0.apiKey;
    if (String(b.bizName || "").trim()) s0.bizName = String(b.bizName).trim();
    settingsWrite(s0);
    return send(res, 200, { ok: true, hasKey: !!clientKey(), source: clientKey() ? "client" : (process.env.DEEPSEEK_API_KEY ? "env" : "none") });
  }
  if (pathname === "/api/settings/status" && req.method === "GET") {
    if (!ownerOnly(res, req)) return;
    return send(res, 200, { hasKey: !!clientKey(), source: clientKey() ? "client" : (process.env.DEEPSEEK_API_KEY ? "env" : "none"), dailyBudget: DAILY_BUDGET_USD, models: { fast: ROUTES.transcript.model, deep: ROUTES.deep.model } });
  }
  if (pathname === "/api/nodes" && req.method === "GET") { if (!ownerOnly(res, req)) return; const nf = path.join(DATA_DIR, "nodes.json"); let n = []; try { n = JSON.parse(fs.readFileSync(nf, "utf8")); } catch {} return send(res, 200, { nodes: n }); }
  if (pathname === "/api/nodes" && req.method === "POST") { if (!ownerOnly(res, req)) return; const b = await json(req); if (!b.url || !b.name) return send(res, 400, { error: "name and url required" }); const nf = path.join(DATA_DIR, "nodes.json"); fs.mkdirSync(DATA_DIR, { recursive: true }); let n = []; try { n = JSON.parse(fs.readFileSync(nf, "utf8")); } catch {} const i = n.findIndex(x => x.url === b.url); if (i >= 0) n[i] = { name: String(b.name), url: String(b.url), sector: String(b.sector || ""), at: ts() }; else n.push({ name: String(b.name), url: String(b.url), sector: String(b.sector || ""), at: ts() }); fs.writeFileSync(nf, JSON.stringify(n)); return send(res, 200, { nodes: n }); }
  if (pathname === "/api/state" && req.method === "GET") {
    const l = liveRead(); const a = alertsRead(); const sh = shiftRead(); const tk = tasksRead();
    return send(res, 200, { health: metrics(), live: { status: l.status, worker: l.worker, table: l.table, orders: (l.orders || []).length, speakers: (l.speakers || []).length }, alerts: { active: (a.items || []).filter(x => x.status === "active").length }, shift: { status: sh.status || "closed", openedAt: sh.openedAt || null }, studio: { pending: tk.tasks.filter(x => x.status === "pending").length, done: tk.tasks.filter(x => x.status === "done" && !x.decidedAt).length }, telemetry: { ...telemetry(), autonomy: autonomyLevel() } }, true);
  }
  if (pathname === "/api/gate" && req.method === "POST") {
    if (!GATE_TOKEN) return send(res, 200, { ok: true });
    const b = await json(req);
    if (String(b.token || "") === GATE_TOKEN) {
      res.writeHead(302, { Location: "/dashboard", "Set-Cookie": GATE_COOKIE + "=" + GATE_TOKEN + "; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000" });
      return res.end();
    }
    res.writeHead(302, { Location: "/?bad=1" });
    return res.end();
  }
  if (pathname === "/api/health" && req.method === "GET") {
    const m = metrics();
    return send(res, 200, { ok: true, version: VERSION, demo: process.env.DSH_DEMO_MODE === "1" || undefined, uptime: Math.round(process.uptime()), workers: m.workers, reports: m.reports, budgetUsd: DAILY_BUDGET_USD, spentTodayUsd: todayCostUsd(), budgetPct: DAILY_BUDGET_USD > 0 ? Math.round((todayCostUsd() / DAILY_BUDGET_USD) * 100) : 0 }, true);
  }
  if (pathname === "/api/sector/pick" && req.method === "POST") {
    if (!ownerOnly(res, req)) return;
    const b = await json(req);
    if (!b.id) return send(res, 400, { error: "id required" });
    try { const dir = process.env.DSH_SECTOR_PACKS_DIR || path.join(ROOT, "docs", "sector-packs"); fs.copyFileSync(path.join(dir, String(b.id) + ".json"), SECTOR_FILE); return send(res, 200, { ok: true, id: b.id }); }
    catch (e) { return send(res, 404, { error: "sector pack not found" }); }
  }
  if (pathname === "/api/sector" && req.method === "GET") {
    try { return send(res, 200, JSON.parse(fs.readFileSync(SECTOR_FILE, "utf8"))); }
    catch { return send(res, 200, { id: "generic", tableLabel: { en: "Table", es: "Mesa" }, ordersTarget: { en: "Orders", es: "Pedidos" }, entity: { en: "person", es: "persona" }, fields: [] }); }
  }
  if (pathname === "/api/sector" && req.method === "POST") {
    if (!ownerOnly(res, req)) return;
    const b = await json(req);
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(SECTOR_FILE, JSON.stringify(b, null, 2));
    return send(res, 200, { ok: true });
  }
  if (pathname === "/api/sector-presets" && req.method === "GET") {
    const dir = process.env.DSH_SECTOR_PACKS_DIR || path.join(ROOT, "docs", "sector-packs");
    const out = [];
    try {
      for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json")).sort()) {
        try { out.push(JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"))); } catch {}
      }
    } catch {}
    return send(res, 200, { presets: out });
  }
  if (pathname === "/api/live/start" && req.method === "POST") {
    const b = await json(req);
    liveWrite({ status: "listening", worker: b.worker || "worker", table: b.table || null, fields: b.fields || {}, startedAt: ts(), speakers: [], orders: [], inbox: [] });
    return send(res, 200, { ok: true });
  }
  if (pathname === "/api/live/summary" && req.method === "POST") {
    const b = await json(req);
    const s = liveRead();
    s.status = "summary";
    s.worker = b.worker || s.worker;
    s.speakers = (b.speakers || []).map((p, i) => ({
      id: "p" + (i + 1),
      name: p.name || ("Person " + (i + 1)),
      requests: (p.requests || []).map((r, j) => ({
        id: "p" + (i + 1) + "-r" + (j + 1),
        text: String(r.text || ""),
        tier: r.tier || "GREEN",
        status: "pending",
      })),
    }));
    liveWrite(s);
    return send(res, 200, { ok: true });
  }
  if (pathname === "/api/live/confirm" && req.method === "POST") {
    const b = await json(req);
    const s = liveRead();
    let ok = false;
    for (const p of s.speakers) for (const r of p.requests) {
      if (r.id === b.requestId && r.status !== "confirmed") {
        r.status = "confirmed"; ok = true; telemetryTick("decision", "confirmed");
        s.orders.push({ id: "o" + (s.orders.length + 1), ts: ts(), table: s.table, person: p.name, request: r.text, tier: r.tier, status: "sent" });
      }
    }
    liveWrite(s);
    return send(res, 200, { ok });
  }
  if (pathname === "/api/live/order" && req.method === "POST") {
    const b = await json(req);
    const s = liveRead();
    const o = s.orders.find((x) => x.id === b.orderId);
    if (o) { if (b.status === "paid") { o.paid = true; } else { o.status = b.status || "sent"; } }
    liveWrite(s);
    return send(res, 200, { ok: !!o });
  }
  if (pathname === "/api/live/close" && req.method === "POST") {
    liveWrite({ status: "idle", worker: null, startedAt: null, speakers: [], orders: [], inbox: [] });
    return send(res, 200, { ok: true });
  }
  // Speech/text from the worker's device → the always-connected AI agent.
  // Deep-queue: questions for the Reasoner brain (the second brain, by default).
  if (pathname === "/api/translate" && req.method === "POST") {
    const b = await json(req);
    const appLang = String(b.appLang || "fr").slice(0, 2).toLowerCase();
    const otherLang = String(b.otherLang || "en").slice(0, 2).toLowerCase();
    const text = String(b.text || "").trim();
    if (!text) return send(res, 200, { detected: otherLang, translation: "" }, true);
    const prompt = "Interpreter mode. The app language is " + appLang + ". Analyze: " + text + " Detect which of these 10 languages it is: es (Spanish), fr (French), en (English), de (German), it (Italian), pt (Portuguese), zh (Chinese), ja (Japanese), ko (Korean), ar (Arabic). Translate it into " + appLang + " (unless it is already in " + appLang + "). Reply with ONLY one JSON object: {\"detected\":\"<two-letter code>\",\"translation\":\"<the translation>\"}";
    try {
      const out = await brain("deepseek-flash", prompt);
      const j = jsonBlock(out);
      if (j && j.translation) return send(res, 200, { detected: j.detected || otherLang, translation: String(j.translation) }, true);
      return send(res, 200, { detected: otherLang, translation: String(out || "").slice(0, 400) }, true);
    } catch (e) { return send(res, 200, { detected: otherLang, translation: "", error: e.message }, true); }
  }
  if (pathname === "/api/deep" && req.method === "POST") {
    if (!managerOnly(res, req)) return;
    if (!budgetOk()) return send(res, 429, { error: "limit reached — raise it in settings" });
    const b = await json(req);
    const s2 = liveRead();
    s2.deep = s2.deep || [];
    const ditem = { id: "d" + (s2.deep.length + 1), ts: ts(), worker: b.worker || "owner", text: String(b.text || "").trim() };
    s2.deep.push(ditem);
    liveWrite(s2);
    if (brainOn()) processDeep(ditem); // direct v4-pro brain
    return send(res, 200, { ok: true });
  }
  if (pathname === "/api/deep/inbox" && req.method === "GET") {
    const s2 = liveRead();
    const items = (s2.deep || []).filter((x) => !x.acked);
    if (items.length) { s2.deep.forEach((x) => { x.acked = true; }); liveWrite(s2); }
    return send(res, 200, { items });
  }
  if (pathname === "/api/deep/answers" && req.method === "GET") {
    if (!managerOnly(res, req)) return;
    const s2 = liveRead();
    return send(res, 200, { answers: (s2.deepAnswers || []).slice(-5).reverse() });
  }
  if (pathname === "/api/deep/result" && req.method === "POST") {
    const b = await json(req);
    appendReport("Reasoner", String(b.text || ""));
    return send(res, 200, { ok: true }, true);
  }
  if (pathname === "/api/live/transcript" && req.method === "POST") {
    if (!budgetOk()) return send(res, 429, { error: "limit reached — raise it in settings" });
    const b = await json(req);
    const s = liveRead();
    s.inbox = s.inbox || [];
    const item = { id: "t" + (s.inbox.length + 1), ts: ts(), worker: b.worker || s.worker, text: String(b.text || "").trim(), lang: String(b.lang || "fr") };
    s.inbox.push(item);
    liveWrite(s);
    if (brainOn()) processTranscript(item); // direct flash brain
    return send(res, 200, { ok: true });
  }
  if (pathname === "/api/live/inbox" && req.method === "GET") {
    const s = liveRead();
    const items = (s.inbox || []).filter((x) => !x.acked);
    if (items.length) { s.inbox.forEach((x) => { x.acked = true; }); liveWrite(s); }
    return send(res, 200, { items });
  }
  if (pathname === "/api/decisions" && req.method === "GET") { if (!ownerOnly(res, req)) return; return send(res, 200, { content: readDecisions() }); }
  if (pathname === "/api/decisions" && req.method === "POST") { if (!ownerOnly(res, req)) return; const b = await json(req); writeDecisions(b.content); return send(res, 200, { ok: true }); }
  if (pathname === "/api/users" && req.method === "GET") { if (!ownerOnly(res, req)) return; const u = loadUsers(); return send(res, 200, { users: Object.entries(u).map(([name, v]) => ({ name, role: v.role, label: v.label || name })) }); }
  if (pathname === "/api/users" && req.method === "POST") {
    if (!ownerOnly(res, req)) return;
    const b = await json(req);
    if (!b.name || !b.password) return send(res, 400, { error: "name and password required" });
    if (String(b.password).length < 8) return send(res, 400, { error: "password must be at least 8 characters" });
    const u = loadUsers();
    if (u[b.name]) return send(res, 409, { error: "user exists" });
    const salt = crypto.randomBytes(16).toString("hex");
    const role = b.role === "owner" ? "owner" : (b.role === "lead" ? "lead" : "employee");
    const label = String(b.label || b.name);
    if (db) db.prepare("INSERT INTO users (name,salt,hash,role,label,created) VALUES (?,?,?,?,?,?)").run(b.name, salt, hashPw(String(b.password), salt), role, label, ts());
    else { u[b.name] = { salt, hash: hashPw(String(b.password), salt), role, label }; saveUsers(u); }
    return send(res, 200, { ok: true });
  }
  return send(res, 404, { error: "not found" });
}

// ---------- static ----------
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".json": "application/json", ".webmanifest": "application/manifest+json", ".md": "text/plain; charset=utf-8" };
function serveStatic(req, res, pathname) {
  let p;
  if ((pathname === "/" || pathname.startsWith("/dashboard") || pathname.startsWith("/panel"))) {
    if ((req.url || "").includes("token=" + GATE_TOKEN)) {
      const clean = (req.url || "").split("?")[0] || "/dashboard";
      res.writeHead(302, { Location: clean, "Set-Cookie": GATE_COOKIE + "=" + GATE_TOKEN + "; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000" });
      return res.end();
    }
    if (!gatePass(req)) { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); return res.end(GATE_PAGE); }
  }
  if (pathname === "/" || pathname === "/dashboard" || pathname === "/dashboard.html") p = path.join(__dirname, "dashboard.html");
  else if (pathname === "/dashboard-i18n.js") p = path.join(__dirname, "dashboard-i18n.js");
  else if (pathname === "/panel" || pathname === "/panel.html") p = path.join(UI_DIR, "panel.html");
  else { const rel = pathname.replace(/^\/+/, ""); p = path.join(UI_DIR, rel); if (!p.startsWith(UI_DIR)) { res.writeHead(403); return res.end(); } }
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); return res.end("not found"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" });
    res.end(data);
  });
}

const handler = (req, res) => {
  const pathname = new URL(req.url, "http://x").pathname;
  if (pathname.startsWith("/api/")) return api(req, res, pathname);
  serveStatic(req, res, pathname);
};

http.createServer(handler).listen(PORT, HOST, () => {
  setInterval(weatherCheck, 15 * 60 * 1000);
setTimeout(weatherCheck, 4000);
if (process.env.DSH_ALERT_TEST === "1") setTimeout(() => { const a = alertsRead(); if (!a.items.some((x) => x.status === "active")) { a.items.push({ id: "a" + Date.now(), key: "test-" + Date.now(), kind: "rain", pct: 85, inHour: 1, ts: ts(), status: "active", decision: null, source: "test" }); alertsWrite(a); } }, 5000);
console.log("J.Franco supervisor running at http://" + HOST + ":" + PORT + (USE_DB ? " (sqlite)" : " (files)"));
  console.log("Dashboard: http://" + HOST + ":" + PORT + "/dashboard   Panel: http://" + HOST + ":" + PORT + "/panel");
});
if (HTTPS_ON) {
  if (!fs.existsSync(TLS_KEY) || !fs.existsSync(TLS_CERT)) {
    console.error("TLS enabled but certificates are missing. Run: sh tools/make-cert.sh (self-signed) or sh tools/letsencrypt.sh <domain> <email> (real).");
    process.exit(1);
  }
  https.createServer({ key: fs.readFileSync(TLS_KEY), cert: fs.readFileSync(TLS_CERT) }, handler).listen(HTTPS_PORT, HOST, () => {
    console.log("HTTPS: https://" + HOST + ":" + HTTPS_PORT + " (cert: " + TLS_CERT + ")");
  });
}
