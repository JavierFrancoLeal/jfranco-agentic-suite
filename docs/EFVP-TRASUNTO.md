# EFVP — Évaluation des facteurs relatifs à la vie privée (Trasunto)

*Québec Loi 25 (art. 17-18): the written evaluation required before
personal information is communicated outside Québec. Updated
2026-11-14 for Fanal v0.1 / Dual BYOK + Local Ollama architecture.*

## The flow under evaluation

Fanal reads a conversation, incoming email/folder item, or form on the
CLIENT's machine and sends the redacted prompt text to the closed
curated brain selected and consigned by the client at setup:
- **100 % Local (`local_only`)**: local Ollama inference — zero external
  transmission.
- **Closed Dual BYOK (`dual_cloud`)**: client's own DeepSeek API key
  (`deepseek-flash` / `deepseek-v4-pro`) and/or Google Gemini key
  (`gemini-3.8-flash` / `gemini-4-argon`), both outside Québec.

## What travels and what does not

- **Travels (only in `dual_cloud`, never in `local_only`)**: the
  PII-veiled text fragment or structured fields needed for the proposal.
- **Does NOT travel**: unredacted client names/phones/emails (when PII
  Veil 2.0 masks them), local constitution (`decisions.md`), company
  memory, vault keys, IMAP credentials, raw files inside `Fanal-Inbox`,
  anonymized local telemetry, and local diagnostic logs.

## The risk factors and the mitigations

| Factor | Risk | Mitigation (already built in code) |
|---|---|---|
| Destination outside Québec/Canada (DeepSeek / Gemini) | cross-border transfer | CLIENT holds the account and BYOK keys inside their own local vault; Trasunto holds no multi-tenant copy |
| Consent & closed catalog | absent or arbitrary endpoint drift → non-compliant | Closed catalog in [`brain-catalog.js`](../supervisor/brain-catalog.js) rejects uncurated endpoints (`400 closed_curated_catalog`); choice is consigned locally |
| Data retention / cloud exposure | foreign provider retention | First-class **`local_only` (Ollama)** mode — zero data leaves the machine |
| Credential storage on disk | plaintext secret exposure | Electron Vault uses scrypt (`N=65536`) + `AES-256-GCM` (`AESGCM2:`) with OS biometric key wrapping, RAM zeroization on lock (`POST /api/internal/vault-key`), and chmod `0600` silo |
| Telemetry & support exports | accidental PII / API-key leaks | Telemetry records types/tiers only; [`diagnostic-sanitizer.js`](../supervisor/diagnostic-sanitizer.js) strips secrets & PII before diagnostic export |
| Incoming email & inbox files | unintended mailbox mutation or path traversal | [`intake-engine.js`](../supervisor/intake-engine.js) reads IMAP strictly read-only (`EXAMINE` + `BODY.PEEK[]`), confines `Fanal-Inbox` via [`desktop-sandbox.js`](../apps/desktop/desktop-sandbox.js), and uses constant-time/serialized cursors |
| PII in prompts | names/phones/emails leave to cloud | PII Veil 2.0: Unicode-aware, accent-insensitive, longest-first masking before external calls |
| Prompt injection | external text could override rules | Untrusted text travels inside random delimiters with last-line constitutional lock (floor price / escalations remain human-signed) |
| Erasure & exit | right to be forgotten | Client erases their local silo; Trasunto holds no remote copy |

## The conclusion

Compliant **when** the client's brain mode (`local_only` or `dual_cloud`),
BYOK keys, and written pilot agreement are consigned before processing
client personal data. Residual risk: provider-side retention for cloud
API tiers chosen in `dual_cloud` — mitigated by `local_only` mode, PII
Veil 2.0, and the client's direct provider terms.

## Status of the 6 Loi 25 system safeguards

| Safeguard | Document / Evidence | Status (2026-11-14) |
|---|---|---|
| 1. Public privacy policy (art. 8.2) | [`POLITIQUE-CONFIDENTIALITE.md`](../POLITIQUE-CONFIDENTIALITE.md) & [`LEGAL/POLITIQUE-CONFIDENTIALITE.md`](./LEGAL/POLITIQUE-CONFIDENTIALITE.md) | **Documented & reconciled (v1.1)** |
| 2. Privacy Officer named (art. 3.1) | Javier Alejandro Franco Leal (Trasunto inc.) in both privacy docs | **Documented** |
| 3. Incident & breach protocol (art. 3.5-3.8) | [`LEGAL/PROTOCOLE-INCIDENTS.md`](./LEGAL/PROTOCOLE-INCIDENTS.md) (72 h CAI rule) | **Documented** |
| 4. Client EFVP template (art. 17) | [`LEGAL/EFVP-MODELE-CLIENT.md`](./LEGAL/EFVP-MODELE-CLIENT.md) | **Template ready; fill per pilot** |
| 5. Retention & destruction schedule | [`LEGAL/RETENTION-DESTRUCTION.md`](./LEGAL/RETENTION-DESTRUCTION.md) | **Documented** |
| 6. Signed Accord-Pilote + direct contact email | Pilot contract + corporate email before external pilot onboarding | **Operational sign-off before Pilot #1** |
