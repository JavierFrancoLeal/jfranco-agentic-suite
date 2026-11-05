# Compás — the platform optimizer organ

Use this skill when Fanal must be audited or optimized for a platform
(macOS, Windows, Linux, browser, PWA). The rule: optimize LIKE DeepSeek
Harness, but ONLY what makes sense for a sovereign agentic orchestration
layer — never over-engineer.

## The method

1. Run the checker shipped in the assets:
   `sh <assets>/fanal-optimize.sh` inside the Fanal workspace
   (or `sh tools/fanal-optimize.sh`).
2. Every ✔ item is fine. Every ⚠ item is a REAL gap to review.
3. Fix only the ⚠ items that matter for the deployment target.
4. Never touch the EXCLUDED list (below) just to imitate DSH.

## The checklist (distilled from DeepSeek Harness)

- One brain × many skins (browser, Electron, PWA, panel, wallboard).
- Electron hardening: single-instance lock, kiosk mode for the kitchen
  tablet, win/linux targets configured.
- PWA: manifest + service worker with an offline cache.
- Token gate for LAN exposure (SUPERVISOR_TOKEN, like DSH's ?token=).
- Batched state (one /api/state instead of many polls).
- Client key silo (the API key lives in the client's settings file).
- Bundled runtime for production installs (DSH ships its own Node —
  the client host must not need a system Node).
- Guard gates (check.sh + verify-app) before any artifact ships.

## Intentionally EXCLUDED (DSH pieces that do not apply to Fanal)

- The client plugin ecosystem (window.__ModuleLoader__): Fanal has no
  third-party UI plugins.
- The Cordis runtime inside the product: Fanal is a product, not a
  harness.
- Chat/GitHub/Feishu sources: Fanal is the silo; the factory lives at
  Trasunto.
- Profiles-per-purpose: one silo per install is simpler and sovereign.

## Report format

Always report: `N ok · M to review`, the concrete ⚠ items with the fix,
and nothing else. Do not propose changes from the EXCLUDED list.
