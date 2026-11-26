# Plan 234 Archive Audit
**Date:** 2026-04-13
**Auditor:** auto-solve enforcement run (Plan 265)
**Source archive:** `.claude/todo-archive.md` (lines 1670–1704)
**Evidence base:** `gh pr list --state merged`, `git log --oneline --all`, user confirmation

---

## CODE EVIDENCE CONFIRMED

All tasks below are confirmed present on `main` via PR #53 (`feat(data): per-user collections + Render deployment`, merged 2026-03-29).

- [x] Create `server/constants/cloneable-types.js` — exports CLONEABLE_TYPES array
- [x] Fix `scripts/seed-from-dump.js` — replace broken Entity model; add userId/__masterId/_userModified to $setOnInsert *(file later deleted in Plan 255 Task 5)*
- [x] Create `scripts/stamp-master-userId.js` — --confirm-stamp flag; production guard; updateMany per CLONEABLE_TYPES *(file later deleted in Plan 255 Task 6)*
- [x] `ng build` smoke check *(build artefact — not persistent, but code compiled at time of commit)*
- [x] `server/routes/generic.js` — GET /:type: add userId filter
- [x] `server/routes/generic.js` — GET /:type/:id: add userId filter
- [x] `server/routes/generic.js` — POST /:type: stamp userId/_masterId/_userModified
- [x] `server/routes/generic.js` — PUT /:type/:id: spoof-safe merge update with userId scope
- [x] `server/routes/generic.js` — PUT /:type (replaceAll): userId-scoped deleteMany + stamp on insert
- [x] `server/routes/generic.js` — DELETE /:type/:id: add userId filter
- [x] Create `server/services/clone-master.js` — flat-doc cloning per CLONEABLE_TYPES
- [x] Create `server/services/sync-master.js` — 4-rule sync per CLONEABLE_TYPES
- [x] `server/routes/auth.js` — wire cloneMasterDataToUser on signup
- [x] `server/routes/auth.js` — wire syncMasterToUser on login (try/catch)
- [x] `server/routes/auth.js` — wire syncMasterToUser on refresh (try/catch)
- [x] `user.service.ts` — add refreshToken() method
- [x] `user.service.ts` — call refreshToken() on construction
- [x] `user.service.ts` — 13-minute interval timer; start on login/refresh; clear on logout
- [x] `ng build` verification *(build artefact — not persistent)*
- [x] `server/index.js` — add /api/ guard to SPA catch-all
- [x] `package.json` (root) — add build:render script
- [x] Rewrite `render.yaml` — fix buildCommand, MONGO_URI key, JWT_SECRET generateValue, remove PORT
- [x] `package.json` (root) — add engines field

**Total: 23 tasks confirmed via code on main.**

---

## OPERATIONAL VERIFIED THIS SESSION

- [x] `PR + merge feat/render-deploy` — PR #53 merged 2026-03-29 confirmed via `gh pr list --state merged`

**Total: 1 task verified.**

---

## OPERATIONAL STILL UNVERIFIED

These tasks were marked `[x]` in the archive without session evidence. User confirmed: "I think no to all but not sure." All moved back to `todo.md` as `[ ]` for future verification.

**Note on branch PRs:** `feat/user-scoped-schema`, `feat/user-scoped-backend`, `feat/frontend-auth-wiring`, `feat/express-static-serving` were never separate GitHub PRs. All code shipped as a single squash commit (`c77b309`) merged via PR #53 (`feat/render-deploy`). The "PR + merge" tasks for these branches describe a workflow that did not occur as stated. User flagged these for re-check.

- [ ] Run stamp migration against Atlas; verify in Compass — *no session evidence; user unsure*
- [ ] PR + merge `feat/user-scoped-schema` — *no separate PR exists; bundled in PR #53; user wants to re-check*
- [ ] Build verification + manual API test (Brief 2) — *no session evidence; user unsure*
- [ ] Security Officer review (Brief 2) — *no session evidence; user unsure*
- [ ] PR + merge `feat/user-scoped-backend` — *no separate PR exists; bundled in PR #53; user wants to re-check*
- [ ] Security Officer review (Brief 3) — *no session evidence; user unsure*
- [ ] PR + merge `feat/frontend-auth-wiring` — *no separate PR exists; bundled in PR #53; user wants to re-check*
- [ ] Build + serve verification (Brief 4) — *no session evidence; user unsure*
- [ ] PR + merge `feat/express-static-serving` — *no separate PR exists; bundled in PR #53; user wants to re-check*
- [ ] Manual deploy + smoke test — *no session evidence; user unsure*

**Total: 10 tasks re-opened.**

---

## Summary

| Category | Count |
|----------|-------|
| Code evidence confirmed | 23 |
| Operational verified this session | 1 |
| Operational still unverified (re-opened) | 10 |
| **Total Plan 234 tasks** | **34** |
