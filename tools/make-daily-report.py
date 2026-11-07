#!/usr/bin/env python3
# make-daily-report — el PDF diario (la fábrica de documentos aplicada a la jornada).
# Uso: python3 tools/make-daily-report.py [salida.docx] [url-base]
import json, sys, urllib.request
sys.path.insert(0, "tools")
from docfx import new_doc, para, section, rule

OUT = sys.argv[1] if len(sys.argv) > 1 else "TRASUNTO-RAPPORT-JOUR.docx"
BASE = sys.argv[2] if len(sys.argv) > 2 else "http://127.0.0.1:8790"
try:
    tok = json.loads(urllib.request.urlopen(urllib.request.Request(BASE + "/api/demo-login", data=b'{"role":"owner"}', headers={"Content-Type": "application/json"}), timeout=8).read()).get("token", "")
    req = urllib.request.Request(BASE + "/api/day/report", headers={"Authorization": "Bearer " + tok})
    j = json.loads(urllib.request.urlopen(req, timeout=8).read())
    report = j.get("report", "")
except Exception as e:
    report = "Rapport indisponible: " + str(e)

doc = new_doc("RAPPORT DE JOURNÉE", "Trasunto · Fanal — rapport quotidien")
section(doc, "", "Rapport du jour — Fanal", "Propriétaire · Gestionnaire", size=15)
para(doc, "Le registre complet de la journée: chaque session, chaque conversation. Pour le propriétaire et le gestionnaire.", size=9, space_after=8)
try:
    import urllib.request as _u, json as _j
    _tok=_j.loads(_u.urlopen(_u.Request(BASE+"/api/demo-login",data=b'{"role":"owner"}',headers={"Content-Type":"application/json"}),timeout=8).read()).get("token","")
    _h={"Authorization":"Bearer "+_tok}
    _led=_j.loads(_u.urlopen(_u.Request(BASE+"/api/ledger/search",headers=_h),timeout=8).read()).get("results",[])
    _caps=_j.loads(_u.urlopen(_u.Request(BASE+"/api/capabilities",headers=_h),timeout=8).read())
    _signs={"OWNER":0,"CLIENT":0,"HANDOFF":0}
    for _r in _led: _signs[_r.get("signerRole","OWNER")]=_signs.get(_r.get("signerRole","OWNER"),0)+1
    section(doc, "", "Balance de capital organisationnel", "Fanal · aujourd'hui", size=11)
    para(doc, "Signatures du jour: "+str(_signs["OWNER"])+" proprietaire · "+str(_signs["CLIENT"])+" client · "+str(_signs["HANDOFF"])+" relevé. Capacités montrées: "+str(len(_caps.get("cards",[])))+" (le reste se découvre quand l'inbox est vide).", size=9, space_after=4)
    rule(doc)
except Exception as _e:
    pass
for line in report.split("\n"):
    if line.startswith("### "):
        section(doc, "", line[4:], "Session", size=11)
    elif line.startswith("## "):
        para(doc, line[3:], size=11, bold=True)
    elif line.strip():
        para(doc, line, size=9)
    else:
        para(doc, " ", size=6)
rule(doc)
doc.save(OUT)
print("saved", OUT)
