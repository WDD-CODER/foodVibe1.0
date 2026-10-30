# Orchestrator run run-499-502

Run branch: `orch/run-499-502` (from `origin/main` at 0e5e7f4) · started 2026-10-29T20:01:54.013Z · finished 2026-10-29T21:59:38.403Z
Result: 4 merged, 0 parked, skipped or left out, 4 in the run (counted from git and status.json).
`main` untouched: NO — origin/main is e138dbf.

## Plans

| Plan | State | Rounds | Builder tier | Merge | Why |
| --- | --- | --- | --- | --- | --- |
| 499 Number box: tap anywhere on it to edit the whole number | merged | 0 | build | d7e8ec7 |  |
| 500 One stepper (+/−) for every number: same hold-to-repeat, steps and minimum | merged | 0 | build | a332a81 |  |
| 501 Delete versus undo: entity deletes keep the popup, line removals get an undo toast | merged | 1 | build | e1e2297 |  |
| 502 Consistency sweep: one date field, one number format, growing textareas and one save-busy state | merged | 0 | build | f9fb510 |  |

## Decisions taken

- 500: escalated to a fresh judgment-tier builder (round 2): gate (main folder): node scripts/log-query.mjs --since=plan-start --level=error
- 499: D1 behaviour: a tap on the box while the number is already focused does nothing extra, and a disabled, read-only or locked number is not focused (as the readiness answers say) — reverse: remove the activeElement and disabled checks in number-box.directive.ts targetInput_()
- 499: D2 behaviour: the directive ignores presses on buttons, anchors, selects, textareas, other inputs and .c-chip inside the box — reverse: shrink the INTERACTIVE selector in number-box.directive.ts
- 499: D3 behaviour: the directive also cancels mousedown (not only pointerdown) when it focuses the number, so the browser does not move focus away again — reverse: remove the (mousedown) host binding
- 499: D4 behaviour: the reuse-lint rule is line-based — it warns on any added type='number' line in a src/app html that has no appNumberBox on the same line; a new input inside an existing box also warns — reverse: delete the number-input-outside-number-box entry in registry-families.mjs
- 499: D5 behaviour: appNumberBox sits on the existing container (label, c-input-stack, .relative-input, etc.), so no new wrapper markup and no style changes were made — reverse: remove the attribute from the templates
- 499: D6 behaviour: recipe-ingredients-table has it on .col-quantity only; the unit column is a custom-select dropdown and is left alone — reverse: n/a, add the attribute to another container if wanted
- 499: D7 seen: src/app/pages/menu-intelligence/components/event-stage-bar/event-stage-bar.component.html:114 — the deposit amount number box is not wired because the file is outside the plan scope
- 499: D8 seen: src/app/pages/menu-intelligence/components/menu-dish-row/menu-dish-row.component.html:33 — the inline price boxes are not wired because the file is outside the plan scope
- 499: D9 seen: src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.html:85 — the time cells are type='text' mm:ss inputs, not type=number, so the number-box rule does not apply
- 499: D10 seen: src/app/pages/inventory/components/product-import/product-import.component.html:215 — the purchase qty shares a row with a text input, so it is not wired
- 500: D11 behaviour: extended the shared counter with a hold directive rather than moving page steppers onto app-counter; each page keeps its own input and skin (cook-view ink, menu paper pill) - reverse: replace the page buttons with app-counter and delete the directive attributes
- 500: D12 behaviour: labor-minutes and cook-time steppers keep their fixed step (1 minute / 30 seconds) while held, and the new repeat does not speed up - reverse: pass continuousPress in the labor and cook-time handlers
- 500: D13 behaviour: a keyboard-activated button (click with detail 0) does one step; pointer clicks are handled on pointerdown only - reverse: remove the click handler from step-hold.directive.ts
- 500: D14 behaviour: the cook-view banner minimum is 0.01 and the edit-row minimum is 0, as today; no maximum and no new messages - reverse: change the [stepHoldStop] bindings in cook-view.page.html
- 500: D15 behaviour: ran log-query from the plan-500 start time (2026-10-29T20:16:58Z) and left the stale, ignored .claude/.slot-plan-start alone, because take-plan owns that stamp — reverse: rewrite the stamp to the plan start and rerun with --since=plan-start
- 500: D16 seen: src/app/pages/cook-view/cook-view.page.ts - onSettingAmountKeydown and onEditAmountKeydown duplicate the step rules of the arrow keys; I left them alone
- 500: D17 seen: src/app/pages/inventory/components/product-form/product-form.component.spec.ts — the real MasterPushService was used in the specs, so tests depended on the signed-in user state; fixed here by stubbing it (in scope as a test hardening). Reverse: remove the MasterPushService provider from the spec.
- 500: D18 seen: C:/coding projects/Cursor/foodVibe1.0/server/app.js:157 (main checkout's server) — 6 'CORS origin not allowed' errors at 2026-10-29T09:03Z on /api/v1/data/DICTIONARY_OVERRIDES/global from an origin not in ALLOWED_ORIGINS; outside plan 500, not fixed
- 500: D19 seen: plans/500-one-stepper-for-every-number-same-hold-to-repeat-steps-and-minimum.plan.md:21 — the [auto] log-query item uses --since=plan-start, which only resolves inside a slot; it needs an explicit ISO time (e.g. 2026-10-28T12:03:38.160Z) to run as [auto:main]
- 500: notes capped: 12 notes written for plan 500 (orchestrator.maxNotesPerPlan), later notes are dropped
- 500: D21 behaviour: the hold is one shared directive, appStepHold, so the page skins (cook-view ink, menu-intelligence paper) stay as they are and no sibling component was added — reverse: re-inline the hold in each page and revert the directive
- 500: D22 behaviour: product-form.component.spec.ts now stubs MasterPushService because test:ci hung on an admin save (test-only change, scope extended and logged in the plan) — reverse: remove the stub
- 500: D23 seen: .claude/.slot-plan-start is stale (2026-10-28, an earlier plan) and missing in main, so log-query --since=plan-start does not work for this plan
- 501: D24 behaviour: the undo toast is dismissed when the owning component is destroyed (Planner decision applied) — reverse: drop the owner argument at the call sites
- 501: D25 behaviour: event-note undo re-creates the note via addNote, so it gets a new time and author (Planner decision) — reverse: hold the server delete until the toast ends (needs pipeline and server files)
- 501: D26 behaviour: I added dictionary keys line_removed, note_removed and photo_removed, and left the now-unused notes_confirm_delete key (the dictionary is append-only) — reverse: delete the three new keys
- 501: D27 behaviour: recipe-builder ingredient undo removes the placeholder blank row that removeIngredient had auto-added to an empty list — reverse: restore the row without removing the placeholder
- 501: D28 behaviour: a menu item removed from a section is restored only if that section still exists — reverse: drop the includes() guard in menu-intelligence.page removeItem
- 501: D29 seen: src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.html:81 - the scaling-chip (remove) output is handled in recipe-header, which is outside this plan's scope, so that removal still gets no undo toast
- 501: D30 seen: ai-draft-editor has one row-delete handler (removeIngredient), not the 3 the plan lists
- 501: D31 seen: server log, CORS origin not allowed on /api/v1/data/DICTIONARY_OVERRIDES/global (HTTP 500) — shows in the log-query check but is not from plan 501
- 502: D32 behaviour: percent display goes through the engine's formatPct1 / formatPctInt, which print the same output as the old toFixed, so no displayed value changes; '| number' and '| formatQuantity' stay as they were (quantity -> formatQuantity pipe) — reverse: restore toFixed in the 3 spots
- 502: D33 behaviour: the menu page date chip is now a plain app-date-field, so the digit-buffer typing, the showPicker call and the Enter/Tab/Arrow focus hop on the date chip are gone — reverse: restore onDateKeydown and the chip markup from git history
- 502: D34 behaviour: the textarea directive selector is now every 'textarea'; boxes in components that do not import it (equipment forms, venue form, event notes log, supplier-orders, search-combobox) stay fixed-height — reverse: set the selector back to textarea[appTextareaAutoGrow]
- 502: D35 behaviour: not-closed, deposit-paid and paste-ingredients dialogs lock their own save button after the first click (the parent closes them); unit-edit and inline-rename take an 'isSaving' input that the parent has to set — reverse: remove the isSaving_ signal or input from each dialog
- 502: D36 behaviour: the legacy saving flag names (isLoading_, isBusy_, isSubmitting_) were not renamed; 'isSaving_' is the name for new code — reverse: n/a, nothing was renamed
- 502: D37 seen: src/app/pages/metadata-manager/metadata-manager.page.component.html:165 — the parent of unit-edit-dialog and inline-rename-field does not bind [isSaving] yet (out of scope), so the busy state there only applies once the parent sets it
- 502: D38 seen: src/app/pages/menu-intelligence/KEYBOARD-FOCUS-REPORT.md:15 — still describes the removed date chip keyboard handling

## Models per agent

- 499 orch-builder: claude-sonnet-5-5 / medium
- 499 orch-gate: claude-haiku-5-5 / low
- 499 orch-check-plan: claude-sonnet-5-5 / high
- 499 orch-check-bugs: claude-sonnet-5-5 / high
- 499 orch-check-rules: claude-sonnet-5-5 / high
- 499 orch-security: claude-sonnet-5-5 / high
- 499 orch-verify: claude-sonnet-5-5 / medium
- 499 orch-merge: claude-sonnet-5-5 / low
- 500 orch-builder: claude-sonnet-5-5 / medium
- 500 orch-gate: claude-haiku-5-5 / low
- 500 orch-check-plan: claude-sonnet-5-5 / high
- 500 orch-check-bugs: claude-sonnet-5-5 / high
- 500 orch-check-rules: claude-sonnet-5-5 / high
- 500 orch-verify: claude-sonnet-5-5 / medium
- 500 orch-merge: claude-sonnet-5-5 / low
- 501 orch-builder: claude-sonnet-5-5 / medium
- 501 orch-gate: claude-haiku-5-5 / low
- 501 orch-check-plan: claude-sonnet-5-5 / high
- 501 orch-check-bugs: claude-sonnet-5-5 / high
- 501 orch-check-rules: claude-sonnet-5-5 / high
- 501 orch-security: claude-sonnet-5-5 / high
- 501 orch-verify: claude-sonnet-5-5 / medium
- 501 orch-merge: claude-sonnet-5-5 / low
- 502 orch-builder: claude-sonnet-5-5 / medium
- 502 orch-gate: claude-haiku-5-5 / low
- 502 orch-check-plan: claude-sonnet-5-5 / high
- 502 orch-check-bugs: claude-sonnet-5-5 / high
- 502 orch-check-rules: claude-sonnet-5-5 / high
- 502 orch-verify: claude-sonnet-5-5 / medium
- 502 orch-merge: claude-sonnet-5-5 / low

## What only the Human can do

### The plans' [human] items (no UI check ran)

1. 502: Business settings: double-click Save gives one save and the button shows busy — a [ui] card no script could check and the browser step was off; on http://localhost:4201/settings
2. 502: Recipe book list: the date filter looks and works like the date field in the event dialogs — a [ui] card no script could check and the browser step was off; on http://localhost:4201/recipe-book
3. 502: A notes box grows as you type (not-closed dialog, inquiry dialog, AI modals) — a [ui] card no script could check and the browser step was off; on http://localhost:4201/menu-library
4. 499 Number box: tap anywhere on it to edit the whole number: Phone width: tap the ₪ sign of the price per guest in the pricing meter → the whole number is selected; typing replaces it. Same on the % suffix of waste in the product form.
5. 499 Number box: tap anywhere on it to edit the whole number: Recipe builder: tap the unit label next to an ingredient quantity → the number is selected; pressing Enter still moves to the next row.
6. 499 Number box: tap anywhere on it to edit the whole number: The two `[human]` items under Success Criteria pass.
7. 500 One stepper (+/−) for every number: same hold-to-repeat, steps and minimum: Recipe builder ingredient quantity, cook-view amount and menu guest count: hold − → repeats at the same speed in all three and stops at the minimum.
8. 500 One stepper (+/−) for every number: same hold-to-repeat, steps and minimum: Phone width: press and hold + on the guest count → it repeats; release stops it.
9. 500 One stepper (+/−) for every number: same hold-to-repeat, steps and minimum: The cook-view and menu-intelligence steppers still look like their own pages (the ink and paper skins).
10. 500 One stepper (+/−) for every number: same hold-to-repeat, steps and minimum: The three `[human]` items under Success Criteria pass.
11. 501 Delete versus undo: entity deletes keep the popup, line removals get an undo toast: Product form: delete a purchase option → it disappears at once, a toast with "undo" shows → pressing undo brings it back in the same place.
12. 501 Delete versus undo: entity deletes keep the popup, line removals get an undo toast: Event notes: delete a note → toast with "undo" → undo brings the note back and it is still there after a reload.
13. 501 Delete versus undo: entity deletes keep the popup, line removals get an undo toast: Delete a supplier → the confirm popup (unchanged).
14. 501 Delete versus undo: entity deletes keep the popup, line removals get an undo toast: The three `[human]` items under Success Criteria pass.
15. 502 Consistency sweep: one date field, one number format, growing textareas and one save-busy state: Business settings: double-click Save → one save, the button shows busy while it runs.
16. 502 Consistency sweep: one date field, one number format, growing textareas and one save-busy state: Recipe book list: the date filter looks and works like the date field in the event dialogs.
17. 502 Consistency sweep: one date field, one number format, growing textareas and one save-busy state: A notes box grows as you type on any screen that has one.
18. 502 Consistency sweep: one date field, one number format, growing textareas and one save-busy state: The three `[human]` items under Success Criteria pass.

- Review and merge the run branch (PowerShell, one line each):

```powershell
git fetch origin
gh pr create --base main --head orch/run-499-502 --title "Orchestrator run run-499-502" --body-file .claude\orchestrator-runs\run-499-502.md
```
