# RAYLINE-INTEGRATION — the honest analysis (2026-11-12)

*The question: can Rayline (rayline.ai) be added to Fanal and to all
the Trasunto apps? The answer: YES — and it fits the architecture
better than almost anything we have seen, under three conditions.*

## What Rayline is (the verified reading of the site)

A unified model-routing service: ARC (a response, or a ROUTE for your
own inference), the Decisions API (structured answers, Jev-compatible),
and Raydock (open-source, on-device, connecting the local models and
the cloud services). The claim: ~97% of the frontier quality at ~14%
of the cost, or ~7% with the local models. The key phrase for us:
"keeps your stack yours — let Rayline run inference, or take the
recommendation to your own gateway, cloud provider, or local models."

## Why it fits Fanal (the honest fit)

- Rayline is the COMMERCIAL version of the brain ladder we already
  built: the routing research (the model-selection data) could beat
  our static tiers. Our route() already supports arbitrary
  OpenAI-compatible providers — the ARC would enter as an OPTIONAL
  tier in providers.json, nothing more.
- The Decisions API matches the house's strict-JSON brain calls (the
  same Jev-compatible style as our dossiers' prompts).
- Raydock (open-source, on-device) matches the Zero-Hardware and the
  local-first doctrine: the client's machine stays the sovereign.

## The three conditions (the house rules)

1. THE VEIL BEFORE THE ROUTER — the PII veil 2.1 runs BEFORE any
   external call, including the routing decision. The route request
   carries no private data, ever.
2. THE ROUTE-FOR-OWN-INFERENCE MODE — the preference: Rayline
   RECOMMENDS the model; OUR gateway (or the client's local brain)
   runs the inference. The sovereignty ("deux mondes") stays intact;
   the routing intelligence enters.
3. THE DEMAND-FIRST — the integration is a config addition (a provider
   + an optional "smart" tier in the ladder), built when the beta's
   demand justifies it. The honest verdict: technically YES today,
   strategically a natural evolution of the volante.

## The concrete plan (when the demand arrives)

1. Fanal: providers.json gains the rayline provider (the ARC endpoint,
   the OpenAI-compatible dialect); the ladder gains the optional
   "route" tier: local → route(ARC's recommendation) → deep → rescue
   → human. The KPI tracks whether the route tier beats the static
   tiers (the measured decision, never the assumption).
2. The Trasunto apps (the DSH organs): the Raydock bridge for the
   local-first organs when a client's stack needs it.
3. The calibration: the 100-task adversarial suite measures the
   route tier exactly like the others — the S_real formula includes it.
