# Session State

## Branch
chore/ship-md-split

## Date
2026-09-30

## Session Summary
- Shipped Plan 325 (Brief B2, final of a 3-part sequence): split .claude/commands/ship.md into a short core plus docs/agent/ship-regular.md and docs/agent/ship-recovery.md, so FAST/ULTRA-TRIVIAL ships never load REGULAR-lane or recovery content
- Compressed the fast-flag explanation (previously repeated 3x across Flags/Phase 4/Phase 4.5) into one paragraph; found and fixed a dangling cross-reference bug during the split
- Known gap disclosed to the Human: core is ~2380 words, not the original ~1200-word target, since Plans 323/324 already compressed Phase 0/3/5 before this split started, leaving less REGULAR-only content to extract than assumed

## Files Modified
 .claude/commands/ship.md                           | 98 ++++------------------
 .claude/todo.md                                    | 10 +++
 docs/agent/ship-recovery.md                        | 37 ++++++++
 docs/agent/ship-regular.md                         | 79 +++++++++++++++++
 plans/325-ship-md-core-and-on-demand-split.plan.md | 47 +++++++++++
 5 files changed, 188 insertions(+), 83 deletions(-)

## Commit
bcca632e

## PR
N/A yet - proposing next

## Next Steps
- 3-part sequence (Plan 323, 324, 325) is now complete and merged. No open follow-up work from this sequence.
- Next open item is whatever's first in node scripts/todo-query.mjs next (Plan 321 Phase 2a or later).
