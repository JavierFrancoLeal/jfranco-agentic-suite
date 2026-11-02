---
description: "Detect, classify, and route every user input before acting — stage 1 of the agentic workflow."
kind: "package-bundle"
---

# @javierfrancoleal/input-detector

> ⚡ **Super Agent Ready** — part of the J.Franco governance layer for autonomous agents.

Created by **J.Franco**.

## Summary

Stage 1 of the J.Franco agentic workflow:

`Input → Detection (AI + human) → AI processes, decides, and proposes → Human reflects, verifies, and decides → Output`

This plugin registers the `input-detector` skill on the host skill registry.
Every agent whose preset exposes skill loading (the `standard` preset does)
sees the skill in its catalog. The skill teaches the agent to detect and
classify each input as QUESTION, TASK, TRIGGER, REVIEW, or WORKFLOW, announce
the classification in one line, and route the input to the stage that owns it.

## Use this plugin

In Desktop, open **Plugins** and enable **Input Detector**. The skill appears
in the session skill catalog; agents load it automatically when an input needs
classification, and you can invoke it yourself by name.

## How it works

- [`lib/index.js`](lib/index.js) registers a bundled skill provider on
  `ctx.skills`, following the `@deepseek-ai/dsh-skill-badge` provider pattern.
- [`assets/input-detector.md`](assets/input-detector.md) holds the skill body.
- [`cordis.patch.yml`](cordis.patch.yml) inserts the provider row into the host
  plane of the Cordis tree, so its skills land in the global registry layer.

## Training

You co-detect with the agent: correct any classification and your correction
becomes authoritative. Route behavior for TASK and WORKFLOW inputs is trained
through the companion plugin `@javierfrancoleal/decision-router` and its `decisions.md`
policy file.

## License

MIT — see the package license field.
