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
- [ ] Add temporary `console.trace()` to `unit-registry.service.ts`'s `initUnits()`
- [ ] Capture both call stacks from one fresh page load via `gstack browse console`
- [ ] Identify the actual second call site from the stack trace
- [ ] Fix it (guard, dedupe, or remove the redundant call — exact fix depends on what the trace shows)
- [ ] Remove the temporary trace
- [ ] Verify: `KITCHEN_UNITS`/`EQUIPMENT_LIST` fetch once on `/dashboard` and `/recipe-builder`
- [ ] Verify: unit creator flow still works (add a new unit end-to-end)

## Milestone 2 — Version-gate syncMasterToUser
- [ ] Load the `auth-and-logging` skill first
- [ ] Audit every write path to `userId: '__master__'` docs (seed scripts, admin tools) to find where a version/timestamp bump would go
- [ ] Decide timestamp vs. counter; document the choice in this plan file
- [ ] Add the version field to the master-metadata source and to `User`
- [ ] Gate `syncMasterToUser` in `server/routes/auth.js:274` on version mismatch
- [ ] Regression test: brand-new signup still gets correctly cloned + remapped master data (plan 303 M3's third item)
- [ ] Verify: unchanged-version refresh skips the sync (log line + manual check)
- [ ] Verify: changed-version refresh still syncs
- [ ] `ng build` + server syntax check both pass

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
