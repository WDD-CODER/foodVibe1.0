# Plan 440 — Store event and serving coefficients and compute portions in one place

Status: draft
Track: code
Snapshot: 8ffda3d2c4d8f3ab5137bfee30e9d80026d28110

## Problem Statement
Spec 03.1 (double coefficient). How much food an event needs depends on the kind of event (a wedding eats more
than a conference) and on the serving style (a cocktail of bites needs three times the pieces of a plated
dinner). Today event types (taxonomy kind `eventType`) and serving types (kind `menuType`) are names only, and
portions come from `derivePortions` (`menu-intelligence.service.ts` L19-38): plated/buffet = guests ×
`servingPortions`; `cocktail_passed` = round(guests × `piecesPerPerson` × take rate) — and `piecesPerPerson` is
never set, so cocktail menus come out at **0 portions** while the UI cost uses `?? 1` (footer and export disagree).
A preparation put straight on a menu is scaled by portions ÷ its yield in grams, which is nonsense.

This plan lays the data and the one formula; plan 441 builds the screens and switches every consumer to it.
1. **Schema (INV-4/INV-5):** `eventType` and `menuType` terms gain `coefficient` (> 0, ≤ 2 decimals; missing →
   1.0). Events store the name + coefficient of their event type and serving type at selection time
   (`eventTypeSnapshot`, `servingTypeSnapshot`); items get `portionsPerDiner` (replaces `servingPortions`) and an
   optional `coefficientOverride`. `predictedTakeRate` and `piecesPerPerson` become optional legacy.
2. **One pure function** `computePortions(event, recipes)` in `src/app/core/engine/portions.ts` (C-PORTIONS) — the
   only place portions are computed; every 03.1 acceptance number is a unit test.
3. **Migration 0007** seeds the coefficients: shared defaults (master) plus every business's own `eventType` /
   `menuType` terms; maps existing serving keys; adds the new serving type "פלייט שף פרונטלי"; copies
   `servingPortions` → `portionsPerDiner`; gives every existing event snapshots with coefficient **1.0** so its
   portions do not change. It also unsets the stored dish-type colors that plan 438 stopped writing (spec 02.1:
   "remove the color field from data").
4. **Seed** for an empty database writes the same defaults.

## Goals & Success Criteria
- Primary: `computePortions` returns the exact 03.1 acceptance numbers; migration 0007 runs dry, writes, re-runs
  as a no-op and verifies — locally, on a restored Atlas copy, then on Atlas after Dandan's go.

Done when:
- [auto] `npx ng build` passes.
- [auto] `npx ng test --watch=false --include='src/app/core/engine/portions.spec.ts' --include='src/app/core/services/menu-intelligence.service.spec.ts'`
  passes; `portions.spec.ts` covers (dish items, `recipeType: 'dish'`, 1 portion per diner unless stated):
  - 100 guests, private 1.15 × buffet 1.1 → coefficient `1.265` (not rounded), `formatCoefficient(1.265) === '1.27'`, portions **127**;
  - same dish with `coefficientOverride: 1.1` → portions **110**, `overridden: true`;
  - event switched to wedding 1.2 (buffet 1.1): non-overridden dish → coefficient `1.32`, portions **132**; the
    overridden dish stays **110**;
  - cocktail 3 × private 1.15, 50 guests, 1 bite per diner → **173**;
  - preparation "רוטב" (`recipeType: 'preparation'`, recipe `yieldUnit: 'kg'`), 0.05 per diner, 100 guests,
    coefficients 1.0 → **5** (`toBeCloseTo(5, 6)`, not rounded up);
  - event type "בר מצווה" snapshot 1.25, serving 1.0, 100 guests → **125**;
  - business 1.1 × buffet 1.1, 100 guests → **121, not 122**;
  - guests 0 → every item 0; `portionsPerDiner: 0` → 0 (never silently 1);
  - no snapshots (event created before this plan) → coefficient 1.0, portions = guests × portionsPerDiner;
  - item without `portionsPerDiner` but with legacy `servingPortions: 2` → uses 2;
  - `isValidCoefficient`: `1.25` true, `0.9` true, `1.255` false, `0` false, `-1` false.
