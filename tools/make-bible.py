# Franco Vision — PLAN D'AFFAIRES (v2, entrepreneur-first, delegable sections).
import sys
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

INK = RGBColor(0x11, 0x18, 0x27); MUTED = RGBColor(0x6B, 0x72, 0x80); FAINT = RGBColor(0x9C, 0xA3, 0xAF)
V = RGBColor(0x4D, 0x6B, 0xFE); GRAY = RGBColor(0x4B, 0x55, 0x63)
LOCKUP = "tools/logo-suite/franco-vision-lockup.png"

def rule(doc, color="4D6BFE", sz=6, space_after=8):
    p = doc.add_paragraph(); pPr = p._p.get_or_add_pPr(); pBdr = OxmlElement("w:pBdr")
    b = OxmlElement("w:bottom"); b.set(qn("w:val"), "single"); b.set(qn("w:sz"), str(sz)); b.set(qn("w:color"), color); b.set(qn("w:space"), "4")
    pBdr.append(b); pPr.append(pBdr); p.paragraph_format.space_after = Pt(space_after); return p

def para(doc, text="", size=9.5, color=INK, bold=False, align=None, space_after=4, space_before=0, line=1.18):
    p = doc.add_paragraph(); r = p.add_run(text)
    r.font.size = Pt(size); r.font.color.rgb = color; r.bold = bold
    if align is not None: p.alignment = align
    pf = p.paragraph_format; pf.space_after = Pt(space_after); pf.space_before = Pt(space_before); pf.line_spacing = line
    return p

def section(doc, num, title, audience, size=14):
    para(doc, "SECTION " + num, size=8, color=V, bold=True, space_before=12, space_after=1)
    para(doc, title, size=size, bold=True, space_after=2)
    p = doc.add_paragraph()
    r = p.add_run("À lire par : " + audience)
    r.font.size = Pt(8.5); r.font.color.rgb = GRAY; r.italic = True
    p.paragraph_format.space_after = Pt(4)
    rule(doc, color="E5E7EB", sz=4, space_after=6)

def bullet(doc, lead, rest, size=9.5):
    p = doc.add_paragraph()
    r1 = p.add_run("· " + lead); r1.bold = True; r1.font.size = Pt(size); r1.font.color.rgb = INK
    r2 = p.add_run(rest); r2.font.size = Pt(size); r2.font.color.rgb = MUTED
    p.paragraph_format.space_after = Pt(3); return p

def shade(cell, hexcolor):
    tcPr = cell._tc.get_or_add_tcPr(); shd = OxmlElement("w:shd"); shd.set(qn("w:val"), "clear"); shd.set(qn("w:fill"), hexcolor); tcPr.append(shd)

def cell_borders(cell, edges, color="E5E7EB", sz=4):
    tcPr = cell._tc.get_or_add_tcPr(); b = OxmlElement("w:tcBorders")
    for side in edges:
        el = OxmlElement("w:" + side); el.set(qn("w:val"), "single"); el.set(qn("w:sz"), str(sz)); el.set(qn("w:color"), color); b.append(el)
    tcPr.append(b)

def table3(doc, rows, widths=(2.2, 10.0, 5.0), header=("", "", "")):
    t = doc.add_table(rows=1, cols=3); t.autofit = False
    for i, htxt in enumerate(header):
        c = t.rows[0].cells[i]; c.width = Cm(widths[i]); shade(c, "F3F4F6")
        p = c.paragraphs[0]; r = p.add_run(htxt); r.bold = True; r.font.size = Pt(8.5); r.font.color.rgb = MUTED
        p.paragraph_format.space_before = Pt(2); p.paragraph_format.space_after = Pt(2)
    for a, b, c3 in rows:
        rw = t.add_row()
        for i, val in enumerate((a, b, c3)):
            c = rw.cells[i]; c.width = Cm(widths[i]); cell_borders(c, ["bottom"])
            p = c.paragraphs[0]; r = p.add_run(val); r.font.size = Pt(9)
            p.paragraph_format.space_before = Pt(2); p.paragraph_format.space_after = Pt(2)
            if i == 0: r.bold = True; r.font.color.rgb = V
            elif i == 2: r.bold = True; r.font.color.rgb = INK
            else: r.font.color.rgb = INK
    return t

