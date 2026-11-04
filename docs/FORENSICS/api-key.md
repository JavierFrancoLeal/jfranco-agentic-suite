# Cómo obtiene la API key de DeepSeek un plugin half-host (DSH 0.2.1-rc.5)

Informe de forense de código. Fuentes: `app.asar` → `dsh/node_modules/@deepseek-ai/*`, más
`_dsh-inspect/desktop-runtime.json`, `_dsh-inspect/src/*.yml` y los paquetes extraídos en
`_dsh-inspect/research/apikey-extract/` (este directorio).

---

## 1. Resumen ejecutivo

- **La API key NO se expone como global, ni en config, ni en keychain.**
- Se expone como **servicio Cordis** registrado bajo el nombre **`credentials`**
  (clase `CredentialProvider` de `@deepseek-ai/dsh-credentials`). Un plugin host la lee con
  `ctx.get("credentials")` y `await credentials.resolve("DEEPSEEK_API_KEY")` → `{ value, source } | undefined`.
- El valor vive en el archivo **`$DSH_HOME/.credentials.yaml`** (`~/.dsh/.credentials.yaml` por defecto,
  modo 0600), gestionado por `@deepseek-ai/dsh-credentials-local` (proveedor concreto del seam).
  Precedencia: archivo gestionado > entorno de proceso heredado > `<cwd>/.env` > `$DSH_HOME/.env`.
- El nombre de referencia por defecto en el producto es **`DEEPSEEK_API_KEY`**
  (`apiKeyEnv` en `@deepseek-ai/dsh-llm-deepseek-api-key` y en `dsh-base.patch.yml`).
- `@deepseek-ai/dsh-deepseek-account` es **otro servicio Cordis**: **`deepseekAccount`**. No guarda la
  API key: guarda el *grant* del login de cuenta (PKCE contra `https://platform.deepseek.com`) y su
  método Host-only `resolveToken(url)` devuelve el token de cuenta **solo** para el `inferenceOrigin`
  configurado (por defecto `https://api.deepseek.com`).
- `dsh-credentials` es **genérico y multi-proveedor**: settings/nombres de variable apuntan a referencias;
  el proveedor es dueño del valor y del almacenamiento. Cualquier proveedor (keyring, KMS, comando) puede
  implementarlo; el único que se distribuye es el local (YAML).

---

## 2. Traza end-to-end (una feature: "leer la key desde un plugin")

1. **Escritura (UI)**: la página web Models escribe la key vía RPC `credentials.set(ref, value)`.
   Host: `@deepseek-ai/dsh-api-settings-controller/lib/types/credentials.js`
   — `CredentialsController` (`super(ctx, 'credentialsController', { namespace: 'credentials' })`, línea 104),
   métodos `describe/set/unset` (líneas 116–146). El valor cruza el wire **solo en dirección de escritura**:
   *"Secret values cross in one direction only — no method here returns one."* (líneas 81–83).
2. **Persistencia**: `credentials.set` → `LocalCredentialProvider.set` → `write()` con lock entre procesos
   (`withFileLock`, `writeFileAtomic`, modo 0600) → edita `refs:` en `$DSH_HOME/.credentials.yaml`
   (`dsh-credentials-local/lib/index.js` líneas 520–523, 608–632).
3. **Lectura (plugin host)**: `ctx.get("credentials").resolve(ref)` → busca `values` (archivo), luego
   `inherited()` (entorno de proceso), luego `.env` de proyecto/usuario → `{ value, source } | undefined`
   (líneas 480–497).
4. **Consumo real (dsh-llm-deepseek-api-key)**: `resolveApiKey()` hace
   `ctx.get("credentials")` → `credentials.resolve(ref)` → `assertUsableApiKey(hit.value, ...)` y lo pone
   en el header `x-api-key` (`lib/index.js` líneas 53–64, 135). Si el servicio no existe, lee el entorno
   de lanzamiento (`launchEnvironmentOf(ctx).get(ref)`); si no hay nada: `LlmError MISSING_CREDENTIAL`.
5. **Efecto**: peticiones a `https://api.deepseek.com/...` autenticadas; `GET /models` con `x-api-key`.

---

## 3. Hallazgos por paquete

### 3.1 `@deepseek-ai/dsh-credentials` — el seam abstracto (nombre de servicio: `credentials`)

