---
name: standards-git
description: Git workflow, branching rules, permission syntax, and GitHub MCP pattern. Load on demand — do not pre-load at session start.
---

# Git & GitHub Standards

> Load this file when: committing, pushing, creating PRs, deploying, or working with GitHub MCP tools.

---

## Git & Workflow

* **Branching**: `main` protected. If on `main`, run `git checkout -b feat/<n>`. No new features with uncommitted dirty changes.
* **Permission rules** (`settings.local.json` / `settings.json`): Prefix-wildcard syntax: `"Bash(command:*)"` — `:*` must be the last characters, nothing after. Exact-match syntax: `"Bash(exact command)"`. **Never** include instruction text, comments, or descriptions inside the rule string — the validator rejects the entire file if any entry is malformed.

---

## GitHub MCP — Hybrid Read/Write Pattern

**Rule**: MCP = read. Skills = write. Never use MCP tools to push, merge, or create PRs.

| Operation | Tool |
|-----------|------|
| Read PR body, diff, reviews | `mcp__github__*` (primary) → `gh pr view` (fallback) |
| Read issues, labels, milestones | `mcp__github__*` (primary) → `gh issue list` (fallback) |
| Read CI/check status | `mcp__github__*` (primary) → `gh pr checks` (fallback) |
| Commit, push, create PR, merge | `commit-to-github` or `test-pr-review-merge` skill only |

**Autonomous PR reading**: Agent may read any PR without asking. Reading PR content to understand context or plan work is a fully autonomous action — no user confirmation needed.

**MCP availability**: Both `.mcp.json` (Claude Code) and `.cursor/mcp.json` (Cursor) are configured with the GitHub MCP server using `${GITHUB_TOKEN}` from the Windows environment. If `mcp__github__*` tools are not available in a session, fall back to `gh` CLI silently — do not block the workflow.

**Key MCP tools**:
- `mcp__github__list_pull_requests` — list open/closed PRs
- `mcp__github__get_pull_request` — full PR body, status, labels
- `mcp__github__list_pull_request_reviews` — review status and decisions
- `mcp__github__list_pull_request_review_comments` — inline code comments
- `mcp__github__list_issues` — open/closed issues
