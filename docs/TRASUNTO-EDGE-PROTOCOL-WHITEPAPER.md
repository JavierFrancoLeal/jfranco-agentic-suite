# TECP-v1 — Trasunto Edge Compliance Protocol & Hardware-Reuse Architecture
## Protocole de conformité en périphérie et valorisation du matériel existant (Spécification technique de divulgation ouverte · Référence Zenodo DOI)

- **Identifiant de spécification :** `TECP-v1` (`FANAL-CONSTITUTION-V2` + `FANAL-INSTALL-ATTEST-V1` + `FANAL-AFFLUENCE-V1`)
- **Auteur & Entité :** Javier Franco Leal (`J.Franco`) — **Trasunto inc.**, Charlevoix (Québec), Canada
- **Date de publication technique :** Novembre 2026
- **Objet juridique :** Création d'antériorité publique (*defensive prior art* pour dépôt Zenodo DOI) et démarcation claire entre le socle protocolaire ouvert (**Open-Core `TECP-v1`**) et les couches commerciales propriétaires (**Fanal**, **Fanal Studio** et **Hub Fiduciaire**).

---

## Résumé exécutif (FR) / Abstract (EN)

**FR —** Les PME et travailleurs autonomes sont confrontés à une double impasse face à l'IA générative : d'une part, des assistants en nuage centralisés qui aspirent des renseignements personnels (Loi 25, secret professionnel CPA/Barreau) et coûtent cher en jetons non bornés ; d'autre part, des solutions matérielles dédiées (lunettes intelligentes, terminaux propriétaires, serveurs GPU locaux) imposant de nouvelles dépenses d'investissement. **`TECP-v1`** formalise un modèle architectural réplicable reposant sur quatre invariants : **(1) règles constitutionnelles déterministes vérifiées avant toute inférence**, **(2) pseudonymisation locale en périphérie (Voile PII)**, **(3) arbitrage multi-LLM asynchrone et plafonné (`DeepSeek` + `Gemini`)** et **(4) signature humaine cryptographique (`Ed25519` zéro-PII)**. En parallèle, l'architecture exploite exclusivement l'infrastructure déjà présente dans le commerce (**PC/Webcam existants, écouteurs Bluetooth en mode A2DP découplé, numériseur ADF de bureau, pièce jointe audio VoIP et rapport Z MEV-WEB**) avec **zéro achat matériel obligatoire**.

**EN —** Regulated solo practitioners and SMBs face a structural dilemma when adopting generative AI: centralized SaaS copilots expose sensitive client PII (Quebec Law 25, CPA/legal secrecy) behind unbounded token bills, whereas dedicated AI hardware requires unwanted CapEx. **`TECP-v1`** specifies a deterministic-first edge protocol uniting four primitives: **(1) closed constitutional guardrails before LLM inference**, **(2) local PII anonymization veil at the edge**, **(3) low-cost dual-LLM routing (`DeepSeek` + `Gemini`) protected by hardware-capped BYOK sub-keys**, and **(4) mandatory human sign-off backed by zero-PII `Ed25519` installation attestations**. Crucially, five zero-CapEx hardware adapters repurpose existing counter equipment (fixed PC microphone + Bluetooth A2DP stereo earbuds, office ADF scanners, VoIP PBX `.mp3`/`.wav` voicemails, counter USB webcams, and certified MEV-WEB POS Z-exports).

---

## 1. Architecture canonique `TECP-v1` (Socle Trasunto)

