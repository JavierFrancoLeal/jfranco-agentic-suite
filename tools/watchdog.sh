#!/bin/sh
# Fanal watchdog — the supervisor never stays dead.
# Usage (standalone server, no Electron):
#   sh tools/watchdog.sh                          # default: node supervisor/server.js --lan
#   PORT=8790 DATA=/tmp/fanal-demo sh tools/watchdog.sh
# Restarts on exit (crash) with a 3 s pause; cap 10 rapid restarts,
# then a 60 s cool-down before trying again.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PORT:-8790}"
DATA="${DATA:-$HOME/.dsh/supervisor-data}"
NODE="${NODE:-$(command -v node)}"
[ -z "$NODE" ] && NODE="/Applications/DeepSeek Harness.app/Contents/Resources/runtime/primary-runtime/dependencies/node/bin/node"
[ -x "$NODE" ] || { echo "node not found"; exit 1; }
n=0
while true; do
  n=$((n+1))
  echo "[watchdog] starting the supervisor (run $n)…"
  DSH_SUPERVISOR_DATA="$DATA" DSH_SUPERVISOR_PORT="$PORT" PORT="$PORT" "$NODE" "$ROOT/supervisor/server.js" --lan
  code=$?
  echo "[watchdog] the supervisor exited (code $code) — restarting in 3 s"
  sleep 3
  if [ "$n" -ge 10 ]; then
    echo "[watchdog] 10 rapid restarts — cooling down 60 s"
    sleep 60
    n=0
  fi
done
