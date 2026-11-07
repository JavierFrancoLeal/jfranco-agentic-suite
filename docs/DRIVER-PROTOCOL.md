# DRIVER-PROTOCOL — the anti-loop rules for any remote driving

*Born from the UTM saga. Any future screen/browser driving must obey
these rules; tools/drive-step.sh enforces them.*

## The six guardrails

1. **Declare before acting** — every step names itself; no anonymous commands.
2. **Never poll the same state twice** — the same command twice in a row
   is a LOOP: drive-step.sh refuses it (exit 2). Change the action or
   decide.
3. **Calibrate before typing** — layouts differ (AZERTY remapped our
   symbols): one character test, then the text. Switch layouts (Win+Space).
4. **Two failures = switch the channel** — keyboard → clipboard →
   shared folder → the human's hands. Never a third attempt on the same
   channel.
5. **Every END auto-dismisses** — the announcement never outlives the
   announced; silence is green and mute.
6. **The human is the FIRST option** — driving is the last resort, only
   when the human asks, always with the badge on.

## Usage

```sh
sh tools/drive-step.sh "abrir Edge" osascript -e 'tell application "UTM" to activate'
sh tools/drive-step.sh "leer pantalla" sh tools/screen-read.sh
sh tools/drive-step.sh end
```

## The hardware budget (added after the 70B-on-8GB crash, 2026-11-07)

Rule 7. **Measure before you pull** — no local model is downloaded or
loaded without tools/brain-preflight.sh first (RAM, recoverable
memory, model size ≤ ~30% of RAM). Rule 8. **One heavy operation per
turn** (a model pull, a large inference, a server restart) — the
machine's stability beats the agent's speed. Rule 9. **Two identical
reads and STOP** — the third read does not exist; report and hand the
decision to the human.

## The verdict that birthed it

The tool is the DISCIPLINE, not the automation: the loopholes of the
saga were polling, blind typing and endless announcements — all fixed
by rules, none by more driving code. More driving automation stays in
the STANDBY dossier until demand pays for it.
