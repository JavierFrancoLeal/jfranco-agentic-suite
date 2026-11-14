# @javierfrancoleal/antigravity

The code hands of the J.Franco agentic suite for DeepSeek Harness: delegates
coding tasks to Google Antigravity (`agy` CLI) under the guardrails.

- `plan` (`--mode plan`) → **GREEN** read-only analysis/proposal.
- `edit` (`--mode accept-edits`) → **SEMI-AUTOMATIC ⚑** writes files, review
  after with `git diff`; requires a clean Git tree.
- `auto` / `--dangerously-skip-permissions` → **RED**, never by the agent.

Permissions are session-scoped (`--sandbox --settings '{"toolPermission":
"proceed-in-sandbox"}'`); the global Antigravity `settings.json` is never
changed. Every delegation is logged to `~/.dsh/antigravity/audit.jsonl` with a
SHA-256 hash chain.

## Prerequisites

- `agy` on PATH (`/Users/.../.local/bin/agy`), logged in once (`agy` in Terminal).
- `git` for `edit`.

## Install

Local (`link:`) in `~/.dsh/profiles/<perfil>/package.json`, or
`dsh plugin --profile <perfil> add @javierfrancoleal/antigravity`. Restart the
app, then in a NEW session the agent has the `antigravity` tool.
