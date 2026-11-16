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
const setupValPath = path.join(__dirname, "..", "supervisor", "setup-validator.js");
const setupValSrc = fs.readFileSync(setupValPath, "utf8");

const allIds = new Set();
for (const x of html.matchAll(/id="([A-Za-z0-9_-]+)"/g)) allIds.add(x[1]);

const elems = {};
const dynamicEscCache = new WeakMap();
const DYNAMIC_OPTIONAL_ID_RE = /^(?:wiz(?:BizInput|KeyInput|GeminiKeyInput|Cons\w*)|setupCons\w*|master-pwd-input|entropy-\w+|vault-bio-\w+)$/;

function extractInitialAttrs(htmlChunk, id) {
  const escId = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const selectRe = new RegExp(`<select\\b[^>]*\\bid="${escId}"[^>]*>([\\s\\S]*?)<\\/select>`, "i");
  const sm = htmlChunk.match(selectRe);
  if (sm) {
    const selOpt = sm[1].match(/<option\b[^>]*\bvalue="([^"]*)"[^>]*\bselected\b/i)
      || sm[1].match(/<option\b[^>]*\bselected\b[^>]*\bvalue="([^"]*)"/i)
      || sm[1].match(/<option\b[^>]*\bvalue="([^"]*)"/i);
    return { value: selOpt ? selOpt[1] : "", checked: false };
  }
  const inputRe = new RegExp(`<(?:input|textarea)\\b[^>]*\\bid="${escId}"[^>]*>`, "i");
  const im = htmlChunk.match(inputRe);
  if (!im) return null;
  const openTag = im[0];
  const vm = openTag.match(/\bvalue="([^"]*)"/i);
  return { value: vm ? vm[1] : "", checked: /\bchecked\b/i.test(openTag) };
}

function registerDynamicFromHtml(ownerEl, rawHtml) {
  const s = String(rawHtml || "");
  for (const m of s.matchAll(/\bid="([A-Za-z0-9_-]+)"/g)) {
    const childId = m[1];
    if (!(childId in elems)) elems[childId] = mk(childId);
    const attrs = extractInitialAttrs(s, childId);
    if (attrs) {
      elems[childId].value = attrs.value;
      elems[childId].checked = attrs.checked;
    }
  }
  const escBoxes = [];
  for (const m of s.matchAll(/<input\b[^>]*data-esc-key="([^"]+)"[^>]*>/gi)) {
    escBoxes.push({
      dataset: { escKey: m[1] },
      checked: /\bchecked\b/i.test(m[0]),
      addEventListener() {},
    });
  }
  dynamicEscCache.set(ownerEl, escBoxes);
}

function mk(id) {
  const classes = new Set();
  const listeners = {};
  let innerHtmlStore = "";
  const el = {
    id, textContent: "", placeholder: "", value: "",
    checked: false, open: false,
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
    dispatchEvent(ev) {
      const name = typeof ev === "string" ? ev : (ev && ev.type) || "";
      if (name && typeof el["on" + name] === "function") el["on" + name]();
      (listeners[name] || []).forEach((fn) => fn(ev));
    },
    appendChild(child) { el.children.push(child); return child; },
    remove() {},
    querySelector(sel) {
      if (sel === "tbody") return mk(id + "_tbody");
      if (sel === "b") return mk(id + "_b");
      return null;
    },
    querySelectorAll(sel) {
      if (sel === 'input[data-esc-key]') return dynamicEscCache.get(el) || [];
      return [];
    },
    disabled: false, offsetWidth: 1,
    setAttribute() {},
    options: [{ value: "restaurant", textContent: "" }, { value: "hotel", textContent: "" }, { value: "clinic", textContent: "" }, { value: "school", textContent: "" }],
    parentNode: { style: {} },
    closest(sel) {
      if (typeof sel === "string" && (el.dataset.tipLang || sel.includes(".langbtn") && (el.className || "").includes("langbtn"))) return el;
      return { style: {} };
    },
    hasAttribute() { return false; },
    getBoundingClientRect() { return { left: 100, top: 100, right: 200, bottom: 140, width: 100, height: 40 }; },
    scrollIntoView() {},
    focus() {},
  };
  Object.defineProperty(el, "innerHTML", {
    get() { return innerHtmlStore; },
    set(v) {
      innerHtmlStore = String(v == null ? "" : v);
      registerDynamicFromHtml(el, innerHtmlStore);
    },
  });
  return el;
}
for (const id of allIds) elems[id] = mk(id);
if (elems.loginUser && elems.loginView) elems.loginUser.parentNode = elems.loginView;
if (elems.setupSector) {
  elems.setupSector.options = ["solo","restaurant","hotel","clinic","pharmacy","workshop","realestate","school","tourisme","agroalimentaire","generic"].map((v) => ({ value: v, textContent: "" }));
  elems.setupSector.value = "restaurant";
}
if (elems.setupSectorWrap) elems.setupSectorWrap.classList.add("hidden");
if (elems.setupScale) {
  elems.setupScale.options = ["", "AUTONOMOUS_SOLO", "MICRO_SINGLE_OWNER", "SME_CELL"].map((v) => ({ value: v, textContent: "" }));
  elems.setupScale.value = "";
}
if (elems.scalePrefSelect) {
  elems.scalePrefSelect.options = ["AUTONOMOUS_SOLO", "MICRO_SINGLE_OWNER", "SME_CELL"].map((v) => ({ value: v, textContent: "" }));
  elems.scalePrefSelect.value = "AUTONOMOUS_SOLO";
}

