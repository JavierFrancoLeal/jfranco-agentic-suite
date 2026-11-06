# Trasunto — document design system v3.1 (business-first content + format fixes).
# White canvas, text wordmark, hairline rules, one violet accent.
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
V = RGBColor(0x4D, 0x6B, 0xFE)
VLIGHT = RGBColor(0xD3, 0xDB, 0xFF)
HAIR = "E5E7EB"
HEADFILL = "F3F4F6"
TINT = "F8F7FF"
LOCKUP = "tools/logo-suite/franco-vision-lockup.png"

def rule(doc, color="4D6BFE", sz=6, space_after=8):
    p = doc.add_paragraph()
    pPr = p._p.get_or_add_pPr()
    pBdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single"); bottom.set(qn("w:sz"), str(sz))
    bottom.set(qn("w:color"), color); bottom.set(qn("w:space"), "4")
    pBdr.append(bottom); pPr.append(pBdr)
    p.paragraph_format.space_after = Pt(space_after)
    return p

def letter(run, spacing=26):
    rPr = run._r.get_or_add_rPr()
    sp = OxmlElement("w:spacing"); sp.set(qn("w:val"), str(spacing)); rPr.append(sp)

def keep_together(t):
    for r in t.rows[:-1]:
        for c in r.cells:
            for p in c.paragraphs:
                p.paragraph_format.keep_with_next = True

def header_repeats(t):
    trPr = t.rows[0]._tr.get_or_add_trPr()
    if trPr.find(qn("w:tblHeader")) is None:
        trPr.append(OxmlElement("w:tblHeader"))

def para(doc, text="", size=9.5, color=INK, bold=False, align=None, space_after=4, space_before=0, line=1.18):
    p = doc.add_paragraph(); r = p.add_run(text)
    r.font.size = Pt(size); r.font.color.rgb = color; r.bold = bold
    if align is not None: p.alignment = align
    pf = p.paragraph_format
    pf.space_after = Pt(space_after); pf.space_before = Pt(space_before); pf.line_spacing = line
    return p

def label(doc, text, space_before=10, space_after=4):
    p = doc.add_paragraph(); r = p.add_run(text.upper())
    r.font.size = Pt(8); r.bold = True; r.font.color.rgb = RGBColor(0x4B, 0x55, 0x63)
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

def pad(cell, top=3, bottom=3):
    for p in cell.paragraphs:
        p.paragraph_format.space_before = Pt(top)
        p.paragraph_format.space_after = Pt(bottom)

def header(doc, doctype):
    t = doc.add_table(rows=1, cols=2)
    t.alignment = WD_TABLE_ALIGNMENT.CENTER; t.autofit = False
    t.columns[0].width = Cm(11.0); t.columns[1].width = Cm(6.8)
    c0, c1 = t.rows[0].cells
    p0 = c0.paragraphs[0]
    p0.add_run().add_picture(LOCKUP, width=Cm(4.2))
    pad(c0, 0, 0)
    p1 = c1.paragraphs[0]; p1.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    r4 = p1.add_run(doctype); r4.font.size = Pt(8); r4.bold = True; r4.font.color.rgb = MUTED
    pad(c1, 0, 0)
    return t

def footer(doc, docid):
    rule(doc, color="E5E7EB", sz=4, space_after=4)
    pn = doc.add_paragraph(); pn.alignment = WD_ALIGN_PARAGRAPH.CENTER
    rn = pn.add_run("Page "); rn.font.size = Pt(7.5); rn.font.color.rgb = FAINT
    fld = OxmlElement("w:fldSimple"); fld.set(qn("w:instr"), "PAGE")
    rr = OxmlElement("w:r"); tt = OxmlElement("w:t"); tt.text = "1"; rr.append(tt); fld.append(rr)
    pn._p.append(fld)
    pn.paragraph_format.space_after = Pt(0)
    p0 = doc.add_paragraph(); p0.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("Trasunto inc. · Charlevoix, Québec")
    r.font.size = Pt(7.5); r.font.color.rgb = FAINT
    p.paragraph_format.space_after = Pt(1)
    p2 = doc.add_paragraph(); p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r2 = p2.add_run(docid + " · Novembre 2026")
    r2.font.size = Pt(7); r2.font.color.rgb = FAINT
    p2.paragraph_format.space_after = Pt(0)

