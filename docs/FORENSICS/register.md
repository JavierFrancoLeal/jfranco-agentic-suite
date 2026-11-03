# 🦴 Forensics dossier — The virtual register (counter-register)

*Dig executed with the `forensics` organ on 2026-11-03. One feature, four layers.*

## 1. The strata

- **UI**: `supervisor/dashboard.html` — the "🪙 Virtual register" card (worker) and "🪙 Day register" card (owner).
- **API**: `supervisor/server.js` — five `/api/register*` endpoints (lines 366-370).
- **State**: `register.json` in the data directory — a single file, not a database.
- **Records**: the exportable Z-report (`/api/export?type=register`) — the auditable memory.

## 2. The trace (end to end)

1. The worker taps **"Open register"** → `POST /api/register/open` → writes `{status:"open", items:[], sales:[]}` to `register.json`.
2. Adds items → `POST /api/register/add` → each item enters `items` with name and price.
3. Taps **"💳 Record sale"** (chooses a method) → `POST /api/register/charge` → sums the `items`, creates a `sale` (with worker and method), and empties `items`.
4. Closes → `POST /api/register/close` with the DECLARED total from the physical terminal.
5. The server computes: **recorded** (its sales) vs **declared** (the terminal) → **variance**.
6. The owner sees the difference in amber and exports the **Z-report**.

*Every step requires a session (401 without a token) — the register is a money document.*

## 3. The fossil record (why it exists this way)

- The register was born from the **cash-first** decision ([docs/PAYMENTS-STRATEGY.md](PAYMENTS-STRATEGY.md)): *"we do not process money; we give the owner what they pay others for: reconciliation."*
- Evidence of intent: the `charge` endpoint stores `worker` and `method` (turn-135 commit) — so the variance is attributed to WHO and HOW.
- The bug caught at birth: `saveUsers` did not create the directory on a start without `init` — the lesson lives in EL-FUEGO-LOG (canonical format).

## 4. The dossier (plain language)

**What it does:** a parallel cash register that does NOT charge — it records what was sold, by whom and how, and at close compares against the physical terminal. The difference is the signal: error, leak, or theft.

**How it flows:** worker (adds/records) → `register.json` → owner (variance + Z-report).

**Why each piece exists:** the single file (simplicity, zero dependencies); the mandatory session (it is money); the Z-report (the printable proof for accounting).

**Risks/gaps:** one file per day (history is overwritten when reopening — archive the Z-report); the variance does not distinguish human error from theft (it is a signal, not a verdict — the owner decides).

**Vocabulary for ordering changes:** *"in the register: [open|add|record|close|variance|Z-report] — change [the method|the total|the filter] to [value]"*.

---
## 2026-11-03 — The register that does not process, only remembers
- concept: flow
- friction: the wish to integrate a payment processor (Stripe/Lightspeed) before having clients.
- lesson: the immediate value is not processing the payment but RECORDING it — the counter-register saves capital (reconciliation) without fees or risk.
- correct-order: "Add a virtual register: record sales with method, close against the terminal, show the variance."
- evidence: supervisor/server.js (366-370), docs/PAYMENTS-STRATEGY.md, commit 53c306d.
