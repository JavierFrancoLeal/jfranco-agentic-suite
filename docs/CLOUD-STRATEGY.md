# Stratégie infonuagique et vérification asynchrone sans serveur 24/7 (Fanal & Fanal Studio)

Les essais terrain ont exposé une famille d'incidents récurrents : perte de lien LAN sur téléphone (`HTTPS-Only`), expiration de tunnels gratuits (`~2 h`), mise en veille d'un portable durant une démonstration, et contrainte opérationnelle de ne pas maintenir d'ordinateur personnel ou de serveur lourd allumé en continu 24h/24 pour contrôler les installations clients.

Constat clé : **toutes ces pannes provenaient du besoin d'une connexion synchrone directe vers une machine locale**. Le moteur local (DSH + plugins + superviseur) n'a jamais failli.

---

## 1. Principe directeur : zéro machine personnelle allumée 24/7

L'architecture de déploiement et de contrôle vers **Fanal Studio** est conçue pour être **antifragile et asynchrone** dès le premier client :

1. **Souveraineté d'exécution chez le client (`85 Mo` RAM)** : tout le travail opérationnel (Voile PII Loi 25, Constitution Fermée V2, Caisse Z, Secrétaire, Téléphoniste) s'exécute localement sur le poste du client, avec persistance autonome même hors ligne.
2. **Preuve cryptographique asynchrone (`FANAL-INSTALL-ATTEST-V1`)** : la vérification d'une installation dans **Fanal Studio** ne dépend d'aucune connexion permanente entre le poste du client et celui du fondateur.

---

## 2. Vérification d'installation vers Fanal Studio : Niveau 1 (Bêta) et Niveau 2 (Croissance)

| Palier | Capacité | Infrastructure & Coût récurrent | Mécanisme cryptographique (Chaîne Logiciel + IA + Humain) | Exposition de PII client |
| :--- | :--- | :--- | :--- | :--- |
| **Niveau 1 — Bêta (0 à 14 clients)** *(Implémenté)* | Vérification asynchrone directe sans serveur central | **Aucun serveur 24/7 · `0,00 $ CAD/mois`** | 1. Côté client : `GET /api/installation/attestation` génère un certificat **Ed25519** signé contenant uniquement métadonnées de genèse et profil structurel.<br>2. Transmission asynchrone (import fichier/presse-papiers par l'implantateur ou le client).<br>3. Côté Studio : `POST /api/studio/verify-installation` valide Ed25519 (**Logiciel**), audite la cohérence fiscale/plancher (**IA**) et enregistre la signature du fondateur (**Humain**). | **Zéro PII** (aucun nom, téléphone, courriel ni clé API dans le certificat). |
| **Niveau 2 — Échelle commerciale (15+ clients)** *(Architecture cible)* | Synchronisation asynchrone automatique en boîte morte chiffrée | **Relais serverless chiffré minimal (`~5 à 20 $/mois` pour des centaines de PME)** — toujours **zéro PC portable allumé 24/7** | Les nœuds clients déposent leurs attestations signées **Ed25519** et métriques agrégées (`usage-telemetry.js`, `billing_meter`) scellées bout en bout par la clé publique **X25519** de Fanal Studio dans une boîte de dépôt éphémère (*dead-drop* Cloudflare Workers / KV). À l'ouverture ponctuelle de **Fanal Studio**, la console déchiffre, vérifie et acquitte les paquets en attente. | **Zéro PII lisible dans le nuage** (le relais cloud ne voit que du texte chiffré scellé pour la clé privée de Studio). |

### Pourquoi ne pas exiger de serveur 24/7 en Bêta ?
- Un ordinateur portable personnel mis en veille casserait les vérifications synchrones et créerait un point de défaillance unique.
- Louer et administrer des machines virtuelles multi-locataires (`40–150 $/mois` + base de données + sauvegarde + astreinte sécurité) avant les 15 premiers clients ajouterait de la complexité juridique (hébergement de données de santé/fiscales en nuage central) sans valeur opérationnelle immédiate.
- La séparation **Niveau 1 (`0 $/mois`, Ed25519 asynchrone implémenté)** → **Niveau 2 (`X25519` *dead-drop* serverless)** garantit que **le fondateur peut fermer son ordinateur à tout moment** tout en disposant d'une preuve cryptographique inviolable de chaque déploiement client.

---

## 3. Comparatif des trois modèles de déploiement produit

| Architecture | Hébergement | Résilience hors ligne | Coût d'infrastructure | Usage recommandé |
| :--- | :--- | :--- | :--- | :--- |
| **1. Local souverain + Vérification Studio Niveau 1** *(Actuel Bêta)* | Poste macOS / Windows du client (`127.0.0.1`) + certificat `FANAL-INSTALL-ATTEST-V1` | **100 % autonome hors ligne** | **`0 $/mois`** | Cohorte fondatrice (14 premiers clients Solo & Équipe). |
| **2. Hybride (Cerveau local + Boîte morte `X25519` Niveau 2)** | Cerveau et Voile Loi 25 chez le client ; relais chiffré minimal pour tableau mobile et vérifications Studio | **Terrain 100 % autonome hors ligne** | **`~5–25 $/mois` global** | Croissance `15+` PME et multi-sites nécessitant un suivi mobile sans ouvrir de tunnel LAN. |
| **3. Nuage géré spécialisé (Option ultérieure ciblée)** | Conteneurs isolés dédiés par entreprise (uniquement pour postes sans ordinateur local) | Dépendante d'Internet | **`49–149 $/mois/client`** | Uniquement lorsque le client refuse tout poste informatique dédié sur place. |

---

## 4. Règle de décision Trasunto inc.

1. **Aucune dépendance à un PC du fondateur allumé 24h/24** : ni en Bêta, ni en phase commerciale.
2. **Aucune PII dans le nuage de contrôle** : le Voile Loi 25 local et l'attestation Ed25519 zéro-PII garantissent qu'en toute phase, les dossiers clients demeurent sous la souveraineté exclusive du dirigeant.
3. **Transition sans rupture** : le même format `FANAL-INSTALL-ATTEST-V1` vérifié aujourd'hui localement par **Fanal Studio** servira de charge utile interne du futur relais *dead-drop* `X25519`, sans refonte des postes clients déjà déployés.
