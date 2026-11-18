#!/usr/bin/env node
/**
 * Fanal & Fanal Studio — Automated Perceptual Contrast & Anti-Camouflage Auditor.
 *
 * Part A (all OS, zero external deps):
 *   - Forbids off-brand dark-terminal / pink palette tokens across all UIs.
 *   - Verifies static gradient stop contrast & anti-camouflage medallion classes.
 *
 * Part B (headless Chrome CDP via Node built-in WebSocket when Chrome/Edge is available,
 *         or required when DSH_REQUIRE_CHROME=1):
 *   - Boots isolated temporary client (:ephemeral) and studio (:ephemeral) servers.
 *   - Walks every screen in Light and Dark themes:
 *       1. Language onboarding (#langStep)
 *       2. 8-step Setup Wizard (Steps 0-7 incl. Solo 11 trades + Micro 11 sectors)
 *       3. Login + Progressive Registration (#setupScale -> #setupSectorWrap)
 *       4. Authenticated Owner Cockpit (Simple Inbox-First + Advanced tabs + Settings + Studio Telemetry)
 *       5. Wallboard (#wallView)
 *       6. Embedded Side Panel (/panel — auth gate + unlocked)
 *       7. Electron Welcome (apps/desktop/welcome.html — Box 1 -> Box 2 + Light/Dark)
 *   - Enforces WCAG 2.1 contrast (>= 4.5:1 normal text, >= 3.0:1 large text/UI) across
 *     composited ancestor RGBA + gradient stops, and CIELAB Delta-E >= 18 for SVG/medallions.
 */

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FORBIDDEN_PALETTE_RE = /#090d16|#020617|#064e3b|#38bdf8|#1b2436|#fff5f5/i;

function getFreePort() {
  return new Promise((res, rej) => {
    const srv = createServer();
    srv.unref();
    srv.on("error", rej);
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      srv.close((e) => (e ? rej(e) : res(port)));
    });
  });
}

async function waitHealthy(base) {
  for (let i = 0; i < 60; i += 1) {
    try {
      const r = await fetch(`${base}/api/health`);
      if (r.ok) return r.json();
    } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`Supervisor failed health check at ${base}`);
}

