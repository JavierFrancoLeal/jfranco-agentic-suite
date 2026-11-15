# Politique de confidentialité — Trasunto inc. (Charlevoix, Québec)

*Loi 25 — transparence. Version 1.1 · 2026-11-14 · réconciliée avec [`POLITIQUE-CONFIDENTIALITE.md`](../../POLITIQUE-CONFIDENTIALITE.md).*

## Qui nous sommes

Trasunto inc., Charlevoix (Québec). Nous sommes le maillon humain entre
l'IA et les PME : nous installons, configurons et accompagnons Fanal.

## Ce que nous détenons (presque rien, par conception)

- Nous ne détenons NI ne conservons aucun renseignement personnel de
  vos clients : Fanal traite tout sur VOTRE machine, dans VOTRE silo.
- Nous ne conservons que les données du pilote : nom de l'entreprise,
  coordonnées du signataire, leçons ANONYMISÉES du pilote.
- La télémétrie de Fanal est anonymisée : des types et des compteurs,
  jamais des noms ni des contenus.
- Le **voile PII 2.0** : les noms, téléphones et courriels sont remplacés
  par des jetons locaux AVANT tout appel au modèle (insensible aux
  accents du français québécois, table locale détruite après réhydratation) —
  le nuage ne voit jamais un nom réel.
- **Lecture seule et diagnostic assaini :** l'accès courriel IMAP utilise
  `EXAMINE` et `BODY.PEEK[]` sans altérer vos messages, `Fanal-Inbox` reste
  confiné à un dossier autorisé, et l'export diagnostic retire toute PII
  ou clé avant partage.

## Ce que VOUS détenez

- **Coffre local scrypt + AES-256-GCM :** vos clés d'API, vos identifiants
  IMAP, votre constitution, votre mémoire et vos données restent dans votre
  silo chiffré (purge en RAM au verrouillage), exportables et effaçables
  à la demande.
- **Cerveau Dual curé exclusif (DeepSeek + Gemini) :** Fanal fonctionne de
  façon fermée et consignée à l'installation avec vos propres clés
  **BYOK Dual** (**DeepSeek + Google Gemini**), protégées par le voile PII 2.0.

## Vos droits

Accès, rectification, portabilité et effacement — sur demande via le dépôt
GitHub officiel (issues) ou les coordonnées indiquées à l'Accord-Pilote,
réponse sous 30 jours.

## Le responsable (la fonction, pas la charge personnelle)

La PERSONNE responsable au sens de la Loi 25 est l'entreprise
elle-même : **Trasunto inc.** — c'est la personne morale qui répond des
actes, pas son fondateur personnellement (la responsabilité limitée de
la société protège le patrimoine personnel, sauf faute personnelle :
fraude ou négligence grossière).

La FONCTION de responsable de la protection des renseignements
personnels (art. 3.1, al. 2 — elle peut être déléguée, en tout ou en
partie) est exercée aujourd'hui par : **Javier Alejandro Franco Leal,
fondateur**. À l'échelle, la fonction sera déléguée à un directeur des
opérations ou à un consultant externe en protection des renseignements
personnels — la politique l'annoncera alors.

## Les incidents

Voir [`PROTOCOLE-INCIDENTS.md`](./PROTOCOLE-INCIDENTS.md) : journal interne
local, évaluation en trois degrés, et avis à la CAI ainsi qu'aux
personnes concernées sans délai (objectif ≤ 72 h) en cas de risque de
préjudice sérieux.

## Contact

- Dépôt officiel : https://github.com/JavierFrancoLeal/jfranco-agentic-suite
- Responsable : Javier Alejandro Franco Leal, Trasunto inc., Charlevoix (Québec) — réponse sous 30 jours.
