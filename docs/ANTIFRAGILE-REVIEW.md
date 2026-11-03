# Antifragile review — the last errors, the organs, and the refactor verdict

*2026-11-03 · J.Franco · The idea is not to eliminate uncertainty — that is
impossible. The idea is to identify it and manage it better, according to
our resources and current objectives.*

## 1. Archaeology of the last iterations (the entry-flow saga)

Fifteen lessons were recorded in EL-FUEGO-LOG. Grouped by root cause,
they reveal FIVE families of uncertainty — not fifteen random bugs:

### Family 1 — NAMING (global namespaces)
- The dead reference that killed the whole page (a removed id, still
  referenced from a dynamic array).
- The dark language boxes (two components sharing the `.tick` class; the
  later rule won silently).
- Corrupted design tokens (`--card2: var(--card2)` — a sed-style global
  replace hit the definition itself).

*Nature of the risk:* one global namespace (ids + classes) shared by
thousands of lines. Any edit can collide with any other part.

*Current management:* the STRICT smoke test (missing ids crash CI) ·
the `.wtick` renaming lesson. **Gap:** no guard against duplicate CSS
class selectors — the collision that bit us twice.

### Family 2 — ORDERING (implicit layer and time models)
- The invisible menu (z-index 90 opened behind z-index 95).
- The splash/langStep overlap (fade not finished before the next screen).
- The login flash, then the orphaned footer flash (partial gating).

*Nature of the risk:* z-index values and timings are scattered literals;
no single ledger is enforced by anything.

*Current management:* the z-index ledger and the explicit-timeline rule in
LEARNINGS.md. **Gap:** the ledger is prose, not code — it can be violated
silently.

### Family 3 — STATE (what is visible when)
- White text on a light background (the saturated gradient only applied on
  view change, not at load).
- The default language persisted without being chosen.

*Nature of the risk:* initial state and transitions are implicit; the
"correct" state depends on load order and user actions.

*Current management:* `loginpage` at load · `body.firstboot` locks the
whole stage · persistence moved to explicit human choice.

### Family 4 — SEMANTICS ("once" and borrowed ideas)
- "Once" implemented as "seen once" instead of "configured once".
- The language flow borrowed from Apple without its full objective
  (one declared language governs everything).

*Current management:* EL FUEGO principles 1-2 (full logic of the
inspiration; not every idea is an organ) + lesson 12 (boot semantics).

### Family 5 — DELIVERY (the fix never reached the tester)
- "It persists" after correct fixes (stale installed app).
- Patch scripts dying on syntax (my own tooling).

*Current management:* the visible version badge · rebuild-discipline ·
the strict smoke gate. 

## 2. The pattern behind the five families

Every serious error came from the SAME root: **the dashboard grew by
text-patch surgery on one interleaved file** (CSS + HTML + JS in
`dashboard.html`), with global namespaces, scattered z-index/timing
literals, and implicit state. The organs never saw these bugs coming —
because the organs govern the WORK PROCESS, not the CODE STRUCTURE.

## 3. The organs inside the antifragile philosophy

The six organs form a closed loop that GAINS from disorder:

```
/listen  workflow-master   capture (uncertainty enters)
    ↓
decision-router            process & propose (GREEN/YELLOW/RED)
    ↓
accountability-auditor     verify before output
    ↓
autonomy-grader            grade the decisions (A-D) → select what survives
    ↓
audit                      consolidate: friction → teach → record (EL FUEGO)
    ↓
forensics                  reconstruct the past for whoever comes later
    ↑______________________ the fire log feeds the next cycle
```

Antifragility lives in the fact that ERRORS ARE THE RAW MATERIAL:
each friction event becomes a lesson, each lesson becomes a rule or a
tool, and each rule/tool prevents the next generation of the same error.
The system does not avoid shocks — it feeds on them.

**But:** the loop protects decisions and knowledge, not structure. The
entry-flow bugs show that structural entropy (naming, ordering, state)
needs its own management layer — and it has been emerging, one guard at
a time: strict smoke · z-index ledger · firstboot lock · version badge.

## 4. The refactor verdict

**Refactor the dashboard's STRUCTURE — yes. Create new organs — no.**

The industrial lens applied to ourselves: six organs is the right number;
the recent friction did not come from a missing organ but from one file
carrying three languages (CSS/HTML/JS) without boundaries. The staged
refactor, sized to our resources:

| Stage | Change | Risk removed |
|---|---|---|
| 1 | Extract the `<style>` block to `dashboard.css` | Global-replace edits stop touching CSS |
| 2 | Extract the inline script to `dashboard.js` | String patches stop re-parsing JS; smoke tests the real file |
| 3 | Extract the i18n dictionaries to `i18n.js` (or per-locale JSON) | Language edits stop splicing JS |
| 4 | Add a class-collision guard to `tools/check.sh` | Duplicate CSS class selectors crash CI (the `.tick` class of bug) |

The server already serves sibling static files (panel, sw, icons), so the
split is a serving configuration, not a new architecture. The HTML keeps
the id ledger at the top; the strict smoke keeps guarding it.

**Not refactored:** the supervisor server (it has held for 36 versions
and its endpoints are small and testable), the six organs (they are
stable, published, and absorbed their own redundancy), the Electron shell
(it has not been the source of friction).

## 5. The operating principle (the conclusion)

> Uncertainty cannot be eliminated. What we did instead: we gave each
> family of uncertainty a NAME, a GUARD, and a LESSON — and the guard
> converts the next occurrence from a surprise into a caught, recorded,
> and managed event. That is the difference between fragile (each error
> hurts the same) and antifragile (each error strengthens the system).

The entry-flow saga was not waste: it was the stress test that produced
the five families, fifteen lessons, two guards, and this review.
