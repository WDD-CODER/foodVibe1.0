# Commands Index

Quick reference for everything in this folder.
**Flows** = multi-step pipelines that orchestrate agents/skills.
**Commands** = single-purpose utilities you invoke directly.

---

## Flows — Feature Development

| Command | What it does |
|---------|-------------|
| `/feat` | Full new-feature path — loads standards, invokes plan-implementation + execute-it |
| `/plan` | Planning / PRD path — loads templates, invokes product-manager + software-architect |
| `/plan-implementation` | Receive a brief, verify against live code, flag gaps — pauses for approval |
| `/execute-it` | Execute the implementation plan from this conversation |
| `/auto-solve` | Autonomous plan executor — finds next incomplete plan, validates, executes |

---

## Flows — Fix & Refactor

| Command | What it does |
|---------|-------------|
| `/fix` | Bug fix path — loads matching standards section, invokes investigate + elegant-fix |
| `/refactor` | Refactor path — loads standards-angular, cssLayer, techdebt; invokes team-leader |
| `/security` | Security path — loads standards-security, invokes security-officer |

---

## Flows — Testing

| Command | What it does |
|---------|-------------|
| `/test-pr-review-merge` | Full Test → PR → Review → Merge (trunk merge) pipeline |
| `/test-template` | Score a fix template against its fixture corpus |
| `/adversarial-template` | Generate adversarial test cases to stress-test a fix template |
| `/reflect-add-tests` | Human-guided test suite builder for /reflect failures |

---

## Flows — Session Lifecycle

| Command | What it does |
|---------|-------------|
| `/ship` | Fast session end — build gate, commit, push, state save (< 2 min) |
| `/brief` | Capture or generate a session brief — source of truth for session wrap |
| `/evaluate-me` | Agent session retrospective — grades the session |

---

## Flows — Audit & Quality

| Command | What it does |
|---------|-------------|
| `/reflect` (manual-only) | Autonomous self-improvement loop — processes failure log, applies skill fixes |
| `/reflect-list` (manual-only) | Review and fix issues from the tool failure log |
| `/nightly-audit` (manual-only) | Run the nightly codebase audit — scans 6 quality dimensions |
| `/audit-report` | Display the latest nightly audit report |
| `/mobile-flow-audit` | Walk 16 mobile flows at 375×812 RTL, stress-test layout |

---

## Commands — Maintenance & Cleanup

| Command | What it does |
|---------|-------------|
| `/brief-detect` | Manually invoke brief-detection gate |
| `/cleanup` | Session & worktree pruning — removes stale branches and worktrees |
| `/sweep-stale-todos` | Find and close todos that are no longer relevant |
| `/docs-refresh` | On-demand documentation refresh — updates breadcrumbs and project docs |
| `/validate-agent-refs` | Health check — verifies all internal agent file links are valid |
