# Slots `single` en DSH 0.2.1-rc.5 — semántica exacta y plan de integración `@javierfrancoleal/balance`

Investigación de código (forense) — 2026-11-04
Autor: agente investigador (subagente de la sesión de orquestación)
Alcance: no se modificó nada fuera de `_dsh-inspect/research/`.

---

## 0. Resumen ejecutivo

- `shell.bottom` es un slot **`single`** (root) declarado por `@deepseek-ai/dsh-client-ui-layout`. Un slot `single` **solo renderiza UN ocupante**.
- Un **segundo registro con el mismo `priority`** (el default es `0`) **lanza un Error síncrono** (`single slot "shell.bottom" already has a registration at priority 0 … — register at a different priority to shadow it (lowest renders)`). No se ignora, no se pisa en silencio: **falla en alto**.
- Con **`priority` distinto** el segundo registro se acepta pero queda **"shadowed"** (oculto): gana el que tenga **menor número de `priority`**. `order` no participa en slots `single`.
- Por lo tanto **la opción (a)** (registrar `balance` también en `shell.bottom`) **no puede mostrar ambos widgets a la vez**: o reemplaza la barra de precios (`priority: -1`) o queda invisible (`priority: 1`); con `priority` por defecto rompe el boot del plugin.
- **Recomendación: opción (b)** — registrar `balance` en **`shell.overlay`** (slot `list`, sin colisión, "asiento aditivo" oficial para pills/estado) con un widget `position:absolute` anclado **abajo-centro** sobre la barra de precios (`bottom:0; left:50%; transform:translateX(-50%)`), con chequeo de presencia de `.Jfdp_bar`. Es la única opción que (1) no toca el paquete de precios publicado, (2) no viola el ownership de React, (3) tiene ciclo de vida limpio vía slots y (4) queda visualmente "integrado/centrado" en la barra.
- **Alternativa con más "integración" (opción d)**: como `@javierfrancoleal/deepseek-prices` está instalado **`link:`** al workspace, es viable que `prices` declare un **sub-slot** (`children` en su `slots.register`, igual que hace layout con `root`) y que `balance` se registre ahí. Requiere editar `lib/client.js` de precios + **reiniciar la app** (sin `pnpm install`). Se valora como evolución si se acepta tocar el paquete.

---

## 1. Semántica exacta de un slot `single` (citas del código)

### 1.1 Dónde vive el sistema de slots

El paquete `@deepseek-ai/dsh-client-ui-slots` **no existe como directorio en el ASAR**; su implementación va **inlineada en el bundle del shell web**:

- `dsh/node_modules/@deepseek-ai/dsh-web-frontend/dist/assets/index-BXV-oxvX.js`
  → extraído a `_dsh-inspect/research/slots-extract/shell-index.js`.
  Contiene el módulo estático `"@deepseek-ai/dsh-client-ui-slots": jI` con la clase **`SlotCore`** (`var SI=class{…}`, L120, offset ≈485026) — la autoridad de registro/organización de entradas.
- El **renderer** (`@deepseek-ai/dsh-client-ui-renderer/lib/client.js`) aporta `SlotRegistry` (servicio cordis `ctx.slots`) y la máquina de render:
  `_dsh-inspect/research/slots-extract/renderer-client.js`.
- El **runner dinámico** (`@deepseek-ai/dsh-cordis-client-runner/lib/client.js`) aporta la fachada con prioridades automáticas para plugins dinámicos:
  `_dsh-inspect/research/slots-extract/client-runner-client.js`.

`shell.bottom` lo declara el layout en el registro de `root` (`layout-client.js` L639-650):

```js
"shell.bottom": { kind: "single", scope: "root" }
```

y se renderiza como fila inferior a todo el ancho (`layout-client.js` L344-348):

```js
React.createElement("div", { className: bottomRow, "data-shell-bottom": true,
  children: renderSlot("shell.bottom", {}) })
```

README del layout (L34): *"The single root-scoped `shell.bottom` slot spans the full width below the three columns. Its occupant controls its own height and visibility; the columns shrink by that height, and empty content reserves no space."* (nótese "**Its occupant**" — singular).