doc = Document()
s = doc.sections[0]
s.top_margin = Cm(1.4); s.bottom_margin = Cm(1.2); s.left_margin = Cm(1.6); s.right_margin = Cm(1.6)
st = doc.styles["Normal"]; st.font.name = "Arial"; st.font.size = Pt(9.5)
rPr = st.element.get_or_add_rPr(); rFonts = rPr.find(qn("w:rFonts"))
if rFonts is None: rFonts = OxmlElement("w:rFonts"); rPr.append(rFonts)
for attr in ("ascii", "hAnsi", "cs"): rFonts.set(qn("w:" + attr), "Arial")
lang = OxmlElement("w:lang"); lang.set(qn("w:val"), "fr-CA"); rPr.append(lang)

# ── Couverture ───────────────────────────────────────────────
t = doc.add_table(rows=1, cols=2); t.alignment = WD_TABLE_ALIGNMENT.CENTER; t.autofit = False
t.columns[0].width = Cm(11.0); t.columns[1].width = Cm(6.8)
c0, c1 = t.rows[0].cells
p0 = c0.paragraphs[0]; p0.add_run().add_picture(LOCKUP, width=Cm(4.2))
p1 = c1.paragraphs[0]; p1.alignment = WD_ALIGN_PARAGRAPH.RIGHT
r4 = p1.add_run("PLAN D'AFFAIRES · v2.0"); r4.font.size = Pt(8); r4.bold = True; r4.font.color.rgb = MUTED
rule(doc)
para(doc, "FRANCO VISION — Plan d'affaires", size=21, bold=True, space_after=4)
para(doc, "Le lien humain entre l'intelligence artificielle et le territoire de Charlevoix. Ce document réunit trois études fondatrices et tout ce que l'organisme a construit. Chaque section indique à qui la confier : l'entrepreneur lit le potentiel, délègue le technique, et décide.", size=10, color=MUTED, space_after=10)

# ── Sommaire (delegable) ─────────────────────────────────────
section(doc, "SOMMAIRE", "Sommaire et guide de lecture", "Tout le monde — 2 minutes")
table3(doc, [
    ("1", "Le potentiel — pourquoi ceci est une affaire", "L'entrepreneur"),
    ("2", "Le marché — les chiffres qui parlent", "L'entrepreneur + conseiller"),
    ("3", "La stratégie à deux voies — PME et municipal", "La direction"),
    ("4", "Le portefeuille de produits", "Délégable : direction technique"),
    ("5", "Le modèle d'affaires et la viabilité", "L'entrepreneur + comptable"),
    ("6", "L'ingénierie financière — subventions et crédits", "Délégable : comptable"),
    ("7", "La feuille de route — trois horizons", "La direction"),
    ("8", "Les risques et leur mitigation", "La direction + conseil"),
    ("9", "La demande — partenaires et appui", "La direction + SADC"),
    ("10", "L'organisme technologique", "Délégable : directeur technique"),
    ("11", "Le système d'exploitation de l'entreprise", "Délégable : directeur technique"),
    ("12", "Annexe — les trois documents fondateurs", "Délégable : analystes"),
], header=("No", "Section", "À lire par"))

# ── 1. LE POTENTIEL (first!) ─────────────────────────────────
section(doc, "1", "Le potentiel — pourquoi ceci est une affaire", "L'entrepreneur d'abord — c'est la section qui décide tout")
para(doc, "Deux études indépendantes arrivent à la même conclusion avec la même image : les entreprises et les municipalités « écrivent à la main pour retranscrire à l'ordinateur ». La quatrième révolution industrielle n'a pas encore atteint le terrain — et c'est exactement là que se crée la fortune :", space_after=4)
bullet(doc, "Le capital humain gaspillé : ", "4 100 fonctionnaires municipaux québécois travaillent à temps plein uniquement à remplir des formulaires — 328,4 M$ par an.")
bullet(doc, "Le capital économique gaspillé : ", "78 % des PME ne voient pas l'utilité pratique de l'IA et paient des heures de conciliation, des amendes évitables (CCQ, MAPAQ, CITQ) et des double-saisies quotidiennes.")
bullet(doc, "Le capital physique sous-utilisé : ", "1,9 % seulement d'adoption de l'IA dans l'hébergement et la restauration — pendant que le tourisme bat des records (172,4 M$ à l'été 2026).")
bullet(doc, "La thèse de valeur : ", "nous ne vendons pas ce que l'IA génère — nous vendons ce que le client CESSE de payer. C'est la différence entre un gadget et un actif.")
para(doc, "La vision à dix ans : un pôle régional d'IA à Charlevoix — centres de données souverains, talent local, entreprises d'avant-garde — avec Franco Vision comme noyau. Chaque contrat d'aujourd'hui finance la racine de demain.", bold=True)

