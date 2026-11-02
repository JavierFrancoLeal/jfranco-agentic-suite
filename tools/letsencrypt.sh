#!/bin/sh
# J.Franco suite — real TLS via Let's Encrypt (production path).
# Created by J.Franco. MIT.
#
# Prerequisites:
#   1. Own a domain (e.g. jfranco-suite.com) and point its A/AAAA record to
#      this server's public IP (or use a cloud VM).
#   2. Install certbot:  brew install certbot   (macOS)
#                        sudo apt install certbot (Ubuntu/Debian)
#   3. Run: sh tools/letsencrypt.sh <domain> <email>
set -e
DOMAIN="${1:?usage: sh tools/letsencrypt.sh <domain> <email>}"
EMAIL="${2:?usage: sh tools/letsencrypt.sh <domain> <email>}"
sudo certbot certonly --standalone -d "$DOMAIN" -m "$EMAIL" --agree-tos --no-eff-email
mkdir -p "$HOME/.dsh/certs"
sudo cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$HOME/.dsh/certs/fullchain.pem"
sudo cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$HOME/.dsh/certs/privkey.pem"
sudo chown "$(id -un)" "$HOME/.dsh/certs/fullchain.pem" "$HOME/.dsh/certs/privkey.pem"
echo "Real certificates installed in $HOME/.dsh/certs"
echo "Start the supervisor with:"
echo "  DSH_TLS_CERT=$HOME/.dsh/certs/fullchain.pem DSH_TLS_KEY=$HOME/.dsh/certs/privkey.pem node supervisor/server.js --lan --https"
echo "Renewal (crontab, weekly): sudo certbot renew --quiet"
