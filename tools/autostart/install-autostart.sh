#!/bin/sh
# J.Franco suite — start the supervisor automatically at boot.
# Created by J.Franco. MIT.
#   macOS  → LaunchAgent (launchd)   Linux → systemd user unit
#   Windows → see install-autostart.ps1
# Usage:
#   sh tools/autostart/install-autostart.sh           # install
#   sh tools/autostart/install-autostart.sh remove    # uninstall
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
NODE=""
for c in "/Applications/DeepSeek Harness.app/Contents/Resources/runtime/primary-runtime/dependencies/node/bin/node" "$(command -v node 2>/dev/null)"; do
  if [ -n "$c" ] && [ -x "$c" ]; then NODE="$c"; break; fi
done
[ -z "$NODE" ] && { echo "node not found"; exit 2; }
DATA="${DSH_SUPERVISOR_DATA:-$HOME/.dsh/supervisor-data}"
PACKS="$ROOT/docs/sector-packs"

if [ "$(uname)" = "Darwin" ]; then
  PLIST="$HOME/Library/LaunchAgents/com.jfranco.supervisor.plist"
  if [ "${1:-install}" = "remove" ]; then
    launchctl unload "$PLIST" 2>/dev/null || true
    rm -f "$PLIST"
    echo "Auto-arranque removido (macOS)."
    exit 0
  fi
  KEYLINE=""
  [ -n "${DEEPSEEK_API_KEY:-}" ] && KEYLINE="        <key>DEEPSEEK_API_KEY</key>
        <string>$DEEPSEEK_API_KEY</string>"
  cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.jfranco.supervisor</string>
  <key>ProgramArguments</key><array>
    <string>$NODE</string>
    <string>$ROOT/supervisor/server.js</string>
    <string>--lan</string>
    <string>--https</string>
  </array>
  <key>EnvironmentVariables</key><dict>
    <key>DSH_SUPERVISOR_DATA</key><string>$DATA</string>
    <key>DSH_SECTOR_PACKS_DIR</key><string>$PACKS</string>
$KEYLINE
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$HOME/.dsh/supervisor-autostart.log</string>
  <key>StandardErrorPath</key><string>$HOME/.dsh/supervisor-autostart.log</string>
</dict></plist>
EOF
  launchctl unload "$PLIST" 2>/dev/null || true
  launchctl load "$PLIST"
  echo "Auto-arranque instalado (macOS, launchd, KeepAlive)."
  echo "El supervisor arrancará al encender en $DATA. Log: ~/.dsh/supervisor-autostart.log"
  echo "Quitar: sh tools/autostart/install-autostart.sh remove"
elif [ "$(uname)" = "Linux" ]; then
  UNIT="$HOME/.config/systemd/user/jfranco-supervisor.service"
  if [ "${1:-install}" = "remove" ]; then
    systemctl --user disable --now jfranco-supervisor 2>/dev/null || true
    rm -f "$UNIT"
    echo "Auto-arranque removido (Linux)."
    exit 0
  fi
  mkdir -p "$(dirname "$UNIT")"
  cat > "$UNIT" <<EOF
[Unit]
Description=J.Franco Supervisor (dashboard central)
After=network-online.target

[Service]
ExecStart=$NODE $ROOT/supervisor/server.js --lan --https
Environment=DSH_SUPERVISOR_DATA=$DATA
Environment=DSH_SECTOR_PACKS_DIR=$PACKS
Restart=always
RestartSec=5

[Install]
WantedBy=default.target
EOF
  systemctl --user daemon-reload
  systemctl --user enable --now jfranco-supervisor
  echo "Auto-arranque instalado (Linux, systemd, Restart=always)."
  echo "Quitar: sh tools/autostart/install-autostart.sh remove"
else
  echo "Usa install-autostart.ps1 en Windows (Task Scheduler)."
  exit 1
fi
