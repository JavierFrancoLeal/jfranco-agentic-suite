// @javierfrancoleal/cockpit-browser — The Cockpit Browser for DeepSeek
// Harness. Created by J.Franco.
//
// Gives the DSH agent HANDS (a real Chromium browser driven over CDP) AND
// ADVICE (the cockpit-browser skill) under the J.Franco guardrails.
//
//   GREEN         — read-only / internal (status, read, screenshot, open, tabs…): execute, log.
//   SEMI-AUTOMATIC ⚑ — writes into a third-party page (fill, click): execute, FLAG for verification.
//   RED           — irreversible/legal (Envoyer/Payer/Create/Authorize/Sign in…): NEVER. The brake refuses it.
//   YELLOW        — handled by the AGENT in chat: propose, then WAIT.
//
// The brake is a GUIDE, not a wall: when it stops, it says WHAT is ready,
// WHAT is missing, and WHAT the human must do.
//
// Multi-frame: elements are located across the main frame AND all iframes
// (CDP isolated worlds), so Google/Facebook forms work. <select> fields are
// filled with the native value + change/input events.
//
// Multi-tab: /cockpit tabs | switch <n> | newtab [url].
//
// Link bridge: a client half (lib/client.js) forwards external link clicks to
// the host `cockpit/open` Remote method.
//
// Zero npm dependencies (node: built-ins + global fetch/WebSocket), zero eval.
import { readFile } from "node:fs/promises";
import { existsSync, writeFileSync, mkdirSync, appendFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { BUNDLED_SKILL_RANK } from "@deepseek-ai/dsh-skill";
import { TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { createWsBridge } from "./ws-bridge.js";

const PROVIDER_NAME = "jfranco-cockpit-browser";
const SKILL_BODY_URL = new URL("../assets/cockpit-browser.md", import.meta.url);
const RESOURCE_BASE = {
  kind: "directory",
  path: fileURLToPath(new URL("../assets/", import.meta.url)),
};

const CANDIDATE = {
  name: "cockpit-browser",
  description:
    "The Cockpit Browser for DeepSeek Harness: gives the agent hands (a real Chromium browser driven over CDP via /cockpit) AND advice, under the J.Franco guardrails. Actions are tiered before executing — GREEN (read-only, logged), SEMI-AUTOMATIC ⚑ (fill/click, flagged), RED (Envoyer/Payer/Create/Authorize/Sign in: the brake refuses them and, like a guide, tells you what is ready and what is missing), YELLOW (propose and wait). It finds elements inside iframes (Google/Facebook), fills <select> fields, manages multiple tabs, and /cockpit report renders the Accountability Report. Persistent session, no file://, physical-mouse detection, emerald border. The user commands, the agent assists.",
  invocation: { modelInvocable: true, userInvocable: true },
  provider: PROVIDER_NAME,
  source: "bundled",
  resourceBase: RESOURCE_BASE,
  rank: BUNDLED_SKILL_RANK,
  locator: SKILL_BODY_URL,
};

const provider = {
  name: PROVIDER_NAME,
  async list() {
    return [CANDIDATE];
  },
  async get() {
    return await readFile(SKILL_BODY_URL, "utf8");
  },
};

// ---------------------------------------------------------------------------
// Cockpit runtime state and safety rails
// ---------------------------------------------------------------------------

const FORBIDDEN = /envoyer|enviar|soumettre|transmettre|payer|pagar|signer|firmar|supprimer|eliminar|borrar|submit|pay|delete|send|publish|post|confirm|confirmer|confirmar|valider|validar|validate|authorize|autoriser|autorizar|acheter|comprar|buy|purchase|checkout|sign\s?in|log\s?in|login|sign\s?up|register|registrar|inscrire|inscription|connexion|connecter|iniciar\s+sesi|entrar|create|créer|crear|creer/i;
const MAX_READ_CHARS = 24000;

const state = {
  mode: "IDLE", // IDLE | AGENTE | MANUAL | BRAKED
  chrome: null,
  ws: null,
  wsUrl: null,
  targetId: null,
  port: Number(process.env.COCKPIT_PORT || 9333),
  allowOne: false,
};

const audit = [];
const AUDIT_FILE = join(homedir(), ".dsh", "cockpit-browser", "audit.jsonl");
const TIERS_FILE = process.env.COCKPIT_TIERS || join(homedir(), ".dsh", "cockpit-browser", "tiers.md");
let frameCtxs = null; // cached isolated-world contexts per frame
let bridge = null; // Chrome-extension bridge (the "your Chrome" transport)
const BRIDGE_PORT = Number(process.env.COCKPIT_BRIDGE_PORT || 9334);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ok = (text) => ({ kind: "success", text });
const err = (text) => ({ kind: "error", text });

const GREEN = "GREEN";
const SEMI = "SEMI-AUTOMATIC";
const RED = "RED";

function logEntry(action, tier, target, value, justification) {
  const entry = { ts: new Date().toISOString(), action, tier, target: target || "", value: value || "", justification };
  audit.push(entry);
  try {
    mkdirSync(dirname(AUDIT_FILE), { recursive: true });
    appendFileSync(AUDIT_FILE, JSON.stringify(entry) + "\n", { mode: 0o600 });
  } catch {}
  return entry;
}

function readySummary() {
  const done = audit.filter((e) => e.tier !== RED);
  if (done.length === 0) return "(nothing yet)";
  return done.slice(-5).map((e) => `${e.action} ${e.target}${e.value ? " = " + e.value : ""}`).join(" · ");
}

function missingSummary() {
  const brakes = audit.filter((e) => e.tier === RED);
  if (brakes.length === 0) return "(nothing blocked)";
  return brakes.map((e) => `click on "${e.value || e.target}"`).join(" · ");
}

function resolveChrome() {
  const candidates = [];
  if (process.env.COCKPIT_CHROME) candidates.push(process.env.COCKPIT_CHROME);
  if (process.platform === "darwin") {
    candidates.push(
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    );
  } else if (process.platform === "win32") {
    const pf = process.env.PROGRAMFILES || "C:\\Program Files";
    const pfx = process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)";
    candidates.push(
      join(pf, "Google", "Chrome", "Application", "chrome.exe"),
      join(pfx, "Google", "Chrome", "Application", "chrome.exe"),
      join(pf, "Microsoft", "Edge", "Application", "msedge.exe"),
    );
  } else {
    candidates.push("/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/microsoft-edge");
  }
  for (const c of candidates) if (c && existsSync(c)) return c;
  return null;
}

function profileDir() {
  return process.env.COCKPIT_PROFILE || join(homedir(), ".dsh", "cockpit-browser", "profile");
}

async function chromeRunning() {
  try {
    const res = await fetch(`http://127.0.0.1:${state.port}/json/version`);
    return res.ok;
  } catch {
    return false;
  }
}

async function connect() {
  if (!state.wsUrl) throw new Error("no CDP target");
  const ws = new WebSocket(state.wsUrl);
  const pending = new Map();
  let seq = 0;
  ws.addEventListener("message", (event) => {
    let msg;
    try { msg = JSON.parse(event.data); } catch { return; }
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) p.reject(new Error(msg.error.message || "CDP error"));
      else p.resolve(msg);
    }
  });
  await new Promise((res, rej) => {
    ws.addEventListener("open", res, { once: true });
    ws.addEventListener("error", () => rej(new Error("CDP websocket failed")), { once: true });
  });
  ws.addEventListener("close", () => {
    if (state.ws === ws) { state.ws = null; state.wsUrl = null; }
  });
  state.ws = ws;
  state.call = (method, params = {}) => new Promise((res, rej) => {
    const id = ++seq;
    const timer = setTimeout(() => { pending.delete(id); rej(new Error(`CDP timeout: ${method}`)); }, 30000);
    pending.set(id, {
      resolve: (m) => { clearTimeout(timer); res(m); },
      reject: (e) => { clearTimeout(timer); rej(e); },
    });
    try { ws.send(JSON.stringify({ id, method, params })); } catch (e) { clearTimeout(timer); pending.delete(id); rej(e); }
  });
}

