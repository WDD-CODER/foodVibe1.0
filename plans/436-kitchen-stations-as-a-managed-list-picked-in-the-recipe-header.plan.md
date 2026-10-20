# Plan 436 — Kitchen stations as a managed list, picked in the recipe header

Status: draft
Snapshot: 8ffda3d2c4d8f3ab5137bfee30e9d80026d28110
Track: code

## Problem Statement
Prep sheets "by station" (spec 04.3) cannot work today. There is no station list: `defaultStation` is a free string
on every recipe and dish (`recipe.schema.ts`), the recipe builder has no station field, and
`RecipeFormService.buildRecipeFromForm` writes `defaultStation: ''` on every save, wiping any value. The by-station
checklist groups with `recipe.defaultStation ?? 'כללי'` in `menu-export.service.ts` (three places), which does not
catch `''`, so every recipe lands in an unnamed group. There is no taxonomy kind for stations
(`TAXONOMY_KINDS` in `taxonomy-term.schema.ts`), so the owner cannot manage them in the metadata manager.

## Goals & Success Criteria
- Primary: stations are a taxonomy kind with the defaults חם, קר, מאפה, קינוחים, הגשה; the owner adds, renames and
  removes his own stations in the metadata manager; the chef picks a station in the recipe header and it is saved;
  a recipe without a station groups under "כללי".

Done when:
- [auto] `npx ng build` exits 0.
- [auto] `npm --prefix server test` passes (0 failures), including new cases:
  - `taxonomy-term-schema.test.js`: a plain `{ kind: 'station', key: 'חם' }` term is valid; a station with `color` is rejected.
  - `seed-master-taxonomy.test.js`: `ensureDefaultStations()` on a database whose master terms exist but have no
    station inserts exactly 5 master `station` terms with keys `חם, קר, מאפה, קינוחים, הגשה` (sortOrder 0–4), each
    passing `parseV2('taxonomyTerms', …)`; a second run inserts 0; when any master `station` term exists it inserts 0.
  - `taxonomy-terms-api.test.js`: renaming a user's own `station` term `גריל` → `גריל פחמים` re-keys
    `defaultStation` on that user's recipes and dishes in the same request; deleting a station still used by a
    recipe returns 409 with `referencedBy`.
- [auto] `npx ng test --watch=false --include='src/app/core/services/station-registry.service.spec.ts' --include='src/app/pages/metadata-manager/components/station-manager/**/*.spec.ts' --include='src/app/pages/recipe-builder/components/recipe-header/**/*.spec.ts' --include='src/app/pages/recipe-builder/services/recipe-form.service.spec.ts'`
  passes (0 failures), including: `buildRecipeFromForm` with `default_station: 'קר'` saves `defaultStation: 'קר'`;
  with an unknown key saves `''`; `patchFormFromRecipe` fills `default_station` from `recipe.defaultStation`; the
  header's station options start with `{ value: '', label: 'general_group' }` and list the station keys; choosing
  the add option opens the add window prefilled with the typed name and selects the stored key after save.
- [auto] `git grep -n "defaultStation ?? 'כללי'" -- src` → no output; `git grep -c "defaultStation || 'כללי'" -- src/app/core/services/menu-export.service.ts` → `3`.
- [auto] `git diff --numstat origin/main...HEAD -- src/app/pages/recipe-builder/recipe-builder.page.ts src/app/core/services/menu-export.service.ts`
  shows added ≤ deleted for both (growth-frozen).
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] Stations list, station picker and by-station grouping work on desktop and on a phone (cards ①–④ below).
- [human] After `mvp` merges to `main` (final gate) and the Render deploy, the five default stations appear in the metadata manager on the
  production app (the boot seed ran once on Atlas).

Human checks (written for the hand-off cards):
1. **Default stations** — `/dashboard?tab=metadata` → section "תחנות עבודה". SEE ✓ חם, קר, מאפה, קינוחים, הגשה
   (shared — tapping one says only an admin can change it).
2. **Add, rename, remove your own** — same section: type "גריל" → הוסף; tap it, rename to "גריל פחמים"; then remove
   it. SEE ✓ each step saved with a success message; removing a station a recipe uses is refused with the recipe's name.
3. **Pick a station in a recipe** — `/recipe-builder/<id of a dish>` → header field "תחנה" → "קר" → save → reload.
   SEE ✓ the field still shows "קר". On a phone: the same field is reachable and the list opens.
