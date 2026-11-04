# DeepSeek Harness — Plugin Authoring Guide

> Destilado de la ingeniería inversa de **DSH 0.2.1-rc.5** (verificado 2026-11-03/04).
> Este documento es la fuente canónica. La skill `plugin-authoring` expone el mismo
> contenido a los agentes. La plantilla está en `templates/dsh-plugin/` y los scripts
> en `tools/` (`new-plugin.sh`, `check-plugin.sh`).

---

## 1. Qué es un plugin de DSH

DSH es un runtime **Cordis**. Un plugin es un paquete npm (aquí, una carpeta del
monorepo publicada a npm) que aporta una o dos mitades:

- **Half host** (`lib/index.js`, Node): lógica del servidor — registra skills,
  comandos, servicios, tareas programadas.
- **Half browser** (`lib/client.js`, React en el navegador): UI de la GUI Web.

La activación se hace con `cordis.patch.yml`, que **inserta la fila** del plugin en
el Loader. Un plugin es un *bundle* si su `package.json` declara `dsh.bundle.patch`.

### Los tres tipos

| Tipo | `dsh.bundle.patch` | `dsh.client` | Ejemplo |
|---|---|---|---|
| **Host-only** (skill / comando) | sí | no | `jfranco-cortex` |
| **Client-only** (solo UI) | no | sí | `dsh-client-ui-goal` |
| **Doble cara** (host + UI) | sí | sí | `jfranco-deepseek-prices` |

> Ambos campos pueden coexistir en el mismo objeto `dsh` (paquete "dual-face").

---

## 2. Anatomía de un paquete

```
mi-plugin/
├── package.json          # nombre, exports, dsh.bundle.patch + dsh.client
├── cordis.patch.yml      # inserta la fila en el Loader
├── lib/
│   ├── index.js          # half host (Node) — exporta apply(ctx)
│   └── client.js         # half browser — window.__ModuleLoader__.load(...)
├── locale/*.json         # meta.title / meta.description (gestor de plugins)
├── icon.svg              # icono del plugin
└── README.md
```

### `package.json` (doble cara, mínimo)

```jsonc
{
  "name": "@javierfrancoleal/mi-plugin",
  "version": "1.0.0",
  "type": "module",
  "main": "lib/index.js",
  "exports": {
    ".": "./lib/index.js",
    "./client": "./lib/client.js",      // solo si hay half browser
    "./cordis.patch.yml": "./cordis.patch.yml",
    "./package.json": "./package.json",
    "./locale/*.json": "./locale/*.json"
  },
  "engines": { "node": ">=24", "dsh": ">=0.2.1-rc.0" },
  "dsh": {
    "manifestVersion": 1,
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": {                          // solo si hay half browser
      "platform": "web",
      "inject": ["@deepseek-ai/dsh-client-locale", "@deepseek-ai/dsh-client-ui-layout"]
    }
  },
  "peerDependencies": { "@deepseek-ai/cordis": "~4.0.5" }
}
```

- `dsh.bundle.patch` → hace que el paquete sea instalable/activar como bundle.
- `dsh.client.inject` → módulos de cliente que deben cargar **antes** que este.
  `platform` debe ser `"web"`; `external` solo para módulos no-baseline.

### `cordis.patch.yml`

```yaml
- insert:
    - id: mi-plugin
      name: '@javierfrancoleal/mi-plugin'
```

---

## 3. Half host (`lib/index.js`)

Formato Cordis: exporta `apply` (y opcionalmente `name`, `inject`).

```js
const name = "mi-plugin";
const inject = ["skills"];              // solo si registras una skill

function apply(ctx) {
  // ctx.skills.registerProvider(...)   — registrar una skill
  // ctx.get("commands")?.register(...) — registrar un comando /mi-plugin
  // ctx.effect(() => cleanup, "label") — efectos con limpieza
  // ctx.logger.info/warn(...)          — log del host
  // ctx.setInterval? NO — usa setTimeout en un ctx.effect
}

export { apply, inject, name };
```

### Registrar una skill (patrón probado)

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

---

## 4. Half browser (`lib/client.js`) — la parte difícil

El half cliente **no es** un módulo ES normal: es un bundle CJS perezoso que se
registra en el cargador de módulos del navegador.

