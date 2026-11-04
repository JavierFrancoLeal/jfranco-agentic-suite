# Franco Vision one-pager v2 — brand-grade visual design (Apple/Google style).
# Generates the hero/footer gradient art with Pillow, then composes the DOCX.
import sys, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

BLUE = (0x4D, 0x6B, 0xFE); VIOLET = (0x7C, 0x5C, 0xFF); LILAC = (0xA7, 0x8B, 0xFA)
INK = RGBColor(0x10, 0x18, 0x28); MUTED = RGBColor(0x66, 0x70, 0x85)
V = RGBColor(0x7C, 0x5C, 0xFF); B = RGBColor(0x4D, 0x6B, 0xFE)
FONT = "/System/Library/Fonts/Helvetica.ttc"
ICON = "apps/desktop/assets/icon.png"
ASSDIR = "tools/one-pager-assets"
os.makedirs(ASSDIR, exist_ok=True)

def F(size, bold=False):
    try:
        return ImageFont.truetype(FONT, size, index=1 if bold else 0)
    except Exception:
        return ImageFont.truetype(FONT, size, index=0)

def gradient(w, h, stops, diagonal=True):
    img = Image.new("RGB", (w, h))
    px = img.load()
    for y in range(h):
        for x in range(w):
            t = (x + y) / (w + h) if diagonal else y / h
            t = max(0.0, min(1.0, t))
            # piecewise 3-stop interpolation
            if t < 0.5:
                tt = t * 2
                c = tuple(int(stops[0][i] + (stops[1][i] - stops[0][i]) * tt) for i in range(3))
            else:
                tt = (t - 0.5) * 2
                c = tuple(int(stops[1][i] + (stops[2][i] - stops[1][i]) * tt) for i in range(3))
            px[x, y] = c
    return img

def hero_art():
    w, h = 2480, 640
    img = gradient(w, h, [BLUE, VIOLET, LILAC])
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    for cx, cy, r, a in [(2150, 80, 420, 70), (2200, 560, 500, 60), (180, 620, 380, 50)]:
        gd.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 255, 255, a))
    glow = glow.filter(ImageFilter.GaussianBlur(90))
    img = Image.alpha_composite(img.convert("RGBA"), glow)
    d = ImageDraw.Draw(img)
    icon = Image.open(ICON).convert("RGBA").resize((300, 300), Image.LANCZOS)
    img.alpha_composite(icon, (90, 170))
    d.text((450, 190), "Franco Vision", font=F(140, True), fill=(255, 255, 255), stroke_width=3, stroke_fill=(255, 255, 255))
    d.text((458, 380), "L'humain au sommet · L'IA en soutien", font=F(58), fill=(240, 244, 255))
    d.text((460, 490), "Produit : Le Veilleux — distribution DeepSeek Harness · Québec", font=F(44), fill=(224, 231, 255))
    img.convert("RGB").save(f"{ASSDIR}/hero.png", quality=95)
    return f"{ASSDIR}/hero.png"

def footer_art():
    w, h = 2480, 220
    img = gradient(w, h, [VIOLET, BLUE, BLUE])
    d = ImageDraw.Draw(img)
    d.text((90, 60), "Le Veilleux", font=F(64, True), fill=(255, 255, 255))
    tw = d.textlength("Le Veilleux", font=F(64, True))
    d.text((w - 90 - 700, 78), "francovision.quebec  ·  Charlevoix", font=F(44), fill=(230, 235, 255), anchor="ra")
    img.save(f"{ASSDIR}/footer.png", quality=95)
    return f"{ASSDIR}/footer.png"

def shade(cell, hexcolor):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd"); shd.set(qn("w:val"), "clear"); shd.set(qn("w:fill"), hexcolor)
    tcPr.append(shd)

def cell_border(cell, left_pt=None, color="7C5CFF"):
    tcPr = cell._tc.get_or_add_tcPr()
    borders = OxmlElement("w:tcBorders")
    if left_pt:
        for side in ("left",):
            el = OxmlElement(f"w:{side}")
            el.set(qn("w:val"), "single"); el.set(qn("w:sz"), str(left_pt * 8))
            el.set(qn("w:color"), color)
            borders.append(el)
    tcPr.append(borders)

def title(doc, text, size=11, color=V, space_before=8, space_after=4, tracking=40):
    p = doc.add_paragraph()
    r = p.add_run(text.upper())
    r.font.size = Pt(size); r.bold = True; r.font.color.rgb = color
    rPr = r._r.get_or_add_rPr()
    sp = OxmlElement("w:spacing"); sp.set(qn("w:val"), str(tracking)); rPr.append(sp)
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after = Pt(space_after)
    return p

def numbered_block(doc, num, lead, rest):
    t = doc.add_table(rows=1, cols=2)
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    t.autofit = False
    t.columns[0].width = Cm(2.0); t.columns[1].width = Cm(16.2)
    c0, c1 = t.rows[0].cells
    p0 = c0.paragraphs[0]
    r0 = p0.add_run(num)
    r0.font.size = Pt(34); r0.bold = True; r0.font.color.rgb = V
    p1 = c1.paragraphs[0]
    r1 = p1.add_run(lead); r1.bold = True; r1.font.size = Pt(10.5); r1.font.color.rgb = INK
    r2 = p1.add_run(rest); r2.font.size = Pt(9.5); r2.font.color.rgb = MUTED
    p1.paragraph_format.space_after = Pt(7)
    return t

