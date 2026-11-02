# Issue Triage

The creator's rule for keeping the essential flow moving while the product
matures. Beta and field tests exist precisely so non-essential defects can
be seen, recorded, and deferred — deliberately, not silently.

## Severity classes

### 🔴 ESSENTIAL — fix now

Blocks the core flow. Nothing else matters until it is fixed:

- Login / accounts (nobody can enter).
- The live flow (START → listening → per-person summary → confirm).
- Orders routing (kitchen/central never receive the confirmed work).
- Telemetry and reports (the owner loses the record).
- Data loss or security.

### 🟡 NON-ESSENTIAL — record and accept in Beta

Does not block the core flow. It may stay open for the current version:

- Cosmetic and animation glitches (a carousel that jumps, a shadow that
  flickers).
- Polish and micro-copy.
- Edge-case layout issues on rare screens.
- Performance jank that does not interrupt a task.

Rule: in Beta, tested on the field by a small group under supervision,
these are **accepted and recorded**, not chased. The essential workflow is
the priority; the rest waits for the polish phase.

### 🔵 NICE-TO-HAVE — ideas

Record it. Never let it occupy the current cycle.

## The creator decides

Only the creator of the software (J.Franco) moves an issue between
classes. When the agent classifies, it PROPOSES; the creator CONFIRMS.
This matches the whole workflow: the AI works and proposes; the human
decides.

## The record — triage.md

Search in order: `<workspace>/triage.md`, `.dsh/triage.md`,
`~/.dsh/triage.md`. Append every entry with:

```
## <YYYY-MM-DD> — <short title>
- class: ESSENTIAL | NON-ESSENTIAL | NICE-TO-HAVE
- status: open | accepted-beta | fixed | wontfix
- decision: <who decided and why>
- notes: <repro steps, context>
```

Never edit old entries: append only (the history is evidence for the
`usage-auditor` and the `autonomy-grader`).

## Workflow

1. A bug appears → `/triage <description>` (or mention "triage").
2. The agent classifies it and proposes the class.
3. The creator confirms or reclassifies.
4. ESSENTIAL → fix now. NON-ESSENTIAL → mark `accepted-beta`, move on.
5. Weekly: `/triage review` lists open NON-ESSENTIAL entries so the
   creator can schedule the polish phase when the essential flow is calm.

## What this protects

- Momentum: essential work never waits behind cosmetic defects.
- Honesty: every accepted bug is written down — nothing is hidden.
- Discipline: the polish phase happens when the creator decides, not when
  a random glitch demands attention.
