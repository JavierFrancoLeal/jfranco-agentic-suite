# Business — Installation, Teaching, and Supervision

The J.Franco playbook for taking the suite to real customers: install,
teach, supervise, and learn from real life.

## 1. What is offered

An **accountable workflow assistant** for companies:

- The AI **listens** (button, voice, any language), **splits** the work,
  **executes** the automatic part, **proposes** what needs approval, and
  **reports** everything — the human verifies and decides.
- Real-time translation/interpretation inside the same flow.
- A **living supervision record** (`supervision.md`) where every report is
  kept: what the AI understood, what it did on its own, and what each worker
  approved.

## 2. Installing in the business

1. Install **DeepSeek Harness** on the computer (Mac or Windows).
2. Install the **suite** (`dsh plugin --profile desktop add <path>` for the
   five `@jfranco/*` packages).
3. Open the **Action Panel** (`ui/panel.html`) in the browser, or build the
   **DSH Assistant** app (Mac: AppleScript; Windows: `DSH-Asistente.ps1`).
4. Set the API key once for autonomous mode (the `campo` profile).
5. Copy the **decision template** for the sector (hotel, restaurant,
   police…) into `decisions.md` and adjust it with the business owner.

## 3. Teaching the customer (1-hour session)

1. **The button:** one click → the AI listens.
2. **The flow:** speak the conversation → say "that's all" → the AI splits →
   executes the 🟢, proposes the 🟡, asks the 🔴.
3. **The report:** what to verify (⚑) and what to decide.
4. **Training:** correct it in plain words; new rules go to `decisions.md`.
5. **Interpreting:** say "translate" at any moment, without leaving the
   flow.

## 4. The real-life test

Phases: **pilot** (one position, one week) → **adjustment** (rules and
template) → **expansion** (several positions) → **metrics**.

Metrics from the supervision record:

- Automatic actions performed by the AI (time saved).
- 🟡 proposals: how many were approved, adjusted, or rejected.
- Human corrections to the detection (understanding quality).
- Errors found during ⚑ verification (execution quality).

## 5. Owner supervision

- Every report is appended to `supervision.md` (a record that only grows).
- The owner reviews weekly: what each worker decided, what the AI did alone,
  what failed.
- Adjustments go to `decisions.md` (more green = more autonomy; more yellow
  = more control).
- Impact: compare before/after times and decision quality. Keep learnings in
  [docs/LEARNINGS.md](LEARNINGS.md).

## 6. Open source and business model

- Everything is **MIT** and public on GitHub: customers can audit the code.
- Possible models: **installation and support** (service), **custom plugins**
  per sector, **training**, and **subscriptions to connectors** for
  specialized apps when they exist.
- The real test is the product: every customer contributes learnings that
  improve the suite for everyone.

## 7. Uncertainty and learning

Real life brings unexpected inputs. Golden rules:

- When in doubt, the traffic light goes to 🟡 or 🔴, never 🟢.
- Every error is recorded as a gap in the report and becomes a rule in
  `decisions.md`.
- The human always decides: the AI is never legally or commercially
  responsible. Explain this to the customer on day one.
