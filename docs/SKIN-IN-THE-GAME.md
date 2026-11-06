# SKIN-IN-THE-GAME — the contracts of Trasunto

*The doctrine of aligned skin applied to the business: the phrase, the
actors, the DeepSeek asymmetry, the three principles in our contracts,
and one ethical case study. 2026-11-06.*

## The phrase (the one for the documents)

**Recommended, final:**

> "Notre métier n'est pas de vendre de l'intelligence artificielle :
> nous vendons l'économie de capital humain et des ressources qui
> l'accompagnent — l'attention du propriétaire, le coût des erreurs, les
> ventes perdues par silence, le crédit de réputation — et nous vendons
> le capital technologique et organisationnel de la quatrième révolution
> industrielle : des automatisations installées, une mémoire d'entreprise
> vivante et une constitution co-écrite qui grandissent avec le client.
> La machine exécute ce qui n'a pas de conséquences ; l'humain signe ce
> qui en a. Chaque acteur garde sa peau et ses incitations exactement là
> où sa signature vaut."

*(EN) "Our business is not selling artificial intelligence: we sell the
transfer of WORK without the transfer of RESPONSIBILITY. The machine
does what carries no consequences; the human signs what does. Every
actor keeps their skin and their incentives exactly where their
signature is worth."*

## Does DeepSeek have skin in the game?

Yes — but UPSIDE-ONLY skin. DeepSeek earns when Trasunto and Fanal
succeed (every proposal consumes tokens; adoption = consumption = the
business), so its incentive is aligned with our growth. But it shares
NO downside: if the pilot fails, DeepSeek loses nothing — it simply
stops earning. Conclusion for the contracts: DeepSeek is an aligned but
ASYMMETRIC partner; we price per usage (the natural alignment), we
never treat it as a risk-sharing partner, and the client's key stays
the client's (the exit guarantee keeps the power local).

## The three principles, applied

### 1. Eliminate asymmetry — stand under your own bridge

- Trasunto runs on Fanal: the founder's own business is the first
  customer (dogfooding). The pilot's first flows operate on the
  founder's own data before any client's.
- The rule for every automation we sell: we operate it side by side
  with the client for the first week — the designer rides the first
  trucks.

### 2. Symmetry in contracts — punish as strongly as we reward

- **The pilot accord**: the fee is tied to the MEASURED KPI (human time
  saved). If the corrective-time metric exceeds the threshold, the
  month is credited or refunded — Trasunto eats the failure as
  strongly as it earns the success.
- **The SADC agreement**: the ask ($25k loan + $20k personal) pairs
  public money with the founder's personal guarantee — the founder's
  downside matches the fund's risk.
- **Future partners and key employees**: equity with clawback clauses —
  bonuses return if the results they rewarded collapse later.

### 3. Decentralization — local ownership, local care

- The constitution, the memory, the key and the data live in the
  CLIENT's silo: the client owns the rules and the records, so the
  client owns the responsibility for them — nobody can say "it was
  everyone's".
- Each sector pack is tuned locally with the client; the organs grade
  locally; Trasunto holds only the governance and the method.

## The ethical case study — the discount dilemma

A late-night reservation asks for a discount to book immediately. The
Constitution allows discounts down to the minimum operational price.
Fanal knows the margin, the calendar and the rule — and PROPOSES a code
at exactly the minimum.

Who eats a wrong minimum price? The machine knows the numbers; the
owner carries the margin. The design resolves the dilemma: the minimum
price is the owner's WRITTEN SKIN (his rule, in his constitution), and
the confirmation is his SIGNATURE — the machine never invents a price
below the written floor, and never applies the code without the human's
finger. Knowledge in the machine, skin in the owner, signature in the
record. Asymmetry eliminated by design.

## The anti-fragile brain (change brains, never change Fanal)

The router lives in the client's silo (`providers.json`): every tier
(fast/deep) points to a provider, a base URL and a model — cloud or
LOCAL (open models via Ollama at http://localhost:11434/v1). The
dashboard card "Changer de cerveau" switches it without touching code.
Scenarios covered by design: Canada bans a foreign model → point the
tier to a local open model; a US provider stops serving Canada → point
it elsewhere; the client's budget changes → a cheaper model per tier.
The constitution says which brain each tier uses — sovereignty of the
key AND of the brain.

## The extreme-conditions configurator

The minimum operational price is the LAST option, and OFFERING it is a
human decision by constitution: the client configures in Fanal the
extreme conditions (e.g. "only for a same-day firm booking, empty
room, loyal client, max twice a week"). Fanal may PROPOSE the option to
the HUMAN (YELLOW) when the conditions are met; only the human offers
it to the final client. The machine knows the numbers; the owner keeps
the margin; the signature stays in the record.

## The one-line contract

The work transfers to the machine; the responsibility never does. Skin
follows the signature — from the founder's guarantee to Jean's poutine.

## Institutionalizing the asset (the plugin answer)

For Trasunto, Fanal and every future scale-up (MRCs, municipalities,
Gouvernement du Québec, Canada): the Constitution must be a FIRST-CLASS
ORGAN, not a file inside one app. The institutional standard:

1. **The schema** — constitution.json is the published contract: the
   fields, the tiers, the version number. Every organism that runs
   Fanal reads and writes the SAME schema.
2. **The organ** — a dedicated plugin (`@javierfrancoleal/constitution`,
   next to decision-router and accountability-auditor) that loads the
   constitution, exposes it to every skill, and validates edits.
3. **The versioned record** — every save bumps the version with the
   timestamp (already live: v1.0.100); the export endpoint
   (/api/constitution/export) downloads the document. A public body can
   publish its constitution — transparency as the selling point.
4. **The install-time step** — the 7-step wizard is now 8 steps: the
   house rules are written at installation (step 5), then refined in
   the new ⚙️ Réglages section (Constitution · Mémoire · Cerveau ·
   Zone dangereuse), modeled after Claude/Apple/Microsoft settings but
   programmed like an open-source product with universal adoption.
5. **The doctrine for every future idea** — any new Fanal module, any
   MRC node, any municipal deployment inherits the same organ: the
   constitution travels with the organism, not with the app.
