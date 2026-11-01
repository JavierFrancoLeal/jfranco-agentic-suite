---
description: "Route every decision through pre-trained GREEN/YELLOW/RED tiers and keep an audit trail — stage 2 of the agentic workflow."
kind: "package-bundle"
---

# @jfranco/decision-router

Created by **J.Franco**.

## Summary

Stage 2 of the J.Franco agentic workflow:

`Input → Detection (AI + human) → AI processes, decides, and proposes → Human reflects, verifies, and decides → Output`

This plugin registers the `decision-router` skill on the host skill registry.
The skill teaches the agent to assign one of three pre-trained tiers to every
decision before acting:

- **GREEN** — pre-authorized: execute and log.
- **YELLOW** — propose the plan first and wait for approval.
- **RED** — escalate to the human; never act.

## Training the router

The human trains the router by editing a policy file — `decisions.md` in the
workspace root, `.dsh/decisions.md`, or `~/.dsh/decisions.md`. Each row maps an
action pattern to a tier. The file replaces the built-in defaults, so the
human's training is always authoritative, and edits take effect on the next
task.

## Use this plugin

In Desktop, open **Plugins** and enable **Decision Router**. The skill appears
in the session skill catalog; agents load it automatically when a TASK or
WORKFLOW input needs decisions, and you can invoke it yourself by name.

## How it works

- [`lib/index.js`](lib/index.js) registers a bundled skill provider on
  `ctx.skills`, following the `@deepseek-ai/dsh-skill-badge` provider pattern.
- [`assets/decision-router.md`](assets/decision-router.md) holds the skill body.
- [`cordis.patch.yml`](cordis.patch.yml) inserts the provider row into the host
  plane of the Cordis tree, so its skills land in the global registry layer.

## License

MIT — see the package license field.
