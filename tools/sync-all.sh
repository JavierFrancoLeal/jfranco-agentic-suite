#!/bin/sh
# J.Franco suite — automatic updater and republisher. Created by J.Franco. MIT.
# Updates every artifact you have created when its source changes:
#   - syncs supervisor-pkg/ from supervisor/ + ui/ + docs/sector-packs
#   - bumps and republishes any npm package whose files changed
#   - refreshes the demo sandbox and pushes GitHub
# Usage:
#   sh tools/sync-all.sh            # update everything now
#   sh tools/sync-all.sh --dry-run  # show what would happen without publishing
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DRY=""
[ "${1:-}" = "--dry-run" ] && DRY=1
NODE=""
for c in "/Applications/DeepSeek Harness.app/Contents/Resources/runtime/primary-runtime/dependencies/node/bin/node" "$(command -v node 2>/dev/null)"; do
  if [ -n "$c" ] && [ -x "$c" ]; then NODE="$c"; break; fi
done
[ -z "$NODE" ] && { echo "node not found"; exit 2; }
NPM=""
for c in "$HOME/bin/npm" "$(command -v npm 2>/dev/null)"; do
  if [ -n "$c" ] && [ -x "$c" ]; then NPM="$c"; break; fi
done
[ -z "$NPM" ] && { echo "npm not found (se instala con: npm i -g npm)"; exit 2; }

echo "=== sync-all $(date +%Y-%m-%d\ %H:%M) $([ -n "$DRY" ] && echo '[DRY-RUN]') ==="

npmver(){ curl -s --max-time 10 "https://registry.npmjs.org/$1/latest" | "$NODE" -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).version)}catch(e){console.log("0.0.0")}})'; }
bump(){ "$NODE" -e 'const fs=require("fs");const p=process.argv[1];const j=JSON.parse(fs.readFileSync(p,"utf8"));const v=j.version.split(".");v[2]=String(Number(v[2])+1);j.version=v.join(".");fs.writeFileSync(p,JSON.stringify(j,null,2)+"\n");console.log(j.version);' "$1"; }
# Portable version-string replacement (BSD/macOS `sed -i ""` is not POSIX and
# breaks on Linux/CI): rewrite `const VERSION = "..."` in a JS source file.
replaceConstVersion(){ "$NODE" -e 'const fs=require("fs"),f=process.argv[1],nv=process.argv[2];fs.writeFileSync(f,fs.readFileSync(f,"utf8").replace(/const VERSION = ".*"/,`const VERSION = "${nv}"`));' "$1" "$2"; }
pub(){ name="$1"; dir="$2";
  if [ -n "$DRY" ]; then echo "   [dry] publicaría $name desde $dir"; return; fi
  (cd "$dir" && "$NPM" publish --access public --registry https://registry.npmjs.org/ 2>&1 | grep -E "^\+ @|being processed|npm error" | head -1)
}
# npm staged publishing (registry, GA 2026) crea un placeholder "0.0.0-stage"
# en el PRIMER publish de un paquete nuevo; lo deprecamos (best-effort: el
# registry puede seguir propagando y rechazar el intento — reintentar luego).
stage_deprecate(){ name="$1";
  "$NPM" deprecate "$name@0.0.0-stage" "Placeholder de npm staged publishing — usa latest." >/dev/null 2>&1 \
    && echo "   $name: 0.0.0-stage deprecado" || echo "   $name: 0.0.0-stage (registry propagando; reintenta luego)"
}

# 1. Supervisor package + desktop bundle (single canonical manifest in sync-desktop.mjs)
CHANGED=0
PKG_CHK="$("$NODE" "$ROOT/tools/sync-desktop.mjs" --check-supervisor-pkg 2>&1)" || {
  CHANGED=1
  if echo "$PKG_CHK" | grep -q "PKG-FILES"; then
    echo "$PKG_CHK" >&2
    echo "ERROR: supervisor-pkg/package.json files[] está incompleto — corrígelo antes de publicar." >&2
    exit 1
  fi
}
"$NODE" "$ROOT/tools/sync-desktop.mjs" --check >/dev/null 2>&1 || CHANGED=1
sname="$("$NODE" -e 'console.log(require(process.argv[1]).name)' "$ROOT/supervisor-pkg/package.json")"
if [ "$CHANGED" = 1 ]; then
  if [ -n "$DRY" ]; then
    echo "   [dry] fuentes cambiaron → sincronizaría desktop + supervisor-pkg y publicaría $sname"
  else
    nv="$(bump "$ROOT/supervisor-pkg/package.json")"
    echo "supervisor: fuentes cambiaron → v$nv"
    replaceConstVersion "$ROOT/supervisor/server.js" "$nv"
    "$NODE" "$ROOT/tools/sync-desktop.mjs" --all
    pub "$sname" "$ROOT/supervisor-pkg"
  fi
else
  echo "supervisor: sin cambios ✔"
  [ -n "$DRY" ] || "$NODE" "$ROOT/tools/sync-desktop.mjs" --all >/dev/null
fi

# 2. Plugins: changed content files (excluding package.json bump commits) → bump + republish; missing npm → publish as-is
for d in "$ROOT"/jfranco-*; do
  [ -f "$d/package.json" ] || continue
  name="$("$NODE" -e 'console.log(require(process.argv[1]).name)' "$d/package.json")"
  lv="$("$NODE" -e 'console.log(require(process.argv[1]).version)' "$d/package.json")"
  pv="$(npmver "$name")"
  marker="$d/.last-sync"
  base="$(basename "$d")"
  cur="$(git -C "$ROOT" log -1 --format=%H -- "$base" ':!'"$base/package.json" 2>/dev/null || echo none)"
  prev="$(cat "$marker" 2>/dev/null || echo "")"
  if [ "$pv" = "0.0.0" ]; then
    if [ -n "$DRY" ]; then
      echo "$base: no está en npm → [dry] publicaría $name v$lv desde $d"
    else
      echo "$base: no está en npm → publicar v$lv"
      pub "$name" "$d"
      stage_deprecate "$name"
      echo "$cur" > "$marker"
    fi
  elif [ -z "$prev" ]; then
    if [ -n "$DRY" ]; then
      echo "$base: [dry] registraría marcador inicial ✔"
    else
      echo "$base: primer registro del marcador (sin cambios) ✔"
      echo "$cur" > "$marker"
    fi
  elif [ "$cur" != "$prev" ]; then
    if [ -n "$DRY" ]; then
      echo "$base: archivos cambiaron → [dry] bumpearía v$lv y publicaría $name desde $d"
    else
      nv="$(bump "$d/package.json")"
      echo "$base: archivos cambiaron → v$nv"
      pub "$name" "$d"
      echo "$cur" > "$marker"
    fi
  else
    echo "$base: sin cambios desde la última sincronización ✔"
  fi
done

# 3. Refresh demo + GitHub
if [ -n "$DRY" ]; then echo "[dry] refrescaría la demo y haría git push"; exit 0; fi
sh "$ROOT/tools/demo-sandbox.sh" stop >/dev/null 2>&1 || true
sh "$ROOT/tools/demo-sandbox.sh" quick >/dev/null 2>&1 || true
git -C "$ROOT" add -A
git -C "$ROOT" commit -q -m "sync-all: republish changed artifacts" || true
git -C "$ROOT" push -q origin main || true
echo "sync-all completado ✔"
