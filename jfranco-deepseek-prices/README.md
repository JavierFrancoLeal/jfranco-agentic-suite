# @javierfrancoleal/deepseek-prices

Barre de prix **en direct** des jetons DeepSeek pour la GUI Web de DeepSeek Harness.
Live DeepSeek token **price bar** for the DeepSeek Harness Web GUI.

---

## Ce que fait le plugin / What it does

Affiche une barre pleine largeur en bas de la fenêtre (`shell.bottom`) qui montre, en
temps réel :

- **La tarifa actual** — 🟢 VALLE (hors pointe) ou 🔴 PICO (pointe).
- **Le prix des jetons** (USD / 1M tokens) pour `deepseek-flash` et `deepseek-v4-pro`
  — entrée (cache miss) → sortie. Le détail complet (cache hit + cache miss + sortie,
  pointe et hors pointe) apparaît au survol.
- **L'heure d'origine (UTC)** et **l'heure locale (Québec, `America/Toronto`)**.
- **Le compte à rebours** jusqu'au prochain changement de tarif, avec l'heure locale
  du basculement.
- **La date de vérification** des prix (survol de la barre).
- **L'idiome et le thème** : la barre suit la langue sélectionnée dans DeepSeek
  Harness (anglais / chinois) et les jetons de thème `--dsw-*` (clair / sombre).

---

## La grille tarifaire réelle de DeepSeek (vérifiée le 2026-11-03)

Source officielle : <https://api-docs.deepseek.com/quick_start/pricing>

Il y a **deux tarifs** : **pointe (peak)** et **hors pointe (off-peak)**. Hors pointe
= **50 %** du tarif pointe.

| Modèle | Entrée (cache hit) | Entrée (cache miss) | Sortie |
|---|---|---|---|
| `deepseek-flash` (V4.1) | pointe $0.006 · HP $0.003 | pointe $0.30 · HP $0.15 | pointe $1.20 · HP $0.60 |
| `deepseek-v4-pro` | pointe $0.044 · HP $0.022 | pointe $1.32 · HP $0.66 | pointe $3.96 · HP $1.98 |

**Heures de pointe** : `01:00–04:00` et `06:00–10:00` **UTC**, du lundi au vendredi,
**hors jours fériés chinois**. Tout le reste (nuits, weekends, jours fériés chinois)
est **hors pointe**.

> ⚠️ Deux fenêtres de pointe par jour (avec un creux hors pointe de 04:00 à 06:00 UTC).

---

## Installation

Le plugin est un paquet « double-face » : un half **host** (vérification
quotidienne) et un half **browser** (la barre).

Dans le profil (`~/.dsh/profiles/desktop/`), ajoutez la dépendance et le bundle :

```jsonc
// package.json
{
  "dependencies": {
    "@javierfrancoleal/deepseek-prices": "link:/…/plugins/jfranco-deepseek-prices"
  },
  "dsh": {
    "profile": {
      "bundles": [
        "@deepseek-ai/dsh-base",
        "@deepseek-ai/dsh-web-app",
        "@javierfrancoleal/deepseek-prices"
      ]
    }
  }
}
```

Puis :

```bash
cd ~/.dsh/profiles/desktop
pnpm install
```

Rechargez la page Web. La barre apparaît en bas de la fenêtre. (Le `cordis.patch.yml`
du plugin insère déjà sa ligne `jfranco-deepseek-prices`.)

---

## Vérification quotidienne

Le half host (`lib/index.js`) télécharge **une fois par jour** la page officielle
des prix, la compare à la grille embarquée, et ajoute un enregistrement JSONL à
`~/.dsh/deepseek-prices/verify.jsonl`.

- `status: "ok"` → aucune dérive.
- `status: "drift"` → les heures de pointe ou des prix clés ont changé (warning dans
  le journal du host).
- `status: "error"` → la page n'a pas pu être lue (warning dans le journal).

La barre affiche la date de vérification embarquée au survol.

Un **rappel de vérification** quotidien (via l'agenda de DeepSeek Harness) rappelle
de contrôler ce registre et de mettre à jour les prix embarqués en cas de dérive.

---

## Configuration / limites

- **Fuseau local** : `America/Toronto` (Québec). Modifiable dans `lib/client.js`
  (`fmtClock(..., "America/Toronto")`).
- **Jours fériés chinois** : liste 2026 approximative dans `PRICING.chineseHolidays2026`
  (host et client). À réviser chaque année — le vérificateur quotidien contrôle les
  prix et les heures de pointe, **pas** cette liste.
- **Prix embarqués** : si DeepSeek change ses prix, le vérificateur quotidien le
  signale ; mettez à jour `PRICING` dans `lib/index.js` **et** `lib/client.js`.

---

## Structure

| Fichier | Rôle |
|---|---|
| `lib/index.js` | Half host : vérification quotidienne contre la page officielle |
| `lib/client.js` | Half browser : la barre de prix dans le slot global `shell.bottom` |
| `cordis.patch.yml` | Insère la ligne `jfranco-deepseek-prices` |
| `package.json` | Déclare `dsh.bundle.patch` (host) + `dsh.client` (browser) |
| `locale/*.json` | Métadonnées d'affichage du gestionnaire de plugins |

Créé par **J.Franco**.
