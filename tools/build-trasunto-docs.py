#!/usr/bin/env python3
"""Trasunto inc. / Fanal — Générateur officiel des documents en français (fr-CA).

Produit simultanément les versions .docx (via tools/docfx.py) et .pdf (rendu vectoriel
Chrome headless fidèle à la philosophie visuelle Fanal / Trasunto) :
  1. TRASUNTO-MANUEL-OPERATIONS-FINANCES.docx / .pdf
  2. TRASUNTO-GRILLE-TARIFAIRE.docx / .pdf
  3. TRASUNTO-PLAN-AFFAIRES.docx / .pdf
  4. TRASUNTO-PLAN-3ANS.docx / .pdf
  5. TRASUNTO-PLAN-SOLO.docx / .pdf
  6. TRASUNTO-ONE-PAGER.docx / .pdf
  7. TRASUNTO-ACCORD-PILOTE.docx / .pdf
  8. TRASUNTO-GUIDE-CLIENT.docx / .pdf
"""
from __future__ import annotations

import base64
import html
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))

import docfx  # noqa: E402
from docx.shared import Cm, Pt, RGBColor  # noqa: E402
from docx.enum.text import WD_ALIGN_PARAGRAPH  # noqa: E402
from docx.oxml import OxmlElement  # noqa: E402
from docx.oxml.ns import qn  # noqa: E402

CHROME_BIN = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
_CATALOG_PATH = ROOT / "supervisor" / "pricing-catalog.json"
_CATALOG = json.loads(_CATALOG_PATH.read_text(encoding="utf-8")) if _CATALOG_PATH.exists() else {}
USD_TO_CAD = float(_CATALOG.get("usdToCad", 1.40))

# Tarifs officiels vérifiés depuis supervisor/pricing-catalog.json (USD / 1M jetons)
_M = _CATALOG.get("modelsUsdPer1M", {})
_DF = _M.get("deepseek-flash", {})
_DV = _M.get("deepseek-v4-pro", {})
_GF = _M.get("gemini-3.8-flash", {})
DS_PRICES = {
    "flash_offpeak": {
        "hit": float(_DF.get("cacheHit", {}).get("offPeak", 0.003)),
        "miss": float(_DF.get("cacheMiss", {}).get("offPeak", 0.15)),
        "out": float(_DF.get("output", {}).get("offPeak", 0.60)),
    },
    "flash_peak": {
        "hit": float(_DF.get("cacheHit", {}).get("peak", 0.006)),
        "miss": float(_DF.get("cacheMiss", {}).get("peak", 0.30)),
        "out": float(_DF.get("output", {}).get("peak", 1.20)),
    },
    "v4_offpeak": {
        "hit": float(_DV.get("cacheHit", {}).get("offPeak", 0.022)),
        "miss": float(_DV.get("cacheMiss", {}).get("offPeak", 0.66)),
        "out": float(_DV.get("output", {}).get("offPeak", 1.98)),
    },
    "v4_peak": {
        "hit": float(_DV.get("cacheHit", {}).get("peak", 0.044)),
        "miss": float(_DV.get("cacheMiss", {}).get("peak", 1.32)),
        "out": float(_DV.get("output", {}).get("peak", 3.96)),
    },
}
GEMINI_FLASH = {
    "in": float(_GF.get("cacheMiss", {}).get("offPeak", 0.10)),
    "out": float(_GF.get("output", {}).get("offPeak", 0.40)),
}


def ds_usd(model_key: str, hit_k: float, miss_k: float, out_k: float) -> float:
    p = DS_PRICES[model_key]
    return (hit_k * p["hit"] + miss_k * p["miss"] + out_k * p["out"]) / 1000.0


def fmt_cad(val: float, decimals: int = 2) -> str:
    s = f"{val:,.{decimals}f}".replace(",", "\u00a0").replace(".", ",")
    return f"{s}\u00a0$"


def fmt_cad_k(val: float) -> str:
    return f"{round(val):,}".replace(",", "\u00a0") + "\u00a0$"


def compute_economics() -> dict:
    dos_std_off = ds_usd("flash_offpeak", 4, 8, 2)
    dos_std_peak = ds_usd("flash_peak", 4, 8, 2)
    dos_pro_off = 2 * ds_usd("flash_offpeak", 4, 10, 2) + ds_usd("v4_offpeak", 5, 20, 4)
    dos_pro_peak = 2 * ds_usd("flash_peak", 4, 10, 2) + ds_usd("v4_peak", 5, 20, 4)
    dos_multi_peak = (30 * GEMINI_FLASH["in"] + 3 * GEMINI_FLASH["out"]) / 1000.0 + ds_usd("v4_peak", 5, 20, 4)

    mix_cad = (0.70 * dos_std_off + 0.25 * dos_pro_peak + 0.05 * dos_multi_peak) * USD_TO_CAD
    volumes = []
    for n in (5, 10, 12, 15, 25, 40):
        old_var = 165.0 + 16.0 * n
        api_mo = mix_cad * n + 0.70  # +200 micro-appels quotidiens Téléphoniste/Répondant
        var_tot = api_mo + 1.50      # +1,50 $ frais PAD bancaire
        margin = 350.0 - var_tot
        volumes.append({
            "n": n,
            "old_var": old_var,
            "flat": 350.0,
            "api_pad": var_tot,
            "margin": margin,
            "margin_pct": (margin / 350.0) * 100.0,
        })

    def yr(label, avg_s, avg_t, avg_f, new_s, new_t, new_f, setup_s, setup_t, opex, salaries):
        mrr_annual = 12.0 * (avg_s * 350.0 + avg_t * 490.0 + avg_f * 650.0)
        setup_rev = new_s * setup_s + new_t * setup_t + new_f * 1200.0
        ca = mrr_annual + setup_rev
        var = 12.0 * (avg_s + avg_t + avg_f) * 5.50
        gross = ca - var
        ebitda = gross - opex - salaries
        tax = round(max(0.0, ebitda * 0.122), 2)
        net = ebitda - tax
        return {
            "label": label, "avg_s": avg_s, "avg_t": avg_t, "avg_f": avg_f,
            "clients_tot": avg_s + avg_t + avg_f,
            "new_str": f"{new_s} / {new_t} / {new_f}",
            "mrr_annual": mrr_annual, "setup_rev": setup_rev, "ca": ca,
            "var": var, "gross": gross, "gross_pct": (gross / ca) * 100.0,
            "opex": opex, "salaries": salaries, "ebitda": ebitda,
            "tax": tax, "net": net,
        }

    pnl = [
        yr("An 1 · Prudent", 6, 3, 0, 10, 5, 0, 350.0, 750.0, 8400.0, 0.0),
        yr("An 1 · Réaliste", 9, 5, 0, 14, 8, 0, 350.0, 750.0, 9600.0, 0.0),
        yr("An 2 · Expansion", 24, 16, 4, 20, 14, 6, 500.0, 950.0, 24000.0, 72000.0),
        yr("An 3 · Échelle QC", 55, 38, 15, 36, 24, 12, 500.0, 950.0, 52000.0, 185000.0),
    ]
    return {
        "dos_std_off": dos_std_off, "dos_std_peak": dos_std_peak,
        "dos_pro_off": dos_pro_off, "dos_pro_peak": dos_pro_peak,
        "dos_multi_peak": dos_multi_peak,
        "volumes": volumes,
        "breakeven_n": (350.0 - 165.0) / 16.0,
        "pnl": pnl,
    }


ECON = compute_economics()


def pearl_svg() -> str:
    return (
        '<svg width="34" height="34" viewBox="0 0 64 64" aria-hidden="true">'
        '<defs><linearGradient id="gF" x1="0" y1="0" x2="1" y2="1">'
        '<stop offset="0%" stop-color="#4D6BFE"/><stop offset="100%" stop-color="#7c5cff"/></linearGradient></defs>'
        '<path d="M6 32C15 16 49 16 58 32C49 48 15 48 6 32Z" fill="none" stroke="url(#gF)" stroke-width="4.2"/>'
        '<circle cx="32" cy="32" r="9.5" fill="url(#gF)"/>'
        '<circle cx="35.2" cy="28.8" r="3.2" fill="#FFFFFF"/></svg>'
    )


def lockup_b64() -> str:
    p = ROOT / "tools" / "logo-suite" / "trasunto-lockup.png"
    if not p.exists():
        return ""
    return base64.b64encode(p.read_bytes()).decode("ascii")


