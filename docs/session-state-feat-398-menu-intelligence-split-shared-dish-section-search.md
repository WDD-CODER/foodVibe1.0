# Session state — feat/398-menu-intelligence-split-shared-dish-section-search

Plan: `plans/398-menu-intelligence-split-shared-dish-section-search.plan.md` (slot wt-3, fe 4203 / be 3003)

## Done
- New `src/app/pages/menu-intelligence/services/menu-picker-search.service.ts`: `KeyedPickerSearch`
  (keyed query + highlight signals, one keydown handler) and page-scoped `MenuPickerSearchService`
  holding a `dish` and a `section` instance. Spec next to it (12 cases).
- Page delegates both pickers to it; template reads `pickerSearch_.section.*` directly.
- `menu-intelligence.page.ts`: 1398 → 1292 lines. `ng build` ok, `ng test` 475/475.

## A1 — differences found between the two pickers (kept as options, not "fixed")
- Space selects only in dish search → `selectOnSpace: true` for dish.
- Enter with zero options: dish does nothing and lets the key through; section always has ≥1
  option ("add new…"), so the shared rule (no-op when empty) is identical for both.
- Tab hand-off differs per picker → each passes its own `onTab`.
- Section Enter used to no-op on a highlight past the end; the helper clamps it (dish already
  did). Only reachable if the category list shrinks while the dropdown is open with a
  highlight on the last rows — not reachable through the UI's own flows.

## P1 follow-up note (report only — nothing moved)
- Event-type dropdown (`onEventTypeSearchKeydown`, ~45 lines): same pattern, single (unkeyed)
  instance with "add new" as the last option. Worth a small follow-up: a third
  `KeyedPickerSearch` with a fixed key, keeping its own Enter-past-end → focus servingType and
  Tab → servingType via `onSelect`/`onTab`. Low risk, ~35 lines saved.
- Export block (`getCurrentMenuForExport` … `onExportAllTogether`, ~80 lines + 3 fields):
  self-contained, only reads `buildEventFromForm()`, `editingId_`, recipes/products. Clean
  candidate for a `MenuExportFlowService` like the recipe builder's. Worth doing.

## Human review fallout (A6, A7 — Human-validated 2026-10-10)
- A6: renaming a dish — erasing all text keeps the row empty for a fresh name (Escape / click-outside restore).
- A7: section category search matches Hebrew labels; one add option (`הוסף "<typed>"` or `הוסף קטגוריה חדשה`); selects the stored key, nothing on cancel.

## BRIEF → Planner: app-wide "add" option in dropdowns
The Human asked for the A7 rule to be applied to every dropdown that offers "add", and to
become a standing convention for every new dropdown.

**The rule**
1. One add option only — never two identical "הוסף" buttons.
2. Label: typed text that is not an existing option → `הוסף "<typed>"` (adds it directly).
   Nothing typed, or an exact match → `הוסף <thing> חדש/ה` (e.g. `add_new_category`), opens
   the add modal. Never the bare word "הוסף".
3. Search matches the Hebrew label shown on screen (translate the key), not the stored key —
   keys are often English via KeyResolutionService.
4. After adding, select the key actually stored (may differ from the typed text); select
   nothing if the add was cancelled. Never write raw typed text into the field.
5. Keyboard: the add option is the last option; arrows reach it, Enter runs it.

**Reference:** `menu-intelligence.page.ts` — `getNewSectionCategoryName`,
`findSectionCategoryKey`, `addAndSelectSectionCategory`; the section-search block in
`menu-intelligence.page.html`; keyboard helper `services/menu-picker-search.service.ts`.

**Dropdowns to audit** (from a search for `c-add-new-icon`; verify each):
- `src/app/shared/custom-select/custom-select.component.html` — bare `add`
- `src/app/shared/custom-multi-select/custom-multi-select.component.html` — two add buttons (option + dynamic-add)
- `src/app/shared/chip-search-dropdown/chip-search-dropdown.component.html` — bare `add`
- `src/app/pages/recipe-builder/components/ingredient-search/…` — bare `add`
- `src/app/pages/recipe-builder/components/preparation-search/…` — bare `add`
- `src/app/pages/recipe-builder/recipe-builder.page.html` (~L322, logistics tool ~L340) — bare `add`
- `src/app/pages/menu-intelligence/menu-intelligence.page.html` — event-type dropdown (~L69), bare `add`; its search also filters by raw key
- Also check every `filterOptionsByStartsWith(` call (7) that filters translated keys by the raw key.

**Make it a concept, not a one-off**
- Best: one shared helper/component for the add option (label choice, exact-match check,
  label-based filter, select-stored-key) that the shared selects use, so new dropdowns get it
  for free.
- Write the rule into `docs/agent/conventions.md` (dropdowns section) and add a checklist line
  to the plan template / skill triggers: "a new dropdown with add → follow the add-option rule".
- New dictionary keys `add_new_<thing>` may be needed per context (append-only hotspot).
- Proposed split: (1) shared helper + shared selects, (2) page-level dropdowns, (3) convention doc + trigger.

## Ship (2026-10-10)
- A8 (/ship review fallout): Tab out of a dish rename without picking restores the old dish.
- Brain: `docs/brain/gotchas/angular.md` — "Searching taxonomy dropdowns by key misses Hebrew input".
- Next: Planner picks up the add-option brief above as a new plan.
