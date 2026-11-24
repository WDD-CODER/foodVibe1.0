# Plan 705 — Bookings agenda, waiting list and service lists as shared rows

Status: draft
Depends-on: 703
Track: code
Snapshot: d06302a3

## Problem Statement
On `/bookings` the day and week agenda draws one glass card per booking (`article.bk-row.c-glass-card`), the waiting
list drawer draws its own `ol/li` rows, and the two service lists ("arriving next", "not assigned") use `.c-list-row`
but with bare `span` cells, so the three lists on one screen look three different ways (`night/style-audit.md` P2,
`shots/bookings.png`). The page shows nothing while it loads, the week view's "no bookings" is a plain `<p>`, the two
sheets build their own title and close button, and action icons are 15 px in one file and 16 px in the next. This
plan puts all three lists on the in-panel list container `.c-list` from 703, adds `app-loader` and
`app-empty-state`, uses the shell's title for the sheets, and moves the stylesheets onto tokens. Same bookings, same
actions, same order.

Verified on `chore/restaurant-staging` (`d06302a3`, 2026-11-23):
- `src/app/pages/bookings/bookings.page.html:50-127`: floor view `app-floor-view` (left alone); else `@if
  (!isLoading_())` (nothing while loading); day empty → `app-empty-state messageKey="bk_empty_day"`; week empty day →
  `<p class="bk-none">` (`:60`); groups `div.bk-group > span.bk-time + div.bk-rows > article.bk-row` with name link
  `a.bk-name` to `/clients/:id`, meta, status `c-chip--tag c-chip--sm`, and up to four `c-chip c-chip--tap` actions
  (`bk-seated`, `bk-finished`, `bk-no-show`, `bk-cancel`) with 15 px icons. Top bar `div.bk-bar` (`:4-48`) holds the
  date navigation and the view chips (`c-chip--tab`).
- `src/app/pages/bookings/components/waitlist-drawer/waitlist-drawer.component.html`: `app-modal-shell [sheet]="true"
  [labelledBy]="'wl-title'"`, own `header.wl__head` with `h3#wl-title` and a close `c-btn-ghost c-btn-ghost--sm`
  (`:1-14`); rows `ol.wl__list > li.wl-row` (`:93-159`, styled at `waitlist-drawer.component.scss:42-49`), ended
  parties `ul.wl__ended` (`:175`); `app-loader` already used. Panel width literal `560px` (`.scss:7`).
- `src/app/pages/bookings/components/table-sheet/table-sheet.component.html:3-16`: same hand title + close; width
  `420px` (`.scss:7`).
- `src/app/pages/bookings/components/service-lists/arriving-list.component.html:11-13`,
  `unassigned-list.component.html:11-13`: `ul > li.c-list-row` with `span.sl__*` cells (no `.c-list-body-cell`).
- From 703: `.c-page`, `.c-list` (`--list-cols`, `role="list"`/`listitem` rule), `.c-list--plain`, `.c-row-link`,
  `app-empty-state [compact]`, `styleFindings`.

## Goals & Success Criteria
**Primary:** every list on the bookings screen is the same kind of list — one line per booking or party, same row
look, same chip actions — and the screen never stays blank while it loads.

- [auto] `pnpm run test:scripts` passes, including the new `scripts/test/style-705.test.mjs`: `styleFindings` on `src/app/pages/bookings/bookings.page.{html,scss}` and every `.html`/`.scss` under `src/app/pages/bookings/components/{waitlist-drawer,table-sheet,service-lists}/` returns `[]`; the four templates with a list contain `class="c-list` and no `bk-row`, `wl-row`, `bk-none`; the two sheets contain no `<h3`.
- [auto] `pnpm run test:ci` passes, including new cases in `src/app/pages/bookings/bookings.page.spec.ts` (while `isLoading_()` is true one `app-loader` renders; two bookings at 19:00 render two `.c-list-row` under one time heading; a week day with no booking renders a compact `app-empty-state` with `bk_empty_day`; the seated chip still calls `setStatus(b, 'seated')`), `src/app/pages/bookings/components/waitlist-drawer/waitlist-drawer.component.spec.ts` (three waiting parties → three `.c-list-row`; the shell's title reads `wl_title`; the close button is a `.c-icon-btn` that emits `closed`) and `src/app/pages/bookings/components/table-sheet/table-sheet.component.spec.ts` (title from the shell; close emits).
- [auto] `pnpm run build` passes; `pnpm run lint` exits 0; `pnpm run lint:icons` exits 0; `pnpm run lint:reuse` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] any list page on a phone and on a desktop · look at the rows · the page header matches the other list pages and every row stays on one line (`/bookings?view=day`, the waiting list and the "arriving next" list; default `app-list-container`).
- [human] `/bookings?view=day` on a tablet: the booking rows, the waiting-list rows and the "arriving next" rows look like one family (same height, same separators, same chip buttons).
- [human] the list's page with no items · open the page · a message says the list is empty (`/bookings?view=week` on a day with no booking; default `empty-state-on-list`)

