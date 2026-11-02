# Supervisor — the business owner's control panel

Created by **J.Franco**. MIT. Zero dependencies: runs with any Node.

A small local server for the business with **real logins, roles, and the
central dashboard**:

- **Owner** — manages worker accounts, reads the live field reports
  (`supervision.md`), reviews the feedback queue, sees live metrics, and
  edits the business rules (`decisions.md`) from the dashboard.
- **Lead (team leader)** — reads field reports and feedback, and opens the
  panel for their team.
- **Employees** — log in with their own user and password, send field
  reports and feedback, and open the Action Panel. They never touch the
  rules, the payments, or the accounts.

The dashboard is responsive (tablet → desktop), touch-friendly, and
role-based; the employee view is kiosk-style with one big LISTEN button.

## Start

```sh
# one time: create the owner (and optionally the first employee)
node server.js init --owner Maria --password secret123 --employee Luis --employee-password luis456

# every day: run the server
#   --lan   → reachable from tablets/phones on the WiFi (bind 0.0.0.0)
#   --db    → SQLite storage (node:sqlite, zero deps) for 100+ employee sites
#   --https → also serve HTTPS on port 8443 (fixes Safari mixed-content; PWA-ready)
node server.js --lan --https --db
```

Certificates for HTTPS: `sh tools/make-cert.sh` (self-signed; browsers show a
warning on first visit — a real certificate via a domain is the production
path).

Open **http://<server-ip>:8787/dashboard** (owner/employees) and
**http://<server-ip>:8787/panel** (the Action Panel served locally).

## Security model

- Passwords are stored **salted and hashed** (scrypt) — never in plain text.
- Sessions expire after 8 hours; owners and employees have separate roles.
- The server listens on **127.0.0.1 only** by default (local network only).
- The panel's feedback endpoint is open on the local machine so field
  workers can always send feedback; reports and rules require login.

## How it feeds the agentic loop

`panel feedback → feedback.md → the super agent reads and resolves it
(workflow-master "Field feedback") → outcomes land in supervision.md → the
autonomy-grader produces the Management Summary and KPIs → the owner adjusts
decisions.md in the dashboard.`

## Roadmap

- Token-cost metering per worker (from session logs).
- Live dashboard updates (server-sent events).
- Remote access for multi-site businesses (with a real TLS certificate).
