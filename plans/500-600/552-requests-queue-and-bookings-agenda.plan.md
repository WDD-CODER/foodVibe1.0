# Plan 552 — Requests queue and bookings agenda: where the business approves what customers ask for

Status: done
Track: design
Depends-on: 550, 547
Snapshot: 05741afd08ec936d1aec6f8d9a53631141905f93

## Problem Statement
Front Desk map row 10 (FD-03 UI). Plans 549 and 550 put requests and bookings on the server: manual create, status
moves, approve (which creates the booking or the event inquiry), decline, the day load and the decision log. A member
has no screen for any of it. "A person approves every booking" (brief Part 0, Part 2 rule 6) only works if approving
takes one look and one tap. This plan builds `/requests` (the work queue) and `/bookings` (the agenda), the manual
"בקשה חדשה" for phone calls, and the waiting-count badge.

Verified on `origin/main` (5702f6d1, 2026-11-10):
- No `src/app/pages/requests/` or `src/app/pages/bookings/`, no `/requests` or `/bookings` route.
- Client calls to a dedicated router follow `EventPipelineService` (`src/app/core/services/event-pipeline.service.ts`): `HttpClient` + a key in the one `API` map (`src/app/core/services/http-storage.adapter.ts:9`), results as `{ ok, … }` / `{ ok: false, code }`.
- Shared pieces: `app-list-shell`, `app-page-header`, `app-empty-state`, `app-modal-shell`, `ConfirmModalService`, `app-custom-select`, `app-date-field`, `app-time-field`, `app-counter`, `.c-chip` variants incl. `.c-chip__count` (`docs/brain/component-families.md`).
- Header: `src/app/core/components/header/header.component.ts` builds `navLinks_` from `NAV_LINKS`; tab chips in `tab-chips.component.ts` (`CHIPS_BY_GROUP`).
- Lucide registry (`src/app/app.config.ts`) has `Check`, `CircleX`, `HelpCircle`, `Phone`, `MessageCircle`, `Users`, `Clock`, `CircleCheck`, `CircleSlash`, `Plus`, `Pencil`, `ChevronLeft`, `ChevronRight`; it has no `ClipboardCheck`, `CalendarDays`, `UserCheck`.

From earlier plans in this program (verify in Step 0): `RequestDataService` (`createManual`, `setStatus`, `updateWanted`)
and `BookingDataService` (`setStatus`) with the `API.requests` / `API.bookings` keys (plan 549,
`src/app/core/services/`; generic writes on both types answer 405 `USE_ROUTER`; manual create answers 409
`NO_PROFILE` without a profile), request / booking types (plan 549, `shared/schemas/entities/request.schema.ts`,
`booking.schema.ts`), the approve / decline / ask routes and `GET /bookings/day` (plan 550), `app-client-picker`
(plan 546), `FrontDeskProfileDataService` (plan 548), the `frontdesk` tab group and header entry (plan 547).

## Goals & Success Criteria
**Primary:** a member sees every waiting request with what the customer wants and whether it fits, approves,
asks or declines it in one tap, and sees approved tables, tastings and consultations on the agenda.

- [auto] `pnpm run test:ci` passes, including `requests.page.spec.ts`, `request-card.component.spec.ts`, `bookings.page.spec.ts` and the data-service specs: the waiting tab holds `new`, `qualified`, `needs_info` (not `test` requests in the badge); approve without edits calls approve once; approve after changing the date calls `updateWanted` then approve; a 409 `ALREADY_DECIDED` shows `rq_already_decided` and reloads; decline sends the chosen reason; the day strip appears for `table`, `tasting`, `consultation` and not for `event`; no-show is offered only after `startAt`; the badge count equals the waiting, non-test requests.
- [auto] `pnpm run build` passes.
- [auto] `pnpm run lint`, `pnpm run lint:icons` and `pnpm run lint:no-native-select` exit 0.
- [auto] `node scripts/reuse-lint.mjs --check-registry` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] On `/requests`, a waiting table request created through the API shows its card; pressing "אישור" moves it to the tab "אושרו", and `/bookings` on that date shows the guest's name (`e2e/ui/552-1.spec.ts`).
- [ui] On `/requests`, an event request approved with "אישור" shows the link "פתיחת האירוע" and it opens `/menu-intelligence/<id>` (`e2e/ui/552-2.spec.ts`).
- [ui] On `/requests`, "דחייה" with the reason "התאריך תפוס" moves the card to "נדחו" with the text "התאריך תפוס" (`e2e/ui/552-3.spec.ts`).
- [ui] On `/requests`, "בקשה חדשה" with a client, the kind "טעימה", a date and 12 guests saves and the new card shows under "ממתינות" (`e2e/ui/552-4.spec.ts`).
- [ui] On `/bookings`, pressing "הגיעו" on a confirmed booking shows the status "הגיעו" (`e2e/ui/552-5.spec.ts`).
- [human] Dandan reads one card of each kind (event, tasting, table, consultation) on a phone and says he could decide each one without opening anything else.

