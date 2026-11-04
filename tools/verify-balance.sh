#!/usr/bin/env bash
# Verificación post-reinicio del plugin @javierfrancoleal/balance.
#
# Tras reiniciar la app DeepSeek Harness, comprueba que el bundle cliente del
# plugin se sirve con HTTP 200. La ruta real de bundles es revisionada
# (formato combo "??"): /plugins/??@javierfrancoleal/balance/client.js&rev=<rev>
# donde rev = sha1("plugin-artifact\0<len>:<mtimeMs><len>:<ctimeMs><len>:<size>")[0:12].
#
# Uso:   tools/verify-balance.sh [puerto]   (default 61769)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PORT="${1:-61769}"
CLIENT="$REPO_DIR/jfranco-balance/lib/client.js"

NODE="${DSH_NODE:-}"
if [ -z "$NODE" ]; then
  for c in "$HOME/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin/node" node; do
    command -v "$c" >/dev/null 2>&1 && { NODE="$c"; break; }
  done
fi
[ -n "$NODE" ] || { echo "error: node no encontrado"; exit 2; }
[ -f "$CLIENT" ] || { echo "error: no existe $CLIENT"; exit 2; }

REV=$("$NODE" -e '
const { createHash } = require("node:crypto");
const { statSync } = require("node:fs");
function framedHash(domain, parts) {
  const h = createHash("sha1").update(domain).update("\0");
  for (const p of parts) h.update(`${Buffer.byteLength(p)}:`).update(p);
  return h.digest("hex").slice(0, 12);
}
const s = statSync(process.argv[1]);
process.stdout.write(framedHash("plugin-artifact", [String(s.mtimeMs), String(s.ctimeMs), String(s.size)]));
' "$CLIENT")

URL="http://127.0.0.1:$PORT/plugins/??@javierfrancoleal/balance/client.js&rev=$REV"
echo "rev:    $REV"
echo "probe:  $URL"
CODE=$(curl -sS -o /tmp/jfranco-balance-client.js -w "%{http_code}" --max-time 10 "$URL")
echo "status: HTTP $CODE ($(wc -c < /tmp/jfranco-balance-client.js | tr -d ' ') bytes)"
if [ "$CODE" = "200" ] && grep -q "__ModuleLoader__" /tmp/jfranco-balance-client.js; then
  echo "OK: el bundle @javierfrancoleal/balance se sirve correctamente."
  rm -f /tmp/jfranco-balance-client.js
  exit 0
fi
echo "FAIL: el bundle no se sirve aún. Si acabas de reiniciar, espera unos segundos y reintenta;"
echo "      si editaste lib/client.js después del reinicio, reinicia de nuevo (el rev cambia)."
rm -f /tmp/jfranco-balance-client.js
exit 1