`lib/index.js`:

- `var CredentialProvider = class extends Service { constructor(ctx) { super(ctx, "credentials"); } }`
  (líneas 109–112). **Este es el nombre exacto del servicio Cordis.**
- Marcas (`brandString`, compilación pura — en runtime es la misma cadena):
  `credentialRef("DEEPSEEK_API_KEY")` (regex `^[A-Za-z_][A-Za-z0-9_]*$`, líneas 13–24);
  `credentialKey(scope, id)` → `"<scope>/<id>"` (líneas 56–59); `parseCredentialKey`,
  `credentialKeyScope`, `credentialKeyId`, `isCredentialRefName`, `isCredentialKeySegment`.
- Eventos Cordis: `credentials/reference-updated` (ref) y `credentials/record-updated` (key)
  (líneas 121–131).
- README.md (contrato completo, líneas 48–79):

```ts
const hit  = await ctx.credentials.resolve(ref)    // { value, source } | undefined
const info = await ctx.credentials.describe(ref)   // { configured, source?, writable } — nunca el valor
await ctx.credentials.set(ref, 'sk-…')             // el valor guardado gana a las fallbacks de entorno
await ctx.credentials.unset(ref)
const hit2 = await ctx.credentials.readRecord(key) // CredentialRecord | undefined
await ctx.credentials.listRecords()                // [{ key, kind }] — nunca valores
await ctx.credentials.modifyRecord(key, async () => ({ kind:'grant', payload:{…} }))
await ctx.credentials.deleteRecord(key)
```

- Es **genérico multi-proveedor**: *"settings and composition files carry references to secrets —
  environment-variable names — while providers own the actual values and their storage"*
  (docstring de cabecera). *"The seam shape leaves room for keyring-, helper-command-, and KMS-backed
  providers … None is shipped"* (README Dev Note, líneas 188–189). El paquete solo define el contrato;
  **no almacena nada**.

### 3.2 `@deepseek-ai/dsh-credentials-local` — el almacén real (proveedor por defecto)

`lib/index.js` (docstring de cabecera, líneas 12–47) + código:

- Fichero: `$DSH_HOME/.credentials.yaml` (`CREDENTIALS_FILENAME = ".credentials.yaml"`, línea 49;
  `resolveSpec` líneas 56–62: `resolve(config.path ?? join(resolveDshHome(config.dshHome), ".credentials.yaml"))`).
  `resolveDshHome`: `$DSH_HOME` si está definido, si no `~/.dsh` (`src/dsh-home-paths/lib/index.js`
  líneas 12–16, 110–111). En esta máquina: `~/.dsh/.credentials.yaml`.
- Layout v1 (líneas 123–160, 194–213):

```yaml
version: 1
refs:
  DEEPSEEK_API_KEY: sk-...            # CredentialRef -> string no vacía
records:
  deepseek-account-platform/default:  # <scope>/<id> -> { kind: 'api-key' | 'grant', ... }
    kind: grant
    payload: { version: 1, token: …, issuer: https://platform.deepseek.com }
```

- Precedencia exacta (líneas 16–21, 480–497): archivo gestionado **>** entorno de proceso heredado
  **>** `<cwd>/.env` **>** `$DSH_HOME/.env`. `source` vale `"file"`, `"env"` o la fuente de la capa
  `.env` (`project-env`/`user-env`). *"The managed store wins because a credential the user explicitly
  saved in the product must take effect consistently"*.
- Seguridad: el archivo se crea/escribe con `mode: 384` (0600) y `dirMode: 448` (0700); se rechaza un
  archivo legible por grupo/otros en POSIX (`assertOwnerOnly`, líneas 63–106). **No hay keychain** —
  es un archivo YAML plano con permisos de dueño.
- Regla seam-wide: **un valor guardado vacío es ausente**; `set` con `""` lanza
  `an empty value cannot be stored` (línea 521); en `parseRefs` un valor vacío es error (líneas 199–200).
- Hot-reload con chokidar; ediciones externas se publican (`notifyUpdated`); el valor guardado **nunca
  se materializa en el entorno del proceso** (comentario en `dsh-base.patch.yml` líneas 115–119).
- En la composición del producto (`_dsh-inspect/src/dsh-base.patch.yml` líneas 124–127):

