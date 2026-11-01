# 🎙️ J.Franco Agentic Workflow Suite

![banner](assets/banner.svg)

**The AI that listens, works, proposes, and reports. You verify and decide.**

An open-source suite of plugins for **DeepSeek Harness** that turns AI from a
chatbot into a **trusted coworker**: it listens to real conversations,
splits the work, does the safe part automatically, proposes the rest, and
reports everything — while **you stay in control of every important
decision**.

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
immutable record of what the AI did in your company. Owners supervise the
work, adjust the rules, and measure the impact.

## 🚀 Quick start

1. Install **DeepSeek Harness**.
2. Add the five plugins (see [install instructions](docs/SIMPLE-USAGE.md)):

   ```
   dsh plugin --profile desktop add /path/to/jfranco-workflow-master
   dsh plugin --profile desktop add /path/to/jfranco-input-detector
   dsh plugin --profile desktop add /path/to/jfranco-decision-router
   dsh plugin --profile desktop add /path/to/jfranco-accountability-auditor
   dsh plugin --profile desktop add /path/to/jfranco-interpreter
   ```

3. Open the [Action Panel](ui/panel.html) — one big button, 10 languages,
   voice dictation — or build the one-click desktop app (Mac/Windows scripts
   in [`ui/`](ui/)).

## 📚 Documents

- [Simple usage guide](docs/SIMPLE-USAGE.md) — Siri-like setup, the clue,
  dictation, interpretation.
- [Business playbook](docs/BUSINESS.md) — install, teach, supervise, and learn
  from real life.
- [Simulation record](docs/SIMULACION.md) — the three field scenarios.
- Decision templates: [hotel](docs/decisions-hotel.md) ·
  [restaurant](docs/decisions-restaurant.md) ·
  [police](docs/decisions-police.md).

## 🗺️ Roadmap

Floating in-app button and menu-bar mode · `supervisor` dashboard for owners ·
always-on wake phrase and physical buttons · camera and sensor inputs ·
connectors for specialized apps (PMS, POS, police databases).

## 🤝 Open source

**MIT licensed** — free to use, audit, and share. Created by
[J.Franco](AUTHORS.md). Contributions welcome: see
[CONTRIBUTING.md](CONTRIBUTING.md).
