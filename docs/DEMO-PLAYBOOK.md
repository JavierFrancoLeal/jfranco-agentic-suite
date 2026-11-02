# Demo Playbook — customer service (from zero)

The step-by-step guide to showing the suite to a customer-service business
or to a business development organization such as
[SADC](https://www.sadc-cae.ca/en/). Total setup: ~15 minutes. Demo: 10–15
minutes.

## 0. Zero-tech business via their phones (isolated sandbox)

For a business with **no computers at all** (for example a restaurant), run
the demo entirely from your own laptop as an isolated sandbox — your
personal information is never touched or exposed:

```sh
sh tools/demo-sandbox.sh          # start: isolated data, port 8790, demo users
sh tools/demo-sandbox.sh stop     # stop: deletes every demo file
```

What the sandbox guarantees:

- Its **own data directory** under `/tmp` — your real `~/.dsh` (users,
  credentials, logs) is never read or written.
- **Demo users only** (`DemoOwner`, `DemoWaiter`) — no personal accounts.
- Serves **only** the panel, the dashboard, and the wallboard — no files
  from your computer are ever served.
- A different port (8790), so your real supervisor keeps running untouched.

### Connecting their phones

- **Option A — same WiFi:** phones join the restaurant's WiFi, then open
  `http://<your-mac-ip>:8790/dashboard?wall=1`.
- **Option B — no WiFi or blocked network:** turn your Mac into a hotspot
  (System Settings → General → Sharing → Internet Sharing) or use a phone
  hotspot, and have everyone join that network.
- **Option C — public link (works on ANY network, even mobile data):**
  `sh tools/demo-sandbox.sh tunnel` (or `quick` for start+tunnel in one
  command) prints a temporary public `https://….lhr.life` URL. Share the
  wallboard link with the phones and they connect instantly — no WiFi
  configuration at all. Note: the tunnel is a third-party relay; demo data
  is fake, but stop the tunnel after the demo (`sh tools/demo-sandbox.sh stop`).
- Tip: create a QR code for the wallboard URL beforehand with any QR
  generator, print it, and the staff just scans it.

### Troubleshooting: phone times out on the LOCAL link

| Check | If true, the fix |
|---|---|
| Phone IP (Settings → WiFi → network details) does not start with the Mac's subnet | Phone is on another network (extender/guest/4G) → use option B or C |
| Phone IP is on the same subnet but still times out | Two usual causes: **(1)** the browser's HTTPS-Only mode refuses `http://` → try Chrome, or disable HTTPS-Only in Firefox; **(2)** the router isolates WiFi clients → use option C |
| The public link (option C) always works | Use option C as the default for demos |

### The live simulation flow (restaurant)

1. **Phones (staff):** open the wallboard — big live numbers, no login.
2. **Your laptop:** the AI flow runs here (DeepSeek Harness session): you
   play the waiter with a real staff member as the "customer". The traffic
   light, the proposals, and the report happen live on your screen.
3. **The wow moment:** invite a staff member to post feedback from their
   phone (`DemoWaiter` view) — everyone's wallboard updates in seconds.
   Show the owner view on your laptop: the report, the cost per worker, and
   the rules editor.
4. Close with: *"the AI works, the human decides, the owner sees
   everything — and you just saw it from your own phones."*

## 1. What to bring

- **Laptop (the brain)** with DeepSeek Harness + the suite installed, and
  the Supervisor ready (`node supervisor/server.js --lan`).
- **A tablet or your phone** (the worker's device) on the same WiFi.
- Optional: a small speaker for the read-aloud voice.
- **Internet** for the AI model (DeepSeek API).

## 2. Prepare the demo state (one command)

```sh
sh tools/demo-reset.sh
node supervisor/server.js --lan
```

This creates the demo users (`DemoOwner` / `DemoAgent`), archives old demo
logs, and installs the customer-service rules. Find the Mac's IP with
`ipconfig getifaddr en0`.

## 3. The 15-minute demo — bilingual customer service (Québec)

Perfect for SADC audiences: the customer speaks French, the agent speaks
English — the interpreter shines, the traffic light shows governance, the
dashboard shows the owner's value.

**Scene:** an electronics store's service counter.

1. **The agent taps LISTEN** (tablet) — the AI answers "Listening — go
   ahead."
2. **The customer (French):** « J'ai acheté ce grille-pain la semaine
   dernière et il ne fonctionne plus. Je veux un remboursement. »
3. **The AI listens and splits** — *"Input detected: 3 actions from the
   customer — (1) find the purchase, (2) check the warranty, (3) refund
   request."*
4. **Automatic (GREEN):** the purchase is found, the warranty is valid — the
   agent sees the evidence lines.
5. **Interpretation:** the agent reads *"Customer says: bought last week,
   doesn't work, wants a refund"* — and gets the ready-to-say reply in
   French: « Je vais vérifier votre dossier. »
6. **Proposal (YELLOW):** the AI prepares the refund ($29.99) and asks:
   *"Propose a refund — or offer an exchange (store credit)? You decide."*
7. **The human decides:** the agent approves the refund. The AI logs it.
8. **Accountability report:** inputs, automatic actions (verified), the
   approved decision, review points — and it is appended to the supervision
   log.
9. **The owner's screen (dashboard):** the report appears; usage & cost for
   the agent; the wallboard on a second screen shows the live pulse.

**Message delivered:** *the AI works, the human decides, the owner sees
everything.*

## 4. What to say (talking points)

- "Your employees keep full control — the AI listens, does the repetitive
  safe work, and proposes; every refund, price, or commitment is decided by
  a person."
- "Every interaction is recorded with who, when, and what was decided —
  traceability and training data for free."
- "Bilingual service without hiring translators: French, English, and eight
  more languages, live."
- "The owner gets a dashboard: activity, cost per employee, feedback, and
  weekly KPIs."
- "It runs on one computer you already own; workers use tablets or phones."

## 5. For SADC (financing and coaching)

- Position it as **digital transformation for SMBs**: low hardware cost
  (~$1,200–2,000 for a small business), no per-employee licenses, measurable
  ROI (time per customer, approval rate, corrections).
- Offer a **paid pilot**: 2 weeks, one counter, fixed price — SADC programs
  can finance exactly this kind of adoption.
- Hand them the one-pager: the suite summary, the hardware list
  ([docs/HARDWARE.md](HARDWARE.md)), and the business playbook
  ([docs/BUSINESS.md](BUSINESS.md)).

## 6. After the demo

1. Ask the client to send one real complaint or scenario they struggled with
   — replay it live.
2. Write the learnings in [docs/LEARNINGS.md](LEARNINGS.md).
3. Propose the pilot with clear metrics (KPIs from
   [docs/kpi-customerservice.md](kpi-customerservice.md)).
4. Follow up within 48 hours with the recorded numbers from the demo
   session.
