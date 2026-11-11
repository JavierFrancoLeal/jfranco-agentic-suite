# OPERATIONS-MANUAL — the founder's backstage (2026-11-10)

*The client is the gym owner plugging the coffee machine into the
wall; Trasunto is Hydro-Québec: the turbines, the transformers and the
high-tension wiring stay behind the wall. The client never opens a DSH
account, never opens Google Cloud, never installs an API, never sees a
token.*

## The backstage in 4 steps

1. TWO master accounts, Trasunto only: the DeepSeek corporate account +
   the Google Cloud project (the credits). One corporate card pays the
   wholesale tokens.
2. ONE sub-key per client with a HARD CAP ($5 USD/month — the real
   consumption is $0.32-1.35): if the machine is stolen or a virus
   uses the key, the universe's worst damage is $5 and the key dies
   from the phone in 3 seconds.
3. The encrypted injection at install: the key enters the local file,
   AES-256-GCM via the OS keychain (safeStorage), the plaintext is
   destroyed. The client never sees the key.
4. The local electricity meter (billing_meter.json): the supervisor
   counts the tokens (internal cost control) and the signed dossiers
   with their exact edit percentage (the automatic symmetry credit).

## What you charge and why (one Solo client, 10 dossiers/month)

Setup 350 $ (month 1 only) + retainer 165 $ + 10 dossiers × 16 $ − the
symmetry credit (the dossier edited 22% gets 50% off = −8 $) →
subtotal 317 $ + TPS 5% + TVQ 9.975% → the PAD bank debit takes
1.50 $/charge (never the 2.9% credit-card fee). The clean monthly
margin per client: ~313.60 $ (98.9%).

## Your own accounting (the 3-step routine, day 1 of every month)

1. One invoicing file: the script reads the 20 clients' meters,
   applies TPS/TVQ, emails the PDF with the symmetry breakdown, fires
   the PAD.
2. The 2-account rule: the moment the money lands, the TPS/TVQ net +
   an 18% income-tax provision moves to a separate fiscal savings
   account. What remains in the operating account is 100% free.
3. One CSV for the CPA at year end: exportLedgerDayToAccountingCsv
   exports the 12 months of issued invoices and the expense receipts.

With 20 Solo clients: ~7 390 $/month of revenue, ~6 597 $ of clean
operating cash (89.3% margin). The invoice engine lives at
/api/invoice (buildMonthlyClientInvoice) with the symmetry built in.

## The honorable exit (the last use — the trust argument)

The uninstall offers ONE button: [Export my entire sovereign archive
to the Desktop] (the daily PDFs, the Acomba/QuickBooks CSVs, the
ledger.jsonl in plain readable text) — then destroys the temporary
vault, stamps the last Loi 25 purge proof, deletes the API sub-key
from the keychain, and removes the executable with no ghost processes.
Saying on Day 1 "if you leave, you take 100% of your data in one
click" kills the lock-in fear forever.

## The Founder Mode, the Prestige scale and the right drawer (2026-11-11)

1. The founder uses the SAME executable; the master key unlocks the
   fourth hidden view (Cmd+Shift+M): the fleet (one 44px row per
   client with the health light), the machine room (the sub-keys with
   the $5 hard caps), the master invoicer (the PAD + the TPS/TVQ) and
   the apices laboratory. The endpoints exist; the console UI is the
   beta-period build.
2. The Prestige scale (the price-quality bias — CONFIRMED with the
   honest counsel): $500 setup + $295/month Solo, $950 + $490/month
   Équipe as the PUBLIC list. The BETA recommends the founding tier
   ($249 Solo / $420 Équipe, announced from day 1 as "founding price,
   rises to the public list at the launch") — the anchor creates the
   perception, the discount protects the beta. The 6-month beta with
   2 clients/month = 14 founding clients, ~$31.5K invoiced, ~$6.9K
   MRR at the exit.
3. The car/driver: Google/Microsoft is the car (the folders sync, the
   docs, the email — their responsibility); Fanal is the driver (the
   governance, the semaphore, the dossiers). Never build a word
   processor or a mail server.
4. The right drawer (BUILT in main.js): the WebContentsView with the
   persistent encrypted partition (the Google/Microsoft session lives
   in the OS keychain — Trasunto never touches the password), the
   automatic 380→1040px expansion, the PDF page jump, the image zoom
   viewer, the CSV/text renderer — the Claude Cowork pattern.

## The inverted modes, the blind support and the two-lane updater (2026-11-11)

1. Fanal INVERTS the AI apps: the Execution/Dossier mode is the
   permanent front stage (90% — the work arrives as decision cards,
   the human decides and signs), the conversational drawer is the
   secondary 10% (the ? key): three chambers — A the local help base
   (0 tokens, 0 ms), B the "ask this file" (the veil on), C the
   general assistant (the same ladder). The chat NEVER touches the
   ledger: it explains and offers [↗ send to the Execution mode to
   validate with the semaphore] — the Execution mode is the only door
   that signs.
2. The blind diagnostic capsule (BUILT): /api/support/ticket — the
   user's report, the failing document's skeleton and the last 15 log
   lines ALL pass through the veil 2.1 BEFORE leaving the machine; the
   founder receives the radiography, never the biography. Never
   Sentry/Datadog/LogRocket (the third-party telemetry would leak the
   forms' text to US servers).
3. The two-lane updater: Lane 1 the signed hot-patch (50 KB, Ed25519
   verified — BUILT as /api/update/hotpatch-verify; the beta's current
   mechanism is the sync, the signed patch formalizes it); Lane 2 the
   binary electron-updater with .blockmap differential, autoInstallOnAppQuit
   (never a mid-day forced restart during a signature ceremony) —
   active AFTER the signing: $119 CAD/year Apple Developer ID +
   ~$156 CAD/year Azure Trusted Signing (~$275 total).

## The vault freeze (2026-11-11, adopted)

The 1Password/Signal pattern, never the bank's reload: 5 minutes of
idle (or the lid closed, or the OS lock, or the Cmd+Shift+L panic
shortcut) → the two monitors hide in ~2 ms, the master key is
ZEROIZED in RAM (fill(0)), the curtain overlays the DOM WITHOUT
reloading (the work stays intact) — the unlock via Touch ID / Windows
Hello or the scrypt master password (N=65536, r=8, p=1, the 64 MB
per-attempt cost) restores the exact same page and field in 0.4 s.
The setContentProtection(true) blocks the OS thumbnails (Mission
Control / Alt+Tab) from photographing the windows. The biometric
unlock reaches its full form after the Apple signing; the scrypt path
works today. The curtain is a top-level layer: ZERO changes to the
existing screens.
