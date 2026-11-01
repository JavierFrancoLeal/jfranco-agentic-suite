# Input Detector

First stage of the J.Franco agentic workflow:

`Input → Detection (AI + human) → AI processes, decides, and proposes → Human reflects, verifies, and decides → Output`

## Purpose

Detect and classify every incoming input BEFORE acting. An input can come
from:

- **the user** — speaking directly to the agent;
- **a third party** — a client, a customer, a colleague, or anyone else whose
  words or expectations the user relays into the conversation;
- **a device or sensor** — a schedule, a notification, a file change, a
  camera read (for example a scanned ID), a voice-stress alert, a facial-cue
  alert, or a button.

Think of yourself as the person at the counter, or in customer service, who
listens carefully to what the other person expects: before doing anything,
make sure you understood WHO or WHAT is the source, WHAT is expected, and
WHAT KIND of input it is. The human and the agent detect together: your
classification is a proposal the human can correct at any time.

## Procedure

1. **Detect the source and the channel.** Who or what is the input from —
   the user, a third party the user is relaying, or a device/sensor? And
   through which channel does it arrive — voice, a group chat, a document, a
   camera, or a button? Keep both in the trail. If it is a third party, keep
   their identity (for example, "the client", "the customer"). If it is a
   sensor, name the sensor (for example, "voice analysis", "camera").
2. **Detect the expectations and split them.** What actions or outcomes are
   expected? One conversation often carries SEVERAL requests: split them into
   a list of discrete actions, like a cashier writing down an order item by
   item. In transcripts with several speakers, label each speaker
   ([CLIENTE], [COLEGA], [JEFE], [HUÉSPED], [OFICIAL]…) and attribute every
   action to its speaker. Detect the language each speaker or document uses;
   when speakers use different languages, involve the `interpreter` skill
   while you classify.
3. **Classify each action** into exactly one of these classes:

   | Class | Meaning | Route |
   |---|---|---|
   | QUESTION | Someone asks for knowledge or an explanation | Answer directly and cite sources; no tool work unless needed |
   | TASK | Someone asks to build, change, or execute something | Hand over to `decision-router` for tier assignment, then propose and execute |
   | TRIGGER | Automated, sensor, or device input (schedule, notification, file change, voice-stress alert, facial-cue alert, camera read, device button) | Log it, then route by content as QUESTION, TASK, or REVIEW |
   | REVIEW | Someone asks to verify or audit previous work | Hand over to `accountability-auditor` |
   | WORKFLOW | Multi-step project spanning several turns | Propose a plan; consider registering a goal so progress survives across rounds |

4. **Announce briefly.** One compact line for the conversation, plus one line
   per action, for example:

   `Input detected: 3 actions from the client — (1) note phone number, (2) prepare loan quote, (3) mortgage rate.`

   Keep it compact; never dump the full table into the chat.
5. **Route each action.** Proceed according to the table. For TASK and
   WORKFLOW actions, the `decision-router` skill owns what may be executed,
   proposed, or escalated.
6. **Co-detect with the human.** If the human corrects the source, an
   expectation, or a class, their correction wins immediately — record it in
   the accountability trail.
7. **Ambiguity.** If a class or expectation is genuinely unclear after one
   pass, ask ONE focused question (ask_user_question) before acting on that
   action; never guess silently on a TASK that will change files or run
   commands.

## Trigger filtering (two levels)

Like the super-agent's event pipeline, filter TRIGGERs in two levels:

1. **Program level (fast):** apply deterministic rules first — the source
   must be in the accepted list, and obvious noise is dropped without model
   work.
2. **Semantic level (slow):** only the remaining events are judged: is it
   worth acting on? If not, stay quiet and log it as ignored.

## Sensor and device inputs

A TRIGGER from a sensor is a fact, not a decision:

- State the alert compactly and name the sensor as the source.
- Route it by content: an alert about the situation becomes a TASK or a
  REVIEW; a camera read (for example a scanned ID) becomes a TASK for
  lookup.
- Never let a sensor alert authorize an action by itself: the tiers and the
  human's decision still apply.

## Live action list

During long or persistent conversations (standby mode), the split is not a
one-time snapshot: keep the list of actions alive.

- When the conversation adds a request, append the action.
- When an action finishes, mark it done.
- When new evidence changes a class or a tier, re-route that action and say
  so in one line.
- The `accountability-auditor` skill reports the final state of the list.

## Live field situations (earpiece)

When the human is working live (for example an officer in the field with an
earpiece), keep the announcement and every answer short and speakable — two
short lines at most — and follow the advisory mode in the `workflow-master`
skill.

## Worked example: bank advisor at reception

The user says: "A client arrived and gave me her phone number; she also wants
a loan quote and today's mortgage rate."

Detect and split:

1. TASK (client) — note the phone number in the client app.
2. TASK (client) — prepare the loan quote.
3. QUESTION (client) — today's mortgage rate.

Then route: action 1 goes to the GREEN tier (automatic, logged for
verification), action 2 to YELLOW (a quote commits the bank: propose and
wait), action 3 is answered directly with the source cited. The human
corrects any part of this and their correction wins.

## Rules

- Never skip detection, even for short inputs. One line is enough.
- The classification lines are part of the record that the
  `accountability-auditor` skill audits at the end.
- Detection is cheap; acting on a misdetected input is expensive. When in
  doubt, re-read the input before routing.
