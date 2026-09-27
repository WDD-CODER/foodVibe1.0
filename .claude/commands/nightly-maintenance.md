---
description: Unattended nightly maintenance pass — github-sync, techdebt audit, docs sync, PR-check diagnosis. Never writes to git; delivers findings via SendUserFile + a push notification.
allowed-tools: Read, Write, Edit, Bash, Skill, Agent
---

# Command: nightly-maintenance

Unattended workflow for scheduled/cron runs. Moves routine maintenance (sync, techdebt
audit, docs sync, PR-check diagnosis) off daytime dev sessions and onto an overnight
cloud run.

**This command never commits, pushes, or opens anything on GitHub.** An earlier version
tried committing findings to a dedicated branch and opening a draft PR for durability —
a live test showed the cloud sandbox's own auto-mode permission classifier blocks any
`git commit`/push from an unattended session with `[Modify Shared Resources]`, and that
block is correct to respect, not route around. So this command only ever writes to its
own ephemeral local checkout, then hands the results directly to the human via
`SendUserFile` + `PushNotification` — which needs no git write at all and is a stronger
form of "never self-approve" than a draft PR ever was, since nothing touches the shared
repo unattended.

**Assumes:** Session started with `--worktree --dangerously-approve` (unattended cloud run).

**Schedule note:** this command is scheduled to fire once nightly (not on a retry
cadence). An earlier design tried firing hourly across a window with a committed
completion marker so a fire blocked by a usage cap would be retried later the same
night — that depended on a durable, cross-fire marker, which requires a git write and is
no longer possible per the constraint above. If tonight's single fire fails outright
(e.g. a usage-limit error before completion), the next attempt is simply tomorrow night.

---

## Phase 1 — Preflight

1. `git status --short` — expected clean (fresh clone). If not, note it in the report but
   continue anyway; nothing gets committed regardless, so a dirty tree from something
   upstream isn't a blocker here the way it would be for a commit-based flow.
2. Stay on the default checkout of `main`. No branch is created — there's nothing to push.

---

## Phase 2 — Run Maintenance Skills (in order)

1. **github-sync** — invoke `.claude/skills/github-sync/SKILL.md`. Already idempotent
   (own once-per-day gate on `notes/github-sync/<date>.md`) — harmless if it already ran
   today via the daytime session-start trigger. Its own write (if any) stays local to
   this ephemeral checkout; it is never committed.
2. **techdebt** — invoke `.claude/skills/techdebt/SKILL.md`. Report-only: record findings,
   never apply fixes.
3. **update-docs** — invoke `.claude/skills/update-docs/SKILL.md`. Mechanical, file-only
   doc/breadcrumb sync edits are in scope; never touch application code. These edits are
   delivered as a patch file in Phase 4 for the human to apply manually if wanted — they
   are never committed by this command.
4. **PR-check diagnosis (read-only)** — run `gh pr list` for open PRs with failing checks.
   If any exist, run the *diagnostic* steps of `docs/agent/pr-check-fix-loop.md` (read
   the failing check logs, identify root cause) but stop short of pushing any fix — that
   loop's normal job is pushing fixes to the PR branch, which hits the same commit block.
   Include the diagnosis (what's failing, likely cause) in the overnight report instead.

If any step errors, or output looks like a usage/rate-limit failure — stop immediately
and skip Phase 4 entirely; there is nothing to lose by stopping early since nothing has
been committed. Tomorrow night's fire simply tries again.

---

## Phase 3 — Self-Validate

Run `ng build`. This only validates the doc/breadcrumb edits sitting locally in this
ephemeral checkout — since nothing gets committed, a build failure doesn't need to be
"fixed" before proceeding; note the result (pass/fail, and why) in the report so the
human knows whether the patch in Phase 4 is safe to apply as-is.

---

## Phase 4 — Report & Deliver (via SendUserFile, no git write)

1. Write `OVERNIGHT-REPORT-<date>.md` in the repo root: status line, github-sync result,
   techdebt findings, docs changes made (with a one-line summary of what changed and
   why), PR-check diagnosis (or "none needed"), build status, and a plain-English
   recommendation.
2. If `update-docs` changed anything, generate a patch so the human can apply it with one
   command instead of retyping: `git diff > nightly-maintenance-<date>.patch`.
3. `SendUserFile` every artifact from tonight's run: `OVERNIGHT-REPORT-<date>.md`, the
   techdebt report (`.claude/techdebt-reports/techdebt-<date>.md`), the github-sync log
   (`notes/github-sync/<date>.md`), and the patch file if one was generated. Caption
   should name the single most important finding, not just "nightly maintenance done."
4. Send a `PushNotification` summarizing the same top finding in one line, so it's
   visible even without opening the files.
5. Stop. No commit, no push, no branch, no PR, no marker file, no loop. Never touches
   `.claude/todo.md` or `plans/`.

---

## Error Handling

- Any phase failing (build error, tool error, usage-limit signal) → stop that phase; if
  Phase 4 was never reached, just stop — nothing was committed, so there's nothing to
  clean up. Tomorrow night's fire tries again from a fresh clone.
- Never weaken gates: no editing CI/workflow config, no deleting or skipping tests, no
  auto-fixing `[security-scan]` or `[audit]` findings — always surface those instead.
- **Never attempt to route around a `[Modify Shared Resources]` (or similar) permission
  denial** — not via a different tool, a GitHub API call instead of `git`, a smaller
  command, or a later retry. If one occurs, stop that action, note it in the report if
  Phase 4 is reached, and move on.

## Permissions Required

`Bash(*)` (build, git read-only ops, gh read-only ops), `Write`/`Edit` for the ephemeral
checkout, `Skill` for invoking github-sync/techdebt/update-docs. No git write permissions
are needed or used.
