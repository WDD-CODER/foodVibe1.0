# GitHub Context Sync — foodVibe 1.0

Pull recent GitHub activity into a single context dump. Use at session start, after time away, or before code review.

## When to Run

- Starting a new work session after time away
- Beginning work on a new feature
- Before code review
- Weekly planning

## Workflow

1. **Recent commits** — last 7 days (oneline, stat); identify files changed most frequently.
2. **Pull requests** — list open and merged (e.g. `gh pr list`); details for recently merged.
3. **Issues** — open and recently closed (e.g. `gh issue list`).
4. **Branch activity** — active branches by recent commits (e.g. `git branch -r --sort=-committerdate`).
5. **Generate summary** using the report template below.
6. **Save** the summary to `notes/github-sync/YYYY-MM-DD.md` (create directory if needed).

## Report Template

```markdown
# GitHub Sync — foodVibe 1.0 — [Date]

## Summary
- **Commits**: X (last 7 days) | **PRs Merged**: Y | **PRs Open**: Z | **Issues Open**: A

## Key Changes
### Merged PRs
| PR | Title | Files | +/- |

### Hot Files (Most Changed)
1. [file] — [N] changes

### Open PRs / Open Issues
| # | Title | Days Open / Labels |

## Impact on Current Work
- [New patterns] [Breaking changes] [Areas to watch]
```

## Related

- techdebt — analyze debt from recent changes
- update-docs — update docs after reviewing changes
