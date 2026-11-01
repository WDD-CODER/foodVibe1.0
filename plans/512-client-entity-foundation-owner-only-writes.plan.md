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
- [ ] S1: Define the client record and add a client link to events so the server can validate both — `shared/schemas/entities/client.schema.ts` per the Contract, modelled on `venue.schema.ts`; register import, export, `SCHEMA_BY_COLLECTION.clients` and `export type Client = z.infer<typeof clientSchema>` in `shared/schemas/entities/index.ts`; add `clientId: z.string().optional()` to `menuEventSchema` in `menu-event.schema.ts` next to `clientName`; run `npm run build:schemas` — files: the three schema files.
- [ ] S2: Define the short list of client fields staff are allowed to read — create `shared/schemas/staff-fields.ts` exporting `STAFF_READ_FIELDS` per the Contract and export it from `shared/schemas/index.ts` — files: `shared/schemas/staff-fields.ts`, `shared/schemas/index.ts`.
- [ ] S3: Make clients owner-only to change and give staff a trimmed view when reading — in `server/utils/permissions.js` add `OWNER_ONLY_TYPES`; in `can()` before the existing staff branch return `{ ok:false, reason:'OWNER_ONLY_TYPE' }` when the user is staff, `ctx.type` is in the set and `action` is `create`, `edit` or `delete`; add and export `staffProjection(type)` that reads `SCHEMA_BY_COLLECTION[type].shape` keys from `server/generated/schemas/entities` and excludes base fields (`_id, schemaVersion, userId, businessId, createdBy, createdAt, updatedAt, deletedAt, deletedBy`) — files: `server/utils/permissions.js`.
- [ ] S4: Register the clients collection and make the server trim staff reads and derive the phone — add the `clients` entry to `COLLECTIONS` in `server/constants/collections.js`; in `server/routes/generic.js` apply `staffProjection(entityType)` on GET `/` and GET `/:id` for staff (pass as the find projection; keep existing projections for other types untouched); on POST `/:type` and PUT `/:type/:id` when `entityType === 'clients'` derive `phoneNormalized` after validation and before the write — files: `server/constants/collections.js`, `server/routes/generic.js`.
- [ ] S5: Prove with server tests that staff are blocked, trimmed and the phone is derived — `server/test/clients.test.js` covering every assertion in Success Criteria using the same auth helpers as `server/test/invariants.test.js`; add a `clients` entry to the local `COLLECTIONS` array in `invariants.test.js` with `body()` returning a valid client and `edit` `{ notes: 'x' }`, mark it owner-only so the staff-create assertion expects 403, and make `seed()` skip `_masterId` for `clients` like it does for `taxonomyTerms` — files: `server/test/clients.test.js`, `server/test/invariants.test.js`.
- [ ] D1: Record the client decision in an ADR and update the glossary and backend standards — `docs/brain/decisions/0027-client-entity-above-events.md` (client = who, event = what; stage on the event; clients owner-only to write; staff read name+phone via server projection; `clientName`/`clientPhone` kept as snapshot; no rename cascade yet; migration 0009 grouping rule); add `לקוח / client` to `docs/brain/glossary.md`; rewrite §3 of `docs/agent/standards-backend.md` to describe `collections.js` flags and `SCHEMA_BY_COLLECTION` registration — files: the three docs.
- [ ] V1: Run every check for this plan and write the evidence in the Execution Notes — Build, run `npm run build:schemas`, `npm test -- server/test/clients.test.js`, `npm test -- server/test/invariants.test.js`, both scope-checks and the log check; write evidence under `## Execution Notes`.

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
