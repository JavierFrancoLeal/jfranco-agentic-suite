// Fanal Desktop — Electron shell for the universal dashboard.
// Created by J.Franco. MIT.
//
//   LE_VEILLEUX_URL=http://127.0.0.1:8787/dashboard   (default)
//   electron .             normal window + system tray
//   electron . --kiosk     fullscreen kiosk (kitchen/back-office tablets)
//   LE_VEILLEUX_SMOKE=1    load once, print SMOKE OK, and quit (CI test)
//
// Appliance behavior: when the target is the local machine, the app starts
// the bundled supervisor itself (Electron doubles as Node), so double-click
// = brain on + dashboard open. No more blank blue windows.
const { app, BrowserWindow, Tray, Menu, shell, nativeImage, ipcMain } = require("electron");
const path = require("node:path");
const os = require("node:os");
const net = require("node:net");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const DATA_DIR = path.join(os.homedir(), ".dsh", "supervisor-data");
const USERS_FILE = path.join(DATA_DIR, "supervisor-users.json");
const bundledDsh = () => { const c = path.join(process.resourcesPath, "runtime", "cli", "bin", "dsh"); try { return fs.existsSync(c) ? c : null; } catch { return null; } };
const bundledNode = () => { const c = path.join(process.resourcesPath, "runtime", "primary-runtime", "dependencies", "node", "bin", "node"); try { return fs.existsSync(c) ? c : null; } catch { return null; } };
function firstRun() { try { return !fs.existsSync(USERS_FILE); } catch { return true; } }

const TARGET_URL = process.env.LE_VEILLEUX_URL || "http://127.0.0.1:8787/dashboard";
const KIOSK = process.argv.includes("--kiosk");
const SMOKE = process.env.LE_VEILLEUX_SMOKE === "1";
const LOCAL = (() => { try { const u = new URL(TARGET_URL); return u.hostname === "127.0.0.1" || u.hostname === "localhost"; } catch { return false; } })();
const TARGET = (() => { try { const u = new URL(TARGET_URL); return { host: u.hostname, port: u.port ? Number(u.port) : 80 }; } catch { return { host: "127.0.0.1", port: 8787 }; } })();

let win = null;
let tray = null;
let brain = null;

function portOpen(host, port) {
  return new Promise((resolve) => {
    const s = net.connect({ host, port, timeout: 1500 });
    s.once("connect", () => { s.destroy(); resolve(true); });
    s.once("error", () => resolve(false));
    s.once("timeout", () => { s.destroy(); resolve(false); });
  });
}