```yaml
- id: credentials
  name: '@deepseek-ai/dsh-credentials-local'
```

### 3.3 `@deepseek-ai/dsh-llm-deepseek-api-key` — consumidor canónico de la key

`lib/index.js`:

- Config: `apiKeyEnv: z.string().role("credential-ref").default("DEEPSEEK_API_KEY").volatile()`
  (línea 12). Ruta `deepseek-official`.
- Resolución (líneas 53–64):

```js
const resolveApiKey = async (connection) => {
  const ref = connection.apiKeyEnv;
  const credentials = ctx.get("credentials");
  if (credentials !== void 0) {
    const hit = await credentials.resolve(ref);
    if (hit !== void 0) return assertUsableApiKey(hit.value, "llm-deepseek", ref);
  } else {
    const ambient = launchEnvironmentOf(ctx).get(ref);
    if (ambient !== void 0 && ambient.value.length > 0) return assertUsableApiKey(ambient.value, "llm-deepseek", ref);
  }
  throw new LlmError(`llm-deepseek: no API key for provider route "deepseek-official"; store ${ref} through the credentials service (the web Models page writes it), or export ${ref} in the launching environment`, "MISSING_CREDENTIAL");
};
```

- Uso: header **`x-api-key`** para Messages/Files (`resolveAuth`, línea 135) y para el listing oficial
  `GET https://api.deepseek.com/models` (líneas 74–77). `presentApiKey` (líneas 66–73) convierte
  `MISSING_CREDENTIAL` en `undefined` para que la ruta no pida nada sin key.
- Validación (`@deepseek-ai/dsh-llm/lib/types/api-key.js`): `LEGAL_API_KEY = /^[\x21-\x7E]+$/` (ASCII
  imprimible sin espacio), `trim` silencioso; `assertUsableApiKey` lanza `LlmError` código
  **`INVALID_CREDENTIAL`** si está en blanco o con caracteres ilegales (`dsh-llm/lib/index.js`
  líneas 1659–1662).
- Base URL: `PUBLIC_BASE_URL = "https://api.deepseek.com/anthropic"` y override `$DEEPSEEK_BASE_URL`
  (`@deepseek-ai/dsh-llm-deepseek/lib/index.js` líneas 346–349, 441).

### 3.4 `@deepseek-ai/dsh-deepseek-account` — el servicio `deepseekAccount`

`lib/index.js`:

- `var DeepSeekAccount = class extends Service { constructor(ctx) { super(ctx, "deepseekAccount"); } }`
  (líneas 33–38). **Nombre exacto del servicio Cordis: `deepseekAccount`** (camelCase; inyectable como
  `ctx.deepseekAccount` vía `static inject = ['deepseekAccount']`, p. ej. `dsh-api-account-controller`).
- *"Account operations; only Host consumers can obtain a request credential."* (línea 32).
- Métodos abstractos (contrato del README): `getState`, `getProfile`, `getBalance`, `getPlatformSession`,
  `getUnnotifiedBonuses`, `ackBonusNotified`, `getDeviceIdentity`, `resolveToken(url)`, `startSignIn`,
  `cancelSignIn`, `signOut`, `rejectToken`, `watch(signal, includeIdentityChanges)`.
- Eventos: `deepseek-account/signed-out`, `deepseek-account/session-expired`,
  `deepseek-account/model-sign-in-required` (account-tasks, líneas 9–28, README líneas 39–43).
- `platformClientHeaders` construye los 5 headers de identidad de cliente (`x-client-bundle-id`
  vacío, `x-client-platform`, `x-client-version`, `x-client-locale`, `x-client-timezone-offset`).

### 3.5 `@deepseek-ai/dsh-deepseek-account-platform` — el proveedor (login y token de cuenta)

`lib/index.js`:

- Config (líneas 500–518): `platformOrigin` default **`https://platform.deepseek.com`**,
  `inferenceOrigin` default **`https://api.deepseek.com`**, `allowLoopbackHttp`, `requestHeaders`,
  `accountRequestHeaders`, timeouts.
