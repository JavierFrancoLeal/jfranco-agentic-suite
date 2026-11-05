# MESH — the N-node architecture (MRC, villes, government)

*How the Trasunto business system scales with DeepSeek Harness pieces.
One sovereign agentic orchestration layer per organism; one console for
Trasunto. Nothing is re-invented: every piece below is a DSH concept
re-used for the product.*

## The shape

```
TRASUNTO CONSOLE (the guardian of the flow)
 ├── Node: MRC de Charlevoix        → its own silo (key, data, sector pack)
 ├── Node: MRC de Charlevoix-Est    → its own silo
 ├── Node: Ville de Baie-Saint-Paul → its own silo
 ├── Node: organisme public X       → its own silo (Loi 25 by design)
 └── Node: PME / travailleur autonome → the same shape, smaller
```

Every node = one Fanal install = one information silo = one client-owned
key. Trasunto's console only sees HEALTH (the nodes registry), never data.

## The DSH pieces we re-use (already ours)

| DSH concept | In the mesh |
|---|---|
| Profiles (isolated configs) | One node profile per organism (the /api/nodes registry) |
| Bundles / plugins | Sector and domain packs as installable bundles (restaurant, hotel, tourism, municipal, health…) |
| Skills | Domain automations per node (the organs scaled: an audit per node, a decision-router per node) |
| Patch layers (cordis.patch.yml) | Policy per organism: Loi 25 rules, LCOM thresholds, budget caps — as patch layers over the standard Fanal |
| Provider abstraction | Sovereignty: each node points to ITS provider/key (clientKey already) |
| The doc factory | Reporting per organism (reports, minutes, Z-records) via docfactory |
| Compás | The optimization audit per platform before each deployment |

## The rules of the mesh

1. One node = one world. No cross-node data flow without the owner's
   explicit decision.
2. Trasunto holds keys to NOTHING. Health only, with consent.
3. The same traffic light in every node: GREEN logs, SEMI verifies,
   YELLOW proposes, RED asks.
4. Each node can change key, provider, or leave the mesh at any moment —
   the exit guarantee is part of the product.
