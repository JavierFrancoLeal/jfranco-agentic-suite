# Cockpit Browser — Chrome extension (risk policy)

This extension is the **hands** for the DSH cockpit in **your Chrome** (with your
sessions). The **brain** (tiers, brake, audit, KPI) stays in DSH. This document
is the risk policy: how the surface is minimized, and how you keep the dial of
autonomy under your control.

## Load it (once)

1. `chrome://extensions` → **Developer mode** → **Load unpacked** → this folder.
2. Leave it enabled. It connects to `ws://127.0.0.1:9334/cockpit`.

**Do NOT publish to the Web Store** (yet). Personal use = load unpacked, no
review, no distribution, no account risk from a public listing.

## Permission model (minimized blast radius)

The **content script** (the part that reads and writes the page — the "hands") is
injected **only** on the domains you automate:

| Scope | Why |
|---|---|
| `content_scripts.matches` → `https://*.google.com/*`, `https://*.facebook.com/*` | the hands touch only Google and Facebook |
| `host_permissions` → `<all_urls>` | **screenshot only**: Chrome requires it to capture *any* visible tab (`captureVisibleTab`). The background worker uses it for nothing else. |
| `http://127.0.0.1:9334/*` | the local bridge to DSH |

**Tradeoff, stated plainly:** the content script (DOM read/write) stays confined
to Google/Facebook, but `<all_urls>` grants the background worker the *ability*
to screenshot any tab. The code only ever calls `captureVisibleTab` — no arbitrary
`fetch`/`executeScript` — so the actual usage is narrow even though the permission
is broad. If you prefer zero broad permission, the cost is no programmatic
screenshot (use your OS screenshot).

## The non-negotiables (never relax these)

1. **The brake is RED, always.** `Send / Pay / Confirm / Delete / Sign-in / Create /
   Authorize` are refused by the HOST and handed to you. The only way to change a
   light is `/cockpit tier "…" GREEN` — **your** explicit, logged override in
   `tiers.md`.
2. **Read-only by default.** The content script only acts on an explicit `/cockpit`
   command; it never runs on its own.
3. **Everything is audited.** Every action lands in `~/.dsh/cockpit-browser/audit.jsonl`
   (0600) and surfaces in `/cockpit report`.
4. **Human touch wins.** A physical `mousedown`/`keydown` hands the wheel back to
   you automatically.

## Two transports, two risk profiles

| Transport | Blast radius | Use it for |
|---|---|---|
| **Extension** (your Chrome) | **High** (your real sessions) | Daily reading, filling drafts, navigation |
| **CDP** (separate Chromium) | **Low** (isolated profile) | Anything delicate, money, or unfamiliar sites |

Rule: **never run money/irreversible flows through the extension.** Use CDP (or
do it yourself) for those. The extension is for the frictionless daily work.

## The dial (late-mover approach)

Autonomy is **granted, not assumed**. The dial is the tier system:

- `GREEN` — read/navigate: the agent may auto-do, logged.
- `SEMI-AUTOMATIC ⚑` — fill/click: the agent does, you verify in the report.
- `RED` — send/pay/confirm/delete/sign-in: never the agent.
- `YELLOW` — anything committing: propose and wait.

The feedback loop closes the dial:

- `/cockpit kpi` — autonomy vs. human intervention. On the extension, **more
  intervention on committing actions = safer**.
- `autonomy-grader` — grades decision reliability and proposes tier moves.
- `accountability-auditor` + `supervision.md` — the durable trail.

If the KPI shows the agent is auto-doing too much on committing actions, **lower
the dial** (move tiers back toward RED/YELLOW). If it's handing you trivial,
automatable steps, **raise it**. You are the decider, always.

## Config

- `COCKPIT_BRIDGE_PORT` (default `9334`) — the WebSocket bridge port. Change it in
  both the host (env var) and `extension/background.js` (`PORT`).
