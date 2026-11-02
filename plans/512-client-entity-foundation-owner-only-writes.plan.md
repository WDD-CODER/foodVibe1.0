# Plan 512 — Add the client record, owner-only writes and staff-limited reads on the server

Status: draft
Track: code
Snapshot: 6cfe7dc004ac51bde0aac3da99294b341d76a975
Depends-on: none

## Problem Statement
The client is two loose strings on each menu event (`clientName`, `clientPhone`). A returning client is retyped on every event, so nothing can be grouped or looked up per client, and the menu screen carries client fields that belong elsewhere. This plan creates the `clients` entity and the `clientId` link, enforced on the server, so the four plans that follow (migration, data layer, inquiry dialog, stage bar) build on one validated shape.

## Goals & Success Criteria
- Primary: `clients` is a validated, business-scoped, owner-writable collection and `menuEvents.clientId` exists in the schema.
- Success:
  - `[auto]` `npm run build:schemas && node -e "const s=require('./server/generated/schemas/entities');process.exit(s.SCHEMA_BY_COLLECTION.clients?0:1)"` exits 0.
  - `[auto]` `npm test -- server/test/clients.test.js` passes: staff POST → 403; staff PUT/DELETE on an owner doc → 403; staff GET `/` and `/:id` carry no `email`, `notes`, `source`, `clientType`, `companyName`; owner GET carries them; owner POST with `phone:'abc'` → 400; `phoneNormalized` derived and a client-sent value ignored; menuEvents POST with `clientId` accepted.
  - `[auto]` `npm test -- server/test/invariants.test.js` passes with the new `clients` entry (INV-1 staff-create assertion expects 403 for `clients`).
  - `[auto]` `node scripts/scope-check.mjs --arch --plan=plans/512-client-entity-foundation-owner-only-writes.plan.md` and `node scripts/scope-check.mjs --reuse --plan=plans/512-client-entity-foundation-owner-only-writes.plan.md` exit 0.
  - `[auto]` `node scripts/log-query.mjs --since=plan-start --level=error` returns no entries.

## Execution Mode
- Parallel: no — first wave; every other CRM plan depends on this one
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
shared/schemas/entities/client.schema.ts
shared/schemas/entities/index.ts
shared/schemas/entities/menu-event.schema.ts
shared/schemas/staff-fields.ts
shared/schemas/index.ts
server/constants/collections.js
server/routes/generic.js
server/utils/permissions.js
server/test/clients.test.js
server/test/invariants.test.js
server/test/cross-business.test.js
docs/brain/decisions/0027-client-entity-above-events.md
docs/brain/glossary.md
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

- INV-1: deviation until a later plan decides staff client creation — users lose: staff cannot create, edit or delete a client (they open inquiries only for clients the owner added), and staff read clients through a server projection limited to `name`, `phone` and base fields — narrower than the rule, never wider. `clients` stays scoped by `businessId` through `scopeFilter`; the owner does everything. — Arch-approved: Human 2026-11-01
- INV-2: preserves — `clients` is `cloneable: false`, never carries `_masterId`, and every query goes through `server/utils/business-scope.js` via generic.js.
- INV-3: preserves — no cross-document writes are introduced.
- INV-4: preserves — `clientSchema` is defined in `shared/schemas/entities` and registered in `SCHEMA_BY_COLLECTION`, so `checkStoredDoc` validates every write; `menuEventSchema` gains `clientId?`.

## Reuse Check

- none — this plan creates no component, util, pipe, service or `.c-*` class; server helpers `staffProjection` and `OWNER_ONLY_TYPES` live beside the existing `stripMoneyFields` in `permissions.js`.

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
- As an owner, I want one client record per person or company so that every event can point at it instead of retyping a name and phone.
- As an owner, I want only me to create clients and only me to see email, notes and client type so that client relationships stay between me and the client.

## Functional Requirements

### Must Have (P0)
- [ ] `clientSchema` exactly as in the Contract; registered; `Client` type exported.
- [ ] `menuEventSchema.clientId?: string`.
- [ ] `collections.js` entry for `clients` exactly as in the Contract.
- [ ] `can()` refuses staff `create | edit | delete` on `clients` with reason `OWNER_ONLY_TYPE`; owner unaffected.
- [ ] generic GET `/` and GET `/:id` apply `staffProjection(entityType)` for `businessRole === 'staff'` when non-null.
- [ ] generic POST and PUT of `clients` set `phoneNormalized = String(body.phone).replace(/\D/g,'')` after Zod validation and before the write, ignoring any client-sent value.
- [ ] Tests listed in Success Criteria.

### Should Have (P1)
- [ ] ADR 0027 and glossary entry; stale §3 of `docs/agent/standards-backend.md` corrected.

### Nice to Have (P2)
- [ ] none.

## UI/UX Notes
- No UI in this plan. No dictionary keys.

