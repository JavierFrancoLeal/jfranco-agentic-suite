# ECOSYSTEM-ARCHITECTURE — Apple la maison, Google le plombier, DeepSeek le cerveau

*The three-tier reconciliation: what each party IS, what it carries, and
how Fanal ties them without mixing anything. 2026-11-05.*

## The division of labor (the logical nature)

| Tier | The role | What it carries | Where it lives |
|---|---|---|---|
| 🍎 Apple (the house) | The HOST — the operating system, the machine, the experience | The desktop app, the silo (`~/.dsh`), the on-device Vision OCR, the wizard, the badge | The client's Mac |
| 🔧 Google (the plumber) | The MOTOR of dirty work — mail, sheets, drive, calendar, and Chrome as the visible hand | The client's messages, documents, books and events — inside THEIR Google accounts | Google's services, authorized by the client |
| 🧠 DeepSeek (the brain) | The REASONING — flash drafts cheap, v4-pro thinks deep | The intelligence, paid by the CLIENT's key | The client's own API key |
| 🏛️ Fanal/Trasunto (the conductor) | The GOVERNANCE — the steering wheel between the three | ONLY the traffic light: proposals, decisions, telemetry | The supervisor, in the client's machine |

## The reconciliation (the technical nature)

1. **The hands** — each service gets ONE connector that does the dirty
   work and returns the result: the Chrome hand (browser-cdp.js, for the
   pages without APIs: Facebook, government forms), the Google hand
   (Gmail/Sheets/Docs/Calendar via OAuth on the CLIENT's account), the
   Microsoft hand (Graph, later, same pattern).
2. **The common kitchen** — every hand feeds the SAME Studio: drafts,
   proposals and fills arrive in the SAME decision inbox with the SAME
   semáforo, whoever did the dirty work.
3. **The sovereignty walls** — the OAuth tokens stay in the client's
   keychain, the DeepSeek key stays in the client's silo, the data stays
   in the client's Google account. Trasunto never stores any of it;
   the exit guarantee holds: change key, change provider, any time.

## The plumber slot is a PLUG (Google OR Microsoft OR both)

The tier is interchangeable — the same socket accepts either ecosystem,
or both at once, per client:

| Google (the blue plug) | Microsoft 365 (the purple plug) |
|---|---|
| Gmail API | Graph Mail (Outlook) |
| Google Sheets | Excel (Graph) |
| Google Docs | Word (Graph) |
| Google Drive | OneDrive |
| Google Calendar | Graph Calendar |
| Google Meet | Teams |
| Chrome (the visible hand) | Edge/Chrome (the same CDP hand) |

Nothing else changes: the same hands, the same Studio, the same
semáforo, the same human decision. A client with Gmail plugs the blue
plug; a client with Outlook plugs the purple plug; a client with both
plugs both. Trasunto never chooses a side — the neutrality is the
selling point. The first connector is still built for the FIRST pilot
client that pays for it.

## The one-sentence contract

Apple runs the house, Google carries the pipes, DeepSeek does the
thinking, Fanal holds the wheel — and the owner signs every paper.
"L'IA travaille. L'humain veille, décide, révise."

## The multi-brain bottlenecks and their solutions (2026-11-07)

The bottlenecks of the multi-brain model, and the options:

1. **The supervisor is a single point** — if the process dies, the
   client stops. Options: the Electron watchdog (BUILT — the brain
   rebirth), the standalone watchdog.sh, and for scale: the nodes
   federation (the MESH) where a second machine takes over.
2. **The queue ceiling (4 in flight)** — throughput. Options: raise it
   when the provider is healthy (configurable), or distribute across
   brains: the LOCAL brain takes the fast lane (milliseconds) and the
   cloud takes the deep lane — two lanes, one queue.
3. **No provider health-checks** — the router picks by tier, not by
   health. Option: a health ping per configured brain (every 60 s);
   unhealthy brains are skipped and the failover re-routes (the hot-swap
   already covers the per-task case).
4. **The daily budget is a hard stop** — a client at the limit loses
   the cloud. Option: the local brain never hits the budget — the
   hybrid makes the limit a soft wall (local continues, deep pauses).
5. **One machine per client** — no horizontal scale. Option: the nodes
   registry (BUILT, minimal) grows into the MESH: the kitchen tablet,
   the owner's Mac and the front desk share one organism.

The ladder that solves them all (already wired): LOCAL (instant, free,
never down) → CLOUD CHEAP (flash) → CLOUD DEEP (v4-pro, budget-braked)
→ HUMAN. The ladder IS the antifragility.

## Real-time, finally (2026-11-07)

Real-time translation (the earpiece mode) and live meeting summaries
need LATENCY under a second. The cloud brain (1-3 s per chunk) makes
sentence-level interpretation workable but choppy; the LOCAL brain
answers in milliseconds — with the fast tier on Ollama, the interpreter
becomes genuinely real-time, and the Téléphoniste can answer with
SenseVoice (local STT) + the local brain + the OS voice: the whole
voice loop inside the machine, zero cloud.

## The nature check (2026-11-07)

The model mirrors the nervous system: the spinal cord (the local brain)
handles the reflexes instantly and free; the cortex (the deep cloud)
ascends only for the novel and the hard; the two hemispheres are the
two tiers; and the body never trusts ONE organ — it routes around
damage. We improve on nature in ONE thing: the body cannot hot-swap a
damaged cortex to another provider mid-thought — the router can
(failover). Nature single-vendor; Fanal multi-vendor by design.
