# Learnings

A living log of what real life teaches the suite. Every entry: what
happened, what the AI did, what the human corrected, and the rule that came
out of it.

## Template

```markdown
## YYYY-MM-DD — <short title>

- **Context:** what the situation was.
- **What the AI did:** the detection, the tiers, the actions.
- **What the human corrected or decided:** the intervention.
- **New rule:** the adjustment added to `decisions.md` (or the skill text).
```

No entries yet — the first one will come from your first real-life test.

## 2026-11-02 — Never hand-edit the desktop profile (incident)

During the v2 consolidation, the desktop profile's package.json was
hand-edited (bundles + dependencies) while the Electron app manages that
profile exclusively. The app crashed on boot and had to be reinstalled.

Nothing was lost (repo, npm, campo profile, keys — all outside the app),
but the rule is now law:

1. **The desktop profile is managed by the Electron app.** The ONLY safe
   interface is `dsh plugin --profile desktop add/remove <path>`.
2. The campo profile (our field profile) is ours: hand-editing is allowed
   there, followed by `dsh plugin --profile campo add <path>` to reconcile
   node_modules.
3. Before any destructive step, `git status` must be clean — every working
   change committed and pushed. Interrupted work must be resumable.

## 2026-11-02 — Z-index ledger + explicit transition timeline

Two bugs from one screen stack: the language overlay opened BEHIND the
language step (z-index 90 < 95) so clicks "did nothing", and the splash
faded while the next screen already showed (timing overlap).

Rules:
1. Keep a z-index ledger: splash 100 · language step 95 · overlay (Apple
   menu) 110 · toast 60. Every new fixed layer must be ordered against it.
2. Sequence transitions explicitly: previous screen fully faded BEFORE the
   next appears (splash out at 1300 + 500ms fade → step in at 1900).
3. The strict smoke test stays: dead references and missing ids crash CI.

## 2026-11-12 — `agent/created` entrega un payload, no el agente (crash de cockpit-browser)

- **Context:** El 12-nov-2026 dejaron de abrirse sesiones nuevas en DeepSeek
  Harness con `TypeError: Cannot read properties of undefined (reading 'effect')`.
  El fallo bloqueaba la creación de cualquier agente en el perfil `desktop`.
- **What the AI (Gemini) did:** Lo diagnosticó como un problema de timing
  ("`agent.ctx` aún no está adjunto en la fase temprana de creación") y parcheó
  con un fallback defensivo: `const targetCtx = agent?.ctx ?? agent?.agent?.ctx ?? ctx;`
  más un guard `if (!targetCtx?.tools?.register) return;`.
- **What forensics found:** La causa real es un error de desestructuración, no
  de timing. DSH emite `agent/created` con un **payload** `{ agent, source, signal }`,
  no con el agente directamente. El handler original
  `ctx.on("agent/created", (agent) => { agent.ctx.effect(...) })` leía `.ctx`
  sobre el payload (`payload.ctx === undefined`), de ahí el `reading 'effect'`.
  Todos los plugins del núcleo desestructuran `({ agent }) => { ... agent.ctx ... }`.
  El parche de Gemini solo funciona por la rama `agent?.agent?.ctx`
  (`payload.agent.ctx` es el contexto real); las ramas `agent?.ctx` y `?? ctx`
  son código muerto/misleading.
- **New rule:** En DSH, `agent/created` (igual que `agent/disposed` y
  `agent/status`) entrega un payload `{ agent, ... }`. Desestructura SIEMPRE el
  agente: `ctx.on("agent/created", ({ agent }) => { ... })` — jamás leas campos
  del primer argumento crudo. La firma exacta está en
  `@deepseek-ai/dsh-agent` `src/runtime-types.ts`:
  `'agent/created'(this: Scoped<Agent>, payload: { agent: Agent; source: SessionStartSource; signal?: AbortSignal })`.
  Corrección aplicada en `plugins/jfranco-cockpit-browser/lib/index.js` (la
  versión defectuosa queda en el historial git).

## 2026-11-13 — "Balance unavailable": no es un bug de código, es un 401 de DeepSeek

- **Context:** Tras arreglar el crash de `agent/created`, el pill de balance
  (`@javierfrancoleal/balance`) pasó de funcionar a mostrar "Balance unavailable".
  Se sospechaba un bug de código similar al de cockpit-browser.
- **What the AI did:** Revisó el plugin y descartó el bug de código: el servicio
  host corre y el remote Typert está montado (por eso muestra "unavailable" y no
  "loading"). Probó el endpoint real y encontró la causa: `https://api.deepseek.com`
  ahora exige `Authorization: Bearer sk-...`. Las dos credenciales disponibles
  fallan con 401 — `DEEPSEEK_API_KEY` = `a77d1370-…` (un UUID, "invalid api key")
  y el account token de `platform.deepseek.com` ("Authentication Fails (governor)").
- **What forensics found:** Además, `resolveAuth` devolvía la PRIMERA credencial
  encontrada y **no hacía fallback** cuando el API la rechazaba (aunque el
  comentario decía "tried in order"): una API key inválida enmascaraba un account
  token que sí funcionara. Se corrigió a `resolveAuthCandidates()` + bucle con
  fallback solo en `401` (`error.code === "UNAUTHORIZED"`); los errores de red/timeout
  siguen saliendo al instante.
- **New rule:** Antes de declarar un "bug de plugin", prueba el endpoint real con
  `curl` y las credenciales almacenadas — un 401 de API se parece a un fallo de
  código pero no lo es. Y la selección de credenciales debe hacer fallback en
  **rechazo** (401), no solo en ausencia. **Pendiente del usuario:** guardar un
  `DEEPSEEK_API_KEY` válido (`sk-…`) en Ajustes → Modelos; el account token ya no
  sirve para `api.deepseek.com`.
