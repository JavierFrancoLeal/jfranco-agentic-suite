#!/bin/sh
# DSH Assistant — Linux launcher. Created by J.Franco. MIT.
# Runs the suite autonomously (campo profile) and opens the result.
# Requirement: DeepSeek Harness CLI (`dsh`) on PATH, campo profile created,
# and DSH_DEEPSEEK_API_KEY set.
DSH="$(command -v dsh 2>/dev/null || true)"
if [ -z "$DSH" ]; then
  echo "DeepSeek Harness (dsh) not found on PATH. Install it first:"
  echo "  npm install -g @deepseek-ai/dsh"
  exit 1
fi
printf "What do you need? (speak or type, starting with 'listen'): "
read -r INPUT
[ -z "$INPUT" ] && exit 0
OUT="$HOME/DSH-Result.txt"
"$DSH" --profile campo headless "$INPUT" > "$OUT" 2>&1
if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$OUT"
else
  cat "$OUT"
fi
