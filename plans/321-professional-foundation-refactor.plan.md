# Plan 321 — Professional Foundation Refactor: Shared Master, Zod Schemas, Unified Taxonomy

Status: active

> **Save instructions for the agent:** persisted via `.claude/skills/save-plan/SKILL.md`. Expected to be `320` when written, but `feat/recipe-labels-course-field` had already claimed 320 (commits reference "plan 320 M1"/"M2") with no `plans/320-*.plan.md` file on disk — so this plan is `321`.

overview: Move FoodVibe's data layer to the same professional grade as its workflow layer. The Architecture Audit (2026-09-29) found a disciplined process (AGENTS.md, ADRs, Plan Contracts, job validation, CI with lint/build/tests/gitleaks/Semgrep) sitting on a data layer that grew by patch: a schemaless `data/:type` pipe where the client decides document shape, a copy-the-whole-catalog-per-user tenancy model, 10+ single-doc "registries" with hand-rolled CRUD, compound concepts welded into `labels_` strings, three soft-delete mechanisms, four naming conventions in persisted fields, and zero server tests. This plan fixes these at the source, in 9 sequential phases. Each phase is one or more briefs, and each ends in `/ship` plus Human validation.

---

## ⚠️ READ FIRST — Snapshot and parallel-session rule (applies to EVERY phase)

This plan was written against **`origin/main @ 1f0d7458` (2026-09-29 13:55 +0300)**. Dandan runs **parallel sessions** on this repo, so by the time any phase starts, things may already be done, partly done, or done differently.

**Every phase starts with its Step 0: Reality Check. It is mandatory, and no code is written before its report is approved.**