- Grant almacenado como **record de credenciales** (no como ref):
  `KEY = credentialKey("deepseek-account-platform", "default")`,
  `DEVICE = credentialKey("deepseek-account-platform", "device")` (líneas 491–492);
  payload `{version: 1, token, issuer}` (líneas 493–497). Se escribe vía
  `ctx.credentials.modifyRecord` / `session.commit` durante el login PKCE (auth_init →
  `/auth-api/v0/dsh/auth_exchange` → callback `http://127.0.0.1:<port>/oauth/callback`).
- **`resolveToken(url)`** (líneas 804–823) — el acceso Host-only al credencial de cuenta:

```js
async resolveToken(url) {
  if (this.closed || this.removing !== void 0) return void 0;
  const destination = new URL(url);
  if (destination.origin !== this.inferenceOrigin || destination.username || destination.password) return void 0;
  const record = await this.ctx.credentials.readRecord(KEY);
  if (record === void 0) return void 0;
  ...
  if (result.data.token.startsWith("dsh_mock_")) return void 0;      // tokens mock nunca se entregan
  if (this.inferenceOrigin === "https://api.deepseek.com") {
    if (["localhost","127.0.0.1","[::1]"].includes(issuer.hostname)) return void 0;
  } else if (issuer.origin !== this.origin) return void 0;
  return result.data.token;
}
```

  → solo devuelve el token para el **origen de inferencia** (api.deepseek.com por defecto) y jamás
  tokens `dsh_mock_` ni grants de issuers loopback. Sin login: `undefined`.
- Balance de la **cuenta logueada** (no el de la API key): `getBalance` → `GET /api/v0/users/get_user_summary`
  en platform.deepseek.com con header `x-dsh-auth-token` (líneas 396–406, 150–155); proyección
  `{ status:'ready', value: normal_wallets, bonusWallets }` con `{currency: "CNY"|"USD", balance: string}`
  (líneas 339–346). Perfil: `/auth-api/v0/users/current`.
- Inyecta `["credentials", "authorization"]` (línea 521); registra el flujo de login en
  `ctx.authorization.registerFlow` (líneas 573–586); escucha `credentials/record-updated` (líneas 587–591).
- `getPlatformSession()` devuelve un snapshot Host-only `{origin, token, userId, requestHeaders}`
  (líneas 781–793); el README insiste: *"Credentials are Host-only; the API controller exports state
  and commands without resolveToken."*

### 3.6 `@deepseek-ai/dsh-llm-deepseek-account` — ruta LLM "DeepSeek Account"

`lib/index.js`:

- `const account = () => ctx.get("deepseekAccount")` (línea 80) — **mismo patrón de acceso** que un
  plugin tercero usaría.
- `resolveAuth`: `await account()?.resolveToken(connection.baseURL)`; si `undefined` →
  `LlmError("ACCOUNT_SIGN_IN_REQUIRED")`; header **`x-dsh-auth-token`** (líneas 71–103).
- Errores 401 → `rejectToken(token)` + `ACCOUNT_TOKEN_INVALID`; quota → `ACCOUNT_QUOTA_EXCEEDED_CODE`.

### 3.7 Vista del client half (RPC Typert) — qué NO puede leer el navegador

- `CredentialsController` (namespace remoto **`credentials`**): solo `describe`, `set`, `unset`.
  `provider()` usa `this.ctx.get('credentials')` y si falta lanza
  `'credentials service is absent: this deployment does not mount a credential provider
  (e.g. @deepseek-ai/dsh-credentials-local) in its composition'` (líneas 148–154).
- `AccountController` (namespace remoto **`account`**): `getState/getProfile/getBalance/getUnnotifiedBonuses/
  ackBonusNotified/startSignIn/cancelSignIn/hasRunningAccountTasks/signOut/watch` — **sin `resolveToken`**.
- Conclusión: **el valor de la key solo es legible en el half host**. El half client (navegador) solo
  puede describir/configurar/borrar, nunca resolver.

---

## 4. Forma canónica de obtener la API key desde un plugin half-host (host face)

