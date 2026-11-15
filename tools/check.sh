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
    const isHost=l.includes('host half');
    if(!isHost && (!l.includes('const CANDIDATE')||!l.includes('description:')||!l.includes('registerProvider'))) throw new Error('$p: provider pattern missing');
    if(isHost) process.exit(0);
    for(const f of fs.readdirSync('$p/locale')) JSON.parse(fs.readFileSync('$p/locale/'+f,'utf8'));
    const pj=JSON.parse(fs.readFileSync('$p/package.json','utf8'));
    if(!pj.author||!pj.dsh||!pj.dsh.bundle) throw new Error('$p: manifest missing author/dsh.bundle');
  "
  grep -q "insert:" "$p/cordis.patch.yml"
  ls "$p"/assets/*.md >/dev/null 2>&1 || true
  echo "OK $p"
done

echo "== ui =="
"$NODE" -e '
  const fs=require("fs");
  const h=fs.readFileSync("ui/panel.html","utf8");
  const m=h.match(/<script>([\s\S]*?)<\/script>/);
  if(!m) throw new Error("panel: script block missing");
  if(/DSH Assistant|DeepSeek Harness/i.test(h)) throw new Error("panel: legacy DSH/DeepSeek Harness branding found");
  if(!h.includes("id=\"panelBackBtn\"")) throw new Error("panel: missing #panelBackBtn");
  if(!/<button[^>]+id="darkBtn"[\s\S]*?<svg/i.test(h)) throw new Error("panel: #darkBtn must use inline SVG icon");
  const mk=(id)=>({id,style:{},value:"",textContent:"",innerHTML:"",placeholder:"",title:"",dataset:{},children:[],classList:{_s:new Set(),toggle(k,v){v===undefined?(this._s.has(k)?this._s.delete(k):this._s.add(k)):(v?this._s.add(k):this._s.delete(k));},add(k){this._s.add(k)},remove(k){this._s.delete(k)},contains(k){return this._s.has(k)}},appendChild(c){this.children.push(c);},focus(){},addEventListener(){}});
  const elems={};
  const getEl=(id)=>elems[id]||(elems[id]=mk(id));
  const doc={getElementById:getEl,createElement:(t)=>mk(t),querySelectorAll:()=>[],body:mk("body")};
  const ls={_m:new Map(),getItem(k){return this._m.get(k)||null;},setItem(k,v){this._m.set(k,String(v));}};
  const win={location:{origin:"http://127.0.0.1:8787",search:""},navigator:{}};
  new Function("document","localStorage","location","window","navigator","fetch","setInterval","addEventListener",
    m[1]
  )(doc,ls,win.location,win,win.navigator,async()=>({ok:true,json:async()=>({})}),()=>0,()=>{});
  if(!elems.langs||elems.langs.children.length!==10) throw new Error("panel: expected 10 language pills");
  for(const pill of elems.langs.children){ pill.onclick(); }
'
"$NODE" --check ui/sw.js
"$NODE" -e 'JSON.parse(require("fs").readFileSync("ui/manifest.webmanifest","utf8"))'
echo "OK ui"

echo "== supervisor =="
"$NODE" --check supervisor/server.js
"$NODE" --check supervisor/brain-catalog.js
"$NODE" --check supervisor/diagnostic-sanitizer.js
"$NODE" --check supervisor/power-kpi.js
"$NODE" --check supervisor/intake-engine.js
"$NODE" -e '
  const fs=require("fs");
  const h=fs.readFileSync("supervisor/dashboard.html","utf8");
  const m=h.match(/<script>([\s\S]*?)<\/script>/);
  if(!m) throw new Error("dashboard: script block missing");
  new Function(m[1]);
'
"$NODE" tools/smoke-dashboard.js
"$NODE" tools/test-diagnostic-export.mjs
"$NODE" tools/test-closed-brain.mjs
"$NODE" tools/test-api-closed-brain.mjs
"$NODE" tools/test-intake-pipeline.mjs
echo "OK supervisor"

echo "== supervisor package (npm) =="
"$NODE" tools/sync-desktop.mjs --check-supervisor-pkg
"$NODE" --check supervisor-pkg/bin/jfranco-supervisor.js
"$NODE" --check supervisor-pkg/server.js
echo "OK supervisor-pkg"

echo "== desktop app =="
"$NODE" tools/sync-desktop.mjs --check
"$NODE" tools/test-vault-biometric.mjs
"$NODE" tools/test-desktop-sandbox.mjs
"$NODE" tools/verify-app.mjs
echo "OK desktop app"

echo "== viaje completo de API =="
NODE="$NODE" sh tools/api-smoke.sh

echo "== demo tools =="
sh -n tools/demo-reset.sh
sh -n tools/demo-sandbox.sh
sh -n tools/make-cert.sh
sh -n tools/letsencrypt.sh
sh -n tools/agent-standby.sh
sh -n tools/activate-ai.sh
sh -n tools/autostart/install-autostart.sh
sh -n tools/sync-all.sh
sh -n tools/sync-check.sh
sh -n tools/bundle-sync-check.sh
echo "OK demo tools"

echo "== installers & runtime tools =="
sh -n install.sh
sh -n tools/build-runtime-pack.sh
echo "OK install.sh + build-runtime-pack.sh"

echo ""
echo "ALL CHECKS PASSED"
