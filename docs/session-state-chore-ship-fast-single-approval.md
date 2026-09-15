# Session State

## Branch
chore/ship-fast-single-approval

## Date
2026-09-15

## Session Summary
- User asked for a way to ship all the way through merge without two separate confirmation
  stops, "when I'm all sure on what's going on."
- Clarified through several rounds: they do NOT want lane classification/review depth ever
  skipped (a diff touching `server/routes/auth.js` must still get full review) — only the
  *approval count* should drop from two (commit, then merge) to one, and only when nothing
  flagged a problem in between.
- Landed on redefining `/ship fast`: it no longer forces FAST lane classification (the old,
  unwanted meaning — skipped real review). Now Phase 0 always classifies honestly regardless
  of the flag; `fast` only collapses Phase 4 (commit approval) + Phase 4.5 (merge gate) into
  one reply, whichever lane Phase 0 actually lands on. A real review finding still hard-stops
  before Phase 4 is ever reached.
- Also added a Phase 2 guard: invoking `/review` via the Skill tool by name silently resolves
  to a much heavier gstack-vendored skill of the same name, not this project's lightweight
  `.claude/commands/review.md` — observed costing many times the tokens for zero extra safety
  this session (also true of `browse`). Documented as a gotcha too.
- Noted a concurrent session actively dirtying `server/index.js` and
  `plans/302-perf-phase1-infra-and-payload.plan.md` in this same shared working directory —
  left both completely untouched, staged only this session's own 3 files.

## Files Modified
 .claude/commands/ship.md                                              | 32 ++++++++++++++------
 docs/brain/gotchas/agent-workflow.md                                  | 14 +++++++++
 docs/brain/decisions/0007-ship-fast-decouples-approval-from-classification.md | 39 +++++++++++++++++++++

## Commit
(pending — this file folds into that commit before push)

## PR
N/A yet

## Next Steps
- Push this branch, then follow the normal Commit-vs-PR judgment (ad-hoc, no brief this
  session → ask feature-complete vs checkpoint) and Post-push Merge Gate.
- Once merged: next time you're confident about a ship, just say "ship fast" — one reply
  will cover commit through merge, whatever lane Phase 0 picks.
- Unrelated, not touched: a concurrent session has uncommitted changes to `server/index.js`
  and `plans/302-perf-phase1-infra-and-payload.plan.md` in this same working directory —
  not mine, left alone.
