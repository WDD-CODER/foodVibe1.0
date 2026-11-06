# Plan 519 — Event logistics 2 of 6: the owner-only endpoint that saves an event's logistics answers

Status: draft
Snapshot: 21a2ffe5464ca65b4630ac0bdd5894a160a3cb8f
Depends-on: 518

## Problem Statement
Plan 518 gave the event a server-owned `siteLogistics` field; nothing can write it yet. The menu screen saves the whole
event from its form (`buildEventFromForm`), so the answers must go through their own door, like stage moves and notes
(`server/routes/events.js`), merged on the server and stamped with who answered and when. The Human decided
(2026-10-27, Q1 b) that only the owner answers, so this plan adds one owner-only permission action `editLogistics`.

## Goals & Success Criteria
- Primary: `PUT /api/v1/events/:id/logistics` merges answers for the owner (or a platform admin), stamps each changed
  answer, refuses staff (403), other businesses (403/404) and finished events (409), and also sets the event's
  environment (`logistics.environmentType`).
- Success:
  - `[auto]` `npm run build` exits 0; `npm run lint` exits 0.
  - `[auto]` `npm run test:server` exits 0, including `server/test/events-logistics.test.js` and the new cases in `server/test/permissions.test.js` (A5).
  - `[auto]` `npm run test:ci` → `TEST-CI: … 0 failed, exit 0` (the `permission.service.spec.ts` case of A2).
  - `[auto]` `node scripts/scope-check.mjs --arch --plan=<this file>` → nothing missing; `node scripts/scope-check.mjs --reuse --plan=<this file>` exits 0.
  - `[auto]` `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `SKIP: no database configured`).

## Execution Mode
- Parallel: yes — same wave as 520 and 521; no shared files.
- Concurrent plans: 520, 521.
- Isolated DB: no.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/routes/events.js
server/utils/permissions.js
server/test/events-logistics.test.js
server/test/permissions.test.js
src/app/core/services/permission.service.ts
src/app/core/services/permission.service.spec.ts
docs/agent/standards-backend.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — one new owner-only action `editLogistics` is added to `ACTIONS` and `OWNER_ONLY_ACTIONS` in `server/utils/permissions.js` (client mirror in `permission.service.ts`); the endpoint loads the event through `loadEvent` (business scope + staff stage visibility) and writes only after `assertCan(req, res, 'editLogistics', { type: TYPE, doc: event })`. Staff lose nothing they had (the field is new; they still read it); the platform admin keeps everything. `siteLogistics` holds no money field.
- INV-2, INV-3, INV-4, INV-5, INV-6: not touched (`events.js` is in no other invariant's Touches; the schema is unchanged).

## Reuse Check
- none — this plan adds one route to an existing router and one action to two existing permission lists; no component, util, pipe, service or `.c-*` class.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef, I want my answers saved the moment I give them, with who answered and when, so that nothing from the site visit is lost or disputed later.
- As a chef (owner), I want to be the only one who changes logistics answers so that a staff member cannot commit me to costs.

## Functional Requirements

### Must Have (P0)
- [ ] `editLogistics` in `ACTIONS` and `OWNER_ONLY_ACTIONS` (server) and in `PermissionAction` + `OWNER_ONLY_ACTIONS` (client).
- [ ] `PUT /api/v1/events/:id/logistics` as in A3; errors: `BAD_LOGISTICS` 400, `EVENT_FINISHED` 409, `FORBIDDEN` 403, `Event not found` 404, `STAGE_CHANGED` 409 (from `writeConditional`).
- [ ] The route is documented in the file's header comment and in `docs/agent/standards-backend.md` §5 table.

### Should Have (P1)
- [ ] none.

### Nice to Have (P2)
- [ ] none.

## UI/UX Notes
- No UI. No dictionary keys.

## Atomic Sub-tasks
- [ ] A1: Add an owner-only permission for logistics answers on the server — `'editLogistics'` in `ACTIONS` and `OWNER_ONLY_ACTIONS`; the existing `can()` flow then allows the owner and a platform admin and denies staff — server/utils/permissions.js
- [ ] A2: Mirror the permission on the client so screens can hide what the server refuses — `'editLogistics'` in the `PermissionAction` union and `OWNER_ONLY_ACTIONS`; spec: staff `can('editLogistics')` false, owner true — src/app/core/services/permission.service.ts, src/app/core/services/permission.service.spec.ts
- [ ] A3: Let the owner save logistics answers through one server door that stamps who and when — the route below — server/routes/events.js
  `PUT /:id/logistics`, body `{ answers?: Answer[], environmentType?, venueProfileId?, meetingAt?, meetingWith?, phaseDone? }` where `Answer` is the schema's answer without `at/by/byName`.
  1. `loadEvent`; `finishedLocked(res)` when `event.stage === 'finished'`; `assertCan(req, res, 'editLogistics', { type: TYPE, doc: event })`.
  2. `400 { error: 'BAD_LOGISTICS' }` when `answers` is present and not an array, or any answer lacks a string `itemKey`, `phase`, `section` or `status`.
  3. Merge: `base = event.siteLogistics ?? { answers: [] }`. For each incoming answer find the stored one by `itemKey`; when none, or any of `status / quantity / text / payer / showToClient / label` differs, store it with `by`/`byName` from `actorOf(req)` and `at: now`; otherwise keep the stored one untouched. Stored answers absent from `answers` are kept (the client sends only what it touched). `meetingAt`, `meetingWith`: set when the key is present (`''` clears). `phaseDone`: for each key present, a number sets it, `null` unsets it.
  4. `environmentType` / `venueProfileId` present → `logistics = { ...(event.logistics ?? { resolvedItems: [] }), environmentType: environmentType ?? event.logistics?.environmentType, venueProfileId }`; drop the `venueProfileId` key when it is `null`; a body with neither leaves `logistics` untouched. `environmentType` is validated by the schema (`validMerged`).
  5. `if (!validMerged(res, { ...event, siteLogistics, ...(logistics && { logistics }) })) return`, then `writeConditional(req, res, event, { $set: { siteLogistics, ...(logistics && { logistics }), updatedAt: now } }, 'events.logistics.saved')`.
  Add the route line to the comment block at the top of the file.
- [ ] A4: Document the new route for the next plans — one row in the §5 table (`PUT /api/v1/events/:id/logistics` · required · owner (`editLogistics`) · `BAD_LOGISTICS`, `EVENT_FINISHED` 409) — docs/agent/standards-backend.md
- [ ] A5: Prove the door with router and permission tests — `server/test/events-logistics.test.js` (pattern `events-closing.test.js`, builders `logisticsAnswer` from `helpers/v2-docs.js`, users OWNER/STAFF/OUTSIDER as in `events-router.test.js`): owner saves 2 answers → 200, both `by: 'own1'`, `at` set; second save with 1 unchanged + 1 changed → only the changed one's `at` moves, the unchanged keeps its first stamp; a save of a third answer keeps the first two; `phaseDone: { intake: 1700 }` then `phaseDone: { intake: null }` → set then unset; staff → 403 `{ error: 'FORBIDDEN', messageKey: 'no_permission' }`; outsider → 404 (other business is not found); finished event → 409 `EVENT_FINISHED`; `answers: 'x'` → 400 `BAD_LOGISTICS`; an answer with `status: 'maybe'` → 400 `Validation failed`; `environmentType: 'outdoor_field'` on an event without `logistics` → stored `logistics: { environmentType: 'outdoor_field', resolvedItems: [] }`; generic `PUT /api/v1/data/menuEvents/:id` with `siteLogistics` in the body → stored value unchanged. `server/test/permissions.test.js`: owner `can(user, 'editLogistics', { type: 'menuEvents', doc })` ok; staff denied; other business denied; platform admin on a master doc ok — server/test/events-logistics.test.js, server/test/permissions.test.js
- [ ] A6: Run build, lint, test:server, test:ci and paste the outputs under Execution Notes

## What happens when
- Two owners save at once: `writeConditional` is keyed on the stage read; a stage move in between → 409 `STAGE_CHANGED`, the client (plan 521) resends after a reload.
- A body carries an `at`, `by` or `byName`: ignored, the server stamps.
- `answers` is an empty array: nothing changes except `updatedAt`.

## Technical Considerations
- Dependencies: `server/routes/events.js` helpers `loadEvent`, `validMerged`, `writeConditional`, `finishedLocked`, `actorOf`, `TYPE`; `server/utils/permissions.js` `can`/`assertCan`; `checkStoredDoc`.
- New files needed: `server/test/events-logistics.test.js`.
- Model changes: none (plan 518).
- Backend / API: `PUT /api/v1/events/:id/logistics` — dedicated because the generic PUT replaces the whole event from the menu form and would drop these fields (gotcha "A form-rebuilt save payload silently drops any model field the form has no control for").
- Auth and validation: `verifyToken` + `assertCan('editLogistics')`; Zod on the merged doc; `dataWriteLimiter` applies router-wide.
- Security surface: new text inputs bounded by the schema (`text` ≤ 500, `label` ≤ 120, `meetingWith` ≤ 80); `server/routes` is a sensitive path (orch-security runs). No secret.
- Data / migration: none.
- Project checks: log-query `[auto]` present; Reuse Check present; dedicated endpoint named and justified.

## Out of Scope
- The master seed (520), client call (521), UI (522, 523); any admin route.

## Critical Questions
- Q1 (answered b, Human 2026-10-27): who may answer → owner only, hence `editLogistics` owner-only.

## Execution Notes
- Planner review (2026-11-05): text limit is 500, not 519 (typo, same fix as 518). Can run in parallel with 520 and 521 after 518.
