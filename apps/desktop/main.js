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
const crypto = require("node:crypto");
const http = require("node:http");
const https = require("node:https");
const { spawn } = require("node:child_process");
const { globalShortcut, WebContentsView, screen, powerMonitor, systemPreferences, safeStorage } = require("electron");
const fs = require("node:fs");
const {
  escapeHtml,
  parseAllowedTargetOrigin,
  isAllowedExternalUrl,
  isAllowedDrawerPopupUrl,
  isAllowedMainNavigation,
  isTrustedIpcSender,
  isValidSectorId,
  looksLikeBlockedUriScheme,
  canonicalizeFolderPath,
  resolveSandboxedFile,
} = require("./desktop-sandbox");
const {
  guardVaultUnlockAttemptAsync,
  hasVaultAuthConfigured,
  readStoredVaultAuth,
  getOrCreateMachineBindingSecret,
  setupVaultAuth,
  linkVaultBiometricKey,
  unlockFanalVaultData,
} = require("./vault-biometric");
function brainPath(...parts) {
  const unpacked = __dirname.includes("app.asar") && !__dirname.includes("app.asar.unpacked")
    ? path.join(__dirname.replace(/app\.asar(?=[/\\]|$)/, "app.asar.unpacked"), "brain", ...parts)
    : path.join(__dirname, "brain", ...parts);
  return fs.existsSync(unpacked) ? unpacked : path.join(__dirname, "brain", ...parts);
}
let rightDrawerView = null;
let activeMasterKeyBuf = null;
let isVaultLocked = false;
let idleTimer = null;
let watchdogStarted = false;
const FANAL_INTERNAL_TOKEN = crypto.randomBytes(24).toString("hex");
let desktopPowerState = { sleeping: false, onBattery: false, lastWakeAt: null };
let vaultIpcRegistered = false;
let restoreMonitor2OnUnlock = false;
const IDLE_TIMEOUT_SECONDS = 300;
function clearActiveMasterKey() {
  if (activeMasterKeyBuf && Buffer.isBuffer(activeMasterKeyBuf)) {
    activeMasterKeyBuf.fill(0);
    activeMasterKeyBuf = null;
  }
}
const vaultCtx = {
  get primaryWindow() { return win; },
  get monitor2Window() { return monitor2Window; },
  get agentPortalView() { return agentPortalView; },
  get sourceDocView() { return sourceDocView; },
  isAgentActivelyTyping: () => agentPilotState.mode === "RUNNING",
  restoreDualScreenFn: () => {
    if (restoreMonitor2OnUnlock && win && !win.isDestroyed()) {
      restoreMonitor2OnUnlock = false;
      applyDualScreenSplitLayout(win, currentSplitRatio);
    }
  },
};
function lockFanalVaultNow(ctx, reason) {
  if (!hasVaultAuthConfigured(DATA_DIR) || isVaultLocked) return;
  isVaultLocked = true;
  clearActiveMasterKey();
  try {
    if (ctx.monitor2Window && !ctx.monitor2Window.isDestroyed()) {
      restoreMonitor2OnUnlock = ctx.monitor2Window.isVisible();
      if (ctx.agentPortalView) ctx.monitor2Window.contentView.removeChildView(ctx.agentPortalView);
      if (ctx.sourceDocView) ctx.monitor2Window.contentView.removeChildView(ctx.sourceDocView);
      ctx.monitor2Window.hide();
    } else if (ctx.primaryWindow && !ctx.primaryWindow.isDestroyed()) {
      const children = ctx.primaryWindow.contentView.children || [];
      restoreMonitor2OnUnlock = (ctx.agentPortalView && children.includes(ctx.agentPortalView))
        || (ctx.sourceDocView && children.includes(ctx.sourceDocView));
      if (ctx.agentPortalView) ctx.primaryWindow.contentView.removeChildView(ctx.agentPortalView);
      if (ctx.sourceDocView) ctx.primaryWindow.contentView.removeChildView(ctx.sourceDocView);
    }
  } catch (e) {}
  try { if (ctx.primaryWindow && !ctx.primaryWindow.isDestroyed()) ctx.primaryWindow.webContents.send("fanal:vault-locked", { reason: reason || "IDLE_TIMEOUT", lockedAtIso: new Date().toISOString() }); } catch (e) {}
}
async function unlockFanalVault(payload) {
  const storedVaultAuth = readStoredVaultAuth(DATA_DIR);
  if (!storedVaultAuth) {
    return { ok: false, code: "VAULT_NOT_CONFIGURED", error: "Configura tu Contraseña Maestra primero." };
  }
  const method = payload && payload.method === "BIOMETRIC" ? "BIOMETRIC" : "MASTER_PASSWORD";
  const attemptMethod = method === "BIOMETRIC" ? (process.platform === "win32" ? "WINDOWS_HELLO" : "TOUCH_ID") : "MASTER_PASSWORD";
  const machineBindingSecret = getOrCreateMachineBindingSecret(DATA_DIR, safeStorage);
  const res = await guardVaultUnlockAttemptAsync({
    archiveDir: DATA_DIR,
    machineBindingSecret,
    attemptMethod,
    verifyCredentialsFn: () => unlockFanalVaultData({
      method,
      passwordInput: payload && typeof payload.password === "string" ? payload.password : "",
      storedVaultAuth,
      platform: process.platform,
      systemPreferences,
      safeStorage,
    }),
  });
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      code: res.code || res.status,
      failedAttempts: res.failedAttempts,
      waitSeconds: res.waitSeconds,
      uiMessage: res.uiMessage || res.error,
      error: res.error || res.uiMessage,
    };
  }
  clearActiveMasterKey();
  activeMasterKeyBuf = res.keyBuf || null;
  isVaultLocked = false;
  try { vaultCtx.restoreDualScreenFn(); } catch (e) {}
  try { if (win && !win.isDestroyed()) win.webContents.send("fanal:vault-unlocked", { unlockedAtIso: new Date().toISOString() }); } catch (e) {}
  return { ok: true, status: "UNLOCKED" };
}
function registerVaultIpcHandlers() {
  if (vaultIpcRegistered) return;
  vaultIpcRegistered = true;
  ipcMain.handle("fanal:vault-status", (ev) => {
    if (!isTrustedIpcEvent(ev)) {
      return { configured: false, locked: true, biometricLinked: false, blocked: true };
    }
    return {
      configured: hasVaultAuthConfigured(DATA_DIR),
      locked: isVaultLocked,
      biometricLinked: Boolean(readStoredVaultAuth(DATA_DIR)?.osProtectedKeyB64),
    };
  });
  ipcMain.handle("fanal:setup-vault", (ev, payload) => {
    if (!isTrustedIpcEvent(ev)) {
      return { ok: false, code: "UNTRUSTED_IPC_ORIGIN", error: "Blocked untrusted origin." };
    }
    if (hasVaultAuthConfigured(DATA_DIR) && isVaultLocked) {
      return { ok: false, code: "VAULT_LOCKED", error: "Desbloquea la bóveda actual antes de cambiar la contraseña maestra." };
    }
    const res = setupVaultAuth({
      archiveDir: DATA_DIR,
      masterPassword: payload && payload.masterPassword,
      safeStorage,
    });
    if (!res.ok) return { ok: false, code: res.code, error: res.error };
    clearActiveMasterKey();
    activeMasterKeyBuf = res.keyBuf;
    isVaultLocked = false;
    try { if (win && !win.isDestroyed()) win.webContents.send("fanal:vault-unlocked", { unlockedAtIso: new Date().toISOString() }); } catch (e) {}
    return { ok: true };
  });
  ipcMain.handle("fanal:unlock-vault", (ev, payload) => {
    if (!isTrustedIpcEvent(ev)) {
      return { ok: false, code: "UNTRUSTED_IPC_ORIGIN", error: "Blocked untrusted origin." };
    }
    return unlockFanalVault(payload);
  });
  ipcMain.handle("fanal:lock-vault", (ev, reason) => {
    if (!isTrustedIpcEvent(ev)) {
      return { ok: false, code: "UNTRUSTED_IPC_ORIGIN", error: "Blocked untrusted origin." };
    }
    lockFanalVaultNow(vaultCtx, typeof reason === "string" && reason.trim() ? reason.trim() : "MANUAL_LOCK");
    return { ok: true, locked: isVaultLocked };
  });
  ipcMain.handle("fanal:link-biometric", (ev) => {
    if (!isTrustedIpcEvent(ev)) {
      return { success: false, code: "UNTRUSTED_IPC_ORIGIN", error: "Blocked untrusted origin." };
    }
    if (hasVaultAuthConfigured(DATA_DIR) && isVaultLocked) {
      return { success: false, error: "Desbloquea la bóveda antes de vincular biometría." };
    }
    return linkVaultBiometricKey({
      archiveDir: DATA_DIR,
      keyBuf: activeMasterKeyBuf,
      platform: process.platform,
      systemPreferences,
      safeStorage,
      reason: "vincular la biometría a la bóveda Fanal (Loi 25)",
    });
  });
  ipcMain.handle("fanal:export-diagnostic", (ev) => {
    if (!isTrustedIpcEvent(ev)) {
      return { ok: false, code: "UNTRUSTED_IPC_ORIGIN", error: "Blocked untrusted origin." };
    }
    const { buildSanitizedDiagnosticReport } = require(brainPath("diagnostic-sanitizer.js"));
    const startupLogs = [];
    const seenLogFiles = new Set();
    for (const logPath of [path.join(os.homedir(), ".dsh", "fanal-startup.log"), path.join(DATA_DIR, "fanal-startup.log")]) {
      const resolvedLog = path.resolve(logPath);
      if (seenLogFiles.has(resolvedLog)) continue;
      seenLogFiles.add(resolvedLog);
      try {
        if (fs.existsSync(resolvedLog)) {
          const lines = fs.readFileSync(resolvedLog, "utf8").split(/\r?\n/).filter(Boolean).slice(-25);
          startupLogs.push(...lines);
        }
      } catch {}
    }
    let recentTickets = [];
    try {
      const tkFile = path.join(DATA_DIR, "support-tickets.jsonl");
      if (fs.existsSync(tkFile)) {
        recentTickets = fs.readFileSync(tkFile, "utf8")
          .split(/\r?\n/)
          .filter(Boolean)
          .slice(-10)
          .map((line) => { try { return JSON.parse(line); } catch { return null; } })
          .filter(Boolean);
      }
    } catch {}
    const report = buildSanitizedDiagnosticReport({
      appVersion: app.getVersion(),
      electronVersion: process.versions.electron || "",
      vaultStatus: {
        configured: hasVaultAuthConfigured(DATA_DIR),
        locked: isVaultLocked,
        biometricLinked: Boolean(readStoredVaultAuth(DATA_DIR)?.osProtectedKeyB64),
      },
      recentTickets,
      startupLogs,
    });
    return { ok: true, diagnostic: report.bundle, markdown: report.markdown };
  });
}
function startBankGradeSecurityWatchdog(ctx) {
  if (watchdogStarted) return;
  watchdogStarted = true;
  try {
    if (ctx.primaryWindow && !ctx.primaryWindow.isDestroyed()) ctx.primaryWindow.setContentProtection(true);
    if (ctx.monitor2Window && !ctx.monitor2Window.isDestroyed()) ctx.monitor2Window.setContentProtection(true);
    powerMonitor.on("suspend", () => {
      desktopPowerState.sleeping = true;
      postInternalSupervisor("/api/system/power", { sleeping: true, reason: "suspend" });
      lockFanalVaultNow(ctx, "LAPTOP_LID_CLOSED");
    });
    powerMonitor.on("lock-screen", () => {
      postInternalSupervisor("/api/system/power", { sleeping: false, screenLocked: true, reason: "lock-screen" });
      lockFanalVaultNow(ctx, "OS_SCREEN_LOCKED");
    });
    powerMonitor.on("resume", () => {
      desktopPowerState.sleeping = false;
      desktopPowerState.lastWakeAt = new Date().toISOString();
      postInternalSupervisor("/api/system/wake", { reason: "os_resume" });
      const activeWin = getActivePrimaryWindow();
      if (activeWin) activeWin.webContents.send("fanal:system-wake", { reason: "os_resume", wakeAt: desktopPowerState.lastWakeAt });
    });
    powerMonitor.on("unlock-screen", () => {
      desktopPowerState.sleeping = false;
      desktopPowerState.lastWakeAt = new Date().toISOString();
      postInternalSupervisor("/api/system/wake", { reason: "unlock_screen" });
      const activeWin = getActivePrimaryWindow();
      if (activeWin) activeWin.webContents.send("fanal:system-wake", { reason: "unlock_screen", wakeAt: desktopPowerState.lastWakeAt });
    });
    powerMonitor.on("on-battery", () => {
      desktopPowerState.onBattery = true;
      postInternalSupervisor("/api/system/power", { onBattery: true, reason: "on_battery" });
      const activeWin = getActivePrimaryWindow();
      if (activeWin) activeWin.webContents.send("fanal:power-state", { ...desktopPowerState });
    });
    powerMonitor.on("on-ac", () => {
      desktopPowerState.onBattery = false;
      postInternalSupervisor("/api/system/power", { onBattery: false, reason: "on_ac" });
      const activeWin = getActivePrimaryWindow();
      if (activeWin) activeWin.webContents.send("fanal:power-state", { ...desktopPowerState });
    });
    try {
      if (typeof powerMonitor.isOnBatteryPower === "function") {
        desktopPowerState.onBattery = Boolean(powerMonitor.isOnBatteryPower());
      }
    } catch {}
    idleTimer = setInterval(() => {
      if (isVaultLocked) return;
      try {
        const idleSecs = powerMonitor.getSystemIdleTime();
        if (idleSecs >= IDLE_TIMEOUT_SECONDS && !(ctx.isAgentActivelyTyping && ctx.isAgentActivelyTyping())) lockFanalVaultNow(ctx, "INACTIVITY_5_MIN");
      } catch (e) {}
    }, 5000);
    if (idleTimer && typeof idleTimer.unref === "function") idleTimer.unref();
  } catch (e) {}
}
let secondMonitorWindow = null;
function syncDualMonitorLayout(primaryWin, view) {
  try {
    const activeWin = (primaryWin && !primaryWin.isDestroyed()) ? primaryWin : getActivePrimaryWindow();
    if (!activeWin || !view || !view.webContents || view.webContents.isDestroyed()) {
      return { layoutMode: "NO_ACTIVE_WINDOW" };
    }
    const displays = screen.getAllDisplays();
    const primary = screen.getPrimaryDisplay();
    const external = displays.find((d) => d.id !== primary.id);
    if (external) {
      const pArea = primary.workArea;
      activeWin.setBounds({ x: pArea.x + pArea.width - 440, y: pArea.y, width: 440, height: pArea.height });
      const eArea = external.workArea;
      if (!secondMonitorWindow || secondMonitorWindow.isDestroyed()) {
        secondMonitorWindow = new BrowserWindow({ x: eArea.x, y: eArea.y, width: eArea.width, height: eArea.height, title: "Fanal · Lienzo Agéntico (Pantalla 2)", backgroundColor: "#090d16", webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } });
        if (!SMOKE) { try { secondMonitorWindow.setContentProtection(true); } catch {} }
        secondMonitorWindow.on("closed", () => { secondMonitorWindow = null; });
      } else { secondMonitorWindow.setBounds(eArea); }
      try { activeWin.contentView.removeChildView(view); } catch (e) {}
      secondMonitorWindow.contentView.addChildView(view);
      view.setBounds({ x: 0, y: 0, width: eArea.width, height: eArea.height });
      secondMonitorWindow.show();
      return { layoutMode: "DUAL_MONITOR_COCKPIT", monitorsDetected: displays.length };
    }
    if (secondMonitorWindow && !secondMonitorWindow.isDestroyed()) {
      try { secondMonitorWindow.contentView.removeChildView(view); } catch (e) {}
      secondMonitorWindow.close();
      secondMonitorWindow = null;
    }
    activeWin.contentView.addChildView(view);
    return { layoutMode: "SINGLE_MONITOR_DOCKED", monitorsDetected: 1 };
  } catch (e) { return { layoutMode: "SINGLE_MONITOR_DOCKED", error: String(e.message) }; }
}
let agentPortalView = null;
let sourceDocView = null;
let monitor2Window = null;
let currentSplitRatio = 0.5;
let activeSingleMonitorTab = "PORTAL";
let monitorEventsRegistered = false;
const TOP_BAR_HEIGHT = 40;
const MONITOR1_COMPACT_W = 420;
const MONITOR1_EXPANDED_W = 1080;
function ensureDualSynchronizedViews() {
  try {
    if (!agentPortalView || !agentPortalView.webContents || agentPortalView.webContents.isDestroyed()) {
      agentPortalView = new WebContentsView({ webPreferences: { partition: "persist:fanal-client-workspace", contextIsolation: true, nodeIntegration: false, sandbox: true } });
      agentPortalView.webContents.on("will-navigate", (ev, navUrl) => { if (!isAllowedExternalUrl(navUrl)) ev.preventDefault(); });
      agentPortalView.webContents.on("will-redirect", (ev, navUrl) => { if (!isAllowedExternalUrl(navUrl)) ev.preventDefault(); });
      agentPortalView.webContents.setWindowOpenHandler(({ url }) => {
        if (isAllowedExternalUrl(url)) { try { agentPortalView.webContents.loadURL(url); } catch {} }
        return { action: "deny" };
      });
      agentPortalView.webContents.on("before-input-event", (_ev, input) => {
        if (input.type === "keyDown" || input.type === "mouseDown") {
          agentPilotState.mode = "MANUAL";
          const activeWin = getActivePrimaryWindow();
          if (activeWin) { try { activeWin.webContents.send("fanal:hud-state-change", { state: "MANUAL", reason: "HUMAN_TOUCHED_PAGE" }); } catch (e) {} }
        }
      });
    }
    if (!sourceDocView || !sourceDocView.webContents || sourceDocView.webContents.isDestroyed()) {
      sourceDocView = new WebContentsView({ webPreferences: { partition: "in-memory-local-proof-viewer", contextIsolation: true, nodeIntegration: false, sandbox: true, plugins: true } });
      sourceDocView.webContents.on("will-navigate", (ev) => ev.preventDefault());
      sourceDocView.webContents.on("will-redirect", (ev) => ev.preventDefault());
      sourceDocView.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
      sourceDocView.webContents.session.webRequest.onBeforeRequest((details, callback) => {
        const local = String(details.url).startsWith("file://") || String(details.url).startsWith("data:") || String(details.url).startsWith("chrome-extension://");
        callback({ cancel: !local });
      });
    }
  } catch (e) {}
}
function applyDualScreenSplitLayout(primaryWin, ratio) {
  try {
    const activeWin = (primaryWin && !primaryWin.isDestroyed()) ? primaryWin : getActivePrimaryWindow();
    if (!activeWin) return { mode: "NO_ACTIVE_WINDOW" };
    ensureDualSynchronizedViews();
    currentSplitRatio = Math.min(0.75, Math.max(0.25, Number(ratio || 0.5)));
    const displays = screen.getAllDisplays();
    const primary = screen.getPrimaryDisplay();
    const m2 = displays.find((d) => d.id !== primary.id);
    if (m2) {
      const pWork = primary.workArea;
      activeWin.setBounds({ x: pWork.x + pWork.width - MONITOR1_COMPACT_W, y: pWork.y, width: MONITOR1_COMPACT_W, height: pWork.height });
      try { activeWin.contentView.removeChildView(agentPortalView); activeWin.contentView.removeChildView(sourceDocView); } catch (e) {}
      const m2Work = m2.workArea;
      if (!monitor2Window || monitor2Window.isDestroyed()) {
        monitor2Window = new BrowserWindow({ x: m2Work.x, y: m2Work.y, width: m2Work.width, height: m2Work.height, title: "Fanal · Cabina Sincronizada", backgroundColor: "#090d16", webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } });
        if (!SMOKE) { try { monitor2Window.setContentProtection(true); } catch {} }
        monitor2Window.on("closed", () => { monitor2Window = null; });
        const header = "<html><body style='margin:0;background:#0f172a;color:#f8fafc;font-family:system-ui;height:40px;display:flex;align-items:center;justify-content:space-between;padding:0 14px;border-bottom:1px solid #334155;font-size:12px'><span style='color:#6ee7b7;font-family:monospace;font-weight:700'>🌐 IZQUIERDA: PORTAL / AGENTE</span><span style='color:#38bdf8;font-family:monospace;font-size:11px'>⇄ sincronizado en vivo con la prueba</span><span style='color:#fde68a;font-family:monospace;font-weight:700'>📄 DERECHA: DOCUMENTO ORIGINAL</span></body></html>";
        monitor2Window.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(header));
      } else { monitor2Window.setBounds(m2Work); }
      const contentHeight = m2Work.height - TOP_BAR_HEIGHT;
      const leftWidth = Math.round(m2Work.width * currentSplitRatio);
      const rightWidth = m2Work.width - leftWidth;
      monitor2Window.contentView.addChildView(agentPortalView);
      monitor2Window.contentView.addChildView(sourceDocView);
      agentPortalView.setBounds({ x: 0, y: TOP_BAR_HEIGHT, width: leftWidth - 2, height: contentHeight });
      sourceDocView.setBounds({ x: leftWidth + 2, y: TOP_BAR_HEIGHT, width: rightWidth - 2, height: contentHeight });
      monitor2Window.show();
      return { mode: "MONITOR_2_SPLIT_SYNC", leftWidth, rightWidth };
    }
    if (monitor2Window && !monitor2Window.isDestroyed()) {
      try { monitor2Window.contentView.removeChildView(agentPortalView); monitor2Window.contentView.removeChildView(sourceDocView); } catch (e) {}
      monitor2Window.close(); monitor2Window = null;
    }
    const pb = activeWin.getBounds();
    const active = activeSingleMonitorTab === "PORTAL" ? agentPortalView : sourceDocView;
    const inactive = activeSingleMonitorTab === "PORTAL" ? sourceDocView : agentPortalView;
    try { activeWin.contentView.removeChildView(inactive); } catch (e) {}
    activeWin.contentView.addChildView(active);
    active.setBounds({ x: MONITOR1_COMPACT_W, y: TOP_BAR_HEIGHT, width: MONITOR1_EXPANDED_W - MONITOR1_COMPACT_W, height: pb.height - TOP_BAR_HEIGHT });
    return { mode: "MONITOR_1_TABBED_FALLBACK", activeTab: activeSingleMonitorTab };
  } catch (e) { return { mode: "ERROR", error: String(e.message) }; }
}
async function executeSynchronizedStepOnMonitor2(step) {
  try {
    // Enforce main-process allowedClientFolder strictly; ignore any renderer folder override.
    const safe = resolveSandboxedFile(allowedClientFolder, step && step.sourceFileName, { basenameOnly: true, requireExisting: true });
    if (!safe.ok) return { status: "FNL-SANDBOX-502", error: safe.error };
    ensureDualSynchronizedViews();
    const safePath = safe.resolvedPath;
    const ext = path.extname(safePath).toLowerCase();
    const fileUrl = safe.fileUrl;
    if (ext === ".pdf") {
      const pageNum = Number.isFinite(Number(step && step.sourcePage)) && Number(step.sourcePage) >= 1 ? Math.floor(Number(step.sourcePage)) : 1;
      const searchParam = step && step.verbatimQuote ? ("&search=" + encodeURIComponent(String(step.verbatimQuote).slice(0, 32))) : "";
      await sourceDocView.webContents.loadURL(fileUrl + "#page=" + pageNum + "&view=FitH" + searchParam);
    } else if ([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".bmp"].includes(ext)) {
      const label = escapeHtml(step && step.fieldLabel ? step.fieldLabel : "");
      const html = "<html><body style='margin:0;background:#020617;color:#f8fafc;font-family:system-ui;display:flex;flex-direction:column;height:100vh'><div style='background:#064e3b;color:#a7f3d0;padding:8px 12px;font-family:monospace;font-size:12px;border-bottom:2px solid #10b981'>📌 ORIGEN EN IDENTIFICACIÓN OFICIAL → " + label + "</div><div style='flex:1;display:flex;align-items:center;justify-content:center;padding:12px;overflow:auto'><img src='" + escapeHtml(fileUrl) + "' style='max-width:98%;max-height:94%;object-fit:contain;border:2px solid #38bdf8;border-radius:4px'/></div></body></html>";
      await sourceDocView.webContents.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
    }
    const forbidden = /envoyer|soumettre|transmettre|payer|signer|submit|pay/i;
    if (step && step.action === "CLICK" && forbidden.test(String(step.fieldLabel || ""))) return { status: "PAUSED_BEFORE_SUBMIT" };
    await agentPortalView.webContents.executeJavaScript("(() => { const input = document.querySelector(" + JSON.stringify(step && step.cssSelector) + "); if (!input) return false; input.scrollIntoView({ behavior: 'smooth', block: 'center' }); input.focus(); input.value = " + JSON.stringify(String(step && step.valueToFill)) + "; input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); input.style.outline = '3px solid #38bdf8'; input.style.backgroundColor = 'rgba(56, 189, 248, 0.12)'; return true; })()");
    return { status: "SYNCED_LEFT_AND_RIGHT", filledSelector: step && step.cssSelector, proofOpened: safe.basename, proofPage: (step && step.sourcePage) || 1 };
  } catch (e) { return { status: "ERROR", reason: String(e.message) }; }
}
function bindMonitor2Events() {
  if (monitorEventsRegistered) return;
  monitorEventsRegistered = true;
  try {
    ensureDualSynchronizedViews();
    const refresh = () => applyDualScreenSplitLayout(getActivePrimaryWindow(), currentSplitRatio);
    screen.on("display-added", refresh);
    screen.on("display-removed", refresh);
    screen.on("display-metrics-changed", refresh);
    ipcMain.handle("fanal:set-monitor2-split", (ev, ratioNumber) => {
      if (!isTrustedIpcEvent(ev)) return { mode: "UNTRUSTED_IPC_ORIGIN" };
      return applyDualScreenSplitLayout(getActivePrimaryWindow(), ratioNumber);
    });
    ipcMain.handle("fanal:run-synced-step", (ev, payload) => {
      if (!isTrustedIpcEvent(ev)) return { status: "UNTRUSTED_IPC_ORIGIN" };
      return executeSynchronizedStepOnMonitor2((payload && payload.step) || {});
    });
    ipcMain.handle("fanal:set-agent-control", (ev, payload) => {
      if (!isTrustedIpcEvent(ev)) return { ok: false, code: "UNTRUSTED_IPC_ORIGIN" };
      agentPilotState.mode = String((payload && payload.mode) || "RUNNING");
      return { ok: true, activeMode: agentPilotState.mode };
    });
    ipcMain.handle("fanal:step-agent-once", (ev) => {
      if (!isTrustedIpcEvent(ev)) return { ok: false, code: "UNTRUSTED_IPC_ORIGIN" };
      agentPilotState.allowSingleStep = true;
      return { ok: true };
    });
    ipcMain.handle("fanal:run-agent-plan", (ev, payload) => {
      if (!isTrustedIpcEvent(ev)) return { status: "UNTRUSTED_IPC_ORIGIN" };
      return runHudGovernedAgentPlan((payload && payload.plan) || []);
    });
  } catch (e) {}
}
const agentPilotState = { mode: "RUNNING", stepCursor: 0, currentPlan: [], allowSingleStep: false };
function waitUntilAgentAllowedToProceed() {
  return new Promise((resolve) => {
    const check = () => {
      if (agentPilotState.mode === "RUNNING") return resolve("CONTINUE");
      if (agentPilotState.allowSingleStep) { agentPilotState.allowSingleStep = false; return resolve("SINGLE_STEP"); }
      setTimeout(check, 60);
    };
    check();
  });
}
async function runHudGovernedAgentPlan(plan) {
  agentPilotState.currentPlan = plan || [];
  agentPilotState.stepCursor = 0;
  agentPilotState.mode = "RUNNING";
  for (let i = 0; i < (plan || []).length; i++) {
    await waitUntilAgentAllowedToProceed();
    agentPilotState.stepCursor = i + 1;
    const step = plan[i];
    const activeWin = getActivePrimaryWindow();
    const hudWc = activeWin ? activeWin.webContents : null;
    if (step.action === "CLICK" && /envoyer|soumettre|transmettre|payer|signer|submit|pay/i.test(String(step.fieldLabel || ""))) {
      agentPilotState.mode = "BRAKED";
      try { if (hudWc && !hudWc.isDestroyed()) hudWc.send("fanal:hud-state-change", { state: "BRAKED", stoppedAtLabel: step.fieldLabel }); } catch (e) {}
      break;
    }
    try { if (hudWc && !hudWc.isDestroyed()) hudWc.send("fanal:hud-step-tick", { currentStep: i + 1, totalSteps: plan.length, fieldLabel: step.fieldLabel, anchorRef: step.anchorFieldKey || "Verificado", proofPage: step.sourcePage || 1 }); } catch (e) {}
    await executeSynchronizedStepOnMonitor2(step);
  }
}
let monitorPlugEventsRegistered = false;
function watchMonitorPlugEvents() {
  if (monitorPlugEventsRegistered) return;
  monitorPlugEventsRegistered = true;
  try {
    const refresh = () => syncDualMonitorLayout(getActivePrimaryWindow(), ensureRightDrawerView());
    screen.on("display-added", refresh);
    screen.on("display-removed", refresh);
    screen.on("display-metrics-changed", refresh);
  } catch (e) {}
}
const COMPACT_WIDTH = 380;
const EXPANDED_WIDTH = 1040;
let drawerEventsRegistered = false;
function ensureRightDrawerView() {
  if (rightDrawerView && rightDrawerView.webContents && !rightDrawerView.webContents.isDestroyed()) {
    return rightDrawerView;
  }
  rightDrawerView = new WebContentsView({
    webPreferences: {
      partition: "persist:fanal-client-workspace",
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      plugins: true,
    },
  });
  rightDrawerView.webContents.on("will-navigate", (ev, navUrl) => {
    if (!isAllowedExternalUrl(navUrl)) ev.preventDefault();
  });
  rightDrawerView.webContents.on("will-redirect", (ev, navUrl) => {
    if (!isAllowedExternalUrl(navUrl)) ev.preventDefault();
  });
  rightDrawerView.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedDrawerPopupUrl(url)) {
      try { rightDrawerView.webContents.loadURL(url); } catch (e) {}
    }
    return { action: "deny" };
  });
  return rightDrawerView;
}
function setupCoworkRightDrawer() {
  if (drawerEventsRegistered) return;
  drawerEventsRegistered = true;
  try {
    ensureRightDrawerView();
    ipcMain.handle("fanal:open-in-right-drawer", async (ev, target, pageNumber) => {
      if (!isTrustedIpcEvent(ev)) return { opened: false, status: "UNTRUSTED_IPC_ORIGIN" };
      const mainWindow = getActivePrimaryWindow();
      if (!mainWindow) return { opened: false, status: "NO_ACTIVE_WINDOW" };
      const t = String(target || "").trim();
      const showDrawerInWindow = () => {
        const view = ensureRightDrawerView();
        const bounds = mainWindow.getBounds();
        if (bounds.width < EXPANDED_WIDTH) {
          mainWindow.setBounds({ x: Math.max(0, bounds.x - (EXPANDED_WIDTH - COMPACT_WIDTH)), y: bounds.y, width: EXPANDED_WIDTH, height: bounds.height });
        }
        mainWindow.contentView.addChildView(view);
        view.setBounds({ x: COMPACT_WIDTH, y: 36, width: EXPANDED_WIDTH - COMPACT_WIDTH, height: bounds.height - 36 });
        return view;
      };
      if (/^https?:\/\//i.test(t)) {
        if (!isAllowedExternalUrl(t)) return { opened: false, status: "FNL-SANDBOX-502", error: "Blocked external URL" };
        try {
          const view = showDrawerInWindow();
          await view.webContents.loadURL(t);
          return { opened: true, mode: "WEB_ECOSYSTEM" };
        } catch (e) {
          return { opened: false, mode: "WEB_ECOSYSTEM", error: String(e && e.message ? e.message : e) };
        }
      }
      if (looksLikeBlockedUriScheme(t)) {
        return { opened: false, status: "FNL-SANDBOX-502", error: "Blocked URI scheme in right drawer" };
      }
      const safe = resolveSandboxedFile(allowedClientFolder, t, { basenameOnly: false, requireExisting: true });
      if (!safe.ok) {
        return { opened: false, status: safe.status || "FNL-SANDBOX-502", error: safe.error };
      }
      const ext = path.extname(safe.resolvedPath).toLowerCase();
      try {
        const view = showDrawerInWindow();
        if (ext === ".pdf") {
          const safePage = Number.isFinite(Number(pageNumber)) && Number(pageNumber) >= 1 ? Math.floor(Number(pageNumber)) : 1;
          await view.webContents.loadURL(safe.fileUrl + "#page=" + safePage + "&view=FitH");
        } else if ([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".bmp"].includes(ext)) {
          const html = "<html><body style='margin:0;background:#090d16;display:flex;align-items:center;justify-content:center;height:100vh'><img src='" + escapeHtml(safe.fileUrl) + "' style='max-width:96%;max-height:96%;object-fit:contain'/></body></html>";
          await view.webContents.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
        } else if ([".csv", ".tsv", ".txt", ".jsonl", ".md"].includes(ext)) {
          const raw = escapeHtml(fs.readFileSync(safe.resolvedPath, "utf8").slice(0, 100000));
          const html = "<html><body style='margin:0;padding:14px;background:#090d16;color:#e2e8f0;font-family:monospace;font-size:12px;white-space:pre-wrap'>" + raw + "</body></html>";
          await view.webContents.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
        } else {
          await view.webContents.loadURL(safe.fileUrl);
        }
        return { opened: true, mode: "LOCAL_FILE", ext };
      } catch (e) {
        return { opened: false, mode: "LOCAL_FILE", ext, error: String(e && e.message ? e.message : e) };
      }
    });
    ipcMain.handle("fanal:close-right-drawer", (ev) => {
      if (!isTrustedIpcEvent(ev)) return { closed: false, status: "UNTRUSTED_IPC_ORIGIN" };
      try {
        const mainWindow = getActivePrimaryWindow();
        if (mainWindow && rightDrawerView) {
          const bounds = mainWindow.getBounds();
          try { mainWindow.contentView.removeChildView(rightDrawerView); } catch {}
          if (bounds.width > COMPACT_WIDTH) { mainWindow.setBounds({ x: bounds.x + (bounds.width - COMPACT_WIDTH), y: bounds.y, width: COMPACT_WIDTH, height: bounds.height }); }
        }
      } catch (e) {}
      return { closed: true };
    });
  } catch (e) {}
}
const DATA_DIR = process.env.DSH_SUPERVISOR_DATA
  ? path.resolve(process.env.DSH_SUPERVISOR_DATA)
  : path.join(os.homedir(), ".dsh", "supervisor-data");
