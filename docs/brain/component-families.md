# Component families — what to reuse before you build

The single list of FoodVibe's shared pieces ("families"): for each job, which piece to use, where it lives, and
the page-local copies that still exist. Before you create any component, util, pipe, service or `.c-*` class,
find its family here and follow the decision ladder in `docs/agent/standards-reuse.md`. ADR:
`docs/brain/decisions/0024-reuse-layer.md`.

See every UI family live at `/dev/catalog` (dev builds only, plan 535).

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

- Status: converged (plans 451, 704, 711, 713)
- Use: `src/app/shared/modal-shell/` · `app-modal-shell` (role=dialog, aria-modal, Escape for the top-most
  popup only, focus in / trap / restore, `dismissible` while busy, `[hasChanges]` = Escape / backdrop ask before discarding typed edits (plan 498; the popup's own Cancel / X never asks), `titleKey` / `labelledBy` / `labelKey` for the
  accessible name). It renders the `.c-modal-overlay` / `.c-modal-card` engines from `src/styles.scss`; put
  `.c-modal-body` / `.c-modal-actions` inside it. Simple yes/no: `src/app/shared/confirm-modal/` · `app-confirm-modal`.
  `ConfirmModalService.open(msg, { typedConfirm })` — confirm waits for an exact typed text (plan 486).
- When: any popup. Render the shell inside the owner's `@if (isOpen)`; never draw `.c-modal-overlay` by hand.
- Stacking: `[zIndex]` takes a `--z-*` token (`src/styles.scss`, plan 538); `[topLayer]` puts a popup in the browser top layer (the confirm popup uses both, so a question is always in front).
- Always centred (plan 720): no bottom sheet at any width — the shell has no `sheet` input. Height: never taller than the window (`--modal-max-block`: `dvh`, safe areas, keyboard). Put the content as title → `.c-modal-body` → `.c-modal-actions` straight inside the shell; the body scrolls and the title and actions stay. Content without a `.c-modal-body` makes the whole card scroll. A card that sizes itself through `cardClass` keeps `max-block-size` ≤ `var(--modal-max-block)` and a scrolling part. Guard: `scripts/lib/modal-guard.mjs` (`bottom-sheet`, `top-sheet`, `sheet-binding`, `modal-no-scroll`), run by `scripts/test/style-720.test.mjs`.
- Users (15): auth, confirm, global-specific, restore-choice, add-equipment, add-item, quick-add-product,
  quick-edit-product, translation-key, label-creation, ai-menu, ai-product, ai-recipe, unit-creator, unit-edit-dialog.
- Lint: `reuse-lint` rule `hand-drawn-modal-overlay` warns on a new `class="… c-modal-overlay"` in a template; rule `native-browser-dialog` warns on a new `window.confirm` / `alert` / `prompt` (use `ConfirmModalService`).
- Plans 704, 711 and 713 moved the trash history popup, the equipment phone panel and the six popups that drew `.c-modal-overlay` by hand onto `app-modal-shell`; they are users now.
- Known copies: none. Kept off the shell on purpose:
  Not engine-based (own `role="dialog"` + Escape, kept off the shell to keep their look):
  `src/app/pages/menu-intelligence/components/menu-export-sheet/` (centred, its own look, plan 721), `src/app/shared/export-preview/`, the stock-count popover (plan 658).
- Lint (plan 718): rule `own-dialog-role` warns on a new `role="dialog"` in a template outside those pieces.

### modal-guard — the popup rules checked by a script

- Status: stable (plan 720)
- Use: `scripts/lib/modal-guard.mjs` (`modalFindings`), run by `scripts/test/style-720.test.mjs`.
- When: changing a popup template or style; it flags bottom sheets, a `sheet` binding and a popup that cannot scroll.

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
- Known copies: none.

### list-page — a list screen (header, search, filters, rows, selection)

- Status: converged (plans 703–717)
- Use: `src/app/shared/list-shell/` · `app-list-shell` (named slots) with `src/app/shared/page-header/`
  (`app-page-header`), `src/app/shared/selection-bar/` (`app-selection-bar`), `src/app/shared/row-actions-menu/`
  (`app-row-actions-menu`), `src/app/shared/column-carousel/` (`app-column-carousel-header`,
  `app-column-carousel-cell`), `src/app/shared/list-selection/` (`app-list-row-checkbox`, `list-selection.state.ts`).
- When: any screen that lists entities.
- Plan 651 page-local pieces of the stock count page: the move-counted button row (`.stock-count__toolbar`), the one-line name cut (`.stock-count__name`), the unit warning line (`.stock-count__unit-note`), the phone base-column head (`.stock-count__base-head`), the past-counts row (`.stock-count__past`).
- Plan 655 page-local pieces of the stock count page: the draft line's question row (`.stock-ai__question`), the base-amount control (`.stock-count__base-btn`) and its popover (`.stock-count__base-pop`).
- Plan 658: the stock count shows a unit by its saved Hebrew name (`unitName_` → `TranslationService.translate`, the key when none). `.stock-count__base-pop` is one measured `popover="manual"` box at every width: `max-content` wide, placed by `placeInViewport` below its control (above when no room), re-placed on resize, closed by an outside tap, a scroll or a second tap. `app-modal-shell [light]` (plan 657) is removed. `app-list-row-checkbox` reads `--row-checkbox-size` (default unchanged); the count page sets it per breakpoint.
- Plan 651: the past-counts list on the stock count page reads `GET /api/v1/stock/counts?status=all` through `PastCountsService` (`src/app/pages/inventory/components/stock-count/past-counts.service.ts`).
- Users: every entity list page on `app-list-shell` (client list, equipment, inventory products, invoices, stock count, recipe book, suppliers, menu library, trash, the knowledge page `src/app/pages/frontdesk/knowledge/`) and every list inside a card, drawer, tab or panel on `.c-list`.
- Exceptions the style run recorded (own layout on purpose): the requests cards, the bookings agenda, the inbox split view, the platform grid, the recipe-builder drag grids.
- In-panel lists: `.c-list` (plan 703) — a list inside a card, drawer, tab or panel with no search; full-page entity lists use `app-list-shell`. Container `role="list"`, rows `.c-list-row` with `role="listitem"`, cells `.c-list-body-cell`; `.c-list-row--link` makes a row clickable, `.c-row-link` is the name in it, `.c-list--plain` drops the cell background inside a `.c-glass-panel`; columns come from `--list-cols`.
- Known copies: `src/app/pages/venues/components/venue-list/` (cards layout, left to after plan 698) and nothing else.

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

- Status: converged (plans 703–717)
- Use: `src/app/shared/empty-state/` · `app-empty-state` (+ `.c-empty-state` in `src/styles.scss`).
- When: an empty list or a search with no results.
- Plan 703: `compact` input (default false) adds `.c-empty-state--compact` and a 24 px icon (48 otherwise) — use it for empties inside cards, drawers and tabs.
- Also used by `PlatformLogisticsItemsComponent` (plan 532) and `PlatformAiShotsComponent` (plan 600, the two example lists).
- `compact` users (inside cards, drawers and tabs): platform learning, the metadata manager and its user, taxonomy, logistics-item and AI-model managers, prep sheets, event stage bar, event notes log, diagnosis report, dev catalog, dashboard overview, business performance, front-desk checklist card, cook view, bookings page, waitlist drawer and the unassigned / arriving service lists.
- Lint (plan 718): rule `page-local-empty-state` warns on a new `class="…empty…"` / `no-results` in a template.
- Known copies: the venues files only (plan 698's scope).

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

### number-box — tap anywhere on a number box to edit the number

- Status: stable — plan 499 built `appNumberBox`; pricing meter, counter, product form, recipe quantity, cook view, settings, event dialogs and the AI / quick-add / unit modals are on it
- Use: `src/app/core/directives/number-box.directive.ts` · `appNumberBox` on the container of ONE `input[type=number]` (label, suffix, padding); it focuses the number and `SelectOnFocusDirective` selects all. Buttons, chips, other fields, disabled / read-only numbers and an already-focused number are left alone.
- When: a box whose only content is an editable number. Not for rows that mix free text and numbers.
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
- Form container (plan 703): `.c-form-page` in `src/styles.scss` — the glass frame of an entity form (max 48rem, centred); replaces the copies in the equipment and supplier forms.
- Known copies: none.

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
- Plans 705, 706, 708, 710 and 714 added `app-loader` to the bookings page, the front-desk pages (floor plan, simulator, settings, onboarding), the inventory lists and stock count, the platform dashboard panels and the diagnosis pages.
- Known copies: none (plan 456: no `onSet*Msg` call takes a string literal; the two dead popover folders were deleted).
- Backend paths: one `API` map in `src/app/core/services/http-storage.adapter.ts` (plan 456).

### edit-gate — show a save button only to someone who may save

- Status: stable (MVP, plan 428)
- Use: `src/app/shared/edit-gate/` · `app-edit-gate`; rules: `src/app/core/services/permission.service.ts`
  (`PermissionService`). The server still decides every write (`server/utils/permissions.js`).
- When: a page offers save/edit on a business item.
- Known copies: none.

### cost-badge — partial / missing cost warning

- Status: stable (MVP)
- Use: `src/app/shared/partial-cost-badge/` · `app-partial-cost-badge`. Placed beside its chip at every width (plan 721).
- When: a cost is shown that may be missing prices.
- Known copies: none.

### supplier-picker — pick one of a product's suppliers for a line

- Status: stable (plan 536)
- Use: `src/app/shared/supplier-picker/` · `app-supplier-picker` (inputs `product`, `value`, `canEdit`; output `picked`). Fixed popover placed with `placeInViewport`.
- When: a line may be bought from one of several priced suppliers and the owner chooses.
- Known copies: none.

### engine-classes — shared `.c-*` CSS engines

- Status: converged (plans 458, 703–717)
- Use: `src/styles.scss` — every `.c-*` class is defined there and only there (`docs/agent/conventions.md`).
- When: a style used by more than one component (buttons, inputs, modals, chips, empty state).
- Saving state (plan 502): a save button is `[disabled]` and `[attr.aria-busy]` while it runs, shows the `saving` label, and the signal is named `isSaving_` (`.c-btn-primary[aria-busy='true']` in `src/styles.scss`). Older flags (`isLoading_`, `isBusy_`, `isSubmitting_`) stay on their screens until touched.
- Pass theme (plan 572): `.c-num` gives a number tabular digits (prices, quantities, totals); `.c-pass-line` draws the amber lamp line under what is ready to go out (one per screen area).
- Blocked but explained (plan 699): .c-icon-btn[aria-disabled='true'] in src/styles.scss looks like a disabled .c-icon-btn (faded, no hover spin) yet still takes hover, focus and tap, so its `[appTip]` reason shows (family tooltip).
- Floor plan colours (plan 699): Zone and joined colour tokens --color-zone-0, --color-zone-1, --color-zone-2, --color-zone-3, --color-zone-4, --color-zone-5, --color-zone-6, --color-zone-7, --color-floor-joined — an area's palette index n is `var(--color-zone-n)` (family floor-map); the joined-table border is never in the palette.
- Style pieces (plan 703, appended at the end of `src/styles.scss`; shown on `/dev/catalog` → style-pieces): `.c-page` / `.c-page--narrow` (page frame, `--page-max-content` 72rem, `--page-max-narrow` 48rem, `--page-gutter`), `.c-list` (+ `--plain`, `.c-list-row--link`, `.c-row-link`), `.c-stat-tile` (+ `--hero`; parts `__top`, `__icon`, `__label`, `__value`, `__note`), `.c-card-head` (+ `__icon`, `__title`, `__end`), `.c-form-page`, `.c-table` (token values; `.c-table--compact`), `.c-empty-state--compact`.
- Popup height (plan 720): --modal-gap, --modal-max-block (tokens) in `src/styles.scss` cap every `.c-modal-card`; see modal-shell.
- Page width rule (plan 703): a page inside `app-list-shell` is full width; any other page uses `.c-page` (72rem) or `.c-page--narrow` (48rem, forms and detail pages); a page never sets its own max width.
- Icon sizes (plan 703): 14 meta, 16 buttons / chips / row actions, 18 header and primary buttons, 24+ only empty states and heroes.
- Token mapping (plan 703): font-size ≤0.75rem→`--fs-xs`, 0.8–0.8125→`--fs-sm`, 0.84–0.95→`--fs-base`, 1–1.05→`--fs-md`, 1.1–1.3→`--fs-lg`, 1.4–1.6→`--fs-xl`, 1.75→`--fs-2xl`, ≥2→`--fs-3xl`; weight 400→`--fw-regular`, 500→`--fw-medium`, 600→`--fw-semibold`, 700/bold→`--fw-bold`, 800→`--fw-extrabold`; radius ≤4px→`--radius-xs`, 5–7px→`--radius-sm`, 8–16px→`--radius-md`, 17–24px→`--radius-lg`, 25–28px→`--radius-xl`, 50% / 999px→`--radius-full`; a literal shadow→`--shadow-card` (raised) or `--shadow-glass` (flat); a tint with no token→`color-mix(in srgb, var(<nearest colour token>) N%, transparent)` with the same alpha; spacing on the scale→`--space-*`; off-scale spacing (0.375rem, 0.625rem, 0.875rem…) may stay. `scripts/lib/style-guard.mjs` (`styleFindings`) checks a set of files against these rules.
- Page frame: `.c-page` / `.c-page--narrow` / full width in `app-list-shell` — no page sets its own `max-inline-size`.
- Lint (plan 718): rule `page-local-width` warns on a new `max-width` / `max-inline-size` in a page `.scss`.
- Known copies: 6 component `.scss` files start a selector with a `.c-*` class (define or restyle an engine locally): `src/app/pages/venues/components/venue-form/venue-form.component.scss`, `src/app/pages/welcome/welcome.page.scss`, `src/app/shared/ai-recipe-modal/ai-draft-editor/ai-draft-editor.component.scss`, `src/app/shared/client-form/client-form.component.scss`, `src/app/shared/hours-editor/hours-editor.component.scss`, `src/app/shared/unit-creator/unit-creator.component.scss`.

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
- Plan 651 (leave-and-return): `ReturnToService` in `src/app/core/services/return-to.service.ts` — a page that sends the person away passes `?returnUrl=` (an in-app path, checked by `safeUrl`) and keeps the line it came from with `setPending`; the product form returns there with `?addedProduct=<id>`; the stock count takes the line back with `takePending`.

### table-engine — is there a table, which one, and what else

- Status: stable
- Use: `shared/schemas/front-desk/table-engine.ts` — `slotsFor`, `turnFor`, `candidates`, `assign`, `alternatives`, `dayAvailability` (and `windowsOf`), with `openRangesOf` in `qualify.ts` and `jerusalemDateTime` in `local-time.ts`; the server reads it from `server/generated/schemas`, the browser through the `@schemas` alias. Test data: `shared/schemas/testing/table-engine-fixtures.ts`.
- When: any code that offers, confirms or moves a table — never a second calculation.
- Known copies: none.

### floor-plan — the room: one stored plan, its checks and its browser service

- Status: stable
- Use: `checkFloorPlan`, `emptyFloorPlan` in `shared/schemas/front-desk/floor-plan-check.ts` (the server route `server/routes/floor-plan.js` and the editor share them), `FloorPlanDataService` in `src/app/core/services/floor-plan-data.service.ts` (`plan_`, `load`, `ensureLoaded`, `save`).
- Pieces: checkFloorPlan, emptyFloorPlan, FLOOR_PLAN_ISSUE_CODES, FloorPlanDataService.
- When: any screen that reads or saves the room — never a second copy of the checks.
- Known copies: none.

### helpers — pure functions

- Status: stable
- Use: `src/app/core/utils/` (one file per topic, each with a spec); money / quantity / percent rounding and
  formatting only from `src/app/core/engine/rounding.ts`; Hebrew-insensitive matching: `normalizeHebrew` in
  `src/app/core/utils/recipe-match.util.ts`. Import through `@utils/*` (and pipes through `@pipes/*`).
- the state of a table at a moment (plan 671): `tableStatesAt`, `stripTimes` in `src/app/core/utils/table-state.util.ts` (`table-state.util.ts`) — free, reserved soon, seated, over time, late, not active; first match wins; any screen that shows a table's state reads this, never a second copy.
- the unit mapping after a pick (plan 653): `unitForSpoken` in `src/app/pages/inventory/components/stock-count/spoken-unit.ts` — the spoken unit mapped to
  the picked product's own units, same table as the server `resolveUnit`; none fits → flagged, not counted.
- reading the unit word from the text (plan 654): `unitWordFromText` in `server/utils/stock-extract.js` — when the model
  drops the unit, the word beside the product name in the cook's own text is kept as `spokenUnit`; none →
  `unitMissing`, never the base unit. Browser side: `unitChoicesFor` in `src/app/pages/inventory/components/stock-count/spoken-unit.ts`.
- the browser breakpoint constants (plan 656): `breakpoints` in `src/app/core/utils/breakpoints.ts` — `PHONE_MAX`,
  `TABLET_MAX`, `PHONE_QUERY`, `TABLET_DOWN_QUERY`, `DESKTOP_QUERY` (phone ≤767, tablet ≤1023, desktop ≥1024); the
  only `.ts` file that types a media width. Styles use the same names from `src/app/core/styles/_breakpoints.scss`.
- Plan 663: openRangesOf in qualify.ts (`shared/schemas/front-desk/qualify.ts`) — the checkable opening ranges of a date (`hoursCheck` is built on it).
- Plan 663: jerusalemDateTime in local-time.ts (`shared/schemas/front-desk/local-time.ts`) — the inverse of `jerusalemEpoch`.
- Plan 675: `sendOut` in `server/services/outbound.js` — every outbound message goes through `sendOut`; never call a transport.
- Plan 675: `handleInbound` in `server/services/inbound.js` — every inbound message (simulator or phone) goes through it; never a second handler. A `human` conversation goes back to `bot` on the guest's next message after a failed turn or 2 h member idle (plan 719) — never a second handler.
- Plan 675: `templateMessage` in `shared/schemas/front-desk/message-templates.ts` — the closed list of outbound templates and their one-line parameters; never a template name typed elsewhere.
- Plan 670: `bookingIcs` / `downloadIcs` in `src/app/pages/public-request/services/booking-calendar.util.ts` — a page-local helper (only the two guest pages use it): one booking as a calendar file, the `ics` package loaded lazily.
- When: any pure helper (time, number, text). Never page-local.
- Known copies: time / date / percent / debounce helpers copied page-locally (audit; not recounted).
- `describePlatformChange` (`src/app/pages/platform-dashboard/components/platform-business-dialog/platform-business-dialog.component.ts`): one stored platform change `{ field, from, to }` as a Hebrew line (plan 638).
- Plan 628: `priceChangePct` in `src/app/core/utils/price-change.util.ts` is the one browser rule for the percent a price moved (two decimals, null with no old price); `buildInvoiceLines` in `src/app/core/utils/invoice-lines.util.ts` maps kept preview rows to the `invoice.lines` of the apply body (the server has its own `buildInvoiceLines` in `invoice-trail`).
- Plan 648: matching spoken names to products — `matchSpoken` in `server/utils/stock-extract.js`, on the server, so the model never gets the catalog. Plan 650: the Hebrew name folding (`foldWord`: ־ות / ־ים / ־ה endings dropped) and the score (exact > starts-with > contains > shared words; counted-before and minimum break ties) answer `matched`, `choose` (up to 5, best first) or `unmatched` (up to 5 nearest).
- Plan 641: previousPriceOf(product, supplierId) in src/app/core/utils/price-change.util.ts is the one browser rule for the price an invoice line is compared with (the invoice supplier's own price, else the lowest other source's; null with none).
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
- `WaitlistDataService` (`src/app/core/services/waitlist-data.service.ts`): the five calls of the waiting list (`list`, `add`, `notify`, `seat`, `left`), each returning its result or the server's error code as a code (plan 673).
- `ConversationDataService` (`src/app/core/services/conversation-data.service.ts`) and `InboxBadgeService` (`src/app/core/services/inbox-badge.service.ts`): the conversations routes (list, open a thread, reply, template, take over, hand back, close; codes returned as codes) and the one pending-conversations number (plan 677); `suggest` and `fixAnswer` call `/api/v1/ai/frontdesk/suggest` and `/fix` (plan 682).
- `SimulatorService` (`src/app/pages/frontdesk/simulator/services/simulator.service.ts`) and `API.sim`: the simulator's guest sends, button taps, run-a-job-now and clear-test-data calls, codes returned as codes, no phone, name or text in a log (plan 678).
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
- Plan 667: `FrontDeskProfileDataService.setConfirmMode` (`src/app/core/services/front-desk-profile-data.service.ts`) — one PUT to `API.floorPlan('confirm-mode')`; patches the stored profile on success, returns `false` on a failure. The settings card and the service screen (plan 671) use it.
- Plan 734: `FrontDeskProfileDataService.setAssistantLevel` (`src/app/core/services/front-desk-profile-data.service.ts`) — one PUT to `API.business('front-desk/assistant-level')`; patches the stored profile's `assistant.level` on success, answers the server's error code on a failure. The settings page's assistant card (the owner's level switch) uses it.
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
  `src/app/core/engine/units.ts` (plan 635: re-exports the one rule in `shared/schemas/units/to-base.ts` — `toBase`, `normalizeUnit`, `unitFamily`, `convertWithinFamily`, `optionRateInBase`, the unit constants, `unitRatesFrom`); portions: `src/app/core/engine/portions.ts`.
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

### table-service — a front desk profile's table settings

- Status: stable — plan 662
- Use: `shared/schemas/front-desk/table-service.ts` (pure, no zod; the server and the browser import it) —
  `tableServiceOf`, `TABLE_SERVICE_DEFAULTS`.
- When: any code reads a profile's table settings (confirm mode, slots, turn minutes, holds). A stored field wins, a
  missing one is the default; nothing fills defaults on read.
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

### entity-schemas — one stored shape per file

- Status: stable — plan 615
- Use: the nine new entity schema files under `shared/schemas/entities/` (`invoice.schema.ts`, `price-history.schema.ts`,
  `invoice-alias.schema.ts`, `supplier-profile.schema.ts`, `ai-draft.schema.ts`, `stored-file.schema.ts`,
  `business-access.schema.ts`, `diagnosis.schema.ts`, `stock-count.schema.ts`), each one `z.strictObject` registered in
  `SCHEMA_BY_COLLECTION` in `shared/schemas/entities/index.ts`.
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

### floor-map — the drawing of the room

- Status: stable — plan 665
- Use: `src/app/shared/floor-map/` · `app-floor-map` (inputs `plan`, `states`, `selectedKeys`, `draggable`, `dimOtherThanArea`, `warnKeys` (plan 684: overlap mark); outputs
  `tableTapped`, `tableMoved`, `gridTapped`) with the pure grid arithmetic in `floor-geometry.util.ts` (`footprintFor`, `movedCell`,
  `stepCell`/`canStep` (plan 666: one cell in the arrow's direction, RTL-aware), `firstFreeCell`, `nextTableNumber`, `newKey`, `chairsFor`, `TABLE_PRESETS`). Cells only; `x` counts from the inline start.
- Zones (plan 699): every area with a `zone` is drawn under the tables (`.floor-map__zone`, `.floor-map__zone-label`, `data-testid="floor-zone-<key>"`, colour `var(--color-zone-<colorOf>)` in `--fm-zone`). More inputs: `showZones` (default true), `colorTables` (table border in its area's colour; the editor), `joinedKeys` (`.is-joined`, violet `--color-floor-joined` border, `.floor-map__link` mark, "מחובר" in the name), `zoneEditable`, `selectedZoneKey` (four `.floor-map__handle--<corner>` handles), `drawZoneKey` (press-drag-release on the grid, `.floor-map__zone--draft` preview, Escape cancels); outputs `zoneDrawn`, `zoneChanged`, `zoneTapped`. A selected table has an outline ring, not a border change. The zone cell arithmetic is `floor-zones.util.ts` (`ZONE_COLOR_COUNT`, `colorOf`, `rectFromCells`, `cellAtPoint` (RTL), `deltaCells`, `resizedRect`, `movedRect`, `rectsOverlap`, `rectInGrid`, `tableCentreIn`).
- When: a screen draws the room — the floor plan editor (`src/app/pages/frontdesk/floor-plan/`), the service screen, the booking dialog.
- Known copies: none.

### tooltip — a short explanation beside a control

- Status: stable — plan 699
- Use: `src/app/shared/tip/tip.directive.ts` · `[appTip]="text"` (`TipDirective`): shows at once on hover and keyboard focus and for 3 s after a tap, in a `popover="manual"` bubble (`.c-tip` in `src/styles.scss`) placed by `placeInViewport` (below, flips above when there is no room, never cut off); sets the host's `aria-describedby` while shown; empty or null text shows nothing. A control that is blocked but must still explain why wears `aria-disabled="true"` (the `.c-icon-btn[aria-disabled='true']` look) instead of `disabled`.
- When: a control needs a hint or the reason it does nothing (default `hints-in-tooltips`) — never a native `title`, never a page-local bubble.
- Known copies: the native `title` on other controls (moved over when their screens are next touched).

### floor-view — the service screen's room with live states

- Status: stable — plan 671
- Use: `src/app/pages/bookings/components/floor-view/` · `app-floor-view` (inputs `date`, `at`; outputs `atChange`, `tableTapped`): the room in `app-floor-map` with one live state per table (the map's `details` input carries the state label, name and time), the 30-minute strip in `app-scroll-rail`, the summary pills, the legend and the owner's confirm-mode toggle; it reloads the day every 45 s on the server's clock. `BookingDataService.dayBoard(date)` reads the day.
- Classes: `.fv`, `.fv__pills`, `.fv__strip`, `.fv__legend`, `.fv__draw`, `.fv__body`, `.fv__room`, `.fv__side` (scoped to the view's own stylesheet); the map's `.floor-map__name`, `.floor-map__time` put a booking's name and time on a table.
- When: the host's service screen (`/bookings?view=floor`). Plan 672 adds the two lists (`service-lists`) and the phone-booking and walk-in buttons; plan 673 adds the waiting list.
- Plan 686: a tap on a table opens `app-table-sheet` (`src/app/pages/bookings/components/table-sheet/`, a centred popup in `app-modal-shell`: the table, what is on it now, the next booking, and seat / finish / no-show / cancel / move for the live moment). "Move" puts the view in move mode: the banner (`.fv__move`) and a tap on another table call `BookingDataService.setTables`; Escape or the banner's cancel leave it. `nextOnTable` in `table-state.util.ts` finds the next booking of a table.
- Known copies: none.

### booking-dialogs — the phone booking, walk-in and no-table dialogs of the service screen

- Status: stable — plan 672
- Use: `src/app/pages/bookings/components/new-booking-dialog/` · `app-new-booking-dialog` (input `date`; outputs `saved`, `closed`): the phone booking — client or new guest, date, party, area, time chips from the availability call, the engine's offered table on a small `app-floor-map` (the owner may tap another), the 409 alternatives as chips. `src/app/pages/bookings/components/walk-in-dialog/` · `app-walk-in-dialog` (inputs `tableKey`, `plan`, `states`; outputs `seated`, `closed`): seats a walk-in on the table of the sheet or one tapped free table. `src/app/pages/requests/components/approve-table-dialog/` · `app-approve-table-dialog` (inputs `request`, `alternatives`, `busy`; output `chosen`): shown when approving a table request answers `NO_TABLE`; the page makes the approve call. All three are `app-modal-shell` (centred).
- Classes: `.fv__actions` (the bar buttons), `.nb-fields`, `.nb-chips`, `.nb-label`, `.nb-line`, `.nb-map`, `.nb-info`, `.wlk-row`, `.wlk-pick`, `.wlk-label`, `.wlk-line`, `.att-chips`, `.att-label`, `.att-line`, `.att-map` (scoped to each dialog's stylesheet; the stacks use the engine `.c-input-stack`); no new `.c-*` class.
- When: a host creates, seats or rescues a table booking from the service screen or the requests page — never a second copy.
- Known copies: none.

### service-lists — "arriving next" and "not assigned" beside the room

- Status: stable — plan 672
- Use: `src/app/pages/bookings/components/service-lists/` · `app-arriving-list` (inputs `rows`, `live`, `busyId`; output `arrived`) and `app-unassigned-list` (inputs `rows`, `live`; output `assign`): single-line `.c-list-row` rows with `app-empty-state`; the rules are `arrivingNext` and `freeTablesFor` in `table-state.util.ts`.
- Classes: `.sl__title`, `.sl__rows`, `.sl__row`, `.sl__name`, `.sl__party`, `.sl__act` (one stylesheet, `arriving-list.component.scss`, shared by both lists; the stack is the engine `.c-input-stack`).
- When: a short read-only side panel of the service screen — never a second list shell.
- Known copies: none.

### waitlist-drawer — the waiting list of the service screen

- Status: stable — plan 673
- Use: `src/app/pages/bookings/components/waitlist-drawer/` · `app-waitlist-drawer` (inputs `date`, `plan`; outputs `closed`, `seatRequested`, `changed`): the add form, the waiting rows in order with the minutes waited from the server's clock, "table is ready", "seated" and "left"; `app-modal-shell` (centred). The client is `WaitlistDataService` (`src/app/core/services/waitlist-data.service.ts`, the five `/api/v1/waitlist` calls, codes returned as codes); `firstWaitingFit` in `table-state.util.ts` names the party that fits a table (the table sheet's line and the toast after "finished").
- Classes: `.wl`, `.wl__head`, `.wl__form`, `.wl__list`, `.wl-row`, `.wl-row__*` (the drawer's own stylesheet; no `.c-*` class added).
- When: any screen that shows or changes the day's waiting parties — never a second list or a second client of the waiting-list routes.
- Known copies: none.

### chat-thread — the message thread of a guest conversation

- Status: stable — plan 677
- Use: `src/app/shared/chat-thread/` · `app-chat-thread` (inputs `messages`, `now`, `perspective` `'business' | 'guest'`, `buttonsEnabled`, `fixable` (plan 682: a "fix this answer" button under assistant messages); outputs `buttonTapped`, `fixRequested`): read-only bubbles, a template message shown as its dictionary body with its values, the author tag, the delivery state as an icon with a label, buttons on the newest outbound message, a day line between Jerusalem dates. No service inside: the page gives it the messages.
- Classes: `.ct`, `.ct-row`, `.ct-bubble`, `.ct-meta`, `.ct-status` (the component's own stylesheet; no `.c-*` class added).
- When: any screen that draws a guest conversation (the inbox, the simulator of plan 678) — never a second bubble list.
- Second user: the simulator (`src/app/pages/frontdesk/simulator/`, plan 678) draws it with `perspective` `'guest'` and `buttonsEnabled` true.
- Inbox pieces (plan 682, page-local, `src/app/pages/inbox/components/`): `app-suggestion-bar` (a drafted reply with send / edit / dismiss, or the ask button) and `app-fix-answer-dialog` (`app-modal-shell`; the right answer and the issue type of a wrong assistant message).
- Known copies: none.

### table-sheet — the sheet of one table on the service screen

- Status: stable — plan 686
- Use: `src/app/pages/bookings/components/table-sheet/` · `app-table-sheet` (inputs `table`, `board`, `plan`, `moment`, `live`, `look`; outputs `closed`, `changed`, `moveRequested`): `app-modal-shell` (centred) with the table header, the "now" and "next" blocks and the actions that fit the booking's status (`BookingDataService.setStatus`, `ConfirmModalService` for a cancel).
- Classes: `.tsh`, `.tsh__head`, `.tsh__headline`, `.tsh__title`, `.tsh__label`, `.tsh__line`, `.tsh__meta`, `.tsh__block`, `.tsh__notes`, `.tsh__actions` (scoped to the sheet's stylesheet); `.fv__move` is the floor view's move banner.
- When: a screen shows one table of the room and acts on its booking — never a second copy.
- Known copies: none.

### floor-plan-joins-sheet — joins of tables, one-cell arrows and the phone sheet of the room editor

- Status: stable — plan 666
- Use: floor-plan-joins.util (`src/app/pages/frontdesk/floor-plan/floor-plan-joins.util.ts`: joinProblem, newJoin, joinLabel, withJoin, withoutJoin, withJoinChange); stepCell and canStep in `src/app/shared/floor-map/floor-geometry.util.ts` (one cell in the arrow's direction, RTL-aware); `app-floor-joins-list` with .joins-list, .joins-list__row and the page's .floor-plan__join-bar (plan 700: the join tool `fp-tool-join` replaced the multi switch; a join row is one summary line that opens); the phone panel (plan 721): .floor-plan__panel--open shows the inspector in the page under the map; .floor-plan__sheet-head, .floor-plan__room-open.
- When: a screen of the room editor joins tables, moves one with arrows, or shows its panel on a phone — never a second copy.

### floor-plan-editor — the editing rules, the overlap mark and the scoped classes of the room editor

- Status: stable — plan 684
- Use: `src/app/pages/frontdesk/floor-plan/floor-plan-edit.util.ts` (`withTable`, `numberError`, `duplicateTable`, `withoutTable`, `overlapping`, `minGrid` (plan 699: tables and zones), `withArea` (plan 699: a new area gets the first free palette colour), `restoreDropped`, and plan 699's `withZone` (set or clear an area's zone; refusals `fp_zone_overlap`, `fp_zone_small`, `fp_zone_outside`; tables whose centre is inside join the area) and `withTableDropped` (a dropped table joins the zone it lands in)) and `floor-plan-joins.util.ts` (plan 666: `joinProblem`, `newJoin`, `joinLabel`, `withJoin`, `withoutJoin`, `withJoinChange`) — pure draft rules; `app-floor-joins-list` (joins rows in the room panel); the arrows row of the table panel; the phone panel (inline under the map, under 768 px, plan 721); the overlap mark on the map (`warnKeys` input, `.is-overlap`, `.floor-map__warn`); the scoped classes of the page and panels (`.floor-plan__body`, `.floor-plan__panel`, `.floor-plan__notice`, `.floor-plan__overlap`, `.table-panel`, `.table-panel__row`, `.table-panel__actions`, `.room-panel`, `.room-panel__area`, `.room-panel__size`) in the page's and the two panels' own stylesheets; `app-floor-table-panel`, `app-floor-room-panel` and plan 700's `app-floor-zone-panel` (`src/app/pages/frontdesk/floor-plan/components/zone-panel/`: name, eight colour swatches, draw / redraw / clear, four position and size counters, order, remove with its `[appTip]` reason; inputs in, events out).
- Zones (plan 699): withZone, withTableDropped and the zone-aware minGrid in floor-plan-edit.util.ts — an area's zone is set or cleared only through `withZone`, a drop goes through `withTableDropped`; the page wires the map's `colorTables` and `joinedKeys`.
- Compact joins rows (plan 700, `app-floor-joins-list`: one summary line per join, one open row at a time) and newAreaName and the color AreaOp in floor-plan-edit.util.ts (the next free "אזור חדש" name; `withArea` op `color`).
- Editor layout (plan 700): a toolbar card (tools select / zone / join as `c-chip--tab`, the add-table presets with shape glyphs), a canvas card (zone legend of `c-chip--tab` with `.c-chip__dot`, the map, a status line) and an inspector card choosing table / zone / room; `withArea` op `color` and `newAreaName` in the util; the compact joins list (one open row at a time).
- When: a screen edits the room draft — rules belong in the util, never in a panel.
- Known copies: none.

### floor-plan-editor-layout — the editor layout classes of the room editor

- Status: stable — plan 700
- Use: scoped classes in the floor-plan page and panel stylesheets: `.floor-plan__toolbar`, `.floor-plan__tools`, `.floor-plan__tool`, `.floor-plan__glyph`, `.floor-plan__canvas`, `.floor-plan__legend`, `.floor-plan__legend-chip`, `.floor-plan__status`, `.floor-plan__inspector`, `.zone-panel`, `.zone-panel__swatches`, `.zone-panel__rect`, `.room-panel__section`, `.room-panel__zone-row`, `.joins-list__summary` — built on `.c-glass-card`, `.c-chip--tab` and `.c-chip--toggle`; they only lay out this one screen.
- When: the room editor page or its panels change layout — never a copy on another screen.
- Known copies: none.

### qr-code — a QR image of a link

- Status: stable — plan 667
- Use: `app-qr-code` (`QrCodeComponent`, `src/app/shared/qr-code/`; inputs `value`, `size`, `altKey`): a PNG data URL drawn in the browser, the `qrcode` library loaded lazily on first use.
- When: any link a person scans — never a second library call.
- Known copies: none.

### floor-drag — Dragging a table, free drag on the room grid

- Status: stable — plan 665
- Use: Dragging a table: `cdkDrag` inside `app-floor-map` (`src/app/shared/floor-map/`): the pixel distance is turned into whole cells by `movedCell`, then the drag transform is reset; `Directionality` gives the reading direction.
- When: a table is moved on the room grid. Lists that sort by dragging keep using `cdkDropList`.
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

### table-holds — one unique index decides who has a table

- Status: stable — plan 668
- Use: claim, move, release, holdsOf in server/services/table-holds.js (one `tableHolds` row per table per 15-minute cell).
- When: a booking must hold a table for a time span; never read the holds and then trust the read (INV-7).
- Known copies: none.

### table-bookings — the one service that turns an ask into a held table

- Status: stable — plan 668
- Use: reserveTable, bookTable, rebookTable, createWalkIn in server/services/table-bookings.js (assign, claim, write, release on failure).
- Use: moveBookingStatus in server/services/table-bookings.js (plan 676): the one status move of a booking, called by the route, the no-show job and a guest's Cancel tap.
- When: any route or job that gives a booking its tables; none calls `claim` itself.
- Known copies: none.

### public-read-limiter — `publicReadLimiter`, the rate limit of public read routes

- Status: stable — plan 669
- Use: `publicReadLimiter` in server/middleware/rate-limit.js, applied to the public availability read in server/routes/public.js.
- When: any public, unauthenticated read route that must be capped per caller.
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

### conversation-pipeline — `handleInbound`, `sendOut`, `templateMessage`, `findOrCreateConversation`, `channelFor` (plan 675)

- Status: stable — server only; the simulator is the first transport, WhatsApp joins in plan 683
- Use: every inbound message goes through `handleInbound` (`server/services/inbound.js`), every outbound message through `sendOut` (`server/services/outbound.js`); never call a transport's `send`. Template names and parameters live once in `shared/schemas/front-desk/message-templates.ts` (`templateMessage`). The live-conversation rule is `findOrCreateConversation` (`server/services/conversations.js`); only `server/services/channels/index.js` (`channelFor`) names a channel.
- Pieces: handleInbound, registerButton, setTurnHandler, sendOut, templateMessage, MESSAGE_TEMPLATES, findOrCreateConversation, loadConversation, closeConversation, channelFor, sim-channel.
- When: any code that receives or sends a guest message; a new transport is a new file in `server/services/channels/`.
- Known copies: none.

### demo-restaurant-seed — `seedDemoRestaurant`, `buildDemoRestaurant` (plan 674)

- Status: stable — a local-only script; never run against a shared database
- Use: `server/scripts/seed-demo-restaurant.js` (`seedDemoRestaurant(db, { write, now, passwordHash })`) fills a scratch database with one demo restaurant; its pure data builder is `buildDemoRestaurant({ now })` in `server/scripts/lib/demo-restaurant-data.js`, which places the 40 bookings with the shared table engine. `parseArgs` comes from `seed-demo-business.js`.
- Pieces: seedDemoRestaurant, buildDemoRestaurant, parseArgs.
- When: any demo or test data for a restaurant with table service; a new demo business is a sibling script, not a flag.
- Known copies: the password hash formula is written again here because `seed-demo-business.js` does not export it.

### setup-checklist-item — Checklist item `floor_plan` of the front desk setup checklist (plan 674)

- Status: stable
- Use: `checklistFor` in `server/services/front-desk-setup.js` adds `{ key: 'floor_plan', done }` after `request_kinds` when the business has `tables`; the card (`front-desk-checklist-card.component.ts`) maps a key to its link and the label is `frontdesk_setup_<key>` in `dictionary.json`.
- Pieces: Checklist item floor_plan, checklistFor, frontDeskSetup, FrontDeskChecklistCardComponent.
- When: any new front desk setup step.
- Known copies: none.

### scheduled-jobs — `runDue`, `startScheduler`, `stopScheduler`, moveBookingStatus in server/services/table-bookings.js, `registerBookingButtons` (plan 676)

- Status: stable — server only
- Use: timed work is one job file in `server/jobs/` run by `runDue` in `server/jobs/scheduler.js` (`startScheduler` / `stopScheduler`, one unref'd 60 s tick; each job claims its rows with a conditional update). A booking's status moves only through `moveBookingStatus` in `server/services/table-bookings.js`. The guest's Confirm and Cancel taps are `registerBookingButtons` in `server/services/booking-buttons.js`.
- Pieces: runDue, startScheduler, stopScheduler, remindOne, markOne, moveBookingStatus, registerBookingButtons.
- When: anything that must happen by itself at an hour or after a delay; a second timer or a second writer of a booking's status is never added.
- Known copies: none.

### simulator-page — the owner plays a test guest (plan 678)

- Status: stable — plan 678
- Use: `src/app/pages/frontdesk/simulator/` · `SimulatorPage` at `/frontdesk/simulator`: a banner that nothing leaves the app, the test guests, a phone-shaped chat (`app-chat-thread` as the guest), the window clock, the reminder / late-mark buttons and clear test data; plan 719 adds the assistant level line, the held-by-staff line with hand back, and the level-0 draft.
- Pieces: SimulatorPage, SimulatorService.
- When: any test of the conversation channel from inside the app; a second simulator screen is never added.
- Known copies: none.

### inbox-assistant-help — `SuggestionBarComponent`, the "fix this answer" action under a message, `knowledge-correction-prompt.js` (plan 682)

- Status: stable
- Use: `src/app/pages/inbox/components/suggestion-bar/` (`app-suggestion-bar`: a drafted reply with send / edit / dismiss, or the ask button); the "fix this answer" action is `fixable` / `fixRequested` on `app-chat-thread` plus `app-fix-answer-dialog` (`app-modal-shell`); the server side is `POST /api/v1/ai/frontdesk/fix` with the prompt of `server/services/knowledge-correction-prompt.js` (`buildCorrectionBody`).
- Pieces: SuggestionBarComponent, FixAnswerDialogComponent, fixable, fixRequested, buildCorrectionBody.
- When: a member asks the assistant for a reply, or turns a wrong assistant answer into a draft knowledge item.
- Known copies: none.

### assistant-turn — `keyFor`, `fixedText`, `turnAnswerSchema`, `buildTurnBody`, `runTurn`, `applyGuardrails`, `askTurnModel` (plan 679)

- Status: stable — server only
- Use: the guest-facing assistant. The model key is resolved only by `keyFor` (`server/services/ai-key.js`). A fixed Hebrew sentence leaves the server through `fixedText` / `reasonText` (`server/utils/fixed-text.js`), never written in code. The model's answer shape is `turnAnswerSchema` (`shared/schemas/front-desk/turn-answer.schema.ts`); its request is `buildTurnBody` (`server/services/frontdesk-prompt.js`). The turn is `runTurn` (`server/services/frontdesk-turn.js`); every block lives in `applyGuardrails` (`server/services/frontdesk-guardrails.js`); the one model call is `askTurnModel` in `server/routes/ai/frontdesk.js`.
- Pieces: keyFor, fixedText, reasonText, turnAnswerSchema, TURN_SYSTEM_PROMPT, buildTurnBody, runTurn, decide, applyGuardrails, askTurnModel.
- When: any assistant reply, draft or block; a second model call for the assistant or a second place for a block is never added.
- Known copies: none.

### assistant-table-dialogue — `handleTableIntent`, the OK/ALT/OTHER/BK handlers, `changeWhen`, `cancelByGuest` (plan 680)

- Status: stable — server only
- Use: the guest's table wish by chat (book, change, cancel). `runTurn` calls `handleTableIntent` (`server/services/frontdesk-tables.js`) when the business has `tables`; the offer comes only from the engine (`assign`), the confirm goes through the booking service; taps are no-model handlers registered with `registerButton` (OK, ALT, OTHER, BK). A guest's move or cancel calls `changeWhen` / `cancelByGuest` (`server/services/table-bookings.js`), the same bodies the member route uses.
- Pieces: handleTableIntent, tablesFor, offer, confirm, changeWhen, cancelByGuest (server/services/table-bookings.js).
- When: any table wish in the assistant; a second booking path or a table time written by the model is never added.
- Known copies: none.

### assistant-eval — `loadDialogues`, `runDialogue`, `scoreDialogue` (plan 681)

- Status: stable — server only
- Use: the assistant's eval set. The 30 Hebrew dialogues are data files in `server/eval/frontdesk/dialogues/`, checked by `evalDialogueSchema` (`server/eval/frontdesk/dialogue-schema.js`); the restaurant room is `room14For` (`server/eval/frontdesk/room14.js`). `server/scripts/ai-eval-frontdesk.js` loads them (`loadDialogues`), plays each through `handleInbound` on the `sim` channel with a test business (`runDialogue`) and scores it from the stored rows (`scoreDialogue`) — scripted in the test suite, the real model chain only by hand.
- Pieces: loadDialogues, runDialogue, scoreDialogue, evalDialogueSchema, room14For.
- When: any new test dialogue or eval of the assistant; a second dialogue runner or an eval dependency is never added.
- Known copies: none.

### assistant-guardrails — `preCheck`, `applyGuardrails`, `GUARD_WORDS` (plan 689)

- Status: stable — server only
- Use: every rule that stops a guest conversation or a reply lives in `server/services/frontdesk-guardrails.js`: `preCheck` runs before the model call (removal request, keywords, active hours, turn count), `applyGuardrails` judges the reply. The word lists are data in `server/constants/frontdesk-guard-words.js` (`GUARD_WORDS`).
- Pieces: preCheck, applyGuardrails, GUARD_WORDS.
- When: any new block, handoff trigger or word list for the assistant; a second place for a block is never added.
- Known copies: none.

### gemini-fallback — `callGemini({ fallback, deadlineMs })`, `failureReason(kind, status)` in `server/services/frontdesk-turn.js`, `server/test/gemini-fallback.test.js` (plan 701)

- Status: stable — server only
- Use: an unattended caller (the front desk) passes `fallback: true` (and `deadlineMs`) to `callGemini` in `server/services/gemini-client.js`: on overload the same request tries the next free catalog model. `failureReason(kind, status)` in `server/services/frontdesk-turn.js` maps a failure to `busy`, `timeout`, `quota` or `other`; a failed guest turn stores it as `assistantFailed` on the conversation.
- Pieces: callGemini({ fallback, deadlineMs }), failureReason(kind, status) in server/services/frontdesk-turn.js, assistantFailed, gemini-fallback.test.js; plan 730: `isGone(result)` and the `goneUntil` map in `server/services/gemini-client.js` (a retired model is skipped), with the new cases in `server/test/gemini-fallback.test.js`.
- When: any new unattended model call or failure reason; a second model-switching loop is never added.
- Known copies: none.

### assistant-failure — `assistantFailureKey(reason)`, `showAssistantFailure(conversation)`, the Reason lines of the suggestion bar, the small map before a time is chosen (plan 702)

- Status: stable — plan 702
- Use: `src/app/core/utils/assistant-failure.util.ts` — `assistantFailureKey(reason)` and `showAssistantFailure(conversation)`; the reason line of the inbox suggestion bar (input `failKey`); the small map before a time is chosen is the same `app-floor-map` in `src/app/pages/bookings/components/new-booking-dialog/new-booking-dialog.component.html`.
- When: a page tells the host why a suggestion failed or why a chat was handed over (inbox, simulator).
- Known copies: none.

### style-guard — `styleFindings(files, { root, allow })` in `scripts/lib/style-guard.mjs` (plan 703)

- Status: stable
- Use: `scripts/lib/style-guard.mjs` · `styleFindings` returns `[{ file, line, rule, text }]` for `.scss` (colour, font-size, font-weight, radius, shadow, space-scale, physical, engine-in-component) and `.html` (hand-drawn-dialog, local-empty, local-loading, bare-input); an `allow` entry `{ rule, file, line?, why }` removes a finding and needs a `why`.
- When: a style plan's `[auto]` check that its files use the shared pieces and tokens (`scripts/test/style-703.test.mjs` is the pattern).
- Known copies: none.

### style-run-guard — the run-wide style regression test (plan 718)

- Status: stable
- Use: `scripts/test/style-718.test.mjs` runs `styleFindings` over every file plans 704–717 converged (each of their tests exports `FILES` and `ALLOW`) and checks the reuse-lint rules `page-local-empty-state`, `own-dialog-role` and `page-local-width`.
- When: a later plan converges more pages — export `FILES` and `ALLOW` from its style test and add it to the list in that file.
- Known copies: none.

### guest-turn-back-to-bot — backToBot(db, conversation, { now, log }) in server/services/inbound.js (plan 719)

- Status: stable
- Use: `server/services/inbound.js` · `backToBot` is a private step of `handleInbound`; it hands a held or stale chat back to the assistant when the guest writes.
- When: a rule for returning a conversation to the assistant — add it there, never a second handler.
- Known copies: none.

### guest-turn-answer-waiting — answerWaiting(db, conversation, { log }) exported from server/services/inbound.js (plan 719)

- Status: stable
- Use: `server/services/inbound.js` · `answerWaiting` runs the turn for the newest guest message; the release route and `handleInbound` both use it.
- When: anything that must start a guest turn outside a new inbound message.
- Known copies: none.

### simulator-level-held-draft — the simulator's level line, held line and draft block (plan 719)

- Status: stable
- Use: `src/app/pages/frontdesk/simulator/simulator.page.html` and `.scss` · `.sim-level`, `.sim-held` beside `ai-failed-note` (the draft block was removed by plan 733).
- When: another note about the assistant's state in the simulator — extend these blocks.
- Known copies: none.

### test-turn-profile — turnProfile(profile, conversation) in server/services/frontdesk-tables.js (plan 733)

- Status: stable
- Use: `server/services/frontdesk-tables.js` · `turnProfile` answers a test conversation (the simulator) as level 1 whatever the business's level (R-23); `runTurnInner` in `frontdesk-turn.js` wraps the profile once with it, `onTap` checks it.
- When: any code that decides by the assistant level for a conversation — read the level through it, never a second test-conversation rule.
- Known copies: none.

### guest-holding-message — The holding message: holdGuest in server/services/frontdesk-turn.js (plan 733)

- Status: stable
- Use: `server/services/frontdesk-turn.js` · `holdGuest` sends the business's handoff text, else `fd_ai_holding_default`, through `sendOut` (author `server`) after a technical failure, once until the guest writes again (R-22).
- When: another failure path of the guest turn that should tell the guest someone will answer — call it, never a second sender.
- Known copies: none.

### owner-assistant-level — PUT /api/v1/business/front-desk/assistant-level in server/routes/business.js (plan 734)

- Status: stable
- Use: `server/routes/business.js` · the owner switches `assistant.level` between 0 and 1; refused for staff (`editFrontDesk`), a reserved level 2 and a draft or suspended front desk; each switch is a `levelHistory` row. Client: `FrontDeskProfileDataService.setAssistantLevel`.
- When: another one-field owner write on the front desk profile — add a sibling route beside it, not a generic data PUT.
- Known copies: none.
