# @javierfrancoleal/cockpit-browser — EL NAVEGADOR DE CABINA

> ⚡ **Super Agent Ready** — the internal Claude Cowork–style browser for DeepSeek
> Harness's `WebContentsView`, with the Fanal-proven safety rails.

The cockpit browser opens the client's web ecosystems (Google, Microsoft, the
portals) inside the Electron shell while the agent fills the forms and the human
keeps the wheel. Zero dependencies, zero `eval`, security first.

- **Persistent encrypted session** — `partition: persist:fanal-client-workspace`;
  passwords live in the SYSTEM keychain (macOS Keychain / Windows DPAPI) via
  `safeStorage`, never in code.
- **Double isolation** — the web panel blocks `file://` (`will-navigate`); the
  documents panel cancels the internet (`onBeforeRequest` → `file:/data:` only).
- **Constitutional brake** — the agent fills (`executeJavaScript` + `input`/`change`)
  and never clicks Envoyer/Soumettre/Payer/Transmettre.
- **36px HUD** — ⚡ AGENTE / 🖐️ VOLANTE HUMANO / 🛑 FRENO, with pause, the +1
  single-step debugger, and physical-mouse auto-detection (`before-input-event`).
- **Dual-monitor without data loss** — `screen` hotplug reparents the live views
  (`removeChildView`/`addChildView`); the half-filled form stays intact.
- **The golden rule** — the user commands, the agent assists; every agent click
  leaves the emerald border.

## Install

```bash
dsh plugin --profile <perfil> add @javierfrancoleal/cockpit-browser
```

Restart the app after install. See `assets/cockpit-browser.md` for the skill the
agent loads, and `assets/recipes.md` for the copy-paste Electron recipes.
