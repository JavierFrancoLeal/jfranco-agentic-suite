# Autonomy Grader

The governance layer of the J.Franco agentic workflow: it measures how much
the AI can be trusted with automatic decisions, and proposes how to adjust
the tiers. The human approves every change — the grader never changes the
rules itself.

`Input → Detection (AI + human) → AI processes, decides, and proposes → Human reflects, verifies, and decides → Output`

## Purpose

Over time, the supervision log accumulates evidence: which GREEN and
SEMI-AUTOMATIC actions ran clean, which ones the human corrected, and which
ones failed. The grader turns that evidence into trust grades and proposes
tier moves:

- reliable patterns → candidates to move from YELLOW to GREEN (more
  autonomy);
- unreliable patterns → candidates to move back to YELLOW or RED (more
  control).

## When to run

- The human asks: "grade", "how autonomous is it?", `/grade`, or invokes
  this skill.
- After a review session over the supervision log.
- Before expanding a pilot to more positions.

## Data source

Read the supervision trail in this order:

1. `supervision.md` in the workspace root
2. `.dsh/supervision.md` in the workspace
3. `~/.dsh/supervision.md`
4. the current session's accountability reports, if no file exists

If no data exists, say so and stop: the grader never invents evidence.

## Procedure

1. **Collect.** Read every entry: inputs, decisions with tiers, automatic
   actions, verifications, corrections, and gaps.
2. **Group.** Group the evidence by action pattern (for example "note a
   client's phone number", "send an order to the kitchen").
3. **Count per pattern:** samples (executions), verified OK, corrected by the
   human, and errors or gaps found.
4. **Score** the pattern:

   - **A** — at least 10 samples, ≥ 95% verified OK, no errors.
   - **B** — at least 5 samples, ≥ 85% verified OK, no serious errors.
   - **C** — fewer samples, or 70–85% OK, or minor corrections.
   - **D** — below 70% OK, or any serious error (wrong data, wrong place,
     missed safety flag).

5. **Suggest a tier move** for each pattern:

   - **A** → propose moving the pattern to GREEN (or keeping it GREEN),
     quoting the exact `decisions.md` line.
   - **B** → keep as is; keep watching.
   - **C** → keep YELLOW (or return to YELLOW); more samples needed.
   - **D** → propose moving back to YELLOW or RED immediately.

6. **Overall autonomy level** for the domain, from 1 (least) to 5 (most):

   - 5: every pattern graded A with at least 10 samples.
   - 4: at least 70% of patterns graded A, the rest B.
   - 3: a mix of A, B, and C.
   - 2: mostly C, or any D without harm.
   - 1: any serious error, or a D pattern touching safety or money.

## Autonomy Report

Deliver this compact report:

- **Evidence:** the patterns analyzed and the samples per pattern.
- **Grades:** a table — pattern, samples, OK, corrected, errors, grade.
- **Proposed moves:** each suggestion as the exact `decisions.md` line to add
  or change, with the evidence that justifies it.
- **Autonomy level:** the overall level and what it means.
- **No move is automatic:** the human edits `decisions.md`; the grader only
  proposes.

## Worked example

The log says: "noted client phone numbers" ran 25 times, verified OK 24, one
correction (wrong field); "sent order to kitchen" 12 times, all OK; "loan
quote" always proposed (YELLOW), 8 approvals.

- note phone numbers: B (24/25) → keep GREEN, watch the wrong-field error.
- send order to kitchen: A (12/12) → propose moving it to GREEN.
- loan quote: C (8 samples, still YELLOW) → keep YELLOW; revisit at 20.

## Rules

- The grader proposes; the human decides. It never edits `decisions.md`.
- Small samples never justify more autonomy: C stays C.
- Any error touching safety, credentials, or money resets the pattern to
  YELLOW or RED and lowers the overall level to 1.
- Grades quote evidence; nothing is estimated or invented.
