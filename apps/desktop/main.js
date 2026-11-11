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
const { globalShortcut, WebContentsView, screen, powerMonitor, systemPreferences, safeStorage } = require("electron");
const fs = require("node:fs");
const fsx = require("node:fs");
let rightDrawerView = null;
let activeMasterKeyBuf = null;
let isVaultLocked = true;
let idleTimer = null;
const IDLE_TIMEOUT_SECONDS = 300;
const cryptoV = require("node:crypto");
const osV = require("node:os");
function guardVaultUnlockAttempt(o) {
  const stateFile = path.join(o.archiveDir, "vault_guard_state.json");
  const loi25File = path.join(o.archiveDir, "registre_incidents_loi25.jsonl");
  const nowMs = Date.now();
  let state = { failedAttempts: 0, lockedUntilMs: 0, lastFailIso: null };
  if (fs.existsSync(stateFile)) {
    try {
      const raw = JSON.parse(fs.readFileSync(stateFile, "utf8"));
      const payloadStr = raw.failedAttempts + ":" + raw.lockedUntilMs + ":" + raw.lastFailIso;
      const expectedHmac = cryptoV.createHmac("sha256", o.machineBindingSecret).update(payloadStr).digest("hex");
      if (raw.hmac === expectedHmac) { state = { failedAttempts: raw.failedAttempts, lockedUntilMs: raw.lockedUntilMs, lastFailIso: raw.lastFailIso }; }
      else { state = { failedAttempts: 6, lockedUntilMs: nowMs + 900000, lastFailIso: new Date(nowMs).toISOString() }; }
    } catch (e) { state = { failedAttempts: 3, lockedUntilMs: nowMs + 60000, lastFailIso: new Date(nowMs).toISOString() }; }
  }
  if (nowMs < state.lockedUntilMs) {
    const waitSeconds = Math.ceil((state.lockedUntilMs - nowMs) / 1000);
    return { ok: false, status: "COOLDOWN_ACTIVE", failedAttempts: state.failedAttempts, waitSeconds, uiMessage: "⏳ Protección activa: espera " + waitSeconds + " s antes de volver a intentar." };
  }
  const isUnlocked = Boolean(o.verifyCredentialsFn && o.verifyCredentialsFn());
  if (isUnlocked) {
    if (state.failedAttempts > 0 && fs.existsSync(stateFile)) { try { fs.unlinkSync(stateFile); } catch (e) {} }
    return { ok: true, status: "UNLOCKED", failedAttempts: 0, waitSeconds: 0 };
  }
  state.failedAttempts += 1;
  state.lastFailIso = new Date(nowMs).toISOString();
  let penaltySeconds = 0;
  if (state.failedAttempts >= 3) {
    penaltySeconds = Math.min(3600, 30 * Math.pow(2, state.failedAttempts - 3));
    state.lockedUntilMs = nowMs + penaltySeconds * 1000;
  }
  const newPayloadStr = state.failedAttempts + ":" + state.lockedUntilMs + ":" + state.lastFailIso;
  const hmac = cryptoV.createHmac("sha256", o.machineBindingSecret).update(newPayloadStr).digest("hex");
  try { fs.writeFileSync(stateFile, JSON.stringify({ failedAttempts: state.failedAttempts, lockedUntilMs: state.lockedUntilMs, lastFailIso: state.lastFailIso, hmac: hmac }), { mode: 0o600 }); } catch (e) {}
  if (state.failedAttempts >= 3) {
    const rec = { dateDetection: state.lastFailIso, circumstances: "Intento de desbloqueo físico no autorizado #" + state.failedAttempts + " vía " + (o.attemptMethod || "MASTER_PASSWORD") + " en sesión OS '" + osV.userInfo().username + "' (" + osV.hostname() + ").", natureOfPersonalInfo: ["Bóveda local cifrada AES-256-GCM (0 bytes expuestos)"], personsAffectedCount: 0, seriousHarmRiskAssessed: false, notifiedCaiAndPersonsAt: null, mitigationMeasuresTaken: "Bloqueo exponencial activado por " + penaltySeconds + " segundos y llave maestra purgada de memoria RAM." };
    try { fs.appendFileSync(loi25File, JSON.stringify(rec) + "\n", { mode: 0o600 }); } catch (e) {}
  }
  return { ok: false, status: state.failedAttempts >= 3 ? "INTRUSION_LOCKOUT_LOGGED" : "INVALID_CREDENTIAL", failedAttempts: state.failedAttempts, waitSeconds: penaltySeconds, uiMessage: penaltySeconds > 0 ? ("🔒 Intento #" + state.failedAttempts + " fallido. Bóveda bloqueada por " + penaltySeconds + " s (Registrado en la bitácora Loi 25).") : ("Clave incorrecta (" + (3 - state.failedAttempts) + " intento(s) antes del bloqueo temporal).") };
}
function deriveKeyFromMasterPassword(plain, saltHex) {
  try {
    return cryptoV.scryptSync(String(plain).normalize("NFKC"), Buffer.from(saltHex, "hex"), 32, { N: 65536, r: 8, p: 1, maxmem: 128 * 1024 * 1024 });
  } catch (e) { return null; }
}
function verifyMasterPassword(plain, stored) {
  try {
    const cand = deriveKeyFromMasterPassword(plain, stored.saltHex);
    if (!cand) return null;
    const verifier = cryptoV.createHmac("sha256", cand).update("FANAL_VAULT_VERIFIER_V1").digest();
    const expected = Buffer.from(stored.verifierHmacHex, "hex");
    if (verifier.length !== expected.length || !cryptoV.timingSafeEqual(verifier, expected)) { cand.fill(0); return null; }
    return cand;
  } catch (e) { return null; }
}
function lockFanalVaultNow(ctx, reason) {
  if (isVaultLocked) return;
  isVaultLocked = true;
  if (activeMasterKeyBuf && Buffer.isBuffer(activeMasterKeyBuf)) { activeMasterKeyBuf.fill(0); activeMasterKeyBuf = null; }
  try {
    if (ctx.monitor2Window && !ctx.monitor2Window.isDestroyed()) {
      ctx.monitor2Window.contentView.removeChildView(ctx.agentPortalView);
      ctx.monitor2Window.contentView.removeChildView(ctx.sourceDocView);
      ctx.monitor2Window.hide();
    } else if (ctx.primaryWindow && !ctx.primaryWindow.isDestroyed()) {
      ctx.primaryWindow.contentView.removeChildView(ctx.agentPortalView);
      ctx.primaryWindow.contentView.removeChildView(ctx.sourceDocView);
    }
  } catch (e) {}
  try { if (ctx.primaryWindow && !ctx.primaryWindow.isDestroyed()) ctx.primaryWindow.webContents.send("fanal:vault-locked", { reason: reason || "IDLE_TIMEOUT", lockedAtIso: new Date().toISOString() }); } catch (e) {}
}
async function unlockFanalVault(o) {
  try {
    if (o.method === "BIOMETRIC") {
      if (process.platform === "darwin") { await systemPreferences.promptTouchID("déverrouiller la voûte fiduciaire Fanal (Loi 25)"); }
      else if (process.platform === "win32") { if (!safeStorage.isEncryptionAvailable()) throw new Error("WINDOWS_HELLO_UNAVAILABLE"); }
      const encBuf = Buffer.from(o.storedVaultAuth.osProtectedKeyB64, "base64");
      const hexKey = safeStorage.decryptString(encBuf);
      activeMasterKeyBuf = Buffer.from(hexKey, "hex");
    } else {
      const derived = verifyMasterPassword(o.passwordInput, o.storedVaultAuth);
      if (!derived) return { ok: false, error: "Contraseña maestra incorrecta." };
      activeMasterKeyBuf = derived;
    }
    isVaultLocked = false;
    try { o.restoreDualScreenFn(); } catch (e) {}
    try { o.primaryWindow.webContents.send("fanal:vault-unlocked", { unlockedAtIso: new Date().toISOString() }); } catch (e) {}
    return { ok: true };
  } catch (e) { return { ok: false, error: "Biometría cancelada o no reconocida. Usa tu Contraseña Maestra." }; }
}
function startBankGradeSecurityWatchdog(ctx) {
  try {
    ctx.primaryWindow.setContentProtection(true);
    if (ctx.monitor2Window && !ctx.monitor2Window.isDestroyed()) ctx.monitor2Window.setContentProtection(true);
    powerMonitor.on("suspend", () => lockFanalVaultNow(ctx, "LAPTOP_LID_CLOSED"));
    powerMonitor.on("lock-screen", () => lockFanalVaultNow(ctx, "OS_SCREEN_LOCKED"));
    idleTimer = setInterval(() => {
      if (isVaultLocked) return;
      try {
        const idleSecs = powerMonitor.getSystemIdleTime();
        if (idleSecs >= IDLE_TIMEOUT_SECONDS && !(ctx.isAgentActivelyTyping && ctx.isAgentActivelyTyping())) lockFanalVaultNow(ctx, "INACTIVITY_5_MIN");
      } catch (e) {}
    }, 5000);
  } catch (e) {}
}
let secondMonitorWindow = null;
const FORBIDDEN_BUTTON_WORDS = /envoyer|soumettre|transmettre|payer|signer|supprimer|submit|pay|delete/i;
async function runAgenticTaskInRightDrawer(view, plan, anchor) {
  const wc = view.webContents;
  const report = [];
  try {
    if (!wc.debugger.isAttached()) wc.debugger.attach("1.3");
    for (const step of plan || []) {
      if (step.type === "CLICK" && FORBIDDEN_BUTTON_WORDS.test(String(step.targetLabel || ""))) {
        report.push({ stepId: step.id, status: "STOPPED_FOR_HUMAN_SKIN_IN_THE_GAME", reason: "Fanal llenó el formulario y se detuvo antes del botón '" + step.targetLabel + "' para que TÚ verifiques y envíes." });
        break;
      }
      if (step.type === "FILL_FIELD") {
        const exactValue = (anchor && anchor[step.anchorFieldKey] !== undefined) ? anchor[step.anchorFieldKey] : step.value;
        await wc.executeJavaScript('(() => { const el = document.querySelector(' + JSON.stringify(step.cssSelector) + '); if (!el) return false; el.focus(); el.value = ' + JSON.stringify(String(exactValue)) + '; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); el.style.outline = "2px solid #10b981"; el.style.backgroundColor = "rgba(16, 185, 129, 0.08)"; return true; })()');
        report.push({ stepId: step.id, field: step.cssSelector, status: "FILLED_AND_HIGHLIGHTED" });
      }
    }
  } catch (e) { report.push({ status: "ERROR", reason: String(e.message) }); }
  return { completedInInternalChromium: true, stepsExecuted: report };
}
function syncDualMonitorLayout(primaryWin, view) {
  try {
    const displays = screen.getAllDisplays();
    const primary = screen.getPrimaryDisplay();
    const external = displays.find((d) => d.id !== primary.id);
    if (external) {
      const pArea = primary.workArea;
      primaryWin.setBounds({ x: pArea.x + pArea.width - 440, y: pArea.y, width: 440, height: pArea.height });
      const eArea = external.workArea;
      if (!secondMonitorWindow || secondMonitorWindow.isDestroyed()) {
        secondMonitorWindow = new BrowserWindow({ x: eArea.x, y: eArea.y, width: eArea.width, height: eArea.height, title: "Fanal · Lienzo Agéntico (Pantalla 2)", backgroundColor: "#090d16", webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } });
      } else { secondMonitorWindow.setBounds(eArea); }
      try { primaryWin.contentView.removeChildView(view); } catch (e) {}
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
    primaryWin.contentView.addChildView(view);
    return { layoutMode: "SINGLE_MONITOR_DOCKED", monitorsDetected: 1 };
  } catch (e) { return { layoutMode: "SINGLE_MONITOR_DOCKED", error: String(e.message) }; }
}
let agentPortalView = null;
let sourceDocView = null;
let monitor2Window = null;
let currentSplitRatio = 0.5;
let activeSingleMonitorTab = "PORTAL";
const TOP_BAR_HEIGHT = 40;
const MONITOR1_COMPACT_W = 420;
const MONITOR1_EXPANDED_W = 1080;
function initDualSynchronizedViews() {
  try {
    agentPortalView = new WebContentsView({ webPreferences: { partition: "persist:fanal-client-workspace", contextIsolation: true, nodeIntegration: false, sandbox: true } });
    agentPortalView.webContents.on("will-navigate", (ev, url) => { if (String(url).startsWith("file://")) ev.preventDefault(); });
    sourceDocView = new WebContentsView({ webPreferences: { partition: "in-memory-local-proof-viewer", contextIsolation: true, nodeIntegration: false, sandbox: true, plugins: true } });
    sourceDocView.webContents.session.webRequest.onBeforeRequest((details, callback) => {
      const local = String(details.url).startsWith("file://") || String(details.url).startsWith("data:") || String(details.url).startsWith("chrome-extension://");
      callback({ cancel: !local });
    });
  } catch (e) {}
}
function applyDualScreenSplitLayout(primaryWin, ratio) {
  try {
    currentSplitRatio = Math.min(0.75, Math.max(0.25, Number(ratio || 0.5)));
    const displays = screen.getAllDisplays();
    const primary = screen.getPrimaryDisplay();
    const m2 = displays.find((d) => d.id !== primary.id);
    if (m2) {
      const pWork = primary.workArea;
      primaryWin.setBounds({ x: pWork.x + pWork.width - MONITOR1_COMPACT_W, y: pWork.y, width: MONITOR1_COMPACT_W, height: pWork.height });
      try { primaryWin.contentView.removeChildView(agentPortalView); primaryWin.contentView.removeChildView(sourceDocView); } catch (e) {}
      const m2Work = m2.workArea;
      if (!monitor2Window || monitor2Window.isDestroyed()) {
        monitor2Window = new BrowserWindow({ x: m2Work.x, y: m2Work.y, width: m2Work.width, height: m2Work.height, title: "Fanal · Cabina Sincronizada", backgroundColor: "#090d16", webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } });
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
    const pb = primaryWin.getBounds();
    const active = activeSingleMonitorTab === "PORTAL" ? agentPortalView : sourceDocView;
    const inactive = activeSingleMonitorTab === "PORTAL" ? sourceDocView : agentPortalView;
    try { primaryWin.contentView.removeChildView(inactive); } catch (e) {}
    primaryWin.contentView.addChildView(active);
    active.setBounds({ x: MONITOR1_COMPACT_W, y: TOP_BAR_HEIGHT, width: MONITOR1_EXPANDED_W - MONITOR1_COMPACT_W, height: pb.height - TOP_BAR_HEIGHT });
    return { mode: "MONITOR_1_TABBED_FALLBACK", activeTab: activeSingleMonitorTab };
  } catch (e) { return { mode: "ERROR", error: String(e.message) }; }
}
async function executeSynchronizedStepOnMonitor2(step, connectedFolderPath) {
  try {
    const safePath = path.resolve(connectedFolderPath, path.basename(String(step.sourceFileName || "")));
    if (!safePath.startsWith(path.resolve(connectedFolderPath))) return { status: "FNL-SANDBOX-502" };
    const ext = path.extname(safePath).toLowerCase();
    const fileUrl = "file://" + safePath;
    if (ext === ".pdf") {
      const pageNum = Number(step.sourcePage || 1);
      const searchParam = step.verbatimQuote ? ("&search=" + encodeURIComponent(String(step.verbatimQuote).slice(0, 32))) : "";
      await sourceDocView.webContents.loadURL(fileUrl + "#page=" + pageNum + "&view=FitH" + searchParam);
    } else if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
      const label = String(step.fieldLabel || "").replace(/[<>&"]/g, "");
      const val = String(step.valueToFill || "").replace(/[<>&"]/g, "");
      const html = "<html><body style='margin:0;background:#020617;color:#f8fafc;font-family:system-ui;display:flex;flex-direction:column;height:100vh'><div style='background:#064e3b;color:#a7f3d0;padding:8px 12px;font-family:monospace;font-size:12px;border-bottom:2px solid #10b981'>📌 ORIGEN EN IDENTIFICACIÓN OFICIAL → " + label + "</div><div style='flex:1;display:flex;align-items:center;justify-content:center;padding:12px;overflow:auto'><img src='" + fileUrl + "' style='max-width:98%;max-height:94%;object-fit:contain;border:2px solid #38bdf8;border-radius:4px'/></div></body></html>";
      await sourceDocView.webContents.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
    }
    const forbidden = /envoyer|soumettre|transmettre|payer|signer|submit|pay/i;
    if (step.action === "CLICK" && forbidden.test(String(step.fieldLabel || ""))) return { status: "PAUSED_BEFORE_SUBMIT" };
    await agentPortalView.webContents.executeJavaScript("(() => { const input = document.querySelector(" + JSON.stringify(step.cssSelector) + "); if (!input) return false; input.scrollIntoView({ behavior: 'smooth', block: 'center' }); input.focus(); input.value = " + JSON.stringify(String(step.valueToFill)) + "; input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); input.style.outline = '3px solid #38bdf8'; input.style.backgroundColor = 'rgba(56, 189, 248, 0.12)'; return true; })()");
    return { status: "SYNCED_LEFT_AND_RIGHT", filledSelector: step.cssSelector, proofOpened: path.basename(safePath), proofPage: step.sourcePage || 1 };
  } catch (e) { return { status: "ERROR", reason: String(e.message) }; }
}
function bindMonitor2Events(primaryWin) {
  try {
    initDualSynchronizedViews();
    const refresh = () => applyDualScreenSplitLayout(primaryWin, currentSplitRatio);
    screen.on("display-added", refresh);
    screen.on("display-removed", refresh);
    screen.on("display-metrics-changed", refresh);
    ipcMain.handle("fanal:set-monitor2-split", (_ev, ratioNumber) => applyDualScreenSplitLayout(primaryWin, ratioNumber));
    ipcMain.handle("fanal:run-synced-step", (_ev, payload) => executeSynchronizedStepOnMonitor2((payload && payload.step) || {}, (payload && payload.connectedFolderPath) || ""));
    ipcMain.handle("fanal:set-agent-control", (_ev, payload) => { agentPilotState.mode = String((payload && payload.mode) || "RUNNING"); return { ok: true, activeMode: agentPilotState.mode }; });
    ipcMain.handle("fanal:step-agent-once", () => { agentPilotState.allowSingleStep = true; return { ok: true }; });
    ipcMain.handle("fanal:run-agent-plan", (_ev, payload) => runHudGovernedAgentPlan(primaryWin.webContents, agentPortalView, (payload && payload.connectedFolderPath) || "", (payload && payload.plan) || []));
    try {
      if (agentPortalView && agentPortalView.webContents) {
        agentPortalView.webContents.on("before-input-event", (_ev, input) => {
          if (input.type === "keyDown" || input.type === "mouseDown") { agentPilotState.mode = "MANUAL"; try { primaryWin.webContents.send("fanal:hud-state-change", { state: "MANUAL", reason: "HUMAN_TOUCHED_PAGE" }); } catch (e) {} }
        });
      }
    } catch (e) {}
    ipcMain.handle("fanal:link-biometric", async () => {
      try {
        if (process.platform === "darwin") { await systemPreferences.promptTouchID("vincular la biometría a la bóveda Fanal (Loi 25)"); return { success: true }; }
        if (process.platform === "win32") { return safeStorage.isEncryptionAvailable() ? { success: true } : { success: false, error: "WINDOWS_HELLO_UNAVAILABLE" }; }
        return { success: false, error: "PLATAFORMA_SIN_BIOMETRIA" };
      } catch (e) { return { success: false, error: String(e.message) }; }
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
async function runHudGovernedAgentPlan(hudWc, view, folder, plan) {
  agentPilotState.currentPlan = plan || [];
  agentPilotState.stepCursor = 0;
  agentPilotState.mode = "RUNNING";
  for (let i = 0; i < (plan || []).length; i++) {
    await waitUntilAgentAllowedToProceed();
    agentPilotState.stepCursor = i + 1;
    const step = plan[i];
    if (step.action === "CLICK" && /envoyer|soumettre|transmettre|payer|signer|submit|pay/i.test(String(step.fieldLabel || ""))) {
      agentPilotState.mode = "BRAKED";
      try { hudWc.send("fanal:hud-state-change", { state: "BRAKED", stoppedAtLabel: step.fieldLabel }); } catch (e) {}
      break;
    }
    try { hudWc.send("fanal:hud-step-tick", { currentStep: i + 1, totalSteps: plan.length, fieldLabel: step.fieldLabel, anchorRef: step.anchorFieldKey || "Verificado", proofPage: step.sourcePage || 1 }); } catch (e) {}
    await executeSynchronizedStepOnMonitor2(step, folder);
  }
}
function watchMonitorPlugEvents(primaryWin, view) {
  try {
    const refresh = () => syncDualMonitorLayout(primaryWin, view);
    screen.on("display-added", refresh);
    screen.on("display-removed", refresh);
    screen.on("display-metrics-changed", refresh);
  } catch (e) {}
}
const COMPACT_WIDTH = 380;
const EXPANDED_WIDTH = 1040;
function setupCoworkRightDrawer(mainWindow) {
  try {
    rightDrawerView = new WebContentsView({
      webPreferences: {
        partition: "persist:fanal-client-workspace",
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        plugins: true,
      },
    });
    rightDrawerView.webContents.setWindowOpenHandler(({ url }) => {
      if (String(url).startsWith("https://") || String(url).startsWith("http://127.0.0.1")) { try { rightDrawerView.webContents.loadURL(url); } catch (e) {} }
      return { action: "deny" };
    });
    ipcMain.handle("fanal:open-in-right-drawer", async (_e, target, pageNumber) => {
      const bounds = mainWindow.getBounds();
      if (bounds.width < EXPANDED_WIDTH) {
        mainWindow.setBounds({ x: Math.max(0, bounds.x - (EXPANDED_WIDTH - COMPACT_WIDTH)), y: bounds.y, width: EXPANDED_WIDTH, height: bounds.height });
      }
      mainWindow.contentView.addChildView(rightDrawerView);
      rightDrawerView.setBounds({ x: COMPACT_WIDTH, y: 36, width: EXPANDED_WIDTH - COMPACT_WIDTH, height: bounds.height - 36 });
      const t = String(target || "");
      try {
        if (/^https?:\/\//i.test(t)) { await rightDrawerView.webContents.loadURL(t); return { opened: true, mode: "WEB_ECOSYSTEM" }; }
        const ext = path.extname(t).toLowerCase();
        const fileUrl = "file://" + path.resolve(t);
        if (ext === ".pdf") { await rightDrawerView.webContents.loadURL(fileUrl + "#page=" + (pageNumber || 1) + "&view=FitH"); }
        else if ([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".bmp"].includes(ext)) { const html = "<html><body style='margin:0;background:#090d16;display:flex;align-items:center;justify-content:center;height:100vh'><img src='" + fileUrl + "' style='max-width:96%;max-height:96%;object-fit:contain'/></body></html>"; await rightDrawerView.webContents.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html)); }
        else if ([".csv", ".tsv", ".txt", ".jsonl", ".md"].includes(ext)) { const raw = fsx.readFileSync(t, "utf8").slice(0, 100000).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); const html = "<html><body style='margin:0;padding:14px;background:#090d16;color:#e2e8f0;font-family:monospace;font-size:12px;white-space:pre-wrap'>" + raw + "</body></html>"; await rightDrawerView.webContents.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html)); }
        else { await rightDrawerView.webContents.loadURL(fileUrl); }
      } catch (e) {}
      return { opened: true, mode: "LOCAL_FILE", ext };
    });
    ipcMain.handle("fanal:close-right-drawer", () => {
      try {
        const bounds = mainWindow.getBounds();
        mainWindow.contentView.removeChildView(rightDrawerView);
        if (bounds.width > COMPACT_WIDTH) { mainWindow.setBounds({ x: bounds.x + (bounds.width - COMPACT_WIDTH), y: bounds.y, width: COMPACT_WIDTH, height: bounds.height }); }
      } catch (e) {}
      return { closed: true };
    });
  } catch (e) {}
}
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
// El sandbox de la carpeta conectada (el chip [📁]): Fanal solo toca el expediente activo
let allowedClientFolder = null;
try {
  ipcMain.handle("fanal:set-connected-folder", (_e, p) => { const r = path.resolve(p); allowedClientFolder = r; return { activeFolderChip: path.basename(r), fullPath: r }; });
} catch (e) {}
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

// El registro de arranque (el regalo forense): cualquier error del proceso principal
// queda escrito en ~/.dsh/fanal-startup.log — jamás un silencio sin diagnóstico.
try {
  process.on("uncaughtException", (e) => { try { require("node:fs").appendFileSync(require("node:path").join(require("node:os").homedir(), ".dsh", "fanal-startup.log"), new Date().toISOString() + " UNCAUGHT: " + String(e && e.stack || e) + "\n"); } catch (_) {} });
  process.on("unhandledRejection", (e) => { try { require("node:fs").appendFileSync(require("node:path").join(require("node:os").homedir(), ".dsh", "fanal-startup.log"), new Date().toISOString() + " REJECTION: " + String(e && e.stack || e) + "\n"); } catch (_) {} });
} catch (e) {}
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
  })
  setupCoworkRightDrawer(win);
  watchMonitorPlugEvents(win, rightDrawerView);
  bindMonitor2Events(win);
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