const wizQueryCache = {};
const bodyClasses = new Set();
const docListeners = {};
const document = {
  getElementById: (id) => {
    if (id in elems) return elems[id];
    if (DYNAMIC_OPTIONAL_ID_RE.test(id)) return null;
    throw new Error('STRICT: missing element id="' + id + '"');
  },
  addEventListener(ev, fn) { (docListeners[ev] = docListeners[ev] || []).push(fn); },
  querySelector: (sel) => {
    if (sel === "#wizardView") return elems.wizardView;
    return null;
  },
  querySelectorAll: (sel) => {
    if (sel === "#wizBody" || sel === "#langStepList .langbtn") return elems.langStepList.children;
    if (sel === "#presetGrid button[data-sec-id]") return elems.presetGrid ? elems.presetGrid.children : [];
    const wizAttrMap = {
      ".wiz-sectors .ws[data-scale]": ["scale", /data-scale="([^"]+)"/g],
      ".wiz-sectors .ws[data-prof]": ["prof", /data-prof="([^"]+)"/g],
      ".wiz-sectors .ws[data-sec]": ["sec", /data-sec="([^"]+)"/g],
    };
    if (wizAttrMap[sel]) {
      const [attr, re] = wizAttrMap[sel];
      const matches = [...String(elems.wizBody.innerHTML || "").matchAll(re)].map((m) => ({
        dataset: { [attr]: m[1] },
        onclick: null,
        classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
      }));
      wizQueryCache[sel] = matches;
      return matches;
    }
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
  if (url === "/api/setup-status") return { json: async () => ({ users: 0, serverSetupDone: false }) };
  if (url && url.startsWith("/api/setup/check-username")) return { json: async () => ({ available: true, code: "OK" }) };
  if (url === "/api/setup") return { json: async () => ({ token: "tok", name: parsed && parsed.user || "owner", role: "owner", label: "owner", scaleType: parsed && parsed.scaleType || "AUTONOMOUS_SOLO", constitutionSchema: "FANAL-CONSTITUTION-V2", genesisHash: "GENESIS1234ABCD", attestation: { schemaVersion: "FANAL-INSTALL-ATTEST-V1", attestationId: "ATT-SMOKE1", genesisHash: "GENESIS1234ABCD", signatureB64: "c2ln" } }) };
  if (url === "/api/login") return { json: async () => ({ token: "tok2", name: parsed && parsed.user || "owner", role: "owner", label: "owner", verification: { verified: true, genesisHash: "GENESIS1234ABCD", constitutionSchema: "FANAL-CONSTITUTION-V2" } }) };
  if (url === "/api/installation/attestation") return { json: async () => ({ ok: true, attestation: { schemaVersion: "FANAL-INSTALL-ATTEST-V1", attestationId: "ATT-SMOKE1", genesisHash: "GENESIS1234ABCD", signatureB64: "c2ln" } }) };
  if (url === "/api/studio/verified-installations") return { json: async () => ({ installations: [] }) };
  if (url === "/api/studio/verify-installation") return { json: async () => ({ ok: true, verification: { attestationId: "ATT-SMOKE1", overallStatus: "VERIFIED", softwareLayer: { passed: true, signatureValid: true, zeroPiiVerified: true, errors: [] }, iaLayer: { coherenceStatus: "COHERENT", score: 100, advisories: [] }, humanLayer: { status: "PENDING_FOUNDER_SIGN_OFF" } }, installations: [] }) };
  if (url === "/api/sector") return { json: async () => ({ id: "hotel" }) };
  if (url === "/api/sector-presets") {
    return {
      json: async () => ({
        presets: [{ id: "solo" }, { id: "restaurant" }, { id: "clinic" }],
        soloProfessions: [
          { key: "CPA_COMPTABLE", sectorId: "solo", regulatoryBody: "Ordre CPA Québec", labels: { es: "📊 CPA / Contador colegiado", en: "📊 CPA / Chartered Accountant" } },
          { key: "CRIC_IMMIGRATION", sectorId: "solo", regulatoryBody: "CCIC / MIFI", labels: { es: "🛂 Consultor de inmigración (CRIC / MIFI)", en: "🛂 Immigration Consultant (RCIC / MIFI)" } },
        ],
        economicSectors: [
          { id: "restaurant", labels: { es: "🍽️ Restaurante", en: "🍽️ Restaurant" } },
        ],
      }),
    };
  }
  if (url === "/api/studio/telemetry") {
    return {
      json: async () => ({
        ok: true,
        localSummary: {
          billingModel: "PURE_FIXED_BUFFET_BETA",
          totals: { aiCalls: 8, deterministicOps: 4, totalTokens: 18200, estimatedUsd: 0.30, estimatedCad: 0.42 },
          byModel: [{ key: "deepseek-flash", calls: 8, totalTokens: 18200, estimatedUsd: 0.30, estimatedCad: 0.42 }],
          byTaskType: [{ key: "deterministic_triage", calls: 4, totalTokens: 0, estimatedUsd: 0, estimatedCad: 0 }],
          byActor: [{ key: "usr_a1b2c3d4 (owner)", calls: 12, totalTokens: 18200, estimatedUsd: 0.30, estimatedCad: 0.42 }],
          buffetPoolMetrics: { observedInstances: 3, p50CostCad: 1.85, p90CostCad: 3.9 },
        },
        cohortSummary: {
          totals: { aiCalls: 20, deterministicOps: 10, totalTokens: 42000, estimatedCad: 1.85 },
          byModel: [],
          byTaskType: [],
          byActor: [],
          clients: [{ caseId: "case_alpha", scaleType: "AUTONOMOUS_SOLO", professionKey: "CPA_COMPTABLE", aiCalls: 2, deterministicOps: 5, totalTokens: 3200, estimatedCad: 0.08 }],
        },
      }),
    };
  }
  if (url === "/api/profile") {
    const st = (parsed && parsed.scaleType) || "AUTONOMOUS_SOLO";
    return {
      json: async () => ({
        ok: true,
        scaleType: st,
        professionKey: (parsed && parsed.professionKey) || (st === "AUTONOMOUS_SOLO" ? "CRIC_IMMIGRATION" : ""),
        topologyMode: st === "SME_CELL" ? "CELL" : "SOLO",
        uiProfile: { scaleType: st, showTeamRoster: st !== "AUTONOMOUS_SOLO", showShiftChecklist: st !== "AUTONOMOUS_SOLO", showWall3Meters: st === "SME_CELL" },
      }),
    };
  }
  if (url === "/api/settings/brain") return { json: async () => ({ mode: "dual_cloud", deepseek: { configured: true }, gemini: { configured: true } }) };
  if (url === "/api/intake/config") return { json: async () => ({ ok: true, imap: {}, folder: {} }) };
  return { json: async () => ({ ok: true }) };
};
const location = { search: "", hostname: "x", port: "", origin: "http://x", protocol: "http:" };
const window = { SpeechRecognition: null, AudioContext: null, webkitAudioContext: null, matchMedia: () => ({ matches: true }), addEventListener() {} };
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
    new Function("module", "globalThis", setupValSrc)(undefined, window);
    if (!window.FanalSetupValidator || !window.FanalSetupValidator.PASSWORD_RULES_SPEC) {
      throw new Error("STRICT: FanalSetupValidator did not attach to window");
    }
    const enI18nKeys = Object.keys(window.I18N.en);
    for (const loc of ["en","es","fr","de","it","pt","zh","ja","ko","ar"]) {
      const miss = enI18nKeys.filter((k) => !(k in (window.I18N[loc] || {})));
      if (miss.length) {
        throw new Error(`STRICT: locale ${loc} missing ${miss.length} i18n keys: ${miss.slice(0, 6).join(", ")}`);
      }
    }
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

    // Step 0 -> Step 1 (business name & scale)
    elems.wizNext.click();
    flushMicroTimeouts();
    if (elems.wizBack.textContent !== "← Volver") {
      throw new Error(`STRICT: Spanish wizard Back button must be "← Volver", got "${elems.wizBack.textContent}"`);
    }
    if (!String(elems.wizBody.innerHTML).includes('data-scale="AUTONOMOUS_SOLO"') || !String(elems.wizBody.innerHTML).includes('data-scale="MICRO_SINGLE_OWNER"')) {
      throw new Error("STRICT: wizard Step 1 did not render Solo / Micro scale selector cards");
    }
    if (!elems.setupSectorWrap.classList.contains("hidden")) {
      throw new Error("STRICT: #setupSectorWrap must remain hidden while #setupScale is unselected");
    }
    if (!elems.setupScale.options[1] || elems.setupScale.options[1].textContent !== "🧑‍💻 Trabajador autónomo (1 persona)") {
      throw new Error(`STRICT: #setupScale options did not translate into Spanish: got "${elems.setupScale.options[1] && elems.setupScale.options[1].textContent}"`);
    }
    // Progressive disclosure test: Box 1 -> Box 2 (MICRO_SINGLE_OWNER -> 11 SCIAN sectors, AUTONOMOUS_SOLO -> 11 Quebec solo trades)
    elems.setupScale.value = "MICRO_SINGLE_OWNER";
    elems.setupScale.dispatchEvent("change");
    if (elems.setupSectorWrap.classList.contains("hidden")) {
      throw new Error("STRICT: #setupSectorWrap must unhide when #setupScale is MICRO_SINGLE_OWNER");
    }
    if (elems.setupSector.options[0].textContent !== "💼 Servicios profesionales / Despacho" || elems.setupSector.options[1].textContent !== "🍽️ Restaurante") {
      throw new Error(`STRICT: #setupSector SCIAN options did not translate into Spanish: got "${elems.setupSector.options[0] && elems.setupSector.options[0].textContent}"`);
    }
    elems.setupScale.value = "AUTONOMOUS_SOLO";
    elems.setupScale.dispatchEvent("change");
    if (elems.setupSector.options.length !== 11 || elems.setupSector.options[0].value !== "prof:CPA_COMPTABLE" || !elems.setupSector.options.some((o) => o.value === "prof:CRIC_IMMIGRATION")) {
      throw new Error("STRICT: #setupScale=AUTONOMOUS_SOLO must unlock all 11 Quebec solo trades (prof:*)");
    }
    elems.setupScale.value = "";
    elems.setupScale.dispatchEvent("change");
    if (elems.wizCard.classList.contains("slideout")) {
      throw new Error("STRICT: wizCard stuck with slideout class after Step 0 -> 1");
    }
    if (!String(elems.wizBody.innerHTML).includes("wizBizInput")) {
      throw new Error("STRICT: wizard Step 1 did not render wizBizInput");
    }
    elems.wizBizInput = mk("wizBizInput");
    elems.wizBizInput.value = "Trasunto Beta";

    // Step 1 validation: must block advancing while wizScale is unset
    elems.wizNext.click();
    flushMicroTimeouts();
    if (!String(elems.wizBody.innerHTML).includes('data-scale="AUTONOMOUS_SOLO"')) {
      throw new Error("STRICT: wizard Step 1 must not advance to Step 2 without choosing structure");
    }
    // Select MICRO_SINGLE_OWNER -> Step 2 renders 11 economic sectors incl. hotel & solo
    const microCard = (wizQueryCache[".wiz-sectors .ws[data-scale]"] || []).find((c) => c.dataset.scale === "MICRO_SINGLE_OWNER");
    if (!microCard || typeof microCard.onclick !== "function") throw new Error("STRICT: missing MICRO_SINGLE_OWNER wizard card handler");
    microCard.onclick();
    elems.wizNext.click();
    flushMicroTimeouts();
    if (!String(elems.wizBody.innerHTML).includes('data-sec="hotel"') || !String(elems.wizBody.innerHTML).includes('data-sec="solo"')) {
      throw new Error("STRICT: wizard Step 2 (Micro) did not render all sector options incl. solo & hotel");
    }
    // Go back -> select AUTONOMOUS_SOLO -> Step 2 renders all 11 recognized Quebec solo trades
    elems.wizBack.click();
    flushMicroTimeouts();
    const soloCard = (wizQueryCache[".wiz-sectors .ws[data-scale]"] || []).find((c) => c.dataset.scale === "AUTONOMOUS_SOLO");
    if (!soloCard || typeof soloCard.onclick !== "function") throw new Error("STRICT: missing AUTONOMOUS_SOLO wizard card handler");
    soloCard.onclick();
    elems.wizNext.click();
    flushMicroTimeouts();
    for (const pKey of ["CPA_COMPTABLE", "CRIC_IMMIGRATION", "ARTISAN_RBQ", "AUTRE_AUTONOME"]) {
      if (!String(elems.wizBody.innerHTML).includes(`data-prof="${pKey}"`)) {
        throw new Error(`STRICT: wizard Step 2 (Solo) missing Quebec profession card ${pKey}`);
      }
    }
    const cricCard = (wizQueryCache[".wiz-sectors .ws[data-prof]"] || []).find((c) => c.dataset.prof === "CRIC_IMMIGRATION");
    if (cricCard && typeof cricCard.onclick === "function") cricCard.onclick();

    // Step 2 -> Step 3 (Dual BYOK + vault)
    elems.wizNext.click();
    flushMicroTimeouts();
    if (String(elems.wizBody.innerHTML).includes("optionnel")) {
      throw new Error("STRICT: wizard Step 3 placeholder still has untranslated French 'optionnel' in Spanish");
    }
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
    if (/class="mark"[^>]*style="[^"]*background\s*:\s*none/i.test(html)) {
      throw new Error("STRICT: .loginbrand .mark must not strip background:none (camouflages purple mark against purple background)");
    }
    for (const cls of ["brand-mark", "lang-medallion", "splash-medallion"]) {
      if (!html.includes(cls)) throw new Error(`STRICT: missing anti-camouflage ${cls} in dashboard.html`);
    }
    if (!welcomeHtml.includes("welcome-medallion")) {
      throw new Error("STRICT: missing welcome-medallion anti-camouflage container in apps/desktop/welcome.html");
    }
    if (!html.includes('id="fanalTooltip"') || !html.includes('id="tipToggleChk"') || !panelHtml.includes('id="fanalTooltip"') || !panelHtml.includes("PTIP")) {
      throw new Error("STRICT: missing custom cursor-only tooltip system (#fanalTooltip / #tipToggleChk / PTIP)");
    }
    const svgGradIds = [...html.matchAll(/<linearGradient\s+id="([^"]+)"/g)].map((g) => g[1]);
    if (new Set(svgGradIds).size !== svgGradIds.length) {
      throw new Error("STRICT: duplicate <linearGradient id> found in dashboard.html: " + svgGradIds.join(", "));
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

    // Step 4 (perms) -> Step 5 (Closed Structured Constitution)
    elems.wizNext.click();
    flushMicroTimeouts();
    if (!String(elems.wizBody.innerHTML).includes("wizConsFormHost") || !elems.wizConsRprpName || !elems.wizConsInitials) {
      throw new Error("STRICT: wizard Step 5 did not render closed Constitution form (#wizConsFormHost)");
    }
    // Attempting to advance Step 5 with blank RPRP & initials must be blocked by validateClosedConstitutionFields!
    elems.wizNext.click();
    flushMicroTimeouts();
    if (!String(elems.wizBody.innerHTML).includes("wizConsFormHost")) {
      throw new Error("STRICT: wizard Step 5 must block advancing without mandatory Loi 25 RPRP & initials");
    }
    elems.wizConsRprpName.value = "Javier Franco";
    elems.wizConsRprpName.dispatchEvent("input");
    elems.wizConsRprpEmail.value = "rprp@trasunto.example";
    elems.wizConsRprpEmail.dispatchEvent("input");
    elems.wizConsInitials.value = "JF";
    elems.wizConsInitials.dispatchEvent("input");

    // Step 5 -> Step 6 (Recap must show preserved values + verified closed Constitution, NOT dashes!)
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

    // Verify readiness gate + password rules toggle + setup -> post-setup login verification -> Owner Cockpit!
    if (!elems.setupReadinessPanel || !elems.setupGateProgressEl || !elems.pwReqList.classList.contains("hidden")) {
      throw new Error("STRICT: setup readiness panel or hidden #pwReqList missing");
    }
    elems.togglePwReqBtn.click();
    if (elems.pwReqList.classList.contains("hidden") || !String(elems.pwReqList.innerHTML).includes("data-rule-id=\"minLength\"")) {
      throw new Error("STRICT: #togglePwReqBtn did not reveal 6 IT password rule items");
    }
    elems.setupUser.value = "Javier";
    elems.setupUser.dispatchEvent("input");
    elems.setupPass.value = "weak";
    elems.setupPass.dispatchEvent("input");
    if (!elems.setupGateProgressEl.textContent.startsWith("3 ") || elems.setupGateProgressEl.classList.contains("all-ok")) {
      throw new Error(`STRICT: weak password must keep setup readiness at 3/4, got "${elems.setupGateProgressEl.textContent}"`);
    }
    elems.setupPass.value = "StrongPass!2026";
    elems.setupPass.dispatchEvent("input");
    elems.setupPassConfirm.value = "StrongPass!2026";
    elems.setupPassConfirm.dispatchEvent("input");
    if (!elems.setupGateProgressEl.textContent.startsWith("4 ") || !elems.setupGateProgressEl.classList.contains("all-ok")) {
      throw new Error(`STRICT: valid setup must flip readiness progress to 4/4 all-ok, got "${elems.setupGateProgressEl.textContent}"`);
    }

    elems.setupBtn.click();
    await new Promise((r) => origSetTimeout(r, 30));
    flushMicroTimeouts();
    await new Promise((r) => origSetTimeout(r, 30));
    if (elems.setupSection.classList.contains("hidden") !== true || elems.postSetupBanner.classList.contains("hidden") !== false || elems.loginUser.value !== "Javier") {
      throw new Error("STRICT: #setupBtn must seal install and transition to #loginView with #postSetupBanner & prefilled #loginUser");
    }
    // Sign in right after setup to verify credentials + integrity & enter #ownerView
    elems.loginPass.value = "StrongPass!2026";
    elems.loginBtn.click();
    await new Promise((r) => origSetTimeout(r, 30));
    flushMicroTimeouts();
    await new Promise((r) => origSetTimeout(r, 30));
    if (typeof window.showWizard === "function") {
      await window.showWizard();
      if (!elems.wizardView.classList.contains("hidden")) {
        throw new Error("STRICT: SERVER_SETUP_DONE guard must prevent showWizard() after owner exists");
      }
    }

    // Verify localized #presetGrid buttons & AUTONOMOUS_SOLO layout adaptation
    const presetTexts = (elems.presetGrid.children || []).map((b) => b.textContent);
    if (!presetTexts.includes("🍽️ Restaurante") || presetTexts.includes("restaurant")) {
      throw new Error(`STRICT: #presetGrid must display localized sector names, got ${JSON.stringify(presetTexts)}`);
    }
    if (!bodyClasses.has("mode-solo") || elems.workersCard.style.display !== "none" || elems.shiftCard.style.display !== "none" || elems.openWall.style.display !== "none" || elems.soloModeBanner.style.display !== "block") {
      throw new Error("STRICT: AUTONOMOUS_SOLO profile must enable mode-solo, show #soloModeBanner, and hide team/wall cards");
    }
    elems.scalePrefSelect.value = "SME_CELL";
    elems.scalePrefSelect.dispatchEvent("change");
    if (!elems.scaleProfOrSectorSelect.options.some((o) => o.value === "restaurant") || elems.scaleProfOrSectorSelect.options.some((o) => String(o.value).startsWith("prof:"))) {
      throw new Error("STRICT: changing #scalePrefSelect to SME_CELL must switch #scaleProfOrSectorSelect to economic sectors");
    }
    elems.scalePrefSaveBtn.click();
    await new Promise((r) => origSetTimeout(r, 20));
    if (!bodyClasses.has("mode-sme") || elems.workersCard.style.display !== "" || elems.shiftCard.style.display !== "" || elems.openWall.style.display !== "") {
      throw new Error("STRICT: switching to SME_CELL via #scalePrefSaveBtn must restore team/shift/wall cards");
    }
    const profPost = fetchLog.filter((x) => x.url === "/api/profile" && x.method === "POST").pop();
    if (!profPost || profPost.body.scaleType !== "SME_CELL") {
      throw new Error("STRICT: #scalePrefSaveBtn did not POST {scaleType:'SME_CELL'} to /api/profile");
    }
    if (typeof window.loadStudioTelemetry !== "function") {
      throw new Error("STRICT: window.loadStudioTelemetry must be exposed for Studio telemetry rendering");
    }
    const telBefore = fetchLog.filter((x) => x.url === "/api/studio/telemetry").length;
    await window.loadStudioTelemetry();
    const telAfterClient = fetchLog.filter((x) => x.url === "/api/studio/telemetry").length;
    if (telAfterClient !== telBefore) {
      throw new Error("STRICT: loadStudioTelemetry() without Studio edition fetched /api/studio/telemetry in client mode");
    }
    await window.loadStudioTelemetry(true);
    if (
      !String(elems.studioTelKpis.innerHTML).includes("12") ||
      !String(elems.studioTelBuffetBox.textContent).includes("1.8500") ||
      !String(elems.studioTelByModel.innerHTML).includes("deepseek-flash") ||
      !String(elems.studioTelByTask.innerHTML).includes("deterministic_triage") ||
      !String(elems.studioTelByActor.innerHTML).includes("usr_a1b2c3d4") ||
      !String(elems.studioTelCohort.innerHTML).includes("case_alpha")
    ) {
      throw new Error("STRICT: loadStudioTelemetry(true) did not populate #studioTelemetryCard KPIs, Buffet p50/p90, and breakdown tables");
    }

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
    for (const hid of ["footLangs", "reglageLangs", "langStepList", "langRows"]) elems[hid].children = [];
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
    // Verify cursor tooltip toggle persists cleanly & Settings labels localize
    if (typeof elems.tipToggleChk.onchange === "function") {
      elems.tipToggleChk.checked = false;
      elems.tipToggleChk.onchange();
      if (localStorage.getItem("fanal-tooltips") !== "0") {
        throw new Error("STRICT: tipToggleChk off did not persist fanal-tooltips=0");
      }
      elems.tipToggleChk.checked = true;
      elems.tipToggleChk.onchange();
      if (localStorage.getItem("fanal-tooltips") !== "1") {
        throw new Error("STRICT: tipToggleChk on did not persist fanal-tooltips=1");
      }
    }
    if (!elems.tipPrefTitleEl.textContent) {
      throw new Error("STRICT: tipPrefTitleEl was not localized during applyLang()");
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
    for (const hid of ["footLangs", "reglageLangs", "langStepList", "langRows"]) elems[hid].children = [];
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

    // --- 9. Verify enlarged logo medallions (viewBox 6 6 52 52), icon state transitions & login/Studio gating ---
    if (!html.includes('viewBox="6 6 52 52"')) {
      throw new Error("STRICT: enlarged pearl medallion SVG viewBox=\"6 6 52 52\" missing from dashboard.html");
    }
    const panelSrc = fs.readFileSync(path.join(__dirname, "..", "ui", "panel.html"), "utf8");
    if (!panelSrc.includes('viewBox="6 6 52 52"') || !panelSrc.includes('classList.toggle("is-off"')) {
      throw new Error("STRICT: panel.html missing enlarged logo or smooth Moon/Sun .is-off transitions");
    }
    for (const loginCtl of ['id="loginUser"', 'id="loginPass"', 'id="loginBtn"', 'id="setupUser"', 'id="setupPass"', 'id="setupSector"', 'id="setupBtn"']) {
      const ln = html.split("\n").find((line) => line.includes(loginCtl)) || "";
      if (!ln.includes("data-tip-key=")) {
        throw new Error(`STRICT: ${loginCtl} missing cursor help cloud data-tip-key`);
      }
    }
    // Check Moon=dark / Sun=light on dashboard deterministically from current state
    if (bodyClasses.has("dark")) elems.darkBtn.click();
    if (!elems.icoMoon.classList.contains("is-off") || elems.icoSun.classList.contains("is-off")) {
      throw new Error("STRICT: Light mode ON must show #icoSun and hide #icoMoon via .is-off");
    }
    elems.darkBtn.click(); // darkOn becomes true
    if (elems.icoMoon.classList.contains("is-off") || !elems.icoSun.classList.contains("is-off")) {
      throw new Error("STRICT: Dark mode ON must show #icoMoon and hide #icoSun via .is-off");
    }
    if (elems.darkBtn.dataset.tipKey !== "tipThemeDark") {
      throw new Error("STRICT: darkBtn dataset.tipKey must be tipThemeDark when dark mode is active");
    }
    elems.darkBtn.click(); // darkOn back to false
    if (!elems.icoMoon.classList.contains("is-off") || elems.icoSun.classList.contains("is-off") || elems.darkBtn.dataset.tipKey !== "tipThemeLight") {
      throw new Error("STRICT: Light mode toggle back must show #icoSun and hide #icoMoon with tipThemeLight");
    }
    if (!elems.soundBtn.classList.contains("on")) elems.soundBtn.click();
    if (elems.icoSoundOn.classList.contains("is-off") || !elems.icoSoundOff.classList.contains("is-off")) {
      throw new Error("STRICT: Unmuted state must show #icoSoundOn and hide #icoSoundOff");
    }
    elems.soundBtn.click(); // mute
    if (!elems.icoSoundOn.classList.contains("is-off") || elems.icoSoundOff.classList.contains("is-off") || elems.soundBtn.dataset.tipKey !== "tipSoundOff") {
      throw new Error("STRICT: Muted state must show #icoSoundOff and hide #icoSoundOn with tipSoundOff");
    }
    elems.soundBtn.click(); // unmute
    if (elems.icoSoundOn.classList.contains("is-off") || !elems.icoSoundOff.classList.contains("is-off") || elems.soundBtn.dataset.tipKey !== "tipSoundOn") {
      throw new Error("STRICT: Unmuted state after toggle must show #icoSoundOn and hide #icoSoundOff");
    }
    if (!bodyClasses.has("simpleview")) elems.viewBtn.click();
    if (elems.icoViewSimple.classList.contains("is-off") || !elems.icoViewAdv.classList.contains("is-off")) {
      throw new Error("STRICT: Simple mode must show #icoViewSimple and hide #icoViewAdv via .is-off");
    }
    elems.viewBtn.click();
    if (!elems.icoViewSimple.classList.contains("is-off") || elems.icoViewAdv.classList.contains("is-off")) {
      throw new Error("STRICT: Advanced mode must show #icoViewAdv and hide #icoViewSimple via .is-off");
    }
    if (elems.eyeBtn.classList.contains("on")) elems.eyeBtn.click();
    elems.eyeBtn.click(); // pwVisible -> true
    if (elems.loginPass.type !== "text" || elems.eyeOn.classList.contains("is-off") || !elems.eyeOff.classList.contains("is-off")) {
      throw new Error("STRICT: eyeBtn visible state must reveal password and show #eyeOn");
    }
    elems.eyeBtn.click(); // pwVisible -> false
    if (elems.loginPass.type !== "password" || !elems.eyeOn.classList.contains("is-off") || elems.eyeOff.classList.contains("is-off")) {
      throw new Error("STRICT: eyeBtn masked state must hide password and show #eyeOff");
    }
    if (bodyClasses.has("studio-edition")) {
      throw new Error("STRICT: default client dashboard must never activate studio-edition automatically");
    }

    // --- 10. Verify top-left tagline pill removal, Settings language card, and native-language hover tooltips across all 10 locales ---
    if (html.includes('id="headerTag"') || /header\s+\.tagline\s*\{/.test(html)) {
      throw new Error("STRICT: semi-transparent #headerTag / header .tagline capsule still present in dashboard.html");
    }
    if (!html.includes("body:not(.loginpage) #footLangs{display:none}") || !html.includes('id="langPrefCard"') || !html.includes('id="reglageLangs"')) {
      throw new Error("STRICT: language selector scoping (loginpage footer + Settings #reglageLangs card) missing");
    }
    if (elems.reglageLangs.children.length !== 10 || !elems.langPrefTitleEl.textContent) {
      throw new Error("STRICT: Settings #reglageLangs must render 10 language pills and localize #langPrefTitleEl");
    }
    if (elems.langStepList.children.length !== 10 || elems.langRows.children.length !== 10) {
      throw new Error("STRICT: #langStepList and #langRows must render all 10 languages");
    }
    const overHandlers = docListeners.pointerover || [];
    if (!overHandlers.length) {
      throw new Error("STRICT: initFanalTooltips did not register document pointerover listener");
    }
    const seenNativeTips = new Set();
    for (const btn of elems.langStepList.children) {
      if (!btn.dataset.l || !btn.dataset.tipLang) {
        throw new Error("STRICT: language button in #langStepList missing dataset.l / dataset.tipLang");
      }
      for (const h of overHandlers) h({ target: btn });
      flushMicroTimeouts();
      const txt = elems.fanalTooltip.textContent;
      if (!txt) throw new Error(`STRICT: empty hover cloud for language ${btn.dataset.l}`);
      seenNativeTips.add(txt);
      if (btn.dataset.l === "es" && txt !== "Para seleccionar Español, presiona aquí") {
        throw new Error(`STRICT: es hover cloud expected Spanish text, got "${txt}"`);
      }
      if (btn.dataset.l === "ar" && elems.fanalTooltip.dir !== "rtl") {
        throw new Error("STRICT: Arabic hover cloud must set dir=rtl");
      }
    }
    if (seenNativeTips.size !== 10) {
      throw new Error(`STRICT: expected 10 distinct native-language hover clouds, got ${seenNativeTips.size}`);
    }
    for (const hostId of ["footLangs", "reglageLangs"]) {
      for (const pillEl of elems[hostId].children) {
        if (!pillEl.dataset.tipLang) throw new Error(`STRICT: ${hostId} pill missing dataset.tipLang`);
      }
    }
    if (!panelSrc.includes("langPickSelf") || !panelSrc.includes(".pill *")) {
      throw new Error("STRICT: ui/panel.html missing native-language langPickSelf tooltips or child pointer-events rule");
    }
    if (!welcomeHtml.includes('id="scale"') || !welcomeHtml.includes('id="sectorWrap"') || !welcomeHtml.includes('id="welcomeGatePanel"') || !welcomeHtml.includes('FanalSetupValidator') || !welcomeHtml.includes("syncWelcomeCascade") || !welcomeHtml.includes("CPA_COMPTABLE") || !welcomeHtml.includes("s.sec[o.value]") || !welcomeHtml.includes("dataset.tipLang=l")) {
      throw new Error("STRICT: apps/desktop/welcome.html missing cascading Box 1 -> Box 2, welcomeGatePanel, FanalSetupValidator, localized options, or native language row tooltips");
    }

    // --- 11. Verify #openWall removed from #loginView (moved inside #workersCard), /api/wall gated, no Scale/Sector overlap, and collapsible wizard summary ---
    const loginViewStart = html.indexOf('id="loginView"');
    const ownerViewStart = html.indexOf('id="ownerView"');
    const workersCardStart = html.indexOf('id="workersCard"');
    const ordersCardStart = html.indexOf('id="ordersCard"');
    const openWallPos = html.indexOf('id="openWall"');
    if (openWallPos < 0 || (openWallPos > loginViewStart && openWallPos < ownerViewStart)) {
      throw new Error("STRICT: #openWall must NOT live inside unauthenticated #loginView");
    }
    if (openWallPos < workersCardStart || openWallPos > ordersCardStart) {
      throw new Error("STRICT: #openWall must live inside authenticated #workersCard");
    }
    const serverSrc = fs.readFileSync(path.join(__dirname, "..", "supervisor", "server.js"), "utf8");
    if (!serverSrc.includes('if (pathname === "/api/wall" && req.method === "GET") {\n    if (process.env.DSH_DEMO_MODE !== "1" && !auth(req)) return send(res, 401')) {
      throw new Error("STRICT: GET /api/wall must require authentication unless DSH_DEMO_MODE=1");
    }
    if (!serverSrc.includes('PURE_FIXED_BUFFET_MONTHLY') || !serverSrc.includes('retainerFee = isSolo ? 350.0 : 490.0') || /40 dossiers/i.test(serverSrc)) {
      throw new Error("STRICT: buildMonthlyClientInvoice must enforce PURE_FIXED_BUFFET_MONTHLY (350/490) with zero '40 dossiers' cap");
    }
    for (const loc of ["en", "es", "fr", "de", "it", "pt", "zh", "ja", "ko", "ar"]) {
      const m = window.I18N[loc];
      for (const reqKey of ["setupScaleLbl", "setupScalePlaceholder", "setupSectorLbl", "setupEditMetaBtn", "tipSetupEditMeta", "prof_CRIC_IMMIGRATION", "buffetPlanBadge", "studioTelTitle"]) {
        if (!m || !m[reqKey]) throw new Error(`STRICT: locale "${loc}" missing key ${reqKey}`);
      }
      if (/autónomo\s*\/\s*servicios|solo\s*\/\s*self-employed/i.test(m.secSolo || "")) {
        throw new Error(`STRICT: locale "${loc}" secSolo ("${m.secSolo}") overlaps headcount scale selector`);
      }
    }
    if (!elems.setupMetaWrap.classList.contains("hidden") || elems.setupWizSummary.classList.contains("hidden") || !elems.setupWizSummaryText.textContent.includes("·")) {
      throw new Error("STRICT: finishBoot after wizard completion must collapse #setupMetaWrap into #setupWizSummary");
    }
    elems.setupMetaEditBtn.click();
    if (elems.setupMetaWrap.classList.contains("hidden") || !elems.setupWizSummary.classList.contains("hidden")) {
      throw new Error("STRICT: clicking #setupMetaEditBtn must reveal #setupMetaWrap and hide summary chip");
    }

    console.log("SMOKE TEST PASSED: sin errores runtime — 10/10 idiomas completos (0 claves faltantes), sectores/asistente/welcome localizados, modo Autónomo/Micro/Empresa, #openWall autenticado + /api/wall 401, SVG/toggles, Studio gating y 10/10 nubes nativas OK");
    process.exit(0);
  } catch (e) {
    console.log("SMOKE FAILED:", e && e.stack || e.message);
    process.exit(1);
  } finally {
    global.setTimeout = origSetTimeout;
  }
})();
