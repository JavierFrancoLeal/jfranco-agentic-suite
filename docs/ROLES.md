# Roles — one universal flow for every person in every sector

The problem: a restaurant has cooks and waitresses; a clinic has nurses and
directors; a school has teachers and principals. The solution must give
**every person the same flow, without exception** — login → language →
identity → their screen — while letting each business call its people
whatever it wants, in its own language.

## The model (borrowed from proven apps)

| App | What we borrowed |
|---|---|
| **GitHub** | Fixed **permission levels** (owner → admin → write → read) + a free **display name** |
| **Slack / Notion** | An identity chip with avatar is **always visible** in the header |
| **Square / Toast (POS)** | A dedicated **kitchen/back-office view** that receives orders |
| **WordPress** | Roles map to **capabilities**, not to names |

## The three permission levels (universal, sector-independent)

| Level | What the person can do | Typical labels |
|---|---|---|
| 🟢 **Field** (`employee`) | LISTEN flow, confirm orders, report, feedback | Mesera, recepcionista, enfermera, maestro, mecánico… |
| 🟡 **Supervisor** (`lead`) | Orders queue with status updates (kitchen!), field reports, feedback | Cocinero, coordinador, gobernanta, jefe de taller… |
| 🔴 **Owner** (`owner`) | Everything: rules, users, usage, sector packs, decisions | Directora, gerente, dueño, director médico, director… |

**The role LABEL is free text** — "Cocinero", "Chef", "طاهٍ" — stored per
user, shown everywhere (header chip, panel identity card). The label is the
business's own word; the LEVEL is what the system checks.

## Why this is the right shape

1. **One flow for everyone, no exceptions** — the same login, language
   pills, identity chip, footer, dark mode, and screen transitions. Only
   the *content* of the screens differs by level.
2. **Sectors add labels, not code** — each sector pack ships
   `suggestedUsers` (e.g. restaurant: Mesera/Cocinero/Gerente). The owner
   adds users with one tap or types their own labels.
3. **The kitchen pattern is universal** — "the person who receives the
   confirmed work" exists in every sector (cocina, recepción, mostrador,
   taller, oficina). It is always the Supervisor level with the orders
   queue.
4. **Scales to enterprise later** — the three levels map cleanly to SSO
   groups when we add Active Directory/Entra (roadmap).

## The flow, verbatim (same for every human)

1. Open the dashboard → choose language → **Log in**.
2. See **your identity chip** (avatar, name, role label, level) top-right.
3. Land on **your screen**: field → START/LISTEN; supervisor → orders
   queue + reports; owner → overview + rules + users + sector.
4. Every screen shares: header identity, dark/sound toggles, logout, and
   the **permanent language pills in the footer**.

No exceptions. A cook in a restaurant and a head nurse in a clinic go
through the exact same steps; only the words change.
