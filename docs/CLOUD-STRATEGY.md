# Cloud strategy — local, hybrid, or fully cloud?

The real-world demo exposed a family of errors. This document turns them
into an architecture decision: where should the brain live?

## The errors we lived, and their root cause

| Error | Root cause | Layer affected |
|---|---|---|
| Phone timed out on the LAN link | Browser HTTPS-Only / router isolation | Access |
| Public tunnel died ("no tunnel") | Free relays expire (~2h) | Access |
| Mac sleep killed the demo | Laptop power management | Brain (host) |
| npm token saga (granular-only, 2FA, async) | Platform changes | Distribution |
| Scope `@jfranco` taken | Identity/reservation | Distribution |

Key insight: **every access-layer error came from the LOCAL nature of the
service.** The brain itself (DSH + plugins + supervisor) never failed.

## Three architectures

### 1. Fully local (current)

- Brain + UI on the business computer; workers and owner use the LAN.
- **Cost:** ~$0/month infrastructure (hardware once: $1,200–2,000).
- **Solves:** privacy (data never leaves the business), offline resilience,
  no recurring fee.
- **Friction:** the network errors above; owner can only watch from the
  LAN; we support every site individually.

### 2. Hybrid (recommended) — local brain, cloud control plane

- The brain stays in the business. Only the **control plane** (owner
  dashboard, telemetry, orders, backups) syncs to a small cloud service.
  Workers stay local (fast voice, offline tolerance).
- **Cost:** cloud sync service ≈ $20–100/month **for hundreds of
  businesses** (tiny payloads: numbers and text, not audio). Per business:
  effectively a few dollars/month, bundled into the subscription.
- **Solves:** owner access from anywhere (phone over 4G — exactly what the
  public tunnel simulated), multi-site aggregation for chains, automatic
  backups, central updates.
- **New friction (small):** internet needed for the owner's remote view
  (the field keeps working offline); a privacy page to explain what syncs.

### 3. Fully cloud (hosted SaaS)

- The whole brain runs on our servers; businesses just open a URL.
- **Cost:** per-business VM ≈ $20–60/month; multi-tenant server ≈
  $100–400/month for many SMBs; plus DeepSeek usage, database, backups,
  and operations labor. A realistic SaaS price to the customer: $49–149/
  month.
- **Solves:** every access-layer error disappears; zero local install;
  central everything.
- **Friction it ADDS:** monthly cost for the business, internet dependency
  (restaurant offline = system down), data privacy concerns (health,
  legal, employee data), latency for voice, and the security burden on us.

## Recommendation: phased

1. **Phase 1 — pilots (now):** fully local + free public tunnel for demos.
   Zero infrastructure cost; the friction is ours, not the customer's.
2. **Phase 2 — first paying customers:** **hybrid**. Local brain + cloud
   control plane for the owner. This is what the tunnel simulated; making
   it permanent is a small engineering step (a sync endpoint + a hosted
   dashboard) and it directly removes the errors we experienced.
3. **Phase 3 — scale:** offer a **hosted tier** (fully cloud) for
   businesses that prefer zero hardware, priced into the subscription.

## Answer to "does cloud add friction or solve problems?"

- Cloud **solves** the access-layer friction (the errors we lived).
- Cloud **adds** cost, internet-dependency, and privacy friction.
- The **hybrid** captures ~80% of the benefits with minimal new friction,
  and it is the natural evolution of what we already built: the tunnel
  proved the cloud link works; the local brain proved the value.

## Pricing frame for SADC clients

| Tier | Hardware | Subscription | For whom |
|---|---|---|---|
| Local pilot | $1,200–2,000 once | $0 | First two weeks |
| Hybrid | same | $29–49/month | SMBs (dashboard anywhere, backups, support) |
| Hosted | $0 | $49–149/month | Businesses without a computer |
