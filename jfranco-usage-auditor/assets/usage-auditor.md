# Usage Auditor

The self-review layer of the J.Franco agentic workflow: it audits how the
suite is used in real life, and proposes improvements. The human approves
every edit — the auditor never changes rules or texts on its own.

`Input → Detection (AI + human) → AI processes, decides, and proposes → Human reflects, verifies, and decides → Output`

## When to run

- The human asks: "audit", "revisa el uso", "how is the system doing",
  `/audit`, or invokes this skill.
- On a weekly cadence (schedule it for the owner).
- After a pilot week, before expanding to more positions.

## Data sources (in order)

1. `supervision.md` (workspace, `.dsh/`, or `~/.dsh/`) — the reports.
2. `feedback.md` — the field feedback queue.
3. `usage.md` — per-session token usage, when reported.
4. `audit.md` — previous audits (append-only, never edited).
5. `decisions.md` — the current rules.

If no data exists, say so and stop: the auditor never invents evidence.

## The audit report (four sections)

### 1. Usage telemetry

- Sessions, workers, and features used: listening mode, interpretation,
  advisory mode, tier decisions (GREEN / SEMI / YELLOW / RED).
- Fallback signals counted: "prompt copied" (supervisor unreachable),
  "dictation not supported" (browser limitation), manual corrections.
- Usage per worker and per channel, when the log records them.

### 2. Friction points

Find where the human struggled or repeated themselves:

- The same feedback theme appearing more than once.
- Corrections on the same action pattern repeatedly.
- Sessions with two languages but no interpretation entries.
- Proposals rejected often — the rules may be too permissive or too strict.

For each friction point, name the likely cause and propose ONE fix.

### 3. Marketing intelligence

From the logs, extract — anonymized, never with personal data:

- Winning moments: cases where the flow clearly saved time or avoided an
  error (quote the evidence line).
- The most common use cases and the sectors they match.
- Patterns the sales team can reuse: "bilingual service", "traceability",
  "the owner sees everything".

### 4. Improvement proposals

Concrete edits, each as a YELLOW proposal with the exact text or diff:

- Skill text changes (for example: auto-invoke the interpreter when a
  second language is detected).
- Panel changes (buttons, defaults, wording).
- decisions.md rule moves (with the grader's evidence).
- Documentation or template updates.

The owner approves each proposal; nothing is applied automatically.

## Interpreter troubleshooting (reference)

| Symptom | Likely cause | Fix to propose |
|---|---|---|
| Two languages in a session, no interpretation | The trigger phrase was missed, or the language was not detected | Propose adding an auto-detect rule to `workflow-master`; meanwhile say "traduce" / "translate" |
| Dictation button disabled | Browser without SpeechRecognition (Firefox) | Use Chrome/Edge; record the browser in telemetry |
| Feedback fell back to "prompt copied" | Supervisor unreachable from the device | Start the supervisor with `--lan`; count these fallbacks in telemetry |
| Read-aloud silent | Speech synthesis needs a user gesture first | Tap the button again after touching the page |

## Persistence

Append the audit report to `audit.md` (workspace, `.dsh/`, or `~/.dsh/`)
with a dated entry. The next audit compares against it to show trends.

## Rules

- Propose, never auto-edit rules, skills, or templates.
- Anonymize every person in the marketing section.
- Quote evidence lines; never estimate silently.
- Errors and friction are the most valuable findings: report them first.
