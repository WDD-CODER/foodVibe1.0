# Plan 492 — Deleting a staff member frees the username for reuse

Status: active
Track: code
Snapshot: ea6af7b02e8012a812933a795eb15c7bf9dcd81c

## Problem Statement
Dandan's QA report 2026-10-22 (`docs/mvp/qa-report-2026-10-22.md`), item 15, checks 50/118: "`/settings?tab=team`.
Deleting a staff member leaves the record in the `users` collection, so a new staff member with the same username
fails (duplicate key). The username must be reusable."

Verified in code on `mvp-qa-fixes` (`ea6af7b0`):
- Remove = soft delete that keeps the name: `server/routes/business.js:217-234` (`DELETE /api/v1/business/team/:userId`)
  only does `$set: { removedAt: Date.now() }` (line 226). The comment at :217 and plan 428 ("Never deletes the user or
  any of their documents") made this a deliberate choice; nobody planned for name reuse.
- Add refuses the kept name: `server/routes/business.js:184` `User.findOne({ name: trimmed })` matches the removed
  user too → 409 `USERNAME_TAKEN`; the client maps 409 to `username_taken` «שם המשתמש כבר תפוס»
  (`src/app/pages/settings/services/team.service.ts:64`). A race past that check hits the unique index
  `name: { unique: true }` (`server/models/user.model.js:6`) → E11000, also mapped to 409 (`business.js:208-211`).
- Sign-up has the same check (`server/routes/auth.js:174`), so a removed cook's name is blocked everywhere.
- What depends on the kept record: refresh looks the user up by id and answers 401 `USER_REMOVED`
  (`server/routes/auth.js:299-307`, `blockedReason` :96-100); login looks the user up by **name** (`auth.js:232`) and
  answers 403 `USER_REMOVED` (:256-257), shown as «המשתמש הוסר מהעסק – פנה לבעל העסק» (`user_removed`,
  `auth-modal.component.ts:245`) — validated by plan 428's human card. Items keep `createdBy: <staffId>`; staff may
  change only what they created (`server/utils/permissions.js`), so a new cook with the old name must get a new `_id`.
- `GET /team` (`business.js:163`) and the setup counter (`business.js:137`) already skip `removedAt` users.
- Mongoose strict mode drops `$set` paths that are not in the schema, so a new user field must be added to
  `server/models/user.model.js` or it is silently not written.
- History: plans 459–485 did not touch the remove path; `git log` on `business.js` / `user.model.js` / `auth.js` shows
  472, 469, 477, 456, 431 (other routes). No `docs/mvp/runs/<n>.md` covers it. Similarity gate: no similar plans.
- Atlas may already hold removed staff whose names are blocked: they need the same release once (Final gate, below).

**Root cause:** removing a staff member sets only `removedAt` and leaves `name` on the record (`business.js:226`),
while `name` is globally unique (`user.model.js:6`) and both the add check (`business.js:184`) and sign-up
(`auth.js:174`) look names up without regard to `removedAt`.

## Goals & Success Criteria
- Primary: as a chef who owns the business, I want to remove a cook who left and later add a new cook (or the same
  person again) with the same username, so that I don't have to invent a new name.
- Design (Planner decision): **soft delete with a released username**, not a hard delete. On remove the server keeps
  the record, moves the name to `removedName`, and sets `name` to a tombstone `<name>~removed~<_id>` (the `~` can never
  pass `isValidUsername`, and the `_id` keeps it unique, so it never collides with a real name and the existing unique
  index stays as is — no Atlas index rebuild). Why not hard delete: it would drop the record that refresh uses to answer
  `USER_REMOVED`, the friendly login message plan 428 validated, and the owner of `createdBy` ids; it gains nothing for
  reuse. Login falls back to `removedName` only when no live user has that name, so a removed cook still sees
  «המשתמש הוסר מהעסק – פנה לבעל העסק»; once the name is reused, the name belongs to the new cook.
- Success:
  - [ ] [auto] `cd server && npx vitest run test/business-team.test.js test/auth-business.test.js test/release-removed-staff-names.test.js` → all pass, including the new cases: (a) owner removes `cook1`, then adds `cook1` again → 201 with a new `_id`; the old record still exists with `removedAt` set, `removedName: 'cook1'`, `name: 'cook1~removed~<oldId>'`; (b) the new `cook1` logs in → 200 with the new `_id` in the token; (c) the old cook's refresh cookie → 401 `USER_REMOVED`; (d) `GET /team` lists one `cook1` (the new one); (e) the owner still reads the old cook's recipe (200); (f) a removed name not re-added: login with the right password → 403 `USER_REMOVED`, wrong password → 401 and no `USER_REMOVED`; (g) DELETE again → 200 and nothing changes; DELETE on a legacy removed user (has `removedAt`, no `removedName`) releases its name; (h) sign-up with a released name → 201; (i) the release helper's output fails `isValidUsername`; (j) the cleanup script's planner picks only removed users without `removedName` and is idempotent.
  - [ ] [auto] `cd server && npx vitest run` → no new failures against the baseline recorded in Step 0 (known load-timing flake: `business-stats.test.js`, passes alone).
  - [ ] [auto] Scratch rehearsal (never on the shared local DB the Human validates on): `node server/scripts/db-backup.js --target=local --out="C:\coding projects\Cursor\mvp-review-evidence\qa\492\backup"` → `node server/scripts/db-restore.js --target=local --dir=<that snapshot dir> --db=scratch_492`; if `scratch_492` has no removed staff without `removedName`, insert one such user there first. Then `node server/scripts/release-removed-staff-names.js --target=local --db=scratch_492` (dry run) prints the count it would release and writes nothing; with `--write` it releases them; a second `--write` run prints `0` — outputs pasted in the run file.
  - [ ] [auto] `npx ng build` passes (no client change expected; proves nothing broke).
  - [ ] [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
  - [ ] [human] Desktop 1440 px, owner (local owner account from `accounts.json`; never a shared QA account's existing cooks): open `/settings?tab=team`. SETUP: if a `reuse492` row is already listed (an earlier validation run on the same local DB), remove it first with the red bin icon on its row. DO: «הוסף חבר צוות» → username `reuse492`, password `Chef4920` → «הוסף» → the red bin icon on the `reuse492` row → in the popup «להסיר את חבר הצוות? הפריטים שיצר יישארו בעסק» confirm → «הוסף חבר צוות» → username `reuse492` again, password `Chef4921` → «הוסף». SEE ✓: toast «חבר הצוות נוסף» and `reuse492` is in the list once, as «צוות». FAIL ✗: the red message «שם המשתמש כבר תפוס» under the form, or `reuse492` shown twice.
  - [ ] [human] Private window, desktop 1440 px: log in as `reuse492` / `Chef4921` (the cook re-added in the card above). SEE ✓: login succeeds and the app opens on the owner's business (the owner's products are listed in the inventory). FAIL ✗: any login error.
  - [ ] [human] Desktop 1440 px, owner on `/settings?tab=team`, plus a private window on the login screen. SETUP: if `gone492` is listed, remove it first. DO: add `gone492` / `Chef4922`, remove it with the red bin icon and confirm, then in the private window log in as `gone492` / `Chef4922`. SEE ✓: login refused with «המשתמש הוסר מהעסק – פנה לבעל העסק». FAIL ✗: `gone492` gets in, or a generic wrong-password message.
  - [ ] [human] Phone 375 px, owner: `/settings?tab=team`. SETUP: if `phone492` is listed, remove it first. DO: add `phone492` / `Chef4923`, remove it, add `phone492` / `Chef4924` again. SEE ✓: «חבר הצוות נוסף», `phone492` once in the list, the form and list fit the screen with no sideways scroll (passed checks 23/24 unchanged). FAIL ✗: «שם המשתמש כבר תפוס» or sideways scroll.
  - [ ] [human] Dandan's original scenario — a cook removed **before** this fix (e.g. the one removed in check 50) on the local DB he validates on. SETUP (Outside the app, the terminal of the checkout he validates in, from the repo root): `node server/scripts/release-removed-staff-names.js --target=local` (dry run: shows how many old names it would free), then `node server/scripts/release-removed-staff-names.js --target=local --write`. DO: owner, `/settings?tab=team` → «הוסף חבר צוות» → that old cook's username and a new password → «הוסף». SEE ✓: toast «חבר הצוות נוסף» and the name in the list once. FAIL ✗: «שם המשתמש כבר תפוס». (The UI validator never runs this card's SETUP on the shared local DB; it goes to the Human.)

## Execution Mode
- Parallel: yes — server-only; no overlap with 486 (client confirm modal / user management) or 491 (recipe header).
  Shares only `docs/mvp/mvp-map.md` with 495 (different contract block: C-USER here, C-PORTIONS there; one-line
  appends, merge cleanly).
- Isolated DB: no — local MongoDB of the slot; the cleanup script is rehearsed on the scratch copy `scratch_492`
  only (the slot's local DB may be the one the Human validates on).

## Execution Notes
- Base branch `origin/mvp-qa-fixes`; run mode `docs/mvp/run-mode-qa-fixes.md` (then `run-mode-review-fixes.md`,
  `run-mode-review.md`). Slots wt-1 / wt-2 only; never wt-3, 4203 or 3003.
- `teamLimiter` allows 10 `POST /team` per owner per 15 min (`business.js:22-28`); the human cards use 6. A
  browser validator that retries should wait or use a fresh owner.
- Passed checks 21–24 (owner adds a cook, team list last login, team list and tab on mobile) must keep working: no
  change to `toTeamRow`, `GET /team`, the client or the styles.
- Never write to Atlas. Write the Atlas step below into `docs/mvp/runs/492.md` under `## Final gate — Atlas`.
- Log under `## Decisions` in the run file, so Dandan sees it: (1) "soft delete with a released username, not a hard
  delete" and why (Goals above) — the report's title says "DB cleanup", the plan delivers the asked outcome
  (reusable username) without dropping the record; (2) the report's "no new Atlas migrations required" line predates
  this fix: the Final gate is a one-off data release the Human runs after deploy (no schema or index change);
  without it, staff removed on production before the deploy keep their names blocked.
- The login fallback must not count failed attempts or set `lockedUntil` on the removed record, and must run the
  same `verifyPbkdf2` compare; a removed record with no `passwordHash` answers the existing 401.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, `.claude/sessions/**`, `.worktree-*`.

```scope
server/routes/business.js
server/routes/auth.js
server/models/user.model.js
server/utils/username.js
server/scripts/release-removed-staff-names.js
server/test/business-team.test.js
server/test/auth-business.test.js
server/test/release-removed-staff-names.test.js
docs/mvp/mvp-map.md
docs/mvp/runs/492.md
```
`docs/mvp/mvp-map.md`: only append `removedName?: string` (and the tombstone rule) to the existing User-fields line
(:99) as a contract extension.

## Read Scope
Entire repo.

## Escalation Protocol
Writing outside the scope block: log path + change + why under `## Decisions` in `docs/mvp/runs/492.md`, add it to
the scope block, continue (run mode: you work alone, never ask).

## Architecture Impact
- INV-1: preserves — removing and adding staff stays owner-only through `assertCan(…, 'manageTeam', …)`
  (`business.js:147-149`); a re-added cook gets a new `_id`, so he never inherits edit rights on the old cook's items
  (`createdBy` is id-based).
- INV-2: preserves — no tenancy change; usernames stay unique across all businesses, the same rule as today.
- INV-3, INV-5, INV-6: preserves — no rename cascade, taxonomy or AI call involved.
- INV-4: preserves — users are a Mongoose model (`server/models/user.model.js`), not a `shared/schemas` entity; the
  new optional `removedName` field is added there.

## Backend Impact
- `DELETE /api/v1/business/team/:userId`: response unchanged (`{ ok: true }`); the record now also gets
  `removedName` and a tombstone `name`. Still idempotent.
- `POST /api/v1/auth/login`: when no user has the typed name, look up the most recent removed user with
  `removedName` = that name; right password → 403 `USER_REMOVED` (unchanged contract,
  `docs/agent/standards-backend.md:129-130`); otherwise the same 401 as today. No lockout counting on removed records.
- `POST /api/v1/business/team`, `/auth/signup`: unchanged code; the released name is simply free.
- Data: new optional user field `removedName: string`. No index change. One-off release of already-removed staff on
  Atlas (Final gate).
- Security surface: login fallback runs the same PBKDF2 compare under the existing `loginLimiter`; it only reveals
  "removed" with the correct password, as today. No secret or token change.
- Admin `GET /api/v1/admin/users` will show a removed cook as `cook1~removed~<id>` (today it shows a plain `cook1`
  that cannot log in) — accepted, see Out of Scope.

## Reuse Check
- none — this plan only changes server code: the release rule is one new function in the existing
  `server/utils/username.js` (next to the one username rule, used by the route and the script), and the cleanup
  script copies the shape of `server/scripts/dedupe-business-products.js` (dry run by default, `--write`,
  `--target`, `--confirm-host`, `server/migrations/tools/_connect.js`).

## Step 0 — Reality Check
Find, on the feature branch: `router.delete('/team/:userId'` and `User.findOne({ name: trimmed })` in
`server/routes/business.js`; `User.findOne({ name })` in `/login` and `blockedReason` in `server/routes/auth.js`;
`removedAt` and no `removedName` in `server/models/user.model.js`; `isValidUsername` in `server/utils/username.js`;
`connect` in `server/migrations/tools/_connect.js`. Run `cd server && npx vitest run 2>&1 | tail -30` and record the
baseline failures. Print `ok` / `conflict: <what>` in the run file.

## Atomic Sub-tasks
- [ ] R1: Add the rule that turns a removed cook's username into a unique placeholder name — releasedUsername(name, id) returns name~removed~id; export it — server/utils/username.js
- [ ] R2: Store the removed cook's original username on his record so it is not lost — removedName: { type: String } (no default) — server/models/user.model.js
- [ ] R3: Free the username when the owner removes a cook, keeping the record and his items — DELETE /team/:userId sets removedAt (if unset), removedName and the tombstone name in one updateOne; also when removedAt is set but removedName is missing (legacy); update the :217 comment — server/routes/business.js
- [ ] R4: Keep the "you were removed" login message after the name is freed — in /login, when no user has the name, find the latest { removedName: name, removedAt: set } user, verify the password, 403 USER_REMOVED on a match, else the existing 401 — server/routes/auth.js
- [ ] R5: Add a one-off script that frees the names of cooks removed before this fix — dry run by default, --write applies, --target=local|atlas, --db=<name> (local only, for the scratch rehearsal), --confirm-host for Atlas; runs only when started directly (require.main === module); exports a pure planRelease(users) for the test; prints counts — server/scripts/release-removed-staff-names.js
- [ ] R6: Prove remove-then-re-add, the removed-login message and the cleanup script in tests — cases (a)–(j) from Done-when — server/test/business-team.test.js, server/test/auth-business.test.js, server/test/release-removed-staff-names.test.js
- [ ] R7: Record the new user field in the contract map — append removedName to the User-fields line — docs/mvp/mvp-map.md
- [ ] V1: Build, server tests, scratch-DB script rehearsal (`scratch_492`), browser cards, and the Atlas final-gate step written in the run file — docs/mvp/runs/492.md

## Final gate — Atlas (the builder copies this into `docs/mvp/runs/492.md`; never run it)
Already-removed staff on Atlas still hold their names. After this plan merges and the server is deployed, the Human
runs from the repo root:
1. `node server/scripts/db-backup.js --target=atlas`
2. `node server/scripts/release-removed-staff-names.js --target=atlas --confirm-host=<atlas-host>` — dry run; note the
   count of names it would release.
3. `node server/scripts/release-removed-staff-names.js --target=atlas --confirm-host=<atlas-host> --write`
4. Run step 2 again → it prints `0`.

## Out of Scope
- Hard-deleting staff records or their items; restoring a removed cook (re-adding creates a new account).
- Showing `removedName` instead of the tombstone in the platform admin's user list (`server/routes/admin.js`,
  `GET /users`), and the admin hard-delete path.
- Observed, not fixed here: `server/routes/admin.js:87` counts staff only when `removedAt` is *missing*, but staff
  created through `POST /team` store `removedAt: null` (Mongoose default), so the admin business table may undercount
  live staff. Separate item for the coordinator.
- Any client, style or dictionary change.

## Architect + PM review (always)

```
ARCHITECT + PM REVIEW
no gaps
```

Independent review (2026-10-24, Opus 5.5) — gaps found and fixed in this file:
```
ARCHITECT + PM REVIEW
- Dandan's literal scenario (a cook removed BEFORE the fix) stayed blocked locally: no card covered it → added a [human] card with the release-script SETUP the Human runs on his own local DB
- Script rehearsal wrote to the shared local DB (Isolated DB: no) against run-mode "rehearse on a local scratch DB" → rehearsal moved to a db-restore copy `scratch_492`; R5 takes --db
- Card 2 held two checks (re-added cook logs in + removed cook refused) → split into two cards
- «הסר» is an icon-only bin button (aria-label), not visible text; confirm popup unnamed → cards name the red bin icon and quote «להסיר את חבר הצוות? הפריטים שיצר יישארו בעסק»
- Cards reuse fixed names on a shared local DB: a second run (UI validator, then Human) would hit «שם המשתמש כבר תפוס» on the first add → each card's SETUP removes a leftover row first
- Report says "DB cleanup" + "no new Atlas migrations required"; plan keeps the record and adds an Atlas one-off → both logged as Decisions for Dandan
- Overlap with 495 on docs/mvp/mvp-map.md not named → noted in Execution Mode (different block)
- Login fallback lockout behaviour left implicit → Execution Notes: no failed-attempt counting, same verifyPbkdf2, no passwordHash → 401
```
Verified in code at `ea6af7b0`: `business.js:184/217-234`, `user.model.js:6/20`, `auth.js:96-100/174/232-257/299-307`,
`team.service.ts:64`, `_connect.js` (`--db`), `db-restore.js` (`--db` scratch). Scope unchanged and complete.
- Architect: Architecture Impact filled for INV-1…6 (gate below); every named file and symbol exists at `ea6af7b0`
  except the two new files, marked new (`server/scripts/release-removed-staff-names.js`,
  `server/test/release-removed-staff-names.test.js`); the design keeps the existing unique index and the soft-delete
  pattern of plan 428, the script follows plan 485's script pattern; the scope covers exactly the files the steps write.
- PM: problem and success are testable and every Done-when item is tagged; each `[human]` card replays the reported
  scenario (remove, re-add the same name) at 1440 px and 375 px; Out of Scope written; backend/API, auth, security
  surface and data impact named; smallest version (no client change, no index change, no admin UI change).
- Project checks (`docs/agent/plan-checks.md`): log-query `[auto]` item present; `## Reuse Check` present; no
  hotspot, translation key, icon or new entity type; user story from the chef's side.
