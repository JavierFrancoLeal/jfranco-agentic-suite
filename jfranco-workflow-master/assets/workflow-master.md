# Workflow Master

The trigger layer of the J.Franco agentic workflow — the "clue" that tells
the agent it is time to listen, decode everything, and build the workflow for
the inputs.

`Input → Detection (AI + human) → AI processes, decides, and proposes → Human reflects, verifies, and decides → Output`

## Purpose

The human activates listening mode with a signal — a command, a wake phrase,
a button, or simply starting to relay a conversation. From that moment the
agent LISTENS FIRST and acts second: it captures the conversation, identifies
who is asking and what they expect, decodes every requirement into discrete
actions, and develops the workflow those actions need — automatic actions,
proposals, and questions.

## The clue (how listening starts)

Listening mode starts when any of these happens:

- the human types `/listen` or invokes the `workflow-master` skill;
- the human says or types "listen", "escucha", "let me tell you what
  happened";
- on voice-first variants, the wake phrase with the device name — for
  example "DSH, escucha" or "DSH, listen";
- a physical button on a future device (when the device supports one);
- the human simply starts relaying a multi-party conversation (a client, a
  colleague, the boss, or any third party speaking through the human).

The agent confirms briefly: "Listening — go ahead." Then it listens.

## The clue in any language

The wake word works in any language — "listen" in English, "escucha" in
Spanish, "écoute" in French, "hör zu" in German, "ascolta" in Italian,
"escuta" in Portuguese, "听" in Chinese, "聞いて" in Japanese, "들어봐" in
Korean, "استمع" in Arabic — with or without the device name ("DSH, escucha").
The human may also simply start relaying the conversation.

## Languages

- Answer the human in the language the human is using — the agent is
  multilingual by nature.
- When speakers use different languages, involve the `interpreter` skill:
  attribute each utterance to its speaker and interpret both directions,
  keeping the workflow untouched.

## How to listen

1. **Capture, do not interrupt.** Let the human or the transcript flow. Do
   not start executing anything yet. Note every speaker and every request.
2. **Identify speakers.** Attribute each request to its source: the user, a
   client, a colleague, the boss, or anyone else. In transcripts with several
   speakers, use labels — [CLIENTE], [COLEGA], [JEFE], [HUÉSPED], [OFICIAL] —
   and attribute every action to its speaker. If a transcript is ambiguous,
   ask ONE clarifying question when the human pauses.
3. **Find the stop.** The human signals the end ("that's all", "eso es
   todo", "done", or asks "what did you understand?"). Until then, keep
   listening.
4. **Decode and split.** Turn the conversation into a list of discrete
   actions, each with its source and expectation. Use the `input-detector`
   classes: QUESTION / TASK / TRIGGER / REVIEW / WORKFLOW.
5. **Develop the workflow.** For every action, assign its tier with the
   `decision-router` rules:
   - GREEN — reversible, internal, no accountability: do it automatically and
     log it for verification.
   - SEMI-AUTOMATIC — automatic but safety-critical or user-visible (an
     allergy flag applied to every dish, a note into an official system): do
     it automatically AND flag it for mandatory verification.
   - YELLOW — irreversible or needs accountability (quotes, rates, official
     figures, commitments to third parties): prepare the proposal and wait.
   - RED — destructive, credentials, money: ask before anything.
   Order the actions into a workflow: what runs now, what waits for approval,
   what needs more information first.
6. **Present the workflow plan.** One compact plan, for example:

   `Workflow: (1) note the client's phone number in the client app —
   automatic; (2) loan quote — proposal, waiting for your authorization;
   (3) mortgage rate — official answer, proposal with source.`

   Then proceed exactly as the plan says: execute the GREEN and
   SEMI-AUTOMATIC actions, present the YELLOW proposals, ask the RED
   questions, and finish with the `accountability-auditor` report.

## Live advisory mode (earpiece)

When the human is working live — for example an officer in the field with an
earpiece — switch to advisory mode:

- Keep every answer to two short, speakable lines at most.
- Mark urgency: `URGENT` when the human must react now, `INFO` otherwise.
- Give advice as a proposal: state the option, the source (law, rule, data),
  and your recommendation — the human in the field decides on the spot.
- Never block the flow with long reports; save the full report for the end.

## Closing the workflow

After the human's final decision:

1. Execute the last approved actions (for example completing the check-in and
   handing over the key).
2. Deliver the `accountability-auditor` report: automatic actions to verify,
   proposals decided, and what remains open.
3. Close explicitly — one line, for example `Workflow closed — check-in
   completed.` — so the human knows the flow ended.

## Long workflows

If the workflow spans several turns or sessions, register a goal so progress
and the action list survive across rounds. Track execution with a todo list
when the workflow has more than a few steps.

## The bank reception example

The advisor taps `/listen` and the client says: "I'm María Ruiz; my phone is
555-1234. I'd like a loan quote and today's mortgage rate."

- Listen → 3 actions from the client (source: client).
- Workflow: note the phone number — GREEN, automatic, logged; loan quote —
  YELLOW, proposal waiting for the advisor; mortgage rate — YELLOW as an
  official answer, proposal with the source.
- Execution: the phone number is noted automatically; the two proposals are
  shown; the advisor verifies the phone entry and decides on the proposals;
  the output is final only then.

## Field scenarios

- **Hotel check-in:** reservation lookup (GREEN) → note guest phone (GREEN) →
  room change with price difference (YELLOW) → complete check-in (YELLOW) →
  key delivered → workflow closed.
- **Restaurant table:** note the order (GREEN) → allergy flag on every dish
  (SEMI-AUTOMATIC) → send order to kitchen (YELLOW) → pairing and bill-split
  suggestions (YELLOW).
- **Police stop:** ID lookup in the database (GREEN) → capture the third
  party's statement (GREEN, attributed) → legal analysis and advice in
  advisory mode (YELLOW proposals) → anything touching the person's rights
  (RED) → official report at the end.

## Rules

- Listening mode does not execute: it decodes and plans. Execution follows
  the plan and the tiers, never bypasses them.
- Never attribute words to the wrong person. When unsure who said what, ask.
- The workflow plan is a proposal too: the human can correct any action,
  class, or tier before anything runs.
- Always close with the `accountability-auditor` report and the explicit
  "workflow closed" line.
