# GitHub Context Sync — foodVibe 1.0

Pull recent GitHub activity into a single context dump. Use at session start, after time away, or before code review.

## When to Run

- Starting a new work session after time away
- Beginning work on a new feature
- Before code review
- Weekly planning

## Workflow

1. **Recent commits** — `git log --oneline --since=7.days.ago --stat`; identify files changed most frequently.
2. **Pull requests (MCP-first)** — `mcp__github__list_pull_requests` for open PRs; for each open PR call `mcp__github__get_pull_request` to read body, review status, and labels. Fall back to `gh pr list` if MCP unavailable.
3. **Issues (MCP-first)** — `mcp__github__list_issues` for open and recently closed. Fall back to `gh issue list`.
4. **PR reviews** — For any open PR: call `mcp__github__list_pull_request_reviews` to surface pending review requests or change requests.
5. **Branch activity** — `git branch -r --sort=-committerdate`
6. **Generate summary** using the report template below.
7. **Save** the summary to `notes/github-sync/YYYY-MM-DD.md` (create directory if needed).

> **MCP fallback**: If `mcp__github__*` tools are unavailable in the session, fall back to `gh` CLI silently — do not block the workflow.

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
