# Plan 418 — Prefill the typed name in the unit and supplier add windows

Status: active
Track: code — here (not design)
Snapshot: b81cb1f4858b4ae86e97b382cf931bd9ca4445f4

## Problem Statement

Plan 416 rule W says every add from a dropdown opens its window with the typed name already filled in. Units and
suppliers are the two exceptions (416 FR 3 listed them as a known limit). Their dropdowns show the generic add row
and open the window empty, because `UnitRegistryService.openUnitCreator()` and `AddSupplierFlowService.open()` take
no name. A chef who typed "צנצנת" has to type it again in the window.

A second gap sits in the same flows: every unit caller subscribes `unitRegistry.unitAdded$.pipe(take(1))` when it
opens the window. Cancel closes the window but leaves that subscription waiting, so the next unit added anywhere
(another field, another page) is also written into the field the chef cancelled. The brief's "Cancelling selects
nothing" check needs this fixed.

## Goals & Success Criteria

- Primary: every dropdown that adds a unit or a supplier shows `הוסף "<typed>"` and opens its window with the
  typed name filled in; cancelling selects nothing, now and later.
- Success:
  - [auto] `ng build` passes.
  - [auto] `ng test` passes, including new specs:
    - `UnitRegistryService.openUnitCreator('צנצנת')` → the unit-creator window shows `צנצנת` in its name field; with no name → empty;
    - (new spec file `add-supplier-flow.service.spec.ts`) `AddSupplierFlowService.open('ספק חדש')` → `AddItemModalService.open` is called with `initialValue: 'ספק חדש'`;
    - a unit caller that opened the window and then cancelled is not updated when a unit is added afterwards.
  - [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
  - [human] Product form → base unit: type a new unit name → the last row reads `הוסף "<typed>"` → Enter opens the unit window with the name filled in.
  - [human] Product form → supplier: type a new supplier name → `הוסף "<typed>"` → Enter opens the supplier window with the name filled in.
  - [human] Cancelling either window selects nothing; then adding a unit in a different field fills only that field.
  - [human] Recipe builder → ingredient row unit: type a new unit name → `הוסף "<typed>"` → Enter opens the unit window with the name filled in.

## Execution Mode

- Parallel: yes — wt-1 (377 units rename) and wt-2 (417 name length) are active; overlap checked at save time.
- Concurrent plans: 377, 417
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/services/unit-registry.service.ts
src/app/core/services/unit-registry.service.spec.ts
src/app/core/services/add-supplier-flow.service.ts
src/app/core/services/add-supplier-flow.service.spec.ts
src/app/shared/unit-creator/**
src/app/shared/scaling-chip/**
src/app/shared/quick-add-product-modal/quick-add-product-modal.component.ts
src/app/shared/quick-add-product-modal/quick-add-product-modal.component.html
src/app/shared/ai-recipe-modal/ai-draft-editor/ai-draft-editor.component.ts
src/app/shared/ai-recipe-modal/ai-draft-editor/ai-draft-editor.component.html
src/app/pages/inventory/components/product-form/product-form.component.ts
src/app/pages/inventory/components/product-form/product-form.component.html
src/app/pages/inventory/components/product-form/product-form.component.spec.ts
src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.ts
src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.html
src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.ts
src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.html
src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.ts
src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.html
src/app/pages/recipe-builder/recipe-builder.page.ts
src/app/pages/cook-view/cook-view.page.ts
src/app/pages/cook-view/cook-view.page.html
docs/agent/standards-domain.md
docs/brain/patterns/dropdown-add-option.md
```

## Read Scope

Entire repo.

## Escalation Protocol

If a file outside the scope is needed: STOP, tell the Human the file, the change and why; offer `approved: <path>`;
append it to the scope block; retry.

## Architecture Impact

- INV-5: preserves — `unit-registry.service.ts` keeps registering units through `TaxonomyStore`; only the window's
  starting name and the caller subscriptions change.
- INV-6: preserves — the ai-draft-editor files only match the `*ai*` glob; no AI call is added or moved.
- INV-none: preserves — client-side UI only; no write route, schema or AI call changes.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Print one line per commit: `ok` or `conflict: <what>`.
Plans 377 (units rename) and 417 (name length) may have changed `unit-registry.service.ts`, `unit-creator/**` or
`add-item-modal` — re-read them on `origin/main` before A1/A2.

## User Stories

- As a chef, when I type a unit or supplier that doesn't exist yet and press Enter, the window opens with what I
  typed, so I don't type it twice.
- As a chef, when I cancel that window, nothing changes in my form — not now and not after I add a unit somewhere else.

## Functional Requirements

1. **Unit service:** `openUnitCreator(context?: { existingUnitSymbols?: string[]; prefillName?: string })` — keep the
   one context object (callers already pass `existingUnitSymbols`). Store `prefillName` in `unitCreatorContext` and
   expose it read-only (e.g. `creatorPrefillName_ = computed(...)`).
2. **Unit window:** when `isOpen_()` turns true, `UnitCreatorModal` sets `newUnitName_` to the prefill (trimmed) or
   `''`, then focuses the name field as today. Reset on close stays.
3. **Unit cancel:** `UnitRegistryService` gets one helper the callers use instead of their own `unitAdded$.pipe(take(1))`:
   `awaitUnitCreated(): Observable<string>` (or a `Promise<string | null>`) that completes empty when the window
   closes without a save — e.g. a `creatorClosed$` Subject fired in `closeUnitCreator()` plus
   `unitAdded$.pipe(take(1), takeUntil(creatorClosed$))`. Watch the order: `save()` calls `registerUnit` (which emits
   `unitAdded$`) before `closeUnitCreator()`, so a save still delivers. Every caller listed in FR 5 moves to it.
4. **Supplier service:** `AddSupplierFlowService.open(prefillName?: string)` passes
   `initialValue: prefillName?.trim() || undefined` to `addItemModal.open`. Its own success message stays; no
   `notifyItemAdded` (standard rule 8).
5. **Callers** — turn on `[allowTypedAdd]="true"` and pass the typed name, using the existing pattern
   `(addNewChosen)="pendingAddName_.set($event)"` then reading and clearing it in the value-change handler (as in
   `quick-add-product-modal.component.ts:131`):
   - product-form: base unit, purchase unit symbol, purchase uom (`custom-select`, `addNewValue="'NEW_UNIT'"`);
     supplier (`chip-search-dropdown`: `(addNew)="openAddSupplier($event)"`).
   - recipe-ingredients-table unit; recipe-workflow prep unit; quick-add-product base unit; ai-draft-editor yield unit
     and ingredient units; cook-view yield unit and ingredient-edit unit (they rely on the default
     `addNewValue` `__add_unit__`).
   - scaling-chip: `createUnit` emits the typed name (`output<string>()`); recipe-header `onCreateUnit` passes it on.
   - recipe-builder.page `onOpenUnitCreator` and recipe-header's other `openUnitCreator` call: pass a name only where
     the trigger has one; otherwise leave empty.
   - The hand-built add options in cook-view (`label: '+ יחידה חדשה'`, lines ~216/1009/1043) and
     recipe-ingredients-table (~543) render through custom-select's add row, so `allowTypedAdd` shows the typed
     label; keep the sentinel value, and replace the hardcoded Hebrew label with the `add_new_unit` key if it still
     shows anywhere.
6. **Standard:** remove "Units and suppliers" as an exception from rule W in `docs/agent/standards-domain.md`
   (Add-option rule point 7) and from `docs/brain/patterns/dropdown-add-option.md`; add `openUnitCreator({ prefillName })`
   and `AddSupplierFlowService.open(name)` to the list of prefill entry points.

## UI/UX Notes

- No new strings, no layout change. The add row reads `הוסף "<typed>"` instead of `הוסף יחידה חדשה` /
  `הוסף ספק חדש` when something is typed.

## Atomic Sub-tasks

- [ ] A1: Let the unit window open with the name the chef already typed — prefillName in the context, window reads it on open, specs — src/app/core/services/unit-registry.service.ts, src/app/shared/unit-creator/**
- [ ] A2: Stop a cancelled unit window from filling the field later — completes-on-close helper replaces take(1) subscriptions in every caller, spec — unit-registry.service.ts, all FR 5 callers
- [ ] A3: Let the supplier window open with the typed supplier name — open(prefillName) → initialValue, spec — src/app/core/services/add-supplier-flow.service.ts
- [ ] A4: Show the typed name in every unit and supplier add row and pass it to the window — allowTypedAdd + pendingAddName_ per FR 5 — product-form, recipe-ingredients-table, recipe-workflow, quick-add-product, ai-draft-editor, cook-view, scaling-chip, recipe-header
- [ ] A5: Remove units and suppliers as exceptions from the dropdown rule — rule W text and prefill entry points — docs/agent/standards-domain.md, docs/brain/patterns/dropdown-add-option.md

## Out of Scope

- Any other dropdown (all others already prefill after plan 416).
- The unit window's layout, the basis-unit picker and the conversion rate.
- The supplier page / supplier edit form.
- Backend, API, auth, schemas, data migration: none.

## Execution Notes
