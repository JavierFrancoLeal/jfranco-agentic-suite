#!/bin/sh
# J.Franco suite — always-connected AI standby agent. Created by J.Franco. MIT.
#
# The bridge that keeps the AI permanently connected to the field:
#   1. Workers send speech/text to the supervisor inbox (/api/live/transcript).
#   2. This loop polls the inbox every few seconds.
#   3. On new transcripts, it runs the DeepSeek Harness agent (campo profile),
#      which decodes, splits by person, tiers, and posts the summary back to
#      /api/live/summary — the worker's screen updates automatically.
#
# Requirements (one-time):
#   export DSH_DEEPSEEK_API_KEY=sk-...      (the campo profile uses it)
#   sh install.sh                            (installs the seven plugins)
#
# Usage:
#   sh tools/agent-standby.sh                # run forever (Ctrl+C to stop)
#   DSH_STANDBY_POLL=4 sh tools/agent-standby.sh   # poll every 4s (default)
#   DSH_STANDBY_DRYRUN=1 sh tools/agent-standby.sh # show commands, run nothing
set -e
ONCE=""
[ "${1:-loop}" = "once" ] && ONCE=1
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NODE="${DSH_NODE:-}"
if [ -z "$NODE" ]; then
  for c in "/Applications/DeepSeek Harness.app/Contents/Resources/runtime/primary-runtime/dependencies/node/bin/node" "$(command -v node 2>/dev/null)"; do
    if [ -n "$c" ] && [ -x "$c" ]; then NODE="$c"; break; fi
  done
fi
[ -z "$NODE" ] && echo "node not found" && exit 1
SUP="${DSH_SUPERVISOR_URL:-http://127.0.0.1:8787}"
POLL="${DSH_STANDBY_POLL:-4}"
DRY="${DSH_STANDBY_DRYRUN:-}"
DSH="${DSH_BIN:-}"
[ -z "$DSH" ] && for c in "/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" "$(command -v dsh 2>/dev/null)"; do
  if [ -n "$c" ] && [ -x "$c" ]; then DSH="$c"; break; fi
done
[ -z "$DSH" ] && { echo "dsh not found. Install DeepSeek Harness first."; exit 1; }

echo "Standby agent connected to $SUP (poll every ${POLL}s)."
[ -n "$DRY" ] && echo "DRY RUN — commands are printed, not executed."
echo "Ctrl+C to stop."

while true; do
  ITEMS="$(curl -s --max-time 5 "$SUP/api/live/inbox" || echo '{}')"
  N="$("$NODE" -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log((JSON.parse(s).items||[]).length)}catch(e){console.log(0)}})' <<EOF
$ITEMS
EOF
)"
  if [ "$N" != "0" ]; then
    TXT="$("$NODE" -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);console.log(j.items.map(x=>x.text).join("\n"))}catch(e){console.log("")}})' <<EOF
$ITEMS
EOF
)"
    PROMPT="Live mirror mode (workflow-master skill). A worker captured this conversation from the field: $TXT Decode it, split it by person (Person 1, Person 2…), assign each request its tier (GREEN/SEMI/YELLOW/RED per decision-router), then POST the summary as JSON to $SUP/api/live/summary with this shape: {\"worker\":\"<worker>\",\"speakers\":[{\"name\":\"<person>\",\"requests\":[{\"text\":\"<request>\",\"tier\":\"<tier>\"}]}]}. Keep texts short. Then answer with one line: summary posted."
    echo "[$(date +%H:%M:%S)] $N transcript(s) received → AI processing…"
    if [ -n "$DRY" ]; then
      echo "   would run: $DSH --profile campo headless \"$PROMPT\""
    else
      "$DSH" --profile campo headless "$PROMPT" >/dev/null 2>&1 || echo "   (agent run failed — check DSH_DEEPSEEK_API_KEY)"
    fi
  fi
  [ -n "$ONCE" ] && exit 0
  sleep "$POLL"
done
