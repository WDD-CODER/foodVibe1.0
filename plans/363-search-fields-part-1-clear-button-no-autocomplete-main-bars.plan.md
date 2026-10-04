# Plan 363 — Search fields, part 1: animated clear (X) button and no browser suggestions on the 8 main search bars

Status: draft
Snapshot: b776163f43fd1db42a5e0501b3a0e5c30b0bded1

## Problem Statement

No search field in the app has a one-tap clear button, and none of them turn off browser autocomplete. So on mobile, Chrome's history suggestions sit on top of the field and our results. There's no shared search component: each site hand-writes `.c-input-wrapper` (`src/styles.scss` ~L403) with a search icon and an input bound to a signal.

The 8 main search bars:

| # | File | Bound to |
| --- | --- | --- |
| 1 | `pages/recipe-book/components/recipe-book-list/recipe-book-list.component.html` ~L17-25 | `searchQuery_` |
| 2 | `pages/inventory/components/inventory-product-list/inventory-product-list.component.html` ~L14-22 | `searchQuery_` |
| 3 | `pages/suppliers/components/supplier-list/supplier-list.component.html` ~L13-21 | `searchQuery_` |
| 4 | `pages/equipment/components/equipment-list/equipment-list.component.html` ~L15-23 | `searchQuery_` |
| 5 | `pages/menu-library/components/menu-library-list/menu-library-list.component.html` ~L5-12 | `searchQuery_` (ngModel) |
| 6 | `pages/venues/components/venue-list/venue-list.component.html` ~L18-26 | `searchQuery_` |
| 7 | `pages/recipe-builder/components/ingredient-search/ingredient-search.component.html` L2-14 | `searchQuery_`, plus `showResults_` / `highlightedIndex_` side effects |
| 8 | `pages/recipe-builder/components/preparation-search/preparation-search.component.html` L2-11 | `searchQuery_` (local `.input-wrapper`, not the engine) |

## Goals & Success Criteria

- Primary: each of the 8 bars shows an X only when it has text. Tapping it clears the text in one tap, keeps focus in the field, and the list or results update as if the user had deleted the text.
- Primary: the X animates in and out (fade + scale, ~150ms); with `prefers-reduced-motion` it appears instantly.
- Success: no browser autocomplete suggestions on these 8 fields on mobile.

## Execution Mode

- Parallel: no. It touches all list pages. Run after plan 339 and before plan 352 (the page header moves search into a slot; keep the new markup intact when that happens).
- Concurrent plans: none touching the 8 files above
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/shared/input-clear/**
src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.html
src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.ts
src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.html
src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.ts
src/app/pages/suppliers/components/supplier-list/supplier-list.component.html
src/app/pages/suppliers/components/supplier-list/supplier-list.component.ts
src/app/pages/equipment/components/equipment-list/equipment-list.component.html
src/app/pages/equipment/components/equipment-list/equipment-list.component.ts
src/app/pages/menu-library/components/menu-library-list/**
src/app/pages/venues/components/venue-list/**
src/app/pages/recipe-builder/components/ingredient-search/**
src/app/pages/recipe-builder/components/preparation-search/**
```

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

- As a chef, I want to clear a search with one tap instead of deleting letter by letter.
- As a chef on my phone, I don't want browser suggestions covering the field.

## Functional Requirements

### Must Have (P0)
- [ ] New `InputClearComponent` (`src/app/shared/input-clear/`, selector `app-input-clear`):
  - Input `visible` (boolean); output `clear`.
  - A `button type="button"` with Lucide `x` (16px), `aria-label` from the `clear_search` key.
  - Always rendered (so it can animate out); hidden via a `[class.is-visible]` toggle with `opacity` / `transform: scale(.6) → 1` and `visibility`, ~150ms, and `pointer-events:none` when hidden. Respects `prefers-reduced-motion`.
  - Takes up no space when hidden (absolute at inline-end, or fixed 1.5rem width; pick whichever keeps the input from jumping).
- [ ] Engine addition in `styles.scss` (append): `.c-input-wrapper { position: relative }` and the clear-button slot styles, so every engine wrapper supports it. The local `.input-wrapper` in preparation-search gets the same treatment in its own scss.
- [ ] At each of the 8 sites: place `<app-input-clear [visible]="!!query()" (clear)="onClearSearch()">` after the input. `onClearSearch()` sets the signal to `''` and runs the same side effects as typing (e.g. ingredient-search: `showResults_.set(false)`, `highlightedIndex_.set(-1)`; menu-library: ngModel update; any page that syncs search to URL query params updates them), then refocuses the input via its `#ref`.
- [ ] Every one of the 8 inputs gets `autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"`. If Chrome still offers suggestions on Android, use `autocomplete="new-off"` and note it in the session state.

### Should Have (P1)
- [ ] Escape inside a non-empty field clears it, same as the X. Where Escape already closes a dropdown, Escape-with-text clears first and Escape-again closes.

### Nice to Have (P2)
- None.

## UI/UX Notes

- RTL: the X sits at the inline-end (left), the search icon at the start (right).
- New dictionary key: `clear_search` = "ניקוי חיפוש".
- 44px tap target on phone (padding around the 16px icon).

## Atomic Sub-tasks

- [ ] A1: `InputClearComponent` + spec (hidden when `visible=false`, emits `clear`); engine CSS (`shared/input-clear/**`, `src/styles.scss`).
- [ ] A2: Wire the 4 list pages (recipe-book, inventory, suppliers, equipment).
- [ ] A3: Wire menu-library and venues.
- [ ] A4: Wire ingredient-search and preparation-search, preserving their keyboard and result-panel behavior.
- [ ] A5: Autocomplete attributes on all 8. Build, specs, phone check. Update session-state.

## Technical Considerations

- Dependencies: the 8 host components; `TranslatePipe`.
- New files: `shared/input-clear/input-clear.component.{ts,html,scss,spec.ts}`.
- Model changes: none.
- Signals-only; `input()` / `output()`.

## Out of Scope

- The 7 searches inside dropdown pickers and the autocomplete sweep on other fields (plan 364, part 2).
- Changing search logic.

## Critical Questions

- After clearing:
  a) Keep focus in the field (default)
  b) Blur the field

## Success Criteria

- [auto] `npx ng test --watch=false --include=src/app/shared/input-clear/**/*.spec.ts` → 0 failures.
- [auto] `rg -n "app-input-clear" src/app --glob '*.html'` → 8 matches.
- [auto] `npm run build` → exit 0.
- [human] Inventory search: empty → no X. Type "עגב" → X fades in → tap → text gone, full list back, cursor still in the field → X fades out. Same on recipe book, suppliers, equipment, menu library and venues.
- [human] Recipe builder ingredient search: type → results → X → results close and the field is empty and focused.
- [human] Android Chrome: tapping these fields shows no browser suggestion strip over them.
