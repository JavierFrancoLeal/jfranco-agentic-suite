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
