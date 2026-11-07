# DEV-METHODOLOGY — the wash order (how to build a Fanal, learned from our own scars)

*The car-wash rule: the dirt from the top dirties the bottom. The order
matters. This is the order that the session's errors PROVED, written as
the constitution for every future Trasunto product. 2026-11-07.*

## The order (top to bottom — never inverted)

1. **THE DOCTRINE FIRST** — the rules before the code: the semáforo,
   the human-in-the-loop, the sovereignty (the client's key, the two
   worlds), the traffic-light naming. Everything built later must obey
   them; a feature that contradicts the doctrine is not built.
2. **THE DATA MODEL** — what lives where: the silo, the tasks and
   their lifecycle, the sessions, the constitution and the memory. The
   schema is decided BEFORE the endpoints.
3. **THE BRAIN** — the server: the routes, the router, the
   deterministic cages — and THE GATES GROW WITH EVERY FEATURE (check.sh
   from day one, not day ninety).
4. **THE FACE** — the interface, with the ONE-SENTENCE TEST on every
   screen from the first pixel ("could the owner explain it to their
   employee in one sentence?").
5. **THE PACKAGING** — the bundle and the installers, with the
   HEART-TRAVELS check (every piece travels, verified inside the asar).
6. **THE BUSINESS LAYER** — the documents, the plan, the legal — kept
   in sync with the code, never after.

## The transversal rules (what the errors taught)

- **Never string-patch a monolith.** Most of this session's bugs came
  from editing one big file by matching text anchors. The next product
  splits the modules small and tests each piece (the open-source
  universal way).
- **Preflight before every external touch.** Hardware (the 70B-on-8GB
  crash), network (the local-brain wiring), providers (the payloads):
  measure, then act — one heavy operation per turn.
- **The human's time is the KPI.** A screen that makes the human think
  is a bug, not a feature. The auto-NO, the magic button, the closing
  question — everything exists to shrink the human's touches.
- **Demand decides the order of the hardening.** The core loop first,
  the validation with a real client, THEN the armor (signing, scale,
  the store).
- **Every error becomes a lesson and a guard.** The Ledger + the gates:
  a failure that can happen twice was not understood once.

## The honest self-verdict on the current interface

The flows work (the gates pass, the demo is live, the .dmg carries
everything). The polish is UNEVEN: the wizard and the panel are clean;
the Réglages still show advanced fields next to the magic button, and
some labels remain English. The interface is a WORKING PROTOTYPE — the
next phase is the usability sprint: one screen per day, the
one-sentence test, until every screen passes it.
