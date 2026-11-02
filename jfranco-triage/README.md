---
description: "The creator's issue-triage layer: essential bugs fixed now, non-essential accepted in Beta. The creator decides."
kind: "package-bundle"
---

# @javierfrancoleal/triage

Created by **J.Franco**.

## Summary

In Beta, with a small supervised group in the field, not every defect
deserves to stop the flow. The triage skill formalizes the creator's rule:

- **ESSENTIAL** — blocks the core flow (login, listen, summary, confirm,
  orders, telemetry): fix now.
- **NON-ESSENTIAL** — cosmetic, animation, polish: record in `triage.md`
  and accept for Beta. The essential workflow keeps moving.
- **NICE-TO-HAVE** — ideas: record, never occupy the cycle.

Only the creator moves an issue between classes. Every accepted bug is
written down — nothing hidden, nothing lost.

## Use this plugin

Ask "triage" or use `/triage <description>` in a session. The record lives
in `triage.md` (workspace, `.dsh/`, or `~/.dsh/`).

## How it works

- [`lib/index.js`](lib/index.js) registers the `triage` skill provider and
  the `/triage` command.
- [`assets/triage.md`](assets/triage.md) holds the protocol.
- [`cordis.patch.yml`](cordis.patch.yml) inserts the provider row.

## License

MIT — see the package license field.
