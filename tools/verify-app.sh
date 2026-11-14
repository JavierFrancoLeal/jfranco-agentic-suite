#!/bin/sh
# verify-app — the pre-DMG gate. Run BEFORE every electron-builder:
# icons, plist, brand strings, and the Electron smoke load must all pass.
# The static checks live in tools/verify-app.mjs (cross-platform); this
# wrapper resolves Node, runs them, then keeps the optional GUI launch smoke.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
APP="$ROOT/apps/desktop"
echo "== verify-app (pre-DMG gate) =="

NODE="${DSH_NODE:-}"
if [ -z "$NODE" ]; then
  for c in "/Applications/DeepSeek Harness.app/Contents/Resources/runtime/primary-runtime/dependencies/node/bin/node" "$(command -v node 2>/dev/null)"; do
    if [ -n "$c" ] && [ -x "$c" ]; then NODE="$c"; break; fi
  done
fi
[ -z "$NODE" ] && { echo "FAIL node not found"; exit 1; }

"$NODE" "$ROOT/tools/verify-app.mjs"


# LA LECCIÓN #35: el paquete no es el vuelo — la prueba de arranque real
# (el smoke en el modo gráfico limpio, sin la variable que lo convierte en NODE)
if [ -x "apps/desktop/node_modules/.bin/electron" ] && [ -f "apps/desktop/main.js" ]; then
  echo "launch-test: el smoke en el entorno GUI limpio (hasta 35s)..."
  (cd apps/desktop && export PATH="/Applications/DeepSeek Harness.app/Contents/Resources/runtime/primary-runtime/dependencies/node/bin:$PATH" && env -u ELECTRON_RUN_AS_NODE LE_VEILLEUX_SMOKE=1 ./node_modules/.bin/electron . > /tmp/fanal-launch-test.log 2>&1 & EPID=$!; sleep 35; pkill -9 -x Electron 2>/dev/null; wait $EPID 2>/dev/null; grep -q "SMOKE OK" /tmp/fanal-launch-test.log && echo "launch-test PASSED — the window really loads" || { echo "launch-test FAIL — the window did not load:"; head -6 /tmp/fanal-launch-test.log; exit 1; })
fi
