# FoodVibe — Reuse & Homogeneity Audit (pasted by Dandan 2026-10-20)

Snapshot: origin/main `8ffda3d2`. Status: proposal — the refactor plans (§4 P1–P9) run AFTER the MVP.
During the MVP run, `docs/mvp/run-mode.md` "Reuse first" applies. Note: the audit's proposed ADR number 0023
is taken by the MVP tenancy ADR; the reuse ADR will be 0024 or later.

## Family map (what to reuse — base path · selector)

UI families:
- **Search combobox / picker** — `shared/custom-select` (`app-custom-select`, `typeToFilter`, `allowTypedAdd`). 7 page-local copies of the `input + <app-scrollable-dropdown> + listbox + <app-add-option-row>` shell exist (menu-intelligence event-type + section-category, menu-dish-row, recipe-book-list ingredient filter, recipe-builder ingredient-search / preparation-search, recipe-logistics-picker). Do not add an 8th.
- **Multi-pick with chips** — `shared/custom-multi-select` (CVA) and `shared/chip-search-dropdown` (events, product-form). Two bases for one job; prefer custom-multi-select for new code.
- **Modal shell** — no component; CSS engines in `src/styles.scss` `.c-modal-overlay / .c-modal-card / .c-modal-actions / .c-modal-body`. 11 modals have no Escape; only 4 of 21 have `role="dialog"`. New modals: use the engines + Escape + role="dialog".
- **Modal controller** — 13 hand-written services in 3 shapes; for new modals prefer the signal-only shape with a stored resolver (no RxJS).
- **List page** — `shared/list-shell` (`app-list-shell`, 11 slots) + `page-header`, `selection-bar`, `row-actions-menu`, `empty-state`, `column-carousel`, `list-row-checkbox`. menu-library, venue-list, trash, metadata-manager don't use it (card grid needs a future `layout: 'cards'`).
- **List logic** — no util yet; `onClearSearch`, `onSearchEscape`, `setSort`, `clearAllFilters` copied 4–7×; search filters don't use `normalizeHebrew`.
- **Empty / no-results** — `shared/empty-state` (`app-empty-state`) + `.c-empty-state`.
- **Form field** — CSS only: `.c-input`, `.c-input-wrapper`, `.c-input-stack`, `.c-field-error`. `.form-group` defined 4× locally.
- **Entity form behaviour** — `core/validators/item.validators.ts` (`duplicateNameValidator`, `duplicateEntityNameValidator`); `hasRealChanges` implemented 5 ways.
- **Chip / badge** — `.c-chip` (unused), `.c-toggle-chip`, `.c-tap-chip`, `.c-tab-pill`, `.c-filter-chip`; ~80 local chip classes.
- **Loading / feedback** — `shared/loader`, `LoadingService`, `UserMsgService`. Dead: `shared/change-popover`, `shared/floating-info-container`.

Logic families:
- **Entity data service** — `core/services/base-entity-data.service.ts` (`BaseEntityDataService<T>`); recipe/dish/product/menu-event copy its load block.
- **Taxonomy** — `TaxonomyStore`; facades repeat try/catch; `unit-registry` still has RxJS `unitAdded$`.
- **State** — signals; `kitchen-state.service.ts` wraps Promises into Observables (16 `.subscribe` sites).
- **Page entry loading** — route resolvers `core/resolvers/*-ensure-loaded.resolver.ts`.
- **Errors** — `logging.error` + `userMsg.onSet*Msg(translate(key))`; 47 raw-Hebrew toasts exist.
- **Helpers** — `core/utils/*` (29 files); time/date/percent/debounce helpers are copied page-locally.
- **HTTP** — `http-storage.adapter.ts`; API paths literal in 8 files; `gemini-usage.util` raw fetch bypasses the interceptor.
- **Server** — `jwt.verify` repeated (generic.js, log.js); `isAdmin` re-declared in generic.js; 5 rate limiters per file; `ai.js` 28 hand `res.status(400)` checks.

Code-shape drift (rules): `.c-*` defined outside styles.scss (13 files); `@layer` missing in 35 of 43 scss; OnPush missing on cook-view and recipe-builder pages; decorators (`@ViewChild`, `@HostListener`); `*ngIf/*ngFor` in product-form; missing `app-` prefixes; non-`is/has` boolean names; inputs drop the trailing `_` (undocumented); raw Hebrew in `.ts`/`.html`.

## Decision ladder
1. Use as is. 2. Use with existing inputs. 3. Extend the family (new input/variant/hook on the base). 4. New family — only with a justification, built in `shared/`, never page-local. Sibling rule: more than ~3 variant flags → a sibling component, not another `@if`.

## After-MVP refactor plans (not in this run)
P1 reuse layer (registry `docs/brain/component-families.md`, ladder in standards, `## Reuse Check` in prd-template, `scope-check --reuse`, `scripts/reuse-lint.mjs`, `@utils`/`@pipes` aliases) · P2 modal shell + ModalController · P3 search combobox convergence · P4 list kit (`useListControls`, list-shell cards layout) · P5 data-service base + KitchenState Promises · P6 form kit (`app-form-field`, `useUnsavedChanges`) · P7 messages & errors · P8 chip engine · P9 rule sweep.
