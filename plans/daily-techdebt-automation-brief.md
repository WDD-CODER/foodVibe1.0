---
name: Daily Tech Debt Automation
type: brief
owner: Team Leader
status: ready-for-execution
created: 2026-04-07
---

# Daily Automated Tech Debt Sweep

## Vision

Every morning at 06:00, a **scheduled Claude Code agent** runs a full-project `/techdebt` audit on a **fresh cloud clone** of the repo. By the time the developer sits down, a clean report is waiting — either "all clear" or a ready-to-merge branch with fixes applied.

Over time this creates a **self-healing codebase**: dead code never accumulates, style violations never drift, TODOs never rot, and the trend chart in each report shows debt going down week over week.

---

## How It Works — End to End

```
06:00 — Scheduled trigger fires (Claude Code /schedule)
  │
  ├─ 1. Anthropic's cloud clones the repo from GitHub (automatic)
  │     Creates branch: chore/daily-techdebt-YYYY-MM-DD (from main)
  │
  ├─ 2. Runs /techdebt in full-project mode
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
  └─ 4. If critical findings (security flags, >300-line components):
        → Marks them in report as BLOCKING — does NOT auto-fix
        → Flags for human review
```

**No worktree needed** — the scheduled agent runs on Anthropic's cloud with a fresh clone. Your local machine and VS Code don't need to be open.

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

## Task Force

### Sizing: Small (2 agents at gates only)

| Agent | Role | When invoked |
|-------|------|-------------|
| **QA Engineer** | Verify auto-fixes don't break build; validate report accuracy | After Phase 2, only if logic changes were applied |
| **Security Officer** | Review security flags; confirm nothing was auto-fixed that shouldn't be | After Phase 1, only if security flags > 0 |

> `/techdebt` Phases 1–4 run autonomously. Agents are only invoked at verification gates — not for the scan itself.

### Coordination Flow

```
/techdebt runs autonomously
    │
    ├─ Phase 1 complete → security flags found?
    │   └─ YES → Security Officer reviews (see gate instructions below)
    │
    ├─ Phase 2 complete → logic changes applied?
    │   └─ YES → QA Engineer verifies (see gate instructions below)
    │
    ├─ Phase 3 → Report written
    │
    └─ Phase 4 → Docs synced → Commit → Push
```

Security + QA gates can run **in parallel** when both are triggered.

---

## Agent Gate Instructions

### QA Engineer Gate

**Trigger:** Phase 2 applied logic changes (signal migration, component splits, dead code removal touching logic).

**Tasks:**
1. **Build verification** — run `ng build`. Build fails → report to Team Leader, do NOT attempt to fix.
2. **Report accuracy** — read the techdebt report's Detailed Findings. Verify dead code items are truly unused (quick grep). Verify `@Input()` → `input()` migrations didn't break template bindings.
3. **Regression spot-check** — if signal migrations were applied: check `.subscribe()` calls were also converted, `async` pipes replaced with signal reads. Run existing `.spec.ts` for affected components.
4. **Sign-off:**
```
## QA Gate — Daily Techdebt Sweep
- Build: PASS / FAIL
- Report accuracy: VERIFIED / ISSUES FOUND
- Regression check: CLEAR / FLAGGED [details]
- Recommendation: APPROVE COMMIT / BLOCK — [reason]
```

**Do NOT:** fix issues (only report), write new specs, or modify files.

**Model guidance:** Haiku for build + grep checks. Sonnet for signal migration verification.

---

### Security Officer Gate

**Trigger:** Phase 1 detected security flags (temp auth bypasses, hardcoded keys, exposed tokens, `bypassSecurityTrust*`).

**Tasks:**
1. **Verify each finding** — read the actual file and line from the report's Security Flags section. Classify: CRITICAL (blocks merge) / WARNING (note for developer) / FALSE POSITIVE (dismiss).
2. **Confirm nothing was auto-fixed** — run `git diff` and scan for changes to: `auth.guard.ts`, `auth.interceptor.ts`, `auth-crypto.ts`, `user.service.ts`, anything touching `localStorage`/`sessionStorage`, `bypassSecurityTrust*`, `[innerHTML]`. If security code WAS modified → **BLOCK immediately**.
3. **Sign-off:**
```
## Security Gate — Daily Techdebt Sweep
- Findings reviewed: [count]
- CRITICAL: [count] — [list with file:line]
- WARNING: [count] — [list with file:line]
- FALSE POSITIVE: [count] — [dismissed items]
- Auto-fix touched security code: YES (BLOCKED) / NO (CLEAR)
- Recommendation: APPROVE COMMIT / BLOCK — [reason]
```

**Do NOT:** fix security issues (only flag them), run full `/cso` audit, or modify files.

**Model guidance:** Sonnet for all phases (security requires high reasoning).

---

## Implementation Steps

### Step 1 — Test Run (do this first)

Run `/techdebt` manually in full-project mode. Verify the report at `.claude/techdebt-reports/techdebt-YYYY-MM-DD.md` is well-formed with Summary, Detailed Findings, and Trend sections.

### Step 2 — Schedule Configuration

From Claude Code (local or web), run `/schedule` with:

| Field | Value |
|-------|-------|
| **Name** | `daily-techdebt-sweep` |
| **Cron** | `0 6 * * *` (daily at 06:00) |

**Agent prompt for the scheduled task:**

> 1. Create branch `chore/daily-techdebt-YYYY-MM-DD` from main
> 2. Run `/techdebt` in full-project mode (scope: all of `src/app/`)
> 3. If Phase 1 finds security flags → invoke Security Officer to review
> 4. If Phase 2 applies logic changes → invoke QA Engineer to verify + run `ng build`
> 5. Commit all changes with message: "chore: daily techdebt sweep YYYY-MM-DD"
> 6. Push the branch to origin

### Step 3 — Verify First Automated Run

Next morning:
- [ ] `.claude/techdebt-reports/techdebt-YYYY-MM-DD.md` exists with today's date
- [ ] `chore/daily-techdebt-YYYY-MM-DD` branch exists on origin (if fixes were needed)
- [ ] `ng build` passes on that branch
- [ ] Report Trend section compares against previous reports

### Step 4 — Wire Into Session Start

Add to the `github-sync` daily check: "If a `chore/daily-techdebt-*` branch exists for today → notify the user: 'Daily techdebt sweep completed. Branch ready for review.'"

---

## Success Criteria

- [ ] `/schedule` trigger is configured and confirmed active
- [ ] First automated run produces a valid report
- [ ] Auto-fixes compile cleanly (`ng build` passes)
- [ ] Security flags are never auto-fixed — only reported
- [ ] Report Trend section accurately compares last 7 days

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Auto-fix introduces regression | QA Engineer gate + `ng build` must pass before commit |
| Schedule fails silently | Check `.claude/techdebt-reports/` — if today's report is missing, the run failed |
| Conflicts with active development | Runs on fresh clone from `main` — never touches feature branches |
| Over-aggressive auto-fix | Phase 2 only triggers when Phase 1 finds issues; security flags never auto-fixed |
| `/schedule` unavailable | Fallback: run `/techdebt` manually as part of morning session-start routine |
