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
| `/ship fast` | Collapses Phase 4 and Phase 4.5 into one approval — see below |
| `/ship regular` | Force REGULAR lane regardless of auto-classification — today's full pipeline, no shortcuts. (Forcing *more* scrutiny is always a safe override; this is unchanged.) |
| `/ship --yes` | Show confirmation block then commit without waiting (still runs review unless skipped) |
| `/ship --skip-review "reason"` | Bypass Phase 2 entirely; **reason required**; log `[review-skipped: {reason}]` in the commit message body. No silent skip. |

**`/ship fast`** (or a diff Phase 0 naturally classifies FAST/ULTRA-TRIVIAL, which already gets this for free): collapses Phase 4 and Phase 4.5 into **one** approval. The single reply (`Y`, `merge`, `later`, `open-pr-only`, or `abort`) answers commit + push + PR creation (if feature-complete) + merge (if eligible) all at once, instead of two separate stops. It does **not** change lane classification or review depth — Phase 0 still classifies for real, Phase 2 still reviews at whatever depth that classification calls for, and a genuine review finding still stops and asks; this removes redundant re-confirmation, not judgment calls. Available on demand for any lane, including REGULAR — unlike `/ship regular`, it never overrides classification.

Flags compose: `/ship fast --yes` means "one combined approval, and don't even wait for it" —
assuming Phase 1-3 came back clean, this goes straight through to merge on one shot. Chat
phrase "ship fast" is equivalent to typing `/ship fast`.

---

## Phase 0 — Lane classification (auto-detect FAST vs REGULAR)

Runs first, before the build gate. This is what makes `/ship` fast for small changes without cutting corners on risky ones — it decides how much of the pipeline below actually executes, it doesn't remove any phase's *existence*.

Run `node scripts/ship-prep.mjs` (`--mode regular` for `/ship regular`); the script is the source of truth for thresholds.

Announce the pick before continuing, e.g. `Lane: FAST (2 files, 14 lines, no sensitive paths)` or `Lane: REGULAR (touches server/routes/ai.js)` — the Human should always know which pipeline is about to run and why, even when nothing stops for approval.

---

## Phase 1 — Build gate (UNCONDITIONAL hard stop)

```bash
ng build
node scripts/plan-ledger-check.mjs
```

- **Fail** (`ng build` or `plan-ledger-check.mjs`) → stop. Do not commit. Fix, then re-run `/ship`.
- Never make this gate conditional. Ledger check exit 1 (missing plan refs in `.claude/todo.md` / session briefs) blocks the same as a failed build; duplicate-NNN / stray-name warnings are advisory and do not fail the gate.

---

## Phase 2 — Review (unless `--skip-review "reason"`, or Lane = FAST / ULTRA-TRIVIAL)

**Lane = REGULAR:** Read `docs/agent/ship-regular.md` → "Phase 2 — REGULAR review procedure" and follow it.

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

`git worktree list` alone misses same-directory concurrent sessions (two agents/tools sharing one working tree, no separate worktree) — see `docs/brain/gotchas/agent-workflow.md` "Same-directory concurrent session breaks the plans/ numbering scan". Run:

```bash
node scripts/ship-prep.mjs --check-baseline
```

This compares current branch + HEAD against the baseline `ship-prep.mjs` recorded at Phase 0. Inside a wt-N slot it re-checks the plan's Read-Write Scope instead of manifest overlaps; outside a slot it re-checks manifest overlaps only when another slot is on a live (non-detached) branch:

