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
| `/ship` | Auto-detect lane (Phase 0), then run that lane's pipeline; wait for **Y** unless the lane is ULTRA-TRIVIAL |
| `/ship fast` | Force FAST lane regardless of auto-classification — Human is asserting the diff is safe to skip full review/brain-mining for |
| `/ship regular` | Force REGULAR lane regardless of auto-classification — today's full pipeline, no shortcuts |
| `/ship --yes` | Show confirmation block then commit without waiting (still runs review unless skipped) |
| `/ship --skip-review "reason"` | Bypass Phase 2 entirely; **reason required**; log `[review-skipped: {reason}]` in the commit message body. No silent skip. |

Flags compose: `/ship fast --yes` is valid.

---

## Phase 0 — Lane classification (auto-detect FAST vs REGULAR)

Runs first, before the build gate. This is what makes `/ship` fast for small changes without cutting corners on risky ones — it decides how much of the pipeline below actually executes, it doesn't remove any phase's *existence*.

```bash
git status --short
git diff --stat
git diff --cached --stat
```

Classify the this-chat diff (same file set Phase 3 will stage — working tree ∩ staged) by file count, total lines changed (insertions + deletions), and touched paths:

- **SENSITIVE_PATHS** (any match forces REGULAR, no matter how small the diff): paths matching `auth|crypto|guard|interceptor|security|payment|migration|schema|\.env|server/routes|package(-lock)?\.json|\.github/workflows|\.claude/(settings|commands/ship)\.`. These are the places where a small diff can still be a big risk.
- **ULTRA-TRIVIAL** → exactly 1 file changed, ≤10 lines changed, and the file matches `docs/session-state-.*\.md | \.claude/todo\.md | CHANGELOG\.md | docs/.*\.md` (pure handoff/doc content, nothing executable). No sensitive-path match.
- **FAST** → ≤3 files changed, ≤40 lines changed, no sensitive-path match, and not already ULTRA-TRIVIAL.
- **REGULAR** → everything else. This is the default whenever the diff doesn't clearly qualify — when in doubt, run the full pipeline.

