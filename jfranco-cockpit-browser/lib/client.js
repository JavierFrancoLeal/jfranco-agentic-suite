window.__ModuleLoader__.load({
  id: "@javierfrancoleal/cockpit-browser",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    const z = require("zod");

    // Remote contribution: host method "cockpit/open" (link click → cockpit).
    // Parameters must be mode:"strict" (client-side validation); the result is
    // src-json (no strict schema on the host return).
    const CONTRIBUTION = {
      package: "@javierfrancoleal/cockpit-browser",
      descriptors: [{
        id: "@javierfrancoleal/cockpit-browser#cockpit/open",
        service: "cockpit",
        namespace: "cockpit",
        method: "open",
        invocation: { kind: "direct" },
        parameters: [{
          name: "url",
          wire: "url",
          source: "json",
          codec: {
            mode: "strict",
            typeSymbol: "@javierfrancoleal/cockpit-browser#url",
            create: () => z.string(),
            jsonSchema: { type: "string" },
          },
        }],
        result: { mode: "src-json" },
      }],
    };

    let getHandle = null;

    // Intercept external http(s) link clicks and route them to the cockpit
    // browser. DSH's own origin and non-web schemes are left untouched, so the
    // GUI keeps its normal navigation. Cmd/Ctrl+click bypasses to the normal
    // browser (escape hatch).
    function installLinkBridge() {
      if (typeof document === "undefined") return;
      document.addEventListener("click", (event) => {
        if (event.defaultPrevented || event.button !== 0) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const anchor = event.target && typeof event.target.closest === "function"
          ? event.target.closest("a[href]")
          : null;
        if (!anchor) return;
        let url;
        try { url = new URL(anchor.href, window.location.href); } catch { return; }
        if (url.protocol !== "http:" && url.protocol !== "https:") return;
        if (url.origin === window.location.origin) return; // keep DSH internal nav
        event.preventDefault();
        event.stopPropagation();
        const handle = getHandle ? getHandle() : null;
        if (handle) {
          handle.open(url.href).catch(() => { window.open(url.href, "_blank", "noopener"); });
        } else {
          window.open(url.href, "_blank", "noopener");
        }
      }, true);
    }

    const inject = ["remote"];
    async function apply(ctx) {
      if (!ctx.remote || typeof ctx.remote.$mount !== "function") return;
      try {
        await ctx.remote.$mount(CONTRIBUTION);
        getHandle = function () {
          try { return ctx.get("remote.cockpit"); } catch (error) { return null; }
        };
        installLinkBridge();
      } catch (error) {
        console.error("[cockpit-browser] remote mount failed:", error);
      }
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  },
});
