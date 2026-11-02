// Le Veilleux Desktop — preload bridge. Created by J.Franco. MIT.
// Minimal, locked-down bridge: the page stays isolated; only the
// first-run setup is exposed to the welcome screen.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("leVeilleux", {
  platform: process.platform,
  isKiosk: process.argv.includes("--kiosk"),
  setup: (payload) => ipcRenderer.send("leveilleux-setup", payload),
});
