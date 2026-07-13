# Stale / unmerged branches audit — 2026-07-12

## Context

While working on `feat/project-memory-bank` (built from `chore/agent-standards-ci` after
PR #150 merged into `main` at `e29e9e8`), checked for any other branches — local or
remote — with commits not yet merged into `origin/main`.

Command used (from repo root, after `git fetch origin --prune`):

```sh
for b in <branch>; do
  git rev-list --count origin/main..$b
done
```

Dates below are commit timestamps (`git log --format=%cd --date=format:'%Y-%m-%d %H:%M'`),
not branch-creation metadata (git doesn't store that) — "First commit" is the earliest
commit reachable from the branch but not from `origin/main` (i.e. where it diverged).

## Table

| Branch | First commit (diverged) | Latest commit | Commits ahead of `origin/main` |
| --- | --- | --- | --- |
| `feat/project-memory-bank` (local) | 2026-07-12 23:25 | 2026-07-12 23:26 | 2 |
| `audit/2026-04-25` | 2026-04-24 10:42 | 2026-04-25 08:49 | 15 |
| `chore/render-flow-auditor` | 2026-04-24 10:42 | 2026-04-24 20:36 | 12 |
| `claude/analyze-claude-mem-integration-I27X6` | 2026-04-09 09:41 | 2026-04-09 09:45 | 2 |
| `claude/check-gstack-integration-KFwmX` | 2026-04-07 15:13 | 2026-04-07 19:19 | 6 |
| `claude/document-ai-workflow-ySGoG` | 2026-05-21 06:39 | 2026-05-23 16:38 | 6 |
| `claude/improve-app-load-speed-W0JF0` | 2026-04-28 20:07 | 2026-04-28 20:28 | 2 |
| `claude/investigate-environment-setup-1gbIk` | 2026-04-28 20:22 | 2026-04-28 20:22 | 1 |
| `claude/notion-api-assistant-ZvfeH` | 2026-05-20 12:20 | 2026-05-20 12:20 | 1 |
| `feat/cleanup-brief-1` | 2026-04-20 16:34 | 2026-04-21 07:24 | 4 |
| `feat/cleanup-brief-2` | 2026-04-21 07:37 | 2026-04-21 07:37 | 1 |
| `feat/cleanup-brief-3` | 2026-04-21 07:46 | 2026-04-21 07:46 | 1 |
| `feat/cleanup-brief-4` | 2026-04-21 07:47 | 2026-04-21 07:52 | 4 |
| `feat/session-20260420-1554` | 2026-04-20 16:34 | 2026-04-20 16:34 | 2 |
| `fix/265-auto-solve-enforcement` | 2026-04-13 15:48 | 2026-04-13 15:48 | 1 |
| `gh-pages` | 2026-04-17 16:53 | 2026-04-17 17:15 | 2 |
| `worktree-ai-tools` | 2026-04-24 20:10 | 2026-04-24 20:10 | 1 |

## Notes

- `gh-pages` is a deploy target branch — expected to diverge permanently, not a merge candidate.
- `feat/project-memory-bank` is this session's own work (Plan 290), intentionally unpushed
  pending the user's decision to use it or not.
- All others are stale as of this date — oldest is `claude/check-gstack-integration-KFwmX`
  (last touched 2026-04-07), none touched in the ~7 weeks before this audit except
  `audit/2026-04-25` and `claude/document-ai-workflow-ySGoG`.
- Not yet inspected for *content* — only divergence/dates. Before deleting any, check
  whether the work was superseded elsewhere or still needed.

## Next steps (not yet actioned)

- [ ] Review contents of the larger stale branches (`audit/2026-04-25`,
      `chore/render-flow-auditor`) to decide keep/merge/delete.
- [ ] Decide on the smaller one/two-commit `claude/*` branches — likely safe to delete
      if superseded.
- [ ] Confirm `gh-pages` divergence is expected/healthy before ignoring permanently.