def chips(doc, items):
    t = doc.add_table(rows=1, cols=len(items))
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    t.autofit = False
    w = 18.2 / len(items)
    for i, (big, small) in enumerate(items):
        c = t.rows[0].cells[i]; c.width = Cm(w)
        shade(c, "F1EEFD")
        p = c.paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(big + "\n"); r.bold = True; r.font.size = Pt(11); r.font.color.rgb = V
        r2 = p.add_run(small); r2.font.size = Pt(8); r2.font.color.rgb = MUTED
    return t

def para(doc, text, size=9.5, color=INK, bold=False, align=None, space_after=4, space_before=0):
    p = doc.add_paragraph(); r = p.add_run(text)
    r.font.size = Pt(size); r.font.color.rgb = color; r.bold = bold
    if align: p.alignment = align
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.space_before = Pt(space_before)
    return p

def build(out):
    hero = hero_art(); footer = footer_art()
    doc = Document()
    s = doc.sections[0]
    s.top_margin = Cm(0); s.bottom_margin = Cm(0); s.left_margin = Cm(1.4); s.right_margin = Cm(1.4)

    p = doc.add_paragraph(); p.paragraph_format.space_after = Pt(0)
    p.add_run().add_picture(hero, width=Cm(18.2))

    title(doc, "Ce qui n'existe nulle part ailleurs — la nouveauté en quatre preuves", size=10.5, space_before=6)
    numbered_block(doc, "01", "EL FUEGO — le premier standard documenté de transfert de savoir humain-IA. ",
        "Chaque friction entre l'humain et l'IA devient une leçon permanente dans un registre canonique (23 leçons réelles). Le savoir ne se perd plus : il s'hérite — le feu transmis de génération en génération.")
    numbered_block(doc, "02", "Les 7 organes — un flux de travail agentique avec une constitution. ",
        "Écouter → détecter → l'IA propose → l'humain décide → vérification → notation → enseignement → archéologie du code. La pyramide inversée : l'humain au sommet. Chaque décision est classée, vérifiée, traçable.")
    numbered_block(doc, "03", "La caisse virtuelle et le contre-registre — la preuve comptable du ROI. ",
        "Le système enregistre ce qui est vendu ; le terminal déclare ce qui est encaissé ; la variance détecte la fuite — démontré : un écart de −1,00 $ détecté automatiquement en test réel. Chaque facture est justifiée par le Z-rapport.")
    numbered_block(doc, "04", "La preuve vivante — un produit réel, construit et testé. ",
        "Démo publique en 10 langues (logique Apple), double cerveau (rapide + raisonneur), porte unique, écran de démarrage de marque, caisse, tableau de bord en temps réel — sur macOS, Windows, Linux, Android et iOS.")

    title(doc, "La valeur — ce que le propriétaire cessera de payer", size=10.5)
    chips(doc, [
        ("Conciliation", "heures du comptable remplacées par le contre-registre"),
        ("Pertes", "paiements perdus et double saisie détectés automatiquement"),
        ("Formation", "la mémoire du système enseigne elle-même"),
    ])
    para(doc, "Seuil de viabilité : 86 000 $ – 96 000 $/an · Pilote de 6 mois à tarif opérationnel — aucune projection non validée sur le terrain. Démarche antifragile : le pilote est le socle de toute donnée future.",
         size=8.5, color=MUTED, space_before=5, space_after=5)

    title(doc, "L'offre", size=10.5, space_before=4)
    para(doc, "0 $ Rencontre et estimation → Implantation clé en main → Accompagnement continu (le cœur) → Ateliers et formations. Cinq services, trois sources de revenus : implantation, services gérés, innovation sectorielle.", size=9.5, space_after=5)

    t = doc.add_table(rows=1, cols=1)
    c = t.rows[0].cells[0]
    shade(c, "EDE9FE"); cell_border(c, left_pt=3)
    pc = c.paragraphs[0]
    r = pc.add_run("L'APPUI RECHERCHÉ — SADC Charlevoix : accompagnement et prêt conditionnel (25 000 $) dédié à la phase pilote, remboursé à partir du 25ᵉ mois une fois la rentabilité confirmée. En complément : Futurpreneur Canada et programme LIFT de la BDC.")
    r.font.size = Pt(9); r.font.color.rgb = INK

    para(doc, "Javier Alejandro Franco Leal · francovision.quebec · github.com/JavierFrancoLeal/jfranco-agentic-suite · Open source (MIT)",
         size=8, color=MUTED, align=WD_ALIGN_PARAGRAPH.CENTER, space_before=7, space_after=0)

    pf = doc.add_paragraph(); pf.paragraph_format.space_before = Pt(4); pf.paragraph_format.space_after = Pt(0)
    pf.add_run().add_picture(footer, width=Cm(18.2))

    doc.save(out)
    print("saved", out)

if __name__ == "__main__":
    build(sys.argv[1] if len(sys.argv) > 1 else "FRANCO-VISION-ONE-PAGER.docx")
