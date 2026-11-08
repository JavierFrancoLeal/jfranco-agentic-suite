# CLIENT-CONSTITUTION — the co-created layer that guides Fanal

*How each client co-creates the files that stamp their ideology, tone,
policies and workflows into Fanal — plus the KPI that measures the only
resource that matters: human time. 2026-11-06.*

## The concept

Fanal is born generic; every client makes it THEIRS. The co-created
layer is a living dossier in the client's silo:

1. **The Constitution** (`constitution.json`) — philosophy, values,
   tone, return policies, discount rules, the minimum operational
   price, and the escalation rules (what ALWAYS asks the human).
2. **The Memory** (`memory.json`) — clients, providers, partners; their
   "lo de siempre" orders; horizontal and vertical relationships; the
   calendars to verify before promising a date.
3. **The learnings** — every correction the human makes to a proposal
   is captured automatically: Fanal's conduct improves with every
   decision, and the human never repeats the same correction twice.

## The two examples (the spec)

**Example 1 — the regular client.** Jean Tremblay calls "lo de
siempre". Fanal verifies the Memory (Jean → poutine + hamburger, address
X, price Y), proposes the confirmation; Jean confirms; the ORDER is
verified by the CUSTOMER himself → the burden of proof is his, the
human-in-the-loop is satisfied, the registry is complete. Irreversible
action (an order placed) = verified by a human.

**Example 2 — the recurring provider.** Fanal contacts the provider,
asks for the order and the invoice, extracts the data, and shows the
invoice to the owner; the owner verifies, approves and pays; Fanal
closes the conversation. The owner saved the whole upstream workflow;
his time was used ONLY for verify/approve/pay — the irreversible part.

## The KPI — human time saved

The most valuable resource is the HUMAN'S time. The credible metric:

- Reference table: how long a human takes to write an email of X words
  (~40 wpm + thinking), open the browser and reach a page (~20 s),
  fill a form field (~15 s), find a past conversation (~90 s).
- `timeSaved = Σ (reference time per action class) − corrective time`.
- The success rate: tasks done without correction ÷ tasks total. Every
  correction means human time re-invested — the purpose failed.

## The two usage metrics

1. **Productive time** — the human using Fanal the way we designed:
   approving, sending, deciding. This is the KPI numerator's ally.
2. **Corrective time** — the human doing the work Fanal should have
   done: editing drafts, re-scanning, fixing fills. This is the alarm:
   when corrective time grows, the constitution and the memory are not
   yet tuned, and the co-creation loop must continue.

## The rule of the house

The files live in the CLIENT's silo, co-written with the client's own
words; Fanal consults them before every proposal and records every
decision after it. The human remains the signer; the files make the
signing fast. "L'IA travaille. L'humain veille, décide, révise."

## Identity beyond the name (added 2026-11-06)

The NAME is only a label; the CHANNEL is the key. Contacts in the
Memory carry identifiers (phone, email, Facebook/Messenger account).
When a message arrives, the Répondant extracts the sender from the
header and matches by the identifier first, by the name second — and
when the identity is ambiguous (two Jean Tremblay), the machine
DECLARES the ambiguity and asks the human instead of guessing. The
record then carries WHO was identified and by WHICH identifier.

## The bilateral accountability (the differential idea)

The human-in-the-loop is not fixed to one chair: the burden attaches to
the actor who carries the interest for the irreversible act.

- Example 1 — the ORDER: the diner confirms "lo de siempre". The
  burden, the traceability and the decision are HIS — the customer end
  of the spectrum.
- Example 2 — the INVOICE: the owner verifies, approves and pays. The
  burden, the traceability and the decision are HIS — the owner end.

Fanal is the neutral notary in the middle: the same semáforo, the same
registry, and the record states WHO verified (role + name + channel +
timestamp) — whichever end the burden belongs to for that action. The
verification power is distributed to the actor who KNOWS: the diner
knows his order; the owner knows his money.

## The skin-in-the-game principle (added 2026-11-06)

Verification attaches to the actor with knowledge AND skin in the game:
Jean verifies his order because he will EAT it and his reputation rides
on it; the manager verifies because he is PAID for it; the owner
verifies because his PATRIMONY is at stake. The burden is never
assigned to a title — it is assigned to the one whose skin is in the
outcome.

## Who must consult the Constitution (the instances)

| Instance | What it must consult |
|---|---|
| Le Répondant | tone, policies, memory identities — before every reply proposal |
| Le Studio | tone, discounts, minimum price, escalation rules — before every draft |
| Le Secrétaire | minimum price, policies — before every field proposal |
| decision-router (organ) | the escalation rules decide the tier of each action |
| workflow-master (organ) | the house policies shape every workflow step |
| accountability-auditor (organ) | the report cites WHICH constitution rule each action followed |
| autonomy-grader (organ) | the grade measures compliance with the escalation rules |
| audit (organ) | the consolidation audits constitution compliance over time |
| docfactory (organ) | the documents speak the client's tone |
| The PDFs (Accord pilote) | the co-creation of the Constitution is a named deliverable of the pilot |

The rule: every brain call and every organ that proposes or grades must
READ the constitution first; every record must SAY which rule it
followed. The constitution is the client's law inside Fanal.

## The pilot activation (Argon prompt-10, adopted — 2026-11-07)

The pilot becomes operationally irreversible in the FIRST 7 days: the
goal is not 70% of the 15 branches (a restaurant never uses Customs) —
it is 4 of the 5 capabilities of the client's SECTOR PACK (80% in week
1). Day 1: 2/5 (the pre-loaded cards + the first real sessions) · Day
2: 3/5 (the first cryptographic handoff + one real Secrétaire form) ·
Day 7: 4/5 (the SEMI graduation + the first real Dossier).

The ONE adoption metric: the DDG — the share of daily transactions
sealed in ledger.jsonl by 2+ roles. The intervention triggers: 36
silent hours (the team went back to paper) or 3 consecutive owner
rejections (the Constitution is mis-calibrated) — the founder visits
within 24h, never waits for the month-end. The internal network
effect: the GREEN work is never anonymous — the pulse strip and the
PDF name the workers ("Julie: 85 sessions, 0 incidents").
