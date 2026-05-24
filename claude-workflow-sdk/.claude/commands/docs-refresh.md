# /docs-refresh — On-Demand Documentation Refresh

Regenerates breadcrumbs, updates key exports, and prunes stale entries.

Moved from `end-of-session-agent` Phase 8 to an on-demand command.
Run after structural changes (new components, services, or modules).

## When to use

- After adding or removing Angular components/services/modules
- After a large refactor that changes component names or file paths
- Before creating a PR that adds structural changes
- On demand: "update breadcrumbs", "refresh docs", "sync breadcrumbs"

## Execution

```
Agent(
  subagent_type: "general",
  description: "Refresh breadcrumbs and project docs",
  prompt: "Run the update-docs skill. Repo root: [PROJECT_ROOT]. Refresh breadcrumbs.md at major seams, prune stale entries, update key exports."
)
```

Or invoke the `update-docs` skill directly:

1. Read `.claude/skills/update-docs/SKILL.md`
2. Follow the skill's steps to refresh breadcrumbs and documentation

## What it does

- Refreshes `breadcrumbs.md` at component/service/module seams
- Prunes stale entries (deleted files, renamed components)
- Updates key exports section
- Output: list of files updated

## What it does NOT do

- Does not modify application code
- Does not create plan files
- Does not run `ng build`
