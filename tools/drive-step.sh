#!/bin/sh
# drive-step — the anti-loop harness for remote actions.
# Enforces the rules that the UTM saga taught us:
#   1. Every step declares WHAT it does (its name) before running.
#   2. The SAME command never runs twice in a row (the polling trap).
#   3. The heartbeat is refreshed, the badge announces the step.
#   4. drive-end finishes: green badge, auto-dismiss after 30 s.
# Usage:
#   sh tools/drive-step.sh "nombre del paso" comando...   (un paso)
#   sh tools/drive-step.sh end                            (terminar la conducción)
STATE=/tmp/driver-state
LOG=/tmp/driver-step.log
STEP="$1"; shift
if [ "$STEP" = "end" ]; then
  rm -f "$STATE"
  echo "[$(date +%H:%M:%S)] END" >> "$LOG"
  sh tools/pilot-badge.sh done 2>/dev/null
  exit 0
fi
[ -z "$STEP" ] && { echo "uso: drive-step \"paso\" comando..."; exit 1; }
KEY=$(echo "$*" | md5 -q 2>/dev/null || echo "$*" | md5sum | cut -d' ' -f1)
touch ~/.dsh/pilot-heartbeat
if [ -f "$STATE" ] && [ "$(cat "$STATE")" = "$KEY" ]; then
  echo "⚠ LOOP DETECTADO: el mismo comando dos veces seguidas — cambia la ACCIÓN o DECIDE. (paso: $STEP)"
  exit 2
fi
echo "$KEY" > "$STATE"
echo "[$(date +%H:%M:%S)] $STEP" >> "$LOG"
sh tools/pilot-badge.sh update "trabaja: $STEP" 2>/dev/null
"$@"
