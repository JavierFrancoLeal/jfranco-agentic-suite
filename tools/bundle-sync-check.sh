#!/bin/sh
# Bundle-sync guard (lesson #17): the app bundle's brain copies must be
# identical to the supervisor sources — the chain failure that once shipped
# a page whose server could not serve it. Fails CI when out of sync.
# Delegates to tools/sync-desktop.mjs --check (the single manifest source).
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NODE="${DSH_NODE:-}"
if [ -z "$NODE" ]; then
  for c in "/Applications/DeepSeek Harness.app/Contents/Resources/runtime/primary-runtime/dependencies/node/bin/node" "$(command -v node 2>/dev/null)"; do
    if [ -n "$c" ] && [ -x "$c" ]; then NODE="$c"; break; fi
  done
fi
[ -z "$NODE" ] && { echo "FAIL node not found"; exit 1; }
exec "$NODE" "$ROOT/tools/sync-desktop.mjs" --check
