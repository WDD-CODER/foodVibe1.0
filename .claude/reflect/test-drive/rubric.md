# Reflect Test-Drive — Evaluation Rubric

**Test-drive period**: 2026-04-21 to 2026-04-28
**Decision date**: 2026-04-28
**Decision reference**: decision-criteria.md

---

## Per-run evaluation fields

Fill in one row of `log.md` after each `/reflect` invocation.

### Required fields

| Field | Description |
|-------|-------------|
| `run_number` | Sequential integer (0 = smoke test, 1–N = real runs) |
| `date` | YYYY-MM-DD |
| `trigger` | What triggered this run: `manual`, `end-session reminder`, `scheduled` |
| `target_skill` | Which skill or file was reflected on |
| `input_quality` | Did reflect receive a clear, well-scoped input? (1=poor, 5=excellent) |
| `output_useful` | Was the output actionable? Did it suggest a real improvement? (1=no, 5=yes) |
| `time_cost_mins` | Approximate wall-clock time the run added to the session |
| `applied` | Was any suggested fix applied? (yes / no / partial) |
| `verdict_note` | Free-text note (1–2 sentences max) |

### Scoring guidance

- **output_useful = 1**: Output was generic, redundant with what Claude would say anyway, or addressed a non-issue.
- **output_useful = 3**: Output identified a real pattern but the suggestion was imprecise or already known.
- **output_useful = 5**: Output identified a specific, actionable improvement that was not obvious without the reflect run.

### What the user fills in (NOT Claude)

The user (Dan) fills out rubric entries personally. Claude does not self-score.
Claude may prompt the user to log a run but never writes entries on the user's behalf.
