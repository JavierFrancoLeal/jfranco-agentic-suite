# KPI template — Restaurant

Computed by the `autonomy-grader` Management Summary from the supervision
log. Copy this file to `kpi.md` (workspace root, `.dsh/kpi.md`, or
`~/.dsh/kpi.md`) to activate these sector KPIs — or develop your own
metrics with the agent (see the grader's "Developing sector KPIs" section).

| KPI | Definition | How the log provides it |
|---|---|---|
| Tables served | table-service sessions per period | session entries |
| Automatic actions per table | (GREEN + SEMI actions) / tables | action counts |
| Order-to-kitchen time | minutes between 'order noted' and 'order sent' | decision timestamps |
| Proposal approval rate | approved / total proposals | decision lines |
| Allergy-flag verifications | SEMI flags verified / issued | flag verification lines |
| Corrections per shift | corrections / sessions | correction lines |
| Autonomy level | 1-5 | grader |

## Trends

Report each KPI with its previous-period value and the direction (up /
flat / down). The owner acts on trends, not on single numbers.
