#!/bin/sh
# J.Franco suite — npm publisher (token path). Created by J.Franco. MIT.
#
# PREFERRED: Trusted Publishing via GitHub Actions (no tokens at all):
#   1. On npmjs.com, add the GitHub repo as a Trusted Publisher (one click).
#   2. Trigger .github/workflows/publish.yml from the GitHub Actions tab.
#
# This script is the manual alternative, used when you have an npm token
# with publish rights (granular tokens must include the @javierfrancoleal scope):
#   pnpm config set //registry.npmjs.org/:_authToken=npm_YOUR_TOKEN
#   sh tools/publish.sh
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

NODE="${DSH_NODE:-}"
if [ -z "$NODE" ]; then
  for c in "/Applications/DeepSeek Harness.app/Contents/Resources/runtime/primary-runtime/dependencies/node/bin/node" "$(command -v node 2>/dev/null)"; do
    if [ -n "$c" ] && [ -x "$c" ]; then NODE="$c"; break; fi
  done
fi
[ -z "$NODE" ] && echo "FAIL node not found" && exit 1
PNPM="${DSH_PNPM:-$HOME/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/pnpm/bin/pnpm.mjs}"

echo "Running the quality gate first…"
sh tools/check.sh

for p in jfranco-workflow-master jfranco-input-detector jfranco-decision-router \
         jfranco-accountability-auditor jfranco-interpreter jfranco-autonomy-grader jfranco-usage-auditor; do
  echo ""
  echo "Publishing $p…"
  (cd "$p" && "$NODE" "$PNPM" publish --access public --no-git-checks)
done

echo ""
echo "All six packages published. Install them with:"
echo "  dsh plugin --profile desktop add @javierfrancoleal/workflow-master"
echo "  dsh plugin --profile desktop add @javierfrancoleal/input-detector"
echo "  dsh plugin --profile desktop add @javierfrancoleal/decision-router"
echo "  dsh plugin --profile desktop add @javierfrancoleal/accountability-auditor"
echo "  dsh plugin --profile desktop add @javierfrancoleal/interpreter"
echo "  dsh plugin --profile desktop add @javierfrancoleal/autonomy-grader
  dsh plugin --profile desktop add @javierfrancoleal/usage-auditor"