| Couche | Exécution locale ou nuage | Rôle déterministe / inférentiel | Artefact vérifiable dans ce dépôt |
| :--- | :--- | :--- | :--- |
| **L1 — Gouvernance fermée** | Local (`127.0.0.1`, `Node.js`) | Valide identifiants (`>= 12` car., `409`), régime fiscal QC (`< 30 000 $` vs `TPS/TVQ`), RPRP Loi 25, plancher CAD et 3 lois immuables avant tout démarrage. | [`supervisor/setup-validator.js`](../supervisor/setup-validator.js) |
| **L2 — Voile PII & Coffre** | Local (`scrypt + AES-256-GCM` + `safeStorage`) | Chiffre les sous-clés BYOK au repos ; remplace noms, courriels et téléphones par `[PER_1]`, `[COURRIEL_1]`, `[TEL_1]` avant toute sortie réseau. | [`supervisor/server.js`](../supervisor/server.js) · [`apps/desktop/vault-ipc.js`](../apps/desktop/vault-ipc.js) |
| **L3 — Arbitrage Dual-LLM** | Nuage éphémère (`DeepSeek-Flash`, `V4-Pro`, `Gemini 3.8 Flash`, `Gemini 3.5 Live Translate Preview`) | Cache `store: false` sur Interactions API ; catalogue unifié [`pricing-catalog.json`](../supervisor/pricing-catalog.json) partagé avec `jfranco-deepseek-prices` ; plafond technique `5 $ USD/mois`. | [`supervisor/usage-telemetry.js`](../supervisor/usage-telemetry.js) · [`supervisor/multimodal-bridge.js`](../supervisor/multimodal-bridge.js) |
| **L4 — Preuve zéro-PII asynchrone** | Local (`Ed25519`) → Studio / Futur relais `X25519` | Génère `FANAL-INSTALL-ATTEST-V1` (aucune PII) vérifié hors ligne 24/7 par **Fanal Studio** : couche Logiciel (`Ed25519`), couche IA (cohérence), couche Humain (`APPROVED`). | [`supervisor/server.js`](../supervisor/server.js) |

---

## 2. Les 5 leviers matériels à 0 $ d'investissement additionnel (*Zero-New-Hardware*)

Plutôt que de forcer le client à acheter des lunettes intelligentes ou du matériel propriétaire :

1. **Interprète de comptoir découplé (Micro PC fixe + Écouteurs Bluetooth A2DP) :**
   - **Problème résolu :** Sur macOS/Windows, utiliser simultanément le micro et le haut-parleur d'un même casque Bluetooth bascule le profil audio en **HFP/HSP mono `8–16 kHz`**, dégradant voix et intelligibilité, et `window.SpeechRecognition` est bloqué dans Electron sans service propriétaire.
   - **Solution `TECP-v1` :** Captation par le **micro fixe du comptoir / webcam (`16 kHz` PCM)** + restitution via **écouteurs Bluetooth déjà possédés forcés en sortie stéréo A2DP (`AudioContext.setSinkId()`)**, alimentés par jetons éphémères à usage unique (`POST /api/counter-interpreter/token` → `v1beta/auth_tokens` verrouillant `gemini-3.5-live-translate-preview`) et plafonnés par un compteur quotidien configurable (`30 min/jour` par défaut) afin de préserver la limite `5 $ USD/mois`.
2. **Numériseur ADF de bureau (PDF/PNG/JPG) → Pré-triage comptable déterministe :**
   - **Chaîne :** Dépôt dans `Fanal-Inbox` → analyse multimodale `gemini-3.8-flash` (`store: false`) → **contrôle arithmétique déterministe TPS `5 %` / TVQ `9,975 %` (`verifyQuebecInvoiceMath`)** déclenchant une alerte **ROUGE** si l'écart dépasse `0,05 $ CAD`.
3. **Boîte vocale PBX / VoIP existante (`.mp3`/`.wav`/`.m4a`/`.ogg` par courriel IMAP) :**
   - Extraction des pièces jointes audio multiparts dans [`intake-engine.js`](../supervisor/intake-engine.js) sans modifier le drapeau `Seen` IMAP, suivie d'un triage multimodal et du chaînage **Le Téléphoniste**.