let brainRestarts = 0;
let brainWatch = null;
function armWatchdog() {
  if (brainWatch) clearTimeout(brainWatch);
  brainWatch = null;
}
async function ensureBrain() {
  if (!LOCAL || await portOpen(TARGET.host, TARGET.port)) return true;
  const serverJs = path.join(__dirname, "brain", "server.js");
  const packs = path.join(__dirname, "brain", "sector-packs");
  const cleanEnv = { ...process.env, ELECTRON_RUN_AS_NODE: "1", DSH_SUPERVISOR_DATA: path.join(os.homedir(), ".dsh", "supervisor-data"), DSH_SECTOR_PACKS_DIR: packs };
  delete cleanEnv.NODE_OPTIONS; delete cleanEnv.NODE_PATH; delete cleanEnv.ELECTRON_RUN_AS_NODE_POLL;
  brain = spawn(process.execPath, [serverJs, "--lan"], {
    env: cleanEnv,
    stdio: "ignore",
    detached: false,
  });
  brain.on("exit", (code) => {
    // The watchdog: if the brain dies unexpectedly, it is reborn —
    // with a backoff and a cap, then the error page says it honestly.
    if (shuttingDown) return;
    brainRestarts++;
    if (brainRestarts <= 5) {
      brainWatch = setTimeout(async () => {
        try { await ensureBrain(); } catch (e) {}
      }, Math.min(30000, 2000 * brainRestarts));
    } else {
      win.loadURL(errorPage());
    }
  });
  brain.unref();
  for (let i = 0; i < 60; i++) { // up to ~15 s
    if (await portOpen(TARGET.host, TARGET.port)) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

function errorPage() {
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  return "data:text/html;charset=utf-8," + encodeURIComponent(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Fanal</title></head>
<body style="margin:0;font-family:-apple-system,'Segoe UI',sans-serif;background:linear-gradient(135deg,#4D6BFE,#7c5cff);color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center">
<div style="max-width:420px;padding:24px">
<svg width="96" height="96" viewBox="0 0 64 64"><path d="M10 32 C10 22 16 14 32 14 C48 14 54 22 54 32 C54 42 48 50 32 50 C20 50 12.5 45.2 10.5 38.5 C14 42.5 20 41 25.4 34.8 A6.6 6.6 0 0 1 38.6 34.8 C38.6 31.4 36.6 28.2 32 22.5 C27.4 28.2 25.4 31.4 25.4 34.8" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/></svg>
<h1 style="font-size:22px;margin:14px 0 6px">Fanal</h1>
<p style="opacity:.9;margin:0 0 22px;font-size:14px">Cannot reach the dashboard at<br><code>${esc(TARGET_URL)}</code></p>
<p style="opacity:.85;font-size:13px;line-height:1.6">If this computer is the brain, the bundled supervisor could not start.<br>Open a terminal and run:<br><code style="background:rgba(255,255,255,.15);padding:3px 8px;border-radius:8px">node supervisor/server.js --lan</code></p>
<button onclick="location.replace('${esc(TARGET_URL)}')" style="margin-top:18px;background:#fff;color:#4D6BFE;border:none;border-radius:999px;padding:13px 28px;font-size:16px;font-weight:800;cursor:pointer">Retry</button>
</div></body></html>`);
}

let shuttingDown = false;
app.on("before-quit", () => { shuttingDown = true; armWatchdog(); if (brain) { try { brain.kill(); } catch {} } });
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => { if (win && !win.isDestroyed()) { win.show(); win.focus(); } else { createWindow(); } });

  function createWindow() {
    win = new BrowserWindow({
      width: 420,
      height: 800,
      minWidth: 360,
      kiosk: KIOSK,
      frame: !KIOSK,
      title: "Fanal",
      backgroundColor: "#0f172a",
      transparent: false,
      icon: path.join(__dirname, "assets", "icon.png"),
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        backgroundThrottling: true,
        preload: path.join(__dirname, "preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        backgroundThrottling: false,
      },
    });
    win.on("closed", () => { win = null; });
    win.setMenuBarVisibility(false);
    win.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: "deny" };
    });
    win.webContents.once("did-fail-load", (_e, code, desc) => {
      if (SMOKE) { console.log("SMOKE FAIL: " + desc + " (" + code + ")"); app.exit(1); return; }
      try { win.loadURL(errorPage()); } catch {}
    });
    if (SMOKE) {
      win.webContents.once("did-finish-load", () => {
        console.log("SMOKE OK — window loaded: " + TARGET_URL);
        setTimeout(() => app.quit(), 400);
      });
    }
    win.loadURL(TARGET_URL);
  }

  ipcMain.on("leveilleux-setup", async (_e, p) => {
    const serverJs = path.join(__dirname, "brain", "server.js");
    const packs = path.join(__dirname, "brain", "sector-packs");
    const runInit = () => new Promise((res) => {
      const c = spawn(process.execPath, [serverJs, "init", "--owner", String(p.user || "Owner"), "--password", String(p.password || "password123"), "--owner-label", String(p.user || "Owner")], {
        env: { ...process.env, ELECTRON_RUN_AS_NODE: "1", DSH_SUPERVISOR_DATA: DATA_DIR, DSH_SECTOR_PACKS_DIR: packs }, stdio: "ignore",
      });
      c.on("exit", (code) => res(code));
    });
    const code = await runInit();
    if (code === 0 && p.sector) {
      try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.copyFileSync(path.join(packs, String(p.sector) + ".json"), path.join(DATA_DIR, "sector.json")); } catch {}
    }
    // The brain contract (Layer 0 + Layer 1 of the distribution).
    if (code === 0) {
      try { fs.mkdirSync(path.join(os.homedir(), ".dsh"), { recursive: true }); fs.writeFileSync(path.join(os.homedir(), ".dsh", "brain.json"), JSON.stringify({ key: String(p.key || ""), fast: String(p.model || "deepseek-chat"), deep: "deepseek-reasoner" }, null, 2)); } catch {}
    }
    // If the harness is present and a key was given, light the always-connected agent.
    if (code === 0 && p.key) {
      const candidates = [
        "/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh",
      ];
      let dsh = null;
      for (const c of candidates) { try { if (fs.existsSync(c)) { dsh = c; break; } } catch {} }
      if (!dsh && bundledDsh()) dsh = bundledDsh();
      // Model B: with the bundled runtime, create the profile with it too.
      if (bundledDsh()) {
        const setup = path.join(process.resourcesPath, "runtime", "setup-profile.sh");
        if (fs.existsSync(setup)) {
          try { await new Promise((res) => { const c = spawn("sh", [setup], { stdio: "ignore" }); c.on("exit", res); }); } catch {}
        }
      }
      if (dsh) {
        const standby = path.join(__dirname, "brain", "agent-standby.sh");
        if (fs.existsSync(standby)) {
          try {
            spawn("sh", [standby], {
              env: { ...process.env, DEEPSEEK_API_KEY: String(p.key), DSH_SUPERVISOR_URL: "http://127.0.0.1:8787", DSH_BIN: dsh, PATH: process.env.PATH },
              stdio: "ignore", detached: true,
            }).unref();
          } catch {}
        }
      }
    }
    if (win && !win.isDestroyed()) win.loadURL(TARGET_URL + (TARGET_URL.includes("?") ? "&" : "?") + "lang=" + encodeURIComponent(String(p.lang || "en")));
  });
  app.whenReady().then(async () => {
    const ok = await ensureBrain();
    createWindow();
    if (!ok) { await new Promise((r) => setTimeout(r, 400)); try { if (win && !win.isDestroyed()) win.loadURL(errorPage()); } catch {} }
    try {
      const icon = nativeImage.createFromPath(path.join(__dirname, "assets", "icon.png"));
      tray = new Tray(icon.resize({ width: 18, height: 18 }));
      tray.setToolTip("Fanal — l'IA travaille, l'humain veille");
      tray.setContextMenu(Menu.buildFromTemplate([
        { label: "Abrir Fanal", click: () => { if (win && !win.isDestroyed()) { win.show(); win.focus(); } else { createWindow(); } } },
        { type: "separator" },
        { label: "Salir", click: () => app.quit() },
      ]));
    } catch (e) { /* tray optional (kiosk) */ }
    app.on("activate", () => {
      if (win && !win.isDestroyed()) { win.show(); win.focus(); } else { createWindow(); }
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin" || KIOSK) app.quit();
  });
  app.on("will-quit", () => { try { if (brain) brain.kill(); } catch {} });
}
