# Fanal Cockpit Browser — the recipes

Verified Electron building blocks for the Claude Cowork–style cockpit. These are
lifted from the Fanal desktop shell (`apps/desktop/main.js`), which runs them in
production. **They target Fanal's Electron shell, not DeepSeek Harness** — the
identifiers (`persist:fanal-client-workspace`, `fanal:*` IPC) belong to Fanal.
Copy, adapt the identifiers, and keep the security flags exactly as written.
CommonJS is used here because Electron main-process code is CommonJS in the
proven shell; do not add a bundler.

```js
const { app, BrowserWindow, WebContentsView, screen, safeStorage } = require("electron");
```

## 1. The persistent encrypted session

```js
const agentPortalView = new WebContentsView({
  webPreferences: {
    partition: "persist:fanal-client-workspace", // survives restarts
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
    plugins: true,
  },
});
```

**System-keychain credentials — never a literal in the code:**

```js
function storeSecret(plain) {
  if (!safeStorage.isEncryptionAvailable()) throw new Error("KEYCHAIN_UNAVAILABLE");
  return safeStorage.encryptString(plain).toString("base64"); // macOS Keychain / Windows DPAPI
}
function revealSecret(b64) {
  if (!safeStorage.isEncryptionAvailable()) throw new Error("KEYCHAIN_UNAVAILABLE");
  return safeStorage.decryptString(Buffer.from(b64, "base64")); // RAM only; wipe after use
}
```

The encrypted blob is the ONLY thing that may be persisted. The plaintext is
revealed at the moment of use, then the buffer is zeroed (`buf.fill(0)`).

## 2. The double isolation

**Web panel — no `file://` may load IN:**

```js
agentPortalView.webContents.on("will-navigate", (ev, url) => {
  if (String(url).startsWith("file://")) ev.preventDefault();
});
```

**Documents panel — no byte may leak OUT:**

```js
const sourceDocView = new WebContentsView({
  webPreferences: {
    partition: "in-memory-local-proof-viewer", // ephemeral, isolated from the portal session
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
    plugins: true, // built-in PDF viewer
  },
});
sourceDocView.webContents.session.webRequest.onBeforeRequest((details, callback) => {
  const local = /^(file:|data:|chrome-extension:)/.test(String(details.url));
  callback({ cancel: !local }); // internet is CANCELLED: only local proofs pass
});
```

Opening a local proof (PDF / image / text) — the file is read and re-served as a
`data:` document so the origin stays local:

```js
async function openLocalProof(view, filePath, pageNumber) {
  const ext = require("node:path").extname(filePath).toLowerCase();
  const fileUrl = "file://" + require("node:path").resolve(filePath);
  if (ext === ".pdf") {
    await view.webContents.loadURL(fileUrl + "#page=" + (pageNumber || 1) + "&view=FitH");
  } else {
    const raw = require("node:fs").readFileSync(filePath, "utf8").slice(0, 100000)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const html = "<html><body style='margin:0;padding:14px;background:#090d16;color:#e2e8f0;font-family:monospace;font-size:12px;white-space:pre-wrap'>" + raw + "</body></html>";
    await view.webContents.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
  }
}
```

## 3. The constitutional brake

```js
const FORBIDDEN_BUTTON_WORDS = /envoyer|soumettre|transmettre|payer|signer|supprimer|submit|pay|delete/i;
```

The agent fills a field — value + the REAL `input`/`change` events + the emerald
border:

```js
async function fillField(view, cssSelector, value) {
  const code = '(() => { const el = document.querySelector(' +
    JSON.stringify(cssSelector) +
    '); if (!el) return false; el.scrollIntoView({ behavior: "smooth", block: "center" });' +
    ' el.focus(); el.value = ' + JSON.stringify(String(value)) + ';' +
    ' el.dispatchEvent(new Event("input", { bubbles: true }));' +
    ' el.dispatchEvent(new Event("change", { bubbles: true }));' +
    ' el.style.outline = "3px solid #10b981";' +                       // emerald border
    ' el.style.backgroundColor = "rgba(16, 185, 129, 0.10)";' +
    ' return true; })()';
  return await view.webContents.executeJavaScript(code);
}
```

The runner stops dead before the final button:

