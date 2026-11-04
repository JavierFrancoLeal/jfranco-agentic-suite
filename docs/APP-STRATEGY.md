# App strategy — Fanal as a real application

Can the dashboard become an application for different systems, something
like DeepSeek Harness? **Yes — and the path is already paved.** Here is the
engineering plan.

## Where we are today (already an app, sort of)

- The dashboard and the panel are a **PWA** (manifest + service worker):
  they install on Android, iOS, and desktop browsers, work offline, and
  get their own icon (the one-stroke eye).
- The **brain** is the supervisor server (Node ≥ 24) — the "DeepSeek
  Harness" equivalent of the suite: it hosts accounts, the live flow, and
  telemetry.
- DeepSeek Harness itself is an **Electron** app. We follow the same
  proven path.

## The three layers of "becoming an app"

### 1. Desktop app (macOS / Windows / Linux) — Electron or Tauri

- Wrap the dashboard + panel in a **Tauri** shell (lighter than Electron;
  same Rust/WebView pattern) or Electron (exact DSH pattern).
- What it adds: window with its own icon, **kiosk mode** for kitchen
  tablets, auto-launch at login, system tray, native notifications,
  auto-updater, and a real installer (`.dmg`, `.exe`, `.AppImage`).
- The supervisor can ship INSIDE the app (bundled Node) or stay separate
  for multi-device businesses.

### 2. Mobile/tablet app (Android / iOS) — Capacitor

- Capacitor wraps the SAME web code (one codebase, zero rewrite) into an
  APK/AAB and an IPA.
- What it adds: Play Store / App Store distribution, **enterprise MDM**
  for fleets of tablets, push notifications, and background sync.
- iOS note: Capacitor bridges get full microphone access — dictation
  becomes rock-solid on iPads too.

### 3. The brain as an appliance — one-click installers

- `jfranco-supervisor` already runs anywhere with Node ≥ 24.
- Next step: a **one-command installer** per OS that sets up the server,
  the API key, the users, and the auto-start — turning any mini PC into a
  "Fanal appliance" (like a NAS or a POS terminal).

## The distribution story (mirroring DeepSeek Harness)

| Layer | DeepSeek Harness | Fanal |
|---|---|---|
| Desktop shell | Electron app | Tauri/Electron wrapper |
| Engine | DSH core (Node) | Supervisor (Node ≥ 24) |
| Extensions | Cordis plugins (npm) | The 7 npm plugins + sector packs |
| Mobile | Web PWA | PWA today → Capacitor apps |
| Distribution | Official downloads | GitHub Releases → app stores |

## Recommendation (phased)

1. **Now — Phase 1:** PWA + `jfranco-supervisor` + `install.sh/ps1` (done).
   Enough for the first pilots: "open this URL, add it to the Home screen."
2. **Phase 2 — desktop wrappers:** Tauri scaffold with kiosk mode and
   auto-updater; ship `Fanal.app`, `.exe`, `.AppImage`. Target: the
   kitchen tablet and the owner's computer.
3. **Phase 3 — mobile stores:** Capacitor builds (APK/AAB + IPA) for MDM
   fleets. Target: chains with many tablets.
4. **Phase 4 — appliance image:** a Raspberry Pi/mini-PC image that boots
   straight into Fanal (brain + dashboard preconfigured).

## What never changes

The web code is the single source of truth. Every wrapper reuses it — so
the 10 languages, the sectors, and the live flow stay identical everywhere.

## 2026-11-03 — The multiplatform truth: one web brain, many skins

The entire product is ONE web application (supervisor server + HTML/JS/CSS).
The Electron app is a thin shell (~120 lines) around the same page; the
PWA (manifest + service worker) is already in the repo; the panel is
already mobile-first. Platforms are SKINS over one brain.

| Platform | Web link | PWA (install) | Desktop shell | Native |
|---|---|---|---|---|
| macOS | ✔ | ✔ | ✔ dmg (today) | — |
| Windows | ✔ | ✔ | Electron (CI build + signing) | — |
| Linux | ✔ | ✔ | Electron (AppImage/deb) | — |
| Android | ✔ | ✔ (Chrome: Add to Home) | — | Capacitor later |
| iOS | ✔ | ✔ (Safari: Add to Home) | — | Capacitor later ($99/yr) |

What works everywhere (web-native): the whole dashboard, register, orders,
wallboard, roles, 10 languages, dark mode, audio, notifications (desktop +
Android + iOS 16.4+ PWAs), dictation (Chrome/Safari/Edge/Electron).

Platform-specific notes: the BRAIN (server) runs on the owner's computer
(macOS/Win/Linux — pure zero-dependency Node, already portable); phones
and tablets are always CLIENTS. Desktop Windows/Linux builds move to
GitHub Actions (one config → 4 artifacts). The duo app+web is already
real: the same supervisor serves the Electron shell, any browser, and the
PWA — and the public tunnel already gives the web link.

Realpolitik staging: (1) NOW — duo + PWA; verify on a real phone browser,
fix responsive issues (zero cost). (2) Windows/Linux via CI builds.
(3) Capacitor native only when a client demands the store presence.
