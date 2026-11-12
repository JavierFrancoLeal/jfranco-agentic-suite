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
