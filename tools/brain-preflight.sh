#!/bin/sh
# brain-preflight — el guardián del hardware ANTES de tocar modelos locales.
# Regla de la casa (lección #34): jamás bajar ni cargar un modelo sin medir.
# Uso: sh tools/brain-preflight.sh [modelo]
MODEL="${1:-}"
RAM_KB=$(sysctl -n hw.memsize 2>/dev/null | awk '{print int($1/1024)}')
RAM_GB=$(echo "$RAM_KB" | awk '{printf "%.0f", $1/1048576}')
echo "RAM: ${RAM_GB} GB"
FREE=$(vm_stat | awk '/Pages free/{gsub(/\./,"");print $3}')
INACTIVE=$(vm_stat | awk '/Pages inactive/{gsub(/\./,"");print $3}')
FREE_MB=$(( (FREE + INACTIVE) * 16384 / 1024 ))
echo "Memoria recuperable ahora: ~${FREE_MB} MB"
if [ -n "$MODEL" ]; then
  SIZE=$(ollama show "$MODEL" 2>/dev/null | grep -oE '"[0-9.]+GB"|parameters.*|size.*' | head -2)
  echo "Modelo $MODEL: $SIZE"
  # Si el modelo aún no está descargado, no hay medida — avisar y pedir el tamaño
  if ! ollama list | grep -q "$MODEL"; then
    echo "⚠ No está descargado — ANTES de bajar, verifica su tamaño en ollama.com/library/$MODEL"
    echo "Regla: un modelo de 8B ≈ 4-5 GB · 70B ≈ 40 GB — tu máquina tiene ${RAM_GB} GB."
  fi
fi
# El umbral de la casa: ningún modelo debe superar ~30% de la RAM
echo "Umbral de la casa: máximo ~$(( RAM_GB * 30 / 100 )) GB de modelo."
