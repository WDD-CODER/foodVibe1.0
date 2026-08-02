# Gotchas — agent workflow

Part of the domain split of `docs/brain/gotchas.md` — see that file for the index and the append routing table. Same rules as the parent file: each entry is what hurt / why the obvious fix is wrong / what to do instead. Append new entries at the bottom; never delete a still-true entry. If this file exceeds ~150 lines / ~10 entries, propose a further split (e.g. a separate planning-focused or compaction-focused domain file under `docs/brain/gotchas/`) as a brain proposal at the next Merge Gate.

Scope: session/context management, plan persistence and numbering, `.claude/todo.md` archiving, brain-capture gating — the Claude Code / Cursor agent tooling layer itself, not application code.

---

## Context compaction can silently drop decisions

**What hurt:** When a long Claude Code session's context window compacts, decisions or task state that only ever lived in conversation (never written to a file) can be summarized away — especially something decided a few tool calls before a compaction boundary.

**Why the obvious fix is wrong:** Trusting "the summary will capture it" isn't safe — summarization prioritizes recent/salient content, not necessarily the one decision that turns out to matter later.

**What to do instead:** Persist load-bearing state to disk as it's decided (`docs/session-state.md`, `.claude/todo.md`, plan files under `plans/`) rather than leaving it only in conversation. This is also why `docs/brain/` exists as its own durable layer — see [[0002-file-based-memory-over-tool-memory]].

---

## Pasted plans that never hit `plans/`

**What hurt:** Big plans authored in one IDE (or chat) were copy-pasted into Cursor/Claude for brief-by-brief execution, but nothing forced a write under `plans/`. Mid-flight stages lived only in conversation or `.claude/todo.md`, so agents could not see the live contract.

**Why the obvious fix is wrong:** Relying on “remember to save the plan” fails — save-plan only ran on an explicit phrase, and number-collision checks did not catch same-topic renames.

**What to do instead:** Any pasted Plan Contract triggers `.claude/skills/save-plan/SKILL.md` first. Run `node scripts/plan-name-similarity.mjs --name="…"`. Ask rewrite/save-as-new/cancel **only** on similar name hits. Append mid-brief tasks to the parent plan’s Atomic Sub-tasks + ledger. Claude PreToolUse: `scripts/plan-write-guard.sh`; Cursor: `.cursor/rules/save-plan-must-use-skill.mdc`.

---

## PreCompact FAIL substring matches review PASS/FAIL

**What hurt:** A PreCompact transcript grep used loose `FAIL` / `Verify:` tokens. Ordinary `/review-it` tables (`| PASS/FAIL |`, `| Verify cmd |`) and quoted session text were dumped into `.claude/todo.md` as “unresolved signals,” polluting the compact-time ledger.

**Why the obvious fix is wrong:** Dropping signal capture entirely loses the Brief 1 goal (preserve open blockers across `/compact`). Matching only “FAIL” with `\b` still hits `PASS/FAIL` because `/` is a word boundary.

**What to do instead:** Anchor real tool tokens (`UPGRADE_AVAILABLE`, `ROUTING_DECLINED`, `BLOCKED`); require `Verify:` + whitespace; require `FAIL` with a non-`/` predecessor; truncate each match (`cut -c1-300`) so JSONL lines cannot flood `todo.md`.

---

## Existing save-plan mitigations still let a plan skip plans/

**What hurt:** The gotcha above ("Pasted plans that never hit `plans/`") already
documents save-plan + `plan-write-guard.sh` + the Cursor `.mdc` rule as the fix —
yet Plan 285 (AI Menu Phase 1) still executed end-to-end with ~22 `.claude/todo.md`
items marked `[x]` and no `plans/285-*.plan.md` ever created. The mitigations
existed on paper and were still bypassed, silently, with no error.

