---
name: commit-to-github
description: Orchestrates the full git commit → push → PR → merge pipeline for foodVibe 1.0 with context-aware routing between main-repo and worktree modes.
---

# Skill: commit-to-github

**Trigger:** User says "commit", "push", "commit to github", or invokes `/commit-to-github`.
**Standard:** Follows Section 6 (Git & Workflow) of the Master Instructions.

---

## Argument Shortcuts

| Arg | Action |
|-----|--------|
| `c` | Checkpoint — commit only on main; push on worktree |
| `s` | Ship auto-detect — full PR flow, light or full |
| `sl` | Force Ship-Light — direct push (docs/config/skills only) |
| `sf` | Force Ship-Full — PR + review loop (TS/SCSS/Angular changes) |

---

## Phase 0: Verification `[Procedural — Haiku/Composer (Fast/Flash)]`

**Status Check:** Run `git status`. If nothing to commit → stop and report clean tree.

**Spec Audit:** If any `.ts` or Angular files changed, invoke the QA Engineer (Section 0.3) to verify `.spec.ts` coverage. On FAIL → ask: fix now or proceed anyway?

**Lint/Build:** Run targeted build check to prevent "Broken Window" commits.

---

## Phase 1: Interactive Staging `[Procedural — Haiku/Composer (Fast/Flash)]`

**Visual Tree:** Present a visual tree of all changed files grouped by type. Use this shape so the commit intent stays scannable in chat (branch + Conventional Commit line + files):

### Visual Tree

```
[Proposed: chore/update-commit-skill]
 └── 📦 Commit: chore(skills): <auto-summary>
      📄 path/to/file1
      📄 path/to/file2
```

Ask: **"Approve? Y to commit · N to cancel"**

Replace `[Proposed: …]` with the current branch name (or proposed branch if creating one). Replace `<auto-summary>` with the Phase 2 Conventional Commit subject line. List every path to be included; nest folders if it helps readability.

> **Hard Gate: No git writes (`git add`, `git commit`, `git push`) until the user explicitly approves the visual tree.**

**Selection:** Ask (Q&A format, Section 1.1) which changes to include if not already staged.

**Context Detection:** Auto-detect via `git rev-parse --git-dir`:
- Returns `.git` → main-repo mode
- Returns `.git/worktrees/*` → worktree mode

---

## Phase 2: Metadata Generation `[High Reasoning — Sonnet/Gemini 1.5 Pro]`

**Commit Message:** Conventional Commits format (`feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`).

**PR Body (if shipping):** Concise summary with linked issues and verification steps.

---

## Phase 3: Atomic Write `[Procedural — Haiku/Composer (Fast/Flash)]`

Execute only after user approves visual tree (Phase 1) and metadata (Phase 2).

**Commit:** `git commit -m "..."` — issue as a separate Bash call (no `&&` chaining).

**Push / PR:** `git push` or `gh pr create` — only after explicit approval.

**Todo Update:** Set completed sub-tasks to `[x]` in `.claude/todo.md`.

---

## Completion Gate

Output: `"Committed: [message]. [Pushed to branch / PR #N created / Merged to main]."` Update `.claude/todo.md`.

---

## Cursor Tip
> Use Composer 2.0 (Fast/Flash) for routine checkpoints — the entire skill can run in Flash for standard `c` commits.
> Switch to Gemini 1.5 Pro **only** for Phase 2 when generating a descriptive PR body for a major feature (`sf`).
> Credit-saver: ~75% of this skill's execution is procedural (Phases 0, 1, 3).

### Troubleshooting

- **Push fails (auth/remote)**: Report exact error. Suggest `gh auth status` or `git remote -v`.
- **Windows / PowerShell**: No `&&` / `||` between git commands. Separate Bash calls or `;`.

---

## Related

- `worktree-session-end` — triggered by session-end words ("done", "ship it", "wrap up"). Handles dev server kill, port cleanup, and session-handoff. NOT the same as [S/Worktree] — this skill handles explicit `/commit-to-github` invocations only.
- `github-sync` — pull recent GitHub activity at session start.
- `test-pr-review-merge` — full CI pipeline with test suite before merge.
