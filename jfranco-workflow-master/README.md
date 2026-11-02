---
description: "The trigger layer: listening mode that captures conversations, decodes the requests, and builds the workflow — automatic actions, proposals, and questions."
kind: "package-bundle"
---

# @javierfrancoleal/workflow-master

> ⚡ **Super Agent Ready** — part of the J.Franco governance layer for autonomous agents.

Created by **J.Franco**.

## Summary

The trigger layer of the J.Franco agentic workflow:

`Input → Detection (AI + human) → AI processes, decides, and proposes → Human reflects, verifies, and decides → Output`

This plugin closes the gap between "the input happened" and "the agent
acted": it gives the human a **clue** to activate listening mode.

## The clue

Listening mode starts with any of these signals:

- the `/listen` command (when the host command registry is available);
- the words "listen" / "escucha", or invoking the `workflow-master` skill;
- simply relaying a conversation — with a client, a colleague, the boss, or
  any third party.

From that moment the agent listens first and acts second: it captures
everything, identifies who is asking, splits the conversation into discrete
actions, and develops the workflow — GREEN actions run automatically and are
logged for verification, YELLOW proposals wait for the human's authorization,
RED questions are asked before anything happens.

## Use this plugin

In Desktop, open **Plugins** and enable **Workflow Master**. Then, on any
device running DeepSeek Harness, tap `/listen` (or say "escucha") and start
relaying the conversation. The agent confirms "Listening — go ahead", and
when you say "that's all", it presents the workflow plan and executes it
under the tiers, closing with the accountability report.

## How it works

- [`lib/index.js`](lib/index.js) registers the `workflow-master` skill
  provider on `ctx.skills` and, when the host command registry resolves, the
  `/listen` command.
- [`assets/workflow-master.md`](assets/workflow-master.md) holds the listening
  mode instructions.
- [`cordis.patch.yml`](cordis.patch.yml) inserts the provider row into the
  host plane of the Cordis tree.

## License

MIT — see the package license field.
