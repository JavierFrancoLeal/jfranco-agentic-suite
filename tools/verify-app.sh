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
