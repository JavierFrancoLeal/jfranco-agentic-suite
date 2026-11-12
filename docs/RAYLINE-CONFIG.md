# RAYLINE-CONFIG — the prepared tier (2026-11-12)

The configuration is PREPARED and OFF by default. To activate it when
the demand (or the founder) orders it:

1. providers.json gains the block:
   {
     "rayline": {
       "enabled": false,
       "baseUrl": "https://api.rayline.ai",  // à confirmer sur docs.rayline.ai
       "model": "arc-route",
       "apiKey": "CLE_A_CONFIRMER"
     }
   }
2. The ladder: the new tier "route" — when the rayline provider is
   enabled, the router asks ARC's recommendation first; the chosen
   model then runs through the normal tier. If Rayline is absent,
   slow, or fails, the router falls back to the deep tier in the same
   call — the graceful degradation (the antifragile rule: the optional
   organ never breaks the body).
3. The veil runs BEFORE any routing request (the house condition #1);
   the route request carries NO private data.

The honest state: the tier is CONFIGURED and dormant — the exact
endpoint and the key arrive when the integration is ordered; until
then, the ladder behaves exactly as before (the route tier is inert).
