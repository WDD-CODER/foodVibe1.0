# House style — what a page is built from and how every page behaves

The rules that make FoodVibe feel like one product on every route. Two parts: **page recipes** (which shared pieces
make a whole page of a given kind) and **behaviour rules** (how every page scrolls, moves, loads and answers).
Containers do not have to be identical; the frame and the behaviour do.

- The look itself (colours, surfaces, type, spacing, radius) lives in `.interface-design/system.md` and is not
  repeated here. The shared pieces live in `docs/brain/component-families.md`.
- The rules were read from the six screens ported to the design (Dashboard, Inventory, Recipe Book, Suppliers,
  Equipment, Venues) on `origin/main` 3f5f24a3 (plan 739). Where the six disagree, the majority is the rule and the
  others are counted as gaps in `docs/qa/house-style-audit.md`.
- A rule is added only when a real page needs it. A new recipe is the Human's decision.
- A piece written `needs: <piece>` does not exist yet. Nothing here invents it; the audit lists who waits on it.

Each rule is one `### <id>` section with the same fields: `kind`, `rule`, `applies to`, `built from`, `states`
(recipes only), `reference`, `existing default` (an id in `_shared/product-defaults.md`), `check` (how it is
enforced: `plan`, `default`, `lint` or `card`), `later check` (optional: a lint rule that waits for a missing piece), `exception` (optional: where the rule does not apply), `gaps today` (pages that break it, from the audit).

## Page recipes

### recipe-list

- kind: recipe
- rule: A page that lists things has one header with the title, the count, the search and the actions; the rows below it look and scroll the same on every list, as a table or as cards.
- applies to: every page whose main job is a list of records (products, recipes, suppliers, equipment, venues, clients, invoices, menus, trash).
- built from: family `list-page` — `app-list-shell` (`src/app/shared/list-shell/`; `layout: 'table' | 'cards'`; it draws `app-page-header` itself), `app-selection-bar`, `app-row-actions-menu`, `app-list-row-checkbox`, rows `.c-list-row` with `.c-grid-header-cell` / `.c-list-body-cell`, `.c-pagination-controls`, filters `.c-filter-section` + `.c-chip-group`; family `list-logic` — `useListState()` and `src/app/core/utils/list-controls.util.ts` (search clear, Escape); family `empty-state`. A table list declares its columns (`ListColumn`, with which may fall) and passes them as `[columns]` to `app-list-shell` (plan 745).
- states: loading — the app's full-page loader, and a small inline `app-loader` in the row whose action is running; empty — `app-empty-state` with a message and an add button in the rows area; no search results — `app-empty-state` with a "nothing matches" message (today five of the six lists show plain text here: a gap); error — a toast from `UserMsgService`, the list stays; phone — the page scrolls, the header keeps its place, each row stays on one line.
- reference: `src/app/pages/inventory/components/inventory-product-list/`
- existing default: `app-list-container`, `empty-state-on-list`
- check: plan
- gaps today: 2 pages not on the shared list container (menu-library, trash); the plain-text "no results" in 7 lists is counted under `empty`

### recipe-detail

- kind: recipe
- rule: A page that shows one record opens with the same header as every other page — back, the record's name, the main actions — and shows its content as titled panels.
- applies to: a page for one record that is read more than edited (venue view, client profile).
- built from: family `list-page` piece `app-page-header` (`src/app/shared/page-header/`: `backLink` or `showBack`, the title, actions in `[header-actions]`); each section a `<section>` with `.c-glass-panel` and an `h2`; main action `.c-btn-primary`, others `.c-btn-ghost`; family `modal-shell` for an edit popup; family `empty-state`.
- states: loading — the app's full-page loader; empty section — `app-empty-state` inside the panel (today hand-made `p.detail-empty`: a gap); record not found — `app-empty-state` in place of the page; error — a toast; phone — panels stack in one column, the header actions stay in the header.
- reference: `src/app/pages/clients/components/client-profile/` (the frame); `src/app/pages/venues/components/venue-detail/` (the panels)
- existing default: `loading-and-error-states`
- check: plan
- gaps today: 1 page (venue-view: its own top bar instead of the page header, hand-made empty lines)

### recipe-form

