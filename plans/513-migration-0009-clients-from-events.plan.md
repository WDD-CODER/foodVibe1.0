# Plan 513 — Create clients from existing menu events and link each event to its client

Status: draft
Track: code
Snapshot: 6cfe7dc004ac51bde0aac3da99294b341d76a975
Depends-on: 512

## Problem Statement
Existing events carry `clientName` / `clientPhone` as free text. After Plan A the `clients` collection exists but is empty, so the inquiry dialog and the stage bar would show every legacy event as "unlinked". This plan derives one client per phone (or per name when there is no phone) and sets `clientId` on each event, idempotently, with a dry run and a verify step.

## Goals & Success Criteria
- Primary: every live event with a name and a phone gets a `clientId` pointing at a `clients` doc of the same business; name-only events (no phone digits) are never written as clients and are listed by count and event id. `phone` stays required in `clientSchema` (INV-4).
- Success:
  - `[auto]` `node server/migrations/0009-clients-from-events.js --target=local --db=fv_scratch` (dry run) prints a plan summary `clients: <n>, events: <m>, skipped: <k>` and writes nothing (`db.clients.countDocuments()` unchanged).
  - `[auto]` `node server/migrations/0009-clients-from-events.js --target=local --db=fv_scratch --write=yes --verify=yes` prints `verify: ok` and exits 0; running it a second time inserts 0 clients and patches 0 events.
  - `[auto]` `pnpm run test:migration-0009` passes (builds the generated schemas, then runs only `server/test/migration-0009.test.js`): grouping by `phoneNormalized`, name-only events listed and not linked, skip when both empty, idempotent re-run, `createdBy` = business owner, a phone with two different names listed.
  - `[auto]` `node scripts/log-query.mjs --since=plan-start --level=error` returns no entries.
  - [ ] [auto:main] With the backend started on `dev:local` (its log is `.claude/be.log`, which exists), `node server/migrations/0009-clients-from-events.js --target=local` without `--write` (dry run, read-only, local database) prints `clients: <n>, events: <m>, skipped: <k>` and exits 0.
  - `[human]` Review the dry-run summary on the scratch DB before the Atlas gate.

## Execution Mode
Isolated DB: yes
- Parallel: yes — disjoint scope from Plan C (same wave)
- Concurrent plans: 514
- Isolated DB: yes — writes `clients` and patches `menuEvents`; rehearse on `--db=fv_scratch`, never Atlas

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/migrations/0009-clients-from-events.js
server/test/migration-0009.test.js
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-2: preserves — the migration groups strictly per `businessId`, never crosses businesses, never touches `__master__` docs, and inserts clients with `cloneable`-irrelevant shape (no `_masterId`).
- INV-3: preserves — the whole re-key runs on the server in one script; the client never loops.
- INV-4: preserves — every inserted client is validated with `clientSchema` (`parseV2('clients', doc)`) before insert; the script aborts on the first invalid doc in dry run.

## Reuse Check

