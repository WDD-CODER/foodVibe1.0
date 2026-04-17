# Nightly Audit — 2026-04-10

## Status: RESOLVED — 2026-04-17
All meaningful flagged items addressed across sessions 2026-04-12 through 2026-04-16.
See resolution notes below. This report is archived and excluded from future `/audit-report` triage.

| Category | Resolution |
|---|---|
| A — Hebrew strings (12) | ✅ All extracted to i18n dictionary |
| C — export-toolbar hex colors | ✅ Removed |
| C — menu-intelligence #1a1a1a | ✅ Removed |
| C — cook-view 33 hex values | ✅ Consolidated into `--cv-*` local tokens; 3 minor inline residuals remain |
| F3 — product-form subscriptions (11) | ✅ Reduced to 0 |
| F3 — recipe-builder leak | ✅ Fixed in `aef1cd2` |
| F — Semicolons (9,318) | ✅ Removed in `73b57c7` on `fix/remove-trailing-semicolons` — pending merge |
| F — Oversized files | ⏭ Ongoing architectural work, not a one-shot fix |
| F3 — recipe-book-list / inventory subs | ⏭ Carry forward to next audit cycle |



## Summary
| Category | Found | Auto-fixed | Flagged |
|---|---|---|---|
| A - Hebrew strings | 12 | 0 | 12 |
| B - Shared component duplication | 0 | 0 | 0 |
| C - Theme & styling violations | 47 | 4 | 43 |
| D - Security flags | 0 | 0 | 0 |
| E - Dead code & hygiene | 1 | 1 | 0 |
| F - Angular convention drift | 73 | 0 | 73 |
| **Total** | **133** | **5** | **128** |

## Auto-fixed Items

| File | Line | Category | What Changed |
|---|---|---|---|
| core/components/auth-modal/auth-modal.component.scss | 142 | C1 | `#d97706` → `var(--color-warning)` |
| core/components/auth-modal/auth-modal.component.scss | 143 | C1 | `#d97706` → `var(--color-warning)` |
| core/components/auth-modal/auth-modal.component.scss | 148 | C1 | `#d97706` in color-mix → `var(--color-warning)` |
| core/components/auth-modal/auth-modal.component.scss | 149 | C1 | `#d97706` → `var(--color-warning)` |
| pages/trash/trash.page.ts | 51 | E3 | Removed debug `console.log('[TrashPage] refresh() clicked')` |

## Flagged for Manual Review

### HIGH — Security (0)
No security issues detected. `.env` is properly gitignored.

### MEDIUM — Hebrew strings (12)
All in `src/app/shared/ai-recipe-modal/ai-recipe-modal.component.html`:
| Line | Hebrew Text | Recommended Action |
|---|---|---|
| 32 | שולח בקשה לגמיני... | Extract to dictionary key `sending_request_to_gemini` |
| 41 | בקשות היום | Extract to dictionary key `requests_today` |
| 108 | הזן טקסט | Extract to dictionary key `enter_text` |
| 117 | העלה תמונה | Extract to dictionary key `upload_image` |
| 126 | הזן קישור | Extract to dictionary key `enter_link` |
| 153 | תצוגה מקדימה | Extract to dictionary key `image_preview` |
| 156 | לחץ להעלאת תמונה של מתכון | Extract to dictionary key `click_to_upload_recipe_image` |
| 177 | שולח בקשה לגמיני... | Duplicate of line 32 |
| 180 | תשובה התקבלה | Extract to dictionary key `response_received` |
| 189 | בקשות היום | Duplicate of line 41 |
| 256 | ביטול | Extract to dictionary key `cancel` (may already exist) |
| 259 | פתח בכל זאת | Extract to dictionary key `open_anyway` |

### MEDIUM — Angular convention drift (73)

**Oversized files (6):**
| File | Lines | Threshold |
|---|---|---|
| menu-intelligence.page.ts | 1,272 | 300 |
| recipe-builder.page.ts | 1,094 | 300 |
| product-form.component.ts | 838 | 300 |
| recipe-book-list.component.ts | 729 | 300 |
| kitchen-state.service.ts | 448 | 300 |
| metadata-manager.page.component.ts | 396 | 300 |

**Manual subscriptions (43 across 16 components):**
Top offenders: product-form (11), recipe-book-list (9), inventory-product-list (5). Consider migrating to `toSignal()`, `effect()`, or async pipe.

**BehaviorSubject (2 in auth.interceptor.ts):**
Used for token refresh queuing — BehaviorSubject is appropriate here. Low priority.

**Legacy decorators (8 in spec files only):**
All @Input/@Output usages are in test stubs. No production violations.

**Semicolons (~9,318 across 183 files):**
All files exceed the 20-per-file safety limit. Not auto-fixed this run. Consider a dedicated semicolon cleanup session.

### LOW-MEDIUM — Styling violations (43)

**Hardcoded colors without tokens (42):**
- `cook-view.page.scss`: 33 custom hex values — this page uses its own color palette. Consider creating `--cv-*` local tokens.
- `export-toolbar-overlay.component.scss`: 3 brand variant hex values (#22b29a, #1ea088)
- `menu-intelligence.page.scss`: 1 value (#1a1a1a)
- `metadata-manager.page.component.scss`: 3 semantic fallback colors

**Inline style (1):**
- `ai-recipe-modal.component.html:149` — `style="display:none"` on file input. Acceptable pattern.

**Font overrides (236 across 47 files):**
Widespread use of `font-size` in component SCSS. This is a systemic pattern, not individual drift.

**Engine class references in component SCSS (20+):**
Most are legitimate selector scoping (`:host .c-modal-overlay`), not redefinitions.

## Git Reference
- Branch: `audit/2026-04-10`
- Plan commit: `7451751`
- Fix commit: `5404d90`
- Report commit: *(this commit)*

## Trend (last 7 audits)
| Date | Total Found | Auto-fixed | Flagged | Direction |
|---|---|---|---|---|
| 2026-04-10 | 133 | 5 | 128 | — (baseline) |
