# 🔥 KNOWLEDGE LEDGER — the J.Franco standard for human-AI knowledge transfer

*Version 1.2 · 2026-11-03 · Author: J.Franco*

**The purpose:** to pass on the knowledge of the wheel and the knowledge to the
next generations — so nobody wastes time investigating what was already
solved.

**The problem it solves:** the human directs with plain words (vibe
coding); the AI executes. When vocabulary is missing, friction appears:
repeated revisions, "it doesn't work", frustration, walls. This standard
turns EVERY friction event into a permanent lesson — and makes the lesson
transmit itself.

## The three pillars

| Pillar | What it is | Artifact |
|---|---|---|
| 📖 **The Manual** | The 7 basic concepts for giving orders (layers, flow, timeline, components, color, animation, design system) + the master prompt template | `docs/CONDUCTOR-GUIDE.md` (in the creator's language) |
| 🎻 **The Teacher** | The `audit` organ — when it reviews friction, it TEACHES the missing word and records the lesson in the canonical format | behavior of the `audit` organ (`/audit`) |
| 🦴 **The Archaeologist** | Reconstructs how and why the code was made: strata → trace → fossil record → plain-language dossier | organ `forensics` (`/forensics`) |

## The loop (how the knowledge flows)

```
The user hits a wall (friction)
   ↓
The audit organ detects it and teaches ONE concept (≤150 words)
   ↓
The user gives the correct order (master template)
   ↓
The lesson is RECORDED (append-only: LEARNINGS.md · triage.md · audit.md · KNOWLEDGE-LEDGER-LOG.md)
   ↓
The archaeologist retrieves it for whoever arrives later
   ↓
Nobody re-discovers the wheel. 🔄
```

## The record — the canonical knowledge format

Every lesson must be appended (never edited) in this format, so the
archaeologist can read it centuries later:

```
## <YYYY-MM-DD> — <one-line title>
- concept: <layers | flow | timeline | components | color | animation | design system>
- friction: <what the user asked for and could not achieve>
- lesson: <the idea in one sentence, in plain language>
- correct-order: <the template that DID work>
- evidence: <file/line/commit that proves it>
```

## The two principles of inspiration

1. **Adopt the FULL logic of the idea you borrow, not its surface.** When
   we borrowed Apple's language flow, we adopted its whole objective: the
   language is declared ONCE, and from then on EVERYTHING — text, voice,
   speech recognition — works in that language. The only exception is when
   the user says otherwise.
2. **Not every idea is an organ.** Before creating a new plugin, ask
   whether an existing organ already breathes that function (the industrial
   lens applied to our own ideas).
3. **A scene change is never a gap — it is the boot screen.** Whenever
   the app needs time for a transition (language choice, login, logout,
   scene switches), it shows the animated logo with the phrase. No screen
   may ever appear empty while the system works.

## Language policy of the standard

Everything shared with the internet, the community, and the world is
written in **English** — for readability and adoption. Content used only
locally by the creator stays in the creator's language.

## How to apply Knowledge Ledger in ANY project (checklist)

1. Create `LEARNINGS.md` (append-only) — the archaeological site.
2. Install the organs (`audit` teaches; `forensics` excavates) in the DSH profile.
3. Hand the Manual to the human director (7 concepts, one page).
4. At every friction event: micro-lesson + record in the canonical format.
5. At every "how was this made?": `/forensics <feature>` — the dossier
   turns foreign code into an owned asset.

## The promise of the standard

> **Whoever arrives after us will find: the manual (how to ask), the
> teacher (who teaches), the archaeologist (who explains), and the record
> (the memory). They will not start from zero — they will inherit the
> knowledge.** 🔥

## The lineage (why it works)

This standard is not theory: it was born from ONE real session where every
error was recorded, every lesson was learned, and every solution became
code. The first generation to apply it is also its proof of knowledge.
