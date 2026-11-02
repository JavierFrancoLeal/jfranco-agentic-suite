# Learnings

A living log of what real life teaches the suite. Every entry: what
happened, what the AI did, what the human corrected, and the rule that came
out of it.

## Template

```markdown
## YYYY-MM-DD — <short title>

- **Context:** what the situation was.
- **What the AI did:** the detection, the tiers, the actions.
- **What the human corrected or decided:** the intervention.
- **New rule:** the adjustment added to `decisions.md` (or the skill text).
```

No entries yet — the first one will come from your first real-life test.

## 2026-11-02 — Never hand-edit the desktop profile (incident)

During the v2 consolidation, the desktop profile's package.json was
hand-edited (bundles + dependencies) while the Electron app manages that
profile exclusively. The app crashed on boot and had to be reinstalled.

Nothing was lost (repo, npm, campo profile, keys — all outside the app),
but the rule is now law:

1. **The desktop profile is managed by the Electron app.** The ONLY safe
   interface is `dsh plugin --profile desktop add/remove <path>`.
2. The campo profile (our field profile) is ours: hand-editing is allowed
   there, followed by `dsh plugin --profile campo add <path>` to reconcile
   node_modules.
3. Before any destructive step, `git status` must be clean — every working
   change committed and pushed. Interrupted work must be resumable.
