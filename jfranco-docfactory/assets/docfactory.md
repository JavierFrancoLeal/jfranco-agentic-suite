# Docfactory — the professional document factory

Use this skill whenever a professional document is created or polished
(Word/PDF: business plans, one-pagers, agreements, guides). Two pillars:
the consulting techniques and the editorial DNA. Both were validated on
real documents and are implemented in a reusable library.

## Pillar 1 — The consulting techniques (layout)

1. **Boxes never straddle pages — the sustainable balance** —
   `cantSplit` on every table row (a row never breaks). SMALL boxes
   (≤4 rows) also get the keep-next chain, so the whole box moves
   together. TALL tables do NOT get the chain: they flow across pages
   with a repeating header (`tblHeader`). Forcing a tall box whole is
   the mistake that creates giant white gaps — and an orphaned section
   title means the header chain ends before the table: chain the title
   AND let tall content flow.
2. **Table headers repeat** — `tblHeader` on the first row: if a table
   continues on another page, its header reappears.
3. **No orphan/widow lines** — `widowControl` on the Normal style and
   every paragraph.
4. **Headings stick to their content** — keep-with-next on section
   labels and titles.
5. **Page numbers** — a real PAGE field in the footer.
6. **Document metadata** — core properties (title, author, subject,
   company) so the file identifies itself in any operating system.
7. **Hyperlinks** — blue, underlined, external relationships, one per
   claim.
8. **Delegable reading guides** — every section names its reader
   ("À lire par : ...").
9. **One design language** — Arial, a single accent color, gray
   hairlines, generous line spacing (1.18).
10. **Balanced emphasis** — bold only for the essential.

## Pillar 2 — The editorial DNA (writing)

- **No meta-pointers**: never "voir la section X", never "(the sources
  are in section 2)". If a link proves it, the link proves it.
- **Narrative flow**: the text reads like a story; nothing is deferred
  to another part.
- **Modest numbers**: verify every figure against a public source or
  mark it "en suspens, à valider". No exaggerated projections.
- **No over-promising**: never "sans risques" — promise what is real
  (control, accountability, accompaniment).
- **One concept defined once**: no repetitions; if a point must
  resurface, it resurfaces in its exact place, not everywhere.
- **Human accountability**: the AI prepares; the human decides, signs
  and assumes — and this is a selling point, not a limitation.

## The library

The plugin assets contain `docfx.py` — a python-docx library that
implements Pillar 1 (new_doc, header_block, rule, section, para, bullet,
cite, table3, footer). To use it: copy `docfx.py` into the workspace,
then in the generator:

```python
import sys; sys.path.insert(0, ".")
from docfx import *
doc = new_doc(title, subject)
table3(doc, rows, widths, header=("A", "B", "C"))
footer(doc, "Company line", "Document id · Date")
```

## Checklist before delivering

1. Every table row has cantSplit + the keep-next chain.
2. No section header is orphaned at a page bottom.
3. Page numbers and metadata present.
4. No "voir la section", no "sans risques", no repeated concepts.
5. Accents survive copy-paste (explicit font: Arial, fr-CA language).
6. Every claim links to a verifiable public source.
