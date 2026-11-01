# J.Franco Agentic Workflow Suite

DeepSeek Harness plugins that turn the chatbot-era workflow into an
agent-era workflow.

## The workflow

| Era | Flow |
|---|---|
| Chatbot | `Input + Human + Chatbot + Human verification → Output` |
| **Agent (this suite)** | `Input (user, client, or third party) → Detection (AI + human) → AI processes, decides, and proposes → Human reflects, verifies, and decides → Output` |

## The plugins

| # | Plugin | Stage | Skill |
|---|---|---|---|
| 0 | [`jfranco-workflow-master`](jfranco-workflow-master/README.md) | Trigger / listening mode (`/listen`, any language) | `workflow-master` |
| 1 | [`jfranco-input-detector`](jfranco-input-detector/README.md) | Detection | `input-detector` |
| 2 | [`jfranco-decision-router`](jfranco-decision-router/README.md) | Processing & pre-trained decisions | `decision-router` |
| 3 | [`jfranco-accountability-auditor`](jfranco-accountability-auditor/README.md) | Reflection & Verification | `accountability-auditor` |
| 4 | [`jfranco-interpreter`](jfranco-interpreter/README.md) | Real-time translation & interpretation | `interpreter` |

## The canonical example: bank advisor at reception

A bank advisor welcomes a client. The advisor taps `/listen` — the clue — and
the client gives her phone number, asks for a loan quote, and asks today's
mortgage rate.

1. **Listening** — the agent confirms "Listening — go ahead" and captures the
   whole conversation without acting, attributing every request to its source.
2. **Detection** — the agent splits the conversation into 3 actions: note the
   phone number, prepare the loan quote, answer the mortgage rate.
3. **Processing** — the phone number is GREEN: noted automatically in the
   client app and logged. The loan quote is YELLOW: a proposal that commits
   the bank, waiting for the advisor's authorization. The rate is YELLOW as an
   official answer, proposed with its source.
4. **Reflection & Verification** — the report shows the automatic action for
   the advisor to VERIFY (was the number noted in the right app?) and the
   proposals for the advisor to DECIDE.
5. **Output** — final only after the advisor's decision.

## Author

Created by **J.Franco** — see [AUTHORS.md](AUTHORS.md).

## Install

Each plugin is a DSH bundle installed from a local path:

```sh
dsh plugin --profile desktop add /absolute/path/to/jfranco-workflow-master
dsh plugin --profile desktop add /absolute/path/to/jfranco-input-detector
dsh plugin --profile desktop add /absolute/path/to/jfranco-decision-router
dsh plugin --profile desktop add /absolute/path/to/jfranco-accountability-auditor
```

Then restart the app (or apply the resolution restart from the plugin
manager) and enable the three plugins in **Plugins**.

## Training

- **Detection:** correct any classification the agent proposes (source,
  expectation, or class); your correction becomes authoritative.
- **Decisions:** edit `decisions.md` (workspace root, `.dsh/decisions.md`, or
  `~/.dsh/decisions.md`) to re-tier actions. Your file replaces the defaults.
  The agent processes and proposes; you decide.
- **Accountability:** before each final output the agent hands you a report
  stating what you need to decide (approve / adjust / reject). Your decision
  is what makes the output final.

## Documents

- [Simple usage guide (Siri-like)](docs/GUIA-USO-SIMPLE.md) — background
  running, the button, dictation, and the clue in any language.
- [Simulation record](docs/SIMULACION.md) — the verified clue, the three
  field scenarios, and the gaps and roadmap.
- Domain policy templates, ready to copy into `decisions.md`:
  [hotel](docs/decisions-hotel.md) · [restaurant](docs/decisions-restaurant.md)
  · [police](docs/decisions-police.md).

## Languages

Every plugin ships display metadata in English, Spanish, French, German,
Italian, Portuguese, Chinese, Japanese, Korean, and Arabic. The wake word
works in any language, and the agent always answers in the language you use.
The `interpreter` plugin covers conversations between speakers of different
languages.

## The action layer

Two built access points make the suite one-button friendly:

- [Action Panel](ui/panel.html) — a single big LISTEN/DICTATE button with a
  10-language switcher, voice dictation, read-aloud, and copy-to-DSH. Works
  in any browser, on Mac and Windows. Sub-features (interpretation,
  lookups…) are activated by speaking, inside the flow — the input analysis
  decides the workflow.
- [DSH Asistente](ui/DSH-Asistente.applescript) (Mac) and
  [DSH-Asistente.ps1](ui/DSH-Asistente.ps1) (Windows) — one-button launchers
  that run the five plugins autonomously through the headless `campo`
  profile (no DSH window needed) and open the result.

Setup instructions live in the [simple usage guide](docs/GUIA-USO-SIMPLE.md).
The business, teaching, and supervision playbook lives in
[docs/NEGOCIO.md](docs/NEGOCIO.md).

## Open source

MIT licensed ([LICENSE](LICENSE)), free to use, audit, and share. See
[CONTRIBUTING.md](CONTRIBUTING.md) to contribute. To publish on GitHub:

```sh
# inside this folder
git remote add origin https://github.com/<tu-usuario>/jfranco-agentic-suite.git
git push -u origin main
```

## Roadmap

1. **UI layer** — floating "listen" button inside the app and a menu-bar
   mode (the panel and the assistant apps cover quick access today).
2. **Supervision** — a `supervisor` plugin with a dashboard over the
   `supervision.md` log for business owners (the auditor already appends
   every report to the log today).
3. **Device variants** — always-on wake phrase and physical button (the
   suite's logic is already ready for them).
4. **Sensor inputs** — cameras, glasses, voice/facial analysis; the TRIGGER
   class already routes them, and a future `sensor-observer` plugin can
   produce them.
5. **App connectors** — plugins per specialized application (hotel PMS,
   restaurant POS, police database); the GREEN/YELLOW/RED logic applies
   unchanged.

## License

MIT — each package carries its own LICENSE file.
