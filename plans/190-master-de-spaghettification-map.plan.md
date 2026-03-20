# Master De-Spaghettification Map — foodVibe 1.0

Audit date: 2026-03-19  
Scope: 64 templates · 199 TS files · 64 SCSS files

---

## Methodology

Scanned all `src/app/` directories. Every count below is from live grep results.
"Shared component exists" means `src/app/shared/` has a component for this pattern.
"Ignored" means pages reinvent it anyway.

---

## High Impact Refactors — used 10+ times

### HI-1 · Design System Button Tokens — 75 usages, but 2 escapees

The good: `c-btn-primary`, `c-btn-ghost`, `c-icon-btn`, `c-btn-ghost--sm` are all defined in `styles.scss` and used 75 times across the app.

The problem: several areas never adopted the token system and still use orphan classes:
- `btn-primary` (2x) in `product-form.component.html`
- `btn-delete-row` in `product-form.component.html`
- `btn-text-add` in `product-form.component.html`
- `btn-delete` (3x) in `metadata-manager.page.component.html`, `preparation-category-manager.html`, `section-category-manager.html`
- `btn-ghost-small` in `metadata-manager.page.component.html`
- `btn-add` in `preparation-category-manager.html`
- `btn-close` in `version-history-panel.component.html`

Root cause: product-form and metadata-manager predate or were written outside the design system; local SCSS redefines global visual variants.

### HI-2 · Selection Toolbar Block — 5× exact duplication

The same two-button sequence appears identically in every list page:
- clear selection
- remove selected

Files:
- `pages/equipment/components/equipment-list/equipment-list.component.html`
- `pages/inventory/components/inventory-product-list/inventory-product-list.component.html`
- `pages/recipe-book/components/recipe-book-list/recipe-book-list.component.html`
- `pages/suppliers/components/supplier-list/supplier-list.component.html`
- `pages/venues/components/venue-list/venue-list.component.html`

`ListSelectionState` and `ListRowCheckboxComponent` exist in shared, but selection action bar has no shared component.

### HI-3 · `isSaving_ = signal(false)` — 8× copy-paste signal

Pattern duplicated in 8 files:
- `cook-view/cook-view.page.ts`
- `equipment/components/equipment-form/equipment-form.component.ts`
- `inventory/components/product-form/product-form.component.ts`
- `menu-intelligence/menu-intelligence.page.ts`
- `recipe-builder/recipe-builder.page.ts`
- `suppliers/components/supplier-form/supplier-form.component.ts`
- `venues/components/venue-form/venue-form.component.ts`
- `shared/unit-creator/unit-creator.component.ts`

Template usage `[disabled]="isSaving_()"` appears 21 times. No shared base/mixin/composable exists.

### HI-4 · List Page State Cluster — 5× identical signal group

Every list page independently declares similar state:
- `searchQuery_ = signal('')`
- `isPanelOpen_ = signal(true)`
- `selection = new ListSelectionState()`
- optional `isEmptyList_ = computed(...)` (3/5)
- `clearAllFilters()`

`list-state.util.ts` abstracts URL sync, but not the repeated signal declarations.

### HI-5 · qty-btn minus/plus Counter — shared component exists, ignored 6×

`src/app/shared/counter/counter.component.ts` (`app-counter`) is feature-rich but only used once (scaling-chip).
Near-identical minus/plus/input counters are manually reimplemented in:
- `cook-view.page.html` (main quantity and per-ingredient edit)
- `recipe-ingredients-table.component.html`
- `recipe-workflow.component.html` (workflow quantity and labor time)
- `recipe-builder.page.html` (logistics quantity)
- `menu-intelligence.page.html` (guest count pill variant)

### HI-6 · Scroll Zone / Indicator Scaffold — 4× HTML block copy-paste

The same scroll-indicator scaffold is repeated with namespace variations in:
- `scrollable-dropdown.component.html`
- `floating-info-container.component.html`
- `dashboard-overview.component.html`
- `recipe-header.component.html`

`scroll-indicators.directive.ts` is shared and correct; HTML and SCSS structure is duplicated (~160 lines total).

### HI-7 · URL Param Sync Descriptors — 32 usages, same pattern 6×

