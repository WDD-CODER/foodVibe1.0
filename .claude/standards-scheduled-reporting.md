---
name: Scheduled Agent Reporting Standard
description: Every scheduled nightly agent that does real work must write a summary section that gets merged into the unified morning report
---

# Scheduled Agent Reporting Standard

## Rule

Every scheduled agent that runs at night and makes changes must write a brief summary
to a staging file. The nightly audit agent (last to run) merges all staging files into
the single morning report.

## How to implement in your agent prompt

At the end of your task, write a staging file:

**File path:** `.claude/reports/audit/YYYY-MM-DD-<agent-slug>.md`

**Format:**
```markdown
## <Agent Name>
- [bullet] What was changed and in which file
- [bullet] What was changed and in which file
```

Rules for bullets:
- One bullet per logical change
- State what changed, not why
- No "skipped" entries — only actual changes
- If nothing was changed, write: `## <Agent Name>\nNo changes tonight.`

Then commit the staging file:
```bash
git add .claude/reports/audit/YYYY-MM-DD-<agent-slug>.md
git commit -m "chore(<agent-slug>): write nightly report section YYYY-MM-DD"
```

The nightly audit agent (runs last at 01:57 Israel time) will pick up all staging
files matching `YYYY-MM-DD-*.md` and merge them into `.claude/reports/audit/YYYY-MM-DD-nightly-audit.md`.

## Current nightly agents and their slugs

| Agent | Trigger time (Israel) | Slug |
|---|---|---|
| Evening maintenance / reflect | 23:03 | `reflect` |
| Nightly audit | 01:57 | *(owner — merges all sections)* |

## Adding a new scheduled agent

1. Add a row to the table above
2. Follow the staging file format in your agent's prompt
3. No other changes needed — the audit agent auto-discovers `YYYY-MM-DD-*.md` files
