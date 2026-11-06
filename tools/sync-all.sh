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

# 1. Supervisor bundle
CHANGED=0
for f in server.js dashboard.html dashboard-i18n.js browser-cdp.js; do
  cmp -s "$ROOT/supervisor/$f" "$ROOT/supervisor-pkg/$f" || { cp "$ROOT/supervisor/$f" "$ROOT/supervisor-pkg/$f"; CHANGED=1; }
done
cmp -s "$ROOT/ui/panel.html" "$ROOT/supervisor-pkg/panel.html" || { cp "$ROOT/ui/panel.html" "$ROOT/supervisor-pkg/panel.html"; CHANGED=1; }
for f in "$ROOT"/ui/icons/*; do
  b="$(basename "$f")"
  cmp -s "$f" "$ROOT/supervisor-pkg/icons/$b" 2>/dev/null || { cp "$f" "$ROOT/supervisor-pkg/icons/$b"; CHANGED=1; }
done
for f in "$ROOT"/docs/sector-packs/*.json; do
  b="$(basename "$f")"
  cmp -s "$f" "$ROOT/supervisor-pkg/sector-packs/$b" 2>/dev/null || { cp "$f" "$ROOT/supervisor-pkg/sector-packs/$b"; CHANGED=1; }
done
# Desktop app bundle: keep the brain + UI copies fresh
  for pair in "supervisor/server.js:apps/desktop/brain/server.js" "supervisor/dashboard.html:apps/desktop/brain/dashboard.html" "supervisor/dashboard-i18n.js:apps/desktop/brain/dashboard-i18n.js" "supervisor/browser-cdp.js:apps/desktop/brain/browser-cdp.js" "ui/panel.html:apps/desktop/ui/panel.html" "ui/manifest.webmanifest:apps/desktop/ui/manifest.webmanifest" "ui/sw.js:apps/desktop/ui/sw.js"; do
    src="${pair%%:*}"; dst="${pair##*:}";
    cmp -s "$ROOT/$src" "$ROOT/$dst" || { cp "$ROOT/$src" "$ROOT/$dst"; CHANGED=1; }
  done
  for f in "$ROOT"/ui/icons/*; do
    b="$(basename "$f")"
    cmp -s "$f" "$ROOT/apps/desktop/ui/icons/$b" 2>/dev/null || { cp "$f" "$ROOT/apps/desktop/ui/icons/$b"; CHANGED=1; }
  done
  sname="$("$NODE" -e 'console.log(require(process.argv[1]).name)' "$ROOT/supervisor-pkg/package.json")"
if [ "$CHANGED" = 1 ]; then
  nv="$(bump "$ROOT/supervisor-pkg/package.json")"
  echo "supervisor: fuentes cambiaron → v$nv"
  sed -i "" "s|const VERSION = \".*\"|const VERSION = \"$nv\"|" "$ROOT/supervisor/server.js"
  cp "$ROOT/supervisor/server.js" "$ROOT/supervisor-pkg/server.js"
  pub "$sname" "$ROOT/supervisor-pkg"
else
  echo "supervisor: sin cambios ✔"
fi

# 2. Plugins: changed files → bump + republish; missing npm → publish as-is
for d in "$ROOT"/jfranco-*; do
  [ -f "$d/package.json" ] || continue
  name="$("$NODE" -e 'console.log(require(process.argv[1]).name)' "$d/package.json")"
  lv="$("$NODE" -e 'console.log(require(process.argv[1]).version)' "$d/package.json")"
  pv="$(npmver "$name")"
  marker="$d/.last-sync"
  cur="$(git -C "$ROOT" log -1 --format=%H -- "$(basename "$d")" 2>/dev/null || echo none)"
  prev="$(cat "$marker" 2>/dev/null || echo "")"
  base="$(basename "$d")"
  if [ "$pv" = "0.0.0" ]; then
    echo "$base: no está en npm → publicar v$lv"
    pub "$name" "$d"
    stage_deprecate "$name"
    echo "$cur" > "$marker"
  elif [ -z "$prev" ]; then
    echo "$base: primer registro del marcador (sin cambios) ✔"
    echo "$cur" > "$marker"
  elif [ "$cur" != "$prev" ]; then
    nv="$(bump "$d/package.json")"
    echo "$base: archivos cambiaron → v$nv"
    if [ "$base" = "supervisor-pkg" ]; then sed -i "" "s|const VERSION = \".*\"|const VERSION = \"$nv\"|" "$ROOT/supervisor/server.js"; cp "$ROOT/supervisor/server.js" "$ROOT/supervisor-pkg/server.js"; fi
    pub "$name" "$d"
    echo "$cur" > "$marker"
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
