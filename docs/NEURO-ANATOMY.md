# Neuro-anatomy of Fanal — the human body as the blueprint

*The best software developer is nature.* This document maps the human
body's systems to software engineering, shows which plugins exist, and
names the organs the suite still lacks.

## The mapping: body system → software concept → plugin

| Body system | What it does in the body | Software equivalent | Fanal plugin |
|---|---|---|---|
| 👂 Ears + reticular activation | Wake on sound; filter what deserves attention | Event triggers, listening mode | `workflow-master` |
| 🧠 Sensory cortex + thalamus | Route every input to the right region | Input routing, splitting, classification | `input-detector` |
| 🗣️ Wernicke + Broca | Language: understand + produce | Translation, interpretation | `interpreter` |
| ⚡ Spinal reflexes → basal ganglia → prefrontal | Reflex → habit → deliberation | Tiered autonomy (auto → propose → ask) | `decision-router` |
| 🪞 Default-mode network | Self-reflection before acting | Pre-output audit, accountability | `accountability-auditor` |
| 🔀 Hemispheres + corpus callosum | Crossed control; one side never checks itself | Two-mode thinking + crossed verification | `cortex` |
| 📈 Synaptic plasticity | Strengthen what works, weaken what fails | Grades, tier moves, autonomy levels | `autonomy-grader` |
| 💤 Sleep consolidation | Replay the day, compress, extract lessons | Log review, audits, patterns | `usage-auditor` |
| 🛡️ Immune prioritization | Classify threats, tolerate, remember | Bug classification, Beta acceptance | `triage` |
| 🧬 Genome + epigenome | Fixed genes; context decides what expresses | Fixed rules; sector context decides behavior | decisions.md = genome · sector packs = epigenome |

## The organs Fanal is still missing

### 1. 🫁 `homeostasis` — the autonomic nervous system (HIGHEST priority)

The body keeps temperature, glucose and pressure stable WITHOUT asking the
brain. Software must do the same: token budgets, rate limits, health
checks, retries, graceful degradation when the brain (API) is slow or
down. Today the suite has no self-regulation layer — a burst of requests
just costs money.

### 2. ✋ `hands` — the motor cortex (effectors)

A brain that cannot act is a philosopher, not a worker. The suite proposes
actions but has no dedicated effector: executing GREEN actions safely,
with guardrails, dry-runs and rollback (files, emails, commands,
external APIs). The decision-router decides WHAT; hands executes HOW.

### 3. 🧫 `immune` — the full immune system (adaptive defense)

Triage classifies bugs; the immune system does more: it detects intrusions
(anomalous inputs, injection attempts), quarantines them, and escalates
the alarm louder the worse the damage (the pain system). The suite
sanitizes (skin) but has no antibody layer.

### 4. 🧬 `evolution` — reproduction + natural selection (epigenetics made real)

The user's insight: evolution + epigenetics. The genome (decisions.md)
does not change per client — what changes is EXPRESSION (sector packs =
epigenetic tags: same DNA, different context). The missing piece is
**variation + selection**: generate candidate rule-sets (mutations), let
the autonomy-grader score them (fitness), keep the winners, discard the
rest. That is a genetic algorithm over the workflow itself — the plugin
that lets the product EVOLVE.

### 5. 🦠 Microbiome — not a plugin, a strategy

The body hosts other organisms that digest and defend for it. The
software equivalent: a **plugin marketplace** — third-party organs living
inside Fanal. The architecture already supports it (npm + Cordis
plugins).

## Epigenetics, explained as software

- **Genome** = decisions.md: the rules. Identical in every business.
- **Epigenome** = the sector pack + the client's supervision history:
  which rules EXPRESS in this context. A clinic and a restaurant share
  DNA; their epigenetics differ.
- **Environment** = the field data (feedback, usage): the environment
  modifies expression without touching the genome — exactly like
  methylation responding to diet and stress.
- **Inheritance** = a new business can inherit the "epigenetic memory" of
  a proven similar business (templates, trained rules) — transgenerational
  wisdom without rewriting DNA.

## Recommendation

Build order: `homeostasis` → `hands` → `immune` → `evolution`. Together
they complete the organism: regulate (homeostasis), act (hands), defend
(immune), and evolve (evolution) — around the existing senses, brain,
conscience, and memory.
