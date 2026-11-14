# MAP — the organism index (the foundations for future code)

*One file that registers the live architecture of Fanal / Trasunto, so any
future session, agent, or partner finds every layer in one read.
Updated 2026-11-14 (Post-Bloque 3 · Paso 3 + Pre-Piloto #1).*

## The layers (top to bottom)

1. **The doctrine & index** — `docs/DOCS-INDEX.md` · `docs/NAMING.md` · `docs/KNOWLEDGE-LEDGER.md` · `jfranco-lessons/assets/lessons.md` · `docs/UI-DOCTRINE.md` · `docs/OPERATIONS-MANUAL.md`
2. **The brain & modules (`supervisor/`)** — `server.js` · `brain-catalog.js` (closed Dual BYOK `DeepSeek ↔ Gemini` + Local Ollama) · `diagnostic-sanitizer.js` · `power-kpi.js` (KPI Neto + sleep/wake) · `intake-engine.js` (IMAP read-only + `Fanal-Inbox` + Reprise Matinale) · PII Veil 2.0
3. **The hands** — `supervisor/browser-cdp.js` (visible Chrome pilot + brake) · read-only IMAP / `Fanal-Inbox` connectors · `apps/desktop/desktop-sandbox.js`
4. **The face** — `supervisor/dashboard.html` (`simpleview` Inbox-First default, zero duplicate IDs) + `dashboard-i18n.js` (10 locales) · `ui/panel.html` · `ui/sw.js` + `manifest.webmanifest`
5. **The desktop app (`apps/desktop/`)** — `main.js` (Electron 45, scrypt + biometric Vault, `FANAL_MASTER_KEY` RAM handoff, Tray 10-lang, `powerMonitor`), `preload.js`, `vault-biometric.js`, `desktop-sandbox.js`, `apps/desktop/brain/`
6. **The organs (`26 jfranco-*`) & npm package** — classified in `docs/ACTIVE-CATALOG.md`; standalone npm server in `supervisor-pkg/` (`@javierfrancoleal/dsh-supervisor`)
7. **Legal & business** — `POLITIQUE-CONFIDENTIALITE.md` · `docs/EFVP-TRASUNTO.md` · `docs/LEGAL/*` · `TRASUNTO-*.docx/.pdf`

## The guard gates & sync (canonical single source of truth)

- `node tools/sync-desktop.mjs --all` / `--check-all` — single manifest syncing `supervisor/`, `ui/`, and `docs/sector-packs/` to both `apps/desktop/` and `supervisor-pkg/`
- `tools/check.sh` / `tools/check.ps1` — runs all plugin checks, `smoke-dashboard.js` (DOM/ID/Inbox-First guard), `test-diagnostic-export.mjs`, `test-closed-brain.mjs`, `test-api-closed-brain.mjs`, `test-intake-pipeline.mjs`, `test-vault-biometric.mjs`, `test-desktop-sandbox.mjs`, `verify-app.mjs`, `supervisor-pkg` sync check, and `api-smoke.sh`
- `node tools/smoke-desktop.mjs` & `node tools/smoke-desktop.mjs --packed` — Electron source & ASAR smoke checks (macOS + `windows-latest` CI)
- `tools/verify-app.sh` — pre-DMG gate before `electron-builder`
- `tools/sync-all.sh` & `tools/sync-check.sh` — milestone npm sync/freshness helpers

## The registers

- `jfranco-lessons/assets/lessons.md` — single active canonical ledger (archived logs in `docs/KNOWLEDGE-LEDGER-LOG.md` and `docs/LEARNINGS.md`)
- `docs/sector-packs/` — agroalimentaire, clinic, hotel, pharmacy, realestate, restaurant, school, tourisme, workshop
- `~/.dsh/supervision.md` · `audit.md` · `decisions.md` · `~/.dsh/dialogue.md` (DSH ↔ Antigravity)