```js
async function runPlan(view, plan) {
  const report = [];
  for (const step of plan || []) {
    if (step.type === "CLICK" && FORBIDDEN_BUTTON_WORDS.test(String(step.targetLabel || ""))) {
      report.push({ stepId: step.id, status: "STOPPED_FOR_HUMAN_SKIN_IN_THE_GAME",
        reason: "The agent filled the form and stopped before '" + step.targetLabel + "' for the human to verify and submit." });
      break; // 🛑 FRENO — the human gives the legal click
    }
    if (step.type === "FILL_FIELD") {
      const ok = await fillField(view, step.cssSelector, step.value);
      report.push({ stepId: step.id, field: step.cssSelector, status: ok ? "FILLED_AND_HIGHLIGHTED" : "FIELD_NOT_FOUND" });
    }
  }
  return { stepsExecuted: report };
}
```

## 4. The 36px HUD

Three states, three controls. The state lives in a single object the main process
owns:

```js
const pilotState = { mode: "RUNNING", stepCursor: 0, currentPlan: [], allowSingleStep: false };
// RUNNING → ⚡ AGENTE   ·   MANUAL → 🖐️ VOLANTE HUMANO   ·   BRAKED → 🛑 FRENO
```

**Pause** (stop at the next boundary) and **+1 casilla** (single step):

```js
function waitUntilAllowed() {
  return new Promise((resolve) => {
    const check = () => {
      if (pilotState.mode === "RUNNING") return resolve("CONTINUE");
      if (pilotState.allowSingleStep) { pilotState.allowSingleStep = false; return resolve("SINGLE_STEP"); }
      setTimeout(check, 60);
    };
    check();
  });
}
// await waitUntilAllowed() before every step; the +1 button sets allowSingleStep = true.
```

**Automatic physical-mouse detection** — the wheel passes to the human without a
button:

```js
agentPortalView.webContents.on("before-input-event", (_ev, input) => {
  if (input.type === "keyDown" || input.type === "mouseDown") {
    pilotState.mode = "MANUAL"; // 🖐️ the human touched the page
  }
});
```

The HUD itself is a 36px strip (render as a `data:` HTML header over the view, or
a thin `<div>` in the shell window) that subscribes to state changes and shows
the emoji + the state colour: `#10b981` (AGENTE), `#f59e0b` (VOLANTE HUMANO),
`#ef4444` (FRENO).

## 5. The dual-monitor without data loss

Move the LIVE view — reparent, never reload:

```js
function moveViewTo(window, view, bounds) {
  window.contentView.addChildView(view);
  view.setBounds(bounds);
}
function detachView(window, view) {
  try { window.contentView.removeChildView(view); } catch (e) {}
}
```

And bind the display changes:

```js
const refresh = () => applySplitLayout(); // recompute, then detach + moveViewTo
screen.on("display-added", refresh);
screen.on("display-removed", refresh);
screen.on("display-metrics-changed", refresh);
```

On the second monitor, split the cockpit into portal (left) + document (right);
on cable disconnect, fold into tabs on the surviving monitor:

```js
function applySplitLayout() {
  const displays = screen.getAllDisplays();
  const primary = screen.getPrimaryDisplay();
  const external = displays.find((d) => d.id !== primary.id);
  if (external) {
    // reparent both views into monitor2Window; set their side-by-side bounds.
    // A form half-filled in agentPortalView is untouched: no loadURL, no reload.
  } else {
    // rescue: detach both, close monitor2Window, addChildView the ACTIVE tab only.
  }
}
```

## 6. The golden rule

Every `FILL_FIELD` already paints the emerald border (recipe 3). The invariant:
**the user commands, the agent assists** — and the border is the receipt. Never
strip the border, never auto-click the final button, and when the plan runs out,
hand the HUD to 🖐️ VOLANTE HUMANO so the human finishes the last mile.

## The checklist before you ship

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` on every view.
- `partition: "persist:fanal-client-workspace"` for the portal; an ephemeral
  partition for the proofs.
- `will-navigate` blocks `file://`; `onBeforeRequest` allows only `file:/data:`.
- Secrets go through `safeStorage` only; plaintext buffers are zeroed.
- The brake matches the full forbidden label set (French + English).
- Display hotplug reparents, never reloads.
