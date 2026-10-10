# Plan 397 — Recipe builder split: logistics picker and export overlays into page services

Status: active
Track: code — here (not design)
Snapshot: da1d7f666cefa259d0233d6c5522042073ab8a3f

## Problem Statement
`src/app/pages/recipe-builder/recipe-builder.page.ts` is 1426 lines and the most edited big file
(13 edits since 2026-09-01). Follow-up to closed plan 318 (refactor-candidate backlog). Two
blocks are self-contained flows that don't need the shared recipe form's internals:

- **Logistics/equipment picker** (~L864–1050): selected id, quantity +/- and its keydown,
  search input + keyboard nav + dropdown scroll, select option, add tool to baseline, "add new
  tool" modal, baseline add/remove row.
- **Export/view overlays** (~L184–190 signals, L548–590, L1224–1320): export toolbar, view/export
  dropdowns, `onView*` / `onExport*` / print / preview, `exportQuantity_`.

What stays: form patch/snapshot, save gates and validation (~L600–890, L1085–1205, L1325–1400).
They all run through the shared recipe form; splitting them would only move the coupling.

Proven pattern: the cook-view split (2026-09-28, `chore/cook-view-service-split`) moved
self-contained flows into component-scoped services under `pages/cook-view/services/`
(`CookTimerService`, `CookViewExportService`, `@Injectable()` + page `providers`), 1201 → 979
lines, and left code tied to the shared signals in place. This page already uses the same
pattern for `RecipeAiFlowService`.

## Goals & Success Criteria
- Primary: the two flows live in component-scoped services under
  `src/app/pages/recipe-builder/services/`; the page delegates to them. Refactor only — no
  behavior, look or text change.
- Success:
  - [auto] `ng build` passes.
  - [auto] `ng test` passes (existing specs, incl. `recipe-builder.page.spec.ts`).
  - [auto] `wc -l src/app/pages/recipe-builder/recipe-builder.page.ts` is lower than 1426 (report the number).
  - [human] Logistics: search a tool, arrow keys + Enter pick it, +/- and typed quantity work, Add puts it in the baseline, remove a row, "add new tool" modal creates and adds one.
  - [human] Export: hero FAB opens the toolbar; each View option (recipe info, shopping list, cooking steps, dish checklist, all) previews; export and print from preview work; closing the preview and leaving the page leave nothing open.
  - [human] Edit and save an existing recipe and a dish; leave with unsaved changes and get the guard prompt — same as before.

## Execution Mode
- Parallel: yes — disjoint folders from plans 398 and 399
- Concurrent plans: 398, 399
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/recipe-builder/recipe-builder.page.ts
src/app/pages/recipe-builder/recipe-builder.page.html
src/app/pages/recipe-builder/recipe-builder.page.spec.ts
src/app/pages/recipe-builder/services/**
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-6: preserves — the existing `*-ai-flow.service.ts` in `services/` is not touched; no AI call is added or moved.
- INV-none: preserves — client-side refactor inside one page folder; no write routes, schemas, taxonomy storage or AI calls change.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a developer, I want the recipe builder page to hold only form, save and validation logic,
  so edits to the picker or export flows don't risk the save path.

## Functional Requirements

### Must Have (P0)
- [ ] `RecipeLogisticsPickerService` (`@Injectable()`, provided on the page): picker state
      (selected id, quantity, search query, highlighted index, filtered equipment options,
      excluded baseline ids) and its handlers (quantity +/- and keydown, search input/keydown,
      dropdown scroll, select option, add-new-tool modal). Writes to the baseline FormArray
      either stay in the page or take the FormArray as an argument — the service never reaches
      into the whole form.
- [ ] `RecipeExportService` (`@Injectable()`, provided on the page): export toolbar / view-export
      dropdown / preview signals and the `onView*` / `onExport*` / print / close handlers. It
      receives the recipe snapshot and export quantity from the page (`buildRecipeFromForm()`,
      `exportQuantity_()`) rather than reading the form itself. `closeAllExportOverlays()` on
      leave keeps working.
- [ ] Template bindings updated to the services; no visible change.
- [ ] Code style per hard rules: `inject()`, signals with trailing `_` for private state, no
      `any`, single quotes, no semicolons. Class structure per
      `.claude/skills/angularComponentStructure/SKILL.md`.

### Should Have (P1)
- [ ] Focused specs for the two new services (picker keyboard nav + add; export opens/closes).

### Nice to Have (P2)
- none

## UI/UX Notes
- No UI change, no new dictionary keys.

## Atomic Sub-tasks
- [ ] A1: Confirm the seams against the current file (line numbers above are from 2026-10-10); note in session-state anything that turned out coupled to the form and stays
- [ ] A2: Extract `src/app/pages/recipe-builder/services/recipe-logistics-picker.service.ts`; wire page + `recipe-builder.page.html`
- [ ] A3: Extract `src/app/pages/recipe-builder/services/recipe-export.service.ts`; wire page + template
- [ ] A4: Update `recipe-builder.page.spec.ts` if it touches moved members; add service specs (P1)
- [ ] A5: `ng build` + `ng test` green, report new line count; hand the Human the click list from Success

## Technical Considerations
- Dependencies: `RecipeFormService`, `RecipeAiFlowService` (already in `services/`), equipment
  data service, the add-tool modal service, the export/print services the page uses today.
- New files: the two services (+ specs).
- Model changes: none.
- Keep public method names the template calls stable where cheap, or rename consistently in the
  template — no dead aliases left behind.

## Out of Scope
- Form patch/snapshot, save gates, validation, type-change handling.
- Any behavior, style or text change.

## Critical Questions
- none
