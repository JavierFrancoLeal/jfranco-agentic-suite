# Cockpit Browser — The Cockpit Browser

A real browser the DSH agent controls: it launches a Chromium browser
(Chrome / Edge / Chromium) in its own window and drives it over CDP through
`/cockpit` — with the Fanal safety rails AND the J.Franco guardrails (tiers,
audit trail, Accountability Report).

## The contract (read first)

> The user commands, the agent assists. Every field the agent fills leaves the
> **emerald border** so the human SEES what it did — and the final button
> (**Envoyer / Soumettre / Payer / Transmettre / Create / Authorize**) is
> ALWAYS the human's click. Enforced by code: `/cockpit click` on a forbidden
> button returns 🛑 BRAKE and does not click.

## How it works (honest scope)

- The browser opens as a **separate Chromium window** — not inside the DSH
  GUI (a hard platform limit: the DSH host has no Electron view access). It IS
  a real browser the agent drives.
- The session is **persistent** (`~/.dsh/cockpit-browser/profile`); passwords
  are stored by Chromium in the SYSTEM keychain (Keychain/DPAPI). The plugin
  never reads, logs, or transmits credentials — password fields are redacted
  from the audit trail (`•••`).
- The agent never opens `file://` (only `http(s)`).

## The guardrails (the J.Franco tiers)

Assign a tier to every action BEFORE calling `/cockpit`, exactly as the
decision-router teaches:

| Tier | Cockpit actions | Behavior |
|---|---|---|
| **GREEN** | `status`, `read`, `screenshot`, `open`, `pause/resume/step`, `close` | Execute immediately, then log it |
| **SEMI-AUTOMATIC ⚑** | `fill`, `click` (non-forbidden) | Execute immediately, then FLAG it in the report for mandatory human verification |
| **RED** | `click` on Envoyer/Soumettre/Payer/Transmettre/Create/Authorize/… | Never. The brake refuses it and hands it to the human |
| **YELLOW** | anything that commits the user to a third party, sends a message, or produces an official/committing result | Propose in chat, then WAIT for the human's decision |

Rules: when unsure between two tiers, choose the more restrictive one; never
reclassify a RED as GREEN to make progress; a YELLOW proposal without the
human's answer is a RED situation — stop and ask.

## The guide, not a wall

The cockpit is an autonomous secretary that leaves everything READY for you. It
never stops "just because" — when it stops (RED), it explains itself like a
teacher:

- **Why it stopped** — the button is final/legal/committing (send, pay,
  authorize, create, sign in).
- **✅ What is ready** — the fields it already filled, the values it entered.
- **⏳ What is missing** — exactly the one click YOU must make, and nothing else.

`/cockpit report` reproduces the same two facts (`Ready:` and `Missing:`), so
you never have to reverse-engineer why the agent paused.

## Changing a light (the memory)

When the human says "that red should be green" (or the reverse), record it —
the cockpit remembers it forever and applies it on the next action:

- `/cockpit tier "Create draft" GREEN` — turns a label from RED to GREEN.
- `/cockpit tier "Payer" RED` — turns a label from GREEN to RED.

This writes `~/.dsh/cockpit-browser/tiers.md`, read fresh on every click (no
cache). The change is **immediate and durable**. The last matching line wins.
Never "reclassify a RED as GREEN" silently in your own head — persist it through
`/cockpit tier` so the audit trail stays honest.

## The advice loop

The agent advises AND acts, in this order:

1. **Before a SEMI-AUTOMATIC or YELLOW action** — say in one line what you are
   about to do and its tier ("I'll fill #email with user@example.com — ⚑ SEMI-AUTOMATIC").
2. **Execute** the GREEN/SEMI-AUTOMATIC action via `/cockpit`. For YELLOW,
   wait for the human's "sí" before executing.
3. **After the work** — run `/cockpit report` and hand the human the two
   sections: automatic actions to VERIFY, and proposals to DECIDE. If a
   `supervision.md` log exists, append the report to it. Run `/cockpit kpi` to
   report the efficiency (autonomy vs. human intervention); a low autonomy
   score means the plugin (regex FORBIDDEN / tiers) needs refining.

## The six pillars

1. **Persistent session** — `open` reuses the same profile, so Google /
   Microsoft / the portals stay signed in between sessions.
2. **Double isolation** — only `http(s)`; `file://` is refused. Local files are
   read by the host, never handed to the internet page.
3. **Constitutional brake** — `click` refuses any forbidden label (RED) and
   returns 🛑 BRAKE with ✅ ready / ⏳ missing, for the human.
4. **The 36px HUD** — ⚡ AGENT · 🖐️ HUMAN AT THE WHEEL · 🛑 BRAKE, with
   `pause`/`resume`/`step`, and physical-mouse detection (`mousedown`/`keydown`
   hands the wheel to the human automatically).
5. **No data loss** — the commands never reload the page; forms stay as they
   are.
6. **The golden rule** — every `fill`/`click` paints the emerald border
   (`#10b981`), so the human sees exactly what the agent touched.

## What it reaches

- **iframes** — `read`/`fill`/`click` search the main frame AND every iframe
  (CDP isolated worlds), so Google and Facebook forms inside iframes work.
- **`<select>` dropdowns** — `fill` sets the native value + `change`/`input`.
- **Multiple tabs** — `tabs` / `switch <n>` / `newtab [url]`.
- **Link bridge** — clicking an external link in the DSH GUI routes it into the
  cockpit (Cmd/Ctrl+click bypasses to the normal browser).

## The workflow for "check my Facebook Business and draft a reply"

1. `/cockpit open https://business.facebook.com/…` (GREEN).
2. `/cockpit read` / `/cockpit read ".message"` / `/cockpit screenshot`
   (GREEN) — read the messages.
3. `/cockpit fill "#email" "user@example.com"` — ⚑ SEMI-AUTOMATIC; say it in
   chat first. The password is the HUMAN's, never the agent's.
4. The final "Log in" / "Envoyer" click is RED: stop and let the human do it.
5. Draft the reply in a normal message; NEVER send it yourself (sending is
   YELLOW/RED — propose and wait).
6. `/cockpit report` before finishing.

## The red lines

- Never `/cockpit click` on Envoyer / Soumettre / Payer / Transmettre / Sign
  in / Send / Create / Authorize. The brake refuses it; do not bypass it.
- Never open `file://`.
- Never ask for, store, or paste a password. Passwords live in the system
  keychain, typed by the human; the audit trail redacts them.
- If `cockpit status` shows 🖐️ HUMAN AT THE WHEEL, STOP and ask before continuing.
