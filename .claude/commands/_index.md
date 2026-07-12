# Commands Index

Quick reference for everything in this folder.
Aligned with the three-agent workflow (Architect / Contractor / Reviewer).
See `README_WORKFLOW.md` and `CLAUDE.md`.

**Flows** = multi-step pipelines.
**Commands** = single-purpose utilities.

---

## Flows â€” Feature Development

| Command | What it does |
|---------|-------------|
| `/plan` | Planning / Plan Contract path â€” Architect authors `/plans/[feature]_v[N].md` |
| `/feat` | New-feature path â€” loads rules, routes through `/plan` then Contractor + `/review-it` |
| `/review-it` | Reviewer pass â€” plan-match, conventions, Verify gate; report-only by default |

---

## Flows â€” Fix & Refactor

| Command | What it does |
|---------|-------------|
| `/fix` | Bug fix path â€” loads matching `docs/agent/`, investigate + elegant-fix |
| `/fix-pr-checks` | Bounded PR check fix loop â€” `docs/agent/pr-check-fix-loop.md` (2 rounds max) |
| `/refactor` | Refactor path â€” loads angular/domain rules, cssLayer, techdebt |
| `/security` | Security path â€” loads `docs/agent/standards-security.md`, relies on pre-commit security grep + CI |

---

## Flows â€” Testing & Audit

| Command | What it does |
|---------|-------------|
| `/test-pr-review-merge` | Full Test â†’ PR â†’ Review â†’ Merge (trunk merge) pipeline |
| `/test-template` | Score a fix template against its fixture corpus |
| `/adversarial-template` | Generate adversarial test cases to stress-test a fix template |
| `/mobile-flow-audit` | Walk mobile flows at 375Ã—812 RTL, stress-test layout |
| `/render-flow-audit` | Walk the live Render deployment for functional bugs |

---

## Flows â€” Session Lifecycle

| Command | What it does |
|---------|-------------|
| `/ship` | Session end â€” build gate, this-chat file tree + Verify bullets, agent commits (`--yes` skips wait) |
| `/brief` | Capture or generate a session brief |
| `/evaluate-me` | Agent session retrospective â€” grades the session |

---

## Commands â€” Maintenance & Cleanup

| Command | What it does |
|---------|-------------|
| `/brief-detect` | Manually invoke brief-detection gate |
| `/cleanup` | Session & worktree pruning â€” removes stale branches and worktrees |
| `/sweep-stale-todos` | Find and close todos that are no longer relevant |
| `/docs-refresh` | On-demand documentation refresh â€” updates breadcrumbs and project docs |
| `/auto-solve` | Autonomous plan executor (legacy; prefer milestone-by-milestone Contractor) |
| `/context-override` | Override session context defaults |
| `/skills` | List all registered skills, triggers, and scope |
| `/commands` | List all registered slash commands, categories, and paths |

---

## Retired (do not invoke)

These were removed in the three-agent cutover. Historical mentions in `plans/` /
`docs/` / reports are archives only:

- `/plan-implementation`, `/execute-it`, `/validate-agent-refs`
- `/nightly-audit`, `/audit-report`, `/reflect`, `/reflect-list`, `/reflect-add-tests`
- Agents: `(retired)`, `(retired)`, `/ship`, `(retired)`
