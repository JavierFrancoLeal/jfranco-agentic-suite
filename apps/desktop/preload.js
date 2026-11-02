// Le Veilleux Desktop — preload bridge. Created by J.Franco. MIT.
// Minimal, locked-down bridge: the page stays fully isolated.
const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("leVeilleux", {
  platform: process.platform,
  isKiosk: process.argv.includes("--kiosk"),
});
