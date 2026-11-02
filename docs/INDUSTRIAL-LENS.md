# The industrial lens — vestigial organs and creative destruction

*Every industrial revolution changed the whole workflow: it eliminated
things that were previously fundamental and created new technology. The
organism must do the same, or it bloats like a body keeping its tail.*

## What each revolution eliminated (and what it created)

| Revolution | Eliminated (previously fundamental) | Created |
|---|---|---|
| 1st — Steam | The artisan's hand-made parts; one boiler per machine | The factory; standardization |
| 2nd — Electricity/assembly line | Line-shaft power (every machine's own engine); hand-fitting | Interchangeable parts; scientific management |
| 3rd — Computers | Typing pools, filing cabinets, draftsmen | ERP, email, CAD |
| 4th — AI (now) | The executor-clerk role: manual transcription, manual classification, manual report writing | **Supervision, verification, decision roles** |

The pattern: each revolution **moved the human from doing to deciding**,
and **removed redundant machinery** in the process.

## Vestigial analysis of our nine organs

The test: *does this plugin describe what the model already does natively?
Does another organ already do this? Does it cost tokens on EVERY request?*

| Plugin | Verdict | Why |
|---|---|---|
| `workflow-master` | ✅ KEEP — the wake/listen discipline + live mirror | Native ability cannot wake itself |
| `decision-router` | ✅ KEEP — the constitution (tiers + human decides) | The product's heart |
| `accountability-auditor` | ✅ KEEP — the verification organ | The 4th-IR role: verify, not do |
| `autonomy-grader` | ✅ KEEP — selection | Becomes the fitness function of evolution |
| `interpreter` | ⚠️ **VESTIGIAL as standalone** — translation is NATIVE to the model now | Its real value is the bilingual *discipline* → fold the protocol into `workflow-master` |
| `input-detector` | ⚠️ **PARTIALLY VESTIGIAL** — splitting multi-requests is increasingly native | Keep only the TRIGGER/sensor protocol → fold into `workflow-master` |
| `cortex` | ⚠️ **REDUNDANT** — the crossed check overlaps the auditor and the router | Keep its two unique rules (decussation, predictive coding) → absorb into `accountability-auditor` |
| `usage-auditor` | ⚠️ **REDUNDANT** with `autonomy-grader` — both read the same logs | Merge into ONE consolidation pass: one read, both outputs |
| `triage` | ⚠️ A *procedure*, not an organ | Fold into the consolidation pass (the audit reads triage.md) |

## The four proposed organs — incorporate, do not spawn

| Proposal | Verdict | Where it lives |
|---|---|---|
| `homeostasis` | ✅ Real gap — but **engineering, not a skill** | The supervisor server (rate limits, budgets, health) + one rule in decisions.md. A plugin would burn tokens regulating itself — friction |
| `hands` | ✅ Real gap — but **an extension, not an organ** | Extend `decision-router`: GREEN execution already lives there; add dry-run and rollback |
| `immune` | ⚠️ **Mostly redundant** — sanitization already exists (XSS), detection overlaps input-detector | Fold the quarantine rule into `input-detector`'s protocol + server hardening |
| `evolution` | ✅ **Genuinely new** — nothing varies today | Extend `autonomy-grader`: variation (mutate rule candidates) + selection (its grades). One evolutionary organ |

## The consolidated organism (v2)

**Five organs, one engine:**

1. `workflow-master` — the senses (listen, detect, trigger, interpret-protocol).
2. `decision-router` — the constitution + the hands (execute GREEN with rollback).
3. `accountability-auditor` — the verification (audit + crossed check + predictive coding).
4. `autonomy-grader` — the evolutionary organ (grade + mutate + select).
5. `audit` — the consolidation (telemetry + triage + marketing intelligence in ONE pass).

**Server-side (not plugins):** homeostasis (budgets, limits, health) and
immune hardening — engineering where it belongs.

## What creative destruction removes

- ❌ `interpreter`, `input-detector`, `cortex`, `triage`, `usage-auditor`
  as **standalone plugins** — their protocols survive, folded into the
  five organs. They remain published on npm as **deprecated vestigial
  organs**: in the genome, not in the active body. Like the appendix —
  kept by evolution, no longer used.

## The cost math (why this matters)

Every plugin adds a skill to EVERY request: tokens, latency, and
attention. Nine verification-ish layers were turning every conversation
into nine readings of the same scene. Five organs read once and act once.
The 2nd revolution removed one boiler per machine; we remove one audit
per audit.

## The invariant

The human moved from doing to deciding in every revolution. The
consolidated organism doubles down: fewer organs, one constitution, one
verification, one evolution — and the human at the helm.
