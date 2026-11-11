# How to author a DeepSeek Harness plugin (distilled)

DSH is a **Cordis** runtime. A plugin is an npm package with one or two halves:

- **Host half** `lib/index.js` (Node): skills, commands, services, scheduled work.
- **Browser half** `lib/client.js` (React): UI in the Web GUI.

Activation is via `cordis.patch.yml`, which inserts the plugin's row into the Loader.

## Three kinds

| Kind | `dsh.bundle.patch` | `dsh.client` |
|---|---|---|
| Host-only (skill / command) | yes | no |
| Client-only (UI) | no | yes |
| Dual-face | yes | yes |

## Files

```
mi-plugin/
├── package.json        # exports + dsh.bundle.patch + dsh.client
├── cordis.patch.yml    # - insert: - id: mi-plugin  name: '@scope/mi-plugin'
├── lib/index.js        # host half — export apply(ctx)
├── lib/client.js       # browser half — window.__ModuleLoader__.load(...)
├── locale/*.json       # meta.title / meta.description
├── icon.svg
└── README.md
```

## package.json (dual-face minimum)

```jsonc
{
  "name": "@javierfrancoleal/mi-plugin",
  "version": "1.0.0",
  "type": "module",
  "main": "lib/index.js",
  "exports": {
    ".": "./lib/index.js",
    "./client": "./lib/client.js",
    "./cordis.patch.yml": "./cordis.patch.yml",
    "./package.json": "./package.json",
    "./locale/*.json": "./locale/*.json"
  },
  "engines": { "node": ">=24", "dsh": ">=0.2.1-rc.0" },
  "dsh": {
    "manifestVersion": 1,
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": {
      "platform": "web",
      "inject": ["@deepseek-ai/dsh-client-locale", "@deepseek-ai/dsh-client-ui-layout"]
    }
  },
  "peerDependencies": { "@deepseek-ai/cordis": "~4.0.5" }
}
```

## Host half — register a skill (proven pattern)

```js
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { BUNDLED_SKILL_RANK } from "@deepseek-ai/dsh-skill";

const PROVIDER_NAME = "javierfrancoleal-mi-plugin";
const SKILL_BODY_URL = new URL("../assets/mi-skill.md", import.meta.url);
const RESOURCE_BASE = { kind: "directory", path: fileURLToPath(new URL("../assets/", import.meta.url)) };
const CANDIDATE = {
  name: "mi-skill",
  description: "…",
  invocation: { modelInvocable: true, userInvocable: true },
  provider: PROVIDER_NAME, source: "bundled",
  resourceBase: RESOURCE_BASE, rank: BUNDLED_SKILL_RANK, locator: SKILL_BODY_URL,
};
const provider = {
  name: PROVIDER_NAME,
  list: () => Promise.resolve([CANDIDATE]),
  async get() { return { ...CANDIDATE, content: await readFile(SKILL_BODY_URL, "utf8") }; },
};
const name = "mi-plugin";
const inject = ["skills"];
function apply(ctx) { ctx.skills.registerProvider(() => provider); }
export { apply, inject, name };
```

Commands: `ctx.get("commands")?.register({ definitionId, name, description, input, handler })`.
Timers: `ctx.effect(() => { const t = setTimeout(run, ms); return () => clearTimeout(t); }, "label")`.
Log: `ctx.logger.info/warn(...)`.

## Browser half — the recipe (the hard part)

```js
window.__ModuleLoader__.load({
  id: "@javierfrancoleal/mi-plugin",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    const React = require("react");   // react + react/jsx-runtime are baseline

    function MiComponente(_props) {
      const t = _props && typeof _props.t === "function" ? _props.t : (k) => k;
      return React.createElement("div", null, t("saludo"));
    }

    const inject = ["slots", "locale"];
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register("miNs", { zh, en }), "mi-plugin: locale");
      ctx.slots.inject("shell.bottom", () => ctx.slots.register({
        name: "shell.bottom", id: "mi-plugin", order: 0, locale: "miNs"
      }, MiComponente));
    }

    exports.MiComponente = MiComponente;
    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});
```

