# Plan 376 — Dish types cleanup: keep only real dish types, remap recipes safely (decision gate first)

Status: done
Track: code — here (not design)
Snapshot: b776163f43fd1db42a5e0501b3a0e5c30b0bded1

> **Reality check needed (plan review 2026-10-09).** Written before 321 P3.4 moved every registry onto shared `taxonomyTerms` (`TaxonomyStore`). The `KITCHEN_COURSES` per-user docs, `_userModified` sync and `registry-delete-master` described below no longer drive the app. The goal stands; redo the mechanics on taxonomy terms (a re-key already cascades via `renameTermEverywhere`) before A1.

## Problem Statement

The dish-type list ("סוגי מנות", `KITCHEN_COURSES`, used by the `course` field on recipes and dishes) holds 63 values. They come from `DEFAULT_COURSES` (`src/app/core/services/metadata-registry.service.ts` ~L27-91), seeded per user when empty, and from `COURSE_STRINGS` in `scripts/migrate-labels-to-courses.mjs` (~L72), originally legacy recipe categories. Many aren't dish types: junk, preparation categories, raw Hebrew keys, near-duplicates.

Storage facts that shape the safe approach:

- `KITCHEN_COURSES`: one registry doc per user plus `__master__`, shaped `{ items: [{ key, color? }] }` (no Zod entity schema).
- `recipes.course` / `dishes.course`: `z.string().optional()` in `shared/schemas/entities/recipe.schema.ts:42`. A remap or `''` stays valid under the strict schema.
- Users with `_userModified` don't receive master registry updates (`server/services/sync-master.js`), so a master-only change won't reach them.
- The app's "delete for everyone" (`registry-delete-master`, `server/routes/generic.js` ~L370-410) blanks `course` everywhere instead of remapping. Don't use it for this.
- `TRASH_*` and `VERSION_HISTORY` snapshots keep old values; restoring one must still display safely.

## ⛔ A0 — Decision gate (Worker must STOP here and show this to Dandan)

Before any code or data change, present the table below and the preparation question, and wait for Dandan's explicit approval or edits. Record the final approved mapping in the session-state file and use only that.

### Recommended mapping

| Action | Values |
| --- | --- |
| Keep (22) | `amuse_bouche` (אמיוז בוש), `starter` (מנה ראשונה), `starter_chicken` / `starter_fish` / `starter_meat` / `starter_seafood` / `starter_vegetarian`, `main_dish_chicken` / `main_dish_fish` / `main_dish_meat` / `main_dish_vegetarian`, `main_seafood`, `pork_dish` (חזיר), `pasta_dish` (מנת פסטה), `soups` (מרקים), `salads` (סלטים), `side_dish` (תוספת), `grains_side_dish` / `legume_side_dish` / `starch_side_dish` / `vegetable_side_dish`, `pre_dessert` (טרום קינוח), `desserts` (קינוחים) |
| New | `main_dish` = "מנה עיקרית" (generic) |
| Merge → target | `salads_fresh_side_dish`, `'סלט'` → `salads` · `soups_stocks_cooking_liquids` → `soups` (dishes only; on preparations → cleared) · `special_starter_for_boss` → `starter` · `special_main_for_boss`, `stews_cookery` → `main_dish` · `cakes_cookies_tarts`, `pastry_sweets`, `sorbet_ice_cream_granita`, `sweet_creams_custards_mousse` → `desserts` on dishes only; on preparations → cleared |
| Remove (junk) | `trash_category`, `ideas_dishes`, `ideas_preparations`, `conversions_and_techniques`, `dan_and_adi_cooking_from_the_orchard`, `dan_and_adi_dishes_from_the_orchard`, `special_for_boss`, `soups_up`, `bakery` |
| Remove (preparation categories) | `general_preps`, `pasta_prep`, `charcuterie_meat_mass_meat_preps`, `powders_spice_mixes_dry_preps`, `jams_sweet_preps_syrup`, `oils_and_infusions`, `fermentation_curing_pickling`, `salty_baking_doughs`, `sweet_baking_doughs`, `vinaigrettes_mayonnaise_emulsion`, `foams_hot_cold`, `fish_shellfish_sauce`, `meat_sauce`, `salad_sauce`, `sweet_sauce`, `sauces_cold_hot_savory`, `'רוטב'`, `'גלייז'`, `spreads_dips_salty_creams`, `bread_focaccia_savory_baking`, `vegetables_snacks_add_ons` |

**Question for Dandan:** recipes whose value is removed lose their classification. What happens to them?

- a) Clear `course`; the old value is recorded in the report (default)
- b) Move it into a recipe label with the same Hebrew name (keeps the info; adds labels)

Also run the script in dry-run first and show Dandan the per-value counts (how many recipes and dishes per user would change) before he approves.

## Goals & Success Criteria

- Primary: after approval, every user's and `__master__`'s `KITCHEN_COURSES` contains exactly the approved list, and every recipe and dish `course` is either an approved key or `''`.
- Primary: new users are seeded with the approved list only.
- Success: no validation errors, no raw keys in the UI, a backup and mutation log exist, and local is verified before Atlas.

## Execution Mode