- kind: recipe
- rule: A page that adds or edits one record has the page header on top, its fields in titled sections, and one row of buttons at the end: cancel on one side, one save button on the other.
- applies to: every add / edit page (product, supplier, equipment, venue, onboarding) and any full-page form.
- built from: `app-page-header` (title "add" or "edit: name", back); sections `div.form-section`; family `form-field` — `app-form-field` with `.c-input`, `app-custom-select`, `app-date-field`; the button row `.c-form-actions` (`src/styles.scss`) with `.c-btn-ghost` cancel and one `.c-btn-primary` save; family `entity-form` — `useUnsavedChanges` + `pendingChangesGuard`; the first field gets focus on open.
- states: loading — the app's full-page loader until the record is ready (resolver, family `page-entry-loading`); saving — the save button is disabled and shows a small inline `app-loader`; error — a toast, and field errors under the fields through `app-form-field`; saved — a success toast and back to where the user came from; phone — one column, the button row stays at the end of the form.
- reference: `src/app/pages/equipment/components/equipment-form/`
- existing default: `unsaved-changes-on-leave`
- check: plan
- gaps today: 4 pages (product-form, supplier-form, equipment-form, venue-form draw their own `form-header` and get "back" from a hand-made nav; product-form also has its own button row with two primary buttons and no cancel)

### recipe-settings

- kind: recipe
- rule: A settings page has the page header, a row of tabs when it has more than one group, and each group in its own titled panel that saves in place.
- applies to: pages where the user changes options of the business or of a module (settings, front desk settings, the metadata manager).
- built from: `app-page-header`; tabs `app-tab-chips` (`src/app/core/components/tab-chips/`) inside `app-scroll-rail` (`src/app/shared/scroll-rail/`); each group a `<section>` with `.c-glass-panel` and an `h2`; fields through family `form-field`; a group with a save button ends with `.c-form-actions`; family `edit-gate` for who may save.
- states: loading — the app's full-page loader; saving — the group's save button disabled with a small inline `app-loader`; saved — a success toast; no permission — `app-empty-state` with a lock icon in place of the page; phone — panels in one column, the tab row scrolls sideways inside `app-scroll-rail`.
- reference: `src/app/pages/settings/`
- existing default: `loading-and-error-states`
- check: plan
- gaps today: 2 pages (front desk settings: static groups use the card that lifts on hover; metadata manager: no header of its own, hand-made empty blocks)

### recipe-board

- kind: recipe
- rule: A page of cards or tiles has the page header and a grid of panels that all share one surface, one gap and one title style.
- applies to: overview and work-queue pages (dashboard, requests, bookings, report, platform, diagnosis list).
- built from: `app-page-header`; every card a `.c-glass-panel` (a card the user opens or presses: `.c-glass-card`); card title an `h2` or `h3` from the type scale; tabs through `app-tab-chips`; family `chip` for status marks; family `empty-state`.
- states: loading — the app's full-page loader; a card that loads alone dims and shows `app-loader` inside it; empty — `app-empty-state` inside the card or in place of the grid; error — a toast; phone — one column.
- reference: `src/app/pages/dashboard/components/dashboard-overview/`
- existing default: `loading-and-error-states`
- check: plan
- gaps today: 2 pages (dashboard: hand-made KPI and activity cards; report: its own header)

## Behaviour rules

### scroll

- kind: behaviour
- rule: On a phone the whole page scrolls. On a wide screen a list scrolls only its rows, and any area that scrolls on its own shows small arrows when there is more above or below; scrollbars are never drawn.
- applies to: every page, and every inner area that scrolls (list rows, filter panel, dropdown list, a long card).
- built from: `app-list-shell` (its rows and filter panel already do it); the directive `appScrollIndicators` (`src/app/core/directives/scroll-indicators.directive.ts`, classes `can-scroll-up` / `can-scroll-down`); sideways rows through `app-scroll-rail` (`src/app/shared/scroll-rail/`); `scrollbar-width: none` on the area; any other block that scrolls on its own uses `app-scroll-area` (`src/app/shared/scroll-area/`, family `scroll-area`; the engines `.c-scroll-area` and `.c-scroll-arrow` in `src/styles.scss`; `maxBlockSize` caps its height).
- reference: `src/app/shared/list-shell/` as used by `src/app/pages/recipe-book/components/recipe-book-list/`; `src/app/pages/trash/` for `app-scroll-area`
- existing default: none
- check: lint — files: `src/app/pages/**/*.scss`; pattern: `overflow(-y)?:\s*(auto|scroll)`; hint: a page does not make its own scroll area: use app-list-shell, app-scroll-rail or app-scroll-area
- gaps today: 9 page files still make their own scroll area (dashboard overview, platform dashboard, menu-intelligence ×5, recipe-builder ×2)

