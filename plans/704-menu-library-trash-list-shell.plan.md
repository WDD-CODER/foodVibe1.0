# Plan 704 — Menu library and trash on the shared list page

Status: draft
Depends-on: 703
Track: code
Snapshot: d06302a3

## Problem Statement
The event-menu library (`/menu-library`) and the trash (`/trash`) are the two full-page entity lists that do not use
the shared list page, so they look like another app next to the recipe book and the clients list
(`night/style-audit.md` P1, screenshots `shots/menu-library.png`, `shots/trash.png`). The menu library draws a glass
box with a five-select filter grid and a grid of `article.event-card` cards with local `.tag` pills and local icon
buttons; the trash is a 45 rem column of one card per entity type with plain `ul` rows, local buttons, a plain-text
empty message and a history overlay that has no dialog role and no Escape. This plan moves both onto
`app-list-shell` with one `.c-list-row` per item, `app-empty-state`, `app-modal-shell` and the engine buttons and
chips — same data, same actions, same filters.

Verified on `chore/restaurant-staging` (`d06302a3`, 2026-11-23):
- Reference implementation of the shell: `src/app/pages/clients/components/client-list/client-list.component.html`
  (`app-list-shell` with `[isPanelOpen]`, `(panelToggle)`, `[gridTemplate]`, `[mobileGridTemplate]`, `[resultCount]`,
  `[resultTotal]`; slots `shell-title`, `shell-search`, `shell-actions`, `shell-table-header`, `shell-table-body`,
  `shell-filters`, `shell-filter-clear`). Shell: `src/app/shared/list-shell/list-shell.component.ts:27-49`.
- `menu-library-list.component.html` today: `app-page-header` with search + "פנייה חדשה" (`c-btn-ghost`) + "אירוע חדש"
  (`c-btn-primary`) (`:1-30`); `.filters-bar` of five `app-custom-select` (stage, event type, serving style, date,
  sort) and a sort-order button (`:32-98`); `.events-list` of `article.event-card` (`:113-192`) with `.tag` pills
  (stage / cost / sale / guests / legacy) and three `.action-btn` (edit, clone, delete); `app-empty-state` already
  used for empty and no-match; `app-loader` already used. Stylesheet literals: `menu-library-list.component.scss`
  (rgba at `:166,217`, font sizes `:62,119,182,193,207`, a dead `select {}` block `:57-75`, width `75rem` `:16`).
- `app-row-actions-menu` (`src/app/shared/row-actions-menu/`) is the shared row menu used by the recipe book.
- `trash.page.html`: `app-page-header` + `.btn-refresh` (`:3,12`); per type `section.trash-section` (`trash.page.scss:45`,
  re-declares the glass surface); `ul.trash-list > li.trash-item` (`:35-59`); `.trash-empty` (`:33`) and an error `<p>`
  (`:11`); history overlay `.history-overlay` → `app-version-history-panel` (`:65-76`, `historyFor_` signal,
  `trash.page.ts:44,108,112`). Keys that exist: `trash` "אשפה", `trash_empty` "אין פריטים באשפה", `refresh` "רענן",
  `history` "היסטוריה", `close` "סגור". `trash.page` has no spec.
- `app-modal-shell` inputs: `size` (`'sm' | 'md' | 'fluid'`), `titleKey`, `dismissible`, `sheet`; output `dismissed`
  (`src/app/shared/modal-shell/modal-shell.component.ts:57-85`).
- From 703 (merged first): `.c-chip--tag` tones, `.c-icon-btn`, `.c-list-row--link`, `.c-row-link`,
  `app-empty-state [compact]`, `scripts/lib/style-guard.mjs` (`styleFindings`).

## Goals & Success Criteria
**Primary:** the menu library and the trash look and behave like the other list pages: shared header with count and
search, filters in the side panel, one single-line row per item, shared empty state and popup.

- [auto] `pnpm run test:scripts` passes, including the new `scripts/test/style-704.test.mjs`: `styleFindings` on every `.html` and `.scss` under `src/app/pages/menu-library/components/menu-library-list/` and `src/app/pages/trash/` returns `[]`; both templates contain `<app-list-shell`; neither contains `event-card`, `filters-bar`, `trash-item`, `history-overlay`, `btn-refresh`, `action-btn`.
- [auto] `pnpm run test:ci` passes, including the updated `src/app/pages/menu-library/components/menu-library-list/menu-library-list.component.spec.ts` (with three events the list renders three `.c-list-row`; a stage filter set to "closed" leaves only the closed event; a search with no match renders `app-empty-state`; the row menu's delete calls the existing delete path) and the new `src/app/pages/trash/trash.page.spec.ts` (two deleted recipes render two `.c-list-row`; an empty trash renders one `app-empty-state` with `trash_empty`; pressing history opens `app-modal-shell` and Escape closes it).
- [auto] `pnpm run build` passes; `pnpm run lint` exits 0; `pnpm run lint:icons` exits 0; `pnpm run lint:reuse` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] any list page on a phone and on a desktop · look at the rows · the page header matches the other list pages and every row stays on one line (`/menu-library` and `/trash`, next to `/recipe-book`; default `app-list-container`).
- [human] the page with the delete button · press delete, then cancel · a confirmation appears and nothing is removed (`/menu-library`, row menu → delete; default `confirm-destructive-action`).
- [human] `/trash` with a deleted recipe: press "היסטוריה" on its row — a popup opens over the page, Escape closes it, and the trash list is unchanged behind it.

