# Plan 551 — Client profile with one timeline of requests, bookings and events, and merging duplicates

Status: draft
Depends-on: 550, 547
Snapshot: 05741afd08ec936d1aec6f8d9a53631141905f93

## Problem Statement
Front Desk map row 9 (FD-02). After plans 547–550 a business has a client list, requests and bookings, but no page that
shows everything about one customer, and no way to join two records of the same person. This plan adds
`/clients/:id`: a header with call and WhatsApp buttons, details the owner can edit, and one timeline of the client's
requests, bookings and events. It also adds a dedicated server router for the two client actions that the generic API
must not do: merging a duplicate into another client (one request, INV-3) and setting do-not-contact (rule R-02).

Verified on `origin/main` (5702f6d1, 2026-11-10):
- No `/clients/:id` route, no `src/app/pages/clients/components/client-profile/`, no `server/routes/clients.js`. `server/app.js` mounts routers at lines 197–204 (`/api/v1/events` is the pattern for a dedicated router with its own `verifyToken` + `dataWriteLimiter`, `server/routes/events.js:25–31`).
- Trash restore is shared: `PUT /:type/:id/restore` (`server/routes/generic.js:410`) has one per-type check today (products, plan 485 → 409 `PRODUCT_NAME_TAKEN`); `PUT /:type/trash/restore-all` (`generic.js:379`) has a products-only skip path. Plan 545 adds the client `PHONE_TAKEN` check in the same place.
- `menuEvents` carry `clientId` + snapshot `clientName` / `clientPhone`, `stage`, `eventDate`, and server-owned `notes[] { _id, text, at, by, byName, editedAt? }` (`shared/schemas/entities/menu-event.schema.ts:135`). The event screen is `/menu-intelligence/:id`.
- `clients.notes` is one owner-only text, `max(2000)` (`shared/schemas/entities/client.schema.ts:21`). `ClientDataService.updateClient()` exists.
- Resolvers exist for clients and menu events (`src/app/core/resolvers/clients-ensure-loaded.resolver.ts`, `menu-events-ensure-loaded.resolver.ts`).
- After the plans this depends on: `Client` gains `kinds`, `tags`, `counters`, `firstSeenAt`, `lastContactAt`, `mergedInto`, `doNotContact`, `phoneKey`, clients are soft-deleted (544); `requests` and `bookings` collections with `clientId`, `RequestDataService`, `BookingDataService` and the `manageRequests` action exist (549); `app-client-picker`, `app-client-form` and the shared `NewInquiryDialogComponent` exist (546); `/clients` list exists (547).

## Goals & Success Criteria
**Primary:** an owner opens any client and sees, newest first, every request, booking and event of that customer; the
owner merges a duplicate into the right record in one action and nothing points at the old record afterwards.

- [auto] `pnpm run test:server` passes, including `server/test/clients-router.test.js`:
  - merge A into B re-keys `clientId` on `menuEvents`, `requests` and `bookings` of the caller's business, in one request; another business's docs with the same `clientId` value are untouched; a `conversations` collection that does not exist is a no-op;
  - after merge, A has `mergedInto: B._id` and `deletedAt`; B's `counters` are the sums, `kinds` and `tags` the unions (≤ 3, ≤ 12), `firstSeenAt` the earlier, `lastContactAt` the later; `liveKey` is unset on A (plan 545, Q1 = a), so B keeps the one live slot for the phone;
  - staff merge → 403 and nothing changes; A = B → 400 `SAME_CLIENT`; A already merged → 409 `ALREADY_MERGED`; B in Trash or merged → 409 `TARGET_NOT_LIVE`; an id of another business → 404;
  - `PUT /:id/do-not-contact` `{ on: true, reason }` by staff sets `doNotContact { at, reason, via: 'member' }`; `{ on: false }` by staff → 403, by the owner clears it; a generic `PUT /api/v1/data/clients/:id` with `doNotContact` still changes nothing;
  - `PUT /api/v1/data/clients/:id/restore` of a merged client → 409 `CLIENT_MERGED`; `restore-all` leaves it in Trash and counts it in `skipped`.