function findChromeBinary() {
  const envBin = String(process.env.CHROME_BIN || "").trim();
  if (envBin && existsSync(envBin)) return envBin;
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.nextId = 1;
    this.pending = new Map();
    this.eventWaiters = new Map();
  }
  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((res, rej) => {
      this.ws.addEventListener("open", res, { once: true });
      this.ws.addEventListener("error", rej, { once: true });
    });
    this.ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(String(ev.data));
      if (msg.id && this.pending.has(msg.id)) {
        const { res, rej } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) rej(new Error(msg.error.message || JSON.stringify(msg.error)));
        else res(msg.result);
      } else if (msg.method && this.eventWaiters.has(msg.method)) {
        const arr = this.eventWaiters.get(msg.method);
        this.eventWaiters.delete(msg.method);
        for (const fn of arr) fn(msg.params || {});
      }
    });
  }
  onceEvent(method, timeoutMs = 4000) {
    return new Promise((res) => {
      const timer = setTimeout(() => {
        const arr = this.eventWaiters.get(method) || [];
        const rest = arr.filter((f) => f !== handler);
        if (rest.length) this.eventWaiters.set(method, rest);
        else this.eventWaiters.delete(method);
        res(null);
      }, timeoutMs);
      const handler = (params) => {
        clearTimeout(timer);
        res(params);
      };
      const arr = this.eventWaiters.get(method) || [];
      arr.push(handler);
      this.eventWaiters.set(method, arr);
    });
  }
  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((res, rej) => {
      this.pending.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async evalAsync(expr) {
    const r = await this.send("Runtime.evaluate", {
      expression: `(async () => { ${expr} })()`,
      awaitPromise: true,
      returnByValue: true,
    });
    if (r.exceptionDetails) {
      throw new Error(`CDP eval failed: ${r.exceptionDetails.text || JSON.stringify(r.exceptionDetails.exception)}`);
    }
    return r.result ? r.result.value : undefined;
  }
  async close() {
    try { this.ws?.close(); } catch {}
  }
}

async function startChrome() {
  const bin = findChromeBinary();
  if (!bin) return null;
  const userDataDir = mkdtempSync(join(tmpdir(), "fanal-contrast-chrome-"));
  const chromeArgs = [
    "--headless=new",
    "--disable-gpu",
    "--disable-software-rasterizer",
    "--disable-dev-shm-usage",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--disable-background-networking",
    "--disable-sync",
    "--window-size=1440,960",
    "--remote-debugging-port=0",
    `--user-data-dir=${userDataDir}`,
  ];
  if (process.platform === "linux") {
    chromeArgs.push("--no-sandbox", "--disable-setuid-sandbox");
  }
  chromeArgs.push("about:blank");

  const proc = spawn(
    bin,
    chromeArgs,
    {
      env: {
        ...process.env,
        ...(process.platform === "linux" ? { DBUS_SESSION_BUS_ADDRESS: "/dev/null" } : {}),
      },
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  const wsEndpoint = await new Promise((res, rej) => {
    let stderr = "";
    const timer = setTimeout(() => {
      try { proc.kill("SIGKILL"); } catch {}
      rej(new Error(`Chrome DevTools startup timeout: ${stderr.slice(-400)}`));
    }, 25000);
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
      const m = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (m) {
        clearTimeout(timer);
        res(m[1]);
      }
    });
    proc.on("exit", (code) => {
      clearTimeout(timer);
      rej(new Error(`Chrome exited prematurely (${code}): ${stderr.slice(-400)}`));
    });
  });

  const portMatch = wsEndpoint.match(/^ws:\/\/([^/]+)/);
  const httpBase = `http://${portMatch[1]}`;
  const resp = await fetch(`${httpBase}/json/new?about:blank`, { method: "PUT" }).catch(() => null);
  let targetWs = wsEndpoint;
  if (resp && resp.ok) {
    const info = await resp.json();
    if (info.webSocketDebuggerUrl) targetWs = info.webSocketDebuggerUrl;
  } else {
    const listResp = await fetch(`${httpBase}/json/list`);
    const list = await listResp.json();
    const pageTarget = list.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
    if (pageTarget) targetWs = pageTarget.webSocketDebuggerUrl;
  }

  const cdp = new CDPClient(targetWs);
  await cdp.connect();
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");

  return {
    cdp,
    stop: async () => {
      try { await cdp.close(); } catch {}
      const exitPromise = proc.exitCode === null
        ? new Promise((r) => {
            const t = setTimeout(r, 1200);
            proc.once("exit", () => { clearTimeout(t); r(); });
          })
        : Promise.resolve();
      try { proc.kill("SIGKILL"); } catch {}
      await exitPromise;
      try { rmSync(userDataDir, { recursive: true, force: true, maxRetries: 8, retryDelay: 150 }); } catch {}
    },
  };
}

function auditStaticPalettes() {
  const files = [
    "supervisor/dashboard.html",
    "ui/panel.html",
    "apps/desktop/welcome.html",
    "apps/desktop/main.js",
  ];
  for (const rel of files) {
    const full = join(ROOT, rel);
    const text = readFileSync(full, "utf8");
    const hit = text.match(FORBIDDEN_PALETTE_RE);
    assert.equal(hit, null, `${rel} contains forbidden off-brand palette color ${hit && hit[0]}`);
  }
  const dash = readFileSync(join(ROOT, "supervisor/dashboard.html"), "utf8");
  for (const cls of ["brand-mark", "lang-medallion", "splash-medallion"]) {
    assert.ok(dash.includes(cls), `supervisor/dashboard.html missing anti-camouflage ${cls}`);
  }
  const welcome = readFileSync(join(ROOT, "apps/desktop/welcome.html"), "utf8");
  assert.ok(welcome.includes("welcome-medallion"), "apps/desktop/welcome.html missing .welcome-medallion");
}

// Browser-side WCAG 2.1 + CIELAB Delta-E measurement script injected into CDP targets.
const INJECTED_AUDITOR_FN = `
window.__auditFanalContrast = function(screenLabel) {
  function parseRgba(str) {
    if (!str) return null;
    const m = str.match(/rgba?\\(\\s*(\\d+(?:\\.\\d+)?)[,\\s]+(\\d+(?:\\.\\d+)?)[,\\s]+(\\d+(?:\\.\\d+)?)(?:[,\\/\\s]+(\\d+(?:\\.\\d+)?))?\\s*\\)/i);
    if (!m) return null;
    return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4])];
  }
  function parseGradientStops(bgImg) {
    if (!bgImg || bgImg === "none" || !bgImg.includes("gradient")) return [];
    const stops = [];
    const re = /rgba?\\(\\s*\\d+(?:\\.\\d+)?[,\\s]+\\d+(?:\\.\\d+)?[,\\s]+\\d+(?:\\.\\d+)?(?:[,\\/\\s]+\\d+(?:\\.\\d+)?)?\\s*\\)/gi;
    let m;
    while ((m = re.exec(bgImg)) !== null) {
      const c = parseRgba(m[0]);
      if (c) stops.push(c);
    }
    return stops;
  }
  function over(fg, bg) {
    const a = fg[3];
    const inv = 1 - a;
    return [fg[0] * a + bg[0] * inv, fg[1] * a + bg[1] * inv, fg[2] * a + bg[2] * inv, 1];
  }
  function srgbToLin(c) {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  }
  function relLum(rgb) {
    return 0.2126 * srgbToLin(rgb[0]) + 0.7152 * srgbToLin(rgb[1]) + 0.0722 * srgbToLin(rgb[2]);
  }
  function contrastRatio(fg, bg) {
    const l1 = relLum(fg), l2 = relLum(bg);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }
  function rgbToLab(rgb) {
    const r = srgbToLin(rgb[0]), g = srgbToLin(rgb[1]), b = srgbToLin(rgb[2]);
    let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
    let y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000;
    let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
    const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    x = f(x); y = f(y); z = f(z);
    return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
  }
  function deltaE(rgb1, rgb2) {
    const a = rgbToLab(rgb1), b = rgbToLab(rgb2);
    return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  }
  function isEffectivelyVisible(el) {
    if (!el || el.nodeType !== 1) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    let cur = el;
    while (cur && cur.nodeType === 1) {
      const cs = getComputedStyle(cur);
      if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) <= 0.04) return false;
      cur = cur.parentElement;
    }
    return true;
  }
  function compositeBackgroundCandidates(el) {
    const chain = [];
    let cur = el;
    while (cur && cur.nodeType === 1) {
      chain.unshift(cur);
      cur = cur.parentElement;
    }
    const isDark = document.body.classList.contains("dark");
    let candidates = [isDark ? [19, 17, 41, 1] : [248, 250, 252, 1]];
    for (const node of chain) {
      const cs = getComputedStyle(node);
      const stops = parseGradientStops(cs.backgroundImage);
      const bg = parseRgba(cs.backgroundColor);
      if (stops.length) {
        const next = [];
        for (const base of candidates) {
          for (const st of stops) next.push(over(st, base));
        }
        // Keep bounded unique sample (worst extremes + middle)
        candidates = next.slice(0, 6);
      }
      if (bg && bg[3] > 0.01) {
        candidates = candidates.map((base) => over(bg, base));
      }
    }
    return candidates;
  }
  function hasOwnText(el) {
    for (const n of el.childNodes) {
      if (n.nodeType === 3 && n.nodeValue && n.nodeValue.trim().length > 0) return true;
    }
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") return true;
    return false;
  }

  const failures = [];
  let checkedCount = 0;

  // 1. Audit visible text elements & form controls
  const all = document.querySelectorAll("body *");
  for (const el of all) {
    const tag = el.tagName;
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT" || tag === "OPTION" || tag === "SVG" || tag === "PATH" || tag === "RECT" || tag === "CIRCLE" || tag === "LINE" || tag === "POLYGON") continue;
    if (!hasOwnText(el)) continue;
    if (el.disabled || el.getAttribute("aria-disabled") === "true") continue;
    if (!isEffectivelyVisible(el)) continue;

    const cs = getComputedStyle(el);
    let fg = parseRgba(cs.color);
    if (!fg) continue;
    // Skip transparent helper text only if intentionally hidden (opacity already filtered)
    if (fg[3] === 0) continue;

    const fontSize = parseFloat(cs.fontSize || "14");
    const fontWeight = parseInt(cs.fontWeight || "400", 10) || 400;
    const isLarge = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
    const minRatio = isLarge ? 3.0 : 4.5;

    const bgs = compositeBackgroundCandidates(el);
    let worstRatio = Infinity;
    let worstBg = bgs[0];
    for (const bg of bgs) {
      const effFg = fg[3] < 1 ? over(fg, bg) : fg;
      const ratio = contrastRatio(effFg, bg);
      if (ratio < worstRatio) {
        worstRatio = ratio;
        worstBg = bg;
      }
    }
    checkedCount++;
    if (worstRatio < minRatio) {
      const txt = (el.tagName === "INPUT" || el.tagName === "SELECT") ? (el.value || el.placeholder || el.id || tag) : el.textContent.trim().slice(0, 48);
      failures.push({
        screen: screenLabel,
        kind: "text",
        selector: tag.toLowerCase() + (el.id ? "#" + el.id : "") + (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\\s+/).slice(0, 2).join(".") : ""),
        text: txt,
        ratio: Number(worstRatio.toFixed(2)),
        required: minRatio,
        fg: fg.slice(0, 3).map((x) => Math.round(x)),
        bg: worstBg.slice(0, 3).map((x) => Math.round(x)),
      });
    }

    // Also inspect native <select> options computed style vs select background
    if (tag === "SELECT") {
      const optBg = compositeBackgroundCandidates(el)[0];
      const opts = el.querySelectorAll("option");
      if (opts.length) {
        const ocs = getComputedStyle(opts[0]);
        const ofg = parseRgba(ocs.color) || fg;
        const obgRaw = parseRgba(ocs.backgroundColor);
        const obg = obgRaw && obgRaw[3] > 0.1 ? over(obgRaw, optBg) : optBg;
        const oratio = contrastRatio(ofg, obg);
        if (oratio < 4.5) {
          failures.push({
            screen: screenLabel,
            kind: "select-option",
            selector: "select" + (el.id ? "#" + el.id : "") + " option",
            text: opts[0].textContent.trim().slice(0, 40),
            ratio: Number(oratio.toFixed(2)),
            required: 4.5,
            fg: ofg.slice(0, 3).map((x) => Math.round(x)),
            bg: obg.slice(0, 3).map((x) => Math.round(x)),
          });
        }
      }
    }
  }

  // 2. Audit medallions & SVG logos for perceptual camouflage (CIELAB Delta-E)
  const medallions = document.querySelectorAll(".brand-mark, .lang-medallion, .splash-medallion, .welcome-medallion");
  for (const med of medallions) {
    if (!isEffectivelyVisible(med)) continue;
    const medBgs = compositeBackgroundCandidates(med);
    const parentBgs = med.parentElement ? compositeBackgroundCandidates(med.parentElement) : medBgs;
    const sepDelta = deltaE(medBgs[0], parentBgs[0]);
    checkedCount++;
    if (sepDelta < 15) {
      failures.push({
        screen: screenLabel,
        kind: "medallion-separation",
        selector: "." + String(med.className).trim().split(/\\s+/).join("."),
        text: "medallion vs parent surface",
        deltaE: Number(sepDelta.toFixed(1)),
        requiredDeltaE: 15,
        fg: medBgs[0].slice(0, 3).map((x) => Math.round(x)),
        bg: parentBgs[0].slice(0, 3).map((x) => Math.round(x)),
      });
    }
    // Check visible SVG stops/strokes/fills inside the medallion
    const stops = med.querySelectorAll("svg stop, svg path, svg rect, svg circle, svg polygon");
    let testedSvg = false;
    for (const node of stops) {
      let col = null;
      if (node.tagName.toLowerCase() === "stop") {
        const sc = getComputedStyle(node).stopColor || node.getAttribute("stop-color");
        const parsed = parseRgba(sc);
        if (parsed) col = parsed;
      } else {
        const cs = getComputedStyle(node);
        const stroke = cs.stroke && cs.stroke !== "none" ? parseRgba(cs.stroke) : null;
        const fill = cs.fill && cs.fill !== "none" ? parseRgba(cs.fill) : null;
        col = stroke || fill;
      }
      if (!col || col[3] < 0.2) continue;
      testedSvg = true;
      const de = deltaE(col, medBgs[0]);
      if (de < 18) {
        failures.push({
          screen: screenLabel,
          kind: "svg-camouflage",
          selector: "." + String(med.className).trim().split(/\\s+/).join(".") + " svg " + node.tagName.toLowerCase(),
          text: "logo stroke/fill camouflaged in medallion",
          deltaE: Number(de.toFixed(1)),
          requiredDeltaE: 18,
          fg: col.slice(0, 3).map((x) => Math.round(x)),
          bg: medBgs[0].slice(0, 3).map((x) => Math.round(x)),
        });
      }
    }
    if (!testedSvg) {
      const svgCol = [88, 63, 214];
      const de = deltaE(svgCol, medBgs[0]);
      if (de < 18) {
        failures.push({
          screen: screenLabel,
          kind: "svg-camouflage",
          selector: "." + String(med.className).trim().split(/\\s+/).join("."),
          text: "brand SVG vs medallion",
          deltaE: Number(de.toFixed(1)),
          requiredDeltaE: 18,
        });
      }
    }
  }

  return { screen: screenLabel, checkedCount, failures };
};
`;

async function navigateAndInject(cdp, url) {
  const loaded = cdp.onceEvent("Page.loadEventFired", 4000);
  await cdp.send("Page.navigate", { url });
  await loaded;
  await new Promise((r) => setTimeout(r, 250));
  await cdp.send("Runtime.evaluate", { expression: INJECTED_AUDITOR_FN });
}

async function auditScreen(cdp, screenLabel, results) {
  const res = await cdp.evalAsync(`return window.__auditFanalContrast(${JSON.stringify(screenLabel)});`);
  results.push(res);
  return res;
}

async function runChromeAudit() {
  const chrome = await startChrome();
  if (!chrome) {
    if (process.env.DSH_REQUIRE_CHROME === "1") {
      throw new Error("DSH_REQUIRE_CHROME=1 set, but Chrome/Chromium binary was not found");
    }
    console.log("contrast-audit: Part A static audit passed; Chrome not installed, skipping live DOM CDP pass");
    return;
  }

  const { cdp, stop } = chrome;
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 840, deviceScaleFactor: 1, mobile: false });
  const tmpClientDir = mkdtempSync(join(tmpdir(), "fanal-contrast-client-"));
  const tmpStudioDir = mkdtempSync(join(tmpdir(), "fanal-contrast-studio-"));
  const clientPort = await getFreePort();
  const studioPort = await getFreePort();

  const clientProc = spawn(
    process.execPath,
    [join(ROOT, "supervisor", "server.js")],
    {
      cwd: ROOT,
      env: {
        ...process.env,
        DSH_SUPERVISOR_PORT: String(clientPort),
        DSH_SUPERVISOR_DATA: tmpClientDir,
        DSH_SESSION_FILE: join(tmpClientDir, "session.json"),
        DSH_DISABLE_HTTPS: "1",
        FANAL_EDITION: "client",
      },
      stdio: ["ignore", "pipe", "pipe"],
    }
  );
  const studioProc = spawn(
    process.execPath,
    [join(ROOT, "supervisor", "server.js")],
    {
      cwd: ROOT,
      env: {
        ...process.env,
        DSH_SUPERVISOR_PORT: String(studioPort),
        DSH_SUPERVISOR_DATA: tmpStudioDir,
        DSH_SESSION_FILE: join(tmpStudioDir, "session.json"),
        DSH_DISABLE_HTTPS: "1",
        FANAL_EDITION: "studio",
      },
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  const results = [];
  try {
    const clientBase = `http://127.0.0.1:${clientPort}`;
    const studioBase = `http://127.0.0.1:${studioPort}`;
    await Promise.all([waitHealthy(clientBase), waitHealthy(studioBase)]);

    // --- 1. Fresh Onboarding (#langStep) + 8-Step Wizard + Setup Cascade ---
    await navigateAndInject(cdp, `${clientBase}/`);
    await auditScreen(cdp, "dashboard:langStep(light)", results);
    await cdp.evalAsync(`document.getElementById("darkBtn").click();`);
    await auditScreen(cdp, "dashboard:langStep(dark)", results);
    await cdp.evalAsync(`document.getElementById("darkBtn").click();`);

    // Pick French -> Wizard Step 0 -> Step 1 -> Step 2 (Solo + Micro) -> Steps 3-7 -> Finish
    await cdp.evalAsync(`
      const fr = document.querySelector('#langStepList .langbtn[data-l="fr"]') || document.querySelector('#langStepList .langbtn');
      if (fr) fr.click();
      await new Promise((r) => setTimeout(r, 1100));
    `);
    await auditScreen(cdp, "wizard:step0(light)", results);
    await cdp.evalAsync(`document.getElementById("wizNext").click(); await new Promise((r) => setTimeout(r, 200));`);
    await auditScreen(cdp, "wizard:step1-scale(light)", results);
    await cdp.evalAsync(`
      const biz = document.getElementById("wizBizInput");
      if (biz) biz.value = "Cabinet Contraste";
      const solo = document.querySelector('.wiz-sectors .ws[data-scale="AUTONOMOUS_SOLO"]');
      if (solo) solo.click();
      document.getElementById("wizNext").click();
      await new Promise((r) => setTimeout(r, 200));
    `);
    await auditScreen(cdp, "wizard:step2-solo11(light)", results);
    await cdp.evalAsync(`document.getElementById("darkBtn").click();`);
    await auditScreen(cdp, "wizard:step2-solo11(dark)", results);
    await cdp.evalAsync(`document.getElementById("darkBtn").click();`);

    // Switch wizard to MICRO_SINGLE_OWNER and inspect SCIAN sectors in Step 2
    await cdp.evalAsync(`
      document.getElementById("wizBack").click();
      await new Promise((r) => setTimeout(r, 200));
      const micro = document.querySelector('.wiz-sectors .ws[data-scale="MICRO_SINGLE_OWNER"]');
      if (micro) micro.click();
      document.getElementById("wizNext").click();
      await new Promise((r) => setTimeout(r, 200));
    `);
    await auditScreen(cdp, "wizard:step2-micro11(light)", results);

    // Step 3 (BYOK) + Dark
    await cdp.evalAsync(`document.getElementById("wizNext").click(); await new Promise((r) => setTimeout(r, 200));`);
    await auditScreen(cdp, "wizard:step3-byok(light)", results);
    await cdp.evalAsync(`document.getElementById("darkBtn").click();`);
    await auditScreen(cdp, "wizard:step3-byok(dark)", results);
    await cdp.evalAsync(`document.getElementById("darkBtn").click();`);

    // Steps 4 -> 5 (Closed Constitution: fill mandatory Loi 25 + initials before advancing) -> 6 (Recap) -> 7 (Finish -> Login + Setup)
    await cdp.evalAsync(`document.getElementById("wizNext").click(); await new Promise((r) => setTimeout(r, 240));`);
    await auditScreen(cdp, "wizard:step4(light)", results);
    await cdp.evalAsync(`document.getElementById("wizNext").click(); await new Promise((r) => setTimeout(r, 240));`);
    await cdp.evalAsync(`
      const rn = document.getElementById("wizConsRprpName");
      const re = document.getElementById("wizConsRprpEmail");
      const ri = document.getElementById("wizConsInitials");
      if (rn) { rn.value = "Audit RPRP"; rn.dispatchEvent(new Event("input")); }
      if (re) { re.value = "rprp@cabinet-contraste.example"; re.dispatchEvent(new Event("input")); }
      if (ri) { ri.value = "AC"; ri.dispatchEvent(new Event("input")); }
    `);
    await auditScreen(cdp, "wizard:step5(light)", results);
    await cdp.evalAsync(`document.getElementById("wizNext").click(); await new Promise((r) => setTimeout(r, 240));`);
    await auditScreen(cdp, "wizard:step6(light)", results);
    await cdp.evalAsync(`document.getElementById("wizNext").click(); await new Promise((r) => setTimeout(r, 240));`);
    await auditScreen(cdp, "wizard:step7(light)", results);
    await cdp.evalAsync(`document.getElementById("wizNext").click(); await new Promise((r) => setTimeout(r, 280));`);

    // Setup Login + Box 1 -> Box 2 cascade + Readiness Check + Password Rules in Light & Dark
    await auditScreen(cdp, "login+setup:summary(light)", results);
    await cdp.evalAsync(`
      const reqBtn = document.getElementById("togglePwReqBtn");
      if (reqBtn) reqBtn.click();
      const editBtn = document.getElementById("setupMetaEditBtn");
      if (editBtn && !editBtn.closest(".hidden")) editBtn.click();
      const sc = document.getElementById("setupScale");
      if (sc) { sc.value = "AUTONOMOUS_SOLO"; sc.dispatchEvent(new Event("change")); }
    `);
    await auditScreen(cdp, "login+setup:cascade-open(light)", results);
    await cdp.evalAsync(`document.getElementById("darkBtn").click();`);
    await auditScreen(cdp, "login+setup:cascade-open(dark)", results);
    await cdp.evalAsync(`document.getElementById("darkBtn").click();`);

    // Create owner account via UI -> post-setup login screen (#postSetupBanner) -> login into Owner Cockpit
    await cdp.evalAsync(`
      const sc = document.getElementById("setupScale");
      if (sc) { sc.value = "SME_CELL"; sc.dispatchEvent(new Event("change")); }
      const sec = document.getElementById("setupSector");
      if (sec) { sec.value = "restaurant"; sec.dispatchEvent(new Event("change")); }
      const bn = document.getElementById("setupConsBizName");
      const reg = document.getElementById("setupConsTaxRegime");
      const tps = document.getElementById("setupConsTps");
      const tvq = document.getElementById("setupConsTvq");
      const rn = document.getElementById("setupConsRprpName");
      const re = document.getElementById("setupConsRprpEmail");
      const ri = document.getElementById("setupConsInitials");
      if (bn) { bn.value = "Bistro Audit"; bn.dispatchEvent(new Event("input")); }
      if (reg) { reg.value = "PETIT_FOURNISSEUR_EXEMPT"; reg.dispatchEvent(new Event("change")); }
      if (tps) tps.value = "";
      if (tvq) tvq.value = "";
      if (rn) { rn.value = "Owner Audit"; rn.dispatchEvent(new Event("input")); }
      if (re) { re.value = "rprp@bistro-audit.example"; re.dispatchEvent(new Event("input")); }
      if (ri) { ri.value = "OA"; ri.dispatchEvent(new Event("input")); }
      const su = document.getElementById("setupUser");
      const sp = document.getElementById("setupPass");
      const scf = document.getElementById("setupPassConfirm");
      su.value = "auditowner"; su.dispatchEvent(new Event("input"));
      sp.value = "AuditStrong!2026"; sp.dispatchEvent(new Event("input"));
      scf.value = "AuditStrong!2026"; scf.dispatchEvent(new Event("input"));
      document.getElementById("setupBtn").click();
      await new Promise((r) => setTimeout(r, 700));
    `);
    await auditScreen(cdp, "login:post-setup-verified(light)", results);
    await cdp.evalAsync(`
      document.getElementById("loginUser").value = "auditowner";
      document.getElementById("loginPass").value = "AuditStrong!2026";
      document.getElementById("loginBtn").click();
      await new Promise((r) => setTimeout(r, 600));
    `);
    await auditScreen(cdp, "owner:inbox-simple(light)", results);

    // Switch to Advanced mode and walk all tabs in Light & Dark
    await cdp.evalAsync(`
      if (document.body.classList.contains("simpleview")) document.getElementById("viewBtn").click();
      const ab = document.getElementById("alertBar");
      if (ab) { ab.style.display = "block"; ab.innerHTML = '<div class="al high"><span>⚠️ Test urgent deadline</span></div>'; }
    `);
    for (const tabBtnId of ["tabOverview", "tabField", "tabRules", "tabSector", "tabReglages"]) {
      await cdp.evalAsync(`
        const b = document.getElementById(${JSON.stringify(tabBtnId)});
        if (b) b.click();
        await new Promise((r) => setTimeout(r, 150));
      `);
      await auditScreen(cdp, `owner:${tabBtnId}(light)`, results);
    }
    await cdp.evalAsync(`document.getElementById("darkBtn").click();`);
    for (const tabBtnId of ["tabOverview", "tabField", "tabRules", "tabSector", "tabReglages"]) {
      await cdp.evalAsync(`
        const b = document.getElementById(${JSON.stringify(tabBtnId)});
        if (b) b.click();
        await new Promise((r) => setTimeout(r, 120));
      `);
      await auditScreen(cdp, `owner:${tabBtnId}(dark)`, results);
    }
    await cdp.evalAsync(`document.getElementById("darkBtn").click();`);

    // Open Wallboard inside authenticated SME session (/dashboard?wall=1)
    await navigateAndInject(cdp, `${clientBase}/dashboard?wall=1`);
    await auditScreen(cdp, "wallboard(light)", results);

    // --- 2. Fanal Studio Admin + Telemetry Tab + Installation Verifier ---
    const studioSetupResp = await fetch(`${studioBase}/api/setup`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Fanal-CSRF": "1" },
      body: JSON.stringify({
        user: "creator",
        password: "StudioStrong!2026",
        passwordConfirm: "StudioStrong!2026",
        scaleType: "SME_CELL",
        sector: "solo",
        constitution: {
          bizName: "Studio Fanal Audit",
          taxRegime: "INSCRIT_TPS_TVQ",
          tpsNumber: "123456789RT0001",
          tvqNumber: "1234567890TQ0001",
          rprpName: "Javier Franco",
          rprpEmail: "studio@fanal.example",
          toneRegister: "FORMEL_FIDUCIAIRE",
          pricingFloorCad: 490,
          discountPolicy: "LOCKED_0_PCT",
          escalationRules: ["RED_PROMISE_DEADLINE", "RED_EXTERNAL_COMMITMENT"],
          signerInitials: "JF",
        },
      }),
    });
    if (studioSetupResp.status !== 200) {
      throw new Error(`Studio /api/setup failed in audit-contrast.mjs (${studioSetupResp.status})`);
    }
    await navigateAndInject(cdp, `${studioBase}/`);
    await cdp.evalAsync(`
      localStorage.setItem("dsh-lang", "fr");
      localStorage.setItem("lv-onboarded", "1");
    `);
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 840, deviceScaleFactor: 1, mobile: false });
    await navigateAndInject(cdp, `${studioBase}/`);
    await cdp.evalAsync(`
      const lo = document.getElementById("langOverlay"); if (lo) lo.style.display = "none";
      const ls = document.getElementById("langStep"); if (ls) ls.style.display = "none";
      const sp = document.getElementById("splash"); if (sp) sp.classList.add("done");
      document.getElementById("loginUser").value = "creator";
      document.getElementById("loginPass").value = "StudioStrong!2026";
      document.getElementById("loginBtn").click();
      await new Promise((r) => setTimeout(r, 500));
      if (document.body.classList.contains("simpleview")) document.getElementById("viewBtn").click();
      const st = document.getElementById("tabStudio");
      if (st) st.click();
      await new Promise((r) => setTimeout(r, 250));
    `);
    await auditScreen(cdp, "studio:tabStudio(light)", results);
    await cdp.evalAsync(`document.getElementById("darkBtn").click();`);
    await auditScreen(cdp, "studio:tabStudio(dark)", results);

    // --- 3. Quick Panel (/panel) Desktop + Mobile ---
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 840, deviceScaleFactor: 1, mobile: false });
    await navigateAndInject(cdp, `${clientBase}/panel`);
    await auditScreen(cdp, "panel:gate(light)", results);
    await cdp.evalAsync(`document.getElementById("darkBtn").click();`);
    await auditScreen(cdp, "panel:gate(dark)", results);
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await cdp.evalAsync(`document.getElementById("darkBtn").click();`);
    await auditScreen(cdp, "panel:mobile(light)", results);
    await navigateAndInject(cdp, `${clientBase}/`);
    await cdp.evalAsync(`
      const lo = document.getElementById("langOverlay"); if (lo) lo.style.display = "none";
      const ls = document.getElementById("langStep"); if (ls) ls.style.display = "none";
      const sp = document.getElementById("splash"); if (sp) sp.classList.add("done");
      document.getElementById("loginUser").value = "auditowner";
      document.getElementById("loginPass").value = "AuditStrong!2026";
      document.getElementById("loginBtn").click();
      await new Promise((r) => setTimeout(r, 500));
      if (document.body.classList.contains("simpleview")) document.getElementById("viewBtn").click();
      const mb = document.getElementById("mobileDockToggleBtn");
      if (mb) mb.click();
      await new Promise((r) => setTimeout(r, 150));
    `);
    await auditScreen(cdp, "owner:mobile(light)", results);
    await cdp.evalAsync(`document.getElementById("darkBtn").click();`);
    await auditScreen(cdp, "owner:mobile(dark)", results);
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 840, deviceScaleFactor: 1, mobile: false });

    // --- 4. Electron Welcome (apps/desktop/welcome.html) ---
    const welcomeUrl = pathToFileURL(join(ROOT, "apps", "desktop", "welcome.html")).href;
    await navigateAndInject(cdp, welcomeUrl);
    await auditScreen(cdp, "welcome:closed(light)", results);
    await cdp.evalAsync(`
      const sc = document.getElementById("scale");
      if (sc) { sc.value = "AUTONOMOUS_SOLO"; sc.dispatchEvent(new Event("change")); }
    `);
    await auditScreen(cdp, "welcome:cascade-solo(light)", results);
    await cdp.evalAsync(`document.body.classList.add("dark");`);
    await auditScreen(cdp, "welcome:cascade-solo(dark)", results);
  } finally {
    await stop();
    const waitExit = (p) => (p && p.exitCode === null)
      ? new Promise((r) => { const t = setTimeout(r, 800); p.once("exit", () => { clearTimeout(t); r(); }); })
      : Promise.resolve();
    const cWait = waitExit(clientProc);
    const sWait = waitExit(studioProc);
    try { clientProc.kill("SIGKILL"); } catch {}
    try { studioProc.kill("SIGKILL"); } catch {}
    await Promise.all([cWait, sWait]);
    try { rmSync(tmpClientDir, { recursive: true, force: true, maxRetries: 6, retryDelay: 120 }); } catch {}
    try { rmSync(tmpStudioDir, { recursive: true, force: true, maxRetries: 6, retryDelay: 120 }); } catch {}
  }

  let totalChecked = 0;
  const allFailures = [];
  for (const r of results) {
    totalChecked += r.checkedCount;
    for (const f of r.failures) allFailures.push(f);
  }

  if (allFailures.length > 0) {
    console.error(`CONTRAST AUDIT FAILED: ${allFailures.length} issue(s) across ${results.length} screens (${totalChecked} elements checked):`);
    for (const f of allFailures.slice(0, 40)) {
      console.error(" ", JSON.stringify(f));
    }
    process.exit(1);
  }

  console.log(`CONTRAST AUDIT PASSED: ${results.length} screens, ${totalChecked} elements & medallions verified (WCAG >= 4.5:1 / 3.0:1, CIELAB Delta-E >= 18)`);
}

(async () => {
  auditStaticPalettes();
  await runChromeAudit();
})();