List pages repeatedly instantiate:
- `{ urlParam: 'q', signal: this.searchQuery_, serializer: StringParam }`
- `{ urlParam: 'sort', signal: this.sortBy_, serializer: StringParam as any }`
- `{ urlParam: 'order', signal: this.sortOrder_, serializer: StringParam as any }`

Present in equipment, inventory products, recipe-book, suppliers, venues, and menu-library list pages.

---

## Structural Weaknesses

### SW-1 · `form-actions` vs `c-modal-actions` — split naming

Two class names implement the same cancel+submit footer row; one is engine-based (`c-modal-actions`) and one is local (`form-actions`) in form pages.

### SW-2 · Inline Edit Panel — 2× near-identical copy

Inline-edit panel structure is duplicated between:
- `equipment-list.component.html`
- `supplier-list.component.html`

Both share similar save/cancel and click-guard behavior.

### SW-3 · Filter category accordion inconsistency

Expandable filter category appears in only 2/5 list pages; others remain flat despite shared header styles indicating intended consistency.

### SW-4 · Hardcoded Hebrew strings in templates (rule violation)

Section 7 in project standards requires all user-facing text through `translatePipe` + `dictionary.json`.
Violations exist in:
- `product-form.component.html`
- `metadata-manager.page.component.html`
- `label-creation-modal.component.html`
- `version-history-panel.component.html`

### SW-5 · God-file alert — files exceed 300-line guideline

Large files:
- `menu-intelligence.page.ts` (~1,282)
- `recipe-builder.page.ts` (~1,257)
- `product-form.component.ts` (~1,138)
- `recipe-book-list.component.ts` (~695)

### SW-6 · Empty-state rendering inconsistency

Three variants are used across the app with no shared `EmptyStateComponent`:
- icon + paragraph
- text-only `.no-results`
- text-only `.empty-state`

---

## Summary Table

| ID | Pattern | Count | Shared component? | Impact |
|---|---|---:|---|---|
| HI-1 | Orphan button tokens | ~12 instances | Engine exists, ignored | Medium |
| HI-2 | Selection toolbar block | 5x verbatim | No | High |
| HI-3 | `isSaving_ = signal(false)` | 8x | No | Medium |
| HI-4 | List page state cluster | 5x | Partial (`ListSelectionState`) | High |
| HI-5 | qty-btn counter | 7x | `CounterComponent` ignored | High |
| HI-6 | Scroll indicator scaffold | 4x | Directive shared, HTML/SCSS not | Medium |
| HI-7 | URL param top-3 boilerplate | 6x | Partial (`list-state.util.ts`) | Low |
| SW-1 | `form-actions` vs `c-modal-actions` | 4+10 | Forked | Medium |
| SW-2 | Inline edit panel | 2x | No | Medium |
| SW-3 | Category accordion gap | 2/5 lists | No | Low |
| SW-4 | Hardcoded Hebrew | 8 files | Dictionary exists | High (rule) |
| SW-5 | God files >300 lines | 3+ files | — | High |
| SW-6 | Inconsistent empty state | 3 variants | No | Low |

---

## Recommended Refactor Priority

### Phase A — Quick wins (no new components)

1. SW-4: Route orphan Hebrew strings through `translatePipe` and dictionary.
2. HI-1: Replace orphan button classes with their `c-*` equivalents in product-form and metadata-manager.
3. HI-3: Extract a `withSavingState()` composable or protected base mixin for `isSaving_`.

### Phase B — Shared infrastructure

4. HI-5: Audit each `qty-btn` site; replace most with `<app-counter>`.
5. HI-2: Create `<app-selection-bar>` wrapping the two action buttons with clear/delete outputs; migrate 5 call sites.
6. SW-6: Create `<app-empty-state>` with icon, message, and optional CTA slot.

### Phase C — Architectural consolidation

7. HI-4: Create a `ListPageStore` base class or composable for shared list signals/methods.
8. HI-6: Promote one canonical shared scroll scaffold and migrate dashboard-overview + recipe-header.
9. SW-5: Decompose god files, extracting page-specific services and sub-components (menu-intelligence, recipe-builder, product-form).
