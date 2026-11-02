// Le Veilleux Desktop — Electron shell for the universal dashboard.
// Created by J.Franco. MIT.
//
//   LE_VEILLEUX_URL=http://127.0.0.1:8787/dashboard   (default)
//   electron .             normal window + system tray
//   electron . --kiosk     fullscreen kiosk (kitchen/back-office tablets)
//   LE_VEILLEUX_SMOKE=1    load once, print SMOKE OK, and quit (CI test)
const { app, BrowserWindow, Tray, Menu, shell, nativeImage } = require("electron");
const path = require("node:path");

const TARGET_URL = process.env.LE_VEILLEUX_URL || "http://127.0.0.1:8787/dashboard";
const KIOSK = process.argv.includes("--kiosk");
const SMOKE = process.env.LE_VEILLEUX_SMOKE === "1";

let win = null;
let tray = null;

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => { if (win) { win.show(); win.focus(); } });

  function createWindow() {
    win = new BrowserWindow({
      width: 1280,
      height: 840,
      kiosk: KIOSK,
      frame: !KIOSK,
      title: "Le Veilleux",
      backgroundColor: "#0b1220",
      icon: path.join(__dirname, "assets", "icon.png"),
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    win.setMenuBarVisibility(false);
    win.loadURL(TARGET_URL);
    win.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: "deny" };
    });
    if (SMOKE) {
      win.webContents.once("did-finish-load", () => {
        console.log("SMOKE OK — window loaded: " + TARGET_URL);
        setTimeout(() => app.quit(), 400);
      });
      win.webContents.once("did-fail-load", (_e, code, desc) => {
        console.log("SMOKE FAIL: " + desc + " (" + code + ")");
        app.exit(1);
      });
    }
  }

  app.whenReady().then(() => {
    createWindow();
    try {
      const icon = nativeImage.createFromPath(path.join(__dirname, "assets", "icon.png"));
      tray = new Tray(icon.resize({ width: 18, height: 18 }));
      tray.setToolTip("Le Veilleux — l'IA travaille, l'humain veille");
      tray.setContextMenu(Menu.buildFromTemplate([
        { label: "Abrir Le Veilleux", click: () => { win.show(); win.focus(); } },
        { type: "separator" },
        { label: "Salir", click: () => app.quit() },
      ]));
    } catch (e) { /* tray optional (kiosk) */ }
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin" || KIOSK) app.quit();
  });
}