async function listTargets() {
  const list = await (await fetch(`http://127.0.0.1:${state.port}/json`)).json();
  return list.filter((t) => t.type === "page");
}

async function attachTo(target) {
  if (state.ws) { try { state.ws.close(); } catch {} }
  state.targetId = target.id;
  state.wsUrl = target.webSocketDebuggerUrl;
  frameCtxs = null;
  await connect();
  await state.call("Page.enable");
  await state.call("Runtime.enable");
}

async function attach() {
  const list = await listTargets();
  if (list.length === 0) throw new Error("no page target found");
  await attachTo(list[0]);
}

async function ensureBrowser() {
  if (await chromeRunning()) {
    if (!state.ws) await attach();
    return;
  }
  const bin = resolveChrome();
  if (!bin) return err("No Chromium-based browser found. Set COCKPIT_CHROME to its executable path.");
  const dir = profileDir();
  mkdirSync(dir, { recursive: true });
  const args = [
    `--remote-debugging-port=${state.port}`,
    `--user-data-dir=${dir}`,
    "--no-first-run", "--no-default-browser-check",
    "--disable-background-networking", "--disable-component-update",
    "--disable-default-apps", "--new-window", "about:blank",
  ];
  const child = spawn(bin, args, { stdio: "ignore" });
  child.on("exit", () => {
    if (state.chrome === child) { state.chrome = null; state.ws = null; state.wsUrl = null; state.mode = "IDLE"; }
  });
  state.chrome = child;
  for (let i = 0; i < 40; i++) { if (await chromeRunning()) break; await sleep(250); }
  if (!(await chromeRunning())) return err("The browser did not expose CDP in time. Is another instance on this port?");
  await attach();
  return null;
}