def new_doc(doctype, docid):
    doc = Document()
    cp = doc.core_properties
    cp.title = docid; cp.author = "Javier Alejandro FRANCO LEAL"; cp.subject = docid; cp.company = "Trasunto inc."
    st = doc.styles["Normal"]
    st.font.name = "Arial"
    st.font.size = Pt(9.5)
    rPr = st.element.get_or_add_rPr()
    rFonts = rPr.find(qn("w:rFonts"))
    if rFonts is None:
        rFonts = OxmlElement("w:rFonts"); rPr.append(rFonts)
    for attr in ("ascii", "hAnsi", "cs"):
        rFonts.set(qn("w:" + attr), "Arial")
    lang = OxmlElement("w:lang")
    lang.set(qn("w:val"), "fr-CA"); rPr.append(lang)
    s = doc.sections[0]
    s.top_margin = Cm(1.3); s.bottom_margin = Cm(1.2)
    s.left_margin = Cm(1.6); s.right_margin = Cm(1.6)
    header(doc, doctype)
    rule(doc)
    return doc

def bullets(doc, items, size=9.5):
    for lead, rest in items:
        lead_body(doc, "· " + lead, rest, size=size, space_after=3)

def ask_box(doc, text):
    t = doc.add_table(rows=1, cols=1)
    c = t.rows[0].cells[0]
    cell_borders(c, ["left"], color="4D6BFE", sz=12)
    p = c.paragraphs[0]
    r = p.add_run(text); r.font.size = Pt(9); r.font.color.rgb = INK
    p.paragraph_format.space_before = Pt(4); p.paragraph_format.space_after = Pt(4)
    return t

def gain_rows(doc, items):
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
        pad(c, 2, 2)
    keep_together(t)
    return t

# ── ONE-PAGER v4 — business-first, for SADC and busy owners ──
def one_pager(out):
    doc = new_doc("ONE-PAGER · SADC & ENTREPRISES", "Trasunto · One-pager v1.1")
    heading(doc, "Votre entreprise mérite l'IA — sans jargon, sans remplacer ce qui marche, sans perdre le contrôle.")
    para(doc, "Un service clé en main qui vous fait gagner du temps et de l'argent — et qui vous laisse toujours aux commandes.",
         size=10, color=MUTED, space_after=10)

    label(doc, "Ce que c'est", space_before=2)
    para(doc, "Fanal est un assistant de travail pour votre entreprise : il écoute votre équipe, consigne l'activité, tient vos comptes et prépare vos rapports — chaque jour, en français, sans que vous ayez à apprendre l'informatique. Vous décidez ; lui, il exécute et il vérifie.", space_after=4)
    para(doc, "Tourisme et hôtellerie · Agroalimentaire et terroir · Commerce et services · Construction et manufacturier · Travailleurs autonomes et professionnels.",
         size=8.5, color=MUTED, space_after=8)

    label(doc, "Ce que ça fait")
    bullets(doc, [
        ("Au fil de la journée, il consigne tout : ", "qui a demandé quoi, pour quel client, à quelle heure — sans papier ni double saisie."),
        ("En fin de journée, les ventes se concilient toutes seules : ", "ce qui a été vendu contre ce qui a été encaissé. Un écart apparaît immédiatement — erreur, oubli ou fuite."),
        ("Le rapport se prépare tout seul : ", "activité, ventes, coûts. Fini le tableur du dimanche soir."),
    ])

    label(doc, "Les trois lignes de produit")
    para(doc, "Le Publicateur rédige vos publications et vous publiez. Le Répondant lit vos messages (Messenger, courriels, Airbnb) et propose la réponse dans la langue de votre client — vous envoyez. Le Secrétaire remplit vos formulaires et factures, laisse vide ce qui est délicat — vous signez. Dans les trois cas : l'IA prépare, l'humain décide.", space_after=4)
    para(doc, "Fanal est neutre : une maison Apple, deux prises interchangeables — Google ou Microsoft 365 — et un seul cerveau, la clé du client.", size=8.5, color=MUTED, space_after=8)

    label(doc, "Comment ça vous touche")
    para(doc, "Vous gardez vos habitudes : vos outils, votre terminal de paiement, votre façon de travailler. On installe, on forme votre équipe, et vous continuez comme avant — avec un deuxième regard qui ne dort jamais. L'IA potentialise votre savoir-faire ; elle ne le remplace jamais. Vous restez maître de vos outils.", space_after=8)

    label(doc, "Ce que vous y gagnez")
    gain_rows(doc, [
        ("Du temps", "30 minutes de papier par jour = 3 semaines récupérées par année"),
        ("De l'argent", "les paiements oubliés et les erreurs de caisse, détectés le jour même"),
        ("La tranquillité", "une mémoire parfaite : chaque vente, chaque écart, chaque rapport"),
    ])
    para(doc, "Une entreprise qui perd 30 minutes par jour en papiers récupère l'équivalent de 3 semaines de travail par année. C'est ce que Fanal rend.",
         size=9, color=INK, space_before=8, space_after=8)

    label(doc, "L'offre", space_before=2)
    para(doc, "Rencontre et estimation gratuites → Implantation clé en main → Abonnement simple à partir de 249 $/mois. Pilote de 6 mois à tarif réduit pour votre première expérience, sans engagement.", space_after=8)

    ask_box(doc, "L'appui recherché — SADC Charlevoix : (1) diffuser nos services auprès des PME de la région ; (2) identifier une entreprise pilote pour tester et raffiner le produit ; (3) orienter nos clients vers les subventions fédérales et provinciales de modernisation technologique — IA (Futurpreneur, programme LIFT de la BDC, et autres) afin d'ajuster nos prix et notre modèle d'affaires.")
    footer(doc, "Trasunto · One-pager v1.1")
    doc.save(out); print("saved", out)

