# Component families — what to reuse before you build

The single list of FoodVibe's shared pieces ("families"): for each job, which piece to use, where it lives, and
the page-local copies that still exist. Before you create any component, util, pipe, service or `.c-*` class,
find its family here and follow the decision ladder in `docs/agent/standards-reuse.md`. ADR:
`docs/brain/decisions/0024-reuse-layer.md`.

Reuse enforced from plan: 459

How this file is checked:
- `node scripts/reuse-lint.mjs --check-registry` fails when a backticked repo path below no longer exists, or when a
  lint rule in `scripts/lib/registry-families.mjs` names a family that has no `###` heading here. A plan that
  renames, moves or removes a listed piece (451–458) updates this file in the same branch.
- `node scripts/reuse-lint.mjs --diff=<base>` warns when a diff adds a new copy of a family (rules in
  `scripts/lib/registry-families.mjs`).
- `node scripts/scope-check.mjs --reuse --plan=<p>` blocks a plan (numbered 459 or later, or any plan that has the
  section) whose `## Reuse Check` is missing or incomplete.

Each family: `Status` (`stable` = use it as is; `converging` = a refactor plan is removing the copies) · `Use` (base
path · selector or symbol) · `When` · `Inputs / variants` · `Known copies` (counted on `origin/mvp-review`
`1953dcb5`, 2026-10-21; the audit numbers were from `8ffda3d2`) and the plan that removes them.

## UI families

### search-combobox — a search box with a results list
- Status: stable — plan 452 moved the six page-local shells onto it
- Use: `src/app/shared/search-combobox/` · `app-search-combobox` — a text field, a clear (X), a listbox of results and one
  add option. It owns the keyboard (rule K: first row highlighted, arrows stop at the ends, Enter picks, Escape closes,
  Tab closes), rule F (contains, prefix first), rule X (an exact name hides the add row) and the add label; the page owns
  what a pick or an add does (`(picked)`, `(addChosen)`: rule W opens the add window, rule M announces it).
- Pick one value of a short fixed list instead: `src/app/shared/custom-select/` · `app-custom-select` (CVA;
  `typeToFilter`, `allowTypedAdd`, `addNewValue`, `addNewLabelKey`, `variant`).
- When: the user types to find an item (or a new one) and picks it — recipe/product/ingredient search, dish and category
  pickers, equipment search. Server searches pass `[clientFilter]="false"`; rich rows use an `<ng-template>` child.
- Inputs / variants: `options`, `[(query)]`, `[(open)]`, `labelOf`, `keyOf`, `clientFilter`, `minChars`, `maxResults`,
  `knownOptions`, `addLabelKey`, `addOnlyTyped`, `emptyKey`, `groupOf`, `variant: 'box' | 'plain'`, `listPosition`,
  `multiline`, `handleTab`, `closeOnOutsideClick`. Keyboard + search logic: `KeyedPickerSearch` in
  `src/app/core/utils/keyed-picker-search.util.ts`; the add option: `src/app/core/utils/add-option.util.ts`
  (add-option rule in `docs/agent/standards-domain.md`).
- Building blocks (use only inside a shared base, never in a page): `src/app/shared/scrollable-dropdown/`
  (`app-scrollable-dropdown`), `src/app/shared/add-option-row/` (`app-add-option-row`).
- Known copies: none page-local. Users: `src/app/pages/menu-intelligence/menu-intelligence.page.html` (event type + section
  category), `src/app/pages/menu-intelligence/components/menu-dish-row/menu-dish-row.component.html`,
  `src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.html`,
  `src/app/pages/recipe-builder/components/ingredient-search/ingredient-search.component.html`,
  `src/app/pages/recipe-builder/components/preparation-search/preparation-search.component.html`,
  `src/app/pages/recipe-builder/recipe-builder.page.html` (with
  `src/app/pages/recipe-builder/services/recipe-logistics-picker.service.ts`). The page-local dish text store is
  `src/app/pages/menu-intelligence/services/menu-picker-search.service.ts`.

