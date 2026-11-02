# Client onboarding — your first client, step by step

You arrive at the client's computer with DeepSeek Harness installed. What
next? This runbook. Target time: **under 45 minutes** for the whole thing.

## 0. Before you arrive (your kit)

- [ ] Your laptop with this repository (or `npm i -g @javierfrancoleal/dsh-supervisor`).
- [ ] The client's **DeepSeek API key** (they create it at
  platform.deepseek.com — one key per business; the business pays usage).
- [ ] The hardware checklist from [RECOMMENDED-STACK.md](RECOMMENDED-STACK.md).

## 1. On the client's computer (10 min)

1. Install **DeepSeek Harness** (desktop app or npm) and **Node ≥ 24**.
2. Copy the suite, or install the supervisor from npm:
   ```sh
   npm install -g @javierfrancoleal/dsh-supervisor
   ```
3. Create the team — one line per person, with THEIR role labels:
   ```sh
   jfranco-supervisor init \
     --owner Maria --password s3cret --owner-label "Directora" \
     --employee Ana --employee-password pw2 --employee-label "Mesera" \
     --lead Luis --lead-password pw3 --lead-label "Cocinero"
   ```
   (Owner = the boss; Lead = the person who receives the confirmed work
   (kitchen/reception); Employee = everyone in the field. Add more later
   from the dashboard.)
4. Choose the sector pack: `cp <suite>/docs/sector-packs/restaurant.json
   ~/.dsh/supervisor-data/sector.json` (hotel, clinic, pharmacy… or pick it
   later in the dashboard → Sector tab).

## 2. Turn the brain on (5 min)

1. Set the client's API key once:
   ```sh
   echo 'export DEEPSEEK_API_KEY=sk-SU_CLAVE' >> ~/.zshrc && source ~/.zshrc
   ```
2. Start the supervisor:
   ```sh
   jfranco-supervisor --lan --https
   ```
   (For the owner's remote access, finish [TLS-PROD.md](TLS-PROD.md) with a
   real domain — or start with the LAN only.)
3. Activate the always-connected AI:
   ```sh
   sh <suite>/tools/activate-ai.sh
   ```

## 3. The workers' devices (10 min)

1. Connect the tablets/phones to the business WiFi.
2. Open `http://<computer-ip>:8790/dashboard`, choose the language, and
   **log each person in with their own account**.
3. Add the dashboard/panel to the Home screen (it is a PWA).

## 4. First real session + rules (10 min)

1. One real conversation with the traffic light visible.
2. Review the first report together; edit the **Rules** with the owner so
   the tiers match their reality.
3. Show the owner: Usage & cost, Orders, and the Sector tab.

## 5. The ongoing rhythm (sell this!)

| Cadence | Who | What |
|---|---|---|
| Every shift | Workers | START → speak → confirm → report |
| Daily | Lead | Orders queue + reports |
| Weekly | Owner | `/audit` with the AI: improvements + marketing intelligence |
| Monthly | You | Check telemetry, propose rule moves, upsell |

## What you never do

- Never leave your own credentials or keys on the client's machine.
- Never promise full autonomy: the human always decides (that's the value).
- Never change rules silently: every move is an owner-approved proposal.
