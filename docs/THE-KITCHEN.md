# The kitchen — two worlds, one app (separation + the Studio layer)

*2026-11-03 · J.Franco · The founder's rule: our keys, our API, our tools,
our property — never mixed with the client's business or workflow. Two
sources, two independent ways of working. And one promise: the manager
directs; Franco Vision handles everything behind. One app to learn, not
two.*

## 1. The Day 0–14 flow, explained piece by piece

### Day 0 — Installation (2 h on site)

| Piece | What it physically is | Why it exists |
|---|---|---|
| **The brain computer** | The owner's computer (or a dedicated one) running: the supervisor server (the app's API + dashboard), the DSH runtime with the profile of the 7 organs, and a local agent that talks to the AI | The whole business runs on ONE machine the owner already owns — the data never leaves the building |
| **Workers' tablets/phones** | Existing devices, NOTHING installed: they open a URL or add the PWA to the home screen | Zero hardware cost, zero app-store friction |
| **Kitchen/back-office tablet (optional)** | One extra device on the wall or the counter, wallboard mode | The live board for orders and notices |
| **The API key** | The client's OWN DeepSeek key (their account, their billing), stored in the client-side config — never Franco Vision's key | Separation: our consumption is ours; theirs is theirs |
| **The check** | The 3-screen first run + owner account creation | Proves the brain is alive before training |

### Day 1 — Training by role (90 min)

- **Owner (30 min):** dashboard, register, Z-report, workers, the alerts bar (the "inform + decide" habit).
- **Lead (30 min):** orders, kitchen flow, notifications.
- **Team (30 min):** the panel, dictation, START/STOP.
- Afterwards the app trains itself: 10 languages, guided screens, the version badge. The training is a ritual, not a course.

### Days 2–14 — Accompaniment (the pilot)

- 1 h/week of honest feedback (test – feedback – adjust), one manager.
- The custom automations are delivered REMOTELY — zero install at the site.

## 2. The two worlds (the separation rule)

```
FRANCO VISION'S WORLD (ours)              THE CLIENT'S WORLD (theirs)
────────────────────────────────          ────────────────────────────────
the suite repo · the organs' code         the brain computer (supervisor)
our demo (127.0.0.1:8790)                 THEIR data (register, orders,
our DeepSeek key · our Google key         feedback, shift log — on disk)
our dev loop (check.sh, sync-all)         THEIR DeepSeek key, THEIR Maps key
the fire log (anonymized lessons)         their wallboard, their workers
```

- **Keys never mix:** the client's brain runs with the CLIENT's keys from
  day one. Franco Vision's keys exist only in Franco Vision's demo and in
  Franco Vision's own kitchen. The pilot does NOT lend our key: the client
  creates their own (one onboarding step, worth the boundary).
- **Data never mixes:** client data stays in the client's DATA_DIR. The
  only bridge is the EL FUEGO discipline — anonymized lessons and the
  agreed case study, with written consent (the pilot agreement already
  says so).
- **Two ways of working:** our way (develop → gate → batch-publish) and
  their way (open → work → decide → close). The product is the only
  interface between them.

## 3. The dilemma — one app or two systems? (the Studio layer)

The promise: "the manager directs; Franco Vision handles everything
behind." Two trainings in two systems would break it. The solution is
ONE app with an INVISIBLE kitchen:

### The Studio — a "Demandes" tab inside Le Veilleux

The owner (or lead) opens the Studio, picks a task type — publication,
courriel, devis, offre d'emploi, agenda, réseaux sociaux — describes it
in one sentence, and submits. Nothing else to learn.

### Two queues behind the same tab (and the keys stay separate)

| Queue | Who drafts | Whose key | For what |
|---|---|---|---|
| **Simple** (templates + one-shot AI) | The client's own brain (dual-brain queue) | The CLIENT's key | Regular drafts the app can produce instantly |
| **Managed** (complex mandates) | Franco Vision's kitchen, remotely (our DSH + our organs) | OUR key, our side | Custom work — the result returns to the app for the human's approval |

The human reviews and approves EVERYTHING in the app — one place, one
training, one pyramid (data in, human at the top).

### Verdict

- **Viable:** yes — the supervisor already runs queues (deep, inbox); the
  Studio is a new TAB and a tasks queue, not a new organ (industrial
  lens: the organs already draft; the server already routes).
- **Efficient:** yes — the 6 "service" façons become menu items in the
  same app; the client never opens DSH; DSH is the kitchen Franco Vision
  wears behind the counter.
- **Phased:** Stage 1 — the Studio tab + simple queue (client key).
  Stage 2 — the managed queue (our key, remote kitchen) for the pilot's
  custom mandates.

## 4. The principle

> One app to learn, one place to decide, two keys that never touch, two
> worlds that only meet through the product — and a kitchen the client
> never has to enter.