# ── 2. LE MARCHÉ ─────────────────────────────────────────────
section(doc, "2", "Le marché — les chiffres qui parlent", "L'entrepreneur + le conseiller")
table3(doc, [
    ("Tourisme", "Été 2026 : 172,4 M$ (+5,3 %), occupation 70,4 % ; Le Massif 72,6 M$ ; Club Med 21,8 M$ ; adoption IA : 1,9 %", "Opportunité immense"),
    ("Municipal", "328,4 M$/an de fardeau administratif ; quasi-monopole PG Solutions contesté ; concurrence IA = copilotes sans connaissance du territoire", "Gouvernement"),
    ("Tissu PME", "≈ 2 000 entreprises, 95 % de moins de 50 employés ; 14,1 % de travailleurs autonomes ; 32,8 % de la population a 65 ans et plus (relève d'entreprise)", "Base locale"),
    ("Conjoncture", "Octobre 2026 : les deux MRC réclament un statut particulier — Charlevoix devient le laboratoire idéal de l'IA agéntique", "Fenêtre unique"),
], header=("Segment", "Le fait (documenté)", "Lecture"))

# ── 3. STRATÉGIE ─────────────────────────────────────────────
section(doc, "3", "La stratégie à deux voies — une thèse, deux marchés", "La direction")
bullet(doc, "Voie A — PME et secteurs : ", "Le Veilleux, l'assistant de travail installé chez le client (les 10 façons du guide), avec la méthode des 8 semaines : résultats rapides sur les données existantes + formation MFOR.")
bullet(doc, "Voie B — Municipal et régional : ", "une couche d'orchestration agéntique souveraine PAR-DESSUS les systèmes existants (AccèsCité, GOnet, ePropriété) — on ne remplace pas le grand livre, on exécute les flux où le capital humain s'effondre.")

# ── 4. PRODUITS ──────────────────────────────────────────────
section(doc, "4", "Le portefeuille de produits", "Délégable : direction technique")
table3(doc, [
    ("Le Veilleux", "Dashboard, caisse virtuelle + contre-registre (Z-rapport), journée d'ouverture/fermeture, alertes « la IA informe, l'humain décide » (10 s, Non par défaut), centre de notifications à écran complet, pont Facebook/Messenger", "PME"),
    ("Moteur 1", "Conformité géospatiale, hydrique et patrimoniale (urbanisme, CCU, ROPI) — 3 sous-agents : vision CAD/BIM, géointelligence MELCCFP/SADR, compilateur normatif sans hallucinations", "Municipal"),
    ("Moteur 2", "Agent forensique de conciliation financière et reddition TECQ/MAMH/CMQ — dossiers pré-audités (NCMC 3530)", "Municipal"),
    ("Moteur 3", "Orchestrateur de subventions et développement économique (SDLE, Mission développement, ESSOR, patrimoine 218-26)", "MRC"),
    ("Moteur 4", "Gouvernance des TNO, perception automatisée (2 $/visiteur, 2 $/nuit), mobilité rurale (Mobilité Charlevoix)", "Territoires"),
], header=("Produit", "Ce qu'il exécute", "Marché"))

