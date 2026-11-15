# Politique de confidentialité — Trasunto inc. (Charlevoix, Québec)

*Loi 25 — transparence. Version 1.1 · 2026-11-14 · publique (alignée sur `docs/LEGAL/POLITIQUE-CONFIDENTIALITE.md`).*

## Qui nous sommes

Trasunto inc., Charlevoix (Québec). Nous sommes le maillon humain entre
l'intelligence artificielle et les PME : nous installons, configurons et
accompagnons Fanal — l'assistant de travail qui exécute ce qui n'a pas
de conséquences, pendant que l'humain signe ce qui en a.

## Ce que nous détenons (presque rien, par conception)

- **Nous ne détenons NI ne conservons aucun renseignement personnel de
  vos clients.** Fanal traite tout sur VOTRE machine, dans VOTRE silo.
- Nous ne conservons que les données du pilote : nom de l'entreprise,
  coordonnées du signataire, et les leçons ANONYMISÉES du pilote.
- La télémétrie de Fanal est anonymisée : des types et des compteurs —
  jamais des noms ni des contenus.
- **Le voile PII 2.0 :** les noms, téléphones et courriels sont remplacés
  par des jetons locaux AVANT tout appel au modèle (insensible aux
  accents du français québécois, table de correspondance éphémère en silo
  détruite après réhydratation) — le nuage ne voit jamais un nom réel.
- **Connecteurs en lecture seule et diagnostic assaini :** la relève IMAP
  utilise `EXAMINE` + `BODY.PEEK[]` sans marquer ni modifier vos courriels,
  le dossier `Fanal-Inbox` est confiné à un répertoire explicite, et
  l'export de support (`diagnostic-sanitizer.js`) retranche clés et PII
  avant tout envoi.

## Ce que VOUS détenez

- **Coffre chiffré scrypt + AES-256-GCM :** vos clés d'API, vos identifiants
  IMAP, votre constitution, votre mémoire et vos données restent sur votre
  machine dans un silo chiffré (déverrouillage par mot de passe maître et
  biométrie OS, purge en RAM au verrouillage), exportables et effaçables
  à la demande.
- **Cerveau Dual curé exclusif (DeepSeek + Gemini) :** Fanal fonctionne de
  façon fermée sur vos propres clés **BYOK Dual** (**DeepSeek + Google Gemini**)
  stockées dans votre coffre local, avec bascule curée, voile PII 2.0
  avant tout appel externe et contrat directement sous votre compte.

## La responsabilité

La PERSONNE responsable au sens de la Loi 25 est l'entreprise
elle-même : **Trasunto inc.** — c'est la personne morale qui répond des
actes, pas son fondateur personnellement (responsabilité limitée, sauf
faute personnelle : fraude ou négligence grossière).

La FONCTION de responsable de la protection des renseignements
personnels (déléguable en tout ou en partie, art. 3.1 al. 2) est
exercée par : **Javier Alejandro Franco Leal, fondateur**. À l'échelle,
la fonction sera déléguée à un directeur des opérations ou à un
consultant externe.

## Vos droits

Accès, rectification, portabilité et effacement — sur demande via le
dépôt GitHub officiel (issues) ou les coordonnées de Trasunto indiquées
à l'Accord-Pilote. Réponse sous 30 jours.

## Les incidents

Tout incident présumé est consigné dans un journal interne, évalué en
trois degrés, et déclaré à la Commission d'accès à l'information (CAI)
ainsi qu'aux personnes concernées lorsque le risque de préjudice
sérieux le justifie (objectif : au plus tard 72 h après la
connaissance). Un incident ne se cache jamais.

## Contact

- Dépôt officiel : https://github.com/JavierFrancoLeal/jfranco-agentic-suite
- Responsable : Javier Alejandro Franco Leal, Trasunto inc., Charlevoix (Québec)
