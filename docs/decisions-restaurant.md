# decisions.md template — Restaurant service

Copy these rules into your `decisions.md` (workspace root, `.dsh/decisions.md`,
or `~/.dsh/decisions.md`) and adjust them to your real rules. When the file
exists, it replaces the built-in defaults.

| Pattern | Tier |
|---|---|
| Note an order (dishes, drinks, cooking points, table number) | GREEN |
| Apply an allergy flag to every dish of an order | SEMI-AUTOMATIC |
| Send an order to the kitchen | YELLOW |
| Suggest pairings, upsells, or a split-bill calculation | YELLOW |
| Modify or cancel an order already sent to the kitchen | YELLOW |
| Apply discounts, promotions, or close the till | RED |
| Handle payments, refunds, or tips on behalf of the house | RED |