4. **Webcam USB ou portable existante (`POST /api/intake/webcam`) :**
   - Capture ponctuelle d'une facture comptoir ou fiche papier depuis Le Secrétaire → OCR + contrôle `TPS/TVQ`.
5. **Tiroir-caisse / TPV certifié MEV-WEB existant (`POST /api/register/import-z`) :**
   - Remplacement de la double saisie manuelle de caisse par l'import passif de rapports Z (`.csv`/`.tsv`/`.txt` dans `parsePosZReport`, **`0` jeton LLM**), alimentant automatiquement la base historique de l'outil d'affluence régionale.

---

## 3. Remplacement de l'alerte météo statique par l'Affluence Régionale (`FANAL-AFFLUENCE-V1`)

L'ancienne alerte fixe `weatherCheck` codée en dur sur `47.66, -70.15` (Charlevoix) pour tous les clients est **retirée du socle universel** et transformée en module ciblé [`affluence-forecast.js`](../supervisor/affluence-forecast.js) actif uniquement pour les secteurs dépendants du flux touristique (`restaurant`, `tourisme`, `hotel`, `agroalimentaire`) :

- **Signaux combinés :** Météo paramétrable (`Open-Meteo` sur coordonnées du client), calendrier touristique québécois (week-ends, fériés `24 juin` / `1er juillet`, Vacances de la construction, couleurs d'automne, relâche), moyenne historique locale issue des rapports Z importés, et vérification **strictement éphémère** du corridor routier via Google Maps Routes API (`routes:computeRoutes`).
- **Conformité stricte Conditions Google Maps :** Zéro *scraping* des heures d'achalandage (*Popular Times*), et **aucune mise en cache ni écriture sur disque** des durées ou congestions routières retournées par Google (`transient: true, cached: false`).
- **Pilotage navigateur CDP (`/api/browser/*`) :** Suspendu par défaut (`HTTP 403 experimental_pilot_suspended` sauf `FANAL_EXPERIMENTAL_BROWSER_PILOT=1`), conservant le module CDP avec badge visible comme précédent technique sans exposer les PME à la maintenance de sélecteurs tiers fragiles.

---

## 4. Stratégie de propriété intellectuelle, antériorité et monétisation

| Actif | Mécanisme de protection | Périmètre & Licence | Objectif commercial Trasunto inc. |
| :--- | :--- | :--- | :--- |
| **Protocole `TECP-v1` + Noyau** | Publication datée avec **DOI Zenodo** + dépôt Git public horodaté | Spécification ouverte / socle modulaire réutilisable dans les apps Trasunto (`pricing-catalog.json`, `setup-validator.js`, `usage-telemetry.js`, garde WCAG/CIELAB) | Crée une antériorité opposable empêchant un tiers de breveter la boucle locale Voile Loi 25 + Dual-LLM + Signature ; positionne Trasunto comme créateur du standard. |
| **Marques *Trasunto* & *Fanal*** | Dépôt de marque de commerce auprès de l'**OPIC / CIPO** (Canada, classe 9 logiciel & 42 SaaS) | Propriétaire — **Trasunto inc.** | Protège l'identité commerciale, la réputation de fiabilité et la distribution macOS/Windows signée (`Fanal`, `Fanal Studio`). |
| **Produits commerciaux & Opérations** | **Open-Core** : socle protocole ouvert, distribution clé en main, coffre chiffré, intégrations POS/MEV-WEB, télémétrie & **Hub Fiduciaire** propriétaires | **Solo `350 $/mois`**, **Équipe `490 $/mois`**, **Hub Fiduciaire `.fanal` `650 $/mois`** *(Buffet Fixe Pur, zéro frais/dossier)* | Les cabinets et PME paient pour l'exécution zéro-friction (`30–90 min`), la conformité Loi 25 opposable, la Garantie de Symétrie (`-50 %`/`-100 %`) et la vérification asynchrone Studio — jamais pour la complexité d'assembler eux-mêmes les briques. |