Rules:
- `exports["./client"]` → `./lib/client.js`.
- Write `lib/client.js` **already built** (this exact form); no build step for `link:` installs.
- No JSX — use `React.createElement` or `require("react/jsx-runtime")`.
- Inject CSS with a `<style data-plugin-css="…">` tag.
- Client `inject` lists **services** (`slots`, `locale`, `theme`, `remote`, …).

## Slots

| Slot | Alcance | Para qué |
|---|---|---|
| `shell.bottom` | root | **global full-width bottom bar** (empty by default) — **single: a 2nd occupant THROWS** |
| `shell.overlay` | root | **list (additive)** — overlays/pills without conflict |
| `shell.leading` | root | top-left corner (macOS) |
| `sidebar` / `rightbar` / `main` | root | columns / central panel |
| `conversation.input.dock` | sesión | bar above the composer |

`ctx.slots.inject(slot, () => ctx.slots.register(opts, Component))` is deferred.

## Naming & display (the convention — read before creating a plugin)

- **`cordis.patch.yml`** → `id` is the SHORT name (`cockpit-browser`, no `@scope/`);
  `name` is the scoped npm package (`@javierfrancoleal/cockpit-browser`).
- **`lib/index.js`** → `const name = "<short>"` (matches the `id`); export it with
  `inject` and `apply`.
- **`package.json`** → `name` is the scoped package.
- **The Plugins-section title/description comes from `locale/*.json`** in the
  NESTED shape (this is what the plugin manager reads via `readPluginMeta`):

  ```json
  { "meta": { "title": "Cockpit Browser", "description": "…" } }
  ```

  **Do NOT use the flat `"<id>.name"` / `"<id>.description"` shape.** That legacy
  format (doctrine, forensic-contracts, constitution) carries no `meta`, so the
  Plugins section falls back to showing the raw scoped package name
  `@scope/name`. `meta.title` is translated per locale (es "Navegador de Cabina",
  fr "Navigateur de Cockpit", …).
- **All shared content is English** — `package.json` description, README, docs, and
  runtime strings. `locale/*.json` are the translations (canonical is `en.json`).
  Regexes that match real-world button labels (`FORBIDDEN`) may stay multilingual.

## Locale & theme

- `ctx.locale.register(ns, { zh, en })` — **both** dictionaries required.
- `locale: ns` in `register` → framework injects `t` as a prop.
- Theme tokens (light/dark aware, no hardcoded hex): `--dsw-alias-label-primary/secondary/tertiary`,
  `--dsw-alias-state-success-primary` (green), `-warn-primary` (amber), `-error-primary` (red),
  `--dsw-specific-menu`, `--dsw-alias-border-l1`, `--dsw-radius-md`, `--dsw-elevation-panel`,
  `--dsw-menu-backdrop-filter`.

## Install into the running app

**A) From npm** (another machine/profile without the local checkout):

```bash
dsh plugin --profile <perfil> add @javierfrancoleal/mi-plugin
```

This adds the dependency + bundle and runs pnpm for you; restart the app after.

**B) Local (`link:`) — developing in the monorepo:**

1. `~/.dsh/profiles/<perfil>/package.json`: add `"@scope/nombre": "link:/abs/path"` to
   `dependencies` and `"@scope/nombre"` to `dsh.profile.bundles`.
2. `cd ~/.dsh/profiles/<perfil> && pnpm install`.
3. **Restart the app** (a new bundle needs a host recomposition).

## Dynamic host→client data (Remote/Typert)

When the client needs changing data (balance, host state…), expose a **Remote** on
the host and read it from the client. Verified recipe (`jfranco-balance`,
2026-11-04); `dsh-goal` uses a code generator that a `link:` without build cannot
use, so write everything by hand:

**Host** (`lib/index.js`):

