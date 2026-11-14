# Architecture — Fanal, closed Dual-Brain AI Governance & Desktop Suite

**Formal definition:** Fanal is Trasunto's closed-architecture human-in-the-loop
work assistant (**L'IA travaille. L'humain veille, décide, révise.**).
It pairs an **Electron desktop shell** (`apps/desktop/`) with a zero-dependency
**Node.js supervisor & dashboard** (`supervisor/`), closed **Dual BYOK + Local Ollama**
model governance, PII Veil 2.0, encrypted local vault, and read-only autonomous
intake (`IMAP` + `Fanal-Inbox`).

## The layers

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Layer 4 · Presentation — Fanal Desktop & Dashboard                      │
│   apps/desktop (Electron 45, scrypt + OS biometric Vault, Tray 10-lang) │
│   supervisor/dashboard.html (Inbox-First simpleview, 10 locales, PWA)   │
├─────────────────────────────────────────────────────────────────────────┤
│ Layer 3 · Control Plane — Fanal Supervisor (supervisor/*.js, zero deps) │
│   server.js · brain-catalog.js · diagnostic-sanitizer.js                │
│   power-kpi.js (KPI Neto + sleep/wake) · intake-engine.js (IMAP+Inbox)  │
├─────────────────────────────────────────────────────────────────────────┤
│ Layer 2 · Curated Brain Contract (Closed Catalog — brain-catalog.js)    │
│   dual_cloud: DeepSeek (deepseek-flash / deepseek-v4-pro)               │
│               ↔ Google Gemini failover (gemini-3.8-flash / gemini-4-argon)│
│   local_only: 100 % on-device Ollama (zero cloud egress)                │
├─────────────────────────────────────────────────────────────────────────┤
│ Layer 1 · Trasunto Developer Organs (optional DSH suite, 26 jfranco-*)  │
│   Authoring, auditing, DSH↔Antigravity dialogue, and CLI automation     │
└─────────────────────────────────────────────────────────────────────────┘
```

## What each layer is responsible for

| Layer | Responsibility | Never does |
|---|---|---|
| Curated Brain | Reasoning, drafting, structured JSON proposals, DeepSeek ↔ Gemini failover | Exposes arbitrary LLM endpoints (`400 closed_curated_catalog`) or signs irreversible actions |
| Supervisor | RBAC (`scrypt`), PII Veil 2.0, Vault crypto (`AESGCM2:`), IMAP `EXAMINE`/`BODY.PEEK`, `Fanal-Inbox` watcher, KPI Neto (`saved - edited`), diagnostic redaction | Uploads raw client files, mutates mailbox flags, or bypasses human red-light sign-off |
| Desktop Shell | Single-instance lock, scrypt/Touch ID/Hello Vault curtain, `FANAL_MASTER_KEY` RAM handoff & zeroization on lock, `powerMonitor` sleep/wake, sandboxed IPC | Lets renderer reach Node/FS directly (`nodeIntegration: false`, `contextIsolation: true`) |
| Presentation | Simple Inbox-First owner review, morning *Reprise Matinale*, per-sector skins | Hides failures in `pending` (`failToHuman`) or leaves idle GPU animations running |

## The closed brain contract (`brain-catalog.js`)

Fanal intentionally closes model selection ("Apple-style curated
hemispheres" — no arbitrary LLM picker):

- **`dual_cloud` (Dual BYOK in Vault)**:
  - **Primary fast brain**: `deepseek-flash`
  - **Deep / complex reasoning**: `deepseek-v4-pro` (DeepSeek) or `gemini-4-argon` (Gemini when configured)
  - **Automatic cross-provider failover & rescue**: `processStudio()` fails over from `deepseek-flash` to `gemini-3.8-flash` (`rescue`) on provider error, and escalates deep rescue to `gemini-4-argon` (or `deepseek-v4-pro`).
- **`local_only`**: routes strictly to local Ollama (`127.0.0.1:11434`), blocking external egress.
- **Vault encryption**: client API keys and IMAP credentials are encrypted with `AES-256-GCM` (`AESGCM2:`) using the scrypt-derived `FANAL_MASTER_KEY` handed off via authenticated loopback (`POST /api/internal/vault-key`) from Electron Main and zeroized in RAM on lock.

## Homeostasis, Intake & KPI Neto (`power-kpi.js` & `intake-engine.js`)

- `GET /api/health` — pulse, budget guard (`DSH_DAILY_BUDGET_USD`), and wake/power status (`POST /api/system/wake` via Electron `powerMonitor` + UI `visibilitychange`).
- **KPI Neto** — real owner net impact (`humanMinutesSaved - humanCorrectionMinutes`), displayed in the Inbox-First (`simpleview`) owner view.
- **Autonomous Intake** — `POST /api/intake`, incremental UID read-only IMAP polling (`EXAMINE` + `BODY.PEEK[]`), and sandboxed `Fanal-Inbox` folder watcher drained in the morning *Reprise Matinale*.

## Installation & cross-platform verification (`apps/desktop/` & CI)

- **One client installer (`apps/desktop/`)**: Fanal Desktop bundles the Electron Node runtime (`process.execPath` + `ELECTRON_RUN_AS_NODE=1`) and synced `supervisor/` + `ui/` copies (`tools/sync-desktop.mjs`). End users install one application — never DSH or third-party runtimes.
- **Standalone npm server (`supervisor-pkg/`)**: `@javierfrancoleal/dsh-supervisor` (`Node >= 24`), synced byte-for-byte with `supervisor/` via `node tools/sync-desktop.mjs --all`.
- **Cross-platform CI (`.github/workflows/ci.yml`)**: `check` (`ubuntu-latest`), `check-windows` (`windows-latest`), and `desktop-windows-smoke` (`windows-latest`, source + `--packed` ASAR Electron smoke).
- **Remaining operational step**: paid code-signing certificates (Apple Developer ID / Azure Trusted Signing) prior to public broad distribution.

## Version matrix (the distribution release)

| Fanal Desktop | Supervisor & `supervisor-pkg` | Curated Brains | Workspace Organs (`jfranco-*`) |
|---|---|---|---|
| `0.1.0` (Electron 45) | `1.0.182+` (`Node >= 24`) | `deepseek-flash`/`v4-pro` + `gemini-3.8-flash`/`4-argon` + Ollama | `26` classified in `docs/ACTIVE-CATALOG.md` |