class FanalDoc:
    """Construit simultanément un objet python-docx soigné et son miroir HTML/PDF Fanal."""

    def __init__(self, basename: str, doctype: str, title: str, subtitle: str, doc_code: str):
        self.basename = basename
        self.doctype = doctype
        self.title = title
        self.subtitle = subtitle
        self.doc_code = doc_code

        self.docx = docfx.new_doc(title, doc_code)
        docfx.header_block(self.docx, doctype)
        docfx.rule(self.docx, color="4D6BFE", sz=8, space_after=8)
        docfx.para(self.docx, title, size=17, bold=True, space_after=3, keep_next=True)
        docfx.para(self.docx, subtitle, size=9.8, color=docfx.MUTED, space_after=10)

        self.html_blocks: list[str] = []

    def metrics(self, items: list[tuple[str, str]]) -> None:
        # DOCX table
        t = self.docx.add_table(rows=1, cols=len(items))
        t.autofit = False
        docfx.no_split(t.rows[0])
        w = 17.4 / max(1, len(items))
        for i, (big, small) in enumerate(items):
            c = t.rows[0].cells[i]
            c.width = Cm(w)
            docfx.shade(c, docfx.TINT)
            docfx.cell_borders(c, ["top", "bottom", "left", "right"], color=docfx.BORDER_SOFT, sz=4)
            p = c.paragraphs[0]
            p.paragraph_format.space_before = Pt(4)
            p.paragraph_format.space_after = Pt(2)
            r = p.add_run(big)
            r.bold = True
            r.font.size = Pt(11.5)
            r.font.color.rgb = docfx.V
            p2 = c.add_paragraph()
            p2.paragraph_format.space_before = Pt(0)
            p2.paragraph_format.space_after = Pt(4)
            r2 = p2.add_run(small)
            r2.font.size = Pt(8)
            r2.font.color.rgb = docfx.GRAY
        docfx.para(self.docx, "", size=4, space_after=4)

        # HTML strip
        cells = "".join(
            f'<div class="metric"><div class="mv">{html.escape(big)}</div><div class="ms">{html.escape(small)}</div></div>'
            for big, small in items
        )
        self.html_blocks.append(f'<div class="metrics">{cells}</div>')

    def section(self, num: str, heading: str, audience: str = "Direction & Exploitation") -> None:
        docfx.section(self.docx, num, heading, audience, size=13.5)
        self.html_blocks.append(
            f'<div class="sec-head"><div class="sec-kicker">SECTION {html.escape(num)} · {html.escape(audience)}</div>'
            f'<h2>{html.escape(heading)}</h2></div>'
        )

    def para(self, text: str, bold: bool = False, muted: bool = False) -> None:
        docfx.para(self.docx, text, size=9.5, bold=bold, color=docfx.MUTED if muted else docfx.INK, space_after=5)
        cls = "p-muted" if muted else ("p-bold" if bold else "p-body")
        self.html_blocks.append(f'<p class="{cls}">{html.escape(text)}</p>')

    def callout(self, title: str, body: str) -> None:
        t = self.docx.add_table(rows=1, cols=1)
        t.autofit = False
        docfx.no_split(t.rows[0])
        c = t.rows[0].cells[0]
        c.width = Cm(17.4)
        docfx.shade(c, docfx.TINT)
        docfx.cell_borders(c, ["left"], color="4D6BFE", sz=18)
        p = c.paragraphs[0]
        p.paragraph_format.space_before = Pt(5)
        p.paragraph_format.space_after = Pt(2)
        r1 = p.add_run(title + " — ")
        r1.bold = True; r1.font.size = Pt(9.5); r1.font.color.rgb = docfx.V
        r2 = p.add_run(body)
        r2.font.size = Pt(9.2); r2.font.color.rgb = docfx.INK
        docfx.para(self.docx, "", size=4, space_after=4)

        self.html_blocks.append(
            f'<div class="callout"><strong>{html.escape(title)}</strong> — {html.escape(body)}</div>'
        )

    def bullets(self, items: list[tuple[str, str]]) -> None:
        for lead, rest in items:
            docfx.bullet(self.docx, lead, rest, size=9.4)
        lis = "".join(
            f'<li><strong>{html.escape(lead)}</strong> {html.escape(rest)}</li>'
            for lead, rest in items
        )
        self.html_blocks.append(f'<ul class="flist">{lis}</ul>')

    def table(self, headers: list[str], rows: list[list[str]], widths_cm: list[float] | None = None,
              align_right_cols: tuple[int, ...] = ()) -> None:
        ncols = len(headers)
        if widths_cm is None:
            widths_cm = [round(17.4 / ncols, 2)] * ncols
        t = self.docx.add_table(rows=1, cols=ncols)
        t.autofit = False
        docfx.no_split(t.rows[0])
        for i, htxt in enumerate(headers):
            c = t.rows[0].cells[i]
            c.width = Cm(widths_cm[i])
            docfx.shade(c, "EDEFFF")
            docfx.cell_borders(c, ["bottom"], color="4D6BFE", sz=6)
            p = c.paragraphs[0]
            if i in align_right_cols:
                p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
            p.paragraph_format.space_before = Pt(3)
            p.paragraph_format.space_after = Pt(3)
            r = p.add_run(htxt)
            r.bold = True; r.font.size = Pt(8.5); r.font.color.rgb = docfx.INK

        for r_idx, row in enumerate(rows):
            rw = t.add_row()
            docfx.no_split(rw)
            for i, val in enumerate(row):
                c = rw.cells[i]
                c.width = Cm(widths_cm[i])
                if r_idx % 2 == 1:
                    docfx.shade(c, "F9FAFF")
                docfx.cell_borders(c, ["bottom"], color="E5E7EB", sz=4)
                p = c.paragraphs[0]
                if i in align_right_cols:
                    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
                p.paragraph_format.space_before = Pt(2.5)
                p.paragraph_format.space_after = Pt(2.5)
                r = p.add_run(val)
                r.font.size = Pt(8.8)
                if i == 0:
                    r.bold = True; r.font.color.rgb = docfx.V
                elif i in align_right_cols:
                    r.bold = True; r.font.color.rgb = docfx.INK
                else:
                    r.font.color.rgb = docfx.INK
        if len(rows) <= 5:
            docfx.keep_together(t)
        docfx.header_repeats(t)
        docfx.para(self.docx, "", size=4, space_after=4)

        ths = "".join(
            f'<th class="{"num" if i in align_right_cols else ""}">{html.escape(h)}</th>'
            for i, h in enumerate(headers)
        )
        trs = []
        for row in rows:
            tds = "".join(
                f'<td class="{"first" if i == 0 else ("num" if i in align_right_cols else "")}">{html.escape(cell)}</td>'
                for i, cell in enumerate(row)
            )
            trs.append(f"<tr>{tds}</tr>")
        self.html_blocks.append(f'<table class="ftable"><thead><tr>{ths}</tr></thead><tbody>{"".join(trs)}</tbody></table>')

    def sources(self, links: list[tuple[str, str]]) -> None:
        self.section("S", "Sources et références vérifiables", "Direction & Conformité")
        for label, url in links:
            docfx.cite(self.docx, f"{label} — {url}", url, size=8.6)
        lis = "".join(
            f'<li><strong>{html.escape(lbl)} :</strong> <a href="{html.escape(url)}">{html.escape(url)}</a></li>'
            for lbl, url in links
        )
        self.html_blocks.append(f'<ul class="flist sources">{lis}</ul>')

    def save(self) -> tuple[Path, Path]:
        docfx.footer(self.docx, "Trasunto inc. · Charlevoix, Québec · Fanal", self.doc_code)
        docx_path = ROOT / f"{self.basename}.docx"
        pdf_path = ROOT / f"{self.basename}.pdf"
        self.docx.save(docx_path)

        b64 = lockup_b64()
        lockup_img = f'<img src="data:image/png;base64,{b64}" class="lockup" alt="Trasunto"/>' if b64 else ""
        full_html = f"""<!DOCTYPE html>
<html lang="fr-CA">
<head>
<meta charset="utf-8"/>
<title>{html.escape(self.title)}</title>
<style>
  @page {{
    size: letter;
    margin: 1.15cm 1.35cm 1.25cm 1.35cm;
  }}
  * {{ box-sizing: border-box; }}
  body {{
    font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
    color: #101828;
    font-size: 9.3pt;
    line-height: 1.4;
    margin: 0;
  }}
  .hero {{
    background: linear-gradient(135deg, #4D6BFE 0%, #7c5cff 58%, #a78bfa 100%);
    border-radius: 16px;
    padding: 15px 18px;
    color: #ffffff;
    display: flex;
    align-items: center;
    gap: 13px;
    margin-bottom: 11px;
    box-shadow: 0 10px 26px rgba(77, 107, 254, 0.22);
  }}
  .medallion {{
    width: 48px; height: 48px; border-radius: 13px; background: #ffffff;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.16);
  }}
  .hero-kicker {{
    font-size: 7.8pt; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
    opacity: 0.9; margin-bottom: 3px;
  }}
  .hero h1 {{
    font-size: 16.5pt; line-height: 1.2; margin: 0 0 4px 0; font-weight: 800; letter-spacing: -0.02em;
  }}
  .hero-sub {{
    font-size: 9.4pt; opacity: 0.94; margin: 0; font-weight: 400;
  }}
  .topbar-brand {{
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #e4e7ec;
  }}
  .lockup {{ height: 22px; width: auto; }}
  .docbadge {{
    font-size: 7.8pt; font-weight: 700; color: #4D6BFE; background: #eef2ff;
    border: 1px solid #d8deff; padding: 3px 9px; border-radius: 999px;
  }}
  .metrics {{
    display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 8px; margin: 8px 0 11px 0; break-inside: avoid;
  }}
  .metric {{
    background: #f5f7ff; border: 1px solid #d8deff; border-radius: 11px; padding: 8px 10px;
  }}
  .mv {{ font-size: 11.4pt; font-weight: 800; color: #4D6BFE; margin-bottom: 2px; }}
  .ms {{ font-size: 7.6pt; color: #475467; line-height: 1.25; }}
  .sec-head {{
    margin: 11px 0 6px 0; padding-bottom: 3px; border-bottom: 1.5px solid #e5e7eb;
    break-inside: avoid; page-break-inside: avoid;
    break-after: avoid; page-break-after: avoid;
  }}
  .sec-kicker {{
    font-size: 7.2pt; font-weight: 800; color: #7c5cff; text-transform: uppercase; letter-spacing: 0.06em;
  }}
  .sec-head h2 {{
    font-size: 12pt; font-weight: 800; color: #101828; margin: 1px 0 0 0; letter-spacing: -0.01em;
  }}
  .p-body {{ margin: 0 0 7px 0; color: #1d2939; }}
  .p-muted {{ margin: 0 0 7px 0; color: #667085; font-size: 9pt; }}
  .p-bold {{ margin: 0 0 7px 0; color: #101828; font-weight: 700; }}
  .callout {{
    background: #f5f7ff; border-left: 4px solid #4D6BFE; border-radius: 0 11px 11px 0;
    padding: 9px 12px; margin: 8px 0 10px 0; font-size: 9.2pt; break-inside: avoid;
  }}
  .callout strong {{ color: #4D6BFE; }}
  .flist {{ margin: 4px 0 9px 0; padding-left: 17px; }}
  .flist li {{ margin-bottom: 4px; color: #1d2939; break-inside: avoid; }}
  .flist li strong {{ color: #101828; }}
  .flist.sources li {{ font-size: 8.2pt; color: #475467; }}
  .flist.sources a {{ color: #4D6BFE; text-decoration: none; }}
  .ftable {{
    width: 100%; border-collapse: collapse; margin: 7px 0 11px 0; font-size: 8.6pt;
    border-radius: 10px; overflow: hidden;
  }}
  .ftable thead {{ display: table-header-group; }}
  .ftable tr {{ break-inside: avoid; }}
  .ftable th {{
    background: #eef2ff; color: #101828; font-weight: 800; text-align: left;
    padding: 6px 8px; border-bottom: 1.5px solid #4D6BFE; font-size: 8pt;
  }}
  .ftable th.num, .ftable td.num {{ text-align: right; font-variant-numeric: tabular-nums; font-weight: 700; white-space: nowrap; }}
  .ftable td {{
    padding: 5.5px 8px; border-bottom: 1px solid #e5e7eb; vertical-align: top;
  }}
  .ftable tbody tr:nth-child(even) {{ background: #f9faff; }}
  .ftable td.first {{ font-weight: 700; color: #4D6BFE; }}
  .doc-foot {{
    margin-top: 16px; padding-top: 8px; border-top: 1px solid #e5e7eb;
    font-size: 7.6pt; color: #98a2b3; text-align: center;
  }}
</style>
</head>
<body>
  <div class="topbar-brand">{lockup_img}<span class="docbadge">{html.escape(self.doctype)}</span></div>
  <div class="hero">
    <div class="medallion">{pearl_svg()}</div>
    <div>
      <div class="hero-kicker">Trasunto inc. · Écosystème Fanal · Architecture fermée Apple-Style</div>
      <h1>{html.escape(self.title)}</h1>
      <p class="hero-sub">{html.escape(self.subtitle)}</p>
    </div>
  </div>
  {''.join(self.html_blocks)}
  <div class="doc-foot">Trasunto inc. · Charlevoix, Québec · {html.escape(self.doc_code)}</div>
</body>
</html>"""

        with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8") as tf:
            tf.write(full_html)
            tmp_html = Path(tf.name)
        try:
            cmd = [
                CHROME_BIN,
                "--headless",
                "--disable-gpu",
                "--no-sandbox",
                "--no-pdf-header-footer",
                f"--print-to-pdf={pdf_path}",
                tmp_html.as_uri(),
            ]
            subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        finally:
            tmp_html.unlink(missing_ok=True)
        print(f"saved {docx_path.name} + {pdf_path.name}")
        return docx_path, pdf_path