async function requireReady() {
  const e = await ensureBrowser();
  if (e) throw new Error(e.text);
}

async function evaluate(expression) {
  const res = await state.call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (res.result?.exceptionDetails) {
    throw new Error(res.result.exceptionDetails.exception?.description || res.result.exceptionDetails.text || "evaluate failed");
  }
  return res.result?.result?.value;
}

async function evaluateIn(contextId, expression) {
  const res = await state.call("Runtime.evaluate", { expression, contextId, returnByValue: true, awaitPromise: true });
  if (res.result?.exceptionDetails) {
    throw new Error(res.result.exceptionDetails.exception?.description || res.result.exceptionDetails.text || "evaluate failed");
  }
  return res.result?.result?.value;
}

async function frameContexts() {
  if (frameCtxs) return frameCtxs;
  const tree = await state.call("Page.getFrameTree");
  const frames = [];
  const walk = (n) => { frames.push(n.frame); (n.childFrames || []).forEach(walk); };
  walk(tree.frameTree);
  const out = [];
  for (const f of frames) {
    try {
      const r = await state.call("Page.createIsolatedWorld", { frameId: f.id, worldName: "cockpit", grantUniveralAccess: true });
      out.push({ frameId: f.id, url: f.url, isMain: f.parentId === undefined, contextId: r.result.executionContextId });
    } catch {}
  }
  frameCtxs = out;
  return out;
}

async function locate(selector) {
  const ctxs = await frameContexts();
  for (const c of ctxs) {
    const found = await evaluateIn(c.contextId, `!!document.querySelector(${JSON.stringify(selector)})`).catch(() => false);
    if (found) return c;
  }
  return null;
}

async function preflight() {
  await requireReady();
  const touched = await evaluate("!!(window.__cockpitHumanTouched)").catch(() => false);
  if (touched) state.mode = "MANUAL";
  if (state.mode === "MANUAL") {
    if (state.allowOne) { state.allowOne = false; return null; }
    return err("🖐️ HUMAN AT THE WHEEL — the human has the wheel. /cockpit resume (or /cockpit step for exactly one action).");
  }
  return null;
}

async function injectProbes() {
  await evaluate(`(() => {
    if (window.__cockpitHudInstalled) return true;
    window.__cockpitHudInstalled = true;
    window.__cockpitHumanTouched = false;
    window.addEventListener("mousedown", () => { window.__cockpitHumanTouched = true; }, true);
    window.addEventListener("keydown", () => { window.__cockpitHumanTouched = true; }, true);
    const bar = document.createElement("div");
    bar.id = "__cockpit_hud";
    bar.style.cssText = "position:fixed;top:0;left:0;right:0;height:36px;z-index:2147483647;background:#0f172a;color:#f8fafc;font:700 12px/36px system-ui;padding:0 12px;display:flex;gap:12px;align-items:center;box-shadow:0 1px 0 #334155";
    bar.innerHTML = '<span style="color:#10b981">⚡ AGENT</span><span style="color:#64748b">|</span><span style="color:#94a3b8">cockpit-browser · the human commands · the agent never clicks Send/Pay</span>';
    (document.body || document.documentElement).appendChild(bar);
    return true;
  })()`).catch(() => {});
}

// ---------------------------------------------------------------------------
// Subcommands
// ---------------------------------------------------------------------------

function tokenize(input) {
  const tokens = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let m;
  while ((m = re.exec(input)) !== null) tokens.push(m[1] ?? m[2] ?? m[3]);
  return tokens;
}