### 1.2 La regla de colisión en `SlotCore.register` (shell-index.js, clase `SI`)

Código (desminificado por el investigador):

```js
register(e, t) {
  const r = this.records.get(e.name);
  if (!r?.spec) throw new Error(`slot "${e.name}" is not declared …`);
  const i = r.spec, n = e.priority ?? 0;
  const s = h => `at priority ${n}${h.registrant !== void 0
    ? ` (registered by ${h.registrant})` : ""}
    — register at a different priority to shadow it (lowest renders)`;
  switch (i.kind) {
    case "single": {
      const h = r.entries.find(p => (p.options.priority ?? 0) === n);
      if (h) throw new Error(`single slot "${e.name}" already has a registration ${s(h)}`);
      break;
    }
    case "keyed":  …  // exige options.key; colisión por (key, priority)
    case "list":   …  // exige options.id;  colisión por (id, priority)
    case "chain":  …  // exige options.select; sin colisión
  }
  …
  // orden de entradas tras el alta:
  u.sort(
    i.kind === "list"
      ? (h,p) => (h.options.priority??0)-(p.options.priority??0)
                 || (h.options.order??0)-(p.options.order??0)
      : (h,p) => (h.options.priority??0)-(p.options.priority??0)
  );
}
```

**Conclusiones para `single`:**

1. **Misma `priority` → `throw` síncrono.** Con `priority` omitida ambos quedan en `0` y el segundo registro lanza. El error sube por `ctx.slots.register` (que corre dentro de `ctx.effect`, `renderer-client.js` L1813-1816) hasta el callback de `ctx.slots.inject`; éste detiene la inyección y **relanza el error** (síncrono en el primer intento, o en microtask si la declaración llegó después — `renderer-client.js` L1400-1421). Resultado visible: **el plugin que llega segundo falla ruidosamente** (su `apply`/inject falla, su fila de plugin queda en error), no se ignora ni se pisa.
2. **`priority` distinta → permitido, pero solo UNO renderiza.** `entriesOfSlot` (el "view de ganadores") para un `single` devuelve únicamente la **primera** entrada en orden de `priority` ascendente, saltando las *abdicated* (crasheadas):

```js
entriesOfSlot(e) {
  const t = this.records.get(e); if (!t?.spec) return i1;
  const r = t.spec.kind; if (r === "chain") return t.entries;
  const i = [], n = new Set();
  for (const s of t.entries) {
    if (this.abdicated.has(s)) continue;
    const l = r === "keyed" ? s.options.key : r === "list" ? s.options.id : void 0;
    n.has(l) || (n.add(l), i.push(s));
  }
  return i;
}
```

   (en `single`, `l` es siempre `undefined` → tras la primera, las demás se descartan: **exactamente un ganador**).
3. Y el renderer para `kind === "single"` toma `host.entriesOfSlot(slotKey)[0]` (`renderer-client.js` L1173-1177). Es decir: **gana el menor `priority`** ("lowest renders"); las demás entradas quedan registradas pero ocultas (**shadowed**). `order` es irrelevante en `single` (solo ordena slots `list`).
4. **Fallback por abdicación**: si el ganador crashea en render, se marca `abdicated` y el siguiente en prioridad toma su lugar (`renderer-client.js` L1139-1140 + `entriesOfSlot`). Eso significa: si `balance` entrara con `priority:-1` y su widget crasheara, la barra de precios reaparecería — es la única red de seguridad de la vía (a).
5. **No existe modo "merge"/lista** para `shell.bottom`: el `kind` lo fija el declarante (layout) y no se puede re-declarar (`slot "<name>" is already declared` en `register`/`registerFactory` si otro entry declara `children` con la misma clave). Opciones de `register` disponibles (sin `dedupe`): `name, key, id, order, label, priority, select, inject, children, store, locale, registrant`.

### 1.3 Matiz importante: plugins **dinámicos** (runtime) vs **estáticos** (bundles)

