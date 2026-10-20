# Plan 442 — Give every event a stage, a stage history and a notes log on the server

Status: draft
Track: code
Snapshot: 8ffda3d2c4d8f3ab5137bfee30e9d80026d28110

## Problem Statement
Spec 09.1 (event pipeline and notes), server half. An event today is a name, type, date, serving type, guests and
a menu. `menuEventSchema` (strictObject, `shared/schemas/entities/menu-event.schema.ts`) has no status, notes,
customer or history, so a chef cannot tell an inquiry from a booked wedding, cannot see when a deal closed, and
keeps call notes on paper. The dashboards (plans 447, 448) need "closed" and "not closed" counts that never move
once recorded.

This plan builds the data and the server rules; plan 443 builds the screens (new inquiry form, stage bar, notes
panel, library stage chip/filter).
- Stages in order: פנייה → הצעת מחיר נשלחה → מקדמה שולמה → הזמנות → ביצוע → פוסט-פרודקשן → הסתיים, plus the end
  stage "לא נסגר" (only from פנייה or הצעת מחיר נשלחה, reason required). Forward, backward and skipping allowed;
  every move is logged (stage, time, who) and the log is never deleted.
- "Closed" = the event ever reached מקדמה שולמה or later; `closedAt` is set on the first such move and never changes.
- "הסתיים" is reached only through "סיים אירוע" (plan 446), never by a plain stage move.
- Only the owner and the event's creator move stages (C-PERM `changeStage`); anyone in the business adds notes
  (`addNote`); a note is edited or deleted only by its author. Notes ≤ 2,000 characters.
- An event without a date may sit in פנייה; from מקדמה שולמה on, a date is required.
- Stage history and notes are written **only by the server** — the generic `PUT /api/v1/data/menuEvents/:id`
  strips them, and a generic `POST` starts every new event in פנייה.
- Migration 0008: events that exist before this plan become "הסתיים" if their date has passed, otherwise
  "הצעת מחיר נשלחה", and are marked `legacy: true` ("ישן") so dashboards never count them.

## Goals & Success Criteria
- Primary: the server enforces every 09.1 stage and note rule through `/api/v1/events`, and every existing event
  has a stage after migration 0008.

Done when:
- [auto] `npx ng build` passes.
- [auto] `npm --prefix server test` passes, including the new files:
  - `server/test/event-stage.test.js` (pure `applyStageChange`): inquiry → quote_sent → deposit_paid (event has a
    date) gives two new history entries with `by`, `byName`, `at` and sets `closedAt` to the deposit move's `at`;
    moving back to quote_sent and forward to ordering keeps the first `closedAt`; deposit_paid on an event without
    `eventDate` → `{ ok: false, status: 400, error: 'DATE_REQUIRED' }`; not_closed without reason →
    `REASON_REQUIRED`; not_closed with `reason: 'price'` from quote_sent → `notClosedAt`, `notClosedReason: 'price'`;
    not_closed from ordering → `NOT_CLOSED_FROM_STAGE`; target `finished` → `USE_FINISH`; current stage
    `finished` → `EVENT_FINISHED`; same stage → ok, no history entry; not_closed → quote_sent allowed;
  - `server/test/events-router.test.js` (real app, `buildTestApp`): owner `PUT /api/v1/events/:id/stage` → 200 with
    the updated event; staff on an event created by someone else → 403 `{ error: 'FORBIDDEN', messageKey: 'no_permission' }`;
    staff on an event he created → 200; an event of another business → 404; `POST /:id/notes` ×3 → 3 notes with
    `by`, `byName`, `at`; a 2,001-character note → 400 `NOTE_TOO_LONG`; empty note → 400 `NOTE_EMPTY`;
    `PUT /:id/notes/:noteId` by another user → 403; by the author → 200 with `editedAt`; `DELETE` by the author →
    200 and the note is gone; generic `PUT /api/v1/data/menuEvents/:id` with `stage`, `stageHistory`, `notes`,
    `closedAt` in the body → stored values unchanged; generic `POST /api/v1/data/menuEvents` → `stage: 'inquiry'`,
    one history entry, `notes: []`;
  - `server/test/migration-0008-event-stages.test.js`: with `today = '2026-10-20'`, an event dated `2026-09-01` →
    `finished`, `2026-11-01` → `quote_sent`, no date → `quote_sent`, all `legacy: true`, `stageHistory: []`,
    `notes: []`; an event that already has a stage is untouched; a second `plan()` reports 0;
  - schema: `server/test/event-stage-schema.test.js` — a menu event with every new field valid; `stage: 'cancelled'`
    invalid; a note of 2,001 characters invalid; `notClosedReason: 'weather'` invalid.
