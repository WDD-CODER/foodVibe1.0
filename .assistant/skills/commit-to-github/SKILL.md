# Commit to GitHub — foodVibe 1.0

Evaluates working-tree changes, decides how to split branches and commits, presents the plan as a **visual tree** in chat for approval, then creates branches and commits safely and returns to the default branch (main). Use when the user asks to commit to GitHub, push changes, or save work to branches.

**Important**: Do **not** create a file in `plans/` for this workflow. The plan is the visual tree in the conversation; the user approves or denies it there.

---

## When to Use

- User says "commit to GitHub", "push my changes", "save to branches", or similar
- User wants working changes organized into branches and commits with a clear, reviewable plan first

---

## Phase 1 — Evaluate (read-only)

Before any git writes, gather the full picture:

```bash
git status
git status -sb
git diff --stat
```

If needed for context: `git diff` (or `git diff --name-only`). Detect default branch, e.g.:

```bash
git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null || echo "main"
```

**Do not run** `git add`, `git commit`, `git checkout -b`, or `git stash` in this phase.

---

## Phase 2 — Decide Split

- **One branch vs several**: Use one branch if all changes are one logical unit (e.g. one feature or one fix). Use multiple branches when changes clearly belong to different concerns (e.g. feature A vs feature B, or feature vs unrelated fix) so each can be reviewed/merged/reverted independently.
- **One vs several commits per branch**: Prefer multiple commits when it makes later revert or refactor easier (e.g. "add model" then "wire UI" then "add tests"). Use one commit when changes are small and inseparable.
- **Practical rule**: Split so that "going back to refactor" or reverting one commit is straightforward; avoid one giant commit when logical steps are clear.
- **Branch names**: Use `feat/<short-name>` or `fix/<short-name>` (project uses `main` and `feat/<name>`).

---

## Phase 3 — Build the Plan

For each branch: branch name. For each commit on that branch: list of file paths and a short commit message (e.g. `type(scope): message`). This structure is what you will turn into the visual tree in Phase 4.

---

## Phase 4 — Present Plan as Visual Tree

Output the plan **only** in this visual format. This is what the user approves or denies. No `plans/` file.

**Required format:**

```
[Current: main]
 └── 🌿 Branch: feat/example-branch
      ├── 📦 Commit 1: type(scope): short message
      │    📄 path/to/file1.js
      │    📄 path/to/file2.js
      ├── 📦 Commit 2: type(scope): short message
      │    📄 path/to/file3.js
      └── 📦 Commit 3: type(scope): short message
           📄 path/to/file4.js
```

- Use `[Current: main]` (or the actual default branch, e.g. `master`) at the top.
- For multiple branches, add another `└── 🌿 Branch: …` under `[Current: main]`.
- Under each branch: `├──` or `└──` for commits, `📦 Commit N: message`, then `│` and `📄 path` for files.

**Example with one branch and four commits:**

```
[Current: main]
 └── 🌿 Branch: feat/autocomplete-id-refactor
      ├── 📦 Commit 1: refactor(material): include mongodb ids in autocomplete results
      │    📄 api/material/material.service.js
      ├── 📦 Commit 2: feat(api): update interaction routing and http tests
      │    📄 api/external-api/external-api.routes.js
      │    📄 api/external-api/external-api.http
      ├── 📦 Commit 3: refactor(api): cleanup controllers and remove unused regex/logs
      │    📄 api/external-api/external-api.controller.js
      │    📄 api/external-api/external-api.service.js
      │    📄 api/external-api/optimizer_parser.js
      └── 📦 Commit 4: style(lint): consistent spacing and formatting in controllers
           📄 api/interaction/interaction.controller.js
```

After the tree, ask: **"Approve to proceed with these branches and commits, or deny to cancel. No git writes until you approve."**

---

## Phase 5 — Confirm

- User approves or denies **this visual plan** in the conversation.
- If the user **denies**: State that no commits, branches, or stash operations were performed. Stop.
- If the user **approves**: Proceed to Phase 6. Do not run any git write commands until the user has explicitly approved.

---

## Phase 6 — Execute (only after approval)

**Safety**: Never erase or discard user changes. No `git reset --hard`, `git clean -fd`, or force-push unless the user explicitly asks. Use stash to preserve work when switching context.

1. **Preserve work**  
   If the plan has multiple branches or multiple commits and there are uncommitted changes, stash first:
   ```bash
   git stash push -u -m "commit-skill-work"
   ```

2. **Per branch**  
   - Checkout default branch (e.g. `git checkout main`).
   - Create branch: `git checkout -b <branch-name>`.
   - For each commit in the plan: restore only the files for that commit (from stash or working tree), then:
     ```bash
     git add <path1> <path2> ...
     git commit -m "type(scope): message"
     ```
   - If you stashed: after committing all commits on this branch, you may need to stash again the remaining changes before switching (or pop once and partition by file for the next branch). Ensure every planned change is committed and nothing is dropped.

3. **Between branches**  
   After all commits on the current branch are done, checkout default, create the next branch from default, and repeat. Use stash so uncommitted planned changes are never lost.

4. **Return to default**  
   When all planned branches and commits are done:
   ```bash
   git checkout main
   ```
   Optionally `git pull --ff-only origin main` if the user typically pulls after committing.

5. **Update todo**  
   After all branches and commits are done, open `.assistant/todo.md`. Using the committed branch names, commit messages (type/scope), and file paths, identify tasks in the "Active Tasks" (or other relevant sections) that correspond to this work. Mark those tasks as done (`[x]`) and move or keep them under the appropriate plan or "Done" section. Do not remove or change unrelated tasks.

---

## End State

- All planned changes are committed on the intended branches.
- Current branch is the default (e.g. `main`).
- No uncommitted changes that were part of the plan are left behind (unless the user asked to leave something uncommitted).
- `.assistant/todo.md` is updated: tasks that match the committed work (by branch, commit message, or files) are marked done (`[x]`) in the appropriate section.

---

## Related

- **GitHub Sync** (`github-sync/`) — Pull recent GitHub activity before or after committing
- **Test-PR-Merge** (`.assistant/commands/`) — After committing, run tests and open PR to main
