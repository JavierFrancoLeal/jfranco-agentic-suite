#!/bin/sh
# J.Franco suite — zero-tech demo sandbox. Created by J.Franco. MIT.
#
# Runs an ISOLATED demo for a business with no technology of its own:
#   - its own data directory under /tmp (your real ~/.dsh is never touched)
#   - demo users only (no personal credentials anywhere)
#   - port 8790 (does not clash with your real supervisor on 8787)
#   - serves ONLY the panel, the dashboard, and the wallboard
#
# Usage:
#   sh tools/demo-sandbox.sh          # start the isolated demo
#   sh tools/demo-sandbox.sh stop     # stop it and delete every demo file
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NODE="${DSH_NODE:-}"
if [ -z "$NODE" ]; then
  for c in "/Applications/DeepSeek Harness.app/Contents/Resources/runtime/primary-runtime/dependencies/node/bin/node" "$(command -v node 2>/dev/null)"; do
    if [ -n "$c" ] && [ -x "$c" ]; then NODE="$c"; break; fi
  done
fi
[ -z "$NODE" ] && echo "node not found" && exit 1
DEMO="/tmp/dsh-demo-data"
PORT="${DSH_DEMO_PORT:-8790}"
PID="/tmp/dsh-demo.pid"

if [ "${1:-start}" = "stop" ]; then
  kill "$(cat "$PID" 2>/dev/null)" 2>/dev/null || true
  kill "$(cat "$PID.tunnel" 2>/dev/null)" 2>/dev/null || true
  rm -rf "$DEMO"
  echo "Demo stopped. Every demo file deleted."
  exit 0
fi

if [ "${1:-start}" = "tunnel" ]; then
  # Public URL mode: phones work from ANY network (even 4G), no WiFi needed.
  # Uses a temporary third-party tunnel (localhost.run). Demo data is fake,
  # but note that traffic passes through their servers during the demo.
  command -v ssh >/dev/null 2>&1 || { echo "ssh not found"; exit 1; }
  if [ ! -f "$HOME/.ssh/id_ed25519" ] && [ ! -f "$HOME/.ssh/id_rsa" ]; then
    ssh-keygen -t ed25519 -N "" -f "$HOME/.ssh/id_ed25519" >/dev/null 2>&1
  fi
  ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 \
    -R "80:localhost:8790" nokey@localhost.run > /tmp/dsh-demo-tunnel.log 2>&1 &
  echo $! > "$PID.tunnel"
  sleep 6
  URL="$(grep -oE 'https://[a-z0-9-]+\.lhr\.life' /tmp/dsh-demo-tunnel.log | head -1)"
  if [ -z "$URL" ]; then
    echo "Tunnel did not start. Check /tmp/dsh-demo-tunnel.log"
    exit 1
  fi
  echo ""
  echo "=== PUBLIC DEMO LINK (works on any network, even mobile data) ==="
  echo ""
  echo "  Wallboard (phones, no login):  $URL/dashboard?wall=1"
  echo "  Dashboard:                     $URL/dashboard"
  echo "  Panel:                         $URL/panel"
  echo ""
  echo "Stop everything:  sh tools/demo-sandbox.sh stop"
  exit 0
fi

if [ "${1:-start}" = "quick" ]; then
  sh "$0" >/dev/null 2>&1
  sh "$0" tunnel
  exit 0
fi

if [ "${1:-start}" = "qr" ]; then
  # Generate a printable QR code for the current public wallboard link.
  URL="$(grep -oE 'https://[a-z0-9-]+\.lhr\.life' /tmp/dsh-demo-tunnel.log | head -1)"
  if [ -z "$URL" ]; then echo "No public link yet — run: sh tools/demo-sandbox.sh quick"; exit 1; fi
  QR="/tmp/dsh-demo-qr.png"
  curl -sL --max-time 20 -o "$QR" "https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$URL/dashboard?wall=1" 2>/dev/null || echo "$URL")"
  echo "QR saved: $QR  →  Wallboard link: $URL/dashboard?wall=1"
  open "$QR" 2>/dev/null || true
  exit 0
fi

rm -rf "$DEMO"
mkdir -p "$DEMO"

# Demo users (nothing personal)
DSH_SUPERVISOR_DATA="$DEMO" DSH_SUPERVISOR_PORT="$PORT" "$NODE" "$ROOT/supervisor/server.js" \
  init --owner DemoOwner --password demo-owner --employee DemoWaiter --employee-password demo123 >/dev/null

# Starter rules: restaurant sector, isolated in the demo data dir
{
  echo "# decisions.md — demo rules (restaurant)."
  echo ""
  cat "$ROOT/docs/decisions-restaurant.md"
} > "$DEMO/decisions.md"

# Start the isolated server on the local network
DSH_SUPERVISOR_DATA="$DEMO" DSH_SUPERVISOR_PORT="$PORT" caffeinate -i "$NODE" "$ROOT/supervisor/server.js" --lan \
  > /tmp/dsh-demo.log 2>&1 &
echo $! > "$PID"
sleep 1.2

IP="$(ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}' || echo 127.0.0.1)"

echo ""
echo "=== Demo running (isolated: /tmp/dsh-demo-data, port $PORT) ==="
echo ""
echo "Staff phones — wallboard (no login):"
echo "  http://$IP:$PORT/dashboard?wall=1"
echo ""
echo "A staff phone — worker view:"
echo "  http://$IP:$PORT/dashboard   →  DemoWaiter / demo123"
echo ""
echo "Your laptop — owner view:"
echo "  http://$IP:$PORT/dashboard   →  DemoOwner / demo-owner"
echo ""
echo "Action panel (the LISTEN button):"
echo "  http://$IP:$PORT/panel"
echo ""
echo "Phones must be on the SAME WiFi as this computer — or share your"
echo "Mac's connection (System Settings → General → Sharing → Internet Sharing)."
echo ""
echo "If a phone cannot open the LOCAL link (timeout) while on the same"
echo "network, use the PUBLIC link instead:  sh tools/demo-sandbox.sh tunnel"
echo "  (one command: sh tools/demo-sandbox.sh quick)"
echo ""
echo "Stop and delete everything:  sh tools/demo-sandbox.sh stop"
