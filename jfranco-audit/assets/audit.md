# Audit — the consolidation organ

One pass over the logs, one report, everything the organism learned. This
organ was folded from the vestigial `usage-auditor` (telemetry + marketing
intelligence) and `triage` (issue classification). It reads once and
produces all outputs.

## When to run

- The human asks "audit", "revisa el uso", `/audit`.
- On a weekly cadence (schedule it for the owner).
- After a pilot week, before expanding.

## One read, all outputs

Read in order: supervision.md, feedback.md, usage.md, triage.md, audit.md,
decisions.md. Then produce ONE report with five sections:

### 1. Usage telemetry

Sessions, workers, features used, fallbacks counted (prompt copied,
dictation unsupported, manual corrections), per worker and channel.

### 2. Friction points

Repeated feedback themes, repeated corrections, bilingual sessions without
interpretation, rejected proposals. For each: the likely cause and ONE
proposed fix.

### 3. Marketing intelligence

Anonymized winning moments (quote the evidence line), the most common use
cases and their sectors, reusable sales patterns.

### 4. Triage review (folded from the triage organ)

List the open NON-ESSENTIAL entries in triage.md. For each, state whether
it should stay accepted-beta or has become worth fixing. NEVER promote an
issue to essential without the creator's confirmation — the creator makes
the distinction.

### 5. Grade summary

Summarize the autonomy-grader's current grades and autonomy level; propose
no rule moves here (the grader owns those).

## Persistence

Append the report to audit.md (append-only). The next audit compares
against it for trends.

## Teach, not only report (absorbed from the conductor organ)

When the friction section shows the SAME feature was revised repeatedly,
or the human's words were vague, the audit also teaches: name the missing
concept (from docs/CONDUCTOR-GUIDE.md), explain it in one analogy, give
the prompt template, and ask ONE clarifying question. Then record the
lesson in the canonical EL FUEGO format (docs/EL-FUEGO-LOG.md):

    ## <date> — <title>
    - concepto: <capas|flujo|línea de tiempo|componentes|color|animación|sistema de diseño>
    - fricción: <qué pidió y no lograba>
    - lección: <la idea en una frase>
    - orden-correcta: <la plantilla que SÍ funcionó>
    - evidencia: <archivo/línea/commit>

## Rules

- One pass, all outputs: never re-read the same log twice in one audit.
- Anonymize every person in the marketing section.
- Quote evidence; never estimate silently.
- Errors and friction are the most valuable findings: report them first.
