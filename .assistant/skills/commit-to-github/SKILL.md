# Commit to GitHub — foodVibe 1.0

Evaluates working-tree changes, decides how to split branches and commits, presents the plan as a **visual tree** for approval, then creates branches and commits safely and returns to the default branch.

**Safety rule**: No `git add`, `git commit`, `git push`, or branch creation until the user has explicitly approved the visual tree in chat. Do not create a file in `plans/` for this workflow — the plan is the tree in the conversation.

---

## Phase 0 — Tech debt check (before building commit plan)

Before Phase 1 (Evaluate):

- **If a tech-debt report was already produced in this conversation** (e.g. from workflow step 5.5 or because the user asked for a tech-debt run): **Do not run the techdebt skill again.** Use that existing report. If it listed critical or high-priority items, ask: **"Fix these first, or proceed with the commit plan anyway?"** If the report includes a **Spec coverage** section (files needing `.spec.ts` added or updated), add or update those specs so `npm test -- --no-watch --browsers=ChromeHeadless` passes; if the list is long, list the files and ask: **"Add/update specs for these before building the commit plan?"** then do them if the user agrees. Then continue to Phase 1.
- **If no tech-debt report exists in this session**: Read `.assistant/skills/techdebt/SKILL.md` and run a quick tech-debt pass. If critical or high-priority items exist, list them briefly and ask: **"Fix these first, or proceed with the commit plan anyway?"** If the report includes a **Spec coverage** section, add or update those specs (or list and ask: **"Add/update specs for these before building the commit plan?"**). Do not block the commit tree indefinitely — the user may choose to proceed. Then continue to Phase 1.

---

## When to Use

- User says "commit to GitHub", "push my changes", "save to branches", or similar
- User wants working changes organized into branches and commits with a reviewable plan first

---

## Phase 1 — Evaluate (read-only)

Per the safety rule above. Gather the full picture: run `git status` and `git diff --stat` (and `git diff` or `git diff --name-only` if needed). Detect default branch: `git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null || echo "main"`. Do not run `git add`, `git commit`, `git checkout -b`, or `git stash` in this phase.

---

## Phase 2 — Decide & Build Plan

1. **One branch vs several**: One branch if all changes are one logical unit. Multiple branches when changes belong to different concerns so each can be reviewed/merged/reverted independently.
2. **One vs several commits per branch**: Prefer multiple commits when it makes revert or refactor easier. One commit when changes are small and inseparable.
3. **Practical rule**: Split so that reverting one commit is straightforward; avoid one giant commit when logical steps are clear.
4. **Branch names**: `feat/<short-name>` or `fix/<short-name>`.
5. **Output**: For each branch — branch name. For each commit — list of file paths and a short commit message (`type(scope): message`).

---

## Phase 3 — Present Plan & Await Approval

Output the plan **only** in this visual format. No `plans/` file.

**Required format:**

```
[Current: main]
 └── 🌿 Branch: feat/example-branch
      ├── 📦 Commit 1: type(scope): short message
      │    📄 path/to/file1.js
      │    📄 path/to/file2.js
      └── 📦 Commit 2: type(scope): short message
           📄 path/to/file3.js
```

- Use `[Current: main]` (or actual default branch) at the top.
- For multiple branches, add another `└── 🌿 Branch: …` under `[Current: main]`.
- Under each branch: `├──` or `└──` for commits, `📦 Commit N: message`, then `📄 path` for files.

After the tree, ask: **"Approve to proceed, or deny to cancel. No git writes until you approve."**

If the user **denies**: state that no git operations were performed and stop. If they **approve**: proceed to Phase 4.

---

## Phase 4 — Execute (only after approval)

Never erase or discard user changes: no `git reset --hard`, `git clean -fd`, or force-push unless the user explicitly asks. Use stash to preserve work when switching context.

1. **Preserve work**
   If the plan has multiple branches or commits and there are uncommitted changes, stash first:
   ```bash
   git stash push -u -m "commit-skill-work"
   ```

2. **Per branch**
   - Checkout default branch (e.g. `git checkout main`).
   - Create branch: `git checkout -b <branch-name>`.
   - For each commit: restore only the files for that commit (from stash or working tree), then:
     ```bash
     git add <path1> <path2> ...
     git commit -m "type(scope): message"
     ```
   - If stashed: after committing all commits on this branch, stash remaining changes before switching. Ensure every planned change is committed and nothing is dropped.

3. **Between branches**
   Checkout default, create the next branch from default, repeat. Use stash so uncommitted planned changes are never lost.

4. **Return to default**
   ```bash
   git checkout main
   ```

5. **Update todo**
   Open `.assistant/todo.md`. Using committed branch names, messages, and file paths, mark matching tasks as done (`[x]`). Do not change unrelated tasks.

---

## End State

After Execute: all planned changes are committed on the intended branches, current branch is the default, no planned changes left uncommitted, and `.assistant/todo.md` updated for matching tasks.

---

## Related

See **GitHub Sync** (`github-sync/`) and **Test-PR-Merge** (`.assistant/commands/`) for pull/PR flows.
