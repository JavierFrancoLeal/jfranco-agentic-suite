# OPERATIONS-MANUAL — Manuel des opérations, de la facturation et de la comptabilité (Trasunto inc.)

> **Analogie de service public :** Le client branche ses opérations dans Fanal comme on branche un appareil dans le mur ; Trasunto agit comme Hydro-Québec : les sous-clés, l'arbitrage DeepSeek/Gemini, les plafonds de sécurité et la résilience restent derrière le mur. Le client n'ouvre jamais de compte développeur cloud, ne configure jamais d'API et ne paie jamais de compteur anxiogène au jeton ou au dossier.

---

## 1. Architecture en arrière-plan (Hydro-Québec de l'IA)

1. **Deux comptes maîtres corporatifs uniquement** : un compte corporatif **DeepSeek** et un projet **Google Cloud (Gemini)** détenus par Trasunto inc. et payés par une seule carte corporative.
2. **Une sous-clé isolée par client avec plafond matériel strict (`5,00 $ USD/mois`)** : la consommation mensuelle réelle moyenne se situe entre `1,50 $` et `4,50 $ CAD` (`~1,07 $ à 3,21 $ USD`). En cas de vol d'ordinateur ou de compromission, la perte financière maximale théorique chez le fournisseur est bornée à `5 $ USD` et révocable en trois secondes.
3. **Chiffrement au repos et Voile Loi 25** : chaque sous-clé est chiffrée via AES-256-GCM et le trousseau du système d'exploitation (`safeStorage`). Les noms, téléphones et courriels issus de la mémoire locale sont remplacés par des jetons neutres (`[PER_1]`, `[TEL_1]`, `[COURRIEL_1]`) avant tout appel externe. L'accès est protégé dès l'installation par la politique informatique stricte (`>= 12` caractères, 4 classes, unicité des identifiants insensible à la casse) et par le scellement de la **Constitution Fermée V2 (`FANAL-CONSTITUTION-V2`)** incluant le régime fiscal (`< 30 000 $ petit fournisseur` ou `TPS/TVQ`), la désignation obligatoire du RPRP Loi 25 et l'attestation cryptographique **Ed25519 (`FANAL-INSTALL-ATTEST-V1`)**.
4. **Contrôle asynchrone des installations vers Fanal Studio (Zéro PC allumé 24/7)** :
   - **Niveau 1 (Bêta, `0 $/mois`)** : le client exporte son attestation signée **zéro-PII** (`GET /api/installation/attestation`), vérifiée de manière asynchrone dans **Fanal Studio** (`/api/studio/verify-installation`) selon la chaîne **Logiciel (`Ed25519` + zéro PII) + IA (cohérence secteur/régime fiscal/plancher) + Humain (approbation du fondateur)**.
   - **Niveau 2 (Échelle `15+` clients)** : dépôt asynchrone via boîte morte serverless chiffrée **X25519** sans serveur lourd ni machine personnelle laissée ouverte 24h/24.
5. **Compteur local silencieux (`billing_meter.json`)** : Fanal mesure le volume technique de jetons (contrôle interne des marges Trasunto) et le taux d'édition humaine sur chaque dossier signé pour calculer la **Garantie de Symétrie Mensuelle**.

---

## 2. Analyse économique des jetons et décision tarifaire : Forfait tout inclus (350 $/mois) vs Facturation par dossier (165 $ + 16 $/dossier)

### A. Calcul exact du coût en jetons par dossier signé

Base vérifiée ([`supervisor/pricing-catalog.json`](../supervisor/pricing-catalog.json) partagé avec `jfranco-deepseek-prices`, novembre 2026 ; taux de change conservateur **`1 $ USD = 1,40 $ CAD`**) :
- **`DeepSeek-Flash`** (tarif par 1M jetons USD) : CacheHit `0,003 $` creux / `0,006 $` pointe · CacheMiss `0,15 $` creux / `0,30 $` pointe · Sortie `0,60 $` creux / `1,20 $` pointe.
- **`DeepSeek-V4-Pro`** (tarif par 1M jetons USD) : CacheHit `0,022 $` creux / `0,044 $` pointe · CacheMiss `0,66 $` creux / `1,32 $` pointe · Sortie `1,98 $` creux / `3,96 $` pointe.
- **Interprète comptoir A2DP (`gemini-3.5-live-translate-preview`)** : `~0,023 $ USD/minute active` (plafonné par défaut à `30 min/jour` avec jetons éphémères à usage unique sans exposer la clé Gemini côté client).
- **Avantage horaire Québec (`UTC-5`)** : les heures ouvrables québécoises (`08h00–18h00 EST`, soit `13h00–23h00 UTC`) tombent à **100 % hors des fenêtres de pointe DeepSeek** (`01h00–04h00 UTC` et `06h00–10h00 UTC`), offrant automatiquement **50 % de rabais** sur les tarifs nuagiques.