const USERS_FILE = path.join(DATA_DIR, "supervisor-users.json");
const DB_FILE = path.join(DATA_DIR, "supervisor.db");
const bundledDsh = () => { const c = path.join(process.resourcesPath, "runtime", "cli", "bin", "dsh"); try { return fs.existsSync(c) ? c : null; } catch { return null; } };
const bundledNode = () => { const c = path.join(process.resourcesPath, "runtime", "primary-runtime", "dependencies", "node", "bin", "node"); try { return fs.existsSync(c) ? c : null; } catch { return null; } };
function firstRun() { try { return !fs.existsSync(USERS_FILE) && !fs.existsSync(DB_FILE); } catch { return true; } }

const TARGET_INFO = parseAllowedTargetOrigin(process.env.LE_VEILLEUX_URL);
const TARGET_URL = TARGET_INFO.url;
const TARGET_ORIGIN = TARGET_INFO.origin;
const KIOSK = process.argv.includes("--kiosk");
const SMOKE = process.env.LE_VEILLEUX_SMOKE === "1";
const LOCAL = TARGET_INFO.isLocal;
const TARGET = { host: TARGET_INFO.host, port: TARGET_INFO.port };

let win = null;
let tray = null;
let brain = null;

function getActivePrimaryWindow() {
  return win && !win.isDestroyed() ? win : null;
}

