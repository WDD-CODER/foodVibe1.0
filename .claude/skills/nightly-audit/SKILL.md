---
name: nightly-audit
description: Autonomous nightly codebase audit — scans 6 violation categories, auto-fixes safe items, flags the rest, commits results on an audit branch, merges to main, and writes a report. Run via /nightly-audit or RemoteTrigger cron.
---

# Skill: nightly-audit

**Trigger:** RemoteTrigger cron at 22:57 UTC (01:57 Israel time), or manual `/nightly-audit`.

**Separation:** This skill is independent of `techdebt`. Do NOT invoke the techdebt skill during a nightly audit run.

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

## Phase 2 — Scan All 6 Categories

Run all scans. Collect findings into a structured list. **Do not modify any files yet.**

For each finding, record: `{ category, file, line, description, severity, action: "AUTO-FIX" | "FLAG" }`

### Category A — Hardcoded Hebrew Strings

**Scope:** `src/app/**/*.html`, `src/app/**/*.component.ts`
**Exclude:** `**/dictionary.json`, `**/translation.service.ts`, `**/*.spec.ts`, `**/*.model.ts`

**Detection:** Grep for Unicode Hebrew range `[\u0590-\u05FF]`

**Response:** FLAG only (severity: Medium)
- Cannot safely create translation keys unattended
- Recommend: extract string, create key in dictionary.json, wire through TranslationService.translate() or translatePipe

---

### Category B — Shared Component Duplication

**Scope:** All component directories under `src/app/pages/**/components/` and `src/app/core/components/`

**Known shared components (32):**
add-equipment-modal, add-item-modal, ai-recipe-modal, approve-stamp, carousel-header, cell-carousel, change-popover, chip-search-dropdown, confirm-modal, counter, custom-multi-select, custom-select, empty-state, export-preview, export-toolbar-overlay, floating-info-container, global-specific-modal, label-creation-modal, list-selection, list-shell, loader, quick-add-product-modal, quick-edit-product-modal, quick-edit-product-panel, restore-choice-modal, scaling-chip, scrollable-dropdown, selection-bar, supplier-modal, translation-key-modal, unit-creator, version-history-panel

**Detection:** For each non-shared component directory, check if its name contains a substring that matches a shared component (e.g., a page-level "confirm-dialog" that duplicates "confirm-modal"). Also flag components whose template contains patterns like custom spinners, custom modals, or custom buttons when shared equivalents exist.

**Response:** FLAG only (severity: Medium)
- Recommend: replace with the matching shared component import

---

### Category C — Theme & Styling Violations

**Scope:** `src/app/**/*.scss` (exclude `src/styles.scss`), `src/app/**/*.html`

#### C1 — Hardcoded colors in SCSS

**Detection:** Grep for `#[0-9a-fA-F]{3,8}`, `rgb(`, `rgba(`, `hsl(` in component `.scss` files.

**Auto-fix token map (exact hex → CSS variable):**

| Hex | Variable | Context |
|---|---|---|
| `#f0f4f8` | `var(--bg-body)` | any |
| `#ffffff` | `var(--bg-pure)` | background/background-color property |
| `#ffffff` | `var(--color-text-on-primary)` | color property |
| `#0f172a` | `var(--color-text-main)` | any |
| `#1e293b` | `var(--color-text-secondary)` | any |
| `#64748b` | `var(--color-text-muted)` | any |
| `#94a3b8` | `var(--color-text-muted-light)` | any |
| `#14b8a6` | `var(--color-primary)` | any |
| `#0d9488` | `var(--color-primary-hover)` | any |
| `#a0833f` | `var(--color-accent-gold)` | any |
| `#10b981` | `var(--color-success)` | any |
| `#166534` | `var(--text-success)` | any |
| `#92400e` | `var(--text-warning)` | any |
| `#d97706` | `var(--color-warning)` | any |
| `#b45309` | `var(--color-warning-hover)` | any |
| `#f59e0b` | `var(--border-warning)` | any |
| `#dc2626` | `var(--color-danger)` | any |
| `#b91c1c` | `var(--color-danger-hover)` | any |

**Rules:**
- If hex matches a token exactly AND context is unambiguous → **AUTO-FIX**
- If hex is `#ffffff` → check CSS property: `background`/`background-color` → `var(--bg-pure)`, `color` → `var(--color-text-on-primary)`. If property unclear → **FLAG**
- If hex has no exact token match → **FLAG**
- All `rgb(`, `rgba(`, `hsl(` → **FLAG** (too complex for automated matching)

#### C2 — Inline styles in HTML

**Detection:** Grep for `style="` in `.html` files.
**Response:** FLAG only (severity: Low-Medium)
- Exception: `[style.*]=` dynamic bindings are acceptable — skip those

#### C3 — Font overrides in component SCSS

