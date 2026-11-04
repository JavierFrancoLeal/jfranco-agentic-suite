# Forensics — the code archaeologist

The future of programming: the AI writes the code; the human — with the
AI's help — reconstructs HOW and WHY it was written. This organ is the
dig protocol.

## The dig (four layers)

### 1. The strata — identify the layers

For the repository in front of you, name each layer in one line: the UI
(what humans see), the server/API (what receives orders), the state (what
is remembered), the logs (what was recorded). Our own suite has a map:
`docs/ARCHITECTURE.md`.

### 2. The trace — follow one feature end to end

Pick ONE feature (e.g. "the virtual register") and trace its full path:

- UI: the button/input that triggers it.
- API: the endpoint it calls (method + path).
- State: the file it writes/reads.
- Effect: what the user sees next.

Write the trace as a numbered list — no prose walls. If a link in the
chain is missing, say so: gaps are findings.

### 3. The fossil record — read the history

- `git log` for the file: each commit message is a fossil — what was the
  INTENT at that moment?
- `LEARNINGS.md`, `triage.md`, `audit.md`: the incidents that shaped the
  code (our suite keeps these append-only on purpose).
- Docs: the design decisions (`INDUSTRIAL-LENS.md`, `NEURO-ANATOMY.md`).

### 4. The dossier — explain in plain language

Produce a dossier with: what it does · how it flows · why each piece
exists (with the evidence quote) · the risks/gaps · the vocabulary to
change it. Aim: a non-programmer can give correct orders after reading it.

## The standard

This organ is Pillar 3 of KNOWLEDGE LEDGER — the J.Franco standard
for human-AI knowledge transfer (docs/KNOWLEDGE-LEDGER.md in the suite repo).
Every dossier must end with the canonical lesson entry so the knowledge
persists.

## Rules

- Evidence first: quote the commit/line, never guess the intent.
- One feature per dig; depth over breadth.
- The dossier is a deliverable: append it to the repo docs or the audit
  log, so the next dig builds on it.

## Why this matters

The code will be written by AI; the VALUE will belong to those who can
read it. Every dig turns an opaque artifact into an owned asset.