4. **Grouped by station** — a menu with that dish and one dish without a station → FAB "צ׳קליסט והדפסות" → צ׳קליסט
   "לפי תחנה" → תצוגה. SEE ✓ the dish's preps under "קר"; the dish without a station under "כללי"; no unnamed group.

## Execution Mode
- Parallel: no with 424 and 425 (this plan edits `shared/schemas/**`); no with 438 and 440 (both edit
  `taxonomy-term.schema.ts`; 438 and 440 also edit `seed-master.js`); no with 421 and 441 (both edit
  `metadata-manager.page.component.ts`); no with 434, 435, 437 (`menu-export.service.ts`). Run
  `node scripts/scope-check.mjs --overlap --plan=<this>` against 439's recipe-builder work at take time.
- Concurrent plans: other lane-1 / lane-3 plans not listed above.
- Isolated DB: yes — the boot seed writes master `station` terms; run the slot on its own DB
  (`node scripts/slot-serve.mjs`), never against Atlas from a slot.

## Execution Notes
- Depends on: plan 434 merged.
- Lane wt-2: 423 → 433 → 434 → 435 → **436** → 437 → 430.
- Must not run at the same time as: 434, 435, 437 (`menu-export.service.ts`); 424, 425 (`shared/schemas/**`); 438,
  440 (`taxonomy-term.schema.ts`, `seed-master.js`); 431 (`seed-master.js`); 421, 441 (`metadata-manager.page.component.ts`) — 438, 440,
  421 and 441 are an addition to the map's hotspot list.
- Unblocks 437 (prep sheets by station).
- Decision (Planner review): Q1 → option a — the five defaults stay shared master terms; the owner adds, renames
  and removes his own stations next to them — why: same model as every other taxonomy kind, smallest change;
  per-business editable copies would need plan 425's business-creation hook plus a backfill for existing businesses.
- MVP run mode: executed unattended into branch `mvp` per `docs/mvp/run-mode.md` — Atlas steps are rehearsed on a
  scratch copy and deferred to the final gate; [human] items become validation cards in `docs/mvp/runs/<NNN>.md`.
  Under run mode every `origin/main` in a Done-when command reads `origin/mvp`.
  The boot seed of the five master stations reaches Atlas only when `mvp` merges to `main` at the final gate (then the
  Render deploy runs it once); until then it runs only on the slot's local DB.
- Tenancy: if plans 424/425 merged first, master terms carry `businessId: '__master__'` and `createdBy` (C-SCOPE);
  `ensureDefaultStations` writes the same owner fields as the other master terms on `origin/main` at take time.
- Permissions: until plan 427 merges every signed-in user counts as owner. If
  `src/app/core/services/permission.service.ts` (plan 428) exists at take time, hide the add option and the
  manager's add/rename/remove for a user where `permission.can('editTaxonomy', …)` is false for kind `station`.

## Contracts (verbatim from the approved MVP map)

**C-SCOPE (424/425)**
- Every business doc gets `businessId: string` and `createdBy: string` in `baseDocShape`. Master docs: `businessId: '__master__'`. Migration 0006 sets `createdBy = userId` and `businessId` = the user's business (master: `'__master__'`). Plan 425 stops using `userId` for scoping; the stored `userId` stays (optional in schema, never read for scope).
- `server/utils/business-scope.js` exports `MASTER_BUSINESS_ID = '__master__'`, `scopeFilter(req)` → `{ businessId: req.user.businessId }`, `readScope(req, type)` → taxonomy: `{ businessId: { $in: [bid, '__master__'] } }`, others `scopeFilter(req)`; anonymous → `{ businessId: '__master__' }`; `stampNew(req, doc)` → sets `businessId`, `createdBy = req.user.userId`, `createdAt`.
- Indexes re-led by `businessId` (taxonomy unique `{kind, key, businessId}`).

