---
name: trasunto-contrast-guard
description: >-
  Run and interpret the Trasunto / Fanal automated WCAG 2.1 + CIELAB Delta-E
  perceptual contrast & anti-camouflage auditor across Light, Dark Indigo,
  Wizard, Setup, Studio, Wallboard, Panel, and Desktop Welcome screens.
---

# Trasunto Contrast Guard Skill

Use this skill whenever designing, modifying, or reviewing UI templates, CSS tokens, themes, SVG logos, or Studio branding in Fanal (`supervisor/dashboard.html`, `ui/panel.html`, `apps/desktop/welcome.html`, or new Trasunto skins).

## 1. Execution Protocol

Run the automated contrast audit from the workspace root:

```sh
NODE="/Applications/DeepSeek Harness.app/Contents/Resources/runtime/primary-runtime/dependencies/node/bin/node"
"$NODE" tools/audit-contrast.mjs
```

To require headless Chrome (fail if no Chrome/Edge binary exists):

```sh
DSH_REQUIRE_CHROME=1 "$NODE" tools/audit-contrast.mjs
```

## 2. What It Checks

1. **Part A (Static Palette Gate)**: Rejects forbidden colors (`#090d16`, `#020617`, `#064e3b`, `#38bdf8`, `#1b2436`, `#fff5f5`) and verifies anti-camouflage medallion classes.
2. **Part B (Headless Chrome CDP Computed-Style + Gradient Audit)**:
   - Composites ancestor `rgba(...)` layers and evaluates **every gradient stop** in `linear-gradient(...)` backgrounds.
   - Walks `#langStep`, Wizard Steps 0–7 (`AUTONOMOUS_SOLO` 11 trades + `MICRO_SINGLE_OWNER` 11 SCIAN sectors), Login + Cascading Setup, Owner Cockpit (`overview`, `field`, `rules`, `sector`, `reglages`, `studio-admin`), `/dashboard?wall=1`, `/panel`, and `apps/desktop/welcome.html` in Light & Dark themes.
   - Enforces WCAG `>= 4.5:1` (normal text & `<option>`), `>= 3.0:1` (large text/UI), and CIELAB `Delta-E >= 15` (medallion separation) / `Delta-E >= 18` (SVG logo stroke vs medallion fill).

## 3. Remediation Patterns

- If white text fails on `#4D6BFE` or `#7c5cff` (`~4.33:1`), shift the button/pill background to `#354ed6` / `#573bd4` (`> 5.8:1`) while keeping `#4D6BFE` for borders, SVG strokes, and accents on light cards.
- If Dark Mode chips fail (`color: var(--blue)` on indigo), override `body.dark .chip` / `.vault-chip` with `#e0e7ff` on `rgba(79,70,229,.30)`.
- If Studio amber headers wash out text, terminate `body.studio-edition header` gradient at `#78350f` instead of `#b45309`.
- Consult [TRASUNTO-VISUAL-PHILOSOPHY.md](../../docs/TRASUNTO-VISUAL-PHILOSOPHY.md) after fixes and re-run `tools/audit-contrast.mjs`.
