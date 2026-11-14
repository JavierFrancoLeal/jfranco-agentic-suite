# ACTIVE-CATALOG — the J.Franco plugin organism (26 packages)

*Canonical classification of all 26 `jfranco-*` organs in this repository.
Updated 2026-11-14 (aligned across `install.sh`, `.github/workflows/publish.yml`,
`tools/publish.sh`, and `VESTIGIAL-ORGANS.md`).*

## 1. Core workflow & governance organs (installed by `install.sh` / `install.ps1`)

1. `jfranco-workflow-master` — trigger layer (`listen`, capture, task splitting)
2. `jfranco-decision-router` — semantic traffic-light tiers with audit trail
3. `jfranco-accountability-auditor` — mandatory post-action reflection & verification
4. `jfranco-autonomy-grader` — autonomy grading (`A/B/C/D`) from `supervision.md`
5. `jfranco-audit` — Knowledge Ledger consolidation & teaching

*(npm distribution channels: `tools/publish.sh` publishes all 5 core organs above plus `jfranco-deepseek-prices`, `jfranco-plugin-authoring`, and `jfranco-balance` [8 packages]; `.github/workflows/publish.yml` currently publishes 7 packages via Trusted Publishing: 4 core [`workflow-master`, `decision-router`, `accountability-auditor`, `autonomy-grader`] — omitting `jfranco-audit` — plus `jfranco-input-detector`, `jfranco-interpreter`, and `jfranco-balance`.)*

## 2. Engineering, coordination & domain organs (DSH developer/founder profiles)

1. `jfranco-antigravity` — Antigravity CLI delegate + `PROTOCOLO.md` / `dialogue.md` lock discipline
2. `jfranco-lessons` — canonical active Lessons Ledger (`assets/lessons.md`, #34–#45)
3. `jfranco-doctrine` — Fanal 7-pillar architectural & demand-first doctrine
4. `jfranco-forensic-contracts` — `@fanal-forensic-contract` static/runtime verification reflex
5. `jfranco-apices` — Québec regulated professions & fiduciary triggers registry
6. `jfranco-branches` — branch-agent isolation conventions
7. `jfranco-cockpit-browser` — guarded browser cockpit companion skill
8. `jfranco-compas` — DSH-derived optimization auditor (`fanal-optimize.sh`)
9. `jfranco-cifra` — host-signature / telemetry digest organ
10. `jfranco-constitution` — co-written house constitution workflow
11. `jfranco-docfactory` — branded `.docx`/`.pdf` document factory (`docfx.py`)
12. `jfranco-forensics` — code archaeology (`forensics.md`)
13. `jfranco-plugin-authoring` — DSH Cordis authoring guide & Lesson #40 guard

## 3. Founder's DSH cockpit (developer profile only — NOT client runtime)

- `jfranco-deepseek-prices` · `jfranco-balance` — developer usage & API price monitors in DSH; client Fanal ships balance/KPI natively inside `/dashboard` and Settings.

## 4. Dormant / Vestigial genome (code preserved per `VESTIGIAL-ORGANS.md`)

- `jfranco-input-detector` · `jfranco-interpreter` · `jfranco-cortex` · `jfranco-triage` · `jfranco-conductor` · `jfranco-usage-auditor` — functions absorbed directly into Fanal Supervisor (`supervisor/server.js`, `intake-engine.js`, `power-kpi.js`); packages stay intact on disk/npm for reactivating CLI workflows without rebuilding.

## The rule

End-user Fanal clients install **Fanal Desktop** alone (zero DSH plugin installs on client machines — see [`INSTALLERS.md`](./INSTALLERS.md)). The catalog above governs Trasunto developer/DSH profiles and npm maintenance.