| Scénario de dossier signé | Profil de jetons consommés | Coût USD (heures QC / pointe) | Coût réel CAD (`× 1,40`) |
| :--- | :--- | :--- | :--- |
| **1. Dossier courant (Flash)** | `4k` cache + `8k` miss + `2k` sortie | `0,00241 $` (creux) · `0,00482 $` (pointe) | **`0,0034 $` – `0,0068 $ CAD`** |
| **2. Dossier complexe Juridique/CPA (2× Flash + 1× V4-Pro)** | `13k` cache + `40k` miss + `8k` sortie | `0,02665 $` (creux) · `0,05331 $` (pointe) | **`0,0373 $` – `0,0746 $ CAD`** |
| **3. Dossier multimodal lourd (OCR Gemini + V4-Pro)** | `30k` in / `3k` out Gemini + `V4-Pro` | `0,05896 $` (pire cas pointe) | **`0,0825 $ CAD`** |

### B. Faut-il facturer à la pièce (`165 $ + 16 $/dossier`) ou inclure les dossiers dans le forfait `350 $/mois` ? Faut-il augmenter au-dessus de `350 $` ?

| Volume mensuel | Ancien modèle (`165 $ + 16 $/dossier`) | Forfait Solo Tout Inclus (`350 $`) | Coût API + PAD bancaire (`1,50 $`) | Marge nette sur coûts variables |
| :--- | :--- | :--- | :--- | :--- |
| `5` dossiers/mois | `245,00 $` | `350,00 $` | `2,33 $` | **`347,67 $ (99,34 %)`** |
| `10` dossiers/mois | `325,00 $` | `350,00 $` | `2,45 $` | **`347,55 $ (99,30 %)`** |
| `12` dossiers/mois | `357,00 $` | `350,00 $` | `2,50 $` | **`347,50 $ (99,29 %)`** |
| `15` dossiers/mois | `405,00 $` | `350,00 $` | `2,58 $` | **`347,42 $ (99,26 %)`** |
| `25` dossiers/mois | `565,00 $` | `350,00 $` | `2,83 $` | **`347,17 $ (99,19 %)`** |
| `40` dossiers/mois *(exemple à fort volume)* | `805,00 $` | `350,00 $` | `3,21 $` | **`346,79 $ (99,08 %)`** |

**Décision stratégique et mathématique tranchée (Buffet Fixe Pur) :**
1. **NON à la facturation à l'acte et NON à tout plafond artificiel de « 40 dossiers »** : le seuil d'équivalence arithmétique se situe à **`11,56 dossiers/mois`**, mais imposer une surtaxe ou un quota couperet crée une *« anxiété du compteur »* qui freine l'adoption quotidienne. Avec le modèle **Buffet Fixe Pur (`PURE_FIXED_BUFFET_MONTHLY`)**, tous les dossiers du dirigeant sont inclus sans décompte commercial.
2. **Protection économique par mutualisation et garde-fous techniques** : même à très fort volume mensuel, le forfait Solo à `350 $/mois` (`490 $/mois` pour Équipe) conserve une marge sur coûts variables supérieure à **`98,8 %`** grâce à la mutualisation de cohorte (`p50` observé entre `1,50 $` et `4,00 $ CAD/mois`), au routage *DeepSeek-Flash* prioritaire et au plafond technique de `5,00 $ USD/mois` sur chaque sous-clé BYOK. Les données de télémétrie agrégées (`usage-telemetry.js`, `p50`/`p90` par modèle, tâche et acteur pseudonymisé) servent à calibrer objectivement la grille post-Bêta sans pénaliser les clients actifs.
3. **Comment garder la « peau dans le jeu » sans péage unitaire ?** Par la **Garantie de Symétrie Mensuelle** intégrée dans [`buildMonthlyClientInvoice`](../supervisor/server.js) : lorsque le client signe au moins 3 dossiers dans le mois, si l'écart moyen de correction humaine dépasse **`25 %`**, un crédit automatique de **`50 %`** s'applique sur la mensualité ; au-delà de **`35 %`**, la mensualité passe à **`0 $` (crédit de `100 %`)**.

---

## 3. Grille tarifaire officielle et processus de facturation mensuelle

