# Supported platforms — Linux, Windows, macOS, and Android

The suite is split in two parts, and each part has its own platform story:

- **The brain** (DeepSeek Harness + the six plugins + the Supervisor server)
  is Node.js-based and runs on **Linux, Windows, and macOS**.
- **The hands** (Action Panel, dashboard) are a Progressive Web App: any
  modern browser on **any device** — including **Android** phones and
  tablets, iPhones, and kiosks.

## Platform matrix

| Component | Linux | Windows | macOS | Android |
|---|---|---|---|---|
| DeepSeek Harness (host) | ✅ npm: `npm install -g @deepseek-ai/dsh` | ✅ desktop app | ✅ desktop app | ⚠️ not a host — use a brain on the LAN |
| Six plugins `@javierfrancoleal/*` | ✅ | ✅ | ✅ | ✅ (run on the brain) |
| Supervisor server (`server.js`, Node ≥24) | ✅ | ✅ | ✅ | ⚠️ not a host |
| Action Panel (PWA) | ✅ browser | ✅ browser | ✅ browser | ✅ Chrome (add to Home screen) |
| Dashboard (responsive, roles) | ✅ | ✅ | ✅ | ✅ browser over LAN |
| One-command installer | ✅ `install.sh` | ✅ `install.ps1` | ✅ `install.sh` | — (PWA only) |
| Autonomous launcher | ✅ `ui/DSH-Asistente.sh` | ✅ `ui/DSH-Asistente.bat` / `.ps1` | ✅ `ui/DSH-Asistente.applescript` | — (use panel) |
| Quality gate | ✅ `tools/check.sh` | ✅ `tools/check.ps1` | ✅ `tools/check.sh` | — |

## The Android story (honest)

Android devices are **clients, not brains**: the AI runs on the business
computer (Linux/Windows/macOS), and the tablet or phone is a window.

1. Start the Supervisor with `node server.js --lan` on the business network.
2. On the Android device, open `http://<server-ip>:8787/panel` (workers) or
   `/dashboard` (owner/lead) in Chrome.
3. Add it to the Home screen for a fullscreen app-like experience.
4. The panel's feedback form automatically talks to the Supervisor through
   the LAN address (fixed in this release).

Notes:
- Full "install as PWA" (with icon + offline) needs HTTPS; on a LAN the
  panel works as a normal web app. TLS on the Supervisor is on the roadmap.
- Voice dictation works in Chrome on Android; read-aloud too.

## Linux setup (brain)

```sh
npm install -g @deepseek-ai/dsh          # Node ≥24 required
sh install.sh                             # choose sector and mode
# set the API key once: export DSH_DEEPSEEK_API_KEY=sk-...
node supervisor/server.js --lan           # serve the business network
```

## Windows setup (brain)

```powershell
# Install DeepSeek Harness desktop, then:
powershell -ExecutionPolicy Bypass -File install.ps1
node supervisor\server.js --lan
```

## macOS setup (brain)

```sh
sh install.sh
node supervisor/server.js --lan
```
