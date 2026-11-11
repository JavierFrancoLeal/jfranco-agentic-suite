# Cockpit Browser — command reference

One command, `/cockpit`, with subcommands. All arguments are plain text; quote
values that contain spaces.

| Subcommand | Effect | Example |
|---|---|---|
| `open <url>` | launch/reuse the browser and navigate (http/https only) | `/cockpit open https://business.facebook.com` |
| `read [selector]` | page text (or one element) | `/cockpit read` · `/cockpit read ".msg"` |
| `fill <selector> <value>` | set a value + input/change events + emerald border | `/cockpit fill "#email" "a@b.com"` |
| `click <selector>` | click (brake refuses Envoyer/Payer/…) | `/cockpit click "#next"` |
| `screenshot [file]` | PNG capture | `/cockpit screenshot /tmp/shot.png` |
| `status` | HUD state + URL + title + human-touched | `/cockpit status` |
| `pause` | hand the wheel to the human | `/cockpit pause` |
| `resume` | hand it back to the agent | `/cockpit resume` |
| `step` | allow exactly ONE next action | `/cockpit step` |
| `close` | close the browser (profile kept) | `/cockpit close` |

## HUD states

- **⚡ AGENTE** — the agent is running.
- **🖐️ VOLANTE HUMANO** — paused, or the human touched the page (a real
  `mousedown`/`keydown`). `fill`/`click` are blocked until `resume`/`step`.
- **🛑 FRENO** — a forbidden button was refused.
- **⚪ IDLE** — no browser running.

## Safety rails (in the code, not in a prompt)

- **Brake**: `FORBIDDEN = /envoyer|soumettre|transmettre|payer|signer|supprimer|submit|pay|delete|send|publish|post/i` — `click` on a matching label returns 🛑 FRENO and does not click.
- **Emerald border**: every `fill`/`click` paints `outline: 3px solid #10b981`.
- **No `file://`**: `open` refuses anything that is not `http(s)`.
- **Mouse detection**: a page-side `mousedown`/`keydown` listener sets the wheel
  to the human.
- **Zero eval in the plugin**: the host code uses no `eval`/`new Function`; all
  values are `JSON.stringify`-serialized into CDP expressions.

## Configuration (environment variables)

- `COCKPIT_CHROME` — path to the browser executable (auto-detected on macOS /
  Windows / Linux otherwise).
- `COCKPIT_PORT` — CDP port (default `9333`).
- `COCKPIT_PROFILE` — user-data-dir (default `~/.dsh/cockpit-browser/profile`).

## Requirements

- A Chromium-based browser installed (Google Chrome, Microsoft Edge, Chromium,
  or Brave).
- Node ≥ 24 for the plugin's global `fetch`/`WebSocket` (the DSH runtime bundles
  it). No npm dependencies.