| Forfait | Cible structurelle | Implantation (Mois 1) | Mensualité HT | Mensualité TTC Québec (TPS 5 % + TVQ 9,975 %) |
| :--- | :--- | :--- | :--- | :--- |
| **Fanal Solo** | Travailleur autonome / métier reconnu Québec (`1 personne`, buffet illimité `0 $/dossier`) | `500,00 $` *(Bêta fondateurs : `350,00 $`)* | **`350,00 $`** | **`402,41 $`** |
| **Fanal Équipe** | Microentreprise (2–5) ou PME / Cellule (6–35 personnes, volume d'équipe inclus) | `950,00 $` *(Bêta fondateurs : `750,00 $`)* | **`490,00 $`** | **`563,38 $`** |
| **Hub Fiduciaire `.fanal`** | Réseau multi-dossiers haute conformité / cabinets comptables & juridiques | `1 200,00 $` | **`650,00 $`** | **`747,34 $`** |

### Routine mensuelle de facturation (le 1er de chaque mois)

1. **Lecture des compteurs et calcul des taxes** : appel à `/api/invoice` (`buildMonthlyClientInvoice`) générant la ventilation par client (mensualité de base, nombre de dossiers inclus à `0 $/dossier`, écart moyen d'édition, crédit de symétrie éventuel, sous-total HT, **TPS 5 %**, **TVQ 9,975 %**, total TTC).
2. **Encaissement par Prélèvement Préautorisé (PAD / TEF bancaire)** : frais fixes de **`1,50 $` par transaction** (contre `~11,97 $` à `16,64 $` sur carte de crédit à `2,9 % + 0,30 $`).
3. **Émission du PDF justificatif** : envoi automatisé au dirigeant et classement dans le grand livre.

---

## 4. Gestion de l'entreprise et comptabilité québécoise (Règle des 2 comptes)

Trasunto inc. applique la discipline stricte des **deux comptes bancaires séparés** dès l'encaissement du moindre dollar :

1. **Compte A — Fiducie fiscale et réserves obligatoires** : dès qu'un paiement client TTC est encaissé (ex. `402,41 $` Solo), le virement automatique isole immédiatement :
   - La **TPS perçue (`17,50 $`)** et la **TVQ perçue (`34,91 $`)**, diminuées des intrants (CTI/RTI) admissibles ;
   - Une **provision pour impôt des sociétés PME (`~18 %` prudent du bénéfice estimé, couvrant largement le taux réel combiné Québec/Fédéral de `~12,2 %` grâce à la Déduction pour petite entreprise)** ;
   - Aucune dépense opérationnelle ne puise jamais dans le Compte A.
2. **Compte B — Exploitation courante et croissance** : reçoit les sommes nettes d'impôts et taxes (`~82 %` du bénéfice opérationnel + couverture des charges fixes). Permet à tout instant de connaître la trésorerie réellement disponible sans mauvaise surprise lors de la remise trimestrielle/annuelle à **Revenu Québec** et à l'**ARC**.
3. **Clôture annuelle CPA en un fichier (`exportAccountingCsv`)** : exportation annuelle du journal normalisé compatible **Acomba / QuickBooks**, incluant le registre complet des factures émises, des prélèvements PAD, des crédits de symétrie accordés et des factures fournisseurs d'API.

---

## 5. Sécurité, confidentialité et Sortie Honorable (Loi 25)

- **Protection d'écran et Coffre** : sur macOS et Windows, `setContentProtection(true)` empêche la capture des fenêtres sensibles ; toute inactivité ou fermeture d'écran purge la clé AES-256-GCM de la RAM et fige l'interface derrière l'écran de déverrouillage `scrypt` / biométrique. Un registre d'incidents (`registre_incidents_loi25.jsonl`) trace toute tentative d'accès répétée (à partir du 3e échec avec délai exponentiel jusqu'à `3 600 s`) sans jamais consigner le mot de passe saisi.
- **Support aveugle sans exposition de données** : les exports techniques (`.md` / `.json`) transmis vers **Fanal Studio** subissent un caviardage déterministe retirant noms propres, chemins locaux, courriels, téléphones et clés API.
- **Sortie Honorable en un clic** : la désinstallation génère une archive complète lisible sur le Bureau (rapports PDF, journaux CSV comptables, `ledger.jsonl` en clair), révoque instantanément la sous-clé API corporative, purge le coffre et consigne le certificat final de destruction conforme Loi 25. Aucun verrouillage propriétaire (*zero lock-in*).