```js
// Host face del plugin (se ejecuta en el runtime Cordis del host).
// Patrón exacto usado por @deepseek-ai/dsh-llm-deepseek-api-key (lib/index.js:53-64).
import { credentialRef } from "@deepseek-ai/dsh-credentials"; // opcional: brandString es identidad en runtime

export const inject = [];          // no hace falta injectar: ctx.get() resuelve servicios opcionales
export function apply(ctx, config) {
  // 1) El servicio puede NO estar montado (composiciones sin proveedor) → ctx.get devuelve undefined.
  const credentials = ctx.get("credentials");

  const resolveApiKey = async (ref = "DEEPSEEK_API_KEY") => {
    if (credentials !== undefined) {
      const hit = await credentials.resolve(credentialRef(ref)); // { value, source } | undefined
      if (hit !== undefined) return hit.value;                    // string; source ∈ {"file","env","project-env","user-env"}
    }
    // 2) Fallback ambiente solo si no hay servicio (el servicio ya aplica las capas .env/entorno).
    const ambient = ctx.launchEnvironment?.get(ref);              // o launchEnvironmentOf(ctx).get(ref)
    if (ambient?.value?.length > 0) return ambient.value;
    return null;                                                  // ausente → null/undefined, no error
  };

  // Otras lecturas útiles del mismo servicio:
  // await credentials.describe(ref)            -> { configured, source?, writable }   (nunca el valor)
  // await credentials.set(ref, "sk-…") / unset(ref)   (escritura; "" está prohibido)
  // const hit = await credentials.readRecord(credentialKey("tu-plugin", "tu-id"))

  // Variante con la CUENTA (login, en vez de API key):
  const account = ctx.get("deepseekAccount");
  const token = await account?.resolveToken("https://api.deepseek.com"); // string | undefined;
  // solo para inferenceOrigin; nunca tokens dsh_mock_. Header: "x-dsh-auth-token".
}
```

Si prefieres inyectarlo (servicio requerido): `static inject = ["credentials"]` → `ctx.credentials`
(o `static inject = ["deepseekAccount"]` → `ctx.deepseekAccount`, patrón de `AccountController`).

---

## 5. Caveats (permisos, aislamiento, ausencias)

1. **Sin gate de permisos evidenciado para servicios host**: cualquier plugin montado en el host comparte
   el mismo `Context`; `ctx.get("credentials").resolve("DEEPSEEK_API_KEY")` devuelve la key a cualquier
   plugin host. La única barrera de aislamiento es **física**: el half client (navegador) no tiene método
   de lectura del valor (RPC solo `describe/set/unset`), y `deepseekAccount.resolveToken` está atado al
   `inferenceOrigin` y rechaza tokens mock/loopback. Tratar la key como secreto host-only.
2. **Servicio opcional**: en composiciones sin proveedor, `ctx.get("credentials")` es `undefined`
   (el consumidor oficial lo comprueba antes; el controller RPC lanza `gateway/internal`). No asumas
   `ctx.credentials`.
3. **Valor ausente → `undefined`** en `resolve()` (no `null`, no throw). `hit.value` es la key;
   `hit.source` indica de dónde vino (`file` gana a `env` y a `.env`).
4. **Vacío = ausente**: no se puede guardar `""`; un `refs:` con valor vacío no parsea. Nunca verás
   `value: ""`.
5. **Precedencia**: mientras exista el valor en `~/.dsh/.credentials.yaml`, las variables de entorno
   exportadas NO aplican. `unset` para volver al entorno.
6. **Sin enumeración de refs**: no hay `list()` de referencias; hay que saber el nombre
   (`DEEPSEEK_API_KEY` es el del producto). `listRecords()` sí existe para records `<scope>/<id>`.
7. **Rotación en caliente**: `resolve()` es una lectura por operación sin caché; un cambio de valor
   (set/unset/edición externa detectada por chokidar) aplica a la siguiente operación, sin reinicio.
   Evento `credentials/reference-updated` para refrescar UI (los cambios de entorno de proceso no emiten).
8. **Validación antes de usar**: `normalizeApiKey`/`assertUsableApiKey` (`@deepseek-ai/dsh-llm`):
   trim + `/^[\x21-\x7E]+$/`; vacío/ilegales → `LlmError INVALID_CREDENTIAL`. Sin key →
   `MISSING_CREDENTIAL`.
9. **La key NO cubre `/user/balance` con `x-api-key`**: ese endpoint requiere
   `Authorization: Bearer <key>` (ver §6) y **no lo consume ningún paquete de este runtime** (búsqueda
   `user/balance|balance_infos|is_available|topped_up_balance` = 0 resultados en asar extraído,
   `src/`, `extract/` y `desktop-runtime.json`). El balance que muestra el producto es el de la cuenta
   logueada (`get_user_summary` en platform.deepseek.com con `x-dsh-auth-token`).