OFFICIAL_SOURCES = [
    ("DeepSeek API — Tarification officielle vérifiée", "https://api-docs.deepseek.com/quick_start/pricing/"),
    ("Gouvernement du Québec — Loi 25 (renseignements personnels)", "https://www.quebec.ca/gouvernement/travailler-gouvernement/emplois-secteur-public/protection-renseignements-personnels"),
    ("Commission d'accès à l'information (CAI Québec)", "https://www.cai.gouv.qc.ca/"),
    ("Revenu Québec — TPS, TVQ et crédits PME (CRIC / CDAE)", "https://www.revenuquebec.ca/fr/entreprises/"),
    ("SADC Charlevoix – Côte-de-Beaupré – Île d'Orléans", "https://www.sadc-cae.ca/"),
    ("Investissement Québec — Programme ESSOR", "https://www.investquebec.com/quebec/fr/produits-et-services/programmes-financiers"),
    ("BDC — Financement et programme LIFT", "https://www.bdc.ca/fr/financement/programmes-speciaux/lift"),
    ("LégisQuébec — Loi sur les contrats des organismes municipaux", "https://www.legisquebec.gouv.qc.ca/"),
]


def build_manual() -> None:
    d = FanalDoc(
        "TRASUNTO-MANUEL-OPERATIONS-FINANCES",
        "MANUEL MAÎTRE · OPÉRATIONS & FINANCES",
        "Installation pas à pas, Facturation, Comptabilité et Économie des jetons",
        "Référentiel complet de Trasunto inc. pour Fanal (Client) et Fanal Studio (Fondateur) — Québec, 2026",
        "Trasunto · Manuel Opérations & Finances v2.0 · Novembre 2026",
    )
    d.metrics([
        ("350 $ / mois", "Buffet Fixe Pur Solo (dossiers illimités, 0 $/dos.)"),
        ("0,0034 $ – 0,0825 $", "Coût réel en jetons CAD par dossier signé"),
        ("99,1 % – 99,3 %", "Marge sur coûts variables (API + PAD 1,50 $)"),
        ("1,50 $ CAD", "Frais fixe TEF/PAD vs 2,9 % carte de crédit"),
    ])

    d.section("1", "Installation et déploiement calibré (Voie Solo 30 min · Voie Équipe 90 min, zéro friction)", "Implantateur & Direction")
    d.callout(
        "Architecture fermée style Apple (zéro Ollama · Double porte vérifiée · Zéro PC 24/7)",
        "Fanal livre deux applications signables : Fanal (édition client, port 8787) et Fanal Studio (console fondateur, port 8788). Aucune installation d'Ollama n'est requise : le Cerveau Dual Fermé (DeepSeek-Flash + V4-Pro + Google Gemini) opère derrière un Voile PII local (85 Mo RAM). L'implantation applique une double validation partagée (setup-validator.js), une Constitution Fermée V2 (FANAL-CONSTITUTION-V2) et une vérification asynchrone zéro-PII vers Studio (FANAL-INSTALL-ATTEST-V1 signé Ed25519) sans exiger de serveur allumé 24h/24."
    )
    d.bullets([
        ("Étape 1 · Accueil multilingue & Porte de vérification (0 min) : ", "sélection parmi 10 langues natives avec nuages d'aide traduits et tableau d'état des 4 étapes requises (+ clé BYOK clairement marquée Optionnelle)."),
        ("Étape 2 · Cascade progressive Boîte 1 → Boîte 2 (Assistant 8 étapes) : ", "sélection de la structure (AUTONOMOUS_SOLO, MICRO_SINGLE_OWNER ou SME_CELL), déverrouillant les 11 métiers autonomes reconnus au Québec ou les 11 secteurs SCIAN."),
        ("Étape 3 · Sécurité informatique stricte & Coffre optionnel (scrypt + AES-256-GCM) : ", "nom d'utilisateur unique insensible à la casse (HTTP 409 sur doublons, noms réservés bloqués), mot de passe >= 12 caractères (majuscule, minuscule, chiffre, spécial, liste interactive déployable en 1 clic) et scellement biométrique Touch ID / Windows Hello."),
        ("Étape 4 · Constitution Fermée V2 (FANAL-CONSTITUTION-V2) : ", "remplacement du texte libre ambigu par 8 paramètres fermés obligatoires : raison sociale, régime fiscal Québec (Petit fournisseur < 30 000 $ CAD ou TPS/TVQ), RPRP Loi 25 obligatoire, registre de voix fermé, plancher matériel, politique d'escompte, règles d'escalade ROUGE et initiales générant le genesisHash."),
        ("Étape 5 · Seconde porte post-création (#loginView vérifié) & Garde de réouverture : ", "après création du propriétaire, Fanal bascule vers l'écran de connexion pour tester le mot de passe réel et vérifier le scellement (SERVER_SETUP_DONE verrouille ensuite l'assistant)."),
        ("Étape 6 · Contrôle asynchrone Fanal Studio (Logiciel + IA + Humain, 0 $/mois en Bêta) : ", "attestation zéro-PII FANAL-INSTALL-ATTEST-V1 signée Ed25519 côté client et vérifiée de façon asynchrone dans Fanal Studio (sans PC portable allumé 24/7 ; relais X25519 serverless prévu dès 15+ clients)."),
    ])

    d.section("2", "Analyse des jetons par dossier : faut-il facturer à la pièce ou tout inclure à 350 $ ?", "Direction & CPA")
    d.para("Calcul déterministe basé sur les tarifs officiels vérifiés DeepSeek (novembre 2026) et un taux conservateur de 1,40 CAD/USD. Les heures de bureau au Québec (08h–18h EST = 13h–23h UTC) tombent à 100 % hors des fenêtres de pointe DeepSeek, réduisant le coût API de 50 %.")
    d.table(
        ["Type de dossier signé", "Profil de jetons", "Coût USD (Creux / Pointe)", "Coût CAD (× 1,40)"],
        [
            ["Dossier courant (DeepSeek-Flash)", "4k cache + 8k miss + 2k sortie", "0,00241\u00a0$ / 0,00482\u00a0$", "0,0034\u00a0$ – 0,0068\u00a0$"],
            ["Dossier complexe CPA/Légal (2× Flash + V4-Pro)", "13k cache + 40k miss + 8k sortie", "0,02665\u00a0$ / 0,05331\u00a0$", "0,0373\u00a0$ – 0,0746\u00a0$"],
            ["Dossier multimodal lourd (OCR Gemini + V4-Pro)", "30k in + 3k out Gemini + V4-Pro", "0,05896\u00a0$ (pire cas)", "0,0825\u00a0$ CAD"],
        ],
        widths_cm=[5.6, 4.4, 3.8, 3.6],
        align_right_cols=(2, 3),
    )

    sim_rows = [
        [f"{v['n']} dossiers/mois", fmt_cad(v["old_var"]), fmt_cad(v["flat"]), fmt_cad(v["api_pad"]),
         f"{fmt_cad(v['margin'])} ({v['margin_pct']:.2f} %)".replace(".", ",")]
        for v in ECON["volumes"]
    ]
    d.table(
        ["Volume mensuel", "Ancien (165 $ + 16 $/dos.)", "Forfait Solo Tout Inclus", "API + PAD (1,50 $)", "Marge nette / mois"],
        sim_rows,
        widths_cm=[3.6, 3.5, 3.3, 3.1, 3.9],
        align_right_cols=(1, 2, 3, 4),
    )
    d.callout(
        "Conclusion mathématique et stratégique (Buffet Fixe Pur)",
        f"Le point d'équilibre entre 165 $ + 16 $/dossier et le forfait fixe de 350 $/mois se situe à {ECON['breakeven_n']:.2f} dossiers/mois. Facturer à l'acte ou fixer un quota rigide de « 40 dossiers » crée une anxiété de compteur qui freine l'adoption. Inversement, le modèle Buffet Fixe Pur (PURE_FIXED_BUFFET_MONTHLY) absorbe même 40+ dossiers mensuels dans ~0,80 $ à 1,71 $ CAD d'API supplémentaire, maintenant une marge > 99 % grâce à la mutualisation de cohorte (p50/p90 suivis dans Fanal Studio), au routage Flash et aux sous-clés plafonnées à 5 $ USD, tout en restant garanti par la Symétrie Mensuelle (-50 % si écart > 25 %, -100 % si > 35 %)."
    )

    d.section("3", "Facturation récurrente, PAD bancaire et comptabilité québécoise (Règle des 2 comptes)", "Comptable & Direction")
    d.table(
        ["Forfait", "Implantation (Mois 1)", "Mensualité HT", "TPS + TVQ (14,975 %)", "Total TTC (PAD)"],
        [
            ["Fanal Solo (1 personne)", "500,00\u00a0$ (Bêta 350\u00a0$)", "350,00\u00a0$", "17,50\u00a0$ + 34,91\u00a0$", "402,41\u00a0$"],
            ["Fanal Équipe (2–35 pers.)", "950,00\u00a0$ (Bêta 750\u00a0$)", "490,00\u00a0$", "24,50\u00a0$ + 48,88\u00a0$", "563,38\u00a0$"],
            ["Hub Fiduciaire .fanal", "1\u00a0200,00\u00a0$", "650,00\u00a0$", "32,50\u00a0$ + 64,84\u00a0$", "747,34\u00a0$"],
        ],
        widths_cm=[4.0, 3.6, 2.8, 3.8, 3.2],
        align_right_cols=(1, 2, 3, 4),
    )
    d.bullets([
        ("Routine du 1er du mois (/api/invoice) : ", "le script lit les compteurs internes, applique la Garantie de Symétrie Mensuelle s'il y a lieu (>= 3 dossiers), émet les factures PDF détaillées et déclenche les prélèvements préautorisés bancaires (PAD/TEF à 1,50 $ fixe par opération)."),
        ("Règle des deux comptes bancaires : ", "dès encaissement des 402,41 $ TTC (Solo), les taxes perçues (52,41 $) et une provision fiscale de 18 % du résultat sont transférées automatiquement vers le Compte A (Fiducie fiscale). Le Compte B (Exploitation) reflète en temps réel l'encaisse véritablement libre."),
        ("Clôture comptable CPA (exportAccountingCsv) : ", "export annuel au format CSV normalisé (Acomba / QuickBooks) regroupant factures émises, prélèvements PAD, crédits de symétrie et factures d'API DeepSeek/Google."),
    ])

    d.section("4", "Prévisions financières consolidées sur 3 ans (CAD hors taxes)", "Direction & Partenaires financiers")
    pnl = ECON["pnl"]
    d.table(
        ["Poste financier (CAD HT)", pnl[0]["label"], pnl[1]["label"], pnl[2]["label"], pnl[3]["label"]],
        [
            ["Parc actif moyen (Solo / Éq. / Fid.)", *[f"{p['clients_tot']} ({p['avg_s']}/{p['avg_t']}/{p['avg_f']})" for p in pnl]],
            ["Revenus récurrents annuels (MRR × 12)", *[fmt_cad(p["mrr_annual"]) for p in pnl]],
            ["Revenus d'implantation (Mois 1)", *[fmt_cad(p["setup_rev"]) for p in pnl]],
            ["Chiffre d'affaires total HT", *[fmt_cad(p["ca"]) for p in pnl]],
            ["Coûts variables (API + PAD 1,50 $)", *[fmt_cad(p["var"]) for p in pnl]],
            ["Marge brute", *[f"{fmt_cad(p['gross'])} ({p['gross_pct']:.1f} %)".replace(".", ",") for p in pnl]],
            ["OpEx + Salaires d'équipe", *[fmt_cad(p["opex"] + p["salaries"]) for p in pnl]],
            ["BAIIA (avant impôts)", *[fmt_cad(p["ebitda"]) for p in pnl]],
            ["Impôts PME estimés (12,2 %)", *[fmt_cad(p["tax"]) for p in pnl]],
            ["Bénéfice net après impôts", *[fmt_cad(p["net"]) for p in pnl]],
        ],
        widths_cm=[5.4, 3.0, 3.0, 3.0, 3.0],
        align_right_cols=(1, 2, 3, 4),
    )
    d.section("5", "Protocole TECP-v1, leviers matériels à 0 $ et conformité", "Produit & Propriété intellectuelle")
    d.bullets([
        ("5 leviers matériels sans achat supplémentaire : ", "(1) Interprète comptoir A2DP découplé (micro fixe PC + écouteurs Bluetooth déjà possédés via AudioContext.setSinkId, plafond quotidien 30 min/jour), (2) Numériseur ADF + vérification mathématique TPS 5 % / TVQ 9,975 %, (3) Pièces jointes vocales VoIP/PBX IMAP, (4) Capture Webcam comptoir (/api/intake/webcam), (5) Import passif Rapport Z MEV-WEB (.csv/.txt)."),
        ("Affluence Régionale (FANAL-AFFLUENCE-V1) & ToS Google Maps : ", "remplace l'alerte météo fixe par un indice sectoriel (restaurant, tourisme, hôtel, agro) croisant météo, calendrier québécois, historique Z et trafic Google Routes strictement éphémère (aucun scraping Popular Times ni cache disque). Le pilote navigateur CDP reste suspendu par défaut."),
        ("Antériorité TECP-v1 & Modèle Open-Core : ", "divulgation technique structurée (DOI Zenodo) + dépôts de marques Trasunto/Fanal (OPIC/CIPO) ; le socle protocolaire reste ouvert tandis que la distribution zéro-friction, les connecteurs MEV-WEB et le Hub Fiduciaire soutiennent la valeur commerciale récurrente."),
    ])
    d.sources(OFFICIAL_SOURCES)
    d.save()


