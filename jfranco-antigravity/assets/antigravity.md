# Antigravity — the code hands

Delegate coding tasks from DeepSeek Harness to Google Antigravity (the `agy`
CLI) under the J.Franco guardrails. One brain (DSH), Gemini as the code hands,
the human signs.

## The tool

The agent calls `antigravity` with an `action`:

| Action | `agy` mode | Tier | Behavior |
|---|---|---|---|
| `plan` | `--mode plan` | **GREEN** | Read-only analysis/proposal. Never touches files. |
| `edit` | `--mode accept-edits` | **SEMI-AUTOMATIC ⚑** | Writes files. Review AFTER with `git diff`. Requires a clean Git tree. |
| `audit` | `--mode plan` | **GREEN** | Cross-reviews the uncommitted `git diff` (bugs / hallucinated APIs / over-engineering). |
| *(not exposed)* | `--mode auto` / `--dangerously-skip-permissions` | **RED** | Never by the agent — the human runs those directly. |

Parameters: `action`, `prompt`, `cwd` (must be a Git repo for `edit`/`audit`),
`effort` (`low`/`medium`/`high`/`xhigh`/`max`; lower = faster, `medium` default),
`model` (optional override, e.g. a Gemini Hydrogen/Argon id).

## Safety

- Permissions are **session-scoped**: every call runs `agy` with
  `--sandbox --settings '{"toolPermission":"proceed-in-sandbox"}'`, so the
  user's global `~/.gemini/antigravity-cli/settings.json` is never changed.
- `edit` refuses unless the Git tree is clean, so `git diff` afterwards shows
  exactly what Antigravity changed.
- Every delegation is logged to `~/.dsh/antigravity/audit.jsonl` with a
  SHA-256 hash chain (tamper-evident), for `accountability-auditor` and
  `autonomy-grader`.

## Working pattern

1. `plan` first — get a proposal without touching files.
2. Review the plan with the human.
3. `edit` only in a Git repo with a clean tree — then review `git diff`.

The committing/irreversible step is always the human's. The agent fills and
plans; the human signs.
