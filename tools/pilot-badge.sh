#!/bin/sh
# pilot-badge — the announced use of the machine.
#   start [minutos]   → shows the badge with the elapsed time
#   update "texto"    → changes the message
#   warn  "texto"     → red warning
#   stop              → removes the badge
case "${1:-start}" in
  start)
    rm -f /tmp/pilot-badge.txt
    (nohup "$HOME/.local/bin/fanal-badge" >/dev/null 2>&1 &)
    touch ~/.dsh/pilot-heartbeat
    ;;
  update) echo "${2:-}" > /tmp/pilot-badge.txt; touch ~/.dsh/pilot-heartbeat ;;
  warn)   echo "⚠ ${2:-inactif}" > /tmp/pilot-badge.txt ;;
  done)   echo "✅ Terminado — vuelve a DSH cuando quieras" > /tmp/pilot-badge.txt ;;
  stop)   pkill -f fanal-badge 2>/dev/null; rm -f /tmp/pilot-badge.txt ;;
esac
