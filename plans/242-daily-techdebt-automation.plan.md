---
name: Daily Tech Debt Automation
type: brief
owner: Team Leader
status: ready-for-execution
created: 2026-04-07
updated: 2026-04-07
source: https://code.claude.com/docs/en/web-scheduled-tasks
---

# Daily Automated Tech Debt Sweep

## Vision

Every morning at 06:00, a **cloud scheduled task** on Anthropic's infrastructure clones the repo from GitHub, runs a full-project `/techdebt` audit, and pushes results to a `claude/` branch. By the time the developer sits down, a session on claude.ai shows exactly what happened — and a branch is ready to merge.

Over time this creates a **self-healing codebase**: dead code never accumulates, style violations never drift, TODOs never rot, and the trend chart in each report shows debt going down week over week.

---

## How Cloud Scheduled Tasks Work

Based on [Anthropic's official documentation](https://code.claude.com/docs/en/web-scheduled-tasks):

- **Runs on Anthropic's cloud** — your machine can be off, VS Code closed, no session needed
- **Fresh clone every run** — clones the repo from GitHub, starts from the default branch (`main`)
- **Branch restriction** — by default Claude can only push to `claude/` prefixed branches (e.g. `claude/daily-techdebt-2026-04-07`). Enable "Allow unrestricted branch pushes" if you want `chore/` prefixes instead
- **Runs autonomously** — no permission prompts during the run
- **Each run = a session** — visible at claude.ai alongside your other sessions. You can review what Claude did, see changes, and create a PR from there
- **Minimum interval** — 1 hour (not per-minute)
- **MCP connectors** — your connected services (Slack, Linear, etc.) are included by default
- **Environment config** — set up `npm install` as a setup script so dependencies are ready before the scan runs

### Three ways to create

| Method | How |
|--------|-----|
| **Web** | Visit [claude.ai/code/scheduled](https://claude.ai/code/scheduled) → "New scheduled task" |
| **Desktop app** | Schedule page → "New task" → "New remote task" |
| **CLI** | Run `/schedule` in any Claude Code session |

---

## How It Works — End to End

```
06:00 — Cloud scheduled task fires
  │
  ├─ 1. Anthropic clones repo from GitHub (automatic)
  │     Creates branch: claude/daily-techdebt-YYYY-MM-DD (from main)
  │
  ├─ 2. Setup script runs: npm install (configured in environment)
  │
  ├─ 3. Runs /techdebt in full-project mode
  │     Phase 1: Static analysis (dead code, TODOs, style violations)
  │     Phase 2: Logic & complexity pruning (only if Phase 1 finds issues)
  │     Phase 3: Report generation → .claude/techdebt-reports/techdebt-YYYY-MM-DD.md
  │     Phase 4: Breadcrumb sync
  │
  ├─ 4. If fixes were applied:
  │     → Commits to claude/daily-techdebt-YYYY-MM-DD
  │     → Pushes branch to origin
  │     → Report includes what was fixed vs. what needs human decision
  │
  └─ 5. If critical findings (security flags, >300-line components):
        → Marks them in report as BLOCKING — does NOT auto-fix
        → Flags for human review
```

**You arrive at your desk and:**
- Open [claude.ai](https://claude.ai) → see the completed session with full details
- Check GitHub → `claude/daily-techdebt-YYYY-MM-DD` branch is ready for review
- Review the techdebt report, merge if clean, move on

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

### Step 2 — Create Cloud Environment

At [claude.ai](https://claude.ai) → Settings → Environments, create an environment:

| Field | Value |
|-------|-------|
| **Name** | `foodvibe-techdebt` |
| **Setup script** | `npm install` |
| **Network access** | Standard (needed for npm install) |
| **Environment variables** | None required for static analysis |

### Step 3 — Create the Scheduled Task

Use any of the three methods:

**Option A — Web (recommended):**
1. Go to [claude.ai/code/scheduled](https://claude.ai/code/scheduled)
2. Click "New scheduled task"
3. Fill in:

| Field | Value |
|-------|-------|
| **Name** | `Daily Techdebt Sweep` |
| **Repository** | `WDD-CODER/foodVibe1.0` |
| **Environment** | `foodvibe-techdebt` |
| **Schedule** | Daily at 06:00 |

4. **Prompt:**

> Run a full-project /techdebt audit on all of `src/app/`.
> If Phase 1 finds security flags → invoke Security Officer to review.
> If Phase 2 applies logic changes → invoke QA Engineer to verify + run `ng build`.
> Commit all changes with message: "chore: daily techdebt sweep YYYY-MM-DD".
> Push the branch to origin.

5. Remove any MCP connectors that aren't needed
6. Click "Create"

**Option B — CLI:**
```
/schedule daily techdebt sweep at 6am
```

**Option C — Desktop app:**
Schedule page → "New task" → "New remote task" → same config as Option A

### Step 4 — Verify First Run

Next morning, check:
- [ ] New session visible at [claude.ai](https://claude.ai) showing the completed run
- [ ] `claude/daily-techdebt-YYYY-MM-DD` branch exists on GitHub
- [ ] `.claude/techdebt-reports/techdebt-YYYY-MM-DD.md` exists in that branch
- [ ] `ng build` passes on that branch
- [ ] Report Trend section compares against previous reports

You can also click "Run now" on the task's detail page to test immediately.

### Step 5 — Wire Into Session Start

Add to the `github-sync` daily check: "If a `claude/daily-techdebt-*` branch exists for today → notify the user: 'Daily techdebt sweep completed. Branch ready for review.'"

---

## Success Criteria

- [ ] Cloud scheduled task is created and visible at claude.ai/code/scheduled
- [ ] First run produces a valid techdebt report
- [ ] Auto-fixes compile cleanly (`ng build` passes)
- [ ] Security flags are never auto-fixed — only reported
- [ ] Branch uses `claude/` prefix (default cloud behavior)
- [ ] Report Trend section accurately compares last 7 days

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Auto-fix introduces regression | QA Engineer gate + `ng build` must pass before commit |
| Schedule fails silently | Check claude.ai session list — each run creates a visible session. Also check `.claude/techdebt-reports/` for today's report |
| Branch naming conflict | Cloud tasks auto-prefix with `claude/` — unique per day via date suffix |
| Conflicts with active development | Runs on fresh clone from `main` — never touches feature branches |
| Over-aggressive auto-fix | Phase 2 only triggers when Phase 1 finds issues; security flags never auto-fixed |
| npm install fails in cloud | Configure setup script in the environment; test with "Run now" before relying on the schedule |
| `/schedule` unavailable | Fallback: run `/techdebt` manually as part of morning session-start routine |

---

## References

- [Cloud scheduled tasks documentation](https://code.claude.com/docs/en/web-scheduled-tasks)
- [Session-scoped scheduling (/loop)](https://code.claude.com/docs/en/scheduled-tasks)
- [Desktop scheduled tasks](https://code.claude.com/docs/en/desktop-scheduled-tasks)
