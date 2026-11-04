# Trasunto — M1 (accord de pilote) + M2 (grille tarifaire) generator.
import sys, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

BLUE=(0x4D,0x6B,0xFE); VIOLET=(0x7C,0x5C,0xFF); LILAC=(0xA7,0x8B,0xFA)
INK=RGBColor(0x10,0x18,0x28); MUTED=RGBColor(0x66,0x70,0x85)
V=RGBColor(0x7C,0x5C,0xFF); B=RGBColor(0x4D,0x6B,0xFE)
FONT="/System/Library/Fonts/Helvetica.ttc"
ASSDIR="tools/m1m2-assets"
os.makedirs(ASSDIR,exist_ok=True)

def F(size,bold=False):
    try: return ImageFont.truetype(FONT,size,index=1 if bold else 0)
    except Exception: return ImageFont.truetype(FONT,size,index=0)

def band(title, subtitle, path):
    w,h=2480,300
    img=Image.new("RGB",(w,h))
    px=img.load()
    for y in range(h):
        for x in range(w):
            t=(x+y)/(w+h)
            if t<0.5: c=tuple(int(BLUE[i]+(VIOLET[i]-BLUE[i])*t*2) for i in range(3))
            else: c=tuple(int(VIOLET[i]+(LILAC[i]-VIOLET[i])*(t-0.5)*2) for i in range(3))
            px[x,y]=c
    d=ImageDraw.Draw(img)
    d.text((80,60),title,font=F(96,True),fill=(255,255,255))
    d.text((82,180),subtitle,font=F(44),fill=(233,238,255))
    img.save(path,quality=95)
    return path

def shade(cell,hexcolor):
    tcPr=cell._tc.get_or_add_tcPr()
    shd=OxmlElement("w:shd"); shd.set(qn("w:val"),"clear"); shd.set(qn("w:fill"),hexcolor); tcPr.append(shd)

def cell_border(cell,left_pt=None,color="7C5CFF"):
    tcPr=cell._tc.get_or_add_tcPr()
    borders=OxmlElement("w:tcBorders")
    if left_pt:
        el=OxmlElement("w:left")
        el.set(qn("w:val"),"single"); el.set(qn("w:sz"),str(left_pt*8)); el.set(qn("w:color"),color)
        borders.append(el)
    tcPr.append(borders)

def title(doc,text,size=10.5,space_before=8,space_after=4):
    p=doc.add_paragraph(); r=p.add_run(text.upper())
    r.font.size=Pt(size); r.bold=True; r.font.color.rgb=V
    p.paragraph_format.space_before=Pt(space_before); p.paragraph_format.space_after=Pt(space_after)
    return p

def para(doc,text,size=9.5,color=INK,bold=False,align=None,space_after=4,space_before=0):
    p=doc.add_paragraph(); r=p.add_run(text)
    r.font.size=Pt(size); r.font.color.rgb=color; r.bold=bold
    if align: p.alignment=align
    p.paragraph_format.space_after=Pt(space_after); p.paragraph_format.space_before=Pt(space_before)
    return p

def bullet(doc,lead,rest,size=9.5):
    p=doc.add_paragraph()
    r1=p.add_run("• "); r1.font.size=Pt(size); r1.font.color.rgb=V; r1.bold=True
    r2=p.add_run(lead); r2.bold=True; r2.font.size=Pt(size); r2.font.color.rgb=INK
    r3=p.add_run(rest); r3.font.size=Pt(size); r3.font.color.rgb=MUTED
    p.paragraph_format.space_after=Pt(3)
    return p

def new_doc(band_img):
    doc=Document()
    s=doc.sections[0]
    s.top_margin=Cm(0); s.bottom_margin=Cm(0.8); s.left_margin=Cm(1.4); s.right_margin=Cm(1.4)
    p=doc.add_paragraph(); p.paragraph_format.space_after=Pt(0)
    p.add_run().add_picture(band_img,width=Cm(18.2))
    return doc