async function cmdOpen(url) {
  if (!url) return err("cockpit open requires a URL: /cockpit open https://…");
  if (!/^https?:\/\//i.test(url)) return err("cockpit only opens http(s) URLs — file:// is blocked.");
  const e = await ensureBrowser();
  if (e) return e;
  await state.call("Page.navigate", { url });
  frameCtxs = null;
  await sleep(1200);
  await injectProbes();
  state.mode = "AGENTE";
  logEntry("open", GREEN, url, "", "navigation is reversible and internal");
  return ok(`Opened ${url}\nHUD: ⚡ AGENT — a physical mouse/keyboard touch hands the wheel to the human.`);
}

async function cmdRead(sel) {
  const p = await preflight();
  if (p) return p;
  if (sel) {
    const c = await locate(sel);
    if (!c) return err(`No element matched selector ${sel} (searched the main frame and iframes).`);
    const text = await evaluateIn(c.contextId, `(() => { const el = document.querySelector(${JSON.stringify(sel)}); return (el.innerText || el.textContent || ""); })()`);
    logEntry("read", GREEN, sel, "", "read-only");
    return ok(String(text).slice(0, MAX_READ_CHARS));
  }
  const text = await evaluate(`(document.body ? document.body.innerText : "")`);
  logEntry("read", GREEN, "(page)", "", "read-only");
  return ok(String(text).slice(0, MAX_READ_CHARS));
}

async function cmdFill(sel, value) {
  if (!sel || value === undefined) return err("fill requires <selector> <value>: /cockpit fill \"#email\" \"me@example.com\"");
  const p = await preflight();
  if (p) return p;
  const c = await locate(sel);
  if (!c) return err(`No element matched selector ${sel} (searched the main frame and iframes).`);
  const expr = `(() => {
    const el = document.querySelector(${JSON.stringify(sel)});
    if (!el) return false;
    const v = ${JSON.stringify(String(value))};
    el.style.outline = "3px solid #10b981";
    el.style.backgroundColor = "rgba(16, 185, 129, 0.10)";
    if (el.tagName === "SELECT") {
      el.value = v;
      el.dispatchEvent(new Event("change", { bubbles: true }));
      el.dispatchEvent(new Event("input", { bubbles: true }));
      return { done: true, kind: "select" };
    }
    const proto = el instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
    setter.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return { done: true, kind: "text", isPassword: el.type === "password" };
  })()`;
  const res = await evaluateIn(c.contextId, expr);
  if (!res || res.done !== true) return err(`Could not fill ${sel}.`);
  const shown = res.kind === "select" ? `[select] ${String(value).slice(0, 80)}` : (res.isPassword ? "••• (password — never logged)" : String(value).slice(0, 80));
  logEntry("fill", SEMI, sel, shown, "writes a value into a third-party page — mandatory verification");
  return ok(`Filled ${sel} (emerald border). ⚑ SEMI-AUTOMATIC — verify it in the report.`);
}

const VALID_TIERS = new Set(["GREEN", "SEMI-AUTOMATIC", "YELLOW", "RED"]);

// User-editable tier overrides: ~/.dsh/cockpit-browser/tiers.md, one
// "pattern → TIER" per line. Read FRESH on every decision (no cache), so a
// correction takes effect on the NEXT action and persists across restarts.
function loadTiers() {
  const out = [];
  try {
    if (existsSync(TIERS_FILE)) {
      const raw = readFileSync(TIERS_FILE, "utf8");
      for (const line of raw.split("\n")) {
        const t = line.trim();
        if (!t || t.startsWith("#")) continue;
        const parts = t.split(/→|->/).map((s) => s.trim());
        if (parts.length < 2) continue;
        const pattern = parts[0];
        const tier = parts.slice(1).join(" ").toUpperCase().trim();
        if (pattern && VALID_TIERS.has(tier)) out.push({ pattern, tier });
      }
    }
  } catch {}
  return out;
}

function tierForLabel(label) {
  const lab = String(label || "").toLowerCase();
  let hit = null;
  for (const t of loadTiers()) {
    if (t.pattern && lab.includes(t.pattern.toLowerCase())) hit = t.tier;
  }
  return hit; // the last matching line wins
}

function cmdTier(pattern, tierRaw) {
  if (!pattern) return err("tier requires <pattern> <tier>: /cockpit tier \"Create draft\" GREEN");
  const tier = String(tierRaw || "").toUpperCase().trim();
  if (!VALID_TIERS.has(tier)) return err("Tier must be one of: GREEN, SEMI-AUTOMATIC, YELLOW, RED.");
  try {
    mkdirSync(dirname(TIERS_FILE), { recursive: true });
    appendFileSync(TIERS_FILE, `${pattern} → ${tier}\n`, { mode: 0o600 });
  } catch (e) {
    return err(`Could not write the tier override: ${e && e.message ? e.message : e}`);
  }
  return ok(`✅ "${pattern}" → ${tier}.\n\nTakes effect on the NEXT action (read fresh, no cache) and persists in ${TIERS_FILE}. To override it, add another line with the same text and the new tier — the last line wins.`);
}

async function cmdClick(sel) {
  if (!sel) return err("click requires <selector>: /cockpit click \"button.envoyer\"");
  const p = await preflight();
  if (p) return p;
  const c = await locate(sel);
  if (!c) return err(`No element matched selector ${sel} (searched the main frame and iframes).`);
  const label = await evaluateIn(c.contextId, `(() => { const el = document.querySelector(${JSON.stringify(sel)}); return (el.getAttribute("aria-label") || el.innerText || el.textContent || el.value || el.getAttribute("title") || "").trim().slice(0, 200); })()`);
  const override = tierForLabel(label);
  const tier = override || (FORBIDDEN.test(label) ? RED : SEMI);
  if (tier === RED) {
    state.mode = "BRAKED";
    logEntry("click", RED, sel, label, override ? "human override: RED" : "refused — final/legal/committing button");
    return ok(`🛑 BRAKE — I stopped at "${label}"${override ? " (you marked it RED)" : " because it is a final/legal/committing click (send, pay, authorize, create, sign in)"}.\n\n✅ I already left ready: ${readySummary()}\n\n⏳ You still need to (you, human): ${missingSummary()}`);
  }
  if (tier === "YELLOW") {
    logEntry("click", "YELLOW", sel, label, "human override: propose and wait");
    return ok(`🟡 Propose first — "${label}" is marked YELLOW. Propose it in the chat and wait for the human's yes before retrying.`);
  }
  if (c.isMain) {
    const rect = await evaluateIn(c.contextId, `(() => { const el = document.querySelector(${JSON.stringify(sel)}); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
    await state.call("Input.dispatchMouseEvent", { type: "mousePressed", x: rect.x, y: rect.y, button: "left", clickCount: 1 });
    await state.call("Input.dispatchMouseEvent", { type: "mouseReleased", x: rect.x, y: rect.y, button: "left", clickCount: 1 });
  } else {
    await evaluateIn(c.contextId, `(() => { const el = document.querySelector(${JSON.stringify(sel)}); el.click(); el.style.outline = "3px solid #10b981"; return true; })()`);
  }
  await evaluateIn(c.contextId, `(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (el) el.style.outline = "3px solid #10b981"; return true; })()`);
  logEntry("click", tier, sel, label, override ? `human override: ${tier}` : (tier === GREEN ? "clicked (override GREEN)" : "clicked a third-party page — mandatory verification"));
  return ok(`Clicked ${sel} ("${label}") — emerald border. ${tier === GREEN ? "[GREEN — you marked it green]" : "⚑ SEMI-AUTOMATIC — verify it in the report."}`);
}

async function cmdScreenshot(file) {
  const p = await preflight();
  if (p) return p;
  const res = await state.call("Page.captureScreenshot", { format: "png" });
  const b64 = res.result?.data;
  if (!b64) return err("screenshot failed");
  const dest = file ? resolve(file) : join(homedir(), ".dsh", "cockpit-browser", `shot-${Date.now()}.png`);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, Buffer.from(b64, "base64"));
  logEntry("screenshot", GREEN, dest, "", "read-only capture");
  return ok(`Screenshot saved: ${dest}`);
}

async function cmdStatus() {
  if (!(await chromeRunning())) return ok("HUD: ⚪ IDLE — no browser running. Use /cockpit open <url>.");
  let extra = "";
  try {
    const raw = await evaluate(`JSON.stringify({ url: location.href, title: document.title, humanTouched: !!window.__cockpitHumanTouched })`);
    if (raw) {
      const o = JSON.parse(raw);
      if (o.humanTouched) state.mode = "MANUAL";
      extra = `\nURL: ${o.url}\nTitle: ${o.title}`;
    }
  } catch {}
  const hud = state.mode === "BRAKED" ? "🛑 BRAKE" : state.mode === "MANUAL" ? "🖐️ HUMAN AT THE WHEEL" : "⚡ AGENT";
  return ok(`HUD: ${hud}${extra}`);
}

async function cmdTabs() {
  await requireReady();
  const list = await listTargets();
  const lines = list.map((t, i) => `${i}: ${t.title || "(untitled)"} — ${t.url}`).join("\n");
  logEntry("tabs", GREEN, "", "", "read-only listing");
  return ok(`Tabs:\n${lines}`);
}

async function cmdSwitch(n) {
  await requireReady();
  const list = await listTargets();
  const idx = Number(n);
  const t = list[idx];
  if (!t) return err(`Tab ${n} not found. Use /cockpit tabs.`);
  await attachTo(t);
  await injectProbes();
  logEntry("switch", GREEN, String(idx), t.title || t.url, "tab switch is internal");
  return ok(`Switched to tab ${idx}: ${t.title || t.url}`);
}

async function cmdNewtab(url) {
  await requireReady();
  const u = url && /^https?:\/\//i.test(url) ? url : "about:blank";
  const t = await (await fetch(`http://127.0.0.1:${state.port}/json/new?${encodeURIComponent(u)}`, { method: "PUT" })).json();
  await attachTo(t);
  if (u !== "about:blank") { await sleep(800); await injectProbes(); }
  logEntry("newtab", GREEN, u, "", "new tab is internal");
  return ok(`New tab opened: ${u}`);
}

async function cmdClose() {
  if (state.chrome) { try { state.chrome.kill(); } catch {} state.chrome = null; }
  state.ws = null; state.wsUrl = null; state.targetId = null; frameCtxs = null; state.mode = "IDLE";
  return ok("Browser closed. The persistent profile (cookies/sessions) is kept for the next run.");
}

function cmdReport() {
  const actions = audit.filter((e) => e.tier === GREEN || e.tier === SEMI);
  const brakes = audit.filter((e) => e.tier === RED);
  const lines = ["— Accountability Report (cockpit-browser) —", ""];
  lines.push("Automatic actions — for you to verify:");
  if (actions.length === 0) lines.push("  (none)");
  for (const e of actions) {
    const flag = e.tier === SEMI ? "⚑ " : "";
    const value = e.value ? ` = ${e.value}` : "";
    lines.push(`  [${flag}${e.tier}] ${e.action} ${e.target}${value} — ${e.ts.slice(11, 19)}`);
  }
  lines.push("");
  lines.push("Brakes applied (RED — the guide stopped, hand to the human):");
  if (brakes.length === 0) lines.push("  (none)");
  for (const e of brakes) lines.push(`  🛑 ${e.action} ${e.target} ("${e.value}") — ${e.ts.slice(11, 19)}`);
  lines.push("");
  lines.push(`✅ Ready: ${readySummary()}`);
  lines.push(`⏳ Missing (you, human): ${missingSummary()}`);
  lines.push("");
  lines.push(`Full trail: ${AUDIT_FILE}`);
  return ok(lines.join("\n"));
}

function readAllAudit() {
  const entries = [];
  try {
    if (existsSync(AUDIT_FILE)) {
      const raw = readFileSync(AUDIT_FILE, "utf8");
      for (const line of raw.split("\n")) {
        const t = line.trim();
        if (!t) continue;
        try { entries.push(JSON.parse(t)); } catch {}
      }
    }
  } catch {}
  const seen = new Set(entries.map((e) => e.ts));
  for (const e of audit) if (!seen.has(e.ts)) entries.push(e);
  return entries;
}

function cmdKpi() {
  const all = readAllAudit();
  const green = all.filter((e) => e.tier === GREEN).length;
  const semi = all.filter((e) => e.tier === SEMI).length;
  const red = all.filter((e) => e.tier === RED).length;
  const yellow = all.filter((e) => e.tier === "YELLOW").length;
  const total = all.length;
  const autonomy = green + semi;
  const handover = red + yellow;
  const autonomyRate = total ? Math.round((autonomy / total) * 100) : 0;
  const handoverRate = total ? Math.round((handover / total) * 100) : 0;
  const redLabels = {};
  for (const e of all) if (e.tier === RED) { const k = e.value || e.target || "?"; redLabels[k] = (redLabels[k] || 0) + 1; }
  const topRed = Object.entries(redLabels).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, n]) => `${k} (×${n})`).join(" · ");
  let verdict;
  if (total === 0) verdict = "⚪ No activity yet — use /cockpit open <url> and do something.";
  else if (autonomyRate >= 80) verdict = "✅ The system works — the agent did most of the work.";
  else if (autonomyRate >= 50) verdict = "🟡 Mixed — review the handovers to the human below; some steps could have been automated.";
  else verdict = "🔧 Refine the plugin — too much human intervention on automatable tasks.";
  const lines = [
    "— Cockpit Efficiency KPI —",
    "",
    `Actions: ${total}  (autonomous ${autonomy} = ${green} GREEN + ${semi} ⚑SEMI · handed to human ${handover} = ${red} 🛑RED + ${yellow} 🟡YELLOW)`,
    `Autonomy: ${autonomyRate}%   ·   Human intervention: ${handoverRate}%`,
    "",
    `Verdict: ${verdict}`,
    "",
    `Tasks handed to the human (review which ones WERE automatable): ${red ? topRed : "(none)"}`,
    "",
    "Reading: a RED on a final/legal button (Envoyer/Payer/Create/Sign in) is CORRECT by design — it does not count as a failure. A RED (or YELLOW) on an action that COULD have been automated is bad automation management: refine the FORBIDDEN regex or the tier.",
  ];
  return ok(lines.join("\n"));
}