### drag

- kind: behaviour
- rule: Anything that can be reordered has the same grip handle, lifts the same way while it is moved, leaves the same gap where it will land, and can also be moved with the keyboard.
- applies to: every reorderable list (recipe ingredients, recipe steps, AI draft lines, AI model order).
- built from: Angular CDK `cdkDropList` / `cdkDrag` with a `cdkDragHandle` showing the Lucide `grip-vertical` icon and a `*cdkDragPlaceholder`; the shared drag look is the three engine classes in `src/styles.scss` — `.c-drag-list` on the drop list, `.c-drag-item` on the dragged row, `.c-drag-handle` on the grip (the row being moved carries `--shadow-card`; rows settle in `--dur-slow`); the keyboard way is the directive `appReorderKeys` (`src/app/core/directives/reorder-keys.directive.ts`) on the grip: arrow up / down emit `reorder`, and the list calls the same move method its drop handler uses; family `drag-reorder`.
- reference: `src/app/pages/recipe-builder/components/recipe-ingredients-table/`
- existing default: none
- check: lint — files: `src/app/**/*.scss`; pattern: `\.cdk-drag-(preview|placeholder|animating)`; hint: drag looks come from the shared drag style in src/styles.scss, not from the component
- gaps today: 0 files (all four drag lists use the shared pieces)

### motion

- kind: behaviour
- rule: Things that move do it at one of three speeds and with one of two curves; nothing bounces, and a user who asked for less motion gets none.
- applies to: every transition and animation in the app.
- built from: the tokens in `src/styles.scss` `:root` — `--dur-fast` (0.15s: hover, press, colour), `--dur-base` (0.2s: fades, small moves), `--dur-slow` (0.25s: panels, lifts, drag settle), `--ease-spring` (transforms and lifts), `--ease-smooth` (colour and opacity); the global `@media (prefers-reduced-motion: reduce)` rule in `src/styles.scss`. A transition names its properties (never `all`).
- reference: `src/app/pages/cook-view/cook-view.page.scss` (the only page that uses the duration tokens today)
- existing default: none
- check: lint — files: `src/app/**/*.scss`; pattern: `(?:transition|animation)(?:-duration)?\s*:[^;]*\b\d*\.?\d+m?s\b`; hint: use the motion tokens (--dur-fast, --dur-base, --dur-slow with --ease-spring or --ease-smooth) instead of a typed time
- gaps today: 24 page files in 11 page folders type their own times (and `src/styles.scss` itself uses 0.18s, 0.1s and 0.4s beside the three token speeds)

### loading

- kind: behaviour
- rule: A page that is waiting for its data shows the app's loader, and a button that is working is disabled and shows a small loader inside it; text that says "loading" is never the only sign.
- applies to: every page that loads data and every button that starts a save, a delete or an upload.
- built from: family `feedback` — `LoadingService.track()` (`src/app/core/services/loading.service.ts`) drives the full-page `app-loader` in the app root; `app-loader` (`src/app/shared/loader/`: `size`, `inline`, `overlay`, `label`); a waiting button is `[disabled]` plus `<app-loader size="small" [inline]="true" />`; a route waits on its resolver (family `page-entry-loading`).
- reference: `src/app/pages/equipment/components/equipment-form/` (button), `src/app/pages/inventory/components/inventory-product-list/` (row)
- existing default: `loading-and-error-states`
- check: lint — files: `src/app/pages/**/*.html`; pattern: `class="(?:[^"]*\s)?[a-z][a-z0-9]*(?:(?:-|__)[a-z0-9]+)*(?:-|__)loading(?:\s[^"]*)?"`; exclude: `src/app/pages/menu-intelligence/components/loading-list/**` (there "loading" means loading a vehicle); hint: show waiting with app-loader (src/app/shared/loader/), not a text block
- gaps today: the lint pattern finds 4 lines in 4 templates (frontdesk settings, frontdesk onboarding, public request ×2); the AI model manager shows its waiting text in an `.empty-state` block (counted under `empty`); supplier form's save button has no loader)

### empty

