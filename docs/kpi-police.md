# KPI template — Police

Computed by the `autonomy-grader` Management Summary from the supervision
log. Copy this file to `kpi.md` (workspace root, `.dsh/kpi.md`, or
`~/.dsh/kpi.md`) to activate these sector KPIs — or develop your own
metrics with the agent (see the grader's "Developing sector KPIs" section).

| KPI | Definition | How the log provides it |
|---|---|---|
| Incidents processed | incident sessions per period | session entries |
| Time to report | minutes from incident start to official report | timestamps |
| Advisory answers given | legal-advice lines delivered in advisory mode | advisory lines |
| Escalations respected | RED actions never executed without approval | RED decision lines |
| Autonomy level | 1-5 | grader |

## Trends

Report each KPI with its previous-period value and the direction (up /
flat / down). The owner acts on trends, not on single numbers.
