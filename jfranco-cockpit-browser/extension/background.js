// Cockpit Browser — background service worker (hardened).
// Holds a WebSocket to the DSH host, forwards commands to a whitelisted
// Google/Facebook tab, and returns results. No timer leaks, no unhandled
// promise rejections (every async path sends back an error).
const PORT = 9334;
const ALLOWED_HOSTS = /(^|\.)(google\.com|facebook\.com)$/i;

let ws = null;
let reconnectTimer = null;
let heartbeatTimer = null;

function isAllowedUrl(urlString) {
  if (!urlString) return false;
  try {
    const u = new URL(urlString);
    return u.protocol === "https:" && ALLOWED_HOSTS.test(u.hostname);
  } catch {
    return false;
  }
}

async function getWorkableTab() {
  const activeTabs = await chrome.tabs.query({ active: true, windowType: "normal" });
  const activeMatch = activeTabs.find((t) => isAllowedUrl(t.url));
  if (activeMatch) return activeMatch;
  const allTabs = await chrome.tabs.query({ windowType: "normal" });
  return allTabs.find((t) => isAllowedUrl(t.url)) || null;
}

function sendBack(id, result, error = null) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  try {
    ws.send(JSON.stringify(error != null ? { id, error: String(error) } : { id, result }));
  } catch {}
}

function stopHeartbeat() {
  if (heartbeatTimer !== null) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function startHeartbeat() {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      try { ws.send(JSON.stringify({ type: "ping", ts: Date.now() })); } catch {}
    }
  }, 20000);
}

function scheduleReconnect() {
  stopHeartbeat();
  if (reconnectTimer !== null) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, 2000);
}

async function captureTabScreenshot(params = {}) {
  const tab = await getWorkableTab();
  if (!tab || typeof tab.id !== "number" || typeof tab.windowId !== "number") {
    throw new Error("No workable Google/Facebook tab found");
  }
  // Restore a minimized macOS window before capturing
  const win = await chrome.windows.get(tab.windowId);
  if (win.state === "minimized") {
    await chrome.windows.update(tab.windowId, { state: "normal" });
  }
  // Activate the tab and wait a beat for the GPU compositor to paint
  if (!tab.active) {
    await chrome.tabs.update(tab.id, { active: true });
    await new Promise((r) => setTimeout(r, 80));
  }
  // STRICT GATE: after activation, re-verify the now-active tab is STILL the
  // same allowed Google/Facebook tab — never capture a bank/email tab the user
  // switched to in the interim.
  const [nowActive] = await chrome.tabs.query({ active: true, windowId: tab.windowId });
  if (!nowActive || nowActive.id !== tab.id || !isAllowedUrl(nowActive.url)) {
    throw new Error("Active tab is outside the allowed Google/Facebook scope — refusing to capture");
  }
  const options = params && params.format === "png"
    ? { format: "png" }
    : { format: "jpeg", quality: typeof (params && params.quality) === "number" ? params.quality : 80 };
  const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, options);
  return { dataUrl, tabId: tab.id, url: tab.url };
}

async function connect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
  if (ws) {
    ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null;
    try { ws.close(); } catch {}
    ws = null;
  }

  // Fetch the ephemeral token first (the /token endpoint only answers
  // chrome-extension:// origins); then connect with ?token=.
  let token = null;
  try {
    const r = await fetch(`http://127.0.0.1:${PORT}/token`);
    if (r.ok) {
      const j = await r.json();
      token = j && j.token;
    }
  } catch {}
  if (!token) { scheduleReconnect(); return; }

  let socket;
  try {
    socket = new WebSocket(`ws://127.0.0.1:${PORT}/cockpit?token=${token}`);
  } catch (e) {
    scheduleReconnect();
    return;
  }
  ws = socket;

  socket.onopen = () => {
    if (ws !== socket) return;
    if (reconnectTimer !== null) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    startHeartbeat();
  };

  socket.onmessage = async (event) => {
    if (ws !== socket) return;
    let msg;
    try { msg = JSON.parse(event.data); } catch { return; }
    if (!msg || typeof msg.id !== "number" || typeof msg.method !== "string") return;

    // Every async path must answer (no unhandled rejection → no host timeout)
    try {
      if (msg.method === "open") {
        const url = (msg.params && msg.params.url) || "";
        await chrome.tabs.create({ url, active: true });
        sendBack(msg.id, { done: true });
        return;
      }
      if (msg.method === "screenshot") {
        const result = await captureTabScreenshot(msg.params);
        sendBack(msg.id, result);
        return;
      }
      // read / fill / getLabel / click / status → content script
      const tab = await getWorkableTab();
      if (!tab) throw new Error("No workable Google/Facebook tab found");
      let r;
      try {
        r = await chrome.tabs.sendMessage(tab.id, msg);
      } catch (e) {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
        r = await chrome.tabs.sendMessage(tab.id, msg);
      }
      if (r && r.error) sendBack(msg.id, null, r.error);
      else sendBack(msg.id, r ? r.result : null);
    } catch (e) {
      sendBack(msg.id, null, (e && e.message) || String(e));
    }
  };

  const onDisconnect = () => {
    if (ws !== socket) return;
    ws = null;
    scheduleReconnect();
  };
  socket.onclose = onDisconnect;
  socket.onerror = onDisconnect;
}

connect();

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("cockpit-keepalive", { periodInMinutes: 0.5 });
  connect();
});
chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create("cockpit-keepalive", { periodInMinutes: 0.5 });
  connect();
});
chrome.alarms.create("cockpit-keepalive", { periodInMinutes: 0.5 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "cockpit-keepalive") connect();
});