- none — one migration script following the `0008-event-stages.js` skeleton; no component or util.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## Contract
```
Collection: clients   { name:'clients', userData:true, cloneable:false, backup:true, searchable:false, softDelete:false }
Schema file: shared/schemas/entities/client.schema.ts
  exports: CLIENT_TYPES = ['private','business','production_company'] as const
           clientTypeSchema = z.enum(CLIENT_TYPES)
           clientSchema = z.strictObject({ ...baseDocShape,
             name: nameField,                               // required, <=200
             phone: z.string().min(7).max(30).regex(/^[0-9+\-\s()]{7,20}$/),
             phoneNormalized: z.string().max(30),           // digits only, SERVER-derived on every write
             clientType: clientTypeSchema.default('private'),
             companyName: z.string().max(200).optional(),
             email: z.string().max(200).optional(),
             notes: z.string().max(2000).optional(),
             source: z.string().max(100).optional() })
  registered in shared/schemas/entities/index.ts: SCHEMA_BY_COLLECTION.clients, export type Client
menuEvents: menuEventSchema gains clientId: z.string().optional() (next to clientName). clientName / clientPhone stay as a snapshot.
Permissions (server/utils/permissions.js):
  OWNER_ONLY_TYPES = new Set(['clients'])  → staff get { ok:false, reason:'OWNER_ONLY_TYPE' } on create|edit|delete
  staffProjection(type) → Mongo projection { <field>:0 } for every top-level schema key not in STAFF_READ_FIELDS[type] and not a base field; null when no entry
STAFF_READ_FIELDS (shared/schemas/staff-fields.ts): { clients: ['name','phone'] }
Client side:
  src/app/core/models/client.model.ts            → Client, ClientType, CLIENT_TYPES
  src/app/core/services/client-data.service.ts   → ClientDataService extends BaseEntityDataService<Client>
                                                   { allClients_, getClientById(id), addClient(body), updateClient(client) }
  src/app/core/resolvers/clients-ensure-loaded.resolver.ts → resolve key `clientsLoaded`
  src/app/core/utils/client-display.util.ts      → normalizePhone(s), clientLabel(c, eventCount, countWord), matchesClientQuery(c, q)
  MenuEvent (src/app/core/models/menu-event.model.ts) gains clientId?: string
Dictionary keys (public/assets/data/dictionary.json → "general", append only):
  client "לקוח" · client_pick_placeholder "שם או טלפון" · client_new "לקוח חדש" · client_change "החלף לקוח" · client_link "קשר ללקוח"
  client_events_count "אירועים" · client_type "סוג לקוח" · client_type_private "פרטי" · client_type_business "עסקי"
  client_type_production_company "חברת הפקה" · client_company_name "שם חברה" · client_email "אימייל" · client_notes "הערות לקוח"
  client_source "מקור הגעה" · client_more_details "עוד פרטים" · deposit_details "מקדמה" · client_required "חובה לבחור לקוח"
  client_ask_owner "לקוח חדש? בקשו מבעל העסק להוסיף אותו"
Decisions already taken by the Human (do not reopen):
  stage stays on the event, never on the client · clients are owner-only to write · staff read name+phone only
  migration groups by phoneNormalized, then by trimmed clientName when no phone · softDelete false, no delete UI in P1
```

## User Stories
- As a chef, I want my existing events to already know their client so that the new client picker recognises returning clients from day one.

## Functional Requirements

