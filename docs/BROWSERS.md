# Browser compatibility — verified audit

The Action Panel and the Supervisor dashboard are plain HTML + CSS +
JavaScript (no frameworks, no build step), written against widely-supported
web standards. This document records the audit.

## Audit method

- **Syntax:** no optional chaining (`?.`), no nullish coalescing (`??`), no
  `replaceAll`, no `structuredClone` — ES2015-level syntax that parses in
  every modern engine and most older ones.
- **APIs used and their minimum versions:**

| Feature | Chrome | Edge | Safari | Firefox | Opera | Samsung Internet |
|---|---|---|---|---|---|---|
| fetch | 42 | 14 | 10.1 | 39 | 29 | 4 |
| classList / querySelector | all | all | all | all | all | all |
| localStorage / sessionStorage | all | all | all | all | all | all |
| CSS grid + custom properties | 57 | 16 | 10.1 | 52 | 44 | 6.2 |
| speechSynthesis (read-aloud) | 33 | 14 | 7 | 49 | 21 | 2 |
| SpeechRecognition (dictation) | 25 | 79 | 14.1 (webkit) | ❌ not supported | 27 | 4 |
| navigator.clipboard | 66 | 79 | 13.1 | 127 | 53 | 8 |
| Service Worker (PWA offline) | 45 | 17 | 11.1 | 44 | 32 | 4 |

## Degradations handled (by design)

- **Firefox: no dictation.** The panel detects the missing API and shows
  "Dictation not supported" instead of breaking. Read-aloud and typing work
  normally.
- **Older browsers: no clipboard API.** The copy button falls back to
  `execCommand("copy")`.
- **Safari on the hosted panel:** Safari blocks mixed-content requests from
  HTTPS pages to `http://127.0.0.1`. The feedback button then falls back to
  "prompt copied for DSH" — graceful. (Use the Supervisor-served panel over
  LAN, same-origin, and it works fully.)
- **Supervisor unreachable:** the dashboard now shows "Cannot reach the
  supervisor server" instead of failing silently.

## Manual test checklist (per browser)

1. Open the dashboard: `http://127.0.0.1:8787/dashboard` → login as owner →
   the three tabs load, metrics cards show numbers.
2. Worker view: the big LISTEN button opens `/panel`.
3. Panel: language pills switch, copy works, read-aloud speaks.
4. Feedback: submit → "Sent" (or "prompt copied" where blocked).

Verified browsers to test on each release: **Chrome, Edge, Safari, Firefox,
Opera, Samsung Internet** (Android).
