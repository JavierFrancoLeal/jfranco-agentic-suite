# 🎙️ J.Franco Agentic Workflow Suite

![banner](assets/banner.svg)

<p align="center">
  <a href="#-super-agent-ready"><img src="https://img.shields.io/badge/Super%20Agent-Ready-4D6BFE?style=for-the-badge" alt="Super Agent Ready"></a>
  <a href="https://github.com/JavierFrancoLeal/jfranco-agentic-suite/releases"><img src="https://img.shields.io/github/v/release/JavierFrancoLeal/jfranco-agentic-suite?label=release&style=for-the-badge" alt="release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="MIT"></a>
  <a href="#-languages-and-interpretation"><img src="https://img.shields.io/badge/languages-10-7C5CFF?style=for-the-badge" alt="10 languages"></a>
</p>

**The AI that listens, works, proposes, and reports. You verify and decide.**
**Super Agent Ready — the governance layer for autonomous agents.**

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
improvements. One account, many workers: see the
[enterprise model](docs/ENTERPRISE.md).

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

## 📚 Documents

- [Simple usage guide](docs/SIMPLE-USAGE.md) — Siri-like setup, the clue,
  dictation, interpretation.
- [Business playbook](docs/BUSINESS.md) — install, teach, supervise, and learn
  from real life.
- [Enterprise model](docs/ENTERPRISE.md) — one owner account, many workers,
  worker tagging, telemetry, and the feedback loop.
- [Sector catalog](docs/SECTOR-CATALOG.md) — where the suite fits across the
  whole economy, with 19 starter decision templates from hotel and
  restaurant to healthcare, legal, accounting, education, non-profits,
  government, and personal use.
- [Restaurant KPIs](docs/kpi-restaurant.md) — example sector KPI file for the
  Management Summary.

## 🗺️ Roadmap

Floating in-app button and menu-bar mode · `supervisor` dashboard for owners
(the `autonomy-grader` already delivers the trust grades behind it) ·
always-on wake phrase and physical buttons · camera and sensor inputs ·
connectors for specialized apps (PMS, POS, police databases).

## 🤝 Open source

**MIT licensed** — free to use, audit, and share. Created by
[J.Franco](AUTHORS.md). Contributions welcome: see
[CONTRIBUTING.md](CONTRIBUTING.md).
