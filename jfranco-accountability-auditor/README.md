---
description: "Mandatory reflection and verification pass that emits an Accountability Report before every final output — stage 3 of the agentic workflow."
kind: "package-bundle"
---

# @javierfrancoleal/accountability-auditor

> ⚡ **Super Agent Ready** — part of the J.Franco governance layer for autonomous agents.

Created by **J.Franco**.

## Summary

Stage 3 of the J.Franco agentic workflow:

`Input → Detection (AI + human) → AI processes, decides, and proposes → Human reflects, verifies, and decides → Output`

This plugin registers the `accountability-auditor` skill on the host skill
registry. The skill teaches the agent to run a mandatory reflection and
verification pass before every final output: audit the input trail
(`input-detector`), the decision trail (`decision-router`), and the actions
taken, then emit a compact Accountability Report the human reviews.

## Use this plugin

In Desktop, open **Plugins** and enable **Accountability Auditor**. The skill
appears in the session skill catalog; agents load it automatically before
final outputs, and you can invoke it yourself by name to audit any previous
work.

## How it works

- [`lib/index.js`](lib/index.js) registers a bundled skill provider on
  `ctx.skills`, following the `@deepseek-ai/dsh-skill-badge` provider pattern.
- [`assets/accountability-auditor.md`](assets/accountability-auditor.md) holds
  the skill body.
- [`cordis.patch.yml`](cordis.patch.yml) inserts the provider row into the host
  plane of the Cordis tree, so its skills land in the global registry layer.

## License

MIT — see the package license field.