- [auto] `npm --prefix server test` passes, including new tests:
  - `server/test/coefficient-schema.test.js`: eventType term with `coefficient: 1.15` valid, `1.155` invalid, `0`
    invalid, without coefficient valid; menuType same; menu event with both snapshots, an item with
    `portionsPerDiner: 0.5` and `coefficientOverride: 1.1` valid; item without `predictedTakeRate` valid;
    `coefficientOverride: 1.111` invalid;
  - `server/test/migration-0007-coefficients.test.js` on fixtures: master menuType `plated_course` → 1,
    `buffet_family` → 1.1, `cocktail_passed` → 3; master gains `chef_plated_front` 2 and the five event types
    (עסקי 1.1, פרטי 1.15, חתונה 1.2, מסיבה 1.1, כנסים 0.9); a business's own eventType "חתונה" is folded into the
    master one; a business's own eventType "בר מצווה" gets 1; an event `{ eventType: 'חתונה', servingType:
    'buffet_family', guestCount: 80, items[{ servingPortions: 2 }] }` gets both snapshots with coefficient 1 and
    `portionsPerDiner: 2`; course terms lose `color`; a second `plan()` on the written fixture reports 0 changes;
  - `server/test/seed-master-taxonomy.test.js`: a fresh seed has the five event types and four serving types with
    their coefficients.
- [auto] Local run in this slot's isolated DB: `node server/migrations/0007-coefficients.js --target=local`
  (dry run) prints the per-step counts; `--write=yes --backup-dir=<fresh local snapshot>` applies; a second dry
  run prints `0` for every step; `--verify=yes` exits 0.
- [auto] Rehearsal on a restored Atlas copy: `node server/scripts/db-restore.js --target=local --dir="<atlas snapshot>" --db=foodvibe_scratch_0007`,
  then the same dry run → write → dry run (all 0) → verify against `--db=foodvibe_scratch_0007`, exit 0. The dry
  run's "portions change" list (events whose recomputed portions differ from stored `derivedPortions`) is pasted
  into the session state for Dandan.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] Dandan reviews the Atlas dry-run output (counts per step, folded own terms, the "portions change" list)
  and replies `go 0007` before the Atlas write. The Worker never writes Atlas without it.
- [human] After the Atlas write: `node server/migrations/0007-coefficients.js --target=atlas --confirm-host=<host> --verify=yes`
  exits 0 (Dandan runs it, or approves the Worker running it).
- [human] Desktop + mobile: open an existing menu in `/menu-intelligence` after the local write → its dishes and
  the footer show the same numbers as before the migration (this plan changes no screen).

## Execution Mode
- Parallel: no against 424 and 425 (`shared/schemas/**`, `seed-master.js`), against 442, 445, 446
  (`menu-event.schema.ts` — sequential in lane wt-3), against 436 and 438 (`taxonomy-term.schema.ts`,
  `seed-master.js`, `seed-master-taxonomy.test.js`), against 431 (`seed-master.js`) and against 434 and 445
  (`menu-intelligence.service.ts`). Yes against the rest.
- Concurrent plans: lane wt-3 order is 439 → 440 → 441.
- Isolated DB: yes — this plan reshapes stored taxonomy terms and menu events (migration 0007).

## Execution Notes
- Depends on: plan 424 merged (terms and events carry `businessId`; master is `businessId: '__master__'`) and
  plan 433 merged (`src/app/core/engine/` and `rounding.ts` `roundPortions` exist — portions are rounded only there).
- Must not run at the same time as: 424, 425 (`shared/schemas/**`, `server/services/**`); 442, 445, 446
  (`menu-event.schema.ts`); 436, 438 (`taxonomy-term.schema.ts`, `seed-master.js`); 431 (`seed-master.js`);
  434, 445 (`menu-intelligence.service.ts`).
- Atlas: dry run first; write only after Dandan's `go 0007` in chat; fresh `db-backup.js --target=atlas` snapshot
  (< 24 h) passed as `--backup-dir`.
- MVP run mode: executed unattended into branch `mvp` per `docs/mvp/run-mode.md` — Atlas steps (incl. 'go 0007' / 'go 0008') are rehearsed on a scratch copy and deferred to the final gate; [human] items become validation cards in `docs/mvp/runs/<NNN>.md`.
  In this mode C6 stops after the scratch rehearsal and writes the Atlas commands (dry run, backup, write, verify)
  under `## Final gate — Atlas` in `docs/mvp/runs/440.md`; C7 is not run by the Worker.
- Decision (Planner review): 440 Q1 → option a — no per-business override of a shared type's coefficient in the
  MVP; the owner overrides per dish (plan 441) or adds his own event type with his own coefficient.
- Decision (Planner review): serving types keep their existing Hebrew labels (`plated_course`, `buffet_family`,
  `cocktail_passed` in `dictionary.json`, which is append-only); the spec's name is used only for the new
  `chef_plated_front` = "פלייט שף פרונטלי".
- Nothing on screen changes here: `derivePortions` and the page keep working (plan 441 switches them to
  `computePortions`). The only client edit outside the new engine file is making `predictedTakeRate` optional.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
shared/schemas/entities/taxonomy-term.schema.ts
shared/schemas/entities/menu-event.schema.ts
src/app/core/engine/portions.ts
src/app/core/engine/portions.spec.ts
src/app/core/models/menu-event.model.ts
src/app/core/services/menu-intelligence.service.ts
server/migrations/0007-coefficients.js
server/services/seed-master.js
server/test/coefficient-schema.test.js
server/test/migration-0007-coefficients.test.js
server/test/seed-master-taxonomy.test.js
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

- INV-4: preserves — every new field (`coefficient`, `eventTypeSnapshot`, `servingTypeSnapshot`,
  `portionsPerDiner`, `coefficientOverride`) is defined once in `shared/schemas` and the server validates every
  write against it, including the ≤ 2-decimal rule.
- INV-5: preserves — event types and serving types stay `taxonomyTerms` (kinds `eventType`, `menuType`); the
  coefficient is a field on the term, not a second list. `eventType` leaves the plain-kinds group for its own
  union member.
- INV-2: preserves — (rule as rewritten by plan 424 / ADR 0023) shared defaults stay master terms read by every
  business; a business's own terms stay its own. Migration 0007 folds a business's own term into a newly seeded
  master term with the same key — the same rule `POST /:type` already applies when a shared term is added
  (`generic.js` ~L444). The dry run lists every folded term before the Atlas go.
- INV-3: preserves — all re-shaping runs on the server in the migration (one pass per collection); no client loop.

## Step 0 — Reality Check

Runs always (plans 424, 425 and 433 change these files). Check by symbol and print `ok` / `conflict: <what>`:
`plainKinds`, the `menuType` and `course` members, `taxonomyTermSchema` in `taxonomy-term.schema.ts`; the item
shape and `piecesPerPerson` in `menu-event.schema.ts`; `MenuItemSelection`, `MenuEvent` in `menu-event.model.ts`;
`hydrateDerivedPortions` in `menu-intelligence.service.ts`; `roundPortions` in `src/app/core/engine/rounding.ts`;
`defaultMasterRegistries`, `seedMasterTaxonomy` and how master terms are stamped (`businessId`/`userId`) in
`seed-master.js`; `buildTerms` in `0003-taxonomy-terms.js`; `parseArgs`/`connect` in `migrations/tools/_connect.js`;
`checkBackup` in `0001-v2-schema.js`; the master business id constant from `server/utils/business-scope.js`
(`MASTER_BUSINESS_ID`, if 425 is merged) or `'__master__'`. STOP for a go only on a `conflict`.

## User Stories
- As a chef, I want each event type and serving style to carry its own multiplier so that a wedding buffet and a
  conference lunch get different amounts without me doing math.
- As a chef, I want my old events to keep exactly the portions they had so that nothing I already priced moves.
- As a chef, I want one portions number used by every list so that cost, shopping and prep never disagree.

## Functional Requirements

### Must Have (P0)
- [ ] Schema: `coefficient` on `eventType` and `menuType` terms; event snapshots; item `portionsPerDiner`,
  `coefficientOverride`; `predictedTakeRate` optional.
- [ ] `computePortions(event, recipes)` per C-PORTIONS with the rounding rule: portion-unit items rounded by
  `roundPortions`; weight/volume preparations not rounded.
- [ ] `isValidCoefficient(x)` and `formatCoefficient(x)` exported from `portions.ts`.
- [ ] Migration 0007 (dry run / write / verify / scratch / Atlas host confirm), idempotent, rollback note.
- [ ] Seed for an empty DB carries the same defaults.

### Should Have (P1)
- none

### Nice to Have (P2)
- none

## UI/UX Notes
- No screen changes in this plan.
- Dictionary (append to `general`): `"chef_plated_front": "פלייט שף פרונטלי"`. The five event types are seeded with
  their Hebrew names as keys (the way chefs already add event types today), so they need no dictionary entry.

## Contracts used (verbatim from the approved MVP map)

**C-PORTIONS (440; consumed by 433 via EventPlanService, 441)**
- `src/app/core/engine/portions.ts`: `computePortions(event: MenuEvent, recipes: Recipe[]): Map<string, { portions: number, coefficient: number, overridden: boolean }>`; portions = portionsPerDiner × guests × coefficient; coefficient default = eventTypeSnapshot.coefficient × servingTypeSnapshot.coefficient (not rounded); override → `coefficientOverride` (> 0, ≤ 2 decimals).
- Taxonomy: `eventType` and `menuType` terms gain `coefficient: number` (> 0; missing → 1.0).
- Event: `eventTypeSnapshot?: { key, name, coefficient }`, `servingTypeSnapshot?: { key, name, coefficient }` (missing → 1.0). Item: `portionsPerDiner?: number` (replaces servingPortions; migration copies), `coefficientOverride?: number`. `predictedTakeRate`, `piecesPerPerson` become optional legacy, unused.

**C-ENGINE (excerpt this plan relies on)**
- `rounding.ts`: `roundPortions(x)` (round to 6 decimals, then ceil — only for portion-unit items), `formatQty(qty, unit)` (kg/liter ≤ 2 decimals, g/ml integer, units ceil; >1000 g → kg, >1000 ml → liter), `formatMoney(n)` (₪, 2 decimals), `formatPct1(n)` (1 decimal), `formatPctInt(n)`.
- `EventPlanInput = { event: MenuEvent, portionsByItem: Map<string, number>, products: Product[], recipes: Recipe[] /* recipes + dishes */, units: UnitConversion }` — item key `${section._id}|${itemIndex}`.

**C-SCOPE (excerpt)**
- Every business doc gets `businessId: string` and `createdBy: string` in `baseDocShape`. Master docs: `businessId: '__master__'`.

## Design

### Schema (`shared/schemas/entities/taxonomy-term.schema.ts`, `menu-event.schema.ts`)
- Export `coefficientSchema = z.number().positive().refine(n => Math.abs(Math.round(n * 100) - n * 100) < 1e-9, 'max 2 decimals')`.
- Remove `'eventType'` from `plainKinds`; add `z.strictObject({ ...termShape, kind: z.literal('eventType'), coefficient: coefficientSchema.optional() })`;
  `menuType` member gains `coefficient: coefficientSchema.optional()`.
- `menu-event.schema.ts`: `const typeSnapshotSchema = z.strictObject({ key: z.string(), name: z.string(), coefficient: z.number().positive() })`
  (a copy of the term's value — no decimal rule); event gains `eventTypeSnapshot` and `servingTypeSnapshot`
  (`typeSnapshotSchema.optional()`); item: `predictedTakeRate: z.number().optional()`,
  `portionsPerDiner: z.number().min(0).optional()`, `coefficientOverride: coefficientSchema.optional()`.
  `servingPortions`, `piecesPerPerson` stay optional (legacy, read only as fallback).
- Client `menu-event.model.ts` mirrors this (`TypeSnapshot` interface; `predictedTakeRate?`), so
  `src/app/core/models/v2/conformance.ts` keeps compiling. `menu-intelligence.service.ts`
  `hydrateDerivedPortions` passes `item.predictedTakeRate ?? 0` (only compile fix; no behavior change).

### `src/app/core/engine/portions.ts` (pure, no Angular)
```ts
export type ItemPortions = { portions: number, coefficient: number, overridden: boolean }
export function defaultCoefficient(event: MenuEvent): number           // (eventTypeSnapshot?.coefficient ?? 1) * (servingTypeSnapshot?.coefficient ?? 1)
export function computePortions(event: MenuEvent, recipes: Recipe[]): Map<string, ItemPortions>
export function isValidCoefficient(x: number): boolean                  // > 0 and ≤ 2 decimals
export function formatCoefficient(x: number): string                    // half-up to 2 decimals after cleaning float error: 1.265 → '1.27', 1.32 → '1.32', 1.1 → '1.1'
```
- Key `${section._id}|${itemIndex}`; guests = `max(0, guestCount)`; `ppd = item.portionsPerDiner ?? item.servingPortions ?? 1`
  (an explicit 0 stays 0); `overridden = item.coefficientOverride != null && item.coefficientOverride > 0`;
  `coefficient = overridden ? override : defaultCoefficient(event)`; `raw = ppd * guests * coefficient`.
- Portion-unit item = `item.recipeType === 'dish'` or the recipe's `yieldUnit` (normalized through `UNIT_ALIASES`)
  is not in `VOLUME_OR_WEIGHT_KEYS` (both from `src/app/core/utils/recipe-cost.constants.ts`). Portion-unit →
  `roundPortions(raw)`; weight/volume preparation → `raw` (display rounding is `formatQty`'s job, 04.1).
- `formatCoefficient` is display only (coefficients are not quantities or money, so they are not in `rounding.ts`).

### Migration `server/migrations/0007-coefficients.js` (CommonJS, same shape as 0005)
Header comment with the modes. Exported pure functions (tested) + `plan`, `write`, `verify`:
- `SERVING_COEFFICIENTS = { plated_course: 1, plated: 1, table: 1, buffet_family: 1.1, cocktail_passed: 3, chef_plated_front: 2 }`;
  `EVENT_TYPE_SEED = [['עסקי', 1.1], ['פרטי', 1.15], ['חתונה', 1.2], ['מסיבה', 1.1], ['כנסים', 0.9]]`;
  `NEW_SERVING_SEED = [{ key: 'chef_plated_front', coefficient: 2, fields: ['sell_price', 'food_cost_money', 'serving_portions'] }]`.
- `seedCoefficient(kind, key)` → the table value, else `1`.
- `termPatch(term)` → `{ $set: { coefficient } }` for an `eventType`/`menuType` term without one; else `null`.
- `masterSeedDocs(existingMasterKeys, now)` → master terms to insert (five event types + `chef_plated_front`)
  that master does not have yet, stamped the way `seed-master.js` stamps master terms after plan 424
  (`businessId: '__master__'`, `schemaVersion: 2`, `createdAt`/`updatedAt`, `sortOrder` after the last master term of the kind).
- `foldTargets(ownTerms, insertedMasterKeys)` → `_id`s of business-own terms with the same kind + key as a newly
  inserted master term (deleted in the write, listed in the dry run with their business id).
- `eventPatch(event, labels)` → `$set` for an event missing snapshots / `portionsPerDiner`:
  `eventTypeSnapshot = { key: eventType, name: labels[eventType] ?? eventType, coefficient: 1 }` (only when
  `eventType` is non-empty), `servingTypeSnapshot` likewise from `servingType`, and every item without
  `portionsPerDiner` gets `portionsPerDiner = servingPortions ?? 1`; `null` when nothing is missing. Applies to
  trashed events too (`deletedAt` set) so a restore is already migrated.
- `portionsChange(event)` → `{ _id, name, businessId, stored, recomputed }[]` for items whose
  `ceil(round6(portionsPerDiner × guests))` differs from stored `derivedPortions` (expected: cocktail events whose
  stored value was 0 or take-rate based) — report only.
- `courseColorPatch(term)` → `{ $unset: { color: '' } }` for a `course` term with `color`.
- `labels` = every group of `public/assets/data/dictionary.json` flattened (key → Hebrew), read once in `main()`.
- Modes: default dry run (counts per step: terms to patch, master inserts, folds, events to patch, course colors,
  portions-change list); `--write=yes` needs `--backup-dir` (`checkBackup` from 0001) unless `--db=<scratch>`;
  `--verify=yes` read-only: 0 `eventType`/`menuType` terms without `coefficient`, 0 events with a non-empty
  `eventType` and no `eventTypeSnapshot`, 0 items without `portionsPerDiner`, 0 `course` terms with `color`, master
  has all six seed keys — exit 1 on any miss. Atlas requires `--confirm-host` (`connect`).
- Idempotent: every query filters on the missing field (`coefficient: { $exists: false }`, …); inserts skip keys
  master already has.
- **Rollback:** every change is additive except the folds and the color unset. To undo, restore `taxonomyTerms`
  and `menuEvents` from the `--backup-dir` snapshot (`server/scripts/db-restore.js` into a scratch DB, then the
  Human copies the two collections back). Code before plan 441 ignores the new fields, so leaving them in place is
  also safe.

### Seed (`server/services/seed-master.js`)
`defaultMasterRegistries()`: `MENU_EVENT_TYPES` items = the five event-type names; `MENU_TYPES` gains
`chef_plated_front`. `seedMasterTaxonomy()` maps the built terms through `termPatch` logic
(`seedCoefficient` from 0007, required lazily like `buildTerms`) so every seeded eventType/menuType term carries
its coefficient.

## Atomic Sub-tasks
- [ ] C1: Add coefficients to event and serving types, and type snapshots to events, in the schema — coefficientSchema, eventType member, menuType coefficient, typeSnapshotSchema, item portionsPerDiner / coefficientOverride, predictedTakeRate optional; npm run build:schemas; schema tests — shared/schemas/entities/taxonomy-term.schema.ts, shared/schemas/entities/menu-event.schema.ts, server/test/coefficient-schema.test.js
- [ ] C2: Mirror the new event fields in the client model so the app keeps compiling — TypeSnapshot, eventTypeSnapshot / servingTypeSnapshot, portionsPerDiner, coefficientOverride, predictedTakeRate optional; `item.predictedTakeRate ?? 0` in hydrateDerivedPortions — src/app/core/models/menu-event.model.ts, src/app/core/services/menu-intelligence.service.ts
- [ ] C3: Compute every menu item's portions in one pure function with the agreed rounding — computePortions, defaultCoefficient, isValidCoefficient, formatCoefficient per Design; spec with every acceptance number in Done-when — src/app/core/engine/portions.ts, src/app/core/engine/portions.spec.ts
- [ ] C4: Write migration 0007 that seeds coefficients and gives old events snapshots of 1.0 — pure functions + plan / write / verify / main per Design, dry run default, --write=yes + --backup-dir, --db scratch, --confirm-host, --verify=yes; vitest on fixtures incl. second run = 0 changes — server/migrations/0007-coefficients.js, server/test/migration-0007-coefficients.test.js
- [ ] C5: Seed a fresh database with the default event and serving types and their coefficients — defaultMasterRegistries + seedMasterTaxonomy; add chef_plated_front to the dictionary; seed test — server/services/seed-master.js, server/test/seed-master-taxonomy.test.js, public/assets/data/dictionary.json
- [ ] C6: Rehearse migration 0007 locally and on an Atlas copy, then hand Dandan the Atlas dry run — slot DB: dry → write → dry (0) → verify; db-backup atlas → db-restore into foodvibe_scratch_0007 → same sequence; Atlas dry run with --confirm-host; paste counts, folds and portions-change list into session state; STOP for `go 0007` — this plan file, docs/session-state-<branch>.md
- [ ] C7: After Dandan's go, write Atlas and verify — fresh atlas backup (< 24 h) → --write=yes --backup-dir → --verify=yes exit 0 — this plan file
- [ ] C8: Build, run the specs and server tests, check the error log — ng build, ng test (listed specs), npm --prefix server test, log-query — this plan file

## Technical Considerations
- Dependencies: `roundPortions` (plan 433), `UNIT_ALIASES` / `VOLUME_OR_WEIGHT_KEYS`
  (`recipe-cost.constants.ts`), `buildTerms` (0003), `parseArgs` / `connect` (`migrations/tools/_connect.js`),
  `checkBackup` (0001), `db-backup.js` / `db-restore.js` (`docs/agent/standards-backend.md` §7).
- New files needed: `portions.ts` + spec, `0007-coefficients.js` + test, `coefficient-schema.test.js`.
- Model changes: see Design → Schema.
- Backend / API: none new; generic routes validate the new fields through the regenerated schemas.
- Auth and validation: unchanged routes; coefficient ≤ 2 decimals enforced by Zod on every write.
- Security surface: the migration connects with the server `.env` URIs and never prints them; Atlas requires
  `--confirm-host` and Dandan's go.
- Data / migration: 0007 as designed; `Isolated DB: yes`.
- Project checks: log-query Done-when present; chef stories; one dictionary key listed; no CSS; no icons.

## Backend Impact
- Collections affected: `taxonomyTerms` (eventType/menuType `coefficient`; master seed inserts; folds; course
  `color` unset), `menuEvents` (snapshots, `portionsPerDiner`).
- New collections: no.
- Server changes needed: yes — schemas (regenerated), migration 0007, seed defaults.

## Out of Scope
- Every screen: coefficient fields in the metadata manager, "מקדם המנה" per dish, removing take rate / pieces per
  person from the UI and math, switching `EventPlanService` to `computePortions` (all plan 441).
- Owner-side editing of a shared (master) type's coefficient — Decision (Planner review) in Execution Notes.
- Renaming the existing serving types' Hebrew labels.
- Split engine by main-course count, event-attributes engine (time, kids, alcohol).

## Critical Questions
none (Q1 decided by the Planner — see Execution Notes).