**Detection:** Grep for `font-size:` and `font-family:` in component `.scss` files.
**Response:** FLAG only (severity: Low)
- These override the global Heebo typography system

#### C4 — Engine class misuse

**Detection:** Grep for `.c-` class selectors defined or extended in component `.scss` files.
**Response:** FLAG only (severity: Medium)
- `.c-*` engine classes belong exclusively in `src/styles.scss`

---

### Category D — Security Flags

**Scope:** All `src/**/*.ts`, `src/**/*.html`, project root

**All items are FLAG only. Never auto-fix security code. Severity: HIGH.**

#### D1 — innerHTML bindings
**Detection:** Grep for `[innerHTML]` in `.html` files.

#### D2 — localStorage with sensitive data
**Detection:** Grep for `localStorage\.(set|get)Item` where the key or value context matches `token|auth|jwt|session|password|secret|credential`.

#### D3 — Console logging sensitive data
**Detection:** Grep for `console\.(log|info|debug|warn)` in `.ts` files where the same line or next line references `request|req\.|user\.|token|password|auth|secret`.
**Exclude:** `logging.service.ts`, `*.spec.ts`

#### D4 — Hardcoded secrets
**Detection:** Grep for patterns:
- `sk-[a-zA-Z0-9]{20,}` (API keys)
- `mongodb\+srv://` (connection strings with credentials)
- `Bearer [a-zA-Z0-9]` (hardcoded bearer tokens)
- `password\s*[:=]\s*['"][^'"]+['"]` (hardcoded passwords)
- `secret\s*[:=]\s*['"][^'"]+['"]` (hardcoded secrets)
**Exclude:** `.env` files (checked separately), `*.spec.ts`

#### D5 — Non-HTTPS API calls
**Detection:** Grep for `http://` in HTTP client calls (HttpClient, fetch). Exclude `localhost` and `127.0.0.1`.

#### D6 — .env secrets exposure
**Detection:** Check if `.env` exists in project root AND is NOT listed in `.gitignore`.
Also check if `.env` contains patterns: `URI=`, `KEY=`, `SECRET=`, `PASSWORD=`.

---

### Category E — Dead Code & Hygiene

**Scope:** `src/app/**/*.ts`
**Exclude:** `*.spec.ts` for auto-fix actions

#### E1 — Unused imports
**Detection:** For each TypeScript file, parse `import { A, B, C } from '...'` lines. For each imported name, check if `\bName\b` appears in the file body (excluding the import line itself). If not → unused.
**Response:** AUTO-FIX — rewrite the import line to remove unused names. If all names unused, remove the entire import line.

#### E2 — Commented-out code blocks > 5 lines
**Detection:** Find 5+ consecutive lines starting with `//` (excluding file headers and license blocks). Also find `/* ... */` blocks spanning 5+ lines that contain code-like patterns (function calls, variable declarations, etc.).
**Response:** FLAG only (severity: Low) — developer may have left intentionally.

#### E3 — Console.log in production paths
**Detection:** Grep for `console\.log` in `.ts` files.
**Exclude:** `logging.service.ts`, `*.spec.ts`, `*.spec.ts` files, lines inside `catch` blocks or error handlers.
**Response:** AUTO-FIX — remove the `console.log` line.

#### E4 — Empty catch blocks
**Detection:** Grep for `catch\s*\([^)]*\)\s*\{\s*\}` (catch with empty body).
**Response:** FLAG only (severity: Medium) — may need proper error handling.

---

### Category F — Angular Convention Drift

**Scope:** `src/app/**/*.ts`
**Exclude:** `*.spec.ts`

#### F1 — Legacy decorators
**Detection:** Grep for `@Input\(\)` and `@Output\(\)` in component/directive `.ts` files.
**Response:** FLAG only (severity: Medium)
- Recommend: migrate to `input()`, `output()`, `model()` signal-based API

#### F2 — BehaviorSubject
**Detection:** Grep for `BehaviorSubject` in `.ts` files.
**Response:** FLAG only (severity: Medium)
- Recommend: migrate to `signal()` with `WritableSignal`

#### F3 — Manual subscriptions in components
**Detection:** Grep for `.subscribe(` in `*.component.ts` files.
**Response:** FLAG only (severity: Low-Medium)
- Recommend: use `toSignal()`, `effect()`, or async pipe

#### F4 — Oversized files
**Detection:** Count lines in each `.ts` and `.component.ts` file. Flag if > 300 lines.
**Response:** FLAG only (severity: Medium)
- Report file name, line count, and suggest extraction/split strategy

#### F5 — Trailing semicolons
**Detection:** Grep for `;\s*$` (semicolons at end of lines) in `src/app/**/*.ts` files.

