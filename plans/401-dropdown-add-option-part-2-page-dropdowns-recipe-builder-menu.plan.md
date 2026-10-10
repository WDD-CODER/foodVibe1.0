# Plan 401 — Dropdown add option, part 2: page dropdowns in recipe builder and menu

Status: draft
Track: code — here (not design)
Snapshot: 0ca1ac799a023b3baf09e4382a916b3ffa6f9de9

## Problem Statement
Plan 400 adds a shared add-option helper (`core/utils/add-option.util.ts` + `shared/add-option-row`)
and applies the add-option rule to the shared selects. These page-level dropdowns build their
own add option and still break the rule (from a search for `c-add-new-icon`, 2026-10-10):

- `recipe-builder/components/ingredient-search` — bare `add` (~html L55–58).
- `recipe-builder/components/preparation-search` — bare `add` (~html L42–45).
- `recipe-builder.page.html` logistics tool picker — bare `add` button (~L318–322) plus a
  `logistics-tool-add-new` option (~L340) → possibly two add entries.
- `menu-intelligence.page.html` event-type dropdown (~L69) — bare `add`, and
  `getFilteredEventTypes()` filters by the raw key (`filterOptionsByStartsWith(list, raw, (t) => t)`,
  `menu-intelligence.page.ts` ~L476).
- The 7 `filterOptionsByStartsWith(` calls — each must filter by the label shown on screen
  (translated key), not the stored key. Recipes/equipment filter by `nameHebrew` (fine); the
  event-type one does not; verify the rest.