## Atomic Sub-tasks
- [x] S1: Define the client record and add a client link to events so the server can validate both — `shared/schemas/entities/client.schema.ts` per the Contract, modelled on `venue.schema.ts`; register import, export, `SCHEMA_BY_COLLECTION.clients` and `export type Client = z.infer<typeof clientSchema>` in `shared/schemas/entities/index.ts`; add `clientId: z.string().optional()` to `menuEventSchema` in `menu-event.schema.ts` next to `clientName`; run `npm run build:schemas` — files: the three schema files.
- [x] S2: Define the short list of client fields staff are allowed to read — create `shared/schemas/staff-fields.ts` exporting `STAFF_READ_FIELDS` per the Contract and export it from `shared/schemas/index.ts` — files: `shared/schemas/staff-fields.ts`, `shared/schemas/index.ts`.
- [x] S3: Make clients owner-only to change and give staff a trimmed view when reading — in `server/utils/permissions.js` add `OWNER_ONLY_TYPES`; in `can()` before the existing staff branch return `{ ok:false, reason:'OWNER_ONLY_TYPE' }` when the user is staff, `ctx.type` is in the set and `action` is `create`, `edit` or `delete`; add and export `staffProjection(type)` that reads `SCHEMA_BY_COLLECTION[type].shape` keys from `server/generated/schemas/entities` and excludes base fields (`_id, schemaVersion, userId, businessId, createdBy, createdAt, updatedAt, deletedAt, deletedBy`) — files: `server/utils/permissions.js`.
- [x] S4: Register the clients collection and make the server trim staff reads and derive the phone — add the `clients` entry to `COLLECTIONS` in `server/constants/collections.js`; in `server/routes/generic.js` apply `staffProjection(entityType)` on GET `/` and GET `/:id` for staff (pass as the find projection; keep existing projections for other types untouched); on POST `/:type` and PUT `/:type/:id` when `entityType === 'clients'` derive `phoneNormalized` after validation and before the write — files: `server/constants/collections.js`, `server/routes/generic.js`.
- [x] S5: Prove with server tests that staff are blocked, trimmed and the phone is derived — `server/test/clients.test.js` covering every assertion in Success Criteria using the same auth helpers as `server/test/invariants.test.js`; add a `clients` entry to the local `COLLECTIONS` array in `invariants.test.js` with `body()` returning a valid client and `edit` `{ notes: 'x' }`, mark it owner-only so the staff-create assertion expects 403, and make `seed()` skip `_masterId` for `clients` like it does for `taxonomyTerms` — files: `server/test/clients.test.js`, `server/test/invariants.test.js`.
- [x] D1: Record the client decision in an ADR and update the glossary and backend standards — `docs/brain/decisions/0027-client-entity-above-events.md` (client = who, event = what; stage on the event; clients owner-only to write; staff read name+phone via server projection; `clientName`/`clientPhone` kept as snapshot; no rename cascade yet; migration 0009 grouping rule); add `לקוח / client` to `docs/brain/glossary.md`; rewrite §3 of `docs/agent/standards-backend.md` to describe `collections.js` flags and `SCHEMA_BY_COLLECTION` registration — files: the three docs.
- [x] V1: Run every check for this plan and write the evidence in the Execution Notes — Build, run `npm run build:schemas`, `npm test -- server/test/clients.test.js`, `npm test -- server/test/invariants.test.js`, both scope-checks and the log check; write evidence under `## Execution Notes`.

## Technical Considerations
- Dependencies: `server/utils/business-scope.js` (`scopeFilter`), `server/middleware/validate.js` (`checkStoredDoc`), `server/utils/schema-check.js`.
- New files needed: `shared/schemas/entities/client.schema.ts`, `shared/schemas/staff-fields.ts`, `server/test/clients.test.js`, `docs/brain/decisions/0027-client-entity-above-events.md`.
- Model changes: `Client` (new, server/shared); `menuEvents.clientId?`.
- Backend / API: no new endpoints; `clients` is served by the generic `/api/v1/data/:type` contract. generic.js gains a staff read projection and `phoneNormalized` derivation.
- Auth and validation: owner: all; staff: read (projected) only. Zod strict; `phone` regex identical to `isValidClientPhone` on the client.
- Security surface: server-enforced; no new inputs beyond the schema; no secrets.
- Data / migration: none in this plan (Plan B).
- Project checks: log-query no errors; Reuse Check gate; generic data contract; Zod in `shared/schemas`.

## Out of Scope
- Migration of existing events (Plan B). Client-side model and service (Plan C). Any UI (Plans D, E). Client delete, merge, rename cascade, client page, Kanban, payments.

## Critical Questions
- none — all decisions are in the Contract.

## Execution Notes
- Non-interactive run: no UI, so no on-edit/leave/cancel/error behaviour to declare.
- Orchestrator readiness (2026-11-02): server tests (clients.test.js, invariants.test.js) can't run in the gate → the builder runs them itself from server/ (cd server && npm test -- test/...), pastes the raw output (pass/fail counts per test file) here; the verifier checks it against the main proof (staff blocked, trimmed reads, phone derived) (Human)
- Orchestrator readiness (2026-11-02): merge order 512 first, 422 last if the workflow can force it; else the workflow's order, no split run → keep the order the workflow gives (Human)
- Orchestrator readiness (2026-11-02): log-query --since=plan-start → skipped in the gate; the run report's "App errors since the run started" section replaces it (Human)
- Finding F1 (2026-11-02): preflight requires the dev server even when every plan in the run is ui:false.
- Finding F2 (2026-11-02): the gate cannot run server tests (cd server && npm test); expected to be fixed by plan 517.

