# USABILITY-AUDIT — the normal client, not the engineer (2026-11-07)

*The differentiator is usability: everything except the installation
must be doable by a normal client — Windows, Apple or ChromeOS users
with basic browser skills. One honest pass over the whole organism.*

## The journey of a normal client (the audit)

1. Install the .dmg (the ONLY step that needs help — Gatekeeper).
2. The 8-step wizard: language → business → sector → key → permissions
   → house rules → summary. VERDICT: good — but step 3 (the brain
   choice) used technical terms (baseUrl, Ollama).
3. The daily use: the Studio (write an idea → approve), the three
   lines (scan → propose → the human sends), the day (open → close).
   VERDICT: good — the flows end in buttons, not commands.
4. The Réglages: Constitution (plain fields) · Mémoire (plain fields) ·
   Cerveau (baseUrl fields) · Zone dangereuse. VERDICT: the Cerveau
   was the ONE place a normal client would get lost.

## The findings and the fixes

| Finding | Fix (built today) |
|---|---|
| The client never types a baseUrl | ✨ "Configurer le cerveau automatiquement" — the server detects Ollama, picks the best model, and configures itself (v1.0.127). The advanced fields stay for the engineer |
| The wizard's local choice was technical | the same auto-detect serves it — the choice becomes "nube / local (se configura solo)" |
| The technical hints in the cards | rewritten in plain French, with the "Fanal prépare, VOUS décidez" pattern everywhere |

## The remaining gaps (honest, small)

- The FIRST launch needs the Gatekeeper right-click (until the
  certificate — decided: after the company exists).
- The Studio task-type labels are English (social, email…) — to be
  translated in the next i18n pass.
- The Téléphoniste and the browser pilot ask for a one-time "the page
  is open" understanding — acceptable, it is one sentence per card.

## The rule that remains

Every new screen must pass the test: "could a restaurant owner explain
it to their employee in one sentence?" If not, it is not finished.
