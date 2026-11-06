# AUTOMATION-CATALOG — what Fanal can automate in Chrome today (2026-11-05)

*The honest catalog for the business plan: what is automatable TODAY by
driving the browser (CDP, visible pilot, badge, traffic light), what is
NOT, and which products come out of it.*

## The honest rule first

Fanal does NOT aim to "do everything a human does in the browser". It
PREPARES in the page (drafts, fills, reads) with the badge always on,
and the HUMAN confirms, sends and signs. The traffic light governs every
page action: GREEN = read/navigate (logged) · SEMI = fill/prepare
(verify) · YELLOW = propose (human decides) · RED = send/irreversible
(never automatic).

## The catalog by domain

| Domain | Automatable today | The flows | Tier of the SEND |
|---|---|---|---|
| Facebook (Page + Messenger) | ✅ High | draft posts, reply proposals, read activity, inbox triage | YELLOW (human sends) |
| Instagram (via web) | ✅ Medium | draft posts/replies, DM proposals | YELLOW |
| X / Twitter (web) | ✅ Medium | draft posts, reply proposals, mentions triage | YELLOW |
| Gmail (web) | ✅ High | read/classify inbox, draft replies, attachments prepared | YELLOW |
| Accounting web apps (Wave, QuickBooks web…) | ✅ Medium | enter invoices, reconcile lines, export reports | SEMI (verify) |
| Canadian government forms (CRA, provincial) | ⚠️ Partial | fill fields, save drafts, export data | RED (human submits — by design) |
| Suppliers / catalogs / booking pages | ✅ Medium | compare prices, fill order forms, read stock | SEMI/YELLOW |

## The three product lines (for the business plan)

1. **Le Publicateur** — social networks: the Studio drafts the post in
   French, the owner approves, Fanal places it in the page, the owner
   presses Publish. (Fits: restaurant, tourism, agri-food.)
2. **Le Répondant** — messages/comments/emails: each message arrives
   with a proposed reply AND its reason; the owner sends or edits.
   (Fits: lodging, tourism, professionals.)
3. **Le Secrétaire** — forms, invoices, records: Fanal fills and saves
   drafts; the owner verifies and submits. (Fits: autonomous workers,
   accounting-heavy businesses, government-adjacent work.)

## The honest constraints (also for the plan)

- CAPTCHAs and 2FA are not bugs: they are the human's door — the flow
  stops and asks. This is a selling point (sovereignty), not a limit.
- Every page changes its layout (selectors break): maintenance per page
  is the recurring cost — that is why the packs limit the NUMBER of
  active automations (Essentiel 6, Actif 15, Intensif custom), never
  the number of pages.
- Credentials live in the client's own browser session — nothing is
  stored by Trasunto.
- Platform Terms of Service: the Studio flow (draft → human sends) is
  the safe path; full unattended sending is deliberately not offered.

## The diminishing-returns verdict

Driving the DOM of every page "like a human" is the fragile glue of the
industry (browser automation breaks constantly). The winning model:
PREPARE in the browser (80 % of the work: reading, drafting, filling),
DECIDE in the human (the 20 % that carries responsibility), and move
heavy integrations to APIs later, per client, when the pilot proves the
demand. The catalog above is the offer; the pilot will price it.

## The phone road (Le Téléphoniste) — designed 2026-11-06

A fourth candidate line, demand-first: Fanal answers and makes calls
with the mandatory audible announcement ("vous parlez à Fanal — réserver
immédiatement ou un humain dans 15 à 30 minutes"), the interpreter mode
for live calls in 10 languages, and the same constitution/memory/semáforo.
The design lives in docs/TELEPHONY.md; the integration is built for the
first pilot client that pays for it.

## The ecosystem road (Google and Microsoft 365) — added 2026-11-05

Fanal does NOT rebuild Office or Workspace: it ORCHESTRATES them.
Through the OFFICIAL APIs, the same three lines become native and
robust (no selectors, no fragile DOM):

- Gmail API → the Répondant reads threads and prepares replies;
- Google Sheets / Excel (Graph) → the Secrétaire fills the books;
- Google Docs / Word (Graph) → the document factory drops drafts;
- Calendar / Teams → follow-ups, meeting summaries, notices.

The client authorizes with THEIR account (OAuth), their data stays in
their account, their key stays in their silo — Fanal keeps only the
traffic light. The connectors are NEW HANDS beside the browser hand:
same governance, same semáforo, same human decision.

The rule stays demand-first: the FIRST connector is built for the FIRST
pilot client that pays for it (Gmail for a hotel, Graph for a
professional). The neutrality is the selling point: one Fanal brain for
Google AND Microsoft, with the client's own key — independent of both.
