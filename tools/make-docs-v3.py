# Franco Vision — document design system v3 (Claude/Stripe/Linear style).
# White canvas, text-only wordmark, hairline rules, one violet accent.
import sys
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

INK = RGBColor(0x11, 0x18, 0x27)
MUTED = RGBColor(0x6B, 0x72, 0x80)
FAINT = RGBColor(0x9C, 0xA3, 0xAF)
V = RGBColor(0x7C, 0x5C, 0xFF)
VLIGHT = RGBColor(0xC9, 0xC2, 0xF5)
HAIR = "E5E7EB"
HEADFILL = "F3F4F6"
TINT = "F8F7FF"
ICON = "apps/desktop/assets/icon.png"

def rule(doc, color="7C5CFF", sz=6, space_after=8):
    p = doc.add_paragraph()
    pPr = p._p.get_or_add_pPr()
    pBdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single"); bottom.set(qn("w:sz"), str(sz))
    bottom.set(qn("w:color"), color); bottom.set(qn("w:space"), "4")
    pBdr.append(bottom); pPr.append(pBdr)
    p.paragraph_format.space_after = Pt(space_after)
    return p

def letter(p_run, spacing=26):
    rPr = p_run._r.get_or_add_rPr()
    sp = OxmlElement("w:spacing"); sp.set(qn("w:val"), str(spacing)); rPr.append(sp)

def para(doc, text="", size=9.5, color=INK, bold=False, align=None, space_after=4, space_before=0, line=1.18):
    p = doc.add_paragraph(); r = p.add_run(text)
    r.font.size = Pt(size); r.font.color.rgb = color; r.bold = bold
    if align is not None: p.alignment = align
    pf = p.paragraph_format
    pf.space_after = Pt(space_after); pf.space_before = Pt(space_before); pf.line_spacing = line
    return p

def label(doc, text, space_before=10, space_after=4):
    p = doc.add_paragraph(); r = p.add_run(text.upper())
    r.font.size = Pt(8); r.bold = True; r.font.color.rgb = V
    letter(r, 30)
    p.paragraph_format.space_before = Pt(space_before); p.paragraph_format.space_after = Pt(space_after)
    return p

def heading(doc, text, size=17, space_after=6):
    return para(doc, text, size=size, bold=True, space_after=space_after)

def lead_body(doc, lead, rest, size=9.5, space_after=5):
    p = doc.add_paragraph()
    r1 = p.add_run(lead); r1.bold = True; r1.font.size = Pt(size); r1.font.color.rgb = INK
    r2 = p.add_run(rest); r2.font.size = Pt(size); r2.font.color.rgb = MUTED
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = 1.18
    return p

def shade(cell, hexcolor):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd"); shd.set(qn("w:val"), "clear"); shd.set(qn("w:fill"), hexcolor)
    tcPr.append(shd)

def cell_borders(cell, edges, color=HAIR, sz=4):
    tcPr = cell._tc.get_or_add_tcPr()
    b = OxmlElement("w:tcBorders")
    for side in edges:
        el = OxmlElement("w:" + side)
        el.set(qn("w:val"), "single"); el.set(qn("w:sz"), str(sz)); el.set(qn("w:color"), color)
        b.append(el)
    tcPr.append(b)

def header(doc, doctype):
    t = doc.add_table(rows=1, cols=2)
    t.alignment = WD_TABLE_ALIGNMENT.CENTER; t.autofit = False
    t.columns[0].width = Cm(11.0); t.columns[1].width = Cm(6.8)
    c0, c1 = t.rows[0].cells
    p0 = c0.paragraphs[0]
    r = p0.add_run()
    r.add_picture(ICON, width=Cm(0.75))
    r2 = p0.add_run("   FRANCO VISION")
    r2.bold = True; r2.font.size = Pt(12); r2.font.color.rgb = INK
    r3 = p0.add_run("   Le Veilleux")
    r3.font.size = Pt(8.5); r3.font.color.rgb = FAINT
    p1 = c1.paragraphs[0]; p1.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    r4 = p1.add_run(doctype)
    r4.font.size = Pt(8); r4.bold = True; r4.font.color.rgb = MUTED
    letter(r4, 26)
    return t

