# @javierfrancoleal/dsh-supervisor

Created by **J.Franco** — the central control plane of the J.Franco agentic
workflow suite.

## What it is

A zero-dependency Node.js server that provides:

- **User accounts** with free role labels and three permission levels
  (Field / Supervisor / Owner) — one universal flow for every person.
- **The live conversation flow**: START → listening → per-person summary
  with confirm buttons → orders to the kitchen and the central system.
- **The universal sector dashboard** (10 languages, dark mode, wallboard,
  PWA panel) — one skeleton that changes skin per sector
  (restaurant, hotel, clinic, pharmacy, workshop, real estate, school…).
- **Telemetry**: reports, feedback, usage and cost, conversation trail.

## Install and run

```sh
npm install -g @javierfrancoleal/dsh-supervisor   # Node >= 24

jfranco-supervisor init --owner Maria --password s3cret \
  --owner-label "Directora" \
  --employee Ana --employee-password pw2 --employee-label "Mesera" \
  --lead Luis --lead-password pw3 --lead-label "Cocinero"

jfranco-supervisor --lan --https   # serves the dashboard and the panel
```

Then open `http://<this-computer-ip>:8787/dashboard`.

## Pairing with the AI

Run the DeepSeek Harness standby agent so the field conversation is decoded
automatically (see the suite's `tools/agent-standby.sh`).

## License

MIT.
