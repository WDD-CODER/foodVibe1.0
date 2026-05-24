---
name: nightly-audit
description: Autonomous nightly codebase audit — scans violation categories, auto-fixes safe items, flags the rest, commits results on an audit branch, and pushes the branch ready for morning review. Never merges to main. Run via /nightly-audit or RemoteTrigger cron.
---

# Skill: nightly-audit

**Trigger:** RemoteTrigger cron (configure in CLAUDE.md), or manual `/nightly-audit`.

**Separation:** This skill is independent of `techdebt`. Do NOT invoke the techdebt skill during a nightly audit run.

> **[PLACEHOLDER]** This skill's scan categories are partially project-specific. After running `/init-repo`, review categories marked `[PROJECT_SPECIFIC]` and adapt them to your framework and domain.

---

## MemPalace Orient (before audit begins)

1. Run `mempalace_search(query="audit violations style code quality", limit=3)` to surface past audit findings and known violation hotspots.
2. If results found → use them to prioritize scan areas and avoid re-flagging resolved issues.
3. If MCP unavailable → skip silently and continue.

---

## Phase 0 — Prerequisites

1. Verify you are on `main`: `git branch --show-current`
   - If not on main: `git checkout main`
2. Verify working tree is clean: `git status --porcelain`
   - If dirty → **ABORT**. Write an abort report to `.claude/reports/audit/YYYY-MM-DD-nightly-audit.md` with the reason, then stop.
3. Pull latest: `git pull origin main`
4. Get today's date in `YYYY-MM-DD` format for all filenames and branch names.

---

## Phase 1 — Create Audit Branch

```bash
git checkout -b audit/YYYY-MM-DD
```

If branch already exists (re-run on same day), delete and recreate:
```bash
git branch -D audit/YYYY-MM-DD
git checkout -b audit/YYYY-MM-DD
```

---

## Phase 2 — Scan Categories

Run all scans. Collect findings into a structured list. **Do not modify any files yet.**

For each finding, record: `{ category, file, line, description, severity, action: "AUTO-FIX" | "FLAG" }`

### Category A — [PROJECT_SPECIFIC] Domain String Violations

Adapt to your project: hardcoded strings that should go through a translation/i18n system, domain-specific vocabulary misuse, etc.

**Response:** FLAG only (severity: Medium)

---

### Category B — Shared Component Duplication [PROJECT_SPECIFIC]

**Scope:** All component directories

**Detection:** Look for components that duplicate functionality already provided by shared/common components. Check for custom modals, spinners, buttons, etc. when shared equivalents exist.

**Response:** FLAG only (severity: Medium)
- Recommend: replace with the matching shared component import

---

### Category C — Theme & Styling Violations

**Scope:** All stylesheet files

#### C1 — Hardcoded colors in stylesheets

**Detection:** Grep for `#[0-9a-fA-F]{3,8}`, `rgb(`, `rgba(`, `hsl(` in component stylesheet files.

**Pre-filter before flagging:**
- Skip CSS custom property definition lines (lines starting with `--`)
- Skip annotated lines containing `intentional` or `no token`

**Auto-fix token map:** `[PROJECT_SPECIFIC]` — fill in your project's design token → CSS variable mapping after `/init-repo`.

**Response:** AUTO-FIX for exact token matches, FLAG for unmatched values.

#### C2 — Inline styles in templates

**Detection:** Grep for `style="` in template files. Skip dynamic bindings.
**Response:** FLAG only (severity: Low-Medium)

#### C3 — Typography overrides in component stylesheets

**Detection:** Grep for `font-size:` and `font-family:` in component stylesheets.
**Response:** FLAG only (severity: Low)

#### C4 — [FRAMEWORK] engine class misuse [PROJECT_SPECIFIC]

**Detection:** Grep for global CSS engine class selectors defined in component stylesheets.
**Response:** FLAG only (severity: Medium)

---

### Category D — Security Flags

