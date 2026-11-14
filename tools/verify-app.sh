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


# Lesson #35: the package is not the flight — run the real Electron smoke load
# cleanly via tools/smoke-desktop.mjs (unless --skip-smoke is passed).
if [ "${1:-}" != "--skip-smoke" ] && [ -e "apps/desktop/node_modules/electron" ] && [ -f "apps/desktop/main.js" ]; then
  echo "launch-test: real Electron smoke run..."
  "$NODE" "$ROOT/tools/smoke-desktop.mjs"
fi