- kind: behaviour
- rule: A list, a panel or a search with nothing to show says so with the same icon-and-message block, and offers the next step when there is one.
- applies to: every list, card, panel and search result area.
- built from: family `empty-state` — `app-empty-state` (`src/app/shared/empty-state/`: `messageKey`, `icon`, `ctaLabelKey`, `(ctaClick)`), which draws `.c-empty-state`.
- reference: `src/app/pages/inventory/components/inventory-product-list/` (the empty list with its add button)
- existing default: `empty-state-on-list`
- check: lint — files: `src/app/pages/**/*.html`; pattern: `class="(?:[^"]*\s)?(?:[a-z][a-z0-9]*(?:(?:-|__)[a-z0-9]+)*(?:-|__)empty|empty-state[\w-]*|no-results)(?:\s[^"]*)?"` (a class that ends in `-empty` or `__empty`, starts with `empty-state`, or is `no-results`; a `--empty` modifier is not matched); hint: show "nothing here" with app-empty-state (src/app/shared/empty-state/), not a hand-made block
- gaps today: the lint pattern finds 33 lines in 23 page templates (plain "no results" text in 7 lists; hand-made empty blocks in dashboard, venue view, venue form, cook view, menu intelligence ×3, metadata manager ×5, platform ×2, trash)

### feedback

- kind: behaviour
- rule: The app answers every action the same way: a short message at the same place for done, failed and undo, and one question box before anything is deleted or thrown away.
- applies to: every save, delete, upload, restore and every action that can fail.
- built from: family `feedback` — `UserMsgService` (`src/app/core/services/user-msg.service.ts`: `onSetSuccessMsg`, `onSetErrorMsg`, `onSetWarningMsg`, `onSetSuccessMsgWithUndo`; shown by `app-user-msg` in the app root; a message stays 2 s, an error 4 s, an undo 30 s); family `modal-controller` — `ConfirmModalService` (`src/app/core/services/confirm-modal.service.ts`: `open`, `openTernary`, `variant: 'danger'` for a delete); never `alert` / `confirm` (lint rule `native-browser-dialog`).
- reference: `src/app/pages/suppliers/components/supplier-form/` (success and error), `src/app/pages/venues/components/venue-list/` (confirm before delete)
- existing default: `confirm-destructive-action`
- check: card
- gaps today: 0 pages by code (every page folder that writes uses `UserMsgService`); the toast has no `role` / `aria-live`, so a screen reader is not told — one fix in `app-user-msg`

### keyboard-focus

- kind: behaviour
- rule: Every control shows the same ring when reached with the keyboard; Escape always goes one step back, Enter confirms, and when a popup closes the focus returns to what opened it.
- applies to: every button, link, row, chip, field and popup.
- built from: the ring `outline: 2px solid var(--border-focus); outline-offset: 2px` on `:focus-visible`, given to every button, link, summary and `role` / `tabindex` control by one zero-specificity `:where(…):focus-visible` rule in `src/styles.scss` (a component rule that styles its own focus still wins); fields use `--shadow-focus` (`.c-input`, `.c-select`); family `modal-shell` — `app-modal-shell` owns Escape (top-most popup only, asks first when there are changes), the Tab trap and the return of focus; search fields clear and close on Escape through `src/app/core/utils/list-controls.util.ts`; `app-row-actions-menu` closes on Escape.
- reference: `src/app/shared/modal-shell/` (Escape, trap, return), `src/app/pages/venues/components/venue-list/venue-list.component.scss` (the ring)
- existing default: none
- check: default — card: any page · press Tab through the buttons, open a popup and press Escape · every control shows the same ring, Escape closes only the popup, and the focus is back on the button that opened it
- gaps today: 7 hand-made popups do not use `app-modal-shell` (equipment list, menu intelligence ×5, recipe builder ×1), so they miss its Escape, trap and focus return; controls that hide the ring with `outline: none` or `outline: 0` (42 lines in 21 files) still show none

### column-carousel

