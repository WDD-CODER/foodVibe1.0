# Session State

## Branch
feat/session-20261002

## Date
2026-10-02

## Session Summary
- Diagnosed last ship's 3 false manifest overlaps: ship-prep.mjs's overlap check only time-gated on manifest mtime, never checked whether the owning branch was merged/deleted.
- Fixed scripts/session-manifest-ship.py: resolves each other branch's sha and prunes it (from the overlap report and from disk) when it's gone or already an ancestor of HEAD.
- Found and fixed a second gap while testing: squash-merge-and-delete leaves no ancestor link, so merge-base alone missed it — added a git fetch --prune first so a stale local tracking ref doesn't lie about a branch GitHub already deleted.
- Live-verified: the fix correctly pruned 65 stale session-manifest leftovers (including last ship's two false positives) and reported zero overlaps for real work.

## Files Modified
 docs/brain/gotchas/git-workflow.md | 10 +++++
 scripts/session-manifest-ship.py   | 77 +++++++++++++++++++++++++++++++++-----
 scripts/ship-prep.mjs              | 10 ++++-
 3 files changed, 87 insertions(+), 10 deletions(-)

## Commit
d8dfb784

## PR
N/A

## Next Steps
- None — self-contained tooling fix, verified live.
