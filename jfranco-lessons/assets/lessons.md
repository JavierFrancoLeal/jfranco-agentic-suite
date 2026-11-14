# Lessons — the genome that remembers

The active lessons of the house. Every failure became one of these;
every future session must obey them so the past does not repeat.

## The launch law (lesson #35)
- The package is not the flight: an artifact is SHIPPED only after a
  REAL launch test (the smoke in the clean GUI environment), never
  after the asar inspection alone. The gates that do not launch the
  app do not prove the app opens.
- Before launching an Electron app from a shell, check the
  environment: ELECTRON_RUN_AS_NODE=1 makes it run as NODE with no
  window (the false "nothing opens"). Use `env -u ELECTRON_RUN_AS_NODE`
  for the GUI test.
- Every crash must leave a trace: the startup logger
  (~/.dsh/fanal-startup.log) receives the uncaughtException and the
  unhandledRejection — a silent failure is a forbidden failure.

## The patch law (the quote series)
- For strings with nested quotes, use the DIRECT EDIT, never the
  heredoc generator: the escaping trap produced five caught errors —
  the lesson is the tool choice.

## The one-heavy-op law (lesson #34)
- Measure before pulling models; one heavy operation per turn; never
  poll the same state twice; two failures switch the channel.

## The ledger law
- Every failure becomes a NUMBERED lesson in the KNOWLEDGE-LEDGER plus
  a guard (a gate, a check, a log). A failure that could happen twice
  was not understood once. The genome remembers; the organism grows
  from its own scars.

## The cockpit law (lesson #36 — browser control & the brake, 2026-11-11)
- A DSH HOST plugin can never open a WebContentsView: the host runs as an
  ELECTRON_RUN_AS_NODE child and Electron's main (app.asar/lib/main.js) is not
  plugin-extensible. A browser the agent controls must live OUTSIDE DSH — a
  Chrome MV3 extension as the "hands" + a CDP driver to a separate Chromium as
  fallback.
- A hand-rolled WebSocket bridge (zero deps) is unsafe until RFC 6455-hardened:
  16 MB max payload (else OOM), 64-bit length + multi-chunk accumulation,
  control-frame rules (no fragmented/large ping, no 1-byte close), masking,
  RSV bits, opcode validation, a socket-race guard (rejectAllPending on replace),
  and CSWSH defense = Origin `chrome-extension://` + an ephemeral 256-bit token.
  Never trust 127.0.0.1 just because it is local.
- A "constitutional brake" regex is NOT enough: it needs word boundaries +
  Unicode normalization (NFD), and the label must be read from the interactive
  ANCESTOR (`closest('button,a,[role=button]…')`) plus `isSubmit`/`href`
  metadata — else a click on a child `<svg>` of a "Delete" button returns an
  empty label and bypasses the brake.
- MV3 content scripts break on real Google/Facebook DOM: `<div contenteditable>`
  (fill must use `execCommand("insertText")`, not the input value setter),
  `<svg>` has no `.click()` (dispatch a MouseEvent), and an async `onmessage`
  without try/catch = unhandled rejection = 30s host timeout.
- Governance state lives in the HOST module, never in the page: `state.mode`
  (MANUAL/BRAKED) must gate every mutating action; YELLOW approval is a
  `pendingYellow` consumed once (never a flag the agent can pass); tiers are
  RAM-cached with a SHA-256 hash and only `/cockpit promote` (human) refreshes
  them — a bash write by a danger-full-access agent is ignored or detected and
  discarded.

## The code-hands law (lesson #37 — delegating to an external coding agent, 2026-11-14)
- When DSH delegates to an external coding CLI (Google Antigravity `agy`), the
  SAME brake applies as the browser: the agent plans and fills, the human signs.
  Map the tool's modes to tiers — `plan` (read-only) = GREEN, `accept-edits`
  (writes files) = SEMI-AUTOMATIC, `auto`/`--dangerously-skip-permissions` = RED
  (never exposed to the agent).
- Permissions must be SESSION-SCOPED, never global: pass the CLI's own
  `--settings '{"toolPermission":"proceed-in-sandbox"}'` + `--sandbox` per call,
  so the user's global `settings.json` is untouched. Avoid broad grants
  (`command(find)` has `-exec`/`-delete`; global `cat`/`grep` can read secrets).
- Before a WRITE mode, pre-check a clean Git tree (`git status --porcelain`
  empty) so the post-run `git diff` shows exactly what the delegate changed.
- Bound the call: an explicit `--print-timeout` (e.g. 300s) and an `--effort`
  knob (low/medium/high) avoid hung processes and cut latency (~2.5 min plan
  mode on an M2 → much less on `low`).
