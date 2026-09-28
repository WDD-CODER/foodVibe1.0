# Plan 319 — Label Audit Report (read-only)

## Problem Statement
Migrated labels are invisible in the recipe editor's label picker even though they appear to exist on recipes. We need a read-only diagnostic that explains why (registry mismatch, Hebrew/English key mismatch, or userId scoping) and proposes merge clusters for near-duplicate label strings (e.g. "dairy prep" vs "dairy") — without touching any data or app code.

## Goals & Success Criteria
- Primary: produce `.claude/reports/label-audit/report.md` + `data.json` with Sections A–E fully populated from the real target DB (local by default, `--remote` for Atlas).
- Success: report states, with counts, which of the three causes (missing from registry / Hebrew-English mismatch / registry-userId mismatch) applies to which orphan labels, and includes the "dairy prep" (25 recipes) / "dairy" cluster explicitly.

## Functional Requirements

### Must Have (P0)
- [ ] Verify the drop mechanism first (no edits): confirm `recipe-book-list.component.ts` reads raw `labels_`/`autoLabels_`, and that `recipe-form.service.ts` (`normalizeLabelKeys`, `buildRecipeFromForm`) drops unregistered labels. Report any mismatch found vs. this assumption before writing the script.
- [ ] `scripts/audit-labels.mjs` — read-only, ESM, single quotes, no semicolons, matching `scripts/fix-duplicate-names.mjs` style (MongoClient + dotenv setup, credential masking in the connection log). No `--write` flag; only `find()` queries, never mutations.
- [ ] Flags: `--remote` (Atlas, resolved as `MONGO_REMOTE_URI || MONGO_URI` — matches `migrate-to-master.mjs`) / default local (`MONGO_LOCAL_URI`); `--userId=<id>` optional filter. Print which env var name was used (never the value) plus the masked host at startup.
- [ ] Section A (registry): read `KITCHEN_LABELS`, group by `userId` (including `__master__`), list key/color/autoTriggers per label.
- [ ] Section B (usage): scan `RECIPE_LIST` + `DISH_LIST` for distinct strings in `labels_`/`autoLabels_` — field, recipe count, userIds involved, plus up to 3 sample entries per orphan string (recipe name, `_id`, `userId`, collection). Also enumerate other top-level array-of-string fields (`tags`, `categories`, etc.) as a flag for possibly-migrated labels.
- [ ] Section C (classification): per string — `registered` (exact key match, same userId) / `registered-via-translation` (dictionary-only match) / `registered-other-user` (exists only under another user's or `__master__` registry) / `orphan`. Orphan rows carry the same up-to-3-sample-entries as Section B so each is traceable in the app.
- [ ] Section D (merge clusters): normalize (trim, lowercase, collapse whitespace, `-`/`_` → space, strip Hebrew niqqud), cluster by identical normalized form, word-subset, Hebrew/English dictionary equivalence, and Levenshtein ≤ 2. Per cluster: members + counts, proposed canonical (prefer registered, else higher count), recipes carrying >1 member.
- [ ] Section E (orphan evidence): count only ingredients with `type === 'product'`, look up `referenceId` in `PRODUCT_LIST` scoped to the same `userId` as the recipe (matches `computeAutoLabels` in `recipe-form.service.ts` — sub-recipe ingredients are excluded, same as the app). Report per orphan: how many of its recipes have a `categories_`/`allergens_` match against an existing label's `autoTriggers`. Note explicitly in the report that sub-recipe ingredients are excluded, as in the app.
- [ ] Write `.claude/reports/label-audit/report.md` (tables, sorted by count) and `.claude/reports/label-audit/data.json`.
- [ ] Verify step: after the run, confirm all three output files exist (`Test-Path`, PowerShell-compatible), and check `.gitignore` for `.claude/reports/` — report whether the audit output is ignored or would be committed. (`.gitignore` currently ignores only `.claude/reports/mobile-audit/.credentials.json` and `.claude/reports/render-audit/.credentials.json`, not the directory itself — so `label-audit/report.md`/`data.json` would be tracked unless added to `.gitignore`.)
- [ ] Before running `--remote`: print the masked host and ask the Human to confirm it's the DB the app uses. Wait for confirmation, then run `node scripts/audit-labels.mjs --remote` and produce a 10-line summary: total distinct strings, orphan count, cluster count, top 10 orphans by recipe count, plus the exact "dairy prep" and "dairy" rows.

### Out of Scope
- Any fix, merge, or registry/recipe mutation — a separate brief after Human reviews this report.
- Any change under `src/` (this is growth-frozen territory per the brief; label audit is DB + `scripts/` only).

## UI/UX Notes
N/A — no UI changes, read-only backend/script diagnostic.

## Atomic Sub-tasks
- [x] A1: Read `label.model.ts`, `metadata-registry.service.ts` (initMetadata / reloadLabelsFromStorage / registerLabel / KITCHEN_LABELS), `recipe-form.service.ts` (normalizeLabelKeys / buildRecipeFromForm / computeAutoLabels), `recipe-header.component.ts` (labelMultiSelectOptions_), `recipe-book-list.component.ts` (getAllRecipeLabels / filterCategories_ / filteredRecipes_ Labels branch), `translation.service.ts`, `server/constants/cloneable-types.js` (KITCHEN_LABELS / `__master__`). Confirm or refute the stated drop mechanism; report findings. **Confirmed**, plus found an asymmetry: `buildRecipeFromForm` (save) is exact-key-only, `normalizeLabelKeys` (load) allows a translation-dictionary match too.
- [x] A2: Write `scripts/audit-labels.mjs` implementing Sections A–E per the Functional Requirements above (remote URI = `MONGO_REMOTE_URI || MONGO_URI`, env-var-name-only logging, product-only Section E scoped by userId, up-to-3 sample entries per orphan), modeled on `scripts/fix-duplicate-names.mjs`'s connection/masking pattern. Added a public-DNS-resolver fallback for environments where the local resolver refuses direct `mongodb+srv://` SRV queries (Node-specific; OS resolver worked fine).
- [x] A3: Before `--remote`, print the masked host and get Human confirmation it's the app's DB. Then run `node scripts/audit-labels.mjs --remote`, generate `report.md` + `data.json` under `.claude/reports/label-audit/`. Human confirmed `cluster0.objqrlt.mongodb.net` is the live DB; run completed successfully.
- [x] A3b: Verify output — `Test-Path` all three files, check `.gitignore` for `.claude/reports/` coverage, report ignored/tracked status to the Human. `report.md`/`data.json` exist (`Test-Path` true); `.gitignore` only excludes `.claude/reports/{mobile,render}-audit/.credentials.json`, not `label-audit/` — files would be committed if staged.
- [x] A4: Post the 10-line summary (total distinct strings, orphan count, cluster count, top 10 orphans by count, "dairy prep"/"dairy" rows) plus `report.md` contents to the Human. Stop — no fixes. Posted 2026-09-28; Human validated (`done`). Note: real stored key is `dairy_prep` (underscore), 25 recipes/userId, orphan; clusters with registered `dairy` (canonical) + `dairy_sauce`.

## Technical Considerations
- Dependencies: `KITCHEN_LABELS` collection, `RECIPE_LIST`, `DISH_LIST`, `dictionary.json` (via `translation.service.ts` or direct read) for Hebrew/English matching, ingredient `categories_`/`allergens_` for Section E.
- New files needed: `scripts/audit-labels.mjs`, `.claude/reports/label-audit/report.md`, `.claude/reports/label-audit/data.json`.
- Model changes: none.
- Hebrew canonical values: audit-only — read canonical Hebrew label strings from the registry/dictionary for clustering; do not write or propose canonical-resolution UX (that's a future fix brief).

## Critical Questions
None — brief is fully specified (flags, sections, output paths, classification rules, done-when criteria).

## Verify
- `git status` shows only `scripts/audit-labels.mjs`, `.claude/reports/label-audit/report.md`, `.claude/reports/label-audit/data.json` as new — no changes under `src/`, no Mongo writes.
- `report.md` contains Sections A–E, states counts for each of the three failure causes, and includes the "dairy prep" (25 recipes) row and its cluster with "dairy" if one exists.
- Script run against Atlas (`--remote`) actually connects (fail loud if `.env`/clone/DB access fails — no guessing); report states which env var (`MONGO_REMOTE_URI` or `MONGO_URI`) and masked host were used, never the raw connection string.
- Every orphan row in Sections B/C carries up to 3 sample entries (recipe name, `_id`, `userId`, collection) the Human can open in the app.
- Output confirms whether `.claude/reports/` is `.gitignore`d or would be committed.
