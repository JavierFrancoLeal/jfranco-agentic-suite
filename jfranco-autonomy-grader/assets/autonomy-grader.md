# Autonomy Grader

The governance layer of the J.Franco agentic workflow: it measures how much
the AI can be trusted with automatic decisions, and proposes how to adjust
the tiers. The human approves every change — the grader never changes the
rules itself.

`Input → Detection (AI + human) → AI processes, decides, and proposes → Human reflects, verifies, and decides → Output`

## Evolution (variation + selection)

The grader is the fitness function; add the variation:

- When a tier has been stable for a while, propose 1-2 CANDIDATE rule
  mutations (small changes to decisions.md) as YELLOW proposals.
- Let the next cycle's grades score the candidates; keep winners, discard
  the rest — with the owner's approval, as always.
- Never mutate more than one rule at a time: evolution is incremental.

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
   client's phone number", "send an order to the kitchen") — and, when the
   log records them, also by channel (voice, chat, camera), by mission, and
   by worker (worker tags come from the panel or the session identity).
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
- **Mission and channel grades:** the same A/B/C/D applied per channel and
  per mission, when the log allows it.
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

## Management Summary (for owners)

When the human asks for a "summary", "resumen", "weekly report", or invokes
`/summary`, produce the one-page management report instead of the full
grading:

- **Period:** the dates covered.
- **Totals:** sessions, automatic actions (GREEN + SEMI-AUTOMATIC),
  proposals (approved / adjusted / rejected), corrections, and errors.
- **Per worker:** one row each — sessions, automatic actions, approval rate,
  corrections, autonomy level, and one line on what that worker could
  improve.
- **Sector KPIs:** computed from the log using the KPI definition file when
  present (`kpi.md` in the workspace, `.dsh/kpi.md`, or `~/.dsh/kpi.md`);
  otherwise show the generic KPIs (autonomy level, approval rate,
  correction rate, error rate).
- **Suggestions:** the top three improvements, each tied to evidence from
  the log.
- **Plain language:** the summary must be readable by a non-technical owner.

## Sector KPIs

A KPI definition file maps business metrics to log evidence. Generic KPIs
are always available:

- Autonomy level (1–5)
- Proposal approval rate (approved / proposals)
- Correction rate (corrections / automatic actions)
- Error rate (errors / automatic actions)
- Interpretation sessions (translated conversations)

Sector-specific templates live in `docs/` (for example `kpi-restaurant.md`
measures service speed through log timestamps; a hotel measures check-in
time; a clinic measures appointment handling). When a `kpi.md` file exists,
follow it and report each KPI with its value and its trend.

## Accept modes

Every pattern also gets an accept mode, mirroring the super-agent's
observe/propose/execute ladder:

- **OBSERVE** — the pattern is only logged, never executed (new or risky).
- **PROPOSE** — executed only as a proposal the human approves.
- **EXECUTE** — executed automatically (GREEN) with verification flags.

Propose moves between modes with the same evidence rules as tier moves.

## Developing sector KPIs

When the owner wants their own metrics, co-develop them in three steps:

1. Ask what the business measures and what hurts (for example waiting
   time).
2. Map each metric to evidence the log can provide (timestamps, decisions,
   counts).
3. Write the KPI file (`kpi.md`) as a table — KPI | definition | evidence —
   and from then on the Management Summary reports them with trends.

## Rules

- The grader proposes; the human decides. It never edits `decisions.md`.
- Small samples never justify more autonomy: C stays C.
- Any error touching safety, credentials, or money resets the pattern to
  YELLOW or RED and lowers the overall level to 1.
- Grades quote evidence; nothing is estimated or invented.
