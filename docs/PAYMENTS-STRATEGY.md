# Payments strategy — hands that move money

**Definition:** `hands` in business terms is the value the owner can touch:
what saves them capital, what they would otherwise pay another provider
for. The deepest form of value is **money in motion** — so the natural
next organ is payment integration.

## The realpolitik first

- Fanal must **never become a payment processor**: that is a
  licensed, PCI-compliant business (realpolitik: stay the brain, not the
  bank).
- The model is **symbiosis** (the microbiome insight): payment providers
  are other organisms living inside Fanal. They move the money; we
  create the moment that triggers the payment.

## The ecosystem (Canada, 2026)

| Player | Nature | Integration for us |
|---|---|---|
| **Lightspeed** (Quebec 🍁) | POS + payments, born in Montreal | API + Lightspeed Payments; the local story for SADC |
| **Square** | The default for SMB/restaurants | Checkout links, Square Orders API, QR payment |
| **Stripe** | Developer-first | **Payment Links** — a URL/QR that charges a card; simplest first integration |
| **Moneris** | Canada's largest processor | Interac Debit (the Canadian must-have), terminals |
| Toast / Shift4 / Clover | Restaurant POS giants | Later phases, if the client already runs one |

Sources: [paymentgateway.ca — best restaurants 2026](https://paymentgateway.ca/best-restaurants),
[northvetted.ca — Canadian payments](https://www.northvetted.ca/topics/payments),
[Lightspeed vs Moneris](https://checkparity.com/compare/lightspeed-vs-moneris).

## The integration ladder (phases)

### Phase 1 — Payment request on the invoice (fastest real money)

The invoice view (hands v1) gets a **"Pay" button / QR**: the customer
pays with their phone via a Stripe Payment Link or Square checkout —
no card hardware, no terminal. The waiter hands the invoice, the customer
pays, the owner sees "paid" in the dashboard.

- Build: the supervisor generates a payment link (provider API) with the
  invoice amount + table id; the invoice prints it as a QR.
- Fee reality: ~2.6–2.9% + $0.30 (cards); Interac via Moneris is
  cheaper in Canada. The fee is the provider's, not ours.

### Phase 2 — Catalog/orders sync with the POS

Confirmed orders (kitchen flow) sync to the client's existing POS
(Lightspeed/Square) — one catalog, no double entry.

### Phase 3 — Accounting sync

Invoices and payments flow to QuickBooks/Xero — the owner's accountant
gets the books for free. This is the "value = saved capital" story:
the service they used to pay for (reconciliation) is now included.

## What the owner saves (the sales argument)

1. The reconciliation hours their accountant billed.
2. The missed payments from lost paper tickets.
3. The POS double-entry errors.
4. One dashboard instead of three apps.

## The decision for our stage (rationality in time and space)

We are at zero clients — like the animation bug, payment integration is
NON-ESSENTIAL today and must not block the essential flow (first client).

**Adopted system: CASH-FIRST WITH PROOF (created, not integrated).**

- Every restaurant already has a terminal or a till. We do not process
  money; we give the OWNER what they pay others for: **reconciliation**.
- The waiter taps **"Mark paid"** on each order; the owner sees
  "Collected: 7 of 9 orders" and exports the daily bill with paid/pending
  per line.
- Zero integrations, zero accounts, zero fees, zero legal risk. Works in
  every restaurant today.

**Trigger rule (the creator decides):** integrate a processor only when
three or more paying clients explicitly ask for it. Then choose by
geography: Quebec → Lightspeed/Moneris (Interac Debit); elsewhere →
Stripe Payment Links.

## What we need from the creator

1. Choose the first provider: **Stripe** (fastest API) or **Lightspeed**
   (the Quebec story, SADC-ready).
2. Create the account (free) and share only the test-mode keys.
3. Then we build Phase 1: invoice + QR payment, end to end in the demo.
