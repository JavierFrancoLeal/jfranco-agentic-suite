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
| End-to-end proof | ✔ BOTH brains live: (a) FAST flash — Spanish transcript → AI summary (Person 1, 2 requests, GREEN tiers); English tourist transcript → summary TRANSLATED into French ("Un club sandwich sans tomates" SEMI — the modification flag — + "Deux verres de vin blanc" GREEN: transcription, translation AND the traffic light in one cycle); (b) DEEP v4-pro — pricing question → consulting answer (range 1 500–4 500 CAD/mois with reasoning) in a 50 s cycle |
| Gates | ✔ ALL CHECKS PASSED |
| Human attention | Each step was proposed and the human approved (5 decision points); one live correction round (the model-name guess) |
| Time (measured) | FLASH cycle: 22 s end to end (includes the 4 s poll) · DEEP v4-pro cycle: 50 s |

## B. WITH the super-agent (dsh-superagent)

Status: **bundle built** (lib/, 11 files — after solving the macOS
code-signing wall: node-nohr, an ad-hoc re-signed copy of the runtime
node without the hardened-runtime flag, plus a fresh pnpm install with
intact signatures). Pending: the operator's 9 setup answers, then a
GitHub issue with this same task for the agent, then its PR reviewed
against the baseline above.

| Criterion | Result |
|---|---|
| Setup | ⏳ |
| Ticket → PR | ⏳ |
| Quality vs baseline | ⏳ |
| Gates | ⏳ |
| Human attention | ⏳ |
| Time | ⏳ |

## C. Verdict

⏳ — blocked on the operator: the SETUP protocol needs the operator's 9
answers (Q1: Sources) before the agent can run. The baseline is the
reference bar: every criterion of column A must be met by column B.