**Scope:** All source and template files

**All items are FLAG only. Never auto-fix security code. Severity: HIGH.**

#### D1 — Unsafe HTML injection
**Detection:** Grep for unsafe HTML binding patterns in templates (`[innerHTML]`, `dangerouslySetInnerHTML`, etc.).

#### D2 — Sensitive data in client storage
**Detection:** Grep for `localStorage.setItem`/`getItem` where key/value context suggests `token|auth|jwt|session|password|secret|credential`.

#### D3 — Console logging sensitive data
**Detection:** Grep for `console.(log|info|debug|warn)` near `request|user.|token|password|auth|secret`.

#### D4 — Hardcoded secrets
**Detection:** Grep for `sk-[a-zA-Z0-9]{20,}`, `mongodb+srv://`, `Bearer [a-zA-Z0-9]`, `password\s*[:=]\s*['"][^'"]+['"]`

#### D5 — Non-HTTPS API calls
**Detection:** Grep for `http://` in HTTP client calls. Exclude `localhost` and `127.0.0.1`.

#### D6 — .env secrets exposure
**Detection:** Check if `.env` is NOT listed in `.gitignore`.

---

### Category E — Dead Code & Hygiene

**Scope:** All source files

#### E1 — Unused imports
**Response:** AUTO-FIX — rewrite import lines to remove unused names.

#### E2 — Commented-out code blocks > 5 lines
**Response:** FLAG only (severity: Low)

#### E3 — Console.log in production paths
**Detection:** Grep for `console.log` in source files, excluding test files and logging utilities.
**Response:** AUTO-FIX — remove the `console.log` line.

#### E4 — Empty catch blocks
**Response:** FLAG only (severity: Medium)

---

### Category F — [FRAMEWORK] Convention Drift [PROJECT_SPECIFIC]

Adapt to your framework's conventions. Examples:
- Legacy state management patterns (replace with modern equivalents)
- Deprecated APIs or decorators
- Oversized files (> 300 lines)
- Anti-patterns specific to your framework

**Response:** FLAG only (severity: Medium)

---

## Phase 3 — Write Findings Plan

Write all findings to `.claude/reports/audit/YYYY-MM-DD-plan.md` with counts per category.

Commit the plan:
```bash
git add .claude/reports/audit/YYYY-MM-DD-plan.md
git commit -m "audit(plan): YYYY-MM-DD findings — N issues across X categories"
```

---

## Phase 4 — Execute Auto-Fixes

Apply fixes ONLY for items marked AUTO-FIX. Safety rules:
- Never modify a file you didn't scan
- Never auto-fix anything in Category A, B, or D
- After all fixes, verify no syntax errors were introduced

Commit the fixes:
```bash
git add -A -- ':!.claude/reflect/failure-log.tsv'
git commit -m "audit(fix): YYYY-MM-DD — fixed N/M issues, M flagged for review"
```

---

## Phase 5 — Write Final Report

Write `.claude/reports/audit/YYYY-MM-DD-nightly-audit.md` with:
- Summary counts per category
- Auto-fixed items table
- Flagged items table
- Git references

Commit and push:
```bash
git add .claude/reports/audit/
git commit -m "audit(report): YYYY-MM-DD nightly report"
git push -u origin audit/YYYY-MM-DD
```

**Never merge to main.**

---

## Phase 6 — Report Retention

Move reports older than 30 days to `.claude/reports/audit/archive/`.

---

## Phase 7 — Terminal Summary

```
══════════════════════════════════════════════
  NIGHTLY AUDIT COMPLETE — YYYY-MM-DD
══════════════════════════════════════════════
  Found:      N total issues
  Auto-fixed: X
  Flagged:    Y (need your review)
  Security:   S flags    ← only if S > 0
──────────────────────────────────────────────
  Branch: audit/YYYY-MM-DD  ← pushed, ready to merge
══════════════════════════════════════════════
```
