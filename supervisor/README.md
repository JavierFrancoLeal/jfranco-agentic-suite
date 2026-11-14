# Supervisor — Fanal's control plane

Created by **J.Franco**. MIT. **Zero external dependencies**: runs with Node >= 24.

The local control-plane server powering both **Fanal Desktop** (`apps/desktop/`)
and `@javierfrancoleal/dsh-supervisor` (`supervisor-pkg/`):

- **Owner & RBAC (`server.js`)** — salted scrypt accounts (`Owner / Lead / Employee`),
  Inbox-First (`simpleview`) approval cards, morning *Reprise Matinale*, house
  rules (`decisions.md`), and company memory.
- **Closed Dual BYOK + Local Brain (`brain-catalog.js`)** — curated `dual_cloud`
  (`deepseek-flash` / `deepseek-v4-pro` ↔ Gemini `gemini-3.8-flash` / `gemini-4-argon`
  failover) or `local_only` (Ollama), rejecting uncurated providers.
- **KPI Neto & Power Governor (`power-kpi.js`)** — net time saved (`saved − edited`),
  battery/wake-aware UI polling, and `POST /api/system/wake`.
- **Autonomous Intake (`intake-engine.js`)** — read-only IMAP incremental UID
  (`EXAMINE` / `BODY.PEEK[]`), sandboxed `Fanal-Inbox` watcher, and `POST /api/intake`.
- **Privacy & Support (`diagnostic-sanitizer.js`)** — PII Veil 2.0, `AESGCM2:`
  encrypted settings via Vault `FANAL_MASTER_KEY` RAM handoff, and secret/PII-free diagnostic exports.

## Start

```sh
# one time: create the owner (and optionally the first employee)
node server.js init --owner Maria --password secret123 --employee Luis --employee-password luis456

# every day: run the server
#   --lan   → reachable from tablets/phones on the WiFi (bind 0.0.0.0)
#   --db    → SQLite storage (node:sqlite, zero deps) for multi-employee sites
#   --https → also serve HTTPS on port 8443 (fixes Safari mixed-content; PWA-ready)
node server.js --lan --https --db
```

Certificates for HTTPS: `sh tools/make-cert.sh` (self-signed; browsers show a
warning on first visit — a real certificate via a domain is the production path).

Open **http://<server-ip>:8787/dashboard** (Inbox-First dashboard) and
**http://<server-ip>:8787/panel** (the Action Panel served locally).

## Security model

- Passwords are stored **salted and hashed** (scrypt) — never in plain text.
- Vault secrets (`apiKey`, `geminiApiKey`, IMAP credentials) seal under `AESGCM2:`
  with runtime key zeroization on lock (`POST /api/internal/vault-key`).
- The server binds **127.0.0.1 only** by default unless `--lan` is explicitly passed.
