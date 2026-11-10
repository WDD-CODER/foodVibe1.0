# Plan 545 — One find-or-create of a client by phone, so one person is one client on every channel

Status: draft
Depends-on: 544
Snapshot: 05741afd08ec936d1aec6f8d9a53631141905f93

## Problem Statement
The Front Desk program (`docs/frontdesk/frontdesk-map.md`, map row 3, spec FD-01) will create clients from four
places: the owner's inquiry dialog (generic `POST /api/v1/data/clients`), manual requests (549), the public page (555)
and WhatsApp (560). If each place finds-or-creates on its own, one person becomes several clients. This plan puts the
rule in one server function, makes the generic POST use it, refuses a restore or a phone change that would make a
second live client for the same phone, and keeps each client's event counter true after plan 544's backfill.

Verified on `origin/main` (5702f6d1, 2026-11-10) — plan 544 lands first and adds `phoneKey`, `CLIENT_SERVER_FIELDS`,
`shared/schemas/phone.ts` (`normalizePhone`, `phoneKey`) and `softDelete: true` for clients:
- `server/routes/generic.js`: `POST /:type` at line 467 (stamps, `checkStoredDoc`, plan 485 name clash → 409, `insertOne`, `res.status(201).json(doc)` at line 537, `err.code === 11000` → 409 at line 539); `PUT /:type/:id` at line 587 (client phone re-derived at line 636–639); `PUT /:type/:id/restore` at line 410 (product name check → 409 `PRODUCT_NAME_TAKEN`, the pattern to copy); `PUT /:type/trash/restore-all` at line 379 (products skipped when their name is taken: `{ restored, skipped }`); `DELETE /:type/:id` soft path at line ~1218–1235; `DELETE /:type/bulk`.
- `server/utils/product-name-guard.js`: `PRODUCT_NAME_TAKEN = { error, messageKey }` — the shape for `PHONE_TAKEN`.
- `src/app/core/utils/client-display.util.ts:4`: `normalizePhone` = `replace(/\D/g, '')` (plan 514); spec `client-display.util.spec.ts`.
- `src/app/core/services/client-data.service.ts:31`: `addClient` posts and appends the saved doc to the list; its only caller is `new-inquiry-dialog.component.ts:200`, which selects the returned client.
- `src/app/core/services/trash.service.ts`: `restore()` calls `storage.restore` then a success toast; no 409 handling.
- `src/app/core/utils/server-refusal.util.ts`: `readServerRefusal(err)` reads `{ error, messageKey }` refusals (plan 540).
- No `server/utils/client-upsert.js`, no `shared/schemas/testing/`. `shared/schemas/tsconfig.cjs.json` builds every `*.ts` except specs into `server/generated/schemas`, so a vector file there reaches the server tests.
- Map delta 2: `events.js` never touches clients; the callers of `upsertClientByPhone` are generic POST `clients` (this plan), requests (549), public (555), webhook (560).

## Goals & Success Criteria
**Primary:** one live, unmerged client per phone match key per business, whoever creates it, with the same phone rule
proven on both server and browser, and `counters.events` always equal to the client's live events.

