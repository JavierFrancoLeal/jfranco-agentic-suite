# Supervisor — the business owner's control panel

Created by **J.Franco**. MIT. Zero dependencies: runs with any Node.

A small local server for the business with **real logins, roles, and the
central dashboard**:

- **Owner** — manages worker accounts, reads the live field reports
  (`supervision.md`), reviews the feedback queue, and edits the business
  rules (`decisions.md`) from the dashboard.
- **Employees** — log in with their own user and password, send field
  reports and feedback, and open the Action Panel. They never touch the
  rules, the payments, or the accounts.

## Start

```sh
# one time: create the owner (and optionally the first employee)
node server.js init --owner Maria --password secret123 --employee Luis --employee-password luis456

# every day: run the server
node server.js
```

Open **http://127.0.0.1:8787/dashboard** (owner/employees) and
**http://127.0.0.1:8787/panel** (the Action Panel served locally).

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
- Remote access for multi-site businesses (with TLS).