- kind: behaviour
- rule: A list shows as many columns as fit its measured width. As space runs short the columns fall one by one into one carousel column the user switches — two columns the first time (a carousel with one column is pointless), then one at a time — and come back when the list widens. Each list sets the order in which its columns fall (a column with no order falls after the ranked ones, from the end of the list). Only the name and the actions always stay (`stay`), so on a phone every list shows the name, one switching column and the actions. A one-line cell (a rating, a phone number, a price, a date, a count) is never narrower than its content: its column falls first, whatever the screen's width — the decision follows each column's width, not a breakpoint. Long text in a cell is cut to one line with an ellipsis and its full text is in the cell's tooltip. A row never wraps and the list never scrolls sideways.
- applies to: every list drawn as a table (`recipe-list` in the table layout), at every width.
- built from: family `list-page` — the list declares its columns (`ListColumn`: track, least width, `fall` order) and passes them to `app-list-shell` through the `columns` input; `fitColumns()` (`src/app/shared/list-shell/list-columns.util.ts`) decides what fits; `*appFallColumn` (`src/app/shared/column-carousel/`) marks each column that may fall, inside `app-column-carousel-header` and `app-column-carousel-cell`. A list not yet moved still uses `appColumnSlide` with `gridTemplate` / `mobileGridTemplate` (carousel on the phone only).
- reference: `src/app/pages/inventory/components/inventory-product-list/`
- existing default: `app-list-container` (every row stays on one line at every screen size); `one-breakpoint-set`
- check: default — card: any list with many columns, on a phone and on a tablet · look at the header and press the carousel arrow · on a phone you see the name, one switching column and the actions; the switching column changes to the next piece of information, no row wraps, no cell is cut and nothing scrolls sideways
- gaps today: none of the table lists on the list container is outside the rule (products plan 745; clients, equipment, recipe book, suppliers, invoices plan 746). The stock count (one column that could fall, nothing to switch between) and the platform dashboard (its own grid) stay as they are; the front desk knowledge list has one column and is not a table. menu-library and trash are not on the list container at all (counted under `recipe-list`). Added by the Human, 2026-11-25.

### sideways-row

