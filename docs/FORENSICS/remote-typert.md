# Remote/Typert: cómo dsh-goal publica estado dinámico host→navegador

Investigación forense sobre DSH 0.2.1-rc.5 (app.asar). Todo el código citado está extraído en
`_dsh-inspect/research/` (rutas relativas al workspace). Objetivo: la receta mínima para un
servicio tercero `@javierfrancoleal/balance` que publique `{ totalBalance, toppedUp, updatedAt }`
y lo renderice en vivo en el navegador.

---

## 1. TL;DR

- El patrón NO es un `ctx.goal` mágico. Es una cadena de 4 piezas:
  **`TypertRemoteService` (host) → Registry Typert (host) → Gateway API (host) → `ctx.remote.<ns>` (browser)**.
- El host registra un servicio Cordis que extiende `TypertRemoteService` con `super(ctx, "goals")`
  y decora métodos con `@Remote("get")`. La clave Cordis es a la vez el *namespace* wire.
- El navegador recibe un servicio **`ctx.remote`** (clave `"remote"`) y por cada namespace montado
  un servicio Cordis **`remote.<ns>`** (p. ej. `ctx.remote.goals`, clave `"remote.goals"`),
  cuyos métodos devuelven `Promise<RemoteResult>` (`{ok:true,value}` | `{ok:false,error}`).
- Transporte: RPC unario = **HTTP POST** a `/api/<ns>/<método>`; streams y eventos = **un solo
  WebSocket multiplexado** en `/api/remote.mux`. No hay polling en dsh-goal: el estado durable
  llega como *proyección* del log de sesión (getSnapshot/subscribe) y el estado de proceso como
  evento push (`ctx.remote.$on`).
- **Un plugin tercero SÍ puede replicarlo** con un solo peerDep nuevo
  (`@deepseek-ai/dsh-typert-protocol`): el gateway tiene un *fallback por reflexión* (modo "SRC")
  que descubre endpoints de cualquier servicio con binding `typertRemote` + decoradores `@Remote`,
  sin generador ni manifest. El lado cliente necesita montar su propia metadata remota (estricta)
  con `ctx.remote.$mount(...)`, o usar el bypass crudo `ctx.connection.rpc.call("/api", "balance/get", ...)`.
- **Limitación importante**: los eventos de `ctx.remote.$on` provienen de una *allowlist compilada*
  (`dsh-api-remotes`); un tercero no puede añadir eventos. El canal "en vivo" de un tercero es un
  método **stream** (`@Remote({ name: "watch", mode: "stream" })`) sobre el WebSocket mux, o un
  poll del cliente sobre `get()`.

---

## 2. Mapa de la cadena completa

```
HOST (node)
  BalanceService extends TypertRemoteService   ← super(ctx, "balance"); @Remote("get")
      │  binding: { service, serviceKey:"balance", namespace:"balance" }   (bindTypertRemote)
      ▼
  ctx.typert (dsh-typert-registry)  ← metadatos generados (./typert export) vía dsh-typert-loader
      │                                (opcional: fallback SRC sin metadatos)
      ▼
  dsh-api-gateway (ctx.typertGateway)
      │  connection.rpc.intercept("/api", claimsEndpoint, dispatchRpc)
      │  WebSocketServer "/api/remote.mux" (streams + $events)
      ▼
  Red: POST /api/balance/get   ·   WS /api/remote.mux
      ▲
BROWSER
  dsh-client-connection  → ctx.connection.rpc.call("/api", "balance/get", {args}, signal)  (fetch POST)
  dsh-api-gateway (client) → ClientRemoteService (ctx.remote): $mount / $on / $stream
  dsh-api-remotes (client) → bundle que monta TODOS los TYPERT_REMOTE de los servicios seleccionados
  plugin balance (client) → await ctx.remote.$mount(TYPERT_REMOTE) → ctx.remote.balance.<método>
```

---

## 3. Hallazgos por archivo

### 3.1 `@deepseek-ai/dsh-typert-protocol` (extraído en `_dsh-inspect/research/typert-extract/`)

El paquete base, **sin** servicio Cordis propio ("The package registers no Cordis service").
Claves en `lib/index.js`:

