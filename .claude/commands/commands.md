---
description: List all registered slash commands, categories, and file paths
allowed-tools: Read, Glob, Bash
---

# /commands â€” List Available Commands

Show all registered slash commands with short descriptions and file locations.

## Execution (fast path â€” default)

1. **Do not** read every command file. **Do not** call MCP / memory tools.
2. Print the **Current registry** table below as-is.
3. Optional freshness (one cheap check only):
   - `Glob` `.claude/commands/*.md` (exclude `_index.md`) â€” **filenames only**.
   - Compare the filename set to the `File` column in the table.
   - If sets match â†’ done (print table; no further reads).
   - If sets differ â†’ run **Refresh path** once, then print the rebuilt table.
4. `/commands --refresh` (or user says "refresh") â†’ skip straight to **Refresh path**.
5. Do **not** invent commands that are not on disk.
6. Do **not** list retired commands from `_index.md` Retired unless the `.md` still exists (then mark `LEGACY`).

### Refresh path (only on mismatch or `--refresh`)

1. Enumerate `.claude/commands/*.md` (exclude `_index.md`).
2. For each file, read frontmatter `description:` if present; else first `#` heading (strip `/name â€”` prefix).
3. Category: `FLOW` = multi-step pipeline; `UTIL` = single-purpose / discovery (see `_index.md` sections).
4. Scope: `[SHARED]` = Cursor + Claude Code; `[CC]` = primarily Reviewer path.
5. Rebuild and print the table. Prefer also updating this file's embedded registry in the same change when adding/removing a command.

## Current registry

| Command | What it does | File | Category | Scope |
| --- | --- | --- | --- | --- |
| `/adversarial-template` | Generate adversarial test cases to stress-test a fix template | `.claude/commands/adversarial-template.md` | FLOW | SHARED |
| `/auto-solve` | Autonomous plan executor (legacy; prefer milestone-by-milestone Contractor) | `.claude/commands/auto-solve.md` | UTIL | SHARED |
| `/brief` | Capture or generate a session brief | `.claude/commands/brief.md` | FLOW | SHARED |
| `/brief-detect` | Manually invoke brief-detection gate | `.claude/commands/brief-detect.md` | UTIL | CC |
| `/cleanup` | Session & worktree pruning | `.claude/commands/cleanup.md` | UTIL | SHARED |
| `/commands` | List all registered slash commands, categories, and paths | `.claude/commands/commands.md` | UTIL | SHARED |
| `/docs-refresh` | On-demand documentation refresh (breadcrumbs + project docs) | `.claude/commands/docs-refresh.md` | UTIL | SHARED |
| `/done` | Validate a finished chat job — close-out ask, then mark matching todos `[x]` | `.claude/commands/done.md` | UTIL | SHARED |
| `/evaluate-me` | Agent session retrospective â€” grades the session | `.claude/commands/evaluate-me.md` | FLOW | SHARED |
| `/feat` | New-feature path â€” rules, `/plan`, Contractor + `/review-it` | `.claude/commands/feat.md` | FLOW | SHARED |
| `/fix` | Bug fix path â€” matching rules + elegant-fix | `.claude/commands/fix.md` | FLOW | SHARED |
| `/fix-pr-checks` | Bounded PR CI/security fix loop (2 rounds max) | `.claude/commands/fix-pr-checks.md` | FLOW | SHARED |
| `/mobile-flow-audit` | Walk mobile flows at 375Ã—812 RTL; report layout breakage | `.claude/commands/mobile-flow-audit.md` | FLOW | SHARED |
| `/plan` | Planning / Plan Contract path | `.claude/commands/plan.md` | FLOW | SHARED |
| `/refactor` | Refactor path â€” angular/domain rules, cssLayer, techdebt | `.claude/commands/refactor.md` | FLOW | SHARED |
| `/render-flow-audit` | Walk live Render deployment for functional bugs | `.claude/commands/render-flow-audit.md` | FLOW | SHARED |
| `/review-it` | Reviewer pass â€” plan-match, conventions, Verify; report-only by default | `.claude/commands/review-it.md` | FLOW | CC |
| `/security` | Security path â€” security rules + pre-commit security grep + CI | `.claude/commands/security.md` | FLOW | SHARED |
| `/ship` | Session end â€” build gate, chat-scoped commit (`--yes` skips wait) | `.claude/commands/ship.md` | FLOW | SHARED |
| `/review` | Judgment-only review (used by `/ship`) | `.claude/commands/review.md` | FLOW | SHARED |
| `/end-session` | Alias for `/ship` | `.claude/commands/end-session.md` | FLOW | SHARED |
| `/skills` | List all registered skills, triggers, and scope | `.claude/commands/skills.md` | UTIL | SHARED |
| `/sweep-stale-todos` | Find and close todos that are no longer relevant | `.claude/commands/sweep-stale-todos.md` | UTIL | SHARED |
| `/test-pr-review-merge` | Full Test â†’ PR â†’ Review â†’ Merge (trunk merge) pipeline | `.claude/commands/test-pr-review-merge.md` | FLOW | SHARED |
| `/test-template` | Score a fix template against its fixture corpus | `.claude/commands/test-template.md` | FLOW | SHARED |

## Notes

- Quick reference twin: `.claude/commands/_index.md` (human-oriented index).
- Skills are separate â€” use `/skills` for `.claude/skills/*/SKILL.md`.
- When adding/removing a command file, update this table (and `_index.md`) in the same change.
- Retired (do not invoke; files removed in cutover): `/plan-implementation`, `/execute-it`, `/validate-agent-refs`, `/nightly-audit`, `/audit-report`, `/reflect`, `/reflect-list`, `/reflect-add-tests`.
