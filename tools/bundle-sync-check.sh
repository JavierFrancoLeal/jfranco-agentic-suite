#!/bin/sh
# Bundle-sync guard (lesson #17): the app bundle's brain copies must be
# identical to the supervisor sources — the chain failure that once shipped
# a page whose server could not serve it. Fails CI when out of sync.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FAIL=0
for pair in \
  "supervisor/server.js:apps/desktop/brain/server.js" \
  "supervisor/dashboard.html:apps/desktop/brain/dashboard.html" \
  "ui/panel.html:apps/desktop/ui/panel.html" \
  "ui/manifest.webmanifest:apps/desktop/ui/manifest.webmanifest" \
  "ui/sw.js:apps/desktop/ui/sw.js"; do
  src="${pair%%:*}"; dst="${pair##*:}"
  if ! cmp -s "$ROOT/$src" "$ROOT/$dst"; then
    echo "BUNDLE SYNC FAILED: $src differs from $dst (run tools/sync-all.sh)"; FAIL=1
  fi
done
[ "$FAIL" = "0" ] && echo "BUNDLE SYNC PASSED: app bundle in step with sources" || exit 1
