# INSTALLERS — building Fanal for macOS and Windows

*The two installers are built from the same code, the same brain bundle,
and the same pre-build gate. Everything below is prepared; nothing is
generated here.*

## The pre-build gate (ALWAYS first)

```sh
sh tools/check.sh          # ALL CHECKS PASSED (smoke, bootflow, css, api)
sh tools/verify-app.sh     # icons, productName, appId, spawn, targets, zero old brand
sh tools/fanal-optimize.sh # the Compás audit: 15 ok expected (1 informational warning)
```

Only when all three pass, build. The Electron app spawns the supervisor
with its OWN node (`process.execPath` + `ELECTRON_RUN_AS_NODE=1`), so the
client's macOS or Windows machine needs NOTHING installed — not even
Node.js.

## The artifacts

| Platform | Commands (run in `apps/desktop`) | Output |
|---|---|---|
| 🍎 macOS | `env -u ELECTRON_RUN_AS_NODE CSC_IDENTITY_AUTO_DISCOVERY=false ./node_modules/.bin/electron-builder --mac dmg zip --arm64` · `--x64` for Intel | `dist/Fanal-<version>-<arch>.dmg` + `.zip` |
| 🪟 Windows | `env -u ELECTRON_RUN_AS_NODE CSC_IDENTITY_AUTO_DISCOVERY=false ./node_modules/.bin/electron-builder --win nsis portable --x64` | `dist/Fanal-<version>-x64.exe` (NSIS installer) + portable `.exe` |

Config already in `package.json` → `build`: `appId: ca.trasunto.fanal`,
`productName: Fanal`, win targets `nsis` + `portable`
(oneClick:false, desktop shortcut, changeable directory), mac targets
`dmg` + `zip`, the `trasunto-runtime` pack bundled as `extraResources`,
icons from `assets/icon.png` (electron-builder converts to `.icns` /
`.ico`).

## Signing (the operator step, before real client installs)

- macOS: an Apple Developer ID certificate → `CSC_NAME` + notarization
  (`APPLE_ID`/`APPLE_APP_SPECIFIC_PASSWORD`/`APPLE_TEAM_ID`). Without it,
  Gatekeeper warns the client.
- Windows: a code-signing certificate (OV/EV) → electron-builder
  `win.certificateFile`. Without it, SmartScreen warns the client.

The unsigned artifacts remain valid for the pilot and the SADC demo.

## The content of both installers (identical)

```
Fanal.app / Fanal.exe
 ├── main.js + preload.js          (single-instance, kiosk flag, window)
 ├── brain/  (dashboard + server)  (the whole supervisor — one brain)
 ├── ui/     (panel, manifest, sw) (the field + PWA pieces)
 └── runtime (trasunto-runtime)    (license notices etc.)
```

On first run the app walks the client through: language → the Fanal
animation → the closed 7-step installation (business, sector, client key,
macOS/Windows permissions, summary) → the owner account.
