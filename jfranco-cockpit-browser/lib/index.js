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
import { existsSync, writeFileSync, mkdirSync, appendFileSync, readFileSync, chmodSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { BUNDLED_SKILL_RANK } from "@deepseek-ai/dsh-skill";
import { TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { defineTool } from "@deepseek-ai/dsh-tools";
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

// Unicode normalization + diacritics removal — immune to macOS NFD vs NFC
function normalizeText(str) {
  return String(str || "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}

// Word-boundary FORBIDDEN set (fr/en/es), evaluated on normalizeText() output so
// "pays" (country), "postal", "centrar", "designer", "déconnecter" no longer
// false-positive; OAuth/SSO/finance/destructive verbs are covered.
const FORBIDDEN_WORDS = [
  "envoyer", "enviar", "soumettre", "transmettre", "submit", "send",
  "publish", "publier", "publicar", "post", "share", "partager", "compartir",
  "reply", "repondre", "responder",
  "payer", "pagar", "pay", "payment", "paiement", "pago",
  "acheter", "comprar", "buy", "purchase", "checkout", "commander",
  "transfer", "transferer", "transferir", "virement", "wire",
  "subscribe", "abonner", "suscribir", "suscribirse", "donate", "donar", "donner",
  "withdraw", "retirer", "retirar",
  "signer", "firmar", "confirm", "confirmer", "confirmar",
  "valider", "validar", "validate", "authorize", "autoriser", "autorizar",
  "accept", "accepter", "aceptar", "allow", "grant", "accorder", "conceder",
  "supprimer", "eliminar", "borrar", "delete", "remove", "erase",
  "cancel", "annuler", "cancelar", "revoke", "revoquer", "revocar",
  "deactivate", "desactiver", "desactivar", "reset", "reinitialiser", "restablecer",
  "sign\\s?in", "log\\s?in", "login", "sign\\s?up", "log\\s?out", "logout", "sign\\s?out",
  "register", "registrar", "inscrire", "inscription",
  "connexion", "connecter", "deconnexion", "deconnecter",
  "iniciar\\s+sesion", "cerrar\\s+sesion", "entrar",
  "continue\\s+with", "continuer\\s+avec", "continuar\\s+con",
  "create", "creer", "crear",
];
const FORBIDDEN_RE = new RegExp(`(?:^|[^a-z0-9])(?:${FORBIDDEN_WORDS.join("|")})(?=$|[^a-z0-9])`, "i");

function isForbiddenLabel(label, meta = {}) {
  if (meta.isSubmit) return true;
  const norm = normalizeText(label);
  if (norm && FORBIDDEN_RE.test(norm)) return true;
  if (meta.href && FORBIDDEN_RE.test(normalizeText(meta.href))) return true;
  return false;
}

const TIER_PRIORITY = { GREEN: 1, "SEMI-AUTOMATIC": 2, SEMI: 2, YELLOW: 3, RED: 4 };
const SENSITIVE_SELECTOR_OR_LABEL = /pass|pwd|secret|token|key|cvv|cvc|cc-|card|tarjeta|carte|pin|otp|2fa|ssn|auth|code|codigo/i;
const MAX_READ_CHARS = 24000;

const state = {
  mode: "IDLE", // IDLE | AGENTE | MANUAL | BRAKED
  chrome: null,
  ws: null,
  wsUrl: null,
  targetId: null,
  port: Number(process.env.COCKPIT_PORT || 9333),
  allowOne: false,
  pendingYellow: null, // { sel, label } awaiting human approval
};

const audit = [];
const AUDIT_FILE = join(homedir(), ".dsh", "cockpit-browser", "audit.jsonl");
const TIERS_FILE = process.env.COCKPIT_TIERS || join(homedir(), ".dsh", "cockpit-browser", "tiers.md");
const TIERS_PROPOSED_FILE = join(homedir(), ".dsh", "cockpit-browser", "tiers.proposed.md");
let frameCtxs = null; // cached isolated-world contexts per frame
let bridge = null; // Chrome-extension bridge (the "your Chrome" transport)
const BRIDGE_PORT = Number(process.env.COCKPIT_BRIDGE_PORT || 9334);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ok = (text) => ({ kind: "success", text });
const err = (text) => ({ kind: "error", text });

const GREEN = "GREEN";
const SEMI = "SEMI-AUTOMATIC";
const RED = "RED";

function writeAuditEntry(path, entry) {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 });
  const isNew = !existsSync(path);
  let prevHash = "";
  if (!isNew) {
    try {
      const lines = readFileSync(path, "utf8").trim().split("\n").filter(Boolean);
      const last = JSON.parse(lines[lines.length - 1]);
      prevHash = last.hash || "";
    } catch {}
  }
  const hash = createHash("sha256").update(prevHash + JSON.stringify(entry)).digest("hex");
  const chained = { ...entry, prevHash, hash };
  appendFileSync(path, JSON.stringify(chained) + "\n", { encoding: "utf8", mode: 0o600 });
  if (isNew) { try { chmodSync(path, 0o600); } catch {} }
}

function logEntry(action, tier, target, value, justification) {
  const entry = { ts: new Date().toISOString(), action, tier, target: target || "", value: value || "", justification };
  audit.push(entry);
  try { writeAuditEntry(AUDIT_FILE, entry); } catch {}
  return entry;
}

// Proactive secret redaction: driven by selector/label, independent of whether
// the DOM reported isPassword (which is undefined on failure/timeout).
function redactFillValue(selector, label, value, res = {}) {
  if ((res && res.isPassword) || SENSITIVE_SELECTOR_OR_LABEL.test(String(selector || "")) || SENSITIVE_SELECTOR_OR_LABEL.test(String(label || ""))) {
    return "••• (sensitive — never logged)";
  }
  return String(value ?? "").slice(0, 80);
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
  if (state.mode === "BRAKED") {
    if (state.allowOne) { state.allowOne = false; return null; }
    return err("🛑 BRAKE — the agent stopped before a final/legal button. It will NOT try another selector. Use /cockpit resume (or /cockpit step) to proceed deliberately.");
  }
  if (state.mode === "MANUAL") {
    if (state.allowOne) { state.allowOne = false; return null; }
    return err("🖐️ HUMAN AT THE WHEEL — the human has the wheel. /cockpit resume (or /cockpit step for exactly one action).");
  }
  return null;
}

// Extension transport preflight: same gate (BRAKED/MANUAL) + real-time
// human-touch check via a status round-trip.
async function extPreflight() {
  try {
    const s = await bridge.send("status", {}).catch(() => null);
    if (s && s.humanTouched) state.mode = "MANUAL";
  } catch {}
  if (state.mode === "BRAKED" || state.mode === "MANUAL") {
    if (state.allowOne) { state.allowOne = false; return null; }
    return err(`HUD: ${state.mode === "BRAKED" ? "🛑 BRAKE" : "🖐️ HUMAN AT THE WHEEL"} — use /cockpit resume (or /cockpit step) to proceed.`);
  }
  return null;
}

async function injectProbes() {
  await evaluate(`(() => {
    if (window.__cockpitHudInstalled) return true;
    window.__cockpitHudInstalled = true;
    window.__cockpitHumanTouched = false;
    window.addEventListener("mousedown", (e) => { if (e && e.isTrusted) window.__cockpitHumanTouched = true; }, true);
    window.addEventListener("keydown", (e) => { if (e && e.isTrusted) window.__cockpitHumanTouched = true; }, true);
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
  const str = String(input || "").trim();
  const tokens = [];
  let current = "";
  let quote = null;
  let tokenStartedWithQuote = false;
  let inToken = false;

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === "\\" && i + 1 < str.length) {
      const next = str[++i];
      current += quote ? next : "\\" + next;
      inToken = true;
      continue;
    }
    if (quote) {
      if (ch === quote) {
        if (!tokenStartedWithQuote) current += ch;
        quote = null;
      } else {
        current += ch;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      if (!inToken) {
        tokenStartedWithQuote = true;
        inToken = true;
      } else {
        tokenStartedWithQuote = false;
        current += ch;
      }
      continue;
    }
    if (/\s/.test(ch)) {
      if (inToken) {
        tokens.push(current);
        current = "";
        inToken = false;
        tokenStartedWithQuote = false;
      }
      continue;
    }
    current += ch;
    inToken = true;
  }
  if (quote !== null) throw new Error(`Unclosed quote (${quote}) in command input`);
  if (inToken) tokens.push(current);
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
  const shown = (res.kind === "select" ? "[select] " : "") + redactFillValue(sel, "", value, res);
  logEntry("fill", SEMI, sel, shown, "writes a value into a third-party page — mandatory verification");
  return ok(`Filled ${sel} (emerald border). ⚑ SEMI-AUTOMATIC — verify it in the report.`);
}

const VALID_TIERS = new Set(["GREEN", "SEMI-AUTOMATIC", "YELLOW", "RED"]);

// User-editable tier overrides: ~/.dsh/cockpit-browser/tiers.md, one
// "pattern → TIER" per line. Read FRESH on every decision (no cache), so a
// correction takes effect on the NEXT action and persists across restarts.
function loadTiersFromDisk() {
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

// RAM-cached tiers: loaded once at startup and only refreshed on /cockpit
// promote. A bash write to tiers.md by a danger-full-access agent is therefore
// ignored by the running host.
let trustedTiers = [];
let trustedTiersHash = "";
function refreshTrustedTiers() {
  trustedTiers = loadTiersFromDisk();
  try { trustedTiersHash = createHash("sha256").update(readFileSync(TIERS_FILE, "utf8")).digest("hex"); } catch { trustedTiersHash = ""; }
}
function loadTiers() {
  return trustedTiers;
}

function tierForLabel(label, rules = []) {
  const lab = normalizeText(label);
  if (!lab) return null;
  let exactMatchTier = null;
  let highestSubstringTier = null;
  for (const t of rules) {
    const pat = normalizeText(t.pattern);
    const tier = String(t.tier || "").toUpperCase();
    if (!pat || pat.length < 2 || !(tier in TIER_PRIORITY)) continue;
    if (lab === pat) {
      exactMatchTier = tier;
    } else if (pat.length >= 3 && lab.includes(pat)) {
      if (!highestSubstringTier || TIER_PRIORITY[tier] > TIER_PRIORITY[highestSubstringTier]) {
        highestSubstringTier = tier;
      }
    }
  }
  return exactMatchTier || highestSubstringTier;
}

// Constitutional rule: FORBIDDEN (danger) can only be downgraded by an EXACT
// override in tiers.md — a generic substring GREEN never disables the brake.
function resolveActionTier(label, rules = [], meta = {}) {
  const forbidden = isForbiddenLabel(label, meta);
  const override = tierForLabel(label, rules);
  const normLab = normalizeText(label);
  if (forbidden) {
    const hasExactOverride = rules.some(
      (r) => normalizeText(r.pattern) === normLab && (r.tier === "GREEN" || r.tier === "SEMI" || r.tier === "SEMI-AUTOMATIC" || r.tier === "YELLOW")
    );
    if (!hasExactOverride) return RED;
  }
  return override || (forbidden ? RED : SEMI);
}

function cmdTier(pattern, tierRaw) {
  if (!pattern) return err("tier requires <pattern> <tier>: /cockpit tier \"Create draft\" GREEN");
  const tier = String(tierRaw || "").toUpperCase().trim();
  if (!VALID_TIERS.has(tier)) return err("Tier must be one of: GREEN, SEMI-AUTOMATIC, YELLOW, RED.");
  try {
    mkdirSync(dirname(TIERS_PROPOSED_FILE), { recursive: true });
    appendFileSync(TIERS_PROPOSED_FILE, `${pattern} → ${tier}\n`, { mode: 0o600 });
  } catch (e) {
    return err(`Could not write the tier proposal: ${e && e.message ? e.message : e}`);
  }
  return ok(`✍️ Proposal recorded: "${pattern}" → ${tier}.\n\nIt is NOT active yet. Run /cockpit promote to approve it into tiers.md (the human gate).`);
}

function cmdPromote() {
  try {
    if (!existsSync(TIERS_PROPOSED_FILE)) return ok("No proposals pending.");
    const proposals = readFileSync(TIERS_PROPOSED_FILE, "utf8");
    if (!proposals.trim()) return ok("No proposals pending.");

    // Piggyback defense: verify the on-disk tiers.md still matches the trusted
    // RAM hash. If a bash-injected line is waiting in tiers.md, rebuild it from
    // the trusted RAM copy + the approved proposals instead of loading the
    // tampered file into memory.
    let diskHash = "";
    try { diskHash = createHash("sha256").update(readFileSync(TIERS_FILE, "utf8")).digest("hex"); } catch {}
    let tampered = diskHash !== trustedTiersHash;
    if (tampered) {
      const ramLines = trustedTiers.map((t) => `${t.pattern} → ${t.tier}`).join("\n");
      const rebuilt = [ramLines, proposals.trim()].filter(Boolean).join("\n") + "\n";
      writeFileSync(TIERS_FILE, rebuilt, { encoding: "utf8", mode: 0o600 });
    } else {
      appendFileSync(TIERS_FILE, proposals, { encoding: "utf8", mode: 0o600 });
    }
    writeFileSync(TIERS_PROPOSED_FILE, "", { encoding: "utf8", mode: 0o600 });
    refreshTrustedTiers();
    return ok(`✅ Promoted proposals into ${TIERS_FILE}:\n${proposals.trim()}${tampered ? "\n\n⚠️ Detected and discarded a tampered line in tiers.md (rebuilt from the trusted RAM copy)." : ""}`);
  } catch (e) {
    return err(`Could not promote proposals: ${e && e.message ? e.message : e}`);
  }
}

async function cmdClick(sel) {
  if (!sel) return err("click requires <selector>: /cockpit click \"button.envoyer\"");
  const p = await preflight();
  if (p) return p;
  const c = await locate(sel);
  if (!c) return err(`No element matched selector ${sel} (searched the main frame and iframes).`);
  const meta = await evaluateIn(c.contextId, `(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return null; const anc = el.closest('button, a, [role="button"], [role="link"], [role="menuitem"], [role="tab"], label'); const target = anc || el; const lab = (n) => n ? ((n.getAttribute("aria-label") || n.getAttribute("title") || n.innerText || n.textContent || "").trim().slice(0, 200)) : ""; const label = [lab(target), lab(el)].filter(Boolean).join(" | ").slice(0, 300); let isSubmit = false; if (target.matches && (target.matches('input[type="submit"], button[type="submit"]'))) isSubmit = true; else if (target.tagName === "BUTTON" && !target.hasAttribute("type") && target.closest && target.closest("form")) isSubmit = true; const href = (target.getAttribute && target.getAttribute("href")) || (target.form && target.form.action) || ""; return { label, isSubmit, href }; })()`);
  if (meta === null) return err(`No element matched selector ${sel}.`);
  const label = (meta && meta.label) || "";
  const override = tierForLabel(label, loadTiers());
  const tier = resolveActionTier(label, loadTiers(), { isSubmit: meta && meta.isSubmit, href: meta && meta.href });
  // Human-approved pending YELLOW: consume the one-time approval for this exact click.
  if (tier === "YELLOW" && state.pendingYellow && state.pendingYellow.sel === sel && state.pendingYellow.label === label) {
    state.pendingYellow = null;
    state.mode = "AGENTE";
    tier = "SEMI";
  }
  if (tier === RED) {
    state.mode = "BRAKED";
    logEntry("click", RED, sel, label, override ? "human override: RED" : "refused — final/legal/committing button");
    return ok(`🛑 BRAKE — I stopped at "${label}"${override ? " (you marked it RED)" : " because it is a final/legal/committing click (send, pay, authorize, create, sign in)"}.\n\n✅ I already left ready: ${readySummary()}\n\n⏳ You still need to (you, human): ${missingSummary()}`);
  }
  if (tier === "YELLOW") {
    state.pendingYellow = { sel, label };
    state.mode = "MANUAL";
    logEntry("click", "YELLOW", sel, label, "propose and wait");
    return ok(`🟡 Propose first — "${label}" is marked YELLOW. Run /cockpit step to authorize exactly this click, then re-run it.`);
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

function computeKpis(entries = []) {
  const mutating = entries.filter((e) => e && (e.action === "click" || e.action === "fill"));
  let green = 0, semi = 0, yellow = 0, red = 0;
  for (const e of mutating) {
    if (e.tier === GREEN) green++;
    else if (e.tier === SEMI || e.tier === "SEMI-AUTOMATIC") semi++;
    else if (e.tier === "YELLOW") yellow++;
    else if (e.tier === RED) red++;
  }
  const total = green + semi + yellow + red;
  if (total === 0) return { total: 0, autonomy: 0, intervention: 0, breakdown: { green, semi, yellow, red } };
  return {
    total,
    autonomy: Number(((green + semi) / total).toFixed(4)),
    intervention: Number(((yellow + red) / total).toFixed(4)),
    breakdown: { green, semi, yellow, red },
  };
}

function cmdKpi() {
  const all = readAllAudit();
  const k = computeKpis(all);
  const { green, semi, yellow, red } = k.breakdown;
  const autonomyPct = Math.round(k.autonomy * 100);
  const interventionPct = Math.round(k.intervention * 100);
  const redLabels = {};
  for (const e of all) if (e.tier === RED) { const key = e.value || e.target || "?"; redLabels[key] = (redLabels[key] || 0) + 1; }
  const topRed = Object.entries(redLabels).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k2, n]) => `${k2} (×${n})`).join(" · ");
  let verdict;
  if (k.total === 0) verdict = "⚪ No activity yet — use /cockpit open <url> and do something.";
  else if (autonomyPct >= 80) verdict = "✅ The system works — the agent did most of the work.";
  else if (autonomyPct >= 50) verdict = "🟡 Mixed — review the handovers to the human below; some steps could have been automated.";
  else verdict = "🔧 Refine the plugin — too much human intervention on automatable tasks.";
  const lines = [
    "— Cockpit Efficiency KPI —",
    "",
    `Mutating actions: ${k.total}  (autonomous ${green + semi} = ${green} GREEN + ${semi} ⚑SEMI · human ${yellow + red} = ${red} 🛑RED + ${yellow} 🟡YELLOW)`,
    `Autonomy: ${autonomyPct}%   ·   Human intervention: ${interventionPct}%`,
    "",
    `Verdict: ${verdict}`,
    "",
    `Tasks handed to the human (review which ones WERE automatable): ${red ? topRed : "(none)"}`,
    "",
    "Reading: a RED on a final/legal button (Envoyer/Payer/Create/Sign in) is CORRECT by design — it does not count as a failure. A RED (or YELLOW) on an action that COULD have been automated is bad automation management: refine the FORBIDDEN regex or the tier.",
  ];
  return ok(lines.join("\n"));
}

const USAGE = "Usage: /cockpit <open <url> | read [selector] | fill <selector> <value> | click <selector> | screenshot [file] | tabs | switch <n> | newtab [url] | status | pause | resume | step | report | kpi | tier <pattern> <tier> | promote | close>";

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
  const g = await extPreflight(); if (g) return g;
  const res = await bridge.send("fill", { selector: sel, value: String(value) });
  if (!res || res.done !== true) return err(`Could not fill ${sel}.`);
  const shown = (res.kind === "select" ? "[select] " : "") + redactFillValue(sel, "", value, res);
  logEntry("fill", SEMI, sel, shown, "writes a value into a third-party page — mandatory verification");
  return ok(`Filled ${sel} (emerald border). ⚑ SEMI-AUTOMATIC — verify it in the report.`);
}

async function extClick(sel) {
  if (!sel) return err("click requires <selector>: /cockpit click \"button.envoyer\"");
  const g = await extPreflight(); if (g) return g;
  const meta = await bridge.send("getLabel", { selector: sel });
  if (meta === null) return err(`No element matched selector ${sel}.`);
  const label = (meta && meta.label) || "";
  const override = tierForLabel(label, loadTiers());
  const tier = resolveActionTier(label, loadTiers(), { isSubmit: meta && meta.isSubmit, href: meta && meta.href });
  // Human-approved pending YELLOW: consume the one-time approval for this exact click.
  if (tier === "YELLOW" && state.pendingYellow && state.pendingYellow.sel === sel && state.pendingYellow.label === label) {
    state.pendingYellow = null;
    state.mode = "AGENTE";
    tier = "SEMI";
  }
  if (tier === RED) {
    state.mode = "BRAKED";
    logEntry("click", RED, sel, label, override ? "human override: RED" : "refused — final/legal/committing button");
    return ok(`🛑 BRAKE — I stopped at "${label}"${override ? " (you marked it RED)" : " because it is a final/legal/committing click (send, pay, authorize, create, sign in)"}.\n\n✅ I already left ready: ${readySummary()}\n\n⏳ You still need to (you, human): ${missingSummary()}`);
  }
  if (tier === "YELLOW") {
    state.pendingYellow = { sel, label };
    state.mode = "MANUAL";
    logEntry("click", "YELLOW", sel, label, "propose and wait");
    return ok(`🟡 Propose first — "${label}" is marked YELLOW. Run /cockpit step to authorize exactly this click, then re-run it.`);
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
        case "promote": return cmdPromote();
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
      case "promote": return cmdPromote();
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
const inject = ["commands", "tools"];

function apply(ctx) {
  refreshTrustedTiers();
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
      hint: "<open <url> | read [selector] | fill <selector> <value> | click <selector> | screenshot [file] | tabs | switch <n> | newtab [url] | status | pause | resume | step | report | kpi | tier <pattern> <tier> | promote | close>",
      attachments: false,
    },
    handler: (invocation) => executeCockpit(invocation),
  });
  try {
    new CockpitBridge(ctx);
  } catch {}

  // The agent-callable tool: the SAME operations as the /cockpit slash
  // command (one operation, two callers). Registered PER-AGENT (scoped, via
  // agent/created) so it appears in each agent's model-facing tool set; a host
  // registration alone is not model-visible. The brake stays — the tool's click
  // runs the same FORBIDDEN check, so a committing click is refused and the
  // final click remains the human's.
  ctx.on("agent/created", (agent) => {
    ctx.logger.info("cockpit-browser: agent/created fired — registering the cockpit tool");
    agent.ctx.effect(() => {
      const unregister = agent.ctx.tools.register(defineTool({
        name: "cockpit",
    description:
      "Drive the user's Chrome browser (the cockpit) under the J.Franco guardrails. "
      + "action=read returns the visible page text; fill writes into a field (emerald border, logged); "
      + "click clicks a NON-committing control; screenshot captures the visible tab; open navigates; "
      + "status shows the HUD. The brake refuses committing clicks (send/pay/confirm/authorize/create/sign in) — those stay the human's.",
    parameters: {
      action: {
        type: "string",
        required: true,
        enum: ["open", "read", "fill", "click", "screenshot", "status", "report", "kpi", "pause", "resume", "step"],
        description: "The cockpit operation to run.",
      },
      selector: { type: "string", description: "CSS selector for read/fill/click." },
      value: { type: "string", description: "Value to write into the field (fill)." },
      url: { type: "string", description: "URL to open (open)." },
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: { text: { type: "string", required: true } },
      },
      render: (_args, value) => [{ type: "text", text: value.text }],
      presentationMeta: (_args, _value) => ({}),
    },
    async execute(args) {
      const q = (s) => (s === undefined || s === null) ? "" : String(s);
      let raw = String(args.action);
      if (args.action === "open") raw += " " + q(args.url);
      else if (args.action === "read" && args.selector) raw += " " + JSON.stringify(q(args.selector));
      else if (args.action === "fill") raw += " " + JSON.stringify(q(args.selector)) + " " + JSON.stringify(q(args.value));
      else if (args.action === "click") raw += " " + JSON.stringify(q(args.selector));
      const res = await executeCockpit({ rawInput: raw });
      return { text: res.text };
    },
      }));
      return () => unregister();
    }, "cockpit: tool");
  });
}

export { apply, inject, name };
