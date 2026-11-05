#!/bin/sh
# screen-read — the TEXT eyes of Fanal (announced, never silent).
# Captures the screen and reads its text with macOS's on-device Vision
# OCR. No vision model, no cloud: the recognition runs on this machine.
# Doctrine: this tool only runs when the operator asks for it.
OUT="${1:-/tmp/fanal-screen.png}"
screencapture -x "$OUT" 2>/dev/null || { echo "screen capture failed (Screen Recording permission?)"; exit 1; }
OCR_BIN="${HOME}/.local/bin/fanal-ocr"
if [ ! -x "$OCR_BIN" ]; then
  cat > /tmp/fanal-ocr.swift <<'SWIFT'
import Foundation
import Vision
import AppKit
let url = URL(fileURLWithPath: CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "/tmp/fanal-screen.png")
guard let img = NSImage(contentsOf: url), let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { print("no image"); exit(1) }
let req = VNRecognizeTextRequest { r, e in
  let lines = (r.results as? [VNRecognizedTextObservation] ?? []).compactMap { $0.topCandidates(1).first?.string }
  print(lines.joined(separator: "\n"))
}
req.recognitionLevel = .accurate
let handler = VNImageRequestHandler(cgImage: cg, options: [:])
try? handler.perform([req])
SWIFT
  swiftc -O /tmp/fanal-ocr.swift -o "$OCR_BIN" 2>/dev/null || { echo "ocr compile failed"; exit 1; }
fi
"$OCR_BIN" "$OUT"
