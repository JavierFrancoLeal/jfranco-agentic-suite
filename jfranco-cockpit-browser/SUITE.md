# Cockpit Browser Suite — the full automation kit with guardrails

`@javierfrancoleal/cockpit-browser` **does not work alone**. It is the *hands*
organ of the J.Franco ecosystem: it gives the DeepSeek Harness agent a real
Chromium browser it can operate. But **without the guardrails**, those hands
would be dangerous. This document is the map of the full kit: what to install,
in what order, and how the work is split across the organs.

## The idea in one sentence

> The cockpit **executes**; the governance organs **decide, verify, and grade**.
> Hands and conscience are two separate plugins on purpose.

## The kit (the 7 organs)

| Organ | Role | What it contributes to the cockpit |
|---|---|---|
| **`workflow-master`** | Listening (trigger) | Turns your spoken/written request into discrete actions |
| **`input-detector`** | Detection | Classifies each input (user or third party) and its expectation |
| **`decision-router`** | Decision | Assigns the tier (GREEN / SEMI-AUTOMATIC ⚑ / YELLOW / RED) **before** acting |
| **`cockpit-browser`** | **Hands** | Executes in the browser: open, read, fill, click, capture — with brake, emerald border, and HUD |
| **`accountability-auditor`** | Verification | Consumes the trail and delivers the two-section Accountability Report |
| **`autonomy-grader`** | Grading | Reads the supervision log and grades decision reliability (A/B/C/D, level 1–5) |
| **`audit`** | Consolidation | One pass over the logs produces telemetry, friction points, and the summary |

**Flow:** `workflow-master` listens → `input-detector` detects →
`decision-router` assigns tiers → **`cockpit-browser` executes** (GREEN/⚑, brakes
on RED) → `accountability-auditor` verifies and reports → `autonomy-grader`
grades → `audit` consolidates.

## Install (full kit, in order)

```bash
# 1. The governance guardrails
dsh plugin --profile <profile> add @javierfrancoleal/workflow-master
dsh plugin --profile <profile> add @javierfrancoleal/input-detector
dsh plugin --profile <profile> add @javierfrancoleal/decision-router
dsh plugin --profile <profile> add @javierfrancoleal/accountability-auditor
dsh plugin --profile <profile> add @javierfrancoleal/autonomy-grader
dsh plugin --profile <profile> add @javierfrancoleal/audit

# 2. The hands (this plugin)
dsh plugin --profile <profile> add @javierfrancoleal/cockpit-browser

# 3. Restart the app (a new bundle needs a host recomposition)
```

**External requirement:** a Chromium-based browser (Chrome / Edge / Chromium /
Brave). Optional config via environment variables: `COCKPIT_CHROME`,
`COCKPIT_PORT`, `COCKPIT_PROFILE`, `COCKPIT_TIERS`.

## How to measure efficiency (KPI)

The cockpit logs every action with its tier in
`~/.dsh/cockpit-browser/audit.jsonl`. The **`/cockpit kpi`** command computes
the central metric:

- **Autonomy** = `GREEN + SEMI-AUTOMATIC` over the total → *more autonomy = the
  system works*.
- **Human intervention** = `RED + YELLOW` over the total → *more intervention on
  tasks that could have been automated = poor performance, refine the plugin*.

A `RED` on a final/legal button (Envoyer/Payer/Create/Sign in) is **correct by
design** — the legal click is the human's. A `RED` (or `YELLOW`) on an action
that could have been automated is the signal to **refine** the `FORBIDDEN` regex
or the tier — via `/cockpit tier "pattern" <tier>`. See
[`assets/kpi.md`](assets/kpi.md) for the full methodology.

## Why they are separate (and not a monolith)

- **Hands do not decide.** The cockpit executes what the tier allows; the
  `decision-router` and the human set the tier. A browser failure cannot bypass
  governance.
- **Verification is independent.** The hemisphere that proposes is never the one
  that verifies: `accountability-auditor` and `autonomy-grader` are distinct from
  the executor.
- **Each organ refines alone.** If the cockpit brake misfires, you tune the
  `FORBIDDEN` regex (or `tiers.md`) without touching governance; if governance is
  lax, you tune `decisions.md` without touching the browser.

## The kit's files

- [`assets/cockpit-browser.md`](assets/cockpit-browser.md) — the skill that teaches the agent to use the cockpit with tiers.
- [`assets/commands.md`](assets/commands.md) — the command reference.
- [`assets/kpi.md`](assets/kpi.md) — the KPI methodology.
- [`README.md`](README.md) — summary and install.
