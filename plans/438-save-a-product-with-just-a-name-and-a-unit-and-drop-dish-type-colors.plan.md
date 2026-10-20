# Plan 438 — Save a product with just a name and a unit, and drop dish-type colors

Status: draft
Track: code
Snapshot: 8ffda3d2c4d8f3ab5137bfee30e9d80026d28110

## Problem Statement
Spec 02.1 (lean entry). A chef who is building a menu fast has to stop on every new product: the product form
blocks the save until it has a price, at least one category and a waste factor
(`product-form.component.ts` `initForm()` validators ~L375-388 and `validateForm_()` ~L860-868). Most of those
values are not known at entry time, so chefs either type fake numbers (which then poison costs) or give up.
The rule (Dandan, 2026-10-20): **a product needs a name and a base unit — nothing else.** Price, category,
supplier and waste factor are optional; the waste factor defaults to 1 (already the form default).

Second part of the same spec: dish types (taxonomy kind `course`) still *require* a color in the shared schema
(`shared/schemas/entities/taxonomy-term.schema.ts` L109). The client hides it and sends a fake constant
(`COURSE_NEUTRAL_COLOR`, `metadata-registry.service.ts:16`, used at :154 and :273) and the server seed still
writes palette colors (`server/services/seed-master.js` L74/L106). The color has no meaning any more (plan 375);
it must go from the schema and the seed. The colors already stored on Atlas are removed by migration 0007
(plan 440), which touches the same `taxonomyTerms` collection anyway; this plan only makes `color` optional so
those stored values stay valid until then.

Product without category shows a blank category cell in the inventory list today; spec 02.1 says it is listed
under "כללי" (shopping lists already fall back to `'כללי'` in `menu-export.service.ts` / `recipe-export.service.ts`).

"לא סגור סופית" / "partial" labels are **not** in this plan — they arrive with plan 444 (spec 03.3).

## Goals & Success Criteria
- Primary: a product with only a name and a base unit saves from `/inventory/add`; nothing else is required.
- Primary: a dish type is stored and seeded without a color; the schema no longer requires one.

Done when:
- [auto] `npx ng build` passes.
- [auto] `git diff --numstat origin/mvp -- src/app/pages/inventory/components/product-form/product-form.component.ts`
  shows deletions ≥ insertions (growth-frozen file, net ≤ 0; base branch per MVP run mode).
- [auto] `npx ng test --watch=false --include='src/app/pages/inventory/components/product-form/**' --include='src/app/core/services/metadata-registry.service.spec.ts' --include='src/app/pages/inventory/components/inventory-product-list/**'`
  passes, including the new/changed specs:
  - product form: name "בצל ירוק" + base unit `kg`, price empty, no category → `saveAndWait()` resolves `true`
    and `KitchenStateService.saveProduct` is called with `sources: []`, `categories: []`, `yieldFactor: 1`;
  - product form: empty name → `saveAndWait()` resolves `false` with `validationErrors_().productName === 'field_name_required'`;
    no base unit → `validationErrors_().baseUnit === 'field_unit_required'`; neither `buy_price_global_` nor
    `categories` ever appears in `validationErrors_()`;
  - metadata registry: `registerCourse('brunch')` posts a body with no `color` key (replaces the old
    "same neutral color" test);
  - inventory list: a product with `categories: []` shows `כללי` in its category cell.
- [auto] `npm --prefix server test` passes, including the new tests in `server/test/taxonomy-term-schema.test.js`:
  `{ kind: 'course', key: 'starter' }` → valid; `{ kind: 'course', key: 'starter', color: '#3B82F6' }` → still
  valid (legacy stored docs); `{ kind: 'course', key: 'k', color: 'blue' }` → still invalid; and in
  `server/test/seed-master-taxonomy.test.js`: after `seedMasterTaxonomy()` no `course` term has a `color` field.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] Desktop: `/inventory/add` → type name "בצל ירוק", choose base unit "ק"ג", leave price, category and
  everything else empty → «שמור». The product saves, you land on the inventory list, and the new row shows
  category "כללי".
- [human] Mobile (phone width): same steps on `/inventory/add` → it saves; no red "required" message appears under
  price or category.
- [human] Desktop: `/inventory/add` with an empty name → «שמור» → the red "name required" message shows and
  nothing saves. Same with a name but no unit → the red "unit required" message.
- [human] Desktop + mobile: dashboard → Metadata tab → «סוגי מנה» card → add "בראנץ'" → it is added, no color
  dot or color picker anywhere in the card.

