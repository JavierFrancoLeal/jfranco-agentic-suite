# Production TLS and full PWA installation

The self-signed certificate (tools/make-cert.sh) fixes Safari mixed-content
and enables HTTPS on the LAN, but browsers only offer the full "Install as
app" experience (PWA) with a **trusted** certificate. This is the production
path.

## Steps

1. **Own a domain** — for example `jfranco-suite.com` (or a subdomain of the
   business's existing domain). This is the only step that costs money
   (~$10–15/year).
2. **Point DNS** — create an A record for the domain pointing to the
   business server's public IP (or run the server on a cloud VM).
3. **Install certbot** — `brew install certbot` (macOS) or
   `sudo apt install certbot` (Ubuntu).
4. **Run the helper** — `sh tools/letsencrypt.sh <domain> <email>`: it
   requests a real Let's Encrypt certificate, copies it into
   `~/.dsh/certs/`, and prints the start command.
5. **Start with HTTPS** —
   `DSH_TLS_CERT=~/.dsh/certs/fullchain.pem DSH_TLS_KEY=~/.dsh/certs/privkey.pem node supervisor/server.js --lan --https`
   (optionally `DSH_SUPERVISOR_HTTPS_PORT=443`).
6. **Renew weekly** — `sudo certbot renew --quiet` in crontab.

## Result

- `https://<domain>/panel` — trusted, same-origin, no browser warnings.
- Workers on Android tap **Add to Home screen** → the panel installs as a
  real app with the suite icon, fullscreen, and offline support (service
  worker + manifest already ship in `ui/`).
- Safari and all browsers work without mixed-content blocks.

## Security notes

- The supervisor still listens on HTTP for the LAN (tablets without TLS);
  for internet-facing deployments, consider restricting HTTP or keeping the
  server behind a reverse proxy (Caddy/nginx) that handles TLS.
- Keep the API key and the supervisor database on the server; never expose
  `~/.dsh` to other machines.
