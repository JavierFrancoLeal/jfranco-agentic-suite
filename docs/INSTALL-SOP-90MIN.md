# INSTALL-SOP-90MIN — Protocole d'implantation client calibré (30 à 90 minutes)

Ce protocole régit l'activation standardisée sur place ou à distance d'un nouveau client **Fanal Solo** ou **Fanal Équipe** par Trasunto inc. Règle d'or absolue : **le dirigeant saisit lui-même ses coordonnées légales, son responsable Loi 25, ses règles constitutionnelles fermées et son mot de passe sur son propre clavier**, afin d'établir la coresponsabilité cryptographique dès la première minute.

---

## 0. Analyse comparative SaaS et calibrage du protocole

Pour valider la pertinence du protocole d'implantation Trasunto avant l'ouverture de la cohorte Bêta, quatre modèles de référence de l'industrie ont été évalués :

| Référent SaaS | Pratique retenue dans Fanal | Anti-modèle écarté dans Fanal | Calibration spécifique au marché québécois |
| :--- | :--- | :--- | :--- |
| **Linear / Notion** | Divulgation progressive par étape (`8 étapes`), valeurs suggérées selon le profil métier. | Création d'espace vide avec invites génériques non guidées. | Cascade **Boîte 1 (`Solo / Micro / PME`) → Boîte 2 (`11 métiers autonomes` ou `11 secteurs SCIAN`)**. |
| **Clio / Lightspeed / QuickBooks** | Saisie structurée de la raison sociale, de l'impôt/taxe et des règles d'escompte dès l'ouverture. | Imposer TPS/TVQ aux travailleurs autonomes sous le seuil légal. | Régime fiscal fermé **`PETIT_FOURNISSEUR_EXEMPT (< 30 000 $ CAD)`** vs **`INSCRIT_TPS_TVQ`** (`NEQ` `11/22/33/88+8`, `TPS RT`, `TVQ TQ`). |
| **1Password Business** | Politique mot de passe informatique stricte (`>= 12` car., 4 classes, anti-collision utilisateur) et scellement local du coffre. | Laisser passer un mot de passe faible (`< 12` car.) ou contenant l'identifiant. | Validateur partagé navigateur/serveur [`setup-validator.js`](../supervisor/setup-validator.js) + bouton explicite d'affichage des 6 critères en direct. |
| **Stripe Connect** | Liste de vérification de complétude (`4/4 requis` + clé BYOK clairement marquée *Optionnelle*) et jeton d'attestation vérifié après configuration. | Connecter le client directement sans test réel de son nouveau mot de passe. | Redirection post-création vers `#loginView` avec bandeau vérifié, connexion immédiate avec empreinte de genèse et certificat zéro-PII **`FANAL-INSTALL-ATTEST-V1`**. |

### Calibration temporelle par voie opérationnelle

- **Voie Solo (`AUTONOMOUS_SOLO` — 25 à 30 minutes)** : 1 ordinateur, 1 dirigeant, aucune gestion de quarts ni d'employés. La Constitution est scellée avec le plancher matériel recommandé du métier (ex. `250 $ CAD` CPA/CRIC, régime `< 30 000 $` par défaut si applicable).
- **Voie Équipe (`MICRO_SINGLE_OWNER` / `SME_CELL` — 60 à 90 minutes)** : poste principal + formation d'équipe, contrôle des rôles (`owner` / `lead` / `employee`) avec unicité des identifiants insensible à la casse (`HTTP 409`), activation du *Wallboard* authentifié et test IMAP multi-dossiers.

---

## 1. Architecture de la Constitution Fermée (`FANAL-CONSTITUTION-V2`)

À l'instar de la séparation constitutionnelle du socle DSH (`PROTOCOLO.md`, `decisions.md`, `FONDATEUR-CONSTITUTION.md`), la saisie libre ambiguë par zone de texte ouverte est remplacée par une **charte fermée déterministe** combinant trois lois immuables système et huit paramètres clients vérifiés :