def build_grille() -> None:
    d = FanalDoc(
        "TRASUNTO-GRILLE-TARIFAIRE",
        "GRILLE TARIFAIRE · V2 UNIFIÉE",
        "Grille tarifaire commerciale et cohorte Bêta Fondateurs",
        "Tarifs officiels tout inclus en dollars canadiens (HT · TPS 5 % et TVQ 9,975 % en sus)",
        "Trasunto · Grille tarifaire v2.0 · Novembre 2026",
    )
    d.metrics([
        ("350 $ / mois", "Fanal Solo — Buffet Fixe Pur à dossiers illimités"),
        ("490 $ / mois", "Fanal Équipe — Micro 2–5 ou PME 6–35 postes"),
        ("0 $ / dossier", "Aucun supplément ni quota par dossier"),
        ("100 % garanti", "Garantie de Symétrie Mensuelle inscrite au code"),
    ])
    d.section("1", "Forfaits mensuels tout inclus et implantation", "Clients & SADC")
    d.table(
        ["Offre", "Périmètre & Inclus", "Implantation (Mois 1)", "Mensualité HT"],
        [
            ["Fanal Solo", "1 dirigeant autonome (11 métiers reconnus QC) · Téléphoniste, Répondant, Secrétaire, Voile Loi 25, Coffre scrypt + Touch ID, dossiers illimités (Buffet Fixe Pur)", "500,00 $ (Bêta : 350 $)", "350,00 $ / mois"],
            ["Fanal Équipe", "Microentreprise (2–5) ou PME (6–35) · Multi-postes, Caisse Z, Quarts, Wallboard authentifié SME, volume d'équipe inclus", "950,00 $ (Bêta : 750 $)", "490,00 $ / mois"],
            ["Hub Fiduciaire .fanal", "Cabinets CPA, études légales & consortiums · Multi-dossiers, piste d'audit sourcePin et support prioritaire Studio", "1 200,00 $", "650,00 $ / mois"],
            ["Diagnostic & Rencontre", "Rencontre découverte sur place + estimation écrite des économies de temps et admissibilité subventions", "0,00 $ (Gratuit)", "—"],
        ],
        widths_cm=[3.3, 8.2, 3.1, 2.8],
        align_right_cols=(2, 3),
    )
    d.section("2", "Pourquoi tout inclure sans frais par dossier ?", "Direction & Clients")
    d.callout(
        "Transparence Hydro-Québec",
        f"Un dossier courant consomme 0,0034 $ à 0,0068 $ CAD en jetons DeepSeek-Flash et un dossier complexe juridique/CPA consomme 0,0373 $ à 0,0825 $ CAD. Grâce à l'arbitrage du Cerveau Dual Fermé (DeepSeek + Gemini) et aux sous-clés plafonnées à 5 $ USD, Trasunto absorbe le coût de calcul dans le forfait fixe de 350 $/mois tout en conservant plus de 99 % de marge sur coûts variables."
    )
    d.bullets([
        ("Garantie de Symétrie Mensuelle : ", "lorsque >= 3 dossiers sont signés dans le mois, si la correction humaine moyenne excède 25\u00a0%, Trasunto crédite 50\u00a0% de la mensualité ; au-delà de 35\u00a0%, la mensualité est ramenée à 0\u00a0$."),
        ("Modes de paiement privilégiés : ", "prélèvement bancaire préautorisé (PAD/TEF) le 1er du mois ; économie directe évitant les frais de carte de crédit."),
        ("Sortie Honorable en 1 clic : ", "zéro engagement bloquant ; en cas de résiliation (préavis 30 jours), export complet vers le Bureau en PDF, CSV comptable et JSONL en clair."),
    ])
    d.sources(OFFICIAL_SOURCES[:4])
    d.save()


