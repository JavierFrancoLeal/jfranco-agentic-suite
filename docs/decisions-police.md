# decisions.md template — Police field work

Copy these rules into your `decisions.md` (workspace root, `.dsh/decisions.md`,
or `~/.dsh/decisions.md`) and adjust them to your real rules. When the file
exists, it replaces the built-in defaults.

Legal decisions always belong to the officer; the agent only advises.

| Pattern | Tier |
|---|---|
| Look up an ID or a plate in the database (read-only) | GREEN |
| Transcribe and attribute a third party's statement | GREEN |
| Record the officer's own dictation of ID or incident data | GREEN |
| Verify laws and prepare a legal analysis | YELLOW |
| Give real-time advice to the officer (advisory mode) | YELLOW |
| Prepare or submit the official report | YELLOW |
| Any action over a person's rights (detention, search, sanction) | RED |
| Contact other units, dispatch, or escalate | RED |
