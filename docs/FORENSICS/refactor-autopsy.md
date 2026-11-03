# 🦴 Forensics — autopsy of the structural refactor (the dropped dish)

*Dig executed by the `forensics` organ on the refactor incident of
2026-11-03. Subject: the agent's own decisions. Lens: opportunity cost —
every objective chosen is every other objective not chosen.*

## 1. The chain of events

1. The agent wrote ANTIFRAGILE-REVIEW.md, naming five uncertainty families
   and proposing a staged refactor (stages 1-3) plus a CSS guard (stage 4).
   Stage 4 (the guard) was done immediately; stages 1-3 were marked
   "pending".
2. The creator approved stages 1-3. The agent executed ALL THREE stages
   in ONE turn, on a working artifact, without mapping the delivery chains.
3. The failure: the split dashboard asked for three files that the app
   bundle's server did not serve (its `server.js` was never part of the
   sync loop) → three 404s → the packaged app rendered the raw page.
4. The creator reported the disaster ("the dish fell"). The agent reverted
   in minutes via `git checkout <last-good>`.

## 2. The opportunity-cost ledger

| Chosen objective | Given up (at least temporarily) |
|---|---|
| Structural hygiene: CSS/JS/i18n boundaries | The working artifact: the 3-screen flow, the animations, the design we had stabilized through 16 lessons |
| Reducing FUTURE collision risk | The PRESENT user-visible asset (the polished first-run experience) |
| One turn of refactoring | One turn of demand work (SADC one-pager, demo, sales) |
| Proving the architecture can split | The user's trust in a stable build — and a recovery turn |

The refactor bought insurance against a hypothetical future at the price
of a concrete present. The insurance was unnecessary: the guards already
installed (strict smoke, CSS collision guard, the five families' lessons)
were managing those exact risks CHEAPLY and REVERSIBLY.

## 3. Forensic findings on the agent's own actions

- **Finding A — risk confused with exposure.** The review correctly
  identified structural entropy as a risk. But managing uncertainty is not
  eliminating the structure that carries it. The guards had already
  converted those risks into caught, cheap events. The refactor was a
  large, all-or-nothing change answering a risk that was already under
  management.
- **Finding B — three-stage surgery executed as one operation.** No
  staging, no mid-point verification, no delivery-chain map drawn before
  the first incision. A surgeon maps the blood supply before cutting; the
  agent mapped nothing.
- **Finding C — the test was blind to the artifact.** The smoke and
  gates validated SOURCE files; the thing that reaches the user is the
  ARTIFACT (the app bundle). The agent violated its own lesson #1 ("the
  printed menu: the fix never reached the tester") one turn after writing
  the review that contained it. The irony is the finding.
- **Finding D — optimized for code, not for product.** Structural elegance
  has zero demand from the user; the working animation is the value. The
  agent spent the session's scarcest asset — attention — on something the
  customer cannot see.
- **Finding E — the recovery worked, but the frequency of self-inflicted
  wounds is itself a signal.** Git + guards made the revert cheap (the
  system is antifragile). But needing to exercise that muscle repeatedly
  means the agent applies large changes without a pre-flight checklist.

## 4. The economics in one sentence

The refactor's expected benefit (fewer hypothetical future collisions) was
already priced-in by the guards; its actual cost (a broken shipped
artifact + a recovery turn + risk to the brand) was not priced at all —
because the delivery chain was never mapped before the change.

## 5. The corrected decision rules

1. **Pre-flight checklist before any structural change:** draw every
   delivery chain (browser, demo, npm package, app bundle) and list which
   artifacts must change TOGETHER. Verify the artifact chain before the
   source — and test the app bundle first.
2. **The opportunity-cost test (three questions):**
   - Does a user-visible asset exist that this change endangers?
   - Do the existing guards already manage the risk cheaply?
   - Can the change be staged and verified at each stage — or is it
     all-or-nothing?
   If the guards suffice and the change is all-or-nothing: DO NOT DO IT.
3. **The cheap-first ladder:** guard → lesson → tool → structural change,
   only after every cheaper rung has demonstrably failed in production.

## 6. The philosophical synthesis

> Uncertainty cannot be eliminated — the attempt created NEW uncertainty
> (the sync gap) while spending the currency of the working product.
> Correct management was already in place. The agent chose a costly
> objective (elimination) over the aligned one (management), and paid in
> the product's own currency.

---
## 2026-11-03 — The refactor that bought insurance against a managed risk
- concept: flow
- friction: the structural refactor broke the shipped app; the split files never reached the app bundle's server.
- lesson: before any structural change, map EVERY delivery chain and run the opportunity-cost test — a refactor must prevent something WORSE than what it endangers, or the guards already do the job cheaper.
- correct-order: "Pre-flight checklist (chains + artifacts together) and the cheap-first ladder: guard → lesson → tool → structural change."
- evidence: docs/FORENSICS/refactor-autopsy.md, commits c3c40ed→8a4f2c5, supervisor v1.0.41.