# ── M1: Accord de pilote ────────────────────────────────────
def m1(out):
    img=band("Accord de pilote — 6 mois","Trasunto × [Entreprise cliente] · Fanal",f"{ASSDIR}/band-m1.png")
    doc=new_doc(img)
    para(doc,"ENTRE : Trasunto, Charlevoix (Québec), ci-après « Trasunto » ; ET : [Nom de l'entreprise], [ville], ci-après « le Client ».",space_after=6)
    title(doc,"Objet et durée",space_before=2)
    para(doc,"Pilote de 6 mois — implantation de Fanal (flux de travail agentique + caisse virtuelle + contre-registre), à tarif opérationnel (couvre uniquement les frais, sans marge) : 349 $/mois.")
    title(doc,"Inclus")
    bullet(doc,"Implantation clé en main : ","diagnostic, installation, personnalisation, formation du personnel.")
    bullet(doc,"Accompagnement continu : ","support, itérations et ajustements pendant les 6 mois.")
    bullet(doc,"La preuve comptable : ","caisse virtuelle et Z-rapport exportable chaque jour.")
    title(doc,"Engagements du Client")
    bullet(doc,"1 heure de rétroaction honnête par semaine ","(test – rétroaction – ajustement).")
    bullet(doc,"Accès au terrain ","pour la collecte des données réelles du pilote.")
    bullet(doc,"Autorisation d'enregistrer les leçons ","de façon anonymisée (standard Knowledge Ledger — aucun nom de client ni de personne).")
    title(doc,"Démarche antifragile")
    para(doc,"Aucune projection non validée : le pilote est le moteur de toute donnée future. À la fin des 6 mois : (a) reconduction au tarif commercial selon la grille tarifaire v1, ou (b) sortie sans frais cachés — le Client conserve ses Z-rapports exportés.")
    title(doc,"Résiliation")
    para(doc,"30 jours de préavis, sans pénalité, par l'une ou l'autre partie.")
    para(doc,"Signé à _____________________, le ___________________________",space_before=10,space_after=10)
    t=doc.add_table(rows=1,cols=2); t.alignment=WD_TABLE_ALIGNMENT.CENTER
    for i,who in enumerate(["Trasunto","Le Client"]):
        c=t.rows[0].cells[i]
        p=c.paragraphs[0]; r=p.add_run(who+"\n\n\n\n_______________________"); r.font.size=Pt(9.5); r.font.color.rgb=INK
        p.alignment=WD_ALIGN_PARAGRAPH.CENTER
    doc.save(out); print("saved",out)

# ── M2: Grille tarifaire v1 ─────────────────────────────────
def m2(out):
    img=band("Grille tarifaire — version 1","Trasunto · tarifs post-pilote · Fanal",f"{ASSDIR}/band-m2.png")
    doc=new_doc(img)
    rows=[
        ("0","Rencontre et estimation écrite","Gratuit"),
        ("1","Diagnostic de préparation à l'IA","Gratuit (inclus)"),
        ("2","Implantation et automatisation — par problème à résoudre","1 500 $ – 4 000 $ (forfait après estimation)"),
        ("3","Intégration d'outils existants et formation","750 $/journée (ou inclus au forfait)"),
        ("4a","Accompagnement continu — Essentiel : 1 site, jusqu'à 10 travailleurs, caisse + rapports + support courriel","249 $/mois"),
        ("4b","Accompagnement continu — Pro : double cerveau, rapports avancés, support prioritaire, révision mensuelle","449 $/mois"),
        ("4c","Accompagnement continu — Sur mesure (multi-sites, kiosque, matériel)","Sur devis"),
        ("5","Ateliers, conférences et formations","750 $/demi-journée · 1 200 $/journée"),
    ]
    t=doc.add_table(rows=1,cols=3); t.alignment=WD_TABLE_ALIGNMENT.CENTER; t.autofit=False
    widths=[Cm(1.4),Cm(11.6),Cm(5.2)]
    hdr=["","Service","Tarif"]
    for i,htxt in enumerate(hdr):
        c=t.rows[0].cells[i]; c.width=widths[i]; shade(c,"4D6BFE")
        p=c.paragraphs[0]; r=p.add_run(htxt); r.bold=True; r.font.size=Pt(10); r.font.color.rgb=RGBColor(0xFF,0xFF,0xFF)
    for num,name,price in rows:
        rw=t.add_row()
        vals=[num,name,price]
        for i,val in enumerate(vals):
            c=rw.cells[i]; c.width=widths[i]
            p=c.paragraphs[0]; r=p.add_run(val); r.font.size=Pt(9)
            if i==0: r.bold=True; r.font.color.rgb=V
            elif i==2: r.bold=True; r.font.color.rgb=INK
            else: r.font.color.rgb=INK
            if num.startswith("4"): shade(c,"F5F2FE")
    para(doc,"Tarifs en dollars canadiens, taxes en sus. Le cœur du modèle est l'accompagnement continu (ligne 4) : le seuil de viabilité de 86 000 $ – 96 000 $/an repose sur 2 à 3 implantations + 3 à 4 accompagnements actifs (scénarios du plan d'affaires, à valider par le pilote).",
         size=8.5,color=MUTED,space_before=6)
    doc.save(out); print("saved",out)

m1(sys.argv[1] if len(sys.argv)>1 else "FRANCO-VISION-ACCORD-PILOTE.docx")
m2(sys.argv[2] if len(sys.argv)>2 else "FRANCO-VISION-GRILLE-TARIFAIRE.docx")
