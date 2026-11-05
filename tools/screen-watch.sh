#!/bin/sh
# screen-watch — the burst watcher: captures the screen every ~250 ms
# (the time a keypress takes to appear) and logs ONLY the changes.
# Usage: sh tools/screen-watch.sh [seconds]   (default: 60)
# Doctrine: short bursts, then STOP and WAIT for the human.
SECS="${1:-60}"
[ "$SECS" -gt 120 ] && SECS=120
OCR_BIN="${HOME}/.local/bin/fanal-ocr"
if [ ! -x "$OCR_BIN" ]; then
  cat > /tmp/fanal-ocr-fast.swift <<'SWIFT'
import Foundation
import Vision
import AppKit
let url = URL(fileURLWithPath: CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "/tmp/fanal-screen.png")
guard let img = NSImage(contentsOf: url), let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { exit(1) }
let req = VNRecognizeTextRequest { r, e in
  let lines = (r.results as? [VNRecognizedTextObservation] ?? []).compactMap { $0.topCandidates(1).first?.string }
  print(lines.joined(separator: " | "))
}
req.recognitionLevel = .fast
let handler = VNImageRequestHandler(cgImage: cg, options: [:])
try? handler.perform([req])
SWIFT
  swiftc -O /tmp/fanal-ocr-fast.swift -o "$OCR_BIN" 2>/dev/null || exit 1
fi
LOG=/tmp/screen-watch.log
: > "$LOG"
PREV=""
N=0
while [ "$N" -lt "$SECS" ]; do
  N=$((N+1))
  NOW=$(screencapture -x /tmp/watch-live.png 2>/dev/null && "$OCR_BIN" /tmp/watch-live.png 2>/dev/null)
  if [ -n "$NOW" ] && [ "$NOW" != "$PREV" ]; then
    echo "[$(date +%H:%M:%S.%3N)] $NOW" >> "$LOG"
    PREV="$NOW"
  fi
  sleep 0.25
done
echo "vigía terminado: $(wc -l < "$LOG" | tr -d ' ') cambios en ${SECS}s → /tmp/screen-watch.log"
