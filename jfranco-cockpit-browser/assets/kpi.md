# Cockpit Efficiency KPI — the autonomy metric

The question this KPI answers is one sentence:

> **Is the agent doing the work, or handing it back to you?**

## The measure (simple, as requested)

- **More autonomy** → the system works.
- **More human intervention on tasks that could have been automated** → bad
  automation management → the plugin must be refined.

## How it is computed

Every cockpit action is logged with its tier in
`~/.dsh/cockpit-browser/audit.jsonl`. The `/cockpit kpi` command reads that file
and computes:

```
Autonomy (%)            = (GREEN + SEMI-AUTOMATIC) / total
Human intervention (%)   = (RED + YELLOW) / total
```

| Tier | Counts as | Meaning |
|---|---|---|
| GREEN | **Autonomous** | The agent did it alone, it was logged |
| SEMI-AUTOMATIC ⚑ | **Autonomous (verifiable)** | The agent did it, you verify it |
| RED | **Human** | The agent braked and handed you the click |
| YELLOW | **Human** (proposal) | The agent proposed and waited for your decision |

## How to read the verdict

| Autonomy | Verdict | Action |
|---|---|---|
| ≥ 80 % | ✅ The system works | Keep |
| 50–79 % | 🟡 Mixed | Review the handovers to the human |
| < 50 % | 🔧 Refine the plugin | Too much human intervention |

## The distinction that avoids false readings

**A `RED` on a final/legal button is NOT a failure.** Envoyer / Payer / Create /
Authorize / Sign in are, by design, the human's clicks (the constitutional
brake). Those `RED`s are the system **working correctly**.

**A `RED` (or `YELLOW`) on an action that WAS automatable is bad management.**
Examples of a refine signal:

- The brake stops "Create draft" because the `FORBIDDEN` regex includes `create`
  when it should only stop "Create credentials" → **tune the regex** (or
  `/cockpit tier "Create draft" GREEN`).
- The agent proposes (YELLOW) filling a name field when that is SEMI-AUTOMATIC →
  **fix the tier in `tiers.md`**.
- The agent asks to confirm a reversible navigation click → **that step should
  have been GREEN**.

The "Tasks handed to the human" list printed by `/cockpit kpi` is exactly the
material for that refinement: review each label and decide whether the brake was
too strict.

## Closing the loop

The `autonomy-grader` reads the supervision log (where `accountability-auditor`
appends the reports) and proposes tier moves. The cockpit KPI is the raw
material: low autonomy and avoidable handovers feed the "move this tier"
proposal, and the human approves.
