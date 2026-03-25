---
name: commit-to-github
description: Orchestrates the full git commit → push → PR → merge pipeline for foodVibe 1.0 with context-aware routing between main-repo and worktree modes.
---

**Model Guidance:** Use Haiku/Flash for all phases. Use Sonnet for Phase 2 only when generating a PR body for a major `sf` feature.

# Skill: commit-to-github

**Trigger:** User says "commit", "push", "commit to github", or invokes `/commit-to-github`.

**Git Rules (inline — no guide read required):**
- Conventional Commits types: `feat` | `fix` | `docs` | `style` | `refactor` | `test` | `chore`
- Branch naming: `feat/<name>` — never commit directly to `main`
- No `&&` or `||` chaining between git commands (Windows/PowerShell) — separate Bash calls only
- Never force push (`--force`)
- Q&A format for any user decision: numbered options, one question at a time

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

**Status Check:** Run `git status`. If nothing to commit → stop and report clean tree.

**Spec Audit:** If any `.ts` or Angular files changed AND this is NOT a `c` (checkpoint) commit → invoke QA Engineer to verify `.spec.ts` coverage.
- QA PASS → continue
- QA FAIL → ask: `"1. Fix specs now  2. Proceed anyway  3. Cancel"`
- Skip spec audit entirely for `c`, `sl`, or docs/config-only changes

**Lint/Build:** Run targeted build check to prevent "Broken Window" commits.

---

## Phase 1: Interactive Staging 

**Context Detection:** Auto-detect via `git rev-parse --git-dir`:
- Returns `.git` → main-repo mode
- Returns `.git/worktrees/*` → worktree mode

**Visual Tree:** Present all changed files grouped by type using this exact shape:

```
[Proposed: chore/update-commit-skill]
 └── 📦 Commit: chore(skills): <auto-summary>
      📄 path/to/file1
      📄 path/to/file2
```

Replace `[Proposed: …]` with the current branch name (or proposed branch if creating one).
Replace `<auto-summary>` with the Phase 2 Conventional Commit subject line.
List every path to be included; nest folders if it helps readability.

Ask: **"Approve? Y to commit · N to cancel"**

> **Hard Gate: No git writes (`git add`, `git commit`, `git push`) until the user explicitly approves the visual tree.**

**Partial Staging:** If user wants to exclude files, ask: `"Which files should I exclude? List numbers or 'all'."` — then re-present the updated tree for final approval.

---

## Phase 2: Metadata Generation 

**Commit Message:** Conventional Commits format — `type(scope): subject` (imperative, max 72 chars).

**PR Body (if shipping):** Concise summary with linked issues and verification steps.

> Use High Reasoning only for `sf` (Ship-Full) PR bodies. For `c` and `sl`, stay in Flash — the commit message is sufficient.

---

## Phase 3: Atomic Write 

Execute only after user approves visual tree (Phase 1) and metadata (Phase 2).

**Commit:** `git add <files>` → `git commit -m "..."` — separate Bash calls, never chained.

**Push / PR:** `git push` or `gh pr create` — only after explicit approval.

**Todo Update:** Set completed sub-tasks to `[x]` in `.claude/todo.md`.

---

## Completion Gate

Output: `"Committed: [message]. [Pushed to branch / PR #N created / Merged to main]."` Update `.claude/todo.md`.

---

## Troubleshooting

- **Push fails (auth/remote):** Report exact error. Suggest `gh auth status` or `git remote -v`.
- **Windows / PowerShell:** No `&&` / `||` between git commands — separate Bash calls or `;`.
- **Nothing to commit:** Report clean tree, do not proceed.

---

## Cursor Tip
> Use Composer 2.0 (Fast/Flash) for routine checkpoints — the entire skill can run in Flash for `c` and `sl` commits.
> Switch to Gemini 1.5 Pro **only** for Phase 2 when generating a PR body for a major `sf` feature.
> Credit-saver: ~75% of this skill's execution is procedural (Phases 0, 1, 3).

---

## Related

- `worktree-session-end` — triggered by session-end words ("done", "ship it", "wrap up"). Handles dev server kill, port cleanup, and session-handoff. NOT the same as [S/Worktree] — this skill handles explicit `/commit-to-github` invocations only.
- `github-sync` — pull recent GitHub activity at session start.
- `test-pr-review-merge` — full CI pipeline with test suite before merge.