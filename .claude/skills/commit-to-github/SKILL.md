# Commit to GitHub — foodVibe 1.0

Evaluates working-tree changes, decides how to split branches and commits, presents the plan as a **visual tree** for approval, then creates branches and commits safely and returns to the default branch.

**Safety rule**: No `git add`, `git commit`, `git push`, or branch creation until the user has explicitly approved the visual tree in chat. Do not create a file in `plans/` for this workflow — the plan is the tree in the conversation.

**Bash command rule**: Never combine git inspection commands into compound pipelines using `&&` or `|`. Always issue each command as a **separate Bash tool call**. Compound commands like `git diff ... && echo ... | grep ... | awk ...` will trigger a permission prompt even when individual commands are allowed. Use one Bash call per command.

---

## Fast-Lane Eligibility (runs before Phase 0)

Collect the working-tree snapshot using **four separate Bash calls** (Windows-safe — no `&&`):

1. `git status --short`
2. `git diff --name-only HEAD`
3. `git diff --numstat HEAD`
4. `git branch --show-current`

**Fast lane is active when ALL of the following are true:**
- Every changed/untracked file path matches the allowlist: `.claude/**`, `notes/**`, `plans/**`, `*.md` at repo root, `.cursor/**`
- Zero changed files match `src/app/**/*.ts`
- User did NOT request a multi-branch split

**If fast lane is active:** emit `⚡ Fast lane: all changes in allowlist paths — Phase 0 and Phase 0.5 skipped.` then jump directly to Phase 1. The snapshot data already collected is reused — no additional git calls needed.

**If fast lane is NOT active:** proceed through Phase 0 → Phase 0.5 → Phase 1 as normal.

---

**Phase 0 must be completed before Phase 1 (full path only).** Do not run Phase 1 (Evaluate) until Phase 0 is done.

---

## Output Format Rules (apply throughout this skill)

- **Batch all bash commands before any text output**: Run every inspection command needed for Phases 0, 0.5, 1, and 2 first — do not output any formatted text until ALL data gathering is complete. This keeps all tool-call noise at the top and produces one clean output block at the end.
- **Suppress preamble**: Do not narrate what files you are reading, do not summarize the session handoff, do not mention github-sync status. Go straight to Phase 0.
- **Single output block**: After all bash commands have run, emit this sequence once with no interruptions:
  1. `Phase 0–0.5:` one-liner
  2. blank line
  3. `Phase 1–2` file table
  4. blank line
  5. The visual tree + approval prompt
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

**Cursor users:** Default command scope is "this conversation only." Add `all` in the same message to include all working-tree changes and avoid an extra round-trip. Example: `/commit-github all`

---

## Phase 0.5 — PR Context Check (conditional)

**Fast-lane entrants skip this phase entirely** — PR presence was already resolved during eligibility snapshot. Do not issue a second `gh` call.

**When on `main`/`master` (full path):** also skip this phase — no PR can be open against the default branch in this workflow.

After Phase 0 passes (non-fast-lane, non-main branch), before building the commit plan:

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
7. **Draft the PR**: For each branch, draft the PR title and body now. Title: `type(scope): short description` (under 70 chars). Body: 2–4 bullet summary + test plan checklist. This draft is shown in Phase 3 and executed in Phase 4 — no separate approval.

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


      🔀 PR: "type(scope): short description"
           • bullet summary of change 1
           • bullet summary of change 2
           Test plan: [ ] item 1  [ ] item 2