### multi-pick — pick several values, shown as chips
- Status: converging — plan 452 kept both bases; `chip-search-dropdown` is deprecated pending the Human's answer (ADR 0025)
- Use: `src/app/shared/custom-multi-select/` · `app-custom-multi-select` (CVA) — the base for new code.
- Second base (same job, **deprecated**): `src/app/shared/chip-search-dropdown/` · `app-chip-search-dropdown` (product form:
  category, supplier, allergens). It converts to `custom-multi-select` only after the behaviours listed in ADR 0025 exist there.
- When: the value is a list (allergens, labels, categories) and the user adds/removes chips.
- Known copies: none page-local; two bases for one job.

### modal-shell — the popup frame
- Status: converging — plan 451 adds a shared popup shell
- Use: CSS engines in `src/styles.scss`: `.c-modal-overlay`, `.c-modal-card`, `.c-modal-body`, `.c-modal-actions`;
  simple yes/no: `src/app/shared/confirm-modal/` · `app-confirm-modal`.
- When: any popup. Every popup closes on Escape and has `role="dialog"` + `aria-modal="true"`.
- Known copies: 22 templates draw `.c-modal-overlay` by hand; 11 templates carry `role="dialog"` (the rest lack it).

### modal-controller — open a popup and get its answer
- Status: converging — plan 451 adds one `ModalController` shape
- Use (until 451): the signal-only shape with a stored resolver, e.g.
  `src/app/core/services/confirm-modal.service.ts` (no RxJS).
- When: code needs to open a popup and await the result.
- Known copies (13 hand-written services, 3 shapes): `src/app/core/services/add-equipment-modal.service.ts`,
  `src/app/core/services/add-item-modal.service.ts`, `src/app/core/services/auth-modal.service.ts`,
  `src/app/core/services/confirm-modal.service.ts`, `src/app/core/services/global-specific-modal.service.ts`,
  `src/app/core/services/quick-add-product-modal.service.ts`, `src/app/core/services/quick-edit-product-modal.service.ts`,
  `src/app/core/services/restore-choice-modal.service.ts`, `src/app/core/services/translation-key-modal.service.ts`,
  `src/app/shared/ai-menu-modal/ai-menu-modal.service.ts`, `src/app/shared/ai-product-modal/ai-product-modal.service.ts`,
  `src/app/shared/ai-recipe-modal/ai-recipe-modal.service.ts`, `src/app/shared/label-creation-modal/label-creation-modal.service.ts`.

### list-page — a list screen (header, search, filters, rows, selection)
- Status: converging — plan 453 adds a cards layout and moves the remaining pages on
- Use: `src/app/shared/list-shell/` · `app-list-shell` (named slots) with `src/app/shared/page-header/`
  (`app-page-header`), `src/app/shared/selection-bar/` (`app-selection-bar`), `src/app/shared/row-actions-menu/`
  (`app-row-actions-menu`), `src/app/shared/column-carousel/` (`app-column-carousel-header`,
  `app-column-carousel-cell`), `src/app/shared/list-selection/` (`app-list-row-checkbox`, `list-selection.state.ts`).
- When: any screen that lists entities.
- Users today (4): equipment, inventory products, recipe book, suppliers.
- Known copies (4 list pages not on the shell): `src/app/pages/menu-library/components/menu-library-list/`,
  `src/app/pages/venues/components/venue-list/`, `src/app/pages/trash/`, `src/app/pages/metadata-manager/`
  (card grids need a `layout: 'cards'` first).

### list-logic — search / sort / filter state of a list
- Status: converging — plan 453 adds a shared list-controls helper
- Use: `src/app/core/utils/list-state.util.ts` · `useListState()` (URL-synced list state); search matching:
  `normalizeHebrew` in `src/app/core/utils/recipe-match.util.ts`; option filtering:
  `src/app/core/utils/option-filter.util.ts` · `filterOptionsByLabel`.
