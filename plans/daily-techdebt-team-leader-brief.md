---
name: "Daily Techdebt Sweep — Team Leader Brief"
type: team-leader-brief
parent: daily-techdebt-automation-brief.md
status: ready-for-execution
created: 2026-04-07
---

## Task Analysis

**What:** Set up a daily automated `/techdebt` sweep that runs at 06:00 on an isolated worktree, producing a report and a ready-to-merge branch with safe auto-fixes.

**Domains involved:** Build infrastructure, CI/CD scheduling, git worktree management, static analysis, QA verification.

**Subsystems affected:** None — this is pure infrastructure. Zero changes to `src/`.

**Complexity:** Small — the `/techdebt` skill already does the heavy lifting. This task is wiring it to run unattended.

---

## Recommended Task Force

### Size: Small (2 agents at gates only)

1. **QA Engineer**: Validate that auto-fixes from `/techdebt` Phase 2 don't break the build. Run `ng build`, verify report accuracy. Invoked **only when Phase 2 applies logic changes**.

2. **Security Officer**: Review security flags surfaced by `/techdebt` Phase 1. Confirm no false positives, verify nothing was auto-fixed that shouldn't have been. Invoked **only when security flags are detected**.

> `/techdebt` Phases 1–4 run autonomously. You do NOT need to orchestrate the scan itself — only the verification gates.

---

## Coordination Plan

### Sequence

```
Step 1: Setup /schedule trigger          ← You (Team Leader)
Step 2: /techdebt runs autonomously      ← Scheduled agent
Step 3: Security gate (if flags found)   ← Security Officer
Step 4: QA gate (if logic changes made)  ← QA Engineer
Step 5: Commit + push + worktree cleanup ← Scheduled agent
```

### Dependencies

- Step 3 depends on Phase 1 output — only fires if security flags > 0
- Step 4 depends on Phase 2 output — only fires if logic changes were applied
- Step 5 depends on Steps 3 + 4 passing (if invoked)
- Steps 3 and 4 can run **in parallel** when both are triggered

### Plan file

`plans/daily-techdebt-automation-brief.md` — full executive context

---

## Execution Steps

### Step 1 — Test Run (do this first)

Run `/techdebt` manually in full-project mode on the current branch. This verifies the skill works and produces the expected report format.

**Expected output:** A report at `.claude/techdebt-reports/techdebt-2026-04-07.md` with Summary, Detailed Findings, and Trend sections.

### Step 2 — Schedule Configuration

From Claude Code desktop, run:

```
/schedule
```

Provide this configuration:

| Field | Value |
|-------|-------|
| **Name** | `daily-techdebt-sweep` |
| **Cron** | `0 6 * * *` |
| **Task description** | See the agent prompt below |
| **Isolation** | Worktree |

**Agent prompt for the scheduled task:**

> Run a full-project /techdebt audit. Before starting:
> 1. Create worktree: `git worktree add -b chore/daily-techdebt-$(date +%Y-%m-%d) ../foodVibe1.0-wt-daily-techdebt main`
> 2. Run `npm install` in the worktree
> 3. Execute /techdebt in full-project mode (scope: all of src/app/)
> 4. If Phase 1 finds security flags → invoke Security Officer to review
> 5. If Phase 2 applies logic changes → invoke QA Engineer to verify + run `ng build`
> 6. Commit all changes to the chore/ branch with message: "chore: daily techdebt sweep YYYY-MM-DD"
> 7. Push the branch to origin
> 8. Remove the worktree: `git worktree remove ../foodVibe1.0-wt-daily-techdebt`
> 9. Run `git worktree prune`

### Step 3 — Verify First Automated Run

Next morning after setup:
- [ ] `.claude/techdebt-reports/techdebt-YYYY-MM-DD.md` exists with today's date
- [ ] `chore/daily-techdebt-YYYY-MM-DD` branch exists on origin (if fixes were needed)
- [ ] `ng build` passes on that branch
- [ ] No stale worktree left at `../foodVibe1.0-wt-daily-techdebt`
- [ ] Report Trend section compares against previous reports

### Step 4 — Wire Into Session Start

Add to the `github-sync` skill's daily check:

> "If a `chore/daily-techdebt-*` branch exists for today → notify the user: 'Daily techdebt sweep completed. Branch ready for review.'"

---

## Success Criteria

- [ ] `/schedule` trigger is configured and confirmed active
- [ ] First automated run produces a valid report
- [ ] Auto-fixes compile cleanly (`ng build` passes)
- [ ] Security flags are never auto-fixed — only reported
- [ ] Worktree is created and destroyed cleanly each run
- [ ] Report Trend section accurately compares last 7 days

---

## Risks

| Risk | Mitigation |
|------|-----------|
| `/schedule` not available (cloud connection needed) | Retry later; fallback: run `/techdebt` manually as part of morning session-start routine |
| Auto-fix breaks build | QA gate catches this — `ng build` must pass before commit |
| Worktree not cleaned up | Scheduled task includes explicit `git worktree remove` + `git worktree prune` |
| Report overwrites same-day manual run | By design — `/techdebt` overwrites same-day reports, so manual + scheduled on same day is safe |
| Main branch has merge conflicts with techdebt branch | Branch is ephemeral — if it conflicts, discard and wait for next day's clean run |
