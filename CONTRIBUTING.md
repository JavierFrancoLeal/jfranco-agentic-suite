# Contributing

Thank you for contributing to the J.Franco suite! Every contribution is
welcome: bug reports, ideas, translations, new decision templates, and new
plugins.

## How to contribute

1. **Issue:** describe the problem or the idea (any language).
2. **Pull request:** fork the repository, create a branch, and send the
   change. Explain what it solves and how to test it.
3. **No code:** translate the `ui/panel.html` strings or the `locale/*.json`
   files, fix documentation, or add a decision template for a new sector in
   `docs/`.

## Anatomy of a plugin

Each plugin is a package with:

- `package.json` — with `dsh.bundle.patch` and the `author` field.
- `cordis.patch.yml` — inserts the provider into the Cordis tree.
- `lib/index.js` — registers the skill on `ctx.skills` (pattern of
  `@deepseek-ai/dsh-skill-badge`).
- `assets/<skill>.md` — the skill body.
- `locale/*.json` — titles and descriptions per language.
- `README.md`, `icon.svg`, `LICENSE`.

## Quality rules

- The traffic light is never skipped: 🟢 executes, 🟡 proposes and waits, 🔴
  asks.
- The human always decides; the AI is never legally or commercially
  responsible.
- Every change is verified: syntax, valid JSON, and a test in a session.
- Authorship and the MIT license are respected in every file.

## Contact

Author: J.Franco. Open-source project under the MIT license.