```

- Use `[Current: main]` (or actual default branch) at the top.
- For multiple branches, add another `└── 🌿 Branch: …` under `[Current: main]`.
- Under each branch: `├──` or `└──` for commits, `📦 Commit N: message`, then `📄 path` for files.
- After the last commit on each branch, always show `🔀 PR:` with the drafted title and body inline. This PR will be created automatically on approve — no second prompt.

**Security check for `settings.local.json`:** If `settings.local.json` appears in the commit tree, read only its `permissions` and `env` keys. If no API keys or secret-looking values are found, add a note to the tree output: `✓ settings.local.json: no secrets detected`. Only escalate to a separate Ask turn if an actual secret is found.

After the tree, ask:

**"Approve to proceed, or deny to cancel. No git writes until you approve.**
*Approving executes all commits AND creates the PR(s) above — no further prompts. To tweak the PR text, say so before approving.*
*A = approve + merge · P = approve + push*

If the user **denies**: state that no git operations were performed and stop. If they **approve**: proceed to Phase 4.

---

## Phase 4 — Execute (only after approval)

Never erase or discard user changes: no `git reset --hard`, `git clean -fd`, or force-push unless the user explicitly asks. Use stash only when switching between multiple branches.

1. **Preserve work — always check for dirty tree first**
   Before touching any branch, run `git status --porcelain`. If there is ANY output (modified, untracked, or staged files not in the commit plan), stash immediately:
   ```bash
   git stash push -u -m "commit-skill-work"
   ```
   This applies even on single-branch plans — locally-modified files like `settings.local.json` that are not being committed must be stashed to allow `git checkout main` to succeed.

2. **Per branch**
   - Checkout default branch (e.g. `git checkout main`).
   - Create branch: `git checkout -b <branch-name>`.
   - For each commit: stage and commit in a single shell call (`;` is Windows-safe):
     ```bash
     git add <path1> <path2> ... ; git commit -m "type(scope): message"
     ```
   - If stashed: after committing all commits on this branch, stash remaining changes before switching. Ensure every planned change is committed and nothing is dropped.

3. **Between branches**
   Checkout default, create the next branch from default, repeat. Use stash so uncommitted planned changes are never lost.

4. **Return to default**
   Before checking out, verify the working tree is clean:
   ```bash
   git status --porcelain
   ```
   If dirty → stash with `-u` first, then checkout:
   ```bash
   git stash push -u -m "commit-skill-return"
   git checkout main
   git stash pop
   ```
   If `git stash pop` exits with a conflict: **stop immediately**. Do not silently resolve. Run `git status --short` and report every `UU` file to the user. Ask which version to keep. After the user confirms: run `git add <file>` for each resolved file, then run `git status --porcelain` again to verify zero `UU` lines before continuing. Never proceed past a stash pop conflict without an explicit clean status.

   Do NOT run `git pull` after checkout — the merge commit is already present locally (you just created it via `gh pr merge`). A pull here is a redundant network roundtrip.

   > **Speed tip — push vs merge:**
   > - `approve + push` (or "P"): commits, pushes branch, opens PR. Fastest — merge happens separately when ready.
   > - `approve + merge` (or "A"): commits, pushes, creates PR, merges to main in one flow. Costs ~5–15 s extra (second push + merge round-trip).
   > For fast-lane (config/docs-only) commits, `approve + push` is usually the right call.

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

7. **Create PR (automatic — no extra prompt)**
   After all commits on a branch are done and pushed, create the PR using the title and body drafted in Phase 2/3.

   **Windows-safe body file**: Use the **Write tool** to save the body to a Windows-native temp path, then pass it via `--body-file`:
   ```
   Write tool → C:/Users/<username>/AppData/Local/Temp/pr-body.md
   gh pr create --title "<drafted-title>" --body-file "C:/Users/<username>/AppData/Local/Temp/pr-body.md"
   ```
   Detect the username from `git config user.name` or the working directory path. Do NOT use `/tmp/pr-body.md` — that path does not exist on Windows and `gh` will fail silently.

   **Why `--body-file`**: passing `--body "..."` with markdown headings (lines starting with `#`) triggers Claude Code's built-in security check and forces a permission prompt. Writing to a file and using `--body-file` bypasses this entirely.

   **If `--body-file` fails** (file not found): fall back to `--body` with the markdown body inline. Strip any lines starting with `#` from the body to avoid the security prompt, or rewrite headings as bold text.

   Use the exact title and body shown in the Phase 3 tree. Do NOT ask for approval again — the user already approved the full plan including the PR. If the user amended the PR text before approving, use the amended version.

   **For approve + merge ("A")**: after `gh pr create`, merge synchronously and wait for confirmation:
   ```bash
   gh pr merge <pr-number> --merge
   gh pr view <pr-number> --json state
   ```
   The `state` field must equal `"MERGED"` before proceeding to Step 4 (return to default). Do NOT use `--auto` — it is asynchronous and returns before the merge completes, causing `git checkout main` to pull a pre-merge state.

8. **Breadcrumb check**
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
- **Merge conflict during stash pop**: Run `git status --short` immediately. Report every `UU` file to the user. Do NOT resolve automatically. Ask which version to keep for each conflicting file. After the user confirms: open each file and remove conflict markers keeping the chosen version, then run `git add <file>` for each, then run `git status --porcelain` to verify zero `UU` lines. Only continue after status is fully clean. Run `git stash drop` to discard the now-resolved stash entry.
- **Windows / PowerShell**: Do not use `&&` or `||` to chain git commands — PowerShell does not support bash `&&`/`||` syntax and will throw "unexpected token" errors. Run each git command in a separate shell call, or use `;` to chain (runs regardless of exit code). Use `Set-Location` instead of `cd` in scripts. Example: instead of `git checkout main && git merge feat/x`, run them as two separate Bash calls.

---

## Related

See **GitHub Sync** (`github-sync/`) and **Test-PR-Merge** (`.claude/commands/`) for pull/PR flows.
