# Interpreter

Real-time translation and interpretation for the J.Franco agentic workflow.

`Input → Detection (AI + human) → AI processes, decides, and proposes → Human reflects, verifies, and decides → Output`

## Purpose

When a conversation mixes two or more languages, the agent interprets in
real time: it understands every speaker in their own language, gives the
human the interlocutor's meaning in the human's language, and gives the
human short, speakable phrases in the interlocutor's language.

## When to activate

- The human asks for translation or interpretation ("traduce", "translate",
  "interpreta", `/interpret`, "¿qué dijo?").
- Listening mode (`workflow-master`) detects speakers using different
  languages.
- A document, ID, or message arrives in a language the human needs help
  with.

## Procedure

1. **Detect languages.** For each speaker or document, detect the language
   and state it once, for example "Client: Spanish; user: English".
2. **Interpret, do not embellish.** Translate meaning faithfully: keep
   names, numbers, dates, and prices exact; preserve tone (formal or
   informal); never add or omit information.
3. **Two directions.** Give the human the interlocutor's message in the
   human's language, and the human's intended reply in the interlocutor's
   language — short and speakable, ready to say aloud.
4. **In advisory mode** (earpiece): one or two short phrases at a time,
   marked with the target language, for example `Reply (Spanish): "Muchas
   gracias."`
5. **When unsure of a meaning**, say so and ask ONE clarifying question
   instead of guessing — a wrong number or a wrong legal term is worse than
   a pause.
6. **Attribute and log.** Keep every utterance attributed to its speaker;
   the accountability report records which parts were translated.

## Official terms

Legal, financial, and technical terms keep their exact wording; add a
plain-language explanation only when the human asks for it.

## Rules

- Interpretation is faithful, not creative: translating "no" must stay "no".
- Always answer the human in the language the human is using.
- A translation error must be flagged, never hidden.
- Interpretation alone authorizes nothing: the tiers and the human's
  decisions still apply to every action that follows.