**C-PERM (427; client mirror 428)**
- `server/utils/permissions.js`: `can(user, action, { type, doc?, patch? }) → { ok: true } | { ok: false, reason }` and `assertCan(req, res, action, ctx)` → sends 403 `{ error: 'FORBIDDEN', messageKey: 'no_permission' }` (Hebrew "אין לך הרשאה לפעולה הזו").
- Actions: `create`, `edit`, `delete`, `editMoney`, `changeStage`, `addNote`, `markArrival`, `manageTeam`, `editSettings`, `editTaxonomy`.
- Rules: owner → all in own business. Staff → create all entity types; edit/delete only `doc.createdBy === user.userId`; `editMoney`, `manageTeam`, `editSettings`, `editTaxonomy` (eventType, menuType, station) never; `changeStage` only on events they created; `addNote`, `markArrival` on any event. A staff-created product is saved with money fields stripped.
- Money fields: `shared/schemas/money-fields.ts` exports `MONEY_FIELDS: Record<type, string[]>` — products: `sources[].price`, `purchaseOptions[].priceOverride`; menuEvents: `pricePerGuest`, `extraCosts`, `targetsOverride`, `deposit`, `closing.suppliers[].actualPaid`, `closing.actualExtraCosts`, `closing.actualRevenue`; businesses: `settings`, `baseline`. Later plans that add a money field append it here.
- Client: `src/app/core/services/permission.service.ts` `can(action, ctx): boolean` (computed from user signal); UI hides/locks by the same rules; server decides.
- Before 427 merges: every signed-in user counts as owner.

### Contract extension this plan adds
- Taxonomy kind `station` (plain, no extra fields). Keys are the Hebrew names themselves (as `sectionCategory` names
  and the Hebrew `course` keys `רוטב`, `גלייז` already are) — no dictionary entry per station. `TERM_REFERENCES.station
  = { recipes: ['defaultStation'], dishes: ['defaultStation'] }`. `Recipe.defaultStation` holds a station key or `''`
  (shown as "כללי", key `general_group` from plan 434). Plan 437 groups by this key.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
