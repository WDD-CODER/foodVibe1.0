# Plan 544 — Clients become CRM records: wider shape, phone match key, Trash instead of hard delete

Status: done
Depends-on: 543
Snapshot: 05741afd08ec936d1aec6f8d9a53631141905f93

## Problem Statement
The Front Desk program (`docs/frontdesk/frontdesk-map.md`, map row 2, spec FD-01) builds the CRM on the existing
`clients` collection, not beside it (brief Part 2 rule 1). Today a client only says who an event is for: no tags, no
kinds, no counters, no consent, no "do not contact", no match key that survives `05…` vs `9725…`, and a delete is
for good. Every later Front Desk plan (545 upsert, 549 requests, 551 profile, 555 public page, 560 WhatsApp) reads
these fields, so they are fixed here, once, with the migration that fills them for existing clients.

Verified on `origin/main` (5702f6d1, 2026-11-10):
- `shared/schemas/entities/client.schema.ts`: `clientSchema` = `baseDocShape` + `name`, `phone` (`/^[0-9+\-\s()]{7,20}$/`), `phoneNormalized` (required, server-derived), `clientType` (default `private`), `companyName?`, `email?`, `notes?`, `source?`. Exported through `shared/schemas/entities/index.ts` (`Client` type).
- `shared/schemas/staff-fields.ts`: `STAFF_READ_FIELDS = { clients: ['name', 'phone'] }`.
- `server/constants/collections.js:42`: `clients` → `userData: true, cloneable: false, backup: true, searchable: false, softDelete: false`.
- `server/routes/generic.js` (1277 lines): `CLIENTS` at line 77; `withPhoneNormalized` at line 86 (`String(doc.phone ?? '').replace(/\D/g, '')`); applied on POST at line 513–519 and on PUT at line 636–639; the event server-field strip is `withoutServerEventFields` (line 89, `EVENT_SERVER_FIELDS` from `../generated/schemas/entities/event-stage`), used on POST line 477 and PUT line 615. Trash routes (`GET /:type/trash`, `PUT /:type/:id/restore`, `PUT /:type/trash/restore-all`, `DELETE /:type/trash`) work for every `SOFT_DELETE_TYPES` type with no per-type code.
- `server/db.js`: no index on `clients` at all.
- `server/migrations/`: highest is `0010-drop-v1-collections.js`; the runbook pattern (dry run default, `--write=yes --backup-dir=`, `--verify=yes`, `--target`, `--confirm-host`) and `parseArgs`/`connect` in `tools/_connect.js`, `checkBackup` in `0001-v2-schema.js`. `0009-clients-from-events.js` created the clients.
- `src/app/core/services/trash.service.ts`: `TrashType` union and `TRASH_SECTIONS` (7 types, no clients); `lists` record of data services; item name = `d.nameHebrew ?? d.name`.
- `src/app/core/models/client.model.ts`: `Client` interface (mirror of the schema, all non-staff fields optional).
- Tests that pin today's behaviour: `server/test/clients.test.js` ("owner DELETE removes the client" counts 0 docs; staff reads assert name + phone only), `server/test/cross-business.test.js` (covers every user type incl. clients; its Trash case iterates the soft-delete types).
- ADR 0027 (`docs/brain/decisions/0027-client-entity-above-events.md`): line 24–25 owner-only write (stays, D2); lines 26–29 staff read `name` and `phone` only; lines 31–32 `softDelete: false` (hard delete, no Trash, no delete UI).

## Goals & Success Criteria
**Primary:** a client carries every C-CONTACT field, the server alone writes the server-owned ones, a deleted client
goes to Trash and comes back, and every existing client has `phoneKey`, `kinds`, `firstSeenAt` and `counters.events`
after migration 0011.

