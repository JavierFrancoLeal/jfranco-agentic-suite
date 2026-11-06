# 👁️ Fanal — the J.Franco agentic workflow suite

*The AI works. The human watches, decides, reviews.* 🍁

![banner](assets/banner.svg)

<p align="center">
  <a href="#-super-agent-ready"><img src="https://img.shields.io/badge/Super%20Agent-Ready-4D6BFE?style=for-the-badge" alt="Super Agent Ready"></a>
  <a href="https://www.npmjs.com/package/@javierfrancoleal/workflow-master"><img src="https://img.shields.io/npm/v/@javierfrancoleal/workflow-master?label=npm&style=for-the-badge" alt="npm"></a>
  <a href="https://github.com/JavierFrancoLeal/jfranco-agentic-suite/releases"><img src="https://img.shields.io/github/v/release/JavierFrancoLeal/jfranco-agentic-suite?label=release&style=for-the-badge" alt="release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="MIT"></a>
  <a href="POLITIQUE-CONFIDENTIALITE.md"><img src="https://img.shields.io/badge/confidentialité-Loi%2025-0EA5E9?style=for-the-badge" alt="Politique de confidentialité"></a>
  <a href="#-languages-and-interpretation"><img src="https://img.shields.io/badge/languages-10-7C5CFF?style=for-the-badge" alt="10 languages"></a>
</p>

**The AI that listens, works, proposes, and reports. You verify and decide.**
**Fanal — the governance layer for autonomous agents. Super Agent Ready.**

An open-source suite of plugins for **DeepSeek Harness** that turns AI from a
chatbot into a **trusted coworker**: it listens to real conversations,
splits the work, does the safe part automatically, proposes the rest, and
reports everything — while **you stay in control of every important
decision**.

---

## ⚡ Super Agent Ready

