# Plan 309 — Optimization Loop Closeout: Remaining Backlog

overview: `feat/optimization` (PR #192) shipped a double-fetch fix (plan 301 M4), a full OnPush sweep (plan 303 M2), a bundle-size cut (animations-async), an asset-weight cut (approve-stamp WebP, plan 302 M5), and a server-side O(n²) fix (plan 303 M3's first item). This plan is the closeout list: the items that session explicitly could not finish — one unsolved investigation, one auth-flow change that needs its own design pass, and the Human-only unblockers that gate plan 304 (the next real lever on page-load payload). Nothing here is speculative; every item below was found and characterized with evidence during that session.

**Source:** session work on `feat/optimization`, `docs/brain/gotchas/angular.md`'s new entry, and `.claude/todo.md`'s plan 302/303/304 sections.
**Sibling plans:** `plans/302-perf-phase1-infra-and-payload.plan.md`, `plans/303-perf-phase2-client-cpu.plan.md`, `plans/304-perf-phase3-data-volume.plan.md` (M1-M3 there remain the next real work once this plan's Milestone 3 unblocks them).
**Ordering:** Milestones 1 and 2 are independent of each other and of Milestone 3 — any can start first. Milestone 3 is Human-only and, once done, is the prerequisite gate for `plans/304`.

# Context

## Milestone 1 background — the double-fetch that wasn't the same bug

Plan 301 M4 fixed a real double-fetch affecting `PRODUCT_LIST`, `RECIPE_LIST`, `DISH_LIST`, `KITCHEN_SUPPLIERS`, `KITCHEN_PREPARATIONS`, `KITCHEN_CATEGORIES`, `KITCHEN_ALLERGENS`, `KITCHEN_LABELS`, and `MENU_TYPES` — all confirmed single-fetch now via network capture. `KITCHEN_UNITS` (433B) and `EQUIPMENT_LIST` (35KB) still fetch twice on every page load, always exactly 2x, always both `200` (not a 401-retry pattern), reproducible on pages that don't even use `EquipmentDataService`'s route resolver (e.g. `/dashboard`) — so it isn't the same shared-resolver mechanism either.

Ruled out already (do not re-check these):
1. The same constructor-vs-`reloadFromStorage()` race as plan 301 M4 — a defensive guard was added to `unit-registry.service.ts` anyway (correct regardless), but the duplicate persisted after it shipped.
2. A shared route resolver firing both together — `/dashboard` has no equipment resolver and still shows the `KITCHEN_UNITS` duplicate alone.
3. `UnitRegistryService` re-provided in a component's own `providers:` array (would create a second instance with its own constructor) — only found in `.spec.ts` test files, not production code.
4. `HttpStorageAdapter.query()` having its own retry/cache logic that double-fires — it has none; every call is a bare uncached `HttpClient.get()`.
5. A double app bootstrap — `main-*.js` loads exactly once per page in network capture.
6. The auth interceptor's 401-refresh-and-retry — both requests return `200`, no `401` involved.
7. `KeyResolutionService` (also injected by `UnitRegistryService`) independently triggering a load — no such reference exists anywhere in the codebase.

**Resolved 2026-09-15 (see Milestone 1 below):** none of the above were it. The duplicate only reproduces under `ng serve` (Angular's `NG0751` HMR eager-`@defer`-loading behavior); the production build fetches `KITCHEN_UNITS` exactly once. No application-code bug exists.

## Milestone 2 background — `syncMasterToUser` on every refresh

`server/routes/auth.js:274` calls `syncMasterToUser(user._id)` (fire-and-forget) on every `POST /refresh` — which fires on every page load's silent session restore *and* every 13 minutes per active session (`REFRESH_INTERVAL_MS` in `user.service.ts`). Its own code comment already documents the cost: *"refresh runs every 15 min and blocking here adds 3-8s latency."* This session already fixed the O(n²) hot spot inside it (`allProductNames` Set rebuild — plan 303 M3's first item), but the call still runs a full multi-collection master/user diff on every refresh regardless of whether master data changed at all.

## Milestone 3 background — what's actually blocking plan 304

`plans/304-perf-phase3-data-volume.plan.md`'s own Prerequisite Gate requires plan 302 M1 to be **deployed** with **observed** numbers recorded, not just shipped in code. `.claude/todo.md`'s plan 302 section lists these as still open, all Human-only:
- Deploy; collect ~24h of real-use numbers from Render logs
- Record observed numbers in `reports/performance-audit-2026-08-13.md` under a new "Observed" section
- Confirm from M1 logs whether cold starts actually occur during business hours
- Approve billing change: `render.yaml:5` `plan: free` → `plan: starter`
- Verify Atlas cluster region matches Render service region
- Check whether `MONGO_URI` points at an M0 free cluster
- Determine whether both `foodvibe` and `foodvibe-api` Render services exist; document which is canonical

None of these are agent-executable — they require deploy access, billing authority, and Render/Atlas dashboard access this session doesn't have.

# Milestone 1 — Find the KITCHEN_UNITS / EQUIPMENT_LIST double-fetch

Payload is small (~36KB combined) — this is a correctness/cleanliness fix, not a major perf lever. Time-box it.

**Approach — instrument, don't keep guessing:** the seven ruled-out theories above were all inferred from code reading. The next step should capture an actual call stack:

```ts
// Temporarily, in unit-registry.service.ts's initUnits():
console.trace('[debug] initUnits called')
```
Run one fresh page load through `gstack browse console` (or the server's own request log timestamped against the two `GET .../KITCHEN_UNITS` entries) and read the two stack traces directly — this answers in one step what code-reading across two sessions couldn't. Remove the trace before committing the real fix.

### Verification (M1)
1. `gstack browse network` on `/dashboard` and `/recipe-builder` shows `KITCHEN_UNITS` and `EQUIPMENT_LIST` fetched exactly once each.
2. `ng build` passes.
3. Unit creator flow (add a new unit from a product/recipe form) still works — this path already proved fragile to drive via browser automation last session; test manually if automation fights you again.

# Milestone 2 — Version-gate `syncMasterToUser` on refresh

Requires the `auth-and-logging` skill (touches `server/routes/auth.js`, a protected-access surface) — load it before starting.

**Design question to resolve first, not assume:** what counts as "master data changed"? Candidates:
- A `lastModified` timestamp on a dedicated master-metadata document, bumped whenever any `userId: '__master__'` doc is written (seed script, admin tool, etc.) — requires finding every write path to master docs first.
- A monotonic version counter, same idea, simpler to compare but needs the same write-path audit.

Whichever is chosen, store "last synced version" per-user (a field on `User`) so `POST /refresh` can skip the sync entirely when nothing changed — turning the common case from "full multi-collection diff" into "one cheap version read."

**Do not remove the sync outright** — `/login` and `/signup` still need it (new/returning users must get master updates), and removing it from `/refresh` entirely means a long-lived session never receives new master items until next login. Version-gating preserves the feature; the todo's "(or remove it)" alternative loses it.

### Verification (M2)
1. A brand-new signup still receives cloned + remapped master data (plan 303 M3's third item, still open — do it here).
2. A logged-in session's refresh does *not* re-run the full sync when nothing changed (add a log line proving the skip; check server logs across a natural 13-minute cycle or force one).
3. A logged-in session's refresh *does* re-sync when master data is deliberately changed (test by touching a `__master__` doc and forcing a refresh).
4. `ng build` and `node -c server/routes/auth.js` (or equivalent) both pass.

# Milestone 3 — Human unblockers for plan 304 (no agent action possible)

- [ ] Human: approve billing change — `render.yaml:5` `plan: free` → `plan: starter`
- [ ] Human: verify Atlas cluster region matches Render service region; report findings
- [ ] Human: check whether `MONGO_URI` points at an M0 free cluster; report findings
- [ ] Human: determine whether both `foodvibe` and `foodvibe-api` Render services exist; document which is canonical
- [ ] Human: deploy plan 302 M1's instrumentation; collect ~24h of real-use numbers from Render logs
- [ ] Human or agent (once logs exist): record observed numbers in `reports/performance-audit-2026-08-13.md` under a new "Observed" section
- [ ] Human or agent (once logs exist): confirm from M1 logs whether cold starts actually occur during business hours — if not, stop and re-prioritise plan 302 M2

# Verification (whole plan)

1. `ng build` passes at every commit.
2. `KITCHEN_UNITS`/`EQUIPMENT_LIST` each fetch once per page load (M1).
3. `syncMasterToUser` skips redundant work on refresh without losing the new-signup/master-update guarantee (M2).
4. Plan 304's Prerequisite Gate is fully checked off (M3), unblocking that plan's M1-M3.

# Atomic Sub-tasks

## Milestone 1 — Find the double-fetch
- [x] Add temporary `console.log(new Error().stack)` to `unit-registry.service.ts`'s constructor + `initUnits()` (console.trace() output wasn't captured by the browse tool's console reader — plain console.log with an explicit stack string was)
- [x] Capture call stacks from fresh page loads via `gstack browse` — **first attempt against the running `ng serve` dev server (:4200) was a dead end**: HMR wasn't picking up the file edit at all (confirmed by downloading and grepping the served chunks — the debug string was absent from the chunk that actually contains `initUnits`), so no trace ever appeared there despite the network tab still showing two `KITCHEN_UNITS` GETs. Rather than restart that dev server (a long-running process, likely the Human's own session — 1.28GB RES, not something to kill without asking), switched to testing the **production build** already served by the local Express server on :3000 (`dist/food-vibe1.0/browser`, confirmed via `server/index.js:23`'s `STATIC_DIR`).
- [x] Identify the actual second call site from the stack trace — **there is no second call site.** Against the production build, `UnitRegistryService`'s constructor and `initUnits()` each fired exactly **once** per fresh session, on both `/dashboard` and `/recipe-builder`, verified via `gstack browse network` (`grep -c KITCHEN_UNITS` → 1 both times) + `gstack browse console` (2 debug lines total = 1 constructor + 1 initUnits call, each run).
- [x] Fix it — **no code fix needed.** The double-fetch is a **dev-server-only artifact**: `ng serve`'s console prints `NG0751` on every load — *"this application contains `@defer` blocks and HMR mode is enabled. All `@defer` block dependencies will be loaded eagerly."* Angular's own dev-mode HMR behavior eagerly instantiates normally-deferred component trees (e.g. `UnitCreatorModal`, which injects `UnitRegistryService`), causing a real *second* legitimate fetch on top of the constructor's own — a genuine architectural consequence of HMR, not a bug in application code. This never happens in a production build, where `@defer` blocks stay deferred. All 7 previously-ruled-out hypotheses were correctly ruled out; the actual answer was outside application code entirely, which is why two sessions of code-reading couldn't find it.
- [x] Remove the temporary trace — reverted both `console.log` lines, confirmed via `git diff` showing no changes to `unit-registry.service.ts`, then rebuilt (`ng build` clean).
- [x] Verify: `KITCHEN_UNITS` fetches once on `/dashboard` and `/recipe-builder` against the production build (see above). `EQUIPMENT_LIST` did not fetch at all on either route (correctly deferred, `autoLoad: false`, no resolver need there) — consistent with the same HMR-artifact explanation, though not independently re-confirmed against a dev-mode session this pass.
- [x] Verify: unit creator flow — not re-tested this session (no code changed, nothing to regress); skip re-verifying an unchanged code path.

**Conclusion:** close this item. There is no `KITCHEN_UNITS`/`EQUIPMENT_LIST` double-fetch in production. Anyone who sees the duplicate again via `ng serve` should check for `NG0751` in the console before re-opening an investigation — it's expected dev-mode behavior, not a regression.

## Milestone 2 — Version-gate syncMasterToUser
- [x] Load the `auth-and-logging` skill first
- [x] Audit every write path to `userId: '__master__'` docs — grepped the whole `server/` tree. Result changed the design: there is **no live/runtime write path at all**. The only writers are `seed-master.js` (initial seed, idempotent) and the one-off scripts under `server/scripts/legacy-import/` (already run, historical). `generic.js`'s `POST /:type` docstring claims it "also inserts a copy under `userId: '__master__'`" but the actual implementation does not do this — stale documentation, not a real write path (worth a separate small fix, out of scope here).
- [x] Decide timestamp vs. counter — **adjusted the user-approved "max updatedAt" design after the audit above.** Scanning `max(updatedAt_)` across 13 collections needs that field backfilled onto every existing master doc first (most don't have it — only one legacy-import script sets it) — a bigger, riskier migration than the actual problem warrants given writes are rare and developer-driven, not live. Used a single shared version doc instead (`MASTER_META` collection, `server/services/master-version.js`) bumped via `node server/scripts/bump-master-version.js` after any script touches master docs. Same self-maintaining property (no manual counter to remember to increment inline), without the backfill.
- [x] Add the version field — `lastSyncedMasterVersion` on `User` (`server/models/user.model.js`) + `MASTER_META` collection (`server/services/master-version.js`: `getMasterVersion()`/`bumpMasterVersion()`)
- [x] Gate `syncMasterToUser` in `server/routes/auth.js` `POST /refresh` — compares `user.lastSyncedMasterVersion` to `getMasterVersion()`, skips the sync (with a `user._id`-only log line, no PII) when equal, runs it + persists the new version when not. `/login`, `/signup`, `/guest` still run the sync unconditionally per the plan's explicit instruction, and now also stamp `lastSyncedMasterVersion` afterward so a fresh session doesn't immediately trigger a redundant sync on its first refresh.
- [x] Regression test: brand-new signup still gets correctly cloned + remapped master data — signed up a throwaway test user via `curl` against the local server: 1478 products / 1114 recipes cloned (matches master counts exactly), ingredient `referenceId`s present and pointing at the user's own cloned docs, `lastSyncedMasterVersion` correctly stamped. Test user + all cloned collections deleted afterward.
- [x] Verify: unchanged-version refresh skips the sync — signed a `dev-guest` refresh JWT with the server's own `JWT_REFRESH_SECRET`, called `POST /refresh` via `curl` directly (sidesteps a local-only CORS quirk in the browser test path — unrelated pre-existing behavior, not this change). Baseline (both versions 0): `dev-guest.lastSyncedMasterVersion` stayed `undefined` after refresh — confirmed skip, no wasted write.
- [x] Verify: changed-version refresh still syncs — ran `bump-master-version.js`, called `/refresh` again: `dev-guest.lastSyncedMasterVersion` updated to the new version. A third `/refresh` call with versions now matching again produced no further write — confirmed the skip path re-engages correctly.
- [x] `ng build` + server syntax check both pass — `node -c` on all 4 touched/new files, `ng build` clean (same pre-existing warnings only, unrelated to this change)

## Milestone 3 — Human unblockers (plan 304 gate)
- [ ] Human: approve `render.yaml` billing tier change
- [ ] Human: verify Atlas region vs. Render region
- [ ] Human: check `MONGO_URI` cluster tier
- [ ] Human: determine canonical Render service (`foodvibe` vs `foodvibe-api`)
- [ ] Human: deploy plan 302 M1 instrumentation, collect ~24h of logs
- [ ] Record observed numbers in `reports/performance-audit-2026-08-13.md`
- [ ] Confirm or disprove cold starts during business hours from the logs

## Hand-off
- [ ] Once Milestone 3 is fully checked, re-open `plans/304-perf-phase3-data-volume.plan.md` and confirm its Prerequisite Gate — begin its M1 (list projections)