- When: a list needs search, sort, filters or "clear all".
- Known copies (`onClearSearch` / `onSearchEscape` defined in 8 page files):
  `src/app/pages/equipment/components/equipment-list/equipment-list.component.ts`,
  `src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.ts`,
  `src/app/pages/menu-library/components/menu-library-list/menu-library-list.component.ts`,
  `src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.ts`,
  `src/app/pages/recipe-builder/components/ingredient-search/ingredient-search.component.ts`,
  `src/app/pages/recipe-builder/components/preparation-search/preparation-search.component.ts`,
  `src/app/pages/suppliers/components/supplier-list/supplier-list.component.ts`,
  `src/app/pages/venues/components/venue-list/venue-list.component.ts`.

### empty-state — nothing here / no results
- Status: stable
- Use: `src/app/shared/empty-state/` · `app-empty-state` (+ `.c-empty-state` in `src/styles.scss`).
- When: an empty list or a search with no results.
- Known copies: not counted.

### form-field — label, input, error
- Status: converging — plan 455 adds a shared form-field component
- Use: CSS engines in `src/styles.scss`: `.c-input`, `.c-input-wrapper`, `.c-input-stack`, `.c-field-error`;
  clear button: `src/app/shared/input-clear/` (`app-input-clear`).
- When: any form input.
- Known copies (`.form-group` defined locally in 4 files):
  `src/app/pages/equipment/components/equipment-form/equipment-form.component.scss`,
  `src/app/pages/inventory/components/product-form/product-form.component.scss`,
  `src/app/pages/suppliers/components/supplier-form/supplier-form.component.scss`,
  `src/app/pages/venues/components/venue-form/venue-form.component.scss`.

### entity-form — name validation and unsaved-changes check
- Status: converging — plan 455 adds one unsaved-changes helper
- Use: `src/app/core/validators/item.validators.ts` · `duplicateNameValidator`, `duplicateEntityNameValidator`;
  leave-page guard: `src/app/core/guards/pending-changes.guard.ts`.
- When: a form edits a named entity, or must warn before leaving with unsaved changes.
- Known copies (`hasRealChanges` implemented in 5 pages): `src/app/pages/cook-view/cook-view.page.ts`,
  `src/app/pages/inventory/components/product-form/product-form.component.ts`,
  `src/app/pages/menu-intelligence/menu-intelligence.page.ts`, `src/app/pages/recipe-builder/recipe-builder.page.ts`,
  `src/app/pages/venues/components/venue-form/venue-form.component.ts`.

### chip — chips, badges, pills
- Status: converging — plan 457 adds one chip engine
- Use: CSS engines in `src/styles.scss`: `.c-chip`, `.c-toggle-chip`, `.c-tap-chip`, `.c-tab-pill`, `.c-filter-chip`;
  tab chips: `src/app/core/components/tab-chips/` (`app-tab-chips`).
- When: a small rounded label, toggle or filter.
- Known copies: 51 distinct local `*chip*` selectors in component `.scss` files (audit: ~80 local chip classes).

### feedback — loading, toasts, errors shown to the user
- Status: converging — plan 456 converges messages and errors
- Use: `src/app/shared/loader/` (`app-loader`), `src/app/core/services/loading.service.ts` (`LoadingService`),
  `src/app/core/services/user-msg.service.ts` (`UserMsgService`), `src/app/core/services/logging.service.ts`
  (`logging.error`). Pattern: `logging.error(...)` + `userMsg.onSet*Msg(translate(key))`.
- When: any wait, success or error the user must see.
- Known copies: 52 `onSet*Msg(...)` calls pass a raw Hebrew literal instead of a dictionary key (audit: 47).
- Dead pieces (no user): `src/app/shared/change-popover/`, `src/app/shared/floating-info-container/`.

### edit-gate — show a save button only to someone who may save
- Status: stable (MVP, plan 428)
- Use: `src/app/shared/edit-gate/` · `app-edit-gate`; rules: `src/app/core/services/permission.service.ts`
  (`PermissionService`). The server still decides every write (`server/utils/permissions.js`).
- When: a page offers save/edit on a business item.
- Known copies: none.

### cost-badge — partial / missing cost warning
- Status: stable (MVP)
- Use: `src/app/shared/partial-cost-badge/` · `app-partial-cost-badge`.
- When: a cost is shown that may be missing prices.
- Known copies: none.

