# Simple Usage Guide — DeepSeek Harness, Siri-style

Keep your agents always available in the background, and wake them with a
button, a keystroke, or a phrase — in any language.

## 0. One-command installation

Everything in this guide can be set up with one command:

```sh
./install.sh          # macOS / Linux
```

On Windows: right-click `install.ps1` → **Run with PowerShell**. Answer two
questions (sector and mode) and the installer handles the rest: the six
plugins, the starter `decisions.md`, the `supervision.md` log, and the panel.

## 1. Always in the background

- Leave **DeepSeek Harness** open (minimized or on another screen): your
  plugins and sessions stay alive in the background.
- Optional: System Settings → General → "Open at Login" so it starts with
  your Mac.

## 2. The button

- Build the **"DSH Listen"** app from
  [`ui/DSH-Escucha.applescript`](../ui/DSH-Escucha.applescript) (Script
  Editor → save as Application) and put it in the **Dock**.
- One click = DeepSeek Harness in front, ready to listen.

## 3. Voice (macOS dictation, like Siri)

macOS ships built-in dictation; enable it once in System Settings →
Keyboard → Dictation. Then:

1. Click the button (or Cmd+Tab to DeepSeek Harness).
2. Press the dictation key (default: double-tap Fn).
3. Say: **"listen"** (or "escucha", "écoute", "hör zu", "ascolta", "escuta",
   "听", "聞いて", "들어봐", "استمع"…) and relay the conversation.
4. Say: **"that's all"**.

The AI confirms "Listening — go ahead", splits the work, executes the
automatic part, proposes what needs your approval, and closes with the
report.

## 4. Real-time interpretation

If one of the speakers uses another language, nothing extra is needed:

- Listening mode detects the languages and calls the **interpreter** on its
  own.
- Or say **"translate"** / "traduce" / "interpreta" / `/interpret`.
- You get the meaning in your language and a ready-to-say phrase in the
  other person's language (in earpiece mode: short, speakable lines).

## 5. The action layer (one button, zero friction)

The suite ships two access points built for independent AI work:

- **Action Panel** ([`ui/panel.html`](../ui/panel.html)): open it in your
  browser. One big LISTEN/DICTATE button, a 10-language switcher, voice
  dictation, read-aloud, and copy-to-DSH. Works on Mac and Windows, in any
  browser. Sub-features (interpretation, lookups…) are activated by
  speaking, inside the flow — the input analysis decides the workflow.
- **DSH Assistant** ([`ui/DSH-Asistente.applescript`](../ui/DSH-Asistente.applescript)
  for Mac, [`ui/DSH-Asistente.ps1`](../ui/DSH-Asistente.ps1) for Windows):
  one-button launchers that run the five plugins autonomously through the
  headless `campo` profile (no DSH window needed) and open the result.
- **One-time step for autonomous mode:** the `campo` profile uses an API key
  (the app's interactive session cannot be reused from outside, for
  security). Add your key once: `export DSH_DEEPSEEK_API_KEY=sk-...` in your
  Terminal (or startup shell). Without the key, use the **Action Panel**
  with the app open — it works with zero configuration.

To build the apps on your Mac: open **Script Editor**, paste the
`.applescript` text, save it as an **Application**, and drag it to the Dock.

## 6. One-line summary

**Button (Dock) → dictation key → "listen" → speak → "that's all" → verify
the report → you decide → result.** (Or one click on "DSH Assistant" for
fully autonomous execution.)

## Future (roadmap)

- Floating "listen" button inside the app and a menu-bar mode.
- Always-on wake phrase ("DSH, listen") with compatible hardware.