def build_plan_affaires() -> None:
    d = FanalDoc(
        "TRASUNTO-PLAN-AFFAIRES",
        "PLAN D'AFFAIRES · TRASUNTO INC.",
        "Trasunto inc. — Plan d'affaires et déploiement Fanal au Québec",
        "Économie de capital humain, conformité Loi 25 native et prévisions financières à 3 ans",
        "Trasunto · Plan d'affaires v4.0 · Novembre 2026",
    )
    d.metrics([
        ("14 fondateurs", "Cohorte Bêta Charlevoix & Capitale-Nationale"),
        ("78 100 $ CA", "Objectif réaliste Année 1 (59 332 $ net)"),
        ("256 580 $ CA", "Objectif réaliste Année 2 (44 clients actifs)"),
        ("626 640 $ CA", "Objectif réaliste Année 3 (108 clients actifs)"),
    ])
    d.section("1", "Thèse d'affaires : le maillon humain de la 4e révolution industrielle", "SADC, Banques & BDC")
    d.para("Les PME et travailleurs autonomes québécois n'échouent pas par manque d'outils logiciels ; ils suffoquent sous la friction administrative (courriels nocturnes, relances, classement de reçus, conformité Loi 25). Trasunto inc. déploie Fanal : une couche d'orchestration locale où l'intelligence artificielle prépare les brouillons et vérifie les invariants, tandis que l'humain demeure l'unique signataire.")
    d.callout(
        "Principe d'asymétrie positive",
        "La machine exécute ce qui n'a pas de conséquences ; l'humain vérifie et signe ce qui en a. Aucun envoi social, bancaire ou réglementaire ne quitte l'entreprise sans action humaine explicite."
    )
    d.section("2", "Produit et architecture technique fermée", "Direction & Auditeurs")
    d.bullets([
        ("Cerveau Dual Fermé (DeepSeek + Gemini) : ", "zéro installation Ollama risquée chez le client ; sélection automatique entre DeepSeek-Flash (tâches courantes), DeepSeek-V4-Pro (raisonnement complexe) et Google Gemini (OCR multimodal)."),
        ("Voile PII déterministe (Loi 25) : ", "tous les noms, numéros de téléphone et courriels du répertoire local sont pseudonymisés en mémoire vive (~85 Mo) avant tout appel API externe."),
        ("Topologie adaptative en un seul exécutable : ", "l'application s'ajuste dynamiquement aux modes Travailleur autonome (1 pers.), Microentreprise (2–5) et PME (6+ avec Wallboard authentifié)."),
    ])
    d.section("3", "Projections financières vérifiées à 3 ans (CAD hors taxes)", "Institutionnel")
    pnl = ECON["pnl"]
    d.table(
        ["Indicateur financier (CAD HT)", pnl[0]["label"], pnl[1]["label"], pnl[2]["label"], pnl[3]["label"]],
        [
            ["Parc actif moyen (clients)", *[str(p["clients_tot"]) for p in pnl]],
            ["Revenus récurrents annuels (MRR × 12)", *[fmt_cad(p["mrr_annual"]) for p in pnl]],
            ["Revenus d'implantation", *[fmt_cad(p["setup_rev"]) for p in pnl]],
            ["Chiffre d'affaires total HT", *[fmt_cad(p["ca"]) for p in pnl]],
            ["Coûts totaux (API + PAD + OpEx + Salaires)", *[fmt_cad(p["opex"] + p["salaries"] + p["var"]) for p in pnl]],
            ["BAIIA (avant impôts)", *[fmt_cad(p["ebitda"]) for p in pnl]],
            ["Bénéfice net après impôts (12,2 %)", *[fmt_cad(p["net"]) for p in pnl]],
        ],
        widths_cm=[5.4, 3.0, 3.0, 3.0, 3.0],
        align_right_cols=(1, 2, 3, 4),
    )
    d.section("4", "Appuis publics, gouvernance et gestion des risques", "SADC & Conseil")
    d.table(
        ["Risque ou levier", "Dispositif Trasunto", "Effet"],
        [
            ["Financement client (Subventions)", "Orientation vers ESSOR, PARI-CNRC, PCAN et BDC LIFT avant signature du contrat d'implantation", "Réduction du reste à charge PME"],
            ["Confidentialité Loi 25", "Coffre scrypt + AES-256-GCM, données hébergées sur la machine du client, diagnostic assaini sans PII", "Exposition réglementaire minimale"],
            ["Dépendance fournisseurs", "Sous-clés corporatives plafonnées à 5 $ USD/mois + architecture agnostique aux modèles fermés", "Plafond de perte technique strict"],
            ["Acceptabilité tarifaire", "Forfait tout inclus 350 $/490 $ sans frais au dossier + Garantie de Symétrie Mensuelle", "Visibilité budgétaire totale"],
        ],
        widths_cm=[4.2, 9.2, 4.0],
    )
    d.sources(OFFICIAL_SOURCES)
    d.save()


