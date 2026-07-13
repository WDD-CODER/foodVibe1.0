---
description: Session end — build, review, commit approval, conditional state/todo (inline, no subagent)
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
---

# /ship — Session end (inline pipeline)

Closes the current session. Repo root = **workspace cwd**. **No subagent spawns** — all phases run inline in this command.

**Aliases / triggers:** `/ship`, `/end-session`, “wrap up”, “ship”, “ship it”.

Invoking `/ship` authorizes commit of this chat’s files after explicit **Y** (unless `--yes` / `--skip-review` flags apply as documented below). For message-only prep without commit, use `git-agent`.

## Flags

| Flag | Behavior |
|------|----------|
| `/ship` | Full pipeline; wait for **Y** before commit/push |
| `/ship --yes` | Show confirmation block then commit without waiting (still runs review unless skipped) |
| `/ship --skip-review "reason"` | Bypass Phase 2 entirely; **reason required**; log `[review-skipped: {reason}]` in the commit message body. No silent skip. |

---

## Phase 1 — Build gate (UNCONDITIONAL hard stop)

```bash
ng build
```

- **Fail** → stop. Do not commit. Fix, then re-run `/ship`.
- Never make this gate conditional.

---

## Phase 2 — Review (unless `--skip-review "reason"`)

1. Invoke `/review` (read `.claude/commands/review.md` and execute it).
2. On `REVIEW: PASS` → continue.
3. On `ISSUES FOUND` → fix the listed issues → re-run `/review` **exactly once**.
4. If still `ISSUES FOUND` → **stop**. Do not commit. Present remaining issues to the user.
5. Retry cap is hard: one fix-and-recheck cycle only. Never loop indefinitely.

If `--skip-review "reason"` was provided:
- Skip this phase entirely.
- Require a non-empty reason from the user.
- Record `Review: SKIPPED ({reason})` in the output summary.
- Include `[review-skipped: {reason}]` in the commit message body.

---

## Phase 3 — Manifest check (conditional)

```bash
git worktree list | wc -l
```

- **ONLY if worktree count > 1** → run `python3 scripts/session-manifest-ship.py` and honor overlap stops (same rules as before: non-empty overlaps → STOP; `no_manifest` → do not `git add -A`; prefer this-chat files).
- **Otherwise (≤1 worktree)** → skip the manifest script entirely; use normal staging of this-chat dirty paths (tool write/edit history ∩ `git status --short`). Never `git add -A` unless Human overrode scope.
- Flag secrets / `.env` — never stage them.

---

## Phase 4 — Commit + push (UNCONDITIONAL approval gate)

Present a visual tree, then **wait for explicit "Y"** (unless `--yes`):

~~~text
Branch: [branch-name]
Rename: [old → new]   # only if on feat/session-* placeholder

Proposed commit:
  type(scope): subject

  body (why, not what)
  [review-skipped: reason]   # only when --skip-review was used

Files to stage:
  ├── file1
  └── file2

