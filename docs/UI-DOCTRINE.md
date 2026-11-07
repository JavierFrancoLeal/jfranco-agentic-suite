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
