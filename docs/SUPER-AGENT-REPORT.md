# Super-agent report — the Flash wiring, with and without dsh-superagent

*Live comparison report. Task (identical for both paths): wire Fanal's
LISTEN button to the real-time brain (deepseek-flash) for transcription,
translation and writing orders, keep deepseek-v4-pro for deep analysis,
and pass the house gates.*

## The task

1. Confirm the official API model names for the dual brain.
2. Rewire `tools/agent-standby.sh`: field transcripts + studio drafts →
   `deepseek-flash`; deep questions → `deepseek-v4-pro`.
3. Prove it end to end: real supervisor + standby agent + a transcript →
   a real AI summary.
4. Pass `tools/check.sh` (ALL CHECKS PASSED) and publish.

## A. WITHOUT the super-agent (the Lead agent + the J.Franco organs)

| Criterion | Result |
|---|---|
| Model names verified live | ✔ `deepseek-flash` works; the API itself revealed `deepseek-v4-pro` (my `deepseek-pro` guess was rejected — caught by the live test) |
| Wiring | ✔ `agent-standby.sh` fast/deep patches (2 commits: `998c994`, `e4c034e`) |
| End-to-end proof | ✔ real supervisor on 8787 + `agent-standby once` → transcript "Mesa cinco: dos poutines y una limonada" → AI summary returned: Person 1, 2 requests, GREEN tiers |
| Gates | ✔ ALL CHECKS PASSED |
| Human attention | Each step was proposed and the human approved; one live correction round (the model-name guess) |
| Time | ~1 working session (wiring + test) |

## B. WITH the super-agent (dsh-superagent)

Status: **setup in progress** (cloned `deepseek-ai/dsh-superagent`, SETUP.md
read, probe run, gh CLI 2.74.1 installed, tmux building). Pending: the
operator's 9 setup answers, then a GitHub issue with this same task for
the agent, then its PR reviewed against the baseline above.

| Criterion | Result |
|---|---|
| Setup | ⏳ |
| Ticket → PR | ⏳ |
| Quality vs baseline | ⏳ |
| Gates | ⏳ |
| Human attention | ⏳ |
| Time | ⏳ |

## C. Verdict

⏳ — to be completed when the super-agent's PR lands. The baseline is the
reference bar: every criterion of column A must be met by column B.