# ── Accord de pilote (jargon neutralisé) ────────────────────
def accord(out):
    doc = new_doc("ACCORD DE PILOTE · 6 MOIS", "Trasunto · Accord de pilote v1.1")
    heading(doc, "Accord de pilote — Fanal", size=16)
    para(doc, "ENTRE : Trasunto inc., Charlevoix (Québec) · ET : [Nom de l'entreprise], [ville], ci-après « le Client ».",
         size=9, color=MUTED, space_after=8)
    label(doc, "Objet et durée", space_before=2)
    para(doc, "Pilote de 6 mois — implantation de Fanal à tarif opérationnel (couvre uniquement les frais, sans marge) : 349 $/mois.", size=9.5)
    label(doc, "Inclus")
    bullets(doc, [
        ("Implantation clé en main — ", "installation, personnalisation et formation de votre équipe."),
        ("Accompagnement continu — ", "support, itérations et ajustements pendant les 6 mois."),
        ("La preuve comptable — ", "caisse et rapports quotidiens exportables."),
    ])
    label(doc, "Engagements du Client")
    bullets(doc, [
        ("1 heure de rétroaction honnête par semaine — ", "test – rétroaction – ajustement."),
        ("Accès au terrain — ", "pour la collecte des données réelles du pilote."),
        ("Leçons anonymisées — ", "enregistrées dans un registre interne ; aucun nom de client ni de personne."),
    ])
    label(doc, "Démarche antifragile")
    para(doc, "Aucune projection non validée : le pilote est le moteur de toute donnée future. À la fin des 6 mois : (a) reconduction au tarif commercial (grille v1), ou (b) sortie sans frais cachés — le Client conserve ses rapports exportés.", size=9.5)
    label(doc, "Résiliation")
    para(doc, "30 jours de préavis, sans pénalité, par l'une ou l'autre partie.", size=9.5, space_after=10)
    para(doc, "Signé à ______________________, le ______________________", size=9.5, space_before=8, space_after=12)
    t = doc.add_table(rows=1, cols=2); t.alignment = WD_TABLE_ALIGNMENT.CENTER
    t.autofit = False
    t.columns[0].width = Cm(8.6); t.columns[1].width = Cm(8.6)
    for i, who in enumerate(["Trasunto inc.", "Le Client"]):
        c = t.rows[0].cells[i]
        p = c.paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(who + "\n\n\n\n_______________________"); r.font.size = Pt(9.5)
        pad(c, 2, 2)
    footer(doc, "Trasunto · Accord de pilote v1.1")
    doc.save(out); print("saved", out)

