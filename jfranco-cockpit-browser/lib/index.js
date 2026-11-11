// @javierfrancoleal/cockpit-browser — EL NAVEGADOR DE CABINA for DeepSeek
// Harness. Created by J.Franco.
//
// A REAL browser the DSH agent controls: it launches a Chromium browser
// (Chrome/Edge/Chromium) and drives it over the Chrome DevTools Protocol, with
// the Fanal safety rails: persistent session, no file://, the constitutional
// brake before Envoyer/Soumettre/Payer/Transmettre, the emerald border on every
// agent touch, and physical-mouse detection that hands the wheel to the human.
//
// Zero npm dependencies (node: built-ins + global fetch/WebSocket), zero eval,
// zero new Function. The only dynamic execution is the browser's own JS engine
// through CDP `Runtime.evaluate` — the standard, unavoidable mechanism for
// controlling a browser (same as the house's _dsh-inspect/research/
// cdp-balance-check.mjs). All values are serialized with JSON.stringify, never
// string-concatenated into code.
import { readFile } from "node:fs/promises";
import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { BUNDLED_SKILL_RANK } from "@deepseek-ai/dsh-skill";

const PROVIDER_NAME = "jfranco-cockpit-browser";
const SKILL_BODY_URL = new URL("../assets/cockpit-browser.md", import.meta.url);
const RESOURCE_BASE = {
  kind: "directory",
  path: fileURLToPath(new URL("../assets/", import.meta.url)),
};

const CANDIDATE = {
  name: "cockpit-browser",
  description:
    "EL NAVEGADOR DE CABINA for DeepSeek Harness: a real Chromium browser the agent controls over CDP, with the Fanal safety rails. Use the /cockpit command to open a URL, read the page, fill fields (emerald border), click (with the constitutional brake before Envoyer/Soumettre/Payer/Transmettre), take a screenshot, and read the 36px-HUD state (⚡ AGENTE / 🖐️ VOLANTE HUMANO / 🛑 FRENO). The session is persistent (a dedicated user-data-dir), the browser never opens file://, and a physical mouse/keyboard touch flips the wheel to the human automatically. The user commands, the agent assists.",
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

const FORBIDDEN = /envoyer|soumettre|transmettre|payer|signer|supprimer|submit|pay|delete|send|publish|post/i;
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ok = (text) => ({ kind: "success", text });
const err = (text) => ({ kind: "error", text });

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
    candidates.push(
      "/usr/bin/google-chrome",
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
      "/usr/bin/microsoft-edge",
    );
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

async function attach() {
  const list = await (await fetch(`http://127.0.0.1:${state.port}/json`)).json();
  const page = list.find((t) => t.type === "page");
  if (!page) throw new Error("no page target found");
  state.targetId = page.id;
  state.wsUrl = page.webSocketDebuggerUrl;
  await connect();
  await state.call("Page.enable");
  await state.call("Runtime.enable");
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
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-default-apps",
    "--new-window",
    "about:blank",
  ];
  const child = spawn(bin, args, { stdio: "ignore" });
  child.on("exit", () => {
    if (state.chrome === child) { state.chrome = null; state.ws = null; state.wsUrl = null; state.mode = "IDLE"; }
  });
  state.chrome = child;
  for (let i = 0; i < 40; i++) {
    if (await chromeRunning()) break;
    await sleep(250);
  }
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

async function preflight() {
  await requireReady();
  const touched = await evaluate("!!(window.__cockpitHumanTouched)").catch(() => false);
  if (touched) state.mode = "MANUAL";
  if (state.mode === "MANUAL") {
    if (state.allowOne) { state.allowOne = false; return null; }
    return err("🖐️ VOLANTE HUMANO — the human has the wheel. /cockpit resume (or /cockpit step for exactly one action).");
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
    bar.innerHTML = '<span style="color:#10b981">⚡ AGENTE</span><span style="color:#64748b">|</span><span style="color:#94a3b8">cockpit-browser · el humano manda · el agente no pulsa Envoyer/Payer</span>';
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
  await sleep(1200);
  await injectProbes();
  state.mode = "AGENTE";
  return ok(`Opened ${url}\nHUD: ⚡ AGENTE — the agent is running. A physical mouse/keyboard touch will hand the wheel to the human.`);
}

async function cmdRead(sel) {
  const p = await preflight();
  if (p) return p;
  const expr = sel
    ? `(() => { const el = document.querySelector(${JSON.stringify(sel)}); return el ? (el.innerText || el.textContent || "") : null; })()`
    : `(document.body ? document.body.innerText : "")`;
  const text = await evaluate(expr);
  if (text === null) return err(`No element matched selector ${sel}`);
  return ok(String(text).slice(0, MAX_READ_CHARS));
}

async function cmdFill(sel, value) {
  if (!sel || value === undefined) return err("fill requires <selector> <value>: /cockpit fill \"#email\" \"mi@correo.com\"");
  const p = await preflight();
  if (p) return p;
  const expr = `(() => {
    const el = document.querySelector(${JSON.stringify(sel)});
    if (!el) return false;
    const proto = el instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
    setter.call(el, ${JSON.stringify(String(value))});
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.style.outline = "3px solid #10b981";
    el.style.backgroundColor = "rgba(16, 185, 129, 0.10)";
    return true;
  })()`;
  const done = await evaluate(expr);
  return done ? ok(`Filled ${sel} (emerald border). The value and its input/change events are in place.`) : err(`No element matched ${sel}`);
}

async function cmdClick(sel) {
  if (!sel) return err("click requires <selector>: /cockpit click \"button.envoyer\"");
  const p = await preflight();
  if (p) return p;
  const label = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return null; return (el.getAttribute("aria-label") || el.innerText || el.textContent || el.value || el.getAttribute("title") || "").trim().slice(0, 200); })()`);
  if (label === null) return err(`No element matched ${sel}`);
  if (FORBIDDEN.test(label)) {
    state.mode = "BRAKED";
    return ok(`🛑 FRENO — stopped before "${label}". The agent does NOT click Envoyer/Soumettre/Payer/Transmettre. Human, you give the final legal click.`);
  }
  const rect = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  await state.call("Input.dispatchMouseEvent", { type: "mousePressed", x: rect.x, y: rect.y, button: "left", clickCount: 1 });
  await state.call("Input.dispatchMouseEvent", { type: "mouseReleased", x: rect.x, y: rect.y, button: "left", clickCount: 1 });
  await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (el) el.style.outline = "3px solid #10b981"; return true; })()`);
  return ok(`Clicked ${sel} ("${label}") — emerald border.`);
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
  return ok(`Screenshot saved: ${dest} (${Buffer.from(b64, "base64").length} bytes)`);
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
  const hud = state.mode === "BRAKED" ? "🛑 FRENO" : state.mode === "MANUAL" ? "🖐️ VOLANTE HUMANO" : "⚡ AGENTE";
  return ok(`HUD: ${hud}${extra}`);
}

