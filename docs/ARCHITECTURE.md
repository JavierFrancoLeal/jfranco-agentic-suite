# Architecture — Le Veilleux, a DeepSeek Harness distribution

**Formal definition:** Le Veilleux is a **distribution of DeepSeek
Harness** — a customized layer that adds the J.Franco agentic workflow
plugins, the supervisor control plane, the universal sector dashboard, and
the desktop app, on top of the DeepSeek Harness runtime and the
**DeepSeek-V4-Pro Max** model.

Like Ubuntu is to Linux: the kernel does the work; the distribution makes
it a product.

## The layers

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 4 · Presentation — Le Veilleux                         │
│   Desktop app (Electron) · Dashboard · Panel · Wallboard     │
│   (10 languages, sector skins, dark mode, PWA)               │
├─────────────────────────────────────────────────────────────┤
│ Layer 3 · Control plane — Le Veilleux Supervisor             │
│   Accounts (RBAC + role labels) · live flow (listen→summary  │
│   →confirm→orders) · telemetry · triage · exports            │
├─────────────────────────────────────────────────────────────┤
│ Layer 2 · The J.Franco customized layer — 8 plugins          │
│   workflow-master · input-detector · decision-router ·       │
│   accountability-auditor · interpreter · autonomy-grader ·   │
│   usage-auditor · triage                                     │
├─────────────────────────────────────────────────────────────┤
│ Layer 1 · Harness — DeepSeek Harness (the runtime)           │
│   Cordis plugin system · profiles · headless agent           │
├─────────────────────────────────────────────────────────────┤
│ Layer 0 · Model — DeepSeek-V4-Pro Max (API)                  │
└─────────────────────────────────────────────────────────────┘
```

## What each layer is responsible for

| Layer | Responsibility | Never does |
|---|---|---|
| 0 Model | Reasoning, language, decoding the conversation | Decides nothing final — proposes |
| 1 Harness | Runs the plugins, the agent loop, the sessions | Business rules |
| 2 Plugins | The workflow philosophy: detect → route → propose → verify → audit → triage | Acts without the human on irreversible steps |
| 3 Supervisor | Who can enter, what is confirmed, what is recorded | Replaces the human decision |
| 4 Presentation | One flow for every person, every sector, 10 languages | Hides errors or decisions |

## The brain contract

"Choosing the brain" means: **Layer 0 + Layer 1** — the model and the
harness. Everything above is Le Veilleux and is always the same.

- The brain is identified by: `provider: deepseek-official` ·
  `model: deepseek-chat` (DeepSeek-V4-Pro Max) · `DEEPSEEK_API_KEY`.
- The brain contract is stored in `~/.dsh/brain.json`:
  `{ "key": "…", "model": "deepseek-chat" }`.

## Installation models (mise en place)

### Model A — today (install DSH, then Le Veilleux)

1. Install DeepSeek Harness (desktop app or npm).
2. Install the Le Veilleux desktop app (double click).
3. First-run wizard: language → owner → sector → **brain key**.
4. The app detects the installed harness, wires the profile, and starts
   the always-connected agent.

Two installs, fully automated wiring. Recommended for clients that already
use DeepSeek Harness.

### Model B — target (one installer = the distribution)

The Le Veilleux installer **bundles the DeepSeek Harness runtime** (as a
distribution bundles its kernel), so a client installs ONE file and the
first-run wizard only asks: language, owner, sector, **and the DeepSeek
key** ("choose your DeepSeek brain"). No terminal, no second install.

STATUS: BUILT. Licenses verified (MIT + BSD-3-Clause, both permit
redistribution with attribution — see LICENSES.md). `tools/build-runtime-pack.sh`
produces the runtime pack; the desktop installer includes it as
extraResources, and the first-run wizard creates the profile and starts the
agent with the bundled runtime. Remaining: code signing (Apple Developer /
Windows) for public distribution.

## Version matrix (the distribution release)

| Le Veilleux | DeepSeek Harness | Plugins | Supervisor |
|---|---|---|---|
| 0.1.0 | ≥ 0.2.1-rc.x | 8 × 1.x | 1.0.x |

A release is formalized as: **Le Veilleux `<version>` = DSH `<version>` +
J.Franco plugins `<versions>` + supervisor `<version>`** — the same way a
Linux distribution pins its kernel and packages.
