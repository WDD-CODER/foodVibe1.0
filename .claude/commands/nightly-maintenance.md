---
description: Unattended nightly maintenance pass — github-sync, techdebt audit, docs sync, PR-check fixes. Commits its own findings to a dedicated branch and opens a draft PR; never merges.
allowed-tools: Read, Write, Edit, Bash, Skill, Agent
---

# Command: nightly-maintenance

Unattended workflow for scheduled/cron runs. Moves routine maintenance (sync, techdebt
audit, docs sync, PR-check fixes) off daytime dev sessions and onto an overnight cloud
run. Runs in an isolated, ephemeral cloud sandbox (not shared local state a human is
mid-edit on), so it's safe for this command to commit and push its own findings to a
dedicated branch — but it never merges, never marks anything done, and never touches
`.claude/todo.md`, matching the job-validation "never self-approve" rule.

**Assumes:** Session started with `--worktree --dangerously-approve` (unattended cloud run).

---

## Phase 0 — Idempotency Gate (the retry mechanism)

This command is scheduled to fire hourly across a retry window (e.g. 2:00–6:00 local) so
that a fire landing when usage limits block execution just gets retried by the next
hourly fire, without duplicating a run that already succeeded.

1. Compute today's local date stamp `YYYY-MM-DD`.
2. Check for `notes/nightly-maintenance/<date>.done`.
3. If it exists → print `Already completed tonight's run — skipping.` and stop
   immediately. Near-zero cost.
4. If absent → continue to Phase 1.

---

## Phase 1 — Branch Setup

1. **Outstanding-PR guard:** run `gh pr list --search "head:chore/nightly-maintenance- is:open"`
   (or equivalent). If any prior night's nightly-maintenance PR is still open → stop
   immediately. Do not create a branch, do not write the Phase 4 marker (so a later
   hourly fire this same night can retry once the human has merged/closed the
   outstanding one and the window hasn't ended yet). This prevents PR pile-up when the
   human hasn't reviewed yet.
2. `git status --short` — if dirty, stop and report `Worktree dirty at start — skipping,
   needs human review.` Do not touch existing uncommitted work, and do not write the
   Phase 4 marker (so this is retried once the worktree is clean again).
3. Create/checkout a dedicated branch `chore/nightly-maintenance-<date>` off latest `main`.

---

## Phase 2 — Run Maintenance Skills (in order)

1. **github-sync** — invoke `.claude/skills/github-sync/SKILL.md`. Already idempotent
   (own once-per-day gate on `notes/github-sync/<date>.md`) — harmless if it already ran
   today via the daytime session-start trigger.
2. **techdebt** — invoke `.claude/skills/techdebt/SKILL.md`. Report-only: record findings,
   never apply fixes.
3. **update-docs** — invoke `.claude/skills/update-docs/SKILL.md`. Mechanical, file-only
   doc/breadcrumb sync edits are in scope; never touch application code.
4. **pr-check-fix-loop** — run `gh pr list` for open PRs with failing checks. If any
   exist, run `docs/agent/pr-check-fix-loop.md` (bounded to 2 rounds; `[security-scan]`
   and `[audit]` findings are always surfaced to the human, never auto-fixed or dismissed).

If any step errors, or output looks like a usage/rate-limit failure — stop immediately.
Do **not** proceed to Phase 4 (no report, no marker), so the next hourly fire retries
the whole pass cleanly.

---

## Phase 3 — Self-Validate

Run `ng build`. If it fails and the failure traces to an update-docs edit, revert that
specific edit and note it in the report — a build break must never be left on the branch.
If the failure is unrelated to this run's own edits, note it and continue to Phase 4
(report the pre-existing break; don't attempt to fix unrelated code).

---

## Phase 4 — Report, Commit, Push, Draft PR, Notify

This phase exists because the routine runs in a fully **ephemeral** cloud sandbox — once
the session ends, anything not committed and pushed simply vanishes. "Leave it
uncommitted for review" (the `auto-solve` pattern) only works when a human has the same
dirty working tree in front of them; here nobody does, so the findings must be persisted
to GitHub or they're lost.

1. Write `OVERNIGHT-REPORT-<date>.md` in the repo root, in the shape of the existing
   `OVERNIGHT-REPORT-auto-solve-2026-09-16.md` example: status/branch line, github-sync
   result, techdebt findings, docs changes made, PR-check fixes attempted (or "none
   needed"), build status, worktree state, and a plain-English recommendation for the
   morning review.
2. `git add` + `git commit` everything from this run (doc/breadcrumb fixes, the techdebt
   report, the overnight report itself) on the dedicated branch. Committing here is safe
   — this is an isolated ephemeral branch nobody else is editing, unlike `auto-solve`'s
   shared local working tree, so its "never commit without a human typing approve" rule
   doesn't transfer.
3. `git push -u origin chore/nightly-maintenance-<date>`.
4. `gh pr create --draft --base main --title "🌙 Nightly maintenance — <date> (merge or close)"`
   with a body summarizing tonight's findings and an explicit "Merge to accept, close to
   discard" line. A **draft** PR, never marked ready, never merged by this command — that
   decision is entirely the human's.
5. Send a `PushNotification` with the PR URL and the same one-line ask.
6. Only now — once the PR genuinely exists — create `notes/nightly-maintenance/<date>.done`
   with the completion timestamp. The marker represents "a durable, reviewable artifact
   exists," not just "local files were written."
7. Stop. Do not loop, do not touch `.claude/todo.md` or `plans/`, do not merge, do not
   mark anything `[x]` — job-validation still applies in full; this command only ever
   proposes, never approves.

---

## Error Handling

- Any phase failing (build error, tool error, usage-limit signal) → stop that phase; if
  Phase 4 was never reached, leave no report and no marker so the next scheduled fire
  retries cleanly.
- Never weaken gates: no editing CI/workflow config, no deleting or skipping tests, no
  auto-fixing `[security-scan]` or `[audit]` findings — always surface those instead.

## Permissions Required

Same as `auto-solve`: `Bash(*)` (build, git, gh), `Write`/`Edit` for worktree paths,
`Skill` for invoking github-sync/techdebt/update-docs.
