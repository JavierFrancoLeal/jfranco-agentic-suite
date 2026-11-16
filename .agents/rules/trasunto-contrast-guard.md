---
name: trasunto-contrast-guard
description: Mandatory WCAG 2.1 + CIELAB perceptual contrast and anti-camouflage gate for all Trasunto / Fanal interfaces (desktop, web, mobile).
---

# Trasunto Perceptual Contrast & Anti-Camouflage Guard

Every UI edit in Fanal or Fanal Studio (`supervisor/dashboard.html`, `ui/panel.html`, `apps/desktop/welcome.html`, `apps/desktop/main.js`, or future web/mobile surfaces) MUST uphold these visual invariants:

1. **Trasunto Palette Discipline (Zero Off-Brand Drift)**
   - **Never** introduce dark-terminal or pink off-brand tokens: `#090d16`, `#020617`, `#0f172a` (desktop splash/main), `#064e3b`, `#38bdf8`, `#1b2436`, `#fff5f5`.
   - Use Trasunto Indigo-Violet tokens (`#354ed6`, `#4D6BFE`, `#573bd4`, `#6842cc`, dark indigo `#0b1220 -> #1e1b4b`, pearl `#eef2ff` / `#ffffff`, Studio bronze `#78350f`).

2. **WCAG 2.1 Contrast Floors**
   - Normal visible text: **>= 4.5:1** contrast against composited RGBA ancestors AND worst-case `linear-gradient` stops.
   - Large text (`>= 24px` or bold `>= 18.66px`), interactive borders, and form controls: **>= 3.0:1** (`>= 4.5:1` for `<select>` options and `.pill.active`).
   - Light muted copy: use `#475467` or darker (never `#667085` on tint).
   - White text buttons: use `#354ed6` / `#573bd4` (never bright `#4D6BFE` or `#7c5cff` behind white label text).
   - Alert badges / errors: use `#b91c1c` with `#ffffff` text (`>= 6.4:1`).

3. **Perceptual Anti-Camouflage (`CIELAB Delta-E`)**
   - Brand medallions (`.brand-mark`, `.lang-medallion`, `.splash-medallion`, `.welcome-medallion`, `.logo`) MUST keep **`Delta-E >= 15`** against parent surface and **`Delta-E >= 18`** between SVG stroke/fill and pearl medallion surface.

4. **Mandatory Verification Command**
   - After modifying any UI or theme file, run `node tools/audit-contrast.mjs` (and `sh tools/check.sh`) before declaring completion.
