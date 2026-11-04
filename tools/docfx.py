# docfx — the Trasunto document factory.
# Professional consulting techniques, one reusable library:
#   · cantSplit + keepNext chains (boxes never straddle pages)
#   · tblHeader (table headers repeat when a table continues)
#   · widowControl (no orphan lines at page breaks)
#   · page numbers (PAGE field) + document core properties
#   · hyperlinks, hairline rules, delegable section headers
#   · consistent palette (blue #4D6BFE, grays, Arial, fr-CA)
import sys
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
from docx.opc.constants import RELATIONSHIP_TYPE

INK = RGBColor(0x11, 0x18, 0x27)
MUTED = RGBColor(0x6B, 0x72, 0x80)
FAINT = RGBColor(0x9C, 0xA3, 0xAF)
V = RGBColor(0x4D, 0x6B, 0xFE)
GRAY = RGBColor(0x4B, 0x55, 0x63)
LOCKUP = "tools/logo-suite/trasunto-lockup.png"
FONT = "Arial"

def new_doc(title, subject, margins=(1.4, 1.2, 1.6, 1.6)):
    """Document with the house style: Arial, fr-CA, margins, core properties."""
    doc = Document()
    s = doc.sections[0]
    s.top_margin, s.bottom_margin, s.left_margin, s.right_margin = (Cm(x) for x in margins)
    st = doc.styles["Normal"]
    st.font.name = FONT
    st.font.size = Pt(9.5)
    rPr = st.element.get_or_add_rPr()
    rFonts = rPr.find(qn("w:rFonts"))
    if rFonts is None:
        rFonts = OxmlElement("w:rFonts"); rPr.append(rFonts)
    for attr in ("ascii", "hAnsi", "cs"):
        rFonts.set(qn("w:" + attr), FONT)
    lang = OxmlElement("w:lang"); lang.set(qn("w:val"), "fr-CA"); rPr.append(lang)
    wc = OxmlElement("w:widowControl"); rPr.append(wc)  # no orphan lines
    cp = doc.core_properties
    cp.title = title
    cp.author = "Javier Alejandro FRANCO LEAL"
    cp.subject = subject
    cp.company = "Trasunto inc."
    return doc

def add_hyperlink(paragraph, text, url, size=9):
    part = paragraph.part
    r_id = part.relate_to(url, RELATIONSHIP_TYPE.HYPERLINK, is_external=True)
    hl = OxmlElement("w:hyperlink"); hl.set(qn("r:id"), r_id)
    run = OxmlElement("w:r"); rPr = OxmlElement("w:rPr")
    c = OxmlElement("w:color"); c.set(qn("w:val"), "4D6BFE"); rPr.append(c)
    u = OxmlElement("w:u"); u.set(qn("w:val"), "single"); rPr.append(u)
    sz = OxmlElement("w:sz"); sz.set(qn("w:val"), str(int(size * 2))); rPr.append(sz)
    run.append(rPr)
    t_el = OxmlElement("w:t"); t_el.text = text; run.append(t_el)
    hl.append(run); paragraph._p.append(hl)

def rule(doc, color="4D6BFE", sz=6, space_after=8):
    p = doc.add_paragraph(); pPr = p._p.get_or_add_pPr(); pBdr = OxmlElement("w:pBdr")
    b = OxmlElement("w:bottom")
    b.set(qn("w:val"), "single"); b.set(qn("w:sz"), str(sz)); b.set(qn("w:color"), color); b.set(qn("w:space"), "4")
    pBdr.append(b); pPr.append(pBdr)
    p.paragraph_format.space_after = Pt(space_after)
    return p

def para(doc, text="", size=9.5, color=INK, bold=False, align=None, space_after=4, space_before=0, line=1.18, keep_next=False):
    p = doc.add_paragraph(); r = p.add_run(text)
    r.font.size = Pt(size); r.font.color.rgb = color; r.bold = bold
    if align is not None: p.alignment = align
    pf = p.paragraph_format
    pf.space_after = Pt(space_after); pf.space_before = Pt(space_before); pf.line_spacing = line
    pf.keep_with_next = keep_next
    pPr = p._p.get_or_add_pPr()
    if pPr.find(qn("w:widowControl")) is None:
        pPr.append(OxmlElement("w:widowControl"))
    return p

def section(doc, num, title, audience, size=14):
    para(doc, "SECTION " + num, size=8, color=V, bold=True, space_before=12, space_after=1, keep_next=True)
    para(doc, title, size=size, bold=True, space_after=2, keep_next=True)
    p = doc.add_paragraph()
    r = p.add_run("À lire par : " + audience)
    r.font.size = Pt(8.5); r.font.color.rgb = GRAY; r.italic = True
    p.paragraph_format.space_after = Pt(4)
    rule(doc, color="E5E7EB", sz=4, space_after=6)