### Builder evidence (orch-builder, round 0)
- Step 0: `scope-check --drift` -> `REALITY: drift`, one commit: `09530c27 chore(506): remove the session-state concept from FoodVibe`. By symbol: the plan names no session-state symbol except the boilerplate scope line (`docs/session-state-<branch>.md`). `09530c27` ok.
- `pnpm run build:schemas` -> exit 0. `node -e "...SCHEMA_BY_COLLECTION.clients?0:1"` -> exit 0.
- Server tests, run from `server/` (raw vitest output, per file):
  - `npx vitest run test/clients.test.js test/invariants.test.js test/cross-business.test.js test/permissions.test.js test/collections.test.js` -> exit 0
    - ` ✓ test/collections.test.js (5 tests)`
    - ` ✓ test/permissions.test.js (13 tests)`
    - ` ✓ test/clients.test.js (17 tests)`
    - ` ✓ test/invariants.test.js (31 tests)`
    - ` ✓ test/cross-business.test.js (43 tests)`
    - ` Test Files  5 passed (5)` / `      Tests  109 passed (109)`
  - Main proof, `test/clients.test.js` (17 passed, 0 failed), by test name:
    - staff blocked: `staff POST -> 403 and nothing stored`; `staff PUT on an owner's client -> 403 and unchanged`; `staff DELETE on an owner's client -> 403 and still stored`; `staff bulk delete of an owner client -> 403 and still stored`; `staff PUT on a client the staff member created -> still 403 (owner-only type)`.
    - trimmed reads: `staff GET / carries name + phone and none of the owner-only fields` (no email, notes, source, clientType, companyName, phoneNormalized); `staff GET /:id ...` (same); `owner GET / and GET /:id carry the owner-only fields`.
    - phone derived: `owner POST stores the client without clone lineage and derives phoneNormalized` ('050-123 4567' -> '0501234567'); `owner POST with phone "abc" -> 400 Validation failed`; `a phoneNormalized sent by the client is ignored on POST`; `owner PUT of the phone re-derives phoneNormalized; a client-sent value is ignored`.
    - `a menuEvents POST with clientId is accepted and keeps the snapshot fields`.
  - `test/invariants.test.js` (31 passed, 0 failed) includes the `clients` entry in all three per-collection assertions and `INV-1 staff cannot create an owner-only item (403, nothing stored)`.
  - Full server suite `npx vitest run` -> exit 0: `Test Files  65 passed (65)`, `Tests  801 passed (801)`.
- `node scripts/scope-check.mjs --arch --plan=...` -> exit 0, `ARCH: ok INV-1, INV-2, INV-3, INV-4`. `--reuse` -> exit 0, `REUSE: ok none`.
- `pnpm run lint` -> exit 0 (0 errors, 67 warnings, none in changed files). `pnpm run build` -> exit 0.
- `pnpm run test:ci` -> first run exit 1 (2 FAILED in `user.service.spec.ts` signup tests, then Chrome "Disconnected, because no message in 30000 ms"); environment-shaped, no changed file involved. Rerun once -> exit 0, `Executed 1666 of 1666 SUCCESS`.
- `node scripts/log-query.mjs --since=plan-start --level=error`: not run by the builder; skipped in the gate per the Human's readiness answer (the run report's "App errors since the run started" section replaces it).
- scope extended: server/test/cross-business.test.js — it asserts a valid POST body exists for every `ALL_USER_ENTITY_TYPES` entry and loops tenant-isolation checks over each; adding `clients` to `collections.js` fails it without a `clients` body.
- Plan reading: the Contract says derive `phoneNormalized` "after Zod validation", but `phoneNormalized` is a required field of the strict schema, so a value must exist when `checkStoredDoc` runs. It is derived from `phone` on the doc just before the schema check and never taken from the client; an invalid phone still fails on the `phone` regex.
- `clientType` default: `checkStoredDoc` only validates, it does not store the parsed output, so a client posted without `clientType` is stored without it (the Zod default applies only when something parses). Nothing added.
- Scope approval (2026-11-02, Human): approved: server/test/cross-business.test.js — added to Read-Write Scope (the test loops over every entity type and needs a clients body once clients is registered).
- Decision D14 (2026-11-02, Human ✓): stamp clientType 'private' on a client POST in generic.js when none is sent, so stored clients are consistent.
- Finding F3 (2026-11-02): readiness missed 512's scope gap (server/test/cross-business.test.js).
- Finding F4 (2026-11-02): the per-plan gate did not catch the unclassified files; only the final gate did, so 422 merged and broke the run branch.
- Finding F5 (2026-11-02): preflight does not start the dev server it requires.
