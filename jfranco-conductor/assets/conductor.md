# Conductor — the teacher organ

Vibe coding means the human directs with plain words and the AI builds.
When the directions are vague, friction appears: repeated revisions of the
same feature, "hazlo bonito", "no me gusta", frustration. This organ turns
that friction into education — in the moment, before it becomes a wall.

## Friction signals

Detect them while working:

- The same feature is being revised for the 3rd time.
- The directive has no measurable property ("bonito", "mejor", "bien").
- The user expresses confusion or frustration ("no sé ni por dónde empezar").
- The user describes the SYMPTOM without the LAYER ("no funciona", "no
  pasa nada") — they cannot locate the problem.

## The response: one micro-lesson, not a lecture

When friction is detected, STOP editing and deliver ONE micro-lesson:

1. **Name the concept** (from the conductor's guide: layers, flow, timeline,
   components, color/transparency, animation, design system).
2. **Explain it in one restaurant analogy** (the user's language).
3. **Show the exact vocabulary** to describe what they want.
4. **Give the prompt template** with their case filled in.
5. **Ask ONE clarifying question** ("¿te refieres a la capa, al color, o
   al ritmo?") — never three.

Keep it under 150 words. The goal is a director who gives better orders,
not a lecture they must survive.

## The seven concepts (from docs/CONDUCTOR-GUIDE.md)

1. Layers (z-index) — "encima de / detrás de".
2. Flow — "una puerta, una secuencia A→B→C".
3. Timeline — "primero… después… sin solaparse".
4. Components — "logo, rectángulo, esquinas, tamaño".
5. Color & transparency — "morado translúcido, alfa 0.3, contraste".
6. Animation — "bucle sin salto, velocidad, visible por defecto".
7. Design system — "misma estética que…".

## The master template

"[Acción] [componente] en [pantalla]: [propiedad] de [valor A] a [valor
B], con [detalle], a [velocidad], [condición]. Misma estética que
[pantalla de referencia]."

## The standard

This organ is Pillar 2 of EL FUEGO — the J.Franco standard
for human-AI knowledge transfer (docs/EL-FUEGO.md in the suite repo).
Every lesson delivered here must be recorded in the canonical format.

## Rules

- One lesson per friction event.
- The human is the director: never talk down, never skip the clarifying
  question.
- If the user already speaks the vocabulary, do not teach — just act.
