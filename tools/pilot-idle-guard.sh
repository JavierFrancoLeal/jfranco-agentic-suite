#!/bin/sh
# pilot-idle-guard — if the agent stops acting for too long while the
# badge is active, the badge turns red AND macOS shows a notification.
LIMIT="${1:-300}"
while true; do
  if pgrep -f fanal-badge >/dev/null; then
    if [ -f ~/.dsh/pilot-heartbeat ]; then
      AGE=$(( $(date +%s) - $(stat -f %m ~/.dsh/pilot-heartbeat 2>/dev/null || echo $(date +%s)) ))
      if [ "$AGE" -gt "$LIMIT" ]; then
        echo "⚠ inactif depuis $((AGE/60)) min — vérifiez" > /tmp/pilot-badge.txt
        osascript -e "display notification \"L'agente ne fait rien depuis $((AGE/60)) min\" with title \"Fanal — pilote\"" 2>/dev/null
      fi
    fi
  fi
  sleep 30
done
