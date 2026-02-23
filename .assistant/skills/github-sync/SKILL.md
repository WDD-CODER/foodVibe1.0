# GitHub Context Sync — foodVibe 1.0

Pull recent GitHub activity into a single context dump. Essential for catching up after being away, understanding recent changes, and reviewing activity before starting work.

## When to Run

- Starting a new work session after time away
- Beginning work on a new feature
- Before code review to understand context
- Weekly planning sessions

## Workflow

### Phase 1: Recent Commits

```powershell
# Commits from last 7 days
git log --since="7 days ago" --oneline --stat | Select-Object -First 60

# Files changed most frequently
git log --since="7 days ago" --name-only --pretty=format: | Sort-Object | Group-Object | Sort-Object Count -Descending | Select-Object -First 15
```

### Phase 2: Pull Requests

```powershell
# Recent PRs (open and merged)
gh pr list --state all --limit 15 --json number,title,state,author,createdAt,mergedAt,url

# Details for recently merged PRs
gh pr list --state merged --limit 5 --json number,title,files,additions,deletions
```

### Phase 3: Issues

```powershell
# Open issues
gh issue list --state open --limit 15 --json number,title,labels,createdAt

# Recently closed
gh issue list --state closed --limit 10 --json number,title,closedAt,labels
```

### Phase 4: Branch Activity

```powershell
# Active branches sorted by recent commits
git branch -r --sort=-committerdate | Select-Object -First 10
```

### Phase 5: Generate Summary

Compile into a structured report:

```markdown
# GitHub Sync — foodVibe 1.0 — [Date]

## Summary
- **Commits**: X total (last 7 days)
- **PRs Merged**: Y
- **PRs Open**: Z
- **Issues Open**: A

## Key Changes

### Merged Pull Requests
| PR | Title | Files | +/- |
|----|-------|-------|-----|

### Hot Files (Most Changed)
1. [file] — [N] changes
2. [file] — [N] changes

### Open PRs Needing Attention
| PR | Title | Days Open |
|----|-------|-----------|

### Open Issues
| Issue | Title | Labels |
|-------|-------|--------|

## Impact on Current Work
- [New patterns introduced]
- [Breaking changes]
- [Areas requiring attention before next feature]
```

### Phase 6: Save for Reference

```powershell
New-Item -ItemType Directory -Force -Path "notes/github-sync"
# Save the generated summary to notes/github-sync/YYYY-MM-DD.md
```

## Related Skills

- `/techdebt` — Analyze debt from recent changes
- `/update-docs` — Update docs after reviewing changes