## Execution Mode
- Parallel: no against 423, 428 and 444 (all write `product-form.component.ts`), against 424/425 (this plan
  edits `shared/schemas/**`), against 431 and 436 (`server/services/seed-master.js`), against 436 and 440
  (`taxonomy-term.schema.ts`), against 421 (`metadata-registry.service.ts` + spec) and against 432 and 444
  (`inventory-product-list.component.ts`). Yes against everything else.
- Concurrent plans: none required; lane wt-3 runs 420, 421 → 438 → 439.
- Isolated DB: no — no stored data is rewritten (the schema only gets looser; seed changes apply to an empty DB only).

## Execution Notes
- Depends on: plan 423 merged (it rewrites the unit parts of `product-form.component.ts`; this plan edits the
  validators in the same file).
- Must not run at the same time as: 423, 428, 444 (`product-form.component.ts`); 424, 425 (`shared/schemas/**`);
  431, 436 (`seed-master.js`); 436, 440 (`taxonomy-term.schema.ts`); 421 (`metadata-registry.service.ts`);
  432, 444 (`inventory-product-list.component.ts`).
- MVP run mode: executed unattended into branch `mvp` per `docs/mvp/run-mode.md` — Atlas steps (incl. 'go 0007' / 'go 0008') are rehearsed on a scratch copy and deferred to the final gate; [human] items become validation cards in `docs/mvp/runs/<NNN>.md`.- `product-form.component.ts` is growth-frozen (`_shared/tech-stack.md:26-28`): this plan's net line change in that
  file must be ≤ 0. It only removes validators and two `validateForm_()` lines, so no extraction is needed.
- Course colors already stored on Atlas: left in place here (schema accepts them as optional); migration 0007
  (plan 440) unsets them. Nothing reads them.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/inventory/components/product-form/product-form.component.ts
src/app/pages/inventory/components/product-form/product-form.component.html
src/app/pages/inventory/components/product-form/product-form.component.spec.ts
src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.ts
src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.spec.ts
src/app/core/services/metadata-registry.service.ts
src/app/core/services/metadata-registry.service.spec.ts
shared/schemas/entities/taxonomy-term.schema.ts
server/services/seed-master.js
server/test/taxonomy-term-schema.test.js
server/test/seed-master-taxonomy.test.js
public/assets/data/dictionary.json
docs/brain/gotchas/backend.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-4: preserves — the course shape stays in the one Zod schema (`taxonomy-term.schema.ts`), `color` becomes
  optional there and the server keeps validating every write against it (`npm run build:schemas` regenerates the
  server copy). A malformed color is still rejected.
- INV-5: preserves — dish types stay `course` terms in `taxonomyTerms`, a separate axis from labels and protein;
  only the color field goes. `metadata-registry.service.ts` keeps going through `TaxonomyStore`.
- INV-2: preserves — (rule as rewritten by plan 424 / ADR 0023) `seed-master.js` still seeds the shared default dish
  types once on an empty database; only the color is dropped from what it writes. No business's own terms change.

## Step 0 — Reality Check

Runs always (plan 423 rewrites `product-form.component.ts`; plans 424/425 touch `seed-master.js` and the schemas).
Check by symbol and print one line each, `ok` or `conflict: <what>`:
`initForm` (validators for `buy_price_global_`, `categories`, `yieldFactor`), `validateForm_`, `saveAndWait` in
`product-form.component.ts`; the `field_price_required` / `field_category_required` spans in
`product-form.component.html`; `getCategoryDisplay` in `inventory-product-list.component.ts`; `COURSE_NEUTRAL_COLOR`,
`registerCourse` and the `kind === 'course'` branch of `pushRegistryRenameToMaster` in `metadata-registry.service.ts`;
the `kind: z.literal('course')` member in `taxonomy-term.schema.ts`; `DEFAULT_COURSES` / `KITCHEN_COURSES` in
`defaultMasterRegistries()` in `seed-master.js`. All `ok` → continue; STOP for a go only on a `conflict`.

## User Stories
- As a chef, I want to add a product with just its name and unit so that I can keep building my recipe and fill
  in price and category later.
- As a chef, I want a product without a category to appear under "כללי" so that it is never lost in a list.
- As a chef, I want to add a dish type without being asked about colors so that the list stays simple.

## Functional Requirements

### Must Have (P0)
- [ ] Product form saves with name + base unit only; price, category, supplier, waste factor optional; waste
  factor defaults to 1 (unchanged default).