- [auto] Local run in this slot's isolated DB: `node server/migrations/0008-event-stages.js --target=local` (dry
  run) prints counts per target stage; `--write=yes --backup-dir=<fresh local snapshot>`; second dry run prints 0;
  `--verify=yes` exits 0.
- [auto] Rehearsal on a restored Atlas copy (`db-restore.js … --db=foodvibe_scratch_0008`): dry run → write → dry
  run (0) → verify exit 0; counts pasted into the session state.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] Dandan reviews the Atlas dry-run counts (how many events become "הסתיים" / "הצעת מחיר נשלחה") and
  replies `go 0008` before the Atlas write.
- [human] After the Atlas write: `node server/migrations/0008-event-stages.js --target=atlas --confirm-host=<host> --verify=yes`
  exits 0.
- [human] Desktop + mobile: open `/menu-library` and two existing menus in `/menu-intelligence`, edit and save one →
  everything works as before (no screen shows stages yet — that is plan 443).

## Execution Mode
- Parallel: no against 424, 425 (`shared/schemas/**`, `server/routes/generic.js`), against 440, 445, 446
  (`menu-event.schema.ts`, sequential in lane wt-3) and against 443 (builds on this API). Yes otherwise.
- Concurrent plans: lane wt-3 order is 441 → 442 → 443.
- Isolated DB: yes — migration 0008 reshapes stored menu events.

## Execution Notes
- Depends on: plan 441 merged (lane order), plan 425 merged (`server/utils/business-scope.js` `scopeFilter`,
  businessId-scoped reads) and plan 427 merged (`server/utils/permissions.js` `assertCan`). If 425 or 427 is not
  merged yet, wait — the orchestrator holds this plan until they are (the router cannot scope or authorize
  without them).
- Must not run at the same time as: 424, 425 (`shared/schemas/**`, `generic.js`); 440, 445, 446
  (`menu-event.schema.ts`); 443; 432 (`server/app.js` router mounts).
- Atlas: dry run first; write only after Dandan's `go 0008` in chat, with a fresh atlas `db-backup.js` snapshot
  (< 24 h) as `--backup-dir`.
- MVP run mode: executed unattended into branch `mvp` per `docs/mvp/run-mode.md` — Atlas steps (incl. 'go 0007' / 'go 0008') are rehearsed on a scratch copy and deferred to the final gate; [human] items become validation cards in `docs/mvp/runs/<NNN>.md`.
  In this mode S8 stops after the scratch rehearsal and writes the Atlas commands (dry run, backup, write, verify)
  under `## Final gate — Atlas` in `docs/mvp/runs/442.md`; S9 is not run by the Worker. Migration 0008 must run on
  Atlas after 0007 (both reshape `menuEvents`).
- Triggers on entering "הזמנות" / "פוסט-פרודקשן" (open supplier orders, closing dialog) are client behavior in
  plans 443/446; `POST /:id/finish`, `/reopen`, `/closing`, `/refresh-plan` are plan 446.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
shared/schemas/entities/event-stage.ts
shared/schemas/entities/menu-event.schema.ts
shared/schemas/entities/index.ts
src/app/core/models/menu-event.model.ts
server/utils/event-stage.js
server/routes/events.js
server/routes/generic.js
server/app.js
server/migrations/0008-event-stages.js
server/test/event-stage.test.js
server/test/events-router.test.js
server/test/event-stage-schema.test.js
server/test/migration-0008-event-stages.test.js
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

- INV-4: preserves — every new event field (stage, history, notes, customer, deposit, legacy) is in the one Zod
  schema; the events router validates the merged document with `checkStoredDoc` before every write, like the
  generic router.
- INV-1: preserves — (rule as rewritten by plan 424 / ADR 0023) the events router reads only inside the caller's
  business (`scopeFilter(req)`) and authorizes through the central checker (`assertCan` — `changeStage`,
  `addNote`); the note-author rule is an extra check on top. `generic.js` only strips server-owned event fields.
- INV-2: preserves — (rule as rewritten by plan 424 / ADR 0023) no change to master data, cloning or per-business
  copies; migration 0008 only adds fields to each business's own events (and to master events, so a clone carries
  a valid stage).
