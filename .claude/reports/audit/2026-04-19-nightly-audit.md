# Nightly Audit — 2026-04-19

## Summary
| Category | Found | Auto-fixed | Flagged |
|---|---|---|---|
| A - Hebrew strings | 54 | 0 | 54 |
| B - Shared component duplication | 0 | 0 | 0 |
| C - Theme & styling violations | 131 | 0 | 131 |
| D - Security flags | 0 | 0 | 0 |
| E - Dead code & hygiene | 18 | 16 | 2 |
| F - Angular convention drift | 52 | 2 | 50 |
| **Total** | **255** | **18** | **237** |

---

## Auto-fixed Items

| File | Line | Category | What Changed |
|---|---|---|---|
| `src/app/pages/cook-view/cook-view.page.ts` | 12 | E1 | Removed unused import `ScaledPrepRow` |
| `src/app/pages/menu-intelligence/menu-intelligence.page.ts` | 23 | E1 | Removed unused import `SelectOnFocusDirective` |
| `src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.ts` | 17 | E1 | Removed unused import `moveItemInArray` |
| `src/app/pages/menu-library/components/menu-library-list/menu-library-list.component.ts` | 9 | E1 | Removed unused import `ServingType` |
| `src/app/core/services/scaling.service.ts` | 4 | E1 | Removed unused import `FlatPrepItem` |
| `src/app/core/services/equipment-data.service.ts` | 1 | E1 | Removed unused `inject` from `@angular/core` import |
| `src/app/core/services/equipment-data.service.ts` | 3–4 | E1 | Removed unused imports `StorageService`, `LoggingService` (accessed via base class) |
| `src/app/core/services/supplier-data.service.ts` | 1 | E1 | Removed unused `inject` from `@angular/core` import |
| `src/app/core/services/supplier-data.service.ts` | 3–4 | E1 | Removed unused imports `StorageService`, `LoggingService` (accessed via base class) |
| `src/app/core/services/venue-data.service.ts` | 1 | E1 | Removed unused `inject` from `@angular/core` import |
| `src/app/core/services/venue-data.service.ts` | 3–4 | E1 | Removed unused imports `StorageService`, `LoggingService` (accessed via base class) |
| `src/app/core/services/metadata-registry.service.ts` | 1 | E1 | Removed unused `computed` from `@angular/core` import |
| `src/app/shared/supplier-modal/supplier-modal.component.ts` | 4 | E1 | Removed unused import `TranslatePipe` |
| `src/app/pages/recipe-builder/recipe-builder.page.ts` | multiple | F5 | 532 trailing semicolons removed (ASI-safe script) |
| `src/app/shared/quick-add-product-modal/quick-add-product-modal.component.ts` | multiple | F5 | 116 trailing semicolons removed (ASI-safe script) |

**TypeScript verification:** `npx tsc --noEmit` passed after all fixes (only pre-existing `baseUrl` deprecation warning).

---

## Flagged for Manual Review

### HIGH — Security (0)
No security issues detected. `.env` is absent from repo and properly gitignored. No `[innerHTML]`, sensitive `localStorage`, hardcoded secrets, or non-HTTPS API calls found.

---

### MEDIUM — Hebrew Strings (54 findings) — Category A

Hardcoded Hebrew string literals in component `.ts` files. All use the `??` fallback pattern (i.e., translation key is attempted first but falls back to raw Hebrew).

**Top offenders by file:**

| File | Count | Sample strings |
|---|---|---|
| `metadata-manager.page.component.ts` | 13 | success/error messages, typeNames map |
| `recipe-book-list.component.ts` | 4 | delete confirmation modals |
| `equipment-list.component.ts` | 4 | unsaved changes, duplicate name, delete prompts |
| `suppliers/supplier-list.component.ts` | 4 | unsaved changes, delete prompts |
| `version-history-panel.component.ts` | 4 | load/restore error and success messages |
| `ai-recipe-modal.component.ts` | 5 | AI prompt labels (שם, מרכיבים, שלבים, תפוקה) |
| `venues/venue-list.component.ts` | 2 | delete prompts |
| `inventory-product-list.component.ts` | 2 | delete confirmation modals |
| `quick-edit-product-panel.component.ts` | 2 | save success/error |
| `recipe-ingredients-table.component.ts` | 1 | `+ יחידה חדשה` unit add label |
| `recipe-workflow.component.ts` | 1 | `+ יחידה חדשה` unit add label |
| `equipment-form.component.ts` | 2 | duplicate name, save error |

**Recommended action:** Extract each string to a key in `dictionary.json`, wire through `TranslationService.translate()` or `translatePipe`. Priority: `metadata-manager` (13 strings) and `recipe-book-list` (4) first.

---

### MEDIUM — Theme & Styling (131 findings) — Category C

#### C1 — Hardcoded colors (109 findings)