- Para **plugins dinámicos** (cargados vía el runner), la fachada `guardedSlots` **fuerza** la prioridad con un contador compartido por página: `allocatePriority: () => --this.nextPriority` (`client-runner-client.js` L615, contador L393: *"Page-local shadowing rank. A later registration receives a lower priority"*). Primer registro dinámico → `-1`, segundo → `-2`… Como "lowest renders", **entre dinámicos el ÚLTIMO en registrarse gana (sombrea)**, y un dinámico (prioridad negativa) **siempre sombrea** a un estático (prioridad `0`) — por eso el catálogo marca `replaceRisk: "shadows-shipped-ui"` para `shell.bottom` (`client-runner-client.js` L5423-5475).
- Para **plugins estáticos** (bundles del perfil, como `deepseek-prices` y el futuro `balance`), **no hay proxy**: `ctx.slots.register` recibe las opciones tal cual → `priority ?? 0`. Dos estáticos en `shell.bottom` sin `priority` explícita **chocan** (throw). El orden de activación (orden de bundles en `dsh.profile.bundles`) decide quién gana; el segundo revienta.

### 1.4 Catálogo oficial del slot

- `shell.bottom` (`client-runner-client.js` L5423): *"Full-width bottom content below all three columns. Its rendered height reduces the columns' available height; empty content reserves no space. The occupant owns its height, visibility, and controls."* — `registerOptions: []`, `replaceRisk: "shadows-shipped-ui"`.
- `shell.overlay` (`client-runner-client.js` L5481): *"Frame-wide floating layer, above every column and outside their scroll containers. Deliberately generic and unowned by any feature: a badge, a toast stack or a status pill all belong here, and entries order among themselves. The layer itself is click-through — entries opt back into pointer events — so an occupant never blocks the app underneath. **This is the additive seat for a frame-wide surface of your own: a fresh `id` is added beside the shipped entries instead of replacing them.**"* → es el asiento diseñado para exactamente lo que `balance` necesita (un "status pill").
- CSS del layout: `.PIRFFq_bottomRow{…grid-column:1/-1;…overflow:auto}` y `.PIRFFq_overlayLayer{z-index:20;pointer-events:none;position:absolute;inset:0}.PIRFFq_overlayLayer>*{pointer-events:auto}` (`layout-client.js`, bloque CSS). La capa overlay cubre todo el frame (incluida la fila inferior) y pinta por encima (`z-index:20`).

---

## 2. Hallazgos de instalación (perfil `desktop`)

- `~/.dsh/profiles/desktop/package.json`:
  - `dependencies["@javierfrancoleal/deepseek-prices"] = "link:/Users/javierfrancoleal/Documents/deepseek-harness/default-workspace/plugins/jfranco-deepseek-prices"`
  - `dsh.profile.bundles` incluye `"@javierfrancoleal/deepseek-prices"` (junto a otros 7 plugins `@javierfrancoleal/*` y 4 bundles experimentales).
- En `node_modules`: `~/.dsh/profiles/desktop/node_modules/@javierfrancoleal/deepseek-prices` es un **symlink** a `plugins/jfranco-deepseek-prices` (`readlink` → `../../../../../Documents/deepseek-harness/default-workspace/plugins/jfranco-deepseek-prices`). ⇒ **instalación `link:` al workspace, no copia npm**.
- Implicaciones:
  - Los cambios en `plugins/jfranco-deepseek-prices/lib/client.js` son visibles tras **reiniciar la app** (el host sirve `/plugins/<pkg>/client.js` desde la ruta resuelta; guía: *"un bundle nuevo no se recoge por HMR — reinicia la app"*). **No hace falta `pnpm install`** mientras no cambien dependencias/package.json.
  - `@javierfrancoleal/balance` **aún no está** en `dependencies` ni en `bundles` del perfil: para instalar el plugin hará falta el paso link:+bundles+`pnpm install`+reinicio (guía §8.B, `PLUGIN-AUTHORING.md` L246-252).
