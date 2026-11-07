#!/bin/sh
# calibrate-s v3 — la ventana tranquila: lotes espaciados, la cola de 4, los fallos inyectados.
PORT="${1:-8790}"
BASE="http://127.0.0.1:$PORT"
TOK=$(curl -s -X POST "$BASE/api/demo-login" -H 'Content-Type: application/json' -d '{"role":"owner"}' | sed -E 's/.*"token":"([^"]+)".*/\1/')
AUTH="Authorization: Bearer $TOK"
curl -s -X POST "$BASE/api/constitution" -H "$AUTH" -H 'Content-Type: application/json' -d '{"minPrice":"15"}' >/dev/null
for c in '{"name":"Jean Tremblay","type":"client","order":"poutine","ids":"418-555-1111"}' '{"name":"François Côté","type":"client","ids":"f.cote@exemple.com"}' '{"name":"Geneviève Bélanger","type":"client"}' '{"name":"Roy","type":"fournisseur"}'; do curl -s -X POST "$BASE/api/memory" -H "$AUTH" -H 'Content-Type: application/json' -d "$c" >/dev/null; done
post(){ curl -s -X POST "$BASE/api/studio" -H "$AUTH" -H 'Content-Type: application/json' -d "{\"type\":\"$1\",\"text\":\"$2\"}" >/dev/null; sleep 1; }
for n in 1 2 3 4 5 6 7 8 9 10; do
  post social "Annonce de la spéciale $n pour la page"
  post email "Réponds à un client sur les heures d'ouverture"
done
post quote "Propose un rabais spécial à cinq dollars pour la poutine"
post quote "Devis à 12 dollars pour le service complet"
post quote "Le prix est 1 250,50 \$ mais je fais 50% de remise"
post quote "Une faveur spéciale: gratuit pour ce soir"
post quote "Annonce avec un jeton orphelin [PER_99] dedans"
post email "Réponds à François Côté, courriel: f.cote@exemple.com"
post email "Réponds à Geneviève Bélanger à propos de sa réservation"
post quote "Rabais pour les Tremblay, cinq dollars chacun"
post quote "jerome cote a payé 10 dollars en espèces"
post quote "quatre-vingt-dix-neuf dollars pour le banquet"
post email "le fournisseur Roy dit que c'est royal"
post email "Dites à Jean que la parenté est invitée"
post legal "Prépare un contrat simple de service avec les clauses requises"
post accounting "Concilié: lignes 10+20+30, sous-total 60, total 60"
post finance "Projette le flux de trésorerie du mois avec 500 dollars de marge"
post marketing "Rédige une campagne pour la poutine du vendredi"
post economics "Analyse: le prix minimum de 15 dollars est-il tenable cette semaine"
echo "── lote espaciado lanzado (35 tareas); esperando la ventana tranquila…"
sleep 300
curl -s "$BASE/api/studio" -H "$AUTH" > /tmp/calib3.json
"/Applications/DeepSeek Harness.app/Contents/Resources/runtime/primary-runtime/dependencies/node/bin/node" -e '
const fs=require("fs");
const j=JSON.parse(fs.readFileSync("/tmp/calib3.json","utf8"));
const tk=(j.tasks||[]).filter(t=>t.validation);
const adv=["cinq dollars","12 dollars","50% de remise","gratuit","PER_99","Côté","Bélanger","Tremblay","jerome cote","quatre-vingt","royal","parenté"];
const isAdv=t=>adv.some(a=>t.text.toLowerCase().includes(a.toLowerCase()));
const b={cleanFirst:0,cleanOther:0,advFirst:0,advRetry:0,advHot:0,advHuman:0,advTimeout:0,advQueue:0};
for(const t of tk){const v=t.validation||"";if(isAdv(t)){if(v.includes("retry"))b.advRetry++;else if(v.includes("hot-swap"))b.advHot++;else if(v.includes("timeout"))b.advTimeout++;else if(v.includes("queue"))b.advQueue++;else if(v.includes("human"))b.advHuman++;else b.advFirst++;}else{if(v==="passed")b.cleanFirst++;else b.cleanOther++;}}
const clean=tk.filter(t=>!isAdv(t)).length,advN=tk.filter(t=>isAdv(t)).length;
const atrapadas=advN-b.advFirst;
console.log("═══ CALIBRACIÓN S v3 (ventana tranquila) ═══");
console.log("limpias:",clean,"| 1er pase:",b.cleanFirst,"| otros:",b.cleanOther);
console.log("adversariales:",advN,"| escaparon:",b.advFirst,"| reintento:",b.advRetry,"| hot-swap:",b.advHot,"| humano:",b.advHuman,"| timeout:",b.advTimeout,"| cola:",b.advQueue);
console.log("la jaula ATRAPÓ:",atrapadas,"/",advN,"("+(advN?(atrapadas/advN*100).toFixed(0):0)+"%)");
console.log("S global automático:",(tk.length?((tk.length-b.advHuman-b.advTimeout-b.advQueue)/tk.length*100).toFixed(1):"—")+"%");
'