- [auto] `pnpm run test:server` passes, including the new cases in `server/test/clients.test.js` and `server/test/migration-0011-clients-crm.test.js`.
- [auto] A generic `POST` and `PUT /api/v1/data/clients/:id` that send any of `phoneNormalized`, `phoneKey`, `kinds`, `lifecycle`, `firstSeenAt`, `lastContactAt`, `counters`, `waId`, `mergedInto`, `doNotContact` store none of the sent values; `phoneNormalized` and `phoneKey` are re-derived from `phone` (`server/test/clients.test.js`, one case per field).
- [auto] Staff `POST`, `PUT` and `DELETE` on `clients` still answer 403 and change nothing (existing cases in `server/test/clients.test.js` stay green).
- [auto] Staff `GET /api/v1/data/clients` and `/:id` carry `name`, `phone`, `tags`, `kinds` (+ base fields) and none of `notes`, `email`, `consent`, `doNotContact`, `counters`, `phoneKey` (`server/test/clients.test.js`).
- [auto] Owner `DELETE` of a client → it is gone from `GET /clients`, listed by `GET /clients/trash`, and `PUT /clients/:id/restore` brings it back unchanged (`server/test/clients.test.js`).
- [auto] Migration 0011 on a seeded in-memory DB: the dry run writes nothing and prints `clients: <n>, phoneKey collisions: <k>` with one line per collision group; `--write=yes` backfills `phoneKey`, `kinds` (`['event_client']` only for a client with ≥ 1 live event), `firstSeenAt` (= `createdAt`), `counters.events`; a second write changes 0 docs; `--verify=yes` prints `verify: ok`; a `__master__` doc and another business's events are never counted (`server/test/migration-0011-clients-crm.test.js`).
- [auto] `pnpm run test:ci` passes, including `src/app/core/services/trash.service.spec.ts` with a clients section.
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/544-clients-become-crm-records.plan.md` exits 0.
- [auto] `pnpm --dir server run lint` exits 0.
- [auto] `pnpm run build` passes.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] On `/trash` signed in as the QA owner, after a client is deleted through the API in the test's setup, the section "לקוחות" lists the client's name and "שחזר מהאשפה" brings it back (`e2e/ui/544-1.spec.ts`).
- [human] Dandan approved the ADR 0031 text below before this plan was saved (map Human gate).
- [human] Atlas: Dandan ran the A6 runbook (backup → dry run → write → verify); the verify run printed `verify: ok`, and every `phoneKey` collision group the dry run listed was read before the write.

## Execution Mode
- Parallel: no — not with 545, nor with any plan editing `shared/schemas/entities/client.schema.ts` or `server/routes/generic.js` (map must-not-run list); runs after 543 in lane wt-1.
- Concurrent plans: none
- Isolated DB: yes — migration 0011 reshapes stored clients. The Worker runs it against the local DB only; Atlas is run by the Human (A6).

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
shared/schemas/entities/client.schema.ts
shared/schemas/phone.ts
shared/schemas/index.ts
shared/schemas/staff-fields.ts
server/constants/collections.js
server/routes/generic.js
server/db.js
server/migrations/0011-clients-crm.js
server/test/clients.test.js
server/test/cross-business.test.js
server/test/migration-0011-clients-crm.test.js
src/app/core/models/client.model.ts
src/app/core/services/trash.service.ts
src/app/core/services/trash.service.spec.ts
public/assets/data/dictionary.json
e2e/ui/544-1.spec.ts
docs/brain/decisions/0031-clients-are-crm-records.md
docs/brain/decisions/0027-client-entity-above-events.md
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

- INV-1: preserves — `clients` stays in `OWNER_ONLY_TYPES` (D2); staff read two more fields (`tags`, `kinds`) through the existing `STAFF_READ_FIELDS` projection; ADR 0031 records it.
- INV-2: preserves — the migration and every query stay per business through `scopeFilter`; `__master__` is never read or written by 0011.
- INV-3: preserves — the backfill runs on the server in one script; no client-side loop.
- INV-4: preserves — every new field is in `clientSchema` in `shared/schemas`; the server validates every write against it.

## Reuse Check

- `shared/schemas/phone.ts` `normalizePhone`, `phoneKey` — family: none — rung: 4 — why: one pure phone rule for server, client and migrations (today two identical inline copies: `generic.js:86`, `client-display.util.ts:4`); 545 re-exports it from `server/utils/client-upsert.js` as the contract names it.
- `CLIENT_SERVER_FIELDS` + `withoutServerClientFields` in `generic.js` — family: none — rung: 4 — why: server helper, no UI family; a copy of the `EVENT_SERVER_FIELDS` / `withoutServerEventFields` pattern for clients, no new mechanism.
- Trash "clients" section — family: none — rung: 4 — why: data entry, not a component: one more item in `TRASH_SECTIONS`; the Trash page template is reused unchanged.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As an owner, I want each customer to carry tags, kinds and counts so that the front desk knows who is a diner, who books events and who is new.
- As an owner, I want a deleted customer to go to Trash so that one wrong tap never loses a customer and their history.
- As a host, I want to see a customer's tags and kinds so that I can greet a VIP or warn the kitchen about an allergy, without seeing the owner's notes.

## Functional Requirements

### Must Have (P0)
- [ ] Contract copied verbatim from `docs/frontdesk/frontdesk-map.md` (frozen; do not rename anything):

  **C-CONTACT (544, 545; used by 549, 551, 555, 560)**
  - Collection stays `clients`, TS type `Client`, UI word "לקוח / לקוחות".
  - Schema additions (all optional): `kinds` (`diner | event_client | lead`, ≤ 3), `tags` (≤ 12 × 40 chars; reserved `vip`, `allergy`, `repeat_no_show`), `lifecycle` (`new | active | dormant`), `firstSeenAt`, `lastContactAt`, `counters { requests, bookings, events, noShows, conversations }`, `consent { terms?, marketing? { given, at, via } }`, `language` (`he | en | ar | ru`), `waId`, `mergedInto`.
  - Also (R-01, R-02): `phoneKey` — server-derived match key = the last 9 digits of `phoneNormalized` when it has ≥ 9 digits, else all of them (`0521234567` and `972521234567` → `521234567`); `doNotContact?: { at, reason ≤ 200, via: 'guest' | 'member' }` — server-owned, set only through the dedicated clients router that 551 adds for merge (`PUT /api/v1/clients/:id/do-not-contact`) and by the assistant's removal intent (562), checked before every outbound message (560).
  - `CLIENT_SERVER_FIELDS` (exported from `client.schema.ts`, stripped by generic API): `phoneNormalized`, `phoneKey`, `kinds`, `lifecycle`, `firstSeenAt`, `lastContactAt`, `counters`, `waId`, `mergedInto`, `doNotContact`.
  - Canonical `source` keys written by the server: `manual`, `public_form`, `whatsapp`, `event_migration`.
  - `collections.js`: `clients` → `softDelete: true`.
  - Permissions (Q2 = b): `clients` stays in `OWNER_ONLY_TYPES` — only the owner creates, edits or deletes a client directly. Staff cause a client only implicitly: a manual request (`manageRequests`) runs `upsertClientByPhone` on the server. `STAFF_READ_FIELDS.clients = ['name','phone','tags','kinds']`. No new action. Switching to "staff may add clients" later is a `permissions.js` + client `PermissionService` change with no data migration — `createdBy` is already stamped on every client.
  - `server/utils/client-upsert.js` exports `normalizePhone(s)` and `upsertClientByPhone(db, businessId, { name, phone, source, actor }) → { client, created: boolean }` — matches on `phoneKey` over live, unmerged docs only; uniqueness is enforced here (delta 3). Also exports `phoneKey(digits)`. Index `{ businessId: 1, phoneKey: 1 }` non-unique. Migration 0011 backfills `phoneKey` and its dry-run lists clients that collide on it.
  - Restore of a client whose phone is taken → 409 `PHONE_TAKEN`.
  - Migration `server/migrations/0011-clients-crm.js`; ADR `0031-clients-are-crm-records.md` supersedes ADR 0027 line 32.
- [ ] Behaviour rules this plan implements (from `docs/frontdesk/assistant-behaviour-rules.md`): **R-01** "Match a phone by its last 9 digits. WhatsApp sends `9725…`, a form gets `05…`; digit-only comparison makes two clients out of one person. Server field `phoneKey`." (the field and its derivation; the matching itself is 545). **R-02** "Do-not-contact is a server flag, set by a dedicated route or by the assistant's removal intent, and checked before every outbound message." (the field only, server-owned; the route is 551, the guard 560).
- [ ] `shared/schemas/phone.ts` (new, pure, no imports): `normalizePhone(s: string): string` = digits only (same rule as today); `phoneKey(digits: string): string` = last 9 characters when `digits.length >= 9`, else `digits`. Exported from `shared/schemas/index.ts`. `generic.js` replaces its inline `withPhoneNormalized` body with these two and also stamps `phoneKey` in the same two places (POST line ~513, PUT line ~637). 545 makes `server/utils/client-upsert.js` re-export both and `client-display.util.ts` import `normalizePhone` from here.
- [ ] `clientSchema` gains, all `.optional()`: `phoneKey: z.string().max(30)`; `kinds: z.array(z.enum(CLIENT_KINDS)).max(3)` with `CLIENT_KINDS = ['diner', 'event_client', 'lead'] as const`; `tags: z.array(z.string().min(1).max(40)).max(12)` with `RESERVED_CLIENT_TAGS = ['vip', 'allergy', 'repeat_no_show'] as const` exported (no special handling yet); `lifecycle: z.enum(CLIENT_LIFECYCLES)` with `['new', 'active', 'dormant'] as const`; `firstSeenAt`, `lastContactAt`: `z.number()`; `counters: z.strictObject({ requests, bookings, events, noShows, conversations })` — each `z.number().int().min(0).optional()` so the server can set one counter at a time; `consent: z.strictObject({ terms: z.number().optional(), marketing: z.strictObject({ given: z.boolean(), at: z.number(), via: z.string().max(40) }).optional() })`; `language: z.enum(['he', 'en', 'ar', 'ru'])`; `waId: z.string().max(30)`; `mergedInto: z.string()`; `doNotContact: z.strictObject({ at: z.number(), reason: z.string().max(200), via: z.enum(['guest', 'member']) })`. `CLIENT_SOURCES = ['manual', 'public_form', 'whatsapp', 'event_migration'] as const` exported (`source` stays free text). `CLIENT_SERVER_FIELDS` exported as the `readonly` list in the contract. Update the schema's doc comment (soft delete; staff read four fields).
- [ ] `shared/schemas/staff-fields.ts`: `clients: ['name', 'phone', 'tags', 'kinds']`.
- [ ] `server/constants/collections.js`: `clients` → `softDelete: true`; fix the comment above it ("Soft delete, Trash (plan 544, ADR 0031)").
- [ ] `server/routes/generic.js`: `withoutServerClientFields(body)` beside `withoutServerEventFields`, deleting every `CLIENT_SERVER_FIELDS` key (import from `../generated/schemas/entities/client.schema`). Applied on POST (beside line 477, before the phone stamp) and on PUT (beside line 615); the replace-all `PUT /:type` (line 1093) accepts only `REPLACEABLE_TYPES` (`VERSION_HISTORY`), so clients never reach it. PUT keeps the stored server values because `merged = { ...current, ...updatable }`. Then `phoneNormalized` + `phoneKey` are stamped from `phone` (both places). No other per-type code: Trash, restore and purge already work for every soft-delete type.
- [ ] `server/db.js`: `db.collection('clients').createIndex({ businessId: 1, phoneKey: 1 }, { name: 'client_phone_key' })` (non-unique), beside the other named indexes.
- [ ] `server/migrations/0011-clients-crm.js` — header comment and modes in the shape of `0010-drop-v1-collections.js` and `0009-clients-from-events.js` (purpose, modes, usage, rollback). `MIGRATION_ID = '0011-clients-crm'`. For each business (never `__master__`, never across businesses), for every client with no `deletedAt`: `phoneKey = phoneKey(normalizePhone(phone))` (from `../generated/schemas/phone`); `liveEvents` = count of `menuEvents` with this `clientId`, the same `businessId` and no `deletedAt`; `kinds` = `['event_client']` when `liveEvents > 0` (union with any stored kinds), else unchanged; `firstSeenAt = createdAt` when unset; `counters.events = liveEvents`. Every patched doc is checked with `parseV2('clients', doc)`; the first invalid doc aborts, dry run included (INV-4). Dry run prints `clients: <n>, to patch: <m>, phoneKey collisions: <k>` and, per collision group, `collision <businessId> <phoneKey>: <id> "<name>", <id> "<name>"` (ids and names only, never the phone). Collisions are listed, never merged or deleted (they are resolved by hand through the merge of plan 551). `--write=yes` needs `--backup-dir` (`checkBackup`), is idempotent, stores `{ _id: MIGRATION_ID, appliedAt, patched }` in `migrations`. `--verify=yes`: every live client has `phoneKey` equal to the derived one and `counters.events` equal to its live event count → `verify: ok`, else `verify: fail <n>` and exit 1. `--db=<scratch>` (local only) as in 0009. `module.exports = { plan, write, verify, MIGRATION_ID }` with the `require.main === module` guard.
- [ ] `src/app/core/models/client.model.ts`: add the new optional fields and re-export `CLIENT_KINDS`, `CLIENT_LIFECYCLES`, `RESERVED_CLIENT_TAGS` from `@schemas/entities`; update the doc comment (staff receive name, phone, tags, kinds).
- [ ] `src/app/core/services/trash.service.ts`: `'clients'` added to `TrashType`; `{ type: 'clients', titleKey: 'trash_clients' }` appended last to `TRASH_SECTIONS`; `clients: inject(ClientDataService)` in `lists`.
- [ ] `public/assets/data/dictionary.json` (append): `"trash_clients": "לקוחות"`.
- [ ] `docs/brain/decisions/0031-clients-are-crm-records.md` with exactly the text in "ADR 0031 text" below. `docs/brain/decisions/0027-client-entity-above-events.md`: add one line under the frontmatter `superseded-in-part-by: 0031-clients-are-crm-records (staff read fields; soft delete)` — nothing else changes in 0027.
- [ ] `docs/agent/standards-backend.md` §1 Collection Registry: the `clients` row says soft delete (Trash) and lists the server-owned fields; §5 unchanged (no new route).
- [ ] `server/test/clients.test.js`: replace "owner DELETE removes the client" with the Trash round trip; widen the staff-read cases to the four fields; add one strip case per `CLIENT_SERVER_FIELDS` key on POST and on PUT; a stored `phoneKey` for `+972 52 123 4567` is `521234567`.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

### ADR 0031 text (approved by Dandan 2026-11-10; the Worker writes it verbatim)

```markdown
---
status: accepted
date: 2026-11-10
review-by: 2027-05-10
supersedes: 0027-client-entity-above-events (staff read fields, lines 26-29; soft delete, lines 31-32)
---

