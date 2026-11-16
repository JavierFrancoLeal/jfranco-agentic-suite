# AI-MSP — Économie unitaire d'un fournisseur d'IA souveraine et traçable

Ce document formalise le modèle technique et financier qui permet à Trasunto inc. d'opérer comme un **MSP d'intelligence artificielle clé en main** (*Managed AI Service Provider*) tout en conservant une marge brute sur coûts variables supérieure à **`98,8 %`**.

---

## 1. Principe de l'arbitrage computationnel

Un assistant générique coûte cher parce qu'il envoie des documents bruts à un modèle frontalier unique à plein tarif. Fanal renverse l'équation par trois couches déterministes exécutées **sans coût de jeton** sur le poste du client :

1. **Règle d'or et Garde-fous déterministes (`0 $` en jetons)** :
   - Validation mathématique des prix planchers, des formats légaux québécois (`NEQ`, `TPS`, `TVQ`, clauses `OPC`/`TAL`), calcul de caisse `Z` et tri du feu tricolore.
   - **Voile PII pré-neural** (`~85 Mo` RAM Node.js) : pseudonymisation locale des identités et coordonnées avant toute transmission.
2. **Cerveau Dual Fermé avec cascade de résilience (`S-Elevator`)** :
   - **~85 % à 90 % des tâches quotidiennes** passent en une passe sur **`DeepSeek-Flash`** (coût nominal infime : **`0,0034 $ CAD`** par dossier courant aux heures ouvrables du Québec).
   - **~9 % des tâches** déclenchent une reprise ciblée ou un appel à **`DeepSeek-V4-Pro`** sur l'apex juridique, comptable ou réglementaire bloquant (**`0,0373 $` à `0,0746 $ CAD`** le dossier complexe).
   - **~1 % à 5 % des tâches multimodales** (numérisation PDF complexe, facture manuscrite, photo terrain) basculent vers **`Google Gemini`** (**`0,0825 $ CAD`** tout compris).
3. **Taux d'efficacité horaire naturel au Québec** : entre `08h00` et `18h00 EST` (`13h00–23h00 UTC`), l'API DeepSeek opère à **tarif hors pointe (`-50 %`)**, réduisant de moitié le coût d'inférence du parc client nord-américain.

---

## 2. Synthèse du coût réel par unité de travail (CAD)

| Unité opérationnelle | Coût brut moyen en jetons (CAD) | Valeur humaine économisée estimée | Revenu mensuel inclus (Solo `350 $`) |
| :--- | :--- | :--- | :--- |
| Réponse *Le Répondant* / SMS / Courriel | `0,0008 $ – 0,0018 $ CAD` | `4 à 8 minutes` (`~6,00 $ – 12,00 $`) | Inclus |
| Fiche *Le Téléphoniste* + résumé structuré | `0,0015 $ – 0,0030 $ CAD` | `5 à 10 minutes` (`~8,00 $ – 15,00 $`) | Inclus |
| Dossier courant signé (*Le Secrétaire*) | `0,0034 $ – 0,0068 $ CAD` | `20 à 35 minutes` (`~35,00 $ – 65,00 $`) | Inclus (`0 $/dossier`) |
| Dossier complexe *V4-Pro* ou OCR *Gemini* | `0,0373 $ – 0,0825 $ CAD` | `35 à 55 minutes` (`~80,00 $ – 140,00 $`) | Inclus (`0 $/dossier`) |
| **Consommation totale typique (20 dossiers + 200 tâches)** | **`~2,70 $ CAD / mois`** *(+ `1,50 $` PAD)* | **`15 à 25 heures / mois` récupérées** | **`350,00 $ CAD HT`** |

La différence entre le coût de production (`~4,20 $ CAD` API + banque) et le tarif client (`350,00 $ CAD`) valide l'inclusion complète des dossiers dans l'abonnement mensuel fixe sans aucune surfacturation au compteur.
