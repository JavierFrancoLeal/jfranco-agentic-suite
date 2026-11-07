# ARGON-MAX-DISTILLATION — how Trasunto distills Gemini Argon Max

*The protocol to extract, validate and improve our technology using
Gemini Argon Max as the adversarial consultant — without ever letting
it decide for the house. 2026-11-06.*

## The rule of the distillation

Argon Max PROPOSES; the house doctrine and the gates DECIDE. Every
answer lands in docs/ARGON-REVIEWS/<date>-<battery>.md, gets scored
against the doctrine (sovereignty, HITL, zero-build-chain, demand
first), and only the pieces that fit are adopted — as happened with the
PII veil and the brain hot-swap. We distill the MODEL; we never copy
the architecture wholesale.

## What we already adopted from Argon Max (do not re-suggest)

1. The pre-neural PII veil (ours: in-memory regex + memory tokens —
   theirs: SQLite vault + SHA256).
2. The brain hot-swap in the S-elevator (ours: flash → flash+error →
   v4-pro → human).
3. The cost-weighted routing math (CTE).

## The context block (paste first, once)

> You are reviewing a REAL, WORKING system — not a proposal. Do not
> propose rebuilds; propose the MINIMAL changes that raise its
> reliability and sovereignty. The system: "Fanal" — a sovereign
> agentic orchestration layer for Québec SMEs. Stack: a single-file
> Node.js supervisor (no framework, no build chain, no schema library)
> + an Electron app (macOS/Windows) + a web dashboard (10 languages).
> Its deterministic cage: plain functions — validateDraft (empty/
> parseable, price floor in digits AND words), the client's Constitution
> (tone, policies, minimum price, extreme conditions, escalations),
> a brain router (providers.json: baseUrl/model/key per tier — cloud or
> local Ollama), a PII veil (in-memory regex: contact names from the
> client's Memory + phone/email patterns, tokenized before the cloud,
> re-hydrated after), the S-elevator (validate → one corrective retry
> with the exact error → hot-swap to the deep brain → 90-second
> parachute → human), the traffic light (GREEN/SEMI/YELLOW/RED, logged
> in telemetry), the bilateral accountability (the caller or the owner
> signs, depending on who carries the skin). Measured: 10 real tasks,
> S = 100% first pass, ~$0.03 total (flash).

## The five batteries (one per session)

### Battery A — The cage verdict
"Our cage is plain functions with no schema library and no TypeScript
build chain. Your recipe uses Zod + electron-vite. Enumerate exactly
what we LOSE and what we GAIN in: failure-mode coverage, auditability,
time-to-fix a broken invariant, and onboarding of a new developer.
Then give the ONE schema library that adds the most protection for the
LEAST build-chain cost — or confirm that plain functions are enough at
our scale."

### Battery B — The veil adversarial audit
"Audit our in-memory veil adversarially. List the concrete texts that
still leak PII: names NOT in the Memory, plurals/possessives
('les Tremblay'), case variants, accented forms, nicknames, address
lines, invoice numbers, and the patterns your SQLite vault catches that
ours does not. For each leak, give the minimal regex or the minimal
upgrade step. End with the cheapest upgrade path: in-memory → SQLite
vault, and whether the Loi 25 risk justifies it NOW or only when a
government client demands it."

### Battery C — The S-elevator failure modes
"Stress-test our S-elevator: validate → 1 retry with the error → hot-swap
to the deep brain → 90s parachute → human. List the failure modes we
have not covered (provider hangs without timeout inside the call,
temperature variance, json_object support differences across the
router's providers, the retry prompt growing past the cheap brain's
context, the deep brain ALSO failing on arithmetic). For each, give the
minimal fix. End with your honest estimate of S at 1 000 real tasks —
not 10."

### Battery D — The Electron hardening five
"Our Electron app spawns the supervisor as a child process, has a
single-instance lock, the watchdog, and a token-gated dashboard. It
does NOT yet use contextIsolation/safeStorage as your recipe does.
List ONLY the five highest-priority hardening steps for a Québec SME
deployment, ordered by risk reduction per hour of work, with the exact
Electron settings or modules for each. Do not propose a UI rewrite."

### Battery E — The AI-MSP stress test
"Stress-test this thesis with numbers: buy tokens at ~$0.0002/task
(flash $0.002 or local Qwen), wrap them in deterministic validation
(S measured 100% on 10 tasks), sell the solved task at $0.20-$1.00.
Calculate the honest CTE at S = 99%, 99.5%, 99.9% with 1% hot-swaps at
$0.05/task, the CAC of selling to Charlevoix SMEs (direct sales,
one founder), and the minimum monthly task volume where the 90% gross
margin survives the correction costs. Then state the ONE thing that
kills this thesis more than the token price."

## The answer contract (append to every battery)

Reply in this EXACT structure: (1) VERDICT — one line; (2) GAPS — the
three most important; (3) MINIMAL CHANGES — code-level, in order;
(4) DO NOT — what we should resist; (5) the numbers you assumed.

## The review ledger

Every answer is stored as docs/ARGON-REVIEWS/<date>-battery-<letter>.md,
with the house's adoption decision appended: ADOPTED / ADAPTED / REJECTED
and why — the same discipline as the Knowledge Ledger. The distillation
is a conversation, not a surrender.