const USAGE = "Usage: /cockpit <open <url> | read [selector] | fill <selector> <value> | click <selector> | screenshot [file] | tabs | switch <n> | newtab [url] | status | pause | resume | step | report | kpi | tier <pattern> <tier> | close>";

// ---------------------------------------------------------------------------
// Extension transport — the "your Chrome" backend. Same guardrails as the CDP
// path; only the hands move into a Chrome extension via the WebSocket bridge.
// ---------------------------------------------------------------------------

function usingExtension() {
  return bridge !== null && bridge.connected();
}

async function extOpen(url) {
  if (!url) return err("cockpit open requires a URL: /cockpit open https://…");
  if (!/^https?:\/\//i.test(url)) return err("cockpit only opens http(s) URLs — file:// is blocked.");
  await bridge.send("open", { url });
  state.mode = "AGENTE";
  logEntry("open", GREEN, url, "", "navigation is reversible and internal");
  return ok(`Opened ${url} in your Chrome.\nHUD: ⚡ AGENT — a physical mouse/keyboard touch hands the wheel to the human.`);
}

async function extRead(sel) {
  const text = await bridge.send("read", { selector: sel || null });
  if (text === null && sel) return err(`No element matched selector ${sel}.`);
  logEntry("read", GREEN, sel || "(page)", "", "read-only");
  return ok(String(text || "").slice(0, MAX_READ_CHARS));
}

async function extFill(sel, value) {
  if (!sel || value === undefined) return err("fill requires <selector> <value>: /cockpit fill \"#email\" \"me@example.com\"");
  const res = await bridge.send("fill", { selector: sel, value: String(value) });
  if (!res || res.done !== true) return err(`Could not fill ${sel}.`);
  const shown = res.kind === "select" ? `[select] ${String(value).slice(0, 80)}` : (res.isPassword ? "••• (password — never logged)" : String(value).slice(0, 80));
  logEntry("fill", SEMI, sel, shown, "writes a value into a third-party page — mandatory verification");
  return ok(`Filled ${sel} (emerald border). ⚑ SEMI-AUTOMATIC — verify it in the report.`);
}

async function extClick(sel) {
  if (!sel) return err("click requires <selector>: /cockpit click \"button.envoyer\"");
  const label = await bridge.send("getLabel", { selector: sel });
  if (label === null) return err(`No element matched selector ${sel}.`);
  const override = tierForLabel(label);
  const tier = override || (FORBIDDEN.test(label) ? RED : SEMI);
  if (tier === RED) {
    state.mode = "BRAKED";
    logEntry("click", RED, sel, label, override ? "human override: RED" : "refused — final/legal/committing button");
    return ok(`🛑 BRAKE — I stopped at "${label}"${override ? " (you marked it RED)" : " because it is a final/legal/committing click (send, pay, authorize, create, sign in)"}.\n\n✅ I already left ready: ${readySummary()}\n\n⏳ You still need to (you, human): ${missingSummary()}`);
  }
  if (tier === "YELLOW") {
    logEntry("click", "YELLOW", sel, label, "human override: propose and wait");
    return ok(`🟡 Propose first — "${label}" is marked YELLOW. Propose it in the chat and wait for the human's yes before retrying.`);
  }
  await bridge.send("click", { selector: sel });
  logEntry("click", tier, sel, label, override ? `human override: ${tier}` : "clicked a third-party page — mandatory verification");
  return ok(`Clicked ${sel} ("${label}") — emerald border. ${tier === GREEN ? "[GREEN — you marked it green]" : "⚑ SEMI-AUTOMATIC — verify it in the report."}`);
}

async function extScreenshot(file) {
  const res = await bridge.send("screenshot", {});
  const dataUrl = res && res.dataUrl;
  if (!dataUrl) return err("screenshot failed — make sure the cockpit tab is the visible tab.");
  const b64 = String(dataUrl).replace(/^data:image\/[^;]+;base64,/, "");
  const dest = file ? resolve(file) : join(homedir(), ".dsh", "cockpit-browser", `shot-${Date.now()}.png`);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, Buffer.from(b64, "base64"));
  logEntry("screenshot", GREEN, dest, "", "read-only capture");
  return ok(`Screenshot saved: ${dest}`);
}