- Parallel: no
- Concurrent plans: none touching `metadata-registry.service.ts` or the course data. Run after plan 375 (Dish types: remove colors).
- Isolated DB: yes (data migration)

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
server/scripts/cleanup-dish-types.js
server/test/**
src/app/core/services/metadata-registry.service.ts
src/app/core/services/metadata-registry.service.spec.ts
src/app/pages/recipe-builder/components/recipe-header/**
src/app/pages/recipe-book/components/recipe-book-list/**
scripts/migrate-labels-to-courses.mjs
.claude/reports/dish-types-cleanup/**
server/services/seed-master.js
src/app/shared/list-shell/list-shell.component.scss
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

As a chef, I want the dish-type list to contain real dish types only, without losing or breaking any recipe.

## Functional Requirements

### Must Have (P0)
- [ ] A0 gate (above) passed, with the approved mapping recorded.
- [ ] `server/scripts/cleanup-dish-types.js` (CommonJS):
  - Uses `server/migrations/tools/_connect.js` (`--target=local|atlas`, Atlas requires `--confirm-host`).
  - Dry-run by default; writes only with `--write=true`.
  - Refuses to write unless a fresh `db-backup.js` snapshot path is passed (`--backup=<path>` that exists and is under 24h old).
  - For every `userId` (including `__master__`):
    - (1) Replace `KITCHEN_COURSES.items` with the approved keys, preserving existing item objects for kept keys, adding missing kept keys, dropping removed and merged ones.
    - (2) recipes and dishes: map `course` per the approved table. Merge targets apply by collection where specified (dessert merges only in dishes). Removed → `''`, or the label option (b) if chosen.
  - Sets `updatedAt` and leaves `_userModified` as is.
  - Writes a JSON mutation log to `.claude/reports/dish-types-cleanup/<target>-<timestamp>.json`, plus a per-value count summary to stdout.
  - Idempotent: a second run makes 0 changes.
- [ ] Code seed: `DEFAULT_COURSES` = the approved list (plus `main_dish`). `COURSE_STRINGS` in `scripts/migrate-labels-to-courses.mjs` gets the same list.
- [ ] Dictionary: append `main_dish` = "מנה עיקרית" if missing. Do not delete any existing course keys (old versions and trash must still render Hebrew).
- [ ] Safe display: wherever `course` is shown or selected (recipe-header course select, recipe-book filter and labels), a value not in the registry displays as "ללא" (key `no_course`) instead of a raw key and doesn't crash the select.
- [ ] Order of execution, documented in session state: backup local → dry-run local → Dandan reviews counts → `--write` local → verify app → backup Atlas → dry-run Atlas → `--write` Atlas (Dandan runs the Atlas steps or explicitly approves them).

### Should Have (P1)
- [ ] Server test for the pure mapping function (`mapCourse(value, collection, mapping)`), covering keep, merge, dish-only merge, remove and unknown.

### Nice to Have (P2)
- None.

## UI/UX Notes

- No UI change apart from the shorter list and safe "ללא" display.

## Atomic Sub-tasks

- [x] A0: Decision gate: show the table and the a/b question, then STOP. (Dandan 2026-10-10: preparation categories and `soups_stocks_cooking_liquids` KEPT; Q4 = a (clear); Atlas = b (Worker, after explicit approval). Mechanics redone on `taxonomyTerms`; `approved: server/services/seed-master.js`. Final mapping: `MAPPING` in `server/scripts/cleanup-dish-types.js`.)
- [x] A1: Pure mapping module plus test; script with dry-run, backup check and log (`server/scripts/cleanup-dish-types.js`, `server/test/**`).
- [x] A2: Dry-run local; show counts to Dandan; STOP for go. (Go 2026-10-10 after two more keeps: dessert categories stay for preparations, `stews_cookery` stays.)
- [x] A3: Code seed lists, dictionary `main_dish`, safe display (`metadata-registry.service.ts`, `scripts/migrate-labels-to-courses.mjs`, `recipe-header/**`, `recipe-book-list/**`).
- [x] A3b: List pages could not scroll (table and filter panel cut off at the screen edge) — `.table-area` gets `min-block-size: 0` in `list-shell.component.scss` (Dandan approved 2026-10-10; cause: `overflow: clip` from d7c69ca0).
- [x] A4: `--write` on local; verify in app (recipe book filters, recipe builder select, metadata list).
- [x] A5: Hand Dandan the exact PowerShell commands for the Atlas backup, dry-run and write; record results. Update session-state.

## Technical Considerations

- Dependencies: `server/scripts/db-backup.js`, `server/migrations/tools/_connect.js`, `MetadataRegistryService`, `RecipeHeaderComponent`, `RecipeBookListComponent`.
- New files: `server/scripts/cleanup-dish-types.js`, its test, the report folder.
- Model changes: none (`course` stays an optional string).
- Never use the app's "delete for everyone" for these values (it blanks instead of remapping).
- Data-migration surface: bulk writes across all users — backup gate and dry-run are mandatory.

## Out of Scope

- Legacy import mappings (`server/scripts/legacy-import/lib/mappings.js`) that originally produced these values. Note in session state: re-running legacy import would reintroduce them.
- Label cleanup.

## Critical Questions

- Removed values on preparations: a) clear + report (default) / b) convert to a label. Asked at A0.
- Who runs the Atlas write:
  a) Dandan, with the commands provided (default)
  b) The Worker, after explicit approval

## Success Criteria

- [auto] Server tests for the mapping module → 0 failures.
- [auto] Local: `node server/scripts/cleanup-dish-types.js --target=local` (dry-run) prints counts; after `--write=true --backup=<path>`, a second dry-run prints 0 changes.
- [auto] `npm run build` → exit 0.
- [human] Metadata → סוגי מנות shows only the approved list. Recipe-book course filter shows only approved values. A recipe that had "רוטב בשר" shows "ללא" (or the label, if b). A dish that had "עוגות" shows "קינוחים".
- [human] Restoring an old version or trash item with a removed value shows Hebrew or "ללא", never a raw key.
