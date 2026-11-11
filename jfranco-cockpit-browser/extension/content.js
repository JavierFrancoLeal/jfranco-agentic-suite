// Cockpit Browser — content script.
// Runs in every page. Executes read / fill / getLabel / click / status on
// behalf of the DSH host, paints the emerald border, and reports a physical
// human touch so the HOST can hand the wheel back. The BRAKE (forbidden
// labels) is enforced by the HOST, never here.
(() => {
  if (window.__cockpitHudInstalled) return;
  window.__cockpitHudInstalled = true;
  window.__cockpitHumanTouched = false;

  window.addEventListener("mousedown", () => { window.__cockpitHumanTouched = true; }, true);
  window.addEventListener("keydown", () => { window.__cockpitHumanTouched = true; }, true);

  function installHud() {
    if (document.getElementById("__cockpit_hud")) return;
    const bar = document.createElement("div");
    bar.id = "__cockpit_hud";
    bar.style.cssText = "position:fixed;top:0;left:0;right:0;height:36px;z-index:2147483647;background:#0f172a;color:#f8fafc;font:700 12px/36px system-ui;padding:0 12px;display:flex;gap:12px;align-items:center;box-shadow:0 1px 0 #334155";
    bar.innerHTML = '<span style="color:#10b981">⚡ AGENT</span><span style="color:#64748b">|</span><span style="color:#94a3b8">cockpit-browser · the human commands · the agent never clicks Send/Pay</span>';
    (document.body || document.documentElement).appendChild(bar);
  }

  function paint(el) {
    el.style.outline = "3px solid #10b981";
    el.style.backgroundColor = "rgba(16, 185, 129, 0.10)";
  }

  function query(selector) {
    // search the main frame only; the content script is per-frame, and
    // cross-origin iframes get their own isolated injection when needed.
    return document.querySelector(selector);
  }

  function read(selector) {
    const el = selector ? query(selector) : document.body;
    if (!el) return null;
    return (el.innerText || el.textContent || "").slice(0, 24000);
  }

  function fill(selector, value) {
    const el = query(selector);
    if (!el) return { done: false };
    const v = String(value);
    paint(el);
    if (el.tagName === "SELECT") {
      el.value = v;
      el.dispatchEvent(new Event("change", { bubbles: true }));
      el.dispatchEvent(new Event("input", { bubbles: true }));
      return { done: true, kind: "select" };
    }
    const proto = el instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
    setter.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return { done: true, kind: "text", isPassword: el.type === "password" };
  }

  function getLabel(selector) {
    const el = query(selector);
    if (!el) return null;
    return (el.getAttribute("aria-label") || el.innerText || el.textContent || el.value || el.getAttribute("title") || "").trim().slice(0, 200);
  }

  function click(selector) {
    const el = query(selector);
    if (!el) return { done: false };
    el.click();
    paint(el);
    return { done: true };
  }

  function status() {
    return { url: location.href, title: document.title, humanTouched: !!window.__cockpitHumanTouched };
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    (async () => {
      if (!msg || typeof msg.method !== "string") { sendResponse({ error: "bad request" }); return; }
      const p = msg.params || {};
      try {
        switch (msg.method) {
          case "read": sendResponse({ result: read(p.selector) }); return;
          case "fill": sendResponse({ result: fill(p.selector, p.value) }); return;
          case "getLabel": sendResponse({ result: getLabel(p.selector) }); return;
          case "click": sendResponse({ result: click(p.selector) }); return;
          case "status": sendResponse({ result: status() }); return;
          default: sendResponse({ error: "unknown method: " + msg.method });
        }
      } catch (e) {
        sendResponse({ error: String(e && e.message ? e.message : e) });
      }
    })();
    return true; // async response
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installHud);
  } else {
    installHud();
  }
})();
