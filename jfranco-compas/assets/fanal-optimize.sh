#!/bin/sh
# fanal-optimize.sh — the COMPÁS audit: Fanal × DSH optimizations, filtered.
# Compares Fanal against the optimization checklist distilled from DeepSeek
# Harness, and reports ONLY what makes sense for a sovereign agentic
# orchestration layer. Never over-engineers: DSH pieces that do not apply
# (client plugin ecosystem, Cordis runtime inside the product, chat
# sources) are listed as INTENTIONALLY EXCLUDED, not as warnings.
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SV="$ROOT/supervisor"; APP="$ROOT/apps/desktop"
pass=0; warn=0; ok=0

chk() { # chk <label> <condition-expr>
  if eval "$2"; then ok=$((ok+1)); echo "  ✔ $1"; else warn=$((warn+1)); echo "  ⚠ $1"; fi
}

echo "== COMPÁS — Fanal optimization audit (DSH-derived, filtered) =="

echo "— The one brain × many skins (DSH pattern):"
chk "Electron single-instance lock"        "[ -n \"$(grep -l requestSingleInstanceLock "$APP/main.js" 2>/dev/null)\" ]"
chk "Electron kiosk mode (kitchen tablet)" "[ -n \"$(grep -l -- '--kiosk' "$APP/main.js" 2>/dev/null)\" ]"
chk "win/linux electron targets"           "[ -n \"$(grep -l '\"win\"' "$APP/package.json" 2>/dev/null)\" ]"
chk "PWA manifest + service worker"        "[ -f "$ROOT/ui/manifest.webmanifest" ] && [ -f "$ROOT/ui/sw.js" ]"
chk "offline cache in sw"                  "[ -n \"$(grep -l caches "$ROOT/ui/sw.js" 2>/dev/null)\" ]"

echo "— Production hardening (DSH token gate pattern):"
chk "token gate (SUPERVISOR_TOKEN)"        "[ -n \"$(grep -l SUPERVISOR_TOKEN "$SV/server.js" 2>/dev/null)\" ]"
chk "batched /api/state"                   "[ -n \"$(grep -l 'api/state' "$SV/server.js" 2>/dev/null)\" ]"
chk "client key silo (settings.json)"      "[ -n \"$(grep -l settings.json "$SV/server.js" 2>/dev/null)\" ]"

echo "— The sovereignty layer (Fanal specifics):"
chk "sector packs present"                 "[ -f "$ROOT/docs/sector-packs/restaurant.json" ]"
chk "guard gates (check.sh + verify-app)"  "[ -f "$ROOT/tools/check.sh" ] && [ -f "$ROOT/tools/verify-app.sh" ]"
chk "routing table + telemetry in server"  "[ -n \"$(grep -l 'const ROUTES' "$SV/server.js" 2>/dev/null)\" ]"

echo "— The installers (mac + windows), ready to build:"
chk "appId without the old brand"          "[ -n \"$(grep -l 'ca.trasunto.fanal' "$APP/package.json" 2>/dev/null)\" ]"
chk "win targets nsis + portable"          "[ -n \"$(grep -l 'nsis' "$APP/package.json" 2>/dev/null)\" ]"
chk "bundled runtime spawn (process.execPath)" "[ -n \"$(grep -l process.execPath "$APP/main.js" 2>/dev/null)\" ]"
chk "runtime pack renamed (trasunto-runtime)" "[ -d "$ROOT/dist/trasunto-runtime" ]"
chk "watchdog (brain rebirth + scripts)"     "[ -n \"$(grep -l brain.on "$APP/main.js" 2>/dev/null)\" ] && [ -f "$ROOT/tools/watchdog.sh" ] && [ -f "$ROOT/tools/watchdog.cmd" ]"

echo "— The one warning that matters for client machines:"
if [ -n "$(grep -l 'require("http")\|createServer' "$SV/server.js" 2>/dev/null)" ]; then
  echo "  ⚠ The supervisor is a Node script: the CLIENT host needs Node ≥18. DSH ships its own runtime — for production Fanal, bundle a node runtime in the installer (the desktop app already does)."
  warn=$((warn+1))
fi

echo ""
echo "— Intentionally EXCLUDED from Fanal (DSH pieces that do not apply):"
echo "  · the client plugin ecosystem (ModuleLoader) — Fanal has no third-party UI plugins"
echo "  · the Cordis runtime inside the product — Fanal is a product, not a harness"
echo "  · chat/GitHub/Feishu sources — Fanal is the silo, not the factory"
echo "  · profiles-per-purpose — one silo per install is simpler and sovereign"
echo ""
echo "== Result: $ok ok · $warn to review =="
[ "$warn" -eq 0 ]