# 0031. Clients are CRM records: soft delete, a phone match key, server-owned history fields

## Context

ADR 0027 made the client a record above events, owner-only to write, read by staff as name and phone, and deleted
for good. The Front Desk program turns that record into the business's customer list: requests, bookings, events and
(later) conversations all point at it, and the public page and WhatsApp create clients without a member typing them.
A CRM that loses a customer and their history on one tap, or keeps two records for one person because one channel
sends `05…` and another `9725…`, cannot be trusted. On 2026-11-10 the Human decided: clients stay owner-only to
write (D2), are soft-deleted (D3), and staff may read tags and kinds (D2).

## Decision

- `clients` is a soft-delete type (`softDelete: true`): a delete stamps `deletedAt`, Trash lists the client, restore
  brings it back, and the 30-day purge removes it for good. Events keep their `clientName` / `clientPhone` snapshot,
  so an event whose client was purged still shows who it was for.
- A client carries optional CRM fields: `kinds` (diner, event client, lead), `tags` (reserved: `vip`, `allergy`,
  `repeat_no_show`), `lifecycle`, `firstSeenAt`, `lastContactAt`, `counters`, `consent`, `language`, `waId`,
  `mergedInto` and `doNotContact`.
- `phoneKey` is the match key for one person across channels: the last 9 digits of `phoneNormalized` when it has at
  least 9, else all of them. It is derived by the server on every write, like `phoneNormalized`.