## Execution Mode
- Parallel: no — appends to `src/app/app.routes.ts`, `tab-chips.component.ts`, `src/app/app.config.ts`, `dictionary.json`, `src/styles.scss` like 547, 551, 553–556 (map: serialise the merges).
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/breadcrumbs.md
src/app/shared/breadcrumbs.md
src/app/core/models/breadcrumbs.md
src/app/core/services/breadcrumbs.md
e2e/ui/552-1..5
requests.page.spec.ts
request-card.component.spec.ts
bookings.page.spec.ts
e2e/ui/552-*.spec.ts
src/app/pages/requests/**
src/app/pages/bookings/**
src/app/pages/requests/**/*.spec.ts
src/app/pages/bookings/**/*.spec.ts
src/app/pages/breadcrumbs.md
src/app/core/services/request-data.service.ts
src/app/core/services/request-data.service.spec.ts
src/app/core/services/booking-data.service.ts
src/app/core/services/booking-data.service.spec.ts
src/app/core/services/front-desk-badge.service.ts
src/app/core/services/front-desk-badge.service.spec.ts
src/app/core/utils/wa-link.util.ts
src/app/core/utils/wa-link.util.spec.ts
src/app/core/components/tab-chips/tab-chips.component.ts
src/app/core/components/tab-chips/tab-chips.component.html
src/app/core/components/tab-chips/tab-chips.component.spec.ts
src/app/core/components/header/header.component.ts
src/app/core/components/header/header.component.html
src/app/app.routes.ts
src/app/app.config.ts
public/assets/data/dictionary.json
src/styles.scss
docs/brain/component-families.md
e2e/ui/552-1.spec.ts
e2e/ui/552-2.spec.ts
e2e/ui/552-3.spec.ts
e2e/ui/552-4.spec.ts
e2e/ui/552-5.spec.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — client screens and data services only; every write goes through plan 549/550's routers, which run `assertCan('manageRequests')` and own every status move; reads stay on the generic API.

## Reuse Check

- `RequestsPage` (`src/app/pages/requests/requests.page.ts`) — family: list-page — rung: 1 — why: `app-page-header` + tabs as `.c-chip--tab` + `app-empty-state`; cards are not list rows, so `app-list-shell` is not used.
- `RequestCardComponent` (`src/app/pages/requests/components/request-card/`) — family: none — rung: 4 — why: no card shows a customer's wish with a verdict and three decisions; page-local.
- Verdict chip and reasons (fit / borderline / unfit) — family: chip — rung: 1 — why: `.c-chip--tag` tones `--green` / `--amber` / `--red`.
- Day load strip (`src/app/pages/requests/components/day-load-strip/`) — family: none — rung: 4 — why: no hour-by-hour covers bar exists; plain flex bars on tokens, page-local.
- Edit-before-approve fields (date, time, party) — family: form-field — rung: 1 — why: `app-date-field`, `app-time-field`, `app-counter` inside `app-form-field`.
- Decline dialog (reason + text) and Ask dialog (what is missing) — family: modal-shell — rung: 1 — why: `app-modal-shell` with `[hasChanges]`; reason is `app-custom-select` over `DECLINE_REASONS` (fixed list, no add option).
- New request dialog (`src/app/pages/requests/components/new-request-dialog/`) — family: modal-shell — rung: 1 — why: `app-modal-shell`; client via `app-client-picker` (owner) or name + phone fields (staff, D2); kind via `app-custom-select`; the kind's questions as `app-form-field` rows.
- `BookingsPage` + agenda rows (`src/app/pages/bookings/`) — family: list-page — rung: 1 — why: `app-page-header`, day / week switch as `.c-chip--tab`, rows grouped by time, `app-empty-state`.
- Booking status buttons — family: chip — rung: 1 — why: `.c-chip--tap` buttons; cancel asks through `ConfirmModalService`.
- Decision methods on `RequestDataService` / `BookingDataService` (`approve`, `decline`, `ask`, `day`) — family: entity-data-service — rung: 3 — why: added only if plan 550 did not add them; same `{ ok, code }` pattern as plan 549's `createManual` / `setStatus`.
- `FrontDeskBadgeService` (`src/app/core/services/front-desk-badge.service.ts`) — family: kitchen-state — rung: 4 — why: one root signal for the waiting count that header and tab chips both read; no app-wide count signal exists for a page outside the kitchen.
- `waLink` (`src/app/core/utils/wa-link.util.ts`) — family: helpers — rung: 3 — why: one pure helper for a WhatsApp link from a stored phone; plans 552 and 555 both need it.
- Waiting count on the `requests` chip and the header entry — family: chip — rung: 1 — why: `.c-chip__count` (+ `--zero` hides nothing; zero shows no count).

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

