// Cockpit Browser — content script (hardened).
// Runs on google.com / facebook.com. Executes read / fill / getLabel / click /
// status for the host, paints the emerald border, and reports physical human
// touch. The BRAKE (FORBIDDEN) is enforced by the HOST; getLabel here gives it
// the full context (element + interactive ancestor + aria-labelledby) so a
// click on a child <svg>/<span> cannot hide the parent button's label.
(() => {
  if (window.__cockpitHudInstalled) return;
  window.__cockpitHudInstalled = true;
  window.__cockpitHumanTouched = false;

  window.addEventListener("mousedown", (e) => { if (e && e.isTrusted) window.__cockpitHumanTouched = true; }, true);
  window.addEventListener("keydown", (e) => { if (e && e.isTrusted) window.__cockpitHumanTouched = true; }, true);

  function installHud() {
    if (document.getElementById("__cockpit_hud")) return;
    const bar = document.createElement("div");
    bar.id = "__cockpit_hud";
    bar.style.cssText = "position:fixed;top:0;left:0;right:0;height:36px;z-index:2147483647;background:#0f172a;color:#f8fafc;font:700 12px/36px system-ui;padding:0 12px;display:flex;gap:12px;align-items:center;box-shadow:0 1px 0 #334155";
    bar.innerHTML = '<span style="color:#10b981">⚡ AGENT</span><span style="color:#64748b">|</span><span style="color:#94a3b8">cockpit-browser · the human commands · the agent never clicks Send/Pay</span>';
    (document.body || document.documentElement).appendChild(bar);
  }

  function paint(el) {
    try {
      el.style.outline = "3px solid #10b981";
      el.style.backgroundColor = "rgba(16, 185, 129, 0.10)";
    } catch {}
  }

  function querySafe(selector) {
    if (typeof selector !== "string" || !selector.trim()) return null;
    try {
      return document.querySelector(selector);
    } catch (e) {
      throw new Error(`Invalid CSS selector "${selector}": ${e && e.message ? e.message : e}`);
    }
  }

  function extractNodeLabel(node) {
    if (!node || !(node instanceof Element)) return "";
    const labelledBy = node.getAttribute && node.getAttribute("aria-labelledby");
    if (labelledBy) {
      const parts = labelledBy.split(/\s+/)
        .map((id) => { const n = document.getElementById(id); return n ? (n.textContent || "") : ""; })
        .join(" ").trim();
      if (parts) return parts;
    }
    const imgAlt = Array.from(node.querySelectorAll ? node.querySelectorAll("img[alt], svg title") : [])
      .map((n) => n.getAttribute ? n.getAttribute("alt") || n.textContent || "" : "")
      .join(" ");
    const raw =
      (node.getAttribute ? node.getAttribute("aria-label") : "") ||
      (node.getAttribute ? node.getAttribute("title") : "") ||
      (node.getAttribute ? node.getAttribute("placeholder") : "") ||
      node.innerText ||
      node.textContent ||
      (node.value !== undefined ? node.value : "") ||
      imgAlt ||
      "";
    return String(raw).replace(/\s+/g, " ").trim();
  }

  function getLabel(selector) {
    const el = querySafe(selector);
    if (!el) return null;
    const interactiveAncestor = el.closest
      ? el.closest('button, a, [role="button"], [role="link"], [role="menuitem"], [role="tab"], label')
      : null;
    const target = interactiveAncestor || el;
    const ownLabel = extractNodeLabel(el);
    const ancestorLabel = interactiveAncestor && interactiveAncestor !== el ? extractNodeLabel(interactiveAncestor) : "";
    const label = [ancestorLabel, ownLabel].filter(Boolean).join(" | ").slice(0, 300);
    // Semantic metadata for the host brake: an icon-only submit button must not
    // evade FORBIDDEN.
    let isSubmit = false;
    if (target.matches && target.matches('input[type="submit"], button[type="submit"]')) isSubmit = true;
    else if (target.tagName === "BUTTON" && !target.hasAttribute("type") && target.closest && target.closest("form")) isSubmit = true;
    const href = (target.getAttribute && target.getAttribute("href")) || (target.form && target.form.action) || "";
    return { label, isSubmit, href };
  }

  function read(selector) {
    const el = selector ? querySafe(selector) : document.body;
    if (!el) return null;
    // innerText only: it ignores display:none / visibility:hidden text, so a
    // page cannot smuggle prompt-injection instructions through hidden nodes.
    return (el.innerText || "").slice(0, 24000);
  }

  function fill(selector, value) {
    const el = querySafe(selector);
    if (!el) return { done: false };
    const v = String(value ?? "");
    paint(el);
    if (el.focus) el.focus();

    // 1) <select>
    if (el instanceof HTMLSelectElement) {
      el.value = v;
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return { done: true, kind: "select", label: (getLabel(selector) || {}).label || "" };
    }

    // 2) contenteditable (Facebook Messenger, posts, comments, Google rich editors)
    if (el.isContentEditable) {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(el);
      selection.removeAllRanges();
      selection.addRange(range);
      const inserted = document.execCommand("insertText", false, v);
      if (!inserted) {
        el.textContent = v;
        el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: v }));
      }
      return { done: true, kind: "contenteditable", label: (getLabel(selector) || {}).label || "" };
    }

    // 3) <input> / <textarea> with instance check (avoids "Illegal invocation")
    const proto =
      el instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype :
      el instanceof HTMLInputElement ? window.HTMLInputElement.prototype : null;
    if (!proto) {
      return { done: false, error: `Element <${el.tagName.toLowerCase()}> is not fillable` };
    }
    const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
    if (descriptor && descriptor.set) descriptor.set.call(el, v);
    else el.value = v;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return { done: true, isPassword: el.type === "password", label: (getLabel(selector) || {}).label || "" };
  }

  function click(selector) {
    const el = querySafe(selector);
    if (!el) return { done: false };
    paint(el);
    const label = (getLabel(selector) || {}).label || "";
    if (typeof el.click === "function") {
      el.click();
    } else {
      // SVGElement has no .click() in Chromium
      el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
    }
    return { done: true, label };
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
    return true;
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", installHud);
  else installHud();
})();