```js
import { TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";

class MiService extends TypertRemoteService {
  constructor(ctx) { super(ctx, "miServicio"); this.ctx = ctx; }
  async getSnapshot() { /* JSON-serializable object */ }
}
const MARKER = "@deepseek-ai/dsh-typert-protocol/remote-methods";
Object.defineProperty(MiService.prototype, MARKER, {
  configurable: true,
  value: Object.freeze({ version: 1, methods: Object.freeze([
    Object.freeze({ method: "getSnapshot", invocation: Object.freeze({ kind: "direct" }) }),
  ]) }),
});
export default MiService;   // default export = the Cordis plugin
```

The gateway's SRC discovery exposes endpoint `miServicio/getSnapshot` with no
generated `./typert` artifact.

**Client** (`lib/client.js`):

```js
const inject = ["slots", "locale", "remote"];
const CONTRIBUTION = {
  package: "@javierfrancoleal/mi-plugin",
  descriptors: [{
    id: "@javierfrancoleal/mi-plugin#miServicio/getSnapshot",
    service: "miServicio", namespace: "miServicio", method: "getSnapshot",
    invocation: { kind: "direct" }, parameters: [], result: { mode: "src-json" },
  }],
};
async function apply(ctx) {
  await ctx.remote.$mount(CONTRIBUTION);
  const handle = ctx.get("remote.miServicio");
  const res = await handle.getSnapshot();   // { ok: true, value } | { ok: false, error }
}
```

**DeepSeek credentials** (authenticated APIs, e.g. `GET /user/balance`):

- API key: `ctx.get("credentials").resolve("DEEPSEEK_API_KEY")` → `{ value }`
  (header `Authorization: Bearer <key>`).
- Account token (fallback, live-verified 2026-11-04):
  `ctx.get("deepseekAccount").resolveToken("https://api.deepseek.com")` →
  header `x-dsh-auth-token`. `/user/balance` accepts it, so the plugin works
  with account sign-in.

## Gotchas

1. The checkout lives inside `app.asar` — use `_dsh-inspect/asar-tool.mjs list|extract`.
2. The `desktop` profile is Electron-managed: `dsh --profile desktop --dump-config` fails.
   Validate with a throwaway profile.
3. New bundles are NOT picked up by HMR on external edits — restart the app.
4. `dsh.bundle.patch` + `dsh.client` can coexist (dual-face).
5. React / slots / primitives are baseline; don't list them in `dsh.client.inject`.
6. **Bundle URLs are revisioned**: `/plugins/??<id>/client.js&rev=<rev>`; the bare
   `/plugins/<id>/client.js` **always 404s**. Derive `rev` LOCALLY (no need to
   scrape the HTML, which requires auth): sha1 over
   `"plugin-artifact\0" + "<len>:mtimeMs" + "<len>:ctimeMs" + "<len>:size"`
   (file stats of `lib/client.js`), first 12 hex chars — see the checklist.
   The `/plugins` endpoint needs **no auth**.
7. **The app may change port after a restart** — re-read the advertised URL.
8. **First publish of a NEW package gets a `0.0.0-stage` placeholder** — that's
   npm's staged publishing (registry feature, GA 2026), not a bug in your scripts
   or in pnpm/npm. The real version lands ~1 min later on its own. Mitigation:
   deprecate the placeholder; `publish.sh` / `sync-all.sh` now do it automatically.

## Validation checklist

```bash
node --check lib/index.js && node --check lib/client.js
node tools/check-client.mjs lib/client.js
dsh --profile testprices --dump-config | grep mi-plugin     # throwaway profile, not desktop
REV=$(node -e 'const fs=require("fs"),crypto=require("crypto");const st=fs.statSync("lib/client.js");const h=crypto.createHash("sha1").update("plugin-artifact").update("\0");for(const p of [String(st.mtimeMs),String(st.ctimeMs),String(st.size)])h.update(String(Buffer.byteLength(p))+":").update(p);console.log(h.digest("hex").slice(0,12))')
curl -sS "http://127.0.0.1:<puerto>/plugins/??@scope/mi-plugin/client.js&rev=$REV"  # 200 (no auth needed)
```

Full reference: `docs/PLUGIN-AUTHORING.md`. Template: `templates/dsh-plugin/`.
Scaffold/validate: `tools/new-plugin.sh`, `tools/check-plugin.sh`.
