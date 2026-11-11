# @javierfrancoleal/cockpit-browser — The Cockpit Browser

> ⚡ **Super Agent Ready** — a real Chromium browser the DSH agent controls over
> CDP, under the Fanal safety rails AND the J.Franco guardrails (GREEN /
> SEMI-AUTOMATIC ⚑ / RED / YELLOW + audit trail + Accountability Report). Zero
> npm dependencies, zero `eval`.

## Two transports, one brain

The **brain** (commands, tiers, brake, audit, KPI) lives in DSH. The **hands**
can be one of two transports:

1. **Chrome extension** (your sessions) — load `extension/` in `chrome://extensions`;
   `/cockpit open` then drives **your Chrome**, already logged into Gmail/Google.
2. **CDP Chromium** (isolated) — no extension needed; `/cockpit` launches a
   separate Chromium (fallback, and the smoke-tested default).

When the extension is connected, `/cockpit` routes to it automatically; otherwise
it falls back to CDP. See [`extension/README.md`](extension/README.md).

## What it does (hands + advice)

Registers the **`/cockpit`** command, which launches a browser
(Chrome/Edge/Chromium) and drives it over the Chrome DevTools Protocol. The
agent can open a URL, read the page, fill fields, click, capture screenshots,
and read the HUD state — and **every action is tiered before it runs and logged**
(`/cockpit report` renders the two-section report; `/cockpit kpi` measures
efficiency).

- **Persistent session** — a dedicated `~/.dsh/cockpit-browser/profile`; passwords
  are stored by Chromium in the system keychain (Keychain/DPAPI) and redacted
  from the audit trail (`•••`).
- **No `file://`** — http(s) only.
- **Constitutional brake** — `click` refuses Envoyer/Soumettre/Payer/Transmettre
  /Create/Authorize/Sign in (`submit/pay/send/post/…`) with 🛑 BRAKE (RED).
- **Emerald border** — everything the agent touches is outlined `#10b981`.
- **HUD** — ⚡ AGENT / 🖐️ HUMAN AT THE WHEEL / 🛑 BRAKE, with `pause/resume/step`
  and physical-mouse auto-detection.
- **Guide, not a wall** — when it stops (RED) it tells you ✅ what is ready and
  ⏳ what is missing, like a teacher.
- **Tier memory** — `/cockpit tier "X" GREEN|RED` changes any light and persists
  it in `tiers.md`; it applies on the next action, forever.
- **iframes + `<select>`** — finds and fills inside iframes (Google/Facebook) and
  dropdowns.
- **Multi-tab** — `tabs / switch / newtab`.
- **Link bridge** — a click on an external link in DSH opens it in the cockpit
  (Cmd/Ctrl+click = normal browser).
- **Governance** — decision-router tiers, `audit.jsonl` trail (0600), and the
  Accountability Report via `/cockpit report`.

## What it does NOT do (honest)

- It does **not** draw the browser inside the DSH window: the DSH host has no
  Electron view access (a hard platform limit). It opens a **separate Chromium
  window**, real, that you can see and take over at any moment.
- It does **not** submit on its own — the final click is always yours.

## Suite and KPI

- **Built to work with the guardrails.** The cockpit executes; the governance
  organs decide, verify, and grade. Full kit in [`SUITE.md`](SUITE.md):
  `workflow-master` → `input-detector` → `decision-router` →
  **`cockpit-browser`** → `accountability-auditor` → `autonomy-grader` →
  `audit`.
- **Efficiency KPI.** `/cockpit kpi` measures autonomy vs. human intervention
  from the `audit.jsonl` trail: more autonomy = it works; more intervention on
  automatable tasks = refine the plugin. Methodology in
  [`assets/kpi.md`](assets/kpi.md).

## Install

```bash
dsh plugin --profile <profile> add @javierfrancoleal/cockpit-browser
```

Restart the app. Requires a Chromium-based browser installed. Optional config
via environment variables: `COCKPIT_CHROME`, `COCKPIT_PORT` (9333),
`COCKPIT_PROFILE`, `COCKPIT_TIERS`.

## Documents

- [assets/cockpit-browser.md](assets/cockpit-browser.md) — the skill that teaches the agent how to use it.
- [assets/commands.md](assets/commands.md) — the command reference.
- [assets/kpi.md](assets/kpi.md) — the KPI methodology.
- [SUITE.md](SUITE.md) — the full installation kit and ecosystem.