- The server alone writes `phoneNormalized`, `phoneKey`, `kinds`, `lifecycle`, `firstSeenAt`, `lastContactAt`,
  `counters`, `waId`, `mergedInto` and `doNotContact` (`CLIENT_SERVER_FIELDS`); the generic API drops them from
  every write. `doNotContact` is set only by a dedicated clients route or the assistant's removal intent.
- Duplicates are never resolved by delete: one live, unmerged client per `phoneKey` is kept by the server's
  find-or-create, and existing duplicates are joined by a merge that stamps `mergedInto`.
- Staff read `name`, `phone`, `tags` and `kinds` (plus the base fields). Everything else stays owner-only to read.
- `liveKey` (server-only, = `phoneKey` while the client is live and not merged; removed on delete and merge) carries a unique partial index `{ businessId, liveKey }`, so the database itself keeps one live client per phone (plan 545).
- Unchanged from ADR 0027: only the owner creates, edits or deletes a client directly; a staff member causes a client
  only through a request the server turns into one. `createdBy` is stamped on every client, so letting staff add
  clients later is a permissions change with no data migration.

## Rejected

- A separate `guests` / `contacts` / `leads` collection beside `clients` (two lists of the same people).
- A unique database index on the phone: a trashed or merged client keeps its phone, so restore and merge would
  collide; uniqueness is checked over live, unmerged clients instead, and a restore that would collide is refused
  (`PHONE_TAKEN`).
