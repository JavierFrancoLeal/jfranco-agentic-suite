# INSTALLERS — Architecture des éditions, empaquetage et déploiement (macOS / Windows)

Ce document régit la distribution, l'installation sans friction, le contrôle obligatoire à l'ouverture et la séparation stricte entre l'édition destinée aux clients finaux (**Fanal**) et la console réservée au fondateur (**Fanal Studio**), conformément à la philosophie visuelle et opérationnelle de Trasunto inc.

---

## 1. Principe directeur : zéro friction, deux éditions distinctes

Le client final ne doit jamais manipuler de terminal, d'installateur Node.js, de dépôt Git, ni d'agent local tiers (l'option Ollama a été définitivement retirée afin d'éliminer les échecs matériels, la latence GPU et les 4 à 15 Go d'espace disque superflus). L'ensemble de l'orchestration repose sur un **Cerveau Dual Fermé style Apple** (`DeepSeek-Flash` + `DeepSeek-V4-Pro` + `Google Gemini`) protégé par un silo chiffré local.

| Édition | Cible | Port local | Exécutable macOS / Windows | Capacités exclusives |
| :--- | :--- | :--- | :--- | :--- |
| **Fanal (Client)** | Dirigeants PME, travailleurs autonomes, cabinets | `8787` | `/Applications/Fanal.app` · `Fanal-Setup.exe` | Tableau de bord 10 langues, Voile PII Loi 25, Coffre chiffré, Import Z MEV-WEB passif, Affluence sectorielle (`ToS` Maps), Adaptateurs `0 $` matériel (ADF/VoIP/Webcam/A2DP), Téléphoniste, Répondant, Secrétaire |
| **Fanal Studio (Fondateur)** | Trasunto inc. (propriétaire & implantateurs) | `8788` | `/Applications/Fanal Studio.app` · `Fanal-Studio-Setup.exe` | Tout le socle client **+** console `studio-admin`, inspection de diagnostics assainis Loi 25, **Vérificateur cryptographique d'installations (`Ed25519`)**, télémétrie p50/p90 (`pricing-catalog.json`) et gestion interne de facturation |

---

## 2. Séquence d'installation pas à pas sur le poste du client

L'implantation repose sur une double validation stricte partagée entre le navigateur/Electron et le serveur HTTP via [`setup-validator.js`](../supervisor/setup-validator.js) :

1. **Sélection de la langue (Écran 0)** : choix parmi 10 langues natives (`Français`, `English`, `Español`, `Deutsch`, `Italiano`, `Português`, `中文`, `日本語`, `한국어`, `العربية`), avec nuages d'aide contextuels rédigés dans la langue survolée.
2. **Démarrage du silo et cascade structurelle (Étapes 1–2 du Wizard)** : l'installateur invite le dirigeant à saisir sa raison sociale, sa taille de structure (`AUTONOMOUS_SOLO` 1 personne, `MICRO_SINGLE_OWNER` 2–5 personnes, `SME_CELL` 6+ personnes) qui déverrouille dynamiquement les 11 métiers reconnus au Québec ou les 11 secteurs SCIAN.
3. **Configuration optionnelle du Coffre chiffré et des clés BYOK (Étape 3)** : badge explicite *Optionnel* pour le démarrage immédiat du socle déterministe ; lorsque renseigné, chiffrement `scrypt + AES-256-GCM`, liaison biométrique optionnelle (`Touch ID` / `Windows Hello`) et scellement des sous-clés `DeepSeek` et `Gemini` via `safeStorage`. Aucune clé en clair ne subsiste sur disque.
4. **Autorisations système Apple/Windows (Étape 4)** : demande unique et explicite d'accès au microphone, aux notifications locales et à l'accès dossiers (`Fanal-Inbox`).
5. **Constitution Fermée V2 & Loi 25 (Étape 5 — `FANAL-CONSTITUTION-V2`)** : remplacement des anciens champs ouverts ambigus par huit champs fermés obligatoires (raison sociale, régime fiscal `PETIT_FOURNISSEUR_EXEMPT < 30 000 $` ou `INSCRIT_TPS_TVQ`, responsable RPRP Loi 25 nom + courriel, registre de voix fermé, plancher matériel CAD, politique d'escompte fermée, au moins 1 règle d'escalade ROUGE et paraphe d'initiales), combinés aux trois lois immuables DSH. L'étape 5 bloque toute progression vers le récapitulatif tant que les champs requis ne sont pas valides.
6. **Porte de vérification en direct & Identifiants sécurisés (`setupReadinessPanel` / `welcomeGatePanel`)** :
   - Contrôle d'unicité du nom d'utilisateur insensible à la casse (`GET /api/setup/check-username` et `HTTP 409 ERR_USER_EXISTS` côté serveur) et rejet des identifiants système réservés (`admin`, `root`, `fanal`, etc.).
   - Exigence stricte de mot de passe (`>= 12` caractères, majuscule, minuscule, chiffre, caractère spécial, aucune répétition excessive ni inclusion du nom d'utilisateur ou de mots faibles) + champ de confirmation + bouton explicite **Afficher / Masquer les exigences** déployant la liste interactive à icônes dynamiques.
   - Liste de complétude pédagogique (`4/4` requis avant activation de `POST /api/setup` et de l'IPC Electron `leveilleux-setup`).
7. **Seconde porte de vérification (Post-création -> `#loginView`) et garde de réouverture** :
   - Après le scellement de `FANAL-CONSTITUTION-V2`, l'interface bascule explicitement vers `#loginView` avec le bandeau vérifié affichant le `genesisHash`. Le propriétaire se connecte immédiatement (`POST /api/login`), validant son mot de passe réel et l'intégrité de l'installation (`verification.verified === true`).
   - Au redémarrage de l'application, `GET /api/setup-status` (`serverSetupDone === true`) verrouille définitivement `showWizard()` et `#langStep` pour ne jamais relancer l'assistant d'installation sur un poste déjà configuré.
8. **Adaptation de l'interface selon l'échelle** :
   - En mode **Travailleur autonome** / **Microentreprise** : masquage des cartes d'équipe et du *Wallboard* (`#workersCard`, `#openWall`).
   - En mode **Entreprise / PME (`6+`)** : activation complète du registre d'équipe, des quarts et du *Wallboard* authentifié (`401` si non connecté sur `GET /api/wall`).

---

## 3. Vérification asynchrone zéro-PII vers Fanal Studio (`FANAL-INSTALL-ATTEST-V1`)

Pour permettre au fondateur de valider chaque nouvelle installation depuis **Fanal Studio** sans exiger de poste serveur allumé 24h/24 ni exposer de données client Loi 25 :

- **Côté Fanal (Client — `GET /api/installation/attestation`)** : génère et signe localement par **Ed25519** (`node:crypto`) un certificat JSON contenant uniquement `nodeId`, `publicKeyPem`, `genesisHash`, `constitutionSchema`, `scaleType`, `professionKey`/`sector`, `taxRegime`, `pricingFloorCad` et compteurs agrégés (**zéro nom propre, zéro courriel RPRP, zéro secret**).
- **Côté Fanal Studio (Fondateur — `POST /api/studio/verify-installation` & `approve`)** : vérifie de manière asynchrone la signature Ed25519 (**Logiciel**), exécute un contrôle de cohérence métier/fiscal (**IA**) et consigne la décision nominative du fondateur (**Humain**) dans `verified-installations.json`.

---

## 4. Empaquetage, vérification CI et signature numérique

### Chaîne de génération des installeurs (`tools/build-editions.mjs`)

- **macOS (`arm64` / `x64`)** : `node tools/sync-desktop.mjs --all && node tools/build-editions.mjs --all` génère `Fanal.app` + `.dmg` (édition client) et `Fanal Studio.app` + `.dmg` (édition fondateur), en embarquant `setup-validator.js` dans `apps/desktop/brain/` et `supervisor-pkg/`.
- **Windows (`x64`)** : construction via `electron-builder --win nsis` dans le flux CI `windows-latest`.
- **Porte de validation obligatoire avant toute livraison (`tools/check.sh`)** :
  1. `smoke-dashboard.js` : simulation DOM stricte des 10 langues, Constitution Fermée V2, porte `4/4`, bascule des 6 règles mot de passe, transition post-setup vers `#loginView`, garde `SERVER_SETUP_DONE`, et présence de `welcomeGatePanel` dans `welcome.html`.
  2. `audit-contrast.mjs` : audit automatisé Chrome CDP (WCAG `>= 4.5:1` / `3.0:1`, Delta-E `>= 18` sur les médaillons) sur 36 écrans client, Studio et Welcome Electron.
  3. `api-smoke.sh` : rejet `400` des configurations faibles/incomplètes, unicité insensible à la casse (`409`), `FANAL-CONSTITUTION-V2`, attestation zéro-PII `FANAL-INSTALL-ATTEST-V1`, vérification Ed25519 + rejet d'altération `400` + approbation humaine dans Studio, facturation `350 $` / `490 $`.
  4. `verify-app.sh` et `smoke-desktop.mjs --packed` : vérification des deux binaires macOS empaquetés sur ports isolés (`127.0.0.1`).

### Signature Apple & Microsoft

En attendant l'apposition des certificats définitifs *Apple Developer ID Application + Notarization* et *Microsoft Authenticode EV*, l'application macOS locale est signée ad hoc (`codesign --force --deep --sign -`) afin de préserver la cohérence du Trousseau (`safeStorage`) et l'amorçage biométrique.