**Why the obvious fix is wrong:** Assuming "the gate exists" means "the gate
caught it" ignores two concrete bypass paths neither gate covers: (1)
`.claude/commands/plan.md` / `feat.md` / `review-it.md` documented a second,
ungated plan-path convention (`plans/[feature]_v[N].md`) that
`plan-name-similarity.mjs` and `plan-write-guard.sh` never recognized — a plan
saved under that name skips both checks; (2) `brief-detection`'s 3-marker H2
threshold also matches a genuine Plan Contract (Milestones + Atomic Sub-tasks),
and its execute-as-is route goes straight to `/feat` without ever mentioning
save-plan.

**What to do instead:** Treat "the skill exists" as necessary but not
sufficient — verify with a ledger-integrity check
(`scripts/plan-ledger-check.mjs`, wired into `.husky/pre-commit` and `/ship`
Phase 1) that every plan path referenced in `.claude/todo.md` / session briefs
actually resolves on disk. Collapse to one plan-path convention
(`plans/NNN-slug.plan.md` only). Make `brief-detection` check for a
Milestones/Atomic-Sub-tasks shape *before* offering the brief a/b/c gate,
routing Plan-Contract-shaped pastes to save-plan first. See
`plans/291-plan-persistence-brief-sync-hardening.plan.md`.

---

## Orphaned instruction file looks wired but nothing loads it

**What hurt:** `.claude/instructions/validation-checklist.md` fully specified HOW TO VALIDATE, but it was only `@`-included from `execute-it.md`. After that command was removed, agents still had JOB DONE close-out and looked compliant — Humans never got click-test bullets.

**Why the obvious fix is wrong:** Adding more “remember to show a checklist” reminders (or leaving the orphan file intact) does not restore enforcement. Agents follow hard gates they already load (`job-validation`, ship, done), not orphaned instruction paths.

**What to do instead:** Move the live rules onto `docs/agent/job-validation.md` and the close-out templates agents must print; leave the old path as a pointer stub. Audit `@include` / skill triggers whenever deleting a command that was the only loader. See [[how-to-validate-on-job-gate]].

---

## Same-directory concurrent session breaks the plans/ numbering scan

**What hurt:** Saving Plan 294 needed two renumbers (292 → 293 → 294) within
minutes, and separately, five rounds of unrelated docs edits (the auto-write
brain-capture policy change) kept getting silently reverted mid-session.
`ls plans/` / `plan-name-similarity.mjs` were run once early, then the actual
`Write`/`Edit` calls happened several tool calls later. A concurrent Cursor
session on the *same* branch, in the *same* (non-worktree) working directory,
landed its own commits and full-file rewrites in that gap — including
branch switches that changed HEAD out from under an in-progress edit.
`/ship` Phase 3's overlap check only runs when `git worktree list` shows more
than one worktree — this was a single working directory the whole time, so
the check that exists for exactly this failure mode never fired.

**Why the obvious fix is wrong:** Assuming "I already scanned this
conversation" is safe ignores that the scan/read and the `Write`/`Edit`
aren't atomic — any gap (including waiting on a Human reply) is a window for
another session to land files, rewrite a whole file from a stale read, or
switch branches. Re-running `plan-name-similarity.mjs` doesn't catch a
same-number-different-topic collision either — it only compares *titles*.
Retrying an `Edit` immediately after a revert doesn't help either if the
other session is mid-way through its own multi-file batch — it just races
again on the next round.

**What to do instead:** Re-list `plans/` (or re-`git log -3 --oneline`)
immediately before a `Write`/`Edit` on a shared file, not only once earlier
in the conversation — treat any gap of more than a couple tool calls (or a
Human-reply wait) as stale. Since `git worktree list` doesn't detect
same-directory concurrent sessions, don't rely on it as the sole staleness
trigger. When repeated reverts hit the same shared files, stop making
one-file-at-a-time edits with round-trips in between — batch every remaining
edit into a single parallel tool-call message, then commit immediately, to
minimize the window another session has to land a conflicting full-file
write. Related to [[0001-lean-native-workflow]] and the cross-worktree NNN
hardening in `plans/291-plan-persistence-brief-sync-hardening.plan.md` M6,
which covers stale *origin* state but not same-directory local races.