- Letting staff create and edit clients now (decided against on 2026-11-10; kept cheap to open later).

## Consequences

- Migration 0011 backfills `phoneKey`, `kinds`, `firstSeenAt` and the event counter for existing clients and lists,
  without changing them, any clients that share a `phoneKey`.
- A purged client leaves its events with a `clientId` that no longer resolves; screens fall back to the snapshot.
- Staff now see tags; an owner who writes something private in a tag shows it to staff.

## Review

Check whether owners ask for staff to add clients, and whether the `phoneKey` rule ever joins two different people.
```

## UI/UX Notes
- The only UI change is a "לקוחות" section on the existing `/trash` page (last section), rendered by the existing template. No new icons.
- Dictionary key (append): `trash_clients` → "לקוחות".

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Give the client record its CRM fields and one phone rule shared by server and browser — schema additions, enums, server-field list, phone.ts, staff read fields — shared/schemas/entities/client.schema.ts, shared/schemas/phone.ts, shared/schemas/index.ts, shared/schemas/staff-fields.ts
- [x] A2: Keep the server-owned client fields out of reach of normal saves and derive the match key — strip on POST and PUT; stamp phoneNormalized and phoneKey; phone-key index — server/routes/generic.js, server/db.js
- [x] A3: Send a deleted client to Trash instead of deleting it for good — softDelete flag, collection registry note — server/constants/collections.js, docs/agent/standards-backend.md
- [x] A4: Prove the new rules with server tests — strip per field, staff read of four fields, Trash round trip, phone key for the international form — server/test/clients.test.js, server/test/cross-business.test.js
- [x] A5: Fill the new fields for clients that already exist, and list possible duplicates without touching them — migration 0011 with dry run, write, verify, scratch DB, and its test — server/migrations/0011-clients-crm.js, server/test/migration-0011-clients-crm.test.js
- [x] A6: Run the migration locally and hand the Atlas run to Dandan — pnpm run build:schemas; node server/scripts/db-backup.js --target=local; dry run, write with --backup-dir, verify on local only; paste outputs and the Atlas runbook below into Execution Notes; never pass --target=atlas
- [x] A7: Show trashed clients on the Trash page — TrashType, section, data-service entry, dictionary key, spec and the ui test — src/app/core/services/trash.service.ts, src/app/core/services/trash.service.spec.ts, src/app/core/models/client.model.ts, public/assets/data/dictionary.json, e2e/ui/544-1.spec.ts
- [x] A8: Write down the decision — ADR 0031 verbatim and the one-line pointer in ADR 0027 — docs/brain/decisions/0031-clients-are-crm-records.md, docs/brain/decisions/0027-client-entity-above-events.md
- [x] A9: Run every check and hand over the cards — test:server, test:ci, server lint, build, scope-check --arch, log-query; the [ui] spec; the [human] Atlas card

Atlas runbook for A6 (the Human runs it in PowerShell; `<host>` is printed by the error of a run without `--confirm-host`):

```
node server\scripts\db-backup.js --target=atlas
node server\migrations\0011-clients-crm.js --target=atlas --confirm-host=<host>
node server\migrations\0011-clients-crm.js --target=atlas --confirm-host=<host> --write=yes --backup-dir=<folder printed by db-backup>
node server\migrations\0011-clients-crm.js --target=atlas --confirm-host=<host> --verify=yes
```

Read every `collision` line of the dry run before the write; the write never changes a collision, it only fills fields.

## Technical Considerations
- Dependencies: `generic.js` POST/PUT/bulk create paths for `clients`; `TrashService`; `ClientDataService` (unchanged — it already loads through the generic API).
- New files needed: `shared/schemas/phone.ts`, `server/migrations/0011-clients-crm.js`, `server/test/migration-0011-clients-crm.test.js`, `e2e/ui/544-1.spec.ts`, `docs/brain/decisions/0031-clients-are-crm-records.md`.
- Model changes: `clientSchema` (optional additions, so every stored client still validates before the migration), `Client` interface, `TrashType`.
- Backend / API: no new route. Generic writes on `clients` drop the server-owned fields; `GET /clients/trash`, `PUT /clients/:id/restore`, `DELETE /clients/trash` start answering (shared Trash routes). The restore phone check (`PHONE_TAKEN`) is plan 545.
- Auth and validation: unchanged — owner-only writes (`OWNER_ONLY_TYPES`), staff projection widened to four fields, Zod validates every write.
- Security surface: staff read two more fields (`tags`, `kinds`); the dry-run and migration output never print a phone number.
- Data / migration: migration 0011 (additive, idempotent; rollback = restore the `--backup-dir` snapshot into a scratch DB, or `$unset` the added fields — the old code ignores them). `softDelete: true` changes what DELETE does for clients from now on.
- Project checks: `[auto] log-query` present; `pnpm run test:server` and `pnpm run test:ci`; dictionary key named; no icons; Reuse Check filled; one `[ui]` spec under `e2e/ui/544-1.spec.ts` signs in with `signInQa`.

## Out of Scope
- `upsertClientByPhone`, the generic POST find-or-create, the restore `PHONE_TAKEN` check and keeping `counters.events` current after this migration (plan 545).
- Any client screen, delete button or merge (plans 547, 551); the `doNotContact` route (551) and its send guard (560).
- Deriving `lifecycle` (no plan writes it yet; see Execution Notes) and `lastContactAt` (549 and later).
- Changing who may write clients (D2: owner-only stays).

## Critical Questions
- Q1: The contract's `phoneKey` rule (last 9 digits) joins Israeli mobiles across `05…` and `9725…`, but not landlines: `03-123 4567` → `031234567`, `+972 3 123 4567` → `231234567` (two clients for one number). Choices: (a) keep the contract rule as frozen — WhatsApp numbers are mobiles, landlines come only from the form, the merge in 551 fixes the rare pair (recommended: no contract change, no map edit) / (b) change the rule to "drop a leading `972` or a leading `0`, then the last 9 digits" — joins landlines too, but changes the frozen C-CONTACT text and R-01 for every later plan. A: (Human, 2026-11-10) a

## Execution Notes
- Plan number: map row 2, renumbered +2 on 2026-11-10 (old 542 → 544).
- ADR scope: the map's delta 7 names ADR 0027 line 32 only; the staff read change (D2: `tags`, `kinds`) also contradicts 0027 lines 26–29, so ADR 0031 supersedes both points. Owner-only write (0027 lines 24–25) stays.
- `counters` sub-fields are each optional so a server router can `$set` one counter (`counters.events`) on a client that has no `counters` yet without breaking the strict schema.
- `lifecycle` has no derivation rule in the brief or the map; this plan only adds the field. The first plan that filters by it (547) must state the rule (open line for the Planner).
- Snapshot kept as the map's verification SHA `05741afd`; facts above re-checked on `origin/main` 5702f6d1.
- ADR 0031 text approved by Dandan in chat 2026-11-10 ("approve ADR 0031"), including the liveKey line added for plan 545 Q1 = a. The [human] Done-when item for it is met at save time.
- lifecycle rule (Human 2026-11-10, plan 547): new = firstSeenAt within 30 days, dormant = no contact for 180 days, active = the rest; computed in the browser, the stored field is not read.
- 2026-11-10 builder (round 2, fresh from base 012b39bf; round 1 failed only on a left-over `test-results/` folder):
  - scope extended: docs/workflow-kit/manifest.json — ADR 0031 entry (always-allowed regenerated file; `kit-manifest-check` → `ok — 389 classified, 0 unclassified`).
  - `pnpm run test:server` → exit 0 (76 files, 911 tests); `pnpm run test:ci` → exit 0 (TOTAL: 1874 SUCCESS); `pnpm run build` → exit 0; `pnpm run lint` → exit 0; `pnpm --dir server run lint` → exit 0.
  - `node scripts/scope-check.mjs --arch --plan=…` → `ARCH: ok INV-1, INV-2, INV-3, INV-4`; `--diff=origin/orch/fd-1a-data` → `SCOPE: ok`; override-check, lint:icons, lint:no-native-select, plan-ledger-check, breadcrumbs-check → exit 0; `log-query --since=plan-start --level=error` → `no entries`.
  - generic.js: the staff Trash list (`GET /:type/trash`) now goes through the same `readProjection` as the other reads, so a staff member's Trash read of clients carries only name, phone, tags, kinds (test in clients.test.js).
  - A6 (local only; `mongodb` is not a direct server dependency in this worktree, so the tools ran with `NODE_PATH` = mongoose's `node_modules`): `node server/scripts/db-backup.js --target=local` → exit 0, snapshot `foodvibe-db-backups/local-2026-11-10T15-47-12` (37754 docs). Dry run → `clients: 10, to patch: 0, phoneKey collisions: 2` + 2 collision lines (local test clients; the round-1 attempt had already filled the fields). `--write=yes --backup-dir=…` → `patched 0 clients`; a second write → `patched 0`; `--verify=yes` → `verify: ok`. Never run with `--target=atlas`.
  - `[ui]` `e2e/ui/544-1.spec.ts`: `npx playwright test e2e/ui/544-1.spec.ts --list` → 1 test. Not run here: ports 4200/3000 serve the main folder's code, not this branch; the gate reruns it.
  - Atlas runbook for Dandan: the four commands under "Atlas runbook for A6" above, unchanged.
