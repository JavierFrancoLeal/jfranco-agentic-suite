# MICRO-MARKET — Travailleurs autonomes et micro-opérateurs à fort levier (`1:300`)

Une lecture traditionnelle par « nombre d'employés » masque l'un des segments les plus rentables du Québec : le **micro-opérateur à fort levier**, où une seule personne gouverne `40 à 300` clients, locataires, membres ou dossiers actifs tout en assumant seul la charge administrative nocturne.

---

## 1. Les 8 profils cibles prioritaires (« Fanal Solo » à 350 $/mois)

1. **Professionnels libéraux autonomes (CPA, avocats, consultants CRIC)** — préparation de dossiers, pré-vérification réglementaire et relances honoraires sous secret professionnel.
2. **Centres d'entraînement / Yoga / CrossFit (`1:250` membres)** — calculs de résiliation conformes à la Loi sur la protection du consommateur (`OPC`), fiches Q-AAP sous Loi 25, réponses hors heures.
3. **Propriétaires de plex et micro-gestionnaires (`1:40` logements)** — avis de renouvellement `TAL`, Relevés 31, filtrage des urgences de plomberie à minuit.
4. **Services de garde en milieu familial RSGE (`1:9` familles)** — registres ministériels, fiches d'allergies et protection stricte des données de mineurs.
5. **Petites résidences privées pour aînés RPA (`1:15` résidents)** — audits `CISSS`, consignes de relève et réponses aux familles.
6. **Hébergements touristiques et chalets CITQ (`1:12` unités)** — messagerie multilingue en 10 langues à `23h00` et dossiers de réclamation bris.
7. **Écoles de conduite, tutorat et académies (`1:120` élèves)** — contrats `SAAQ`, reprogrammations et suivi des paiements.
8. **Cliniques d'esthétique médicale, massothérapie et podiatrie (`1:180` clients)** — reçus d'assurance, consentements éclairés et saisie vocale mains occupées.

---

## 2. Un seul exécutable adaptatif (`uiProfile`), zéro matériel supplémentaire

Il n'est **pas nécessaire** de maintenir deux applications client distinctes pour les travailleurs autonomes versus les PME :

- **Topologie dynamique (`AUTONOMOUS_SOLO` / `MICRO_SINGLE_OWNER` / `SME_CELL`)** : lorsque `staffCount === 1` ou `scaleType === "AUTONOMOUS_SOLO"`, Fanal active automatiquement `topologyMode: "SOLO"`, masque les tableaux d'employés, les quarts de travail et le *Tableau en direct*, et recentre tout le poste de pilotage sur la boîte de décision (*Inbox-First*), *Le Téléphoniste*, *Le Répondant* et les dossiers clients.
- **Zéro matériel requis (fermeture d'Ollama)** : le Voile PII Loi 25 et les validateurs déterministes fonctionnent en Node.js pur (`~85 Mo` RAM, `0,2 ms` CPU) sur l'ordinateur actuel du client. Aucune carte graphique, aucun serveur local lourd : l'intelligence passe par le **Cerveau Dual Fermé** (`DeepSeek + Gemini`) derrière le Voile PII.

---

## 3. Triage fiduciaire avec épinglage littéral (`sourcePin`)

Le professionnel autonome ne doit jamais relire 40 pages générées sans repères :

- **Socle Vert (déterministe)** : agrégation mathématique vérifiée au sou près (ex. `48` factures vérifiées).
- **Apex Jaunes (`sourcePin`)** : `3 à 5` points d'attention critiques accompagnés de l'extrait **mot pour mot** du document source vérifié caractère par caractère (toute paraphrase non vérifiée bascule automatiquement en **Rouge**).
- **Preuve de diligence horodatée** : le raccourci de signature demeure verrouillé tant que chaque apex jaune n'a pas été consulté, créant une piste d'audit défendable devant tout ordre professionnel en `45 à 90 secondes` par dossier au lieu de `35 à 50 minutes`.