1. `git fetch origin` and `git log --oneline 1f0d7458..origin/main`. List every commit since the snapshot and flag those touching files in this phase's "Files to check first".
2. `git ls-remote --heads origin` plus `gh pr list --state open`. List open branches/PRs touching the same files. If one exists, **STOP and ask** whether to wait, rebase onto it, or coordinate.
3. Check `.claude/todo.md`, `docs/session-state-*.md` (newest by date suffix), and `plans/` newer than this plan for work overlapping this phase.
4. For every assumption in the phase's **"Assumed current state"** block, verify it against the live code: grep for the symbol, not a line number, because **line numbers in this plan are hints only**. Mark each one `✅ still true` / `⚠️ changed` / `❌ gone/already done`.
5. Write the result to `docs/session-state-foundation-refactor.md` under a heading for the phase: a table of assumption → status → evidence (file:symbol), plus a proposed adjustment for every ⚠️/❌.
6. **STOP. Post the drift table to the Human and wait for an explicit go.** If everything is ✅, still post it (it's one short message) and wait.

If a Reality Check shows a step is already done, **do not redo it**. Mark it `[x] (done externally: <commit/PR>)` in Atomic Sub-tasks and move on.

---

## Locked decisions (Human, 2026-09-29)

| # | Decision | Consequence |
|---|---|---|
| D1 | **Tenancy → Shared master + per-user overrides.** Push-to-master becomes **admin-only**, behind a **dedicated confirmation modal**. | Per-user full catalog copies, clone-on-signup, sync-on-login, ID remapping, and `_userModified` all go away (Phase 5). Near-term incremental version of the admin-only push gate (built on the *current* clone/`_masterId` architecture, not the override model) is `plans/322-admin-master-push-expansion.plan.md` — see Phase 5 note below. |
| D2 | **Validation → Zod, one shared schema package for client + server.** | Client TS types are *inferred* from Zod, so client and server can't drift. The server validates every write (Phase 2). |
| D3 | **Taxonomy → `course` (single) + `protein` (single) + `labels` (freeform only). Menu sections reference `course`.** | `labels` stops carrying structure. Menu section names stop being free text (Phase 4). |
| D4 | **Naming → rename persisted fields to one convention during the schema migration.** | camelCase, no trailing `_` in persisted data. Done in the same migration that introduces `schemaVersion` (Phase 2b). |

## Decision gates

> G1–G3 decided by the Human 2026-09-29 (batched ahead of Phase 1, before their named "ask at" phase, at the Human's request). G4/G5 remain open — ask at Phase 4 as planned.

| Gate | Question | Ask at | Architect recommendation | **Decision** |
|---|---|---|---|---|
| G1 | Merge `RECIPE_LIST` + `DISH_LIST` into one `recipes` collection with `kind: 'dish' \| 'preparation'`? They share one schema, and the split doubles services, trash collections and sub-recipe reference logic. | Phase 2b Step 0 | Yes, in the same v2 migration | **YES — merge** (2026-09-29) |
| G2 | Rename collections from localStorage-era `SCREAMING_CASE` to camelCase (`PRODUCT_LIST` → `products`)? | Phase 2b Step 0 | Yes if G1 = yes (same migration); otherwise defer | **YES — rename** (2026-09-29) |
| G3 | Kosher status (`meat` / `dairy` / `pareve`) as its **own** axis, separate from `protein`? `dairy_prep` and `dairy_sauce` in the legacy data suggest it matters. | Phase 4 Step 0 | Yes, as `kosherType`, because it's orthogonal to protein | **YES — separate `kosherType`** (2026-09-29) |
| G4 | Legacy categories "ideas (preparations/dishes)" (keys 56/57): are they really a **workflow status** (idea → draft → approved) rather than a label? | Phase 4 mapping review | Model as `status` alongside `isApproved`, or keep as a label for now |
| G5 | Preparation-family legacy categories (sauces, doughs, stocks, 2–16, 63, 68–77): labels, or the existing preparation-category registry? | Phase 4 mapping review | Keep as labels in this plan (no behavior change) |

---

## Context — evidence from the live repo (snapshot `1f0d7458`)

**Data layer**
- `server/routes/generic.js`: one schemaless CRUD pipe for 24 collection types. `PUT /:type/:id` does `$set: { ...safeBody }` with no shape validation. `POST` requires a client-supplied `_id`. `PUT /:type` (no id) replaces a user's **whole collection** (`deleteMany` + `insertMany`). The only content check is the `nameSnapshot` rule for recipes.
- Only one Mongoose model exists (`server/models/user.model.js`). Everything else goes through raw `mongoose.connection.db.collection(type)`.
- Client types are hand-written TS interfaces in `src/app/core/models/*.ts`. The server is plain JS with no shared types.

**Tenancy**
- `server/services/clone-master.js` copies the entire `__master__` catalog to every new user (`auth.js` → `cloneMasterDataToUser`). `sync-master.js` (381 lines) re-syncs on every login with 4 rules, and must **remap every ingredient `referenceId` and every equipment id** because each clone gets a new random id.
- `_userModified: true` (set by any `PUT`) makes the user's copy skip all future master updates for that document, permanently and for the whole doc.
- `PUT /:type/:id/push-to-master` is open to **any** signed-in user. The code comment says this is accepted only for the dev phase, and the admin guard is commented out. The client uses a generic ternary confirm (`master-push.service.ts` → `confirmModal.openTernary('push_to_master_message')`).
- Plan 300's dangling sub-recipe refs and plan 319's `registered-other-user` orphan labels are both symptoms of this copy model.

**IDs**
- `makeId(5)` (62⁵ ≈ 916M space) is implemented **three times**: `generic.js`, `sync-master.js`, `async-storage.service.ts`. Every per-user clone multiplies the document count, so collision risk grows quadratically with users.

**Registries / taxonomy**
- Single-doc "`{ items: [] }` registries", each with its own service and near-identical CRUD: `metadata-registry.service.ts` (KITCHEN_CATEGORIES, KITCHEN_ALLERGENS, KITCHEN_LABELS, MENU_TYPES), `menu-section-categories.service.ts`, `preparation-registry.service.ts` (KITCHEN_PREPARATIONS), `unit-registry.service.ts`, `equipment-category-registry.service.ts`, `menu-event-type.service.ts`.
- Legacy import `server/scripts/legacy-import/lib/transform.js` (the `labels_` block) + `lib/mappings.js` (`CATEGORY_MASTER_MAP`) welded course × protein into single keys (`starter_chicken`, `main_dish_fish`…) inside `labels_`, because `Recipe` had no course field.
- `MENU_SECTION_CATEGORIES` holds the same course concept a second time as free text (`'Main Course'`, `'Desserts'`…).
- Plan 319 (done) produced `.claude/reports/label-audit/report.md` (committed) + `data.json` (**not committed**, so it probably exists only on Dandan's machine): an orphan/cluster analysis of the live labels. Phase 4 **must consume it**, not re-derive it. If `data.json` is missing, re-run `node scripts/audit-labels.mjs --remote` (read-only, Human host confirm) to regenerate it.

**Single-source-of-truth drift**
- The collection list is maintained by hand in 4 places: `server/constants/all-user-entity-types.js`, `server/constants/cloneable-types.js`, `BACKUP_ENTITY_TYPES` in `async-storage.service.ts`, and `docs/agent/standards-backend.md §1`. They already disagree (e.g. `MENU_EVENT_TYPES` and `EQUIPMENT_CUSTOM_CATEGORIES` are in ALL but not in CLONEABLE or BACKUP).
- `standards-backend.md §5` says "authenticated reads, no public endpoints", but `generic.js` serves anonymous reads of `__master__` through `optionalToken`.

**Dead / legacy paths**
- `StorageService` still runs a full localStorage mode. `src/environments/environment.ts` (plain `ng serve`) has `useBackend: false`, and `query()` defaults to an artificial `delay = 100` ms.
- 15 scripts under `server/scripts/legacy-import/`: the import plus 9 backfill/repair scripts, which is the patch-on-patch record.
- `recipe.model.ts` still documents `imageUrl_` as "Base64 data-URL", but images are on Cloudinary (`cloudinary.service.ts`). Stale.
- Deprecated shims still in `product.model.ts`: `buy_price_global_`, `supplierIds_`.
- `render.yaml` has `PERF_LOG: "1"` marked TEMPORARY (plan 302), and it costs CPU on the 0.1-CPU tier.
- About 15 stale remote branches (`reflect/*`, `worktree-*`, `new`, `main-fadnX`…).

**Deletion / per-user state**
- There are three soft-delete mechanisms: `TRASH_*` collections (6 of them), `_userDeleted` tombstones (generic.js DELETE), and `hiddenBy[]` arrays **written onto shared recipe documents** (`recipe-data.service.ts`, `dish-data.service.ts`). `favoritedBy_[]` works the same way. Under a shared master these would be every user writing to one master doc.

**Quality**
- Server: **0 tests**. It holds the riskiest logic (sync, clone, push, remap, referential-integrity delete).
- Client: 54 spec files / 69 components. CI (`.github/workflows/ci.yml`) runs lint, build, unit tests and gitleaks. `security.yml` runs npm audit and Semgrep. No e2e in CI (Playwright is configured: `npm run e2e`).
- God files: `menu-intelligence.page.ts` 1413, `recipe-builder.page.ts` 1393, `cook-view.page.ts` 979, `recipe-book-list.component.ts` 941, `product-form.component.ts` 939, `menu-export.service.ts` 897 lines. Five of them are on the **growth-frozen** list.
- `BaseEntityDataService` exists but only venue/supplier/equipment services extend it. Product/recipe/dish/menu-event services don't.
- Rate limiting exists only in `server/routes/auth.js`. `/api/v1/data` and `/api/v1/ai` (Gemini, which costs money) have none.
- Persisted field names use 4 styles (roughly 142 `trailing_`, 42 `snake_case`, 14 `camelCase`, 38 plain across `core/models`).

---

## Target architecture (end state)

```
shared/schemas/            ← ONE source of truth (Zod, TypeScript)
  collections.ts           ← registry of every collection + flags (cloneable→removed, backup, searchable, softDelete)
  entities/*.schema.ts     ← Product, Recipe(kind), MenuEvent, Supplier, Equipment, Venue, TaxonomyTerm, UserPrefs…
  field-map.v1-to-v2.ts    ← old → new field names (migration + audit trail)
  ids.ts                   ← newId() — single generator
        │  tsc → CJS                      │  tsconfig path @schemas/*
        ▼                                 ▼
server/ (Express)                     src/app (Angular)
  validate(schema) middleware           types = z.infer<…>, no hand-written interfaces
  owner-scoped repositories             StorageService = HTTP only (localStorage mode removed)
  master read + override merge          TaxonomyStore (one generic registry service)
  admin-only push-to-master             MasterPushConfirmModal (dedicated)
  tests: vitest + mongodb-memory-server

MongoDB
  <entity collections>  docs carry: ownerId ('master' | userId), baseId? (override of master doc),
                        schemaVersion, createdAt/updatedAt, deletedAt?/deletedBy?
  taxonomyTerms         { kind: course|protein|label|ingredientCategory|allergen|unit|prepCategory|menuType|eventType|equipmentCategory, key, ownerId, sortOrder, …kind-specific }
  userPrefs             { userId, favorites: [...], hidden: [...] }   ← per-user state, off shared docs
```

**Read model after Phase 5:** a user's view of collection X = master docs **minus** those shadowed by a user override (`baseId`), **plus** the user's overrides, **plus** the user's own docs, minus soft-deleted/hidden. References always point at the **master id** (or the user's own doc id), so there is no remapping.

---

## Global rules (all phases)

- **Branch per phase:** `chore/foundation-pN-<slug>` (or `feat/` if it adds user-facing behavior). Never write on `main`. `ng build` must pass before every commit.
- **Growth-frozen files** (`recipe-builder.page.ts`, `menu-intelligence.page.ts`, `cook-view.page.ts`, `product-form.component.ts`, `menu-export.service.ts`): **no net new lines**. Renames and type changes that keep or reduce line count are fine. New logic goes in new components/services. Phase 7 is where they get *decomposed*.
- **Every data migration script** follows the proven `server/scripts/legacy-import/import-foodcomposer.js` discipline:
  - dry run by default: prints stats, warnings and N samples, and writes nothing
  - `--write=local` / `--write=atlas` explicit
  - idempotency marker (e.g. a `migrations` collection with `{ id, appliedAt, stats }`) that refuses to re-run without `--force`
  - `npm run repair:backup` (or its successor) snapshot **before** any `--write`, with the backup path printed
  - a `verify` mode that compares the before/after state and exits non-zero on mismatch
  - **Atlas writes only after the Human confirms the masked host** (same rule as plan 319 A3)
- **Migration scripts live in `server/migrations/NNNN-<slug>.js`** (new folder, numbered, never edited after being applied to Atlas; supersede instead, like ADRs).
- **Conventions:** signals-only, `inject()`, `input()`/`output()`/`model()`, no `any`, single quotes, no semicolons in `.ts`, `.c-*` engines only in `src/styles.scss`, Hebrew through `translatePipe` + `dictionary.json`.
- **Verification commands in briefs are PowerShell-compatible** (Dandan develops on Windows).
- **Job validation per AGENTS.md:** end each phase with HOW TO VALIDATE and JOB DONE. Never self-mark.
- **Keep this plan live:** tasks discovered mid-phase are appended to Atomic Sub-tasks + `.claude/todo.md` *before* doing them.

---

## Phase map

| Phase | Name | Depends on | Risk | Touches Atlas |
|---|---|---|---|---|
| 0 | Safety net: snapshot/restore drill, server test harness, characterization tests, ADR | — | Low | Read-only + backup |
| 1 | Single sources of truth & dead paths | 0 | Low | No |
| 2a | Shared Zod package, observe-mode validation | 1 | Low | No (logs only) |
| 2b | v2 migration: camelCase fields + `schemaVersion` + enforce validation (+ G1/G2) | 2a | **High** | **Yes** |
| 3 | Unified taxonomy store (`taxonomyTerms` + one generic registry service) | 2b | Medium | **Yes** |
| 4 | Course / protein / labels split + menu sections → course | 3 | Medium | **Yes** |
| 5 | Shared master + overrides; admin-only push with dedicated modal | 4 | **High** | **Yes** |
| 6 | One soft-delete model + per-user state (`userPrefs`) | 5 | Medium | **Yes** |
| 7 | Hygiene: god-file decomposition, service base adoption, legacy script archive, CI hardening, rate limits, logging | 6 | Low–Med | No |
| 8 | Governance: ADRs, standards docs, lint guards, re-run audit | 7 | Low | No |

**Sequential-briefs principle holds:** don't start phase N+1 until phase N is merged and validated. Phase 7 sub-briefs are the only ones that may run in parallel worktrees, and only if their files don't overlap.

---

## Phase 0 — Safety net

### Goal
Make every later phase reversible and testable: prove backups restore, stand up server tests, and freeze the *current* behavior of the riskiest server logic as characterization tests.

### Assumed current state (verify in Step 0)
- `npm run repair:backup` → `scripts/backup-before-repair.mjs` exists. `server/scripts/db-backup.js` exists.
- `server/package.json` has no `test` script. No `*.test.js` under `server/`.
- `docs/brain/decisions/` has 0001–0007 and `_TEMPLATE.md`.

### Files to check first
- `scripts/backup-before-repair.mjs`, `server/scripts/db-backup.js`
- `server/routes/generic.js`, `server/services/sync-master.js`, `server/services/clone-master.js`, `server/services/master-version.js`
- `server/package.json`, `.github/workflows/ci.yml`
- `docs/brain/decisions/_TEMPLATE.md`

### Steps
0. **Reality Check** (see READ FIRST).
1. **Backup/restore drill.** Consolidate the two backup scripts into one `server/scripts/db-backup.js` with `--target=local|atlas` and a matching `db-restore.js` (restore into a *named scratch database*, never over the source). Run backup → restore-to-scratch → document-count comparison against **local**, then (after Human host confirm) back up **Atlas** and restore it to a local scratch DB. Record the commands in `docs/agent/standards-backend.md` (new §7 "Backup & restore").
2. **Server test harness.** Add `vitest` + `mongodb-memory-server` + `supertest` to `server/` devDependencies, plus a `test` script. Create `server/test/helpers/app.js`, which builds the Express app without `listen()`. If `server/index.js` doesn't export the app, extract app construction into `server/app.js` and have `index.js` import it. That's the only production change allowed in this phase.
3. **Characterization tests (behavior as-is, including known flaws, each labeled `// CHARACTERIZATION: current behavior`):**
   - `generic.js`: GET scoping (anonymous → `__master__`, authed → own docs), POST stamps `userId`/`_masterId`, PUT sets `_userModified`, `nameSnapshot` rejection, DELETE product blocked when referenced, tombstone vs hard delete, `/search`, `/count` filters, 403 on unknown type.
   - `sync-master.js`: rules 1–4 plus ingredient/sub-recipe/equipment remapping (including sibling sub-recipes cloned in the same run).
   - `push-to-master`: reverse remap and `_userModified` reset.
   These tests are the **regression oracle for Phase 5**, which will deliberately change some of this behavior. Those tests then get rewritten, never silently deleted.
4. **CI:** add a `server-tests` job to `.github/workflows/ci.yml` (`npm ci --prefix server`, then `npm test --prefix server`) and add it to the "Require quality gates" step.
5. **ADR 0008** `docs/brain/decisions/0008-professional-foundation-refactor.md` from the template: records D1–D4, the gates G1–G5 as open, and links this plan.

### Rules
- No behavior changes to production code in this phase, except the `app.js` extraction in Step 2 (pure move, no logic change).
- The test DB is always `mongodb-memory-server`. Tests never connect to local or Atlas.

### Done when
- `npm test --prefix server` passes locally and in CI. There are ≥ 25 characterization tests covering the areas listed in Step 3.
- A restore of the Atlas backup into a local scratch DB has matching document counts per collection, pasted into the session-state file.
- ADR 0008 exists.

---

## Phase 1 — Single sources of truth & dead paths

### Goal
Remove duplication and dead code that later phases would otherwise have to migrate twice: one collection registry, one ID generator, no localStorage mode, no artificial delay, and docs that match the code.

### Assumed current state
- Collection lists in 4 places (see Context), already drifting.
- `makeId` defined in `server/routes/generic.js`, `server/services/sync-master.js`, `src/app/core/services/async-storage.service.ts`.
- `environment.ts` has `useBackend: false` and `useBackendAuth: false`. The other 4 environment files have `true`.
- `StorageService.query(entityType, delay = 100)`.
- `POST /api/v1/data/:type` requires client `_id`.
- `PUT /api/v1/data/:type` (whole-collection replace) exists and is called by `storageService.replaceAll` (e.g. `preparation-registry.service.ts`).
- Rate limiting exists only in `server/routes/auth.js`.
- `render.yaml` has `PERF_LOG: "1"`.

### Files to check first
- `server/constants/*.js`, `src/app/core/services/async-storage.service.ts`, `src/app/core/services/http-storage.adapter.ts`
- `src/environments/*.ts`, `angular.json` (serve configurations)
- `server/routes/generic.js`, `server/index.js`, `server/routes/auth.js` (existing rate-limit setup)
- `docs/agent/standards-backend.md`, `render.yaml`
- Every caller of `replaceAll(` (`grep -rn "replaceAll(" src/app`)

### Steps
0. **Reality Check.**
1. **Collection registry, temporary JS form.** Create `server/constants/collections.js` exporting one array of `{ name, userData, cloneable, backup, searchable }`, and derive `ALL_USER_ENTITY_TYPES`, `CLONEABLE_TYPES` and `SEARCHABLE_ENTITY_TYPES` from it (keep the old exports as derived re-exports so call sites don't change yet). Serve the client's backup list from it too: either generate `BACKUP_ENTITY_TYPES` at build time, or add `GET /api/v1/meta/collections`. Pick build-time generation if simple; otherwise ask. Reconcile the drift *explicitly* and list every collection whose flags change in the PR description. This moves into `shared/schemas/collections.ts` in Phase 2a.
2. **One ID generator.** `newId()` using `crypto.randomUUID()` (Node and browser both support it) in one server module and one client util. **Server generates `_id` on POST.** A client-supplied `_id` is ignored for new docs. Check every client `post()` caller that relies on knowing the id before the response, and make it use the returned doc. **Existing IDs are not rewritten.**
3. **Remove the localStorage mode.** Delete the non-backend branches of `StorageService` and the `useBackend` / `useBackendAuth` flags. `environment.ts` becomes backend-local (same as `environment.local.ts`), or `ng serve` defaults to the `local` configuration. Confirm with the Human which dev target plain `ng serve` should hit. Remove the `delay` parameter entirely. **Keep `backup_<key>` mirroring only if the Human confirms it's still wanted** (ask; it's a localStorage offline-backup feature).
4. **Retire whole-collection replace.** Replace `PUT /api/v1/data/:type` usage with per-document operations or a registry-specific endpoint. If a caller truly needs atomic replace, keep it but restrict it to the registry collections and add a test. Phase 3 removes the registry callers anyway, so prefer a minimal bridge here.
5. **Rate limits.** Reuse the auth.js limiter setup: a moderate limit on `/api/v1/data` writes and a strict per-user limit on `/api/v1/ai`.
6. **Docs vs code.** Fix `standards-backend.md §5` to describe the real contract: anonymous reads of master data are intentional (or, if the Human prefers, make reads authenticated; **ask**, since this is a product decision). Fix the stale `imageUrl_` comment in `recipe.model.ts`.
7. **`render.yaml`:** set `PERF_LOG` to `"0"` (plan 302's sample window is over; confirm plan 302 is closed). **Human action:** mirror it in the Render dashboard, because the live service doesn't sync this file (see the comment at the top of `render.yaml`).
8. **Stale branches:** list remote branches with no commits in 60+ days and no open PR, and post the list. Delete **only** what the Human approves.

### Rules
- No data migration in this phase.
- Step 2 must not change the format of existing IDs in the DB. Mixed-length IDs are fine.

### Done when
- `grep -rn "function makeId" server src` → 0 results. `grep -rn "useBackend" src` → 0 results. `grep -rn "delay = 100" src` → 0 results.
- All derived collection lists come from `collections.js`. A unit test asserts every `ALL_USER` entry has flags.
- Server tests are green. Characterization tests for POST are updated to the server-generated `_id` (the diff is shown in the PR).
- The app works end to end on `dev:local`: create/edit/delete a product, a recipe and a menu event.

---

## Phase 2a — Shared Zod schema package (observe mode)

### Goal
Create the single schema source of truth, derive client types from it, and run validation on the server in **observe mode** (log violations, reject nothing), so we learn what the real data looks like before enforcing anything.

### Assumed current state
- No `shared/` code package. `_shared/` exists, but it holds docs (`_shared/tech-stack.md`). Don't mix code into it.
- Build: `render.yaml` buildCommand = `npm ci --include=dev && npm install --prefix server && npm run build:render`. Start: `node server/index.js`.
- The server is CommonJS JS.

### Files to check first
- `src/app/core/models/*.ts` (all), `tsconfig.json` (paths), `angular.json`
- `package.json` scripts, `server/package.json`, `render.yaml`
- `server/routes/generic.js`

### Steps
0. **Reality Check.**
1. **Package layout.** `shared/schemas/` (TypeScript), with its own `tsconfig.cjs.json` emitting CommonJS to `server/generated/schemas/` (gitignored). Add a root `npm run build:schemas`, and run it from `build:render`, `dev:local`, `serve:prod` and server `npm test` (as `pretest`). Angular consumes the TS source through a tsconfig path `@schemas/*`. Add `zod` to both root and server `package.json`, pinned to the same version.
2. **Write schemas in v2 shape** (the target from D4: camelCase, no trailing `_`). Include `schemaVersion: z.literal(2)`, `ownerId`, `createdAt`, `updatedAt`, and optional `deletedAt`/`deletedBy`. One file per entity. Use discriminated unions where a `kind` exists. Use `.strict()` so unknown keys are violations; that's what catches future "welds".
3. **`field-map.v1-to-v2.ts`:** an explicit map for every current persisted field, e.g. `name_hebrew → nameHebrew`, `yield_amount_ → yieldAmount`, `addedAt_ → createdAt`, `labels_ → labels`, `recipe_type_ → kind`, plus `drop` for deprecated shims (`buy_price_global_`, `supplierIds_`) and `move` for fields leaving the doc (`hiddenBy`, `favoritedBy_` → `userPrefs` in Phase 6; keep them in v2 for now, marked `@deprecated`). Generate it by walking the live data, not only the interfaces: run a read-only script `server/migrations/tools/field-inventory.js` over local + Atlas (Human host confirm) that lists every top-level and nested key per collection with counts. **Any field found in data but not in the interfaces must be reported to the Human.**
4. **`upgradeV1toV2(type, doc)`**, a pure function in `shared/schemas/upgrade/`. Unit-test it with fixtures pulled from the inventory (anonymized). It must be total: every inventoried key is mapped, moved, or explicitly dropped.
5. **Observe-mode middleware** `server/middleware/validate.js`: on every POST/PUT to `/api/v1/data/:type`, run `upgradeV1toV2` then `schema.safeParse`. On failure, log a structured warning `{ type, id, issues }` and **continue with the original write**. Also add a read-only script `server/migrations/tools/validate-all.js` that runs the same check over every stored document and prints a violation report grouped by `type` + `path`.
6. **Client types:** add `src/app/core/models/v2/*.ts` re-exporting `z.infer` types. **Do not switch app code to them yet** (that's 2b). Add a type-level test proving `v2` types are assignable from `upgradeV1toV2` output.

### Rules
- Nothing is rejected in this phase. The DB is not modified.
- Keep the schemas honest: if real data violates a rule the Human considers correct, the report says so. Don't loosen the schema silently.

### Done when
- `npm run build:schemas` works locally and inside the Render build command (prove it with `npm run build:render` locally).
- `validate-all.js` runs against local and Atlas and produces a report with **0 unmapped keys** and a violation count per collection. The report goes to the Human, who decides how each remaining violation class is fixed in 2b (data fix vs schema change).
- Upgrade-function unit tests are green.

---

## Phase 2b — v2 migration: rename, version, enforce

### Goal
Move every stored document to schema v2 in one controlled migration, switch the app to v2 names, and turn validation from observe to **enforce**.

### Assumed current state
- The Phase 2a violation report is reviewed and every violation class has a Human-approved resolution.
- **Gates G1 (merge recipes/dishes) and G2 (rename collections) must be answered in Step 0.**

### Files to check first
- `shared/schemas/**`, `server/middleware/validate.js`, the 2a reports
- Every file in `src/app` that touches persisted fields. Let the compiler find them: after switching imports to v2 types, `ng build` lists every broken access.
- `server/routes/generic.js`, `server/services/*.js`, `server/scripts/**` (any script still expecting v1 names)

### Steps
0. **Reality Check** + ask **G1/G2** + confirm a maintenance window (the migration and deploy go out together; the app is briefly read-only).
1. **Migration `server/migrations/0001-v2-schema.js`:** for every collection, `upgradeV1toV2` → `safeParse` → bulk write, applying the approved per-class resolutions. If G1 = yes: move `RECIPE_LIST` + `DISH_LIST` into `recipes` with `kind`, and `TRASH_RECIPES` + `TRASH_DISHES` accordingly. Sub-recipe references no longer need a `type` to pick a collection. If G2 = yes, rename collections in the same pass. Store `migrations` marker + stats. Follow all Global migration rules (dry run, backup, verify mode, host confirm).
2. **Server:** `validate.js` switches to **enforce**, returning 400 with Zod issues. Remove the v1 upgrade call from the hot path (keep `upgradeV1toV2` only in the migration and a `schemaVersion < 2` guard that returns 409 "document needs migration"). Update the server code and tests to v2 names.
3. **Client:** delete the hand-written interfaces in `src/app/core/models/` (replace them with the `v2` re-exports), then fix every compile error. **Growth-frozen files:** renames only, zero net new lines, verified with `git diff --stat`. `dictionary.json` keys that mirror field names are unaffected unless a UI key embeds a field name; list any.
4. **Scripts:** mark every `server/scripts/legacy-import/*` script as v1-only (header comment + early exit if run against v2 data). They get archived in Phase 7.
5. **Deploy runbook** in the session-state file: backup → migration dry run on Atlas → Human go → migration write → `verify` → deploy → smoke test. **Human action:** confirm the Render dashboard build command includes `build:schemas`, or that `build:render` already calls it.

### Rules
- One PR for the code, one migration run. Don't deploy the code until the migration's `verify` passes.
- Rollback path = the restore from the Step 1 backup + redeploy of the previous commit. It's written into the runbook before running anything.

### Done when
- `validate-all.js` against Atlas → 0 violations. Every doc has `schemaVersion: 2`.
- `grep -rnE "\b[a-z]+_[a-z_]*_\b" src/app/core/models` returns nothing persisted. The `core/models` interfaces are gone, replaced by inferred types.
- Server tests and client unit tests are green. Manual smoke per HOW TO VALIDATE: login, recipe edit + save, dish with sub-recipe, menu event build, export, trash restore.

---

## Phase 3 — Unified taxonomy store

### Goal
Replace the 10+ single-doc registries and their 6 hand-rolled services with one `taxonomyTerms` collection and one generic client store. That way, adding a classification axis (course, protein, kosher type) is a config line, not a new service.

### Assumed current state (post-2b names)
- Registries are stored as `{ items: [...] }` single docs in: KITCHEN_CATEGORIES, KITCHEN_ALLERGENS, KITCHEN_LABELS, KITCHEN_UNITS, KITCHEN_PREPARATIONS, MENU_TYPES, MENU_EVENT_TYPES, MENU_SECTION_CATEGORIES, EQUIPMENT_CUSTOM_CATEGORIES (or their G2 names).
- Services: `metadata-registry.service.ts`, `menu-section-categories.service.ts`, `preparation-registry.service.ts`, `unit-registry.service.ts`, `equipment-category-registry.service.ts`, `menu-event-type.service.ts`.
- `BaseEntityDataService` exists (`core/services/base-entity-data.service.ts`).
- Metadata Manager page: `src/app/pages/metadata-manager/`, including `section-category-manager` and `preparation-category-manager` components.

### Files to check first
- All six registry services and their specs
- `src/app/pages/metadata-manager/**`
- `key-resolution.service.ts`, `translation.service.ts` (how keys map to Hebrew)
- `.claude/reports/label-audit/report.md` + `data.json` (plan 319)

### Steps
0. **Reality Check.** In particular, check whether the Metadata Manager mobile jump-nav / design-port work has changed these components since the snapshot.
1. **Schema:** `shared/schemas/entities/taxonomy-term.schema.ts`, a discriminated union on `kind`: `ingredientCategory | allergen | label | unit | prepCategory | menuType | eventType | sectionCategory | equipmentCategory`, **and already `course | protein`** (plus `kosherType` if G3 is pre-approved; otherwise add it in Phase 4). Common fields: `_id, kind, key, ownerId, sortOrder, createdAt, updatedAt, deletedAt?`. Kind-specific fields: `label.color`, `label.autoTriggers`, `unit.gramRate`, `menuType.fields`, `prepCategory.parentKey?`. Unique index on `{ kind, key, ownerId }`.
2. **Migration `0002-taxonomy-terms.js`:** explode each `{ items }` doc into term docs. Registry order becomes `sortOrder`. Keep master-owned terms as `ownerId: 'master'`. User-owned registry copies are reduced to **only the terms that don't exist in master** (the per-user copies are an artifact of the copy model). **Report** every user term that differs from master by more than key. Use the plan-319 cluster data to *report* (not merge) near-duplicates. Merging is a Phase 4 decision.
3. **Server:** term reads return master ∪ own. Term writes go through the enforce-mode validator. Deleting a term that's referenced by any doc is blocked (same pattern as product referential integrity in `generic.js` DELETE), or it's soft-deleted with a "still used by N items" warning. **Ask the Human which.**
4. **Client:** one `TaxonomyStore` service (signals, `inject()`), `terms(kind)` returns a readonly signal, plus `add/rename/reorder/remove(kind, …)`, built on `BaseEntityDataService` if that fits, otherwise a sibling base. Re-implement the six services as thin facades over it first (so call sites don't change), then inline the facades away in the same PR where it's cheap. Metadata Manager tabs become one generic `taxonomy-kind-manager` component parameterized by `kind` (the design-port layout stays as-is).
5. Delete the old registry collections only after `verify` passes **and** a full app smoke test. Keep the backup.

### Rules
- No change to what the user sees in Metadata Manager beyond the tabs sharing one component (same labels, same order).
- `key` semantics are unchanged. Hebrew display still goes through `translatePipe`.

### Done when
- The six registry services are gone or ≤ 30-line facades. One `TaxonomyStore` + spec with ≥ 90 % line coverage.
- All registry collections are removed from `collections` (the registry module) and replaced by `taxonomyTerms`.
- Metadata Manager: every tab lists, adds, renames and deletes correctly, and a term used by a recipe can't be silently deleted.

---

## Phase 4 — Course / protein / labels split

### Goal
Give recipes first-class `course` and `protein` fields (plus `kosherType` if G3 = yes), migrate the welded legacy labels into them, make menu sections reference `course`, and leave `labels` for freeform tags only.

### Assumed current state
- The `course` and `protein` term kinds exist (Phase 3).
- Recipes carry legacy keys in `labels` (formerly `labels_`) and `autoLabels`.
- `recipe-form.service.ts` has `normalizeLabelKeys`, `buildRecipeFromForm`, `computeAutoLabels`. The label picker is in `recipe-builder/components/recipe-header/recipe-header.component.ts`. Filtering is in `recipe-book-list.component.ts`.
- Menu sections: `MenuSection.name_` (now `name`) is free text, seeded from the old `MENU_SECTION_CATEGORIES` defaults (`'Amuse-Bouche'`, `'Appetizers'`, `'Soups'`, `'Salads'`, `'Main Course'`, `'Sides'`, `'Desserts'`, `'Beverages'`).
- AI menu generation (`server/routes/ai.js`) emits section names from its prompt.

### Files to check first
- `shared/schemas/entities/recipe.schema.ts`, `menu-event.schema.ts`
- `server/scripts/legacy-import/lib/mappings.js` (`CATEGORY_MASTER_MAP`), plan 319 report + `data.json`
- `recipe-form.service.ts`, `recipe-header.component.ts`, `recipe-book-list.component.ts`
- `pages/menu-intelligence/**` (section UI), `server/routes/ai.js` (menu draft prompt + validation), `shared/ai-menu-modal/`

### Steps
0. **Reality Check** + ask **G3**.
1. **Mapping table as data, reviewed by the Human before any write:** `server/migrations/data/0003-label-split-map.json`, one row per distinct label key found in live data (from plan 319 `data.json`), with the target `{ course?, protein?, kosherType?, keepLabel?, dropLabel?, note }`. The draft below comes from `CATEGORY_MASTER_MAP`. Rows marked **review** need a Human call (G4/G5 included). The agent adds every live key the draft doesn't cover (user-created labels, `dairy_prep`-style keys) as `review` rows.

   **Course terms:** `amuse_bouche, starter, soup, salad, main, side, pre_dessert, dessert, bread`
   **Protein terms:** `meat, poultry, fish, seafood, pork, vegetarian` (add `vegan` only if the Human wants it)

   | Legacy key (catId) | course | protein | keep as label | note |
   |---|---|---|---|---|
   | amuse_bouche (19) | amuse_bouche | | | |
   | starter (20) | starter | | | |
   | soups (21) | soup | | | |
   | salads (39) | salad | | | |
   | side_dish (23) | side | | | |
   | pre_dessert (24) | pre_dessert | | | |
   | desserts (25) | dessert | | | |
   | bakery (22) | bread | | | review: course "bread", or a label? |
   | starter_chicken (44) | starter | poultry | | |
   | starter_vegetarian (45) | starter | vegetarian | | |
   | starter_meat (46) | starter | meat | | |
   | starter_fish (47) | starter | fish | | |
   | starter_seafood (50) | starter | seafood | | |
   | main_dish_fish (35) | main | fish | | |
   | main_dish_chicken (36) | main | poultry | | |
   | main_dish_meat (38) | main | meat | | |
   | main_dish_vegetarian (43) | main | vegetarian | | |
   | main_seafood (51) | main | seafood | | |
   | pork_dish (65) | | pork | | review: course unknown |
   | pasta_dish (48) | main | | pasta | review |
   | vegetable_side_dish (52) | side | | vegetables | |
   | starch_side_dish (53) | side | | starch | |
   | grains_side_dish (54) | side | | grains | |
   | legume_side_dish (55) | side | | legumes | |
   | salads_fresh_side_dish (17) | side | | salads | review |
   | special_starter_for_boss (59) | starter | | special_for_boss | |
   | special_main_for_boss (60) | main | | special_for_boss | |
   | special_for_boss (58) | | | special_for_boss | |
   | ideas_preparations (56), ideas_dishes (57) | | | ? | **G4**: status, not label? |
   | trash_category (41) | | | | review: drop, or soft-delete those recipes? |
   | conversions_and_techniques (66) | | | ? | review: are these recipes at all? |
   | dairy_prep (37) | | | dairy | plan 319 cluster → canonical `dairy`; G3 → kosherType dairy? |
   | pastry_sweets (4), cakes_cookies_tarts (74), sorbet_ice_cream_granita (5), sweet_creams_custards_mousse (75) | dessert? | | keep | review: dishes → course dessert; preparations → label only |
   | prep families 2,3,6–16,40,42,63,68–73,76,77 | | | keep | **G5** — keep as labels (default) |
   | dan_and_adi_* (61, 62) | | | keep | collection tag |

   **Rule:** `course` only applies to `kind: 'dish'`. For `kind: 'preparation'`, course-like keys become labels unless the Human says otherwise.
2. **Schema:** `recipe.course?: TermKey<'course'>`, `recipe.protein?: TermKey<'protein'>`, `recipe.kosherType?` (G3). Validation checks that the key exists in `taxonomyTerms` for that kind (server-side, in the validate middleware, with a cached term lookup). `labels` may **not** contain a key that exists as a `course`/`protein` term (enforced), which is the anti-weld guard. `menuSection` gets `courseKey?: TermKey<'course'>`. Keep `name` as a display override, defaulting to the course's Hebrew label.
3. **Migration `0003-label-split.js`:** apply the approved map to `labels` and `autoLabels`. Seed the course/protein terms (master). Map existing menu section names to `courseKey` (`'Appetizers'` → starter, `'Main Course'` → main, etc.). Unmapped section names are **kept** as `name`-only sections and reported. Output a per-recipe before/after sample and totals.
4. **UI (new components; growth-frozen parents only gain the selector tag, net ≤ 0 lines by removing equivalent label-picker code if needed):**
   - `recipe-classification.component` (course select + protein select + kosher select), placed in the recipe header. The label picker shows labels only.
   - Recipe book filters: add Course and Protein filter groups next to Labels.
   - Menu Intelligence: a section picker driven by course terms. A dish added to a section whose course differs from `dish.course` shows a soft warning, not a block.
   - Metadata Manager: the Course and Protein tabs come for free from Phase 3's generic component.
5. **AI:** update the `ai.js` menu-draft prompt/validation to emit `courseKey` from the course term list (sent in the request) instead of free-text section names. Update the recipe-parse prompt to fill `course`/`protein` when inferable. Keep the existing `serving_type_`/menu-type logic untouched.
6. **`computeAutoLabels`:** make sure auto-labels can never produce a course/protein key. Move any auto-trigger that implied protein into protein **suggestion** logic (suggest, don't auto-set).

### Rules
- The Human approves the mapping JSON **before** the dry run, and approves the dry-run report **before** `--write=atlas`.
- No recipe loses information: every legacy key maps to course/protein/label, or has an explicit, Human-approved `drop`.

### Done when
- Atlas: 0 recipes have a course/protein key inside `labels`. The migration report totals are posted.
- In the app: open a formerly `starter_chicken` dish → Course = מנה ראשונה, Protein = עוף, and the labels show no course/protein. Recipe book filters by Course and Protein. New menu sections come from the course list, and AI-generated menus land in course-keyed sections.

---

## Phase 5 — Shared master + per-user overrides

> **Relationship to Plan 322** (`plans/322-admin-master-push-expansion.plan.md`, saved
> 2026-09-30): Plan 322 is the near-term, lower-risk version of this same "admin decides
> what's shared" goal — it works **within** the current clone/`_masterId`/sync-master
> architecture (extends the existing `PUSHABLE_TYPES` allowlist + `askScope()` ternary to
> every entity/taxonomy type, admin-gates it, adds create-shared and non-destructive
> delete-from-master). This Phase 5 is the **later, full replacement** of that same
> architecture (override model, no cloning, `entity-repo.js`). Do not re-derive Plan 322's
> per-entity inventory or design here — when Phase 5 starts, its Step 0 Reality Check must
> read Plan 322's state first and treat its shipped stages as the thing being migrated
> onto the override model (P5.6's migration + P5.7's removal absorb whatever Plan 322 already
> built, rather than Phase 5 re-solving "which entity types need this" from scratch).

### Goal
Replace copy-per-user with one master catalog plus per-user overrides and user-owned docs. Make push-to-master **admin-only** with a **dedicated** confirmation modal.

### Assumed current state
- `clone-master.js` (called at signup in `auth.js`), `sync-master.js` (called at login/refresh in `auth.js`), `master-version.js`, `seed-master.js`, `server/scripts/reset-user-from-master.js`, `bump-master-version.js`.
- Docs carry `userId`, `_masterId`, `_userModified`, `_userDeleted` (or their v2 names).
- `push-to-master` has its admin guard commented out. The client uses `master-push.service.ts` → `confirmModal.openTernary('push_to_master_message')`.
- `user.model.js` has `role: enum ['admin','user']`, and the JWT carries `role`.
- Phase 0 characterization tests exist for sync/clone/push.

### Files to check first
- All of `server/services/*.js`, `server/routes/auth.js`, `server/routes/generic.js`, `server/routes/admin.js`
- `src/app/core/services/master-push.service.ts`, `confirm-modal.service.ts`, `user.service.ts`, `http-storage.adapter.ts`
- Every client place that resolves an ingredient `referenceId` (`recipe-cost.service.ts`, `kitchen-state.service.ts`, recipe-builder ingredient table)

### Steps
0. **Reality Check.** Also confirm with the Human how many real user accounts exist on Atlas and which, besides Dandan's, hold real edits. The migration report is per user.
1. **Design doc first**, `docs/brain/patterns/master-override-model.md`, covering: the read-merge algorithm, override granularity (**whole-document shadow** with `baseId` + `baseVersion`, not field-level patches, for simplicity), how "master changed since your override" is detected (`baseVersion < master.version`), and what the user sees (a badge + "view master changes / revert to master / keep mine"). **The Human approves the doc before code.**
2. **Server repository layer** `server/repositories/entity-repo.js`: `listForUser(type, userId)` = master (not shadowed, not hidden/deleted for the user) ∪ user overrides ∪ user-owned. `getForUser`, `saveForUser` (editing a master doc creates or updates an override with `baseId`; editing an own doc updates in place), `removeForUser` (master doc → per-user hide; own doc → soft delete, unified in Phase 6). `generic.js` routes call the repo. Anonymous reads = master only (if still allowed per the Phase 1 decision).
3. **References:** all references point at master ids or user-owned ids. The resolver picks the user's override if one exists for that `baseId`. **Delete `remapIngredients` / `remapLogistics` and the reverse remap.** Keep `nameSnapshot` enforcement.
4. **Push-to-master (D1):** server returns 403 unless `req.user.role === 'admin'` (uncomment and test). On push: the override's content becomes the new master version, `master.version++`, and the pushing admin's override is deleted (they're back on master). Other users' overrides of that doc now show "master changed". Add an audit entry to `activity_log` (who, what, when, from version → to version).
5. **Dedicated modal (D1):** `MasterPushConfirmModalComponent` (new, standalone, `.c-*` engines only). It shows the entity name and type, a field-level diff summary (changed fields: old → new, Hebrew labels via `translatePipe`), the count of users who currently have an override of this doc, and the explicit sentence "This changes it for every user". Confirm is disabled until the admin ticks "I understand this affects everyone". It **replaces** the `openTernary('push_to_master_message')` call in `master-push.service.ts`. The push UI entry point is **hidden for non-admins** (the server check is the real guard; the hidden button is UX).
6. **Migration `0004-shared-master.js`** (the highest-risk run in the plan). Per user, per collection:
   - clone with `_userModified: false` → **delete** (it equals master); references in the user's own docs that point at it → rewrite to the master id (the reverse of today's remap)
   - clone with `_userModified: true` → becomes an **override** (`baseId = _masterId`, `baseVersion` = the master version at migration time, so it initially shows "up to date")
   - doc with no `_masterId` (or self-referential legacy) → **user-owned**
   - `_userDeleted` tombstone → per-user hide (the `userPrefs` shape is prepared now, fully used in Phase 6)
   - **Golden-view verification:** before the migration, compute each user's *resolved view* (every doc as the user sees it, references resolved to names) with the **old** code path. After it, compute the same view through the new repo. Diff them. **It must be identical** except for documented, Human-approved differences. This is the real test of the migration.
7. **Remove:** `clone-master.js`, `sync-master.js` and their calls in `auth.js`, `reset-user-from-master.js` (replace it with "revert all my overrides", or delete it; ask), and the `_userModified` / `_masterId` fields (schema v3 bump via the same versioned-migration mechanism).
8. **Tests:** rewrite the Phase 0 sync/clone characterization tests into tests of the new repo (read merge, override on edit, hide, push admin-only, push invalidates others' overrides, reference resolution with and without override). Every deleted characterization test is listed in the PR with its replacement.

### Rules
- No migration write until the golden-view diff on a **local restore of Atlas** is clean and approved.
- Signup/login must not trigger any bulk writes afterward. Login latency should drop; measure it before and after.

### Done when
- `grep -rn "syncMasterToUser\|cloneMasterDataToUser\|remapIngredients\|_userModified" server src` → 0 results (outside `server/migrations/` and archived scripts).
- A new signup creates **zero** entity docs. Login performs **zero** writes.
- A non-admin push → 403 (tested). The admin push shows the dedicated modal, not the generic ternary. After the push, a second test user sees the change immediately, and a third user with an override sees a "master changed" badge.
- Golden-view diff: 0 unexplained differences on Atlas.

---

## Phase 6 — One soft-delete model + per-user state

### Goal
Collapse the three deletion mechanisms into one, and move per-user state (favorites, hidden) off shared documents.

### Assumed current state
- 6 `TRASH_*` collections, per-user hides from Phase 5, `hiddenBy` / `favoritedBy` arrays still on docs (marked deprecated in 2a), `trash.service.ts`.

### Files to check first
- `trash.service.ts` + spec, `recipe-data.service.ts`, `dish-data.service.ts` (hide/favorite), `kitchen-state.service.ts`, the trash page/components (`grep -rln "TRASH_" src/app`)

### Steps
0. **Reality Check.**
1. **Model:** user-owned docs and overrides get `deletedAt` + `deletedBy` (soft delete). Master docs are never deleted by users, only hidden per user. Admin deletion of a master doc = `deletedAt` on master (after the dedicated-modal flow from Phase 5, reused). A purge job hard-deletes `deletedAt` older than N days (ask N; propose 30).
2. **`userPrefs` collection** `{ userId, favorites: {type, id}[], hidden: {type, id}[] }` + schema + repo + client `UserPrefsStore`.
3. **Migration `0005-soft-delete-unify.js`:** move `TRASH_*` docs back into their collections with `deletedAt` (preserve the original deletion time if it's stored), move `hiddenBy` / `favoritedBy` entries into `userPrefs`, strip those fields, drop the `TRASH_*` collections after verify.
4. **Trash UI** reads `deletedAt != null` through one query per type. Restore = unset `deletedAt`. The UI is otherwise unchanged.

### Done when
- There are no `TRASH_*` collections and no `hiddenBy`/`favoritedBy` fields in any doc (validator enforces). Favorites and hidden items per user survive the migration (spot-check 3 users). Delete → trash → restore works for product, recipe, dish, equipment, venue, menu event.

---

## Phase 7 — Hygiene & hardening (sub-briefs; may run in parallel worktrees if files don't overlap)

Each sub-brief has its own Step 0 Reality Check and its own `/ship`.

**7a — Decompose god files** (one brief per file, in this order: `menu-intelligence.page.ts` 1413, `recipe-builder.page.ts` 1393, `recipe-book-list.component.ts` 941, `product-form.component.ts` 939, `menu-export.service.ts` 897; `cook-view.page.ts` only if PR #212's split didn't finish it). Extract state into a page-scoped service, and extract sections into child components. Target ≤ 400 lines per `.ts`, and the behavior stays identical. Add component tests for extracted pieces. Remove each file from the growth-frozen list **only** when it's under target. Update `_shared/tech-stack.md` and AGENTS.md accordingly.

**7b — Entity services on one base:** migrate `product-data`, `recipe-data`/`dish-data` (one service if G1 = yes), and `menu-event-data` onto `BaseEntityDataService` (extended as needed for search/pagination per plan 301). Delete the duplicated load/reload code.

**7c — Retire patch scripts:** move `server/scripts/legacy-import/**` (except the read-only `verify-against-source.js` and `audit-against-spec.js`, which become v2-aware regression checks if still useful; ask) plus `migrate-supplier-ids.js`, `fix-supplier-refs.js`, `scripts/migrate-to-master.mjs`, `scripts/repair-*.mjs` and `scripts/diagnose-broken-refs.mjs` into `archive/scripts/` with a README explaining the history. Remove their `package.json` script entries (`repair:*`).

**7d — CI hardening:** add an e2e smoke job (Playwright, 5–8 critical flows: login, create/edit recipe, cost calc, menu build, export, trash restore, admin push modal) against a CI-seeded `mongodb-memory-server` backend. Add `npm run lint --prefix server` to CI (at snapshot `ci.yml` has no server steps at all, even though `server/eslint.config.mjs` exists). Add a coverage report for server tests with a floor of 70 % on `server/repositories` + `server/middleware`.

**7e — Observability:** structured server logging (`pino` + `pino-http`) with a request id propagated to responses (`X-Request-Id`) and included in client `LoggingService` error reports. Replace `console.error('[data/…]')` calls. Keep the PERF_LOG semantics behind a log level instead of a separate env flag.

**7f — Server-side list loading:** plan 301 (`plans/archive/301-server-side-search-lean-data-loading.plan.md`) is archived. Step 0 determines which of its milestones actually shipped (the `/search` and `/count` endpoints exist) and which were deferred; finish the remainder now that reads go through the repo. Remove the `limit 20000` full-collection default for large types.

### Done when (Phase 7 overall)
- No `.ts` file in `src/app` over 600 lines. The growth-frozen list is empty or justified. E2E smoke runs in CI and is a required gate. Server coverage floor is enforced. `archive/scripts/README.md` exists.

---

## Phase 8 — Governance: make it stick

### Goal
Encode the new architecture so future sessions (and future Dandan) can't quietly regress it.

### Steps
0. **Reality Check.**
1. **ADRs:** 0009 schema-first with shared Zod; 0010 shared-master + override tenancy; 0011 taxonomy terms (one collection, kinds); 0012 versioned migrations discipline; 0013 unified soft delete. Update ADR 0008 with the G1–G5 outcomes.
2. **Docs:** rewrite `docs/agent/standards-backend.md` (collection registry now points to `shared/schemas/collections.ts`, the new-entity checklist is "schema → migration → repo → store", and the migration rules are copied from this plan's Global rules). Update `AGENTS.md` hard rules: "Every persisted shape is defined in `shared/schemas`, never a hand-written interface", "Structural classification is never stored in `labels`", "Data changes to existing documents only via `server/migrations/`". Update `_shared/tech-stack.md`. Update `docs/brain/glossary.md` with master, override, term, kind, course, protein, schemaVersion.
3. **Lint guards:** ESLint `no-restricted-imports` banning `src/app/core/models/` legacy paths, and a rule or `scripts/check-*.mjs` guard (the same pattern as `lint:icons` / `lint:no-native-select`) failing if any `interface` in `src/app` declares a persisted-entity name that exists in `shared/schemas`. Wire it into lint-staged + CI.
4. **Skill update:** `.claude/skills/` gets a `new-entity` (or updated `techdebt`/`elegant-fix`) trigger pointing at the schema-first checklist. Add a row to the AGENTS.md skill-trigger table.
5. **Re-run the Architecture Audit:** regenerate the six-dimension scorecard with evidence against the new code, and post the before/after to the Human.

### Done when
- ADRs 0009–0013 are merged, the lint guard is red on a deliberate violation and green on main, and the re-audit shows data-integrity and taxonomy at "Strong" with evidence.

---

## Out of scope (tracked, not done here)
- Server → TypeScript conversion (Zod-generated CJS gives the server validated shapes; revisit after Phase 8).
- i18n library migration (plan 248 Transloco; `dictionary.json` stays).
- PWA / offline (no `manifest.json` / `ngsw-config.json` yet). Note: offline, when it comes, should be a service-worker cache over the HTTP API, **not** a return of the localStorage storage mode removed in Phase 1.
- AI-everywhere phases 2–6.
- Design-port screen work (continues on its own branches; Phase 3/4 Reality Checks must look for conflicts with it).

## Risks
| Risk | Mitigation |
|---|---|
| Parallel sessions change files mid-plan | Mandatory Step 0 per phase; open-PR check; stop and ask on overlap |
| 2b rename touches most of `src/app` → huge diff, merge pain with parallel branches | Schedule 2b when no other feature branches are open (Step 0 asks); compiler-driven renames; one PR |
| Phase 5 migration corrupts a user's view | Golden-view diff on a local Atlas restore before any write; backup + tested restore from Phase 0 |
| Render dashboard ignores `render.yaml` | Explicit Human action items in Phases 1 and 2b |
| Atlas M0 limits (bulk write sizes, no long transactions) | Migrations write in batches (≤ 500 docs), resumable via the marker's `lastProcessedId` |
| Hebrew labels / RTL regressions from taxonomy UI changes | Reuse existing components + `translatePipe`; include RTL screenshots in HOW TO VALIDATE |

---

## Atomic Sub-tasks

### Phase 0 — Safety net
- [ ] P0.0 Reality Check → `docs/session-state-foundation-refactor.md` + Human go
- [ ] P0.1 Consolidate backup + add restore-to-scratch (`server/scripts/db-backup.js`, `server/scripts/db-restore.js`); drill local + Atlas
- [ ] P0.2 Server test harness (`server/package.json`, `server/app.js` extraction, `server/test/helpers/app.js`)
- [ ] P0.3 Characterization tests: `server/test/generic.test.js`, `sync-master.test.js`, `push-to-master.test.js`
- [ ] P0.4 CI `server-tests` job (`.github/workflows/ci.yml`)
- [ ] P0.5 ADR 0008 (`docs/brain/decisions/0008-professional-foundation-refactor.md`)

### Phase 1 — Single sources of truth & dead paths
- [x] P1.0 Reality Check + Human go
- [x] P1.1 `server/constants/collections.js` + derived lists + client backup list; reconcile drift — also fixed a real drift bug (MENU_EVENT_TYPES/EQUIPMENT_CUSTOM_CATEGORIES missing from CLONEABLE_TYPES/BACKUP_ENTITY_TYPES)
- [x] P1.2 Single `newId()` (server + client); server-generated `_id` on POST — client-supplied `_id` still honored when present (appendExisting/trash-restore depends on it, found during implementation)
- [x] P1.3 Remove localStorage mode, `useBackend` flags, `delay` — also removed the now-dead `backup_<key>` localStorage mirror (no confirmation available; safest default given it's meaningless without localStorage mode)
- [x] P1.4 Retire/restrict `PUT /:type` whole-collection replace — restricted to `REPLACEABLE_TYPES` (registries actually in use + TRASH_*/VERSION_HISTORY, broader than originally assumed per Reality Check)
- [x] P1.5 Rate limits on `/api/v1/data` writes (300/15min) and `/api/v1/ai` (20/15min per user)
- [x] P1.6 Fix docs drift (`standards-backend.md §5`, `standards-security.md §9`) + stale `imageUrl_` comment
- [x] P1.7 `render.yaml` `PERF_LOG: "0"` — Render dashboard mirror **done by Human 2026-10-01**
- [x] P1.8 Stale remote branch list gathered (65 branches, 60+ days, no open PR — `gh-pages` excluded, it's the deploy target) — 66 merged branches deleted by Human 2026-10-01; remaining session/claude/audit branches left for a later cleanup

### Phase 2a — Shared Zod (observe)
- [x] P2a.0 Reality Check + Human go
- [x] P2a.1 `shared/schemas/` + `build:schemas` + wiring into build/dev/test scripts
- [x] P2a.2 v2 entity schemas (`shared/schemas/entities/*.schema.ts`)
- [x] P2a.3 `server/migrations/tools/field-inventory.js` run (local + Atlas) → `field-map.v1-to-v2.ts`
- [x] P2a.4 `upgradeV1toV2` + fixture tests
- [x] P2a.5 `server/middleware/validate.js` (observe) + `server/migrations/tools/validate-all.js` report → Human — Atlas run done 2026-10-01: violation classes below sent to Human; unmapped keys deferred to P2b.x
- [x] P2a.6 `src/app/core/models/v2/*` inferred types + type test

### Phase 2b — v2 migration + enforce
- [ ] P2b.0 Reality Check + G1/G2 answers + maintenance window
- [ ] P2b.1 `server/migrations/0001-v2-schema.js` (dry run → Human → local write → verify → Atlas)
- [ ] P2b.x Clean stray keys found in 2a inventory: `ingredients_` on 36 local PRODUCT_LIST docs (not on Atlas); `steps_[].cooking_time_minutes_` on 4 Atlas RECIPE_LIST docs (old name of `cooking_time_secs_`) — Human decides rename vs drop
- [ ] P2b.2 Validator → enforce; server code/tests to v2
- [ ] P2b.3 Client switched to inferred types; delete legacy interfaces; growth-frozen net-zero check
- [ ] P2b.4 Legacy scripts marked v1-only
- [ ] P2b.5 Deploy runbook + Render dashboard check

### Phase 3 — Taxonomy store
- [ ] P3.0 Reality Check + Human go
- [ ] P3.1 `taxonomy-term.schema.ts` (incl. `course`, `protein`)
- [ ] P3.2 `server/migrations/0002-taxonomy-terms.js`
- [ ] P3.3 Server term reads/writes + referenced-term delete policy (ask)
- [ ] P3.4 `TaxonomyStore` + facades → remove six registry services; generic `taxonomy-kind-manager` in Metadata Manager
- [ ] P3.5 Drop old registry collections after verify

### Phase 4 — Course / protein split
- [ ] P4.0 Reality Check + G3
- [ ] P4.1 `server/migrations/data/0003-label-split-map.json` → Human review (G4/G5)
- [ ] P4.2 Recipe + menu-section schema fields + anti-weld validation
- [ ] P4.3 `server/migrations/0003-label-split.js` (dry run → Human → write → verify)
- [ ] P4.4 `recipe-classification.component`, recipe-book filters, menu section course picker
- [ ] P4.5 `server/routes/ai.js` prompt/validation → `courseKey`, `course`/`protein` inference
- [ ] P4.6 `computeAutoLabels` guard + protein suggestions

### Phase 5 — Shared master
> See "Relationship to Plan 322" note above — P5.0's Reality Check must read `plans/322-admin-master-push-expansion.plan.md`'s progress first.
- [ ] P5.0 Reality Check + user-account inventory
- [ ] P5.1 `docs/brain/patterns/master-override-model.md` → Human approval
- [ ] P5.2 `server/repositories/entity-repo.js` + route rewiring
- [ ] P5.3 Remove remapping; override-aware reference resolution (client + server)
- [ ] P5.4 Admin-only push + master versioning + `activity_log` audit
- [ ] P5.5 `MasterPushConfirmModalComponent` replaces `openTernary` in `master-push.service.ts`; hide entry point for non-admins
- [ ] P5.6 `server/migrations/0004-shared-master.js` + golden-view diff tool
- [ ] P5.7 Remove clone/sync services, `_userModified`/`_masterId` (schema v3)
- [ ] P5.8 Replace characterization tests with repo tests

### Phase 6 — Soft delete + userPrefs
- [ ] P6.0 Reality Check + purge-window answer
- [ ] P6.1 `deletedAt`/`deletedBy` model + purge job
- [ ] P6.2 `userPrefs` schema + repo + `UserPrefsStore`
- [ ] P6.3 `server/migrations/0005-soft-delete-unify.js`
- [ ] P6.4 Trash UI on `deletedAt`

### Phase 7 — Hygiene
- [ ] P7a Decompose god files (one sub-brief each)
- [ ] P7b Entity services onto `BaseEntityDataService`
- [ ] P7c Archive patch scripts → `archive/scripts/` + README
- [ ] P7d E2E smoke + server lint + coverage floor in CI
- [ ] P7e Structured logging + request ids
- [ ] P7f Finish remaining plan 301 milestones (server pagination), after confirming what shipped

### Phase 8 — Governance
- [ ] P8.1 ADRs 0009–0013 + update 0008
- [ ] P8.2 Standards/AGENTS/tech-stack/glossary updates
- [ ] P8.3 Lint guard for hand-written entity interfaces
- [ ] P8.4 Skill + trigger-table update
- [ ] P8.5 Re-run Architecture Audit → before/after to Human

---

## Verify (whole plan)
- Every phase's "Done when" is met and Human-validated (`done` / `/ship` Y).
- Atlas: `validate-all.js` → 0 violations. No doc has `schemaVersion` < latest. No `TRASH_*` collections, no per-user catalog copies.
- `npm test --prefix server`, `ng test`, and e2e smoke are all green in CI and required.
- The re-audit scorecard (P8.5) shows every dimension "Strong", or has a documented, Human-accepted reason why not.
