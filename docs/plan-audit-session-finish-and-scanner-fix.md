# Plan: Finish Audit Session + Fix Nightly Audit Scanner

## Context
Audit-report session 2026-04-23 is in progress. Trust mode: auto. All 8 categories picked.
Session log: `.claude/reports/audit-sessions/2026-04-23-audit-session.md`
Report: `.claude/reports/audit/2026-04-19-nightly-audit.md`

Changes already made (uncommitted):
- `src/styles.scss` — added `--color-success-emphasis: #047857`
- `dashboard-overview.component.scss` — replaced 2× #047857, added :host gradient tokens

---

## TASK 1 — Finish the audit-report session

### Step 1: Ship F3 (no file changes needed)
Append to session log:
```
### F3 — Manual Subscriptions (30 items, 5 files) — Decision: ship (no change)
All 30 subscriptions classified SAFE by manual-subscription v1 template:
takeUntilDestroyed, take(1), or HTTP fire-and-forget patterns throughout.
Zero real violations found.
```

### Step 2: Process C3 — Font Overrides (31 items, no template) → ad-hoc
- Read `.claude/reports/audit/2026-04-19-nightly-audit.md` section C3
- cook-view.page.scss accounts for ~25 of 31 — these are intentional custom typography
- supplier-form and supplier-list account for 6
- Ad-hoc decision: FLAG cook-view as intentional (page typography system), log finding
- For supplier-form/list: read files, check if font-size overrides can use tokens
- Print FIX SUMMARY per item, append to session log
- Wait for ship/skip on each

### Step 3: Process C4 — Engine Class Misuse (19 items, no template) → ad-hoc
Files flagged (from audit report):
| File | Classes Referenced |
|---|---|
| supplier-form.component.scss | .c-input, .c-form-actions |
| supplier-list.component.scss | .c-list-body-cell, .c-icon-btn, .c-col-actions |
| venue-form.component.scss | .c-input, .c-form-actions |
| venue-list.component.scss | .c-list-body-cell, .c-icon-btn, .c-col-actions |
| recipe-ingredients-table.component.scss | .c-icon-btn |
| ingredient-search.component.scss | .c-dropdown (via ::ng-deep) |
| recipe-workflow.component.scss | .c-icon-btn |

Rule: `.c-*` engine classes must only live in `src/styles.scss`, not in component SCSS.
Fix: remove the overrides from component files. If they're just referencing (not overriding) styles, they may be safe to remove.
Read each file, check if the `.c-*` references are overrides or just selectors, propose removal.

### Step 4: Process F4 — Oversized Files (19 items, no template) → ad-hoc
These are informational flags — files over the line-count threshold.
No code changes needed. Decision: acknowledge and skip all.
Append to session log: "F4 — 19 oversized files noted. No action — refactor tracked separately."

### Step 5: Process A — Hebrew Strings (54 items, no template) → ad-hoc
These require i18n key extraction — too risky to auto-fix unattended.
Decision: skip all, note in session log.
Append: "A — 54 Hebrew strings. Skipped — i18n extraction requires dedicated session."

### Step 6: Process E2 — Commented-out Code (2 items, no template) → ad-hoc
Files:
- `metadata-manager.page.component.ts` lines 159–163 (5-line comment block)
- `src/app/core/interceptors/auth.interceptor.ts` lines 14–20 (7-line comment block)
Read each file, read the commented-out code, propose deletion.
Print FIX SUMMARY, wait for ship/skip.

### Step 7: Process C2 — Inline Styles (1 item, no template) → ad-hoc
File: `src/app/shared/ai-recipe-modal/ai-recipe-modal.component.html` line 175
`style="display:none"` → replace with `[hidden]="true"` or a CSS class
Print FIX SUMMARY, wait for ship/skip.

### Step 8: Phase 8 — Session end
1. Append closing section to session log (templates touched, summary, ended time)
2. Run `ng build` — must pass
3. Run `git status` + `git diff --stat`
4. Propose single commit message, wait for user approval
5. Commit (after approval)
6. Archive the report:
   - Pre-flight: confirm `.claude/reports/audit/2026-04-19-nightly-audit.md` exists
   - Write archive copy with RESOLVED header to `.claude/reports/audit/archive/2026-04-19-nightly-audit.md`
   - Verify archive exists
   - Delete original with `python3 -c "import os; os.remove('...path...')"`
   - Verify original gone

---

## TASK 2 — Fix Nightly Audit Scanner

### Goal
Reduce false-positive rate for C1 and F3 by pre-filtering known-safe patterns
before the scanner flags items.

### Find the scanner
Read `.claude/commands/nightly-audit.md` (or wherever the scan logic lives).
Also check: `scripts/nightly-audit.sh`, `.claude/skills/nightly-audit.md`

### C1 fix — pre-filter token definitions and safe hex
In the C1 scan step, before flagging a hex match:
- Skip lines where the hex is part of a CSS custom property definition
  (line matches pattern `^\s*--[a-zA-Z]`)
- Skip lines containing an inline comment with "intentional" or "no token"
- Skip hex values inside `rgba(` / `rgb(` / `hsl(` expressions
  (these are already not matched by `#[0-9a-fA-F]{3,6}` but confirm this)

### F3 fix — pre-filter safe subscription patterns
In the F3 scan step, before flagging a `.subscribe(` match:
- Look at the preceding 6 lines (the pipe chain)
- If `takeUntilDestroyed` or `takeUntil(` appears → skip (SAFE)
- If `take(1)` or `first(` appears → skip (SAFE)
- If the line containing `.subscribe(` is preceded by a service method name
  matching `.save`, `.delete`, `.load`, `.get`, `.post`, `.put`, `.patch`,
  `.hide`, `.permanently` → skip (HTTP fire-and-forget, SAFE)

### After changes
- Run the nightly audit script against the current codebase
- Verify C1 count drops (cook-view's 18 token-def lines should disappear)
- Verify F3 count drops (all 30 safe subscriptions should disappear)
- Confirm real violations would still be caught (spot-check with a synthetic leak)
- Commit with message: `fix(nightly-audit): pre-filter safe patterns for C1 and F3`

---

## Commit order
1. Audit session changes (Task 1 Phase 8 commit) — on current branch
2. Scanner fix (Task 2) — can be same branch or new branch `fix/nightly-audit-scanner`