`/ship fast` / `/ship regular` override the classification outright (skip this Phase's logic, go straight to the forced lane). Bare `/ship` always classifies.

Announce the pick before continuing, e.g. `Lane: FAST (2 files, 14 lines, no sensitive paths)` or `Lane: REGULAR (touches server/routes/ai.js)` — the Human should always know which pipeline is about to run and why, even when nothing stops for approval.

---

## Phase 1 — Build gate (UNCONDITIONAL hard stop)

```bash
ng build
```

- **Fail** → stop. Do not commit. Fix, then re-run `/ship`.
- Never make this gate conditional.

---

## Phase 2 — Review (unless `--skip-review "reason"`, or Lane = FAST / ULTRA-TRIVIAL)

**Lane = REGULAR:**
1. Invoke `/review` (read `.claude/commands/review.md` and execute it).
2. On `REVIEW: PASS` → continue.
3. On `ISSUES FOUND` → fix the listed issues → re-run `/review` **exactly once**.
4. If still `ISSUES FOUND` → **stop**. Do not commit. Present remaining issues to the user.
5. Retry cap is hard: one fix-and-recheck cycle only. Never loop indefinitely.

**Lane = FAST or ULTRA-TRIVIAL:** skip the full `/review` invocation — Phase 0 already established the diff is small and touches no sensitive path, which is what `/review` would mostly be checking for anyway. Instead:
- Run `npx eslint --fix` (cheap, already expected proactively per CLAUDE.md enforcement).
- Read the actual diff once for obvious correctness issues (typos, wrong variable, broken import) — not a full multi-pass review, just a sanity pass.
- Record `Review: SKIPPED (fast-lane: {n} files/{m} lines, no sensitive paths)` in the output summary and `[review-skipped: fast-lane]` in the commit body — same mechanism as manual `--skip-review`, just an auto-generated reason instead of a Human-typed one.

If `--skip-review "reason"` was provided explicitly (independent of lane):
- Skip this phase entirely.
- Require a non-empty reason from the user.
- Record `Review: SKIPPED ({reason})` in the output summary.
- Include `[review-skipped: {reason}]` in the commit message body.

---

## Phase 3 — Manifest check (staleness-aware, not worktree-count-only)

`git worktree list` alone misses same-directory concurrent sessions (two agents/tools sharing one working tree, no separate worktree) — see `docs/brain/gotchas.md` "Same-directory concurrent session breaks the plans/ numbering scan". Check both:

```bash
git worktree list | wc -l
git branch --show-current
git rev-parse HEAD
```

- **If worktree count > 1** → run `python3 scripts/session-manifest-ship.py` and honor overlap stops (same rules as before: non-empty overlaps → STOP; `no_manifest` → do not `git add -A`; prefer this-chat files).
- **If worktree count ≤ 1** → compare current branch + HEAD against this ship invocation's baseline (branch + HEAD sha noted when `/ship` started, e.g. at Phase 1):
  - **Branch changed** → **STOP**. Something else switched HEAD in this shared working directory mid-ship. Show the Human both branch names; do not stage or commit until they confirm which branch is intended.
  - **HEAD moved but branch unchanged** (new commits landed, not made by this session) → treat as a same-directory overlap signal: re-run `git status --short` fresh (don't reuse an earlier snapshot from this conversation), re-`Read` any file about to be staged immediately before `git add` rather than trusting an earlier in-session read, and note in the ship summary that concurrent commits were detected on this branch.
  - **Neither changed** → proceed with normal this-chat-file staging.
- Either path: stage only this-chat dirty paths (tool write/edit history ∩ `git status --short`). Never `git add -A` unless Human overrode scope.
- Flag secrets / `.env` — never stage them.

---

## Phase 4 — Commit + push (UNCONDITIONAL approval gate)

**Lane = REGULAR:** unchanged below — one Y here for commit, a separate gate at Phase 4.5 for merge.

**Lane = FAST:** same tree, same required HOW TO VALIDATE section, but the single Y answers commit + push + (PR creation if feature-complete) + (merge if eligible) all at once. The Approve line accepts any Phase 4.5 reply token directly (`Y`, `merge`, `later`, `open-pr-only`, `abort`) instead of waiting for a second stop — Phase 0 already bounded the blast radius, so there's nothing a second round-trip would catch that the first one wouldn't. Phase 4.5's actions still happen, just triggered by this same answer instead of a follow-up prompt.

**Lane = ULTRA-TRIVIAL:** skip the interactive gate entirely. Commit + push happen automatically (checkpoint only — by definition an ultra-trivial diff is docs/handoff-only, never feature-complete, so no PR is proposed). Immediately after acting, print the same tree block as a receipt, tagged `[auto-approved: ultra-trivial]`, so the Human sees exactly what happened and can revert via normal git tooling if it was wrong to auto-proceed. HOW TO VALIDATE becomes the one-line "no user-visible effect" form, since ultra-trivial diffs never touch application code.

Present a visual tree, then **wait for explicit "Y"** (unless `--yes`, or Lane = ULTRA-TRIVIAL):

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
  ├── .claude/todo.md          # when matching items will be marked [x] on Y
  └── plans/….plan.md          # when matching Atomic Sub-tasks will be marked [x] on Y

Also proposing a brain entry:   # only when durable; may be 2 lines (pattern + paired gotcha)
  docs/brain/{gotchas.md | patterns/*.md | decisions/NNNN-*.md} — "one-line title"

HOW TO VALIDATE
  - {action} → {expected result}
  - …

Approve? (Y / edit list / abort)
~~~

**HOW TO VALIDATE:** Mandatory before Approve? — plain-language action → expected result bullets per `docs/agent/job-validation.md`. Include happy path and any edge/failure rules this ship introduced. If no user-visible effect, one line explaining why no click-test is needed. Never omit the section.

**Todo lines in the tree:** If matching open todos exist for this job, list the todo/plan paths above *before* Y (still `[ ]` on disk). On **Y**, mark them `[x]` and stage them in the **same** commit as the job — Human must not need a second push just for checkboxes. Chat-only jobs (no ship): use `docs/agent/job-validation.md` Path B / `/done`.

When a brain entry is proposed, print each entry's **full draft body** in a fenced markdown block directly below the tree — the tree line carries only path + title.

### Brain-entry capture (no new gate)

**Lane = FAST or ULTRA-TRIVIAL:** skip the extraction/mining procedure by default — a 2-3 file, sub-40-line diff rarely produced a durable pattern/gotcha/decision worth mining `sessions/*.md` for, and that mining pass is one of the slower parts of `/ship`. Exception: run it anyway if the diff itself touches `docs/brain/**`, or the Human says "check brain" / "brain capture" in the ship-time message. Omit the brain block from the tree entirely rather than running the full procedure to conclude nothing's there.

**Lane = REGULAR:** unchanged — follow `docs/agent/brain-capture.md`: run the extraction procedure (mine `sessions/YYYY-MM-DD.md` Decisions / review findings — not the diff alone), pick the artifact type(s), draft the full body per the required shape, then run the usefulness gate.

- **Required shapes** — Pattern: Problem / Solution / When to use. Gotcha: What hurt / Why the obvious fix is wrong / What to do instead. Decision: Context / Decision / Consequences (ADR, next number). Templates: `docs/brain/patterns/_TEMPLATE.md`, `docs/brain/decisions/_TEMPLATE.md`.
- **One-liner-only proposals are forbidden** — a title that restates the commit subject is not an entry. No draft body that fills the shape → nothing durable → omit the block entirely (the common case for chores).
- **Split when both apply** — a pattern (happy path) and its paired gotcha (the trap that looked like success) are two lines + two fenced drafts, cross-linked.

This rides the existing `Approve? (Y / edit list / abort)` answer — there is no separate Y/N for the brain entry. Say `no brain` / `skip brain` alongside `Y` to opt out for this ship, or "edit list" to revise it (treat it like any other stageable item). On approval, write each approved draft **verbatim** to its `docs/brain/` file (append for `gotchas.md`, new file under `patterns/`, new numbered file for `decisions/`) and stage it alongside the rest. See `docs/brain/decisions/0006-auto-write-brain-capture-by-default.md`.

### Semantic branch rename ((semantic rename rules))

If on `feat/session-*`:
1. `git log main..HEAD --oneline` and `git diff --stat main..HEAD`
2. Derive semantic slug (`feat|fix|refactor|chore` + 2–4 kebab words; no dates/session filler)
3. Show `Rename: {old} → {new}` in the tree; rename after approval: `git branch -m`

### On approval (order is hard — do not reorder)

Approve **Y** (or `--yes`) **is** Human validation of the job. Then:

1. **Todo sync (mandatory when items match)** — Mark matching `.claude/todo.md` / plan Atomic Sub-tasks `[x]`; then run `node scripts/todo-archive.mjs` to move any fully-`[x]` plan sections into `.claude/todo-archive/NNN.md` volumes (max 300 lines; rolls automatically). Never invent completion for work not in this ship. Never skip with “Contractor does not mark.” If nothing matches → note `Todo: no matching open items — skipped` and continue.
2. **Write brain drafts** (if proposed and not dropped via edit list) — verbatim to `docs/brain/**` as above.
3. **`git add` only listed paths** — include the todo/plan/brain paths just updated. Happy path = **one commit** with job + todos (+ brain). Do **not** commit the job first and leave todos for a later push.
4. **`git commit`** (Conventional Commit; Cursor trailer `Co-authored-by: Cursor <cursoragent@cursor.com>` when applicable)
5. **Session-state fold (Plan 295 — before push)** — see Phase 5 below: write stable `docs/session-state-${BRANCH}.md`, `git add` it, **`git commit --amend --no-edit`** into the ship commit (only because this commit is ours and **not yet pushed**). Never leave session-state dirty after ship.
6. Rename branch if approved
7. Push only if Human asked (“push” / “ship and push”): `git push -u origin HEAD`. **Lane = FAST / ULTRA-TRIVIAL:** push is implied by the single Y (or auto-approve) — no separate "push" keyword needed, since Phase 0 already bounded what this diff can touch.
8. **Commit-vs-PR judgment** (before any `gh pr create`) — see below. Never open a PR silently.

**Recovery only:** If a prior ship already committed/pushed the job without todos (agent bug or mid-flight rule change), immediately mark matching `[x]` and push a tiny follow-up commit on the same branch — do not leave checkboxes open.

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

**Lane = FAST:** this phase's decision already happened at Phase 4 (combined single Y) — nothing to wait for here, just execute the reply that was given there. **Lane = REGULAR / ULTRA-TRIVIAL (checkpoint):** unchanged below.

Follow `docs/agent/standards-git.md` → **Post-push Merge Gate**. Copy the combined MERGE GATE + BRAIN CAPTURE visual block exactly; wait for Human reply. Do not skip because a PR URL was already printed.

- **Feature-complete / PR path:** show MERGE GATE + Brain capture. On `merge` → create PR if missing, then `gh pr merge --merge --delete-branch` (use PR merge fallback above if dirty tree). On `later` → stop with PR in Next Steps. On `open-pr-only` → ensure PR exists, do not merge.
- **Checkpoint / milestone path:** show CHECKPOINT — DO NOT MERGE YET (+ Brain capture when durable). Do not offer merge.
- **Brain re-show:** If Phase 4 skipped the brain block (ad-hoc commit/push, deferred, or nothing staged then) but something durable happened in the session, **re-show** the Brain capture proposal here — per `docs/agent/brain-capture.md`: banner line = path + one-line title, full draft body in a fenced block below the banner, usefulness gate already passed. Omit only when nothing durable.
- **Brain capture auto-writes on the gate reply** (per `docs/brain/decisions/0006-auto-write-brain-capture-by-default.md`) — no separate `brain approve` token, matching how Phase 4 already rides `Y`:
  - `merge` / `later` / `open-pr-only` → write the approved fenced draft verbatim (append gotcha, new pattern file, or new `decisions/NNNN-*.md`) first, then do the reply's normal action (commit + push to the PR branch when possible; tiny follow-up PR if already merged).
  - `no brain` / `skip brain` (combined with any of the above) → explicit no-op on the brain write only; the gate reply's other action still happens.
  - `brain edit …` → revise draft, re-show banner, wait again before writing.
  - Combine freely (e.g. `merge`, `merge, no brain`, `later, brain edit …`).

Never auto-merge without Human `merge` / clear `Y`.

---

## Phase 5 — Session-state (fold into ship commit before push)

Runs as **On approval step 5** — after `git commit`, **before** push. Do not defer until after Merge Gate.

1. Read save target from `.claude/.session-state-path` (local pointer; gitignored). Fallback: `docs/session-state-${BRANCH}.md` then `docs/session-state.md`.
2. **Stable path only:** write `docs/session-state-${BRANCH}.md` (no PPID suffix). Never write a new `docs/session-state-*-{pid}.md` for ship.
3. Count files changed this session (this-chat stage list / commits):
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

4. `git add` the stable session-state file (and only that handoff path).
5. `git commit --amend --no-edit` — allowed here because HEAD is the ship commit just created by this agent and has **not** been pushed yet. Do **not** amend if already pushed.
6. Continue On approval (rename → push → PR judgment).

Do not change the resume/read path used by `scripts/session-startup.sh`.
`.claude/.session-state-path` must remain **untracked** (gitignored).

---

## Phase 6 — Todo sync

**Done in Phase 4 “On approval” step 1** (before commit). Do not run a second todo pass after push unless using the recovery path in Phase 4.

---

## Output summary (always)

Always state which commit-vs-PR path was taken and why.

```
SESSION WRAP — {final_branch_name}
Lane: FAST | ULTRA-TRIVIAL | REGULAR ({reason})
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