async function extStatus() {
  const s = await bridge.send("status", {});
  if (s && s.humanTouched) state.mode = "MANUAL";
  const hud = state.mode === "BRAKED" ? "🛑 BRAKE" : state.mode === "MANUAL" ? "🖐️ HUMAN AT THE WHEEL" : "⚡ AGENT";
  return ok(`HUD: ${hud}\nURL: ${s ? s.url : "?"}\nTitle: ${s ? s.title : "?"}`);
}

async function executeCockpit(invocation) {
  const tokens = tokenize(invocation.rawInput || "");
  const cmd = (tokens[0] || "").toLowerCase();
  try {
    if (usingExtension()) {
      switch (cmd) {
        case "open": return await extOpen(tokens[1]);
        case "read": return await extRead(tokens[1]);
        case "fill": return await extFill(tokens[1], tokens[2]);
        case "click": return await extClick(tokens[1]);
        case "screenshot": return await extScreenshot(tokens[1]);
        case "status": return await extStatus();
        case "pause": state.mode = "MANUAL"; return ok("HUD: 🖐️ HUMAN AT THE WHEEL — paused. /cockpit resume to hand it back.");
        case "resume": state.mode = "AGENTE"; return ok("HUD: ⚡ AGENT — resumed.");
        case "step": state.mode = "MANUAL"; state.allowOne = true; return ok("Step mode: exactly ONE next action, then the wheel returns to the human.");
        case "report": return cmdReport();
        case "kpi": return cmdKpi();
        case "tier": return cmdTier(tokens[1], tokens[2]);
        case "close": return ok("The extension stays connected. Close the cockpit tab in your Chrome to end the session.");
        case "tabs": case "switch": case "newtab": return err(`/cockpit ${cmd} is not needed with the extension — use your Chrome tabs directly.`);
        default: return err(USAGE);
      }
    }
    switch (cmd) {
      case "open": return await cmdOpen(tokens[1]);
      case "read": return await cmdRead(tokens[1]);
      case "fill": return await cmdFill(tokens[1], tokens[2]);
      case "click": return await cmdClick(tokens[1]);
      case "screenshot": return await cmdScreenshot(tokens[1]);
      case "tabs": return await cmdTabs();
      case "switch": return await cmdSwitch(tokens[1]);
      case "newtab": return await cmdNewtab(tokens[1]);
      case "status": return await cmdStatus();
      case "pause": state.mode = "MANUAL"; return ok("HUD: 🖐️ HUMAN AT THE WHEEL — paused. /cockpit resume to hand it back.");
      case "resume": state.mode = "AGENTE"; return ok("HUD: ⚡ AGENT — resumed.");
      case "step": state.mode = "MANUAL"; state.allowOne = true; return ok("Step mode: exactly ONE next action, then the wheel returns to the human.");
      case "report": return cmdReport();
      case "kpi": return cmdKpi();
      case "tier": return cmdTier(tokens[1], tokens[2]);
      case "close": return await cmdClose();
      default: return err(USAGE);
    }
  } catch (e) {
    return err(String(e && e.message ? e.message : e));
  }
}

