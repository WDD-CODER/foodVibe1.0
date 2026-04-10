---
name: nightly-audit
description: Autonomous nightly code audit — 6 categories, detection patterns, auto-fix rules, git protocol, report generation
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# Nightly Code Audit — Skill Definition

Autonomous audit that scans the full codebase for 6 categories of violations, auto-fixes what's safe, flags the rest, commits to an audit branch, merges to main, and writes a report.

**DO NOT** modify the existing techdebt system (`.claude/skills/techdebt/SKILL.md`). They are separate.

---

## Pre-flight

1. Determine today's date: `YYYY-MM-DD`
2. Set `AUDIT_BRANCH=audit/YYYY-MM-DD`
3. Set `REPORT_PATH=.claude/reports/audit/YYYY-MM-DD-nightly-audit.md`

---

## Git Safety Protocol

Execute these 9 steps in order. If any step fails, abort and write a failure report.

### Step 1 — Verify clean state
```bash
git status --porcelain
```
If output is non-empty → **ABORT**. Write failure report: "Working tree is dirty. Cannot run nightly audit."

### Step 2 — Create audit branch
```bash
git checkout main
git pull origin main
git checkout -b audit/YYYY-MM-DD
```
If branch already exists → append `-2`, `-3`, etc.

### Step 3 — Run all 6 scan categories
Execute each category (A–F) below. Collect all findings into a structured plan. **No file modifications yet.**

### Step 4 — Commit the findings plan
Write findings to `.claude/reports/audit/YYYY-MM-DD-findings.md`
```bash
git add .claude/reports/audit/YYYY-MM-DD-findings.md
git commit -m "audit(plan): YYYY-MM-DD findings — N issues across X categories"
```

### Step 5 — Execute auto-fixes
Apply all AUTO-FIX actions (Categories C, E, F only — per rules below).

### Step 6 — Commit the fixes
```bash
git add -A
git commit -m "audit(fix): YYYY-MM-DD — fixed N/M issues, M flagged for review"
```
If no auto-fixes were applied, skip this step.

### Step 7 — Merge to main
```bash
git checkout main
git merge --ff-only audit/YYYY-MM-DD
```
If `--ff-only` fails → try `git merge --no-ff audit/YYYY-MM-DD`. If actual conflicts → **ABORT**, write failure report, leave audit branch intact.

### Step 8 — Write final report
Copy `.claude/reports/audit/TEMPLATE.md` → `REPORT_PATH`. Fill in all values from the scan results.

### Step 9 — Commit the report
```bash
git add .claude/reports/audit/YYYY-MM-DD-nightly-audit.md
git commit -m "audit(report): YYYY-MM-DD nightly report"
```

---

## The 6 Audit Categories

---

### Category A — Hardcoded Hebrew Strings

**Detection:**
- Grep for regex `[\u0590-\u05FF]` in `src/**/*.html` and `src/**/*.component.ts`
- **Exclude:** `**/dictionary.json`, `**/translation.service.ts`, `**/*.spec.ts`, `**/*.model.ts`

**Response:** FLAG only. Never auto-fix — creating translation keys requires human judgment.

**Severity:** Medium

**Output format per finding:**
```
A | FLAG | src/app/.../file.html:42 | "שלום עולם" | Move to dictionary.json with translation key
```

---

### Category B — Shared Component Duplication

**Detection:**
Semantic comparison: for each component created or modified since the last audit, compare its template structure against the 32 known shared components in `src/app/shared/`:

```
add-equipment-modal, add-item-modal, ai-recipe-modal, approve-stamp,
carousel-header, cell-carousel, change-popover, chip-search-dropdown,
confirm-modal, counter, custom-multi-select, custom-select, empty-state,
export-preview, export-toolbar-overlay, floating-info-container,
global-specific-modal, label-creation-modal, list-selection, list-shell,
loader, quick-add-product-modal, quick-edit-product-modal,
quick-edit-product-panel, restore-choice-modal, scaling-chip,
scrollable-dropdown, selection-bar, supplier-modal, translation-key-modal,
unit-creator, version-history-panel
```

**Indicators of duplication:**
- New component has modal/popover/dropdown pattern that matches an existing shared component
- Template contains `<form>` + confirm/cancel buttons → check against `confirm-modal`, `global-specific-modal`
- Template contains `<input>` + dropdown list → check against `chip-search-dropdown`, `custom-select`, `scrollable-dropdown`
- Template contains carousel/slider pattern → check against `carousel-header`, `cell-carousel`

**Response:** FLAG only. Requires human judgment on whether to refactor.

**Severity:** Medium

**Output format per finding:**
```
B | FLAG | src/app/.../new-component/ | Similar to shared/confirm-modal — consider reusing
```

