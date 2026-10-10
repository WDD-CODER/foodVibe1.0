# Plan 400 — Dropdown add option, part 1: shared helper and the shared selects

Status: draft
Track: code — here (not design)
Snapshot: 0ca1ac799a023b3baf09e4382a916b3ffa6f9de9

## Problem Statement
Plan 398 (PR #378, Human-validated 2026-10-10) fixed the "add" option in the menu
section-category dropdown. The Human wants that rule everywhere a dropdown offers "add", and
for every new dropdown. Today the shared selects get it wrong:

- `shared/custom-select` — one add option labelled with the bare word `add` ("הוסף")
  (`custom-select.component.html` ~L102–117, `addNewOption_`).
- `shared/custom-multi-select` — **two** add buttons: the `addNewValue()` option (~L116–128)
  and a separate `custom-select-option--dynamic-add` (~L139–145), both bare `add`.
- `shared/chip-search-dropdown` — bare `add` (~L50–61).

**The rule** (from the 398 brief):
1. One add option only — never two "הוסף" buttons.
2. Label: typed text that isn't an existing option → `הוסף "<typed>"` (adds it directly).
   Nothing typed, or an exact match → `הוסף <thing> חדש/ה` (e.g. `add_new_category`), which
   opens the add modal. Never the bare word "הוסף".
3. Search matches the Hebrew label shown on screen (translated key), not the stored key — keys
   are often English via `KeyResolutionService`.
4. After adding, select the key that was actually stored (may differ from the typed text);
   select nothing if the add was cancelled. Never write the raw typed text into the field.
5. Keyboard — every dropdown with a search box works like the menu dropdowns (plan 398,
   `KeyedPickerSearch`), add option or not:
   a. On open and on every keystroke the first option is highlighted, so Enter picks the top match.
   b. ↓/↑ move the highlight and stop at the ends (no wrap-around).
   c. The highlighted row scrolls into view.
   d. Focus stays in the search input the whole time (no roving focus into the list items;
      use `aria-activedescendant` so screen readers follow the highlight).
   e. Enter picks the highlighted option; the add option is last, so Enter on it runs the add.
   f. Escape closes the list (focus stays on the field).
   g. Tab / Shift+Tab close the list and move to the next / previous field.
   (`custom-multi-select` keeps Space = toggle, like the dish search's `selectOnSpace`.)

**Reference implementation** (plan 398, merged to `main`):
`menu-intelligence.page.ts` `getNewSectionCategoryName` / `findSectionCategoryKey` /
`addAndSelectSectionCategory` (~L946–1014); the section-search block in
`menu-intelligence.page.html`; `services/menu-picker-search.service.ts` (`KeyedPickerSearch` —
keyboard) and `onSectionSearchKeydown` / `onDishSearchKeydown` / `scrollDropdownHighlightIntoView`
in `menu-intelligence.page.ts` (how a page wires it).

**Keyboard today (2026-10-10), vs rule 5:**
- `custom-select` — no scroll-into-view (c); Tab not handled (g); Escape blurs the field (f).
- `custom-multi-select` — no scroll-into-view (c); Tab only closes (g); Enter at index -1 runs
  the dynamic add (goes away with the second add button).
- `chip-search-dropdown` — focus moves into the list items (d); wraps around (b); ↑ from the
  input jumps to the last option (a/b).

## Goals & Success Criteria
- Primary: one shared helper (+ one small presentational add-option row) implements rules 1–4,
  and the menu's `KeyedPickerSearch` moves to `core/utils` as the one shared keyboard helper (rule 5);
  `custom-select`, `custom-multi-select` and `chip-search-dropdown` use it, so any dropdown
  built on them gets the rule for free.
- Success:
  - [auto] `ng build` passes.
  - [auto] `ng test` passes, including new specs for the helper (label choice, exact-match by translated label, stored-key resolution, cancel → null).
  - [auto] `ng test` includes a spec for the shared keyboard helper (first option highlighted, stop at ends, Enter picks clamped index, Escape/Tab callbacks, typing resets to 0).
  - [auto] `rg -n "focusItem" src/app/shared/chip-search-dropdown` prints nothing (no roving focus).
  - [auto] `rg -n "'add' \| translatePipe" src/app/shared/custom-select src/app/shared/custom-multi-select src/app/shared/chip-search-dropdown` prints nothing.
  - [human] In a form using `custom-select` with add (A1 lists them): typing a new name shows `הוסף "<typed>"`, Enter adds and selects the stored item; empty search shows `הוסף <thing> חדש/ה` and opens the modal; cancelling the modal selects nothing.
  - [human] `custom-multi-select` with add: only one add option; same label/select behavior.
  - [human] `chip-search-dropdown` with add: same; arrows reach the add option last, Enter runs it.
  - [human] Keyboard, in each of the three shared selects (a form with each — A1 lists them): open → first option highlighted; ↓ to the bottom stops there (no jump to top), ↑ to the top stops there; a long list scrolls with the highlight; the cursor stays in the search box; Enter picks; Esc closes; Tab goes to the next field, Shift+Tab to the previous.
  - [human] Searching a term whose key is English (e.g. a category added in Hebrew) finds it by its Hebrew label.

## Execution Mode
- Parallel: yes (shared/ only; doesn't touch the page files of 397/398/399)
- Concurrent plans: 397, 399
- Isolated DB: no
- Followed by: plan 401 (page dropdowns) and plan 402 (convention doc) — both build on this helper.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/utils/add-option.util.ts
src/app/core/utils/add-option.util.spec.ts
src/app/core/utils/keyed-picker-search.util.ts
src/app/core/utils/keyed-picker-search.util.spec.ts
src/app/shared/add-option-row/**
src/app/shared/custom-select/**
src/app/shared/custom-multi-select/**
src/app/shared/chip-search-dropdown/**
src/app/core/utils/dedupe-select-options.util.ts
src/app/core/utils/dedupe-select-options.util.spec.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry. Callers of the shared selects that need a
new `addNewLabelKey`-style input passed are the expected escalations (A1 lists them).

## Architecture Impact

- INV-5: preserves — adding a term still goes through the existing registry/`TaxonomyStore` paths and modals; the helper only chooses the label and which stored key to select.
- INV-none: preserves — client-side UI behavior; no write routes, schemas or AI calls change.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef, when a dropdown offers to add, I want one clear option that says what it will add,
  and the thing I added selected afterwards, so I never get a raw key or a duplicate entry.

## Functional Requirements

### Must Have (P0)
- [ ] `add-option.util.ts`: pure functions —
      `findOptionByLabel(typed, options, labelFn)` (exact match on the trimmed, translated label),
      `addOptionLabel(typed, options, labelFn, genericKey)` → `{ kind: 'typed', text }` or `{ kind: 'generic', key }`,
      `resolveAddedKey(beforeKeys, afterKeys, typed, labelFn)` → stored key or `null` (cancel / nothing new).
- [ ] `core/utils/keyed-picker-search.util.ts`: copy `KeyedPickerSearch` + `PickerKeydownOptions`
      from `menu-picker-search.service.ts` here unchanged in behavior (rule 5a–c, e–g), plus a
      `scrollHighlightIntoView(container: Element | null)` helper (`.highlighted` →
      `scrollIntoView({ block: 'nearest' })`). Spec ports the menu spec's keyboard cases.
      Leave the menu file alone — plan 401 points it here and deletes its copy.
- [ ] `shared/add-option-row` presentational component: the `c-add-new-icon` + label row, takes
      the `addOptionLabel` result (`input()` only), renders `הוסף "<typed>"` or the generic key
      through `translatePipe`.
- [ ] `custom-select`, `custom-multi-select`, `chip-search-dropdown`: one add option, last in the
      list and in keyboard order; label per rule 2; filter by translated label (rule 3); after
      add select the resolved stored key, nothing on cancel (rule 4). Remove multi-select's second
      (dynamic) add button.
- [ ] `custom-select`, `custom-multi-select`, `chip-search-dropdown`: keyboard through the shared
      helper (rule 5) — first option highlighted on open, scroll-into-view, focus stays in the
      input with `aria-activedescendant`, Tab/Shift+Tab close the list and let the browser's
      default Tab move focus (the component can't know the next field, so no `preventDefault`).
      Remove chip-search's `focusItem` roving focus and wrap-around.
- [ ] Each shared select takes the generic label key as an input (e.g. `addNewLabelKey`), default
      a neutral existing key — never bare `add`.
- [ ] Missing `add_new_<thing>` keys for the callers found in A1 are appended to
      `dictionary.json` (append-only; existing: `add_new_category`, `add_new_unit`,
      `add_new_allergen`, `add_new_label`, `add_new_tool`).
- [ ] Code style per hard rules (`inject()`, `input()`/`output()`, signals, no `any`, single
      quotes, no semicolons); class structure per `.claude/skills/angularComponentStructure/SKILL.md`.

### Should Have (P1)
- [ ] A short note in session-state listing every dropdown in the app that offers add and
      whether it is covered by this plan (shared select) or plan 401 (page-level dropdown).

### Nice to Have (P2)
- none

## UI/UX Notes
- Visible change: the add option's text (rule 2) and, in multi-select, one add button instead
  of two. Icon and row styling stay.
- Hebrew labels only through `translatePipe` + `dictionary.json`.

## Atomic Sub-tasks
- [ ] A1: Audit callers of `custom-select` / `custom-multi-select` / `chip-search-dropdown` that enable add; list each with its "thing" and the `add_new_<thing>` key it needs (session-state) — `src/app/**/*.html`
- [ ] A2: `src/app/core/utils/add-option.util.ts` + spec (rules 1–4)
- [ ] A3: `src/app/core/utils/keyed-picker-search.util.ts` + spec — `KeyedPickerSearch` copied from the menu service (rule 5) + scroll helper
- [ ] A4: `src/app/shared/add-option-row/` component
- [ ] A5: Apply to `shared/custom-select` (label, filter by label, stored-key select; keyboard via A3)
- [ ] A6: Apply to `shared/custom-multi-select`; remove the second (dynamic) add button; keyboard via A3 (Space toggles)
- [ ] A7: Apply to `shared/chip-search-dropdown`; keyboard via A3 (focus stays in input, no wrap)
- [ ] A8: Callers: pass the right `add_new_<thing>` key (escalate each path via `approved:`); append missing keys to `dictionary.json`
- [ ] A9: `ng build` + `ng test` green, `rg` checks from Success empty; hand the Human the click list (incl. keyboard check per select)

## Technical Considerations
- Dependencies: `TranslationService` / `translatePipe`, `KeyResolutionService` (keys may be
  English), `filterOptionsByStartsWith`, `dedupe-select-options.util.ts` (already filters by
  translated label — reuse, don't duplicate).
- Keyboard: `KeyedPickerSearch` is copied here (menu keeps its own until plan 401 deletes it), so
  this plan stays parallel-safe with anything touching `pages/menu-intelligence/**`.
- Keep each shared select's public API backward compatible where possible; new inputs get safe
  defaults so callers outside A1's list keep working.
- "Stored key" comes from the registry after the add resolves (compare before/after sets, as
  `addAndSelectSectionCategory` does), not from the typed text.

## Out of Scope
- Page-level dropdowns (recipe-builder ingredient/preparation search, logistics tool, menu
  event type) — plan 401.
- The written convention + trigger line — plan 402.
- Changing how a term is stored or the add modals themselves.

## Critical Questions
- none
