# Cockpit Browser — command reference

One command, `/cockpit`, with subcommands. All arguments are plain text; quote
values that contain spaces.

| Subcommand | Tier | Effect |
|---|---|---|
| `open <url>` | GREEN | launch/reuse the browser and navigate (http/https only) |
| `read [selector]` | GREEN | page text (or one element, searched in the main frame AND iframes) |
| `fill <selector> <value>` | ⚑ SEMI-AUTOMATIC | set value + input/change events + emerald border (handles `<select>`; passwords redacted) |
| `click <selector>` | ⚑ SEMI-AUTOMATIC / RED | click (real mouse in the top frame, synthetic in iframes); brake refuses Envoyer/Payer/Create/Authorize/Sign in/… |
| `screenshot [file]` | GREEN | PNG capture |
| `tabs` | GREEN | list tabs |
| `switch <n>` | GREEN | switch to tab `n` |
| `newtab [url]` | GREEN | open a new tab (and switch to it) |
| `status` | GREEN | HUD state + URL + title + human-touched |
| `pause` / `resume` / `step` | GREEN | hand the wheel / take it back / one single step |
| `report` | GREEN | render the two-section Accountability Report |
| `kpi` | GREEN | measure autonomy vs. human intervention (efficiency KPI) |
| `tier <pattern> <tier>` | GREEN | change a label's tier (RED→GREEN etc.), persisted in tiers.md |
| `close` | GREEN | close the browser (profile kept) |

## The guardrails (J.Franco tiers)

- **GREEN** — read-only / internal: executed and logged.
- **SEMI-AUTOMATIC ⚑** — `fill`/`click` on a third-party page: executed AND
  flagged for mandatory human verification.
- **RED** — `click` on a forbidden label: refused by the brake. The brake is a
  **guide**, not a wall: it reports ✅ what is ready and ⏳ what is missing.
- **YELLOW** — anything committing (send, publish, official result): propose in
  chat and wait.

Every action is logged to `~/.dsh/cockpit-browser/audit.jsonl` (mode 0600).

## Multi-frame (iframes) and `<select>`

- `read`/`fill`/`click` locate the selector across the **main frame and every
  iframe** (CDP isolated worlds with `grantUniveralAccess`), so Google and
  Facebook forms inside iframes work.
- `fill` handles `<select>` (native value + `change`/`input` events) and
  text inputs (native setter + events, React-compatible).

## Link bridge (click in DSH → cockpit)

The client half intercepts external `http(s)` link clicks in the DSH GUI and
routes them to the cockpit browser. Cmd/Ctrl+click bypasses to the normal
browser. DSH's own navigation is left untouched.

## Tier overrides (the cockpit's memory)

You can change any light. `/cockpit tier "Create draft" GREEN` writes a line to
`~/.dsh/cockpit-browser/tiers.md` (`<pattern> → <tier>`). It is read FRESH on
every click decision — no cache — so the change takes effect on the **next**
action and **persists** across sessions and restarts. The last matching line
wins, so re-running `/cockpit tier` with a new tier overrides the old one.

- `GREEN` — allow (even if the label would otherwise be forbidden).
- `SEMI-AUTOMATIC` — allow, flagged for verification.
- `YELLOW` — propose and wait.
- `RED` — brake (the default for Envoyer/Payer/Create/Sign in).

## HUD states

- **⚡ AGENT** — the agent is running.
- **🖐️ HUMAN AT THE WHEEL** — paused, or the human touched the page.
- **🛑 BRAKE** — a forbidden button was refused (with what is ready/missing).
- **⚪ IDLE** — no browser running.

## Configuration (environment variables)

- `COCKPIT_CHROME` — browser executable (auto-detected otherwise).
- `COCKPIT_PORT` — CDP port (default `9333`).
- `COCKPIT_PROFILE` — user-data-dir (default `~/.dsh/cockpit-browser/profile`).

## Requirements

A Chromium-based browser (Chrome / Edge / Chromium / Brave). Node ≥ 24 (bundled
by the DSH runtime). No npm dependencies. Zero `eval` in the plugin.
