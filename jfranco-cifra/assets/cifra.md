# Cifra — the host signature and its adaptations

Use this skill when a Fanal skin must adapt to the HOST it runs on:
operating system (macOS, Windows, Linux, iOS, Android), form factor
(laptop, tablet, smartphone), touch, Electron/kiosk, PWA standalone.

## The signature

Embed the canonical snippet (assets/host-detect.js) in the skin. It
exposes `window.CIFRA = { os, form, touch, electron, kiosk, standalone }`
and adds body classes: os-*, form-*, touch, standalone, electron, kiosk.

## What must adapt per host

1. TEXT: permission instructions. "Nothing leaves this Mac" becomes
   "Nothing leaves this PC" on Windows. Finder becomes File Explorer.
   The OS-adaptive matrix keys: home, permMic, permFinder.
2. INSTRUCTIONS: the permission step of the installation wizard shows
   the real path of each OS (System Settings vs Settings vs Android
   runtime permissions), including the "try it" triggers.
3. PROGRAMMING: CSS by body classes (os-win .foot, form-phone layout,
   touch targets ≥ 44px); the panel's dictation hint per OS; the kiosk
   class locks the kitchen tablet fullscreen.
4. AUDIT: every skin shows its signature (🖥️ os · form · electron/touch)
   in the Supervision card — the host can never lie about itself to the
   operator.

## Rules

- Detect, never guess: the signature comes from real APIs only.
- Adapt text and layout; never change the flow (the traffic light and
  the silo are the same on every host).
- New OSes: extend the matrix, do not branch the business logic.
