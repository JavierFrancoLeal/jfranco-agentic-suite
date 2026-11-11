// Cockpit Browser — background service worker.
// Holds a WebSocket to the DSH host (ws://127.0.0.1:9334/cockpit), forwards
// commands to the active tab's content script, and returns results. The HOST
// owns the guardrails (tiers, brake, audit); this worker is only the hands.
const PORT = 9334;

let ws = null;
let reconnectTimer = null;

function connect() {
  try {
    ws = new WebSocket(`ws://127.0.0.1:${PORT}/cockpit`);
  } catch (e) {
    scheduleReconnect();
    return;
  }

  ws.addEventListener("open", () => {
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  });

  ws.addEventListener("message", async (event) => {
    let msg;
    try { msg = JSON.parse(event.data); } catch { return; }
    if (!msg || typeof msg.id !== "number" || typeof msg.method !== "string") return;

    try {
      if (msg.method === "open") {
        const url = (msg.params && msg.params.url) || "";
        await chrome.tabs.create({ url, active: true });
        sendBack(msg.id, { done: true });
        return;
      }
      if (msg.method === "screenshot") {
        const tab = await getWorkableTab();
        if (!tab) {
          sendBack(msg.id, null, "No web page open — open a normal page (e.g. google.com) and try again.");
          return;
        }
        const target = { tabId: tab.id };
        try {
          await withTimeout(chrome.debugger.attach(target, "1.3"), 5000, "debugger attach timed out");
          const res = await withTimeout(chrome.debugger.sendCommand(target, "Page.captureScreenshot", { format: "png" }), 5000, "screenshot timed out");
          sendBack(msg.id, { dataUrl: "data:image/png;base64," + res.data });
        } catch (e) {
          sendBack(msg.id, null, String(e && e.message ? e.message : e));
        } finally {
          try { await chrome.debugger.detach(target); } catch {}
        }
        return;
      }
      // Everything else runs in the page via the content script.
      const tab = await getWorkableTab();
      if (!tab) {
        sendBack(msg.id, null, "No web page open — open a normal page (e.g. google.com) and try again.");
        return;
      }
      let r;
      try {
        r = await chrome.tabs.sendMessage(tab.id, { method: msg.method, params: msg.params || {} });
      } catch (e) {
        // The content script may not be ready on a freshly loaded page.
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
        r = await chrome.tabs.sendMessage(tab.id, { method: msg.method, params: msg.params || {} });
      }
      if (r && r.error) sendBack(msg.id, null, r.error);
      else sendBack(msg.id, r ? r.result : null);
    } catch (e) {
      sendBack(msg.id, null, String(e && e.message ? e.message : e));
    }
  });

  ws.addEventListener("close", scheduleReconnect);
  ws.addEventListener("error", scheduleReconnect);
}

function sendBack(id, result, error) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ id, result, error }));
}

// Reject a promise after `ms` so a hanging Chrome API can never leave the
// host waiting (and never hang the service worker).
function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}

// Pick a tab the extension is allowed to touch: chrome:// and
// chrome-extension:// pages are protected, so skip them and fall back to the
// most recent http(s) tab.
async function getWorkableTab() {
  const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (active && active.url && active.url.startsWith("http")) return active;
  const tabs = await chrome.tabs.query({ currentWindow: true });
  for (const t of tabs) if (t.url && t.url.startsWith("http")) return t;
  return null;
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => { reconnectTimer = null; connect(); }, 1500);
}

connect();

// Keep the worker alive: MV3 service workers are terminated when idle and
// setTimeout does NOT wake them. A periodic alarm wakes the worker, which then
// reconnects if the socket died.
chrome.alarms.create("cockpit-keepalive", { periodInMinutes: 0.5 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "cockpit-keepalive" && (!ws || ws.readyState !== WebSocket.OPEN)) {
    connect();
  }
});