Also confirm by symbol (plans 546–550 must be merged): `RequestDataService`, `BookingDataService`, the request and
booking types and enums, the routes `POST /api/v1/requests`, `PUT /:id/status`, `PUT /:id/wanted`,
`POST /:id/approve`, `POST /:id/decline`, the "ask" route plan 550 shipped (dedicated route, or `PUT /:id/status`
with `needs_info` + note — use what exists), `PUT /api/v1/bookings/:id/status`, `GET /api/v1/bookings/day`,
`app-client-picker`'s inputs/outputs, `FrontDeskProfileDataService`, the `frontdesk` entries in
`CHIPS_BY_GROUP` and the header. A name that differs from this plan is used as merged; a missing one is a `conflict`.

## User Stories
- As an owner, I want every waiting request in one list with the reason it fits or not so that I answer the good ones first and stop wasting time on the rest.
- As an owner, I want to approve a request in one tap, after fixing the date or the party size if needed, so that the customer gets an answer while they still want it.
- As a host, I want to type a phone booking into the same queue so that requests from every channel live in one place.
- As a host, I want today's bookings as one agenda and to mark who arrived so that service runs from one screen.
- As a chef, I want an approved event request to open as an event inquiry so that the menu and the costing start from what the customer asked.

## Functional Requirements

### Must Have (P0)
- [ ] Contracts used (copied verbatim from `docs/frontdesk/frontdesk-map.md`):
  - **C-REQUEST (549, 550; used by 551, 552, 555, 556, 559, 560, 562)**
    - `REQUEST_KINDS = ['table','event','tasting','consultation']`, `REQUEST_STATUSES = ['new','qualified','needs_info','approved','declined','cancelled','expired']`, `REQUEST_CHANNELS = ['manual','public_form','whatsapp']`, `DECLINE_REASONS = ['full','out_of_area','below_minimum','date_taken','other']` in `shared/schemas/entities/request.schema.ts`.
    - `requests` fields as brief FD-03, plus `test?: boolean` (556; excluded from stats). Server-owned (`REQUEST_SERVER_FIELDS`): `status`, `statusHistory`, `qualification`, `outcome`, `publicToken`, `channel`, `suggested`, `conversationId`.
    - `bookings` (`shared/schemas/entities/booking.schema.ts`): `{ kind: 'table'|'tasting'|'consultation', status, source, date, time, startAt, endAt, durationMinutes, partySize, clientId, guestName, guestPhone, requestId?, notes?, statusHistory, publicToken }`.
      - `BOOKING_STATUSES` (Wave 1) = `['confirmed','seated','finished','no_show','cancelled']` — names taken from the reference engine so Wave 2 only *adds* `pending`, `reminded`, `guest_confirmed`. Hebrew labels stay "הגיעו" / "סיימו".
      - `BOOKING_SOURCES` = `['request','phone','walk_in','whatsapp','google','ai']`; Wave 1 writes only `request`.
      - `endAt = startAt + durationMinutes × 60000` (epoch ms; date/time stored business-local `Asia/Jerusalem`).
      - Server-owned (`BOOKING_SERVER_FIELDS`): `status`, `statusHistory`, `source`, `startAt`, `endAt`, `publicToken`.
    - Routers: `server/routes/requests.js` at `/api/v1/requests` — `POST /` (manual), `PUT /:id/status`, `PUT /:id/wanted`, `POST /:id/approve`, `POST /:id/decline` `{ reason, text? }`; `server/routes/bookings.js` at `/api/v1/bookings` — `PUT /:id/status`, `GET /day?date=YYYY-MM-DD` → `{ bookings, coversByHour }`. Reads through the generic API.
    - Booking status moves (Wave 1): `confirmed → seated → finished`; `confirmed → no_show` after `startAt`; `confirmed|seated → cancelled`; illegal → 409 `BAD_STATUS`.
    - Approve is idempotent: a decided request → 409 `ALREADY_DECIDED`. `event` → `menuEvents` via `buildNewEventDoc` (delta 6), `outcome { type: 'menuEvent', id }`; other kinds → `bookings`, `outcome { type: 'booking', id }`.
    - Action `manageRequests` (any member).
  - **C-PICKER (546; used by 547, 551, 552)** — `src/app/shared/client-picker/` → `app-client-picker`: inputs `selected = input<Client | null>()`, output `picked = output<Client>()`; search by name/phone (`matchesClientQuery`); add-option row (owner only, hidden for staff by `PermissionService`) creates through `ClientDataService.addClient()` (which goes through `upsertClientByPhone` on the server).
  - **C-NAV (547; used by 551–557, 561)** — Section name (Q9): "לקוחות והזמנות"; a request is "בקשה" ("פנייה" keeps meaning an event inquiry). Tab group `frontdesk`; chips in this order: `inbox` (1b), `requests`, `bookings`, `clients`, `knowledge`, `settings`. Path prefixes `/inbox`, `/requests`, `/bookings`, `/clients`, `/frontdesk`. Each plan appends its own chip; labels from Q9.
