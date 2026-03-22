# Commit to GitHub — foodVibe 1.0

Evaluates working-tree changes, decides how to split branches and commits, presents the plan as a **visual tree** for approval, then creates branches and commits safely and returns to the default branch.

**Safety rule**: No `git add`, `git commit`, `git push`, or branch creation until the user has explicitly approved the visual tree in chat. Do not create a file in `plans/` for this workflow — the plan is the tree in the conversation.

**Phase 0 must be completed before Phase 1.** Do not run Phase 1 (Evaluate) until Phase 0 is done.

---

## Output Format Rules (apply throughout this skill)

- **Suppress preamble**: Do not narrate what files you are reading, do not summarize the session handoff, do not mention github-sync status. Go straight to Phase 0.
- **Phases 0 + 0.5**: Report as a **single combined one-liner** after both are resolved. Format:
  - `Phase 0–0.5: ⚡ No app TS — debt skipped. No open PR.`
  - `Phase 0–0.5: ⚠ N high debt items (listed below). No open PR.`
  - `Phase 0–0.5: ⚡ No app TS — debt skipped. Open PR #N found — review comments surfaced below.`
- **Phase 1–2**: Output **only** the file table (path + state + diff stat). Get line counts from `git diff --stat`. No prose summary, no narration. Example:
  ```
  Phase 1–2
  Path                                        State
  .claude/skills/commit-to-github/SKILL.md   modified (+26/-6 lines)
  .claude/skills/techdebt/SKILL.md           modified (+1 line)
  notes/commit-process-audit.md              untracked
  ```
- **Phase 3**: Output the visual tree first, then the approval prompt after it. Never put the approval prompt before the tree.

---

## Phase 0 — Tech debt check and targeted test gate (before building commit plan)

Before Phase 1 (Evaluate):

**Step 1 — Tech debt (working-tree scope only)**

**Fast path (skip tech-debt for non-app commits):**
Run `git diff --name-only HEAD` and collect untracked files from `git status`. If **zero** files match `src/app/**/*.ts`, emit:
> ⚡ Fast path: no app TypeScript changed — skipping tech-debt scan.

Then skip the rest of Step 1 and go directly to Step 2.

**Full path (app TypeScript present):**
- If no tech-debt report exists in this session → read `.claude/skills/techdebt/SKILL.md` and run the analysis for files to be committed only.
- If a report already exists this session → use it, do not re-run.
- If the report lists critical/high items → ask: "Fix these first, or proceed anyway?"
- If the report has a **Spec coverage** section → add or update those specs, or list and ask the user.

**Step 2 — Targeted specs only (not the full suite)**

Run specs only for the files being committed:
```bash
# Get changed .ts files (exclude spec files themselves)
CHANGED=$(git diff --name-only HEAD | grep '\.ts$' | grep -v '\.spec\.ts$')

# For each changed file, check if a matching spec exists and collect them
SPECS=""
for f in $CHANGED; do
  spec="${f%.ts}.spec.ts"
  [ -f "$spec" ] && SPECS="$SPECS $spec"
done

# Run only those specs (skip if none found)
if [ -n "$SPECS" ]; then
  npx ng test --include="$SPECS" --no-watch --browsers=ChromeHeadless
fi
```

- If matching specs exist and pass → proceed to Phase 0.5.
- If matching specs exist and fail → report the failure and ask: "Fix before building the commit plan, or proceed anyway?"
- If no matching specs exist → note "No specs for changed files" and proceed.
- **Do not run the full test suite here.** Full suite runs at session-handoff (end of day) and in `test-pr-review-merge` before merge.

---

## When to Use

- User says "commit to GitHub", "push my changes", "save to branches", or similar
- User wants working changes organized into branches and commits with a reviewable plan first

---

## Phase 0.5 — PR Context Check (conditional)

After Phase 0 passes, before building the commit plan:

1. Detect current branch: `git branch --show-current`
2. Check if an open PR exists for this branch:
   - MCP: `mcp__github__list_pull_requests` filtered to current branch
   - Fallback: `gh pr list --head <branch> --state open`
3. **If no open PR**: skip this phase entirely — no further calls. Proceed to Phase 1.
4. **If open PR found**:
   - Read its body and review comments: `mcp__github__get_pull_request` + `mcp__github__list_pull_request_review_comments`
   - Surface any pending review requests or "changes requested" to the user before committing
   - Include the PR number in the commit plan summary

> If MCP unavailable, fall back to `gh pr list --head <branch> --state open` silently.

---

## Phase 1 — Evaluate (read-only)

