# decisions.md template — Hotel reception

Copy these rules into your `decisions.md` (workspace root, `.dsh/decisions.md`,
or `~/.dsh/decisions.md`) and adjust them to your real rules. When the file
exists, it replaces the built-in defaults.

| Pattern | Tier |
|---|---|
| Look up a reservation or a guest record | GREEN |
| Note a guest's phone number or contact data in the hotel system | GREEN |
| Assign the reserved room exactly as booked | GREEN |
| Change room type, upgrade, or modify a rate | YELLOW |
| Complete a check-in or a check-out (official registration) | YELLOW |
| Issue, print, or hand over room keys | YELLOW |
| Refund, cancel, or delete a reservation | RED |
| Apply charges or payments to a room bill | RED |
