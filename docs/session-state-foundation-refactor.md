# Session State — Plan 321 (Professional Foundation Refactor)

## Branch
fix/render-env-vars-and-gitignore (Phase 0 work should move to `chore/foundation-p0-safety-net` before any commits, per plan Global rules)

## Plan
`plans/321-professional-foundation-refactor.plan.md`

---

## Phase 0 — Reality Check (2026-09-29)

### 1. Commits since snapshot
`origin/main` is still exactly at `1f0d7458` (2026-09-29 13:55 +0300) — 0 commits since the plan snapshot. No drift on `main`.

Current branch (`fix/render-env-vars-and-gitignore`) has unpushed commits ahead of that snapshot (`68709710`, `5bc73a0e`, …) — unrelated to Phase 0 scope (session-lock/parallel-worktree tooling, JWT env var fix), no file overlap with Phase 0's "Files to check first".

### 2. Open branches/PRs
`gh pr list --state open` → none. ~90 stale remote branches exist (listed, not reproduced here) but none touch `server/scripts/db-backup.js`, `server/package.json` (server), `.github/workflows/ci.yml`, or `docs/brain/decisions/`. No collision.

### 3. Ledger / session-state / newer plans
- `.claude/todo.md`: Plan 321 entry added this session (Phase 0–8 checklist). No other open item overlaps Phase 0 scope.
- Newest session-state file (`docs/session-state-feat-session-20260929.md`, 2026-09-29): documents a **two-slot parallel-session system** — a persistent second worktree `../foodVibe1.0-wt-parallel` plus a liveness lock (`.claude/.session-lock`, 45-min TTL). Also confirms `../foodVibe1.0-wt-recipe-labels` (branch `feat/recipe-labels-course-field`) is real in-progress work on Plan 320's follow-ups (clearable course + cascade-delete for labels/courses) — **unrelated domain to Phase 0** (recipe/metadata UI vs. server test harness/backup scripts), no file overlap.
- `plans/` newer than 320: only this plan (321). No other new plan competes for Phase 0 scope.

### 4. Assumed current state → live verification

| Assumption | Status | Evidence |
|---|---|---|
| `scripts/backup-before-repair.mjs` exists | ✅ still true | file present |
| `server/scripts/db-backup.js` exists | ✅ still true | file present |
| `server/package.json` has no `test` script | ✅ still true | scripts = `{start, dev, dev:local, dev:remote}`, no `test` key |
| No `*.test.js` under `server/` | ✅ still true | `find server -iname "*.test.js"` → 0 results |
| `docs/brain/decisions/` has 0001–0007 + `_TEMPLATE.md` | ✅ still true | exactly `_TEMPLATE.md`, `0001`–`0007` present, next free slot is `0008` as the plan expects |
| `server/routes/generic.js`, `server/services/{sync-master,clone-master,master-version}.js` exist | ✅ still true | all present |
| `.github/workflows/ci.yml` exists, has `lint`/`build`/`test`/`gitleaks` jobs, no server-test job | ✅ still true | job list = `changes, lint, build, test, gitleaks, …`; no `server-tests` job yet (P0.4 target) |

**No drift. No adjustments needed. Clear to proceed with Phase 0 Steps 1–5 as written.**

---

**STATUS: Human gave explicit go (chat, 2026-09-29) to proceed continuously through the plan without per-step confirmation, except for actual Atlas writes/migrations and architectural decision gates (G1–G5), which still get flagged.**

