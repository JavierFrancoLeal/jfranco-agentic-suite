#!/bin/sh
# J.Franco suite — self-signed TLS certificate generator. Created by J.Franco. MIT.
# Generates ~/.dsh/certs/{cert,key}.pem for the Supervisor's HTTPS mode.
# Add your LAN IP/hostname to the -addext line for clean tablet connections.
set -e
CERT_DIR="$HOME/.dsh/certs"
mkdir -p "$CERT_DIR"
cd "$CERT_DIR"
if [ -z "$1" ]; then
  IP="$(ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}' || echo 127.0.0.1)"
else
  IP="$1"
fi
openssl req -x509 -newkey rsa:2048 -nodes -days 825 \
  -keyout key.pem -out cert.pem \
  -subj "/CN=J.Franco Suite Supervisor" \
  -addext "subjectAltName=IP:127.0.0.1,DNS:localhost,IP:${IP}" >/dev/null 2>&1
echo "Certificates generated in $CERT_DIR (for IP $IP)."
echo "Start the supervisor with: node supervisor/server.js --lan --https"
