# Cockpit Browser — EL NAVEGADOR DE CABINA

A real browser the DSH agent controls. It launches a Chromium browser
(Chrome / Edge / Chromium) in its own window and drives it over the Chrome
DevTools Protocol through the `/cockpit` command — with the Fanal safety rails:
persistent session, no `file://`, the constitutional brake before the final
button, the emerald border, and physical-mouse detection.

## The contract (read first)

> The user commands, the agent assists. Every field the agent fills leaves the
> **emerald border** so the human SEES what it did — and the final button
> (**Envoyer / Soumettre / Payer / Transmettre**) is ALWAYS the human's click.
> This is enforced by code: `/cockpit click` on a forbidden button returns
> 🛑 FRENO and does not click.

## How it works (honest scope)

- The browser opens as a **separate Chromium window** on the human's machine —
  it is NOT rendered inside the DSH GUI (the DSH host cannot host an Electron
  view; that is a hard platform limit). It IS a real browser the agent drives.
- The session is **persistent**: a dedicated `--user-data-dir`
  (`~/.dsh/cockpit-browser/profile`) keeps cookies and `localStorage` across
  restarts. Passwords are stored by Chromium itself in the SYSTEM keychain
  (macOS Keychain / Windows DPAPI) — the plugin never reads or writes them.
- The agent never opens `file://` (only `http(s)`), so no local file is loaded
  into the internet-facing page.

## The six pillars

1. **Persistent session** — `cockpit open` reuses the same profile, so Google /
   Microsoft / the portals stay signed in between sessions.
2. **Double isolation** — the browser only navigates `http(s)`; `file://` is
   refused by the command. Local files are read with the host filesystem, never
   handed to the internet page.
3. **Constitutional brake** — `cockpit fill` sets a value and dispatches the real
   `input`/`change` events; `cockpit click` refuses any element whose label
   matches `envoyer|soumettre|transmettre|payer|signer|submit|pay|send|…` and
   returns 🛑 FRENO for the human.
4. **The 36px HUD** — three states: ⚡ AGENTE (running) · 🖐️ VOLANTE HUMANO
   (human has the wheel) · 🛑 FRENO (braked). Controls: `pause`, `resume`,
   `step` (exactly one next action). A physical `mousedown`/`keydown` on the
   page flips the wheel to the human automatically.
5. **No data loss** — the browser is never reloaded by the agent's commands;
   forms stay as they are. `screenshot` and `read` observe, they never refresh.
6. **The golden rule** — every `fill` and `click` paints the emerald border
   (`#10b981`), so the human sees exactly what the agent touched.

## The workflow for "check my Facebook Business and draft a reply"

1. `/cockpit open https://business.facebook.com/…`
2. `/cockpit status` — confirm ⚡ AGENTE and read the URL/title.
3. `/cockpit read` — read the page text. `/cockpit read ".message"` — read one
   element. `/cockpit screenshot` — see it.
4. `/cockpit fill "#email" "user@example.com"` and `/cockpit fill "#pass" "…"`.
   Use `screenshot` or `read` to verify the emerald borders.
5. If login needs a final click on a forbidden button (Envoyer / Sign in), STOP:
   tell the human and let them click it themselves. Do not call `/cockpit click`
   on it.
6. Draft the reply in a normal assistant message; only use the cockpit to READ
   and FILL — never to submit.

## The red lines

- Never call `/cockpit click` on Envoyer / Soumettre / Payer / Transmettre /
  Sign in / Send / Publish / Post. The brake will refuse it; do not try to
  bypass it.
- Never open `file://`. `/cockpit open` refuses it.
- Never ask the user for a password to store it in a file or paste it into a
  message. Passwords belong to the system keychain, typed by the human.
- If `cockpit status` shows 🖐️ VOLANTE HUMANO (the human touched the page), STOP
  and ask before continuing.