def footer(doc, docid):
    rule(doc, color="E5E7EB", sz=4, space_after=4)
    p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("Franco Vision inc. · Charlevoix, Québec · github.com/JavierFrancoLeal/jfranco-agentic-suite")
    r.font.size = Pt(7.5); r.font.color.rgb = FAINT
    p.paragraph_format.space_after = Pt(1)
    p2 = doc.add_paragraph(); p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r2 = p2.add_run(docid + " · Novembre 2026")
    r2.font.size = Pt(7); r2.font.color.rgb = FAINT
    p2.paragraph_format.space_after = Pt(0)

def new_doc(doctype, docid):
    doc = Document()
    s = doc.sections[0]
    s.top_margin = Cm(1.3); s.bottom_margin = Cm(1.2)
    s.left_margin = Cm(1.6); s.right_margin = Cm(1.6)
    header(doc, doctype)
    rule(doc)
    return doc

def numbered(doc, num, lead, rest):
    t = doc.add_table(rows=1, cols=2)
    t.autofit = False
    t.columns[0].width = Cm(1.6); t.columns[1].width = Cm(15.6)
    c0, c1 = t.rows[0].cells
    p0 = c0.paragraphs[0]
    r0 = p0.add_run(num)
    r0.font.size = Pt(22); r0.bold = True; r0.font.color.rgb = VLIGHT
    p1 = c1.paragraphs[0]
    r1 = p1.add_run(lead); r1.bold = True; r1.font.size = Pt(10); r1.font.color.rgb = INK
    r2 = p1.add_run(rest); r2.font.size = Pt(9.5); r2.font.color.rgb = MUTED
    p1.paragraph_format.space_after = Pt(7); p1.paragraph_format.line_spacing = 1.18
    return t

def chips(doc, items):
    t = doc.add_table(rows=1, cols=len(items))
    t.autofit = False
    w = 17.2 / len(items)
    for i, (big, small) in enumerate(items):
        c = t.rows[0].cells[i]; c.width = Cm(w)
        if i < len(items) - 1: cell_borders(c, ["right"])
        p = c.paragraphs[0]
        r = p.add_run(big); r.bold = True; r.font.size = Pt(10.5); r.font.color.rgb = V
        p2 = c.add_paragraph(); r2 = p2.add_run(small); r2.font.size = Pt(8); r2.font.color.rgb = MUTED
        p2.paragraph_format.space_after = Pt(0)
    return t

def ask_box(doc, text):
    t = doc.add_table(rows=1, cols=1)
    c = t.rows[0].cells[0]
    cell_borders(c, ["left"], color="7C5CFF", sz=12)
    p = c.paragraphs[0]
    r = p.add_run(text); r.font.size = Pt(9); r.font.color.rgb = INK
    p.paragraph_format.space_before = Pt(4); p.paragraph_format.space_after = Pt(4)
    return t