**Gates G1/G2/G3 decided 2026-09-29 (batched ahead of schedule, at Human's request):** all three YES (merge recipes/dishes, rename collections, separate `kosherType`). Recorded in the plan file's Decision gates table. G4/G5 remain open for Phase 4.

---

## Phase 0 — Execution log (2026-09-29)

Branch: `chore/foundation-p0-safety-net` (created from `fix/render-env-vars-and-gitignore`, which was itself ahead of `origin/main` by unrelated infra commits — not rebased onto a fresh `main` to avoid stash/checkout churn on other uncommitted work in the tree; low risk since those commits don't touch Phase 0 files).

- **P0.1 Backup/restore drill:**
  - Wrote `server/scripts/db-restore.js` (didn't exist — `db-backup.js`'s own docstring referenced it as if it did). Restores a snapshot into a named scratch database; refuses to run if `--db` matches the source db name or already has collections; verifies per-collection doc counts against the snapshot's `_manifest.json`.
  - First local backup run **crashed before writing a manifest**: `db-backup.js` enumerated Mongo's internal `system.views` namespace (exposed because `RECIPE_BOOK_VIEW` is a real DB view) as an ordinary collection, then failed with "not authorized" trying to read it — every prior "backup" from this script was silently incomplete. Fixed by filtering `system.*` names out of the collection list.
  - Local drill (re-run after the fix): 30 collections, 11,769 docs, backed up and restored into `foodvibe_scratch_p0drill` with **0 mismatches**. Scratch DB left in place (app's DB user lacks `dropDatabase` outside its primary db — needs manual/admin cleanup, low stakes for local dev).
  - Atlas leg: blocked on the auto-mode classifier's "Production Reads" denial; Human ran `node server/scripts/db-backup.js --target=atlas` directly (`!` prefix). Result: 24 collections, 15,765 docs, written to `foodvibe-db-backups/atlas-2026-09-29T11-58-58/`.
  - Restored that Atlas snapshot into local scratch DB `foodvibe_scratch_atlas_p0drill`: **all 24 collections match, 0 mismatches.** Backup/restore drill is proven end-to-end for both local and Atlas.
  - Documented both scripts in `docs/agent/standards-backend.md` new §7.
- **P0.2 Server test harness:** extracted `server/app.js` (pure move, no logic change) so `server/index.js` is now just the boot/listen sequence; added `server/test/helpers/app.js` (mongodb-memory-server + supertest, one instance per test file); added `vitest`/`mongodb-memory-server`/`supertest` devDependencies + `npm test` script to `server/package.json`; `vitest.config.js` runs test files in isolated forked processes (each mutates `process.env` and requires the app as a singleton).
- **P0.3 Characterization tests:** 42 tests across `test/generic.test.js` (21), `test/sync-master.test.js` (7), `test/push-to-master.test.js` (8) — covers GET scoping (anon → master, authed → own docs), `_userDeleted` exclusion, POST stamping + 409 on duplicate id, PUT reserved-field stripping + `nameSnapshot` enforcement, DELETE tombstone-vs-hard-delete + referential-integrity block, bulk delete, whole-collection replace + id-collision reassignment, search/count endpoints, all 4 sync-master rules + ingredient/sub-recipe remapping + PRODUCT_LIST name-collision skip, and push-to-master's open (non-admin) guard + reverse remap + version bump. All 42 pass.
- **P0.4 CI:** added `server-tests` job to `.github/workflows/ci.yml` (gated by the same `changes` job as `lint`/`build`/`test`), wired into the `ci` gate's `needs` and its "Require quality gates" check.
- **P0.5 ADR:** `docs/brain/decisions/0008-professional-foundation-refactor.md` — records D1–D4 and G1–G5, links the plan.
- **`ng build`**: clean (pre-existing warnings only — 2 NG8102 unnecessary-`??` in venue components, already on the `.claude/todo.md` tech-debt list; not in Phase 0 scope).

### Status: Phase 0 done-when criteria fully met.
Two scratch DBs left in place for inspection (`foodvibe_scratch_p0drill`, `foodvibe_scratch_atlas_p0drill`) — drop manually via an admin-scoped connection when convenient; not urgent.

---

## Phase 1 — Reality Check (2026-09-29)

Branch: `chore/foundation-p1-single-source-of-truth` (from `origin/main` post-Phase-0-merge, `248cb17d`).

### 1. Commits since Phase 0 merge
None — this Reality Check runs immediately after.

### 2. Open branches/PRs
`gh pr list --state open` → none.

### 3. Ledger / session-state / newer plans
`.claude/todo.md` Plan 321 entry is current (Phase 0 done, Phase 1 next). No competing work.

### 4. Assumed current state → live verification

| Assumption | Status | Evidence |
|---|---|---|
| Collection lists in 4 places (3 server constants files + client `BACKUP_ENTITY_TYPES`) | ✅ still true | `server/constants/{all-user-entity-types,cloneable-types,searchable-entity-types}.js` + `async-storage.service.ts` |
| `makeId` defined in generic.js, sync-master.js, async-storage.service.ts (3 places) | ⚠️ changed — more places | Actually 6 server-side standalone functions (`auth.js`, `generic.js`, `clone-master.js`, `seed-master.js`, `sync-master.js`, `legacy-import/lib/transform.js`) + 1 client-side **method** (`AsyncStorageService.makeId()`, not a standalone function — `grep "function makeId"` misses it). Adjustment: `newId()` consolidation covers all 6 server call sites except `legacy-import/` (v1-only, retired in Phase 2b Step 4 — not touched). |
| `PUT /:type` (whole-collection replace) called only by `preparation-registry.service.ts` | ⚠️ changed — much broader usage | 6 services call `storage.replaceAll(...)`: `preparation-registry.service.ts` (registry, as assumed) **and** `dish-data`, `equipment-data`, `product-data`, `recipe-data`, `venue-data`, `version-history` services — all for **TRASH_\* clear-all / restore-all**, not registry replacement. Adjustment: restrict the endpoint to registry **and** TRASH_\*/VERSION_HISTORY collections, not registries only — both categories are transitional (registries → Phase 3, TRASH_\* → Phase 6). |
| `environment.ts` has `useBackend: false` / `useBackendAuth: false` | ✅ still true | |
| Rate limiting only in `auth.js` | ✅ still true | |
| `render.yaml` `PERF_LOG: "1"`, plan 302 closed | ✅ still true | plan 302 fully archived, M1 sample collected 2026-09-27 |
| `standards-backend.md §5` drift (doc says auth-only, code allows anonymous master reads) | ✅ still true — resolved | Human decided: keep anonymous reads (batched question this session), just fix the doc |
| `recipe.model.ts` stale `imageUrl_` comment | ✅ still true | |

**STATUS: proceeding directly into Phase 1 implementation (Low risk, no Atlas) per the Human's "run till the plan is done" instruction.**

---

## Phase 1 — Execution log (2026-09-29)

Branch: `chore/foundation-p1-single-source-of-truth` (from `origin/main` post-Phase-0-merge).

- **P1.1:** `server/constants/collections.js` is now the single registry; the 3 old constants files re-export from it. Found and fixed a real drift: `MENU_EVENT_TYPES`/`EQUIPMENT_CUSTOM_CATEGORIES` were in `ALL_USER_ENTITY_TYPES` but missing from `CLONEABLE_TYPES`/`BACKUP_ENTITY_TYPES` — added to both. Added `scripts/check-backup-entity-types.mjs` (`npm run lint:backup-entity-types`) to catch future drift — not yet wired into CI (matches the pre-existing gap on `lint:icons`/`lint:no-native-select`, didn't expand scope to fix that too).
- **P1.2:** `server/utils/id.js` (`newId()`, `crypto.randomUUID()`) replaces 5 duplicated `makeId()` implementations (auth.js, generic.js, clone-master.js, seed-master.js, sync-master.js). `src/app/core/utils/id.util.ts` is the client equivalent, used by `preparation-registry.service.ts`. **Mid-implementation finding:** the plan's "client-supplied `_id` is ignored for new docs" would have broken `HttpStorageAdapter.appendExisting()` (trash restore), which posts through the same `POST /:type` route and depends on the server honoring its `_id`. Adjusted: server generates `_id` only when the body omits one; a supplied one is still honored.
- **P1.3:** Removed `StorageService`'s entire localStorage fallback (now a thin facade over `HttpStorageAdapter`), the `useBackend`/`useBackendAuth` flags from all 5 environment files, the `delay` param from `query()`, and the `backup_<key>` mirror (`BACKUP_ENTITY_TYPES`'s localStorage consumer — the mechanism is meaningless without localStorage mode; no live confirmation available, removing is the safer default over keeping dead code). `environment.ts` (plain `ng serve`) now matches `environment.local.ts`. **Real regression found and fixed:** `UserService`'s constructor previously gated its silent-refresh HTTP call behind `useBackendAuth`; removing that gate means it now *always* touches `HttpClient` on construction — correct for prod, but broke 5 spec files (23 test failures) that constructed real `UserService`/`KitchenStateService`/etc. without providing `HttpClient` in tests. Fixed by adding `provideHttpClient()` + `provideHttpClientTesting()` to each (matches the existing pattern already used in `dashboard.page.spec.ts`). Also deleted now-dead fake-guest-login/fake-localStorage-signup code paths in `auth-modal.component.ts` and `user.service.ts` — this is the exact "fake auth" behavior the `worktree-dev-server-needs-local-config` memory warned about; it can no longer happen.
- **P1.4:** `PUT /:type` (whole-collection replace) restricted to a `REPLACEABLE_TYPES` allowlist. **Reality Check correction:** the plan assumed only `preparation-registry.service.ts` used this; actually 6 services use it for `TRASH_*`/`VERSION_HISTORY` clear-all/restore-all/trim. Allowlist = `KITCHEN_PREPARATIONS` + all `TRASH_*` + `VERSION_HISTORY`.
- **P1.5:** `dataWriteLimiter` (300/15min, writes only) on `/api/v1/data`; `aiLimiter` (20/15min, keyed by `userId`) on all 11 `/api/v1/ai` write routes.
- **P1.6:** Fixed `standards-backend.md §5` and `standards-security.md §9` — both incorrectly claimed all reads require a JWT; corrected to describe the real, intentional `optionalToken` behavior (Human confirmed this session: keep anonymous master-data reads). Fixed stale `imageUrl_` "Base64 data-URL" comment (images are on Cloudinary).
- **P1.7:** `render.yaml` `PERF_LOG` → `"0"` (plan 302's sample was collected 2026-09-27, confirmed closed). **Open Human action:** mirror in the Render dashboard — the file doesn't auto-sync to the live service.
- **P1.8:** Gathered 65 remote branches with no commits in 60+ days and no open PR (full list not reproduced here — see git). Excluded `gh-pages` from candidates (it's the GitHub Pages deploy target, not stale). **No deletions made — awaiting explicit Human approval of which (if any) to delete**, per the plan's own rule.
- **Verification:** `npm test --prefix server` → 49/49 pass. `ng build` → clean (same pre-existing warnings only). `ng test` → 309/309 pass (after fixing the HttpClient regression above). Live browser click-through (create/edit/delete a product/recipe/menu event on `dev:local`) **not done** — flagging explicitly rather than claiming it.
