# KPI template — Restaurant

Computed by the `autonomy-grader` Management Summary from the supervision
log. Copy this file to `kpi.md` (workspace root, `.dsh/kpi.md`, or
`~/.dsh/kpi.md`) to activate these sector KPIs.

| KPI | Definition | How the log provides it |
|---|---|---|
| Tables served | number of table-service sessions | session entries |
| Automatic actions per table | (GREEN + SEMI-AUTOMATIC actions) / tables | action counts per session |
| Order-to-kitchen time | minutes between "order noted" and "order sent" | timestamps of the two decision lines |
| Proposal approval rate | approved proposals / total proposals | decision lines (YELLOW) |
| Allergy-flag verifications | SEMI flags verified / SEMI flags issued | ⚑ verification lines |
| Corrections per shift | human corrections / sessions | correction lines |
| Autonomy level | 1–5 from the pattern grades | grader |

## Trends

Report each KPI with its previous-period value and the direction (up /
flat / down). The owner acts on trends, not on single numbers.