- [ ] **Routes** (append): `requests` → `RequestsPage`, `bookings` → `BookingsPage`, both lazy `loadComponent`, `canActivate: [authGuard]`; `requests` also `canDeactivate: [pendingChangesGuard]` (an open dialog with typed text asks before leaving). Chips appended to the `frontdesk` group in C-NAV order: `{ id: 'requests', labelKey: 'fd_chip_requests', icon: 'clipboard-check', path: '/requests' }`, `{ id: 'bookings', labelKey: 'fd_chip_bookings', icon: 'calendar-days', path: '/bookings' }`. `GROUP_BY_PATH_PREFIX` gains `['/requests', 'frontdesk']`, `['/bookings', 'frontdesk']` if plan 547 did not already add them.
- [ ] **Client calls:** the page uses plan 549's `RequestDataService.createManual` / `setStatus` / `updateWanted` and `BookingDataService.setStatus`, and the approve / decline / ask / day client methods plan 550 added. For any of `approve(id)`, `decline(id, reason, text?)`, `ask(id, note)` (on `RequestDataService`) and `day(date)` (on `BookingDataService`) that plan 550 did not add, this plan adds it there in the same `{ ok: true, … } | { ok: false, code }` pattern, writing the returned docs into the store (an approve also refreshes `bookings` or the event list it created). The services never toast; the page maps codes to keys.
- [ ] **`/requests` page:** `app-page-header` "בקשות" (`fd_chip_requests`), button "בקשה חדשה" (`rq_new`), three tabs: "ממתינות" (`rq_tab_waiting`: `new`, `qualified`, `needs_info`, oldest first), "אושרו" (`rq_tab_approved`, newest decision first, last 30 days), "נדחו" (`rq_tab_declined`: `declined`, `cancelled`, `expired`, newest first, last 30 days). The tab is kept in `?tab=`. Empty tab → `app-empty-state` (`rq_empty_waiting` "אין בקשות ממתינות", `rq_empty_approved`, `rq_empty_declined`). Requests with `test: true` show a "בדיקה" tag (`rq_test_tag`).
- [ ] **Request card** (one component, all four kinds): guest name and phone (tap-to-call `tel:` and a WhatsApp link from `waLink(phone)`), kind label (`fd_kind_*` from plan 553), channel tag (`rq_channel_manual` "טלפון / ידני", `rq_channel_public_form` "טופס באתר", `rq_channel_whatsapp` "וואטסאפ"), received time, the wanted line (date · time · party · event type · budget per guest · location — only the parts present), the qualification verdict chip (`rq_verdict_fit` "מתאים", `rq_verdict_borderline` "גבולי", `rq_verdict_unfit` "לא מתאים") with each reason translated (reasons are dictionary keys from plan 548), the answers as label: value rows, status line for `needs_info` (`rq_status_needs_info` "חסר מידע" + the ask note). Guest text is rendered as text, never as HTML.
- [ ] **Day load strip** on cards of kind `table`, `tasting`, `consultation` with a date: `day(date)` once per date shown (cached per page visit); one bar per hour from `coversByHour`, the requested hour highlighted, the total covers that day (`rq_day_load` "באותו יום: {covers} סועדים ב-{count} הזמנות"). Load failure → the strip shows `rq_day_load_failed` "לא הצלחנו לטעון את עומס היום" and the buttons still work.
- [ ] **Approve:** "אישור" (`rq_approve`). The card has "עריכה לפני אישור" (`rq_edit_before_approve`) that turns date / time / party into fields (`app-date-field`, `app-time-field`, `app-counter`); "אישור" then sends `updateWanted` first and approve second; Escape or "ביטול" (`cancel`) leaves edit mode and restores the values. While a decision runs the three buttons are disabled with `aria-busy`. Success → toast `rq_approved` "הבקשה אושרה" and the card shows the outcome link: event → "פתיחת האירוע" (`rq_open_event`) to `/menu-intelligence/<id>`; booking → "ביומן" (`rq_open_booking`) to `/bookings?date=<date>`. 409 `ALREADY_DECIDED` → toast `rq_already_decided` "הבקשה כבר טופלה" and the lists reload; other failure → toast `rq_decision_failed` "הפעולה לא נשמרה — נסו שוב" and the card stays as it was.
- [ ] **Ask:** "חסר מידע" (`rq_ask`) opens a dialog "מה חסר?" (`rq_ask_title`) with one text box (≤ 300 chars, required) and, as a convenience, the guest's call and WhatsApp links; "שמירה" sends `ask(id, note)` → the card shows `needs_info` with the note and stays under "ממתינות". Escape / backdrop with typed text asks before closing (`[hasChanges]`).
- [ ] **Decline:** "דחייה" (`rq_decline`) opens a dialog with the reason (`rq_reason_full` "אין מקום", `rq_reason_out_of_area` "מחוץ לאזור השירות", `rq_reason_below_minimum` "מתחת למינימום", `rq_reason_date_taken` "התאריך תפוס", `rq_reason_other` "אחר") and an optional text (≤ 300; required when the reason is `other`). "דחייה" sends it; the card moves to "נדחו" showing the reason.
- [ ] **New request dialog** ("בקשה חדשה", `rq_new`): kind (only the kinds enabled in the profile), client — owner: `app-client-picker`; staff: name + phone fields (D2: staff never pick or create a client directly; the server creates it through `upsertClientByPhone`) — date, time (time-bound kinds), party, budget per guest and location (event), then the kind's questions from the profile (required ones marked). "שמירה" (`save`) → `createManual(...)` (owner: `clientId`; staff: `guestName` + `guestPhone`) with `channel` set by the server to `manual`; success → toast `rq_created` "הבקשה נוספה" and the card appears under "ממתינות" with the verdict the server computed. No profile yet (or a 409 `NO_PROFILE`) → the button opens `app-empty-state` text `rq_no_profile` "צריך קודם להגדיר את דלפק הקבלה" with a link to `/frontdesk/settings` (owner) or `fd_no_profile_staff` (staff). Field errors from a 400 → `serverFieldErrors`; Escape with typed text asks first.
- [ ] **`/bookings` page:** `app-page-header` "יומן" (`fd_chip_bookings`), a date with previous / next day buttons and "היום" (`bk_today`), a day / week switch (`bk_view_day` "יום", `bk_view_week` "שבוע", kept in `?view=` and `?date=`). Day view: bookings of that date grouped by time, each row time · guest name · party · kind · status chip; week view: seven day sections (Sunday first) with the same rows. Data: `BookingDataService` list filtered by date on the client. Status buttons per C-REQUEST moves: "הגיעו" (`bk_seated`), "סיימו" (`bk_finished`), "לא הגיעו" (`bk_no_show`, shown only after `startAt`), "ביטול" (`bk_cancel`, asks `bk_cancel_confirm` "לבטל את ההזמנה?"); 409 `BAD_STATUS` → toast `bk_bad_status` "אי אפשר לשנות לסטטוס הזה" and reload. Status labels: `bk_status_confirmed` "מאושרת", `bk_status_seated` "הגיעו", `bk_status_finished` "סיימו", `bk_status_no_show` "לא הגיעו", `bk_status_cancelled` "בוטלה". Tapping a row's name opens `/clients/<clientId>` (plan 551 route; until 551 merges the name is plain text). Empty → `app-empty-state` `bk_empty_day` "אין הזמנות ביום הזה".
- [ ] **Waiting badge:** `FrontDeskBadgeService.waitingCount_` = requests with status `new | qualified | needs_info` and not `test`. It refreshes `RequestDataService` when the app regains focus (`window` `focus`, at most once per 60 s) and when `/requests` opens; no timer, no websocket (brief FD-08). It runs only while a member is signed in. The count shows as `.c-chip__count` on the `requests` chip and on the header's "לקוחות והזמנות" entry (plan 547); zero shows no number. `aria-label` on the count: `rq_waiting_count_label` "{count} בקשות ממתינות".
- [ ] **`waLink(phone, text?)`** in `src/app/core/utils/wa-link.util.ts` (new, + spec; plan 555 uses it too — whichever plan merges second reuses it as is): digits only; a leading `0` becomes `972`; a leading `972` stays; fewer than 9 digits → `null` (no link shown); `text` is URL-encoded into `?text=`. Spec vectors: `052-123 4567` → `https://wa.me/972521234567`, `+972 52 123 4567` → same, `1234567` → `null`.
- [ ] `docs/brain/component-families.md`: add `waLink` to the `helpers` family and `FrontDeskBadgeService` under a one-line note in `kitchen-state` ("app-wide count signal for the front desk badge").
- [ ] Breadcrumbs: `src/app/pages/breadcrumbs.md` gets `requests/` and `bookings/` rows.