# ── Grille tarifaire (jargon neutralisé) ────────────────────
def grille(out):
    doc = new_doc("GRILLE TARIFAIRE · V1", "Trasunto · Grille tarifaire v1.0")
    heading(doc, "Grille tarifaire — version 1", size=16)
    para(doc, "Tarifs post-pilote, en dollars canadiens, taxes en sus.", size=9, color=MUTED, space_after=8)
    rows = [
        ("0", "Rencontre et estimation écrite", "Gratuit", False),
        ("1", "Diagnostic de préparation à l'IA", "Gratuit", False),
        ("2", "Implantation et automatisation — par problème à résoudre", "1 500 $ – 4 000 $", False),
        ("3", "Intégration d'outils existants et formation", "750 $/journée", False),
        ("4a", "Accompagnement continu — Essentiel : 1 site, jusqu'à 10 travailleurs, caisse + rapports + support", "249 $/mois", True),
        ("4b", "Accompagnement continu — Pro : analyses approfondies, support prioritaire, révision mensuelle", "449 $/mois", True),
        ("4c", "Accompagnement continu — Sur mesure (multi-sites, kiosque, matériel)", "Sur devis", True),
        ("5", "Ateliers, conférences et formations", "750 $ / 1 200 $ par journée", False),
    ]
    t = doc.add_table(rows=1, cols=3)
    t.autofit = False
    widths = [Cm(1.3), Cm(11.2), Cm(4.7)]
    for i, htxt in enumerate(["", "Service", "Tarif"]):
        c = t.rows[0].cells[i]; c.width = widths[i]; shade(c, HEADFILL)
        p = c.paragraphs[0]; r = p.add_run(htxt); r.bold = True; r.font.size = Pt(8.5); r.font.color.rgb = MUTED
        pad(c, 2, 2)
    for num, name, price, tint in rows:
        rw = t.add_row()
        vals = [num, name, price]
        for i, val in enumerate(vals):
            c = rw.cells[i]; c.width = widths[i]
            if tint: shade(c, TINT)
            cell_borders(c, ["bottom"])
            p = c.paragraphs[0]; r = p.add_run(val); r.font.size = Pt(9)
            pad(c, 3, 3)
            if i == 0: r.bold = True; r.font.color.rgb = V
            elif i == 2: r.bold = True; r.font.color.rgb = INK; p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
            else: r.font.color.rgb = INK
    keep_together(t); header_repeats(t)
    para(doc, "Le cœur du modèle est l'accompagnement continu (ligne 4). Le seuil de viabilité de 86 000 $ – 96 000 $/an repose sur 2 à 3 implantations + 3 à 4 accompagnements actifs — scénarios du plan d'affaires, à valider par le pilote.",
         size=8.5, color=MUTED, space_before=8)

    # El modelo (a): la clave es del cliente — Trasunto no revende la IA
    heading(doc, "Le modèle de clé — souveraineté du client", size=12)
    para(doc, "La clé d'API DeepSeek appartient au client, écrite sur sa propre machine ; il recharge ses propres jetons et paie DeepSeek directement. Trasunto ne détient ni ne traite aucun renseignement personnel (Loi 25 par conception) et facture uniquement ses services : installation, automatisations, mises à jour et accompagnement.", size=9, color=MUTED, space_after=6)

    # El coeficiente sectorial (el modelo de pagos adaptado al sector)
    heading(doc, "Le coefficient sectoriel — le prix suit la demande", size=12)
    para(doc, "Certains secteurs demandent plus d'automatisations, plus de travail et plus de données. La grille de base se module par un coefficient sectoriel, à valider par le pilote :", size=9, color=MUTED, space_after=6)
    t2 = doc.add_table(rows=1, cols=3)
    t2.autofit = False
    w2 = [Cm(6.5), Cm(3.4), Cm(7.3)]
    for i, htxt in enumerate(["Secteur", "Coefficient", "Pourquoi"]):
        c = t2.rows[0].cells[i]; c.width = w2[i]; shade(c, HEADFILL)
        p = c.paragraphs[0]; r = p.add_run(htxt); r.bold = True; r.font.size = Pt(8.5); r.font.color.rgb = MUTED
        pad(c, 2, 2)
    for a2, b2, c2 in [
        ("Restauration", "× 1,0", "La base : caisse, commandes, alertes, journées"),
        ("Hébergement", "× 1,2", "Réservations, multi-langues, avis, ménage"),
        ("Tourisme et attraits", "× 1,2", "Traducteur temps réel, files, billetterie"),
        ("Agroalimentaire et détail", "× 1,1", "Étiquettes, inventaires, commandes fournisseurs"),
        ("Professionnels et travailleurs autonomes", "× 0,8", "Le niveau 1 : la pyramide entière en une personne"),
    ]:
        rw = t2.add_row()
        for i, val in enumerate([a2, b2, c2]):
            c = rw.cells[i]; c.width = w2[i]; cell_borders(c, ["bottom"])
            p = c.paragraphs[0]; r = p.add_run(val); r.font.size = Pt(9)
            pad(c, 3, 3)
            if i == 1: r.bold = True; r.font.color.rgb = V; p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            else: r.font.color.rgb = INK
    keep_together(t2); header_repeats(t2)

    # Las tres líneas de producto del catálogo de automatización (Chrome, visible)
    heading(doc, "Les trois lignes de produit d'automatisation", size=12)
    para(doc, "Fanal prépare dans le navigateur (brouillons, formulaires remplis, textes prêts) avec l'insigne toujours visible ; l'humain décide, confirme et envoie. Rien n'est publié sans sa main :", size=9, color=MUTED, space_after=6)
    t3 = doc.add_table(rows=1, cols=3)
    t3.autofit = False
    w3 = [Cm(4.0), Cm(7.6), Cm(5.6)]
    for i, htxt in enumerate(["Ligne", "Ce qu'elle automatise (préparation)", "L'envoi"]):
        c = t3.rows[0].cells[i]; c.width = w3[i]; shade(c, HEADFILL)
        p = c.paragraphs[0]; r = p.add_run(htxt); r.bold = True; r.font.size = Pt(8.5); r.font.color.rgb = MUTED
        pad(c, 2, 2)
    for a3, b3, c3 in [
        ("Le Publicateur", "Facebook, Instagram, X — brouillons rédigés, image et texte prêts, la page ouverte", "Le client publie (jamais automatique)"),
        ("Le Répondant", "Messenger, commentaires, courriels (Gmail) — réponse proposée avec sa raison", "Le client envoie ou corrige"),
        ("Le Secrétaire", "Factures (comptabilité web), formulaires, registres — champs remplis, brouillons sauvegardés", "Le client vérifie et soumet"),
    ]:
        rw = t3.add_row()
        for i, val in enumerate([a3, b3, c3]):
            c = rw.cells[i]; c.width = w3[i]; cell_borders(c, ["bottom"])
            p = c.paragraphs[0]; r = p.add_run(val); r.font.size = Pt(9)
            pad(c, 3, 3)
            if i == 0: r.bold = True; r.font.color.rgb = V
            elif i == 2: r.font.color.rgb = MUTED
            else: r.font.color.rgb = INK
    keep_together(t3); header_repeats(t3)
    para(doc, "Les CAPTCHA et la double authentification ne sont pas des limites : c'est la porte de l'humain — Fanal s'arrête et demande, par conception.", size=8.5, color=MUTED, space_after=8)

    # Los packs de automatización (la demanda sectorial = número de automatizaciones)
    heading(doc, "Les packs d'automatisations", size=12)
    para(doc, "La demande sectorielle se traduit en automatisations livrées et maintenues :", size=9, color=MUTED, space_after=6)
    for a3, b3, c3 in [
        ("Pack Essentiel", "249 $/mois", "Jusqu'à 6 automatisations actives — réparties entre le Publicateur, le Répondant et le Secrétaire"),
        ("Pack Actif", "449 $/mois", "Jusqu'à 15 automatisations actives + analyses approfondies mensuelles + support prioritaire"),
        ("Pack Intensif", "Sur devis", "Automatisations sur mesure par secteur (multi-langues, connecteurs, multi-sites, kiosque)"),
    ]:
        para(doc, "• " + a3 + " — " + c3 + " · " + b3, size=9, space_after=4)
    footer(doc, "Trasunto · Grille tarifaire v1.0")
    doc.save(out); print("saved", out)

one_pager(sys.argv[1] if len(sys.argv) > 1 else "TRASUNTO-ONE-PAGER.docx")
accord(sys.argv[2] if len(sys.argv) > 2 else "TRASUNTO-ACCORD-PILOTE.docx")
grille(sys.argv[3] if len(sys.argv) > 3 else "TRASUNTO-GRILLE-TARIFAIRE.docx")