Per the safety rule above. Gather the full picture: run `git status` and `git diff --stat` (and `git diff` or `git diff --name-only` if needed). Detect default branch: `git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null || echo "main"`. Do not run `git add`, `git commit`, `git checkout -b`, or `git stash` in this phase. Note modified/untracked `plans/*.plan.md`.

---

## Phase 2 — Decide & Build Plan

1. **One branch vs several**: One branch if all changes are one logical unit. Multiple branches when changes belong to different concerns so each can be reviewed/merged/reverted independently.
2. **One vs several commits per branch**: Prefer multiple commits when it makes revert or refactor easier. One commit when changes are small and inseparable.
3. **Practical rule**: Split so that reverting one commit is straightforward; avoid one giant commit when logical steps are clear.
4. **Branch names**: `feat/<short-name>` or `fix/<short-name>`.
5. **Output**: For each branch — branch name. For each commit — list of file paths and a short commit message (`type(scope): message`).
6. **Plans:** Include related `plans/` file in the commit when scope matches.

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

**Security check for `settings.local.json`:** If `settings.local.json` appears in the commit tree, read only its `permissions` and `env` keys. If no API keys or secret-looking values are found, add a note to the tree output: `✓ settings.local.json: no secrets detected`. Only escalate to a separate Ask turn if an actual secret is found.

After the tree, ask:

**"Approve to proceed, or deny to cancel. No git writes until you approve.**
*Tip: reply "approve + merge" or just "A" to approve and merge to main in one step. Use "approve + push" or "P" to approve and push without merging.*

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
   Open `.claude/todo.md`. Using committed branch names, messages, and file paths, mark matching tasks as done (`[x]`). Do not change unrelated tasks.

6. **Archive completed plan sections**
   Scan `.claude/todo.md` for plan sections where ALL items are `[x]`, then apply all four safety gates before archiving:

   **Rule 1 — All-items-checked gate** (required)
   Only consider a section if every `[ ]` in it has been changed to `[x]`. Sections with any open items are skipped.

   **Rule 2 — No-deferred gate** (new)
   Do not archive if any item in the section contains `(deferred)`, `(skipped)`, `[~]`, or `<!-- TODO -->`. These signal intentional incompleteness. Keep the section and note reason: "contains deferred items."

   **Rule 3 — Git verification gate** (new)
   Before archiving, run:
   ```bash
   git log --oneline | grep -i "<plan-keyword>"
   gh pr list --state merged --search "<plan-keyword>"
   ```
   If neither returns results, surface a warning: "No commits or merged PRs found for Plan NNN — skip archive or confirm manually?" Do not archive without at least one result or explicit user confirmation.

   **Rule 4 — User confirmation for large plans** (new)
   If the section has 5 or more items, require explicit confirmation before archiving: "Archive Plan NNN (N items) to todo-archive.md?" Proceed only on approval.

   Once all gates pass, move the section (heading + items) to `todo-archive.md` (create if needed), appended with today's date and plan number. Note: "Archived Plan NNN to todo-archive.md."

7. **Breadcrumb check**
   If any committed files added, removed, or renamed components/services/pages, list the affected directories and ask: "Run breadcrumb-navigator for [dirs]?" If the user agrees, read `.claude/skills/breadcrumb-navigator/SKILL.md` and follow it for those hubs. Do not block the commit flow.

---

## End State

After Execute: all planned changes are committed on the intended branches, current branch is the default, no planned changes left uncommitted, and `.claude/todo.md` updated for matching tasks.

---

## Tab Orders

When changing the recipe-builder or menu-intelligence page, see `.claude/references/tab-orders.md` for canonical keyboard navigation order.

---

## Recovery

If something goes wrong during execution:

- **Stash fails** (untracked files): use `git stash push -u` with the `-u` flag; if still failing, `git add` untracked files first.
- **Targeted specs fail in Phase 0**: report the specific failure and which spec file failed, ask the user: "Fix before building the commit plan, or proceed anyway?" Never silently skip.
- **Branch already exists**: ask the user to rename or append `-v2`. Do not force-delete existing branches.
- **Push fails** (auth/remote): report the exact error message. Suggest `gh auth status` for auth issues or `git remote -v` for remote issues.
- **Merge conflict during stash pop**: report the conflicting files. Do not resolve automatically — list them and ask.
- **Windows / PowerShell**: Do not use `&&` or `||` to chain git commands — PowerShell does not support bash `&&`/`||` syntax and will throw "unexpected token" errors. Run each git command in a separate shell call, or use `;` to chain (runs regardless of exit code). Use `Set-Location` instead of `cd` in scripts. Example: instead of `git checkout main && git merge feat/x`, run them as two separate Bash calls.

---

## Related

See **GitHub Sync** (`github-sync/`) and **Test-PR-Merge** (`.claude/commands/`) for pull/PR flows.
