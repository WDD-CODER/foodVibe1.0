# Plan 343 — Menu building quick fixes: empty library, guests stepper, event-type and serving-type dropdowns

Status: active
Snapshot: acab8cff39fd0240f67af00439a8bd044c23889e

## Problem Statement

Four small issues in menu building:

1. **Empty menu library looks broken.**
   - `menu-library-list.component.html:~82-87` renders a hand-rolled `div.empty-state` (`menu_empty_library`, icon `book-open`) with no call-to-action.
   - Its `.empty-state` styles (`menu-library-list.component.scss:~134-150`) include a stray `padding-inline-end:72px`, so it sits off-center.
   - `.filters-bar` stays visible with zero menus.
   - The same message appears when filters hide everything, because it checks `filteredEvents_()`, not `events_()`.
2. **Guest count only by typing.** `input#menu-focus-guestCount.guest-chip-input` (`menu-intelligence.page.html:~229-240`) is a bare number input with its spinners hidden (`_paper-ui.scss:~708-731`). `incrementGuests()` / `decrementGuests()` (`menu-intelligence.page.ts:~366-376`) and the `.counter-pill*` styles (`_paper-ui.scss:~106-160`) exist but aren't used.
3. **Event type ("סוג אירוע") search box is broken and misplaced** (`menu-intelligence.page.html:~153-203`).
   - `.event-type-dropdown { overflow:hidden }` (`_paper-ui.scss:~296-308`) clips the absolutely positioned `.c-dropdown` list rendered by `app-scrollable-dropdown`.
   - The `@if/@else` swaps the chip out for the dropdown, so the box anchors to a collapsed wrapper and floats over the title.
4. **Serving type ("סגנון הגשה") dropdown is too long.** `app-custom-select.event-chip-select` (`menu-intelligence.page.html:~205-213`) has no `variant="chip"` and no `[compact]`, and uses `[typeToFilter]="true"` for only 3 options. The trigger and list stretch to full width (`custom-select.component.ts`: `variant`, `compact`, `maxHeight=240`).

## Goals & Success Criteria

- Primary: an empty library shows a centered empty state with a "new menu" button and no filters. A filtered-empty state says "no results".
- Primary: guests change with −/+ buttons (typing still works). The event-type dropdown opens directly under its chip with a visible list. The serving-type dropdown is chip-sized.
- Success: all four work at 360px portrait.

## Execution Mode

- Parallel: yes
- Concurrent plans: none touching `src/app/pages/menu-intelligence/**` or `src/app/pages/menu-library/**`. The checklist and prints plan runs after this one.
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/menu-library/**
src/app/pages/menu-intelligence/menu-intelligence.page.html
src/app/pages/menu-intelligence/menu-intelligence.page.ts
src/app/pages/menu-intelligence/menu-intelligence.page.spec.ts
src/app/pages/menu-intelligence/_paper-ui.scss
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch), then STOP for a go before
touching any milestone.

## User Stories

- As a new user with no menus, I want a clear starting point to create my first menu.
- As a chef, I want to bump the guest count with a tap.
- As a chef, I want event and serving type pickers that open where I tapped and fit their content.

## Functional Requirements

### Must Have (P0)
- [ ] Library:
  - When `events_().length === 0`, render `<app-empty-state messageKey="menu_empty_library" icon="book-open" ctaLabelKey="menu_new_event" (ctaClick)="onCreateNew()">` and hide `.filters-bar`.
  - When `events_().length > 0 && filteredEvents_().length === 0`, show `<app-empty-state messageKey="no_results">` (reuse an existing key if present).
  - Delete the hand-rolled `.empty-state` styles.
- [ ] Guests: wrap the input in `.counter-pill` with `button.counter-pill-btn` − / + calling `decrementGuests()` / `incrementGuests()`, `tabindex="-1"` per `KEYBOARD-FOCUS-REPORT.md` #1. The input stays editable. Minimum 1 is enforced by the existing `quantityIncrement` / `integerOnly`.
- [ ] Event type:
  - Always render `button.event-chip#menu-focus-eventType`, and render `.event-type-dropdown` as a sibling below it when `eventTypeDropdownOpen_()`.
  - Anchor it with `position:absolute; inset-block-start:calc(100% + 4px); inset-inline-start:0`, removing the `left:50%` / `translateX` centering.
  - Remove `overflow:hidden` and make the inner `.c-dropdown` `position:static`, so the search input and list show together.
  - Clamp `max-inline-size: min(18rem, calc(100vw - 2rem))`.
- [ ] Serving type: `variant="chip"`, `[compact]="true"`, remove `[typeToFilter]`, `[maxHeight]="160"`. Add the list width override `inset-inline:auto; min-width:max-content` in `_paper-ui.scss` scoped to `.event-chip-select`.

### Should Have (P1)
- [ ] Delete the dead `_paper-ui.scss` rules for `.meta-trigger`, `.meta-input.menu-name-input` and `.meta-row` (~L778-802): no template uses them.
- [ ] Replace the hard-coded placeholder "שם האירוע..." (`menu-intelligence.page.html:~223`) with a dictionary key `menu_event_name_placeholder`.

### Nice to Have (P2)
- None.

## UI/UX Notes

- Guest stepper buttons ≥44px tap target on phone (`_paper-ui.scss` ~L786 already has the touch rule).
- New dictionary keys: `menu_event_name_placeholder` = "שם האירוע..."; `no_results` only if no equivalent exists.
- RTL: dropdowns align to the chip's inline-start edge.

## Atomic Sub-tasks

- [x] A1: Library empty and no-results states; hide filters when there are no menus (`menu-library-list.component.html/.scss`).
- [x] A2: Guests −/+ stepper (`menu-intelligence.page.html`, `_paper-ui.scss`).
- [x] A3: Event-type dropdown: anchoring, clipping, width clamp (`menu-intelligence.page.html`, `_paper-ui.scss`).
- [x] A4: Serving-type select: chip variant, compact, no filter, max height (`menu-intelligence.page.html`, `_paper-ui.scss`).
- [ ] A5: P1 cleanups. Build and run specs. Check at 360px and 1280px. Update the session-state file.

## Technical Considerations

- Dependencies: `MenuLibraryListComponent`, `EmptyStateComponent`, `MenuIntelligencePage` (`eventTypeDropdownOpen_`, `eventTypeSearch_`, `getFilteredEventTypes`, `incrementGuests`, `decrementGuests`, `servingTypeOptions_`), `CustomSelectComponent`, `ScrollableDropdownComponent`.
- New files: none.
- Model changes: none.

## Out of Scope

- The checklist and prints toolbar (next plan).
- `menu-dish-row` layout.
- Replacing the event-type dropdown with custom-select (keeps the add-new-event-type flow as it is).

## Critical Questions

1. Guest stepper step:
   - a) 1 per tap, hold to repeat via the existing `quantityIncrement` behavior (default)
   - b) 5 per tap

## Success Criteria

- [auto] `npx ng test --watch=false --include=src/app/pages/menu-library/**/*.spec.ts --include=src/app/pages/menu-intelligence/**/*.spec.ts` → 0 failures.
- [auto] `npm run build` → exit 0.
- [human] With no menus: the library shows a centered empty state with a "תפריט חדש" button and no filter bar. With menus and a filter that matches nothing: "no results".
- [human] New menu → guests: − and + change the number; typing still works.
- [human] Tap "סוג אירוע": the search box and list open right under the chip, and the full list is visible and scrollable. Tap "סגנון הגשה": a compact list of 3 options next to the chip. Both work on the phone in portrait.