### Should Have (P1)
- [ ] The waiting tab label shows its count (`.c-chip__count`).

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- `Track: design`: the card, the day load strip and the agenda rows are the look work. A Claude Design handoff goes through `/design-port` (ADR 0029: map each designed element to its family above). Until a handoff exists, build on the engines named in the Reuse Check.
- Phone first: one card per row; the three decision buttons in one row at the card's bottom, Approve as `.c-btn-primary`; on wide screens cards in two columns. Hebrew RTL, logical properties only; every string a `general` key with the Hebrew value given above.
- Icons: `clipboard-check` (new, register `ClipboardCheck`), `calendar-days` (new, `CalendarDays`), `user-check` (new, `UserCheck`, seated), `check`, `circle-x`, `help-circle`, `phone`, `message-circle`, `users`, `clock`, `circle-check`, `circle-slash`, `plus`, `pencil`, `chevron-left`, `chevron-right` (already registered).
- e2e: each spec signs in with `signInQa`; it creates its profile, requests and bookings through the API first (`POST /api/v1/data/frontDeskProfiles` when missing, `POST /api/v1/requests`) and cleans up what it created.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Make sure the page can call every decision route and build a WhatsApp link — add any approve, decline, ask or day method plan 550 left out, waLink with its vectors, specs — src/app/core/services/request-data.service.ts, src/app/core/services/booking-data.service.ts, src/app/core/utils/wa-link.util.ts, src/app/core/utils/wa-link.util.spec.ts
- [x] A2: Add the requests and bookings pages to the app's navigation — two lazy routes, two tab chips, three new icons, breadcrumbs — src/app/app.routes.ts, src/app/core/components/tab-chips/tab-chips.component.ts, src/app/app.config.ts, src/app/pages/breadcrumbs.md
- [x] A3: Show the waiting queue with one card per request and its fit verdict — tabs, card, verdict and reasons, answers, empty states — src/app/pages/requests/**
- [x] A4: Show how full the day already is beside time-bound requests — day load strip with its own loading and error state — src/app/pages/requests/components/day-load-strip/**
- [x] A5: Let a member approve, ask or decline, with edits before approving — edit mode, approve sequence, ask and decline dialogs, outcome links, conflict and failure handling — src/app/pages/requests/**
- [x] A6: Let a host type a phone request into the same queue — new request dialog with client picker for owners and name and phone for staff, kind questions, no-profile state — src/app/pages/requests/components/new-request-dialog/**
- [x] A7: Show approved bookings as a day and week agenda with arrival actions — date navigation, view switch, rows, status buttons, cancel confirm — src/app/pages/bookings/**
- [x] A8: Show how many requests are waiting on the navigation — badge service, focus refresh, count on the requests chip and the header entry — src/app/core/services/front-desk-badge.service.ts, src/app/core/services/front-desk-badge.service.spec.ts, src/app/core/components/tab-chips/**, src/app/core/components/header/**
- [x] A9: Add every Hebrew string and register the new pieces — dictionary keys listed above, component families note — public/assets/data/dictionary.json, docs/brain/component-families.md
- [x] A10: Write the unit specs and the five screen checks, then run the full checks — specs, e2e/ui/552-1..5, test:ci, build, lint, lint:icons, lint:no-native-select, reuse-lint --check-registry, log-query — e2e/ui/552-1.spec.ts, e2e/ui/552-2.spec.ts, e2e/ui/552-3.spec.ts, e2e/ui/552-4.spec.ts, e2e/ui/552-5.spec.ts

## Technical Considerations
- Dependencies: plans 546 (picker), 547 (nav group, header entry), 548 (profile service, kind labels), 549 (data services, types), 550 (decision routes, day load); plan 553 adds the `fd_kind_*` keys — if 552 merges first it adds them itself with the same Hebrew values (append-only, no duplicate key).
- New files needed: `src/app/pages/requests/requests.page.*`, `src/app/pages/requests/components/{request-card,day-load-strip,decline-dialog,ask-dialog,new-request-dialog}/*`, `src/app/pages/bookings/bookings.page.*`, `src/app/core/utils/wa-link.util.ts` (+ spec), `src/app/core/services/front-desk-badge.service.ts` (+ spec), five e2e specs.
- Model changes: none (types from plan 549).
- Backend / API: none — uses the routers of plans 549 and 550.
- Auth and validation: routes behind `authGuard`; the server checks `manageRequests` and every status move; the client validates the ask note, the `other` decline text and required kind questions before sending.
- Security surface: guest-entered text (names, answers, notes) is shown with interpolation only, never `[innerHTML]`; the WhatsApp link is built by `waLink` from digits only.
- Data / migration: none.
- Project checks: `[auto] log-query` present; dictionary keys named with Hebrew values; icons named and registered; Reuse Check lists every control; `lint:no-native-select` because the plan adds pickers.

## Out of Scope
- Showing AI suggestions on the card (`request.suggested`, plan 563, Wave 1b) and the inbox (561).
- Messaging the guest from the app; Ask only records what is missing and offers the call / WhatsApp links.
- Editing a booking's date or time after approval, walk-ins and the Wave 2 availability engine.
- The client profile timeline (551) and the dashboard numbers card (559).
- A count endpoint on the server (the badge counts the list it already loads; pilot volume is small).

## Critical Questions
- none

## Execution Notes
- Human 2026-11-12 (batch-3 ASK 552-1): approved: src/app/core/components/tab-chips/tab-chips.component.spec.ts. Planner also added test globs for the plan's own pages (the bare spec names above match nothing in the run's test-file gate).
- Map row 10, renumbered +2 on 2026-11-10 (old 550 → 552).
- Decision (Planner): the badge refreshes the requests list on window focus instead of a new server count endpoint, so the plan touches no server file; revisit if a business has more than a few hundred open requests.
- Built by orch-builder (batch-3). Evidence:
  - `pnpm run build` → exit 0; `pnpm run lint` → exit 0 (0 errors); `pnpm run lint:icons` → exit 0; `pnpm run lint:no-native-select` → exit 0.
  - `pnpm run test:ci` → exit 0, 2056 of 2056 SUCCESS (new: wa-link, front-desk-badge, request-card, requests.page, bookings.page specs; tab-chips spec updated for the new chips).
  - `node scripts/reuse-lint.mjs --check-registry` → exit 0; `node scripts/breadcrumbs-check.mjs` → clean; kit-manifest-check → ok; scope-check → ok; log-query → SKIP (no database configured).
  - e2e/ui/552-1..5 are written and listed by Playwright (`npx playwright test --list` → 5 tests); not run here: no server serves this branch (the running 3000/4200 are the main folder's). The gate reruns them.
  - A1: plan 550 already shipped `approve`, `decline`, `day` on the services; `ask` = `setStatus(id, 'needs_info', note)` (what the server has), so no service method was added.
  - scope extended: src/app/core/components/tab-chips/tab-chips.component.spec.ts, src/app/core/services/breadcrumbs.md — a spec beside a scoped file, and the breadcrumbs row the check demands for the new service.
