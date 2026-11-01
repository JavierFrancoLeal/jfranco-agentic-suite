# KPI template — Auto

Computed by the `autonomy-grader` Management Summary from the supervision
log. Copy this file to `kpi.md` (workspace root, `.dsh/kpi.md`, or
`~/.dsh/kpi.md`) to activate these sector KPIs — or develop your own
metrics with the agent (see the grader's "Developing sector KPIs" section).

| KPI | Definition | How the log provides it |
|---|---|---|
| Work orders opened | orders per period | order lines |
| Quote approval rate | approved quotes / proposed | decision lines |
| Releases completed | vehicles released after approval | closing lines |
| Corrections per shift | corrections / sessions | correction lines |
| Autonomy level | 1-5 | grader |

## Trends

Report each KPI with its previous-period value and the direction (up /
flat / down). The owner acts on trends, not on single numbers.
