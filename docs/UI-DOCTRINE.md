# UI-DOCTRINE — the working-alongside interface (2026-11-07)

*The insight: macOS runs its setup wizard on a VIRGIN machine with all
the hardware free. Fanal runs on a BUSY machine — Chrome open, the
browser, the music, the terminal — and must behave like a colleague in
the corner, not like a takeover. The interface must be LIGHT, FAST and
QUIET.*

## The principle

Fanal is an app that works ALONGSIDE everything else. Its interface:
- FAST — instant, no ceremony; every animation is a tax on a busy CPU.
- FOCUSED — one thing at a time: a list + a detail, never a wall of
  fifteen cards as the DEFAULT.
- QUIET — no continuous animations, no fullscreen gradients during
  normal use; the idle CPU cost must be ~0%.
- INCREMENTAL — the user's flow, not a show.

## The reference apps (the ones to study)

| The pattern | The app | What Fanal copies |
|---|---|---|
| The conversation list | Claude Desktop · ChatGPT · WhatsApp | THE WORKER: a list of their open tasks + the conversation + the action buttons. Nothing else. |
| The inbox-first | Gmail · the notifications center | THE OWNER: "3 things need your OK" first; the KPIs; the settings behind a gear. |
| The two panes | DSH itself · Spotify | the sidebar (the day, the reports) + the main pane (the flow). |
| The board | Trello | the orders board and the wall. |
| The list + detail + action | QuickBooks | the reports: a list, one detail at a time. |

## The concrete directions

1. The WORKER = WhatsApp pattern: today's tasks, tap one, talk, done.
2. The OWNER = inbox-first: the decisions queue is the home screen;
   the 15 cards move behind the advanced view (already built — the 👁️).
3. The WIZARD stays a guided flow but LIGHT: no heavy animations, a
   simple card sequence (the one-time moment, not a movie).
4. The zero-CPU rule: the interface idles at ~0%; a UI that slows the
   client's machine is a bug of the same family as the 70B crash.

## The test (updated)

Two questions for every screen: "could the owner explain it in one
sentence?" AND "does it cost zero CPU when idle?" A screen that fails
either is not finished.

## The four usability metrics (Argon's answer, adopted — 2026-11-07)

Measured by the founder with a stopwatch and the Activity Monitor:

1. **Time-To-First-OK** — from the first click to the first signed
   exception: target UNDER 6 seconds.
2. **The 380-pixel stress test** — Fanal docked as a 380px strip while
   Excel/Chrome stays open: zero horizontal scrollbars, zero cut text.
3. **The parasite check** — after 10 s of inactivity: 0.0% CPU / 0.0%
   GPU on the Fanal renderer process.
4. **The owner's exit speed** — the good inbox sends the owner back to
   work fast: 3 signatures in 18 seconds, not 3 minutes of searching.

## The five light rules (the complete constitution)

1. The one-sentence test per screen.
2. Zero CPU / zero GPU at rest.
3. The 380-420px side-strip rule (Fanal docks at the edge).
4. GREEN silence (management by exception: only YELLOW/RED get space).
5. The 1-key/1-click law (no modals over modals).

## The auto-extensible scaffolding (Argon's prompt-7 answer, adopted)

The golden rule (the law of the scaffold that dissolves): TEACHING IS
FORBIDDEN WHEN THE HUMAN IS BUSY; teaching is MANDATORY when the inbox
is empty or a capability is used for the first time — and every
explanation self-destructs after the third successful use.

- The empty inbox IS the discovery menu: 2 capability cards, one line
  each, one click to try (never the 15 branches at once).
- The SEMI school: a new capability shows its receipt for the first 3
  uses ("Mostrado para que veas cómo trabaja (2/3)"), then graduates to
  silent GREEN.
- The pedagogical semaphore: every color speaks the 3-block formula —
  who acted + which rule was kept + why you intervene or not — with the
  BENEFIT names, never the internal architecture (no Ollama, no TFEP,
  no "velo regex": say "Escudo de Datos", "Cerebro Local Privado").
- Zero noise when work is queued (pending > 0): the pedagogy switches
  off at 100%.
