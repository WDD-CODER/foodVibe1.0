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
| `/plan` | Planning / Plan Contract path — Architect authors `plans/NNN-slug.plan.md` via save-plan |
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

## Flows â€” Session Lifecycle

| Command | What it does |
|---------|-------------|
| `/ship` | Session end â€” build gate, this-chat file tree + Verify bullets, agent commits (`--yes` skips wait) |
| `/done` | Validate a finished chat job â€” close-out ask, then mark matching todos `[x]` |
| `/brief` | Capture or generate a session brief |

---

## Commands â€” Maintenance & Cleanup

| Command | What it does |
|---------|-------------|
| `/cleanup` | Session & worktree pruning â€” removes stale branches and worktrees |
| `/sweep-stale-todos` | Find and close todos that are no longer relevant |
| `/done` | Chat-path job validation (also listed under Session Lifecycle) |
| `/docs-refresh` | On-demand documentation refresh â€” updates breadcrumbs and project docs |
| `/auto-solve` | Autonomous plan executor (legacy; prefer milestone-by-milestone Contractor) |
| `/skills` | List all registered skills, triggers, and scope |
| `/commands` | List all registered slash commands, categories, and paths |

---

## Retired (do not invoke)

These were removed in the three-agent cutover. Historical mentions in `plans/` /
`docs/` / reports are archives only:

- `/plan-implementation`, `/execute-it`, `/validate-agent-refs`
- `/nightly-audit`, `/audit-report`, `/reflect`, `/reflect-list`, `/reflect-add-tests`
- Agents: `(retired)`, `(retired)`, `/ship`, `(retired)`