- **`BRANCH_CHANGED`** → **STOP**. Something else switched HEAD in this shared working directory mid-ship. Show the Human both branch names; do not stage or commit until they confirm which branch is intended.
- **`HEAD_MOVED`** (new commits landed, not made by this session) → treat as a same-directory overlap signal: re-run `git status --short` fresh (don't reuse an earlier snapshot from this conversation), re-`Read` any file about to be staged immediately before `git add` rather than trusting an earlier in-session read, and note in the ship summary that concurrent commits were detected on this branch.
- **`scope: out`** (in a wt-N slot, touching files outside the plan's Read-Write Scope) → **STOP**. List the out-of-scope files. Ask the Human: `approved: <path>` (append the path(s) to the plan's `## Read-Write Scope` block and continue) or revert those specific files. Never silently commit them.
- **`OK`** (and `scope: ok` when in a slot) → proceed with normal this-chat-file staging.
- **Non-empty `overlaps`** → honor overlap stops (same rules as before: non-empty overlaps → STOP; `no_manifest` → do not `git add -A`; prefer this-chat files).
- Either path: stage only this-chat dirty paths (tool write/edit history ∩ `git status --short`). Never `git add -A` unless Human overrode scope.
- Flag secrets / `.env` — never stage them.

Before Phase 4, sync with `origin/main`:

```bash
git fetch origin
git rebase origin/main
```

- A conflict where both sides only *added to* an append-only hotspot (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`) → resolve by keeping both sides (union), then `git rebase --continue`.
- Any other conflict → **STOP**. Show the Human the conflicting files; do not resolve unilaterally.

---

## Phase 4 — Commit + push (UNCONDITIONAL approval gate)

- **Lane = REGULAR, `fast` not passed:** one Y here for commit, a separate gate at Phase 4.5 for merge.
- **Lane = FAST or ULTRA-TRIVIAL, or `fast` passed on any lane:** see Flags → `/ship fast` above — the single reply here also answers Phase 4.5.
- **Lane = ULTRA-TRIVIAL specifically:** skip the interactive gate entirely. Commit + push happen automatically (checkpoint only — by definition an ultra-trivial diff is docs/handoff-only, never feature-complete, so no PR is proposed). Immediately after acting, print the same tree block as a receipt, tagged `[auto-approved: ultra-trivial]`, so the Human sees exactly what happened and can revert via normal git tooling if it was wrong to auto-proceed. HOW TO VALIDATE becomes the one-line "no user-visible effect" form, since ultra-trivial diffs never touch application code.

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
  docs/brain/{gotchas/<domain>.md | patterns/*.md | decisions/NNNN-*.md} — "one-line title"

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

**Lane = REGULAR:** Read `docs/agent/ship-regular.md` → "Brain-entry capture — REGULAR procedure" and follow it — including "How a proposed brain entry gets approved" whenever a brain entry is proposed on any lane.

### Semantic branch rename ((semantic rename rules))

If on `feat/session-*`:
1. `git log main..HEAD --oneline` and `git diff --stat main..HEAD`
2. Derive semantic slug (`feat|fix|refactor|chore` + 2–4 kebab words; no dates/session filler)
3. Show `Rename: {old} → {new}` in the tree; rename after approval: `git branch -m`

### On approval (order is hard — do not reorder)

Approve **Y** (or `--yes`) **is** Human validation of the job. Then:

1. **Todo sync (mandatory when items match)**
   - **In a wt-N slot:** mark the matching item(s) `[x]` in the plan file's own `## Atomic Sub-tasks` **only**. Do **not** run `todo-query.mjs mark` and do **not** run `todo-archive.mjs` — `.claude/todo.md` is Planner-owned; the Planner's `todo-query.mjs sync --merged` picks up this plan's checkboxes once the branch merges.
   - **Outside a slot (Planner / main):** Do not Read .claude/todo.md in full. Run `node scripts/todo-query.mjs open` (add `--plan NNN` when known) to find matches, then `node scripts/todo-query.mjs mark --line N[,N…]` on the matching lines (and update the plan's Atomic Sub-tasks the same way); then run `node scripts/todo-archive.mjs` to move any fully-`[x]` plan sections into `.claude/todo-archive/NNN.md` volumes (max 300 lines; rolls automatically).
   - Never invent completion for work not in this ship. Never skip with “Contractor does not mark.” If nothing matches → note `Todo: no matching open items — skipped` and continue.
2. **Write brain drafts** (if proposed and not dropped via edit list) — verbatim to `docs/brain/**` as above.
3. **`git add` only listed paths** — include the todo/plan/brain paths just updated. Happy path = **one commit** with job + todos (+ brain). Do **not** commit the job first and leave todos for a later push.
4. **`git commit`** (Conventional Commit; Cursor trailer `Co-authored-by: Cursor <cursoragent@cursor.com>` when applicable)
5. **Session-state fold (Plan 295 — before push)** — see Phase 5 below: write stable `docs/session-state-${BRANCH}.md`, `git add` it, **`git commit --amend --no-edit`** into the ship commit (only because this commit is ours and **not yet pushed**). Never leave session-state dirty after ship.
6. Rename branch if approved
7. Push only if Human asked (“push” / “ship and push”): `git push -u origin HEAD`. **Lane = FAST / ULTRA-TRIVIAL:** push is implied by the single Y (or auto-approve) — no separate "push" keyword needed, since Phase 0 already bounded what this diff can touch.
8. **Commit-vs-PR judgment** (before any `gh pr create`) — see below. Never open a PR silently.

**Recovery only:** Read `docs/agent/ship-recovery.md` → "Recovery only" and follow it.

### Commit-vs-PR judgment

Lane = REGULAR, or the PR path is reached → Read `docs/agent/ship-regular.md` → "Commit-vs-PR judgment" and "After opening a PR" and follow them.

**Hard rule (stays here — applies to every lane):** Never open a PR without either (a) the brief's Done-when fully met, or (b) explicit user instruction (override or ad-hoc answer).

Then proceed to **Phase 4.5 — Merge Gate** (mandatory).

### Push rejected or merge fails

Push rejected or merge fails → Read `docs/agent/ship-recovery.md` and follow it.

Never commit to `main`. Never force-push. Never amend after push.

---

## Phase 4.5 — Merge Gate (mandatory after successful push)

**`fast` flag was passed, or Lane naturally classified FAST/ULTRA-TRIVIAL:** this phase's decision already happened at Phase 4 (combined single reply) — nothing to wait for here, just execute the reply that was given there, regardless of which lane Phase 0 classified.

**Otherwise (Lane = REGULAR, `fast` not passed):** Read `docs/agent/ship-regular.md` → "Phase 4.5 — Merge Gate (REGULAR procedure)" and follow it.

Never auto-merge without Human `merge` / clear `Y`.

---

## Phase 5 — Session-state (fold into ship commit before push)

Runs as **On approval step 5** — after `git commit`, **before** push. Do not defer until after Merge Gate.

1. Read save target from `.claude/.session-state-path` (local pointer; gitignored). Fallback: `docs/session-state-${BRANCH}.md` then `docs/session-state.md`.
2. Run `node scripts/write-session-state.mjs --summary "<2–4 bullets>" --next "<first open todo + open session items>" [--pr <url>]`. It resolves the stable branch-canonical path itself (no PPID suffix), counts files changed against `origin/main...HEAD`, and either appends one line (≤1 file changed) or does a full rewrite (>1 file changed) with the `## Branch` / `## Date` / `## Session Summary` / `## Files Modified` / `## Commit` / `## PR` / `## Next Steps` schema.
3. `git add` the stable session-state file (and only that handoff path).
4. `git commit --amend --no-edit` — allowed here because HEAD is the ship commit just created by this agent and has **not** been pushed yet. Do **not** amend if already pushed.
5. Continue On approval (rename → push → PR judgment).

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
