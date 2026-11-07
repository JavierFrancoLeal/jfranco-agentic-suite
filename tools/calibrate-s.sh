#!/bin/sh
# calibrate-s — mide S (la tasa de éxito del elevador) con tareas REALES.
# Uso: sh tools/calibrate-s.sh [puerto]
PORT="${1:-8790}"
BASE="http://127.0.0.1:$PORT"
TOK=$(curl -s -X POST "$BASE/api/demo-login" -H 'Content-Type: application/json' -d '{"role":"owner"}' | sed -E 's/.*"token":"([^"]+)".*/\1/')
AUTH="Authorization: Bearer $TOK"
# El piso de precio para ejercitar el validador determinista
curl -s -X POST "$BASE/api/constitution" -H "$AUTH" -H 'Content-Type: application/json' -d '{"philosophy":"La maison de la poutine","tone":"chaleureux","policies":"livraison Baie-Saint-Paul","discountRule":"jamais sous le prix minimum","minPrice":"15","extremeDiscounts":"uniquement réservation ferme le jour même"}' >/dev/null
i=0
post(){ i=$((i+1)); curl -s -X POST "$BASE/api/studio" -H "$AUTH" -H 'Content-Type: application/json' -d "{\"type\":\"$1\",\"text\":\"$2\"}" >/dev/null; }
post social "Annonce la poutine spéciale du vendredi pour la page Facebook"
post email "Réponds à un client qui demande si on livre à Baie-Saint-Paul"
post quote "Fais un devis pour un souper de 20 personnes à 40 dollars par personne"
post translation "Traduis 'nuestra casa es su casa' en français"
post agenda "Rappelle le rendez-vous de demain matin avec le fournisseur de fromage"
post report "Résume la journée: 120 clients, 890 dollars de ventes, 2 plaintes"
post review "Réponds à un avis client: la poutine était froide"
post job "Rédige une offre pour un poste de cuisinier à temps partiel"
post meeting "Résume la rencontre avec le comptable: impôts au 30 avril, budget marketing 500 dollars"
post quote "Propose un rabais spécial à 5 dollars pour la poutine de ce soir"
echo "── $i tareas lanzadas al elevador; esperando a los cerebros…"
sleep 45
curl -s "$BASE/api/studio" -H "$AUTH" > /tmp/calib.json
"/Applications/DeepSeek Harness.app/Contents/Resources/runtime/primary-runtime/dependencies/node/bin/node" -e '
const fs=require("fs");
const j=JSON.parse(fs.readFileSync("/tmp/calib.json","utf8"));
const tk=j.tasks||[];
const buckets={first:0,retry:0,hotswap:0,human:0,noKey:0};
for(const t of tk){const v=t.validation||"";if(v.includes("retry"))buckets.retry++;else if(v.includes("hot-swap"))buckets.hotswap++;else if(v.includes("human"))buckets.human++;else if(v==="passed")buckets.first++;else buckets.noKey++;}
const total=tk.length;
const auto=buckets.first+buckets.retry+buckets.hotswap;
console.log("═══ CALIBRACIÓN DE S (tareas reales) ═══");
console.log("total:",total,"| 1er pase:",buckets.first,"| 1 reintento:",buckets.retry,"| hot-swap:",buckets.hotswap,"| humano:",buckets.human,"| sin clave:",buckets.noKey);
console.log("S automático (sin humano):",total?(auto/total*100).toFixed(1)+"%":"—");
console.log("costo ponderado estimado (flash $0.002 + 9% reintento + 1% profundo): ~$"+( (total*(0.002+0.002*0.09+0.05*0.01)).toFixed(4) )+" por lote");
'
