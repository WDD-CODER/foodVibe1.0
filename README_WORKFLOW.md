# FoodVibe Workflow — Three-Agent Manual Bridge

Historical cutover record: [`PRD-three-agent-cutover.md`](PRD-three-agent-cutover.md) (2026-07-08).

## Roles

| Role | Where | Pool | Job |
|---|---|---|---|
| **Architect** | Claude.ai | A (flat) | Plans. Writes Plan Contracts in `/plans/[feature]_v[N].md`. Never touches the repo. |
| **Contractor** | Cursor | B (workhorse) | Executes ONE milestone from an approved plan. Stops. Writes `/sessions/[date].md`. |
| **Reviewer** | Claude Code CLI | C (premium) | `/review-it` only by default. Reports. Never silently fixes. |
| **Human Director** | You | — | Carries plans across the gap. Commits by default. Marks milestones `[x]` after verify. |

## Role flexibility / cost routing

Pools A / B / C are **defaults for cost control**, not hard locks. The Human Director
can explicitly collapse roles into whichever pool has budget:

- Ask **Claude Code (C)** to implement, plan, or mark a verified milestone done when
  Pool C has tokens and B/A do not.
- Ask **Cursor (B)** to review or plan when that is cheaper or more convenient.
- Keep **Architect on Claude.ai (A)** for heavy planning when flat-rate budget is open.

Rules of thumb:
- Explicit Human override wins for that request only.
- `/review-it` stays report-only (no silent fixes) unless Human also asks for fixes.
- Git stays Human-first: agents prepare; commit/push only on explicit ask + approval.
- Stack and path-scoped rules (`/_shared/tech-stack.md`, `.claude/rules/`) still apply
  no matter which pool is executing.

## Day-to-day loop

1. Architect produces / updates Plan Contract → save under `/plans/`
2. Human pastes Execute prompt into Cursor for Milestone N only
3. Cursor stops + writes `/sessions/YYYY-MM-DD.md`
4. Human runs `/review-it` in Claude Code
5. On APPROVE: Human runs verify, commits, marks milestone done
6. Repeat for next milestone

## Authoritative files

- Reviewer rules (default + overrides): `CLAUDE.md`
- Contractor rules (default + overrides): `.cursorrules`
- Stack: `/_shared/tech-stack.md`
- Current state capsule: `/_shared/current-state.md`
- Path-scoped standards: `.claude/rules/{angular,security,domain,backend}.md`
- Review command: `.claude/commands/review-it.md`

## What retired

Team Leader as execution dispatcher, MemPalace, retired `/plan-implementation` and
`/execute-it` (use `/feat` → `/plan` → Contractor → `/review-it` instead),
nightly-audit/reflect cron automation, end-of-session 14-phase agent. See PRD Appendix.

## Old vs new plans

Existing `plans/NNN-name.plan.md` files stay. New work uses `/plans/[feature]_v[N].md`.
