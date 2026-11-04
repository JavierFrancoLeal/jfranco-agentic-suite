# Generates the FRANCO IA one-pager (SADC-ready) with subtle Fanal branding.
import sys
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

BLUE = RGBColor(0x4D, 0x6B, 0xFE)
VIOLET = RGBColor(0x7C, 0x5C, 0xFF)
INK = RGBColor(0x10, 0x18, 0x28)
MUTED = RGBColor(0x66, 0x70, 0x85)
LILAC_BG = "EDE9FE"
BAND_BG = "4D6BFE"

def shade(cell, hexcolor):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:fill"), hexcolor)
    tcPr.append(shd)

def para(doc, text, size=10, color=INK, bold=False, align=None, space_after=4, space_before=0):
    p = doc.add_paragraph()
    r = p.add_run(text)
    r.font.size = Pt(size)
    r.font.color.rgb = color
    r.bold = bold
    if align: p.alignment = align
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.space_before = Pt(space_before)
    return p

def rich(doc, lead, rest, size=10, space_after=5):
    p = doc.add_paragraph()
    r1 = p.add_run(lead)
    r1.bold = True
    r1.font.size = Pt(size)
    r1.font.color.rgb = VIOLET
    r2 = p.add_run(rest)
    r2.font.size = Pt(size)
    r2.font.color.rgb = INK
    p.paragraph_format.space_after = Pt(space_after)
    return p

doc = Document()
for s in doc.sections:
    s.top_margin = Cm(1.2); s.bottom_margin = Cm(1.0)
    s.left_margin = Cm(1.4); s.right_margin = Cm(1.4)

# ── Brand band ──────────────────────────────────────────────
t = doc.add_table(rows=1, cols=2)
t.alignment = WD_TABLE_ALIGNMENT.CENTER
t.autofit = False
t.columns[0].width = Cm(10.5); t.columns[1].width = Cm(6.5)
c0, c1 = t.rows[0].cells
shade(c0, BAND_BG); shade(c1, BAND_BG)
p = c0.paragraphs[0]
run = p.add_run()
run.add_picture("apps/desktop/assets/icon.png", width=Cm(1.1))
run2 = p.add_run("  FRANCO VISION")
run2.bold = True; run2.font.size = Pt(20); run2.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
p.alignment = WD_ALIGN_PARAGRAPH.LEFT
p2 = c1.paragraphs[0]
r = p2.add_run("Trasunto\nL'humain au sommet · L'IA en soutien · Produit : Fanal")
r.font.size = Pt(9); r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
p2.alignment = WD_ALIGN_PARAGRAPH.RIGHT

para(doc, "CE QUI N'EXISTE NULLE PART AILLEURS — la nouveauté en quatre preuves",
     size=11, color=BLUE, bold=True, space_before=6, space_after=5)

rich(doc, "1. Knowledge Ledger — le premier standard documenté de transfert de savoir humain-IA. ",
     "Chaque friction entre l'humain et l'IA devient une leçon permanente, enregistrée dans un registre canonique (23 leçons réelles issues du terrain). Le savoir ne se perd plus : il s'hérite. L'équivalent du feu transmis de génération en génération.")
rich(doc, "2. Les 7 organes — un flux de travail agentique avec une constitution. ",
     "Écouter → détecter → l'IA propose → l'humain décide → vérification → notation → enseignement → archéologie du code. La pyramide décisionnelle inversée : l'humain au sommet, l'IA en soutien. Chaque décision est classée, vérifiée et traçable.")
rich(doc, "3. La caisse virtuelle et le contre-registre — la preuve comptable du ROI. ",
     "Le système enregistre ce qui est vendu ; le terminal physique déclare ce qui est encaissé ; la variance entre les deux détecte la fuite — démontré en test réel : un écart de −1,00 $ détecté automatiquement. Chaque facture est justifiée par le Z-rapport exportable.")
rich(doc, "4. La preuve vivante. ",
     "Un produit réel, déjà construit et testé — pas une présentation : démo publique en 10 langues (logique Apple : un idiome déclaré gouverne tout), double cerveau (rapide + raisonneur), porte unique, écran de démarrage de marque, caisse, tableau de bord en temps réel — fonctionne sur macOS, Windows, Linux, Android et iOS.")

para(doc, "LA VALEUR — ce que le propriétaire cessera de payer",
     size=11, color=BLUE, bold=True, space_before=6, space_after=4)
for line in [
    "•  Les heures de conciliation facturées par le comptable — remplacées par le contre-registre.",
    "•  Les paiements perdus et la double saisie — détectés automatiquement.",
    "•  Le temps de formation répété — la mémoire du système enseigne elle-même.",
]:
    para(doc, line, size=10, space_after=2)
para(doc, "Seuil de viabilité modeste : 86 000 $ – 96 000 $/an. Pilote de 6 mois à tarif opérationnel — aucune projection non validée sur le terrain. Une démarche antifragile : le pilote est le socle de toute donnée future.",
     size=10, color=MUTED, space_after=6)

para(doc, "L'OFFRE", size=11, color=BLUE, bold=True, space_after=3)
para(doc, "0 $ Rencontre et estimation → Implantation clé en main → Accompagnement continu (le cœur du modèle) → Ateliers et formations. Cinq services, trois sources de revenus complémentaires : implantation, services gérés, innovation sectorielle.",
     size=10, space_after=6)

# ── Subtle ask box ──────────────────────────────────────────
t2 = doc.add_table(rows=1, cols=1)
c = t2.rows[0].cells[0]
shade(c, LILAC_BG)
p = c.paragraphs[0]
r = p.add_run("L'APPUI RECHERCHÉ — SADC Charlevoix : accompagnement et prêt conditionnel (25 000 $) dédié à la phase pilote, remboursé à partir du 25ᵉ mois une fois la rentabilité confirmée. En complément : Futurpreneur Canada et programme LIFT de la BDC.")
r.font.size = Pt(9); r.font.color.rgb = INK

para(doc, "Javier Alejandro FRANCO LEAL · Charlevoix, Québec · github.com/JavierFrancoLeal/jfranco-agentic-suite · Open source (MIT)",
     size=8, color=MUTED, align=WD_ALIGN_PARAGRAPH.CENTER, space_before=8)

out = sys.argv[1] if len(sys.argv) > 1 else "FRANCO-IA-ONE-PAGER.docx"
doc.save(out)
print("saved", out)