function isTrustedIpcEvent(ev) {
  const activeWin = getActivePrimaryWindow();
  if (!ev || !activeWin) return false;
  const senderUrl = (ev.senderFrame && ev.senderFrame.url) || (ev.sender && typeof ev.sender.getURL === "function" ? ev.sender.getURL() : "");
  return isTrustedIpcSender({
    senderMatchesPrimary: ev.sender === activeWin.webContents,
    senderUrl,
    targetOrigin: TARGET_ORIGIN,
  });
}

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
// El sandbox de la carpeta conectada (el chip [📁]): Fanal solo toca el expediente activo
let allowedClientFolder = null;
function postInternalSupervisor(apiPath, payload = {}) {
  try {
    const u = new URL(apiPath, TARGET_ORIGIN);
    const mod = u.protocol === "https:" ? https : http;
    const body = JSON.stringify(payload);
    const req = mod.request(
      u,
      {
        method: "POST",
        timeout: 2500,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          "X-Fanal-Csrf": "1",
          "X-Fanal-Internal": FANAL_INTERNAL_TOKEN,
        },
      },
      (res) => { res.resume(); }
    );
    req.on("timeout", () => { try { req.destroy(); } catch {} });
    req.on("error", () => {});
    req.write(body);
    req.end();
  } catch {}
}
try {
  ipcMain.handle("fanal:set-connected-folder", (ev, p) => {
    if (!isTrustedIpcEvent(ev)) throw new Error("Blocked untrusted IPC origin");
    const res = canonicalizeFolderPath(p);
    if (!res.ok) throw new Error(res.error);
    allowedClientFolder = res.resolvedPath;
    postInternalSupervisor("/api/intake/folder", { folderPath: res.resolvedPath });
    return { activeFolderChip: res.activeFolderChip, fullPath: res.resolvedPath };
  });
  ipcMain.handle("fanal:power-state", (ev) => {
    if (!isTrustedIpcEvent(ev)) throw new Error("Blocked untrusted IPC origin");
    return { ...desktopPowerState };
  });
} catch (e) {}

