# DOCS-INDEX — map of live, template, and archived documents (`docs/`)

*Single navigation index for the `docs/` corpus (updated 2026-11-14 during
Pre-Piloto #1 cleanup so agents and partners know what is authoritative).*

## 1. Live & Canonical Documentation

| Document | Purpose |
|---|---|
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | System layers, closed Dual BYOK + Local contract, Intake, Power/KPI Neto, cross-platform CI |
| [`MAP.md`](./MAP.md) | Quick technical directory across `supervisor/`, `apps/desktop/`, `supervisor-pkg/`, `tools/` |
| [`ACTIVE-CATALOG.md`](./ACTIVE-CATALOG.md) | Canonical taxonomy of all 26 `jfranco-*` organs (`desktop`/`campo`/dormant) |
| [`UI-DOCTRINE.md`](./UI-DOCTRINE.md) | Inbox-First (`simpleview`), 0% idle CPU/GPU, simplicity & accountability UX rules |
| [`INSTALLERS.md`](./INSTALLERS.md) | Packaging macOS/Windows installers, `verify-app` + `smoke-desktop --packed`, code-signing notes |
| [`PRE-PILOT-CHECKLIST.md`](./PRE-PILOT-CHECKLIST.md) | 10-point readiness verification before external SME pilots |
| [`OPERATIONS-MANUAL.md`](./OPERATIONS-MANUAL.md) | Commercial model, TPS/TVQ, vault security, blind support diagnostics, exit guarantees |
| [`PLUGIN-AUTHORING.md`](./PLUGIN-AUTHORING.md) | Extended Cordis DSH guide (canonical English spec in `jfranco-plugin-authoring/assets/plugin-authoring.md`) |
| [`KNOWLEDGE-LEDGER.md`](./KNOWLEDGE-LEDGER.md) | Standard rules; **live lessons #34–#45+ live in [`jfranco-lessons/assets/lessons.md`](../jfranco-lessons/assets/lessons.md)** |
| [`SKIN-IN-THE-GAME.md`](./SKIN-IN-THE-GAME.md) | Core accountability doctrine ("la machine exécute; l'humain signe") |

## 2. Legal & Compliance (Loi 25, Québec)

| Document | Scope |
|---|---|
| [`../POLITIQUE-CONFIDENTIALITE.md`](../POLITIQUE-CONFIDENTIALITE.md) & [`LEGAL/POLITIQUE-CONFIDENTIALITE.md`](./LEGAL/POLITIQUE-CONFIDENTIALITE.md) | Reconciled v1.1 public privacy policy (Dual BYOK Vault + Local Ollama + PII Veil 2.0 + read-only IMAP) |
| [`EFVP-TRASUNTO.md`](./EFVP-TRASUNTO.md) | Updated 2026-11-14 Privacy Impact Assessment (deep/gemini/ollama, vault crypto, diagnostic sanitization) |
| [`LEGAL/EFVP-MODELE-CLIENT.md`](./LEGAL/EFVP-MODELE-CLIENT.md) | Fill-in client EFVP template |
| [`LEGAL/PROTOCOLE-INCIDENTS.md`](./LEGAL/PROTOCOLE-INCIDENTS.md) | Incident triage & 72h CAI reporting protocol |
| [`LEGAL/RETENTION-DESTRUCTION.md`](./LEGAL/RETENTION-DESTRUCTION.md) | Local silo retention & demand-erasure schedule |

## 3. Sector Templates & Runtime Packs (consumed by installers, demo & product)

- **Decision constitutions (`20` files: 19 installer sectors + `customerservice`):** `docs/decisions-<sector>.md` (referenced by `install.sh`, `install.ps1`, `demo-reset.sh`, `demo-sandbox.sh`)
- **Sector KPIs (`20` files: 19 installer sectors + `customerservice`):** `docs/kpi-<sector>.md`
- **Desktop / Supervisor sector JSON skins (`9` packs):** `docs/sector-packs/*.json` (synced via `tools/sync-desktop.mjs --all`)

## 4. Historical, Audit & Superseded Files (preserved for traceability)

- **Superseded specs:** `RAYLINE-INTEGRATION.md`, `RAYLINE-CONFIG.md` (marked *ARCHIVED / SUPERSEDED*, replaced by closed curated `brain-catalog.js`)
- **Archived ledgers:** `KNOWLEDGE-LEDGER-LOG.md` (through Nov 7), `LEARNINGS.md` (through Nov 13) — active lessons now live in `jfranco-lessons/assets/lessons.md`
- **Dated audits, simulations, forensic notes & early architecture drafts:** `ORGAN-AUDIT-*.md`, `ANTIFRAGILE-REVIEW.md`, `HOLISTIC-REVIEW.md`, `USABILITY-AUDIT.md`, `ECOSYSTEM-AUDIT.md`, `FORENSICS/*`, `ARGON-REVIEWS/*`, `VESTIGIAL-ORGANS.md` (explains why dormant plugins stay on disk instead of hard deletion).
