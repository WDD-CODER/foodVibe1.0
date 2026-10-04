# Plan 339 — Toggle-chip engine: replace filter checkboxes with chips, compact "clear filters"

Status: draft
Snapshot: acab8cff39fd0240f67af00439a8bd044c23889e

## Problem Statement

Filter panels list options as checkbox rows (`label.c-filter-option` + `input[type=checkbox|radio]`, `src/styles.scss:~1606`). They take space and look dated. Dandan wants chips that change color when selected, used across the app instead of checkboxes.

Venues already has a local version (`.env-filter-pill.active`, `venue-list.component.scss:66-101`), but it still shows the checkbox inside the pill. No shared toggle-chip engine exists:
- `.c-chip` is a static badge.
- `.c-filter-chip` is always-selected and removable.

Separately, "נקה סינון" (`clear_filters`) sits in `.c-filter-section-header` (`styles.scss:1483`, `min-height:1.75rem` + `margin-block-end:.75rem`), which reserves space even when the button is hidden. In venues it's an extra flex item that widens or wraps `.filters-bar`.

## Goals & Success Criteria

- Primary: one global `.c-toggle-chip` engine. All filter options in inventory, recipe-book, suppliers, equipment and venues render as chips: neutral when off, filled when on.
- Primary: the clear-filters button takes no layout space.
- Success: there are no visible checkboxes in any filter panel, and keyboard/screen-reader toggling still works.

## Execution Mode

- Parallel: no. It shares `src/styles.scss` and the list pages with the filter-categories, sticky-table and keyboard plans. Run after the Equipment plan (plan 338).
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

**Scope:**
- `src/app/pages/inventory/components/inventory-product-list/**`
- `src/app/pages/recipe-book/components/recipe-book-list/**`
- `src/app/pages/suppliers/components/supplier-list/**`
- `src/app/pages/equipment/components/equipment-list/**`
- `src/app/pages/venues/components/venue-list/**`
- `src/app/shared/list-shell/**`
- `src/styles.scss`: this plan edits the existing `.c-filter-option`, `.c-filter-section-header` and phone checkbox override (~L1736) rules. That's an approved exception to append-only for those rules.

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the ## Read-Write Scope above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch), then STOP for a go before
touching any milestone.

## User Stories

As a chef, I want filter options as compact chips I tap on and off, so more fit on screen and I can see what's active at a glance.

## Functional Requirements

### Must Have (P0)
- [ ] New engine `.c-toggle-chip` in `styles.scss`:
  - The pill is a label wrapping a visually hidden but focusable input, using `clip-path` / `position:absolute` and not `display:none`.
  - Selected state via `.c-toggle-chip:has(input:checked)`, plus an `.is-on` fallback class.
  - `:focus-visible` ring on the label.
  - Optional `.c-toggle-chip__dot` (label color) and `.c-toggle-chip__count`.
  - Container `.c-toggle-chip-group { display:flex; flex-wrap:wrap; gap }`.
  - Use only existing tokens; selected colors borrow from `.env-filter-pill.active` (`--color-primary`).
- [ ] The phone override `app-root input[type=checkbox]` (~L1736) excludes `.c-toggle-chip input`.
- [ ] Migrate every filter option in the 4 list pages from `label.c-filter-option` to `label.c-toggle-chip`, and `.c-filter-options` to `.c-toggle-chip-group`:
  - inventory: categories, allergens, suppliers, low stock / invalid / incomplete / nutrition toggles
  - recipe-book: types, labels with dot, favorites
  - suppliers: delivery days, linked only
  - equipment: category, and consumable radios as single-choice chips
- [ ] Venues: replace `.env-filter-pill` with `.c-toggle-chip` and delete the local pill styles.
- [ ] Clear filters: add a `[shell-filter-clear]` slot in `list-shell.component.html` next to `h3.panel-heading`, absolutely positioned at the heading's inline-end (heading `position:relative`), so it reserves nothing. Move the 4 list-page buttons into it and delete their `.c-filter-section-header` wrappers. Venues: `.filters-bar { position:relative }`, with the button absolute at inline-end (or inside `.action-bar`).
- [ ] Delete the now-unused `.c-filter-section-header` rule after a grep confirms there are no other users. Keep the `.c-filter-option` / `.c-filter-options` rules: `supplier-form.component.html:38` (out of scope) still uses them until the form-checkboxes plan.

### Should Have (P1)
- [ ] Chip counts (`.c-toggle-chip__count`) stay visible; a zero count renders muted.

### Nice to Have (P2)
- [ ] A subtle check icon inside a selected chip (Lucide `check`, 12px).

## UI/UX Notes

- Chip height about 2rem (≥44px tap target on phone via padding-block), radius full, `--fs-sm`.
- RTL-safe: logical properties only.
- The recipe-book date block (sort buttons, date inputs) stays as it is: these aren't options.
- No new dictionary keys.

## Atomic Sub-tasks

- [ ] A1: Build the `.c-toggle-chip` / `.c-toggle-chip-group` engine and the phone-override exclusion.
- [ ] A2: Add the list-shell `[shell-filter-clear]` slot and positioning.
- [ ] A3: Migrate inventory and recipe-book filters.
- [ ] A4: Migrate suppliers, equipment and venues filters.
- [ ] A5: Delete the dead `.c-filter-section-header` and `.env-filter-pill` styles (grep first). Keep `.c-filter-option` (still used by supplier-form).
- [ ] A6: Build and run specs. Check at 360px, 768px and 1280px. Update the session-state file.

## Technical Considerations

- Dependencies: `ListShellComponent`, the 4 list components, `VenueListComponent`, `filter-category-counts.util.ts` (unchanged, only markup).
- New files: none.
- Model changes: none.
- No spec or e2e test targets `.c-filter-option`, `clear_filters` or `.env-filter-pill` (verified), so the restyle is low-risk.
- Engine classes belong in `src/styles.scss` only (hard rule).

## Out of Scope

- Checkboxes inside forms (supplier-form, equipment-form, product-form, quick-add/edit, label-creation, venue-form, metadata). That's the next "form checkboxes → toggle chips" plan.
- Row-selection checkboxes (`list-row-checkbox`): these stay checkboxes.
- Collapsing filter categories by default (separate plan).

## Critical Questions

- Single-choice filters (equipment "consumable: all/yes/no"):
  a) Three chips, exactly one on (default)
  b) One chip "מתכלה בלבד", on/off

## Success Criteria

- [auto] `rg -n "c-filter-option|env-filter-pill|c-filter-section-header" src/app src/styles.scss` → only supplier-form.component.html matches; keep the .c-filter-option rule until the form-checkboxes plan.
- [auto] `npx ng test --watch=false --include=src/app/pages/**/*-list.component.spec.ts --include=src/app/shared/list-shell/**/*.spec.ts` → 0 failures.
- [auto] `npm run build` → exit 0.
- [human] Inventory, recipe book, suppliers, equipment, venues: filters are chips, and tapping toggles their color and filters the list. Tab plus space works with the keyboard.
- [human] Select a filter → "נקה סינון" appears next to the "סינון" heading without pushing anything down → clear → it disappears with no layout jump.