async function ensureBrain() {
  if (!LOCAL || await portOpen(TARGET.host, TARGET.port)) return true;
  const serverJs = brainPath("server.js");
  const packs = brainPath("sector-packs");
  const cleanEnv = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: "1",
    DSH_SUPERVISOR_DATA: DATA_DIR,
    DSH_SUPERVISOR_PORT: String(TARGET.port),
    DSH_SECTOR_PACKS_DIR: packs,
    FANAL_INTERNAL_TOKEN,
  };
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
    if (SMOKE) { console.error("SMOKE BRAIN EXIT:", code); }
    brainRestarts++;
    if (brainRestarts <= 5) {
      brainWatch = setTimeout(async () => {
        try { await ensureBrain(); } catch (e) {}
      }, Math.min(30000, 2000 * brainRestarts));
    } else if (win && !win.isDestroyed()) {
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
  const safeTarget = escapeHtml(TARGET_URL);
  const safeTargetJs = escapeHtml(JSON.stringify(TARGET_URL));
  return "data:text/html;charset=utf-8," + encodeURIComponent(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Fanal</title></head>
<body style="margin:0;font-family:-apple-system,'Segoe UI',sans-serif;background:linear-gradient(135deg,#4D6BFE,#7c5cff);color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center">
<div style="max-width:420px;padding:24px">
<svg width="96" height="96" viewBox="0 0 64 64"><path d="M10 32 C10 22 16 14 32 14 C48 14 54 22 54 32 C54 42 48 50 32 50 C20 50 12.5 45.2 10.5 38.5 C14 42.5 20 41 25.4 34.8 A6.6 6.6 0 0 1 38.6 34.8 C38.6 31.4 36.6 28.2 32 22.5 C27.4 28.2 25.4 31.4 25.4 34.8" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/></svg>
<h1 style="font-size:22px;margin:14px 0 6px">Fanal</h1>
<p style="opacity:.9;margin:0 0 22px;font-size:14px">Cannot reach the dashboard at<br><code>${safeTarget}</code></p>
<p style="opacity:.85;font-size:13px;line-height:1.6">If this computer is the brain, the bundled supervisor could not start.<br>Open a terminal and run:<br><code style="background:rgba(255,255,255,.15);padding:3px 8px;border-radius:8px">node supervisor/server.js --lan</code></p>
<button onclick="location.replace(${safeTargetJs})" style="margin-top:18px;background:#fff;color:#4D6BFE;border:none;border-radius:999px;padding:13px 28px;font-size:16px;font-weight:800;cursor:pointer">Retry</button>
</div></body></html>`);
}

// El registro de arranque (el regalo forense): cualquier error del proceso principal
// queda escrito en ~/.dsh/fanal-startup.log — jamás un silencio sin diagnóstico.
try {
  process.on("uncaughtException", (e) => { try { require("node:fs").appendFileSync(require("node:path").join(require("node:os").homedir(), ".dsh", "fanal-startup.log"), new Date().toISOString() + " UNCAUGHT: " + String(e && e.stack || e) + "\n"); } catch (_) {} });
  process.on("unhandledRejection", (e) => { try { require("node:fs").appendFileSync(require("node:path").join(require("node:os").homedir(), ".dsh", "fanal-startup.log"), new Date().toISOString() + " REJECTION: " + String(e && e.stack || e) + "\n"); } catch (_) {} });
} catch (e) {}
let shuttingDown = false;
app.on("before-quit", () => {
  shuttingDown = true;
  if (idleTimer) { clearInterval(idleTimer); idleTimer = null; }
  clearActiveMasterKey();
  armWatchdog();
  if (brain) { try { brain.kill(); } catch {} }
});
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  function showOrCreateMainWindow() {
    if (win && !win.isDestroyed()) {
      win.show();
      win.focus();
    } else {
      createWindow();
    }
  }

  app.on("second-instance", () => showOrCreateMainWindow());

  function createWindow() {
    win = new BrowserWindow({
      width: 420,
      height: 800,
      minWidth: 360,
      show: !SMOKE,
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
      },
    });
    win.on("close", (ev) => {
      if (!SMOKE && !KIOSK && !shuttingDown && tray) {
        ev.preventDefault();
        win.hide();
      }
    });
    win.on("closed", () => { win = null; });
    win.setMenuBarVisibility(false);
    win.webContents.on("will-navigate", (ev, navUrl) => {
      if (!isAllowedMainNavigation(navUrl, TARGET_ORIGIN)) ev.preventDefault();
    });
    win.webContents.on("will-redirect", (ev, navUrl) => {
      if (!isAllowedMainNavigation(navUrl, TARGET_ORIGIN)) ev.preventDefault();
    });
    win.webContents.setWindowOpenHandler(({ url }) => {
      if (isAllowedExternalUrl(url)) {
        try { shell.openExternal(url); } catch {}
      }
      return { action: "deny" };
    });
    win.webContents.on("did-fail-load", (_e, code, desc, _validatedUrl, isMainFrame) => {
      if (code === -3 || isMainFrame === false) return;
      if (SMOKE) { console.log("SMOKE FAIL: " + desc + " (" + code + ")"); app.exit(1); return; }
      try { win.loadURL(errorPage()); } catch {}
    });
    if (SMOKE) {
      win.webContents.once("did-finish-load", async () => {
        try {
          const probe = await win.webContents.executeJavaScript(`(async () => ({
            url: location.href,
            title: document.title,
            hasDashboardDom: Boolean(document.getElementById("setupSection") && document.getElementById("fanal-agent-hud") && document.getElementById("fanal-lock-curtain")),
            hasPreloadBridge: Boolean(window.fanalIPC && typeof window.fanalIPC.unlockVault === "function" && typeof window.fanalIPC.exportDiagnostic === "function" && window.electronAPI && typeof window.electronAPI.linkBiometric === "function"),
            vaultStatus: window.fanalIPC && typeof window.fanalIPC.getVaultStatus === "function" ? await window.fanalIPC.getVaultStatus() : null,
            diagnosticOk: window.fanalIPC && typeof window.fanalIPC.exportDiagnostic === "function" ? Boolean((await window.fanalIPC.exportDiagnostic())?.diagnostic?.loi25Redacted) : false
          }))()`);
          const packagedPathsOk = !app.isPackaged || (
            brainPath("server.js").includes("app.asar.unpacked") &&
            brainPath("diagnostic-sanitizer.js").includes("app.asar.unpacked")
          );
          const expectedOrigin = TARGET_ORIGIN;
          if (!probe || !String(probe.url || "").startsWith(expectedOrigin) || !String(probe.title || "").includes("Fanal") || !probe.hasDashboardDom || !probe.hasPreloadBridge || !probe.vaultStatus || typeof probe.vaultStatus.locked !== "boolean" || !probe.diagnosticOk || !packagedPathsOk) {
            console.error("SMOKE FAIL — unexpected page: " + JSON.stringify({ ...probe, packagedPathsOk }));
            app.exit(1);
            return;
          }
          console.log("SMOKE OK — window loaded: " + probe.url + " (" + probe.title + ")");
          setTimeout(() => app.quit(), 400);
        } catch (err) {
          console.error("SMOKE FAIL — " + (err && err.message ? err.message : err));
          app.exit(1);
        }
      });
    } else {
      try { win.setContentProtection(true); } catch {}
      win.webContents.on("did-finish-load", () => {
        if (isVaultLocked && win && !win.isDestroyed()) {
          try { win.webContents.send("fanal:vault-locked", { reason: "STARTUP_LOCKED", lockedAtIso: new Date().toISOString() }); } catch {}
        }
      });
    }
    win.loadURL(TARGET_URL);
  }

  let legacySetupStarted = false;
  ipcMain.on("leveilleux-setup", async (ev, p) => {
    if (!isTrustedIpcEvent(ev) || !firstRun() || legacySetupStarted || !p || typeof p !== "object") return;
    legacySetupStarted = true;
    const serverJs = brainPath("server.js");
    const packs = brainPath("sector-packs");
    const runInit = () => new Promise((res) => {
      const c = spawn(process.execPath, [serverJs, "init", "--owner", String(p.user || "Owner"), "--password", String(p.password || "password123"), "--owner-label", String(p.user || "Owner")], {
        env: { ...process.env, ELECTRON_RUN_AS_NODE: "1", DSH_SUPERVISOR_DATA: DATA_DIR, DSH_SECTOR_PACKS_DIR: packs }, stdio: "ignore",
      });
      c.on("exit", (code) => res(code));
    });
    const code = await runInit();
    if (code !== 0) {
      if (firstRun()) legacySetupStarted = false;
      return;
    }
    if (p.sector && isValidSectorId(String(p.sector))) {
      const safePack = resolveSandboxedFile(packs, String(p.sector) + ".json", { basenameOnly: true, requireExisting: true });
      if (safePack.ok) {
        try { fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 }); fs.copyFileSync(safePack.resolvedPath, path.join(DATA_DIR, "sector.json")); } catch {}
      }
    }
    // The brain contract (Layer 0 + Layer 1 of the distribution).
    try {
      const dshDir = path.join(os.homedir(), ".dsh");
      fs.mkdirSync(dshDir, { recursive: true, mode: 0o700 });
      fs.writeFileSync(path.join(dshDir, "brain.json"), JSON.stringify({ key: String(p.key || ""), fast: String(p.model || "deepseek-chat"), deep: "deepseek-reasoner" }, null, 2), { mode: 0o600 });
    } catch {}
    // If the harness is present and a key was given, light the always-connected agent.
    if (p.key) {
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
        const standby = brainPath("agent-standby.sh");
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
  // (los montajes de la cabina/el visor/el doble monitor viven DENTRO del whenReady — véase arriba)
  app.whenReady().then(async () => {
    isVaultLocked = hasVaultAuthConfigured(DATA_DIR);
    registerVaultIpcHandlers();
    if (SMOKE) {
      setTimeout(() => {
        console.error("SMOKE FAIL — timeout waiting for window load: " + TARGET_URL);
        app.exit(1);
      }, 30000).unref();
    }
    const ok = await ensureBrain();
    if (!ok && SMOKE) {
      console.error("SMOKE FAIL — bundled supervisor failed to reach " + TARGET_URL);
      app.exit(1);
      return;
    }
    createWindow();
    // La cabina, el visor y los eventos del sistema se montan AQUÍ (el hilo de la UI está listo) —
    // jamás al nivel del módulo: el chequeo del hilo de Chromium lo exige (la lección #36).
    setupCoworkRightDrawer();
    watchMonitorPlugEvents();
    bindMonitor2Events();
    if (!SMOKE) {
      startBankGradeSecurityWatchdog(vaultCtx);
      postInternalSupervisor("/api/system/power", { onBattery: desktopPowerState.onBattery, reason: "app_ready" });
    }
    if (!ok) { await new Promise((r) => setTimeout(r, 400)); try { if (win && !win.isDestroyed()) win.loadURL(errorPage()); } catch {} }
    try {
      const icon = nativeImage.createFromPath(path.join(__dirname, "assets", "icon.png"));
      tray = new Tray(icon.resize({ width: 18, height: 18 }));
      tray.setToolTip("Fanal — l'IA travaille, l'humain veille");
      tray.setContextMenu(Menu.buildFromTemplate([
        { label: "Abrir Fanal", click: () => showOrCreateMainWindow() },
        { type: "separator" },
        { label: "Salir", click: () => { shuttingDown = true; app.quit(); } },
      ]));
    } catch (e) { /* tray optional (kiosk) */ }
    app.on("activate", () => showOrCreateMainWindow());
  });

  app.on("window-all-closed", () => {
    if (SMOKE || KIOSK || shuttingDown || (process.platform !== "darwin" && !tray)) app.quit();
  });
  app.on("will-quit", () => { try { if (brain) brain.kill(); } catch {} });
}
