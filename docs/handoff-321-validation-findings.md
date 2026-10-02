# Handoff to the Planner — Plan 321 Phase 2b validation findings (2026-10-01)

From the Human's manual check of branch `feat/321-professional-foundation-refactor` (wt-2, local DB on v2 collections). Plan 321 itself is code-complete for Phase 2b; **Atlas has NOT been migrated** (needs the maintenance window + host confirm, runbook in `docs/session-state-foundation-refactor.md`). The items below are things the Human found while validating. Some were fixed on this branch; the rest need their own plans.

## 1. Fixed on this branch (no action, just awareness)

| Problem | Cause | Fix |
|---|---|---|
| Menu would not save ("fill all requirements", English, no field named) | Blank "search a dish" rows count as required items; `eventType` was required but the Human has no event types | Blank rows are dropped before validate/save and from every export; `eventType` optional; Hebrew message that names missing fields (`menu-form.util.ts`) |
| Restore from trash did nothing | Standalone local Mongo fallback in `replaceCollection` re-inserted existing `_id`s → E11000 → 500 (old bug, local only; Atlas has transactions) | Fallback now upserts by `_id`, then deletes the rest |
| Printing showed a blank / 70%-empty first page | `visibility:hidden` keeps layout height of the hidden page; preview clipped by `max-height` | Print CSS (`styles.scss`, end of file): an open export preview prints alone from page 1; blank "search a dish" rows hidden in print |
| Exported checklist listed every prep item twice | `ScaledPrepRow` builder pushed both `prepItems` and `prepCategories` entries for the same step | Deduped in `scaling.service.ts` |
| AI edit inside recipe builder set 100 portions | The model read "100 גרם חמאה" as the yield; dish `serving_portions` was never patched | Prompt now says yield = total made, never an ingredient quantity; dish portions are patched |

Human should re-test these in the browser (menu save, restore, print, Excel, AI-in-builder).

| Printing the menu page left out every dish and course name | Names are `<button>`s (click to rename) and the global print rule hides all `button`s | Print CSS shows `.dish-name-btn` / `.section-title-plain` as plain text inside `.menu-editor-shell` |

## 2. Needs a new plan: Menu lists redesign (frozen files involved)

`menu-intelligence.page.*` and `menu-export.service.ts` are on Plan 321's growth-frozen list, so this belongs after Plan 321 merges (or as part of Phase 7 decomposition).

**Shopping list** (currently one flat table, category repeated on every row):
- One table per ingredient category (herbs, vegetables, dairy, …); the category name appears once as the table title.
- Instead of a category column, a **"related to" column**: for each ingredient, the names of every dish/preparation in the menu that uses it (e.g. cream → "מוסלין עוף"; an ingredient used in two items → "מוסלין עוף, ציר דגים"). Purpose: the buyer sees what an ingredient belongs to and can reduce the order if a dish is dropped.
- Ingredients must be expanded through sub-recipes (a dish → its preparations → their ingredients), quantities scaled to the menu's portions. Today quantities are 0 and nothing expands.

**Checklist** (the staff handout):
- Remove "by category" and "by station" checklist modes (broken and redundant for now).
- Two outputs: (a) **prep cook**: one table per preparation and sub-preparation — its ingredients with scaled amounts, then its steps; (b) **line cook / mise-en-place**: one table per dish listing its mise-en-place items, including the amount of each preparation needed.
- Real, scaled quantities (today all 0). Each prep item once (the duplicate bug above).
- Only one blank "חפש מנה או הכנה…" row per section; the user can remove a row/section he doesn't need.

**Excel/PDF/print of lists:** print as one clean continuous block (no big empty top, no splitting mid-table where avoidable). Today print of the live page and of the preview are both wrong (blank placeholders, odd spacing). A real print stylesheet per list is needed; the one-off fix above only stops the worst of it.

## 3. Needs a decision / small plan

- **History restore wording:** when the recipe is in the trash (not in the list), the version-restore dialog still offers "replace existing"; it should offer only "create new" (or "restore from trash first").
- **Admin deletes from master, then restores:** a restore from the admin's own trash only returns the admin's copy. Other users' copies were never deleted; the master copy stays removed until pushed again. If the Human wants "restore returns it to everyone", the master trash needs a restore route + UI (today `TRASH_*` master docs have no UI).
- **AI edit modal in the recipe builder (Human: same prompt, several tries in each place, results were consistent per place, so it is a code-path difference, not model luck):** the recipe book uses `/ai/generate` (works); the builder's edit modal uses `/ai/patch-recipe` (portions 100, no ingredients). If the tightened patch prompt does not fix it, route a pasted full recipe through `/ai/generate` from the edit modal.
- **AI update (Human, after the prompt fix): still the same bad result.** So the prompt wording was not the cause. Diagnosis in progress with a temporary log of Gemini's raw reply on `/ai/patch-recipe`; result is in section 6.
- **AI edit modal, details:** pasting a full recipe text should fill name, portions, all ingredients and steps. The Human's last prompt returned wrong portions and no ingredients; the prompt was tightened but not verified against Gemini from the dev session (token minting blocked). Needs a real run + a regression test with a fixed Gemini response.
- **Event types:** `eventType` is a free list the Human has no values for. Either seed a default list or drop the field from the menu form.

