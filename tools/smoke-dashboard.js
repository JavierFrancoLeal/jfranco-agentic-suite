// STRICT smoke test for supervisor/dashboard.html.
// Created by J.Franco. MIT. Every element id the dashboard script
// references must exist in the HTML — a missing id throws instead of
// silently passing (the failure mode that masked a broken login page).
const fs = require("fs");
const path = require("path");

const htmlPath = path.join(__dirname, "..", "supervisor", "dashboard.html");
const html = fs.readFileSync(htmlPath, "utf8");
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.log("SMOKE FAILED: no <script> found"); process.exit(1); }
const src = m[1];

if (/^\s*="tab-/m.test(html)) {
  console.log("SMOKE FAILED: malformed =\"tab- tag found in dashboard.html");
  process.exit(1);
}
const reglagesIdx = html.indexOf('id="tab-reglages"');
const closeMainIdx = html.indexOf("</main>");
if (reglagesIdx < 0 || closeMainIdx < 0 || reglagesIdx > closeMainIdx) {
  console.log("SMOKE FAILED: #tab-reglages must exist inside <main> before </main>");
  process.exit(1);
}

const staticHtml = html.replace(/<script[\s\S]*?<\/script>/g, "");
const staticIdCounts = new Map();
for (const x of staticHtml.matchAll(/\bid="([A-Za-z0-9_-]+)"/g)) {
  const id = x[1];
  staticIdCounts.set(id, (staticIdCounts.get(id) || 0) + 1);
}
const duplicateIds = [...staticIdCounts.entries()].filter(([, c]) => c > 1);
if (duplicateIds.length > 0) {
  console.log("SMOKE FAILED: duplicate DOM IDs in dashboard.html:", duplicateIds.map(([k, c]) => `${k}(x${c})`).join(", "));
  process.exit(1);
}

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

const bodyClasses = new Set();
const document = {
  getElementById: (id) => {
    if (!(id in elems)) throw new Error('STRICT: missing element id="' + id + '"');
    return elems[id];
  },
  querySelectorAll: () => [],
  createElement: () => mk("x"),
  body: {
    classList: {
      toggle(c, force) {
        if (force === true) { bodyClasses.add(c); return true; }
        if (force === false) { bodyClasses.delete(c); return false; }
        if (bodyClasses.has(c)) { bodyClasses.delete(c); return false; }
        bodyClasses.add(c); return true;
      },
      add(...cs) { cs.forEach((c) => bodyClasses.add(c)); },
      remove(...cs) { cs.forEach((c) => bodyClasses.delete(c)); },
    },
  },
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
  new Function("document", "localStorage", "sessionStorage", "navigator", "fetch", "location", "window", "Notification", src)(
    document, localStorage, sessionStorage, navigator, fetch, location, window, Notification
  );
  if (!bodyClasses.has("simpleview")) {
    throw new Error("STRICT: simpleview (Inbox-First) must be active by default on fresh load");
  }
  console.log("SMOKE TEST PASSED: sin errores runtime — botones vivos, 0 duplicate IDs, Inbox-First activo");
  process.exit(0);
} catch (e) {
  console.log("SMOKE FAILED:", e.message);
  process.exit(1);
}
