// Fanal Desktop — preload bridge. Created by J.Franco. MIT.
// Minimal, locked-down bridge: the page stays sandboxed and isolated; only
// first-run setup, vault/biometric controls, and allowlisted push events cross.
const { contextBridge, ipcRenderer } = require("electron");

const ALLOWED_PUSH_CHANNELS = new Set([
  "fanal:hud-state-change",
  "fanal:hud-step-tick",
  "fanal:vault-locked",
  "fanal:vault-unlocked",
]);

const isWebOrigin = Boolean(
  typeof window !== "undefined" &&
  window.location &&
  (window.location.protocol === "http:" || window.location.protocol === "https:")
);

if (isWebOrigin) {
  contextBridge.exposeInMainWorld("leVeilleux", {
    platform: process.platform,
    isKiosk: process.argv.includes("--kiosk"),
    setup: (payload) => ipcRenderer.send("leveilleux-setup", payload),
  });

  const fanalBridge = Object.freeze({
    linkBiometric: () => ipcRenderer.invoke("fanal:link-biometric"),
    setupVault: (masterPassword) => ipcRenderer.invoke("fanal:setup-vault", { masterPassword }),
    unlockVault: (payload) => ipcRenderer.invoke("fanal:unlock-vault", payload),
    lockVault: (reason) => ipcRenderer.invoke("fanal:lock-vault", reason),
    getVaultStatus: () => ipcRenderer.invoke("fanal:vault-status"),
    setMonitor2Split: (ratioNumber) => ipcRenderer.invoke("fanal:set-monitor2-split", ratioNumber),
    runSyncedStep: (payload) => ipcRenderer.invoke("fanal:run-synced-step", payload),
    setAgentControl: (payload) => ipcRenderer.invoke("fanal:set-agent-control", payload),
    stepAgentOnce: () => ipcRenderer.invoke("fanal:step-agent-once"),
    runAgentPlan: (payload) => ipcRenderer.invoke("fanal:run-agent-plan", payload),
    openInRightDrawer: (target, pageNumber) => ipcRenderer.invoke("fanal:open-in-right-drawer", target, pageNumber),
    closeRightDrawer: () => ipcRenderer.invoke("fanal:close-right-drawer"),
    setConnectedFolder: (folderPath) => ipcRenderer.invoke("fanal:set-connected-folder", folderPath),
    exportDiagnostic: () => ipcRenderer.invoke("fanal:export-diagnostic"),
    on: (channel, listener) => {
      if (!ALLOWED_PUSH_CHANNELS.has(channel) || typeof listener !== "function") {
        return () => {};
      }
      const wrapped = (_event, data) => listener(null, data);
      ipcRenderer.on(channel, wrapped);
      return () => ipcRenderer.removeListener(channel, wrapped);
    },
  });

  contextBridge.exposeInMainWorld("fanalIPC", fanalBridge);
  contextBridge.exposeInMainWorld("electronAPI", fanalBridge);
}
