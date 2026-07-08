# FoodVibe Workflow — Three-Agent Manual Bridge

Historical cutover record: [`PRD-three-agent-cutover.md`](PRD-three-agent-cutover.md) (2026-07-08).

## Roles

| Role | Where | Pool | Job |
|---|---|---|---|
| **Architect** | Claude.ai | A (flat) | Plans. Writes Plan Contracts in `/plans/[feature]_v[N].md`. Never touches the repo. |
| **Contractor** | Cursor | B (workhorse) | Executes ONE milestone from an approved plan. Stops. Writes `/sessions/[date].md`. |
| **Reviewer** | Claude Code CLI | C (premium) | `/review-it` only. Reports. Never silently fixes. Never commits. |
| **Human Director** | You | — | Carries plans across the gap. Commits. Marks milestones `[x]` after verify. |

## Day-to-day loop

1. Architect produces / updates Plan Contract → save under `/plans/`
2. Human pastes Execute prompt into Cursor for Milestone N only
3. Cursor stops + writes `/sessions/YYYY-MM-DD.md`
4. Human runs `/review-it` in Claude Code
5. On APPROVE: Human runs verify, commits, marks milestone done
6. Repeat for next milestone

## Authoritative files

- Reviewer rules: `CLAUDE.md`
- Contractor rules: `.cursorrules`
- Stack: `/_shared/tech-stack.md`
- Current state capsule: `/_shared/current-state.md`
- Path-scoped standards: `.claude/rules/{angular,security,domain,backend}.md`
- Review command: `.claude/commands/review-it.md`

## What retired

Team Leader as execution dispatcher, MemPalace, custom plan-implementation/execute-it,
nightly-audit/reflect cron automation, end-of-session 14-phase agent. See PRD Appendix.

## Old vs new plans

Existing `plans/NNN-name.plan.md` files stay. New work uses `/plans/[feature]_v[N].md`.
