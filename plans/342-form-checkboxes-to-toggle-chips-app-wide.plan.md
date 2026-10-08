# Plan 342 — Form checkboxes → toggle chips (app-wide)

Status: draft
Snapshot: acab8cff39fd0240f67af00439a8bd044c23889e

## Problem Statement

After the toggle-chip engine plan (339), the filters use `.c-toggle-chip`, but forms and modals still use raw checkboxes. Dandan wants chips instead of checkboxes across the whole app. These remain:

| File | Checkbox | Current class |
| --- | --- | --- |
| `pages/suppliers/components/supplier-form/supplier-form.component.html` L38, L109 | delivery days (multi) | `.c-filter-option`, `.day-check` |
| `pages/equipment/components/equipment-form/equipment-form.component.html` L45-50 | `isConsumable` (boolean) | `.checkbox-group` |
| `pages/equipment/components/equipment-list/equipment-list.component.html` ~L222 | inline-edit booleans | `.inline-edit-checkboxes` |
| `pages/inventory/components/product-form/product-form.component.html` L175-180 | `show_special_price_` (boolean) | `.price-override-label` |
| `shared/quick-add-product-modal/…html` L161-165 | allergens (multi) | `__checkbox-label` |
| `shared/quick-edit-product-panel/…html` L76-81 | suppliers (multi) | `.inline-edit-check` |
| `shared/label-creation-modal/…html` L55-59 | auto-triggers (multi) | `.trigger-option` |
| `pages/venues/components/venue-form/venue-form.component.html` L29-33 | active (boolean) | `.active-toggle` |

Staying as they are:

- Row-selection checkboxes (`shared/list-selection/list-row-checkbox`): multi-select of rows is a standard checkbox pattern.
- The cook-view prep checklist (`role="checkbox"`): it's a real to-do checklist.

## Goals & Success Criteria

- Primary: every listed checkbox renders as `.c-toggle-chip` (multi-choice → `.c-toggle-chip-group`; boolean → a single chip whose label is the option).
- Success: `.c-filter-option` has no users and its rule is deleted from `src/styles.scss`.

## Execution Mode

- Parallel: yes
- Concurrent plans: run after the toggle-chip engine (339), Equipment (338) and Suppliers (341) plans (shared files). No concurrent plan touching the listed files.
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/suppliers/components/supplier-form/**
src/app/pages/equipment/components/equipment-form/**
src/app/pages/equipment/components/equipment-list/**
src/app/pages/inventory/components/product-form/**
src/app/shared/quick-add-product-modal/**
src/app/shared/quick-edit-product-panel/**
src/app/shared/label-creation-modal/**
src/app/pages/venues/components/venue-form/**
```

`src/styles.scss`: this plan deletes the `.c-filter-option` rule (and its ≤1023px variant) once unused. That's an approved exception to append-only.

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

- As a chef, I want the same tap-to-toggle chips everywhere I pick options, so the app feels consistent and fits small screens.

## Functional Requirements

### Must Have (P0)

- [ ] Every row in the table above uses `label.c-toggle-chip > input` (hidden, focusable) with the same bindings: `formControlName`, `[checked]` / `(change)`. No logic changes.
- [ ] Multi-choice groups are wrapped in `.c-toggle-chip-group`.
- [ ] Boolean fields become a single chip whose text is the field label (e.g. "מתכלה", "פעיל", "מחיר מיוחד").
- [ ] Delete the now-dead local classes: `.day-check`, `.checkbox-group`, `.price-override-label`, `.quick-add-product-modal__checkbox-label`, `.inline-edit-check`, `.inline-edit-checkboxes`, `.trigger-option`, `.active-toggle`. Grep each before deleting.
- [ ] Delete the `.c-filter-option` rule from `styles.scss` (zero users).

### Should Have (P1)

- [ ] The label-creation trigger chips show the trigger's color dot if one exists (`.c-toggle-chip__dot`).

### Nice to Have (P2)

- None.

## UI/UX Notes

- Boolean chip off = neutral outline, on = filled primary. This reads as a toggle.
- No new dictionary keys; reuse the existing label keys.
- The metadata menu-type `.field-check` checkboxes are handled by the Metadata plan (340). If they still exist when this runs, STOP and report rather than editing metadata files.

## Atomic Sub-tasks

- [x] A1: Supplier form delivery days (both branches) → chip group (`supplier-form.component.*`)
- [x] A2: Equipment form `isConsumable` and equipment-list inline-edit booleans → chips (`equipment-form.component.*`, `equipment-list.component.*`)
- [x] A3: Product form special price, quick-add allergens, quick-edit suppliers → chips (`product-form.component.*`, `quick-add-product-modal/**`, `quick-edit-product-panel/**`)
- [x] A4: Label-creation triggers and venue-form active → chips (`label-creation-modal/**`, `venue-form.component.*`)
- [x] A5: Delete the dead local classes and `.c-filter-option` (`src/styles.scss`). Run `rg -n 'type="checkbox"' src/app --glob '*.html'` and confirm only list-row-checkbox remains.
- [ ] A6: Build and run specs. Update the session-state file.

## Technical Considerations

- Dependencies: reactive forms bindings are unchanged; the only change is the CSS engine `.c-toggle-chip`.
- New files: none.
- Model changes: none.
- Hidden inputs must stay in the DOM (not `display:none`) so `formControlName` and keyboard access keep working.

## Out of Scope

- Row-selection checkboxes and the cook-view checklist.
- Any form logic or validation changes.

## Critical Questions

1. Boolean fields:
   - a) A single chip that toggles (default)
   - b) A two-chip pair "כן / לא"

## Success Criteria

- [ ] [auto] `rg -n 'type="checkbox"' src/app --glob '*.html'` → only `src/app/shared/list-selection/list-row-checkbox.component.html`.
- [ ] [auto] `rg -n "c-filter-option" src/app src/styles.scss` → no matches.
- [ ] [auto] `npx ng test --watch=false --include=src/app/pages/**/*-form.component.spec.ts --include=src/app/shared/**/*.spec.ts` → 0 failures.
- [ ] [auto] `npm run build` → exit 0.
- [ ] [human] Supplier form: delivery days are chips; save → reopen → the same days are selected. Equipment "מתכלה", venue "פעיל" and product special price toggle as chips and persist. Quick-add allergens and label triggers are chips.
