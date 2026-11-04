#!/usr/bin/env bash
# Valida un plugin DeepSeek Harness: sintaxis + mock-load del cliente + (opcional) composición.
# Uso: check-plugin.sh <dir-del-plugin | nombre> [--compose]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

NODE="${DSH_NODE:-}"
if [ -z "$NODE" ]; then
  for c in "$HOME/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin/node" node; do
    command -v "$c" >/dev/null 2>&1 && { NODE="$c"; break; }
  done
fi
[ -n "$NODE" ] || { echo "error: node no encontrado"; exit 2; }

target="${1:-}"
[ -n "$target" ] || { echo "usage: $0 <dir-del-plugin | nombre> [--compose]"; exit 2; }
COMPOSE=0
[ "${2:-}" = "--compose" ] && COMPOSE=1

if [ -d "$target" ]; then DIR="$target"; else DIR="$REPO_DIR/jfranco-$target"; fi
[ -d "$DIR" ] || { echo "error: no existe $DIR"; exit 1; }
DIR="$(cd "$DIR" && pwd)"

fail=0

# 1) sintaxis
for f in "$DIR/lib/index.js" "$DIR/lib/client.js"; do
  [ -f "$f" ] || continue
  echo "check: node --check $(basename "$DIR")/$(basename "$f")"
  "$NODE" --check "$f" || fail=1
done

# 2) mock-load del half cliente
if [ -f "$DIR/lib/client.js" ]; then
  echo "check: mock-load del cliente"
  "$NODE" "$SCRIPT_DIR/check-client.mjs" "$DIR/lib/client.js" || fail=1
fi

# 3) composición en un perfil desechable (el perfil "desktop" rechaza --dump-config)
if [ "$COMPOSE" = "1" ]; then
  DSH_CLI="${DSH_CLI:-/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh}"
  [ -x "$DSH_CLI" ] || { echo "skip --compose: no encuentro dsh CLI ($DSH_CLI)"; fail=1; }
  if [ -x "$DSH_CLI" ]; then
    pkgname=$("$NODE" -e 'const fs=require("fs");console.log(JSON.parse(fs.readFileSync(process.argv[1],"utf8")).name)' "$DIR/package.json")
    short="${pkgname#@javierfrancoleal/}"
    TP="$HOME/.dsh/profiles/testprices"
    rm -rf "$TP"; mkdir -p "$TP/node_modules/@javierfrancoleal"
    ln -sfn "$DIR" "$TP/node_modules/@javierfrancoleal/$short"
    cat > "$TP/package.json" <<JSON
{ "name": "dsh-profile-testprices", "private": true,
  "dependencies": { "$pkgname": "link:$DIR" },
  "dsh": { "profile": { "bundles": ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app", "$pkgname"] } } }
JSON
    echo "check: composición (perfil desechable testprices)"
    if "$DSH_CLI" --profile testprices --dump-config 2>/dev/null | grep -q "$short"; then
      echo "  compone OK (fila '$short' presente)"
    else
      echo "  FAIL: la fila '$short' no aparece en la composición"; fail=1
    fi
    rm -rf "$TP"
  fi
fi

if [ "$fail" = "0" ]; then echo "OK: $DIR"; else echo "FAIL: $DIR"; exit 1; fi
