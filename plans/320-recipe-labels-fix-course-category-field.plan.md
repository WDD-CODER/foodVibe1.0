# Plan 320 — Recipe Labels Fix + Course/Category Field (Goal)

## Problem Statement
Two distinct bugs are both surfacing as "labels are broken" in the recipe editor:

1. Nine sets of near-duplicate dietary label strings (dairy / dairy_prep / dairy_sauce, etc. — see Plan 319 Section D) are fragmenting what should be one canonical label, and some are never registered in `KITCHEN_LABELS` at all, so they can't appear in the label dropdown.
2. ~70+ distinct strings sitting in `labels_`/`autoLabels_` (starter_fish, main_dish_meat, salads, desserts, stews_cookery, etc. — 8,000+ recipe-label associations, confirmed via Plan 319's live Atlas audit) are not dietary labels at all — they're a recipe course/category taxonomy that's been typed into the labels field because a real course/category field was never built on the Recipe model.

Both must be fixed for "all available labels show up and are selectable in the recipe-builder dropdown" to actually be true — dietary labels need registering/merging, and everything else needs to move out of `labels_` into a field that doesn't exist yet.

## Goals & Success Criteria
- Primary: the recipe-builder label dropdown shows every genuine dietary label in use, with no duplicates; a new single-select course field exists, seeded from the business's existing course vocabulary, and no recipe still carries a course-like string inside `labels_`/`autoLabels_`.
- Success: `node scripts/audit-labels.mjs` (Plan 319's script, re-run after this work) shows 0 orphans for the 9 merge clusters, and 0 course-like strings remaining in `labels_`/`autoLabels_`.

## Confirmed mechanism (from Plan 319 A1 + live Atlas audit — do not re-derive, just build on this)
- `recipe-header.component.ts` `labelMultiSelectOptions_` (computed) is the *only* source for what's selectable in the dropdown — built from `metadataRegistry.allLabels_()` only. Anything not in `KITCHEN_LABELS` is invisible here regardless of what's stored on the recipe.
- `recipe-book-list.component.ts` `getAllRecipeLabels()` (~line 270) reads raw `labels_`/`autoLabels_` with no registry filter — this is why the list/filter view shows strings the editor dropdown never offers.
- `recipe-form.service.ts`: `normalizeLabelKeys` (load path, ~line 145) accepts exact registry-key OR translation-dictionary match; `buildRecipeFromForm` (save path, ~line 244) accepts only exact registry-key match. This asymmetry means a label that survived loading via translation match can get silently dropped on the next save. Live audit found 0 translation-matched labels currently, so no live damage today, but fix it while this file is open (Milestone 1, P1).
- `recipe-builder.page.ts` owns the actual `recipeForm_` FormGroup (`labels: [[] as string[]]` field) and `liveAutoLabels_`. **This file is growth-frozen — Dandan has explicitly approved exactly one exception: adding a `course` control to this FormGroup for Milestone 2. Nothing else in this file changes.**
- `KITCHEN_CATEGORIES` already exists in `metadata-registry.service.ts` — but it's for **product/ingredient** categories (used by `computeAutoLabels`'s auto-trigger matching), a completely different concept from recipe course. Do not reuse or confuse this registry with the new one in Milestone 2.
- Full cluster/orphan data (exact strings, sample recipe `_id`s, counts) lives in `.claude/reports/label-audit/data.json` from Plan 319's live run — read from there, don't re-derive.

## Milestone 1 — Merge duplicate dietary labels (small, bounded)

> **Scope correction (2026-09-29, confirmed by Human):** Live inspection of `data.json`'s
> `sectionD_clusters` found only 5 of the 9 audit-script clusters are genuine same-concept
> duplicates. The other 4 (`canonical: "meat"`, `"salads"`, `"soups_stocks_cooking_liquids"`,
> `"dessert"`) are the audit script's fuzzy-match chaining unrelated course/category strings
> together (e.g. `starter_fish`, `main_dish_vegetarian`, `fish` all collapsed into `"meat"`;
> `vegetable_side_dish`/`starch_side_dish`/`grains_side_dish`/`legume_side_dish` collapsed into
> `"salads"`). Merging those would silently corrupt ~1000+ recipes' data (a fish starter
> relabeled "meat") and duplicates exactly what Milestone 2's course migration already handles
> correctly. **Milestone 1 merges only the 5 real duplicate-concept clusters:**
> - `dairy_prep` / `dairy_sauce` → `dairy`
> - `vegan` / `טבעוני` → `vegan`
> - `marinade` / `מרינדה` → `marinade`
> - `asian` / `אסייתי` → `asian`
> - `sipur_shel_ochel` / `סיפור של אוכל` → `sipur_shel_ochel`
>
> The `meat`/`salads`/`soups_stocks_cooking_liquids`/`dessert` clusters' member strings are
> left untouched here — they flow into Milestone 2 as course-like strings instead.

