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

## The one-sentence contract

Apple runs the house, Google carries the pipes, DeepSeek does the
thinking, Fanal holds the wheel — and the owner signs every paper.
"L'IA travaille. L'humain veille, décide, révise."
