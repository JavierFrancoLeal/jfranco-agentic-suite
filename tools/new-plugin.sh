#!/usr/bin/env bash
# Genera un plugin DeepSeek Harness desde la plantilla templates/dsh-plugin/.
# Uso: new-plugin.sh <nombre> [--host|--client|--dual]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TEMPLATE="$REPO_DIR/templates/dsh-plugin"
NODE="${DSH_NODE:-}"
if [ -z "$NODE" ]; then
  for c in "$HOME/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin/node" node; do
    command -v "$c" >/dev/null 2>&1 && { NODE="$c"; break; }
  done
fi
[ -n "$NODE" ] || { echo "error: node no encontrado"; exit 2; }

usage() {
  echo "usage: $0 <nombre> [--host|--client|--dual]"
  echo "  --dual   (por defecto) host + barra cliente"
  echo "  --host   solo half host (elimina dsh.client y lib/client.js)"
  echo "  --client solo half browser (elimina dsh.bundle.patch)"
  exit 2
}

[ $# -ge 1 ] || usage
NAME="$1"; shift
KIND="dual"
while [ $# -gt 0 ]; do
  case "$1" in
    --host) KIND="host";;
    --client) KIND="client";;
    --dual) KIND="dual";;
    *) usage;;
  esac
  shift
done

case "$NAME" in
  ''|*[!a-z0-9-]*|*--*) echo "error: nombre inválido '$NAME' (usa kebab-case, ej. mi-widget)"; exit 2;;
esac

DIR="$REPO_DIR/jfranco-$NAME"
[ -e "$DIR" ] && { echo "error: ya existe $DIR"; exit 1; }

cp -R "$TEMPLATE" "$DIR"

# sustituir el marcador __NAME__
find "$DIR" -type f -print0 | while IFS= read -r -d '' f; do
  perl -pi -e "s/__NAME__/$NAME/g" "$f"
done

# podar la mitad no deseada (JSON vía node para no romper package.json)
prune_json() { "$NODE" -e "$1" "$DIR/package.json"; }
case "$KIND" in
  host)
    rm -f "$DIR/lib/client.js"
    prune_json 'const fs=require("fs");const p=process.argv[1];const d=JSON.parse(fs.readFileSync(p,"utf8"));delete d.dsh.client;delete d.exports["./client"];d.files=(d.files||[]).filter(f=>f!=="lib/client.js");fs.writeFileSync(p,JSON.stringify(d,null,2)+"\n");'
    ;;
  client)
    rm -f "$DIR/lib/index.js" "$DIR/cordis.patch.yml"
    prune_json 'const fs=require("fs");const p=process.argv[1];const d=JSON.parse(fs.readFileSync(p,"utf8"));delete d.dsh.bundle;delete d.exports["."];delete d.exports["./cordis.patch.yml"];delete d.main;d.files=(d.files||[]).filter(f=>f!=="lib/index.js"&&f!=="cordis.patch.yml");fs.writeFileSync(p,JSON.stringify(d,null,2)+"\n");'
    ;;
esac

echo "Creado $DIR (tipo: $KIND)"
echo "  edita:      lib/index.js  y/o  lib/client.js"
echo "  valida:     tools/check-plugin.sh $NAME"
echo "  instala:    añade '@javierfrancoleal/$NAME' a dsh.profile.bundles + dependency link:,"
echo "              luego 'pnpm install' en el perfil y REINICIA la app DeepSeek Harness."
