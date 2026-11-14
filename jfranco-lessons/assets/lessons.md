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

## The agent-event law (lesson #39 — the payload, not the agent, 2026-11-12 & 2026-11-14)
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