async function cmdClose() {
  if (state.chrome) { try { state.chrome.kill(); } catch {} state.chrome = null; }
  state.ws = null;
  state.wsUrl = null;
  state.targetId = null;
  state.mode = "IDLE";
  return ok("Browser closed. The persistent profile (cookies/sessions) is kept for the next run.");
}

const USAGE = "Usage: /cockpit <open <url> | read [selector] | fill <selector> <value> | click <selector> | screenshot [file] | status | pause | resume | step | close>";

async function executeCockpit(invocation) {
  const tokens = tokenize(invocation.rawInput || "");
  const cmd = (tokens[0] || "").toLowerCase();
  try {
    switch (cmd) {
      case "open": return await cmdOpen(tokens[1]);
      case "read": return await cmdRead(tokens[1]);
      case "fill": return await cmdFill(tokens[1], tokens[2]);
      case "click": return await cmdClick(tokens[1]);
      case "screenshot": return await cmdScreenshot(tokens[1]);
      case "status": return await cmdStatus();
      case "pause": state.mode = "MANUAL"; return ok("HUD: 🖐️ VOLANTE HUMANO — paused. The agent waits. /cockpit resume to hand it back.");
      case "resume": state.mode = "AGENTE"; return ok("HUD: ⚡ AGENTE — resumed.");
      case "step": state.mode = "MANUAL"; state.allowOne = true; return ok("Step mode: the agent may perform exactly ONE next action, then the wheel returns to the human.");
      case "close": return await cmdClose();
      default: return err(USAGE);
    }
  } catch (e) {
    return err(String(e && e.message ? e.message : e));
  }
}

// ---------------------------------------------------------------------------
// Plugin registration
// ---------------------------------------------------------------------------

const name = "cockpit-browser";
const inject = ["commands"];

export function apply(ctx) {
  ctx.on("skills", (skills) => {
    skills.registerProvider(() => provider);
  });
  ctx.commands.register({
    definitionId: "@javierfrancoleal/cockpit-browser",
    name: "cockpit",
    description:
      "Control the cockpit browser: open a URL, read the page, fill a field, click, screenshot, or read the HUD state. The agent fills fields and never clicks the final button (Envoyer/Soumettre/Payer/Transmettre); the human gives the legal click.",
    input: {
      hint: "<open <url> | read [selector] | fill <selector> <value> | click <selector> | screenshot [file] | status | pause | resume | step | close>",
      attachments: false,
    },
    handler: (invocation) => executeCockpit(invocation),
  });
}

export default apply;
