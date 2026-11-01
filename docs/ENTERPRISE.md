# Enterprise deployment — one owner, many workers

How a business gives the suite to every employee without each one creating
an account, paying, or configuring anything.

## The model

- **ONE DeepSeek Harness account per business: the owner's.** The owner pays
  (topped-up balance) and controls everything.
- **Workers never create accounts and never pay.** They use the business
  machines (tablet, computer, phone) where DeepSeek Harness is signed into
  the owner's account. Each worker is identified by the suite's worker tag.
- **One station = the owner's session.** The panel asks who is working
  (name + role) and every report carries that tag into the shared
  `supervision.md` — so the owner knows which employee did what.
- **Everything flows to the owner:** supervision log → autonomy-grader →
  Management Summary (totals, per-worker table, sector KPIs, suggestions).

## Identity today

The panel tags each session with the worker's name and role (stored on the
device). It is **identity tagging, not authentication**: it tells the system
who is working, but it does not prevent impersonation. Real user accounts
and passwords require the `supervisor` backend (roadmap): a small local
service with real logins, per-worker permissions, and the owner's dashboard.

## What the owner controls

- **Payment:** the owner's account/API key is the only one that exists.
- **Rules:** `decisions.md` is owned by the owner; workers cannot change
  tiers.
- **Visibility:** `supervision.md`, the Management Summary, and the
  per-worker table.
- **Improvement:** the grader proposes coaching points per worker and tier
  moves per pattern.

## Telemetry and the feedback loop

`supervision.md` → `autonomy-grader` → Management Summary + sector KPIs →
the owner adjusts `decisions.md` and coaches workers → next week's metrics
show the change. That loop is the measurable value of AI in the company.

## Sector KPIs

Generic KPIs (autonomy level, approval rate, correction rate, error rate)
are always available. Sector-specific KPI files — see
[`kpi-restaurant.md`](kpi-restaurant.md) — map business metrics (service
speed, tables served, allergy verifications) to log evidence, so each sector
measures what matters to it.
