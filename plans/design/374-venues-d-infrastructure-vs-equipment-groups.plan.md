# Plan 374 — Venues D: separate infrastructure from regular equipment in the venue form

Status: draft
Depends-on: none
Track: design — Claude Design
Snapshot: b776163f43fd1db42a5e0501b3a0e5c30b0bded1

## Problem Statement

The venue form's "תשתית זמינה במקום" section (`venue-form.component.html` ~L108-135) is one list of rows. Each row's equipment dropdown uses `equipmentOptions_` (`venue-form.component.ts` ~L86-88), which maps all equipment to `{value, label}`. Fixed venue infrastructure (ovens, fridges, sinks…) and portable equipment (pans, containers…) are mixed together.

Equipment already distinguishes them: `category === 'infrastructure'` (`EquipmentCategory` in `src/app/core/models/equipment.model.ts`; schema enum in `shared/schemas/entities/equipment.schema.ts:7`; dictionary `infrastructure` = "תשתית"). Dandan wants them separated in the dropdown, with a clear definition of what infrastructure means. No icon.

## Goals & Success Criteria

**Primary:** the venue form shows two groups: "תשתיות המקום" (rows whose dropdown lists only `category === 'infrastructure'`) and "ציוד נוסף" (rows whose dropdown lists all other categories), each with its own "add row" button.
**Primary:** the equipment form explains the infrastructure category when it's selected.
**Success:** no data-shape change. `availableInfrastructure` stays one array, and existing venues load with rows placed in the right group by their equipment's category.

## Execution Mode

- Parallel: no. Runs before plan 372 (Planner order 2026-11-05; 373 is parked). Same form as 372 and 373.
- Concurrent plans: none touching `src/app/pages/venues/**` or equipment-form
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/venues/components/venue-form/**
src/app/pages/venues/components/venue-detail/**
src/app/pages/equipment/components/equipment-form/**
src/app/pages/venues/components/venue-form/*.spec.ts
src/app/pages/venues/components/venue-detail/*.spec.ts
src/app/pages/equipment/components/equipment-form/*.spec.ts
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

As an event chef, I want to record a venue's fixed infrastructure separately from portable equipment, so I know what's on site and what to bring.

## Functional Requirements

### Must Have (P0)
- [ ] Two computeds: `infraOptions_` (equipment with `category === 'infrastructure'`) and `otherEquipmentOptions_` (the rest), both sorted by Hebrew name.
- [ ] Rows carry a transient `group: 'infra' | 'other'` form control, used for UI only and stripped from the payload on save. On hydrate, assign each row's group from its equipment's category (unknown or deleted equipment → `other`).
- [ ] The template renders two sub-sections from the same FormArray, filtering rows by group:
  - "תשתיות המקום" with `infraOptions_` and its own add button (adds a row with group `infra`)
  - "ציוד נוסף" with `otherEquipmentOptions_` and its own add button
  - Indices must map to the real FormArray index for `formGroupName` and removal.
- [ ] Payload: `availableInfrastructure` stays `{equipmentId, availableQuantity}[]` (strip `group`), so the strict schema is unchanged.
- [ ] Detail page: the infrastructure list is split into the same two headings.
- [ ] Equipment form: when the category select is `infrastructure`, show helper text under it: `equipment_infrastructure_hint` = "תשתית = ציוד קבוע של המקום (כיריים, תנורים, מקררים, כיורים). מופיע בנפרד בהגדרות מקום האירוע."

### Should Have (P1)
- [ ] An empty group shows a one-line muted hint ("אין פריטי תשתית") instead of nothing.

### Nice to Have (P2)
- None.

## UI/UX Notes

- Dictionary (append): `venue_infrastructure_group` = "תשתיות המקום", `venue_other_equipment_group` = "ציוד נוסף", `no_infrastructure_items` = "אין פריטי תשתית", `equipment_infrastructure_hint` (text above).
- No icons (per Dandan).

## Atomic Sub-tasks

- [x] A1: Sort venue equipment into infrastructure and regular groups behind the scenes — Computeds and the transient `group` control; hydrate grouping; payload strip (`venue-form/**`).
- [x] A2: Show infrastructure and regular equipment as two groups on the venue pages — Two-group template with correct index mapping; detail split (`venue-form/**`, `venue-detail/**`).
- [x] A3: Hint in the equipment form which items count as infrastructure — Equipment-form infrastructure hint (`equipment-form/**`).
- [x] A4: Build, test and check an existing venue still saves — Build, specs (hydrate grouping, payload has no `group`). Edit an existing venue and save, no 400.

## Technical Considerations

- Dependencies: `VenueFormComponent`, `VenueDetailComponent`, `EquipmentDataService.allEquipment_`, `EquipmentFormComponent`, `CustomSelectComponent` (unchanged).
- New files: none.
- Model changes: none.

## Out of Scope

- Grouped-option support inside custom-select.
- Changing equipment categories.

## Critical Questions

- Order of the two groups in the form:
  a) Infrastructure first (default)
  b) Other equipment first

## Success Criteria

- [auto] `npx ng test --watch=false --include=src/app/pages/venues/**/*.spec.ts --include=src/app/pages/equipment/**/*.spec.ts` → 0 failures.
- [auto] `npm run build` → exit 0.
- [human] Edit a venue: "תשתיות המקום" only offers infrastructure items in its dropdown, and "ציוד נוסף" only offers the rest. Existing rows sit in the right group. Save → reopen → unchanged.
- [human] Equipment form → choose category תשתית → the hint appears.

## Execution Notes
- Planner review 2026-11-07: added the `Depends-on:` header the v2.1.0 readiness lint requires, matching the 2026-11-05 order in `.claude/todo.md` (374 → 372; 373 parked).
- Planner 2026-11-08: scope now names the test files this plan writes (run-517 parked 374, 510 and 535 because a folder glob does not list the tests under it).
- Builder: ng test venues+equipment specs → 19 SUCCESS; npm run build → exit 0; pnpm run lint → 0 errors.
- Detail page shows only an infrastructure count (no list), so there was nothing to split; left unchanged.
