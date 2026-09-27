---
description: Unattended nightly maintenance pass — github-sync, techdebt audit, docs sync, PR-check fixes. Report-only; never commits.
allowed-tools: Read, Write, Edit, Bash, Skill, Agent
---

# Command: nightly-maintenance

Unattended workflow for scheduled/cron runs. Moves routine maintenance (sync, techdebt
audit, docs sync, PR-check fixes) off daytime dev sessions and onto an overnight cloud
run. Never commits without explicit human approval — matches `auto-solve`'s approval
gate and the job-validation "never self-approve" rule.

**Assumes:** Session started with `--worktree --dangerously-approve` (unattended cloud run).

---

## Phase 0 — Idempotency Gate (the retry mechanism)

This command is scheduled to fire every 30 minutes across a retry window (e.g. 2:00–6:30
local) so that a fire landing when usage limits block execution just gets retried by the
next fire, without duplicating a run that already succeeded.

1. Compute today's local date stamp `YYYY-MM-DD`.
2. Check for `notes/nightly-maintenance/<date>.done`.
3. If it exists → print `Already completed tonight's run — skipping.` and stop
   immediately. Near-zero cost.
4. If absent → continue to Phase 1.

---

## Phase 1 — Branch Setup

1. `git status --short` — if dirty, stop and report `Worktree dirty at start — skipping,
   needs human review.` Do not touch existing uncommitted work, and do not write the
   Phase 4 marker (so this is retried once the worktree is clean again).
2. Create/checkout a dedicated branch `chore/nightly-maintenance-<date>` off latest `main`.

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
Do **not** proceed to Phase 4 (no report, no marker), so the next 30-minute fire retries
the whole pass cleanly.

---

## Phase 3 — Self-Validate

Run `ng build`. If it fails and the failure traces to an update-docs edit, revert that
specific edit and note it in the report — a build break must never be left on the branch.
If the failure is unrelated to this run's own edits, note it and continue to Phase 4
(report the pre-existing break; don't attempt to fix unrelated code).

---

## Phase 4 — Report & Marker

1. Write `OVERNIGHT-REPORT-<date>.md` in the repo root, in the shape of the existing
   `OVERNIGHT-REPORT-auto-solve-2026-09-16.md` example: status/branch line, github-sync
   result, techdebt findings, docs changes made, PR-check fixes attempted (or "none
   needed"), build status, worktree state, and a plain-English recommendation for the
   morning review.
2. Only once the report is written successfully: create
   `notes/nightly-maintenance/<date>.done` with the completion timestamp — the marker
   Phase 0 checks.
3. **Never commit or push.** Leave the branch and report uncommitted for human review —
   per job-validation, a job is never self-approved.
4. Stop. Do not loop, do not touch `.claude/todo.md` or `plans/`.

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
