# Super-Agent Adaptation Analysis

How the J.Franco suite maps to — and extends — DeepSeek Harness's
Super-agent architecture (Router + Worker, published 2026-10-31; sources:
[ITHome](https://m.ithome.com/html/1020615.htm),
[Qiniu deep-dive](https://news.qiniu.com/archives/1793499698327),
[Stocktwits](https://stocktwits.com/news-articles/markets/equity/deepseek-autonomous-coding-agent-anthropic-ipo-claude-code/cNGekVdR9cy),
prototype: [dsh-superagent-prototype](https://github.com/deepseek-ai/dsh-superagent-prototype)).

## The Super-agent in one paragraph

A persistent, proactive assistant that lives across channels (group chats,
GitHub, calendars) instead of living in one chat session. A lightweight
**Router** talks to humans and dispatches; isolated **Workers** execute in
parallel and report back. Environmental events are **Triggers** filtered in
two levels (program rules, then model judgment). A **Watchdog** monitors
progress and recovery. Long work runs asynchronously; the human only
appears for decisions and acceptance. Four traits: continuous, efficient,
proactive, persistent.

## Mapping to our suite

| Super-agent concept | Our equivalent | State |
|---|---|---|
| Router (interaction, global context, dispatch) | `workflow-master` (clue, listening, standby) | Aligned; now states its Router role explicitly |
| Workers (isolated parallel execution) | missions, subagents, background jobs | Aligned via mission scope and delegation |
| Triggers (events as input, 2-level filter) | TRIGGER class in `input-detector` | Now documents the same two-level filter |
| Threads and subscription direct path | live action list + session identity | Aligned; thread continuity via the living list |
| Inline & Spill / Chain of Recall | DSH built-in compaction + supervision log with dated entries | Aligned (platform provides the machinery) |
| Watchdog (progress and recovery) | `accountability-auditor` **Watchdog pass** | Added in this update |
| Speculative execution (prepare ahead) | standby mode + **speculative preparation** | Added in this update |
| Async ReAct loop | DSH background jobs (platform) | Available; skills reference missions/background work |
| Accept modes: observe → propose → execute | **Accept modes** in `autonomy-grader` | Added in this update |
| Proactive within policy ("as little human attention as possible") | decisions.md GREEN rules + autonomy grading | Aligned — our grader is the gate that earns proactivity |
| Field feedback loop | panel feedback + supervisor backend + `workflow-master` Field feedback | Added in this update |
| Safety (prompt injection, credentials) | RED tier, permission presets, hashed logins in supervisor | Aligned; supervisor keeps credentials out of model context |

## What we changed for this architecture

1. `workflow-master` — Router role, speculative preparation, and the Field
   feedback protocol (triage → fix GREEN / propose → log → close the loop).
2. `input-detector` — two-level Trigger filtering (program rules first,
   then semantic judgment).
3. `accountability-auditor` — Watchdog pass: progress checks (stuck?
   off-track? stalled jobs?) with URGENT marks and recovery proposals.
4. `autonomy-grader` — Accept modes (OBSERVE / PROPOSE / EXECUTE) per
   pattern, plus a procedure to co-develop sector KPIs with the owner.
5. Supervisor backend — the business Router's control plane: real logins,
   roles, live field view, feedback queue, rules editor.
6. Action Panel — field feedback form wired to the supervisor.

## Open problems in the Super-agent paper → our roadmap

| Paper's open problem | Our plan |
|---|---|
| Router scaling under load | supervisor backend batching (roadmap) |
| Long-range memory across months | supervision log + Chain-of-Recall IDs in entries |
| Human collaboration outside sessions | panel + dashboard as the human surface |
| A2A communication between agent instances | multi-site supervisor (roadmap) |
| Security: prompt injection, credential leakage, cross-device permissions | RED tier by default, scrypt logins, local-only server, danger-full-access never granted to Workers by policy |
