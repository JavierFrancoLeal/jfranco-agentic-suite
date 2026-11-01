#!/bin/sh
# J.Franco suite — quality gate. Created by J.Franco. MIT.
# Verifies every plugin, the UI, and the supervisor before any release.
# Exits non-zero on the first failure. Runs locally and in GitHub Actions.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

NODE="${DSH_NODE:-}"
if [ -z "$NODE" ]; then
  for c in "/Applications/DeepSeek Harness.app/Contents/Resources/runtime/primary-runtime/dependencies/node/bin/node" "$(command -v node 2>/dev/null)"; do
    if [ -n "$c" ] && [ -x "$c" ]; then NODE="$c"; break; fi
  done
fi
[ -z "$NODE" ] && echo "FAIL node not found" && exit 1

echo "== plugins =="
for p in jfranco-*; do
  [ -f "$p/package.json" ] || continue
  "$NODE" --check "$p/lib/index.js"
  "$NODE" -e "
    const fs=require('fs');
    JSON.parse(fs.readFileSync('$p/package.json','utf8'));
    const l=fs.readFileSync('$p/lib/index.js','utf8');
    if(!l.includes('const CANDIDATE')||!l.includes('description:')||!l.includes('registerProvider')) throw new Error('$p: provider pattern missing');
    for(const f of fs.readdirSync('$p/locale')) JSON.parse(fs.readFileSync('$p/locale/'+f,'utf8'));
    const pj=JSON.parse(fs.readFileSync('$p/package.json','utf8'));
    if(!pj.author||!pj.dsh||!pj.dsh.bundle) throw new Error('$p: manifest missing author/dsh.bundle');
  "
  grep -q "insert:" "$p/cordis.patch.yml"
  ls "$p"/assets/*.md >/dev/null
  echo "OK $p"
done

echo "== ui =="
"$NODE" -e '
  const fs=require("fs");
  const h=fs.readFileSync("ui/panel.html","utf8");
  const m=h.match(/<script>([\s\S]*?)<\/script>/);
  if(!m) throw new Error("panel: script block missing");
  new Function(m[1]); // compiles without running
'
"$NODE" --check ui/sw.js
"$NODE" -e 'JSON.parse(require("fs").readFileSync("ui/manifest.webmanifest","utf8"))'
echo "OK ui"

echo "== supervisor =="
"$NODE" --check supervisor/server.js
echo "OK supervisor"

echo "== installers =="
sh -n install.sh
echo "OK install.sh"

echo ""
echo "ALL CHECKS PASSED"