Also proposing a brain entry:   # only when this session produced a durable decision/pattern/gotcha
  docs/brain/{gotchas.md | patterns/*.md | decisions/NNNN-*.md} — "one-line summary"

Approve? (Y / edit list / abort)
~~~

### Brain-entry capture (no new gate)

If this session produced something durable — a decision worth an ADR, a proven pattern, or a gotcha that cost time — draft the entry and add it as an extra line item in the same tree above, under "Also proposing a brain entry." If nothing durable happened, omit that block entirely; do not print it for trivial sessions.

This rides the existing `Approve? (Y / edit list / abort)` answer — there is no separate Y/N for the brain entry. Saying "edit list" also covers dropping the brain entry (treat it like any other stageable item the user can remove). On approval, write the entry to its `docs/brain/` file (append for `gotchas.md`/`patterns/`, new numbered file for `decisions/`) and stage it alongside the rest.

### Semantic branch rename ((semantic rename rules))

If on `feat/session-*`:
1. `git log main..HEAD --oneline` and `git diff --stat main..HEAD`
2. Derive semantic slug (`feat|fix|refactor|chore` + 2–4 kebab words; no dates/session filler)
3. Show `Rename: {old} → {new}` in the tree; rename after approval: `git branch -m`

### On approval

1. `git add` only listed paths
2. `git commit` (Conventional Commit; Cursor trailer `Co-authored-by: Cursor <cursoragent@cursor.com>` when applicable)
3. Rename branch if approved
4. Push only if Human asked (“push” / “ship and push”): `git push -u origin HEAD`
5. **Commit-vs-PR judgment** (before any `gh pr create`) — see below. Never open a PR silently.

### Commit-vs-PR judgment

Decide whether this ship is a **feature-complete** commit (push + propose PR) or a **milestone/checkpoint** commit (push only, no PR). Do **not** infer “open PR if applicable.”

**Manual override (check first):** If the user’s ship-time message explicitly says e.g. “open a PR” / “create a PR” → treat as feature-complete and propose a PR. If it says e.g. “just commit” / “checkpoint” / “no PR” → treat as checkpoint; commit + push only, no PR. Skip the brief/ad-hoc check below when an override is present.

**Otherwise — brief used this session** (brief file referenced in conversation or `.claude/todo.md`):

1. Compare the session diff against that brief’s **Done when** list.
2. **All criteria met** → feature-complete → run `node scripts/brain-review-check.mjs --scope=full` (advisory only — findings never block the PR, just get reported), then proceed to propose PR (`gh pr create` on a feature branch, existing flow).
3. **Not all criteria met** → milestone/checkpoint → commit + push to the branch only; **do not** propose a PR; **do not** run the `--scope=full` brain check (checkpoint commits only get the CI `--scope=dead-refs` pass). In the ship summary state explicitly: `Milestone commit — brief not yet complete, no PR proposed`. Then **Phase 4.5** with the CHECKPOINT banner.

**Otherwise — no brief this session** (ad-hoc work, no Done-when to check):

- Do **not** default to opening a PR.
- Ask once, single-select style: `Is this feature-complete (open a PR) or a checkpoint (push only)?`
- Follow the user’s answer; do not assume either path.

**Hard rule:** Never open a PR without either (a) the brief’s Done-when fully met, or (b) explicit user instruction (override or ad-hoc answer).

### After opening a PR (feature-complete path only)

After opening the PR, run `gh pr checks --watch` once. If any check fails, offer the user: run the fix loop now (`docs/agent/pr-check-fix-loop.md`) or leave it. Do not auto-run without asking.

Then proceed to **Phase 4.5 — Merge Gate** (mandatory).

### Push conflict guard

If push is rejected (non-fast-forward):
```bash
git fetch origin
git log --oneline HEAD..origin/{branch}
git diff --stat HEAD...origin/{branch}
```
Present choices: (a) rebase (b) merge (c) abort — wait for user choice. On conflicts during rebase/merge: list files, stop, instruct resolve then re-run `/ship`.

If renamed after remote had the old name:
```bash
git push origin --delete {old_name}
git push -u origin {new_name}
```

### PR merge fallback

If `gh pr merge --merge --delete-branch` fails due to dirty local tree, fall back to:
```bash
gh pr merge {pr_number} --merge --auto
```
Do not stash/commit unrelated dirty files to unblock merge.

Never commit to `main`. Never force-push. Never amend after push.

---

## Phase 4.5 — Merge Gate (mandatory after successful push)

Follow `docs/agent/standards-git.md` → **Post-push Merge Gate**. Copy the visual block exactly; wait for Human reply. Do not skip because a PR URL was already printed.

- **Feature-complete / PR path:** show MERGE GATE. On `merge` → create PR if missing, then `gh pr merge --merge --delete-branch` (use PR merge fallback above if dirty tree). On `later` → stop with PR in Next Steps. On `open-pr-only` → ensure PR exists, do not merge.
- **Checkpoint / milestone path:** show CHECKPOINT — DO NOT MERGE YET. Do not offer merge.

Never auto-merge without Human `merge` / clear `Y`.

---

## Phase 5 — Session-state (conditional size)

Read save target from `.claude/.session-state-path` (fallback `docs/session-state.md`).

Count files changed this session (this-chat stage list / commits).

- **If ≤1 file changed** → **append one line** (date + sha + summary) under the existing sections. Keep required schema sections intact: `## Session Summary`, `## Next Steps`.
- **If >1 file changed** → **full rewrite** with schema:

```markdown
# Session State

## Branch
{branch_name}

## Date
{YYYY-MM-DD}

## Session Summary
{2–4 bullets}

## Files Modified
{git diff --stat for this session}

## Commit
{sha or none}

## PR
{url or N/A}

## Next Steps
{first open todo + open session items}
```

Do not change the resume/read path used by `scripts/session-startup.sh`.

---

## Phase 6 — Todo sync (conditional)

- **Only if** `.claude/todo.md` has ≥1 `[ ]` item that plausibly matches a file touched this session (or the user named a completed task) → mark matching items `[x]`; archive fully-complete sections to `.claude/todo-archive.md` under `## Done`.
- **Otherwise** → skip and note: `Todo: no matching open items — skipped`

---

## Output summary (always)

Always state which commit-vs-PR path was taken and why.

```
SESSION WRAP — {final_branch_name}
Build: PASS | FAIL
Review: PASS | FIXED+PASS | SKIPPED (reason)
Commit: {sha or none}
Push: yes | no
PR path: PR proposed — brief Done-when met
       | PR proposed — user override / confirmed feature-complete
       | Checkpoint commit — brief incomplete
       | Checkpoint commit — no brief, user confirmed
       | Checkpoint commit — user override
PR: {url or N/A}
Merge: offered | merged {sha} | deferred | N/A (checkpoint)
Brain review: {--scope=full summary, e.g. "no issues found" | "2 advisory findings — see above"} | N/A (checkpoint, not run)
Todo: {n marked} | no matching open items — skipped
Session state: {path} (append | full rewrite)
```

When the path is a milestone/checkpoint with an incomplete brief, also include the exact line:
`Milestone commit — brief not yet complete, no PR proposed`

---

## What /ship does NOT do

| Skipped | On-demand |
|---------|-----------|
| Techdebt scan | `/techdebt` |
| Docs refresh | `/docs-refresh` |
| Session evaluation | `/evaluate-me` |
| Message-only prep | `git-agent` |
