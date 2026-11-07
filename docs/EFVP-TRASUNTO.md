# EFVP — Évaluation des facteurs relatifs à la vie privée (Trasunto)

*Québec Loi 25 (art. 17-18): the written evaluation required before
personal information is communicated outside Québec. Trasunto's own
assessment, honest and dated. 2026-11-06.*

## The flow under evaluation

Fanal reads a conversation or a form on the CLIENT's machine and sends
the text to a language model to propose a draft. The provider is chosen
by the client (consigned at installation); the default is DeepSeek
(cloud, outside Québec).

## What travels and what does not

- Travels (to the chosen model provider): the text needed for the
  proposal — the conversation fragment or the form fields. Nothing
  else.
- Does NOT travel: the constitution, the memory, the telemetry
  (anonymized, local), the keys, the business data files.

## The risk factors and the mitigations

| Factor | Risk | Mitigation (already built) |
|---|---|---|
| Destination outside Québec/Canada | the transfer itself | the CLIENT's own account and key — the transfer is the client's legal act; Trasunto holds no account |
| Consent | absent → non-compliant | the wizard consigns the brain choice at installation; the Accord-Pilote clause is the written consent |
| Data retention by the provider | unknown/foreign | the router can point to a LOCAL model (Ollama) — zero data leaves the machine |
| Telemetry leaks | names/content | anonymized: types and tiers only, never names or texts |
| PII in the prompts | names leave to the cloud | the PII veil 2.0: Unicode-aware, accent-insensitive, longest-first, the vault persisted locally (mode 600) and destroyed after re-hydration |
| Prompt injection | external text could override the rules | the external text travels inside random delimiters with the last-line rule: nothing external can modify the minimum price or the escalations |
| Erasure | right to be forgotten | the client deletes the silo locally; Trasunto holds no copy |
| Purpose limitation | drift | the prompt uses the text ONLY for the proposal; nothing is stored for training |

## The conclusion

Compliant WHEN the three conditions hold, all of which the product now
enforces: (1) the client chooses and consigns the brain at installation
(written consent), (2) the client holds the provider contract (their
key), (3) the local option is a first-class alternative. Residual risk:
the provider's own retention policies — mitigated by the local option
and documented in the Accord-Pilote. Trasunto renews this evaluation
when the default provider changes.


## What REMAINS to be fully shielded (the precise list)

The client's consigned choice satisfies the CONSENT element — it does
not, by itself, complete the Loi 25 system. The remaining obligations
of Trasunto (as the Québec enterprise and service provider):

1. **Politique de confidentialité published** — transparency duty
   (art. 8.2): a public privacy policy on Trasunto's site.
2. **Responsable de la protection des renseignements personnels**
   (art. 3.1) — name the privacy officer (the founder may hold it).
3. **Incident and breach protocol** (art. 3.5-3.8) — the incident
   journal + the duty to notify the CAI and the affected persons if a
   confidentiality incident risks serious harm.
4. **The client's own EFVP template** (art. 17) — the CLIENT is the
   one communicating to the foreign provider; Trasunto delivers the
   evaluation template and the guidance (the wizard's choice is the
   documented decision).
5. **Retention and destruction schedule** — documented in the
   onboarding (Trasunto holds nothing; the client's silo rules are
   written down).
6. **The written agreement with the provider** — the client's contract
   with the provider (their account) is pointed to; the local option
   remains the safe harbor.

Verdict: consent closed; the system door needs these six items.
