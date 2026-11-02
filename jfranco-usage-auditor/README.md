---
description: "Self-review layer: audits real-life usage and proposes improvements — telemetry, friction, marketing intelligence. The human approves."
kind: "package-bundle"
---

# @javierfrancoleal/usage-auditor

Created by **J.Franco**.

## Summary

The self-review layer of the J.Franco agentic workflow. In real life,
things break in ways no test predicts — the interpreter does not trigger,
the tablet cannot reach the server, the rules are too strict. The
usage-auditor reviews the logs (supervision, feedback, usage, previous
audits) and delivers:

- **Usage telemetry** — features used, fallbacks counted, per-worker and
  per-channel activity.
- **Friction points** — repeated feedback themes, repeated corrections,
  bilingual sessions without interpretation, rejected proposals.
- **Marketing intelligence** — anonymized winning moments, common use
  cases, reusable sales patterns.
- **Improvement proposals** — concrete edits (skills, panel, rules, docs)
  with exact text, each waiting for the owner's approval.

## Use this plugin

Enable **Usage Auditor** in Plugins, then ask "audit" or use `/audit` — in a
session, or scheduled weekly. The report is appended to `audit.md`, so every
audit builds on the previous one.

## How it works

- [`lib/index.js`](lib/index.js) registers the `usage-auditor` skill
  provider on `ctx.skills` and, when the host command registry resolves, the
  `/audit` command.
- [`assets/usage-auditor.md`](assets/usage-auditor.md) holds the audit
  protocol.
- [`cordis.patch.yml`](cordis.patch.yml) inserts the provider row into the
  host plane of the Cordis tree.

## License

MIT — see the package license field.