- [human] the list's page with no items · open the page · a message says the list is empty (`/trash` with nothing deleted: "אין פריטים באשפה"; default `empty-state-on-list`)
- [human] the screen's page with the data request failing · open the page · a readable error with a retry appears, not a blank page (`/trash` with the server stopped: the trash load error and the "רענן" button; default `loading-and-error-states`)

## Execution Mode
- Parallel: yes — after 703; shares no file with 705–717.
- Concurrent plans: any of 704–717 not in this plan's Depends-on line or depending on it (no two of 704–717 share a file)
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/menu-library/components/menu-library-list/**
src/app/pages/menu-library/components/menu-library-list/menu-library-list.component.spec.ts
src/app/pages/trash/**
src/app/pages/trash/trash.page.spec.ts
scripts/test/style-704.test.mjs
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves — templates and stylesheets of two list pages move onto shared UI pieces; the same services, reads, writes (restore, dispose, delete, clone) and confirmations run as before.

## Reuse Check

- Menu library and trash lists — family: list-page — rung: 1 — why: `app-list-shell` (table layout) with `.c-list-row` / `.c-list-body-cell` / `.c-grid-header-cell`, as the clients list does.
- Menu library filters — family: list-logic — rung: 1 — why: the same five `app-custom-select` moved into `shell-filters` inside `.c-filter-section` blocks; state signals unchanged.
- Row actions — family: list-page — rung: 1 — why: `app-row-actions-menu` for edit / clone / delete (three actions, per the inspiration rule "secondary actions in a menu"); trash rows keep two visible `.c-btn-ghost--sm` buttons (restore, delete forever) and one `.c-icon-btn` (history).
- Stage / cost / sale / guests labels — family: chip — rung: 1 — why: `.c-chip c-chip--tag c-chip--sm` with tones teal (active stage, sale), amber (cost warning), red (lost), none (guests, legacy).
- Empty and error texts — family: empty-state — rung: 1 — why: `app-empty-state`.
- History popup — family: modal-shell — rung: 1 — why: `app-modal-shell size="md"` around `app-version-history-panel`.
- none new — no component, util, pipe, service or `.c-*` class is created.

## Defaults

- app-list-container — applies — how: `app-list-shell` with `app-page-header` (inside the shell), one `.c-list-row` per event / deleted item
- empty-state-on-list — applies — how: `app-empty-state` for an empty library, no match, an empty trash type and an empty trash
- loading-and-error-states — applies — how: `app-loader` while loading (already present in the library; the trash keeps its loader) and `app-empty-state icon="alert-triangle"` with the existing error key plus the "רענן" button as retry
- confirm-destructive-action — applies — how: the existing `ConfirmModalService` calls of delete and delete-forever are kept unchanged
- one-breakpoint-set — applies — how: `$break-phone-max` / `$break-tablet-min` only

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef, I want the event menus listed the same way as my recipes, so that I find an event by name and stage without learning a second screen.
- As a chef, I want the trash to be one clear list I can search, so that I can restore what I deleted by mistake quickly.

## Functional Requirements

### Must Have (P0)

**Menu library** (`menu-library-list.component.*`)
- [ ] The component's root is `app-list-shell` (table layout). `shell-title` = `menu_library`; `shell-search` = the
  existing search box (same signal, Escape and clear handlers); `shell-actions` = the two existing buttons ("פנייה
  חדשה" as `c-btn-ghost`, "אירוע חדש" as `c-btn-primary`); `resultCount` = the filtered count, `resultTotal` = all
  events; the panel open state uses the same panel-state helper the clients list uses.
- [ ] `shell-filters`: one `.c-filter-section` per existing filter (stage, event type, serving style, date, sort with
  its order button) holding the same `app-custom-select` / `app-date-field`; `shell-filter-clear` shows a
  `.c-filter-clear` button when any filter differs from its default and resets all of them. Filter, sort and search
  logic and their signals do not change.
- [ ] Columns (desktop `gridTemplate`): name (event name in a `.c-row-link` + the date under it in `--fs-xs` muted) ·
  stage · food cost % · sale price · guests · actions. Phone `mobileGridTemplate`: name · stage · actions. Each event is
  one `.c-list-row.c-list-row--link`; pressing the row opens the event as the card did; the actions cell holds
  `app-row-actions-menu` with edit, clone and delete (same handlers).
- [ ] Every `.tag` becomes `c-chip c-chip--tag c-chip--sm` with the tone mapping above; the `.events-list`,
  `.event-card`, `.filters-bar`, `.tag*`, `.action-btn*`, `.sort-order-btn` rules and the dead `select {}` block are
  deleted; what remains in the stylesheet uses tokens only.
- [ ] Empty library → `app-empty-state` with its existing key and CTA; no match → `app-empty-state icon="search"`
  with its existing key and no CTA.

**Trash** (`trash.page.*`)
- [ ] The page root is `app-list-shell` (table layout). `shell-title` = `trash`; `shell-search` filters items by name
  (a new `query_` signal, matched with `normalizeHebrew` from `src/app/core/utils/recipe-match.util.ts`); `shell-actions`
  = the "רענן" button as `c-btn-ghost`; `shell-filters` = one `c-chip c-chip--toggle` radio group of the entity types
  that have items plus "הכל" (all), default all.
- [ ] Columns: name · type (`c-chip--tag c-chip--sm`) · deleted at (`--fs-sm` muted, same date format) · actions
  (restore `c-btn-ghost--sm`, delete forever `c-btn-ghost--sm` with danger text colour token, history `c-icon-btn`
  16). Handlers unchanged.
- [ ] History: `@if (historyFor_(); as h)` renders `app-modal-shell size="md" titleKey="history"
  (dismissed)="closeHistory()"` around the same `app-version-history-panel`.
- [ ] Empty trash → `app-empty-state icon="trash-2" messageKey="trash_empty"`; a type filter with no item → the same;
  load error → `app-empty-state icon="alert-triangle"` with the existing error key.
- [ ] The `.trash-page`, `.trash-section`, `.trash-list`, `.trash-item`, `.btn-*`, `.history-overlay*` rules are
  deleted.

### Should Have (P1)
- [ ] The trash type filter shows each type's count as `.c-chip__count`.

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL, logical properties only. Icons: 16 in rows and chips, 18 in header buttons (rule from 703). Icons used
  (registered): `search`, `plus`, `phone-incoming`, `rotate-ccw`, `trash-2`, `history`, `alert-triangle`,
  `refresh-cw`. If one is not registered in `src/app/app.config.ts`, use a registered one of the same meaning
  (`pnpm run lint:icons` decides) — never edit `app.config.ts` in this plan.
- No new dictionary key: "הכל" is the existing key `all` (`public/assets/data/dictionary.json:599`); every other text
  keeps its current key.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Put the event-menu list on the shared list page with one line per event and the filters in the side panel — src/app/pages/menu-library/components/menu-library-list/menu-library-list.component.html, .ts, .scss
- [ ] A2: Prove the menu list keeps its rows, filters, search and row menu — src/app/pages/menu-library/components/menu-library-list/menu-library-list.component.spec.ts
- [ ] A3: Turn the trash into one searchable list with type filters, shared buttons and a real popup for history — src/app/pages/trash/trash.page.html, .ts, .scss
- [ ] A4: Prove the trash rows, empty state and history popup — src/app/pages/trash/trash.page.spec.ts
- [ ] A5: Lock both pages on the shared pieces and tokens with the style guard — scripts/test/style-704.test.mjs
## Technical Considerations
- The style test `scripts/test/style-704.test.mjs` exports `FILES` (the checked paths) and `ALLOW` (its allow entries, `[]` when none), so plan 718 re-checks the whole run without editing it.
- Dependencies: 703 (engines and the guard), `app-list-shell`, `app-row-actions-menu`, `app-modal-shell`,
  `app-empty-state`, `normalizeHebrew`.
- New files: `src/app/pages/trash/trash.page.spec.ts`, `scripts/test/style-704.test.mjs`.
- Model changes: none. Backend / API: none. Auth and validation: none (row actions keep their permission checks).
  Security surface: none. Data / migration: none.
- Project checks: the `log-query` item; Hebrew through `translatePipe`; no dictionary or `app.config.ts` change; no
  `src/styles.scss` change. Components follow `.claude/skills/angularComponentStructure/SKILL.md`, stylesheets
  `.claude/skills/cssLayer/SKILL.md`.
- Traps: `.c-list-row` is `display: contents` — the row click goes on each cell or on a link in the name cell, as the
  clients list does; a modal projected into the rows must use the shell's `shell-modal` slot (fixed positioning,
  `list-shell.component.html` comment, plan 362); the trash type filter must not reset on refresh. The trash is also
  rendered as the dashboard's `?tab=trash` (`dashboard.page.html`); that host keeps a 1.5rem padding until plan 709
  gives the trash tab the unpadded list host the venues tab has — check both `/trash` and `/dashboard?tab=trash`.

## Out of Scope
- The menu-intelligence editor, its dialogs and the export sheet (plans 713, 717).
- New filters, bulk actions in the trash, a cards layout.
- `src/app/pages/venues/**` (plan 698).

## Critical Questions
- none

## Execution Notes
- behaviour: the trash becomes one list with a type filter instead of one card per type — the shared list page has one table; the filter keeps the "by type" view one tap away.
- behaviour: the trash gains a search box (the shared header always has one); it filters by name only.
- behaviour: menu-library edit / clone / delete move into the row menu (three actions → menu, Polaris rule); pressing the row still opens the event.
- behaviour: the phone shows name, stage and actions; cost, sale and guests show from the tablet width up, like the other lists hide secondary columns.