---

### Category C — Theme & Styling Violations

**Detection (4 sub-checks):**

**C1 — Hardcoded colors in component SCSS:**
- Grep for `#[0-9a-fA-F]{3,8}` in `src/**/*.component.scss`
- Grep for `rgb\(` / `rgba\(` / `hsl\(` / `hsla\(` in `src/**/*.component.scss`
- **Exclude:** `src/styles.scss` (that's where tokens live)
- **Exclude:** Comments (`//` and `/* */` lines)

**C2 — Inline styles in templates:**
- Grep for `style="` in `src/**/*.html`

**C3 — Font overrides in component SCSS:**
- Grep for `font-size\s*:` and `font-family\s*:` in `src/**/*.component.scss`

**C4 — Engine class leaks:**
- Grep for `\.c-` in `src/**/*.component.scss` (engine classes belong only in `src/styles.scss`)

**Auto-fix rules (C1 only):**
Apply ONLY when a hardcoded hex value has an exact 1-to-1 match in the token map below.

**Token map (hex → CSS custom property):**

| Hex (case-insensitive) | Token | Context rule |
|---|---|---|
| `#f0f4f8` | `var(--bg-body)` | Any property |
| `#ffffff` | `var(--bg-pure)` | When property is `background`, `background-color`, or shorthand |
| `#ffffff` | `var(--color-text-on-primary)` | When property is `color` |
| `#0f172a` | `var(--color-text-main)` | Any property |
| `#1e293b` | `var(--color-text-secondary)` | Any property |
| `#64748b` | `var(--color-text-muted)` | Any property |
| `#94a3b8` | `var(--color-text-muted-light)` | Any property |
| `#14b8a6` | `var(--color-primary)` | Any property |
| `#0d9488` | `var(--color-primary-hover)` | Any property |
| `#a0833f` | `var(--color-accent-gold)` | Any property |
| `#10b981` | `var(--color-success)` | Any property |
| `#166534` | `var(--text-success)` | Any property |
| `#92400e` | `var(--text-warning)` | Any property |
| `#f59e0b` | `var(--border-warning)` | Any property |
| `#d97706` | `var(--color-warning)` | Any property |
| `#b45309` | `var(--color-warning-hover)` | Any property |
| `#dc2626` | `var(--color-danger)` | Any property |
| `#b91c1c` | `var(--color-danger-hover)` | Any property |

**`#ffffff` disambiguation:**
- Property contains `background` or `bg` → use `var(--bg-pure)`
- Property is `color` → use `var(--color-text-on-primary)`
- Ambiguous → FLAG, don't auto-fix

**All other hardcoded colors** (no exact match) → FLAG only.
**C2, C3, C4** → FLAG only, never auto-fix.

**Severity:** Low-Medium

**Output format:**
```
C | AUTO-FIX | src/app/.../file.scss:12 | #14b8a6 → var(--color-primary)
C | FLAG     | src/app/.../file.scss:45 | #334155 — no matching token
C | FLAG     | src/app/.../file.html:8  | inline style="..." detected
```

---

### Category D — Security Flags

**Detection (6 sub-checks):**

**D1 — innerHTML bindings:**
- Grep for `\[innerHTML\]` in `src/**/*.html`

**D2 — Sensitive localStorage usage:**
- Grep for `localStorage\.(get|set|remove)Item\s*\(\s*['"]` in `src/**/*.ts`
- Flag only when key name contains: `token`, `auth`, `jwt`, `session`, `password`, `secret`, `credential`

**D3 — Sensitive console.log:**
- Grep for `console\.log\(.*\b(request|user|token|auth|password|session)\b` in `src/**/*.ts`

**D4 — Hardcoded secrets:**
- Grep for patterns: `(api[_-]?key|secret|password|token)\s*[:=]\s*['"][^'"]{8,}` in `src/**/*.ts`
- **Exclude:** type definitions, interfaces, enum declarations, comments

**D5 — Non-HTTPS API URLs:**
- Grep for `http://` in `src/**/*.ts` and `src/**/*.html`
- **Exclude:** `http://localhost`, `http://127.0.0.1`, `http://0.0.0.0`

**D6 — Secrets in .env:**
- Check if `.env` exists and contains values for keys like `SECRET`, `KEY`, `TOKEN`, `PASSWORD`
- Verify `.env` is in `.gitignore`

**Response:** FLAG only, always. **Never auto-modify security-related code.**

**Severity:** HIGH

**Output format:**
```
D | FLAG | HIGH | src/app/.../file.html:15 | [innerHTML] binding — ensure input is sanitized
D | FLAG | HIGH | src/app/.../file.ts:88  | localStorage stores 'authToken' — verify encryption
```

---

### Category E — Dead Code & Hygiene

**Detection (4 sub-checks):**

**E1 — Unused imports:**
For each TypeScript file in `src/**/*.ts` (excluding `*.spec.ts`):
1. Parse all `import { Name1, Name2 } from '...'` statements
2. For each imported name, search the rest of the file for `\bName\b` (word boundary)
3. If not found → unused import

**E2 — Commented-out code blocks:**
- Find blocks of 5+ consecutive lines that start with `//` or are within `/* ... */`
- **Exclude:** JSDoc comments (`/** ... */`), license headers

**E3 — Console.log in non-error paths:**
- Grep for `console\.log\(` in `src/**/*.ts`
- **Exclude:** lines inside `catch` blocks or error handler functions
- **Exclude:** `*.spec.ts`, `*.test.ts`

**E4 — Empty catch blocks:**
- Grep for `catch\s*\([^)]*\)\s*\{\s*\}` (multiline) in `src/**/*.ts`

**Auto-fix rules:**
- **E1:** Remove the entire unused import name from the import statement. If all names in an import are unused, remove the entire import line.
- **E3:** Remove the `console.log(...)` line entirely.

**Safety:** If removing an import would leave a side-effect-only import (e.g., `import './polyfills'`), do NOT remove it.

**E2, E4:** FLAG only.

**Severity:** Low

**Output format:**
```
E | AUTO-FIX | src/app/.../file.ts:3  | Removed unused import 'SomeService'
E | FLAG     | src/app/.../file.ts:45 | 7-line commented-out block — review if intentional
```

---

### Category F — Angular Convention Drift

**Detection (5 sub-checks):**

**F1 — Legacy decorators:**
- Grep for `@Input\(\)` and `@Output\(\)` in `src/**/*.ts` (excluding `*.spec.ts`)
- These should be `input()`, `output()`, or `model()` signals

**F2 — BehaviorSubject usage:**
- Grep for `BehaviorSubject` in `src/**/*.ts` (excluding `*.spec.ts`)
- Should be replaced with `signal()` or `computed()`

**F3 — .subscribe() in components:**
- Grep for `\.subscribe\(` in `src/**/*.component.ts`
- Flag for reactive alternatives (`toSignal()`, `async` pipe, `effect()`)

**F4 — Oversized files:**
- For all `src/**/*.ts` files, count lines
- Flag any file > 300 lines with its line count

**F5 — Semicolons:**
- Grep for `;\s*$` in `src/**/*.ts`
- Count per file

**Auto-fix rules (F5 only):**
- Only auto-fix files with **20 or fewer** semicolons (safety limit for unattended runs)
- Remove trailing semicolons: replace `;\s*$` with empty string
- **Exclude:** `for(;;)` loop semicolons (mid-line, not matched by `;\s*$`)
- **Exclude:** Lines where the semicolon is inside a string literal
- **Exclude:** `*.spec.ts`, `*.d.ts`

**F1–F4:** FLAG only, never auto-fix.

**Severity:** Medium

**Output format:**
```
F | FLAG     | src/app/.../file.ts:22 | @Input() — migrate to input() signal
F | FLAG     | src/app/.../file.ts:10 | BehaviorSubject — migrate to signal()
F | FLAG     | src/app/.../file.ts:55 | .subscribe() in component — consider toSignal()
F | FLAG     | src/app/.../file.ts   | 412 lines — exceeds 300 line limit
F | AUTO-FIX | src/app/.../file.ts:8 | Removed trailing semicolon (file has 15 total)
```

---

## Report Generation

After all categories are scanned:

1. Read `.claude/reports/audit/TEMPLATE.md`
2. Copy to `REPORT_PATH`
3. Fill in:
   - Date in title
   - Summary table counts per category
   - Auto-fixed items list
   - Flagged items list
   - Git commit hashes
4. **Trend section:** If previous reports exist in `.claude/reports/audit/`, read the last 7 and populate the trend table.

---

## Report Retention

After writing the new report:
1. List all files in `.claude/reports/audit/` matching `*-nightly-audit.md`
2. If any are older than 30 days → move to `.claude/reports/audit/archive/`
3. Do NOT delete archived reports

---

## Failure Report

If any step in the Git Safety Protocol fails, write a minimal report:

```markdown
# Nightly Audit — YYYY-MM-DD — FAILED

## Failure
- Step: [which step failed]
- Reason: [error message]
- State: [branch left intact for debugging / rolled back to main]

## Action Required
[What the developer needs to do to resolve]
```

Save to `REPORT_PATH` and commit to whatever branch is current.
