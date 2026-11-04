# Sector technology matrix — external tech inside Le Veilleux

*2026-11-03 · J.Franco · Source 3 of the business plan, engineered: every
sector of the economy gets the external technology that makes the owner
stop paying time, money, or effort. One rule: WE consume the API
server-side and present the ANSWER in the dashboard — the client never
touches a key, a console, or a technical decision.*

## The integration pattern (the counter-register lesson applied)

- The supervisor already has an API server + sector packs + roles.
- New: an INTEGRATIONS layer in the server (`/api/ext/*`) that calls the
  external service with the CLIENT's key (stored in the sector pack
  config), caches the answer, and renders it as a sector card in the
  dashboard — only when the sector pack declares it.
- Zero new organs (industrial lens): the server integrates; the sector
  pack declares; the human decides.

## Feasibility — traffic for tourism (the user's question)

| Service | Traffic data? | Cost reality | Verdict |
|---|---|---|---|
| **Google Maps Platform** (Routes/Directions + traffic, Maps JS traffic layer) | ✔ full traffic, routing, ETA | ~$200/month free credit; light Charlevoix usage likely within it | ✅ the practical choice |
| Apple MapKit JS | Maps yes, **public traffic API: no** (traffic is a rendering layer without public data access) | Free tier for maps | ⚠️ maps yes, traffic no |
| TomTom / HERE | ✔ traffic, routing | commercial tiers | Alternative if Google is rejected |
| OpenStreetMap + OSRM/Valhalla | Routing free, **traffic no** (community data) | free | Backup for basic maps |

**Prototype for a hotel/attraction:** the receptionist's screen shows a
"Traffic" card — congestion on the main routes to the establishment with
ETA, so guests are advised before departure ("route 138 works, route 362
blocked — allow 40 minutes"). The owner stops paying: reception minutes
per guest, complaints, and missed arrivals.

## The matrix — one external technology per sector

| Sector | External technology | What the owner stops paying |
|---|---|---|
| Tourisme & hôtellerie | Google Maps traffic/routes · weather (Open-Meteo) · Google Places reviews | Reception minutes, complaints, lost bookings |
| Agroalimentaire & terroir | Weather/agronomy alerts · market prices (open data) · traceability logs | Crop losses, underpriced sales, recall costs |
| Commerce & services | Payment links (Interac/Stripe) · Google Business Profile · supplier feeds | Reconciliation hours, missed online visibility |
| Construction & manufacturier | Material prices (open data) · equipment sensors · scheduling | Overpaying materials, downtime |
| Travailleurs autonomes | Google Calendar · QuickBooks/Xero invoicing · video calls | Double-entry, missed appointments |
| Transversal (all) | DeepSeek dual brain (built) · email/SMS · encrypted backups | — |

## The realpolitik rule

Adopt ONE integration per sector, chosen by DEMAND (a client asks), never
by our enthusiasm — and each integration must answer the same question as
every feature: *what does the owner stop paying?* The traffic card for
tourism is the pilot of this pattern.

## Roadmap

1. Extend the sector-pack JSON with an `integrations` declaration.
2. Add the `/api/ext/*` layer (fetch + cache + error surfacing — errors
   are never hidden, per the house philosophy).
3. Build the tourism traffic card (Google Maps Platform, client key in
   the pack).
4. One integration per sector, one sector at a time, demand-led.
