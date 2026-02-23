# Update Project Documentation — foodVibe 1.0

Refresh project documentation to reflect recent code changes. Ensures agents and developers have accurate, up-to-date navigation context.

## When to Run

- After completing a significant development task
- After adding new features, components, or services
- After creating new directories or restructuring code
- Before creating a pull request

## Workflow

### Phase 1: Gather Context

Understand what changed recently:

```powershell
# Recent commits
git log --oneline -10

# Recently modified files
git diff --name-only HEAD~5..HEAD

# List key directories
Get-ChildItem src/app/core/services/ -Name
Get-ChildItem src/app/pages/ -Name
Get-ChildItem src/app/shared/ -Name
```

Identify:
- New components or services added
- New pages or routes
- Changed models or interfaces
- New translation keys

### Phase 2: Update Breadcrumbs

Use the breadcrumb-navigator agent to scan and update `breadcrumbs.md` files:

```
Read .assistant/agents/breadcrumb-navigator.md for instructions, then:
Scan the codebase and update all breadcrumbs.md files to reflect current
directory structures, file purposes, and navigation context. Focus on:
- src/app/core/services/ (data services, registries)
- src/app/core/models/ (interfaces, types)
- src/app/pages/ (each page and its components/)
- src/app/shared/ (reusable UI components)
Create new breadcrumbs.md files for directories missing them.
```

### Phase 3: Update copilot-instructions.md

Review `.assistant/copilot-instructions.md` for needed updates:

1. Read the current file
2. Check if any new conventions were established during development
3. Verify the agent table is current
4. Add new rules if patterns were discovered

Key sections to verify:
- Agent system overview matches actual agents
- Technical guardrails are up to date
- Translation workflow reflects current dictionary structure
- Lucide icon registry is current

### Phase 4: Update todo.md

Review `.assistant/todo.md`:
1. Mark completed tasks as `[x]`
2. Add new pending tasks discovered during development
3. Update the Plan Index table
4. Verify plan file references are accurate

### Phase 5: Verify Plan Files

```powershell
# List all plans
Get-ChildItem plans/ -Name

# Check for plans not referenced in todo.md
# (manual cross-reference)
```

Ensure:
- Each plan in `plans/` is referenced in `.assistant/todo.md`
- Completed plans are marked done
- Plan numbers follow sequence

### Phase 6: Verification

```powershell
# Check for broken internal references
rg "\[.*\]\(.*\.md\)" agent.md .assistant/ --type md

# Verify agent files exist
Get-ChildItem .assistant/agents/ -Name
Get-ChildItem .assistant/skills/ -Name -Recurse
```

## Final Report

```
== DOCUMENTATION UPDATE COMPLETE ==

Updated Files:
  - [x] breadcrumbs.md — [count] files created/updated
  - [x] copilot-instructions.md — [changes or "No changes needed"]
  - [x] todo.md — [changes or "No changes needed"]
  - [x] agent.md — [changes or "No changes needed"]

Key Changes:
  - [List significant updates]

Recommended Follow-ups:
  - [Manual review suggestions]
```

## Related Skills

- `/github-sync` — Review recent changes before updating docs
- `/techdebt` — Find issues to document