- [auto] `pnpm run test:server` passes, including `server/test/client-upsert.test.js` and the new cases in `server/test/clients.test.js`.
- [auto] Shared vectors (R-01): every row of `shared/schemas/testing/phone-vectors.ts` gives the same `normalizePhone` and `phoneKey` on the server (`server/test/client-upsert.test.js`) and in the browser (`src/app/core/utils/client-display.util.spec.ts`).
- [auto] Concurrency: 5 parallel `upsertClientByPhone` calls for `052-123 4567` in one business leave exactly 1 live client; 1 call returns `created: true`, 4 return `created: false` with the same `_id` (`server/test/client-upsert.test.js`).
- [auto] A soft-deleted client with phone `0521234567` is not revived: an upsert for `+972 52 123 4567` creates a new client; `PUT /clients/<old id>/restore` then answers 409 `{ error: 'PHONE_TAKEN', messageKey: 'client_phone_taken' }` and the old client stays in Trash (`server/test/clients.test.js`).
- [auto] Owner `POST /api/v1/data/clients` with a phone an existing live client has answers 200 with that client (same `_id`, its stored name kept) and stores nothing new; a new phone answers 201 (`server/test/clients.test.js`).
- [auto] Owner `PUT /clients/:id` that changes the phone to one another live client has answers 409 `PHONE_TAKEN` and changes nothing (`server/test/clients.test.js`).
- [auto] Event counter: after a generic `POST menuEvents` with `clientId: c1`, a `PUT` moving it to `c2`, a `DELETE` and a restore, `c1.counters.events` and `c2.counters.events` equal their live event counts at each step, and `kinds` holds `event_client` exactly while the count is > 0 (`server/test/clients.test.js`).
- [auto] Other businesses: an upsert in business A never matches a client of business B with the same phone (`server/test/client-upsert.test.js`).
- [auto] `pnpm run test:ci` passes, including `client-display.util.spec.ts`, `client-data.service.spec.ts` (an existing phone → the list keeps one entry and the info toast key `client_existing_selected` is shown) and `trash.service.spec.ts` (a 409 restore shows `client_phone_taken`, no success toast).
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/545-one-find-or-create-of-a-client-by-phone.plan.md` exits 0.
- [auto] `pnpm --dir server run lint` exits 0.
- [auto] `pnpm run build` passes.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] In the menu library, as the QA owner, "פנייה חדשה" → add a new client with the phone of a client that already exists → the toast "כבר יש לקוח עם מספר הטלפון הזה — הוא נבחר" shows and the existing client's name is the selected client (`e2e/ui/545-1.spec.ts`).

## Execution Mode
- Parallel: no — not with 544, nor with any plan editing `shared/schemas/entities/client.schema.ts` or `server/routes/generic.js` (map must-not-run list: 545 changes the generic POST for `clients`); runs after 544 in lane wt-1.
- Concurrent plans: none
- Isolated DB: no — no stored data is reshaped; old clients get `liveKey` only when they are next written or restored (see A2).

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/utils/client-upsert.js
server/routes/generic.js
server/db.js
shared/schemas/entities/client.schema.ts
shared/schemas/testing/phone-vectors.ts
server/test/client-upsert.test.js
server/test/clients.test.js
src/app/core/utils/client-display.util.ts
src/app/core/utils/client-display.util.spec.ts
src/app/core/services/client-data.service.ts
src/app/core/services/client-data.service.spec.ts
src/app/core/services/trash.service.ts
src/app/core/services/trash.service.spec.ts
public/assets/data/dictionary.json
e2e/ui/545-1.spec.ts
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

- INV-1: preserves — generic POST, PUT and restore of `clients` keep `assertCan` / `OWNER_ONLY_TYPES` before any lookup; `upsertClientByPhone` takes the `businessId` from its caller (the token or, later, the server-resolved business) and never from a body.
- INV-2: preserves — every lookup is filtered by `businessId`; `__master__` never holds clients.
- INV-3: preserves — the event counter and `kinds` are recomputed on the server inside the same request that changed the event.
- INV-4: preserves — every created or changed client is checked with `parseV2('clients', …)`; `liveKey` (Q1 = a) is added to `clientSchema`.

## Reuse Check

- `server/utils/client-upsert.js` `upsertClientByPhone`, `findLiveClientByPhoneKey`, `insertClientOrJoin`, `refreshClientEvents`, `PHONE_TAKEN` — family: none — rung: 4 — why: server util, no UI family; the one find-or-create the contract names, re-exporting `normalizePhone` / `phoneKey` from `shared/schemas/phone.ts` (plan 544) instead of copying them.
- `shared/schemas/testing/phone-vectors.ts` `PHONE_VECTORS` — family: none — rung: 4 — why: test data shared by the server and browser specs so the two sides cannot drift.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As an owner, I want a customer who writes on WhatsApp and later fills the form to stay one customer so that I see their whole history in one place.
- As an owner, I want the app to tell me when the phone I type already belongs to a customer so that I don't create a twin by mistake.
- As an owner, I want each customer's event count to stay right so that I can trust who is a repeat event client.

## Functional Requirements

### Must Have (P0)
- [ ] Contract copied verbatim from `docs/frontdesk/frontdesk-map.md` (frozen; do not rename anything) — the C-CONTACT lines this plan implements:
  - `server/utils/client-upsert.js` exports `normalizePhone(s)` and `upsertClientByPhone(db, businessId, { name, phone, source, actor }) → { client, created: boolean }` — matches on `phoneKey` over live, unmerged docs only; uniqueness is enforced here (delta 3). Also exports `phoneKey(digits)`. Index `{ businessId: 1, phoneKey: 1 }` non-unique. Migration 0011 backfills `phoneKey` and its dry-run lists clients that collide on it.
  - Restore of a client whose phone is taken → 409 `PHONE_TAKEN`.
  - Canonical `source` keys written by the server: `manual`, `public_form`, `whatsapp`, `event_migration`.
  - Permissions (Q2 = b): `clients` stays in `OWNER_ONLY_TYPES` — only the owner creates, edits or deletes a client directly. Staff cause a client only implicitly: a manual request (`manageRequests`) runs `upsertClientByPhone` on the server. `STAFF_READ_FIELDS.clients = ['name','phone','tags','kinds']`. No new action.
- [ ] Behaviour rule this plan implements (`docs/frontdesk/assistant-behaviour-rules.md`): **R-01** "Match a phone by its last 9 digits. WhatsApp sends `9725…`, a form gets `05…`; digit-only comparison makes two clients out of one person. Server field `phoneKey`."
- [ ] `shared/schemas/testing/phone-vectors.ts` (new): `export const PHONE_VECTORS: readonly { input: string; normalized: string; key: string }[]` with at least these rows — `052-123 4567` → `0521234567` / `521234567`; `+972 52 123 4567` → `972521234567` / `521234567`; `972521234567` → `972521234567` / `521234567`; `123-4567` (7-digit landline) → `1234567` / `1234567`; `03-123 4567` → `031234567` / `031234567`; `+1 (212) 555-0123` (foreign) → `12125550123` / `125550123`; `abc` → `` / ``. (If plan 544 Q1 is answered (b), the Planner rewrites the `key` column before this plan is saved.)
- [ ] `server/utils/client-upsert.js` (new, CommonJS, in the style of `server/utils/product-name-guard.js`):
  - re-exports `normalizePhone`, `phoneKey` from `../generated/schemas/phone`;
  - `PHONE_TAKEN = Object.freeze({ error: 'PHONE_TAKEN', messageKey: 'client_phone_taken' })`;
  - `LIVE_UNMERGED = { deletedAt: { $exists: false }, mergedInto: { $exists: false } }`;
  - `findLiveClientByPhoneKey(db, businessId, key, exceptId?)` → the oldest live, unmerged client of that business with that `phoneKey` (sort `createdAt: 1, _id: 1`), or `null`;
  - `insertClientOrJoin(db, doc)` → `{ client, created }`: sets `doc.liveKey = doc.phoneKey`, `insertOne`; on `err.code === 11000` reads `findLiveClientByPhoneKey` and returns it with `created: false` (Q1 = a);
  - `upsertClientByPhone(db, businessId, { name, phone, source, actor })`: `normalized = normalizePhone(phone)`, `key = phoneKey(normalized)`; a found client is returned unchanged with `created: false` (its name is never overwritten); else a new doc `{ _id: newId(), schemaVersion: 2, businessId, createdBy, ...(member && { userId }), createdAt: now, updatedAt: now, name, phone, phoneNormalized: normalized, phoneKey: key, clientType: 'private', source, firstSeenAt: now, counters: { requests: 0, bookings: 0, events: 0, noShows: 0, conversations: 0 } }` is checked with `parseV2('clients', doc)` (a failure throws `Object.assign(new Error('BAD_CLIENT'), { code: 'BAD_CLIENT', issues })`) and stored through `insertClientOrJoin`. `actor` is `actorOf(req)` (`{ userId, name }` → `createdBy = userId`) or a `guestActor(...)` string (`'public:form' | 'public:whatsapp'` → `createdBy` = that string, no `userId`) — both from `server/utils/actor.js` (plan 543). `source` must be one of `CLIENT_SOURCES`, else throw `BAD_CLIENT`;
  - `refreshClientEvents(db, businessId, clientIds)`: for each distinct non-empty id, `n` = live `menuEvents` of that business with that `clientId`; `$set: { 'counters.events': n, updatedAt: now }` and `$addToSet: { kinds: 'event_client' }` when `n > 0`, `$pull: { kinds: 'event_client' }` when `n === 0`. Missing client → no-op.
- [ ] `shared/schemas/entities/client.schema.ts` (Q1 = a): `liveKey: z.string().max(30).optional()` and `'liveKey'` appended to `CLIENT_SERVER_FIELDS` (a contract extension, recorded in Execution Notes for the map).
- [ ] `server/db.js`: `db.collection('clients').createIndex({ businessId: 1, liveKey: 1 }, { unique: true, partialFilterExpression: { liveKey: { $exists: true } }, name: 'client_live_key_unique' })`. Old clients have no `liveKey`, so the index builds on any existing data, duplicates included.
- [ ] `server/routes/generic.js`, `clients` only:
  - POST: after the permission check, the server-field strip and `checkStoredDoc`, `findLiveClientByPhoneKey` → found: `res.status(200).json(found)`, nothing written; else `insertClientOrJoin(col, doc)` with `source: doc.source ?? 'manual'`, `firstSeenAt`, zeroed `counters` → 201 when created, 200 with the existing client when the insert joined one. The other client fields the owner sent (`clientType`, `companyName`, `email`, `notes`, `tags`, `consent`, `language`) are kept on a new client.
  - PUT: when the derived `phoneKey` changes, `findLiveClientByPhoneKey(…, exceptId = id)` → found: 409 `PHONE_TAKEN`; else the update sets `liveKey` to the new key (an E11000 from the update → 409 `PHONE_TAKEN`). A PUT that leaves the phone alone and finds no `liveKey` on a live client sets it (lazy fill for clients made before this plan).
  - DELETE `/:id` and `/bulk` (soft): the same update also `$unset`s `liveKey` for clients.
  - `PUT /:type/:id/restore`: for clients, `findLiveClientByPhoneKey(…, inTrash.phoneKey, inTrash._id)` → found: 409 `PHONE_TAKEN` (copy of the product block at line ~416); else the restore also `$set`s `liveKey = phoneKey` (an E11000 → 409 `PHONE_TAKEN`).
  - `PUT /:type/trash/restore-all`: clients whose phone is taken stay in Trash and are counted in `skipped` (copy of the product block at line ~385).
- [ ] `server/routes/generic.js`, `menuEvents`: after a successful POST (new `clientId`), PUT (old and new `clientId`), DELETE `/:id` and `/bulk` (the deleted events' `clientId`s, read before the write), restore and restore-all (the restored events' `clientId`s), call `refreshClientEvents(db, businessId, ids)` before the response. A permanent dispose does not change live counts and needs no call.
- [ ] `src/app/core/utils/client-display.util.ts`: `normalizePhone` and a new `phoneKey` re-exported from `@schemas/phone` (the local body is deleted); `matchesClientQuery` unchanged.
- [ ] `src/app/core/services/client-data.service.ts` `addClient`: when the returned `_id` is already in the list, replace that entry (no second copy) and show `userMsg.onSetSuccessMsg(translate('client_existing_selected'))`; the method still returns the client (the dialog selects it, unchanged). `UserMsgService` and `TranslationService` through `inject()`.
- [ ] `src/app/core/services/trash.service.ts` `restore`: a refusal read by `readServerRefusal(err)` with a `messageKey` → `userMsg.onSetErrorMsg(translate(messageKey))`, no success toast, Trash reloaded; other errors keep today's behaviour.
- [ ] `public/assets/data/dictionary.json` (append): `"client_phone_taken": "לא ניתן לשחזר: כבר יש לקוח פעיל עם מספר הטלפון הזה"`, `"client_existing_selected": "כבר יש לקוח עם מספר הטלפון הזה — הוא נבחר"`.
- [ ] `docs/agent/standards-backend.md` §5: one sentence under the table — "`POST /api/v1/data/clients` finds-or-creates by `phoneKey` (plan 545): 201 new, 200 existing; restore or a phone change that would make a second live client → 409 `PHONE_TAKEN`."

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- No new screen or icon. Two toasts: "כבר יש לקוח עם מספר הטלפון הזה — הוא נבחר" (success style, after adding a client whose phone exists) and "לא ניתן לשחזר: כבר יש לקוח פעיל עם מספר הטלפון הזה" (error style, on a refused Trash restore).
- Dictionary keys (append): `client_phone_taken`, `client_existing_selected` (values above).

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Write down the phone examples both sides must agree on — the vectors file with the seven rows — shared/schemas/testing/phone-vectors.ts
- [ ] A2: Put the one find-or-create in a server file and let the database guarantee one live client per phone — client-upsert.js helpers, liveKey in the schema and the server-field list, the unique partial index — server/utils/client-upsert.js, shared/schemas/entities/client.schema.ts, server/db.js
- [ ] A3: Test it alone — vectors, five parallel calls, a trashed match not revived, other business never matched, bad phone refused — server/test/client-upsert.test.js
- [ ] A4: Make the owner's add, phone change, delete and restore of a client use the same rule — POST 200/201, PUT 409, liveKey unset on delete, restore and restore-all checks — server/routes/generic.js, server/test/clients.test.js
- [ ] A5: Keep each client's event count and event-client kind right whenever an event moves, is deleted or comes back — refreshClientEvents calls in the event write paths and their tests — server/routes/generic.js, server/test/clients.test.js
- [ ] A6: Use the same phone rule in the browser and tell the owner when a phone already exists or a restore is refused — util re-export, addClient replace and toast, Trash refusal toast, dictionary keys, specs — src/app/core/utils/client-display.util.ts, src/app/core/utils/client-display.util.spec.ts, src/app/core/services/client-data.service.ts, src/app/core/services/client-data.service.spec.ts, src/app/core/services/trash.service.ts, src/app/core/services/trash.service.spec.ts, public/assets/data/dictionary.json
- [ ] A7: Note the new behaviour in the backend contract and add the ui test — the §5 sentence, the inquiry-dialog spec — docs/agent/standards-backend.md, e2e/ui/545-1.spec.ts
- [ ] A8: Run every check — test:server, test:ci, server lint, build, scope-check --arch, log-query, the ui spec

## Technical Considerations
- Dependencies: plan 543 (`actorOf`, `guestActor`), plan 544 (`phoneKey`, `CLIENT_SERVER_FIELDS`, `CLIENT_SOURCES`, `shared/schemas/phone.ts`, clients soft delete). `pnpm run build:schemas` before the server tests (the vectors and phone rule are read from `server/generated/schemas`).
- New files needed: `server/utils/client-upsert.js`, `shared/schemas/testing/phone-vectors.ts`, `server/test/client-upsert.test.js`, `e2e/ui/545-1.spec.ts`.
- Model changes: `clientSchema.liveKey` (server-only).
- Backend / API: generic `POST /clients` answers 200 with the existing client instead of creating a twin; `PUT /clients/:id`, `PUT /clients/:id/restore` can answer 409 `PHONE_TAKEN`; `restore-all` may skip clients. Generic `menuEvents` writes also update the linked clients' `counters.events` and `kinds`.
- Auth and validation: unchanged — owner-only writes on clients; the upsert validates with the Zod schema.
- Security surface: none new. The 409 body names no phone; no phone number is logged.
- Data / migration: none. `liveKey` fills lazily (new clients, restores, the next save of an old client). Until an old client is saved, the find step (by `phoneKey`, not `liveKey`) still finds it, so no twin is created.
- Project checks: `[auto] log-query` present; `pnpm run test:server` and `pnpm run test:ci`; dictionary keys named; no icons; Reuse Check filled; `[ui]` spec `e2e/ui/545-1.spec.ts` signs in with `signInQa`.

## Out of Scope
- Merging duplicates and the `doNotContact` route (plan 551 — it must also `$unset` `liveKey` on the merged-away client).
- Callers other than the generic POST: requests (549), public page (555), webhook (560) — they call `upsertClientByPhone` from their own plans.
- Counters other than `events` (`requests`, `bookings`, `noShows`, `conversations` are bumped by the plans that own those collections).
- Any change to the inquiry dialog's look; the shared picker is plan 546.

## Critical Questions
- Q1: How is "one live client per phone" guaranteed when two creates race (e.g. the public form and a WhatsApp message in the same second)? Choices: (a) a server-only field `liveKey` (= `phoneKey` while the client is live and not merged, removed on delete and merge) with a unique partial index — the database refuses the second insert and the server returns the first client; adds one name to the frozen `CLIENT_SERVER_FIELDS` list and plan 551's merge must remove it (recommended: correct under any timing, no migration, restore conflicts fall out of the index) / (b) no new field: insert, then re-read and keep the oldest — matches the contract word for word, but two inserts in the same millisecond can still both survive, to be joined later by the merge. A: a (Human 2026-11-10)

## Execution Notes
- Plan number: map row 3, renumbered +2 on 2026-11-10 (old 543 → 545).
- For the map's "Contract extensions (run)" (Q1 = a): `- plan 545 · clients gain server-only liveKey (= phoneKey while live and unmerged) with a unique partial index { businessId, liveKey }; 551's merge and every delete $unset it · one live client per phone under concurrent creates`.
- Added beyond the card, because the counters plan 544 backfills would go stale at once otherwise: `refreshClientEvents` on generic event writes (A5); a PUT that changes the phone is checked like a restore.
- Snapshot kept as the map's verification SHA `05741afd`; facts above re-checked on `origin/main` 5702f6d1.