# ── 5. MODÈLE D'AFFAIRES ─────────────────────────────────────
section(doc, "5", "Le modèle d'affaires et la viabilité", "L'entrepreneur + le comptable")
table3(doc, [
    ("PME — niveau 1", "« L'employé no 2 » : 1 500 $ d'activation + 199–349 $/mois (travailleurs autonomes, 1–4 employés)", "Microcrédit Charlevoix"),
    ("PME — niveau 2", "« Essaim sectoriel » : 15 000–45 000 $ + 600–1 200 $/mois (restaurants, hôtels, chalets CITQ, CCQ, fermes)", "EPRTNT 50–80 %"),
    ("Municipal — wedge", "19 500–24 500 $/an par municipalité (gr é à gré <25 000 $, LCOM) ; 85 000–135 000 $ par MRC", "FRR Volet 4"),
    ("Viabilité", "86 000–96 000 $/an : charges ≈ 36 350 $ + salaire 50 000–60 000 $ ; 2–3 implantations + 3–4 accompagnements actifs ; la servitisation 5.0 (le récurrent est l'actif)", "Pilote antifragile"),
], header=("Offre", "Le détail", "Le levier"))

# ── 6. FINANCIÈRE ────────────────────────────────────────────
section(doc, "6", "L'ingénierie financière — subventions et crédits", "Délégable : comptable / conseiller en financement")
para(doc, "Règle d'or : AUCUN contrat signé ni dépense engagée avant l'accusé de réception officiel de la demande — sinon le dossier est rejeté. Processus : diagnostic gratuit → soumission détaillée → dépôt + accusé → contrat et déploiement.", bold=True, space_after=4)
table3(doc, [
    ("Pour les clients", "EPRTNT (50/80/90 %, jusqu'à 200 000 $) · FRR Volet 4 (50 000 $) · ESSOR 1A/1B/1C · MFOR (75 % formation) · Microcrédit (2,5 %, 6 mois sans paiement) · Volets 2-3 MRC (80–100 %)", "Le client paie 50–80 % de moins"),
    ("Pour Franco Vision", "C3i (25 %) · CDAE Volet IA (30 % des salaires, récurrent) · PARI-CNRC (jusqu'à 80 %) · CRIC (30 % remboursable sur le premier million)", "Le développement se finance"),
    ("Le cadre légal", "LCOM 2026 : gré à gré <25 000 $ ; invitation 25 000–138 999 $ ; toujours des SERVICES (jamais des biens) pour garder le seuil de 139 000 $ ; avis d'intention pour l'exclusivité", "Entrée sans appel d'offres"),
], header=("Instrument", "Le détail", "L'effet"))

# ── 7. FEUILLE DE ROUTE ──────────────────────────────────────
section(doc, "7", "La feuille de route — trois horizons fusionnés", "La direction")
table3(doc, [
    ("H1 · mois 1–6", "Nœud opérationnel à Charlevoix (C3i/CDAE/PARI) · wedge municipaux en gré à gré à Baie-Saint-Paul, La Malbaie, Petite-Rivière-Saint-François · pilote PME (8 semaines) · les documents commerciaux (one-pager, guide, accord de pilote)", "Premiers revenus réels"),
    ("H2 · mois 6–18", "Accord intermunicipal FRR Volet 4 · orchestration SDLE/Mission développement · essaims sectoriels ESSOR 1B/1C · « un poste = un revenu confirmé »", "Échelle MRC"),
    ("H3 · mois 18–36", "13 municipalités + 3 TNO validées → 86 MRC et 1 100 municipalités (FQM, UMQ, ADMQ) · connecteurs MAMH/MELCCFP (services <139 000 $)", "Standard québécois"),
], header=("Horizon", "Les actions", "Le résultat"))

# ── 8. RISQUES ───────────────────────────────────────────────
section(doc, "8", "Les risques et leur mitigation", "La direction + le conseil consultatif")
table3(doc, [
    ("Adoption lente (78 %)", "La méthode des 8 semaines : résultats sur leurs données + formation MFOR", "Contrôlé"),
    ("Annulations (40 %, Gartner)", "Le pilote opérationnel + l'accompagnement continu comme cœur du modèle", "Contrôlé"),
    ("Quasi-monopole PG Solutions", "On ne le remplace pas : on orchestre PAR-DESSUS — migration zéro", "Contourné"),
    ("Hallucinations normatives", "Le compilateur déterministe (graphe juridique) + « la IA informe, l'humain décide »", "Éliminé"),
    ("Loi 25 / deontologie OUQ", "Souveraineté par conception : données au Québec, AES-256, pseudonymisation en bordure, EFVP", "Barrière d'entrée"),
], header=("Risque", "Mitigation", "Statut"))