- La barra actual: `plugins/jfranco-deepseek-prices/lib/client.js` registra `shell.bottom` con `{name:"shell.bottom", id:"jfranco-deepseek-prices", order:0, locale:NS}` → **`priority` 0 (default)**. Renderiza `.Jfdp_bar` (34px, flex row) con `.Jfdp_spacer{flex:1}` entre precios (izq) y relojes (der), y lleva `data-deepseek-prices="true"` (gancho útil para CSS). El catálogo shipped cita a "experimental-inspector InspectorPage" como ocupante de `shell.bottom`, pero **su `lib/client.js` no registra ese slot** (verificado: cero referencias a `shell.`), así que en este perfil `prices` es el único ocupante y no hay colisión actual.
- El scaffold actual de `plugins/jfranco-balance/lib/client.js` **registra `shell.bottom` sin `priority`** → tal cual está, al instalarlo junto a prices **lanzará el error de colisión** (ver §1.2): hay que cambiarlo sí o sí.

---

## 3. Comparativa de opciones

### (a) Registrarse igualmente en `shell.bottom`

- **Semántica encontrada**: `single` + misma `priority 0` → **throw en el segundo registrante** (falla ruidosa del plugin). Con `priority: 1` → `balance` queda shadowed (invisible, inútil). Con `priority: -1` → `balance` **reemplaza** la barra de precios entera (la barra de precios desaparece; solo volvería si el widget de balance crashea — abdicación).
- **Viabilidad**: NO para el objetivo "ambos visibles". Solo sirve si balance quisiera *sustituir* a prices.
- **Riesgos**: rotura de boot según orden de bundles; pérdida total de la barra de precios (incluidos sus tooltips); dependencia de la red de abdicación.
- **"Integrado/centrado"**: n/a (no convive).

### (b) `shell.overlay` (slot `list`) con widget anclado abajo-centro — **RECOMENDADA**

- **Semántica**: `list` = aditivo, sin colisión (un `id` nuevo se suma); todos los entries renderizan ordenados por `(priority, order)`. La capa `.PIRFFq_overlayLayer` es `position:absolute; inset:0; z-index:20; pointer-events:none` (hijos directos `pointer-events:auto`) → cubre todo el frame y pinta por encima de la fila inferior.
- **Diseño**: registrar `{name:"shell.overlay", id:"balance-bottom", order:0, locale:NS}` y renderizar un div `position:absolute; bottom:0; left:50%; transform:translateX(-50%)`, de altura = altura de la barra (medir `.Jfdp_bar` con `getBoundingClientRect`; fallback 34px), `pointer-events:auto` explícito en el propio widget. Un `useEffect` comprueba cada ~2s que exista `.Jfdp_bar[data-deepseek-prices]` y oculta el widget si no (prices desinstalado).
- **Viabilidad**: alta. Todo con APIs públicas de slots + React baseline (`react`, `react/jsx-runtime`, y `react-dom/client` están en el `staticModules` del shell).
- **Riesgos**:
  - *Timing de render*: el slot overlay existe desde el arranque (declarado por layout junto a `root`); la inyección es diferida y el framework la resuelve — sin observadores de DOM para montar (solo el chequeo de presencia de la barra).
  - *HMR/re-registro*: al ser un slot gestionado por React, cualquier re-registro/re-render es manejado por el framework (nada de nodos "foráneos").
  - *Alineación*: depende de la altura real de la barra (medir, no hardcodear para siempre); el centrado es respecto al **frame completo** = centrado respecto a la barra (la barra ocupa todo el ancho, `grid-column:1/-1`).
  - *Interacción*: el widget tapa esa franja de la barra (el `title`/tooltip nativo de prices no saltará justo debajo del widget); aceptable para un pill.
- **"Integrado/centrado"**: visualmente idéntico a estar dentro de la barra (mismo ancho de centrado, misma franja inferior, mismo fondo/tokens), sin tocar el DOM de React de prices.

### (c) Inyección DOM: montar un subárbol React dentro de `.Jfdp_bar` desde el half cliente de balance

