# Nightly Audit — 2026-04-19

## Summary
| Category | Found | Auto-fixed | Flagged |
|---|---|---|---|
| A - Hebrew strings | 54 | 0 | 54 |
| B - Shared component duplication | 0 | 0 | 0 |
| C - Theme & styling violations | 129 | 0 | 129 |
| D - Security flags | 0 | 0 | 0 |
| E - Dead code & hygiene | 18 | 16 | 2 |
| F - Angular convention drift | 52 | 2 | 50 |
| **Total** | **253** | **18** | **235** |

---

## Auto-fixed Items

| File | Line | Category | What Changed |
|---|---|---|---|
| `src/app/pages/cook-view/cook-view.page.ts` | 12 | E1 | Removed unused import `ScaledPrepRow` |
| `src/app/pages/menu-intelligence/menu-intelligence.page.ts` | 23 | E1 | Removed unused import `SelectOnFocusDirective` (entire line) |
| `src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.ts` | 17 | E1 | Removed unused import `moveItemInArray` |
| `src/app/pages/menu-library/components/menu-library-list/menu-library-list.component.ts` | 9 | E1 | Removed unused import `ServingType` |
| `src/app/core/services/scaling.service.ts` | 4 | E1 | Removed unused import `FlatPrepItem` |
| `src/app/core/services/equipment-data.service.ts` | 1–4 | E1 | Removed unused imports `inject`, `StorageService`, `LoggingService` (inherited from base class) |
| `src/app/core/services/supplier-data.service.ts` | 1–4 | E1 | Removed unused imports `inject`, `StorageService`, `LoggingService` |
| `src/app/core/services/venue-data.service.ts` | 1–4 | E1 | Removed unused imports `inject`, `StorageService`, `LoggingService` |
| `src/app/core/services/metadata-registry.service.ts` | 1 | E1 | Removed unused import `computed` |
| `src/app/shared/supplier-modal/supplier-modal.component.ts` | 4 | E1 | Removed unused import `TranslatePipe` (entire line) |
| `src/app/pages/recipe-builder/recipe-builder.page.ts` | multiple | F5 | Removed 532 trailing semicolons via ASI-safe script |
| `src/app/shared/quick-add-product-modal/quick-add-product-modal.component.ts` | multiple | F5 | Removed 116 trailing semicolons via ASI-safe script |

**F5 note:** `scripts/remove-trailing-semicolons.mjs` ran across all eligible `src/app/**/*.ts` files. Only 2 files had ASI-safe removable semicolons (648 total). Remaining files had required semicolons or are in the preserved list (`main.ts`, `app.config.ts`, `app.routes.ts`).

---

## Flagged for Manual Review

### HIGH — Security (0)
No security issues detected. `.env` is absent and properly gitignored.

---

### MEDIUM — Hebrew strings (54 items · Category A)

Hardcoded Hebrew in TypeScript component files. All use the `?? 'Hebrew fallback'` pattern or direct string arguments. Cannot safely extract keys unattended.

**Recommended action:** For each item, create a key in `dictionary.json` and replace with `this.translation.translate('key')` (or pipe equivalent). Prioritize the confirm-modal calls (many are identical — e.g. "יש שינויים שלא נשמרו" appears 3 times across different files).

Top offenders by file:
| File | Count |
|---|---|
| `metadata-manager.page.component.ts` | 11 |
| `recipe-book-list.component.ts` | 4 |
| `equipment-list.component.ts` | 4 |
| `supplier-list.component.ts` | 5 |
| `ai-recipe-modal.component.ts` | 5 |
| `version-history-panel.component.ts` | 4 |
| `equipment-form.component.ts` | 2 |
| `inventory-product-list.component.ts` | 2 |
| `quick-edit-product-panel.component.ts` | 2 |
| `venue-list.component.ts` | 2 |
| `recipe-ingredients-table.component.ts` | 1 |
| `recipe-workflow.component.ts` | 1 |

See `.claude/reports/audit/2026-04-19-plan.md` for full line-by-line listing.

---

### MEDIUM — Theme & styling violations (129 items · Category C)

#### C1 — Hardcoded colors (~78 items)

**No auto-fixable token matches found.** 5 apparent candidates were investigated and found to be hex values inside CSS comments or `var()` fallbacks — already correct.

Key clusters:
- `src/app/pages/cook-view/cook-view.page.scss` — 18 non-token hex values in `:host` custom-property block (lines 24–43, e.g. `--cv-active-border: #1D9E75`) + 10 `rgba()` usages. **Recommendation:** These appear intentional as a scoped cook-view palette. Consider formalizing as semantic tokens in `styles.scss`.
- `src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.scss` — 15 `rgba()` and hex usages.
- `src/app/core/components/header/header.component.scss` — 6 `rgba()` glassmorphism values.
- `src/app/shared/approve-stamp/approve-stamp.component.scss` — 5 `rgba()` shadow/border values.
- `src/app/pages/menu-intelligence/_paper-ui.scss` — 5 values (paper-frame aesthetic).

