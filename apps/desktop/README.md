# Fanal Desktop

Created by **J.Franco** — the Inbox-First universal sector dashboard as an
Electron desktop application (`ca.trasunto.fanal`). Includes a closed Dual BYOK
Vault (scrypt + OS biometric lock + RAM zeroization), sleep/wake power telemetry,
sandboxed `Fanal-Inbox` folder watching, and kiosk mode for back-office screens.

## Note for DeepSeek Harness sessions

If your shell exports `ELECTRON_RUN_AS_NODE=1` (the Harness runtime does),
launch with `env -u ELECTRON_RUN_AS_NODE …` before the electron command.
Normal user terminals do not have this variable.

## Run

```sh
npm install
npm start                                                      # normal window + auto-spawned local supervisor
npm run kiosk                                                  # fullscreen kiosk
LE_VEILLEUX_URL=http://127.0.0.1:8787/dashboard npm start      # optional custom loopback URL override
```

- The target defaults to `http://127.0.0.1:8787/dashboard` (env override name remains `LE_VEILLEUX_URL` for legacy test compatibility).
- A localized system tray icon (10 languages) keeps Fanal alive on macOS/Windows; closing the window hides to the tray.
- Vault security (`vault-biometric.js`): scrypt master password + Touch ID / Windows Hello unlock, with `FANAL_MASTER_KEY` handed to the bundled supervisor over internal loopback and zeroized in RAM on lock.
- External links open in the default browser via `desktop-sandbox.js`.

## Verification & smoke tests

```sh
node ../../tools/sync-desktop.mjs --check          # brain/ and ui/ match sources
node ../../tools/verify-app.mjs                    # static + darwin bundle checks
node ../../tools/smoke-desktop.mjs                 # Electron source smoke
node ../../tools/smoke-desktop.mjs --packed        # Electron ASAR unpacked/packed smoke
```

## Build installers

```sh
sh ../../tools/verify-app.sh
npm run dist   # .dmg + .zip (macOS), .exe (Windows), .AppImage (Linux)
```

## License

MIT.
