#!/bin/sh
# J.Franco suite — one-command activation of the always-connected AI.
# Created by J.Franco. MIT.
#
# This turns the bridge on: workers' speech goes to the supervisor inbox,
# and the DeepSeek Harness agent (campo profile) processes it permanently.
#
# One-time requirements:
#   1. A DeepSeek API key:  https://platform.deepseek.com/ → API keys
#   2. The campo profile with the seven plugins:  sh install.sh
#
# Usage:
#   export DEEPSEEK_API_KEY=sk-...   (or put the export in ~/.zshrc)
#   sh tools/activate-ai.sh              # verifies + starts the standby agent
#   sh tools/activate-ai.sh status       # shows whether the agent is running
#   sh tools/activate-ai.sh stop         # stops the standby agent
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PIDFILE="/tmp/dsh-standby.pid"
LOG="$HOME/.dsh/agent-standby.log"

if [ "${1:-start}" = "stop" ]; then
  kill "$(cat "$PIDFILE" 2>/dev/null)" 2>/dev/null || true
  pkill -f "agent-standby.sh" 2>/dev/null || true
  echo "Standby agent stopped."
  exit 0
fi
if [ "${1:-start}" = "status" ]; then
  if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE" 2>/dev/null)" 2>/dev/null; then
    echo "Standby agent RUNNING (pid $(cat "$PIDFILE")). Log: $LOG"
  else
    echo "Standby agent not running."
  fi
  exit 0
fi

if [ -z "$DEEPSEEK_API_KEY" ] && [ -z "$DSH_DEEPSEEK_API_KEY" ]; then
  echo "❌ Missing DEEPSEEK_API_KEY."
  echo ""
  echo "1) Get a key at  https://platform.deepseek.com/  →  API keys"
  echo "2) Put it in your shell profile so it is always available:"
  echo '   echo '\''export DEEPSEEK_API_KEY=sk-TU_CLAVE'\'' >> ~/.zshrc'
  echo "3) Open a new terminal and run:  sh tools/activate-ai.sh"
  exit 1
fi

DSH="${DSH_BIN:-}"
[ -z "$DSH" ] && for c in "/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" "$(command -v dsh 2>/dev/null)"; do
  if [ -n "$c" ] && [ -x "$c" ]; then DSH="$c"; break; fi
done
[ -z "$DSH" ] && { echo "❌ DeepSeek Harness not found."; exit 1; }

echo "✅ API key present. Checking the campo profile…"
if ! "$DSH" --profile campo --version >/dev/null 2>&1; then
  echo "❌ campo profile missing. Run:  sh install.sh"
  exit 1
fi

echo "✅ Testing the AI with a tiny prompt…"
OUT="$("$DSH" --profile campo headless "Responde con una sola palabra: ok" 2>&1 || true)"
if ! echo "$OUT" | grep -qi "ok"; then
  echo "❌ The test prompt failed. Last output:"
  echo "$OUT" | tail -4
  echo "Check that the key is valid and has balance."
  exit 1
fi
echo "✅ AI responds. Starting the always-connected standby agent…"
mkdir -p "$HOME/.dsh"
nohup sh "$ROOT/tools/agent-standby.sh" > "$LOG" 2>&1 &
echo $! > "$PIDFILE"
sleep 2
if kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
  echo ""
  echo "🎉 THE AI IS ALWAYS CONNECTED."
  echo "   Workers talk → the agent decodes → the summary arrives alone."
  echo "   Log: $LOG   ·   Stop: sh tools/activate-ai.sh stop"
else
  echo "❌ The standby agent did not start. Log: $LOG"
  exit 1
fi
