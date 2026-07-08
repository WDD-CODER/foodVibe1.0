# Commands Index

Quick reference for everything in this folder.
Aligned with the three-agent workflow (Architect / Contractor / Reviewer).
See `README_WORKFLOW.md` and `CLAUDE.md`.

**Flows** = multi-step pipelines.
**Commands** = single-purpose utilities.

---

## Flows — Feature Development

| Command | What it does |
|---------|-------------|
| `/plan` | Planning / Plan Contract path — Architect authors `/plans/[feature]_v[N].md` |
| `/feat` | New-feature path — loads rules, routes through `/plan` then Contractor + `/review-it` |
| `/review-it` | Reviewer pass — plan-match, conventions, Verify gate; report-only by default |

---

## Flows — Fix & Refactor

| Command | What it does |
|---------|-------------|
| `/fix` | Bug fix path — loads matching `.claude/rules/`, investigate + elegant-fix |
| `/refactor` | Refactor path — loads angular/domain rules, cssLayer, techdebt |
| `/security` | Security path — loads `.claude/rules/security.md`, invokes security-officer |

---

## Flows — Testing & Audit

| Command | What it does |
|---------|-------------|
| `/test-pr-review-merge` | Full Test → PR → Review → Merge (trunk merge) pipeline |
| `/test-template` | Score a fix template against its fixture corpus |
| `/adversarial-template` | Generate adversarial test cases to stress-test a fix template |
| `/mobile-flow-audit` | Walk mobile flows at 375×812 RTL, stress-test layout |
| `/render-flow-audit` | Walk the live Render deployment for functional bugs |

---

## Flows — Session Lifecycle

| Command | What it does |
|---------|-------------|
| `/ship` | Session end — build gate, this-chat file tree + Verify bullets, agent commits (`--yes` skips wait) |
| `/brief` | Capture or generate a session brief |
| `/evaluate-me` | Agent session retrospective — grades the session |

---

## Commands — Maintenance & Cleanup

| Command | What it does |
|---------|-------------|
| `/brief-detect` | Manually invoke brief-detection gate |
| `/cleanup` | Session & worktree pruning — removes stale branches and worktrees |
| `/sweep-stale-todos` | Find and close todos that are no longer relevant |
| `/docs-refresh` | On-demand documentation refresh — updates breadcrumbs and project docs |
| `/auto-solve` | Autonomous plan executor (legacy; prefer milestone-by-milestone Contractor) |
| `/context-override` | Override session context defaults |

---

## Retired (do not invoke)

These were removed in the three-agent cutover. Historical mentions in `plans/` /
`docs/` / reports are archives only:

- `/plan-implementation`, `/execute-it`, `/validate-agent-refs`
- `/nightly-audit`, `/audit-report`, `/reflect`, `/reflect-list`, `/reflect-add-tests`
- Agents: `product-manager`, `software-architect`, `end-of-session-agent`, `reflect-agent`
