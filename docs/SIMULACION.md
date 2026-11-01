# Simulation Record — J.Franco Agentic Workflow Suite

Simulation performed on 2026-11-01 with the four plugins of the suite:
`workflow-master`, `input-detector`, `decision-router`,
`accountability-auditor`.

## The verified clue (how listening starts)

1. Open a **New Session** in DeepSeek Harness.
2. Give the clue — any of:
   - type `/listen`, **or**
   - say or type **"listen"** / **"escucha"**, **or**
   - on voice-first variants, the wake phrase **"DSH, escucha"** / **"DSH,
     listen"**, **or**
   - touch the **workflow-master** skill in the skills panel, **or**
   - simply start relaying a conversation.
3. The agent confirms: **"Listening — go ahead."** From that moment it only
   listens, it does not act.
4. Relay the conversation (voice transcription is experimental but already
   enabled in the profile).
5. Say **"eso es todo"** / **"that's all"** to close the listening.
6. The agent presents the **workflow plan** (actions split by tier).
7. It executes automatic actions, presents proposals, asks questions, and
   closes with the **accountability report**. The human verifies and decides.

## Scenario 1 — Hotel receptionist (check-in)

- Clue: New Session → `/listen` → guest speaks → "eso es todo".
- Detected actions: reservation lookup (GREEN), note phone number (GREEN),
  room change with rate difference (YELLOW), complete check-in (YELLOW).
- Flow: lookups and notes run automatically and are logged; the room change
  and the check-in wait for the receptionist's authorization.
- Close: key delivered → report → workflow closed.

## Scenario 2 — Restaurant waiter (tablet)

- Clue: `/listen` on the tablet before approaching the table.
- Detected actions: note the order with cooking points (GREEN), allergy flag
  on every dish (SEMI-AUTOMATIC — flagged for mandatory verification), send
  order to kitchen (YELLOW), wine pairing and split-bill suggestions
  (YELLOW).
- Close: order sent after approval; bill calculation left ready.

## Scenario 3 — Police officer (earpiece, future camera)

- Clue: wake phrase "DSH, escucha" via earpiece, or `/listen`; future:
  physical button.
- Detected actions: ID lookup in the police database (GREEN, read-only),
  capture the third party's statement (GREEN, attributed to the speaker),
  legal analysis with laws verified (YELLOW — advice, the officer decides),
  anything touching the person's rights (RED), sensor alerts (TRIGGER).
- Advisory mode: answers in two short speakable lines, marked URGENT/INFO.
- Close: official report ready for the record.

## Gaps and roadmap

| Gap | Roadmap |
|---|---|
| Always-on wake phrase / physical button | Future device variant; the suite's logic is ready today |
| Live continuous audio, cameras, glasses, voice/facial analysis | Future hardware; TRIGGER inputs are already classified |
| Specialized app connectors (PMS, POS, police DB) | Connector plugins per app; the tier logic applies unchanged |
| Live multi-speaker separation | Future variant; today attribution is by relay, with one clarifying question |

## Domain policy templates

Ready-to-copy training files:

- [`decisions-hotel.md`](decisions-hotel.md)
- [`decisions-restaurant.md`](decisions-restaurant.md)
- [`decisions-police.md`](decisions-police.md)

Copy the one you need to `decisions.md` (workspace root, `.dsh/decisions.md`,
or `~/.dsh/decisions.md`) and adjust it to your real rules.