### Must Have (P0)
- [ ] Dry run by default; `--write=yes` required to write; `--verify=yes` runs the verify step; `--db=<scratch>` bypasses `checkBackup`; `--target=local|atlas` and `--confirm-host` as in 0008.
- [ ] Grouping per `businessId` over live events (`deletedAt` null): by `phoneNormalized` of `clientPhone`. An event with a name and no phone digits is **name-only**: never written as a client, left unlinked, counted in `skipped`, and printed by the dry run and by `verify` as `name-only events: <n>` followed by one line per event id (Human 2026-11-03: exit 0, handled by hand). Events with neither name nor phone → `skipped`. Every group where one phone appears with different names is printed (`same phone, different names: <phone> → <name1> | <name2>`) so nothing merges silently.
- [ ] Phone rule (Human 2026-11-03): the client `phone` is the raw `clientPhone` when it passes `clientSchema` (`/^[0-9+\-\s()]{7,20}$/`, 7-30 characters). Otherwise it is the digits only when the raw value holds nothing but digits and the separators space, `-`, `.`, `/`, `(`, `)`, `+` and the digit count is 7-20. If the raw value contains any letter (for example "ext") or the digits are outside 7-20, the event is treated like a name-only one: not written as a client, left unlinked, counted in `skipped`, never failing `verify`, exit 0; the dry run and `verify` print `invalid-phone events: <n>` and one line per event id with the raw value.
- [ ] Client name = `clientName` of the group's most recently `updatedAt` event; fallback the raw phone.
- [ ] Inserted client: `_id` = `newId()` from `server/utils/id.js:14` (a random UUID, as `server/routes/generic.js:471`; `baseDocShape` needs a string `_id`), `schemaVersion: 2`, `clientType: 'private'`, `businessId`, `createdBy` = first user with `businessRole: 'owner'` for that business (fallback: the group's first event `createdBy`), `createdAt`/`updatedAt` = now, `phone`, `phoneNormalized`, `name`.
- [ ] Event patch: `updateOne({ _id, clientId: { $exists: false } }, { $set: { clientId, updatedAt: now } })` — idempotent.
- [ ] A re-run finds existing clients by (`businessId`, `phoneNormalized`), oldest first, and reuses them instead of inserting duplicates. There is no name-without-phone reuse branch (a client without a phone is invalid and name-only events are never written).
- [ ] `migrations` upsert `{ _id: '0009-clients-from-events' }` with `lastRunAt`, `$inc runs`.
- [ ] `verify`: count of live events with a name and a phone (not name-only) and no `clientId` must be 0; print `verify: ok` or `verify: fail <n>` and set `process.exitCode = 1` on fail. Name-only events are listed (count and ids) and never make `verify` fail.
- [ ] Header comment documents Modes and Rollback: `db.menuEvents.updateMany({}, {$unset:{clientId:1}}); db.clients.deleteMany({})`.

### Should Have (P1)
- [ ] Summary line per business in dry run: `<businessId>: clients <n>, events <m>, skipped <k>`.

### Nice to Have (P2)
- [ ] none.

## UI/UX Notes
- No UI. No dictionary keys.

## Atomic Sub-tasks
- [x] S1: Work out which clients each business needs and which events link to them, without writing — `server/migrations/0009-clients-from-events.js` with the 0008 skeleton (`parseArgs`, `connect`, `checkBackup`, `MIGRATION_ID`), pure helpers `normalizePhone(s)`, `groupKey(event)`, and `async plan(db, now)` returning `{ clientsToInsert, eventPatches, skipped, perBusiness }` per the P0 grouping rules; dry run prints the summary — files: the migration.
- [x] S2: Write the clients and event links safely and add a check that no event is left unlinked — `async write(db, args, result)` (`checkBackup` unless `--db`; reuse-or-insert clients validated with `parseV2('clients', doc)` from `server/utils/schema-check.js`; idempotent event `updateOne`; `migrations` upsert) and `async verify(db)`; `main()` with `parseArgs(process.argv, { write:1, verify:1, 'backup-dir':1, db:1, target:1, 'confirm-host':1 })`; `module.exports` and `if (require.main === module) main()` — files: the migration.
- [x] S3: Prove with a test that the migration groups correctly and can be re-run safely — `server/test/migration-0009.test.js` using the in-memory/local test DB helper the other server tests use: seed two businesses, events with shared phone in two formats (`052-1234567`, `0521234567`), one event with name only (assert: not linked, listed with its id, `verify` still ok), one with neither, one phone with two different names (assert: printed), one phone with the letters "ext" and one with 5 digits (assert: listed as invalid-phone with the raw value, not linked, `verify` still ok), one phone written `052.123.4567` (assert: linked through its digits), run `plan` + `write` twice; assert counts, `createdBy`, idempotence, and `verify` ok — files: the test.
- [x] V1: Rehearse on the scratch database, record the output and list the Atlas commands unrun — Atlas` with the exact commands (not executed).

## Technical Considerations
- Dependencies: `server/migrations/tools/_connect.js`, `server/migrations/0001-v2-schema.js` (`checkBackup`), `server/utils/schema-check.js` (`parseV2`), `server/models/user.model.js` (owner lookup via the `users` collection).
- New files needed: the migration and its test.
- Model changes: none (shapes from Plan A).
- Backend / API: none.
- Auth and validation: script runs with DB credentials only; every inserted doc passes `clientSchema`.
- Security surface: touches `server/migrations/**` → `orch-security` finder runs; no network, no secrets beyond the existing connection flags.
- Data / migration: this plan. Atlas only by the Human after the scratch rehearsal.
- Project checks: log-query no errors; migration dry-run first; idempotent; rollback note.

## Final gate — Atlas (Human only, after reviewing the scratch output)
```
node server/migrations/0009-clients-from-events.js --target=atlas --confirm-host=<atlas host>
node server/migrations/0009-clients-from-events.js --target=atlas --confirm-host=<atlas host> --write=yes --backup-dir=<snapshot dir> --verify=yes
```

## Out of Scope
- Merging clients that share a name but have different phones. Normalising international prefixes beyond stripping non-digits. Any UI.

## Critical Questions
- none — grouping and softDelete decisions are in the Contract.

## Execution Notes
- Non-interactive run: no UI. On a verify failure the builder reports `verify: fail <n>` and stops; it never retries with `--write` on Atlas.
- Orchestrator readiness (2026-11-03): the [auto:main] dry-run item cannot run from the main folder (only node scripts/… or tools/…; the script is not on main until 513 merges) → default: kept out of mainCommands; the builder runs the same read-only dry run (no --write) in its slot against the local DB (MONGO_LOCAL_URI); the report lists the main-folder dry run as a Human item (delegated)
- Orchestrator readiness (2026-11-03): Done-when test command `npm test -- server/test/migration-0009.test.js` runs Karma at the root → `pnpm --dir server test -- test/migration-0009.test.js` (delegated)
- Orchestrator readiness (2026-11-03): sub-task V1 is cut off mid-sentence → record the fv_scratch dry-run and write+verify output and the two Atlas commands (not run) in these Execution Notes (delegated)
- Plan errors for the Planner (2026-11-03): (1) wrong test command (root `npm test` is Karma, server tests need `pnpm --dir server test`); (2) V1 sub-task cut off mid-sentence; (3) the [auto:main] item names a script the plan creates, so it cannot run from main before merge. Lesson: check every Done-when command against package.json scripts and the allowed-check list, read each sub-task to its end, and never put a new file's command in an [auto:main] item.
- Rehearsal data (2026-11-03): fv_scratch is a copy of the local dev DB (`foodvibe`; 16 menuEvents, 5 with a name or phone, 10 clients); clientId was unset on those 5 events in fv_scratch only, so the dry run has real work to show.
- Human decisions (2026-11-03): D1/D6 skip name-only events, exit 0, print the count and event ids; phone stays required. D3 reuse the oldest client with the same phone, and print every phone that appears with different names. D9 test command is `cd server && npx vitest run test/migration-0009.test.js` (the root `npm test` is Karma; `pnpm --dir server test -- <file>` runs the whole server suite).
- Plan errors for the Planner (2026-11-03): (a) the goal ("every event with a non-empty clientName gets a clientId") contradicted `clientSchema` (phone required, INV-4) — also a readiness miss: readiness checked claims against code but not the goal against the schema; (b) the Done-when test command ran the wrong suite (D9). Lessons: before saving a plan, test each success claim against the schemas and invariants it depends on; for a command that passes a file after `--`, check that the runner applies the filter (vitest run <file>).
- Orchestrator readiness (2026-11-03, run-513-516b): invalid-phone events → raw phone when it passes the client regex; digits only when the raw value is digits plus separators (space - . / ( ) +) with 7-20 digits; any letter or digits outside 7-20 → skipped like name-only, listed as `invalid-phone events: <n>` with one line per event id and the raw value, exit 0, never fail verify (Human). `_id` → `newId()` (delegated default). Drop the name/no-phone reuse branch (delegated default).
- Test command (2026-11-03): `pnpm run test:migration-0009` (root script → `pnpm --dir server run test:migration-0009` → `pnpm --dir .. run build:schemas && vitest run test/migration-0009.test.js`), added to package.json and server/package.json on main (PR #503) because readiness refuses `cd … && npx …` as a gate check.
- Plan error for the Planner (2026-11-03): the client's phone rule (regex and 7-20 length) was stricter than the event's `clientPhone` (any string up to 30), and the field list had no `_id`; the plan was saved without comparing the two schemas field by field. Also a readiness lesson already recorded (success claims against schemas).
- Human decision (2026-11-05): phone numbers and names MAY print in this one-off local migration's output. `scripts/pre-commit-security-grep.mjs` is kit-owned, so do not edit it: on every line that logs, use variable names without `phone`/`email`/`fullName` (e.g. `raw`, `key`, `who`) so the per-line PII check does not fire; the printed values stay unmasked. Finish from the staged work in wt-3 (newer rules), not the older commit on `origin/feat/513-…`.
- Build run-513-516c (2026-11-03, builder, round 0): the earlier attempt's code predated the Human decisions, so the migration and test were rewritten. Name-only and invalid-phone events are now skipped and listed and never fail `verify`; every phone with different names is printed; the name reuse branch is gone; `_id` = `newId()`; the first invalid client doc aborts the run, dry run included (INV-4).
- Evidence: `pnpm run test:migration-0009` → exit 0, 11 passed. `pnpm run build` → exit 0. `pnpm run lint` → exit 0 (0 errors, 67 old warnings). `pnpm run test:ci` → exit 0, 1701 SUCCESS. `node scripts/kit-manifest-check.mjs` → exit 0, 0 unclassified. `node scripts/log-query.mjs --since=plan-start --level=error` → exit 0, "no entries". `node scripts/orch-state.mjs prepare …` → PREPARE: ok (present).
- V1 rehearsal on fv_scratch: the earlier attempt's write run had already linked the 5 events there (migrations marker `runs: 3`, all linked to existing clients, so no clients were inserted). `clientId` was unset again on those 5 events in fv_scratch only, so the rehearsal has real work.
  - Dry run `node server/migrations/0009-clients-from-events.js --target=local --db=fv_scratch` → exit 0: `clients: 0, events: 5, skipped: 4`, `existing clients reused: 4`, per-business lines, `name-only events: 0`, `invalid-phone events: 0`. Count before and after the dry run: clients=10, linked events=0, so nothing was written.
  - `… --target=local --db=fv_scratch --write=yes --verify=yes` → exit 0: `inserted 0 clients, patched 5 events`, `verify: ok`. Count after: clients=10, linked events=5.
  - Second run with the same command → exit 0: `inserted 0 clients, patched 0 events`, `verify: ok`.
  - Read-only dry run on the default local DB (`--target=local`, database `foodvibe`, no `--write`) → exit 0: `clients: 0, events: 0, skipped: 4`. This is the slot stand-in for the [auto:main] item; the main-folder run stays with the Human after merge.
  - Atlas commands (NOT run, Human only): see `## Final gate — Atlas` above:
    `node server/migrations/0009-clients-from-events.js --target=atlas --confirm-host=<atlas host>`
    `node server/migrations/0009-clients-from-events.js --target=atlas --confirm-host=<atlas host> --write=yes --backup-dir=<snapshot dir> --verify=yes`
- Finish (2026-11-06, wt-3): per the Human decision of 2026-11-05, the two printed labels moved into constants (`INVALID_LABEL`, `CONFLICT_LABEL`) on lines that do not log, and the conflict line logs `key` instead of `c.phone`; the printed text is unchanged. Evidence: `node scripts/pre-commit-security-grep.mjs` → exit 0; `pnpm run test:migration-0009` → exit 0, 11 passed (one earlier cold-start run failed during setup with 11 skipped; the two runs after it passed); `pnpm run build` → exit 0. Atlas runs skipped (Human).
