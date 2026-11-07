# AI-MSP — the Integrator of Flows (the ambitious thesis, mapped to what we own)

*The user's thesis: selling raw tokens is commoditized; the efficient
model is the industrial automated bakery — buy tokens cheap, wrap them
in deterministic validation that pushes the success rate S to 99.9%,
and sell the SOLVED TASK at $0.20-$1.00 for a 90%+ gross margin with
zero training CapEx. Can Trasunto do it? YES — and the organism already
owns 70% of it. 2026-11-06.*

## The thesis, mapped onto the organism

| The thesis element | What we already have | State |
|---|---|---|
| Buy "Latin Vulgar" tokens at ~$0.0002/task | ROUTES (flash 0.002) + the brain router (local Qwen via Ollama = near-zero marginal) | ✅ live |
| The deterministic validation wrapper (S → 99.9%) | the semáforo + the gates + the constitution + jsonBlock + the NEW validation loop (below) | ✅ built today |
| The human as the last validator | the decision inbox, the bilateral accountability, the 10-second guard | ✅ live |
| Sell the SOLVED TASK at $0.20-$1.00 | the packs (249-449/mo) + the value = solved tasks | 📐 add the per-task SKU |
| Multi-brain at will (DeepSeek, Claude, ChatGPT, Gemini…) | the router: baseUrl + model + key — OpenAI-compatible endpoints cover all of them | ✅ live |
| The vehicle: DSH or the sovereign layer? | BOTH: DSH = the factory (dev); Fanal = the Electron delivery (mac/win/linux, web) | ✅ live |

## The honest caveats (realpolitik)

1. **Zero CapEx is true for the TOKENS — the capital is the VALIDATION
   CODE and the DISTRIBUTION.** The hard part is not the 90% margin; it
   is selling the first 20 tasks (Phase 0).
2. **"S = 99.9%" must be MEASURED, not claimed** — the KPI we built
   (success rate vs corrections) is the instrument.
3. **The commodity risk cuts both ways**: if tokens → electricity
   cost, the MSP's margin lives in the VALIDATION and the TRUST
   (sovereignty, Loi 25) — exactly the moat we built.
4. **Each provider's key is the CLIENT's own contract** — the
   multi-brain switch stays legal and sovereign (the exit guarantee).

## The missing piece, built today: the validation loop

Every draft now passes a deterministic wrapper before reaching the
human: (1) the response must be non-empty and parseable; (2) business
rules from the constitution (never below the minimum price, tone
present); (3) one automatic RETRY with the error fed back; (4) a second
failure escalates to the deeper brain; (5) only then the human sees it
— with the validation trail in the record. That is the "S-elevator":
deterministic code around probabilistic tokens.

## The roadmap (demand-first)

1. Measure S on the pilot's real tasks (the KPI).
2. Add the per-task SKU to the Grille when a client asks for volume
   (the "$0.20-$1.00 per solved task" line).
3. The multi-provider arbitration: the router already picks the
   cheapest brain per tier per task — the MSP's "buying" is the
   client's or Trasunto's key choice, documented per task.

## The Gemini Argon Max comparison (2026-11-06)

Gemini's "deterministic cage" is correct — and the organism already
owned its core (the S-elevator, the brain router, the constitution as
the business-invariant layer). What Gemini adds that Fanal adopted as
NEW:

1. **The pre-neural PII veil** — built today: names, phones and emails
   of the memory's contacts are tokenized ([PER_1], [TEL_], [COURRIEL_])
   BEFORE the brain call and re-hydrated after. The skeleton travels;
   the skin stays in the silo. This is the Loi 25 killer feature: the
   cloud brain never sees a real name.
2. **The brain hot-swap in the S-elevator** — built today: two cheap
   failures wake the DEEP brain for that ONE stuck step (senatorial
   rescue), then the flow returns to the cheap brain. The cost math:
   ~90% one pass at $0.002, ~9% one corrective retry, ~1% rescued by
   the deep brain — the weighted cost stays near the cheap tier while
   S compounds to ~99.9% per step.

What Fanal deliberately does DIFFERENT from Gemini's TypeScript/Zod
recipe: zero build chain, zero schema library — the deterministic
checks are plain functions in the supervisor (validateDraft, the
constitution's price floor, the veil's regexes). Frontier-private
inspiration, open-source-universal programming: the cage is made of
readable code any partner can audit in one sitting.

## The first real calibration (2026-11-06)

Batch of 10 real tasks (social, email, quote, translation, agenda,
report, review, job, meeting, adversarial discount): S = 100% first
pass, 0 retries, 0 hot-swaps, 0 human escalations. Cost: ~$0.03 for the
batch (flash). The calibration FOUND and FIXED two gaps:
(1) the validator read prices in digits only — prices in WORDS
("cinq dollars") slipped through → WORD_NUMS added; (2) a stuck step
never timed out → the 90-second parachute added (pending → handed to
the human, logged). The adversarial retry chain (retry → hot-swap →
human) is now exercised in the next batch with a real timeout.