- INV-3: preserves — a stage move (history entry + `closedAt` + `notClosed*`) and every note change are one server
  write each (`findOneAndUpdate` / `$push` / `$pull`); the client never writes them.

## Step 0 — Reality Check

Runs always (plans 425, 427, 440, 441 change these files). Check by symbol, `ok` / `conflict: <what>`:
`scopeFilter`, `MASTER_BUSINESS_ID` in `server/utils/business-scope.js`; `assertCan`, `can` and the
`changeStage` / `addNote` rules in `server/utils/permissions.js`; `verifyToken` and `req.user` fields
(`userId`, `name`, `businessId`, `businessRole`) in `server/middleware/auth.js`; `checkStoredDoc` in
`server/middleware/validate.js`; `router.post('/:type'`, `router.put('/:type/:id'` and its `updatable` build in
`generic.js`; whether `appendExisting` still posts menu events with a client `_id`; `menuEventSchema` in
`menu-event.schema.ts` (after 440's snapshot fields); `MenuEvent` in `menu-event.model.ts`; route mounts in
`server/app.js`; `newId` in `server/utils/id.js`; `parseArgs` / `connect` / `checkBackup`. STOP only on a
`conflict`.

## User Stories
- As a chef, I want every event to show where it stands (inquiry, quote sent, deposit paid …) so that I know
  which deals need a call.
- As a chef, I want each stage move recorded with who and when so that I can trust the history.
- As a chef, I want to log a note on an event at any stage so that what the client said is never lost.
- As a chef, I want my old events marked "ישן" and left out of the numbers so that the dashboard starts clean.

## Functional Requirements

### Must Have (P0)
- [ ] `EVENT_STAGES`, `NOT_CLOSED_REASONS`, `EVENT_SERVER_FIELDS` in `shared/schemas/entities/event-stage.ts`.
- [ ] Event schema fields per C-STAGES, plus `clientName?`, `clientPhone?`, `deposit?`.
- [ ] `PUT /api/v1/events/:id/stage` with every rule above; `POST/PUT/DELETE …/notes` with the author rule.
- [ ] Generic POST stamps `stage: 'inquiry'` + first history entry + `notes: []`; generic POST/PUT strip
  `EVENT_SERVER_FIELDS` from the body for `menuEvents`.
- [ ] Migration 0008 (dry run / write / verify / scratch / host confirm), idempotent, rollback note.

### Should Have (P1)
- none

### Nice to Have (P2)
- none

## UI/UX Notes
- No screen in this plan (plan 443). Error codes the UI will map: `DATE_REQUIRED`, `REASON_REQUIRED`,
  `NOT_CLOSED_FROM_STAGE`, `USE_FINISH`, `EVENT_FINISHED`, `NOTE_EMPTY`, `NOTE_TOO_LONG`, and C-PERM's
  `FORBIDDEN` / `no_permission`. No dictionary keys here; plan 443 adds the Hebrew texts.

## Contracts used (verbatim from the approved MVP map)

**C-STAGES (442; consumed by 443, 446, 447, 448)**
- Stage keys: `inquiry`, `quote_sent`, `deposit_paid`, `ordering`, `execution`, `post_production`, `finished`, `not_closed`. Order array `EVENT_STAGES` in `shared/schemas/entities/event-stage.ts`.
- Event fields: `stage`, `stageHistory: { stage, at, by, byName, reason?, reasonText? }[]`, `closedAt?` (first transition to deposit_paid or later; never changes), `notClosedAt?`, `notClosedReason?: 'price' | 'date_taken' | 'no_reply' | 'other'`, `notClosedText?`, `legacy?: boolean` ("ישן"), `notes: { _id, text /* ≤ 2000 */, at, by, byName, editedAt? }[]`, `clientName?`, `clientPhone?`, `deposit?: { amount?, date? }`.
- "Closed" = `closedAt` set. Active = stage not in {finished, not_closed}.
- Dedicated router `server/routes/events.js` at `/api/v1/events`: `PUT /:id/stage` `{ stage, reason?, reasonText? }`, `POST /:id/notes`, `PUT /:id/notes/:noteId`, `DELETE /:id/notes/:noteId`, (446) `PUT /:id/closing`, `POST /:id/finish`, `POST /:id/reopen`, `POST /:id/refresh-plan`. Stage history/notes are written only by the server (generic PUT strips them).

**C-PERM (427; client mirror 428)**
- `server/utils/permissions.js`: `can(user, action, { type, doc?, patch? }) → { ok: true } | { ok: false, reason }` and `assertCan(req, res, action, ctx)` → sends 403 `{ error: 'FORBIDDEN', messageKey: 'no_permission' }` (Hebrew "אין לך הרשאה לפעולה הזו").
- Actions: `create`, `edit`, `delete`, `editMoney`, `changeStage`, `addNote`, `markArrival`, `manageTeam`, `editSettings`, `editTaxonomy`.
- Rules: owner → all in own business. Staff → create all entity types; edit/delete only `doc.createdBy === user.userId`; `editMoney`, `manageTeam`, `editSettings`, `editTaxonomy` (eventType, menuType, station) never; `changeStage` only on events they created; `addNote`, `markArrival` on any event. A staff-created product is saved with money fields stripped.
- Money fields: `shared/schemas/money-fields.ts` exports `MONEY_FIELDS: Record<type, string[]>` — products: `sources[].price`, `purchaseOptions[].priceOverride`; menuEvents: `pricePerGuest`, `extraCosts`, `targetsOverride`, `deposit`, `closing.suppliers[].actualPaid`, `closing.actualExtraCosts`, `closing.actualRevenue`; businesses: `settings`, `baseline`. Later plans that add a money field append it here.
- Client: `src/app/core/services/permission.service.ts` `can(action, ctx): boolean` (computed from user signal); UI hides/locks by the same rules; server decides.
- Before 427 merges: every signed-in user counts as owner.

**C-SCOPE (424/425)**
- Every business doc gets `businessId: string` and `createdBy: string` in `baseDocShape`. Master docs: `businessId: '__master__'`. Migration 0006 sets `createdBy = userId` and `businessId` = the user's business (master: `'__master__'`). Plan 425 stops using `userId` for scoping; the stored `userId` stays (optional in schema, never read for scope).
- `server/utils/business-scope.js` exports `MASTER_BUSINESS_ID = '__master__'`, `scopeFilter(req)` → `{ businessId: req.user.businessId }`, `readScope(req, type)` → taxonomy: `{ businessId: { $in: [bid, '__master__'] } }`, others `scopeFilter(req)`; anonymous → `{ businessId: '__master__' }`; `stampNew(req, doc)` → sets `businessId`, `createdBy = req.user.userId`, `createdAt`.
- Indexes re-led by `businessId` (taxonomy unique `{kind, key, businessId}`).

**C-USER (excerpt)**
- JWT access payload: `{ userId, name, businessId, businessRole, isPlatformAdmin }` (15m). Refresh unchanged `{ userId }`.

## Design

### `shared/schemas/entities/event-stage.ts`
```ts
export const EVENT_STAGES = ['inquiry', 'quote_sent', 'deposit_paid', 'ordering', 'execution', 'post_production', 'finished', 'not_closed'] as const
export type EventStage = (typeof EVENT_STAGES)[number]
export const NOT_CLOSED_REASONS = ['price', 'date_taken', 'no_reply', 'other'] as const
export const NOT_CLOSED_FROM: readonly EventStage[] = ['inquiry', 'quote_sent']
export const CLOSED_FROM_INDEX = EVENT_STAGES.indexOf('deposit_paid')   // stages at or after this index (except not_closed) close the deal
export const NOTE_MAX_LENGTH = 2000
export const EVENT_SERVER_FIELDS = ['stage', 'stageHistory', 'closedAt', 'notClosedAt', 'notClosedReason', 'notClosedText', 'notes', 'legacy'] as const
```
Re-exported from `shared/schemas/entities/index.ts` (server reads the generated `server/generated/schemas/entities/event-stage.js`).

### Schema additions (`menu-event.schema.ts`)
`stage: z.enum(EVENT_STAGES).optional()` (optional only so events not yet migrated still validate; every new
event gets one from the server), `stageHistory: z.array(z.strictObject({ stage: z.enum(EVENT_STAGES), at: z.number(), by: z.string(), byName: z.string(), reason: z.enum(NOT_CLOSED_REASONS).optional(), reasonText: z.string().max(NOTE_MAX_LENGTH).optional() })).optional()`,
`closedAt`, `notClosedAt` (`z.number().optional()`), `notClosedReason`, `notClosedText`, `legacy: z.boolean().optional()`,
`notes: z.array(z.strictObject({ _id: z.string(), text: z.string().min(1).max(NOTE_MAX_LENGTH), at: z.number(), by: z.string(), byName: z.string(), editedAt: z.number().optional() })).optional()`,
`clientName: nameField.optional()`, `clientPhone: z.string().max(30).optional()`,
`deposit: z.strictObject({ amount: z.number().min(0).optional(), date: z.string().optional() }).optional()`
(`deposit` is already listed in C-PERM `MONEY_FIELDS.menuEvents`). Client `menu-event.model.ts` mirrors all of it.

### `server/utils/event-stage.js` (pure, tested)
- `applyStageChange(event, { stage, reason, reasonText }, actor: { userId, name }, now)` →
  `{ ok: true, set, push } | { ok: false, status, error }`. Order of checks: unknown stage → 400 `BAD_STAGE`;
  `event.stage === 'finished'` → 409 `EVENT_FINISHED`; `stage === 'finished'` → 400 `USE_FINISH`;
  same stage → ok with empty `set`/`push`; `not_closed` and current stage not in `NOT_CLOSED_FROM` → 400
  `NOT_CLOSED_FROM_STAGE`; `not_closed` without a valid reason → 400 `REASON_REQUIRED`; target index ≥
  `CLOSED_FROM_INDEX` (not `not_closed`) and no `eventDate` → 400 `DATE_REQUIRED`. Then `set = { stage }`,
  `closedAt: now` only if not set and target closes, `notClosedAt/notClosedReason/notClosedText` when target is
  `not_closed`; `push = { stage, at: now, by, byName, reason?, reasonText? }`. A missing current stage counts as
  `inquiry`.
- `newNote(text, actor, now, id)` → `{ ok, note } | { ok: false, status: 400, error: 'NOTE_EMPTY' | 'NOTE_TOO_LONG' }` (trims).

### `server/routes/events.js` (mounted `app.use('/api/v1/events', eventsRouter)` next to the data router)
- Every route: `verifyToken`; load `col('menuEvents').findOne({ _id: req.params.id, ...scopeFilter(req), deletedAt: { $exists: false } })` → 404 when missing.
- `PUT /:id/stage`: `assertCan(req, res, 'changeStage', { type: 'menuEvents', doc })` → `applyStageChange` →
  `findOneAndUpdate(filter, { $set: { ...set, updatedAt }, $push: { stageHistory: push } })` → 200 with the event.
- `POST /:id/notes`: `assertCan(…, 'addNote', …)` → `newNote` → `$push: { notes }` → 201 with the event.
- `PUT /:id/notes/:noteId`: note must exist (404) and `note.by === req.user.userId` (else 403 with the C-PERM body)
  → `$set: { 'notes.$[n].text', 'notes.$[n].editedAt' }` with `arrayFilters: [{ 'n._id': noteId }]`.
- `DELETE /:id/notes/:noteId`: same author check → `$pull: { notes: { _id: noteId } }`.
- Same write rate limit as the data router (`express-rate-limit`, 15 min window, `DATA_WRITE_LIMIT_MAX`, `0` = off).
- Logging: `req.log.info({ event: 'events.stage.changed', from, to })`; failures `events.*.failed` with `{ err }`.

### `server/routes/generic.js`
- `POST /:type` with `menuEvents`: drop `EVENT_SERVER_FIELDS` from the body, then set `stage: 'inquiry'`,
  `stageHistory: [{ stage: 'inquiry', at: now, by: req.user.userId, byName: req.user.name }]`, `notes: []`.
- `PUT /:type/:id` with `menuEvents`: drop `EVENT_SERVER_FIELDS` from `updatable` (the stored values survive the merge).

### Migration `server/migrations/0008-event-stages.js`
- Pure: `todayInJerusalem(now)` → `'YYYY-MM-DD'` (`Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' })`);
  `legacyStage(event, today)` → `'finished'` when `eventDate` (first 10 chars) `< today`, else `'quote_sent'`;
  `eventPatch(event, today)` → `null` when `stage` exists, else `{ $set: { stage, legacy: true, stageHistory: [], notes: event.notes ?? [] } }`.
- All `menuEvents` docs (every business, master, and trashed) without `stage`. Modes as 0007: dry run (counts per
  target stage and per business), `--write=yes` + `--backup-dir` (or `--db` scratch), `--verify=yes` (0 events
  without `stage`), Atlas `--confirm-host`. Idempotent (`stage: { $exists: false }`).
- **Rollback:** `updateMany({ legacy: true, stageHistory: { $size: 0 } }, { $unset: { stage: '', legacy: '', stageHistory: '', notes: '' } })`
  restores the pre-migration shape for legacy events nobody has moved yet; otherwise restore `menuEvents` from the
  `--backup-dir` snapshot. Code before this plan ignores the fields.

## Atomic Sub-tasks
- [ ] S1: Define the event stages and the server-owned event fields once, for client and server — EVENT_STAGES, NOT_CLOSED_REASONS, NOT_CLOSED_FROM, CLOSED_FROM_INDEX, NOTE_MAX_LENGTH, EVENT_SERVER_FIELDS; re-export from the entities index — shared/schemas/entities/event-stage.ts, shared/schemas/entities/index.ts
- [ ] S2: Add stage, history, notes, customer and deposit fields to the event schema and model — per Design; npm run build:schemas; schema tests — shared/schemas/entities/menu-event.schema.ts, src/app/core/models/menu-event.model.ts, server/test/event-stage-schema.test.js
- [ ] S3: Encode every stage-move and note rule in pure functions — applyStageChange, newNote per Design; tests for every case in Done-when — server/utils/event-stage.js, server/test/event-stage.test.js
- [ ] S4: Serve stage moves and notes from a dedicated events router — routes per Design with scopeFilter, assertCan, author check, rate limit, logging; mount at /api/v1/events; router tests — server/routes/events.js, server/app.js, server/test/events-router.test.js
- [ ] S5: Keep stages and notes server-only in the generic data API — POST stamps inquiry + first history + empty notes; POST and PUT drop EVENT_SERVER_FIELDS for menuEvents; tests in events-router.test.js — server/routes/generic.js
- [ ] S6: Write migration 0008 that gives every existing event a stage and marks it old — pure functions, plan / write / verify / main, modes per Design; vitest incl. second run = 0 — server/migrations/0008-event-stages.js, server/test/migration-0008-event-stages.test.js
- [ ] S7: Document the events endpoints for the next plans — add the /api/v1/events rows and why a dedicated router (server-owned history) to §5 — docs/agent/standards-backend.md
- [ ] S8: Rehearse migration 0008 locally and on an Atlas copy, then hand Dandan the Atlas dry run — slot DB dry → write → dry (0) → verify; restored copy foodvibe_scratch_0008 same; Atlas dry run with --confirm-host; counts into session state; STOP for `go 0008` — this plan file, docs/session-state-<branch>.md
- [ ] S9: After Dandan's go, write Atlas and verify — fresh atlas backup (< 24 h) → --write=yes --backup-dir → --verify=yes exit 0 — this plan file
- [ ] S10: Build, run server tests, check the error log — ng build, npm --prefix server test, log-query — this plan file

## Technical Considerations
- Dependencies: `scopeFilter` (425), `assertCan` (427), `verifyToken`, `checkStoredDoc`, `newId`,
  `express-rate-limit`, `parseArgs` / `connect` / `checkBackup`, `db-backup.js` / `db-restore.js`.
- New files needed: `event-stage.ts`, `server/utils/event-stage.js`, `server/routes/events.js`, migration 0008,
  four test files.
- Model changes: per Design (schema + client model).
- Backend / API: new dedicated router `/api/v1/events` — justified because stage history, `closedAt` and notes
  must be written only by the server with the actor stamped from the token (the generic API would let a client
  rewrite history).
- Auth and validation: JWT on every route; business scope on every read/write; C-PERM `changeStage` / `addNote`;
  note author check; stage rules in `applyStageChange`; Zod check of the merged document before each write.
- Security surface: new write endpoints (rate-limited); note text is stored as plain text (the client renders it
  as text, never HTML); `byName` comes from the token, never from the body.
- Data / migration: 0008 as designed; `Isolated DB: yes`.
- Project checks: log-query Done-when present; chef stories; no dictionary keys / icons / CSS in this plan.

## Backend Impact
- Collections affected: `menuEvents` (new fields; migration 0008).
- New collections: no.
- Server changes needed: yes — new `server/routes/events.js` + `server/utils/event-stage.js`, `generic.js`
  stamping/stripping, `app.js` mount, migration 0008.

## Out of Scope
- All screens: "פנייה חדשה" form, stage bar, notes panel, library stage chip/filter, customer fields (plan 443).
- `PUT /:id/closing`, `POST /:id/finish`, `/reopen`, `/refresh-plan`, the planning snapshot (plan 446).
- Supplier-orders and closing-dialog triggers (plans 443/446).
- Push-to-master of an event's notes/history (events are not pushed to master in the MVP flows).
- Bot, lead intake, reminders, call recording, a separate customer entity.

## Critical Questions
none
