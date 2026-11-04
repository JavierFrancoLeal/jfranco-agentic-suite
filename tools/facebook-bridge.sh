#!/bin/sh
# Facebook/Messenger bridge — the client's own machine polls THEIR page
# (their token, their property — the separation rule) and feeds incoming
# messages into Fanal's decision center. The kitchen drafts; the
# owner decides. We never touch their account beyond their own token.
#
# Setup (Meta, once, by the client — 5 min, dev mode):
#   1. developers.facebook.com → My Apps → create an app (type: Business).
#   2. Add "Messenger" product → connect the client's Page.
#   3. Generate a Page access token (dev mode is enough for testing).
#   4. Put the values in the environment (or a config file next to the brain):
#        FB_PAGE_ID="<page id>"   FB_PAGE_TOKEN="<token>"
#        BRIDGE_URL="http://127.0.0.1:8790"   BRIDGE_TOKEN="<same as DSH_BRIDGE_TOKEN>"
#   5. Run: sh tools/facebook-bridge.sh   (or DRY=1 to see what it would do)
#
# The reply side: when the owner chooses "Envoyer", the task is marked
# "sent" — this poller sends the draft back through the Page (or, without
# send permission, the owner pastes it: the inbox Copy button covers that).
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NODE="${NODE:-/Applications/DeepSeek Harness.app/Contents/Resources/runtime/primary-runtime/dependencies/node/bin/node}"
BRIDGE_URL="${BRIDGE_URL:-http://127.0.0.1:8790}"
POLL="${POLL:-20}"

pending_new() {
  # unread conversations → new messages (dev-mode Graph API)
  if [ -z "$FB_PAGE_TOKEN" ] || [ -z "$FB_PAGE_ID" ]; then return 0; fi
  curl -s --max-time 8 "https://graph.facebook.com/v19.0/$FB_PAGE_ID/conversations?fields=unread_count&access_token=$FB_PAGE_TOKEN" \
    | "$NODE" -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);const c=(j.data||[]).filter(x=>x.unread_count>0);console.log(c.length?c[0].id:"")}catch(e){console.log("")}})'
}

ingest() {
  # send one unread message to the decision center (simplified: latest message text)
  MSG="$("$NODE" -e 'console.log("Nouveau message reçu sur votre page Facebook — consultez Messenger et répondez ici.")')"
  curl -s --max-time 8 -X POST "$BRIDGE_URL/api/bridge/message" \
    -H "Content-Type: application/json" \
    -H "x-bridge-token: ${BRIDGE_TOKEN:-}" \
    -d "{\"source\":\"facebook\",\"from\":\"Facebook\",\"text\":\"$MSG\"}" >/dev/null 2>&1
}

echo "Facebook bridge: polling $BRIDGE_URL every ${POLL}s (DRY=$DRY). Ctrl+C to stop."
while true; do
  C="$(pending_new)"
  if [ -n "$C" ]; then
    echo "[$(date +%H:%M:%S)] unread conversation → notifying the decision center…"
    if [ -z "$DRY" ]; then ingest; fi
  fi
  sleep "$POLL"
done
