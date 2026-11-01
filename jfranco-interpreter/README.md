---
description: "Real-time translation and interpretation for conversations in different languages — companion of the agentic workflow."
kind: "package-bundle"
---

# @jfranco/interpreter

> ⚡ **Super Agent Ready** — part of the J.Franco governance layer for autonomous agents.

Created by **J.Franco**.

## Summary

The interpretation layer of the J.Franco agentic workflow. When a
conversation mixes languages — a bilingual guest at the hotel, a tourist
table at the restaurant, a foreign speaker at a police stop — the agent
interprets in real time:

- detects each speaker's language;
- gives the human the interlocutor's meaning in the human's language;
- gives the human short, speakable phrases in the interlocutor's language;
- in advisory mode (earpiece), two short lines at a time, marked with the
  target language;
- attributes every utterance to its speaker, and logs what was translated.

## Use this plugin

In Desktop, open **Plugins** and enable **Interpreter**. Then, in any
conversation, say "traduce" / "translate" / "interpreta", use `/interpret`
(when available), or simply keep talking — listening mode routes mixed
languages here automatically.

## How it works

- [`lib/index.js`](lib/index.js) registers the `interpreter` skill provider
  on `ctx.skills` and, when the host command registry resolves, the
  `/interpret` command.
- [`assets/interpreter.md`](assets/interpreter.md) holds the interpretation
  protocol.
- [`cordis.patch.yml`](cordis.patch.yml) inserts the provider row into the
  host plane of the Cordis tree.

## License

MIT — see the package license field.
