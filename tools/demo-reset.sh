#!/bin/sh
# J.Franco suite — demo reset. Created by J.Franco. MIT.
# One command to prepare a clean, impressive demo state for a customer
# service business. Safe: archives previous logs instead of deleting them.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NODE="${DSH_NODE:-}"
if [ -z "$NODE" ]; then
  for c in "/Applications/DeepSeek Harness.app/Contents/Resources/runtime/primary-runtime/dependencies/node/bin/node" "$(command -v node 2>/dev/null)"; do
    if [ -n "$c" ] && [ -x "$c" ]; then NODE="$c"; break; fi
  done
fi
[ -z "$NODE" ] && echo "node not found" && exit 1

echo "=== J.Franco demo reset ==="

# 1. Demo users (owner + agent)
"$NODE" "$ROOT/supervisor/server.js" init --owner DemoOwner --password demo-owner --employee DemoAgent --employee-password demo-agent

# 2. Archive previous demo logs (never delete history)
STAMP="$(date +%s)"
for f in supervision.md feedback.md usage.md audit.md; do
  [ -f "$HOME/.dsh/$f" ] && mv "$HOME/.dsh/$f" "$HOME/.dsh/$f.demo-$STAMP"
done

# 3. Starter rules: customer service sector
{
  echo "# decisions.md — demo rules (customer service)."
  echo "# Edit freely: these replace the defaults."
  echo ""
  cat "$ROOT/docs/decisions-customerservice.md"
} > "$HOME/.dsh/decisions.md"

# 4. Done
echo ""
echo "Demo state ready."
echo ""
echo "Start the supervisor:"
echo "  node supervisor/server.js --lan"
echo ""
echo "Then open (replace <mac-ip> with this computer's IP):"
echo "  Owner dashboard:  http://<mac-ip>:8787/dashboard   (DemoOwner / demo-owner)"
echo "  Worker panel:     http://<mac-ip>:8787/panel"
echo "  Factory wall:     http://<mac-ip>:8787/dashboard?wall=1"
echo ""
echo "Tip: your Mac's IP: ipconfig getifaddr en0"
