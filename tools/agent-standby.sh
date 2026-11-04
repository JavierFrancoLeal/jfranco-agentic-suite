#!/bin/sh
# J.Franco suite — always-connected AI standby agent (dual brain).
# Created by J.Franco. MIT.
#
# The bridge that keeps the AI permanently connected to the field:
#   1. Workers send speech/text to the supervisor inbox (/api/live/transcript).
#   2. This loop polls the inbox every few seconds.
#   3. Field transcripts → the FAST brain (deepseek-flash): real-time
#      demand — listening, transcription, translation, writing orders.
#   4. Deep questions (/api/deep) → the DEEP brain (deepseek-v4-pro),
#      which thinks at length and posts its answer to /api/deep/result.
#
# Requirements (one-time):
#   export DEEPSEEK_API_KEY=sk-...   (the campo profile uses it)
#   sh install.sh                    (installs the plugins)
#
# Usage:
#   sh tools/agent-standby.sh                # run forever (Ctrl+C to stop)
#   sh tools/agent-standby.sh once           # process one batch, then exit
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

# The dual brain (verified against the official API 2026-11-04):
#   Flash patch: the FAST brain for real-time demand (listen, transcribe,
#   translate, orders).   Deep patch: V4 Pro for deep analysis.
cat > /tmp/dsh-fast-patch.yml <<'YML'
- id: agent-default-model
  name: "@deepseek-ai/dsh-agent-default-model"
  config:
    provider: deepseek-official
    model: deepseek-flash
YML
cat > /tmp/dsh-reasoner-patch.yml <<'YML'
- id: agent-default-model
  name: "@deepseek-ai/dsh-agent-default-model"
  config:
    provider: deepseek-official
    model: deepseek-v4-pro
    reasoningEffort: max
YML

echo "Standby agent connected to $SUP (poll every ${POLL}s). Dual brain: field→flash, deep→v4-pro."
[ -n "$DRY" ] && echo "DRY RUN — commands are printed, not executed."
echo "Ctrl+C to stop."

items_json() {
  curl -s --max-time 5 "$1" || echo '{}'
}
count_of() {
  echo "$1" | "$NODE" -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log((JSON.parse(s).items||[]).length)}catch(e){console.log(0)}})'
}
texts_of() {
  echo "$1" | "$NODE" -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);console.log(j.items.map(x=>x.text).join("\n"))}catch(e){console.log("")}})'
}

while true; do
  # ---- FAST brain: field transcripts ----
  ITEMS="$(items_json "$SUP/api/live/inbox")"
  N="$(count_of "$ITEMS")"
  if [ "$N" != "0" ]; then
    TXT="$(texts_of "$ITEMS")"
    PROMPT="Live mirror mode (workflow-master skill). A worker captured this conversation from the field: $TXT Decode it, split it by person (Person 1, Person 2…), assign each request its tier (GREEN/SEMI/YELLOW/RED per decision-router). If any speech is not in French, translate it into French inside the summary (the house language of the business), then POST the summary as JSON to $SUP/api/live/summary with this shape: {\"worker\":\"<worker>\",\"speakers\":[{\"name\":\"<person>\",\"requests\":[{\"text\":\"<request>\",\"tier\":\"<tier>\"}]}]}. Keep texts short. Then answer with one line: summary posted."
    echo "[$(date +%H:%M:%S)] $N transcript(s) received → AI processing…"
    if [ -n "$DRY" ]; then
      echo "   would run: $DSH --profile campo --patch /tmp/dsh-fast-patch.yml headless \"$PROMPT\""
    else
      "$DSH" --profile campo --patch /tmp/dsh-fast-patch.yml headless "$PROMPT" >/dev/null 2>&1 || echo "   (field run failed — check DEEPSEEK_API_KEY)"
    fi
  fi

  # ---- DEEP brain: questions for the Reasoner ----
  DITEMS="$(items_json "$SUP/api/deep/inbox")"
  DN="$(count_of "$DITEMS")"
  if [ "$DN" != "0" ]; then
    DTXT="$(texts_of "$DITEMS")"
    DPROMPT="Deep analysis (Reasoner brain). Question: $DTXT Think deeply and answer thoroughly. Then POST your answer as JSON to $SUP/api/deep/result with this shape: {\"text\":\"<your answer>\"}. Finally reply with one line: deep answer posted."
    echo "[$(date +%H:%M:%S)] $DN deep question(s) received → Reasoner thinking…"
    if [ -n "$DRY" ]; then
      echo "   would run: $DSH --profile campo --patch /tmp/dsh-reasoner-patch.yml headless \"$DPROMPT\""
    else
      "$DSH" --profile campo --patch /tmp/dsh-reasoner-patch.yml headless "$DPROMPT" >/dev/null 2>&1 || echo "   (deep run failed — check the key/model)"
    fi
  fi

  # ---- STUDIO: drafts for the owner (one app, invisible kitchen) ----
  SITEMS="$(items_json "$SUP/api/studio/inbox")"
  SN="$(count_of "$SITEMS")"
  if [ "$SN" != "0" ]; then
    STXT="$(echo "$SITEMS" | "$NODE" -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);console.log(j.items.map(x=>x.id+" ::: "+x.text).join("\n"))}catch(e){console.log("")}})')"
    SPROMPT="Decision center kitchen (Trasunto). The owner asked these tasks (each line: id ::: type :: request): $STXT For EACH: draft a short professional French response AND write in one sentence your reasoning (the motivation: why this reply, based on what). Then POST as JSON to $SUP/api/studio/result with this shape: {\"id\":\"<the task id>\",\"result\":\"<your draft>\",\"rationale\":\"<your reasoning>\"}. Finally reply one line: drafts posted."
    echo "[$(date +%H:%M:%S)] $SN studio task(s) → drafting…"
    if [ -n "$DRY" ]; then
      echo "   would run: $DSH --profile campo --patch /tmp/dsh-fast-patch.yml headless \"$SPROMPT\""
    else
      "$DSH" --profile campo --patch /tmp/dsh-fast-patch.yml headless "$SPROMPT" >/dev/null 2>&1 || echo "   (studio run failed — check DEEPSEEK_API_KEY)"
    fi
  fi

  [ -n "$ONCE" ] && exit 0
  sleep "$POLL"
done
