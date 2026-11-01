---
description: "Governance layer: grades the reliability of automatic decisions and proposes tier moves — the human approves every change."
kind: "package-bundle"
---

# @jfranco/autonomy-grader

Created by **J.Franco**.

## Summary

The governance layer of the J.Franco agentic workflow. As the AI executes
more automatic actions, the supervision log accumulates evidence. The
autonomy-grader turns that evidence into trust:

- grades every action pattern **A / B / C / D** (samples, verifications,
  corrections, errors);
- proposes tier moves: reliable patterns toward GREEN, unreliable ones back
  to YELLOW or RED;
- computes an overall **autonomy level 1–5** for the domain;
- proposes the exact `decisions.md` line for every move — and **never
  changes the rules itself**: the human approves every change.

## Use this plugin

In Desktop, open **Plugins** and enable **Autonomy Grader**. Then, after a
week of real work, ask "grade" or use `/grade`: the agent reads
`supervision.md`, grades every pattern, and hands you the Autonomy Report
with the exact lines to add to `decisions.md`.

## How it works

- [`lib/index.js`](lib/index.js) registers the `autonomy-grader` skill
  provider on `ctx.skills` and, when the host command registry resolves, the
  `/grade` command.
- [`assets/autonomy-grader.md`](assets/autonomy-grader.md) holds the grading
  protocol.
- [`cordis.patch.yml`](cordis.patch.yml) inserts the provider row into the
  host plane of the Cordis tree.

## License

MIT — see the package license field.