# ── 9. DEMANDE ───────────────────────────────────────────────
section(doc, "9", "La demande — partenaires et appui", "La direction + SADC")
bullet(doc, "SADC Charlevoix : ", "accompagnement, mise en relation avec la PME pilote, aide aux demandes de subventions, prêt conditionnel (25 000 $).")
bullet(doc, "Les canaux documentés : ", "SDLE (sdle@mrccharlevoix.ca) · Mission développement (infofinancement@mrccharlevoixest.ca) · Chambre de commerce (cohortes MFOR, 10 % de gestion) · Tourisme Charlevoix (EPRTNT) · Table agroalimentaire.")
bullet(doc, "Le futur proche : ", "FRR Volet 4 pour l'intermunicipal ; C3i/CDAE/PARI pour l'équipe ; conseil consultatif post-pilote.")

# ── 10. ORGANISME (last) ─────────────────────────────────────
section(doc, "10", "L'organisme technologique", "Délégable : directeur technique — l'entrepreneur n'a pas besoin de lire ceci")
table3(doc, [
    ("Les 7 organes", "workflow-master, decision-router, accountability-auditor, autonomy-grader, audit (qui enseigne), forensics (qui explique) + le cerveau double (chat + reasoner)", "Moteur DSH"),
    ("EL FUEGO", "Le standard documenté de transfert de savoir humain-IA : 26 leçons réelles, format canonique, « adopter la logique complète des idées »", "Mémoire"),
    ("Les gardes", "Smoke strict, contrats du flux d'amorçage, garde CSS, parcours API complet, synchronisation du bundle", "Qualité machine"),
    ("La doctrine des deux mondes", "Les clés et données du client ne se mélangent jamais avec les nôtres ; le Studio prépare, l'humain publie dans SES applications", "Souveraineté"),
], header=("Actif", "Ce que c'est", "Rôle"))

# ── 11. OS ───────────────────────────────────────────────────
section(doc, "11", "Le système d'exploitation de l'entreprise", "Délégable : directeur technique")
para(doc, "L'entreprise fonctionne comme le produit : agir → vérifier → noter → consolider → archiver. L'organe audit fait la revue hebdomadaire et enseigne ; le forensics explique le passé ; le feu-log conserve chaque leçon ; les gardes empêchent la régression. Une intégration = une demande client ; un poste = un revenu confirmé.")

# ── 12. ANNEXE ───────────────────────────────────────────────
section(doc, "12", "Annexe — les trois documents fondateurs", "Délégable : analystes")
bullet(doc, "Le plan Nikan (v5.2, 100 heures du fondateur) : ", "les 5 services HITL, le pilote antifragile de 6 mois, la viabilité, les politiques Loi 25, la pétition SADC en 5 volets.")
bullet(doc, "L'étude municipale (34 pages) : ", "le fardeau de 328,4 M$, le quasi-monopole PG Solutions, les 4 moteurs agéntiques, la LCOM 2026, la souveraineté.")
bullet(doc, "L'étude sectorielle (47 pages) : ", "le tourisme record (172,4 M$), la méthode des 8 semaines, les 3 niveaux de prix, l'arsenal de subventions, les canaux nommés.")
bullet(doc, "L'imbrication : ", "les deux études partagent la métaphore fondatrice du plan Nikan (« écrire à la main pour retranscrire ») — les trois documents disent la même thèse avec les mêmes mots. Ce plan d'affaires est leur fusion.")

rule(doc, color="E5E7EB", sz=4, space_after=4)
para(doc, "Franco Vision inc. · Charlevoix, Québec · Plan d'affaires v2.0 · Novembre 2026", size=7.5, color=FAINT, align=WD_ALIGN_PARAGRAPH.CENTER)

out = sys.argv[1] if len(sys.argv) > 1 else "FRANCO-VISION-PLAN-AFFAIRES.docx"
doc.save(out)
print("saved", out)
