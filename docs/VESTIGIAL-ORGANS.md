# VESTIGIAL-ORGANS — the evolutionary case for pausing, not deleting

*Why the 6 early user-facing organs became dormant/vestigial, what substituted
them, and why evolution says: archive the genome, never burn it. Updated
2026-11-14 to match [`ACTIVE-CATALOG.md`](./ACTIVE-CATALOG.md) (6 dormant
organs + 2 founder DSH cockpit organs whose client UI lives natively in Fanal).*

## The tail of the organism

The early prototype organs were the first answers built as standalone DSH
skills before Fanal Supervisor absorbed their end-user workflows — like the
human body absorbed the tail's function into the glutes, the balance system,
and upright walking. The tail did not disappear from the genome; it went
dormant because the environment changed.

## What substituted each organ (and whether it is more efficient)

### Dormant / vestigial user-facing organs (`6`, paused in `ACTIVE-CATALOG.md`)

| The vestigial organ | What substitutes it (in Fanal product) | More efficient? |
|---|---|---|
| `interpreter` (speech/translation) | `/api/translate` + panel speech synthesis, 10 languages, inside the app | ✅ one call, no skill load |
| `input-detector` (split actions) | `workflow-master`'s listening + panel direct input | ✅ fewer layers |
| `cortex` (proposal/verification split) | Constitution + `decision-router` + Studio decision inbox | ✅ governed, versioned |
| `triage` (queue) | Studio Inbox-First queue + morning *Reprise Matinale* | ✅ live in the dashboard |
| `conductor` (orchestration) | Studio flow + semantic traffic light + `intake-engine.js` | ✅ one brain, one flow |
| `usage-auditor` (costs) | Telemetry + `/api/usage` + `brain-catalog.js` budgets | ✅ automatic |

### Founder's DSH cockpit (`2`, active in DSH developer cockpit only)

| Developer organ | Where client essence lives in Fanal |
|---|---|
| `balance` | Built-in register + Z-report + `/api/settings/balance` |
| `deepseek-prices` | `brain-catalog.js` tier pricing + `/api/settings/status` |

## The simulations (sectors, business plan, technical)

- Client installations: every SME workflow lives directly inside **Fanal Desktop / Supervisor** (`supervisor/*.js`), not in CLI plugins.
- Technical: loading only active developer/workflow organs in DSH keeps agent context lean; full classification across all 26 packages lives in [`ACTIVE-CATALOG.md`](./ACTIVE-CATALOG.md).

## The evolutionary verdict

Nature never deletes a gene that an environment might re-express
(atavism): it silences it at near-zero cost. Do the same:

- PAUSE (archive): keep the packages on npm and the code in the repo;
  remove them from the ACTIVE catalog so sessions load only the live
  organs.
- REACTIVATE only when a future Trasunto app (a CLI agent line, the
  super-agent pipeline, a municipal node) needs a standalone skill
  again — the genome is intact.
- DELETE nothing. The cost of keeping the dormant genome is near zero;
  the cost of rebuilding it later is days.

The human kept the tail's genes and lost the tail: Trasunto keeps the
organs' code and retires them from the active body.
