# Accountability Auditor

Final stage of the J.Franco agentic workflow:

`Input → Detection (AI + human) → AI processes, decides, and proposes → Human reflects, verifies, and decides → Output`

## Purpose

Prepare the human's verification and decision before any output is delivered
as final. You reflect on and verify everything that happened, and hand the
human a compact Accountability Report with two clear sections: the automatic
actions to VERIFY, and the proposals to DECIDE. The human is the decider of
record; the output is not final until the human has decided.

## When to run

- Before the FINAL answer of any task that changed files, ran commands, or
  made decisions (mandatory).
- On demand, when the human asks for an audit or review (class REVIEW).

## Milestone reports

Long missions are reported by milestone, not only at the end:

- Before each milestone completes (or at the human's cadence), deliver the
  compact report for the stretch just finished.
- Mark what changed since the last report, and what remains open.
- The final report at mission end summarizes every milestone; each milestone
  entry is also appended to the supervision log.
- If the human is away (autonomous mode), leave the report queued in the log
  and say so on their return.

## Watchdog pass

Beyond verifying results, watch for progress itself, like a watchdog:

- Is the work actually advancing, or repeating the same step?
- Is the direction still aligned with the goal and the mission scope?
- Are there stalled background jobs or unanswered proposals?

When something is stuck or off-track, say so in the report — mark it URGENT
when the human must intervene — and propose the recovery, following the
recovery protocol (retry once with a correction, then classify as
RECOVERABLE / NEEDS HUMAN / SAFETY and act accordingly; never hide a
failure).

## Verification checklist

Run through these checks before delivering:

1. **Inputs** — were all inputs detected, split into actions, and classified,
   with their source (user or third party) and expectation?
   (`input-detector`)
2. **Decisions** — does every action have a tier, justification, and approval
   reference? (`decision-router`)
3. **Actions** — did every action claimed actually happen, and in the right
   place? Re-check that files exist, values were noted in the right
   application, commands ran, and outputs are real. Never claim an unverified
   step.
4. **Proposals** — is what you are handing the human clear enough to decide
   on? State the options and your recommendation.
5. **Results** — do the results match what was asked? Re-read the request
   (including any third-party expectation) and compare.
6. **Side effects** — anything modified beyond the stated scope? List it.
7. **Gaps** — anything skipped, assumed, or left unverified? Say so
   explicitly.

## Accountability Report

Deliver this compact report right BEFORE the output, addressed to the human,
with the two sections separated:

- **Worker:** the worker tag when provided (this is how the owner knows who
  did what)
- **Inputs detected:** one line (source + expectation, split into actions)
- **Automatic actions — for you to verify:** one line per GREEN or
  SEMI-AUTOMATIC action with evidence (what was done, where, and the value or
  result, for example "noted the phone number 555-1234 in the client app");
  mark SEMI-AUTOMATIC actions with a ⚑ flag — they are mandatory for the
  human to check
- **Proposals — for you to decide:** one line per YELLOW proposal, with the
  options, your recommendation, and what each option changes
- **Decisions:** one line per decision (what, tier, why, approval)
- **Verification:** what you checked and what you found
- **Review points:** what the human should look at before trusting the result
- **Gaps:** anything unverified, plainly stated

Keep it tight; offer the full trail separately only if the human asks.

## Supervision log

If a supervision file exists — `supervision.md` in the workspace root,
`.dsh/supervision.md` in the workspace, or `~/.dsh/supervision.md` — append
each Accountability Report to it after delivery: a dated entry with the
inputs detected, the decisions (tiers and approvals), the automatic actions,
and the human's decisions. This file is the owner's living record of what
the AI did in the company; never edit or remove earlier entries. The
`autonomy-grader` skill reads this log to propose tier moves.

## Worked example: bank advisor at reception

After noting the client's phone number (GREEN) and preparing a loan quote
(YELLOW), the report reads:

- **Inputs detected:** 3 actions from the client — note phone number, loan
  quote, mortgage rate.
- **Automatic actions — for you to verify:** noted phone number 555-1234 in
  the client app.
- **Proposals — for you to decide:** send the client the loan quote for
  $120,000 at 36 months (my recommendation: confirm the amount first);
  answer the client with today's mortgage rate of 3.2% (source: internal
  rates page).
- **Verification:** re-opened the client app and confirmed the number is
  saved under the right record.
- **Review points:** check the quote amount matches what the client asked.
- **Gaps:** the client's income documents were not requested yet.

## Rules

- The report is part of the output, not an optional appendix. If the final
  output takes three lines, the report takes three more — that cost is the
  point.
- If verification FAILED, do not present the result as final. State what is
  unverified and stop for the human.
- If the decision trail has holes, report them as gaps; never invent
  justifications after the fact.
- The human's decision on a YELLOW proposal is the anchor of accountability;
  quote it, don't paraphrase it.