- [auto] `pnpm run test:ci` passes, including `src/app/pages/clients/components/client-profile/client-profile.component.spec.ts` (timeline order and item kinds; staff see no notes, consent or e-mail and no edit / merge / do-not-contact-clear controls; merge target picker excludes the client itself; `tel:` and `https://wa.me/` links are built from `phoneNormalized`, with a `0` prefix turned into `972`).
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/551-client-profile-timeline-and-merge.plan.md` exits 0.
- [auto] `pnpm --dir server run lint`, `pnpm run build`, `pnpm run lint`, `pnpm run lint:icons`, `node scripts/reuse-lint.mjs --diff=origin/main` exit 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] Create a QA event for a new QA client through the API, open `/clients`, click that client's row → `/clients/<id>` shows the event's name in the timeline (`e2e/ui/551-1.spec.ts`).
- [ui] On `/menu-intelligence/<id>` of that event, the stage bar's client chip opens `/clients/<clientId>` (`e2e/ui/551-2.spec.ts`).
- [human] Dandan merges two test clients on the profile and judges the confirm text and the result screen clear.

## Execution Mode
- Parallel: no — edits `server/routes/generic.js` after 544/545 (map must-not-run list) and appends to `app.routes.ts`, `dictionary.json`, `app.config.ts` like plans 552–557.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/routes/clients.js
server/app.js
server/routes/generic.js
server/test/clients-router.test.js
src/app/pages/clients/**
src/app/shared/client-form/**
src/app/shared/client-picker/**
src/app/shared/new-inquiry-dialog/**
src/app/pages/menu-intelligence/components/event-stage-bar/event-stage-bar.component.html
src/app/pages/menu-intelligence/components/event-stage-bar/event-stage-bar.component.ts
src/app/pages/menu-intelligence/components/event-stage-bar/event-stage-bar.component.spec.ts
src/app/pages/trash/**
src/app/core/services/client-data.service.ts
src/app/core/services/client-data.service.spec.ts
src/app/app.config.ts
public/assets/data/dictionary.json
docs/brain/invariants.md
docs/agent/standards-backend.md
server/breadcrumbs.md
docs/brain/component-families.md
e2e/ui/551-1.spec.ts
e2e/ui/551-2.spec.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — `server/routes/clients.js` authorises every write with `assertCan` (merge needs the owner: `clients` is in `OWNER_ONLY_TYPES`, D2; do-not-contact on uses `manageRequests`, off needs the owner); it joins INV-1's Touches list (map delta 8). Stamps take the actor from `actorOf(req)` (C-ACTOR).
- INV-2: preserves — every query in the merge and the restore check is scoped with `scopeFilter(req)` / `businessId`.
- INV-3: preserves — the merge re-keys every collection and stamps both clients on the server in one request; the client sends one call.

## Reuse Check

- `ClientProfileComponent` (`src/app/pages/clients/components/client-profile/`) — family: none — rung: 4 — why: the first entity profile page with a mixed timeline; built from `app-page-header`, `app-empty-state`, `.c-chip--tag` and `app-modal-shell` (rung 1 each).
- Timeline rows — family: chip — rung: 1 — why: each row is a list item with a `.c-chip--tag` kind label (request / booking / event) and its status; no new chip.
- Edit client details — family: form-field — rung: 3 — why: `app-client-form` (plan 546) gains an optional `client = input<Client | null>(null)`; with a client it pre-fills and saves through `ClientDataService.updateClient()` instead of `addClient()`.
- Tags editor — family: multi-pick — rung: 1 — why: `app-custom-multi-select` with `allowTypedAdd`, options = reserved tags + tags in use.
- Merge target picker — family: search-combobox — rung: 3 — why: `app-client-picker` (client-picker family, created by plan 546 on search-combobox) inside `app-modal-shell`, with two new inputs `allowAdd` and `exclude` (see P0).
- Merge confirm — family: modal-controller — rung: 1 — why: `ConfirmModalService.open('client_merge_confirm', …)`.
- New event inquiry from the profile — family: modal-shell — rung: 3 — why: the shared `NewInquiryDialogComponent` gains `initialClient = input<Client | null>(null)` to open with the client already picked.
- `server/routes/clients.js` — family: none — rung: 4 — why: dedicated router like `events.js`, because `mergedInto`, `doNotContact` and the re-key are server-owned.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As an owner, I want to see a customer's whole history on one screen so that I know who I am talking to before I answer.
- As a host, I want to call or WhatsApp the customer with one tap from the profile so that I do not copy numbers.
- As an owner, I want to join two records of the same person so that their events and requests are counted together.
- As a host, I want to mark a customer who asked not to be contacted so that nobody messages them again.

## Functional Requirements

### Must Have (P0)
- [ ] Behaviour rule implemented (quoted from `docs/frontdesk/assistant-behaviour-rules.md`): **R-02** "Do-not-contact is a server flag, set by a dedicated route or by the assistant's removal intent, and checked before every outbound message. 'Not now' / 'call me next month' is not a removal request." This plan adds the dedicated member route; the send guard is plan 560, the assistant intent plan 562.
- [ ] Server router `server/routes/clients.js` mounted at `/api/v1/clients` in `server/app.js` beside the other routers (after `express.json`), `router.use(verifyToken)`, `router.use(dataWriteLimiter)`; stamps through `actorOf(req)`; errors with the `fail(res, status, code)` pattern of `events.js`.
  - `POST /:id/merge` body `{ intoId: string }`. Loads A (`:id`) and B (`intoId`) with `scopeFilter(req)`; missing → 404. `assertCan(req.user, 'edit', { type: 'clients', doc })` for both (owner-only, D2). A = B → 400 `SAME_CLIENT`; A has `mergedInto` or `deletedAt` → 409 `ALREADY_MERGED`; B has `mergedInto` or `deletedAt` → 409 `TARGET_NOT_LIVE`. Then, in this order: `updateMany({ businessId, clientId: A }, { $set: { clientId: B, updatedAt: now } })` on `menuEvents`, `requests`, `bookings`, `conversations` (snapshot fields `clientName`/`clientPhone`/`guestName`/`guestPhone` stay as they were: they are history); update B (`counters` summed per key, `kinds` union capped at 3, `tags` union capped at 12 keeping B's first, `firstSeenAt` min, `lastContactAt` max, `notes`: B's, and when A has notes and B's notes do not contain them, B's + blank line + A's, cut to 2000; `updatedAt`); stamp A `{ mergedInto: B, deletedAt: now, deletedBy: actorOf(req).userId, updatedAt: now }` with a conditional filter `{ mergedInto: { $exists: false } }` (a lost race → 409 `ALREADY_MERGED`). Re-keying first makes a retry after a crash safe. Response `{ ok: true, client: B, moved: { menuEvents, requests, bookings, conversations } }`. Log `clients.merged` with business id, both ids and the counts (no names, no phones).
  - `PUT /:id/do-not-contact` body `{ on: boolean, reason?: string }` (reason trimmed, ≤ 200, required when `on`: 400 `REASON_REQUIRED`). `on: true` → `assertCan(req.user, 'manageRequests', …)` (any member) and `$set: { doNotContact: { at: now, reason, via: 'member' } }`. `on: false` → owner only (`assertCan(req.user, 'edit', { type: 'clients', doc })`) and `$unset: { doNotContact: '' }`. Returns the client (staff get the trimmed fields, `STAFF_READ_FIELDS`). Log `clients.do_not_contact` with user id and on/off (no reason text, no phone).
- [ ] `server/routes/generic.js` restore: for `clients`, a doc with `mergedInto` → 409 `{ error: 'CLIENT_MERGED', mergedInto }` before plan 545's `PHONE_TAKEN` check; `restore-all` skips merged clients and adds them to `skipped`.
- [ ] `docs/brain/invariants.md` INV-1 Touches gains `` `server/routes/clients.js` ``. `docs/agent/standards-backend.md` §5 gains the two rows (method, path, auth, plan 551, errors). `server/breadcrumbs.md` gains `routes/clients.js`.
- [ ] `ClientDataService` gains `mergeClient(id, intoId)` (POST, then removes A from and replaces B in the local list, and reloads `MenuEventDataService` / `RequestDataService` / `BookingDataService` so their `clientId`s are fresh) and `setDoNotContact(id, on, reason?)`.
- [ ] Route (append to `src/app/app.routes.ts`): `{ path: 'clients/:id', loadComponent: () => import('./pages/clients/components/client-profile/client-profile.component').then(m => m.ClientProfileComponent), canActivate: [authGuard], canDeactivate: [pendingChangesGuard], resolve: { clientsLoaded: clientsEnsureLoadedResolver, menuEventsLoaded: menuEventsEnsureLoadedResolver } }`; requests and bookings load in the component with their services' `ensureLoaded()`. `GROUP_BY_PATH_PREFIX` already maps `/clients` (547).
- [ ] Profile header: name; phone (`dir="ltr"`) with a call button (`tel:+<digits>`, icon `phone`) and a WhatsApp button (`https://wa.me/<digits>`, icon `message-circle`, opens a new tab), where `<digits>` = `phoneNormalized` with a leading `0` replaced by `972`; kinds and tags chips (reserved tags coloured as in 547); a `do-not-contact` red tag when set, with its reason and date for the owner. An unknown id or a merged client → `app-empty-state` `client_not_found` with a link back to `/clients` (a merged client's state also offers "go to the merged client" → `/clients/<mergedInto>`).
- [ ] Owner details card: client type, company, e-mail, source, notes, tags, first seen. "עריכה" (icon `pencil`) opens `app-modal-shell` with `app-client-form` in edit mode; tags edit inline with `app-custom-multi-select` (saved through `updateClient`). Staff see none of these fields (the server does not send them).
- [ ] Timeline (newest first, one list): requests (`RequestDataService`, `clientId` match: kind label, status chip, wanted date, created date → no link until plan 552 builds `/requests`), bookings (`BookingDataService`: kind, date + time, party, status chip), events (`MenuEventDataService`: event name, stage label via `stageLabelKey`, event date, link to `/menu-intelligence/<id>`), and event notes per Critical Question Q1. Sort key: `createdAt` for requests and bookings, `createdAt` for events, `at` for notes. Empty → `client_timeline_empty`.
- [ ] Actions: "פנייה חדשה" (any member who may create events) opens the shared `NewInquiryDialogComponent` with `initialClient` set; on `saved` the new event appears at the top of the timeline. "מיזוג לקוח כפול" (owner, icon `git-merge`) opens a window with `app-client-picker` (no add row in this use: the picker gets `[allowAdd]="false"` — a small contract extension, see Execution Notes) listing live clients except this one; after a pick → `ConfirmModalService.open('client_merge_confirm', { saveLabel: 'client_merge' })` → `mergeClient(this, picked)`; on success navigate to `/clients/<picked>` and toast `client_merged`. "לא ליצור קשר" (any member, icon `ban`) asks for the reason in a small window (≤ 200 chars) and calls `setDoNotContact(id, true, reason)`; the owner sees "בטל" to clear it.
- [ ] Rows in the `/clients` list (547) become links to `/clients/<id>`. The stage bar's client chip (546) becomes a link to `/clients/<clientId>` when the event has a `clientId` (legacy events without one keep a plain chip).
- [ ] Trash page: a restore answered with 409 `CLIENT_MERGED` shows the toast `client_merged_restore` instead of the generic error.
- [ ] Icons registered in `src/app/app.config.ts` when missing: `GitMerge`, `Ban`, `Pencil` (`Phone`, `MessageCircle` exist).
- [ ] Dictionary (append; Hebrew values): `client_profile` "כרטיס לקוח", `client_call` "התקשרות", `client_whatsapp` "וואטסאפ", `client_edit` "עריכה", `client_first_seen` "לקוח מאז", `client_timeline` "היסטוריה", `client_timeline_empty` "עדיין אין פעילות ללקוח הזה", `client_timeline_request` "בקשה", `client_timeline_booking` "הזמנה", `client_timeline_event` "אירוע", `client_timeline_note` "הערה", `client_not_found` "הלקוח לא נמצא", `client_go_to_merged` "ללקוח שאליו מוזג", `client_merge` "מיזוג לקוח כפול", `client_merge_pick` "עם איזה לקוח למזג?", `client_merge_confirm` "כל האירועים, הבקשות וההזמנות של הלקוח יעברו ללקוח שבחרת, והלקוח הזה יעבור לסל המחזור. להמשיך?", `client_merged` "הלקוחות מוזגו", `client_merged_restore` "הלקוח הזה מוזג ללקוח אחר ולא ניתן לשחזר אותו", `client_do_not_contact` "לא ליצור קשר", `client_do_not_contact_reason` "סיבה", `client_do_not_contact_clear` "בטל", `client_do_not_contact_set` "סומן: לא ליצור קשר".

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- RTL; logical properties only. Phone layout: header, then actions in one row of buttons, then the timeline; the owner details card collapses under a `c-chip c-chip--tap` "פרטי לקוח" (`client_details`, exists) toggle on a phone.
- Escape: closes the top window only (edit, merge picker, confirm, do-not-contact reason), one step back each (plan 515 lesson).
- Icons: `phone`, `message-circle` (registered), `git-merge`, `ban`, `pencil` (register if missing).

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Add a server router for merging duplicates and for do-not-contact — merge in one request with the re-key order, counters and unions, conditional stamp; do-not-contact on/off rules; mount; tests — server/routes/clients.js, server/app.js, server/test/clients-router.test.js
- [ ] A2: Refuse to bring a merged client back from Trash — restore 409 CLIENT_MERGED and restore-all skip; tests; Trash page toast — server/routes/generic.js, server/test/clients-router.test.js, src/app/pages/trash/**
- [ ] A3: Record the new router in the rules and docs — INV-1 Touches, backend §5 rows, server breadcrumbs — docs/brain/invariants.md, docs/agent/standards-backend.md, server/breadcrumbs.md
- [ ] A4: Let the browser call merge and do-not-contact and refresh what moved — mergeClient, setDoNotContact, reloads; spec — src/app/core/services/client-data.service.ts, src/app/core/services/client-data.service.spec.ts
- [ ] A5: Build the client profile header, owner details and one-tap call and WhatsApp — route, header, details card, edit window through the shared form in edit mode, tags editor; spec — src/app/pages/clients/components/client-profile/**, src/app/shared/client-form/**
- [ ] A6: Show one timeline of the client's requests, bookings, events and notes — newest first, links to events, empty state; spec cases — src/app/pages/clients/components/client-profile/**
- [ ] A7: Add the profile actions: new inquiry, merge a duplicate, do not contact — dialog with the client picked, merge picker + confirm + navigate, reason window; spec cases — src/app/pages/clients/components/client-profile/**, src/app/shared/new-inquiry-dialog/**
- [ ] A8: Link the client list rows and the event screen's client chip to the profile — src/app/pages/clients/components/client-list/**, src/app/pages/menu-intelligence/components/event-stage-bar/event-stage-bar.component.html, src/app/pages/menu-intelligence/components/event-stage-bar/event-stage-bar.component.ts, src/app/pages/menu-intelligence/components/event-stage-bar/event-stage-bar.component.spec.ts
- [ ] A9: Register icons and words, update the family list, write the screen checks and run every check — app.config.ts, dictionary.json, component-families.md (client-picker family: edit mode, initialClient, allowAdd), e2e/ui/551-1.spec.ts, e2e/ui/551-2.spec.ts; test:server, test:ci, server lint, build, lint, lint:icons, reuse-lint, scope-check --arch, log-query

## Technical Considerations
- Dependencies: `scopeFilter`, `assertCan`, `actorOf` (543), `dataWriteLimiter`, the generic Trash routes, `ClientDataService`, `MenuEventDataService`, `RequestDataService` / `BookingDataService` (549), `app-client-picker` / `app-client-form` / `NewInquiryDialogComponent` (546), `ConfirmModalService`, `stageLabelKey`.
- New files needed: `server/routes/clients.js`, `server/test/clients-router.test.js`, `src/app/pages/clients/components/client-profile/client-profile.component.{ts,html,scss,spec.ts}`, `e2e/ui/551-1.spec.ts`, `e2e/ui/551-2.spec.ts`.
- Model changes: none (544 owns `Client`).
- Backend / API: `POST /api/v1/clients/:id/merge`, `PUT /api/v1/clients/:id/do-not-contact`; `PUT /api/v1/data/clients/:id/restore` gains 409 `CLIENT_MERGED`.
- Auth and validation: merge and clearing do-not-contact are owner-only; setting do-not-contact is any member (`manageRequests`); every id is scoped to the caller's business; `reason` ≤ 200 chars.
- Security surface: a new member router (no guest access); logs carry ids and counts only, never names, phones or the reason text.
- Data / migration: none; merge writes `mergedInto` and soft-deletes A (reversible only by a new merge the other way, not by restore, by design).
- Project checks: log-query `[auto]`; Reuse Check; dictionary keys named; icons named and registered; lazy route; breadcrumbs (server); hotspots appended only.

## Out of Scope
- A "new request" button on the profile (plan 552 owns the manual request form; it may add the entry point there).
- Conversations in the timeline (Wave 1b, plan 561); the merge already re-keys `conversations` when that collection exists.
- The outbound send guard for do-not-contact (plan 560) and the assistant's removal intent (plan 562).
- Undo of a merge.
- Deleting a client from the profile (the list or Trash flow; not asked for in FD-02).

## Critical Questions
- Q1: What does "notes" mean in the client's timeline? (a) each linked event's notes (author, date, the event's name), plus the owner's client notes shown in the details card, not in the timeline — recommended / (b) only the owner's client notes, as one item at the top / (c) both, event notes and the client notes as one timeline item. A: a (Human 2026-11-10)

## Execution Notes
- Map row 9, renumbered +2 on 2026-11-10 (old 549 → 551).
- Contract extensions (Planner records them in the map's "Contract extensions (run)"): `app-client-form` `client` input (edit mode); `NewInquiryDialogComponent` `initialClient` input; `app-client-picker` `allowAdd = input(true)` and `exclude = input<readonly string[]>([])`.
- The stage-bar chip link moved here from plan 547's card: this plan creates the page it links to.
