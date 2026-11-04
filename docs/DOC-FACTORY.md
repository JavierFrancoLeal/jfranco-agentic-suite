# DOC-FACTORY — the professional document techniques kit

*The reusable artifact for every future document. A Python library
(`tools/docfx.py`) plus this technique list. All Trasunto documents
are generated with it.*

## The library

`tools/docfx.py` — import it from any generator:

```python
import sys; sys.path.insert(0, "tools")
from docfx import *
doc = new_doc(title, subject)          # Arial, fr-CA, margins, core properties
header_block(doc, "PLAN D'AFFAIRES")   # logo lockup + doctype label
rule(doc)                              # hairline brand rule
section(doc, "1", "Title", "Audience") # delegable reading guide
para / bullet / cite                   # text, bullets, hyperlinks
table3(doc, rows, widths, header)      # pro tables (see below)
footer(doc, text, docid)               # PAGE field + doc id
```

## The professional techniques implemented

1. **Boxes never straddle pages** — `cantSplit` (rows indivisible) +
   `keep_together` (every row chained to the next with keep-with-next):
   the whole box moves together or not at all.
2. **Table headers repeat** — `tblHeader` on the first row: if a table
   ever continues, its header reappears on the next page.
3. **No orphan/widow lines** — `w:widowControl` on the Normal style and
   every paragraph.
4. **Headings stay with their content** — keep-with-next on section
   labels and titles.
5. **Page numbers** — `PAGE` field in the footer of every document.
6. **Document metadata** — core properties (title, author, subject,
   company) so the file identifies itself in any OS.
7. **Hyperlinks** — blue, underlined, external relationships.
8. **Delegable reading guides** — every section says who reads it.
9. **Consistent house style** — Arial, fr-CA, the blue #4D6BFE accent,
   gray hairlines, one design language.
10. **Balanced emphasis** — bold only for the essential (the creator's
    rule from the recovered sessions).

## The editorial rules (companion)

See `docs/CLAUDE-EDITORIAL-RULES.md`: the creator's DNA and the rules
mined from the Nikan generator — no meta-pointers, narrative flow,
modest numbers, no over-promising, one concept defined once.

## Usage for a new document

1. Copy `tools/make-bible.py` as a template.
2. Replace the content, keep the docfx imports.
3. `python3 tools/<your-generator>.py && export to PDF via LibreOffice Kit`.
4. Audit with the DNA checklist (pointers, over-promises, repeats).