### Atomic Sub-tasks
- [ ] M1.1: Read `.claude/reports/label-audit/data.json` Section D — extract the **5 confirmed genuine-duplicate clusters** (dairy, vegan, marinade, asian, sipur_shel_ochel), each cluster's canonical key and orphan member strings, and full affected-recipe list (not just the 3-sample subset in report.md).
- [ ] M1.2: For each of the 5 clusters, confirm the canonical key is registered in `KITCHEN_LABELS` for every `userId` (including `__master__`) that has recipes using an orphan member of that cluster. Register it where missing.
- [ ] M1.3: Write `scripts/merge-labels.mjs` (read-only by default, `--write` required to mutate — same MongoClient/dotenv/masking pattern as `scripts/audit-labels.mjs`/`scripts/fix-duplicate-names.mjs`). Scoped to the 5 confirmed clusters only. For each recipe/dish in `RECIPE_LIST`/`DISH_LIST` whose `labels_` or `autoLabels_` contains an orphan member of one of those 5 clusters: replace it with the canonical key, dedupe the array. Log every mutation (recipe `_id`, before/after) to a run log.
- [ ] M1.4: Dry-run against local, then (after Human confirms host) `--remote` dry-run, review the mutation log, then `--write --remote`.
- [ ] M1.5: Fix the `normalizeLabelKeys` / `buildRecipeFromForm` asymmetry in `recipe-form.service.ts` — make `buildRecipeFromForm` accept the same translation-dictionary fallback `normalizeLabelKeys` does, so a label that loads correctly can't silently vanish on next save.
- [ ] M1.6: Re-run `scripts/audit-labels.mjs --remote` — confirm the 5 merged clusters now show 0 orphan members. (The other 4 clusters are expected to still show orphans until Milestone 2's course migration runs — that's correct, not a regression.)

### Out of Scope (Milestone 1)
- The 4 course-like clusters (`meat`, `salads`, `soups_stocks_cooking_liquids`, `dessert`) — Milestone 2 territory, not dietary duplicates.
- Any change to `recipe-builder.page.ts`, `cook-view.page.ts`.

## Milestone 2 — Build the recipe course/category field, migrate course-like strings out of labels_

