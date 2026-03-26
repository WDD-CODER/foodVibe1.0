---
name: commit-to-github
description: Orchestrates the full git commit → push → PR → merge pipeline with context-aware routing between main-repo and worktree modes. Uses gh CLI only — no MCP required.
---

# Skill: commit-to-github

**Trigger:** User says "commit", "push", "commit to github", or invokes `/commit-to-github`.

**Model Guidance:** Use Haiku/Flash for all phases. Use Sonnet for Phase 2 only when generating a PR body for a major `sf` feature.

**Git Rules (inline — no guide read required):**
- Conventional Commits types: `feat` | `fix` | `docs` | `style` | `refactor` | `test` | `chore`
- Branch naming: `feat/<n>` — never commit directly to `main`
- No `&&` or `||` chaining between git commands (Windows/PowerShell) — separate Bash calls only
- Never force push (`--force`)
- Q&A format for any user decision: numbered options, one question at a time
- All GitHub operations use `gh` CLI — never use MCP tools for writes

---

## Argument Shortcuts

| Arg | Action |
|-----|--------|
| `c` | Checkpoint — commit only on main; push on worktree |
| `s` | Ship auto-detect — full PR flow, light or full |
| `sl` | Force Ship-Light — direct push (docs/config/skills only) |
| `sf` | Force Ship-Full — PR + review loop (TS/SCSS/Angular changes) |

---

## Phase 0: Verification

**Status Check:**
```bash
git status
```
If nothing to commit → stop and report clean tree.

**Spec Audit:** If any `.ts` or Angular files changed AND this is NOT a `c` commit:
- Invoke QA Engineer to verify `.spec.ts` coverage
- QA PASS → continue
- QA FAIL → ask: `"1. Fix specs now  2. Proceed anyway  3. Cancel"`
- Skip entirely for `c`, `sl`, or docs/config-only changes

**Auth Check:**
```bash
gh auth status
```
If not authenticated → stop and report. Do not proceed.

**Lint/Build:** Run targeted build check to prevent "Broken Window" commits.

---

## Phase 1: Interactive Staging

**Context Detection:**
```bash
git rev-parse --git-dir
```
- Returns `.git` → main-repo mode
- Returns `.git/worktrees/*` → worktree mode

**List Open PRs (if shipping):**
```bash
gh pr list --state open
```
Surface any existing PR for this branch before creating a new one.

**Visual Tree:** Present all changed files grouped by type using this exact shape:

```
[Proposed: chore/update-commit-skill]
 └── 📦 Commit: chore(skills): <auto-summary>
      📄 path/to/file1
      📄 path/to/file2
```

Replace `[Proposed: …]` with current branch name (or proposed branch if creating one).
Replace `<auto-summary>` with the Phase 2 Conventional Commit subject line.
List every path to be included; nest folders if it helps readability.

Ask: **"Approve? Y to commit · N to cancel"**

> **Hard Gate: No git writes (`git add`, `git commit`, `git push`) until the user explicitly approves the visual tree.**

**Partial Staging:** If user wants to exclude files, ask: `"Which files to exclude? List numbers or 'all'."` — re-present updated tree for final approval.

---

## Phase 2: Metadata Generation

**Commit Message:** Conventional Commits format — `type(scope): subject` (imperative, max 72 chars).

**PR Body (if shipping `sf`):** Concise summary with verification steps.

> Use Sonnet only for `sf` PR bodies. All other modes stay in Haiku/Flash.

---

## Phase 3: Atomic Write

Execute only after user approves visual tree (Phase 1) and metadata (Phase 2).

**Commit:**
```bash
git add <files>
git commit -m "type(scope): subject"
```
Separate Bash calls — never chained.

**Push:**
```bash
git push -u origin HEAD
```

**Create PR (sf mode only):**
```bash
gh pr create --base main --head <branch> --title "<commit subject>" --body "<pr body>"
```

**Check PR status:**
```bash
gh pr checks <pr-number>
```

**Review PR diff:**
```bash
gh pr diff <pr-number>
```

**Merge PR (after checks pass):**
```bash
gh pr merge <pr-number> --merge --auto --delete-branch
```

**Todo Update:** Set completed sub-tasks to `[x]` in `.claude/todo.md`.

---

## Completion Gate

Output: `"Committed: [message]. [Pushed to branch / PR #N created / Merged to main]."` Update `.claude/todo.md`.

---

## Troubleshooting

- **Push fails (auth/remote):** Report exact error. Run `gh auth status` and `git remote -v`.
- **PR already exists:** `gh pr list` will surface it — update instead of creating new.
- **Windows / PowerShell:** No `&&` / `||` — separate Bash calls or `;`.
- **Nothing to commit:** Report clean tree, do not proceed.

---

## Related

- `worktree-session-end` — for session-end words ("done", "ship it", "wrap up"). Handles dev server kill, port cleanup, session-handoff.
- `github-sync` — pull recent GitHub activity at session start.
- `test-pr-review-merge` — full CI pipeline with test suite before merge.