```js
window.__ModuleLoader__.load({
  id: "@javierfrancoleal/mi-plugin",       // == nombre del paquete
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    const React = require("react");        // react y react/jsx-runtime son baseline

    function MiComponente(_props) {
      const t = _props && typeof _props.t === "function" ? _props.t : (k) => k;
      return React.createElement("div", null, t("saludo"));
    }

    const inject = ["slots", "locale"];    // servicios del contexto cliente
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

Reglas:

- **`exports["./client"]`** de `package.json` debe apuntar a `./lib/client.js`.
- Escribe `lib/client.js` **ya compilado** (esta forma `window.__ModuleLoader__`),
  no TS/JSX. El host sirve el archivo tal cual; no hay paso de build para `link:`.
- Sin JSX: usa `React.createElement` o `require("react/jsx-runtime")`.
- CSS: inyéctalo con un `<style data-plugin-css="…">` en `document.head`.
- El `inject` del cliente son **servicios** del contexto cliente (`slots`, `locale`,
  `theme`, `shortcuts`, `remote`, `sessions`, …), no módulos.

### `dsh.client` y su `inject`

`dsh.client.inject` lista **paquetes cliente** que deben cargar primero. Los
servicios baseline (no listados): `slots`, `react`, `react/jsx-runtime`,
`@deepseek-ai/dsh-client-ui-primitives`, `@deepseek-ai/dsh-client-ui-slots`.

---

## 5. Slots (dónde poner tu UI)

| Slot | Alcance | Tipo | Para qué |
|---|---|---|---|
| `shell.bottom` | root | single | **barra global a todo el ancho, abajo** (vacío por defecto) |
| `shell.overlay` | root | list | overlay sobre todo el frame |
| `shell.leading` | root | single | esquina superior (macOS) |
| `sidebar` / `rightbar` | root | single | columnas |
| `main` | root | keyed | panel central (`conversation` reservado) |
| `conversation.input.dock` | sesión | — | barra sobre el composer (como la GoalBar) |

`ctx.slots.inject(nombre, () => ctx.slots.register(opciones, Componente))` — la
inyección es diferida (espera a que el slot exista). Para slots de **sesión**
(como `conversation.input.dock`) `opciones` lleva un `inject: (sessionId) => props`.

---

## 6. Idioma (`ctx.locale`)

- `ctx.locale.register(ns, { zh, en })` — **ambos** diccionarios son obligatorios.
- Con `locale: ns` en `slots.register`, el framework inyecta `t` como prop.
- Idiomas embarcados: **en** y **zh**. Otros se añaden con `ctx.locale.addLanguage`.
- Los `locale/*.json` del paquete solo alimentan `meta.title`/`meta.description`.

---

## 7. Tokens de tema (`--dsw-*`)

Tema-conscientes (claro/oscuro). No uses hex fijos.

| Propósito | Token |
|---|---|
| texto | `--dsw-alias-label-primary` / `-secondary` / `-tertiary` / `-dimmed` |
| éxito (verde) | `--dsw-alias-state-success-primary` |
| aviso (ámbar) | `--dsw-alias-state-warn-primary` |
| error (rojo) | `--dsw-alias-state-error-primary` |
| superficie | `--dsw-specific-menu` |
| borde | `--dsw-alias-border-l1` |
| radio | `--dsw-radius-md` |
| sombra / blur | `--dsw-elevation-panel`, `--dsw-menu-backdrop-filter` |

---

## 8. Instalación en la app en ejecución

1. En `~/.dsh/profiles/<perfil>/package.json`:
   - añade `"@scope/nombre": "link:/ruta/absoluta/al/plugin"` en `dependencies`,
   - añade `"@scope/nombre"` en `dsh.profile.bundles`.
2. `cd ~/.dsh/profiles/<perfil> && pnpm install`.
3. **Reinicia la app DeepSeek Harness** (un bundle nuevo requiere recomponer el host).

---

## 9. Gotchas (aprendidos a la fuerza)

1. **El checkout vive dentro de `app.asar`** (no es carpeta). Para leerlo usa
   `_dsh-inspect/asar-tool.mjs list|extract`.
2. **El perfil `desktop` es gestionado por la app Electron**: `dsh --profile desktop
   --dump-config` falla. Valida la composición con un perfil desechable (`testprices`).
3. **Un bundle nuevo no se recoge por HMR** al editar archivos externos: reinicia la app.
4. **`dsh.bundle.patch` + `dsh.client` sí pueden coexistir** (paquete doble cara).
5. **El half cliente va pre-compilado**: el host sirve `lib/client.js` sin build.
6. **React / slots / primitives son baseline**; no los declares en `dsh.client.inject`.
7. `node`/`pnpm` no están en `PATH`: usa los bundleros de
   `~/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/{node,pnpm}`.

---

## 10. Checklist de validación

```bash
node --check lib/index.js && node --check lib/client.js          # 1. sintaxis
node tools/check-client.mjs lib/client.js                        # 2. mock-load cliente
# 3. composición (perfil desechable, no "desktop"):
dsh --profile testprices --dump-config | grep mi-plugin
# 4. tras reiniciar la app: el bundle debe servirse
curl -sS http://127.0.0.1:<puerto>/plugins/@scope/mi-plugin/client.js   # 200, no 404
```

`tools/check-plugin.sh mi-plugin` automatiza 1 + 2 (y 3 con `--compose`).

---

## 11. Paquetes de referencia (extraídos en `_dsh-inspect/`)

| Paquete | Qué enseña |
|---|---|
| `dsh-client-ui-goal` | barra acoplada (`conversation.input.dock`), inyección de slot |
| `dsh-client-ui-layout` | `shell.bottom`, slot raíz, `ctx.layout` |
| `dsh-client-modules` | README = el sistema de módulos cliente |
| `dsh-skill-badge` | proveedor de skill inmutable |
| `dsh-goal` | half host + Remote (Typert) |
| `jfranco-deepseek-prices` | doble cara completo (host verifier + barra cliente) |

Creado por **J.Franco**.
