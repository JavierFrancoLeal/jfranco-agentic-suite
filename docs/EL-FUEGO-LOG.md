# 🔥 EL FUEGO-LOG — the canonical fire record (append-only)

*Canonical format of the EL FUEGO standard. Never edit — only append. The
`audit` organ writes every lesson here; the `forensics` organ retrieves it
for whoever arrives later.*

## 2026-11-02 — The printed menu: the fix that never reached the tester
- concept: flow
- friction: the user kept reporting "it persists" after correct fixes; they were testing an installed app that was never replaced.
- lesson: "it persists" can mean a stale build — a fix does not exist until the artifact reaches the right screen.
- correct-order: "Rebuild the .dmg and REPLACE the app in Applications before testing; show the version in the footer."
- evidence: triage.md 2026-11-02 (reel), verBadge footer in supervisor/dashboard.html.

## 2026-11-02 — The dead reference that killed the whole page
- concept: components
- friction: "you did everything wrong": the page went dead — a removed container was still referenced inside a dynamic array.
- lesson: a reference to a missing element kills the ENTIRE script, not one button; lenient tests hide it.
- correct-order: "Run the STRICT smoke test (missing ids = failure) before publishing."
- evidence: tools/smoke-dashboard.js (STRICT), commit be69ae1.

## 2026-11-02 — The invisible menu (z-index)
- concept: layers
- friction: "clicking does nothing" — the menu was opening BEHIND the screen (z-index 90 < 95).
- lesson: "nothing happens" is almost always a layer: check what is on top of what.
- correct-order: "The menu must open ABOVE all layers (higher z-index)."
- evidence: supervisor/dashboard.html (.langov z-index 110), LEARNINGS.md (z-index ledger).

## 2026-11-02 — The invisible logo and content that depended on animation
- concept: animation
- friction: the logo was invisible — it was born hidden waiting for an animation the user had disabled (reduce motion).
- lesson: content must never depend on animation to exist; animation is decoration, visibility is a right.
- correct-order: "Visible by default; animate only when the user allows motion."
- evidence: supervisor/dashboard.html (prefers-reduced-motion: no-preference), commit 07396f2.

## 2026-11-02 — The screen overlap
- concept: timeline
- friction: "bug in the transition" — the splash was fading while the next screen had already appeared.
- lesson: explicit sequence: the previous screen finishes fading BEFORE the next one enters.
- correct-order: "Splash out (0.5s fade), THEN the next screen enters with its own fade."
- evidence: supervisor/dashboard.html (1300ms → 1900ms), LEARNINGS.md (explicit timeline).

