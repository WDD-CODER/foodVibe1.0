---
name: Daily Tech Debt Automation — Executive Brief
type: executive-brief
owner: Team Leader
status: ready-for-execution
created: 2026-04-07
---

# Daily Automated Tech Debt Sweep

## Vision

Every morning at 06:00, before the developer sits down, a **scheduled Claude Code agent** runs a full-project `/techdebt` audit on an **isolated worktree**. By the time work begins, a clean report is waiting — either "all clear" or a ready-to-merge branch with fixes applied.

Over time this creates a **self-healing codebase**: dead code never accumulates, style violations never drift, TODOs never rot, and the trend chart in each report shows debt going down week over week.

---

## How It Works — End to End

```
06:00 — Scheduled trigger fires (Claude Code /schedule)
  │
  ├─ 1. Creates isolated worktree: ../foodVibe1.0-wt-daily-techdebt
  │     Branch: chore/daily-techdebt-YYYY-MM-DD (from main)
  │
  ├─ 2. Runs /techdebt in full-project mode on the worktree
  │     Phase 1: Static analysis (dead code, TODOs, style violations)
  │     Phase 2: Logic & complexity pruning (only if Phase 1 finds issues)
  │     Phase 3: Report generation → .claude/techdebt-reports/techdebt-YYYY-MM-DD.md
  │     Phase 4: Breadcrumb sync
  │
  ├─ 3. If fixes were applied:
  │     → Commits to chore/daily-techdebt-YYYY-MM-DD
  │     → Pushes branch to origin
  │     → Report includes what was fixed vs. what needs human decision
  │
  ├─ 4. If critical findings (security flags, >300-line components):
  │     → Marks them in report as BLOCKING — does NOT auto-fix
  │     → Flags for human review
  │
  └─ 5. Cleans up worktree after completion
```

**You arrive at your desk and see:**
- A fresh techdebt report in `.claude/techdebt-reports/`
- A branch with safe auto-fixes ready to merge (if any)
- A clear list of anything that needs your judgment

---

## What Gets Checked Daily

| Category | Auto-fixable? | Examples |
|----------|--------------|---------|
| Unused imports | Yes | `import { X } from '...'` where X is never used |
| Dead code | Yes | Commented-out blocks, unreachable code |
| Style violations | Yes | `@Input()` → `input()`, `BehaviorSubject` → `signal()`, semicolons, `any` types |
| TODO/FIXME inventory | Report only | Categorized by urgency (critical / nice-to-have) |
| Refactor candidates | Report only | Components/services exceeding 300 lines |
| Security flags | BLOCKING | Temp auth bypasses, hardcoded keys — never auto-fixed |

---

## Implementation Requirements

### 1. Schedule Setup (one-time)

Run from Claude Code desktop (local machine):

```
/schedule
```

Configure:
- **Cron**: `0 6 * * *` (daily at 06:00)
- **Task**: Execute the Daily Techdebt Sweep skill (see operational brief below)
- **Isolation**: Run on dedicated worktree
- **Branch pattern**: `chore/daily-techdebt-YYYY-MM-DD`
- **Cleanup**: Remove worktree after completion

### 2. Worktree Strategy

- Uses `/worktree-setup` to create `../foodVibe1.0-wt-daily-techdebt`
- Branches from `main` every run (always audits latest merged code)
- Worktree is destroyed after the run — no stale worktrees accumulate
- Port allocation: not needed (no dev server required for static analysis)

### 3. Report Retention

Already built into `/techdebt` — rolling 7-report archive. The daily run naturally fills this: you always have the last week of audits for trend comparison.

### 4. QA Verification

When Phase 2 applies logic changes (signal migration, component splits):
- QA Engineer is invoked automatically per the techdebt completion gate
- `ng build` must pass before committing

---

## Team Leader Delegation Plan

### Task Sizing: Small (2 agents)

| Agent | Role | Phase |
|-------|------|-------|
| **QA Engineer** | Verify auto-fixes don't break tests; run `ng build`; validate report accuracy | After Phase 2 |
| **Security Officer** | Review any security flags found; confirm no false positives | After Phase 1 (only if security flags detected) |

> Team Leader does NOT need to spin up a full team for this. The `/techdebt` skill handles Phases 1-4 autonomously. Agents are only invoked at gates.

### Coordination Flow

```
/techdebt runs autonomously
    │
    ├─ Phase 1 complete → security flags found?
    │   └─ YES → Security Officer reviews (Sonnet)
    │
    ├─ Phase 2 complete → logic changes applied?
    │   └─ YES → QA Engineer verifies (Sonnet for analysis, Haiku for build check)
    │
    ├─ Phase 3 → Report written
    │
    └─ Phase 4 → Docs synced → Commit → Push → Worktree cleanup
```

---

## Success Criteria

1. Every weekday morning, a fresh `techdebt-YYYY-MM-DD.md` report exists
2. Safe auto-fixes are on a branch ready to merge — zero manual effort for routine cleanup
3. Security flags are never auto-fixed — always flagged for human review
4. The Trend section shows debt decreasing or stable over 7-day windows
5. `ng build` passes on every auto-fix branch (enforced by QA gate)
6. No worktree debris left behind after runs

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Auto-fix introduces regression | QA Engineer gate + `ng build` must pass before commit |
| Schedule fails silently | Check `.claude/techdebt-reports/` — if today's report is missing, the run failed. Add a note to session-start to verify. |
| Worktree not cleaned up | `/worktree-setup` prunes stale refs at start; add `git worktree prune` to the scheduled task's cleanup step |
| Conflicts with active development | Runs on isolated worktree from `main` — never touches feature branches |
| Over-aggressive auto-fix | Phase 2 only triggers when Phase 1 finds issues; security flags are never auto-fixed |

---

## How to Execute This Brief

**Step 1 — Test manually first:**
```
Run /techdebt in full-project mode on current branch.
Review the report. Confirm the output quality is what you want daily.
```

**Step 2 — Set up the schedule:**
```
/schedule
> Run /techdebt full-project mode daily at 06:00 on isolated worktree.
> Branch: chore/daily-techdebt-YYYY-MM-DD from main.
> Commit fixes, push branch, cleanup worktree.
```

**Step 3 — Verify first automated run:**
```
Next morning: check .claude/techdebt-reports/ for today's report.
Check GitHub for the chore/daily-techdebt-YYYY-MM-DD branch.
Review, merge if clean.
```

**Step 4 — Make it part of session-start:**
Add to the daily github-sync check: "If today's techdebt branch exists, review and merge."