def build_plan_3ans() -> None:
    d = FanalDoc(
        "TRASUNTO-PLAN-3ANS",
        "PRÉVISIONS FINANCIÈRES · 3 ANS",
        "Budget, économie des jetons et états prévisionnels à 36 mois",
        "Modélisation vérifiée de la rentabilité unitaire et de la trésorerie — Trasunto inc.",
        "Trasunto · Plan financier 3 ans v2.0 · Novembre 2026",
    )
    d.metrics([
        ("98,8 %", "Marge brute moyenne sur coûts variables (An 1 à An 3)"),
        ("12,2 %", "Taux effectif PME combiné QC + Fédéral (DPE <= 500 k$)"),
        ("5,50 $ / mois", "Coût variable complet par client (4,00 $ API + 1,50 $ PAD)"),
        ("335 846 $", "Bénéfice net annuel projeté à l'An 3 (108 clients)"),
    ])
    d.section("1", "Hypothèses d'exploitation et coûts unitaires", "CPA & Institutions")
    d.bullets([
        ("Revenus récurrents : ", "350 $/mois (Solo), 490 $/mois (Équipe) et 650 $/mois (Hub Fiduciaire à compter de l'An 2), en Buffet Fixe Pur à dossiers illimités (calibration des paliers post-Bêta sur p50/p90 réels)."),
        ("Implantations (Mois 1) : ", "tarif cohorte Bêta 350 $ / 750 $ en Année 1, puis grille publique 500 $ / 950 $ / 1 200 $ aux Années 2 et 3."),
        ("Coûts directs par client actif : ", "consommation API réelle observée de 1,50 $ à 4,50 $ CAD (provision conservatrice de 4,00 $/mois sous plafond dur de 5 $ USD) + frais fixes bancaires PAD de 1,50 $/mois = 5,50 $/client/mois."),
        ("Structure de charges fixes (OpEx) : ", "9 600 $ en An 1 (assurances E&O/cyber, CPA, déplacements, outillage), 24 000 $ en An 2 (+72 000 $ salaires), 52 000 $ en An 3 (+185 000 $ équipe)."),
    ])
    d.section("2", "Tableau complet des résultats prévisionnels (An 1 à An 3)", "Direction & CPA")
    pnl = ECON["pnl"]
    d.table(
        ["Ligne du compte de résultats (CAD HT)", pnl[0]["label"], pnl[1]["label"], pnl[2]["label"], pnl[3]["label"]],
        [
            ["Parc actif moyen (Solo / Éq. / Fid.)", *[f"{p['avg_s']} / {p['avg_t']} / {p['avg_f']}" for p in pnl]],
            ["Nouvelles implantations (Solo / Éq. / Fid.)", *[p["new_str"] for p in pnl]],
            ["Revenus récurrents annuels (MRR × 12)", *[fmt_cad(p["mrr_annual"]) for p in pnl]],
            ["Revenus d'implantation (Mois 1)", *[fmt_cad(p["setup_rev"]) for p in pnl]],
            ["Chiffre d'affaires total HT", *[fmt_cad(p["ca"]) for p in pnl]],
            ["Coûts variables (API + PAD bancaire 1,50 $)", *[fmt_cad(p["var"]) for p in pnl]],
            ["Marge brute (%)", *[f"{fmt_cad(p['gross'])} ({p['gross_pct']:.1f}\u00a0%)".replace(".", ",") for p in pnl]],
            ["Charges fixes & OpEx", *[fmt_cad(p["opex"]) for p in pnl]],
            ["Salaires & rémunération d'équipe", *[fmt_cad(p["salaries"]) for p in pnl]],
            ["BAIIA (avant impôts)", *[fmt_cad(p["ebitda"]) for p in pnl]],
            ["Impôts PME estimés (12,2 %)", *[fmt_cad(p["tax"]) for p in pnl]],
            ["Bénéfice net après impôts", *[fmt_cad(p["net"]) for p in pnl]],
        ],
        widths_cm=[5.4, 3.0, 3.0, 3.0, 3.0],
        align_right_cols=(1, 2, 3, 4),
    )
    d.section("3", "Trésorerie mensuelle et affectation fiscale (Compte A vs Compte B)", "Administration")
    d.para("À titre d'exemple mensuel pour 14 clients actifs en Année 1 réaliste (9 Solo + 5 Équipe) : le MRR s'établit à 5 600,00 $ HT (6 438,60 $ TTC encaissés). Le Compte A reçoit immédiatement 838,60 $ de TPS/TVQ à remettre et une provision fiscale conservatrice (~880 $), tandis que le Compte B conserve ~4 720 $/mois nets avant OpEx courants (~800 $/mois).")
    d.sources(OFFICIAL_SOURCES[:4])
    d.save()


def build_plan_solo() -> None:
    d = FanalDoc(
        "TRASUNTO-PLAN-SOLO",
        "SEGMENT AUTONOME · 350 $/MOIS",
        "Fanal Solo — Stratégie travailleurs autonomes et micro-opérateurs (1:300)",
        "Un seul exécutable adaptatif sans matériel lourd, conçu pour le professionnel indépendant",
        "Trasunto · Plan Solo v2.0 · Novembre 2026",
    )
    d.metrics([
        ("1 : 300", "Effet de levier d'un seul humain face à sa clientèle"),
        ("85 Mo RAM", "Moteur local déterministe sur le PC/Mac existant"),
        ("350 $ / mois", "Buffet Fixe Pur (dossiers illimités + Téléphoniste)"),
        ("45 – 90 sec", "Révision d'un dossier via sourcePin au lieu de 45 min"),
    ])
    d.section("1", "Pourquoi un seul exécutable adaptatif plutôt qu'une seconde application", "Produit & Stratégie")
    d.callout(
        "Fini les frictions d'Ollama et des double bases de code",
        "Une analyse complète montre qu'un travailleur autonome gérant 100 à 300 clients (gym, plex, RSGE, CPA, avocat, clinique) partage le même noyau que la PME (Voile PII, Cerveau Dual Fermé, Inbox-First). Au lieu de dupliquer le logiciel, le sélecteur de structure (AUTONOMOUS_SOLO) masque automatiquement les tableaux d'employés, quarts et Wallboard dès l'installation."
    )
    d.section("2", "Les 8 profils Solo à fort rendement au Québec", "Développement des affaires")
    d.table(
        ["Profil / Métier", "Ratio clients", "Charge éliminée par Fanal Solo (350 $/mois)"],
        [
            ["Professionnels certifiés (CPA, avocats, CRIC)", "1 : 120 dossiers", "Préparation des dossiers avec citations littérales sourcePin, relances et suivis"],
            ["Centres d'entraînement / Yoga / CrossFit", "1 : 250 membres", "Calculs résiliation OPC, fiches santé Q-AAP sous Loi 25, réponses nocturnes"],
            ["Gestionnaires de plex et immeubles", "1 : 40 logements", "Avis TAL, Relevés 31, tri des urgences locataires en dehors des heures"],
            ["Milieu familial RSGE & RPA aînés", "1 : 15 usagers", "Registres d'allergies/médicaments conformes CISSS et protection des mineurs"],
            ["Chalets & hébergement CITQ", "1 : 12 unités", "Messagerie instantanée en 10 langues à 23h00 et constats de dommages"],
            ["Esthétique, massothérapie & écoles de conduite", "1 : 180 clients", "Reçus d'assurance, consentements éclairés et prise vocale mains libres"],
        ],
        widths_cm=[5.2, 2.8, 9.4],
    )
    d.sources(OFFICIAL_SOURCES[:3])
    d.save()