- Register the tool PER-AGENT so it is model-visible: `ctx.on("agent/created",
  ({ agent }) => { if (!agent?.ctx) return; agent.ctx.effect(() => { const
  unregister = agent.ctx.tools.register(defineTool({ ... })); return () =>
  unregister(); }); })`. **`agent/created` (also `agent/disposed`,
  `agent/status`) emits a PAYLOAD `{ agent, source, signal }` — NEVER the agent
  directly — so always destructure `({ agent })`.** A host-only
  `ctx.tools.register` does not reach the agent's function list.
- Resolve the external CLI binary by ABSOLUTE path, never a bare `spawn("agy")`:
  a GUI Electron app launched from Finder/Dock inherits a minimal PATH without
  `~/.local/bin`, so `spawn("agy")` fails with ENOENT even though `agy` works in
  Terminal. Prefer `process.env.ANTIGRAVITY_CLI`, then `existsSync` over known
  absolute paths, then fall back to the bare name.

## The two-brain law (lesson #38 — pincer architecture, 2026-11-14)
- Two models complement by ASSIGNING each its strength, not by splitting the
  work evenly. Gemini (Hydrogen/Argon) is strong on intelligence, 2M context,
  multimodality and factual reliability (~4–15% hallucination) but expensive;
  DeepSeek V4 Pro is cheap, fast, elite at bounded code (SWE-bench ~80%,
  LiveCodeBench ~92%) but ~94% hallucination on out-of-knowledge facts and no
  multimodal.
- **Golden rule:** DeepSeek must NEVER critique from memory — only against
  VERIFIABLE evidence on disk (real files, test output, `git diff`, the house
  laws). Gemini supplies the factual truth and the plan; DeepSeek plays
  "devil's advocate" strictly against the repo, orchestrates, and executes
  well-specified code.
- **Model routing inside Google:** Hydrogen (XHigh/High) beats Argon on the
  composite index, is faster and cheaper; reserve Argon for extreme
  math/science/horizon. DeepSeek wins on the HARNESS, not the raw model.
- **Cross-audit before the human signs:** whoever did NOT write the change
  reviews the `git diff` — DSH implements → Antigravity audits (plan, low
  effort); Antigravity implements → DSH runs tests + checks the diff.

## The dialogue law (lesson #39 — two-agent turn protocol, 2026-11-14)
- Two agents relayed through one human have NO shared state, so "who said what,
  in which order" is ambiguous unless you impose a total order. Fix with four
  rules + one shared file (`~/.dsh/PROTOCOLO.md` — the canonical source — plus
  `~/.dsh/dialogue.md` as the active ledger; archive closed rounds under
  `~/.dsh/dialogues/`):
  1. **One leader per task** (never broadcast). Mode A: Antigravity leads for
     facts/docs/web/architecture (it anchors truth, ~4–15% hallucination); DSH
     is the critic/executor in sub-turns. Mode B: DSH leads for its own plugins
     / house rules / bounded code; Antigravity audits in sub-turns.
  2. **Sequential relay by default**: the leader answers (T1); the follower gets
     "the task + T1's labeled response" (T2); then synthesis + human sign.
     Exception = "Jurado/Doble Ciego" (parallel independent opinions, marked,
     never crossed, funneled to ONE synthesizer).
  3. **Causal envelope + DISK_LOCK**: every relayed/logged message carries
     `#N | timestamp | DE: <X> | PARA: <Y> | RE: #<parent> | NEXT: <GEMINI|DEEPSEEK|HUMANO> | DISK_LOCK: <NONE|GEMINI|DEEPSEEK>`
     so `NEXT` and `DISK_LOCK` impose a total order and never two code writers
     at once (the piece that prevents stomping the same `git diff`).
  4. **Human-facing clarity (no deadlock)**: whenever `NEXT: HUMANO`, end with an
     explicit `## ACCIÓN PARA TI` in plain language — which chat, what to decide
     without jargon, and the exact copy-paste text for the other agent. Never
     reply with a passive "waiting" message alone.

## The agent-event law (lesson #40 — the payload, not the agent, 2026-11-12 & 2026-11-14)
- `agent/created`, `agent/disposed` and `agent/status` emit a PAYLOAD
  `{ agent, source, signal }` — never the `agent` object directly. The handler's
  first argument is that payload, so `(agent) => agent.ctx.effect(...)` throws
  `TypeError: Cannot read properties of undefined (reading 'effect')` and —
  because `agent/created` is a SERIAL, awaited event — aborts the WHOLE session
  creation.
- ALWAYS destructure: `ctx.on("agent/created", ({ agent }) => { if (!agent?.ctx)
  return; agent.ctx.effect(() => { const unregister = agent.ctx.tools.register(
  defineTool({ ... })); return () => unregister(); }); })`.
- This recurred TWICE (cockpit-browser 2026-11-12, antigravity 2026-11-14)
  because the knowledge stayed in `docs/LEARNINGS.md` and never reached the
  active lessons nor the authoring template. Now guarded in `tools/check-host.mjs`
  (static + runtime) and wired into `tools/check-plugin.sh`.