---

## Todo archive footer wording and Plan Index placement

**What hurt:** Fully-done `### Plan` sections sitting *below* `## Plan Index` were invisible to `scripts/todo-archive.mjs` (footer cut-off), so dead weight stayed in `todo.md`. Separately, changing the `## Done` stub text away from a recognized phrase caused the stub to be swallowed into the last archived plan section. Keeping a large Plan Index table in `todo.md` also re-bloated the open-work file after Done rows were moved out.

**Why the obvious fix is wrong:** Re-running the archive script “successfully” looks healthy while orphan all-`[x]` sections remain. A “slim” Active/Planned index still costs ~90 lines every session and mostly duplicates stale catalog state.

**What to do instead:** Keep every `### Plan` block above the file footer (`## Where things live`). Do not maintain a Plan Index table in `todo.md` — open work is the sections; Done is `todo-archive/`; all files are under `plans/`. Archive only via `node scripts/todo-archive.mjs`. See `docs/agent/job-validation.md` → Todo archive volumes.

---

## `scripts/todo-archive.mjs` section-splitting silently corrupts or drops sibling content

**What hurt:** `splitPlanSections()` only split `.claude/todo.md` on `### Plan` headers. A non-Plan heading sitting between two plan sections (e.g. `## 6. KEEP DEFERRED`) got absorbed into the *preceding* plan's captured text instead of being its own boundary. This silently broke two different things: the swallowed text's literal wording (e.g. `(deferred)`) false-flagged the preceding plan as blocked/deferred, so `isFullyDone()` refused to archive it even when every checkbox was `[x]`.

**Why the obvious fix is wrong:** Narrowing the section boundary (stop at any `## ` heading, not just the next `### Plan`) fixes the false-flagging — but if you stop there, you've introduced a worse bug. `removeSectionsFromTodo()` reconstructed the file from `preamble + kept-sections + footer` only. Once the sibling content is correctly excluded from every section's captured range, it isn't part of *any* section, the preamble, or the footer — so it falls into a gap the reconstruction never accounts for and gets silently deleted the next time a neighboring plan is archived. A partial fix (only the boundary detection) trades a visible bug (false "no all-[x] sections" message) for a silent one (real content vanishing from a tracked file).

**What to do instead:** When a text-splitting function's caller reconstructs the whole document from the parsed pieces, verify the reconstruction accounts for *every* byte of the original — not just the pieces you meant to keep. Prefer excising exact `[start, end)` line ranges of the pieces you're removing from the original line array over rebuilding from `kept.join(...)` fragments; the former can't lose content that was never part of what you're removing. Verify with `--dry-run` before applying, and diff the *unrelated* surrounding content, not just the target section.

---

## `brain-review-check.mjs` flags `docs/brain/` subfolder-relative refs as dead

**What hurt:** After splitting `gotchas.md` into `docs/brain/gotchas/*.md`, an early draft wrote cross-references relative to `docs/brain/` (e.g. a bare "gotchas/agent-workflow.md" in backticks, omitting the `docs/brain/` prefix) inside those subfolder files. `node scripts/brain-review-check.mjs --scope=full` flagged every one of them as a dead reference, even though the file existed and any markdown-link syntax around it would have resolved fine in a rendered viewer.

**Why the obvious fix is wrong:** Assuming a backtick-quoted path is safe because it "looks like a relative link from this file" ignores how the checker actually works — `extractRefs()` pulls the raw backtick text and joins it straight onto the repo root (`join(repoRoot, ref)`), with no awareness of which file it came from. There is no such thing as a directory-relative ref as far as the checker is concerned.

**What to do instead:** Inside `docs/brain/**`, always write backtick-quoted cross-references as full repo-relative paths (`` `docs/brain/gotchas/agent-workflow.md` ``), even for a file referencing its own sibling in the same subfolder. Verify with `node scripts/brain-review-check.mjs --scope=full` before shipping any `docs/brain/` restructure.