---

## 6. Endpoint público GET /user/balance (verificado contra documentación oficial)

Fuente: https://api-docs.deepseek.com/api/get-user-balance (consultado 2026-11-04; también el
markdown https://api-docs.deepseek.com/api/get-user-balance.md).

- Endpoint: `GET https://api.deepseek.com/user/balance` (operationId `getUserBalance`, server
  `https://api.deepseek.com`).
- Autenticación: **`Authorization: Bearer <API_KEY>`** (esquema http bearer).
- Curl documentado:

```bash
curl --silent --show-error --max-time 60 "https://api.deepseek.com/user/balance" \
  --header "Authorization: Bearer ${DEEPSEEK_API_KEY}"
```

- **JSON exacto documentado** (respuesta 200, `GetUserBalanceResponse`; campos opcionales
  `is_available` boolean y `balance_infos` array de objetos con `currency` enum `["CNY","USD"]` y
  los tres balances como **string**):

```json
{
  "is_available": true,
  "balance_infos": [
    {
      "currency": "CNY",
      "total_balance": "110.00",
      "granted_balance": "10.00",
      "topped_up_balance": "100.00"
    }
  ]
}
```

Semántica documentada: `is_available` = si el saldo basta para llamadas a la API; `total_balance` =
saldo total disponible (granted + topped-up); `granted_balance` = saldo concedido no caducado;
`topped_up_balance` = saldo recargado. Nota: en la doc actual los campos están marcados *optional*
(en la práctica la API los devuelve siempre con balance existente).

---

## 7. Mapa de fuentes extraídas

| Paquete (en asar) | Extraído en `apikey-extract/` | Rol |
|---|---|---|
| `@deepseek-ai/dsh-credentials` | `dsh-credentials/` | Seam abstracto: servicio `credentials`, marcas, eventos |
| `@deepseek-ai/dsh-credentials-local` | `dsh-credentials-local/` | Proveedor real: `$DSH_HOME/.credentials.yaml` (0600) |
| `@deepseek-ai/dsh-llm-deepseek-api-key` | `dsh-llm-deepseek-api-key/` | Consumidor: `ctx.get("credentials").resolve(apiKeyEnv)` → `x-api-key` |
| `@deepseek-ai/dsh-deepseek-account` | `dsh-deepseek-account/` | Servicio `deepseekAccount` (abstracto) |
| `@deepseek-ai/dsh-deepseek-account-platform` | `dsh-deepseek-account-platform/` | Login PKCE, grant en records, `resolveToken`, `getBalance` |
| `@deepseek-ai/dsh-llm-deepseek-account` | `dsh-llm-deepseek-account/` | Ruta LLM por cuenta (`x-dsh-auth-token`) |
| `@deepseek-ai/dsh-api-account-controller` | `dsh-api-account-controller/` | RPC client (sin credenciales) |
| `@deepseek-ai/dsh-api-settings-controller` | `dsh-api-settings-controller/` | RPC `credentials.describe/set/unset` |
| `@deepseek-ai/dsh-llm` (api-key) | `dsh-llm-api-key.js` | `normalizeApiKey` / `assertUsableApiKey` |
| `@deepseek-ai/dsh-llm-deepseek` | `dsh-llm-deepseek-lib.js` | `PUBLIC_BASE_URL="https://api.deepseek.com/anthropic"`, `$DEEPSEEK_BASE_URL` |
| `@deepseek-ai/dsh-brand` | `dsh-brand/` | `brandString` = identidad en runtime |

Composición de referencia: `_dsh-inspect/src/dsh-base.patch.yml` líneas 115–127 (`authorization`,
`deepseek-account`, `credentials`), 452–530 (`web-search-deepseek`, `web-deepseek-api`,
`llm-deepseek`, `llm-deepseek-account`; `apiKeyEnv: DEEPSEEK_API_KEY` en líneas 477 y 482).
Inventario del runtime: `_dsh-inspect/desktop-runtime.json` (`sharedPackages` incluye los 6 paquetes
del seam con versión `0.2.1-rc.5`).