# ── One-pager ───────────────────────────────────────────────
def one_pager(out):
    doc = new_doc("ONE-PAGER · SADC & PARTENAIRES", "Franco Vision · One-pager v1.0")
    heading(doc, "Ce qui n'existe nulle part ailleurs", size=17)
    para(doc, "L'humain au sommet · L'IA en soutien — la démonstration en quatre preuves.",
         size=9.5, color=MUTED, space_after=8)
    numbered(doc, "01", "EL FUEGO — le premier standard documenté de transfert de savoir humain-IA. ",
        "Chaque friction entre l'humain et l'IA devient une leçon permanente dans un registre canonique (23 leçons réelles issues du terrain). Le savoir ne se perd plus : il s'hérite.")
    numbered(doc, "02", "Les 7 organes — un flux de travail agentique avec une constitution. ",
        "Écouter → détecter → l'IA propose → l'humain décide → vérification → notation → enseignement → archéologie du code. Chaque décision est classée, vérifiée et traçable.")
    numbered(doc, "03", "La caisse virtuelle et le contre-registre — la preuve comptable du ROI. ",
        "Le système enregistre ce qui est vendu ; le terminal déclare ce qui est encaissé ; la variance détecte la fuite — un écart de −1,00 $ détecté automatiquement en test réel. Chaque facture est justifiée par le Z-rapport.")
    numbered(doc, "04", "La preuve vivante — un produit réel, construit et testé. ",
        "Démo publique en 10 langues, double cerveau (rapide + raisonneur), porte unique, caisse, tableau de bord en temps réel — sur macOS, Windows, Linux, Android et iOS.")
    label(doc, "La valeur")
    heading(doc, "Ce que le propriétaire cessera de payer", size=13)
    chips(doc, [
        ("Conciliation", "les heures du comptable, remplacées par le contre-registre"),
        ("Pertes", "paiements perdus et double saisie, détectés automatiquement"),
        ("Formation", "la mémoire du système enseigne elle-même"),
    ])
    para(doc, "Seuil de viabilité : 86 000 $ – 96 000 $/an · Pilote de 6 mois à tarif opérationnel — aucune projection non validée sur le terrain.",
         size=8.5, color=MUTED, space_before=6, space_after=6)
    label(doc, "L'offre", space_before=4)
    para(doc, "0 $ Rencontre et estimation → Implantation clé en main → Accompagnement continu (le cœur) → Ateliers. Cinq services, trois sources de revenus : implantation, services gérés, innovation sectorielle.",
         size=9.5, space_after=6)
    ask_box(doc, "L'appui recherché — SADC Charlevoix : accompagnement et prêt conditionnel (25 000 $) dédié à la phase pilote, remboursé à partir du 25ᵉ mois une fois la rentabilité confirmée. En complément : Futurpreneur Canada et programme LIFT de la BDC.")
    footer(doc, "Franco Vision · One-pager v1.0")
    doc.save(out); print("saved", out)

# ── Accord de pilote ────────────────────────────────────────
def accord(out):
    doc = new_doc("ACCORD DE PILOTE · 6 MOIS", "Franco Vision · Accord de pilote v1.0")
    heading(doc, "Accord de pilote — Le Veilleux", size=16)
    para(doc, "ENTRE : Franco Vision inc., Charlevoix (Québec) · ET : [Nom de l'entreprise], [ville], ci-après « le Client ».",
         size=9, color=MUTED, space_after=8)
    label(doc, "Objet et durée", space_before=2)
    para(doc, "Pilote de 6 mois — implantation de Le Veilleux à tarif opérationnel (couvre uniquement les frais, sans marge) : 349 $/mois.", size=9.5)
    label(doc, "Inclus")
    for l, r_ in [
        ("Implantation clé en main — ", "diagnostic, installation, personnalisation, formation."),
        ("Accompagnement continu — ", "support, itérations et ajustements pendant les 6 mois."),
        ("La preuve comptable — ", "caisse virtuelle et Z-rapport exportable chaque jour."),
    ]:
        lead_body(doc, "· " + l, r_, size=9.5, space_after=2)
    label(doc, "Engagements du Client")
    for l, r_ in [
        ("1 heure de rétroaction honnête par semaine — ", "test – rétroaction – ajustement."),
        ("Accès au terrain — ", "pour la collecte des données réelles du pilote."),
        ("Leçons anonymisées — ", "enregistrées selon le standard EL FUEGO ; aucun nom de client ni de personne."),
    ]:
        lead_body(doc, "· " + l, r_, size=9.5, space_after=2)
    label(doc, "Démarche antifragile")
    para(doc, "Aucune projection non validée : le pilote est le moteur de toute donnée future. À la fin des 6 mois : (a) reconduction au tarif commercial (grille v1), ou (b) sortie sans frais cachés — le Client conserve ses Z-rapports exportés.", size=9.5)
    label(doc, "Résiliation")
    para(doc, "30 jours de préavis, sans pénalité, par l'une ou l'autre partie.", size=9.5, space_after=10)
    para(doc, "Signé à ______________________, le ______________________", size=9.5, space_before=8, space_after=12)
    t = doc.add_table(rows=1, cols=2); t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, who in enumerate(["Franco Vision inc.", "Le Client"]):
        c = t.rows[0].cells[i]
        p = c.paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(who + "\n\n\n\n_______________________"); r.font.size = Pt(9.5)
    footer(doc, "Franco Vision · Accord de pilote v1.0")
    doc.save(out); print("saved", out)

