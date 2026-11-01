#!/bin/sh
# J.Franco suite — npm publisher. Created by J.Franco. MIT.
# Publishes the six @jfranco/* packages to the npm registry (scope @jfranco).
#
# ONE-TIME prerequisite (run in your Terminal, with YOUR token — the token
# never needs to be shared with anyone):
#   pnpm config set //registry.npmjs.org/:_authToken=npm_YOUR_TOKEN
#
# Then run: sh tools/publish.sh
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
         jfranco-accountability-auditor jfranco-interpreter jfranco-autonomy-grader; do
  echo ""
  echo "Publishing $p…"
  (cd "$p" && "$NODE" "$PNPM" publish --access public --no-git-checks)
done

echo ""
echo "All six packages published. Install them with:"
echo "  dsh plugin --profile desktop add @jfranco/workflow-master"
echo "  dsh plugin --profile desktop add @jfranco/input-detector"
echo "  dsh plugin --profile desktop add @jfranco/decision-router"
echo "  dsh plugin --profile desktop add @jfranco/accountability-auditor"
echo "  dsh plugin --profile desktop add @jfranco/interpreter"
echo "  dsh plugin --profile desktop add @jfranco/autonomy-grader"
