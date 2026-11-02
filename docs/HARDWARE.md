# Hardware guide — what the user actually touches

The AI brain runs on **one computer of the business** (DeepSeek Harness +
Supervisor). Every worker device is a thin window: screen + microphone +
browser. This keeps hardware costs low and management central.

## Scenario 1 — Small restaurant (6 workers)

Shared tablets, not one device per person.

| Piece | What it is | Qty | Est. cost |
|---|---|---|---|
| Mini PC / Mac mini (the brain) | Runs DeepSeek Harness + Supervisor, always on; can reuse an existing PC | 1 | $500–900 |
| Android tablets 10–11" | The panel installed as a PWA, kiosk mode (Samsung A9+, Lenovo Tab…) | 3–4 | $150–250 ea |
| Wall mount for the kitchen tablet | For the chef, kitchen-safe | 1–2 | $30–80 |
| Bluetooth mic (optional) | Noisy kitchen | 1 | $30–60 |

- Waitresses → front tablet; chef → kitchen wall tablet; team lead → tablet
  or phone; owner → laptop/phone with the Supervisor dashboard.
- Total: **~$1,200–2,000** + DeepSeek usage.

## Scenario 2 — Large company (100+ employees, manufacturing)

Stations per area, plus existing office PCs.

| Piece | What it is | Qty | Est. cost |
|---|---|---|---|
| On-premises server or cloud VM | Enterprise Supervisor + DSH: real database, backups, TLS, SSO (Active Directory) | 1 | $1,500–3,000 (or $100–300/mo cloud) |
| Existing office PCs | Browser → panel/dashboard (engineering, quality, office) | — | $0 |
| Industrial tablets (XCover, Zebra, Getac) | Kiosks on the production line, with stands | 10–20 stations | $400–1,200 ea |
| Headsets/mics | Noisy stations | 10–20 | $50–100 ea |
| Industrial WiFi / VLAN | Isolated network for the system | — | per infrastructure |

- Not one device per employee: **10–20 shared stations cover 100 workers**.
- Traceability: every worker logs in with their own user (Supervisor) or
  worker tag on the panel; everything is recorded with name, time, and
  shift.
- Roll out in phases: one line or shift first, then expand (see
  [BUSINESS.md](BUSINESS.md)).

## What this means for the interface

1. **Responsive** — same UI from a 10" tablet to a desktop monitor.
2. **Kiosk mode** — shared tablets keep the session; a small "switch user"
   button is enough.
3. **Role views** — worker: one big LISTEN button; lead: reports and
   feedback; owner: metrics, workers, and rules.
4. **Big touch targets and voice** — hands busy, kitchens noisy.
5. **LAN server** — the Supervisor serves the local network
   (`node server.js --lan`) so tablets reach it over WiFi.
6. **Scale path** — for 100+ employees the Supervisor moves from markdown
   logs to a real database with SSO (roadmap).
