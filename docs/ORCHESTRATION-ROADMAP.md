# ORCHESTRATION-ROADMAP — is Fanal a full agentic orchestration layer?

*Honest self-audit (2026-11-05). Two questions: (1) are we doing
everything possible to make Fanal an agentic orchestration layer?
(2) are we optimizing like DSH and other Electron apps?*

## 1. The orchestration layer — what we HAVE

| Capability | State |
|---|---|
| One brain × many skins (browser, Electron, PWA, panel, wallboard) | ✔ built |
| Dual brain INSIDE the app (deepseek-flash real-time · deepseek-v4-pro deep) | ✔ live-proven |
| Decision tiers at every step (GREEN/SEMI/YELLOW/RED traffic light) | ✔ built |
| HITL surfaces (10 s alert bar, notification inbox, confirm, register) | ✔ built |
| Two-worlds isolation (client data separate, keys never mix) | ✔ by design |
| The 7 organs (workflow-master, decision-router, audit, grader, forensics) | ⚠️ exist as DSH skills OUTSIDE the app runtime (campo profile) |
| Knowledge Ledger + guard gates (check.sh, verify-app) | ✔ |

## 2. The gaps — FILLED 2026-11-05

1. ✅ Organs' governance core embedded in the supervisor: routing table
   (ROUTES: transcript/translate/studio → flash, deep → v4-pro, budgets),
   telemetry (tiers, calls, decisions, executor actions, autonomy level),
   executor with the traffic light (GREEN actions logged for verification).
   The full skill pipeline still runs in the CLI profile (documented).
2. ✅ Executor live: GREEN actions recorded (first proven action: the
   field summary self-archives to the reports).
3. ✅ Routing table live (intent → model → budget).
4. ✅ In-app telemetry: the 🩺 Supervision card (tiers, calls, decisions,
   autonomy level, last actions) fed by the aggregated /api/state.
5. ✅ Federation minimal: /api/nodes registry (one node per organism,
   master console can list/register).

## 3. The optimizations — DONE 2026-11-05

| Optimization | State |
|---|---|
| Token-gated web (DSH's ?token=) | ✅ SUPERVISOR_TOKEN env: when set, /dashboard and /panel require ?token= or x-supervisor-token |
| Batched /api/state | ✅ one aggregate call (health, live, alerts, shift, studio, telemetry) |
| Offline PWA shell | ✅ already present (panel + assets cache-first, HTML fallback) |
| Electron single-instance + kiosk | ✅ already present (requestSingleInstanceLock, --kiosk) |
| win/linux targets | ✅ already configured in electron-builder |
| Code signing / notarization | ⏳ operator step (Apple Developer certificate) |
| Module splitting / lazy loading | ⏳ deferred on purpose (lesson #17: assets must travel together; the single-file dashboard is the battle-tested artifact) |

## 4. Priority order (updated)

1. **The organs are not INSIDE the app.** The app calls the two brains
   directly; the organ pipeline (listen → split actions → route tiers →
   audit → grade) runs in the CLI profile, not in the Fanal runtime.
   → Embed the organs' logic in the supervisor (server-side) so every
   transcript also produces the tier route, the audit entry and the
   telemetry.
2. **No action execution.** Fanal proposes and decides, but does not yet
   EXECUTE actions (the bridge posts are drafts for the human). An
   orchestration layer needs an Executor with the same tier rules
   (GREEN = auto, SEMI = verify, YELLOW = propose).
3. **No routing table.** The dual brain is hardcoded. An orchestration
   layer routes: intent → model/tool → budget → fallback. Add a small
   routing table (flash for real-time, v4-pro for deep, local for
   offline, budget caps per tier).
4. **No in-app telemetry.** The supervision log, the grade summary and
   the audit output exist in files, not in the dashboard.
5. **No federation/tenancy.** One supervisor per install. The MRC nodes
   will need multi-instance supervision from one console.

## 3. Platform optimization — what DSH does that we can adopt

DSH patterns: one web shell served by the runtime with token-gated URLs,
dual-face plugins (host + client halves), client modules loaded on
demand, locale/theme tokens as separate artifacts.

| Optimization | Our state | Action |
|---|---|---|
| Module splitting / lazy load | dashboard.html is one big file (10 locales inline) | split locale + views into lazy artifacts (mind lesson #17: assets travel together) |
| Token-gated web (DSH's ?token=) | dashboard is open; login is in-app | add an optional token gate for LAN exposure |
| Offline PWA shell | manifest + sw exist | cache the shell + panel for offline-first |
| Batched polling | several endpoints polled every 3–6 s | one /api/state aggregate |
| Electron production (auto-update, single-instance, tray, kiosk) | not present | add for the kitchen tablet + client machines |
| Code signing / notarization | DMG unsigned | sign for client installs (Gatekeeper) |
| Windows/Linux builds | mac arm64 only | electron-builder targets when the first client asks |

## 4. Priority order (updated)

1. ✅ Done: organs' core, routing table, telemetry, executor, federation stub, token gate, /api/state.
2. Signing/notarization before the first real client install (operator step).
3. Module splitting only if a real performance need appears on client hardware.

## 5. Client sovereignty architecture (2026-11-05 decision)

The client is an information SILO and the owner of everything in it:

- The client's own DEEPSEEK_API_KEY, written on the client's machine only
  (owner UI card → DATA_DIR/settings.json; the key is never returned by
  any endpoint, never logged, never leaves the silo).
- The client recharges their own tokens; Trasunto holds no keys, no data,
  no telemetry content.
- Trasunto's product role: install, update, automate (the DSH factory
  produces the updates; the client receives them as Fanal releases),
  accompany. Loi 25: Trasunto ne détient ni ne traite aucun renseignement
  personnel — minimal obligations by design.
- Exit guarantee: the client can change key or provider at any moment;
  the AI keeps working without Trasunto.

Implemented: /api/settings/key (owner), /api/settings/status, clientKey()
takes precedence over the environment key, the 🔑 key card in the owner
view, and the sovereignty paragraph in the Plan d'affaires (Section 9).
