# Le Veilleux Desktop

Created by **J.Franco** — the universal sector dashboard as a desktop
application. An Electron shell (the same proven pattern as DeepSeek
Harness) around the Le Veilleux dashboard, with kiosk mode for kitchen and
back-office screens.

## Note for DeepSeek Harness sessions

If your shell exports `ELECTRON_RUN_AS_NODE=1` (the Harness runtime does),
launch with `env -u ELECTRON_RUN_AS_NODE …` before the electron command.
Normal user terminals do not have this variable.

## Run

```sh
npm install
LE_VEILLEUX_URL=http://127.0.0.1:8787/dashboard npm start   # normal window
LE_VEILLEUX_URL=http://127.0.0.1:8787/dashboard npm run kiosk  # fullscreen kiosk
```

- The dashboard URL defaults to `http://127.0.0.1:8787/dashboard`
  (the supervisor running on the same machine).
- A system tray icon keeps the app alive on macOS; close the window and
  reopen it from the tray.
- External links (the Action Panel, docs) open in the default browser.

## Smoke test (no window lingering)

```sh
LE_VEILLEUX_SMOKE=1 npm start   # prints "SMOKE OK — window loaded" and quits
```

## Build installers

```sh
npm run dist   # .dmg + .zip (macOS), .exe (Windows), .AppImage (Linux)
```

## License

MIT.
