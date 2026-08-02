# Session State

## Branch
chore/gotchas-domain-split

## Date
2026-08-02

## Session Summary
- Split `docs/brain/gotchas.md` (280 lines / 21 entries, past its own stated ~150-line/10-entry threshold) into five domain files under `docs/brain/gotchas/`: `agent-workflow.md` (9), `backend.md` (5), `angular.md` (3), `ci.md` (2), `git-workflow.md` (3).
- Rewrote `gotchas.md` into an index: domain table + a routing rule for where future entries get appended.
- Fixed every cross-reference that named a specific entry now living elsewhere: `.claude/commands/ship.md` (same-directory-session gotcha), `docs/brain/decisions/0005-*.md` (npm audit gotcha), `docs/brain/how-it-works.md` (login-reload gotcha + folder map + diagram).
- Updated brain-capture append instructions (`.claude/commands/ship.md`, `docs/agent/brain-capture.md`, `docs/agent/standards-git.md`) to route new gotcha entries by domain instead of a flat append.
- Updated `docs/brain/index.md` and `docs/agent/workflow-map.md` to describe the new layout.
- Left historical/frozen files untouched (`sessions/*.md`, `docs/session-state-*.md`, `.claude/todo-archive/009.md`, `plans/290`/`294`).
- Verified with `node scripts/brain-review-check.mjs --scope=full` — only 2 pre-existing, unrelated advisory findings remain (`plans/NNN-slug.plan.md`, `sessions/YYYY-MM-DD.md` placeholders that predate this change).
- Captured a new gotcha discovered during the split: `brain-review-check.mjs` resolves backtick refs repo-root-relative, so `docs/brain/**` subfolder files must use full repo-relative paths, not paths relative to `docs/brain/`.
- `ng build` passes (pre-existing bundle-budget/ESM warnings only, unrelated to this diff).

## Files Modified
.claude/commands/ship.md                           |   6 +-
docs/agent/brain-capture.md                        |   4 +-
docs/agent/standards-git.md                        |   2 +-
docs/agent/workflow-map.md                         |   2 +-
docs/brain/decisions/0005-scope-npm-audit-to-production-deps.md |   2 +-
docs/brain/gotchas.md                              | 291 ++-------------------
docs/brain/gotchas/agent-workflow.md               | 144 ++++++++++
docs/brain/gotchas/angular.md                      |  35 +++
docs/brain/gotchas/backend.md                      |  73 ++++++
docs/brain/gotchas/ci.md                           |  25 ++
docs/brain/gotchas/git-workflow.md                 |  35 +++
docs/brain/how-it-works.md                         |  10 +-
docs/brain/index.md                                |   2 +-
13 files changed, 355 insertions(+), 276 deletions(-)

## Commit
e481a90

## PR
N/A (proposing next)

## Next Steps
- Open PR for chore/gotchas-domain-split (feature-complete, user confirmed).
- After PR checks pass, run the Post-push Merge Gate.
