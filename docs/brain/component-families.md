# Component families — what to reuse before you build

The single list of FoodVibe's shared pieces ("families"): for each job, which piece to use, where it lives, and
the page-local copies that still exist. Before you create any component, util, pipe, service or `.c-*` class,
find its family here and follow the decision ladder in `docs/agent/standards-reuse.md`. ADR:
`docs/brain/decisions/0024-reuse-layer.md`.

See every UI family live at `/dev/catalog` (dev builds only, plan 535).

Which pieces make a whole page, and how pages behave: `docs/agent/house-style.md` (page recipes and behaviour rules).

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
path · selector or symbol) · `When` · `Inputs / variants` · `Known copies` (counted on the mvp-review branch
`1953dcb5`, 2026-10-21; the audit numbers were from `8ffda3d2`) and the plan that removes them.

Optional field `Design changes`, written by `/design-port` Step 6 when a family's look changed:
`- Design changes: <YYYY-MM-DD> <handoff slug> — <what changed> — base | variant <name> — re-checked: <screens>`.

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
  `src/app/pages/menu-intelligence/services/menu-picker-search.service.ts`. Also `src/app/shared/client-picker/`
  (`app-client-picker`, plan 546).

### client-picker — find, show or add one client

- Status: stable (plan 546)
- Use: `src/app/shared/client-picker/` · `app-client-picker` (built on `app-search-combobox`: search by name/phone, the picked client
  as a name inside the field with an X, and for an owner the add-client view); the add fields live in
  `src/app/shared/client-form/` · `app-client-form` (name, phone, "עוד פרטים"; saves through `ClientDataService.addClient()`, or through `updateClient()` in edit mode when it gets a `client` input, plan 551).
  `NewInquiryDialogComponent` takes `initialClient` to open with a client picked (plan 551).
- When: any screen that links a record to a client (new-inquiry dialog, event stage bar, the client section).
- Inputs / variants: `selected`, `inputId`, `variant: 'box' | 'plain'`, `closeOnOutsideClick`, `allowAdd` (false: no add row, a merge target), `exclude` (client ids left out); outputs `picked`, `cleared`,
  `addingChange`, `escaped`, `outsideClick`; method `back()` (leave the add view, true when it did).
- Known copies: none.

### multi-pick — pick several values, shown as chips

- Status: converging — plan 452 kept both bases; `chip-search-dropdown` is deprecated pending the Human's answer (ADR 0025)
- Use: `src/app/shared/custom-multi-select/` · `app-custom-multi-select` (CVA) — the base for new code.
- Second base (same job, **deprecated**): `src/app/shared/chip-search-dropdown/` · `app-chip-search-dropdown` (product form:
  category, supplier, allergens). It converts to `custom-multi-select` only after the behaviours listed in ADR 0025 exist there.
- When: the value is a list (allergens, labels, categories) and the user adds/removes chips.
- Known copies: none page-local; two bases for one job.

### modal-shell — the popup frame

