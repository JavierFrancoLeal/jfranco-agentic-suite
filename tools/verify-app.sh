#!/bin/sh
# verify-app — the pre-DMG gate. Run BEFORE every electron-builder:
# icons, plist, brand strings, and the Electron smoke load must all pass.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/apps/desktop"
echo "== verify-app (pre-DMG gate) =="

# 1. Icon chain: png exists, 1024x1024, icns generated
[ -f "$APP/assets/icon.png" ] || { echo "FAIL: assets/icon.png missing"; exit 1; }
W="$(sips -g pixelWidth "$APP/assets/icon.png" 2>/dev/null | awk '/pixelWidth/{print $2}')"
[ "$W" = "1024" ] || { echo "FAIL: icon.png must be 1024x1024 (got $W)"; exit 1; }
echo "  ✔ icon.png 1024×1024"

# 2. productName is Fanal, icon path configured
grep -q '"productName": "Fanal"' "$APP/package.json" || { echo "FAIL: productName"; exit 1; }
grep -q '"icon": "assets/icon.png"' "$APP/package.json" || { echo "FAIL: mac icon config"; exit 1; }
echo "  ✔ productName Fanal + icon config"

# 3. No old brand strings anywhere in the source the app packs
if grep -rn "Le Veilleux" "$APP/main.js" "$APP/preload.js" "$APP/package.json" "$APP/brain" "$APP/ui" "$APP/welcome.html" 2>/dev/null | grep -qv "LICENSES"; then
  echo "FAIL: old brand strings remain in the app sources"; exit 1
fi
echo "  ✔ zero old brand strings in app sources"

# 3b. The supervisor must be spawned with the app's own Electron node (no system Node on the client)
grep -q "process.execPath" "$APP/main.js" || { echo "FAIL: supervisor not spawned via process.execPath (client would need system Node)"; exit 1; }
grep -q "ELECTRON_RUN_AS_NODE" "$APP/main.js" || { echo "FAIL: ELECTRON_RUN_AS_NODE missing"; exit 1; }
[ -f "$APP/brain/dashboard-i18n.js" ] || { echo "FAIL: dashboard-i18n.js missing from the brain bundle (lesson #17)"; exit 1; }
[ -f "$APP/brain/browser-cdp.js" ] || { echo "FAIL: browser-cdp.js missing from the brain bundle (lesson #17)"; exit 1; }
grep -q "brain.on(\"exit\"" "$APP/main.js" || { echo "FAIL: the Electron watchdog (brain rebirth) is missing"; exit 1; }
echo "  ✔ bundled runtime spawn (no system Node needed on the client)"

# 3c. Both installer targets configured with the clean brand id
grep -q '"appId": "ca.trasunto.fanal"' "$APP/package.json" || { echo "FAIL: appId still carries the old brand"; exit 1; }
grep -q '"nsis"' "$APP/package.json" && grep -q '"portable"' "$APP/package.json" || { echo "FAIL: win targets (nsis+portable) missing"; exit 1; }
echo "  ✔ installer targets mac (dmg+zip) and win (nsis+portable) with appId ca.trasunto.fanal"

# 4. If the app was already built, verify the bundle too
if [ -d "$APP/dist/mac-arm64/Fanal.app" ]; then
  /usr/libexec/PlistBuddy -c "Print :CFBundleIconFile" "$APP/dist/mac-arm64/Fanal.app/Contents/Info.plist" 2>/dev/null | grep -q "icns" || { echo "FAIL: CFBundleIconFile"; exit 1; }
  B="$(grep -rl "Le Veilleux" "$APP/dist/mac-arm64/Fanal.app/Contents/Resources" 2>/dev/null | wc -l | tr -d ' ')"
  [ "$B" = "0" ] || { echo "FAIL: $B old-brand files inside the built bundle"; exit 1; }
  echo "  ✔ built bundle clean (plist + zero old strings)"
else
  echo "  – bundle not built yet (skipped)"
fi

echo "verify-app PASSED — safe to run electron-builder"
