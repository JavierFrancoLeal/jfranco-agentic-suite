// STRICT smoke test for supervisor/dashboard.html.
// Created by J.Franco. MIT. Every element id the dashboard script
// references must exist in the HTML — a missing id throws instead of
// silently passing (the failure mode that masked a broken login page).
const fs = require("fs");
const path = require("path");

const htmlPath = path.join(__dirname, "..", "supervisor", "dashboard.html");
const html = fs.readFileSync(htmlPath, "utf8");
const src = fs.readFileSync(path.join(__dirname, "..", "supervisor", "dashboard.js"), "utf8");
const i18nSrc = fs.readFileSync(path.join(__dirname, "..", "supervisor", "i18n.js"), "utf8");

const allIds = new Set();
for (const x of html.matchAll(/id="([A-Za-z0-9_-]+)"/g)) allIds.add(x[1]);

const elems = {};
function mk(id) {
  return {
    id, textContent: "", placeholder: "", innerHTML: "", value: "",
    dataset: {}, classList: { add() {}, remove() {}, toggle() {} }, style: {},
    addEventListener() {}, appendChild() {}, querySelector() { return null; },
    querySelectorAll() { return []; }, disabled: false, offsetWidth: 1,
    setAttribute() {}, options: [{ textContent: "" }, { textContent: "" }, { textContent: "" }, { textContent: "" }],
    parentNode: { style: {} }, closest() { return { style: {} }; },
  };
}
for (const id of allIds) elems[id] = mk(id);

const document = {
  getElementById: (id) => {
    if (!(id in elems)) throw new Error('STRICT: missing element id="' + id + '"');
    return elems[id];
  },
  querySelectorAll: () => [],
  createElement: () => mk("x"),
  body: { classList: { toggle() {}, add() {}, remove() {} } },
};
const localStorage = { getItem: () => null, setItem: () => {} };
const sessionStorage = { getItem: () => null, setItem: () => {}, clear: () => {} };
const navigator = { clipboard: { writeText: async () => {} }, vibrate: () => {} };
const fetch = async () => ({ json: async () => ({}) });
const location = { search: "", hostname: "x", port: "", origin: "http://x", protocol: "http:" };
const window = { SpeechRecognition: null, AudioContext: null, webkitAudioContext: null };
const Notification = function () {}; Notification.permission = "default"; Notification.requestPermission = async () => {};
global.requestAnimationFrame = () => 0;

process.on("unhandledRejection", (e) => { console.log("ASYNC ERROR:", e.message); process.exit(1); });
try {
  const S = new Function(i18nSrc + "\n; return S;")();
  new Function("document", "localStorage", "sessionStorage", "navigator", "fetch", "location", "window", "Notification", "S", src)(
    document, localStorage, sessionStorage, navigator, fetch, location, window, Notification, S
  );
  console.log("SMOKE TEST PASSED: sin errores runtime — botones vivos");
} catch (e) {
  console.log("SMOKE FAILED:", e.message);
  process.exit(1);
}