## 4. Open items in Plan 321 (for the Planner's tracking)

- P2b.0b / P2b.1c / P2b.6: Atlas maintenance window, Atlas write + verify, Human smoke test (needs the Human).
- Then `/code-review` on the branch, then the PR (the PR must merge only after the Atlas migration, because the new server needs the v2 collections).
- Undecided: `steps_[].cooking_time_minutes_` rename vs convert; cleanup of `ingredients_` on 36 local products.
- Deviation to ratify: master/ownership fields (`userId`, `_masterId`, `_userModified`, `_userDeleted`) keep their v1 names until Phases 5/6 (D4); client hand-written model interfaces kept, guarded by `core/models/v2/conformance.ts`.

## 5. How to run the slot for validation

`wt-2`: API on 3002 (`cd server && PORT=3002 ALLOWED_ORIGIN=http://localhost:4202 npm run dev:local`), front end on 4202 (`npx ng serve -c slot --port 4202`; `src/environments/environment.slot.ts` is gitignored and points at 3002). Local DB already has the v2 collections and the upgraded trash/history.

## 6. AI-in-builder: root causes found and fixed (2026-10-02)

The Human's real attempt (blank preparation, "...יוצא 10 מנות") was captured: Gemini's `/ai/patch-recipe` reply was correct (10 portions, 3 ingredients, 3 steps). Two client bugs made the builder show the wrong thing; both fixed on this branch:

1. **Ingredients did not appear.** `RecipeIngredientsTableComponent` is `OnPush`; an AI patch (applied from the modal, outside the table's inputs) never triggered a redraw, so the table kept its old blank row while the form held the data (the weight box already said 100 g). Fix: the table subscribes to its FormArray's `valueChanges` and calls `markForCheck()`. Same bug class would hit any external change to the ingredient rows (history restore, etc.).
2. **Yield showed 100 instead of 10.** `RecipeHeaderComponent` auto-syncs the yield to the ingredients' total weight (100 g of butter) unless the yield is flagged as manual/confirmed (`netoConfirmed`). A programmatically set yield was therefore overwritten. Fix: `RecipeAiFlowService` marks `netoConfirmed_` true whenever the AI supplies a yield (patch and first-draft paths).

Remaining suggestion: add a component test that applies this exact patch to a real builder form and asserts the rendered rows and yield (fixture = the JSON above). The earlier prompt tweak (yield = total made, never an ingredient amount) is harmless and kept.

## 7. Human re-test results (2026-10-02, end of session)

| Check | Result |
|---|---|
| Menu save | Works |
| Trash restore | Works |
| Menu print | Prints the correct dishes and courses, but still spills onto 2 pages for no reason (needs the per-list print stylesheet from section 2) |
| Excel checklist | Structure correct; **quantities still all 0** (prep items have no stored quantities; needs the sub-recipe expansion in section 2) |
| AI edit in builder | Fixed in code (section 6); last Human retest of the final fix pending |
| Not yet tested | Export preview print/Excel button, history restore dialog wording, Atlas migration |

Next session starts with: (1) the Human retests the AI edit; (2) decide the Atlas maintenance window and run the runbook; (3) `/code-review` then the Plan 321 PR (merge only after Atlas); (4) the Planner turns sections 2 and 3 into plans.

## 8. Code review of the branch (2026-10-02, run in wt-2)

No data-loss, auth or validation defects found. Fixed on the branch: 0001 `--write` now refuses when any unmapped v1 key would be dropped (`--allow-unmapped=yes` to override on purpose); the export preview removes its `export-preview-visible` body class when destroyed (a stale class would have blanked a later Ctrl+P); the runbook now states that rolling back also needs the 7 trash/history collections restored from the snapshot.

Left open (low, for the Planner): restoring a master-cloned item from trash can silently no-op (tombstone with the same `_id` -> 409 treated as success; pre-existing); `0002 --verify` may flag post-cutover snapshots that carry the in-memory `recipeType`; root `scripts/*.mjs` repair scripts (`migrate-to-master.mjs`, `link-users-to-master.mjs`, ...) still use v1 names and are not guarded by `v1-only-guard`.
