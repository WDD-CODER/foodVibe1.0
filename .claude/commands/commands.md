---
description: List all registered slash commands, categories, and file paths
allowed-tools: Read, Glob, Bash
---

# /commands — List Available Commands

Show all registered slash commands with short descriptions and file locations.

## Execution

1. Enumerate `.claude/commands/*.md` (exclude `_index.md`).
2. For each file, read frontmatter `description:` if present; else use the first `#` heading (strip the `/name —` prefix when present).
3. Category tags (from `_index.md` sections):
   - `FLOW` — multi-step pipeline
   - `UTIL` — single-purpose utility / discovery
4. Scope tags (post three-agent cutover):
   - `[SHARED]` — usable by Cursor (Contractor) and Claude Code (Reviewer)
   - `[CC]` — primarily Claude Code Reviewer path
5. Print a markdown table. Do **not** invent commands that are not on disk.
6. **Count check (mandatory):** if the number of `.md` files (excluding `_index.md`) ≠
   table rows, rebuild the table from disk before printing.
7. Do **not** list retired commands from the `_index.md` Retired section unless the `.md` file still exists on disk (then mark `LEGACY`).

## Current registry (refresh from disk if stale)

| Command | What it does | File | Category | Scope |
| --- | --- | --- | --- | --- |
| `/adversarial-template` | Generate adversarial test cases to stress-test a fix template | `.claude/commands/adversarial-template.md` | FLOW | SHARED |
| `/auto-solve` | Autonomous plan executor (legacy; prefer milestone-by-milestone Contractor) | `.claude/commands/auto-solve.md` | UTIL | SHARED |
| `/brief` | Capture or generate a session brief | `.claude/commands/brief.md` | FLOW | SHARED |
| `/brief-detect` | Manually invoke brief-detection gate | `.claude/commands/brief-detect.md` | UTIL | CC |
| `/cleanup` | Session & worktree pruning | `.claude/commands/cleanup.md` | UTIL | SHARED |
| `/commands` | List all registered slash commands, categories, and paths | `.claude/commands/commands.md` | UTIL | SHARED |
| `/context-override` | Override session context defaults / disable context warnings temporarily | `.claude/commands/context-override.md` | UTIL | SHARED |
| `/docs-refresh` | On-demand documentation refresh (breadcrumbs + project docs) | `.claude/commands/docs-refresh.md` | UTIL | SHARED |
| `/evaluate-me` | Agent session retrospective — grades the session | `.claude/commands/evaluate-me.md` | FLOW | SHARED |
| `/feat` | New-feature path — rules, `/plan`, Contractor + `/review-it` | `.claude/commands/feat.md` | FLOW | SHARED |
| `/fix` | Bug fix path — matching rules + elegant-fix | `.claude/commands/fix.md` | FLOW | SHARED |
| `/mobile-flow-audit` | Walk mobile flows at 375×812 RTL; report layout breakage | `.claude/commands/mobile-flow-audit.md` | FLOW | SHARED |
| `/plan` | Planning / Plan Contract path | `.claude/commands/plan.md` | FLOW | SHARED |
| `/refactor` | Refactor path — angular/domain rules, cssLayer, techdebt | `.claude/commands/refactor.md` | FLOW | SHARED |
| `/render-flow-audit` | Walk live Render deployment for functional bugs | `.claude/commands/render-flow-audit.md` | FLOW | SHARED |
| `/review-it` | Reviewer pass — plan-match, conventions, Verify; report-only by default | `.claude/commands/review-it.md` | FLOW | CC |
| `/security` | Security path — security rules + security-officer | `.claude/commands/security.md` | FLOW | SHARED |
| `/ship` | Session end — build gate, chat-scoped commit (`--yes` skips wait) | `.claude/commands/ship.md` | FLOW | SHARED |
| `/skills` | List all registered skills, triggers, and scope | `.claude/commands/skills.md` | UTIL | SHARED |
| `/sweep-stale-todos` | Find and close todos that are no longer relevant | `.claude/commands/sweep-stale-todos.md` | UTIL | SHARED |
| `/test-pr-review-merge` | Full Test → PR → Review → Merge (trunk merge) pipeline | `.claude/commands/test-pr-review-merge.md` | FLOW | SHARED |
| `/test-template` | Score a fix template against its fixture corpus | `.claude/commands/test-template.md` | FLOW | SHARED |

## Notes

- Quick reference twin: `.claude/commands/_index.md` (human-oriented index).
- Skills are separate — use `/skills` for `.claude/skills/*/SKILL.md`.
- Retired (do not invoke; files removed in cutover): `/plan-implementation`, `/execute-it`, `/validate-agent-refs`, `/nightly-audit`, `/audit-report`, `/reflect`, `/reflect-list`, `/reflect-add-tests`.
