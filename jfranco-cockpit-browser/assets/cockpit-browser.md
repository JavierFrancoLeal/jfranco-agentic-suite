# Cockpit Browser — EL NAVEGADOR DE CABINA

The internal browser that lives inside DeepSeek Harness's Electron shell: a
Claude Cowork–style cockpit where the agent and the human share the same
`WebContentsView`, and the human's hand stays on the wheel. This skill teaches
you how to configure it — with the Fanal-proven building blocks, not invented
APIs.

## The contract (read first)

> The user commands, the agent assists. Every field the agent fills leaves the
> **emerald border** so the human SEES what it did — and the final button
> (**Envoyer / Soumettre / Payer / Transmettre**) is ALWAYS the human's click.
> This is not enforced by trust; it is enforced by code.

The cockpit is a **host-side Electron concern**. It runs in the main process
(`WebContentsView`, `screen`, `safeStorage`, `webRequest`) — never in the Web
GUI's renderer, never in a plugin's `lib/client.js`. The agent drives it through
`executeJavaScript` and the IPC channels the shell exposes.

## The six pillars

### 1. The persistent encrypted session

Open the client's web ecosystems in a `WebContentsView` whose partition is
`persist:fanal-client-workspace`. The cookies and `localStorage` persist across
restarts, so Google, Microsoft and the portals stay signed in — the session is
the user's, not a fresh one every launch.

- The **passwords never live in the code**. They live in the SYSTEM keychain:
  macOS **Keychain** or Windows **DPAPI**, reached through Electron's
  `safeStorage`. A credential is decrypted only at the instant it is used, then
  the plaintext buffer is wiped.
- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` — the web
  panel gets the Chromium sandbox, never Node.

### 2. The double isolation

Two panels, two walls, pointing in opposite directions:

- **The web panel** (Google/Microsoft/portals) must NOT open `file://`.
  `will-navigate` calls `event.preventDefault()` on every `file://` URL — a local
  file can never be loaded INTO the internet-facing panel.
- **The documents panel** (the local proofs: PDF, images, text) has the INTERNET
  CANCELLED. `session.webRequest.onBeforeRequest` allows ONLY `file:`, `data:`
  (and `chrome-extension:` for the built-in PDF viewer) and cancels everything
  else — a local file can never leak OUT to the network.

### 3. The constitutional brake

The agent fills the fields; it NEVER presses the final button. A plan step of
type `FILL_FIELD` runs `executeJavaScript` that sets the value and dispatches the
**`input` and `change` events** — the exact events a real keystroke produces — so
the page's own validation fires. A step of type `CLICK` whose label matches the
forbidden set stops the runner and returns
`STOPPED_FOR_HUMAN_SKIN_IN_THE_GAME`: the human gives the legal click.

### 4. The 36px HUD

A 36px strip across the top of the cockpit shows the state and hands the human
the controls:

- **⚡ AGENTE** — the agent is running (emerald).
- **🖐️ VOLANTE HUMANO** — the human has the wheel (amber).
- **🛑 FRENO** — braked before a forbidden button (red).

Three controls live in the strip:

- the **pause button** — the agent stops at the next step boundary;
- the **+1 casilla** — a single step: the step-by-step debugger (one field per
  click, never a batch);
- the **automatic physical-mouse detection** — `before-input-event` sees a real
  `mouseDown` / `keyDown` and flips the HUD to 🖐️ VOLANTE HUMANO *without the
  human touching the button*. The wheel is the human's the moment their hand
  touches the page.

### 5. The dual-monitor without data loss

`screen.on("display-added" | "display-removed" | "display-metrics-changed")`
re-runs the layout. The views are **moved** — `removeChildView` from one window,
`addChildView` into the other — never reloaded, never re-created. A form
half-filled stays INTACT (a ~15 ms reparent, zero navigation). When the cable
comes out, the rescue folds the two views into **tabs** on the surviving monitor.

### 6. The golden rule

The user commands, the agent assists. Every field the agent fills is outlined in
emerald (`#10b981`) with a faint emerald wash — the human SEES exactly what the
agent touched and can undo it in one glance. Trust, made visible.

## The red lines

- No `nodeIntegration: true`, no `contextIsolation: false`, no `eval`, no
  `new Function` — ever.
- No credential string in the repo, the log, or the telemetry. Only
  `safeStorage` (Keychain/DPAPI) holds secrets.
- No agent click on the final button — the brake is in the code, not in a
  prompt.
- No local file leaves the documents panel, and no `file://` enters the web
  panel. The two walls are airtight.

## The recipes

The exact, verified Electron snippets — the copy-paste building blocks — live in
[`recipes.md`](recipes.md). Open it and lift the code directly. Do NOT invent new
APIs or guess flags; the recipes are the ground truth. When a recipe needs a
value you don't have, stop and ask the human instead of guessing.
