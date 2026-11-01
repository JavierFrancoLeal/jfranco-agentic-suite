# KPI template — Hotel

Computed by the `autonomy-grader` Management Summary from the supervision
log. Copy this file to `kpi.md` (workspace root, `.dsh/kpi.md`, or
`~/.dsh/kpi.md`) to activate these sector KPIs — or develop your own
metrics with the agent (see the grader's "Developing sector KPIs" section).

| KPI | Definition | How the log provides it |
|---|---|---|
| Check-ins completed | number of check-ins finished per period | session closings |
| Time to key | minutes from guest arrival to check-in complete | timestamps of detection and closing |
| Room-change approval rate | approved room-change proposals / total | YELLOW decision lines |
| Corrections per shift | human corrections / sessions | correction lines |
| Autonomy level | 1-5 from the pattern grades | grader |

## Trends

Report each KPI with its previous-period value and the direction (up /
flat / down). The owner acts on trends, not on single numbers.