// ---------------------------------------------------------------------------
// Remote bridge (link click → cockpit open)
// ---------------------------------------------------------------------------

const REMOTE_METHOD_DESCRIPTOR = "@deepseek-ai/dsh-typert-protocol/remote-methods";

class CockpitBridge extends TypertRemoteService {
  constructor(ctx) {
    super(ctx, "cockpit");
    this.ctx = ctx;
  }
  async open(url) {
    const res = await cmdOpen(String(url || ""));
    return { kind: res.kind, text: res.text };
  }
}

Object.defineProperty(CockpitBridge.prototype, REMOTE_METHOD_DESCRIPTOR, {
  configurable: true,
  value: Object.freeze({
    version: 1,
    methods: Object.freeze([Object.freeze({ method: "open", invocation: Object.freeze({ kind: "direct" }) })]),
  }),
});

// ---------------------------------------------------------------------------
// Plugin registration
// ---------------------------------------------------------------------------

const name = "cockpit-browser";
const inject = ["commands"];

function apply(ctx) {
  try { bridge = createWsBridge(BRIDGE_PORT); } catch {}
  ctx.on("skills", (skills) => {
    skills.registerProvider(() => provider);
  });
  ctx.commands.register({
    definitionId: "@javierfrancoleal/cockpit-browser",
    name: "cockpit",
    description:
      "Control the cockpit browser AND keep the J.Franco guardrails. GREEN (read-only) actions run and are logged; SEMI-AUTOMATIC ⚑ actions (fill/click) run and are flagged; RED actions (Envoyer/Payer/Create/Authorize/Sign in) are refused by the brake, which — like a guide — tells you what is ready and what is missing; YELLOW proposals wait in chat. Finds elements inside iframes, fills <select>, manages tabs (tabs/switch/newtab). /cockpit report renders the Accountability Report.",
    input: {
      hint: "<open <url> | read [selector] | fill <selector> <value> | click <selector> | screenshot [file] | tabs | switch <n> | newtab [url] | status | pause | resume | step | report | kpi | tier <pattern> <tier> | close>",
      attachments: false,
    },
    handler: (invocation) => executeCockpit(invocation),
  });
  try {
    new CockpitBridge(ctx);
  } catch {}
}

export { apply, inject, name };