- **Técnica**: `require("react-dom/client")` → `createRoot(container)` sobre un contenedor insertado al final de `.Jfdp_bar` (o portal), con `MutationObserver` para esperar a que exista la barra y re-anclar si se remonta. Centrado: CSS propio `.Jfdp_bar[data-deepseek-prices="true"]{position:relative}` (especificidad mayor que el CSS de prices, gana sin depender del orden de `<style>`) + contenedor `position:absolute; inset:0; display:flex; justify-content:center; align-items:center; pointer-events:none` con el widget `pointer-events:auto`.
- **Viabilidad**: funciona, pero es la opción más frágil de las viables.
- **Riesgos**:
  - *Timing de render*: en `apply()` la barra aún no existe (el render ocurre después de componer); hay que observar el DOM (MutationObserver + heartbeat de re-anclaje).
  - *Re-renders de React*: `PriceBar` se re-renderiza **cada segundo** (`setInterval`). Un nodo extraño **al final** del árbol sobrevive porque React solo parchea los hijos que conoce; pero cualquier refactor de prices (listas keyed, reorden, cambio de children) puede **eliminar el nodo foráneo** silenciosamente → hay que vigilar `bar.contains(container)` y re-anclar.
  - *HMR/re-mount*: si prices se re-registra/remonta, el nodo se pierde y el observador debe reaccionar.
  - *Limpieza*: `root.unmount()` + desconectar observer + quitar contenedor en el cleanup del efecto del plugin; un olvido deja raíces huérfanas.
- **"Integrado/centrado"**: máximo acoplamiento real (el DOM vive dentro de la barra), pero a costa de romper el ownership de React sobre ese subárbol.

### (d) Sub-slot expuesto por `prices` (viable porque está `link:`-instalado)

- **Técnica**: en `plugins/jfranco-deepseek-prices/lib/client.js`, `ctx.slots.register({name:"shell.bottom", …, children: { "prices.bar.center": { kind: "single", scope: "root" } }}, PriceBar)`. El framework inyecta `renderSlot` como prop a `PriceBar` (por declarar `children`, igual que `AppFrame`); precios inserta un asiento centrado (p. ej. `<span style={{position:"absolute", inset:0, display:"flex", justifyContent:"center", alignItems:"center"}}>{props.renderSlot("prices.bar.center", {})}</span>` — añadiendo `position:relative` a `.Jfdp_bar` en el propio CSS de prices). `balance` hace `ctx.slots.inject("prices.bar.center", () => ctx.slots.register({name:"prices.bar.center", id:"balance", order:0, locale:NS}, BalanceWidget))`.
- **Qué hay que hacer para que aplique**: editar el archivo + **reiniciar la app**. `pnpm install` **no es necesario** (no cambian dependencias; el `link:` resuelve directo al workspace). Si `balance` se instala también `link:` + bundles, el pnpm install sería para registrar a `balance`, no por el cambio de prices.
- **Viabilidad**: alta y es la integración más limpia a largo plazo: el sub-slot es una API pública del framework (`children` en `register`), con ciclo de vida React completo, `t`/props estándar, y la espera de declaración la maneja `slots.inject` (funciona en cualquier orden de activación de bundles; si prices no está instalado, la inyección simplemente nunca dispara).
- **Riesgos**: modifica el **paquete publicado** de prices (contra la prioridad expresada por el usuario); cualquier cambio de estructura interna de la barra (hoy 34px, `.Jfdp_spacer{flex:1}`) sigue acoplado al render de prices; si prices se reinstala desde npm en otra máquina sin esta versión, balance no se monta.
- **"Integrado/centrado"**: el mejor: el propio prices decide el punto de inserción, por lo que el centrado es exacto y robusto ante rediseños de la barra.

### Comparativa resumida

| Opción | Sin tocar prices publicado | Ambos widgets visibles | Ciclo de vida framework | Riesgo de rotura | Centrado |
|---|---|---|---|---|---|
| (a) shell.bottom | ✔ | ✘ (o reemplaza, o lanza) | ✔ | alto (throw) | n/a |
| **(b) shell.overlay** | **✔** | **✔** | **✔** | **bajo** | bueno (50% frame = 50% barra) |
| (c) DOM injection | ✔ | ✔ | parcial (manual) | medio-alto (React foráneo) | bueno |
| (d) sub-slot en prices | ✘ (edita prices) | ✔ | ✔ | bajo | exacto |

---

## 4. Recomendación final

**Adoptar la opción (b): `shell.overlay` con widget anclado abajo-centro**, por este orden de razones:

1. Respeta la prioridad declarada: **no se toca el paquete `@javierfrancoleal/deepseek-prices` publicado** (y sigue funcionando igual para quien lo tenga instalado desde npm).
2. Es el **asiento diseñado oficialmente** para esto — el catálogo del slot dice explícitamente: *"a badge, a toast stack or a status pill all belong here … a fresh `id` is added beside the shipped entries instead of replacing them"*.
3. La semántica `single` de `shell.bottom` hace que (a) sea imposible sin sustituir la barra de precios (throw con misma prioridad; shadowing con distinta).
4. Ciclo de vida React completo vía slots (montaje/desmontaje, limpieza en unload del plugin, re-render del framework) sin DOM foráneo, a diferencia de (c).
5. Visualmente equivale a "integrado": la barra ocupa todo el ancho del frame (`grid-column:1/-1`) y la capa overlay cubre el frame entero, así que `left:50%` del overlay = centro exacto de la barra; `bottom:0` = la franja de la barra (34px).

**Camino de evolución (opción d)** si J.Franco acepta editar prices (está `link:`-instalado, así que es barato): el sub-slot `prices.bar.center` da el centrado "perfecto" gestionado por prices y una API estable para futuros plugins. Cambiar de (b) a (d) después no rompe a nadie (se cambia el `slots.inject` de balance de `shell.overlay` a `prices.bar.center`).

### Esbozo de código — opción (b) (`plugins/jfranco-balance/lib/client.js`)

```js
window.__ModuleLoader__.load({
  id: "@javierfrancoleal/balance",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    const React = require("react");

    const NS = "balance";
    const zh = { "hello": "你好" };
    const en = { "hello": "Hello" };

    // CSS del widget: pill centrado sobre la barra de precios.
    // La capa .PIRFFq_overlayLayer es position:absolute;inset:0;pointer-events:none
    // (z-index:20, pinta por encima de la fila bottom). Nuestro root se posiciona
    // abajo-centro y opta explícitamente a pointer events.
    const CSS = [
      ".Jfb_seat{position:absolute;left:50%;bottom:0;transform:translateX(-50%);",
      "display:flex;align-items:center;box-sizing:border-box;pointer-events:auto}",
      ".Jfb_pill{display:inline-flex;align-items:center;gap:6px;height:22px;padding:0 10px;",
      "font-size:12px;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary);",
      "background:var(--dsw-specific-menu);border:1px solid var(--dsw-alias-border-l1);",
      "border-radius:var(--dsw-radius-md);box-shadow:var(--dsw-elevation-panel);",
      "backdrop-filter:var(--dsw-menu-backdrop-filter)}"
    ].join("\n");
    const cssTagId = "@javierfrancoleal/balance/BalancePill.css";
    if (typeof document !== "undefined" &&
        document.querySelector("style[data-plugin-css=" + JSON.stringify(cssTagId) + "]") === null) {
      const tag = document.createElement("style");
      tag.dataset.plugin = "@javierfrancoleal/balance";
      tag.dataset.pluginCss = cssTagId;
      tag.textContent = CSS;
      document.head.appendChild(tag);
    }

    function BalanceWidget(_props) {
      const t = _props && typeof _props.t === "function" ? _props.t : (k) => k;
      const [bar, setBar] = React.useState(null); // rect de .Jfdp_bar
      const [present, setPresent] = React.useState(true);

      React.useEffect(() => {
        const tick = () => {
          const el = document.querySelector(".Jfdp_bar[data-deepseek-prices]");
          setPresent(!!el);
          if (el) setBar({ height: el.getBoundingClientRect().height });
        };
        tick();
        const id = setInterval(tick, 2000); // heartbeat barato; sustituible por ResizeObserver
        return () => clearInterval(id);
      }, []);

      if (!present) return null; // prices no instalado/desinstalado → no flotar huérfano

      // Altura alineada con la barra (fallback 34px mientras no se mida).
      return React.createElement("div", {
        className: "Jfb_seat",
        style: { height: bar ? bar.height : 34, padding: "0 16px" }
      },
        React.createElement("div", { className: "Jfb_pill" },
          React.createElement("span", null, t("hello")) // ← sustituir por el saldo real (Remote/Typert)
        )
      );
    }

    const inject = ["slots", "locale"];
    function apply(ctx) {
      ctx.effect(function () {
        return ctx.locale.register(NS, { zh, en });
      }, "balance: locale dictionaries");
      // shell.overlay es `list`: un id nuevo se AÑADE; nunca colisiona con nada.
      ctx.slots.inject("shell.overlay", function () {
        return ctx.slots.register({
          name: "shell.overlay",
          id: "balance-bottom-pill",
          order: 0,
          locale: NS
        }, BalanceWidget);
      });
    }

    exports.BalanceWidget = BalanceWidget;
    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});
```