### A. Trois lois immuables (verrouillées par le moteur)
1. **`LAW_01_NO_FABRICATION`** : aucune donnée, tarif, texte de loi ou référence de dossier inventé — toute zone d'ombre déclenche un arrêt **ROUGE**.
2. **`LAW_02_FLOOR_AND_SIGNATURE`** : le plancher économique (`pricingFloorCad`) et tout rabais hors grille exigent une signature humaine explicite.
3. **`LAW_03_LOI25_LOCAL_VAULT`** : souveraineté locale et Voile Loi 25 actifs — aucune PII ni clé BYOK ne quitte le coffre local sans expurgation vérifiée.

### B. Huit champs fermés obligatoires (validés avant création du propriétaire)
1. **Raison sociale officielle (`bizName`)** (`2..120` caractères).
2. **Régime fiscal Québec (`taxRegime`)** : choix binaire fermé `PETIT_FOURNISSEUR_EXEMPT (< 30 000 $ CAD)` ou `INSCRIT_TPS_TVQ` (déclenchant la validation stricte de `tpsNumber` `/^\d{9}RT\d{4}$/` et `tvqNumber` `/^\d{10}TQ\d{4}$/`, plus `NEQ` optionnel `/^(11|22|33|88)\d{8}$/`).
3. **Responsable Loi 25 (`rprpName` + `rprpEmail`)** : désignation nominative et courriel officiel du RPRP obligatoires dès le démarrage.
4. **Registre du Répondant (`toneRegister`)** : liste fermée (`VOUVOIEMENT_CHALEUREUX`, `TUTOIEMENT_PROCHE`, `FORMEL_FIDUCIAIRE`).
5. **Plancher matériel (`pricingFloorCad`)** : montant plancher strictement positif (`> 0 $ CAD`), pré-calibré par métier/échelle.
6. **Politique d'escompte (`discountPolicy`)** : choix fermé (`LOCKED_0_PCT`, `TIERED_MAX_5_PCT`, `TIERED_MAX_10_PCT`).
7. **Déclencheurs ROUGES d'escalade (`escalationRules`)** : au moins une case cochée parmi `RED_PROMISE_DEADLINE`, `RED_REFUND_OVER_FLOOR`, `RED_LEGAL_MEDICAL_OPINION`, `RED_EXTERNAL_COMMITMENT`.
8. **Paraphe fondateur / dirigeant (`signerInitials`)** (`2..16` caractères alphanumériques majuscules) produisant le `genesisHash` SHA-256 du fichier scellé.

---

## 2. Séquence d'implantation étape par étape (Double porte vérifiée)

### Phase 1 — Pré-visite administrative et préparation (0 à 10 min)
1. Vérification du poste macOS (Apple Silicon / Intel) ou Windows 10/11 du client (`~85 Mo` RAM, aucun GPU ni serveur Ollama requis).
2. Préparation par le client de sa raison sociale, de son statut fiscal (`< 30 000 $` ou numéros TPS/TVQ + NEQ), des coordonnées de son RPRP Loi 25 et signature du mandat bancaire **PAD / TEF** (`1,50 $` fixe vs `2,9 % + 0,30 $`).