### Atomic Sub-tasks
- [ ] M2.1: Add `course_?: string` to `Recipe` interface in `recipe.model.ts` (single-select, per Dandan's decision).
- [ ] M2.2: Add a new `KITCHEN_COURSES` registry to `metadata-registry.service.ts`, mirroring the existing `KITCHEN_LABELS` pattern exactly (per-`userId` incl. `__master__`, `courses_` signal, `registerCourse`/`deleteCourse`/`reloadCoursesFromStorage`). **Do not touch or extend `KITCHEN_CATEGORIES`** — that's the unrelated product/ingredient-category registry.
- [ ] M2.3: Seed `DEFAULT_COURSES` for `__master__` programmatically from `.claude/reports/label-audit/data.json` — every distinct string classified as orphan in Plan 319's audit that is NOT one of the 5 Milestone-1 dietary-duplicate cluster members (this now explicitly includes the 4 course-like clusters' full member lists — `meat`/`salads`/`soups_stocks_cooking_liquids`/`dessert` — as distinct course strings, not merged into one). Use the strings as-is (Dandan confirmed: no course × protein-type split, seed as-is).
- [ ] M2.4: `recipe-builder.page.ts` — add `course: ['']` to the existing `recipeForm_` FormGroup (the one approved exception to the freeze). No other change to this file.
- [ ] M2.5: `recipe-form.service.ts` — add course handling alongside the existing label handling in `patchFormFromRecipe` (read `recipe.course_` → patch `course` control) and `buildRecipeFromForm` (read `course` control → write `course_`).
- [ ] M2.6: `recipe-header.component.ts`/`.html` — add a single-select course dropdown (reuse the existing custom-select component used elsewhere, not `custom-multi-select` since this is single-value) bound to the new `course` control, options from `metadataRegistry.courses_()`.
- [ ] M2.7: Metadata manager — add a "Courses" card (CRUD), mirroring the existing labels card / `label-creation-modal` pattern.
- [ ] M2.8: `recipe-book-list.component.ts` — decide and implement how `course_` surfaces in the list/filter sidebar (parallel to how `labels_` does via `getAllRecipeLabels`/`filterCategories_`), so filtering by course works from day one.
- [ ] M2.9: `dictionary.json` — add translation entries for the seeded course strings that need Hebrew display text (check `translatePipe` convention; many slugs may already be readable, some (e.g. `dan_and_adi_dishes_from_the_orchard`) will need a proper Hebrew label).
- [ ] M2.10: Write `scripts/migrate-labels-to-courses.mjs` (dry-run default, `--write` to mutate). For every recipe/dish where `labels_`/`autoLabels_` contains one of the seeded course strings: set `course_` to that string and remove it from `labels_`/`autoLabels_`. **If a recipe has more than one course-like string** (single-select can't hold both) — do not silently pick one; write it to a conflict list for Human review instead. Given the 4 previously-merged course clusters are now kept as distinct strings (per M2.3), expect real multi-match conflicts here (e.g. a recipe carrying both `starter_fish` and `main_dish_meat`) — this is exactly the case the conflict list exists for.
- [ ] M2.11: Dry-run local → Human reviews conflict list and resolves each conflict manually (or gives a rule) → `--remote` dry-run → `--write --remote`.
- [ ] M2.12: Re-run `scripts/audit-labels.mjs --remote` — confirm 0 course-like strings remain in `labels_`/`autoLabels_`.

### Out of Scope (Milestone 2)
- Splitting course strings into two dimensions (course × protein-type) — explicitly declined; seed as-is.
- Any other structural change to `recipe-builder.page.ts` or `cook-view.page.ts` beyond the one approved FormGroup line.
- Multi-select for course (single value only, per decision).

## Technical Considerations
- Dependencies: `KITCHEN_LABELS`, new `KITCHEN_COURSES`, `RECIPE_LIST`, `DISH_LIST`, `.claude/reports/label-audit/data.json` (Plan 319 output — read, don't regenerate unless it's stale).
- New files: `scripts/merge-labels.mjs`, `scripts/migrate-labels-to-courses.mjs`.
- Model changes: `Recipe.course_?: string` (new), no changes to `labels_`/`autoLabels_` shape.
- Growth-frozen exception: `recipe-builder.page.ts` gets exactly one new line (`course` control) — flag this explicitly in the commit message and PR description so it's not missed in review.

## Critical Questions
None outstanding — course = single-select, seed courses as-is from existing strings, frozen-file exception approved, both milestones in one plan, all confirmed by Dandan 2026-09-28/29. Milestone 1 scope narrowed to 5 genuine-duplicate clusters (from 9) on 2026-09-29 after live data inspection contradicted the original "9 dietary clusters" framing — confirmed by Human.

## Verify
- `node scripts/audit-labels.mjs --remote` (Plan 319's script): 0 orphans in the 5 Milestone-1 clusters, 0 course-like strings left in `labels_`/`autoLabels_` after Milestone 2.
- Recipe-builder: label dropdown shows only canonical, deduplicated dietary labels; a new course dropdown exists and is populated from `KITCHEN_COURSES`.
- `git diff --stat recipe-builder.page.ts` shows exactly one added line (the `course` control) — nothing else in that file touched.
- Both migration scripts' mutation logs reviewed by Dandan before `--write --remote` was run (not just dry-run reviewed).
