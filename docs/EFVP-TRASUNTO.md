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