### Esbozo — opción (d) (solo si se acepta editar prices)

`plugins/jfranco-deepseek-prices/lib/client.js`:

```js
// 1) registrar el sub-slot como hijo del entry de shell.bottom:
ctx.slots.register({
  name: "shell.bottom",
  id: "jfranco-deepseek-prices",
  order: 0,
  locale: NS,
  children: { "prices.bar.center": { kind: "single", scope: "root" } }
}, PriceBar);

// 2) CSS de prices: .Jfdp_bar{position:relative}  (añadir a su CSS)
// 3) en PriceBar (ahora recibe props.renderSlot por declarar children), antes del spacer:
React.createElement("span", {
  className: "Jfdp_centerSeat",
  style: { position: "absolute", inset: 0, display: "flex",
           alignItems: "center", justifyContent: "center", pointerEvents: "none" }
}, _props.renderSlot("prices.bar.center", {}));
//    CSS: .Jfdp_centerSeat > *{pointer-events:auto}
```

`plugins/jfranco-balance/lib/client.js` (reemplaza el `slots.inject`):

```js
ctx.slots.inject("prices.bar.center", function () {
  return ctx.slots.register({
    name: "prices.bar.center",
    id: "balance",
    order: 0,
    locale: NS
  }, BalanceWidget); // ya sin posicionamiento absoluto: lo centra prices
});
```

Aplicación del cambio: **reiniciar la app** (no requiere `pnpm install`; el `link:` apunta al workspace). Para instalar `balance` en el perfil desktop: añadir `"@javierfrancoleal/balance": "link:/…/plugins/jfranco-balance"` a `dependencies` + su id a `dsh.profile.bundles`, `cd ~/.dsh/profiles/desktop && pnpm install`, y reiniciar.

---

## 5. Ficheros de evidencia (todo dentro de `_dsh-inspect/research/`)

| Fichero | Contenido |
|---|---|
| `slots-extract/shell-index.js` | Bundle del shell web; contiene `SlotCore` (registro/ordenación/colisiones/abdicación) — L120, clase `SI` en offset ≈485026 |
| `slots-extract/renderer-client.js` | `SlotRegistry` + `SlotOutlet`/`renderOutletContent` (ganador single = `entriesOfSlot()[0]`, L1173-1177; `inject` L1368-1427; `register` L1813-1816) |
| `slots-extract/client-runner-client.js` | Runner dinámico: prioridades forzadas `--nextPriority` (L615), comentario "shadowing rank" (L392), catálogo de slots (`shell.bottom` L5423, `shell.overlay` L5481) |
| `slots-extract/modules-client.js`, `webapp-index.js`, `runner-package.json`, `renderer-package.json` | Resolución de módulos cliente y evidencia de que `ui-slots` está inlineado en el bundle del shell |
| `slots-extract/inspector-client.js` | Verificación: el inspector NO registra `shell.bottom` (el catálogo es aspiracional) |

Fuera de `_dsh-inspect/research/`, solo lecturas: `_dsh-inspect/extract/layout-client.js`, `_dsh-inspect/extract/dsh/node_modules/@deepseek-ai/dsh-client-ui-layout/{lib/index.js,README.md,package.json}`, `plugins/jfranco-deepseek-prices/lib/client.js`, `plugins/jfranco-balance/{package.json,lib/client.js}`, `plugins/docs/PLUGIN-AUTHORING.md`, `~/.dsh/profiles/desktop/{package.json,node_modules/…}`.