- `bindTypertRemote(service, serviceKey, options)` — crea el binding visible que el gateway consume;
  `namespace` por defecto = `serviceKey` (#L326–337):
  ```js
  function bindTypertRemote(service, serviceKey, options = {}) {
    validateName("service key", serviceKey);
    const namespace = options.namespace ?? serviceKey;
    ...
    return Object.freeze({ service, serviceKey, namespace });
  }
  ```
- `TypertRemoteService extends Service` — el atajo oficial (#L339–352):
  ```js
  var TypertRemoteService = class extends Service {
    typertRemote;
    constructor(ctx, serviceKey, options = {}) {
      super(ctx, serviceKey);
      this.typertRemote = bindTypertRemote(this, this.name, options);
    }
  };
  ```
- Decoradores `Remote("get")` / `Remote({ name, mode: "stream", resources })` y `RemoteScope(key, ...)`
  (#L363–417): solo marcan métodos públicos con nombre string en el descriptor del prototipo.
- `remoteMethods(service)` (#L424–428): lee los marcadores; "the Gateway's source-mode fallback reads"
  (README #L106).
- `createTypertRemoteInfo(spec, zod)` (#L129–281): fábrica **pura, sin imports de runtime** que
  construye `{ package, descriptors, methods }` a partir de un spec de endpoints
  `<namespace>/<method>`; cada descriptor tiene `id`, `namespace`, `method`, `parameters`
  (con `wire` y `codec`), `result`, `mode`.
- README #L118: "Strict codecs carry generated schema factories; `src-json` codecs identify the
  weaker source-launch path." — la distinción entre camino generado (estricto/zod) y SRC (reflexión).

### 3.2 `@deepseek-ai/dsh-goal` — lado host (extraído en `_dsh-inspect/research/goal-extract/`)

`lib/index.js`:
- Import (#L6): `import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";`
- Clase (#L484–604):
  ```js
  return class GoalService extends _classSuper {          // _classSuper = TypertRemoteService
    static {
      _get_decorators = [Remote("get")];
      _edit_decorators = [Remote("edit")];
      ...
      _remoteExportCreate_decorators = [Remote("create")];
      ...
    }
    static inject = ["agents", "sessionProjections"];
    static Config = z.object({ defaultMaxGoalRounds: z.number().default(256) });
    constructor(ctx, config = {}) {
      super(ctx, "goals");                                  // ← clave Cordis "goals" = namespace wire
      ...
    }
    get(agent) { ... }                                     // @Remote('get')
    remoteExportCreate(agent, request) { ... }             // @Remote('create') → exportName "create"
  ```
  → El servicio se registra en Cordis con clave `"goals"` y queda expuesto como namespace `"goals"`.
  Los métodos sin `@Remote` (p. ej. `disarm`, `block`) **no** son endpoints remotos.
- Export final (#L906): `export { ... GoalService, GoalService as default ... }` — el default del
  plugin es la clase (se monta con `ctx.plugin(GoalService)`).

`lib/typert.host.js` (93 KB) — **generado**:
- Cabecera #L1: `/* Generated by @deepseek-ai/dsh-typert-generator from FaceModel — do not edit. */`
- #L197: `const $remote = createTypertRemoteInfo({ package: '@deepseek-ai/dsh-goal', methods: { 'goals/clear': {...}, 'goals/get': {...}, ... } }, z)`
- #L589+: el manifest:
  ```js
  export const TYPERT = {
    package: '@deepseek-ai/dsh-goal',
    face: 'host',
    schemas: [],
    get invocations() { return $remote.descriptors },
    model: { "services": [ { "key": "goals", "exportName": "GoalService", "members": [...] } ],
             "events":  [ { "name": "goal/activation-changed", "mode": "emit", ... }, ... ],
             "objects": [] }
  }
  ```
- Cada invocation del spec lleva `service: 'goals'`, `invocation: {kind:'direct'}`, `parameters` con
  `source: 'lookup'|'json'` y `codec`/`strictCodec` zod, `result` estricto.

`lib/typert.remote-client.js` (39 KB) — **generado**, la cara cliente de la metadata:
- #L197: `export const TYPERT_REMOTE = createTypertRemoteInfo({ ... })`; #L589: `export default TYPERT_REMOTE`.

`package.json`:
- `exports`: `"./typert"` → `lib/typert.host.js`, `"./remote"` → `lib/typert.remote-client.js`,
  `"./client"` → `lib/types/client.js`.
- `peerDependencies` incluye `@deepseek-ai/dsh-typert-protocol: 0.2.1-rc.5`.

### 3.3 `@deepseek-ai/dsh-typert-loader` (extraído en `_dsh-inspect/research/typert-loader-extract/`)

Plugin host que conecta manifest generados con el registry. `lib/index.js`:
- #L40–44: `const TYPERT_HOST_EXPORT = "./typert"; const name = "typert-loader"; const inject = ["typert", "loader"];`
- Cabecera (#L8–31): "When a loader entry mounts, this plugin resolves the entry's package.json; a
  package exporting `./typert` gets its `TYPERT` manifest registered into `ctx.typert`… Manual
  `ctx.typert.register()` remains available".
- `apply` (#L242–323): por cada entry del loader con `exports["./typert"]` importa el módulo,
  valida el manifest (`face === "host"`, `package` correcto, schemas/model/invocations) y hace
  `registered.set(entryName, ctx.typert.register(manifest))`; retira al desmontar.
- `validateTypertManifest` (#L78–118): forma exacta del manifest aceptado.

### 3.4 `@deepseek-ai/dsh-typert-registry` (extraído en `_dsh-inspect/research/typert-registry-extract/`)

Registro de reflexión + invocations, compartido host/browser.
- Host: `TypertRegistry extends Service`, `super(ctx, "typert")` (#L400–419). API:
  `register(contribution)` (#L453–473), `local` / `remotes` / `lookups` / `contexts` / `resources`.
- `register` valida `{package, face, schemas, invocations, model}` y commitea descriptors en un
  `DescriptorStore` con efecto Cordis (retiro atómico al desmontar el fiber).
- `validateInvocation` (#L577–616): forma canónica del descriptor: `id`, `service` (clave Cordis),
  `namespace`, `method`, `implementation` (opcional), `parameters[].{name, wire, source:'json'|'lookup',
  lookup?, codec}`, `cancellation`, `mode:'stream'?`, `uplink`, `scope`, `invocation.kind:
  'direct'|'context'`, `result`.
- `lib/client.browser.js`: la misma clase para el navegador; `apply(ctx) { new TypertRegistry(ctx) }`
  con `inject = []` (#L640–652). El package.json la declara client con
  `"dsh": {"client": {"inject": [], "platform": "web", "immediately": true}}`.

### 3.5 `@deepseek-ai/dsh-api-gateway` — el transporte (extraído en `_dsh-inspect/research/api-gateway-extract/`)

**Host** (`lib/index.js`, 74 KB):
- #L7: `import WebSocket, { WebSocketServer } from "ws";`
- #L133: `const REMOTE_STREAM_MUX_PATH = "/api/remote.mux";` — ruta exacta del WebSocket.
- #L773: intercept del RPC:
  ```js
  connectionCtx.connection.rpc.intercept("/api",
    (endpoint) => this.claimsEndpoint(endpoint),
    (endpoint, payload, signal, peer) => this.dispatchRpc(endpoint, payload, signal, peer));
  ```
- `claimsEndpoint` (#L876–883): acepta `$events/result`, endpoints con definición estricta en
  `ctx.typert.local`, o **endpoints SRC** (`collectSrcClaims`).
- `collectSrcClaims` (#L895–908): escanea `ctx.reflect.props` (servicios Cordis vivos), y para cada
  servicio con binding `typertRemote` añade `namespace/(exportName ?? method)` de cada marcador
  `@Remote`. **Aquí es donde un plugin tercero entra sin metadatos generados.**
- `prepareInvocation` (#L1169–1223): resuelve descriptor (estricto → SRC), valida argumentos
  exactos, control de acceso (`ctx.remoteAccess.decide` para peers no-owner), obtiene el receptor:
  ```js
  const receiverContext = await this.resolveReceiverContext(descriptor, validated, endpoint);
  const receiver = receiverContext.get(descriptor.service);        // ← Cordis, clave "goals"/"balance"
  validateBinding(receiver, descriptor.service, descriptor.namespace, endpoint);
  ...
  const callReceiver = receiverContext.extend({ invocation }).get(descriptor.service);
  const implementation = descriptor.implementation ?? descriptor.method;
  const method = Reflect.get(callReceiver, implementation);        // ← método de negocio real
  ```
- `resolveSrcDescriptor` (#L1230–1248): reflexión sobre bindings + `remoteMethods(service)`;
  si 0 candidatos → `gateway/invocation-unavailable`; si >1 → `gateway/ambiguous-endpoint`.
- `srcDescriptor` (#L1249–1301): construye el descriptor SRC: parámetros por **nombre** de la
  función (`methodParameterNames`, parse del `toString`); un parámetro se trata como *lookup* solo
  si existe un proveedor en `ctx.typert.lookups` con ese nombre (`definition.parameter === name`);
  el resto son JSON con `codec: { mode: "src-json" }`; `signal` como último parámetro → cancelación;
  `result: { mode: "src-json" }` (JSON crudo, sin validación zod).
- `dispatchRpc` (#L961–979) y `invokeRpc` (#L1160–1167): `encodeRpcResult(await invokePrepared(...))`
  → `{ok:true, value}` o `{ok:false, error:{code,message,details}}`.
- Streams: `openWireStream` (#L980–992) — endpoint `"$events"` abre el stream de eventos
  forwardeados; cualquier otro endpoint con `mode:'stream'` abre un stream lógico sobre el mux
  WebSocket.
- Eventos: `registerRemoteEvents(source, host)` (#L846–875) — **"the sole application-selected
  forwarded-event source"**: se registra una sola vez (lo hace `dsh-api-remotes`).

**Browser** (`lib/client.browser.js`, 84 KB) — provee `ctx.remote`:
- #L1609–1615: `const inject = ["typert", "connection"]; function apply(ctx) { new ClientRemoteService(ctx); }`
- #L1617–1626: `ClientRemoteService extends Service` con `super(ctx, "remote")` — **clave "remote"**.
- #L1630: `this.streams = new RemoteStreamMuxClient((path) => connection.openWebSocket(path), ...)`
- #L1638–1645: `connection.start({ onConnected: () => { this.ownerCtx.emit("connection/reset"); }, ... })`
  — origen del evento `connection/reset` que el UI goal escucha.
- #L1669–1679: `async $mount(contribution)` — monta una metadata remota; disposer para desmontar.
- #L1680–1683: `$on(event, listener)` → `ClientRemoteEvents.subscribe` (requiere
  `connection.interactions === "answer"`, i.e. browser owner).
- `mountContribution` (#L1696–1717): `validateContribution` → `callerCtx.typert.remotes.register(contribution)`
  → agrupa por namespace → `installNamespace` (crea el servicio Cordis `remote.<ns>` y le instala
  cada método como propiedad).
- `validateContribution` (#L1718–1743): `requireStrictInputs(descriptor)` y chequeo de conflictos;
  el nombre del servicio por namespace: `remoteServiceKey(namespace)` = `` `remote.${namespace}` ``
  (#L2074–2076).
- `createNamespace` (#L1773–1800):
  ```js
  const fiber = this.ownerCtx.plugin({
    name: remoteServiceKey(name),
    apply: (ctx) => {
      service = new RemoteNamespaceService(ctx, name, (direct, scoped, caller, args) => this.invokeMethod(...));
      installed = installMethods(service, descriptors);
    }
  });
  ```
- `invoke` (#L1819–1839):
  ```js
  const result = await connection.rpc.call("/api", endpoint, { args: prepared.args }, prepared.signal);
  if (!result.ok) return { ok: false, error: rebuiltFailure(result.error) };
  return { ok: true, value: descriptor.result.mode === "strict" && descriptor.result.decode !== void 0
      ? descriptor.result.decode(result.value) : result.value };
  ```
- `invokeStream` (#L1843–1850): para `descriptor.mode !== undefined` → `ClientStreamHandle`
  (AsyncIterable con `send`/`end`/`dispose`) sobre `openRemoteStream` → WS mux.
- `RemoteNamespaceService` (#L1953–2022): `super(ctx, remoteServiceKey(name))`; cada método se
  instala como getter de propiedad que devuelve `(...args) => this.invokeRemote(direct, scoped, callerCtx, args)`
  (#L1994–2006).
- `requireStrictCodec` (#L2101–2109): **todo codec de parámetro/uplink/context de una contribución
  cliente debe ser `mode: "strict"`** — un `src-json` en el cliente es rechazado.

### 3.6 `@deepseek-ai/dsh-client-connection` — el carrier RPC/WS en el navegador (extraído en `_dsh-inspect/research/client-connection-extract/`)

`lib/client.browser.js` #L1205–1256, `createWebConnectionRpc`:
```js
async call(channel, endpoint, payload, signal) {
  ...
  const response = await send(`${channel}/${endpoint}`.slice(1), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(message),           // { type:"client-request", rpcId, method: endpoint, payload }
    ...signal
  });
  ...
}
```
→ `connection.rpc.call("/api", "balance/get", {args}, signal)` = **`fetch POST /api/balance/get`**
con envelope `{type:"client-request", rpcId, method:"balance/get", payload:{args:{...}}}`.
La respuesta es `{type:"server-response", rpcId, result:{ok:true,value}|{ok:false,error}}`
(`parseConnectionResponse` #L1280–1302).

### 3.7 `@deepseek-ai/dsh-api-remotes` — el ensamblado BFF (extraído en `_dsh-inspect/research/api-remotes-extract/`)

- `package.json`: "Remote BFF assembly for application-selected Host capabilities";
  `"dsh": {"client": {"inject": ["@deepseek-ai/dsh-api-gateway"], "platform": "web", "immediately": true}}`.
- Host (`lib/index.js`): `API_REMOTE_FORWARDED_EVENTS` — **la allowlist compilada** de eventos
  forwardeados ("the one home of this application's forwarded-Host-event allowlist"), incluye
  `{ event: "goal/activation-changed", mode: "emit" }`. `apply` (#L146–148):
  `ctx.typertGateway.registerRemoteEvents(remoteEventSource(ctx), { home: homedir() })` — una sola vez.
- Cliente (`lib/client.js`, 1.09 MB): bundle generado que inlina la implementación de
  `createTypertRemoteInfo` (#L18) y **27 contribuciones TYPERT_REMOTE** de los servicios
  seleccionados — la de dsh-goal es `TYPERT_REMOTE$18` con `package: "@deepseek-ai/dsh-goal"`
  (#L4134). `apply` (#L23753–23790): `const inject = ["remote"];` y
  ```js
  for (const contribution of [ TYPERT_REMOTE$25, ... TYPERT_REMOTE$18, ... ])
    disposers.push(await ctx.remote.$mount(contribution));
  ```
  → Así nacen `ctx.remote.goals`, `ctx.remote.schedule`, etc. en el navegador.

### 3.8 `@deepseek-ai/dsh-client-ui-goal` — cómo consume el cliente (extraído por el padre en `_dsh-inspect/extract/dsh/node_modules/@deepseek-ai/dsh-client-ui-goal/`)

`lib/client.js`:
- Servicios inyectados (#L558–565):
  ```js
  const inject = ["slots", "sessions", "remote", "remote.goals", "locale", "uiConversation"];
  ```
  → el cliente **no** usa `ctx.goal`; usa el servicio genérico `ctx.remote` + el namespace
  **`remote.goals`** (clave Cordis con punto; Cordis es un proxy y resuelve `ctx.remote.goals`
  como la clave anidada `"remote.goals"` — documentado en cordis: "A context is a proxy: normal
  property reads go through the service resolver").
- Lectura por RPC (#L616–623): `getGoal: async () => { ...; return ctx.remote.goals.get(sessionId); }`
  y el resultado se consume como `result.ok ? result.value : ...` (#L46–62):
  ```js
  deps.getGoal().then((result) => { if (!result.ok) return; const goal = result.value; ... });
  ```
- Mutaciones (#L629–648): `await ctx.remote.goals.edit(sessionId, ref, { objective })`,
  `.pause(sessionId, ref)`, `.resume(...)`, `.clear(...)` — todas `async`, con ref CAS leído de la
  proyección (#L589–596).
- Suscripción a eventos push (#L624–626):
  ```js
  subscribeActivation: (listener) => ctx.remote.$on("goal/activation-changed", (event) => {
    if (event.sessionId === sessionId) listener(event.goal);
  }),
  ```
  y `subscribeReset: (listener) => ctx.on("connection/reset", listener)` (#L627).
- Estado durable como **proyección** (#L590, #L613–614, #L100–103):
  ```js
  const projection = (sessions.binding(sessionId)?.session.projections.faceOf("goal"))?.getSnapshot();
  ...
  projection: binding.session.projections.faceOf("goal"),   // { getSnapshot(), subscribe() }
  disposers = [ deps.projection.subscribe(refreshProjection), ... ];
  ```
  Es decir: `getSnapshot()`/`subscribe()` existen, pero en las **proyecciones de sesión**
  (estado durado, event-sourced, replayed en el navegador), no en `ctx.remote`.
- El hook `createGoalActivationSource` (#L27–126) es el patrón mínimo de suscripción:
  `{ getSnapshot: () => snapshot, subscribe(listener) {...} }` con ref-count (solo escucha
  mientras hay observadores).

### 3.9 `@deepseek-ai/dsh-schedule` — segundo ejemplo (extraído en `_dsh-inspect/research/schedule-extract/`)

Mismo patrón exacto:
- `lib/index.js` #L4: `import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";`
- #L1892–1992: `ScheduleService extends TypertRemoteService`, `super(ctx, "schedule")`,
  `@Remote("list")`, `@Remote("catalog")`, `@Remote("history")`, `@Remote("delete")`, `@Remote("update")`.
- Tiene `lib/typert.host.js` y `lib/typert.remote-client.js` generados, y `exports["./typert"]` /
  `"./remote"` / `"./client"` en package.json. Confirma que el patrón es la convención del repo,
  no un caso especial de goal.

### 3.10 `@deepseek-ai/dsh-client-modules` — cómo llega el bundle del cliente al navegador

README (ya extraído): "A browser plugin package declares `dsh.client` in its `package.json` with
`platform: 'web'`, exports a `./client` bundle, and lists any non-baseline module requests under
`dsh.client.external`. The host half turns each declaration into a served bundle under `/plugins`…"
Los bundles solo pueden `require` del seed de plataforma (cordis, zod, react, etc.) salvo lo
declarado en `dsh.client.external`.

---

## 4. Respuestas quirúrgicas

### a) ¿Qué registra el host y con qué API?

1. **Una clase de servicio Cordis** que extiende `TypertRemoteService` y llama
   `super(ctx, "goals")` — la clave Cordis `"goals"` es a la vez el namespace wire
   (`bindTypertRemote` con `namespace ?? serviceKey`). El default export del plugin es la clase.
2. **Métodos públicos decorados**: `@Remote("get")`, `@Remote("create")`, o
   `@Remote({ name, mode: "stream", resources })`. Solo los decorados son endpoints
   `<namespace>/<exportName>`. (También existe `RemoteScope` para receptores scoped.)
3. **Metadatos generados (opcional pero canónico)**: `lib/typert.host.js` exporta
   `TYPERT = { package, face: "host", schemas, get invocations() {...}, model: {services, events, objects} }`,
   declarado en `exports["./typert"]`; `dsh-typert-loader` lo detecta y hace
   `ctx.typert.register(manifest)` (con retiro al desmontar).
4. **Sin metadatos** el gateway usa el **fallback SRC**: escanea servicios vivos con binding
   `typertRemote` y marcadores `@Remote` (gateway `collectSrcClaims`/`resolveSrcDescriptor`).
   Los parámetros se deducen del nombre de la función (JSON crudo `src-json`), excepto los que
   colisionen con un proveedor de lookup registrado (p. ej. `agent`).

No hay `ctx.root.provide(...)`: la exposición es `super(ctx, serviceKey)` (Cordis) +
`bindTypertRemote` automático + decoradores. El "schema" solo existe en el camino generado
(zod en cliente / schemastery en host); SRC no valida.

### b) ¿Qué recibe el half-cliente en `apply(ctx)`?

- **`ctx.remote`** — `ClientRemoteService` (clave `"remote"`), provisto por el módulo cliente de
  `dsh-api-gateway`. API pública: `await ctx.remote.$mount(contribution)`,
  `ctx.remote.$on(event, listener)`, `ctx.remote.$stream(options)`, `ctx.remote.$host`.
- **`ctx.remote.<namespace>`** — por cada namespace montado existe un servicio Cordis
  `remote.<ns>` (`RemoteNamespaceService`), alcanzable como `ctx.remote.goals` (Cordis resuelve
  la propiedad anidada a la clave con punto). Sus métodos (instalados por `$mount`) devuelven:
  - unarios → `Promise<RemoteResult<T>>` = `{ok:true, value:T}` | `{ok:false, error:{code,message,details}}`
  - stream (`mode:"stream"`) → `RemoteStreamHandle<T,In>` (AsyncIterable + `send`/`end`/`dispose`).
- **Eventos push**: `ctx.remote.$on("goal/activation-changed", cb)` — WebSocket mux, stream
  lógico `$events`; solo eventos de la allowlist compilada.
- **Estado durable**: `ctx.sessions` → `sessions.binding(sessionId).session.projections.faceOf("goal")`
  con `getSnapshot()` y `subscribe(listener)` (proyección event-sourced replays en el navegador).
- **`ctx.on("connection/reset", listener)`** para re-sincronizar tras reconexión.

### c) ¿Puede un bundle tercero (`@javierfrancoleal/balance`) replicarlo?

**Sí, sin tocar el core.** Host:
- peerDep nuevo: `@deepseek-ai/dsh-typert-protocol` (+ `@deepseek-ai/cordis` que ya se tiene).
- `class BalanceService extends TypertRemoteService { constructor(ctx) { super(ctx, "balance"); } }`
  + `@Remote("get")`, etc. Los endpoints `balance/get`, `balance/topUp`, `balance/watch`
  **funcionan de inmediato** vía fallback SRC del gateway — no hace falta `./typert` ni el
  generador para métodos JSON sencillos.
- No existe un servicio genérico "remote" que resuelva por nombre en el navegador: el namespace
  `remote.balance` **solo existe tras un `$mount` en el cliente**. Por tanto el plugin debe ser
  dual-face:
  - su `dsh.client` publica un bundle que hace `await ctx.remote.$mount(TYPERT_REMOTE)` con su
    propia metadata estricta (generada por `@deepseek-ai/dsh-typert-generator`, o escrita a mano
    con `createTypertRemoteInfo` + zod; los codecs de parámetros deben ser `mode:"strict"`).
  - alternativa mínima sin metadata: `ctx.connection.rpc.call("/api", "balance/get", {args:{}}, signal)`
    directo (funciona contra el SRC del host; menos tipeado, sin `remote.balance` como servicio).
- Los eventos de `$on` **no** son extensibles por terceros (allowlist compilada en
  `dsh-api-remotes`). Para "en vivo": método stream (`@Remote({name:"watch", mode:"stream"})`
  → AsyncIterable) sobre el WS mux, o poll del cliente (`setInterval` → `get()`).

### d) Transporte host→navegador

1. **RPC unario**: `fetch POST /api/<namespace>/<method>` (relativo al origen de la GUI),
   cuerpo `{type:"client-request", rpcId, method, payload:{args}}`, respuesta
   `{type:"server-response", rpcId, result:{ok,value}|{ok:false,error}}`. El host lo intercepta en
   `connection.rpc.intercept("/api", claimsEndpoint, dispatchRpc)` (gateway) y ejecuta el método
   real en el servicio Cordis. **No hay polling en dsh-goal.**
2. **Streams y eventos**: **un solo WebSocket multiplexado** `/api/remote.mux`
   (`RemoteStreamMuxClient`/`RemoteStreamMuxServer`), con streams lógicos (frames
   `open`/`item`/`end`/error) y heartbeat. Los eventos forwardeados viajan en el stream lógico
   `$events`; los resultados de waterfalls vuelven por `POST /api/$events/result`.
3. **Estado durable** (goal phase/revision): no va por el Remote: se replica como proyección de
   sesión (frames `session/projection` / cola de historia) y el cliente lo consume con
   `getSnapshot()`/`subscribe()`.
4. **Mínimo para balance**: host publica `{totalBalance, toppedUp, updatedAt}` →
   (a) `get()` RPC + poll del cliente, o (b) `watch()` stream push sobre el WS mux →
   el cliente renderiza y se actualiza solo. Ambas sin infraestructura extra.

---

## 5. RECETA MÍNIMA PARA balance

### 5.1 Host — `@javierfrancoleal/balance` (TypeScript, se compila a `lib/index.js`)

```ts
// src/index.ts
import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";

export interface BalanceView {
  totalBalance: number;
  toppedUp: boolean;
  updatedAt: number;      // epoch ms
}

export default class BalanceService extends TypertRemoteService {
  static inject = [];                       // opcional según necesidades

  private state: BalanceView = { totalBalance: 0, toppedUp: false, updatedAt: Date.now() };
  private listeners = new Set<(view: BalanceView) => void>();

  constructor(ctx) {
    super(ctx, "balance");                  // clave Cordis "balance" == namespace wire "balance"
    // aquí va tu lógica: leer de disco, suscribirse a eventos internos, timers...
  }

  // (opcional) suscripción interna host-only; NO es un endpoint remoto (sin @Remote)
  subscribe(listener: (view: BalanceView) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private publish(view: BalanceView) {
    this.state = view;
    for (const listener of this.listeners) listener(view);
  }

  /** GET balance/get → Promise<{ok,value}|{ok:false,error}> en el cliente. */
  @Remote("get")
  get(): BalanceView {
    return this.state;
  }

  /** POST balance/topUp {amount} */
  @Remote("topUp")
  topUp(amount: number): BalanceView {
    const view = {
      totalBalance: this.state.totalBalance + amount,
      toppedUp: true,
      updatedAt: Date.now(),
    };
    this.publish(view);
    return view;
  }

  /** Stream en vivo: balance/watch sobre el WebSocket mux (push, sin polling). */
  @Remote({ name: "watch", mode: "stream" })
  async *watch(): AsyncIterable<BalanceView> {
    const queue: BalanceView[] = [];
    let wake: (() => void) | undefined;
    const off = this.subscribe((view) => { queue.push(view); wake?.(); });
    try {
      while (true) {
        if (queue.length > 0) yield queue.shift()!;
        else await new Promise<void>((resolve) => { wake = resolve; });
      }
    } finally {
      off();
    }
  }
}
```

Puntos exactos:
- Endpoints generados automáticamente (SRC): `balance/get`, `balance/topUp`, `balance/watch`.
- `super(ctx, "balance")` hace `bindTypertRemote(this, "balance")` → binding
  `{service, serviceKey:"balance", namespace:"balance"}`.
- Los parámetros SRC se deducen del **nombre** del parámetro JS (`amount`). Evita nombres que
  colisionen con proveedores de lookup existentes (`agent`, …): si un `typert.lookups` registra
  un proveedor con `parameter === "amount"`, el gateway lo trataría como lookup.
- Los valores deben ser JSON puro (números finitos, objetos planos). El resultado SRC viaja crudo.
- Para peers no-owner, el access-control aplica (`remoteAccess.decide`); sin `resources` en el
  decorador el método toca el recurso `global`.

`package.json` (dual-face, host + cliente):

```jsonc
{
  "name": "@javierfrancoleal/balance",
  "version": "0.1.0",
  "type": "module",
  "main": "lib/index.js",
  "exports": {
    ".":        { "types": "./lib/index.d.ts",        "default": "./lib/index.js" },
    "./client": { "types": "./lib/client.d.ts",       "default": "./lib/client.js" }
    // Opcional (camino estricto/generado): "./typert" → lib/typert.host.js
  },
  "dsh": {
    "client": {
      "inject": ["@deepseek-ai/dsh-api-remotes"],   // trae ctx.remote + gateway + registry + connection
      "platform": "web"
      // "external": [...] solo si el bundle requiere algo fuera del seed de plataforma
    }
  },
  "peerDependencies": {
    "@deepseek-ai/cordis": "~4.0.5",
    "@deepseek-ai/dsh-typert-protocol": "0.2.1-rc.5"
  },
  "devDependencies": {
    // opcional: genera typert.host.js / typert.remote-client.js estrictos
    "@deepseek-ai/dsh-typert-generator": "0.2.1-rc.5"
  }
}
```

### 5.2 Cliente — `lib/client.js` (bundle que `dsh-client-modules` sirve en `/plugins`)

El bundle se registra con `window.__ModuleLoader__.load` (mismo formato que
`dsh-client-ui-goal/lib/client.js`). Requiere solo seed de plataforma: `@deepseek-ai/cordis` y
`zod`. `createTypertRemoteInfo` se inlina (es código puro de ~100 líneas de
`@deepseek-ai/dsh-typert-protocol/remote-info`; el bundle oficial de `dsh-api-remotes` hace
exactamente eso, ver su `lib/client.js` #L18).

```js
// lib/client.js — cara cliente de @javierfrancoleal/balance
window.__ModuleLoader__.load({
  id: "@javierfrancoleal/balance",
  factory: (require) => {
    const z = require("zod");

    // ==== inlined from @deepseek-ai/dsh-typert-protocol/remote-info (sin imports de runtime) ====
    function createTypertRemoteInfo(spec, zod) {
      return new RemoteInfo(spec, zod);
    }
    class ResultValue {
      constructor(spec) { this.spec = spec; }
      get mode() { return this.spec.mode; }
      get create() { return this.spec.create; }
      get decode() { return this.spec.decode; }
      get encode() { return this.spec.encode; }
    }
    class NamedInput { /* input().parse / jsonSchema — opcional para esta receta */ }
    class RemoteInfo {
      constructor(spec, zod) { this.spec = spec; this.zod = zod; }
      get package() { return this.spec.package; }
      get descriptors() { return this.resolve().descriptors; }
      get methods() { return this.resolve().methods; }
      resolve() {
        if (this.index !== void 0) return this.index;
        const descriptors = [];
        const methods = Object.create(null);
        for (const [endpoint, definition] of Object.entries(this.spec.methods)) {
          const separator = endpoint.indexOf("/");
          const namespace = endpoint.slice(0, separator);
          const method = endpoint.slice(separator + 1);
          const parameters = definition.parameters.map((parameter) => ({ ...parameter, wire: parameter.wire ?? parameter.name }));
          const descriptor = {
            ...definition, id: `${this.spec.package}#${endpoint}`, namespace, method, parameters,
            result: new ResultValue(definition.result)
          };
          if (definition.invocation.kind === "direct") {
            methods[endpoint] = Object.assign(descriptor, {
              input() { throw new Error("input() not implemented in minimal recipe"); },
              invoke(remote, input, signal) {
                const values = parameters.map((parameter) => input[parameter.wire]);
                return Reflect.get(Reflect.get(remote, namespace), method).apply(remote, values);
              }
            });
          }
          descriptors.push(descriptor);
        }
        return this.index = { descriptors, methods };
      }
    }
    // ==== fin del inlined ====

    const balanceView = () => z.object({
      totalBalance: z.number(),
      toppedUp: z.boolean(),
      updatedAt: z.number()
    });

    // Metadata ESTRICTA del lado cliente (los codecs de parámetros deben ser mode:"strict").
    const TYPERT_REMOTE = createTypertRemoteInfo({
      package: "@javierfrancoleal/balance",
      methods: {
        "balance/get": {
          service: "balance",
          description: "Leer el balance actual.",
          invocation: { kind: "direct" },
          parameters: [],
          result: { mode: "strict", typeSymbol: "@javierfrancoleal/balance#balance/get:result",
                    create: balanceView }
        },
        "balance/topUp": {
          service: "balance",
          description: "Sumar crédito.",
          invocation: { kind: "direct" },
          parameters: [{
            name: "amount", wire: "amount", source: "json",
            codec: { mode: "strict", typeSymbol: "@javierfrancoleal/balance#amount",
                     create: () => z.number(), jsonSchema: { type: "number" } }
          }],
          result: { mode: "strict", typeSymbol: "@javierfrancoleal/balance#balance/topUp:result",
                    create: balanceView }
        },
        "balance/watch": {
          service: "balance",
          description: "Stream en vivo del balance (WebSocket mux).",
          invocation: { kind: "direct" },
          mode: "stream",
          parameters: [],
          result: { mode: "strict", typeSymbol: "@javierfrancoleal/balance#balance/watch:item",
                    create: balanceView }
        }
      }
    }, z);

    const inject = ["remote"];                       // servicios Cordis del cliente que requerimos
    async function apply(ctx) {
      await ctx.remote.$mount(TYPERT_REMOTE);
      // Desde este momento existe el servicio Cordis "remote.balance" (ctx.remote.balance)
      // y cualquier otro módulo cliente puede inyectarlo.
    }
    return { apply, inject };
  }
});
```

Reglas que cumple este código (verificadas contra el runtime):
- `$mount` llama `validateContribution` → **todos los codecs de parámetros deben ser
  `mode:"strict"`** (gateway client.browser.js #L2101–2109) y los descriptors pasan por
  `DescriptorStore.validate` (id/service/namespace/method + codecs válidos).
- El servicio del namespace se crea como `remote.balance` (#L1773–1800) y cada método se instala
  como propiedad que devuelve `(...args) => invokeRemote(...)` (#L1994–2006).
- `get()`/`topUp()` devuelven `Promise<{ok,value}|{ok:false,error}>`; `watch()` devuelve un
  `ClientStreamHandle` (AsyncIterable).

### 5.3 Consumo en UI (mismo módulo o un módulo cliente aparte)

```js
// Opción A — módulo aparte que inyecta el namespace ya montado
const inject = ["remote.balance", "slots", "locale"];   // la clave con punto es válida en Cordis

function apply(ctx) {
  let view = null;
  const render = (v) => { view = v; /* pinta { totalBalance, toppedUp } */ };

  // lectura inicial
  ctx.remote.balance.get().then((result) => { if (result.ok) render(result.value); });

  // en vivo, push por WebSocket (sin polling):
  const handle = ctx.remote.balance.watch();
  (async () => { for await (const snapshot of handle) render(snapshot); })();

  // Opción B — poll mínimo si prefieres no usar streams:
  // const timer = setInterval(async () => {
  //   const result = await ctx.remote.balance.get();
  //   if (result.ok) render(result.value);
  // }, 1000);
}
```

Si todo vive en el mismo bundle (opción más simple): tras `await ctx.remote.$mount(TYPERT_REMOTE)`
usa `ctx.remote.balance` directamente.

### 5.4 Bypass sin metadata (absolutamente mínimo, menos tipeado)

```js
const inject = ["connection"];
async function apply(ctx) {
  const result = await ctx.connection.rpc.call("/api", "balance/get", { args: {} });
  // result = {ok:true, value: {...}} | {ok:false, error:{code,message,details}}
}
```
Funciona porque el gateway responde a `balance/get` vía SRC, y el cliente postea a
`fetch POST /api/balance/get`. No crea el servicio `remote.balance` (otros módulos no pueden
inyectarlo) y no valida con zod.

### 5.5 Camino estricto/generado (paridad completa con dsh-goal, opcional)

1. `devDependencies: { "@deepseek-ai/dsh-typert-generator": "0.2.1-rc.5" }` y genera
   `lib/typert.host.js` (export `TYPERT`, `face:"host"`) y `lib/typert.remote-client.js`
   (export `TYPERT_REMOTE`).
2. `exports["./typert"]` → `lib/typert.host.js`: `dsh-typert-loader` lo registrará
   automáticamente en `ctx.typert` (validación estricta zod en host, lookups/scopes tipados).
3. El cliente monta el `TYPERT_REMOTE` generado en vez del espec escrito a mano.
4. El mismo package.json puede declarar `exports["./remote"]` → `lib/typert.remote-client.js`
   para que otros *bundles cliente* lo importen en build-time (así lo hace dsh-goal).

---

## 6. Límites y advertencias (verificados en código)

1. **`ctx.remote.$on` no es extensible por terceros**: el gateway solo registra una fuente de
   eventos (gateway #L846–875, "the sole application-selected forwarded-event source") y la
   allowlist `API_REMOTE_FORWARDED_EVENTS` está compilada en `dsh-api-remotes`. Para estado en
   vivo de un plugin propio: stream `mode:"stream"` o polling.
2. **SRC = sin validación zod en el host** (`src-json`): el gateway acepta los argumentos tal
   cual; la validación estricta existe solo con metadatos generados. Mantén tipos JSON puros.
3. **Nombres de parámetros SRC**: se derivan del nombre de la función en el JS compilado
   (`methodParameterNames`, parse de `toString`) — no minifiques los nombres de métodos y
   parámetros de la cara host; y evita colisiones con proveedores de lookup registrados
   (`agent`, etc.), porque un parámetro con ese nombre se convierte en lookup.
4. **Un endpoint por servicio**: dos servicios exportando el mismo `namespace/method` →
   `gateway/ambiguous-endpoint`.
5. **El namespace no puede chocar** con campos del servicio `remote` ni del namespace
   (`validateContribution` #L1718–1743: p. ej. no llames a tu servicio `events`, `streams`,
   `ctx`, `name`, `namespace`, `empty`, `methods`, `invokeRemote`).
6. **Cliente estricto obligatorio**: contribuciones cliente con codecs `src-json` en parámetros
   son rechazadas por `requireStrictInputs` — solo el *host* SRC es laxo.
7. **Access control**: llamadas de un peer no-owner pasan por `ctx.remoteAccess.decide`; declara
   `resources` en `@Remote` cuando el método toque recursos scoped.
8. **Efecto de montaje**: `$mount` y `ctx.typert.register` son efectos Cordis — el desmontaje
   retira endpoints y el servicio `remote.<ns>`; si una definición estricta se retira, el
   fallback SRC queda prohibido para ese endpoint (`hasSeen`).
9. **El bundle cliente solo puede `require` el seed de plataforma** (`@deepseek-ai/cordis`,
   `zod`, `react`, …) salvo lo listado en `dsh.client.external`; por eso el
   `createTypertRemoteInfo` se inlina en el bundle (igual que hace `dsh-api-remotes`).

---

## 7. Archivos extraídos para esta investigación (todo bajo `_dsh-inspect/research/`)

- `goal-extract/` — dsh-goal: `lib/index.js`, `lib/typert.host.js`, `lib/typert.remote-client.js`, `lib/types/*`, `package.json`
- `typert-extract/` — dsh-typert-protocol: `lib/index.js`, `lib/types/*`, `package.json`, `README.md`
- `typert-loader-extract/` — dsh-typert-loader: `lib/index.js`, `package.json`
- `typert-registry-extract/` — dsh-typert-registry: `lib/index.js`, `lib/client.browser.js`, `lib/client.node.js`, `lib/types/*`, `package.json`
- `api-gateway-extract/` — dsh-api-gateway: `lib/index.js` (host), `lib/client.browser.js`, `lib/types/*`, `package.json`
- `api-remotes-extract/` — dsh-api-remotes: `lib/index.js` (host), `lib/client.js` (bundle), `lib/types/*`, `package.json`
- `client-connection-extract/` — dsh-client-connection: `lib/index.js`, `lib/client.browser.js`, `package.json`
- `schedule-extract/` — dsh-schedule (segundo ejemplo): `lib/index.js`, `lib/typert.host.js`, `lib/typert.remote-client.js`, `package.json`
- `cordis-extract/` — @deepseek-ai/cordis `lib/index.js` (proxy de contexto)

Referencias del padre (ya extraídas): `_dsh-inspect/extract/dsh/node_modules/@deepseek-ai/dsh-client-ui-goal/lib/client.js`
y `_dsh-inspect/extract/dsh/node_modules/@deepseek-ai/dsh-client-modules/README.md`.
