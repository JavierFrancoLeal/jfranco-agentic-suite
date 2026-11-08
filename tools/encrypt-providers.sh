#!/bin/sh
# The one-time migration: encrypts providers.json at rest (AES-256-GCM).
# The key: $FANAL_MASTER_KEY (32+ chars) — never in the command line, only in the env.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATA="${DSH_SUPERVISOR_DATA:-$HOME/.dsh}"
FILE="$DATA/providers.json"
[ -f "$FILE" ] || { echo "no providers.json at $FILE"; exit 1; }
KEY="${FANAL_MASTER_KEY:-}"
[ -n "$KEY" ] || { echo "set FANAL_MASTER_KEY (32+ chars) first"; exit 1; }
NODE="/Applications/DeepSeek Harness.app/Contents/Resources/runtime/primary-runtime/dependencies/node/bin/node"
"$NODE" -e '
const fs=require("fs"),crypto=require("crypto");
const f=process.argv[1],k=process.argv[2];
const raw=fs.readFileSync(f,"utf8").trim();
if(!raw.startsWith("{")){console.log("already encrypted");process.exit(0);}
const key=crypto.createHash("sha256").update(k).digest();
const iv=crypto.randomBytes(12);
const c=crypto.createCipheriv("aes-256-gcm",key,iv);
const enc=Buffer.concat([c.update(raw,"utf8"),c.final()]);
fs.writeFileSync(f,"AESGCM:"+Buffer.concat([iv,c.getAuthTag(),enc]).toString("base64"),{mode:0o600});
console.log("providers.json encrypted ✔");
' "$FILE" "$KEY"
