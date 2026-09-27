# Session State

## Branch
chore/nightly-maintenance-notify

## Date
2026-09-27

## Session Summary
- Live-tested the newly merged `nightly-maintenance` routine; it worked correctly but exposed a real gap: it runs in an ephemeral cloud sandbox (`persist_session: false`) and its "never commit or push" rule (copied from `auto-solve`'s local-session logic) meant every finding vanished when the sandbox tore down.
- Fixed `.claude/commands/nightly-maintenance.md`: Phase 4 now commits + pushes the dedicated branch and opens a **draft PR** (never merged by the command), so findings persist on GitHub and the existing `github-sync` skill's daily `gh pr list` naturally surfaces it for review — no new reminder infrastructure needed.
- Added an outstanding-PR guard in Phase 1 to avoid piling up a new draft PR each night before the last one is reviewed.
- Fixed stale "every 30 minutes" wording to "hourly" (matches the actual `RemoteTrigger` 1-hour cron minimum discovered earlier this session).

## Files Modified
.claude/commands/nightly-maintenance.md | 57 ++++++++++++++++++++++++---------
1 file changed, 41 insertions(+), 16 deletions(-)

## Commit
7fd6f86a

## PR
N/A (created after this file)

## Next Steps
- After merge, `RemoteTrigger run` on `trig_01QgSh59rP5FQDpLiPDA9Zpb` and confirm a real draft PR appears on GitHub with tonight's findings, nothing merged, and the push notification fired with the correct link.
- Confirm the outstanding-PR guard: with that draft PR still open, run again and confirm it stops immediately (no new branch/PR/marker).
- Close/merge the test draft PR and confirm a subsequent run proceeds normally.
