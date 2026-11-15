# PRE-PILOT-CHECKLIST — the 10 points before external pilot clients (updated 2026-11-14)

1. **All multiplatform gates green** — `sh tools/check.sh` (plus `windows-latest` CI `check-windows` and `desktop-windows-smoke` `--packed`) reports `ALL CHECKS PASSED`.
2. **Sync preflight** — `node tools/sync-desktop.mjs --check-all` passes; closed DeepSeek + Gemini brain (`dual_cloud`) requires zero third-party LLM runtime setup.
3. **Fresh Desktop build installed** — `sh tools/verify-app.sh` and `node tools/smoke-desktop.mjs --packed` pass **after** the last edit, and `/Applications/Fanal.app` (or Windows installer) is replaced with the newly built artifact (Lesson #1 / #35).
4. **Encrypted Vault & Dual BYOK keys** — client sets their scrypt Master Password in Fanal Desktop, unlocks via biometric/password (`AESGCM2:` encrypted `settings.json`, `FANAL_MASTER_KEY` zeroized on lock), and saves their DeepSeek / Google Gemini BYOK keys (`dual_cloud`).
5. **Intake & Gmail 2FA / Folder Sandbox** — if connecting Gmail/Workspace IMAP (`intake-engine.js` read-only `EXAMINE`/`BODY.PEEK[]`), use a dedicated **2FA App Password**; select an explicit `Fanal-Inbox` directory (`desktop-sandbox.js` confined).
6. **Client Constitution** — co-write the client's minimum floor, discount rules, and red-light escalations (`decisions.md`) during onboarding.
7. **Loi 25 legal pack reconciled** — deliver current [`POLITIQUE-CONFIDENTIALITE.md`](../POLITIQUE-CONFIDENTIALITE.md) (v1.1), client EFVP template ([`LEGAL/EFVP-MODELE-CLIENT.md`](./LEGAL/EFVP-MODELE-CLIENT.md)), signed Accord-Pilote with direct corporate email, and confirm writable local incident log.
8. **Blind diagnostic sanity check** — verify diagnostic export runs through [`diagnostic-sanitizer.js`](../supervisor/diagnostic-sanitizer.js) so support capsules redact PII and secret tokens.
9. **KPI Neto & Reprise Matinale** — verify `GET /api/health` and confirm Inbox-First (`simpleview`) surfaces net human time saved (`saved − edited`) and overnight items after sleep/wake (`powerMonitor`).
10. **The honesty instruments & exit** — confirm client knows one-click sovereign archive export and local silo deletion in Settings.
