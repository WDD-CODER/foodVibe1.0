# Plan 520 — Event logistics 3 of 6: seed the 45 shared checklist questions every business starts with

Status: done
Snapshot: 21a2ffe5464ca65b4630ac0bdd5894a160a3cb8f
Depends-on: 518

## Problem Statement
The checklist is only useful if a chef opens it and finds the questions already there. Plan 518 defined the
`logisticsItem` kind; this plan seeds the shared master list (13 phone-intake questions, 32 site-visit questions) on
server boot, idempotently, the way the default stations are seeded (`ensureDefaultStations`, plan 436). Every business
reads master ∪ its own terms, so the list appears for all of them with no copy and no migration.

## Goals & Success Criteria
**Primary:** after a boot on a database with no master `logisticsItem`, 45 valid master terms exist; a second boot inserts 0.
- [auto] `npm run lint` exits 0 (no client change; lint is the project check).
- [auto] `npm run test:server` exits 0, including the new `ensureDefaultLogisticsItems` block in `server/test/seed-master-taxonomy.test.js` (A2).
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/520-event-logistics-seed-master-items.plan.md` → nothing missing; `node scripts/scope-check.mjs --reuse --plan=plans/520-event-logistics-seed-master-items.plan.md` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `SKIP: no database configured`).
- [human] After the merged run branch boots the local server once, `db.taxonomyTerms.countDocuments({ kind: 'logisticsItem', businessId: '__master__' })` = 45.

## Execution Mode
- Parallel: yes — same wave as 519 and 521; no shared files.
- Concurrent plans: 519, 521.
- Isolated DB: no (additive, idempotent seed).

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/services/seed-master.js
server/services/logistics-seed-items.js
server/test/seed-master-taxonomy.test.js
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-2: preserves — the items are seeded under `businessId: '__master__'` (`userId` and `createdBy` too), belong to no business, and are read as master ∪ own through the existing `taxonomyTerms` read scope; the seed never touches an existing document, so a business's own or edited term is never overwritten.
- INV-1, INV-3, INV-4, INV-5, INV-6: not touched.

## Reuse Check
- `server/services/logistics-seed-items.js` — family: none — rung: 4 — why: a data module (the 45 rows) next to the seeder, kept out of `seed-master.js` so that file stays readable; no component, util, pipe, service or `.c-*` class.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef, I want the checklist to come filled with the questions caterers get burned by so that I use it on day one and add my own on top.

## Functional Requirements

### Must Have (P0)
- [ ] `ensureDefaultLogisticsItems()` in `server/services/seed-master.js`: skip (return 0) when any `{ kind: 'logisticsItem', businessId: '__master__' }` exists; else `insertMany` the 45 rows with `_id: makeId()`, `schemaVersion: 2`, `kind: 'logisticsItem'`, `sortOrder` = index, `userId/businessId/createdBy: '__master__'`, `createdAt/updatedAt: now`; log `seed.master.logistics_items_seeded` with the count; called from `seedMasterData` and exported.
- [ ] The 45 rows live in `server/services/logistics-seed-items.js` as `LOGISTICS_SEED_ITEMS` (`{ key, phase, section, answerType, environments? }`), exactly the list in A1.

### Should Have (P1)
- [ ] none.

### Nice to Have (P2)
- [ ] none.

## UI/UX Notes
- No UI. The `key` is the Hebrew question text shown as is (no dictionary entry per item, same as user-added terms).

## Atomic Sub-tasks
- [x] A1: Write the shared question list a caterer needs before a final quote — the 45 rows below, in this order — server/services/logistics-seed-items.js
  Format: `key · phase · section · answerType · environments` (`*` = omit the field; codes: `kit`=professional_kitchen, `out`=outdoor_field, `home`=client_home, `pop`=popup_venue)
  ```
  intake (13):
  יש מטבח במקום? · intake · infrastructure · status · *
  יש חשמל זמין לאזור המטבח? · intake · infrastructure · status · *
  יש מים זורמים ליד המטבח? · intake · infrastructure · status · *
  כמות מזנונים משוערת · intake · service · quantity · *
  הגשה לשולחן (מלצרים)? · intake · service · status · *
  בר משקאות? · intake · service · status · *
  שולחנות וכיסאות מאיתנו? · intake · rentals · status · *
  כלי הגשה וסכו"ם מאיתנו? · intake · rentals · status · *
  גישה לרכב עד נקודת הפריקה? · intake · access · status · *
  שעת התחלה ומשך האירוע · intake · other · text · *
  איש קשר בשטח (שם וטלפון) · intake · other · text · *
  כשרות נדרשת · intake · food · text · *
  אלרגיות ורגישויות ידועות · intake · food · text · *
  site_visit (32):
  נקודות חשמל: כמות, מיקום ועומס · site_visit · infrastructure · text · *
  גנרטור נדרש? · site_visit · infrastructure · status · out,pop
  נקודת מים למטבח · site_visit · infrastructure · status · *
  ניקוז ומי שפכים · site_visit · infrastructure · status · out,pop,home
  קירור קיים במקום (מקרר/חדר קירור) · site_visit · infrastructure · status · *
  צ'ילרים להבאה · site_visit · infrastructure · quantity · *
  גז / מקור חום · site_visit · infrastructure · status · *
  תאורה באזור המטבח · site_visit · infrastructure · status · out,pop
  מיקום המטבח ומרחק מאזור ההגשה · site_visit · space · text · *
  אוהל / הצללה למטבח · site_visit · space · status · out,home
  הגנה מגשם ורוח (דפנות, מרזבים) · site_visit · space · status · out
  משטח ישר ויציב למטבח · site_visit · space · status · out
  מזנונים – כמות ומיקום · site_visit · service · quantity · *
  שולחנות ישיבה – כמות · site_visit · service · quantity · *
  עמדות חיות / שף בחזית · site_visit · service · status · *
  בר – מיקום וקרח · site_visit · service · status · *
  מסלול מלצרים מהמטבח לאורחים · site_visit · service · status · *
  שולחנות הגשה · site_visit · rentals · quantity · *
  כיסאות · site_visit · rentals · quantity · *
  מחממי מזון / שאפינג · site_visit · rentals · quantity · *
  מפות ושוליות · site_visit · rentals · status · *
  נקודת פריקה ומרחק נשיאה · site_visit · access · text · *
  שעות גישה למקום (כניסה, פינוי) · site_visit · access · text · *
  מעלית / מדרגות · site_visit · access · status · kit,pop,home
  חניה לרכבי הצוות · site_visit · access · status · *
  צוות מטבח – כמות · site_visit · staff · quantity · *
  מלצרים – כמות · site_visit · staff · quantity · *
  תוכנית גשם / חום קיצוני · site_visit · weather · text · out
  מזיקים ויתושים · site_visit · weather · status · out
  פחים ופינוי אשפה · site_visit · other · status · *
  שירותים לצוות · site_visit · other · status · *
  אישורי כניסה לספקים / ביטחון · site_visit · other · status · pop
  ```
- [x] A2: Seed the list on boot, once, next to the default stations — `ensureDefaultLogisticsItems` mirroring `ensureDefaultStations`, wired into `seedMasterData` and exported; test block `describe('ensureDefaultLogisticsItems')`: on a DB with master terms but no logistics item → inserts 45, every inserted doc passes `taxonomyTermSchema` (import from `../generated/schemas/entities`), 13 have `phase: 'intake'`, `גנרטור נדרש?` has `environments: ['outdoor_field', 'popup_venue']`; second call → 0 and the count stays 45 — server/services/seed-master.js, server/test/seed-master-taxonomy.test.js
- [x] A3: Run lint and test:server and paste the outputs under Execution Notes

## What happens when
- A business already created its own item with the same Hebrew key before the seed ran: both exist (different `businessId`); the uniqueness index is `{ kind, key, userId }`, so the insert succeeds. No fold (unlike plan 440's coefficients) — the business's item is its own.
- The seed runs on a half-seeded DB (crash mid-insert): the "any exists" check returns 0 and the rest are never added — the same accepted limit as `ensureDefaultStations`; the Human can delete the partial set and reboot.

## Technical Considerations
- Dependencies: `server/services/seed-master.js` (`makeId`, `logger`, `seedMasterData`), `server/index.js` (calls `seedMasterData` on boot, unchanged), `server/test/helpers/app.js`.
- New files needed: `server/services/logistics-seed-items.js`.
- Model changes: none (plan 518).
- Backend / API: none.
- Auth and validation: none (boot-time seed).
- Security surface: none.
- Data / migration: additive seed on boot, idempotent; no migration script.
- Project checks: log-query `[auto]` present; Reuse Check present; no dictionary keys.

## Out of Scope
- Editing or promoting items (523 and the later admin plan); translations of the keys; per-business copies.

## Critical Questions
- none open (the list was approved in discussion on 2026-10-27; a wording change is a one-line edit in A1 later).

## Execution Notes
- Planner review 2026-11-07: plan 517 was re-scoped (brief 4) — the `TEST-CI:` line and `scripts/e2e-one.mjs` no longer exist; checks now read `npm run test:ci` exits 0, and card specs run with `pnpm exec playwright test <spec>`. Mechanical edit only.
- npm run lint -> exit 0 (0 errors, 67 warnings, none in changed files)
- npm run test:server -> exit 0, Test Files 72 passed, Tests 859 passed (incl. ensureDefaultLogisticsItems block)
- decision: test validates with `parseV2('taxonomyTerms', t)` (the file's existing helper) instead of importing taxonomyTermSchema from generated/schemas.