DeepSeek has entered the super-agent era: the open-source
[Super-Agent](https://stocktwits.com/news-articles/markets/equity/deepseek-autonomous-coding-agent-anthropic-ipo-claude-code/cNGekVdR9cy)
launched by the DeepSeek Harness team keeps working autonomously across group
chats, GitHub, and developer tools. Autonomous agents need governance — and
this suite is built exactly for that:

- **Standby listening** — the agent stays on for the whole shift and folds
  every new input into the live workflow, no re-triggering needed.
- **Mission scope** — long autonomous missions run inside an agreed scope
  with an autonomy budget; anything outside the scope is a question.
- **Milestone reports** — accountability reports arrive per milestone, not
  just at the end, and every one is appended to the supervision log.
- **Autonomy grading** — the `autonomy-grader` measures how reliable each
  automatic action really is (A/B/C/D) and proposes more autonomy only with
  evidence.

The result: agents that can work like super agents, under rules you train
and with a record you can audit.

---

## ✨ The promise in your language

- 🇪🇸 La IA que escucha, trabaja, propone y reporta. **Tú verificas y decides.**
- 🇬🇧 The AI that listens, works, proposes, and reports. **You verify and decide.**
- 🇫🇷 L'IA qui écoute, travaille, propose et rend compte. **Vous vérifiez et décidez.**
- 🇩🇪 Die KI, die zuhört, arbeitet, vorschlägt und berichtet. **Sie prüfen und entscheiden.**
- 🇮🇹 L'IA che ascolta, lavora, propone e rendiconta. **Tu verifichi e decidi.**
- 🇵🇹 A IA que escuta, trabalha, propõe e reporta. **Você verifica e decide.**
- 🇨🇳 会聆听、工作、提议和汇报的 AI。**你负责核实与决定。**
- 🇯🇵 聞いて、働き、提案し、報告するAI。**あなたが確認し、決める。**
- 🇰🇷 듣고, 일하고, 제안하고, 보고하는 AI. **당신이 확인하고 결정합니다.**
- 🇸🇦 ذكاء اصطناعي يستمع ويعمل ويقترح ويبلّغ. **أنت تتحقق وتقرر.**

---

## 🔄 The workflow

```
Input (you, a client, a third party, or a device)
   → Detection (AI + human listen and understand together)
   → The AI processes, decides, and proposes
   → You reflect, verify, and decide
   → Output
```

One button, one phrase — **"escucha" / "listen"** — and the AI takes over:
it decodes the conversation, splits it into actions, and builds the workflow.
Ready for the super-agent era: standby listening keeps the flow open for the
whole shift, missions run by milestones with an agreed autonomy budget, and
the autonomy-grader turns proven work into more autonomy.

## 🚦 The traffic light

Every action gets a tier **before** anything happens:

| Tier | Meaning |
|---|---|
| 🟢 GREEN | Automatic — safe, reversible, internal. Done and logged for you to verify. |
| ⚑ SEMI | Semi-automatic — automatic, but flagged for your mandatory verification (e.g. an allergy flag on every dish). |
| 🟡 YELLOW | Proposal — anything irreversible or with accountability (quotes, official figures, commitments). **You decide.** |
| 🔴 RED | Ask — destructive, credentials, money. The AI never acts alone. |

## 🌍 Real-world scenarios

- 🏨 **Hotel reception** — the guest's phone is noted automatically; the room
  change and the check-in are proposed; the key is handed over only after
  your approval.
- 🍽️ **Restaurant** — the order is taken automatically; the allergy flag is
  applied to every dish (⚑); sending it to the kitchen waits for your "yes".
- 🚓 **Police field work** — the ID lookup runs automatically; the legal
  analysis arrives as advice (proposal); anything touching a person's rights
  is always a question. Advisory mode speaks in two short lines through the
  earpiece.
- 🏦 **Bank reception** — contact data noted automatically; loan quotes and
  official rates are proposals that wait for your authorization.

## 🌐 Languages and interpretation

- The wake word works in **10 languages**; the AI always answers in yours.
- The built-in **interpreter** translates conversations in real time: you get
  the other person's meaning in your language, and ready-to-say phrases in
  theirs — without leaving the main workflow.

## 👔 Built for business owners

Every session ends with an **Accountability Report** — what was understood,
what was done automatically, what was proposed, and what you decided. If a
`supervision.md` file exists, every report is appended to it: a living,
immutable record of what the AI did in your company. The built-in
**autonomy-grader** reads that record, grades every automatic action pattern
(A/B/C/D), and proposes tier moves — reliable work earns more autonomy,
errors bring it back. Ask for the **Management Summary** for the one-page
owner report: totals, a per-worker table, sector KPIs, and the top three
improvements.

The **Supervisor** ([supervisor/](supervisor/README.md)) is the owner's
control panel: real logins and roles, live field reports, a feedback queue
that the agent resolves, and the business-rules editor — one account, many
workers (see the [enterprise model](docs/ENTERPRISE.md)).

## 🚀 Quick start

1. Install **DeepSeek Harness**.
2. Run the one-command installer and answer two questions (sector + mode):

   ```sh
   ./install.sh          # macOS / Linux
   ```

   On Windows: right-click `install.ps1` → **Run with PowerShell**.

   The installer installs the six plugins, creates your starter
   `decisions.md` from the sector template, activates the `supervision.md`
   log, and offers to open the Action Panel.

3. Open the [Action Panel](ui/panel.html) — one big button, 10 languages,
   voice dictation — or build the one-click desktop app (Mac/Windows scripts
   in [`ui/`](ui/)).

4. **Install the panel as an app (PWA):** open the hosted panel at
   https://javierfrancoleal.github.io/jfranco-agentic-suite/ui/panel.html and
   use your browser's **Install** action — it gets a Dock/desktop icon,
   remembers your language, and works offline. (The panel is PWA-ready:
   manifest, service worker, and icons ship in [`ui/`](ui/).)

   Manual installation (optional):

   ```
   dsh plugin --profile desktop add /path/to/jfranco-workflow-master
   dsh plugin --profile desktop add /path/to/jfranco-input-detector
   dsh plugin --profile desktop add /path/to/jfranco-decision-router
   dsh plugin --profile desktop add /path/to/jfranco-accountability-auditor
   dsh plugin --profile desktop add /path/to/jfranco-interpreter
   dsh plugin --profile desktop add /path/to/jfranco-autonomy-grader
   ```

## 📦 Distribution

The five organs are published (the five vestigial ones are deprecated and kept in the genome) on **npm** under the `@javierfrancoleal` scope, so a
business can install them by name:

```
dsh plugin --profile desktop add @javierfrancoleal/workflow-master
dsh plugin --profile desktop add @javierfrancoleal/usage-auditor
```

The publisher (`tools/publish.sh`) runs the quality gate before publishing.
The suite is also installable from this repository and from GitHub Pages.

## 📚 Documents

- [Simple usage guide](docs/SIMPLE-USAGE.md) — Siri-like setup, the clue,
  dictation, interpretation.
- [Business playbook](docs/BUSINESS.md) — install, teach, supervise, and learn
  from real life.
- [Enterprise model](docs/ENTERPRISE.md) — one owner account, many workers,
  worker tagging, telemetry, and the feedback loop.
- [Hardware guide](docs/HARDWARE.md) — what the business actually buys: the
  two deployment scenarios (small restaurant, 100+ manufacturer) and what
  they mean for the interface.
- [Sector catalog](docs/SECTOR-CATALOG.md) — where the suite fits across the
  whole economy, with 19 starter decision templates from hotel and
  restaurant to healthcare, legal, accounting, education, non-profits,
  government, and personal use.
- [Restaurant KPIs](docs/kpi-restaurant.md) — example sector KPI file for the
  Management Summary; KPI templates exist for all 19 sectors
  (`docs/kpi-*.md`), plus [customer service](docs/kpi-customerservice.md).
- [Demo playbook](docs/DEMO-PLAYBOOK.md) — from zero to a live demo for a
  customer-service business (SADC-ready), with the bilingual scenario, the
  one-command demo reset, and the follow-up plan.
- [🔥 Knowledge Ledger](docs/KNOWLEDGE-LEDGER.md) — the J.Franco standard for human-AI
  knowledge transfer (manual + teacher organ + forensics organ).
- [Recommended stack](docs/RECOMMENDED-STACK.md) — the standardized hardware
  and software to recommend to every client (brain, tablets, browsers, OS).
- [Super-Agent adaptation](docs/SUPER-AGENT-ADAPTATION.md) — how the suite
  maps to DeepSeek Harness's Router + Worker architecture (triggers,
  watchdog, accept modes, speculative execution).

## 🗺️ Roadmap

Floating in-app button and menu-bar mode · supervisor live dashboard and
token metering · multi-site supervisors (A2A) · always-on wake phrase and
physical buttons · camera and sensor inputs · connectors for specialized
apps (PMS, POS, police databases).

## 🖥️ Supported platforms

The brain (DeepSeek Harness + plugins + Supervisor) runs on **Linux,
Windows, and macOS** (Node ≥24). Workers use the **Action Panel and
dashboard from any device** — including **Android** tablets and phones over
the business WiFi. Full matrix and per-platform setup:
[docs/PLATFORMS.md](docs/PLATFORMS.md).

## 🤝 Open source

**MIT licensed** — free to use, audit, and share. Created by
[J.Franco](AUTHORS.md). Contributions welcome: see
[CONTRIBUTING.md](CONTRIBUTING.md).