def build_one_pager() -> None:
    d = FanalDoc(
        "TRASUNTO-ONE-PAGER",
        "ONE-PAGER · SADC & DIRIGEANTS",
        "Votre entreprise mérite l'IA — sans jargon, sans perte de contrôle",
        "Un assistant clé en main qui travaille en silence et vous laisse toujours l'unique signature",
        "Trasunto · One-Pager v2.0 · Novembre 2026",
    )
    d.metrics([
        ("350 $ / mois", "Fanal Solo tout inclus · 490 $ / mois Équipe"),
        ("0 $ par dossier", "Buffet Fixe Pur sans quota de dossiers"),
        ("3 sem. / an", "Temps administratif récupéré dès 30 min/jour gagnées"),
        ("Loi 25 native", "Vos données et votre coffre restent sur votre poste"),
    ])
    d.section("1", "Ce que Fanal accomplit au quotidien", "Dirigeants PME & Autonomes")
    d.bullets([
        ("Le Téléphoniste & Le Répondant : ", "capte la demande (téléphone, courriel, Messenger), propose une réponse dans la langue du client et attend votre validation."),
        ("Le Secrétaire & Contrôle TPS/TVQ : ", "pré-remplit vos devis, numérisations ADF et captures webcam en respectant vos prix planchers et la Loi 25, vérifie TPS 5 % + TVQ 9,975 % et soumet les points sensibles à votre signature."),
        ("Caisse Z MEV-WEB passive & Affluence Régionale : ", "importe le rapport Z de votre TPV existant sans double saisie et croise météo + calendrier touristique + historique Z pour anticiper l'achalandage sans matériel additionnel."),
        ("Interprète Comptoir A2DP (0 $ matériel) : ", "utilise le micro du poste comptoir et vos écouteurs Bluetooth existants en stéréo A2DP nette avec plafond de minutes quotidien protégé."),
    ])
    d.section("2", "Déploiement simple et appui recherché", "SADC Charlevoix")
    d.callout(
        "Appui demandé — SADC & Partenaires",
        "(1) Relayer cette solution souveraine auprès des PME et travailleurs autonomes du territoire ; (2) soutenir l'accueil de la cohorte Bêta Fondateurs ; (3) orienter les clients admissibles vers ESSOR, PCAN et BDC LIFT."
    )
    d.sources([OFFICIAL_SOURCES[1], OFFICIAL_SOURCES[4], OFFICIAL_SOURCES[5], OFFICIAL_SOURCES[6]])
    d.save()


def build_accord_pilote() -> None:
    d = FanalDoc(
        "TRASUNTO-ACCORD-PILOTE",
        "ENTENTE DE PHASE PILOTE · 6 MOIS",
        "Accord d'implantation pilote — Solution Fanal",
        "ENTRE : Trasunto inc. (Charlevoix, Québec) · ET : [Raison sociale du Client], [Ville], ci-après « le Client »",
        "Trasunto · Accord de pilote v2.0 · Novembre 2026",
    )
    d.section("1", "Objet, durée et conditions financières tout inclus", "Parties signataires")
    d.para("Déploiement complet de Fanal pour une période pilote de six (6) mois au tarif Bêta Fondateurs en Buffet Fixe Pur : forfait Solo à 350,00 $ CAD/mois HT (implantation unique 350,00 $) ou forfait Équipe à 490,00 $ CAD/mois HT (implantation unique 750,00 $), TPS et TVQ en sus, sans aucun frais ni quota par dossier dans l'usage opérationnel normal (calibration post-Bêta fondée sur la télémétrie anonymisée p50/p90 de la cohorte).")
    d.bullets([
        ("Implantation clé en main (30 min Solo · 90 min Équipe) : ", "installation du poste, codification de la Constitution Fermée V2 (Loi 25 & TPS/TVQ ou exemption < 30 000 $), et formation pratique."),
        ("Garantie de Symétrie Mensuelle : ", "si l'écart moyen de correction humaine excède 25 % (sur >= 3 dossiers signés), un crédit de 50 % s'applique sur la mensualité ; au-delà de 35 %, la mensualité est créditée à 100 %."),
        ("Sortie Honorable en tout temps : ", "résiliation sans pénalité sur préavis de 30 jours avec exportation souveraine en un clic de l'intégralité des documents et journaux du Client."),
    ])
    d.section("2", "Protection des renseignements personnels (Loi 25 du Québec)", "RPRP & Direction")
    d.bullets([
        ("Hébergement local et Voile PII : ", "les données nominatives demeurent dans le coffre chiffré scrypt + AES-256-GCM sur l'équipement du Client ; les identifiants sont pseudonymisés localement avant toute requête inférentielle."),
        ("Support aveugle assaini : ", "toute assistance technique s'appuie exclusivement sur des paquets diagnostiques expurgés de tout nom de client, courriel, chemin de fichier ou secret."),
    ])
    d.para("Signé en double exemplaire à __________________________, le ________________________ 2026.", bold=True)
    d.table(["Pour Trasunto inc.", "Pour le Client (Dirigeant / RPRP)"], [["Nom / Signature :", "Nom / Signature :"]], widths_cm=[8.7, 8.7])
    d.save()


def build_guide_client() -> None:
    d = FanalDoc(
        "TRASUNTO-GUIDE-CLIENT",
        "GUIDE DE DÉMARRAGE CLIENT",
        "Guide officiel du dirigeant — Prendre en main Fanal en 15 minutes",
        "Votre deuxième regard opérationnel : de la sélection de langue à la signature quotidienne",
        "Trasunto · Guide Client v2.0 · Novembre 2026",
    )
    d.section("1", "Les 4 réflexes essentiels dès le premier matin", "Utilisateur final")
    d.bullets([
        ("1. Connexion & Déverrouillage sécurisé (>= 12 car.) : ", "votre compte propriétaire scellé avec la Constitution Fermée V2 (RPRP Loi 25 et régime fiscal < 30 000 $ ou TPS/TVQ) s'ouvre via mot de passe vérifié ou Touch ID / Windows Hello."),
        ("2. Consultez votre Boîte de décision (Inbox-First) : ", "tous les messages, appels Téléphoniste et dossiers Secrétaire en attente de signature s'affichent à un seul endroit."),
        ("3. Lisez le feu tricolore et épinglez les sources : ", "Vert = conforme à votre Constitution ; Jaune = votre révision requise (avec extrait source exact) ; Rouge = escalade impérative."),
        ("4. Valorisez votre matériel actuel à 0 $ de plus : ", "importez votre rapport Z POS (.csv), numérisez au scanner ou à la webcam comptoir avec contrôle TPS/TVQ automatique, recevez les messages vocaux VoIP par IMAP, activez l'Affluence Régionale (secteurs touristiques) ou utilisez le micro du poste + vos écouteurs Bluetooth A2DP en interprète comptoir."),
        ("5. Ajustez vos réglages et exportez votre attestation : ", "langue, mode d'affichage (Autonome / Micro / Équipe), IMAP et certificat zéro-PII d'attestation Ed25519 pour support Fanal Studio sont regroupés dans l'onglet Réglages."),
    ])
    d.section("2", "Questions fréquentes et garanties", "Utilisateur final")
    d.table(
        ["Question fréquente", "Réponse officielle Fanal"],
        [
            ["Dois-je installer Ollama ou configurer une clé API complexe ?", "Non. L'architecture fermée style Apple (DeepSeek + Gemini) est pré-scellée dans votre coffre à l'installation."],
            ["Vais-je payer un supplément si mon volume de dossiers augmente ?", "Non. En régime Buffet Fixe Pur, aucun frais par dossier ni plafond arbitraire n'est facturé dans le forfait Solo à 350 $/mois (490 $/mois en forfait Équipe)."],
            ["Puis-je récupérer mes archives si je quitte Fanal ?", "Oui. Un seul bouton exporte tous vos PDF quotidiens, CSV comptables et journaux sur votre Bureau avant désinstallation propre."],
        ],
        widths_cm=[6.2, 11.2],
    )
    d.save()


def build_invitation_beta() -> None:
    d = FanalDoc(
        "TRASUNTO-INVITATION-BETA",
        "TRASUNTO · COHORTE BÊTA FONDATEURS (SCIAN 541514)",
        "Invitation confidentielle — Cohorte de 14 Membres Fondateurs",
        "« À l'ère de l'intelligence artificielle, la chaleur humaine n'a jamais eu autant de valeur. »",
        "Trasunto inc. · Charlevoix, Québec · Invitation Bêta v2.0 · Novembre 2026",
    )
    d.metrics([
        ("14 fondateurs", "Cohorte fermée (2 places / mois)"),
        ("350 $ / mois", "Fanal Solo Buffet Fixe Pur (dossiers illimités)"),
        ("0 $ / dossier", "Aucun supplément à la pièce"),
        ("30–90 minutes", "Implantation personnelle (Voie Solo ~30 min)"),
    ])
    d.para("Lorsque vous avez choisi votre métier — comptable (CPA), avocat, notaire, consultant en immigration (CRIC), clinicien ou propriétaire d'une micro-entreprise — vous ne l'avez pas fait pour passer vos soirées à recopier des numéros de lot ou vérifier la TPS/TVQ au centime près. Fanal absorbe 90 % de la friction mécanique en silence tout en vous laissant toujours l'unique signature.")
    d.section("1", "Ce que Fanal accomplit en architecture fermée style Apple", "Professionnel invité")
    d.bullets([
        ("L'inversion du travail & Triage à 2 colonnes : ", "glissez votre dossier dans le coffre local ; le Cerveau Dual Fermé (DeepSeek + Gemini) croise pièces d'identité (SAAQ, MRZ passeport), formulaires et factures, puis replie en vert ce qui concorde et n'ouvre que les 2 à 4 Sommets de Responsabilité avec extrait exact."),
        ("Voile PII déterministe & Coffre scrypt + Touch ID : ", "tout nom, courriel et téléphone du répertoire local est pseudonymisé en mémoire vive (~85 Mo) avant appel API, sans jamais installer Ollama chez vous."),
        ("Topologie adaptative en un exécutable : ", "mode Autonome Solo (11 métiers reconnus au Québec), Microentreprise (2–5) ou PME (6–35 postes avec Wallboard authentifié)."),
    ])
    d.section("2", "Tarif Bêta Fondateurs Buffet Fixe Pur & Garantie de Symétrie", "Professionnel invité")
    d.table(
        ["Composante", "Ce qui est inclus et garanti", "Tarif Bêta CAD HT"],
        [
            ["Implantation Solo (30–45 min)", "Installation locale, Constitution Fermée V2, blindage Loi 25", "350,00 $ (au lieu de 500 $)"],
            ["Forfait Fanal Solo Buffet Fixe Pur", "1 dirigeant (11 métiers QC) · Téléphoniste, Répondant, Secrétaire, dossiers illimités", "350,00 $ / mois (0 $ / dossier)"],
            ["Forfait Fanal Équipe tout inclus", "2–35 employés · Multi-postes, Caisse Z, Quarts, Wallboard SME authentifié", "490,00 $ / mois (impl. 750 $)"],
            ["Garantie de Symétrie Mensuelle", "Sur >= 3 dossiers signés : écart moyen > 25 % = -50 % ; > 35 % = 0,00 $", "Inscrite au code source"],
        ],
        widths_cm=[4.8, 7.6, 5.0],
    )
    d.para("Clause de souveraineté & Sortie Honorable en 1 clic : vos données demeurent sur votre poste. En tout temps (préavis 30 jours), un clic exporte tous vos PDF, CSV comptables et journaux sur votre Bureau.")
    d.para("Réservation (2 places/mois) — Entreprise : ___________________________ · Secteur : ______________________ · Signature & Date : ____________________", bold=True)
    d.save()


