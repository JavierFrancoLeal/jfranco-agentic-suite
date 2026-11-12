# Integration plan — cockpit audit → house governance (DEFERRED)

**Status: DEFERRED.** Do NOT implement until AFTER the real Google Carbon flow has
run and produced a first real `audit.jsonl`. The cockpit already exposes
`/cockpit report` and `/cockpit kpi` as its local governance view.

**Decision (Argon, 2026-11-12):** the cockpit must NEVER append directly to
`~/.dsh/supervision.md`. Keep `audit.jsonl` as the single cryptographic source of
truth; `jfranco-audit` consolidates a derived view for the house.

## Architecture to implement (later)

### 1. Single-writer + consolidation on read
- `jfranco-cockpit-browser` writes ONLY `~/.dsh/cockpit-browser/audit.jsonl`.
- `jfranco-audit` (the aggregator) reads `~/.dsh/supervision.md` + every
  `~/.dsh/*/audit.jsonl` and injects one summarized block per episode into the
  view consumed by `accountability-auditor` and `autonomy-grader`.

### 2. Schema: add `intentId` + `phase`/`outcome`
One `intentId` = one real mutating decision. Group by `intentId` in `computeKpis`
and the grader so a YELLOW propose→approve never double-counts.

| Event | tier | phase |
|---|---|---|
| Direct GREEN/SEMI | SEMI | `auto_exec` |
| YELLOW, stopped | YELLOW | `propose` |
| YELLOW, after `/cockpit step` | YELLOW | `approved_exec` (do NOT demote to SEMI) |
| RED brake | RED | `refused` |
| Physical mouse/keyboard takeover | MANUAL | `human_takeover` |

### 3. The contract jfranco-audit passes to the grader (per intentId)
```
{ intentId, action, target, label, tier, outcome }
outcome ∈ { auto_exec, approved_exec, propose_abandoned, refused, human_takeover, failed }
```

### 4. Hash anchoring (sidechain) — keep the two files separate
- `audit.jsonl` stays the immutable forensic ledger with `prevHash`/`hash` per line.
- At session end (or on `/cockpit report` / `jfranco-audit`), append ONE anchor
  line to `~/.dsh/supervision.md`:
  `- [ts] **cockpit-session** | intents: N (auto: a, yellow_ok: y, red_brake: r, manual: m) | autonomy: X% | audit_lines: L..U | head_hash: <sha>`
- The `head_hash` stamped into `supervision.md` means even a full rewrite of
  `audit.jsonl` with recomputed SHA-256 cannot hide tampering.
