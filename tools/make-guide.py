# Franco Vision — the free lead magnet: "10 façons simples d'utiliser l'IA".
# Same design system as the other documents (blue accent, Arial, fr-CA).
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
HAIR = "E5E7EB"
TINT = "F5F7FF"
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

def para(doc, text="", size=9.5, color=INK, bold=False, align=None, space_after=4, space_before=0, line=1.18):
    p = doc.add_paragraph(); r = p.add_run(text)
    r.font.size = Pt(size); r.font.color.rgb = color; r.bold = bold
    if align is not None: p.alignment = align
    pf = p.paragraph_format
    pf.space_after = Pt(space_after); pf.space_before = Pt(space_before); pf.line_spacing = line
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
    p0.add_run().add_picture(LOCKUP, width=Cm(3.6))
    pad(c0, 0, 0)
    p1 = c1.paragraphs[0]; p1.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    r4 = p1.add_run(doctype); r4.font.size = Pt(8); r4.bold = True; r4.font.color.rgb = MUTED
    pad(c1, 0, 0)
    return t

def way(doc, n, title, what, keep, tag):
    t = doc.add_table(rows=1, cols=2)
    t.autofit = False
    t.columns[0].width = Cm(1.5); t.columns[1].width = Cm(16.1)
    c0, c1 = t.rows[0].cells
    p0 = c0.paragraphs[0]
    r0 = p0.add_run(f"{n:02d}")
    r0.font.size = Pt(18); r0.bold = True; r0.font.color.rgb = V
    p1 = c1.paragraphs[0]
    r1 = p1.add_run(title + " — "); r1.bold = True; r1.font.size = Pt(10); r1.font.color.rgb = INK
    r2 = p1.add_run(what); r2.font.size = Pt(9.5); r2.font.color.rgb = MUTED
    p2 = c1.add_paragraph()
    r3 = p2.add_run("Vous gardez : "); r3.bold = True; r3.font.size = Pt(8.5); r3.font.color.rgb = V
    r4 = p2.add_run(keep); r4.font.size = Pt(8.5); r4.font.color.rgb = MUTED
    p2.paragraph_format.space_after = Pt(1)
    p3 = c1.add_paragraph()
    r5 = p3.add_run(tag); r5.font.size = Pt(7.5); r5.bold = True
    r5.font.color.rgb = V if tag == TAG_P else FAINT
    p3.paragraph_format.space_after = Pt(6)
    return t

TAG_P = "Le Veilleux — installé chez vous"
TAG_S = "Service — livré par Franco Vision"
WAYS = [
    ("Vos publications sur les réseaux sociaux",
     "l'IA prépare les textes et la programmation ; vous révisez et publiez.",
     "la touche finale — chaque mot passe par vous.", TAG_S),
    ("Vos réponses aux courriels courants",
     "l'IA rédige les brouillons ; vous les validez et les envoyez.",
     "votre voix et votre signature.", TAG_S),
    ("Vos devis et soumissions",
     "l'IA remplit les gabarits à partir de vos données ; vous signez et envoyez.",
     "les prix et les engagements.", TAG_S),
    ("Le classement des factures et reçus",
     "l'IA extrait, classe et signale les anomalies ; le comptable valide.",
     "la validation comptable.", TAG_S),
    ("Les comptes rendus de réunions et d'appels",
     "l'IA résume et liste les décisions ; vous confirmez.",
     "la liste finale des engagements.", TAG_P),
    ("Vos communications en deux langues",
     "l'IA traduit pour vos visiteurs et partenaires ; vous choisissez le ton.",
     "le message exact.", TAG_P),
    ("Vos offres d'emploi et descriptions de poste",
     "l'IA propose ; vous approuvez avant publication.",
     "le dernier mot sur votre équipe.", TAG_S),
    ("Votre agenda et vos relances",
     "l'IA propose l'ordre de la semaine ; vous confirmez.",
     "vos priorités.", TAG_S),
    ("La lecture de vos avis clients",
     "l'IA dégage les tendances ; vous décidez quoi répondre et quoi changer.",
     "la relation avec vos clients.", TAG_P),
    ("Votre caisse et votre rapport du jour",
     "Le Veilleux consigne les ventes, concilie la caisse et prépare le rapport.",
     "les décisions — le système montre, vous décidez.", TAG_P),
]

doc = Document()
s = doc.sections[0]
s.top_margin = Cm(1.3); s.bottom_margin = Cm(1.2)
s.left_margin = Cm(1.6); s.right_margin = Cm(1.6)
st = doc.styles["Normal"]
st.font.name = "Arial"; st.font.size = Pt(9.5)
rPr = st.element.get_or_add_rPr()
rFonts = rPr.find(qn("w:rFonts"))
if rFonts is None:
    rFonts = OxmlElement("w:rFonts"); rPr.append(rFonts)
for attr in ("ascii", "hAnsi", "cs"):
    rFonts.set(qn("w:" + attr), "Arial")
lang = OxmlElement("w:lang"); lang.set(qn("w:val"), "fr-CA"); rPr.append(lang)

header(doc, "GUIDE GRATUIT")
rule(doc)
para(doc, "10 façons simples d'utiliser l'IA dans votre PME, sans perdre le contrôle", size=16, bold=True, space_after=4)
para(doc, "Chaque façon suit la même règle : l'IA prépare, VOUS décidez. Voici dix gestes concrets qui font gagner des heures chaque semaine — sans jargon, sans risque, sans remplacer ce qui marche.",
     size=9.5, color=MUTED, space_after=10)
for i, (t_, w_, k_, tag_) in enumerate(WAYS, 1):
    way(doc, i, t_, w_, k_, tag_)
rule(doc, color="E5E7EB", sz=4, space_after=6)
para(doc, "Vous voulez voir ces dix gestes en action dans VOTRE entreprise ? La rencontre découverte est gratuite : nous venons chez vous, nous montrons — et vous décidez.",
     size=9.5, bold=True, space_after=4)
para(doc, "Franco Vision inc. · Charlevoix, Québec · Rencontre découverte gratuite · Franco Vision · Guide v1.0 · Novembre 2026",
     size=7.5, color=FAINT, align=WD_ALIGN_PARAGRAPH.CENTER)

out = sys.argv[1] if len(sys.argv) > 1 else "FRANCO-VISION-GUIDE-10-FACONS.docx"
doc.save(out)
print("saved", out)