### engine-classes — shared `.c-*` CSS engines
- Status: stable (plan 458 sweeps the copies)
- Use: `src/styles.scss` — every `.c-*` class is defined there and only there (`docs/agent/conventions.md`).
- When: a style used by more than one component (buttons, inputs, modals, chips, empty state).
- Known copies: 15 component `.scss` files start a selector with a `.c-*` class (define or restyle an engine locally).

## Logic families

### entity-data-service — load and save one entity type
- Status: stable — plan 454 moved the last copies onto the base
- Use: `src/app/core/services/base-entity-data.service.ts` · `BaseEntityDataService<T>` (users:
  `src/app/core/services/equipment-data.service.ts`, `src/app/core/services/supplier-data.service.ts`,
  `src/app/core/services/venue-data.service.ts`, `src/app/core/services/recipe-data.service.ts`,
  `src/app/core/services/dish-data.service.ts`, `src/app/core/services/product-data.service.ts`,
  `src/app/core/services/menu-event-data.service.ts`). A service's own log event and "empty the list on
  reload" go in `EntityLoadOptions`; a legacy-field migration goes in a `normalizeRow` override.
- When: a new entity type needs a client data service.
- Known copies: none.

### kitchen-state — app-wide signal state
- Status: stable — save/delete methods return Promises (plan 454)
- Use: `src/app/core/services/kitchen-state.service.ts` (signals).
- When: state that several pages read or change (the loaded entity collections); never a page-local copy.
- Known copies: none.

### taxonomy — categories, units, labels, kinds
- Status: stable
- Use: `src/app/core/services/taxonomy-store.service.ts` · `TaxonomyStore`.
- When: a page reads or adds a category, unit, label or kind.
- Facades load through `loadSafely` / `reloadSafely` (one logging path, plan 454).
- Known copies: none.

### page-entry-loading — data ready before a page opens
- Status: stable
- Use: route resolvers `src/app/core/resolvers/*-ensure-loaded.resolver.ts`.
- When: a route needs its collection loaded first.
- Known copies: none.

### helpers — pure functions
- Status: stable
- Use: `src/app/core/utils/` (one file per topic, each with a spec); money / quantity / percent rounding and
  formatting only from `src/app/core/engine/rounding.ts`; Hebrew-insensitive matching: `normalizeHebrew` in
  `src/app/core/utils/recipe-match.util.ts`. Import through `@utils/*` (and pipes through `@pipes/*`).
- When: any pure helper (time, number, text). Never page-local.
- Known copies: time / date / percent / debounce helpers copied page-locally (audit; not recounted).

### http — talking to the server
- Status: stable
- Use: `src/app/core/services/http-storage.adapter.ts`; auth header and errors: `src/app/core/interceptors/auth.interceptor.ts`.
- When: any call to the server API; never a raw `fetch` or a hand-built `/api/v1` URL.
- Known copies: `src/app/core/utils/gemini-usage.util.ts` uses a raw `fetch` that bypasses the interceptor;
  `/api/v1` literals in `src/app/core/services/logging.service.ts` and the interceptor.

### event-plan — event costing and planning engine
- Status: stable (MVP)
- Use: `src/app/core/engine/event-plan.engine.ts` with `src/app/core/engine/event-plan.service.ts`; units:
  `src/app/core/engine/units.ts`; portions: `src/app/core/engine/portions.ts`.
- When: anything that computes quantities, costs or prices for an event.
- Known copies: none.

### server-auth — who is calling the server
- Status: converging — plan 458 (rule sweep) decides
- Use: `server/middleware/auth.js` (token check), `server/utils/business-scope.js` (the only tenant-scoping path,
  ADR 0023), `server/utils/permissions.js` (the only write-permission path), `server/middleware/write-limit.js`.
- When: a server route checks who is calling, scopes data to a business, checks a write permission or limits a rate.
- Known copies: `jwt.verify` also in `server/routes/auth.js` and `server/routes/log.js`; `isAdmin` re-declared in
  `server/routes/generic.js`; rate limiters built per file in `server/routes/ai.js`, `server/routes/auth.js`,
  `server/routes/business.js`, `server/routes/log.js`, `server/routes/product-import.js`.