**Auto-fix rules:**
- Count semicolons per file
- If file has **≤ 20 semicolons** → AUTO-FIX: remove trailing semicolons
- If file has **> 20 semicolons** → FLAG only (too many for safe unattended bulk removal)
- **Preserve:** semicolons inside `for(;;)` loops (mid-line, not matched by `;\s*$`)
- **Preserve:** semicolons inside string literals
- **Preserve:** semicolons in `src/main.ts`, `src/app/app.config.ts`, `src/app/app.routes.ts` (Angular bootstrap files where semicolons may be required by tooling)

---

## Phase 3 — Write Findings Plan

Write all findings to `.claude/reports/audit/YYYY-MM-DD-plan.md`:

```markdown
# Audit Plan — YYYY-MM-DD

## Findings Summary
Total: N issues across X categories
Auto-fix candidates: M
Flag-only: F

## Category A — Hebrew Strings
[list each finding: file, line, text excerpt]

## Category B — Shared Component Duplication
[list each finding]

## Category C — Styling Violations
[list each finding, mark AUTO-FIX or FLAG]

## Category D — Security Flags
[list each finding]

## Category E — Dead Code
[list each finding, mark AUTO-FIX or FLAG]

## Category F — Angular Convention Drift
[list each finding, mark AUTO-FIX or FLAG]
```

Commit the plan:
```bash
git add .claude/reports/audit/YYYY-MM-DD-plan.md
git commit -m "audit(plan): YYYY-MM-DD findings — N issues across X categories"
```

---

## Phase 4 — Execute Auto-Fixes

Apply fixes ONLY for items marked AUTO-FIX in Phase 2. Categories that auto-fix:
- **C1:** Replace exact hex matches with CSS variable tokens
- **E1:** Remove unused imports
- **E3:** Remove console.log lines (non-error paths)
- **F5:** Remove trailing semicolons (files with ≤ 20 only)

**Safety rules:**
- Never modify a file you didn't scan
- Never auto-fix anything in Category A, B, or D
- If an auto-fix would break the line structure (e.g., removing an import that's the only one), clean up the empty import statement
- After all fixes, verify no syntax errors were introduced by reading modified files

Commit the fixes:
```bash
git add -A
git commit -m "audit(fix): YYYY-MM-DD — fixed N/M issues, M flagged for review"
```

If no auto-fixes were applied, skip this commit.

---

## Phase 5 — Merge to Main

```bash
git checkout main
git merge --ff-only audit/YYYY-MM-DD
```

If fast-forward fails:
```bash
git merge --no-ff audit/YYYY-MM-DD -m "audit(merge): YYYY-MM-DD nightly audit"
```

If merge conflicts exist → **ABORT**. Leave audit branch intact. Write abort report.

---

## Phase 6 — Write Final Report

1. Copy `.claude/reports/audit/TEMPLATE.md` to `.claude/reports/audit/YYYY-MM-DD-nightly-audit.md`
2. Replace all placeholders with actual counts and data from Phase 2
3. Populate the **Auto-fixed Items** table with every fix applied in Phase 4
4. Populate the **Flagged for Manual Review** table with every FLAG item
5. Fill in **Git Reference** with actual commit hashes
6. Populate the **Trend** section by reading the last 7 reports in the folder, extracting their Summary tables, and comparing totals with direction arrows

Commit the report:
```bash
git add .claude/reports/audit/YYYY-MM-DD-nightly-audit.md
git commit -m "audit(report): YYYY-MM-DD nightly report"
```

---

## Phase 7 — Report Retention

1. List all `*-nightly-audit.md` files in `.claude/reports/audit/`
2. Parse dates from filenames
3. Any report older than 30 days → `git mv` to `.claude/reports/audit/archive/`
4. If any files moved, commit: `audit(archive): move reports older than 30 days`

---

## Phase 8 — Terminal Summary

Output to terminal:

```
══════════════════════════════════════════════
  NIGHTLY AUDIT COMPLETE — YYYY-MM-DD
══════════════════════════════════════════════
  Found:      N total issues
  Auto-fixed: X
  Flagged:    Y (need your review)
  Security:   S flags    ← only if S > 0
──────────────────────────────────────────────
  Report: .claude/reports/audit/YYYY-MM-DD-nightly-audit.md
  Branch: audit/YYYY-MM-DD
  Run /audit-report to see full details.
══════════════════════════════════════════════
```

---

## Abort Report Format

If the audit aborts at any phase, write this to `.claude/reports/audit/YYYY-MM-DD-nightly-audit.md`:

```markdown
# Nightly Audit — YYYY-MM-DD — ABORTED

## Failure
- **Phase:** [phase number and name]
- **Reason:** [what went wrong]
- **Branch:** audit/YYYY-MM-DD (preserved for debugging)

## Recovery
1. Check the audit branch for partial work
2. Resolve the issue (dirty tree, merge conflict, etc.)
3. Re-run /nightly-audit
```

Commit abort report on main (if possible) or leave uncommitted with a terminal warning.