def bullet(doc, lead, rest, size=9.5):
    p = doc.add_paragraph()
    r1 = p.add_run("· " + lead); r1.bold = True; r1.font.size = Pt(size); r1.font.color.rgb = INK
    r2 = p.add_run(rest); r2.font.size = Pt(size); r2.font.color.rgb = MUTED
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.line_spacing = 1.18
    return p

def cite(doc, text, url, size=9):
    p = doc.add_paragraph(); add_hyperlink(p, text, url, size=size)
    p.paragraph_format.space_after = Pt(2)
    return p

def shade(cell, hexcolor):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd"); shd.set(qn("w:val"), "clear"); shd.set(qn("w:fill"), hexcolor)
    tcPr.append(shd)

def cell_borders(cell, edges, color="E5E7EB", sz=4):
    tcPr = cell._tc.get_or_add_tcPr(); b = OxmlElement("w:tcBorders")
    for side in edges:
        el = OxmlElement("w:" + side)
        el.set(qn("w:val"), "single"); el.set(qn("w:sz"), str(sz)); el.set(qn("w:color"), color)
        b.append(el)
    tcPr.append(b)

def no_split(row):
    trPr = row._tr.get_or_add_trPr()
    if trPr.find(qn("w:cantSplit")) is None:
        trPr.append(OxmlElement("w:cantSplit"))

def keep_together(t):
    """Chain every row to the next: the whole box moves together, never straddles pages."""
    for r in t.rows[:-1]:
        for c in r.cells:
            for p in c.paragraphs:
                p.paragraph_format.keep_with_next = True

def header_repeats(t):
    """The header row repeats when the table continues on the next page."""
    trPr = t.rows[0]._tr.get_or_add_trPr()
    if trPr.find(qn("w:tblHeader")) is None:
        trPr.append(OxmlElement("w:tblHeader"))

def table3(doc, rows, widths=(2.2, 10.0, 5.0), header=("", "", ""), keep=None):
    # SUSTAINABLE RULE: small boxes (<=4 rows) stay whole; tall tables FLOW
    # across pages with a repeating header — forcing a tall box whole is what
    # creates the giant white gaps. Never both.
    if keep is None:
        keep = len(rows) <= 4
    t = doc.add_table(rows=1, cols=3); t.autofit = False
    no_split(t.rows[0])
    for i, htxt in enumerate(header):
        c = t.rows[0].cells[i]; c.width = Cm(widths[i]); shade(c, "F3F4F6")
        p = c.paragraphs[0]; r = p.add_run(htxt); r.bold = True; r.font.size = Pt(8.5); r.font.color.rgb = MUTED
        p.paragraph_format.space_before = Pt(2); p.paragraph_format.space_after = Pt(2)
    for a, b, c3 in rows:
        rw = t.add_row(); no_split(rw)
        for i, val in enumerate((a, b, c3)):
            c = rw.cells[i]; c.width = Cm(widths[i]); cell_borders(c, ["bottom"])
            p = c.paragraphs[0]; r = p.add_run(val); r.font.size = Pt(9)
            p.paragraph_format.space_before = Pt(2); p.paragraph_format.space_after = Pt(2)
            if i == 0: r.bold = True; r.font.color.rgb = V
            elif i == 2: r.bold = True; r.font.color.rgb = INK
            else: r.font.color.rgb = INK
    if keep:
        keep_together(t)
    header_repeats(t)
    return t

def header_block(doc, doctype, lockup_width=4.2):
    t = doc.add_table(rows=1, cols=2); t.alignment = WD_TABLE_ALIGNMENT.CENTER; t.autofit = False
    t.columns[0].width = Cm(11.0); t.columns[1].width = Cm(6.8)
    c0, c1 = t.rows[0].cells
    p0 = c0.paragraphs[0]; p0.add_run().add_picture(LOCKUP, width=Cm(lockup_width))
    p1 = c1.paragraphs[0]; p1.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    r4 = p1.add_run(doctype); r4.font.size = Pt(8); r4.bold = True; r4.font.color.rgb = MUTED
    return t

def footer(doc, text, docid):
    rule(doc, color="E5E7EB", sz=4, space_after=4)
    p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run(text + "  ·  Page ")
    r.font.size = Pt(7.5); r.font.color.rgb = FAINT
    fld = OxmlElement("w:fldSimple"); fld.set(qn("w:instr"), "PAGE")
    rr = OxmlElement("w:r"); tt = OxmlElement("w:t"); tt.text = "1"; rr.append(tt); fld.append(rr)
    p._p.append(fld)
    p.paragraph_format.space_after = Pt(1)
    p2 = doc.add_paragraph(); p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r2 = p2.add_run(docid)
    r2.font.size = Pt(7); r2.font.color.rgb = FAINT
    p2.paragraph_format.space_after = Pt(0)