- kind: behaviour
- rule: A row of chips, tabs or buttons that is wider than the screen sits in one visible container that scrolls sideways; it looks and works the same everywhere, the top bar and the metadata manager included. The container is as wide as the items in it (and never wider than the room), not as wide as the screen. On a computer a round arrow button sits outside the container at each end (never over a chip) and moves the row one step; an arrow whose side has no more is invisible. Whenever the outside buttons are not shown (a phone, or a row that asks for none) a sign of more sits inside the container: a soft fade with a small arrow at the edge of the side that has more, gone at the end; the row is moved by swiping. Where the outside buttons are shown they are the sign. On every screen the row can be grabbed and dragged sideways (Human, 2026-11-25, 2026-11-26).
- applies to: every row of several items that can outgrow its width (the top bar's navigation, tab chips, filter chips, stage bars, jump navigation). Not a data table that is wider than the screen.
- built from: family `sideways-row` — `app-scroll-rail` (`src/app/shared/scroll-rail/`): the visible frame (`frame="box"`, the top bar's box values) around the scroller, sized to its items, round arrow buttons beside it (outside; not rendered on a phone or with `arrows="never"`, where the sign of more inside the frame — `.sr-more--prev` / `.sr-more--next`, a fade and a 16px chevron — shows instead), grab-and-drag with a mouse or pen, `snap`, `arrows`, `step`. Used by the top bar (`header.component.html`), `app-tab-chips`, the settings tabs, the metadata manager's jump navigation, the event stage bar, the dish row's field strip, the diagnosis workspace and the dev catalog.
- reference: `src/app/core/components/tab-chips/` (the behaviour); the top bar's navigation pill (the frame)
- existing default: none
- check: default — card: any page with a row of chips or tabs, on a computer · look at the row and press its arrow · the row sits in a visible rounded container as wide as its chips, a round arrow shows outside it at the end that has more, and pressing it moves the row one step
- gaps today: none known; every row of chips, tabs or buttons found by `git grep -l app-scroll-rail -- "src/app/**/*.html"` (8 templates) is on the framed rail. The 5 other `overflow-x: auto` rules under `src/app` (outside the rail) are data tables that scroll sideways, and the unused `.m-scroll` strip in `src/styles.scss` has no user. No line check is kept: a line check cannot tell a row of chips from a data table that scrolls sideways. Added by the Human, 2026-11-25.

### tooltip

- kind: behaviour
- rule: Every short explanation that appears when a control is hovered, focused or tapped shows in the app's one tooltip box: the same surface, text size and arrow, opening beside the control on the side with room and never cut off by the screen — on either side (the box is clamped inside the viewport with a margin, its arrow still points at the control). With a mouse it opens on hover and keyboard focus; on a touch screen there is no hover: a tap on the control shows it (a tap elsewhere hides it) and the control's own action still runs. A control that cannot be used says why in the same box (default `disabled-explains-why`, Human, 2026-11-26): it looks disabled, stays reachable, its action never runs, and hovering, focusing or tapping it shows the reason; only a control that is disabled while its own action runs (saving, loading) stays plainly disabled.
- applies to: every hint, explanation or "what is this" on a control, an icon button, a badge or a cut-off text; every control that is disabled for a reason.
- built from: the shared tooltip `[appTooltip]` (`src/app/shared/tooltip/`: a directive and a box component, with the `.c-tooltip` engine in `src/styles.scss`), placed by `placeInViewport` (`src/app/core/utils/viewport-placement.util.ts`). A disabled control uses `[appDisabledWhy]="reason"` (`src/app/shared/tooltip/disabled-why.directive.ts`): `aria-disabled` and the `.is-disabled` look instead of the native `disabled`, the click and Enter / Space swallowed, the reason in the shared tooltip; a text field becomes read-only, a select swallows the press and the keys; the control's ordinary hint goes through `[disabledWhyTip]`; the shared controls (counter, date field, time field, the selects, the approve stamp, the rating stars, the row checkbox, the voice note) take it as `disabledWhy`. The browser `title` hints that remain (counted by the lint below) are moved onto it by a later plan.
- reference: `src/app/shared/nutrition-badge/` (the placement and the box closest to the target look)
- existing default: `anchored-popup` (where the box opens); `hints-in-tooltips` (every hint appears as a tooltip, not as text on the page). The two fit together (Human, 2026-11-25): the default says a hint is a tooltip, this rule says every tooltip uses the one shared box. The default's `how` line was reworded (Human, 2026-11-25, plan 744) to name the shared tooltip.
- exception: the product nutrition box (`src/app/shared/nutrition-badge/`) keeps the look it already has. It may sit in the same shared container and placement, but its own styling is not replaced.
- check: lint — files: `src/app/**/*.html`; pattern: `\[attr\.title\]=|\[title\]=|<(?:button|a|span|div|p|i|li|td|th|label|input|img|lucide-icon)\b[^>]*\stitle="` (a `title` on a native element or the icon; a `title` input of an app component is not matched); hint: show a hint with the shared tooltip (not the browser's title), so it looks the same everywhere and works on touch. A second lint, `house-disabled-why` — files: `src/app/**/*.html`; pattern: `\[disabled\]=`; hint: a control that can be disabled says why: use `[appDisabledWhy]="reason"` (`src/app/shared/tooltip/`), or keep `[disabled]` only while its own action runs
- gaps today: 51 browser `title` hints in 27 templates (counted with the lint pattern; plan 744 moved the 2 hand-made tooltips and 3 hints onto the shared tooltip, plan 747 the 26 that were the reason of a disabled control). 151 `[disabled]` bindings in 72 templates (counted with the `house-disabled-why` pattern, 2026-11-26, after plan 747's last step): each is either "its own action is running" (saving, loading, sending — the default's exception) or a shared control passing its caller's `disabled` on when no reason was given (`disabled() && !disabledWhy()`); every other inactive control now gives a reason through `[appDisabledWhy]` / `disabledWhy`. Both are in the `reuse-copy.tooltip` debt baseline (202). Added by the Human, 2026-11-25; the disabled rule 2026-11-26.

## Pilot log

Written by plan 740. The Planner adds a row when a plan that added a page closes: `fix-up: none`, or the plan number of
the style fix that followed. Plan 741 reads it.

| plan | page added | recipe | style fix-up after the build | date |
| --- | --- | --- | --- | --- |

## Kit needs

What the workflow kit must own once the rules are proven (read by plan 741). Plans append one line each.

- A gate that fails a plan that adds a page with no `Page recipe:` line (plan 740 can only describe the check in `docs/agent/plan-checks.md`): `scope-check --recipe`.
- The `Page recipe:` line in the PRD template (`.claude/references/prd-template.md`), under `## UI/UX Notes`.
- The review bullet in `/plan`'s Architect + PM review: a page-adding plan names its recipe, or `open:` for `Page recipe: new`.
- A trigger row in `AGENTS.md`: "adding a page or a route" → `docs/agent/house-style.md` and `docs/agent/plan-checks.md`.
- Style QA's sweep installs its read-only guard after the sign-in step, so the guard aborts the app's session refresh and signed-in pages are measured signed out (plan 739; worked around in `scripts/qa/lib/styleqa-sign-in.mjs`). The sweep should install the guard first, or let a route another handler answers through.
- Style QA has one sign-in for all pages; a page behind a role the QA user lacks (`/platform`, `/diagnosis`) is measured as the page it redirects to, with no warning. The sweep should compare the final URL with the route and report a redirect.