## 2026-11-02 — The white box that broke the visual family
- concept: design system
- friction: "inconsistency in the design" — the login was a white card in a world of gradients and glass.
- lesson: the home page is the aesthetic DNA; every screen inherits it.
- correct-order: "Same aesthetic as the language page: gradient, glass, same rectangle."
- evidence: supervisor/dashboard.html (#loginView transparent over gradient), commit 197f5a6.

## 2026-11-03 — One door: the first run IS the login
- concept: flow
- friction: "there are two logins… the process repeats" — the welcome and the login coexisted.
- lesson: the user must not distinguish between installing, creating, and entering: one welcome moment, and creation lives INSIDE the login (only when no users exist).
- correct-order: "Remove the second stage; if no owner exists, show the creation fields inside the same card."
- evidence: supervisor/server.js (/api/setup, /api/setup-status), supervisor/dashboard.html (#setupSection), commit a4aea04.

## 2026-11-03 — White text on a light background (and corrupted design tokens)
- concept: color
- friction: "you did everything wrong, I don't know where to start" — the transparent login had white text, but the saturated gradient only applied on VIEW CHANGE; at load it sat on the light gradient.
- lesson: the initial visual state must be correct by default (the right background from load), and design tokens must never self-reference (--card2:var(--card2)).
- correct-order: "Apply the right background from initial load and verify design variables have real values."
- evidence: supervisor/dashboard.html (document.body.classList.add("loginpage") at startup; :root restored), commit be69ae1.

## 2026-11-03 — Not every idea is an organ: the conductor was absorbed
- concept: design system
- friction: a new organ (conductor) was created to teach, when the organism ALREADY had an organ that reviews friction (audit).
- lesson: before creating a new organ, ask whether an existing one already breathes that function — the industrial lens applies to our own ideas too.
- correct-order: "Absorb the pedagogy into the audit; deprecate the conductor with its honest story."
- evidence: jfranco-audit/assets/audit.md ("Teach, not only report"), conductor deprecated on npm, commit 636aa23.

## 2026-11-03 — The register that does not process, only remembers
- concept: flow
- friction: the wish to integrate a payment processor (Stripe/Lightspeed) before having clients.
- lesson: the immediate value is not processing the payment but RECORDING it — the counter-register saves capital (reconciliation) without fees or risk.
- correct-order: "Add a virtual register: record sales with method, close against the terminal, show the variance."
- evidence: supervisor/server.js (366-370), docs/PAYMENTS-STRATEGY.md, commit 53c306d.

## 2026-11-03 — Adopt the FULL logic of the inspiration (Apple's language flow)
- concept: flow
- friction: the language menu was about to be shown on EVERY launch, forgetting why Apple built it.
- lesson: when borrowing an idea, borrow its whole objective: Apple's language choice exists for a globalized world — once declared, EVERYTHING (text, voice, speech recognition) works in that language, forever. The only exception is when the user says otherwise.
- correct-order: "Language menu once, on first run; the declared language governs all text, voice and recognition everywhere."
- evidence: supervisor/dashboard.html (langStep gated by localStorage dsh-lang), ui/panel.html (VOICE[cur]), supervisor/dashboard.html (rec.lang = f(cur)), EL FUEGO v1.2 principle 1.

## 2026-11-03 — "Once" means configured once, not seen once (boot semantics)
- concept: flow
- friction: closing the app without choosing a language marked it as configured (the default was persisted at load), so the one-time screen never returned.
- lesson: when a screen "appears once", its purpose is to CONFIGURE something — it must repeat on every launch until the human actually configures it. A boot sequence only counts as booted when it completes.
- correct-order: "Show the language screen on every launch until a language is EXPLICITLY chosen; persist only on the human's choice, never on load."
- evidence: supervisor/dashboard.html (localStorage.setItem moved from applyLang to the choice handlers), EL FUEGO principle 1 (Apple's full logic).

## 2026-11-03 — Two components, one class name: the dark boxes that were never black
- concept: components
- friction: the language names showed dark/black boxes although the container was light purple — "investigate what I am telling you" was right: the darkness came from elsewhere.
- lesson: CSS class names are global. Two components sharing a class name collide silently — the LATER rule wins, wherever it lives. Namespace every component (the wallboard's tick became .wtick).
- correct-order: "Rename the colliding class; never let two components share one class name."
- evidence: supervisor/dashboard.html (.tick → .wtick for the wallboard, lines 167-168), commit 5ad7303.

## 2026-11-03 — Never flash a screen that is not part of the flow yet
- concept: timeline
- friction: reopening without a chosen language briefly showed the login before the language screen returned.
- lesson: on a gated flow, the next screen stays hidden (display none) until its turn — revealed only during the transition into it.
- correct-order: "Hide the login while the language screen is pending; reveal it as the transition fades."
- evidence: supervisor/dashboard.html (loginView display none on firstRun; restored at 2100ms of the 2600ms transition), commit 5ad7303.

## 2026-11-03 — Hiding one screen orphaned the footer (the salt that ruined the dish)
- concept: timeline
- friction: at first boot, the language pills flashed at the TOP for an instant — hiding only the login left the footer orphaned, and the empty layout pulled it upward.
- lesson: when gating a flow, hide the WHOLE stage (header, main, footer), not just one actor — an empty layout re-arranges itself and leaks pieces of the next scene.
- correct-order: "Lock the entire page during the boot sequence (body.firstboot hides header/main/footer); release it exactly when the next screen is revealed."
- evidence: supervisor/dashboard.html (body.firstboot rule + classList add/remove), commit next.

## 2026-11-03 — A lock on the stage can swallow a door it must not lock
- concept: layers
- friction: clicking the language rectangle did nothing — the firstboot lock hid <main>, and the language overlay lived INSIDE <main>; it "opened" into an invisible container.
- lesson: overlay layers belong at the TOP level of the document, beside the other fixed stages — a lock on one region must never hold a layer that belongs to another stage.
- correct-order: "Move the overlay outside main; keep locks scoped to what they must hide."
- evidence: supervisor/dashboard.html (#langOverlay moved next to #langStep, outside <main>), commit next.

## 2026-11-03 — The split page and the server that never learned the split (the dropped dish)
- concept: flow
- friction: the structural refactor (CSS/JS/i18n extracted) broke the whole app — the dashboard asked for three files that the app bundle's server did not serve (404) → raw unstyled page.
- lesson: a page and its assets must TRAVEL TOGETHER through every delivery chain. The app bundle's server.js was never in the sync loop — the split files reached the bundle, the routes did not. Before splitting anything, map EVERY chain (browser, demo, npm package, app bundle) and update them all in the same change — or don't split.
- correct-order: "Revert (Ctrl+Z via git). If we ever split again: update all four serving chains in ONE commit and test the app bundle first."
- evidence: apps/desktop/brain/server.js (0 routes) vs brain/dashboard.html (3 references), commits c3c40ed→778991d, revert 8a4f2c5 + supervisor v1.0.41.

## 2026-11-03 — Git history is the Ctrl+Z that saves the kitchen
- concept: flow
- friction: a bad structural change wrecked the working app; the recovery was needed fast.
- lesson: committing every working state turns disaster into a one-command revert. The cost of a revert is minutes when history is clean; it is a rewrite when history is dirty.
- correct-order: "Keep small, frequent, pushed commits; revert with git checkout <last-good> -- <paths>."
- evidence: revert of the refactor via 9f336a3, minutes from complaint to rebuilt DMG.

## 2026-11-03 — A revert must be surgical: the window swallowed the fix
- concept: flow
- friction: after the refactor revert, the language click was dead again — the fix (overlay outside <main>) lived in a commit BETWEEN the chosen snapshot and the refactor, and the whole window was rolled back.
- lesson: revert the CHANGE, not the WINDOW. Before reverting, list what lives in the window (git log) and rescue anything that is not part of the change. And: a solved lesson that has no machine guard will be re-solved forever.
- correct-order: "git revert <the specific commits>; never 'checkout the last good snapshot' blindly. Install a regression guard for every re-solved bug."
- evidence: dashboard.html (#langOverlay back inside <main> after revert), the new smoke regression guard, commits 13247b9 → this fix.

## 2026-11-03 — Stumbling once is natural; stumbling twice on a solved error is the problem
- concept: flow
- friction: the user re-reported a bug already fixed (lesson #16), after a revert silently undid the fix.
- lesson: every lesson must end as a GUARD, not a memory. Guards are the only part of the system that survives reverts, refactors, and forgetfulness.
- correct-order: "For each fixed bug: add a machine check that fails CI when the bug returns."
- evidence: tools/smoke-dashboard.js (the langOverlay-inside-main regression guard), EL FUEGO standard.

## 2026-11-03 — The !important hammer: one forced rule froze the whole boot
- concept: components
- friction: first launch showed ONLY the gradient — the language screen never appeared. The previous "fix" had added !important to the .hidden utility; !important beats the JS inline style.display, so every screen revealed by JavaScript stayed hidden forever.
- lesson: !important is a hammer that breaks the CSS-vs-JS contract (inline styles must be able to win). When a rule seems to need !important, the real bug is elsewhere: remove the CONFLICTING rule (here: display:block in .loginerr), never force the utility.
- correct-order: "Restore the plain utility; delete the conflicting property; add a regression guard that fails CI if .hidden ever carries !important."
- evidence: supervisor/dashboard.html (.hidden restored, .loginerr display removed), tools/check-css-collisions.js (regression guard), commit next.

## 2026-11-03 — Iatrogenesis has a name in engineering: regressions — and the cure is contracts
- concept: flow
- friction: two consecutive "catastrophic" fixes (the revert that swallowed a fix, the !important that froze the boot) — the medicine worse than the disease.
- lesson: every fix that touches shared CSS/JS must be a SURGERY (remove the conflicting rule), not a hammer (!important, broad reverts). And every healed bug must leave a CONTRACT CHECK in the gate, so the same regression is impossible in silence. This is how professional engineering tames iatrogenesis — not with smarter authors, but with guards that fail before the user sees the wound.
- correct-order: "Write the contract checker (tools/bootflow-check.js) BEFORE the next fix; the six boot contracts now fail CI when broken."
- evidence: tools/bootflow-check.js (contracts 1-7), commit next.

## 2026-11-03 — The boot screen is the transition: a scene change never shows emptiness
- concept: timeline
- friction: after choosing a language, a BLANK gradient appeared — the splash had been hidden with inline display:none and that was never cleared, so the transition screen stayed invisible.
- lesson: every scene change that takes time shows the boot screen (animated logo + the phrase). The scene change is not a gap to fill — the boot screen IS the scene. Made it a reusable component (bootFlash) so no future transition can forget it.
- correct-order: "Wrap every scene-change transition in bootFlash(ms, then) — language choice, login, setup, logout."
- evidence: supervisor/dashboard.html (bootFlash + 4 call sites), EL FUEGO principle 3 (pending), commit next.

## 2026-11-03 — The Chinese font that ate the French accents
- concept: color
- friction: copying text from the exported PDF lost French accents and the é looked bold everywhere — LibreOffice, given runs with NO explicit font, substituted LiSung (a Chinese font) + Times; its Latin glyphs have no proper Unicode maps, so copy-paste broke.
- lesson: never export text without an explicit font. Set the Normal style font (Arial) + the document language (fr-CA) — the exporter then embeds a clean subset and accents survive. Verify by checking WHICH fonts the PDF embeds, not just that it renders.
- correct-order: "Set Normal style font + language in the generator; after export, grep the PDF for /BaseFont and demand Arial/Liberation — a CJK font in a French document is the smoking gun."
- evidence: tools/make-docs-v3.py (Arial + fr-CA), PDF /BaseFont before: LiSungLight/TimesNewRomanPS → after: ArialMT/Arial-BoldMT, commit 85c23c6.

## 2026-11-03 — Update mechanics are a cost center: batch them
- concept: flow
- friction: 153 commits and ~28 supervisor publishes + ~15 DMG rebuilds in one session — a large share of tokens and turns spent on delivering, not creating.
- lesson: publishing is non-value work. Develop → verify locally (check.sh) → ONE sync-all + ONE commit per milestone (end of day, or before a demo/client moment). Rebuild the DMG only before delivery. The browser/?reset/LE_VEILLEUX_URL loop already makes most rebuilds unnecessary.
- correct-order: "Batch: one publish per milestone, one DMG per delivery, one commit per feature."
- evidence: git count (153 commits / 48 today), supervisor v1.0.19→v1.0.47.
