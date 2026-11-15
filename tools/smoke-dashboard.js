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

const i18nPath = path.join(__dirname, "..", "supervisor", "dashboard-i18n.js");
const i18nSrc = fs.readFileSync(i18nPath, "utf8");

const allIds = new Set();
for (const x of html.matchAll(/id="([A-Za-z0-9_-]+)"/g)) allIds.add(x[1]);

const elems = {};
function mk(id) {
  const classes = new Set();
  const listeners = {};
  const el = {
    id, textContent: "", placeholder: "", innerHTML: "", value: "",
    checked: false,
    dataset: {},
    children: [],
    classList: {
      add(...cs) { cs.forEach((c) => classes.add(c)); },
      remove(...cs) { cs.forEach((c) => classes.delete(c)); },
      contains(c) { return classes.has(c); },
      toggle(c, force) {
        if (force === true) { classes.add(c); return true; }
        if (force === false) { classes.delete(c); return false; }
        if (classes.has(c)) { classes.delete(c); return false; }
        classes.add(c); return true;
      },
    },
    style: {},
    addEventListener(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); },
    click() {
      if (typeof el.onclick === "function") el.onclick();
      (listeners.click || []).forEach((fn) => fn());
    },
    appendChild(child) { el.children.push(child); return child; },
    remove() {},
    querySelector(sel) {
      if (sel === "tbody") return mk(id + "_tbody");
      if (sel === "b") return mk(id + "_b");
      return null;
    },
    querySelectorAll() { return []; },
    disabled: false, offsetWidth: 1,
    setAttribute() {},
    options: [{ value: "restaurant", textContent: "" }, { value: "hotel", textContent: "" }, { value: "clinic", textContent: "" }, { value: "school", textContent: "" }],
    parentNode: { style: {} },
    closest() { return { style: {} }; },
    scrollIntoView() {},
    focus() {},
  };
  return el;
}
for (const id of allIds) elems[id] = mk(id);
if (elems.loginUser && elems.loginView) elems.loginUser.parentNode = elems.loginView;

const bodyClasses = new Set();
const document = {
  getElementById: (id) => {
    if (!(id in elems)) throw new Error('STRICT: missing element id="' + id + '"');
    return elems[id];
  },
  querySelector: (sel) => {
    if (sel === "#wizardView") return elems.wizardView;
    return null;
  },
  querySelectorAll: (sel) => {
    if (sel === "#wizBody" || sel === "#langStepList .langbtn") return elems.langStepList.children;
    return [];
  },
  createElement: () => mk("x"),
  body: {
    appendChild() {},
    classList: {
      toggle(c, force) {
        if (force === true) { bodyClasses.add(c); return true; }
        if (force === false) { bodyClasses.delete(c); return false; }
        if (bodyClasses.has(c)) { bodyClasses.delete(c); return false; }
        bodyClasses.add(c); return true;
      },
      add(...cs) { cs.forEach((c) => bodyClasses.add(c)); },
      remove(...cs) { cs.forEach((c) => bodyClasses.delete(c)); },
      contains(c) { return bodyClasses.has(c); },
    },
  },
};
const lsStore = new Map();
const ssStore = new Map();
const localStorage = {
  getItem: (k) => (lsStore.has(k) ? lsStore.get(k) : null),
  setItem: (k, v) => lsStore.set(k, String(v)),
  removeItem: (k) => lsStore.delete(k),
  clear: () => lsStore.clear(),
};
const sessionStorage = {
  getItem: (k) => (ssStore.has(k) ? ssStore.get(k) : null),
  setItem: (k, v) => ssStore.set(k, String(v)),
  clear: () => ssStore.clear(),
};
const navigator = { clipboard: { writeText: async () => {} }, vibrate: () => {} };
const fetchLog = [];
const fetch = async (url, opts = {}) => {
  let parsed = null;
  if (opts && opts.body) { try { parsed = JSON.parse(opts.body); } catch {} }
  fetchLog.push({ url, method: (opts && opts.method) || "GET", body: parsed });
  if (url === "/api/setup-status") return { json: async () => ({ users: 0 }) };
  if (url === "/api/setup") return { json: async () => ({ token: "tok", name: parsed && parsed.user || "owner", role: "owner", label: "owner" }) };
  if (url === "/api/sector") return { json: async () => ({ id: "hotel" }) };
  if (url === "/api/settings/brain") return { json: async () => ({ mode: "dual_cloud", deepseek: { configured: true }, gemini: { configured: true } }) };
  if (url === "/api/intake/config") return { json: async () => ({ ok: true, imap: {}, folder: {} }) };
  return { json: async () => ({ ok: true }) };
};
const location = { search: "", hostname: "x", port: "", origin: "http://x", protocol: "http:" };
const window = { SpeechRecognition: null, AudioContext: null, webkitAudioContext: null, addEventListener() {} };
const Notification = function () {}; Notification.permission = "default"; Notification.requestPermission = async () => "granted";
global.requestAnimationFrame = () => 0;

