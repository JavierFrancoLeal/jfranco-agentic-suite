#!/bin/sh
# J.Franco suite — published-artifact freshness report. Created by J.Franco. MIT.
# Compares everything you publish (npm packages, the supervisor bundle, the
# installers) against the local code and reports what is stale.
# Usage: sh tools/sync-check.sh
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NODE=""
for c in "/Applications/DeepSeek Harness.app/Contents/Resources/runtime/primary-runtime/dependencies/node/bin/node" "$(command -v node 2>/dev/null)"; do
  if [ -n "$c" ] && [ -x "$c" ]; then NODE="$c"; break; fi
done
[ -z "$NODE" ] && { echo "node not found"; exit 2; }
STALE=0
say(){ printf "%-52s %s\n" "$1" "$2"; }
npmver(){ curl -s --max-time 10 "https://registry.npmjs.org/$1/latest" | "$NODE" -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).version)}catch(e){console.log("?")}})'; }

echo "=== sync-check $(date +%Y-%m-%d\ %H:%M) ==="

# 1. Supervisor package copies
for f in server.js dashboard.html; do
  if cmp -s "$ROOT/supervisor/$f" "$ROOT/supervisor-pkg/$f"; then say "supervisor-pkg/$f" "✔ idéntico"; else say "supervisor-pkg/$f" "❌ DESACTUALIZADO"; STALE=1; fi
done
if cmp -s "$ROOT/ui/panel.html" "$ROOT/supervisor-pkg/panel.html"; then say "supervisor-pkg/panel.html" "✔ idéntico"; else say "supervisor-pkg/panel.html" "❌ DESACTUALIZADO"; STALE=1; fi
for f in "$ROOT"/docs/sector-packs/*.json; do
  b="$(basename "$f")"
  if [ -f "$ROOT/supervisor-pkg/sector-packs/$b" ] && cmp -s "$f" "$ROOT/supervisor-pkg/sector-packs/$b"; then :; else say "sector-pack/$b" "❌ DESACTUALIZADO"; STALE=1; fi
done

# 2. npm plugins: local version vs published
for d in "$ROOT"/jfranco-*; do
  [ -f "$d/package.json" ] || continue
  name="$("$NODE" -e 'console.log(require(process.argv[1]).name)' "$d/package.json")"
  lv="$("$NODE" -e 'console.log(require(process.argv[1]).version)' "$d/package.json")"
  pv="$(npmver "$name")"
  if [ "$pv" = "?" ]; then say "$name" "⚠ npm sin respuesta/offline"
  elif [ "$lv" = "$pv" ]; then say "$name@$lv" "✔ publicado"
  else say "$name" "❌ local $lv vs npm $pv"; STALE=1; fi
done

# 3. Supervisor package version on npm
sname="$("$NODE" -e 'console.log(require(process.argv[1]).name)' "$ROOT/supervisor-pkg/package.json")"
slv="$("$NODE" -e 'console.log(require(process.argv[1]).version)' "$ROOT/supervisor-pkg/package.json")"
spv="$(npmver "$sname")"
if [ "$spv" = "?" ]; then say "$sname" "⚠ npm sin respuesta/offline"
elif [ "$slv" = "$spv" ]; then say "$sname@$slv" "✔ publicado"
else say "$sname" "❌ local $slv vs npm $spv"; STALE=1; fi

# 4. Installers provider name
if grep -q "deepseek-api-key" "$ROOT/install.sh"; then say "install.sh (provider)" "❌ nombre viejo"; STALE=1; else say "install.sh (provider)" "✔ deepseek-official"; fi
if grep -q "deepseek-api-key" "$ROOT/install.ps1"; then say "install.ps1 (provider)" "❌ nombre viejo"; STALE=1; else say "install.ps1 (provider)" "✔ deepseek-official"; fi

echo ""
if [ "$STALE" = 1 ]; then
  echo "RESULTADO: hay piezas desactualizadas → ejecuta: sh tools/sync-all.sh"
  exit 1
fi
echo "RESULTADO: todo sincronizado ✔"
