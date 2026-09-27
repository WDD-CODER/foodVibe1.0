# Session State

## Branch
chore/nightly-maintenance-setup

## Date
2026-09-27

## Session Summary
- Added `.claude/commands/nightly-maintenance.md`: unattended nightly command (idempotency marker, github-sync/techdebt/update-docs/pr-check-fix-loop, `ng build` self-validation, `OVERNIGHT-REPORT-<date>.md`, never commits).
- Trimmed `AGENTS.md` skill triggers: `techdebt` and `update-docs` now fire only on "before a PR" (or explicit "audit tech debt"), dropped the "end of session / after finishing a component" cadence now covered overnight.
- Created and validated the `nightly-maintenance` `RemoteTrigger` cloud routine (hourly retry window, Israel-local 2–6 AM); a live test run correctly failed before this file was merged (command didn't exist on `main` yet) and correctly refused to improvise a substitute.
- Captured 2 brain gotchas in `docs/brain/gotchas/agent-workflow.md`: RemoteTrigger's 1-hour cron minimum + default MCP-connector attachment, and cloud routines cloning from GitHub rather than seeing local/uncommitted state.

## Files Modified
.claude/commands/nightly-maintenance.md | 95 +++++++++++++++++++++++++++++++++
AGENTS.md                               |  4 +-
docs/brain/gotchas/agent-workflow.md    | 20 +++++++
3 files changed, 117 insertions(+), 2 deletions(-)

## Commit
8bae6d89

## PR
N/A (created after this file)

## Next Steps
- Re-run `RemoteTrigger run` on `trig_01QgSh59rP5FQDpLiPDA9Zpb` after merge to confirm the command now resolves and runs the full maintenance flow.
- Watch for the first real overnight fire (~23:00 UTC tonight) and review `OVERNIGHT-REPORT-<date>.md`.
- `docs/brain/gotchas/agent-workflow.md` is now well past its ~150-line/~10-entry split threshold — propose splitting it at the next Merge Gate.