| Cluster | File | Count | Type |
|---|---|---|---|
| Cook-view palette | `cook-view.page.scss` | 28 | 18 hex in `:host` custom-var defs + 10 `rgba()` |
| Dashboard | `dashboard-overview.component.scss` | 15 | `rgba()` + 3 non-token hex |
| Header glass | `header.component.scss` | 6 | `rgba()` |
| Approve stamp | `approve-stamp.component.scss` | 5 | `rgba()` |
| Paper UI | `menu-intelligence/_paper-ui.scss` | 5 | 1 hex + 4 `rgba()` |
| Recipe header | `recipe-header.component.scss` | 3 | `rgba()` |
| Menu-library list | `menu-library-list.component.scss` | 2 | `rgba()` |
| Hero FAB | `hero-fab.component.scss` | 2 | `rgba()` |
| AI modal | `ai-recipe-modal.component.scss` | 1 | `rgba()` |
| AI draft editor | `ai-draft-editor.component.scss` | 1 | `rgba()` |
| Metadata manager | `metadata-manager.page.component.scss` | 2 | `rgba()` |
| Toolbar | `menu-intelligence/_toolbar.scss` | 1 | `rgba()` |
| Rating stars | `rating-stars.component.scss` | 2 | `var(--color-warning, #f59e0b)` fallbacks |
| Unit creator | `unit-creator.component.scss` | 1 | `rgba()` |
| Label creation | `label-creation-modal.component.scss` | 1 | `rgba()` |

**Note on cook-view:** The 18 `:host` hex values define a local `--cv-*` token system. Consider formalizing these as a proper token group in `styles.scss` rather than hardcoding them here.

#### C2 — Inline styles (1 finding · Severity: Low)

| File | Line | Issue |
|---|---|---|
| `ai-recipe-modal.component.html` | 175 | `style="display:none"` — replace with `[hidden]` or a CSS class |

#### C3 — Font overrides (21 findings · Severity: Low)

| File | Count |
|---|---|
| `cook-view.page.scss` | 15+ |
| `supplier-form.component.scss` | 3 |
| `supplier-list.component.scss` | 3 |

#### C4 — Engine class misuse (19 findings · Severity: Medium)

`.c-*` engine classes referenced in component SCSS (must only live in `src/styles.scss`):

| File | Classes referenced |
|---|---|
| `supplier-form.component.scss` | `.c-input`, `.c-form-actions` |
| `supplier-list.component.scss` | `.c-list-body-cell`, `.c-icon-btn`, `.c-col-actions` |
| `venue-form.component.scss` | `.c-input`, `.c-form-actions` |
| `venue-list.component.scss` | `.c-list-body-cell`, `.c-icon-btn`, `.c-col-actions` |
| `recipe-ingredients-table.component.scss` | `.c-icon-btn` |
| `ingredient-search.component.scss` | `.c-dropdown` (via `::ng-deep`) |
| `recipe-workflow.component.scss` | `.c-icon-btn` |

---

### MEDIUM — Angular Convention Drift (50 findings) — Category F

#### F2 — BehaviorSubject (1 finding)
`auth.interceptor.ts:22` — module-scoped singleton for token refresh queuing. Low migration priority; BehaviorSubject is appropriate in this non-component context.

#### F3 — Manual subscriptions in components (30 findings)
| File | Count |
|---|---|
| `recipe-book-list.component.ts` | 10 |
| `inventory-product-list.component.ts` | 6 |
| `product-form.component.ts` | 5 |
| `recipe-builder` (various) | 5 |
| Other components | 4 |

Most use `takeUntilDestroyed(this.destroyRef)` which is safe. Migrate to `toSignal()` / async pipe opportunistically during refactors.

#### F4 — Oversized files (19 findings)
| File | Lines |
|---|---|
| `menu-intelligence.page.ts` | 1303 |
| `recipe-builder.page.ts` | 1289 |
| `cook-view.page.ts` | 1080 |
| `product-form.component.ts` | 852 |
| `menu-export.service.ts` | 837 |
| `recipe-book-list.component.ts` | 758 |
| `recipe-ingredients-table.component.ts` | 573 |
| `inventory-product-list.component.ts` | 527 |
| `equipment-list.component.ts` | 454 |
| `kitchen-state.service.ts` | 451 |
| + 9 more (326–407 lines) | — |

---

### LOW — Dead Code (2 findings) — Category E

#### E2 — Commented-out code blocks

| File | Lines | Description |
|---|---|---|
| `metadata-manager.page.component.ts` | 159–163 | 5-line commented block |
| `auth.interceptor.ts` | 14–20 | 7-line commented block |

---

## Git Reference
- Branch: `audit/2026-04-19`
- Plan commit: `1e31c49`
- Fix commit: `7836473`
- Merge commit: fast-forward to `main-fadnX`
- Report commit: *(this commit)*

---

## Trend (last 7 audits)

| Date | Total Found | Auto-fixed | Flagged | Direction |
|---|---|---|---|---|
| 2026-04-10 | 133 | 5 | 128 | — (baseline) |
| 2026-04-19 | 255 | 18 | 237 | ↑ found (new scan categories) · ↓ auto-fix rate improved |

> **Note on trend jump:** The April 10 audit ran a narrower scan. Today's audit added full C3 (font overrides), C4 (engine class misuse), and improved E1 (unused imports) detection — accounting for ~100 of the additional findings. The underlying codebase health for the categories scanned on Apr 10 is roughly stable. Security (D) remains clean.

---

## Reflect / Fixes

No reflect fixes tonight.
