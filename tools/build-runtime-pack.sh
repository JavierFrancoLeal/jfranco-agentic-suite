#!/bin/sh
# J.Franco suite — build the bundled runtime pack (Model B of the
# distribution). Created by J.Franco. MIT.
#
# Copies the DeepSeek Harness runtime, the eight J.Franco plugins, and the
# license notices into dist/le-veilleux-runtime, ready to be included as
# extraResources in the Fanal desktop installer. Result: the client
# installs ONE app and only pastes their DeepSeek key.
#
# Usage: sh tools/build-runtime-pack.sh
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/dist/le-veilleux-runtime"
DSH_APP="/Applications/DeepSeek Harness.app/Contents/Resources/runtime"

if [ ! -x "$DSH_APP/cli/bin/dsh" ]; then
  echo "DeepSeek Harness runtime not found at $DSH_APP — install it first."
  exit 1
fi

rm -rf "$OUT"
mkdir -p "$OUT"

echo "→ copiando el runtime de DeepSeek Harness (311 MB)…"
cp -R "$DSH_APP/cli" "$OUT/runtime-cli"
cp -R "$DSH_APP/primary-runtime" "$OUT/runtime-primary"
mkdir -p "$OUT/runtime"
mv "$OUT/runtime-cli" "$OUT/runtime/cli"
mv "$OUT/runtime-primary" "$OUT/runtime/primary-runtime"

echo "→ copiando los 8 plugins de J.Franco…"
mkdir -p "$OUT/plugins"
for d in "$ROOT"/jfranco-*; do
  cp -R "$d" "$OUT/plugins/$(basename "$d")"
done
rm -rf "$OUT"/plugins/*/node_modules

echo "→ avisos de licencia…"
cp "$ROOT/LICENSES.md" "$OUT/LICENSES.md"

echo "→ generando setup-profile.sh (crea el perfil campo con el runtime empaquetado)…"
cat > "$OUT/setup-profile.sh" <<'GEN'
#!/bin/sh
# Creates the campo profile using ONLY this bundled runtime. J.Franco. MIT.
set -e
RUNTIME="$(cd "$(dirname "$0")" && pwd)"
NODE="$RUNTIME/runtime/primary-runtime/dependencies/node/bin/node"
PNPM="$RUNTIME/runtime/primary-runtime/dependencies/pnpm/bin/pnpm.mjs"
PROF="$HOME/.dsh/profiles/campo"
mkdir -p "$PROF"
cd "$PROF"
"$NODE" - "$RUNTIME/plugins" <<'GENNODE'
const fs=require("fs"),path=require("path");
const dir=process.argv[2];
const plugins=fs.readdirSync(dir).filter(d=>d.startsWith("jfranco-"));
const deps={};const bundles=[];
for(const p of plugins){
  const pj=JSON.parse(fs.readFileSync(path.join(dir,p,"package.json"),"utf8"));
  deps[pj.name]="file:"+path.join(dir,p);
  bundles.push(pj.name);
}
const pkg={
  name:"dsh-profile-campo",private:true,
  dependencies:{
    ...deps,
    "@deepseek-ai/dsh-base":"^0.2.1-rc.5",
    "@deepseek-ai/dsh-headless":"^0.2.1-rc.5"
  },
  dsh:{profile:{bundles:["@deepseek-ai/dsh-base","@deepseek-ai/dsh-headless",...bundles]}}
};
fs.writeFileSync("package.json",JSON.stringify(pkg,null,2)+"\n");
GENNODE
cat > cordis.patch.yml <<'GENYML'
- id: agent-default-model
  name: "@deepseek-ai/dsh-agent-default-model"
  config:
    provider: deepseek-official
    model: deepseek-chat
    reasoningEffort: max
GENYML
[ -f cordis.yml ] || echo '[]' > cordis.yml
"$NODE" "$PNPM" install 2>&1 | tail -2 || true
echo "campo profile ready (bundled runtime)."
GEN
chmod +x "$OUT/setup-profile.sh"

echo ""
echo "Runtime pack listo en: $OUT"
du -sh "$OUT"
echo "El instalador de escritorio lo incluye como extraResources (Model B)."