- [ ] Name required (with the existing duplicate-name check) and base unit required stay exactly as today.
- [ ] Product with no category shows "כללי" in the inventory list category cell.
- [ ] `course` terms: `color` optional in the schema, never written by the client, never seeded.
- [ ] Gotcha "Course terms must carry a color" replaced so nobody re-adds the constant.

### Should Have (P1)
- none

### Nice to Have (P2)
- none

## UI/UX Notes
- No layout change. The price and category fields stay where they are; only their red "required" messages go.
- RTL: no new CSS.
- Dictionary (append to `general`): `"category_general": "כללי"`.
- No new Lucide icons.

## Atomic Sub-tasks
- [ ] A1: Let a product save with only a name and a base unit — drop required on buy_price_global_ (keep min 0) and categories (keep the control, no minLength), drop the two validateForm_ lines for price and category, remove the two error spans in the template; net lines in the .ts ≤ 0; specs for the cases in Done-when — src/app/pages/inventory/components/product-form/product-form.component.ts, product-form.component.html, product-form.component.spec.ts
- [ ] A2: Show products without a category under "כללי" in the inventory list — getCategoryDisplay returns translate('category_general') when the joined text is empty; add the dictionary key; spec — src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.ts, inventory-product-list.component.spec.ts, public/assets/data/dictionary.json
- [ ] A3: Stop requiring a color on dish types in the shared schema — course member: `color: colorSchema.optional()` with a `/** @deprecated never written since plan 438; stored values removed by migration 0007 */` comment; run npm run build:schemas; schema tests — shared/schemas/entities/taxonomy-term.schema.ts, server/test/taxonomy-term-schema.test.js
- [ ] A4: Stop sending a fake color when a dish type is added or shared — delete COURSE_NEUTRAL_COLOR and pass `{}` in registerCourse and the course branch of pushRegistryRenameToMaster; replace the neutral-color spec with "no color key" — src/app/core/services/metadata-registry.service.ts, metadata-registry.service.spec.ts
- [ ] A5: Seed dish types without colors on a fresh database — KITCHEN_COURSES items become `{ key }`; delete LABEL_COLOR_PALETTE (only the course seed used it); seed test asserts no course color — server/services/seed-master.js, server/test/seed-master-taxonomy.test.js
- [ ] A6: Replace the "course terms must carry a color" gotcha with what is true now — short entry: plan 438 made color optional and stopped writing it, migration 0007 (plan 440) unsets stored colors, never re-add a constant — docs/brain/gotchas/backend.md
- [ ] A7: Build, run specs and server tests, check the error log, then hand over the app checks — ng build, git diff --numstat on the frozen form, ng test (listed specs), npm --prefix server test, log-query — this plan file

## Technical Considerations
- Dependencies: `KitchenStateService.saveProduct` (unchanged), `TaxonomyStore.add` (extras typed from the schema —
  `{}` is valid once `color` is optional), `buildTerms` from migration 0003 (its `defined({ color })` already drops
  an undefined color).
- New files needed: none.
- Model changes: `TaxonomyTermOf<'course'>` gets `color?: string` (generated from the schema). `CourseDefinition`
  already has `color?` deprecated — unchanged.
- Backend / API: none beyond the looser schema.
- Auth and validation: unchanged; the server still validates every term write.
- Security surface: none.
- Data / migration: none here. Stored course colors are removed by migration 0007 (plan 440).
- Project checks (`docs/agent/plan-checks.md`): log-query Done-when present; chef-side stories; one new dictionary
  key listed; no new CSS (RTL unaffected); no new icons; hotspot `dictionary.json` append-only.

## Backend Impact
- Collections affected: `taxonomyTerms` (schema for `kind: 'course'` loosened; seed for an empty DB changed);
  `products` (no schema change — `sources`, `categories`, `yieldFactor` already accept empty / default values).
- New collections: no.
- Server changes needed: yes — `seed-master.js` stops writing course colors; generated schemas rebuilt.

## Out of Scope
- "לא סגור סופית" on a product without price and the "partial" recipe cost (plan 444, spec 03.3).
- Removing stored course colors from Atlas (migration 0007, plan 440).
- `server/scripts/cleanup-dish-types.js` (a finished one-off script; it may keep writing the old constant, which the
  optional schema still accepts).
- Label colors (labels keep their color).
- Bulk product import (plan 432), the price lock (plan 428).

## Critical Questions
none
