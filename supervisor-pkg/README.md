# @javierfrancoleal/dsh-supervisor

Created by **J.Franco** — the Fanal supervisor control plane of the J.Franco agentic
workflow suite (packaged cleanly from `supervisor/` via `tools/sync-desktop.mjs`).

## What it is

A zero-dependency Node.js server (`Node >= 24`) that provides:

- **User accounts & RBAC** (`Field / Lead / Owner`) backed by salted scrypt hashes and local state in `~/.dsh/supervisor-data`.
- **Closed Dual BYOK Brain (`brain-catalog.js`)**: Apple-style closed synergy between DeepSeek (`deepseek-flash` / `deepseek-v4-pro`) and Google Gemini (`gemini-3.8-flash` / `gemini-4-argon`) failover with PII Veil 2.0 redaction and sanitized diagnostics (`diagnostic-sanitizer.js`).
- **Inbox-First KPI & Power Governance** (`power-kpi.js`): net human time saved (`saved − edited`) and laptop wake-aware UI polling.
- **Autonomous Intake** (`intake-engine.js`): read-only IMAP incremental polling (`EXAMINE` / `BODY.PEEK[]`), sandboxed `Fanal-Inbox` folder watcher, and webhook intake (`POST /api/intake`).
- **Universal sector dashboard** (`dashboard.html` + `dashboard-i18n.js`, 10 languages, PWA panel, 9 sector skins).

## Install and run

```sh
npm install -g @javierfrancoleal/dsh-supervisor   # Node >= 24

jfranco-supervisor init --owner Maria --password s3cret \
  --owner-label "Directora" \
  --employee Ana --employee-password pw2 --employee-label "Recepcion" \
  --lead Luis --lead-password pw3 --lead-label "Coordinador"

jfranco-supervisor --lan --https   # serves the dashboard and the panel
```

Then open `http://<this-computer-ip>:8787/dashboard`.

> Prefer **Fanal Desktop** (`apps/desktop`) for end-user installs with Touch ID / Windows Hello vault locking and bundled runtime (`docs/INSTALLERS.md`).

## License

MIT.
