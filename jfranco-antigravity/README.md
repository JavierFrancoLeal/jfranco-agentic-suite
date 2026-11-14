# @javierfrancoleal/antigravity

The code hands of the J.Franco agentic suite for DeepSeek Harness: delegates
coding tasks to Google Antigravity (`agy` CLI) under the guardrails.

- `plan` (`--mode plan`) → **GREEN** read-only analysis/proposal.
- `edit` (`--mode accept-edits`) → **SEMI-AUTOMATIC ⚑** writes files, review
  after with `git diff`; requires a clean Git tree.
- `audit` (`--mode plan`) → **GREEN** cross-review of the uncommitted `git diff`.
- `auto` / `--dangerously-skip-permissions` → **RED**, never by the agent.

Options: `effort` (`low`…`max`, default `medium`), `model` (optional override),
and `conversationId` (resume a previous Antigravity conversation via
`--conversation`).

Permissions are session-scoped (`--sandbox --settings '{"toolPermission":
"proceed-in-sandbox"}'`); the global Antigravity `settings.json` is never
changed. `edit` enforces the active ledger's `DISK_LOCK` (refuses when GEMINI
holds it) and serializes concurrent edits with an exclusive lockfile. Every
delegation is logged to `~/.dsh/antigravity/audit.jsonl` with a SHA-256 hash
chain: a `phase: "start"` entry plus a post-execution `phase: "end"` entry
(`antigravity_result`) recording `status`, `conversationId`, `durationSeconds`,
and `deniedCount` (edit adds `ledgerLock`).

## Prerequisites

- `agy` on PATH (`/Users/.../.local/bin/agy`), logged in once (`agy` in Terminal).
- `git` for `edit`/`audit`.

## Install

Local (`link:`) in `~/.dsh/profiles/<perfil>/package.json`, or
`dsh plugin --profile <perfil> add @javierfrancoleal/antigravity`. Restart the
app, then in a NEW session the agent has the `antigravity` tool.