## The homeostasis law (lesson #41 — adaptive model routing, 2026-11-14)
- Two brains is one organism: Antigravity (Gemini) = perception/multimodal/long
  context/external facts; DSH (DeepSeek) = bounded symbolic logic/code/contrast;
  the corpus callosum = `~/.dsh/PROTOCOLO.md` + `dialogue.md`.
- Route the model by task level, not by habit — cheapest sufficient, escalate
  only on a real signal:
  - **Reflex (read/summarize/classify/format/quick audit)** → Flash / `effort low`.
  - **Habit (bounded code, closed spec, tests, one-line fix)** → Hydrogen medium
    / DSH Pro (acotado).
  - **Neocortex (new architecture, multi-file bugs, external docs/APIs)** →
    Hydrogen high/xhigh / DSH Pro (as the repo-reading auditor, never memory).
  - **Frontier (structural redesign, legal/financial, after 2 failures)** →
    Argon / DSH Pro max.
- Four pain sensors (nociceptors) drive the shift:
  1. **2-failure rule** — a test/cross-audit bounce escalates one notch; two
     bounces at the top = stop and reframe the whole problem.
  2. **Risk (SEMI/RED)** — never stay on Flash for a write/irreversible action;
     force Hydrogen/Argon + cross-audit before the human signs.
  3. **Friction** — a real evidence-backed objection between the two brains
     escalates the synthesis one notch.
  4. **Latency/fatigue** — when work turns repetitive/mechanical, DE-escalate
     (Argon→Hydrogen→Flash / effort low) to stop burning cortex on muscle work.

## The single-manifest bundle law (lesson #42 — one list for Desktop & npm, 2026-11-14)
- Modularizing `supervisor/` (`brain-catalog.js`, `diagnostic-sanitizer.js`, `power-kpi.js`, `intake-engine.js`) broke `supervisor-pkg/` because `tools/sync-all.sh` kept a stale 4-file copy list (`server.js`, `dashboard.html`, `dashboard-i18n.js`, `browser-cdp.js`), omitting the new required modules and recursively nesting `icons/icons` and `sector-packs/sector-packs`.
- Never duplicate bundle file lists across scripts: [`tools/sync-desktop.mjs`](../../tools/sync-desktop.mjs) is the single canonical manifest for **both** `apps/desktop/` and `supervisor-pkg/`, verified in `tools/check.sh` and `tools/check.ps1` including `"files"` whitelist validation against every local `require("./...")` in `server.js`.
- `--dry-run` in `sync-all.sh` must be strictly read-only (never bump `package.json` or overwrite `.last-sync`).

## The RAM vault-key handoff law (lesson #43 — Electron ↔ Supervisor parity, 2026-11-14)
- Keeping `FANAL_MASTER_KEY` only inside Electron Main meant `server.js` saved BYOK keys and IMAP passwords without `AESGCM2:` envelope encryption.
- Hand off the derived master key exclusively over authenticated loopback (`POST /api/internal/vault-key` with `FANAL_INTERNAL_TOKEN`), keep it only in `runtimeMasterKey` RAM, zeroize on lock, and verify `allSecretsDecrypted` before re-sealing during key rotation so wrong/stale keys can never overwrite encrypted secrets.

## The zero-duplicate-DOM law (lesson #44 — structural smoke guard, 2026-11-14)
- Malformed HTML tags (`="tab-sector"`), duplicate containers (`#leadView`, 131 duplicate IDs), settings blocks orphaned outside `<main>`, or a smoke script checking only a single `<script>` tag silently break buttons (`document.getElementById` hits the first DOM node) and leak idle animations.
- Every UI gate (`tools/smoke-dashboard.js`, wired into `check.sh` + `check.ps1`) must assert zero duplicate static `id="..."` attributes, `<main>` containment for `#tab-reglages`, valid tags, Inbox-First (`simpleview`) default active on fresh load, and zero-CPU static idle highlights instead of infinite `@keyframes`.

## The explicit-tier failover law (lesson #45 — closed Dual Brain routing, 2026-11-14)
- Relying on regex substring heuristics (`/argon|\bdeep\b/i.test("deepseek-v4-pro")`) or placing rescue only inside `.then()` silently leaves provider errors un-rescued and makes `gemini-4-argon` unreachable.
- Fail over across providers inside `.catch()` when a primary attempt errors in `dual_cloud` mode (`deepseek-flash` → `gemini-3.8-flash`), pass explicit `"rescue"` / `"deep"` tier intent (`gemini-4-argon` / `deepseek-v4-pro`), validate non-JSON responses consistently, and terminate every final `.catch()` with `failToHuman` so tasks never hang in `pending`.
