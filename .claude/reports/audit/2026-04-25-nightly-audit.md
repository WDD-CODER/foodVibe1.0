# Nightly Audit — 2026-04-25

## Summary
| Category | Found | Auto-fixed | Flagged |
|---|---|---|---|
| A - Hebrew strings | 68 | 0 | 68 |
| B - Shared component duplication | 0 | 0 | 0 |
| C - Theme & styling violations | 675 | 6 | 669 |
| D - Security flags | 0 | 0 | 0 |
| E - Dead code & hygiene | 0 | 0 | 0 |
| F - Angular convention drift | 297 | 116 | 181 |
| **Total** | **1,040** | **122** | **918** |

## Auto-fixed Items

| File | Line | Category | What Changed |
|---|---|---|---|
| nutrition-badge.component.scss | 74 | C1 | `#14b8a6` → `var(--color-primary)` |
| nutrition-badge.component.scss | 114 | C1 | `#64748b` → `var(--color-text-muted)` |
| nutrition-badge.component.scss | 141 | C1 | `#94a3b8` → `var(--color-text-muted-light)` |
| nutrition-badge.component.scss | 167 | C1 | `#0f172a` → `var(--color-text-main)` |
| nutrition-badge.component.scss | 177 | C1 | `#64748b` → `var(--color-text-muted)` |
| nutrition-badge.component.scss | 196 | C1 | `#94a3b8` → `var(--color-text-muted-light)` |
| quick-add-product-modal.component.ts | multiple | F5 | 116 trailing semicolons removed |

## Flagged for Manual Review

### HIGH — Security (0)
No security issues detected. `.env` is properly gitignored.

### MEDIUM — Hebrew strings (68 occurrences in 19 files)
All require manual extraction to `dictionary.json` + TranslationService wiring.

| File | Notes |
|---|---|
| ai-recipe-modal.component.ts | Multiple strings (see April 10 report for full list) |
| cook-view.page.html | Timer/step labels |
| equipment-form.component.ts | Form labels |
| equipment-list.component.ts | List UI strings |
| inventory-product-list.component.ts | Product list strings |
| menu-intelligence.page.html | Menu UI strings |
| menu-library-list.component.ts | Library strings |
| metadata-manager.page.component.ts | Manager UI strings |
| nutrition-badge.component.html | Nutrient labels |
| nutrition-badge.component.ts | Badge strings |
| quick-add-product-modal.component.ts | Modal strings |
| quick-edit-product-panel.component.ts | Edit panel strings |
| recipe-book-list.component.ts | Recipe list strings |
| recipe-ingredients-table.component.ts | Ingredient table strings |
| recipe-workflow.component.ts | Workflow step strings |
| supplier-list.component.ts | Supplier strings |
| venue-list.component.ts | Venue strings |
| version-history-panel.component.ts | History panel strings |
| custom-select.component.ts | Select strings |

### MEDIUM — Angular convention drift (181)

**Oversized files (19):**
| File | Lines | Threshold |
|---|---|---|
| menu-intelligence.page.ts | 1,302 | 300 |
| recipe-builder.page.ts | 1,292 | 300 |
| cook-view.page.ts | 1,131 | 300 |
| product-form.component.ts | 857 | 300 |
| menu-export.service.ts | 837 | 300 |
| recipe-book-list.component.ts | 762 | 300 |
| recipe-ingredients-table.component.ts | 575 | 300 |
| inventory-product-list.component.ts | 529 | 300 |
| equipment-list.component.ts | 454 | 300 |
| kitchen-state.service.ts | 451 | 300 |
| recipe-form.service.ts | 429 | 300 |
| supplier-list.component.ts | 402 | 300 |
| metadata-manager.page.component.ts | 392 | 300 |
| recipe-yield-manager.util.ts | 377 | 300 |
| recipe-workflow.component.ts | 367 | 300 |
| recipe-export.service.ts | 353 | 300 |
| user.service.ts | 346 | 300 |
| custom-multi-select.component.ts | 334 | 300 |
| metadata-registry.service.ts | 326 | 300 |

**Manual subscriptions (~40 raw, many likely HTTP fire-and-forget):**
Top files: app.component.ts, auth-modal.component.ts (3), header.component.ts, inventory-product-list.component.ts (3+). Recommend manual review — many calls are service methods (logout, login, saveProduct, deleteProduct) that complete automatically via HttpClient.

**Legacy decorators (1 file):**
- `nutrition-badge.component.ts` — `@Input()` decorator; migrate to `input()` signal API

**BehaviorSubject (1 file):**
- `auth.interceptor.ts` — used for token refresh queuing. Appropriate usage, low priority.

**Trailing semicolons (22 remaining):**
116 removed this run. A small residual count remains in files the ASI-safe script preserved.

### LOW-MEDIUM — Styling violations (669)

**Hardcoded colors (~184 items after 6 auto-fixed):**
- `cook-view.page.scss`: 30+ custom hex values — page-specific palette, consider `--cv-*` local tokens
- `export-toolbar-overlay.component.scss`: brand variant hex (#22b29a, #1ea088)
- `menu-intelligence.page.scss`: #1a1a1a and others
- `metadata-manager.page.component.scss`: 3 semantic fallback colors
- `nutrition-badge.component.scss`: #334155 (no matching token — flag for future --color-text-base token)

**Inline styles (2):**
- `cook-view.page.html:335` — `style="margin-inline-start: auto"` → move to SCSS
- `cook-view.page.html:424` — `style="margin-inline-start: auto"` → move to SCSS

**Font overrides (396 across 54 files):**
Systemic use of `font-size:` in component SCSS. Global Heebo typography tokens needed before this can be resolved systematically.

**Engine class references (81):**
Mostly legitimate selector scoping (`:host .c-modal-overlay`). Manual review needed to distinguish real violations.

## Git Reference
- Branch: `audit/2026-04-25`
- Plan commit: `e9f5592`
- Fix commit: `ee827e3`
- Report commit: *(this commit)*

## Trend (last 7 audits)
| Date | Total Found | Auto-fixed | Flagged | Direction |
|---|---|---|---|---|
| 2026-04-10 | 133 | 5 | 128 | — (baseline) |
| 2026-04-25 | 1,040 | 122 | 918 | ↑ (15 days of growth, first scan since April 10) |

## Reflect / Fixes
No reflect fixes tonight.