# ── Grille tarifaire ────────────────────────────────────────
def grille(out):
    doc = new_doc("GRILLE TARIFAIRE · V1", "Franco Vision · Grille tarifaire v1.0")
    heading(doc, "Grille tarifaire — version 1", size=16)
    para(doc, "Tarifs post-pilote, en dollars canadiens, taxes en sus.", size=9, color=MUTED, space_after=8)
    rows = [
        ("0", "Rencontre et estimation écrite", "Gratuit", False),
        ("1", "Diagnostic de préparation à l'IA", "Gratuit", False),
        ("2", "Implantation et automatisation — par problème à résoudre", "1 500 $ – 4 000 $", False),
        ("3", "Intégration d'outils existants et formation", "750 $/journée", False),
        ("4a", "Accompagnement continu — Essentiel : 1 site, jusqu'à 10 travailleurs, caisse + rapports + support", "249 $/mois", True),
        ("4b", "Accompagnement continu — Pro : double cerveau, rapports avancés, support prioritaire", "449 $/mois", True),
        ("4c", "Accompagnement continu — Sur mesure (multi-sites, kiosque, matériel)", "Sur devis", True),
        ("5", "Ateliers, conférences et formations", "750 $ / 1 200 $ par journée", False),
    ]
    t = doc.add_table(rows=1, cols=3)
    t.autofit = False
    widths = [Cm(1.3), Cm(11.2), Cm(4.7)]
    for i, htxt in enumerate(["", "Service", "Tarif"]):
        c = t.rows[0].cells[i]; c.width = widths[i]; shade(c, HEADFILL)
        p = c.paragraphs[0]; r = p.add_run(htxt); r.bold = True; r.font.size = Pt(8.5); r.font.color.rgb = MUTED
        letter(r, 20)
        p.paragraph_format.space_after = Pt(2); p.paragraph_format.space_before = Pt(2)
    for num, name, price, tint in rows:
        rw = t.add_row()
        vals = [num, name, price]
        for i, val in enumerate(vals):
            c = rw.cells[i]; c.width = widths[i]
            if tint: shade(c, TINT)
            cell_borders(c, ["bottom"])
            p = c.paragraphs[0]; r = p.add_run(val); r.font.size = Pt(9)
            p.paragraph_format.space_after = Pt(3); p.paragraph_format.space_before = Pt(3)
            if i == 0: r.bold = True; r.font.color.rgb = V
            elif i == 2: r.bold = True; r.font.color.rgb = INK; p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
            else: r.font.color.rgb = INK
    para(doc, "Le cœur du modèle est l'accompagnement continu (ligne 4). Le seuil de viabilité de 86 000 $ – 96 000 $/an repose sur 2 à 3 implantations + 3 à 4 accompagnements actifs — scénarios du plan d'affaires, à valider par le pilote.",
         size=8.5, color=MUTED, space_before=8)
    footer(doc, "Franco Vision · Grille tarifaire v1.0")
    doc.save(out); print("saved", out)

one_pager(sys.argv[1] if len(sys.argv) > 1 else "FRANCO-VISION-ONE-PAGER.docx")
accord(sys.argv[2] if len(sys.argv) > 2 else "FRANCO-VISION-ACCORD-PILOTE.docx")
grille(sys.argv[3] if len(sys.argv) > 3 else "FRANCO-VISION-GRILLE-TARIFAIRE.docx")