All `rgba()` / `rgb()` / `hsl()` values are FLAG — too complex for automated token matching.

#### C2 — Inline styles (1 item)

| File | Line | Excerpt |
|---|---|---|
| `src/app/shared/ai-recipe-modal/ai-recipe-modal.component.html` | 175 | `style="display:none"` |

Replace with CSS class or `[hidden]` attribute binding.

#### C3 — Font overrides (31 items)

`cook-view.page.scss` accounts for ~25 of 31 `font-size:` overrides (extensive custom typography throughout). `supplier-form` and `supplier-list` SCSS account for the remaining 6.

Systemic pattern — consider a dedicated typography token sweep in cook-view.

#### C4 — Engine class misuse (19 items)

`.c-*` engine classes referenced in component SCSS files (must only live in `src/styles.scss`):

| File | Classes Referenced |
|---|---|
| `supplier-form.component.scss` | `.c-input`, `.c-form-actions` |
| `supplier-list.component.scss` | `.c-list-body-cell`, `.c-icon-btn`, `.c-col-actions` |
| `venue-form.component.scss` | `.c-input`, `.c-form-actions` |
| `venue-list.component.scss` | `.c-list-body-cell`, `.c-icon-btn`, `.c-col-actions` |
| `recipe-ingredients-table.component.scss` | `.c-icon-btn` |
| `ingredient-search.component.scss` | `.c-dropdown` (via `::ng-deep`) |
| `recipe-workflow.component.scss` | `.c-icon-btn` |

---

### LOW — Dead code (2 items · Category E)

#### E2 — Commented-out code blocks

| File | Lines | Description |
|---|---|---|
| `metadata-manager.page.component.ts` | 159–163 | 5-line comment block |
| `src/app/core/interceptors/auth.interceptor.ts` | 14–20 | 7-line comment block |

---

### MEDIUM — Angular convention drift (50 items · Category F)

#### F2 — BehaviorSubject (1 item)

| File | Line | Note |
|---|---|---|
| `auth.interceptor.ts` | 22 | Module-scoped token-refresh queue. Low priority — BehaviorSubject is reasonable here. |

#### F3 — Manual subscriptions (30 items across 14 component files)

Top offenders:
| File | Subscriptions |
|---|---|
| `recipe-book-list.component.ts` | 10 |
| `inventory-product-list.component.ts` | 6 |
| `product-form.component.ts` | 5 |
| `recipe-ingredients-table.component.ts` | 3 |
| `recipe-header.component.ts` | 1 |

Most use `takeUntilDestroyed(destroyRef)` or `take(1)` — low leak risk. Consider migrating to `toSignal()` / `effect()` over time.

#### F4 — Oversized files (19 items)

| File | Lines | Δ vs 2026-04-10 |
|---|---|---|
| `menu-intelligence.page.ts` | 1303 | +31 ↑ |
| `recipe-builder.page.ts` | 1289 | +195 ↑ |
| `cook-view.page.ts` | 1080 | new ↑ |
| `product-form.component.ts` | 852 | +14 ↑ |
| `menu-export.service.ts` | 837 | new ↑ |
| `recipe-book-list.component.ts` | 758 | +29 ↑ |
| `recipe-ingredients-table.component.ts` | 573 | new ↑ |
| `inventory-product-list.component.ts` | 527 | new ↑ |
| `equipment-list.component.ts` | 454 | new ↑ |
| `kitchen-state.service.ts` | 451 | +3 → |
| `recipe-form.service.ts` | 407 | new ↑ |
| `supplier-list.component.ts` | 402 | new ↑ |
| `metadata-manager.page.component.ts` | 398 | +2 → |
| `recipe-yield-manager.util.ts` | 377 | new ↑ |
| `recipe-workflow.component.ts` | 367 | new ↑ |
| `recipe-export.service.ts` | 353 | new ↑ |
| `user.service.ts` | 346 | new ↑ |
| `custom-multi-select.component.ts` | 334 | new ↑ |
| `metadata-registry.service.ts` | 326 | new ↑ |

---

## Git Reference
- Branch: `audit/2026-04-19`
- Plan commit: `1e31c49`
- Fix commit: `7836473`
- Report commit: *(this commit)*

---

## Trend (last 7 audits)
| Date | Total Found | Auto-fixed | Flagged | Direction |
|---|---|---|---|---|
| 2026-04-10 | 133 | 5 | 128 | — (baseline) |
| 2026-04-19 | 253 | 18 | 235 | ↑ worse (+120 found, +107 flagged) |

**Trend note:** The jump in total findings (+120) is primarily driven by expanded scan coverage — F4 now flags all 19 oversized files vs 6 in the previous run, and Category A grew from 12 to 54 Hebrew strings as the codebase expanded. Category D (security) remains clean. The E/F auto-fix rate improved (18 fixes vs 5 last run).

---

## Reflect / Fixes
No reflect fixes tonight.