- Status: converged (plan 451) for the engine-based popups; 7 hand-drawn dialogs remain (follow-up plan)
- Use: `src/app/shared/modal-shell/` · `app-modal-shell` (role=dialog, aria-modal, Escape for the top-most
  popup only, focus in / trap / restore, `dismissible` while busy, `[hasChanges]` = Escape / backdrop ask before discarding typed edits (plan 498; the popup's own Cancel / X never asks), `titleKey` / `labelledBy` / `labelKey` for the
  accessible name). It renders the `.c-modal-overlay` / `.c-modal-card` engines from `src/styles.scss`; put
  `.c-modal-body` / `.c-modal-actions` inside it. Simple yes/no: `src/app/shared/confirm-modal/` · `app-confirm-modal`.
  `ConfirmModalService.open(msg, { typedConfirm })` — confirm waits for an exact typed text (plan 486).
- When: any popup. Render the shell inside the owner's `@if (isOpen)`; never draw `.c-modal-overlay` by hand.
- Stacking: `[zIndex]` takes a `--z-*` token (`src/styles.scss`, plan 538); `[topLayer]` puts a popup in the browser top layer (the confirm popup uses both, so a question is always in front).
- Phone bottom sheet: `[sheet]="true"` adds the phone-only `.m-sheet` / `.m-sheet-card` helpers (plan 487, pricing meter); wider screens keep the centred popup.
- Users (15): auth, confirm, global-specific, restore-choice, add-equipment, add-item, quick-add-product,
  quick-edit-product, translation-key, label-creation, ai-menu, ai-product, ai-recipe, unit-creator, unit-edit-dialog.
- Lint: `reuse-lint` rule `hand-drawn-modal-overlay` warns on a new `class="… c-modal-overlay"` in a template; rule `native-browser-dialog` warns on a new `window.confirm` / `alert` / `prompt` (use `ConfirmModalService`).
- Known copies (hand-drawn `.c-modal-overlay` with their own document Escape listener):
  `src/app/pages/menu-intelligence/components/event-closing-dialog/`,
  `src/app/pages/menu-intelligence/components/not-closed-dialog/`,
  `src/app/pages/menu-intelligence/components/prep-sheets/`,
  `src/app/pages/menu-intelligence/components/supplier-orders/`,
  `src/app/shared/new-inquiry-dialog/`,
  `src/app/pages/recipe-builder/components/paste-ingredients-dialog/`,
  `src/app/pages/equipment/components/equipment-list/` (side panel).
  Not engine-based (own `role="dialog"` + Escape, kept off the shell to keep their look):
  `src/app/pages/menu-intelligence/components/menu-export-sheet/` (bottom sheet), `src/app/shared/export-preview/`.
- Recipes: recipe-detail

### modal-controller — open a popup and get its answer

- Status: converged (plan 451)
- Use: `ModalController<TResult>` in `src/app/core/services/modal-controller.ts` — each popup service creates
  `new ModalController<Result>(cancelValue)`, exposes its read-only `isOpen_`, and calls `open()` (a Promise of the
  result; a second open cancels the first) and `close(result)`. Signals only, no `Subject` / `firstValueFrom`.
  The Escape stack (`pushModalShell` / `popModalShell` / `isTopModalShell`) lives in the same file.
- When: code needs to open a popup and await the result.
- Users (13 services): in `src/app/core/services/` the add-equipment, add-item, auth, confirm, global-specific,
  quick-add-product, quick-edit-product, restore-choice and translation-key `*-modal.service.ts`; in `src/app/shared/`
  the ai-menu, ai-product, ai-recipe and label-creation `*-modal/*.service.ts`.
- Also used by `PlatformLogisticsItemsComponent` (`ConfirmModalService`, plan 532) and `logistics-item-manager` (`open` / `openTernary` choices: remove, hide, unsaved question, plan 581).
- Known copies: none (the 7 hand-drawn dialogs above are opened by a page-local signal, not a service).

### list-page — a list screen (header, search, filters, rows, selection)

- Status: converging — plan 453 adds a cards layout and moves the remaining pages on
- Use: `src/app/shared/list-shell/` · `app-list-shell` (named slots) with `src/app/shared/page-header/`
  (`app-page-header`), `src/app/shared/selection-bar/` (`app-selection-bar`), `src/app/shared/row-actions-menu/`
  (`app-row-actions-menu`), `src/app/shared/column-carousel/` (`app-column-carousel-header`,
  `app-column-carousel-cell`), `src/app/shared/list-selection/` (`app-list-row-checkbox`, `list-selection.state.ts`).
- When: any screen that lists entities.
- Plan 651 page-local pieces of the stock count page: the move-counted button row (`.stock-count__toolbar`), the one-line name cut (`.stock-count__name`), the unit warning line (`.stock-count__unit-note`), the phone base-column head (`.stock-count__base-head`), the past-counts row (`.stock-count__past`).
- Plan 655 page-local pieces of the stock count page: the draft line's question row (`.stock-ai__question`), the base-amount control (`.stock-count__base-btn`) and its popover (`.stock-count__base-pop`).
- Plan 658: the stock count shows a unit by its saved Hebrew name (`unitName_` → `TranslationService.translate`, the key when none). `.stock-count__base-pop` is one measured `popover="manual"` box at every width: `max-content` wide, placed by `placeInViewport` below its control (above when no room), re-placed on resize, closed by an outside tap, a scroll or a second tap. `app-modal-shell [light]` (plan 657) is removed. `app-list-row-checkbox` reads `--row-checkbox-size` (default unchanged); the count page sets it per breakpoint.
- Plan 747: the stock count's base hint now uses the shared tooltip (family `tooltip`: `[appTooltip]` on `.stock-count__base-btn`, hover and keyboard focus above a phone, a tap on touch); the custom `.stock-count__base-pop` box and its placement code are removed.
- Plan 651: the past-counts list on the stock count page reads `GET /api/v1/stock/counts?status=all` through `PastCountsService` (`src/app/pages/inventory/components/stock-count/past-counts.service.ts`).
- Users today (6): client list, equipment, inventory products, recipe book, suppliers, the knowledge page (`src/app/pages/frontdesk/knowledge/`, plan 554).
- Known copies (4 list pages not on the shell): `src/app/pages/menu-library/components/menu-library-list/`,
  `src/app/pages/venues/components/venue-list/`, `src/app/pages/trash/`, `src/app/pages/metadata-manager/`
  (card grids need a `layout: 'cards'` first).
- Plan 745: `app-list-shell` takes `[columns]` (`ListColumn[]`, `src/app/shared/list-shell/list-columns.util.ts`); it measures its own width with a ResizeObserver and `fitColumns()` decides which columns still fit as their own cell and which fall into the carousel column (two the first time, then one by one, in each column's `fall` order). The column carousel renders a fall column either way through `*appFallColumn` (`fall-column.directive.ts`); `ColumnCarouselGroupDirective.collapsed` carries the fallen ids. Lists without `columns` keep `gridTemplate` / `mobileGridTemplate` and the phone-only carousel.
- Plan 747: `ListColumn.stay` (the name and the actions never fall; a column with no `fall` falls after the ranked ones, from the end), `fitColumns()` writes a plain `fr` track as `minmax(<min>, <fr>)` so a cell is never narrower than its `min` (one-line cells set it to their content: rating 8.5rem, phone 9rem, cost and price 6rem, date 7rem, count 4.5rem) and reports `dropped` (the checkbox column, dropped when there is no room; the host then gets `.fit-no-select`). Shared cell helpers: `.cell-nowrap` and `.cell-line` (one line with an ellipsis) from `app-list-shell`. The switching cell no longer draws a label above its value.
- Plan 745 pieces: `.column-carousel--measured`, `.cc-box`, `.cc-box--cell`, `.cc-box--header`, `.cc-fall` (the switching column inside a measured carousel host) and `.dc-resizable` (the dev catalog box the reader resizes).
- Design changes: 2026-11-25 plan 745 — columns fall into the carousel by measured width — base — re-checked: products (the other lists keep the old mode)
- Design changes: 2026-11-26 plan 746 — the five other lists declare columns that fall — base — re-checked: recipe book, suppliers, equipment, clients, invoices
- Recipes: recipe-list, recipe-detail, recipe-form, recipe-settings, recipe-board

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
- Recipes: recipe-list

### empty-state — nothing here / no results

- Status: stable
- Use: `src/app/shared/empty-state/` · `app-empty-state` (+ `.c-empty-state` in `src/styles.scss`).
- When: an empty list or a search with no results.
- Also used by `PlatformLogisticsItemsComponent` (plan 532) and `PlatformAiShotsComponent` (plan 600, the two example lists).
- Known copies: not counted.
- Recipes: recipe-list, recipe-detail, recipe-settings, recipe-board

### form-field — label, input, error

- Status: stable — plan 455 built `app-form-field`; the equipment, supplier, venue and product forms are on it
- Use: `src/app/shared/form-field/` · `app-form-field` (`label`, `forId`, `error`, `hint`, `layout`, `labelStyle`; the control is projected) on the
  CSS engines in `src/styles.scss`: `.c-input`, `.c-input-wrapper`, `.c-input-stack`, `.c-field-error`;
  clear button: `src/app/shared/input-clear/` (`app-input-clear`).
- When: any form input with a label.
- Server refusals (plan 540): `serverFieldErrors(err, map)` from the server-refusal util (alias utils) fills `validationErrors_`; templates read the key from the map.
- Known copies: none. Kept on purpose: `.product-field` in `product-form.component.scss` (collapsible blocks and purchase rows that hold a custom
  label or content, not a plain label + input).
- Dates (plan 502): every date is `app-date-field` (`src/app/shared/date-field/`); the only `type="date"` left is its hidden picker. List filters use one field per end (from / to). reuse-lint warns on a new native date input. Styled only from inside its component; reuse-lint `family-styled-from-outside` warns on outside rules.
- Times (plan 537): every time of day is `app-time-field` (`src/app/shared/time-field/`); the only `type="time"` left is its hidden picker. Styled only from inside its component; reuse-lint `family-styled-from-outside` warns on outside rules.
- Multi-line boxes (plan 502): `TextareaAutoGrowDirective` has the selector `textarea`; import it in the component and every box grows. Fixed on purpose: equipment form / list, venue form, event notes log, supplier-orders (read-only), search-combobox.
- Recipes: recipe-form, recipe-settings

### number-box — tap anywhere on a number box to edit the number

- Status: stable — plan 499 built `appNumberBox`; pricing meter, counter, product form, recipe quantity, cook view, settings, event dialogs and the AI / quick-add / unit modals are on it
- Use: `src/app/core/directives/number-box.directive.ts` · `appNumberBox` on the container of ONE `input[type=number]` (label, suffix, padding); it focuses the number and `SelectOnFocusDirective` selects all. Buttons, chips, other fields, disabled / read-only numbers and an already-focused number are left alone.
- When: a box whose only content is an editable number. Not for rows that mix free text and numbers.
- Plan 749: `app-month-pair` (`src/app/pages/monthly-plan/components/month-pair/`, page-local) is a user: a forecast / actual pair as `.c-chip--tap` chips (`.teal` when filled) that each open one short `appNumberBox` box; classes `.mpp`, `.mpp__side`, `.mpp__chip`, `.mpp__box`, `.mpp__suffix` are layout only. The seven-digit width of its box, the labour factor box and the target boxes is one mixin, `seven-digit-box` (`src/app/pages/monthly-plan/_seven-digit-box.scss`).
- Known copies: none for boxes. Left without it on purpose (outside plan 499 scope): `event-stage-bar` deposit amount, `menu-dish-row` inline prices, equipment / supplier / venue forms (`app-form-field` rows), `product-import` purchase qty (shares a row with a text field), `ai-draft-editor` ingredient rows.

### stepper — the + / − buttons around a number

- Status: stable — plan 500 built `appStepHold`; counter, menu guest count, cook-view amounts, recipe ingredient quantity and labor / cook time are on it
- Use: `src/app/shared/counter/step-hold.directive.ts` · `appStepHold` on a minus or plus button: `(stepHold)="step($event)"` (`false` first press, `true` repeat), `[stepHoldStop]` at the minimum; pointer events (touch and mouse), stops on pointerup / pointerleave / pointercancel. Step rules: `src/app/core/utils/quantity-step.util.ts` (`quantityIncrement` / `quantityDecrement`). A whole counter (value box + both buttons): `app-counter` (`src/app/shared/counter/`); it measures its value width once after the value changes (plan 645), never on every view check, so a long list of counters does not force a layout per check.
- When: any +/− button that changes a number. The page keeps its own skin (cook-view ink set, menu paper pill).
- Known copies: none. Kept on purpose: `scaling-chip` and `recipe-builder.page` use `app-counter` already.

### entity-form — name validation and unsaved-changes check

- Status: stable — plan 455 built one unsaved-changes helper
- Use: `src/app/core/utils/unsaved-changes.ts` · `useUnsavedChanges({ form, snapshot?, extra?, isSubmitted? })` (also registers the browser's reload / tab-close dialog, `warnBeforeUnload`); each page keeps `hasRealChanges()` as a one-line
  delegation; equipment, supplier and settings (tab switch via `?tab=`) are on it too (plan 498); `src/app/core/validators/item.validators.ts` · `duplicateEntityNameValidator` (`duplicateNameValidator` wraps it for products);
  leave-page guard: `src/app/core/guards/pending-changes.guard.ts`.
- When: a form edits a named entity, or must warn before leaving with unsaved changes.
- Known copies: none.
- Recipes: recipe-form

### chip — chips, badges, pills

- Status: stable — plan 457 built one chip engine; tab, toggle, tap, filter, removable chips and static tags are on it
- Use: ONE engine in `src/styles.scss`: `.c-chip` (static label, tones teal, amber, red or `--teal|--amber|--red`) plus variants
  `.c-chip--toggle` (label > input + span), `--tap` (button, aria-expanded, `.is-locked`), `--filter` (applied-filter chip),
  `--removable` (+ `.c-chip__remove`), `--tab` (+ `.active`, `.c-chip--home`, `.trash`); sub-parts `.c-chip__count` (+ `--zero`),
  `.c-chip__dot`; wrapper `.c-chip-group`. Markup: `class="c-chip c-chip--toggle"`. Tab chips: `src/app/core/components/tab-chips/` (`app-tab-chips`).
  Static tag: `.c-chip--tag` (size `--sm`; shape `--soft` radius-sm, `--square` radius-xs; tones `--teal|--amber|--red|--green|--allergen|--glass`,
  `--solid` = light text on a data color). Data-colored value chip: `--colored` (background/color inline).
- When: a small rounded label, toggle, tab or filter. Do not add a page-local chip: pick a variant. The old `c-toggle-chip`, `c-tap-chip`, `c-tab-pill`, `c-filter-chip` classes no longer exist.
- Users (plan 522): `event-logistics-panel` — toggle header (`--tap`), phase tabs (`--tab`), status/payer radios (`--toggle`).
- Tight group (plan 579): `.c-chip-group.c-chip-group--tight` — no block padding, `--space-1` gap, small chips; user: `event-logistics-panel` (one "נדרש" toggle + the two provider radios); plan 581 uses it too.
- Users (plan 600): `ai-examples-share` — one toggle chip in the owner's settings card (same card shape as `staff-stages-manager`).
- Users (plans 523, 581): `logistics-item-manager` — phase tabs (`--tab`), every question row a `--tag` (shared + lock), environment chips and the admin's scope radios (`--toggle` in `--tight` groups).
- Recipes: recipe-board
- Known copies: none that are plain pills. Kept on purpose (bespoke, reasons in `docs/mvp/runs/457.md`): menu-intelligence paper skin
  (`event-chip*`, `counter-pill*`, toolbar `.pill`), cook-view ink set (`cv-chip*`, `cv-row-pill`, `cv-source-pill`, `cv-pill-btn`, `cv-mult-chip`),
  header `nav-pill` / `user-chip`, recipe-builder `logistics-chip`, `scaling-chip` shell, `venue-status-pill`, `select-all-pill`, `act-chip`.
- Status look (plan 577): a colour chip on a `span` renders as a white tag with a dot; a pressable chip is a `button` or carries `--toggle` / `--tap` / `--filter` / `--tab` / `--removable`, and keeps its own look.

### feedback — loading, toasts, errors shown to the user

- Status: stable — plan 456 moved every toast text into the dictionary
- Use: `src/app/shared/loader/` (`app-loader`), `src/app/core/services/loading.service.ts` (`LoadingService`),
  `src/app/core/services/user-msg.service.ts` (`UserMsgService`), `src/app/core/services/logging.service.ts`
  (`logging.error`). Pattern: `logging.error(...)` + `userMsg.onSet*Msg(translate(key))`.
- When: any wait, success or error the user must see.
- Also used by `PlatformLogisticsItemsComponent` (`UserMsgService`, plan 532).
- `app-front-desk-status-banner` (`src/app/shared/front-desk-status-banner/`): the persistent amber notice for a suspended front desk, on the dashboard and `/frontdesk/settings` (plan 557).
- Known copies: none (plan 456: no `onSet*Msg` call takes a string literal; the two dead popover folders were deleted).
- Backend paths: one `API` map in `src/app/core/services/http-storage.adapter.ts` (plan 456).

### edit-gate — show a save button only to someone who may save

- Status: stable (MVP, plan 428)
- Use: `src/app/shared/edit-gate/` · `app-edit-gate`; rules: `src/app/core/services/permission.service.ts`
  (`PermissionService`). The server still decides every write (`server/utils/permissions.js`).
- When: a page offers save/edit on a business item.
- Known copies: none.
- Recipes: recipe-settings

### cost-badge — partial / missing cost warning

- Status: stable (MVP)
- Use: `src/app/shared/partial-cost-badge/` · `app-partial-cost-badge`.
- When: a cost is shown that may be missing prices.
- Known copies: none.

### month-figures — a month's plan versus actual figures

- Status: stable (plan 728)
- Use: `src/app/shared/month-figures/` · `app-month-figures` (inputs `figures` from `monthFigures`, `targets`, optional `fixedHint`): «לא הוזן», «חלקי», «לפי היעד», band tags and the completeness badge.
- Plan 749: the monthly plan page feeds it the month as typed (`liveMonthOf`, unsaved values included); each «חלקי» tag and the badge carry what is missing as a hover hint.
- When: any month or dish screen that shows plan against actual money; never rebuild the table.
- Known copies: none.

### menu-dish-cost — the cost of a standing-menu dish

- Status: stable (plan 725)
- Use: `src/app/core/services/menu-dish-cost.service.ts` · `MenuDishCostService` (`costOf`, `netPrice`, `leftPerDish`).
- When: any screen that shows what a menu dish costs or leaves (the menu page, the sales page, the later analysis). Never compute a menu dish's cost twice.
- Plan 748: the month sales page no longer shows a cost, so today only the menu page and the dish popup show one.
- Known copies: none.

### supplier-picker — pick one of a product's suppliers for a line

- Status: stable (plan 536)
- Use: `src/app/shared/supplier-picker/` · `app-supplier-picker` (inputs `product`, `value`, `canEdit`; output `picked`). Fixed popover placed with `placeInViewport`.
- When: a line may be bought from one of several priced suppliers and the owner chooses.
- Known copies: none.

### drag-reorder — drag a row to reorder, or move it with the arrow keys

- Status: stable (plan 742)
- Use: engines `.c-drag-list` (on `cdkDropList`), `.c-drag-item` (on `cdkDrag`), `.c-drag-handle` (on `cdkDragHandle`) in `src/styles.scss`; keyboard: `src/app/core/directives/reorder-keys.directive.ts` · `appReorderKeys` on the grip. Users: `src/app/pages/recipe-builder/components/recipe-ingredients-table/`, `src/app/pages/recipe-builder/components/recipe-workflow/`, `src/app/shared/ai-recipe-modal/ai-draft-editor/`, `src/app/pages/metadata-manager/components/ai-model-manager/`.
- When: a list whose rows the user can put in another order.
- Inputs / variants: `appReorderKeys` — `reorderIndex`, `reorderCount`, `reorderKey` (the row's track value); output `reorder` = `-1 | 1`. The list has one move method that both its drop handler and `(reorder)` call. The grip's label is the key `drag_reorder_hint`.
- Design changes: 2026-11-25 plan 742 — AI model row takes the shared drag look — base — re-checked: metadata manager
- Known copies: none.

### scroll-area — a block that scrolls with arrows and no scrollbar

- Status: stable (plan 742)
- Use: `src/app/shared/scroll-area/` · `app-scroll-area`; engines `.c-scroll-area`, `.c-scroll-arrow` in `src/styles.scss`; the arrows follow `appScrollIndicators` (`src/app/core/directives/scroll-indicators.directive.ts`).
- When: a block outside the list container scrolls on its own and must show there is more above or below.
- Inputs / variants: `maxBlockSize` (a CSS length; empty = fills its parent).
- Known copies: `src/app/shared/list-shell/` keeps its own arrows (same look); 9 page `.scss` files still make their own `overflow: auto` area (see `docs/agent/house-style.md`, rule `scroll`).

### sideways-row — one framed, draggable row of chips, tabs or buttons that scrolls sideways

- Status: stable (plan 743)
- Use: `src/app/shared/scroll-rail/` · `app-scroll-rail` (the visible frame as wide as its items, round arrow buttons outside it, grab and drag; `centerChild(el, { instant? })` slides a child to the middle). Users: `src/app/core/components/header/header.component.html` (the top bar), `src/app/core/components/tab-chips/tab-chips.component.html`, `src/app/pages/settings/settings.page.html`, `src/app/pages/diagnosis/components/diagnosis-workspace/diagnosis-workspace.component.html`, `src/app/pages/menu-intelligence/components/event-stage-bar/event-stage-bar.component.html`, `src/app/pages/menu-intelligence/components/menu-dish-row/menu-dish-row.component.html`, `src/app/pages/metadata-manager/metadata-manager.page.component.html`, `src/app/pages/dev-catalog/dev-catalog.page.html`.
- When: a row of several chips, tabs or buttons that can outgrow its width. Not a data table that scrolls sideways.
- Inputs / variants: `frame` (`'box'` default draws the container, `'none'` draws no surface), `snap` (`none` / `proximity` / `mandatory`), `arrows` (`auto` / `always` / `never`), `step` (px or `'page'`). Arrows are round buttons outside the container on a computer; on a phone (≤767px) or with `arrows="never"` they are not rendered and the sign of more inside the container shows instead (plan 747 round two): a fade and a 16px chevron over the edge of the side that has more, not pressable, hidden from assistive tech. Every user of the rail gets it with no change of its own.
- Page-local state classes (plans 743, 747): `.is-dragging` is a host class of `app-scroll-rail`, beside `is-overflowing`; `.sr-frame` (with `.has-frame`, `.has-prev`, `.has-next`) is the container inside it; `.sr-more` (`.sr-more--prev`, `.sr-more--next`, shown with `.is-shown`) is the sign of more inside the frame; `.dc-rail-box` is the dev catalog's 20rem demo box.
- Known copies: none.

### tooltip — one small box for every hint

- Status: stable (plan 744)
- Use: `src/app/shared/tooltip/` · `[appTooltip]` (`TooltipDirective`; the box is `TooltipBoxComponent`); engine `.c-tooltip` in `src/styles.scss`; placed by `placeInViewport`. Users: the product list's warning badge, the recipe book list's cost and date, the notification bell, the page header's count, the taxonomy kind manager's icon buttons, the dev catalog.
- When: a short explanation of a control, shown on hover, keyboard focus or tap — never the browser's `title`.
- Inputs / variants: `appTooltip` (an already translated string, or a template for rich content; empty = no tooltip), `tooltipPlacement` (`'above'` default / `'below'`), `tooltipOnClick` (a click pins it open). Plan 747: on a touch device (a touch pointer or no hover) hover does nothing and a tap on the control toggles it, whatever `tooltipOnClick` says; the box is clamped inside the viewport with a margin on both sides. Put no `[appTooltip]` on a natively disabled control (it gets no hover or focus): a control that is disabled for a reason uses `[appDisabledWhy]` below. Users added in plan 747: the product list's price and cut-off text cells, the stage row's lock reasons, the six lists' one-line cells.
- A disabled control says why (plan 747 round two, default `disabled-explains-why`): `src/app/shared/tooltip/disabled-why.directive.ts` · `[appDisabledWhy]="reason"` (`DisabledWhyDirective`; it composes `TooltipDirective` through `hostDirectives`, so the host must not also carry `[appTooltip]`). The reason is an already translated string; `null` or empty = the control works. With a reason: `aria-disabled="true"` and the class `.is-disabled` (the disabled look, in `src/styles.scss`), never the native `disabled`; the control stays focusable; `click` and Enter / Space are swallowed in the capture phase, so its action never runs; the reason shows on hover, keyboard focus, click and tap. On an `<input>` / `<textarea>` it also sets `readOnly` and swallows every key but Tab / Escape (copy stays); on a `<select>`, a checkbox, a radio, a range, a colour or a file input it swallows `mousedown` and the keys. Other inputs: `disabledWhyTip` (the control's ordinary hint, shown while it works), `tooltipPlacement`. Keep `[disabled]` only for "its own action is running" (saving, loading), next to `[appDisabledWhy]` when both apply. Reason keys: `sign_in_to_use`, `no_permission`, `money_locked_hint`, `fill_required_fields`, and the generic `why_*` keys in `public/assets/data/dictionary.json` (`why_nothing_to_save`, `why_write_first`, `why_choose_first`, `why_first_in_list`, `why_last_in_list`, `why_at_min`, `why_at_max`, `why_nothing_counted`, `why_list_empty`, `why_demo_only`).
- Shared controls that are disabled by their caller take the reason as `disabledWhy` (a translated string or `null`) and hand it to their inner control; a non-empty `disabledWhy` blocks the control by itself, `disabled` with no reason stays native: `app-counter` (both buttons and the value field), `app-date-field`, `app-time-field`, `app-custom-select`, `app-custom-multi-select`, `app-approve-stamp`, `app-rating-stars`, `app-list-row-checkbox`, `app-voice-note`, `app-supplier-picker`; `app-empty-state` takes it as `ctaDisabledWhy` for its call-to-action button. A shared control's own inner limit gives its own reason when the caller gave none: `app-counter` minus at the minimum (`why_at_min`) and plus at the maximum (`why_at_max`), `app-voice-note` send with nothing recorded or written (`why_voice_note_empty`).
- A blocked checkbox or radio inside a `<label>` (a `.c-chip--toggle` chip hides the input): the directive also opens the reason when the label is hovered and places the box against the label (`TooltipDirective.anchorTo`); the chip's dimmed look is the engine rule `.c-chip--toggle:has(> input.is-disabled)` in `src/styles.scss`. A component stylesheet that styles its own blocked control keys on `[aria-disabled='true']` next to `:disabled`, never on a second `.is-disabled` definition.
- Users of `[appDisabledWhy]` (plan 747): the signed-out actions of the product, recipe, supplier, equipment, venue and menu lists, the dashboard's add-product link, the metadata manager's add buttons, the venue page's edit and upload buttons, the cook view's edit and approve controls, the pricing meter's locked money fields (on their wrapper: the fields themselves stay disabled by the form), the dev catalog's sample.
- Known copies: the browser `title` hints that remain (51 in 27 templates, the `house-tooltip` lint) and the `[disabled]` bindings that stay (151 in 72 templates, the `house-disabled-why` lint: own-action ones and the shared controls' `disabled() && !disabledWhy()` pass-through) — both counted by the `reuse-copy.tooltip` debt baseline (202); the nutrition box (`src/app/shared/nutrition-badge/`) keeps its own look.

### engine-classes — shared `.c-*` CSS engines

- Status: stable (plan 458 sweeps the copies)
- Use: `src/styles.scss` — every `.c-*` class is defined there and only there (`docs/agent/conventions.md`).
- When: a style used by more than one component (buttons, inputs, modals, chips, empty state).
- Saving state (plan 502): a save button is `[disabled]` and `[attr.aria-busy]` while it runs, shows the `saving` label, and the signal is named `isSaving_` (`.c-btn-primary[aria-busy='true']` in `src/styles.scss`). Older flags (`isLoading_`, `isBusy_`, `isSubmitting_`) stay on their screens until touched.
- Pass theme (plan 572): `.c-num` gives a number tabular digits (prices, quantities, totals); `.c-pass-line` draws the amber lamp line under what is ready to go out (one per screen area).
- Plan 698: `.video-upload-btn`, `.video-progress` (page-local layout in `venue-detail.component.scss`) sit on top of `.c-btn-ghost`; no new `.c-*` class.
- Plan 725: `.rm-row__notice`, `.rm-row__state`, `.rm-row__cell`, `.rm-row__cell--name`, `.rm-row__num`, `.rm-row__ellipsis`, `.rm-row__wide`, `.rm-row__form`, `.rm-row__pair`, `.rm-row__sources`, `.rm-row__live` (page-local cell spacing and form layout of `restaurant-menu.page.scss` and the menu dish popup) sit on top of `.c-list-row`, `.c-list-body-cell` and `.c-input-wrapper`; no new `.c-*` class.
- Plan 726: `.ds-row__notice`, `.ds-row__actions` (plan 748: the one wrapper of the header actions), `.ds-row__month`, `.ds-row__intro`, `.ds-row__progress`, `.ds-row__banner`, `.ds-row__state`, `.ds-row__cell`, `.ds-row__cell--name`, `.ds-row__ellipsis`, `.ds-row__removed`, `.ds-row__reasons--over`, `.ds-row__skipped`, `.ds-row__skipped-list`, `.ds-row__wide` (page-local spacing and column rules of `dish-sales.page.scss`, on top of `.c-list-row`; the number column uses `.c-num`) and `.rr-dialog`, `.rr-dialog__title`, `.rr-dialog__list`, `.rr-dialog__row`, `.rr-dialog__label`, `.rr-dialog__note`, `.rr-dialog__error`, `.rr-dialog__given`, `.rr-dialog__given--over` (layout inside the reasons popup); no new `.c-*` class.
- Plan 727: `.monthly-plan-page`, `.mp-page`, `.mp-new`, `.mp-picker`, `.mp-card`, `.mp-error`, `.mp-card__title`, `.mp-grid`, `.mp-field`, `.mp-field__label`, `.mp-muted`, `.mp-suffix`, `.mp-check` (page-local layout of `monthly-plan.page.scss`, on top of `.c-glass-panel`, `.c-input-wrapper` and `.c-chip`) and `.business-group`, `.business-group__title` (the month targets group of the business settings tab); no new `.c-*` class.
- Plan 749: `.mp-body`, `.mp-inputs`, `.mp-picture`, `.mp-field__row`, `.mp-box`, `.mp-checks` (the dense two-side grid and the short target boxes of `monthly-plan.page.scss`) and `.lc__box` (the labour card's short factor box).
- Plan 742: `.c-drag-list`, `.c-drag-item`, `.c-drag-handle` (the shared drag look, family `drag-reorder`); `.c-scroll-area`, `.c-scroll-arrow` (family `scroll-area`); plus one zero-specificity `:where(…):focus-visible` keyboard ring for every button, link and `role` / `tabindex` control.
- Plan 744: `.c-tooltip`, `.c-tooltip--below` (the shared tooltip box, family `tooltip`).
- Known copies: 15 component `.scss` files start a selector with a `.c-*` class (define or restyle an engine locally).

### motion-tokens — how long things move and with which curve

- Status: converging — plan 740 added the lint; the alignment plans move the typed times onto the tokens
- Use: the tokens in `src/styles.scss` `:root` — `--dur-fast` (0.15s), `--dur-base` (0.2s), `--dur-slow` (0.25s), `--ease-spring`, `--ease-smooth` (house rule `motion` in `docs/agent/house-style.md`).
- When: any `transition` or `animation`.
- Known copies: a typed time in a component stylesheet (counted in `_shared/debt-baseline.json` as `reuse-copy.motion-tokens`).

### voice-note — record or type a spoken note

- Status: stable (plan 623)
- Use: `src/app/shared/voice-note/` · `app-voice-note`.
- When: a screen takes a spoken or typed note and needs it as text.
- Inputs `purpose`, `placeholderKey`, `sendLabelKey`, `busyLabelKey`, `busy`, `disabled`, `[(text)]`; output `send` = `{ text, source: 'voice' | 'text', fileId: string | null }` (`'voice'` when the text is the transcript of a recording, with the id the transcribe route returned; `'text'` when pasted or typed). Stops at 180 seconds; typed fallback when the browser cannot record.
- Known copies: none; first user `logistics-note-draft`.

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
- `FrontDeskBadgeService` (`front-desk-badge.service.ts`): app-wide count signal for the front desk badge (plan 552).
- `LayoutModeService` (`layout-mode.service.ts`): root signal `bare_` from the deepest route's `data.bare`; the shell hides header, tabs and quick-add on the public pages (plan 555).
- Known copies: none.

### taxonomy — categories, units, labels, kinds

- Status: stable
- Use: `src/app/core/services/taxonomy-store.service.ts` · `TaxonomyStore`.
- When: a page reads or adds a category, unit, label or kind.
- Facades load through `loadSafely` / `reloadSafely` (one logging path, plan 454).
- Users: `station-registry.service.ts`, `logistics-item-registry.service.ts` (plan 521, phase + environment filter).
- Plan 579: kind `logisticsSection` (a business's own sections); `logisticsItem` gains `removedAt` (removed from that date, older events keep it) and `foldedAt` (server-written when promoted: the business's own copy is kept, not deleted, so it still dates the question). `LogisticsItemRegistryService` adds `allItems_`, `hiddenAt_`, `defaultItems_`, `sections_`, `sectionLabel()` and `forEvent()` (the date rule); `items_` is the live list.
- Plan 622: `visibleLogisticsItems` in `shared/schemas/logistics/visible-items.ts` is the one date and environment rule for which logistics questions an event sees; the server's notes-to-checklist draft and the browser both call it.
- Plan 623: LogisticsItemRegistryService.forEvent calling visibleLogisticsItems in `shared/schemas/logistics/visible-items.ts`, the one rule the server uses too.
- Known copies: none.

### page-entry-loading — data ready before a page opens

- Status: stable
- Use: route resolvers `src/app/core/resolvers/*-ensure-loaded.resolver.ts`; the consultant's entry check `diagnosisGuard` in `src/app/pages/diagnosis/diagnosis.guard.ts` (plan 634: home modules while acting, `moduleGuard` at home).
- When: a route needs its collection loaded first, or a screen opens only for the consultant's own module.
- Known copies: none.
- `monthlyPlanGuard` (`src/app/pages/monthly-plan/monthly-plan.guard.ts`, plan 727): staff go to `/dashboard`, everyone else passes `moduleGuard(['monthly_plan'])`; the server stays the real gate.
- Recipes: recipe-form
- Plan 651 (leave-and-return): `ReturnToService` in `src/app/core/services/return-to.service.ts` — a page that sends the person away passes `?returnUrl=` (an in-app path, checked by `safeUrl`) and keeps the line it came from with `setPending`; the product form returns there with `?addedProduct=<id>`; the stock count takes the line back with `takePending`.

### helpers — pure functions

- Status: stable
- Use: `src/app/core/utils/` (one file per topic, each with a spec); money / quantity / percent rounding and
  formatting only from `src/app/core/engine/rounding.ts`; Hebrew-insensitive matching: `normalizeHebrew` in
  `src/app/core/utils/recipe-match.util.ts`. Import through `@utils/*` (and pipes through `@pipes/*`).
- the unit mapping after a pick (plan 653): `unitForSpoken` in `src/app/pages/inventory/components/stock-count/spoken-unit.ts` — the spoken unit mapped to
  the picked product's own units, same table as the server `resolveUnit`; none fits → flagged, not counted.
- reading the unit word from the text (plan 654): `unitWordFromText` in `server/utils/stock-extract.js` — when the model
  drops the unit, the word beside the product name in the cook's own text is kept as `spokenUnit`; none →
  `unitMissing`, never the base unit. Browser side: `unitChoicesFor` in `src/app/pages/inventory/components/stock-count/spoken-unit.ts`.
- the browser breakpoint constants (plan 656): `breakpoints` in `src/app/core/utils/breakpoints.ts` — `PHONE_MAX`,
  `TABLET_MAX`, `PHONE_QUERY`, `TABLET_DOWN_QUERY`, `DESKTOP_QUERY` (phone ≤767, tablet ≤1023, desktop ≥1024); the
  only `.ts` file that types a media width. Styles use the same names from `src/app/core/styles/_breakpoints.scss`.
- the net price of a dish (plan 724): `netPriceOf` in `shared/schemas/dish-analysis/net-price.ts` — the price without VAT
  by the business VAT rate and dealer type (`patur` = unchanged); the menu page, the month close and the analysis use it.
- the month key (plan 726): `month-key.util` in `src/app/core/utils/month-key.util.ts` — `currentMonthKey`, `shiftMonthKey`, `isMonthKey`, `monthKeyLabel` for a `YYYY-MM` month; the monthly plan page (727) uses it too.
- the month and target rules (plan 727): `month-rules` in `shared/schemas/month/month-rules.ts` — `MONTH_KEY_PATTERN`, `monthKeyOf` (the Asia/Jerusalem month), `shiftMonth`, `monthLabel`, `MONTH_TARGET_KEYS`, `MONTH_TARGET_DEFAULTS`, `MONTH_TARGET_BANDS`; no zod; `month-key.util` wraps it so there is one month rule.
- starter fixed lines and default groups (FIXED_STARTER_KEYS, defaultFixed, defaultLabour, LABOUR_FACTOR_DEFAULT) (plan 729), in the same `month-rules.ts` — `FIXED_STARTER_KEYS`, `FIXED_LINES_MAX`, `LABOUR_FACTOR_DEFAULT`, `defaultFixed()`, `defaultLabour()`; the server's new month and the browser's older month start from the same lines.
- the monthly plan's draft and hint helpers (plan 749), beside the page in `src/app/pages/monthly-plan/`: `month-draft.ts` — `draftOf` (a stored employer total read back as gross pay), `liveMonthOf` (the month as typed, fed to `monthInputOf` / `monthFigures`); `month-hints.ts` — `missingHint`, `unenteredLinesHint` (the «חלקי» hover texts, also used by `app-month-figures`).
- When: any pure helper (time, number, text). Never page-local.
- Known copies: time / date / percent / debounce helpers copied page-locally (audit; not recounted).
- `describePlatformChange` (`src/app/pages/platform-dashboard/components/platform-business-dialog/platform-business-dialog.component.ts`): one stored platform change `{ field, from, to }` as a Hebrew line (plan 638).
- Plan 628: `priceChangePct` in `src/app/core/utils/price-change.util.ts` is the one browser rule for the percent a price moved (two decimals, null with no old price); `buildInvoiceLines` in `src/app/core/utils/invoice-lines.util.ts` maps kept preview rows to the `invoice.lines` of the apply body (the server has its own `buildInvoiceLines` in `invoice-trail`).
- Plan 648: matching spoken names to products — `matchSpoken` in `server/utils/stock-extract.js`, on the server, so the model never gets the catalog. Plan 650: the Hebrew name folding (`foldWord`: ־ות / ־ים / ־ה endings dropped) and the score (exact > starts-with > contains > shared words; counted-before and minimum break ties) answer `matched`, `choose` (up to 5, best first) or `unmatched` (up to 5 nearest).
- Plan 641: previousPriceOf(product, supplierId) in src/app/core/utils/price-change.util.ts is the one browser rule for the price an invoice line is compared with (the invoice supplier's own price, else the lowest other source's; null with none).
- Plan 373: `isoToLocalEpoch` in `src/app/core/utils/date-input.util.ts` turns a `yyyy-mm-dd` into local midnight in epoch ms (the inverse of `todayIso(new Date(ms))`); `video-link.util` (`videoSourceKey` in `src/app/core/utils/video-link.util.ts`) maps a video link's hostname to a translation key (YouTube, Drive, WhatsApp, else a plain link).
- Plan 632: `APP_RELOAD` in `src/app/core/utils/app-reload.util.ts` is the one way to reload the whole application at a path (`UserService.switchBusiness` and a refresh that moves the business call it); specs replace the token, no page calls `window.location` itself.
- `toCsv(columns, rows)` / `downloadCsv(text, fileName)` in `src/app/core/utils/csv.util.ts`: RFC 4180 CSV with a UTF-8 BOM and formula-injection guard, plus the Blob download (plan 557; the owner's front desk data export).
- `waLink(phone, text?)` in `src/app/core/utils/wa-link.util.ts`: a WhatsApp link from a stored phone (plan 552; plan 555 reuses it).
- `scalingRuleFrom(values, hadRule)` / `scalingRuleErrors(values)` in `src/app/core/utils/scaling-rule.util.ts`: the equipment loading rule (one per N guests, min, max) built and checked from form values; the full equipment form and the list's quick-edit popup both call it (plan 640).
- `aiCapErrorKey(err)` in `src/app/core/utils/ai-error.util.ts`: the dictionary key `ai_monthly_cap_reached` for the server's monthly-cap refusal, else null; every place that maps an AI 429 asks it first (plan 620).
- Plan 636: `stock-count.util.ts` (`src/app/core/utils/stock-count.util.ts`) — `unitOptionsFor`, `belowMinimum` and `countedAtFromIso`, the pure rules of the stock count sheet; conversion itself stays the shared `toBase`.
- Plan 651: `resolveUnit` in `server/utils/stock-extract.js` maps a spoken unit to a unit the product has (base, purchase units, known aliases such as «קילו»→kg); none fits → `unitNeedsFix` with `spokenUnit`. `matchSpoken` now answers `matched` only when no other product contains the spoken word.
- Plan 655: the three-part line check and the unit vocabulary — `unitVocabulary` / `buildUnitVocabulary` / `unitKeyOf` in `server/utils/stock-extract.js`: the live unit terms plus the Hebrew names from `dictionary.json` `units` and the `DICTIONARY_OVERRIDES` docs (global, then the user's), read per request, plus built-in spoken forms; the model gets each unit as key with its names and its Hebrew answer maps back to the key. `checkLine` (same file) is the three-part check: every line and entry carries `missing` (`product` / `amount` / `unit`), and `stock-ai-draft` asks one question per missing part. Below `$break-desktop` the count row uses `app-list-row-checkbox` for «נספר» and a small `.stock-count__base-btn` + `.stock-count__base-pop` (placed with `placeInViewport`) for the base amount.
- Plan 649: the reference mapping — `supplierIdMap` / `resolveSourceSupplier` in `server/services/sync-master.js` (master supplier id → the business copy) is the one map; push (`toMasterSupplierId`) and the repair (`planProductRepair`) use the same rule; see the supplier-refs family.

### http — talking to the server

- Status: stable
- Use: `src/app/core/services/http-storage.adapter.ts`; auth header and errors: `src/app/core/interceptors/auth.interceptor.ts`.
- When: any call to the server API; never a raw `fetch` or a hand-built `/api/v1` URL.
- `MonthPlanService` (`src/app/pages/monthly-plan/services/month-plan.service.ts`, plan 727): page-scoped client of the server-only `monthPlans` through `API.monthPlans`: `list`, `get`, `create`, `update`; throws the `HttpErrorResponse`.
- `PlatformAdminService.updatePlatform` (`src/app/core/services/platform-admin.service.ts`): one PUT of a business's modules, monthly AI cap and private mode with a reason, then reloads the table (plan 620).
- `PlatformAdminService.eraseLearnedData(businessId, reason)` (same file): one POST that erases what the platform learned from a business, returns the counts; `UserAdminService.deleteUser(userId, eraseLearned)` adds `?eraseLearned=true` (plan 639).
- `PlatformAdminService.getPlatformHistory(businessId)` (same file): one GET of a business's change history, newest first, read each time the dialog's history panel opens (plan 638).
- Plan 637: `GeminiService.extractStockCount` (`src/app/core/services/gemini.service.ts`) — one POST of a spoken or typed stock count to `API.ai('stock/extract')`, same `withRetry` + `modelParam_` pattern as `matchProductNames`; returns suggested lines, never saves a count.
- `StockCountService` (`src/app/pages/inventory/services/stock-count.service.ts`): page-scoped client of `API.stock` for the stock count screen — on-hand, the open draft, save draft (POST then PUT), finalize (plan 636).
- `PublicRequestService` (in the public-request page services folder): page-scoped client of `API.public` for the public pages (plan 555).
- Plan 624: `EventPipelineService.saveLoading` (`src/app/core/services/event-pipeline.service.ts`) — one PUT of a loading-list tick (`/events/:id/loading`), the same client as `saveLogistics`.
- Plan 632: `AccessService` (`src/app/core/services/access.service.ts`) reads and writes the consultant access routes through `API.access(...)`; `UserService.switchBusiness` posts `API.auth('switch-business')`.
- Plan 629: `ProductImportService.getPriceRises` (`src/app/core/services/product-import.service.ts`) reads `GET /product-import/price-rises` through `API.productImport`, the same client as `apply` and `resolve`.
- Plan 628: `GeminiService.readInvoice`, `ProductImportService.resolve`, the `invoice` argument of `apply`, `API.files` call the invoice read, memory, apply and file routes through the same `API` map (GeminiService.readInvoice, ProductImportService.resolve, the invoice argument of apply, API.files).
- `PlatformAdminService.getLearningStats`, `PlatformAdminService.getLearningStatus` (`src/app/core/services/platform-admin.service.ts`) read the platform learning numbers through `API.admin(...)` (plan 630).
- Plan 623: GeminiService.transcribeVoice, extractLogistics, confirmLogisticsDraft call the voice and logistics routes through `API.ai(...)`, the same pattern as the other AI client methods.
- Plan 698: `CloudinaryService.uploadVideo(file)` (`src/app/core/services/cloudinary.service.ts`) — the unsigned-preset video upload with progress events, beside the image `upload`; `checkVideoFile` refuses a non-video or one over 100MB before any request.
- A data-API 400 on a write gets one toast and one `save.refused` log in the interceptor; callers skip their own toast with `refusalShownToUser(err)`.
- Known copies: `src/app/core/utils/gemini-usage.util.ts` uses a raw `fetch` that bypasses the interceptor;
  `/api/v1` literals in `src/app/core/services/logging.service.ts` and the interceptor.

### platform-history — the platform change history of a business (plan 638)

- Status: stable
- Use: `platformChangesOf(before, after)` in `server/routes/admin.js` compares the stored business with the values being saved and returns the `{ field, from, to }` rows written to `platformHistory`.
- Use: `describePlatformChange(change, translate)` in `src/app/pages/platform-dashboard/components/platform-business-dialog/platform-business-dialog.component.ts` turns one row into the Hebrew line.
- Use: the panel's layout classes `.pbd-top`, `.pbd-history`, `.pbd-history__head`, `.pbd-history__body`, `.pbd-history__list`, `.pbd-history__row`, `.pbd-history__meta` in `platform-dashboard.page.scss`.
- When: any platform change line of the business history; never format `{ field, from, to }` elsewhere.

### event-plan — event costing and planning engine

- Status: stable (MVP)
- Use: `src/app/core/engine/event-plan.engine.ts` with `src/app/core/engine/event-plan.service.ts`; units:
  `src/app/core/engine/units.ts` (plan 635: re-exports the one rule in `shared/schemas/units/to-base.ts` — `toBase`, `normalizeUnit`, `unitFamily`, `convertWithinFamily`, `optionRateInBase`, the unit constants, `unitRatesFrom`); portions: `src/app/core/engine/portions.ts`; the month engine `src/app/core/engine/month-plan.ts` (plan 728: `monthFigures`, `breakEven`, `dishPrice`, `bandOf`) is the monthly counterpart of C-PRICING.
- monthInputOf fixed, labour and purchases mapping (plan 729): `fixedInputOf`, lines vs rough, gross × factor as an estimate, purchases as actual food cost; it lives in `month-plan.ts`.
- When: anything that computes quantities, costs or prices for an event.
- Known copies: none.

### server-auth — who is calling the server

- Status: converging — plan 458 (rule sweep) decides
- Use: `server/middleware/auth.js` (token check), `server/utils/business-scope.js` (the only tenant-scoping path,
  ADR 0023), `server/utils/permissions.js` (the only write-permission path), `server/middleware/write-limit.js`,
  `server/middleware/require-module.js` (`requireModule`, `requireHomeModule`, `requireModuleForType`, `businessModules`, `clearModuleCache`: the module gate on a route),
  `server/services/access.js` (`resolveSession`, `canEnter`, `stillActing`, `liveGrant`: which business a session is in, plan 631).
- When: a server route checks who is calling, scopes data to a business, checks a write permission or limits a rate.
- Known copies: `jwt.verify` also in `server/routes/auth.js` and `server/routes/log.js`; `isAdmin` re-declared in
  `server/routes/generic.js`; rate limiters built per file in `server/routes/ai.js`, `server/routes/auth.js`,
  `server/routes/business.js`, `server/routes/log.js`, `server/routes/product-import.js`.

### modules-registry — which program modules a business has

- Status: stable — plan 615
- Use: `shared/schemas/modules-pure.ts` (the helpers, no zod; the browser imports this) and `shared/schemas/modules.ts`
  (re-exports them and adds the zod schemas) — `MODULE_KEYS`, `DEFAULT_MODULES`, `modulesOf`, `hasModule`, `MODULE_OF_TYPE`,
  `platformUpdateSchema`.
- When: the server gate or the browser service asks whether a business has a module. One shared file, so both use the
  same rule.
- Known copies: none.

### module-gate — the browser hides and skips what a business's modules turn off

- Status: stable — plan 620
- Use: `ModuleService` (`src/app/core/services/module.service.ts`) — `has`, `hasType`, `ready`; `moduleGuard(keys)`
  (`src/app/core/guards/module.guard.ts`) sends a screen of a missing module to `/dashboard`; the module field on
  `HeroFabAction` (`module?: ModuleKey`) hides an action in the floating button; `HttpStorageAdapter` returns an empty
  result without a request for a type whose module is off. Import the helpers from the modules-pure schema alias (no zod in
  the first bundle).
- When: a link, chip, screen, button or request belongs to a module. The server is the gate; the browser only hides.
- Known copies: none.
- The TabChip.money flag (`src/app/core/components/tab-chips/tab-chips.component.ts`, plan 727): a chip with `money: true` shows only when `PermissionService.can('editMoney')` (owner, consultant), beside `modules`.

### entity-schemas — one stored shape per file

- Status: stable — plan 615
- Use: the nine new entity schema files under `shared/schemas/entities/` (`invoice.schema.ts`, `price-history.schema.ts`,
  `invoice-alias.schema.ts`, `supplier-profile.schema.ts`, `ai-draft.schema.ts`, `stored-file.schema.ts`,
  `business-access.schema.ts`, `diagnosis.schema.ts`, `stock-count.schema.ts`), each one `z.strictObject` registered in
  `SCHEMA_BY_COLLECTION` in `shared/schemas/entities/index.ts`.
- plan 724 adds `menu-dish.schema.ts`, `dish-sales-month.schema.ts` and `dish-sales-alias.schema.ts` (dish analysis store).
- plan 727 adds `month-plan.schema.ts` (`monthPlans`, server-only; `null` = not entered, 0 = a real zero) and the pure month and target rules in `shared/schemas/month/month-rules.ts` (`MONTH_KEY_PATTERN`, `monthKeyOf` in Asia/Jerusalem, `shiftMonth`, `monthLabel`, `MONTH_TARGET_KEYS`, `MONTH_TARGET_DEFAULTS`, `MONTH_TARGET_BANDS`); `src/app/core/utils/month-key.util.ts` is a thin wrapper over them, so there is one month rule. The chip flag `TabChip.money` (tab-chips) hides a chip from a role that cannot `editMoney`.
- When: a new stored collection needs a shape.
- Known copies: none.

### ai-cap — monthly AI token cap per business

- Status: stable — plan 617
- Use: `server/services/ai-cap.js` — `capState`, `monthTokensByBusiness`, `clearCapCache`; checked before the model call
  in `server/services/gemini-client.js`.
- When: a server path calls the model and must refuse once the business has used its monthly cap.
- Known copies: none.

### ai-learning — whether the platform may learn from a business

- Status: stable — plan 618
- Use: `server/utils/ai-learning.js` — `mayLearnFrom(business)` (`aiPrivate !== true`); the private mark is written
  only through setAiPrivate in server/services/business.js (`setAiPrivate(id, value)` only writes the flag; plan 639).
- When: code copies something into a `'__master__'` pool or lists a business's AI material for the platform admin.
- Known copies: none.

### ai-draft — the AI draft trail (suggested vs saved)

- Status: stable — plan 618
- Use: `server/services/ai-drafts.js` — `saveAiDraft(req, { feature, subject, input, aiDraft, model })` (never throws,
  `null` on failure) and `confirmAiDraft(req, draftId, saved, ratio)`; collection `aiDrafts`, newest 500 per business
  and feature.
- When: an AI flow must store what the model suggested next to what the person saved, with a closeness score.
- Known copies: none.

### file-store — private files (audio, PDF, pictures)

- Status: stable — plan 619
- Use: `server/services/file-store.js` — `isFileStoreConfigured`, `putPrivateFile`, `keepStoredFile`, `signedFileUrl`,
  `deleteStoredFile`, `readUploadedFile`, `setFileStoreForTests`, `createMemoryFileStore`.
- When: a server path stores, reads, links or deletes a private uploaded file.
- Known copies: none.

### learning-stats — `buildLearningStats`, `weekStart` in `server/utils/learning-stats.js`

- Status: stable — plan 630
- Use: `server/utils/learning-stats.js` — `buildLearningStats` groups AI draft rows by flow, model and Sunday-start week; `weekStart` gives the week.
- When: the platform admin needs accuracy numbers per flow over time (`GET /stats` in `server/routes/admin-learning.js`).
- Known copies: none.

### cloudinary-requests — signed requests to the file provider

- Status: stable — plan 619
- Use: `server/services/cloudinary-requests.js` — `signParams`, `uploadRequest`, `downloadUrl`, `destroyRequest`; used
  only through `file-store`.
- When: building a signed upload, expiring download link or delete request.
- Known copies: none.

### learning — erasing what the platform learned from one business (plan 639)

- Status: stable
- Use: `eraseLearnedData(db, businessId)` in `server/services/business.js` — deletes the promoted `GEMINI_SHOTS` copies, every `aiDrafts` row of the business and its share of the shared name memory (`forgetBusiness`); returns counts.
- When: the platform admin explicitly erases what was learned (`POST /admin/businesses/:id/erase-learned`, `DELETE /admin/users/:userId?eraseLearned=true`); nothing else erases learned data.
- Known copies: none.

### business-delete — `deleteBusinessServerData` removes a business's server data

- Status: stable — plan 619
- Use: deleteBusinessServerData in server/services/business.js (also deletes the business's stored files). Keeps what was learned for every business; `eraseLearnedData` erases it (plan 639).
- When: a business is deleted and everything it owns on the server must go.
- Known copies: none.

### model-media — `needsMedia` in `callGemini` for audio and PDF input

- Status: stable — plan 619
- Use: needsMedia in callGemini (server/services/gemini-client.js) picks a media-capable model in the chain.
- When: a model call carries audio or a PDF.
- Known copies: none.

### invoice-trail — `invoiceApplyInputSchema`, `SUPPLIER_KEY_PATTERN`, `changePct`, `invoiceKeptRatio`, `buildInvoiceLines`

- Status: stable — plan 625
- Use: `server/utils/invoice-trail.js` — `changePct`, `invoiceKeptRatio`, `buildInvoiceLines`; the request shape is
  `invoiceApplyInputSchema` and `SUPPLIER_KEY_PATTERN` in `shared/schemas/entities/invoice.schema.ts`.
- When: the invoice apply route stores the invoice record, the price history rows and the draft closeness score.
- Known copies: none.

### invoice-read — `supplierKey`, `cleanInvoiceHeader`, `parsePrintedDate`, `cleanPrintedLines`, `suggestSupplier`, `INVOICE_READ_SYSTEM_PROMPT`, `invoiceReadRequestSchema`

- Status: stable — plan 626
- Use: `server/utils/supplier-key.js` — `supplierKey` (the one key naming a supplier across businesses);
  `server/utils/invoice-read.js` — the prompt and the pure cleaning of a model read; request and model-answer shapes in
  `shared/schemas/ai-invoice-read.schema.ts`.
- When: the invoice read route (`POST /api/v1/ai/invoices/read`) turns a photo or PDF into a header, a supplier suggestion and rows.
- Known copies: none.

### invoice-memory — `learnFromApply`, `resolveNames`, `forgetBusiness`, `invoiceResolveRequestSchema`

- Status: stable — plan 627
- Use: `server/services/invoice-memory.js` — `learnFromApply`, `resolveNames`, `forgetBusiness` (a business's own
  remembered invoice names and the shared supplier brain); the resolve request shape is
  `invoiceResolveRequestSchema` in `shared/schemas/entities/invoice-alias.schema.ts`.
- When: an invoice apply remembers printed names, a read looks them up, or a business is deleted and its memory must go.
- Known copies: none.
- Request shape: invoiceResolveRequestSchema in shared/schemas/entities/invoice-alias.schema.ts (the resolve read).

### ai-voice — `voiceTranscribeRequestSchema`, `VOICE_MIME_TYPES`, `VOICE_AUDIO_MAX_BASE64`, `VOICE_MAX_SECONDS`

- Status: stable — plan 621
- Use: `shared/schemas/ai-voice.schema.ts` — request and reply shapes, the mime list and the size and length limits of one
  voice-note transcription; served by `server/routes/ai/voice.js` (the recording is kept through `file-store`).
- When: a screen or route sends a voice note to be turned into a transcript.
- Known copies: none.

### logistics-extract — `logisticsExtractRequestSchema`, `buildQuestionList`, `cleanLogisticsDraft`, `keptRatio`

- Status: stable — plan 622
- Use: `shared/schemas/logistics/extract.schema.ts` — request, model answer, draft and confirm shapes of the notes-to-checklist draft; `server/utils/logistics-extract.js` — `buildQuestionList` (the questions sent to the model), `cleanLogisticsDraft` (drops what the model got wrong), `keptRatio` (share of the draft kept).
- When: a route turns an event's free-text notes into a draft logistics checklist.
- Known copies: none.

### loading-list — `buildLoadingList`, `LoadingRow`

- Status: stable — plan 624
- Use: `shared/schemas/logistics/loading-list.ts` — `buildLoadingList({ equipment, guestCount, answers })` is the one pure function that builds an event's loading rows (equipment by scaling rule, logistics items needed and paid by us or the chef); the sheet is `app-loading-list` inside the event's logistics card.
- When: any screen or test that needs "what goes on the truck" for an event.
- Known copies: none.

### invoice-screen — `priceChangePct`, `buildInvoiceLines` (browser), `app-invoice-header-strip`, `InvoiceDataService`

- Status: stable — plan 628
- Use: `src/app/core/utils/price-change.util.ts` — `priceChangePct(old, new)` is the one browser rule for "by how many percent did a price move" (two decimals, null when there is no old price); `src/app/core/utils/invoice-lines.util.ts` — `buildInvoiceLines(keptRows, printed)` maps kept preview rows to the `invoice.lines` of the apply body; `app-invoice-header-strip` (supplier, date, number above the import preview); `InvoiceDataService` reads the saved invoices and opens a stored file in a new tab.
- Plan 629: `isPriceRiseAlert(changePct, thresholdPct)` is the one rule for "a rise worth marking" (at or above the business's `priceRiseAlertPct`); `recipesUsingProducts(recipes, productIds)` finds the recipes and dishes that use a product directly or through preparations; `ProductImportService.getPriceRises` reads `GET /product-import/price-rises`; `app-price-impact-panel` and `app-price-rises-card` are page-local.
- Plan 641: `previousPriceOf(product, supplierId)` is the one rule for "the price to compare an invoice price with": the invoice supplier's own price, else the lowest other one (with its supplier); the import row sends `targetSupplierId` to update that supplier's price instead of adding a source.
- Plan 645: `isBigPriceChange(changePct, thresholdPct)` is the one rule for "a change to confirm before saving" (at or beyond the threshold, up or down); the import asks once through `ConfirmModalService.open`, one line per item. A supplier with the same trimmed, case-insensitive name is the same supplier: the import offers only the update.
- When: any browser screen that shows a price change, sends an invoice with the import save, or lists saved invoices.
- Known copies: none.

### price-impact-panel — `app-price-impact-panel`, `PriceImpactRow`

- Status: stable — plan 629
- Use: `src/app/pages/inventory/components/product-import/price-impact-panel/` — a read-only panel under the import save summary listing recipes and dishes with their cost before and after (30 rows, then "and N more").
- When: a screen must show what a price change does to recipe cost, computed by `RecipeCostService` before and after.
- Known copies: none.

### price-rises-card — `app-price-rises-card`

- Status: stable — plan 629
- Use: `src/app/pages/dashboard/components/price-rises-card/` — the dashboard card of prices that rose in the last 60 days (`getPriceRises`); owner or consultant; hidden when empty.
- When: the dashboard shows recent price rises.
- Known copies: none.

### diagnosis-card — `app-diagnosis-card`

- Status: stable — plan 652
- Use: `src/app/pages/dashboard/components/diagnosis-card/` — the dashboard card of the consultant's diagnoses (count of open, three newest, create); shown with `consultant_diag`, hidden when the load fails.
- When: the dashboard shows the consultant's diagnoses.
- Known copies: none.

### acting-banner — `app-acting-banner`

- Status: stable — plan 632
- Use: `src/app/core/components/acting-banner/` (`app-acting-banner`, rendered by the app shell right after the header on every non-bare screen) — the persistent bar that names the business a consultant or the platform admin is acting in, with one button back to their own (`UserService.switchBusiness(null)`); hidden at home and in print.
- When: a persistent notice with an action must stay on every screen; a toast disappears and `app-front-desk-status-banner` has no action.
- Known copies: none.

### learned-data-erase — `eraseLearnedData(db, businessId)` erases what the platform learned from one business

- Status: stable (plan 639)
- Use: eraseLearnedData(db, businessId) in server/services/business.js (called by the admin erase route and by the business delete when asked); client `PlatformAdminService.eraseLearnedData`.
- When: learned data of a business must be removed; going private never erases (it only stops learning).
- Known copies: none.

### platform-erase-box — `.pbd-erase` and `.pbd-erase__box`

- Status: stable (plan 639)
- Use: `src/app/pages/platform-dashboard/platform-dashboard.page.scss` · `.pbd-erase` (danger ghost button), `.pbd-erase__box` (reason field stack) in the platform business dialog.
- When: page-local layout of the erase action; no shared family fits.
### unit-rates — `unitRatesFrom`, `loadUnitRates`, `toBase` (shared unit rule)

- Status: stable — plan 635
- Use: `shared/schemas/units/to-base.ts` — `toBase`, `normalizeUnit`, `unitFamily`, `convertWithinFamily`, `optionRateInBase`, `SYSTEM_UNITS`, the unit constants and `unitRatesFrom(terms)`; the browser reaches it through the import @schemas/units/to-base (`units.ts` and the other app files re-export it), the server through the generated build output server/generated/schemas/units/to-base (`pnpm run build:schemas`). `server/utils/unit-rates.js` — `loadUnitRates(req)` reads the master and the business's own `unit` terms and returns the rates the server converts with.
- When: server code converts an amount into a product's base unit (a stock count); never write a second conversion.
- Known copies: none.

### diag-margin-report — `buildMarginReport`

- Status: stable — plan 633
- Use: `shared/schemas/diag/margin-report.ts` — `buildMarginReport`; the diagnosis route in `server/routes/diag.js` calls it.
- When: the diagnosis needs the menu margin per dish from recorded prices; never write a second margin calculation.
- Known copies: none.

### diag-volatility — `priceVolatility`

- Status: stable — plan 633
- Use: `shared/schemas/diag/volatility.ts` — `priceVolatility`; the diagnosis route in `server/routes/diag.js` calls it.
- When: the diagnosis scores how much a product's price moved over time.
- Known copies: none.

### diag-menu-draft — `shared/schemas/diag/diag-inputs.ts`, `shared/schemas/diag/menu-draft.ts`, `menuKeptRatio`

- Status: stable — plan 633
- Use: `shared/schemas/diag/diag-inputs.ts` (request schemas) and `shared/schemas/diag/menu-draft.ts` (model-reply schema, `menuKeptRatio`); `server/routes/ai/diag.js` uses them.
- When: the diagnosis menu-reading route validates a request or a model reply and scores the draft closeness.
- Known copies: none.

### diag-invoice-queue — `app-diag-invoice-queue`

- Status: stable — plan 634
- Use: `src/app/pages/diagnosis/components/diag-invoice-queue/diag-invoice-queue.component.ts` — a batch of chosen invoice files held in memory and handed one at a time to the embedded import preview.
- When: several invoice files are approved one after another; never read or apply several at once.
- Known copies: none.

### import-preview-embedded — `embedded`, `file` inputs and `applied` output on `app-product-import`

- Status: stable — plan 634
- Use: `src/app/pages/inventory/components/product-import/product-import.component.ts` — the `embedded`, `file` inputs and `applied` output on `app-product-import`: `embedded` hides the page header, the back link and the paste box; `file` starts the file read once per file object; `applied` reports the apply with its invoice id.
- Pieces: embedded, file inputs and applied output on app-product-import.
- When: a second screen hosts the import preview; never copy the preview.
- Known copies: none.

### stock-ai-draft — `StockAiDraftComponent`

- Status: stable — plan 637
- Use: `src/app/pages/inventory/components/stock-count/stock-ai-draft/stock-ai-draft.component.ts` — the "count by voice or text" section of the stock count sheet: the open button, the shared recorder (`app-voice-note`, purpose `stock`), the waiting state, the "not recognised" and "already counted" lists (plan 650: each spoken line shows its candidates as `c-chip--toggle` chips, an `app-search-combobox` of all products and «הוספת מוצר חדש»); it emits the server's answer and the sheet applies it.
- Pieces: StockAiDraftComponent, app-stock-ai-draft.
- When: a stock suggestion from voice or text is read and reviewed; never a second review UI for stock.
- Known copies: none.

### stock-extract — `server/utils/stock-extract.js`

- Status: stable — plan 637
- Use: `server/utils/stock-extract.js` — `STOCK_EXTRACT_SYSTEM_PROMPT`, `unitList`, `userPart`, `cleanStockLines` (spoken lines in, name-matched and unit-checked lines out, plan 648), `matchSpoken` and `stockKeptRatio`; `server/routes/ai/stock.js` and `server/routes/stock.js` (finalise) use it; the request and answer schemas are `shared/schemas/ai-stock-extract.schema.ts`.
- Pieces: server/utils/stock-extract.js, cleanStockLines, stockKeptRatio.
- When: a stock count text is turned into lines or a stock draft is scored; the model only returns spoken words, a number and a unit, never ids or sums.
- Known copies: none.

### user-alerts — `NotificationsService`, `app-notification-bell`

- Status: stable — plan 646
- Use: `src/app/core/services/notifications.service.ts` (the signed-in user's alerts, polled every 60 s while the tab is visible) and `src/app/core/components/notification-bell/notification-bell.component.ts` (the header bell with the unread count and the list); the server side is `server/services/notifications.js` (`createPriceChangeAlerts`, called by the invoice apply) and `server/routes/notifications.js`; the shape is `shared/schemas/entities/notification.schema.ts`.
- Pieces: NotificationsService, NotificationBellComponent, app-notification-bell, createPriceChangeAlerts, .bell__btn, .bell__count, .bell__panel, .bell__head, .bell__all, .bell__empty, .bell__list, .bell__item, .bell__item--up, .bell__item--down, .bell__item--unread, .bell__meta.
- When: a person must be told something at once (a price moved beyond the threshold); a new alert kind adds a `kind` to the schema and a writer next to `createPriceChangeAlerts`, never a second list or bell.
- Known copies: none.

### supplier-refs — a product's source points at a supplier of its own business (plan 649)

- Status: stable
- Use: `resolveSourceSupplier` in `server/services/sync-master.js` (master supplier id → the business's copy, creating it; unknown → cleared and counted as `sync.supplier_unknown`), `toMasterSupplierId` in `server/routes/generic.js` (push to master: business supplier → master supplier, else 400 `BAD_SUPPLIER_REF`), and `planProductRepair` / `repairBusiness` in `server/scripts/repair-supplier-refs.js` (dry run, `--write`, `--confirm-remote`) for references already wrong; the browser shows `supplier_unknown` for a supplier outside the business list.
- Pieces: resolveSourceSupplier, toMasterSupplierId, planProductRepair, repairBusiness, BAD_SUPPLIER_REF, supplier_unknown.
- When: any code that copies or maps a product's `sources[].supplierId` between master and a business; never keep a master or foreign id.
- Known copies: none.

### repair-script — the repair script for wrong supplier references (plan 649)

- Status: stable
- Use: `server/scripts/repair-supplier-refs.js` — a one-off data repair beside `dedupe-business-products.js`, with the same dry-run default, `--write` and `--confirm-remote` rules; it never touches prices.
- Pieces: repair-supplier-refs.js, planProductRepair, repairBusiness.
- When: product sources already point at a foreign, unknown or empty supplier; the Human runs it (dry run first), never a build step.
- Known copies: none.

### excel-export — one house style for every Excel sheet

- Status: stable — plan 471 moved every recipe and menu sheet onto it
- Use: `src/app/core/services/excel-workbook.util.ts` · `addStyledTableSheet(wb, { name, title, meta, header, rows, totalRow?, widths? })` (RTL, teal title band, grey meta line, grey header, bordered rows, bold total row, frozen rows 1–3, A4 portrait one page wide) and `uniqueSheetName` (Excel-safe, ≤ 31 characters, unique, " 2" / " 3" on a repeat); a form-style sheet uses `addRecipeInfoSheet`. Each export has a public `build…Workbook` builder in `src/app/core/services/recipe-export.service.ts` / `src/app/core/services/menu-export.service.ts` that a spec reads in memory; the `export…` method only awaits it and calls `downloadWorkbook`.
- Pieces: addStyledTableSheet, uniqueSheetName, addRecipeInfoSheet, HOUSE_PAGE_SETUP, buildRecipeInfoWorkbook, buildShoppingListWorkbook, buildMenuInfoWorkbook, buildAllTogetherMenuWorkbook.
- When: any new Excel sheet. Sheet names, headers and fallbacks come from `dictionary.json` through `TranslationService`, never an English literal.
- Known copies: none (no other file in `src/app` calls `addWorksheet`, checked 2026-11-22).
