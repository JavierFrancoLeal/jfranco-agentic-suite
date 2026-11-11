# Lessons — the genome that remembers

The active lessons of the house. Every failure became one of these;
every future session must obey them so the past does not repeat.

## The launch law (lesson #35)
- The package is not the flight: an artifact is SHIPPED only after a
  REAL launch test (the smoke in the clean GUI environment), never
  after the asar inspection alone. The gates that do not launch the
  app do not prove the app opens.
- Before launching an Electron app from a shell, check the
  environment: ELECTRON_RUN_AS_NODE=1 makes it run as NODE with no
  window (the false "nothing opens"). Use `env -u ELECTRON_RUN_AS_NODE`
  for the GUI test.
- Every crash must leave a trace: the startup logger
  (~/.dsh/fanal-startup.log) receives the uncaughtException and the
  unhandledRejection — a silent failure is a forbidden failure.

## The patch law (the quote series)
- For strings with nested quotes, use the DIRECT EDIT, never the
  heredoc generator: the escaping trap produced five caught errors —
  the lesson is the tool choice.

## The one-heavy-op law (lesson #34)
- Measure before pulling models; one heavy operation per turn; never
  poll the same state twice; two failures switch the channel.

## The ledger law
- Every failure becomes a NUMBERED lesson in the KNOWLEDGE-LEDGER plus
  a guard (a gate, a check, a log). A failure that could happen twice
  was not understood once. The genome remembers; the organism grows
  from its own scars.