## Execution Mode
- Parallel: yes — after 703.
- Concurrent plans: any of 704–717 not in this plan's Depends-on line or depending on it (no two of 704–717 share a file)
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/bookings/bookings.page.html
src/app/pages/bookings/bookings.page.scss
src/app/pages/bookings/bookings.page.ts
src/app/pages/bookings/bookings.page.spec.ts
src/app/pages/bookings/components/waitlist-drawer/**
src/app/pages/bookings/components/waitlist-drawer/waitlist-drawer.component.spec.ts
src/app/pages/bookings/components/table-sheet/**
src/app/pages/bookings/components/table-sheet/table-sheet.component.spec.ts
src/app/pages/bookings/components/service-lists/**
scripts/test/style-705.test.mjs
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-6: preserves — the scope matches `src/app/**/*ai*` only by file or folder name (e.g. waitlist, platform-ai-shots, ai-model-manager, deposit-paid, dashboard); no AI call is added, moved or changed, and every model call still goes through `server/routes/ai.js`.
- INV-none: preserves — markup and styles of the bookings lists; status changes still go through the same `setStatus` and booking services, the server still decides every move (table-holds, table-bookings unchanged).

## Reuse Check

- Agenda, waiting list, ended parties, arriving and not-assigned lists — family: list-page — rung: 1 — why: `.c-list` (in-panel list, 703) with `.c-list-row` / `.c-list-body-cell`.
- Booking actions — family: chip — rung: 1 — why: the existing `c-chip c-chip--tap` buttons, icons 16.
- Sheet title and close — family: modal-shell — rung: 1 — why: `titleKey` on `app-modal-shell` plus a `.c-icon-btn` close.
- Loading — family: feedback — rung: 1 — why: `app-loader`.
- Week-day and drawer empties — family: empty-state — rung: 1 — why: `app-empty-state [compact]="true"`.
- none new.

## Defaults

- app-list-container — exception — why: the agenda, waiting list and service lists are lists inside a work screen (date bar, room, drawers), not entity list pages; they use `.c-list`, the in-panel form of the shared list container registered by 703
- empty-state-on-list — applies — how: `app-empty-state` (compact in a week day, in the drawer's "nobody waiting" and in the two service lists)
- loading-and-error-states — exception — why: this plan adds the loader only; the page has no error area today and one needs a new message key, which this style run does not add (follow-up in `night/style-audit.md`)
- confirm-destructive-action — applies — how: cancel and no-show keep exactly the confirmation they have today (none added, none removed)
- one-breakpoint-set — applies — how: `$break-*` names only; the sheet widths become `min(…, 100%)` of tokens or `rem`

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a host, I want every list on the service screen to look the same, so that I read bookings, waiting parties and late tables at a glance during service.

## Functional Requirements

### Must Have (P0)
- [ ] Agenda (day and week): the page body is `.c-page` (72rem). Each time group is a heading row (time, `dir="ltr"`,
  `--fs-sm`, `--fw-semibold`) followed by a `ul.c-list.c-list--plain[role=list]` inside one `.c-glass-panel` per
  day; `--list-cols: minmax(0, 1.4fr) auto auto minmax(0, 1.6fr)`. Each booking is `li.c-list-row[role=listitem]`
  with cells: name (`a.c-row-link` to `/clients/:id`) · party size + kind (`--fs-sm` muted) · status
  (`c-chip c-chip--tag c-chip--sm`) · actions (`.c-col-actions` with the same tap chips, icons 16, wrapping allowed
  only inside this cell). `data-testid="booking-row"` and `data-status` stay on the row.
- [ ] Week view: the day title stays an `h2` with `--fs-md` / `--fw-semibold`; an empty day renders
  `app-empty-state [compact]="true" messageKey="bk_empty_day"`.
- [ ] Loading: `@if (isLoading_())` renders `app-loader` in the body; the floor view is unchanged.
- [ ] The `.bk-row`, `.bk-rows`, `.bk-group`, `.bk-main`, `.bk-actions`, `.bk-none` rules are deleted; the top bar
  `div.bk-bar` keeps its place and behaviour, its stylesheet goes onto tokens.
- [ ] Waiting list: `app-modal-shell` gets `titleKey="wl_title"` (the hand `header.wl__head` and `h3` go); a
  `.c-icon-btn` with `x` (16) and `aria-label` "סגור" stays at the sheet's top inline end; waiting rows and ended
  rows become `.c-list` rows (cells: name · party size · waited minutes · actions). All buttons and handlers stay.
- [ ] Table sheet: same title change with its existing title key; close is a `.c-icon-btn`.
- [ ] Service lists: each `li.c-list-row` gets real `.c-list-body-cell` cells inside a `ul.c-list.c-list--plain`;
  their empty texts become `app-empty-state [compact]="true"` with the existing keys.
- [ ] Every literal in the touched stylesheets becomes a token (703's mapping in
  `docs/brain/component-families.md` → engine-classes); sheet widths become `min(35rem, 100%)` (waitlist) and
  `min(26.25rem, 100%)` (table sheet), the `320px` in floor-view is not touched (not in scope).

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL; times stay `dir="ltr"`. Icons: 16 for row chips and close, 18 for the top bar buttons.
- No new dictionary key. Icons used are already registered (`user-check`, `circle-check`, `circle-slash`, `circle-x`,
  `x`, `alert-triangle`).

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Draw the day and week agenda as one-line rows in the in-panel list, with a loader while it loads and a small empty state for an empty day — src/app/pages/bookings/bookings.page.html, .scss, .ts
- [ ] A2: Prove the agenda rows, loader, empty day and seated action — src/app/pages/bookings/bookings.page.spec.ts
- [ ] A3: Give the waiting list and the table sheet the shell's title and an icon close, and draw the waiting rows as shared rows — src/app/pages/bookings/components/waitlist-drawer/*, src/app/pages/bookings/components/table-sheet/*
- [ ] A4: Give the arriving and not-assigned lists real list cells and a small empty state — src/app/pages/bookings/components/service-lists/*
- [ ] A5: Lock the bookings screen on the shared pieces and tokens — scripts/test/style-705.test.mjs

## Technical Considerations
- The style test `scripts/test/style-705.test.mjs` exports `FILES` (the checked paths) and `ALLOW` (its allow entries, `[]` when none), so plan 718 re-checks the whole run without editing it.
- Dependencies: 703.
- New files: `scripts/test/style-705.test.mjs`.
- Model changes: none. Backend / API: none. Auth and validation: none. Security surface: none. Data / migration: none.
- Project checks: `log-query` item; no dictionary, `app.config.ts` or `src/styles.scss` change.
- Traps: `.c-list-row` is `display: contents` — `data-testid` on the `li` still exists in the DOM, so existing tests
  that query `booking-row` keep working, but `getBoundingClientRect()` on it returns zero: tests must query cells.
  The floor view, its time strip and `shared/floor-map` are out of scope.

## Out of Scope
- `src/app/pages/bookings/components/new-booking-dialog/**` and `walk-in-dialog` (fix plans 701–702 own the
  new-booking dialog; walk-in is left for a later plan to keep the two dialogs together).
- `src/app/pages/bookings/components/floor-view/**`, `src/app/shared/floor-map/**` (floor plans 699–700).
- Moving the date bar into the page header.

## Critical Questions
- none

## Execution Notes
- behaviour: agenda rows are grouped by time with a heading row instead of a time column beside cards — the shared row has one line, the time heading keeps the "who comes at 19:00" reading.
- behaviour: the action chips keep their order and conditions; on a phone they may wrap inside the actions cell, the rest of the row stays on one line.
