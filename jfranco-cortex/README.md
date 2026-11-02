---
description: "The nature-inspired layer: two hemispheres, crossed verification, predictive coding, reflex-vs-cortex tiers."
kind: "package-bundle"
---

# @javierfrancoleal/cortex

Created by **J.Franco**.

## Summary

The human brain as a plugin. The agent runs in two hemispheres (Executor +
Watcher), applies **crossed verification** (the proposer never verifies —
like the right hemisphere controlling the left side of the body), reports
only **surprises** (predictive coding), and treats the traffic light as
the nervous system does: reflexes for GREEN, deliberation for YELLOW.

## Use this plugin

Enable **Cortex** in Plugins, or invoke `/cortex` before a complex task.

## How it works

- [`lib/index.js`](lib/index.js) registers the `cortex` skill provider and
  the `/cortex` command.
- [`assets/cortex.md`](assets/cortex.md) holds the protocol.
- [`cordis.patch.yml`](cordis.patch.yml) inserts the provider row.

## License

MIT — see the package license field.
