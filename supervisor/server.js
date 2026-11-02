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
const PRICE_PER_MILLION = Number(process.env.DSH_PRICE_PER_MILLION || 0.28);
// Homeostasis: the daily token budget (metabolic limit). The brain rests
// when the budget is spent — no runaway costs.
const DAILY_BUDGET_USD = Number(process.env.DSH_DAILY_BUDGET_USD || 5);
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
function budgetOk() { return todayCostUsd() < DAILY_BUDGET_USD; }
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
  fs.writeFileSync(USERS_FILE, JSON.stringify(u, null, 2));
}
function hashPw(pw, salt) { return crypto.scryptSync(pw, salt, 64).toString("hex"); }
function ts() { return new Date().toISOString(); }
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
      body = "# Le Veilleux — orders & bill\n\n" + ts() + "\n\n" +
        (lv.orders || []).map((o) => "- " + (o.table ? "Table " + o.table + " · " : "") + o.person + ": " + o.request + " (" + o.status + ")").join("\n") +
        "\n\nTotal items: " + (lv.orders || []).length + "\n";
      name = "le-veilleux-orders.md";
    } else if (type === "usage") {
      body = "# Le Veilleux — usage & cost\n\n" + ts() + "\n\n| Worker | Sessions | Tokens | Est. cost |\n|---|---|---|---|\n" +
        usageRows().map((r) => "| " + r.worker + " | " + r.sessions + " | " + r.tokens + " | $" + r.cost.toFixed(2) + " |").join("\n") + "\n";
      name = "le-veilleux-usage.md";
    } else {
      body = fs.existsSync(REPORTS_FILE) ? fs.readFileSync(REPORTS_FILE, "utf8") : "# Le Veilleux — no reports yet\n";
    }
    res.writeHead(200, { "Content-Type": "text/markdown; charset=utf-8", "Content-Disposition": 'attachment; filename="' + name + '"' });
    return res.end(body);
  }
  // Public wallboard feed: aggregated numbers only, no secrets.
  if (pathname === "/api/wall" && req.method === "GET") {
    const m = metrics();
    const lv = liveRead();
    return send(res, 200, { ...m, orders: (lv.orders || []).length, ordersTail: (lv.orders || []).slice(-3).map((o) => (o.table ? "M" + o.table + " · " : "") + o.person + " — " + o.request), feedbackTail: readFeedback(60) }, true);
  }
  // Live conversation flow: worker screens, per-person summary, orders to
  // the kitchen and the central system (the supervisor itself).
  if (pathname === "/api/live" && req.method === "GET") {
    return send(res, 200, liveRead());
  }
  // The active sector pack: one dashboard skeleton, many business skins.
  if (pathname === "/api/health" && req.method === "GET") {
    const m = metrics();
    return send(res, 200, { ok: true, uptime: Math.round(process.uptime()), workers: m.workers, reports: m.reports, budgetUsd: DAILY_BUDGET_USD, spentTodayUsd: todayCostUsd() }, true);
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
        r.status = "confirmed"; ok = true;
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
    if (o) o.status = b.status || "sent";
    liveWrite(s);
    return send(res, 200, { ok: !!o });
  }
  if (pathname === "/api/live/close" && req.method === "POST") {
    liveWrite({ status: "idle", worker: null, startedAt: null, speakers: [], orders: [], inbox: [] });
    return send(res, 200, { ok: true });
  }
  // Speech/text from the worker's device → the always-connected AI agent.
  // Deep-queue: questions for the Reasoner brain (the second brain, by default).
  if (pathname === "/api/deep" && req.method === "POST") {
    if (!managerOnly(res, req)) return;
    if (!budgetOk()) return send(res, 429, { error: "daily budget reached — homeostasis: the brain rests until tomorrow" });
    const b = await json(req);
    const s2 = liveRead();
    s2.deep = s2.deep || [];
    s2.deep.push({ id: "d" + (s2.deep.length + 1), ts: ts(), worker: b.worker || "owner", text: String(b.text || "").trim() });
    liveWrite(s2);
    return send(res, 200, { ok: true });
  }
  if (pathname === "/api/deep/inbox" && req.method === "GET") {
    const s2 = liveRead();
    const items = (s2.deep || []).filter((x) => !x.acked);
    if (items.length) { s2.deep.forEach((x) => { x.acked = true; }); liveWrite(s2); }
    return send(res, 200, { items });
  }
  if (pathname === "/api/deep/result" && req.method === "POST") {
    const b = await json(req);
    appendReport("Reasoner", String(b.text || ""));
    return send(res, 200, { ok: true }, true);
  }
  if (pathname === "/api/live/transcript" && req.method === "POST") {
    if (!budgetOk()) return send(res, 429, { error: "daily budget reached — homeostasis: the brain rests until tomorrow" });
    const b = await json(req);
    const s = liveRead();
    s.inbox = s.inbox || [];
    s.inbox.push({ id: "t" + (s.inbox.length + 1), ts: ts(), worker: b.worker || s.worker, text: String(b.text || "").trim() });
    liveWrite(s);
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
  if (pathname === "/" || pathname === "/dashboard" || pathname === "/dashboard.html") p = path.join(__dirname, "dashboard.html");
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