def build_charge_honnetete() -> None:
    d = FanalDoc(
        "TRASUNTO-CHARGE-HONNETETE",
        "CHARTE D'HONNÊTETÉ OPÉRATIONNELLE",
        "Charte d'honnêteté : quand refuserons-nous d'installer Fanal ?",
        "Tout est mesurable, tout est vérifiable — zéro automatisation inutile",
        "Trasunto inc. · Charlevoix, Québec · Charte d'honnêteté v2.0 · Novembre 2026",
    )
    d.section("1", "Quand vous n'avez pas besoin de Fanal (nous refuserons le pilote)", "Propriétaire")
    d.bullets([
        ("Volume trop faible : ", "le dirigeant traite seul moins de 15 demandes simples par jour ; un carnet papier suffit largement."),
        ("Double saisie stérile sur caisse fermée : ", "volume faible sur MEV-WEB (Maitre'D, Veloce) ou RAMQ sans barrière de langue : dicter puis ressaisir ferait perdre 15 secondes par transaction."),
        ("Moins de 10 heures économisées par mois : ", "si notre diagnostic gratuit démontre un gain inférieur à 10 heures nettes par mois, nous ne signons pas."),
    ])
    d.section("2", "Quand Fanal devient immédiatement rentable", "Propriétaire")
    d.bullets([
        ("Heures de pointe, transferts de quart ou barrière des langues : ", "téléphone qui sonne dans le vide, urgences multi-postes et réponses en 10 langues alignées sur vos prix planchers."),
        ("Fardeau documentaire CPA / Juridique / CRIC : ", "validation TPS/TVQ au centime, triage à 2 colonnes avec extrait exact et préparation illimitée de dossiers incluse en Buffet Fixe Pur à 350 $/mois (Solo) ou 490 $/mois (Équipe)."),
        ("Notre pacte antifragile (Garantie de Symétrie Mensuelle) : ", "lorsque >= 3 dossiers sont signés dans le mois, si la correction humaine moyenne dépasse 25 %, Trasunto crédite 50 % de la mensualité ; au-delà de 35 %, la mensualité tombe à 0,00 $."),
    ])
    d.callout("Le test des 60 secondes", "Avant toute signature, nous évaluons vos chiffres réels. Si le voyant est rouge, nous vous serrons la main et vous laissons travailler en paix.")
    d.save()


def build_dossier_cpa() -> None:
    d = FanalDoc(
        "TRASUNTO-DOSSIER-CPA",
        "DOSSIER PROFESSIONNEL · COMPTABLE (CPA)",
        "Fanal Solo pour cabinets CPA et teneurs de livres",
        "« L'IA travaille. L'humain veille, décide, révise. » — Zéro faute de TPS/TVQ",
        "Trasunto inc. · Charlevoix, Québec · Dossier CPA v2.0 · Novembre 2026",
    )
    d.section("1", "Tout le travail mécanique que Fanal vous épargne", "Comptable / CPA")
    d.bullets([
        ("1. Pointage au centime & validation TVQ/TPS : ", "sous-total + TPS (5 %) + TVQ (9,975 %) vérifiés automatiquement ; toute facture suspecte ou sans inscription TVQ s'arrête en rouge avec lien Revenu Québec."),
        ("2. Dépenses mixtes & catégories DPA/CCA : ", "repas, véhicule, bureau à domicile et avances à l'actionnaire s'affichent en jaune ; vous tranchez, Fanal consigne la justification pour votre ordre professionnel."),
        ("3. Préparation de fin d'année & Loi 25 : ", "conciliation bancaire repliée en vert pour ce qui concorde ; données chiffrées sur votre poste sous Voile PII avant tout appel au Cerveau Dual Fermé (DeepSeek + Gemini)."),
    ])
    d.section("2", "Offre tout inclus Cohorte Bêta Fondateurs", "Comptable / CPA")
    d.table(
        ["Élément", "Détail", "Tarif CAD HT"],
        [
            ["Implantation clé en main (30–45 min)", "Codification de votre Constitution Fermée V2 CPA + blindage Loi 25 (zéro Ollama)", "350,00 $ (rég. 500 $)"],
            ["Abonnement Fanal Solo Buffet Fixe Pur", "Secrétaire + Répondant + Triage 2 colonnes + dossiers illimités", "350,00 $ / mois (0 $ / dossier)"],
            ["Hub Fiduciaire .fanal (multi-postes)", "Consortium ou cabinet avec équipe comptable multi-dossiers", "650,00 $ / mois (ou Équipe 490 $)"],
        ],
        widths_cm=[5.2, 7.8, 4.4],
    )
    d.save()


def build_dossier_cric() -> None:
    d = FanalDoc(
        "TRASUNTO-DOSSIER-CRIC",
        "DOSSIER PROFESSIONNEL · CONSULTANT EN IMMIGRATION (CRIC)",
        "Fanal Solo pour consultants réglementés en immigration",
        "Vérification lettre par lettre MRZ, trous chronologiques et accueil en 10 langues",
        "Trasunto inc. · Charlevoix, Québec · Dossier CRIC v2.0 · Novembre 2026",
    )
    d.section("1", "Protéger chaque dossier contre le refus sur une faute de frappe", "Consultant CRIC")
    d.bullets([
        ("1. Miroir MRZ lettre par lettre : ", "croisement instantané du passeport, du permis et des formulaires MIFI/Arrima/IRCC ; toute lettre divergente apparaît en rouge à côté de l'original."),
        ("2. Chasse aux trous chronologiques & dates d'expiration : ", "contrôle des attestations d'emploi, diplômes, tampons de voyage et validité des tests linguistiques avant le dépôt."),
        ("3. Accueil multilingue (10 langues) & Loi 25 : ", "réponses préparées dans la langue du requérant sans jamais promettre d'issue ; pseudonymisation locale sur votre poste."),
    ])
    d.section("2", "Offre tout inclus Cohorte Bêta Fondateurs", "Consultant CRIC")
    d.table(
        ["Élément", "Détail", "Tarif CAD HT"],
        [
            ["Implantation clé en main (30–45 min)", "Configuration sur poste actuel, Constitution Fermée V2 CRIC, Voile Loi 25", "350,00 $ (rég. 500 $)"],
            ["Abonnement Fanal Solo Buffet Fixe Pur", "Dossiers illimités sans supplément + Garantie de Symétrie Mensuelle", "350,00 $ / mois (0 $ / dossier)"],
            ["Fanal Équipe (cabinet multi-employés)", "Multi-postes, supervision interne et flux d'approbation", "490,00 $ / mois (impl. 750 $)"],
        ],
        widths_cm=[5.2, 7.8, 4.4],
    )
    d.save()


def main() -> None:
    build_manual()
    build_grille()
    build_plan_affaires()
    build_plan_3ans()
    build_plan_solo()
    build_one_pager()
    build_accord_pilote()
    build_guide_client()
    build_invitation_beta()
    build_charge_honnetete()
    build_dossier_cpa()
    build_dossier_cric()


if __name__ == "__main__":
    main()