### Phase 2 — Installation guidée & Porte de complétude (`4/4` obligatoires) (10 à 35/50 min)
1. Lancement de `Fanal.app` (ou `Fanal-Setup.exe`) sans terminal exposé.
2. **Parcours des 8 étapes du Wizard** (langue `10/10`, structure + métier/secteur en cascade, sous-clés optionnelles DeepSeek/Gemini + coffre biométrique, autorisations OS, **Constitution Fermée V2**, récapitulatif).
3. **Porte de validation en direct (`setupReadinessPanel`)** :
   - `[1]` **Langue** confirmée.
   - `[2]` **Structure (`AUTONOMOUS_SOLO` / `MICRO_SINGLE_OWNER` / `SME_CELL`) + Métier/Secteur** vérifiés.
   - `[3]` **Identité + RPRP Loi 25 + Constitution Fermée V2** valides.
   - `[4]` **Identifiant propriétaire unique + Mot de passe informatique (`>= 12` car.) + Confirmation** vérifiés en direct (`setupUser` contrôlé via `/api/setup/check-username`, blocage des noms réservés et doublons insensibles à la casse `HTTP 409`, bouton **Afficher / Masquer les exigences** déployant les 6 critères avec icônes dynamiques).
   - `[Optionnel]` **Coffre clé IA BYOK** : badgé *Optionnel* pour ne jamais bloquer le démarrage déterministe hors nuage.
4. **Seconde porte de vérification (Post-création -> `#loginView`)** : une fois la Constitution scellée (`FANAL-CONSTITUTION-V2`), Fanal bascule vers l'écran de connexion avec le bandeau de confirmation (`genesisHash`) et demande au propriétaire de **saisir son nouveau mot de passe sur `#loginBtn`**. La réponse `POST /api/login` confirme l'intégrité des identifiants et de la genèse scellée ; `SERVER_SETUP_DONE` verrouille ensuite définitivement `#wizardView` au redémarrage.

### Phase 3 — Essais terrain et formation dirigeant (35 à 75 min selon voie)
1. **Test Action Panel & Voile PII** : simulation d'appel, capture comptoir ou dépôt dans `Fanal-Inbox` (ADF `.pdf`/`.jpg`, audio VoIP `.mp3`/`.wav`, ou rapport Z POS `.csv`), contrôle des marqueurs verts/jaunes/rouges, validation arithmétique `TPS 5 % + TVQ 9,975 %` et vérification du micro fixe + sortie écouteurs Bluetooth A2DP (si l'interprète comptoir est activé).
2. **Configuration sectorielle d'affluence (Restauration / Tourisme / Hôtellerie / Agro)** : paramétrage optionnel de la zone géographique (`lat`/`lon`), du corridor routier et du plafond quotidien d'interprète (`30 min/jour` par défaut). Le pilote navigateur CDP reste désactivé par défaut (`experimental_pilot_suspended`).
3. **Enregistrement d'équipe (Voie Équipe)** : création des comptes `lead` / `employee` soumis aux mêmes règles strictes d'unicité insensible à la casse (`409`) et de robustesse de mot de passe (`>= 12` car.).

### Phase 4 — Vérification asynchrone Fanal Studio sans serveur 24/7 (Dernières 10 min)
1. Dans **Réglages → Attestation d'installation (`#installAttestCard`)**, Fanal génère localement un certificat **`FANAL-INSTALL-ATTEST-V1`** signé **Ed25519** ne contenant **aucune PII** (zéro courriel, zéro nom de personne, zéro clé secrète : uniquement empreinte `nodeId`, `genesisHash`, `scaleType`, `professionKey`/`sector`, `taxRegime`, plancher et règles activées).
2. Le client ou l'implantateur transmet ce court JSON vers **Fanal Studio** (`/api/studio/verify-installation` dans `#studioVerifierCard`) au moment opportun, **sans qu'aucun ordinateur du fondateur ni serveur lourd ne reste allumé 24/7** :
   - **Couche Logiciel** : vérification cryptographique de la signature Ed25519 + contrôle d'absence totale de PII.
   - **Couche IA / Cohérence** : audit déterministe de cohérence secteur / régime fiscal / plancher matériel.
   - **Couche Humaine** : approbation nominative du fondateur (`APPROVED` ou `FOLLOW_UP_NEEDED`) dans `verified-installations.json`.
3. Remise du résumé d'implantation au tarif transparent **Buffet Fixe Pur** (**`350,00 $ CAD/mois` HT** en Solo, **`490,00 $ CAD/mois` HT** en Équipe, zéro frais par dossier).