The rule (same as plan 400): one add option; label `הוסף "<typed>"` for a new typed name, else
`הוסף <thing> חדש/ה` that opens the modal, never bare "הוסף"; search by the Hebrew label; after
adding select the stored key, nothing on cancel; and **rule 5 keyboard** — works like the menu
dropdowns: first option highlighted on open/typing, ↓/↑ stop at the ends (no wrap), highlight
scrolls into view, focus stays in the search input, Enter picks (add option last), Escape
closes, Tab / Shift+Tab close and move to the next / previous field.
Reference: the menu section-category and dish dropdowns from plan 398 (PR #378, merged), on
plan 400's shared `core/utils/keyed-picker-search.util.ts`.

**Keyboard today (2026-10-10), vs rule 5:**
- `ingredient-search` — starts with nothing highlighted (Enter doesn't pick the top match);
  wraps around.
- `preparation-search` — no arrow keys at all, only Enter / Escape.
- Logistics tool picker (`recipe-logistics-picker.service.ts`) — starts with nothing
  highlighted; no Tab hand-off.
- Menu event type — already close to rule 5, but its own copy of the logic
  (`onEventTypeSearchKeydown`), not `KeyedPickerSearch`.
- `menu-picker-search.service.ts` — still holds the original `KeyedPickerSearch` (plan 400
  copied it to `core/utils`); delete it here.

## Goals & Success Criteria
- Primary: every page-level dropdown with add uses plan 400's helpers (add option + keyboard)
  and follows the rule; one `KeyedPickerSearch` left in the codebase.
- Success:
  - [auto] `ng build` passes.
  - [auto] `ng test` passes.
  - [auto] `rg -n "class KeyedPickerSearch" src/app` prints exactly one hit (`core/utils/keyed-picker-search.util.ts`).
  - [auto] `rg -n "'add' \| translatePipe" src/app/pages` prints no add-option rows (report any remaining hit with why it isn't an add option).
  - [human] Recipe builder ingredient search: new name → `הוסף "<typed>"`; empty → the generic "add new" label; added item selected; cancel selects nothing.
  - [human] Recipe builder preparation search: same.
  - [human] Recipe builder logistics: one add option for a new tool, labelled per the rule; added tool lands selected with the current quantity.
  - [human] Menu event type: type the Hebrew name of an existing type → it is found (not offered as new); new name → `הוסף "<typed>"`, adds and selects the stored key.
  - [human] Keyboard, in each of ingredient search, preparation search, logistics tool and menu event type: open → first option highlighted; ↓ to the bottom stops on the add option (no jump to top), ↑ stops at the top; a long list scrolls with the highlight; the cursor stays in the search box; Enter picks (on the add option it adds); Esc closes; Tab goes to the next field, Shift+Tab to the previous.
  - [human] Menu section category and dish search still behave as before (regression after the move).

## Execution Mode
- Parallel: no
- Run after: plan 400 merged (helper), PR #378 / plan 398 merged (menu-intelligence files), plan 397 merged (recipe-builder page + logistics service).
- Concurrent plans: none touching `src/app/pages/recipe-builder/**` or `src/app/pages/menu-intelligence/**`
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/recipe-builder/components/ingredient-search/**
src/app/pages/recipe-builder/components/preparation-search/**
src/app/pages/recipe-builder/recipe-builder.page.ts
src/app/pages/recipe-builder/recipe-builder.page.html
src/app/pages/recipe-builder/services/**
src/app/pages/menu-intelligence/menu-intelligence.page.ts
src/app/pages/menu-intelligence/menu-intelligence.page.html
src/app/pages/menu-intelligence/services/**
src/app/pages/menu-intelligence/components/menu-dish-row/**
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-5: preserves — adding still goes through the existing registry/`TaxonomyStore` paths and modals; only the label and the selected stored key change.
- INV-6: preserves — the `*-ai-flow.service.ts` files in `services/` are not touched; no AI call is added or moved.
- INV-none: preserves — client-side UI behavior; no write routes or schemas change.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef, I want every "add" in the recipe builder and the menu to look and behave the same:
  one clear option that says what it adds, and what I added selected afterwards.

## Functional Requirements

### Must Have (P0)
- [ ] Ingredient search, preparation search, logistics tool picker, menu event type: one add
      option via plan 400's helper + `add-option-row`, last in list and keyboard order.
- [ ] Keyboard (rule 5) through plan 400's `KeyedPickerSearch` + `scrollHighlightIntoView` in
      ingredient search, preparation search (adds arrow navigation), logistics tool picker and
      menu event type; remove each one's hand-rolled arrow/Enter/Escape code. Tab targets: the
      page's next/previous field, as the menu's `onTab` does.
- [ ] `MenuPickerSearchService` uses `KeyedPickerSearch` from `core/utils`; delete the local class
      (its keyboard spec cases already live in plan 400's spec — keep only service-level cases).
- [ ] Event-type filter matches the translated label, not the raw key; exact-match check uses
      the translated label too.
- [ ] Each of the 7 `filterOptionsByStartsWith(` calls checked: filters by the on-screen label
      (fix any that filter by a raw key). List the 7 with verdicts in session-state.
- [ ] After add: select the stored key (resolve from the registry/data after the add), nothing
      on cancel; never write the raw typed text into the field.
- [ ] `add_new_<thing>` keys for ingredient / preparation / event type appended to
      `dictionary.json` if missing (`add_new_tool` exists).
- [ ] Code style per hard rules; class structure per `.claude/skills/angularComponentStructure/SKILL.md`.

### Should Have (P1)
- [ ] Menu section-category dropdown (plan 398) moved onto the shared helper too, so there is one implementation.

### Nice to Have (P2)
- none

## UI/UX Notes
- Visible change: add-option text per the rule; logistics shows one add entry. Icons/styles stay.

## Atomic Sub-tasks
- [ ] A1: Re-check the audit list on current main (after 397/398/400 merged); list the 7 `filterOptionsByStartsWith(` calls with verdicts — session-state
- [ ] A2: Menu: `MenuPickerSearchService` onto `core/utils/keyed-picker-search.util.ts`; delete the local `KeyedPickerSearch`
- [ ] A3: `ingredient-search` component onto the helpers (add option + keyboard rule 5)
- [ ] A4: `preparation-search` component onto the helpers (add option + keyboard rule 5 — adds arrows)
- [ ] A5: Logistics tool picker (`recipe-builder.page.html` + logistics picker service) — one add option; keyboard rule 5
- [ ] A6: Menu event type (`menu-intelligence.page.ts/.html`) — label, filter by translated label, stored-key select; keyboard via `KeyedPickerSearch`
- [ ] A7: Fix any raw-key `filterOptionsByStartsWith(` callers from A1; move the section-category dropdown onto the helper (P1)
- [ ] A8: Append missing `add_new_<thing>` keys to `dictionary.json`
- [ ] A9: `ng build` + `ng test` green, `rg` checks from Success; hand the Human the click list (incl. keyboard check per dropdown + menu regression)

## Technical Considerations
- Dependencies: plan 400's `add-option.util.ts`, `keyed-picker-search.util.ts` and
  `shared/add-option-row`; `MenuPickerSearchService` (plan 398); plan 397's logistics picker service; `KeyResolutionService`.
- Ingredient/preparation adds create products/recipes, not registry terms — "stored key" there
  is the new record's id/name as saved; resolve it from the add flow's result.

## Out of Scope
- Shared selects (plan 400), convention doc (plan 402).
- Changing the add modals or how records/terms are stored.

## Critical Questions
- none
