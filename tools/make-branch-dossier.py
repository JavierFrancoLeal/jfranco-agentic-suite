#!/usr/bin/env python3
# make-branch-dossier — el expediente de validación por rama: la fábrica
# empaqueta el trabajo preparado + la lista de lo que el profesional debe
# verificar + el bloque de firma (la piel del licenciado).
# Uso: python3 tools/make-branch-dossier.py <rama> [salida.docx] [url-base]
import json, sys, urllib.request
sys.path.insert(0, "tools")
from docfx import new_doc, para, section, rule, table3

BRANCH = sys.argv[1] if len(sys.argv) > 1 else "legal"
OUT = sys.argv[2] if len(sys.argv) > 2 else f"TRASUNTO-DOSSIER-{BRANCH.upper()}.docx"
BASE = sys.argv[3] if len(sys.argv) > 3 else "http://127.0.0.1:8790"
NAMES = {"legal": "Juridique", "accounting": "Comptable", "finance": "Financier", "marketing": "Marketing", "economics": "Économique"}
VERIFY = {
  "legal": ["Identité des parties et des clauses requises", "Conformité Loi 25 et lois du Québec", "Avis et opinions juridiques"],
  "accounting": ["Les sommes cadrent au centime", "Pièces justificatives complètes", "Traitements fiscaux"],
  "finance": ["Hypothèses des projections", "Respect du budget et du plancher", "Aucun conseil d'investissement"],
  "marketing": ["Ton de la maison et consentements (Loi 25)", "Véracité des allégations", "Droits d'usage des visuels"],
  "economics": ["Le prix minimum et ses conditions extrêmes", "La demande et l'offre réelles", "La décision du propriétaire"],
}
try:
    tok = json.loads(urllib.request.urlopen(urllib.request.Request(BASE + "/api/demo-login", data=b'{"role":"owner"}', headers={"Content-Type": "application/json"}), timeout=8).read()).get("token", "")
    req = urllib.request.Request(BASE + "/api/studio", headers={"Authorization": "Bearer " + tok})
    tasks = json.loads(urllib.request.urlopen(req, timeout=8).read()).get("tasks", [])
    branch_tasks = [t for t in tasks if t.get("type") == BRANCH]
except Exception as e:
    branch_tasks = []

doc = new_doc("DOSSIER DE VALIDATION", f"Trasunto · Fanal — dossier {NAMES.get(BRANCH, BRANCH)}")
section(doc, "", f"Dossier de validation — {NAMES.get(BRANCH, BRANCH)}", "Pour le professionnel certifié", size=15)
para(doc, "Le travail ci-dessous a été PRÉPARÉ par Fanal à partir du silo du client. Il n'est ni signé ni approuvé : la validation appartient au professionnel certifié, dont la licence, l'assurance et la réputation engagent la signature.", size=9, space_after=8)

section(doc, "", "Le travail préparé", "Brouillons", size=11)
if branch_tasks:
    for t in branch_tasks:
        para(doc, "• " + (t.get("text") or "")[:120], size=9)
        if t.get("result"):
            para(doc, "  → " + str(t.get("result"))[:400], size=9)
        if t.get("rationale"):
            para(doc, "  raison : " + str(t.get("rationale"))[:200], size=8.5)
else:
    para(doc, "Aucune tâche de cette branche aujourd'hui.", size=9)

section(doc, "", "Ce que le professionnel doit vérifier", "La liste", size=11)
rows = [("", "Point de contrôle", "")]
for i, v in enumerate(VERIFY.get(BRANCH, []), 1):
    rows.append((str(i), v, "☐"))
table3(doc, rows, widths=(1.2, 11.0, 1.4))

section(doc, "", "La signature", "Le registre", size=11)
para(doc, "Validé et signé par : ______________________________", size=9.5, space_before=4)
para(doc, "Titre professionnel et numéro de licence : ______________________________", size=9.5)
para(doc, "Date : ____________________  Signature : ____________________", size=9.5, space_after=6)
para(doc, "La signature du professionnel est le registre : l'agent a préparé, expliqué et cité — la licence signe.", size=8.5)
rule(doc)
doc.save(OUT)
print("saved", OUT)