shared/schemas/entities/taxonomy-term.schema.ts
server/services/seed-master.js
server/test/taxonomy-term-schema.test.js
server/test/seed-master-taxonomy.test.js
server/test/taxonomy-terms-api.test.js
src/app/core/services/station-registry.service.ts
src/app/core/services/station-registry.service.spec.ts
src/app/core/services/breadcrumbs.md
src/app/core/services/menu-export.service.ts
src/app/pages/metadata-manager/components/station-manager/**
src/app/pages/metadata-manager/metadata-manager.page.component.ts
src/app/pages/metadata-manager/metadata-manager.page.component.html
src/app/pages/recipe-builder/components/recipe-header/**
src/app/pages/recipe-builder/services/recipe-form.service.ts
src/app/pages/recipe-builder/services/recipe-form.service.spec.ts
src/app/pages/recipe-builder/recipe-builder.page.ts
public/assets/data/dictionary.json
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-2: preserves — the default stations are shared master terms read by everyone, and each user (each business
  after 424/425) adds his own next to them, exactly like every other taxonomy kind; nothing a user could customize
  is removed. The boot seed only inserts master terms when none of kind `station` exist.
- INV-3: preserves — renaming a station re-keys `defaultStation` on the server in one request
  (`renameTermEverywhere` via `TERM_REFERENCES`); deleting a used station is blocked by the server (409). The client
  never loops writes.
- INV-4: preserves — the new kind is declared in the Zod schema (`TAXONOMY_KINDS`, `plainKinds`); the server keeps
  validating every term write against it.
- INV-5: preserves — stations live in `taxonomyTerms` as their own kind (a separate axis), read through
  `TaxonomyStore` by a thin `StationRegistryService` facade like `EquipmentCategoryRegistryService`.

## Step 0 — Reality Check
Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check by symbol: `TAXONOMY_KINDS`, `plainKinds`,
`TERM_REFERENCES` in `taxonomy-term.schema.ts` (438 may have removed course `color`, 440 may have added
`coefficient` — rebase onto them, keep their changes); `seedMasterData`, `seedMasterTaxonomy` in `seed-master.js` and
the owner fields of master terms (424/425: `businessId`, `createdBy`); `renameTermEverywhere`, `findTermReferences`
in `generic.js`; `TaxonomyStore.terms/add/updateByKey/removeByKey/canEdit/errorMessage`; `recipeForm_` (the
`course` control) and `getRecipeSnapshotForComparison` (its `normalized` object) in `recipe-builder.page.ts`; `buildRecipeFromForm`
(`defaultStation: ''`) and `patchFormFromRecipe` in `recipe-form.service.ts`; `courseSelectOptions_` /
`courseControl` in `recipe-header.component.ts`; the three `defaultStation ?? 'כללי'` in `menu-export.service.ts`
(437 has not run yet); `permission.service.ts` presence. Print `ok` / `conflict: <what>` per symbol.

## User Stories
- As a chef-owner, I want my kitchen's stations in one list I can edit so that prep sheets use my real stations.
- As a chef, I want to pick the station when I build a recipe so that its preps print on that station's sheet.
- As a chef, I want recipes without a station to land under "כללי" so that nothing disappears from the sheets.

## Functional Requirements

### Must Have (P0)
- [ ] Taxonomy kind `station` in the shared schema, referenced by `recipes.defaultStation` and `dishes.defaultStation`.
- [ ] Default master stations חם, קר, מאפה, קינוחים, הגשה, seeded once (fresh and live databases).
- [ ] Metadata manager section "תחנות עבודה": list, add, inline rename, remove; shared defaults read-only except for
      an admin (same rule and message as other kinds); used station → removal refused with the names.
- [ ] Recipe header station picker (recipes and dishes): "כללי" (empty) first, then stations; one add option
      (add-option rule, keyboard rule K via the shared `app-custom-select`); saved to `defaultStation`, restored on load,
      counted by the unsaved-changes check.
- [ ] `defaultStation: ''` → "כללי" in the by-station checklist (`||` instead of `??`, 3 places).

## UI/UX Notes
- New child component `pages/metadata-manager/components/station-manager/` (`app-station-manager`), modelled on
  `section-category-manager`: wraps `app-taxonomy-kind-manager` with `[inlineRename]="true"`, icon `chef-hat`
  (registered), `lockReason` → `taxonomy_shared_admin_only` for shared terms. The page adds the tag, one
  `jumpSections` entry `{ id: 'mm-sec-station', labelKey: 'metadata_stations_title' }` and the import.
- Recipe header: `app-custom-select` next to the course select, `triggerId="station"`, `placeholder="station"`,
  `[typeToFilter]="true"`, `addNewValue="__add_station__"`, `addNewLabelKey="add_new_station"`,
  `[allowTypedAdd]="true"`, `(addNewChosen)` → `AddItemModalService.open({ title, label, saveLabel, initialValue })` →
  `StationRegistryService.addStation(name)` → set the control to the stored key → `notifyItemAdded`. Cancel selects
  nothing new. A stale key (station deleted elsewhere) shows as "כללי" (same pattern as `courseSelectOptions_`).
- RTL, logical CSS only; run the `cssLayer` skill before any `.scss` edit.
- New dictionary keys (append, `general` group): `metadata_stations_title` "תחנות עבודה", `metadata_stations_desc`
  "התחנות שלפיהן מודפסים דפי ההכנה", `metadata_station_placeholder` "שם תחנה חדשה", `metadata_no_stations` "אין תחנות
  עדיין", `metadata_station_exists` "התחנה כבר קיימת ברשימה", `metadata_confirm_rename_station` "לשנות את שם התחנה?
  המתכונים שמשויכים אליה יעודכנו", `metadata_confirm_remove_station` "למחוק את התחנה", `add_new_station`
  "הוסף תחנה חדשה". Reused: `station` "תחנה", `general_group` "כללי" (434), `taxonomy_shared_admin_only`,
  `metadata_add`, `metadata_updated_success`, `item_added_suffix`.
- No new icons.

## Atomic Sub-tasks
- [ ] T1: Add stations as their own taxonomy kind that recipes and dishes point to — 'station' in TAXONOMY_KINDS and plainKinds; TERM_REFERENCES.station = { recipes: ['defaultStation'], dishes: ['defaultStation'] }; schema test cases — shared/schemas/entities/taxonomy-term.schema.ts, server/test/taxonomy-term-schema.test.js
- [ ] T2: Seed the five default stations once, on fresh and existing databases — ensureDefaultStations(): no master station term → insert חם, קר, מאפה, קינוחים, הגשה (sortOrder 0–4, schemaVersion 2, master owner fields, parseV2-checked); called at the end of both seedMasterData paths; exported; tests — server/services/seed-master.js, server/test/seed-master-taxonomy.test.js
- [ ] T3: Prove renaming and deleting a station is handled on the server for recipes and dishes — rename re-keys defaultStation; delete of a used station → 409 — server/test/taxonomy-terms-api.test.js
- [ ] T4: Give the app one place to read and change stations — StationRegistryService: stations_ (keys in sortOrder), addStation(name) (trimmed, duplicate → returns existing key), renameStation(old, new) via updateByKey, removeStation(key) via removeByKey, canEdit(key); spec — src/app/core/services/station-registry.service.ts, station-registry.service.spec.ts, src/app/core/services/breadcrumbs.md
- [ ] T5: Let the owner manage stations in the metadata manager — StationManagerComponent (add / inline rename with confirm / remove with confirm; TaxonomyStore.errorMessage for read-only and in-use; sign-in guard; permission gate when 428 merged); spec; page tag + jumpSections entry + import — src/app/pages/metadata-manager/components/station-manager/**, metadata-manager.page.component.ts, metadata-manager.page.component.html
- [ ] T6: Save and restore the recipe's station instead of always wiping it — buildRecipeFromForm: defaultStation = raw default_station if it is a known station key, else ''; patchFormFromRecipe: default_station = recipe.defaultStation ?? ''; spec cases — src/app/pages/recipe-builder/services/recipe-form.service.ts, recipe-form.service.spec.ts
- [ ] T7: Add the station control to the frozen recipe page without growing it — default_station: [''] in recipeForm_ and in the dirty-check normalized object; offset by collapsing the 4-line "Signal-backed state…" comment in the dirty check (`getRecipeSnapshotForComparison`) to 2 lines; added ≤ deleted — src/app/pages/recipe-builder/recipe-builder.page.ts
- [ ] T8: Let the chef pick or add a station in the recipe header — stationSelectOptions_ computed, stationControl getter, add-option flow via AddItemModalService + notifyItemAdded; spec cases — src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.ts, .html, .spec.ts
- [ ] T9: Put recipes without a station under "כללי" on the station checklist — replace the three defaultStation ?? 'כללי' with defaultStation || 'כללי' (same line count) — src/app/core/services/menu-export.service.ts
- [ ] T10: Add the Hebrew texts for the station list and picker — keys listed in UI/UX Notes — public/assets/data/dictionary.json
- [ ] T11: Build, run server and client tests and the log check, then hand over the station checks — ng build, npm --prefix server test, ng test include list, git grep, numstat, log-query; cards ①–④ + production check — this plan file

## Technical Considerations
- Dependencies: `TaxonomyStore` (generic over kinds — no change), `AddItemModalService`, `notifyItemAdded`
  (`core/utils/add-option.util.ts`), `app-custom-select`, `TaxonomyKindManagerComponent`.
- Server: no route change. `POST/PUT/DELETE /api/v1/data/taxonomyTerms` already validate the kind from the schema,
  forbid a user term on a key master already has (`masterHasTerm`), re-key via `renameTermEverywhere` and block a used
  term's delete via `findTermReferences` — all driven by `TERM_REFERENCES`.
- New files needed: `station-registry.service.ts` + spec, `station-manager` component ts/html/spec.
- Model changes: none to `Recipe` (field exists); `TaxonomyKind` gains `station` through the shared schema.
- Backend / API: schema enum + references + boot seed (see Backend Impact).
- Auth and validation: shared (master) stations editable only by an admin (`canEdit`, server `termWriteOwner`);
  staff restriction arrives with 427/428 (C-PERM `editTaxonomy` covers `station`).
- Security surface: none new — same term endpoints, server-validated.
- Data / migration: no migration. Existing recipes keep their `defaultStation` value ('' for nearly all, since every
  save wrote ''); a non-empty legacy value that is not a station key shows as "כללי" in the picker and is cleared on
  the next save of that recipe.
- Frozen files: `recipe-builder.page.ts` (+2 −2), `menu-export.service.ts` (±0).
- Project checks: log-query Done-when; chef-side stories; dictionary keys listed; Hebrew canonical values — station
  names are stored as typed (Hebrew keys, like section categories), so no translation-key modal; add-option and
  keyboard rules via the shared select; RTL logical CSS; no new icons.

## Backend Impact
- `shared/schemas/entities/taxonomy-term.schema.ts`: new plain kind `station`; `TERM_REFERENCES.station`. The server
  build regenerates `server/generated` (pretest / build), so `generic.js` validates the new kind with no code change.
- `server/services/seed-master.js`: `ensureDefaultStations()` runs at boot after `seedMasterTaxonomy`; inserts 5
  master terms only when no master `station` term exists (idempotent). On the next Render deploy it writes those 5
  documents to Atlas once (MVP run: only after `mvp` merges to `main` at the final gate) — an insert of shared defaults, not a reshaping migration (no existing document changes).
  Rollback: delete the 5 master `station` terms (none are referenced until a chef picks one).
- No new endpoint, collection or index.

## Out of Scope
- Printed prep sheets, one page per group, group selection (plan 437).
- Per-business editable copies of the default stations (defaults stay shared master terms, like every other kind).
- Staff permission enforcement (427/428).
- Station in cook view, the recipe book filter or the AI recipe draft.
- Assigning a station per prep row (a prep row follows the dish it serves — spec 04.3).

## Critical Questions
None. (Q1 decided — see Execution Notes.)