const origSetTimeout = global.setTimeout;
const queuedTimeouts = [];
global.setTimeout = (fn, ms) => {
  if (typeof fn === "function" && Number(ms) <= 1400) {
    queuedTimeouts.push(fn);
    return queuedTimeouts.length;
  }
  return 0;
};
global.setInterval = () => 0;
global.clearInterval = () => {};
function flushMicroTimeouts() {
  while (queuedTimeouts.length) {
    const fn = queuedTimeouts.shift();
    fn();
  }
}

process.on("unhandledRejection", (e) => { console.log("ASYNC ERROR:", e && e.stack || e.message); process.exit(1); });
(async () => {
  try {
    new Function("window", i18nSrc)(window);
    new Function("document", "localStorage", "sessionStorage", "navigator", "fetch", "location", "window", "Notification", src)(
      document, localStorage, sessionStorage, navigator, fetch, location, window, Notification
    );
    await new Promise((r) => origSetTimeout(r, 10));
    flushMicroTimeouts();

    if (!bodyClasses.has("simpleview")) {
      throw new Error("STRICT: simpleview (Inbox-First) must be active by default on fresh load");
    }

    // Exercise REAL first-run language selection -> 8-step installation wizard -> owner setup
    const esBtn = elems.langStepList.children.find((b) => String(b.innerHTML).includes("ES"));
    if (!esBtn) throw new Error("STRICT: Spanish button missing in langStepList");
    esBtn.click();
    flushMicroTimeouts();

    if (elems.wizardView.classList.contains("hidden") || elems.wizardView.style.display !== "flex") {
      throw new Error("STRICT: wizardView did not open after language selection");
    }
    if (!String(elems.wizBody.innerHTML || "").includes("🚀")) {
      throw new Error("STRICT: wizard Step 0 failed to render body (stuck placeholder / purple screen)");
    }

    // Step 0 -> Step 1 (business name)
    elems.wizNext.click();
    flushMicroTimeouts();
    if (elems.wizCard.classList.contains("slideout")) {
      throw new Error("STRICT: wizCard stuck with slideout class after Step 0 -> 1");
    }
    if (!String(elems.wizBody.innerHTML).includes("wizBizInput")) {
      throw new Error("STRICT: wizard Step 1 did not render wizBizInput");
    }
    elems.wizBizInput = mk("wizBizInput");
    elems.wizBizInput.value = "Trasunto Beta";

    // Step 1 -> Step 2 (sector)
    elems.wizNext.click();
    flushMicroTimeouts();
    if (!String(elems.wizBody.innerHTML).includes('data-sec="hotel"')) {
      throw new Error("STRICT: wizard Step 2 did not render sector options");
    }

    // Step 2 -> Step 3 (Dual BYOK + vault)
    elems.wizNext.click();
    flushMicroTimeouts();
    if (!String(elems.wizBody.innerHTML).includes("wizKeyInput")) {
      throw new Error("STRICT: wizard Step 3 did not render BYOK inputs");
    }
    if (/id="(?:modeLocalBtn|localSovereignPanel|brainLocalModelSel|brainLocalDetectBtn|wizBrainSel)"/.test(src) || /local_sovereign/.test(src)) {
      throw new Error("STRICT: removed Ollama / local_sovereign UI still present in dashboard.html");
    }
    if (/#090d16|#020617|#064e3b|#38bdf8|#1b2436|#fff5f5/i.test(html)) {
      throw new Error("STRICT: off-brand dark-terminal or pink colors found in dashboard.html (violates Trasunto luminous purple palette)");
    }
    const panelHtml = fs.readFileSync(path.join(__dirname, "..", "ui", "panel.html"), "utf8");
    const welcomeHtml = fs.readFileSync(path.join(__dirname, "..", "apps", "desktop", "welcome.html"), "utf8");
    const mainJs = fs.readFileSync(path.join(__dirname, "..", "apps", "desktop", "main.js"), "utf8");
    for (const [label, content] of [["ui/panel.html", panelHtml], ["apps/desktop/welcome.html", welcomeHtml], ["apps/desktop/main.js", mainJs]]) {
      if (/#090d16|#020617|#064e3b|#38bdf8|#1b2436|#fff5f5/i.test(content)) {
        throw new Error(`STRICT: off-brand dark-terminal or pink colors found in ${label}`);
      }
    }
    if (/#0f172a/i.test(mainJs)) {
      throw new Error("STRICT: off-brand #0f172a background found in apps/desktop/main.js");
    }
    if (/DSH Assistant|DeepSeek Harness/i.test(panelHtml)) {
      throw new Error("STRICT: legacy DSH/DeepSeek Harness branding found in ui/panel.html");
    }
    if (!html.includes('id="wallBackBtn"') || !panelHtml.includes('id="panelBackBtn"')) {
      throw new Error("STRICT: missing #wallBackBtn in dashboard.html or #panelBackBtn in ui/panel.html");
    }
    for (const btnId of ["viewBtn", "darkBtn", "notifBell", "soundBtn"]) {
      const re = new RegExp(`id="${btnId}"[\\s\\S]*?<svg`, "i");
      if (!re.test(html)) throw new Error(`STRICT: chrome button #${btnId} must render an inline <svg> icon`);
    }
    const toastZ = Number((html.match(/\.toast\{[^}]*z-index:(\d+)/) || [])[1] || 0);
    const wizZ = Number((html.match(/\.wizard\{[^}]*z-index:(\d+)/) || [])[1] || 0);
    const curtainZ = Number((html.match(/id="fanal-lock-curtain"[^>]*z-index:(\d+)/) || [])[1] || 0);
    if (!(toastZ > wizZ && toastZ > curtainZ)) {
      throw new Error(`STRICT: .toast z-index (${toastZ}) must exceed .wizard (${wizZ}) and #fanal-lock-curtain (${curtainZ})`);
    }
    elems["master-pwd-input"] = mk("master-pwd-input");
    elems["vault-bio-status"] = mk("vault-bio-status");
    elems["vault-bio-btn"] = mk("vault-bio-btn");
    elems["vault-bio-card"] = mk("vault-bio-card");
    if (typeof window.linkBiometricOneClick === "function") {
      await window.linkBiometricOneClick();
      if (!elems["vault-bio-status"].textContent || elems["vault-bio-status"].style.display === "none") {
        throw new Error("STRICT: linkBiometricOneClick() with empty master password must surface inline error in #vault-bio-status");
      }
      if (elems["vault-bio-card"].classList.contains("linked")) {
        throw new Error("STRICT: linkBiometricOneClick() without master password must not mark bio card linked");
      }
      window.fanalIPC = { setupVault: async () => ({ ok: true }), linkBiometric: async () => ({ success: true }) };
      window.electronAPI = window.fanalIPC;
      elems["master-pwd-input"].value = "Fanal-Strong-2026!";
      await window.linkBiometricOneClick();
      if (!elems["vault-bio-card"].classList.contains("linked") || elems["vault-bio-status"].style.color !== "#15803d") {
        throw new Error("STRICT: linkBiometricOneClick() happy path did not update #vault-bio-card / #vault-bio-status");
      }
      delete window.fanalIPC;
      delete window.electronAPI;
    }
    elems.wizKeyInput = mk("wizKeyInput");
    elems.wizKeyInput.value = "sk-test-ds-key";
    elems.wizGeminiKeyInput = mk("wizGeminiKeyInput");
    elems.wizGeminiKeyInput.value = "AIza-test-gm-key";

    // Step 3 -> Step 4 -> Back -> Step 4 (must preserve wizDraft values!)
    elems.wizNext.click();
    flushMicroTimeouts();
    elems.wizBack.click();
    if (!String(elems.wizBody.innerHTML).includes("sk-test-ds-key") || !String(elems.wizBody.innerHTML).includes("AIza-test-gm-key")) {
      throw new Error("STRICT: navigating back to Step 3 lost typed BYOK keys");
    }
    elems.wizNext.click();
    flushMicroTimeouts();

    // Step 4 (perms) -> Step 5 (constitution)
    elems.wizNext.click();
    flushMicroTimeouts();
    if (!String(elems.wizBody.innerHTML).includes("wizConsInput")) {
      throw new Error("STRICT: wizard Step 5 did not render wizConsInput");
    }
    elems.wizConsInput = mk("wizConsInput");
    elems.wizConsInput.value = "Siempre firmar rojo";

    // Step 5 -> Step 6 (Recap must show preserved values, NOT dashes!)
    elems.wizNext.click();
    flushMicroTimeouts();
    if (elems.wizRecapBiz.textContent !== "Trasunto Beta" || elems.wizRecapKey.textContent !== "✅ Dual" || elems.wizRecapCons.textContent !== "✔") {
      throw new Error(`STRICT: wizard Step 6 Recap lost state: biz=${elems.wizRecapBiz.textContent}, key=${elems.wizRecapKey.textContent}, cons=${elems.wizRecapCons.textContent}`);
    }

    // Step 6 -> Step 7 -> Finish
    elems.wizNext.click();
    flushMicroTimeouts();
    elems.wizNext.click();
    if (localStorage.getItem("lv-onboarded") !== "1") {
      throw new Error("STRICT: completing wizard did not set lv-onboarded=1");
    }

    // Simulate owner account creation + direct Réglages saves -> zero double-wrapped {method:"POST",body:...} payloads allowed!
    elems.setupUser.value = "Javier";
    elems.setupPass.value = "claveSegura123";
    elems.setupBtn.click();
    await new Promise((r) => origSetTimeout(r, 20));
    flushMicroTimeouts();
    await new Promise((r) => origSetTimeout(r, 20));

    elems.vaultDeepseekInput.value = "sk-save-ds";
    elems.vaultGeminiInput.value = "AIza-save-gm";
    elems.brainSaveClosed.click();
    await new Promise((r) => origSetTimeout(r, 20));

    elems.imapEnabledChk.checked = true;
    elems.imapHostInput.value = "imap.gmail.com";
    elems.imapUserInput.value = "javier@example.com";
    elems.imapPassInput.value = "abcd efgh ijkl mnop";
    elems.intakeFolderInput.value = "Fanal-Inbox";
    elems.intakeSaveBtn.click();
    await new Promise((r) => origSetTimeout(r, 20));

    for (const req of fetchLog) {
      if (req.body && req.body.method === "POST" && "body" in req.body) {
        throw new Error(`STRICT: ${req.url} sent double-wrapped {method:"POST", body:...} instead of JSON body!`);
      }
    }
    const brainSave = fetchLog.filter((x) => x.url === "/api/settings/brain" && x.method === "POST").pop();
    if (!brainSave || brainSave.body.deepseekKey !== "sk-save-ds" || brainSave.body.geminiKey !== "AIza-save-gm") {
      throw new Error("STRICT: /api/settings/brain save did not transmit BYOK keys");
    }
    const intakeSave = fetchLog.filter((x) => x.url === "/api/intake/config" && x.method === "POST").pop();
    if (!intakeSave || !intakeSave.body.imap || intakeSave.body.imap.host !== "imap.gmail.com") {
      throw new Error("STRICT: /api/intake/config save did not transmit IMAP host");
    }

    // Verify resumed onboarding path: dsh-lang already set, lv-onboarded missing, users === 0
    localStorage.removeItem("lv-onboarded");
    elems.wizardView.classList.add("hidden");
    elems.wizardView.style.display = "none";
    elems.wizBody.innerHTML = "";
    new Function("document", "localStorage", "sessionStorage", "navigator", "fetch", "location", "window", "Notification", src)(
      document, localStorage, sessionStorage, navigator, fetch, location, window, Notification
    );
    await new Promise((r) => origSetTimeout(r, 15));
    flushMicroTimeouts();
    if (elems.wizardView.classList.contains("hidden") || !String(elems.wizBody.innerHTML).includes("🚀")) {
      throw new Error("STRICT: partial first-run (dsh-lang saved, users=0, !lv-onboarded) must resume wizard cleanly");
    }

    // Verify SVG icon chrome toggles keep inner <svg> intact (no textContent wipeout)
    for (const btnId of ["viewBtn", "darkBtn", "soundBtn"]) {
      if (typeof elems[btnId].onclick === "function") await elems[btnId].onclick();
      if (elems[btnId].textContent !== "") {
        throw new Error(`STRICT: #${btnId} click overwrote SVG children via textContent`);
      }
    }

    // Verify reopen continuity: closing and reopening after onboarding with users === 0 must keep #loginView & #setupSection visible (never collapse parentNode!)
    localStorage.setItem("dsh-lang", "fr");
    localStorage.setItem("lv-onboarded", "1");
    elems.wizardView.classList.add("hidden");
    elems.wizardView.style.display = "none";
    elems.loginView.classList.remove("hidden");
    elems.loginView.style.display = "";
    elems.setupSection.classList.add("hidden");
    elems.loginUser.style.display = "";
    new Function("document", "localStorage", "sessionStorage", "navigator", "fetch", "location", "window", "Notification", src)(
      document, localStorage, sessionStorage, navigator, fetch, location, window, Notification
    );
    await new Promise((r) => origSetTimeout(r, 15));
    flushMicroTimeouts();
    if (elems.loginView.style.display === "none" || elems.loginView.classList.contains("hidden")) {
      throw new Error("STRICT: reopen with users=0 & lv-onboarded=1 collapsed #loginView (blank language-only screen regression!)");
    }
    if (elems.setupSection.classList.contains("hidden") || elems.loginUser.style.display !== "none") {
      throw new Error("STRICT: reopen with users=0 must hide #loginUser cleanly while showing #setupSection inside #loginView");
    }

    console.log("SMOKE TEST PASSED: sin errores runtime — botones vivos, 0 duplicate IDs, Inbox-First activo, wizard 8/8 OK, API payloads limpios, reopen & SVG/Trasunto parity OK");
    process.exit(0);
  } catch (e) {
    console.log("SMOKE FAILED:", e && e.stack || e.message);
    process.exit(1);
  } finally {
    global.setTimeout = origSetTimeout;
  }
})();
