# Plan 670 — The guest booking page: free times as chips, area, "confirmed" or "waiting", manage the booking

Status: draft
Depends-on: 669
Snapshot: 28359b6d54b0c77e288c52702a850daef92ccf07

## Problem Statement
A restaurant's public booking page (`/book/:slug`) asks a guest to type a date and any hour, and always ends with
"we got your request". After plan 669 the server can say which hours are free and can confirm a table in the same
call, but the page does not use it. This plan makes the page of a restaurant with table service show the day's
free hours as chips, ask where the guest wants to sit, say honestly at the end "your table is confirmed" or "the
restaurant will confirm", and let the guest add the booking to a calendar, confirm arrival and cancel from the
link. The page of every other business stays exactly as it is.

Map row R8 of `docs/restaurant/restaurant-map.md` (brief RS-05 "Public page"; decision D10: `ics` for "add to
calendar").

Verified on `origin/main` (28359b6d, 2026-11-22):
- Routes `book/:slug` and `book/:slug/r/:token` exist (`src/app/app.routes.ts:332`, `:337`); no route is added.
- `src/app/pages/public-request/public-request.page.ts` (343 lines): states `loading | ready | not_found |
  unavailable | failed | done`; three steps kept in `?step=` (kind, details, contact); signals `date_`, `time_`,
  `party_`, `answers_`; `timeBound_` (line 104); `extraQuestions_` (lines 107–115) are the profile's questions
  except `date`, `time`, `party_size`; `wanted_` (117–130); `notes_` (133–150) runs the shared `qualify` and shows
  rule notes; `detailsValid()` (224); `submit()` (251–292) builds `PublicRequestInput`, calls `api.send`, and on
  success sets `reference_`, `token_` and the state `done`; error codes `NOT_AVAILABLE`, `TOO_MANY`,
  `BAD_REQUEST_INPUT`, other → `sendError_`.
- `public-request.page.html` (229 lines): the done card (lines 20–42, `data-testid="pb-done"`, title
  `pb_done_title`, text `doneText_()`); step 2 (78–151) with `app-date-field` (`inputId="pb-date"`),
  `app-time-field` (`inputId="pb-time"`, shown when `timeBound_()`), `app-counter` for the party, the extra
  questions, the notes list, and the next button (`data-testid="pb-next"`). The kind step shows how a radio group
  of chips is written here: `label.c-chip.c-chip--toggle` around an `input type="radio"` (lines 63–69).
- `public-request-status/public-request-status.page.ts` (108 lines) and `.html` (61 lines): the approved case
  shows `bookingLine_()` (`data-testid="pb-booking"`) and the contact links; the cancel button
  (`data-testid="pb-cancel"`) is shown only while `waiting_()`; `cancel()` (line 84) asks through
  `ConfirmModalService.open('pb_cancel_confirm')`.
- `services/public-request.service.ts` (118 lines): `PublicProfileView`, `PublicKindView` (with
  `durationMinutes?`), `PublicRequestStatus` (with `booking?: { date, time, partySize, status }`), `SendResult`,
  `loadProfile`, `send`, `getStatus`, `cancel`, the private `statusCall`. It is provided by the page
  (`providers: [PublicRequestService]`).
- Specs beside the files: `public-request.page.spec.ts`, `public-request-status.page.spec.ts`.
- Dictionary: 37 keys with the prefix `pb_` exist (`pb_done_title`, `pb_done_text`, `pb_cancel`,
  `pb_cancel_confirm`, `pb_too_many`, `pb_retry`, …); `fd_q_date`, `fd_q_time`, `fd_q_party_size`,
  `rq_field_required` are used by step 2.
- Icons registered in `src/app/app.config.ts`: `Clock`, `CheckCircle`. `CalendarPlus` is not registered.
- `package.json` has no `ics`; the package manager is pnpm (`pnpm-lock.yaml`). `ics` 3.12.1 is ISC-licensed
  (checked on the registry on 2026-11-22).
- `e2e/ui/555-1.spec.ts` is the existing script check of this page; it seeds a profile through the API with
  `signInQa`.
- `src/app/core/utils/wa-link.util.ts` is the pattern of a small pure helper with a spec beside it.

Exists after plan 669 (treat as given):
- `GET /api/v1/public/:slug` gains `tableBooking: { areas: [{ key, name }] }` for a business with table service.
- `GET /api/v1/public/:slug/availability?date=&partySize=&area=` → `{ slots: [{ time, available }], next?:
  { date, time } }`; 404 without table service; 429 after 60 reads in 15 minutes.
- `POST /api/v1/public/:slug/requests` accepts `areaKey` and answers `{ reference, token, confirmed: true,
  booking: { date, time, partySize } }`, or `{ reference, token, confirmed: false }`, or 409
  `{ error: 'NO_TABLE', alternatives: [{ date, time }] }`.
- The token read's `booking` gains `guestConfirmed` and `canCancel`; `POST …/cancel` may answer 409 `TOO_LATE`;
  `POST …/requests/:token/confirm` stamps the arrival confirmation.

## Contracts (copied verbatim from the frozen map)

**C-PUBAVAIL (R7; used by R8, R18)**
- `GET /api/v1/public/:slug/availability?date=&partySize=&area=` — no token; its own limiter (reads: 60 / 15 min
  per IP + slug); answers `{ slots: [{ time, available }], next?: { date, time } }` with `onlineOnly: true`; 404
  when the profile is not public or `tables` is off. It never returns a table, a name or a count.
- `POST /api/v1/public/:slug/requests`, kind `table`, `tables` on: the server runs `assign` (`onlineOnly`). When
  `confirmMode === 'auto'`, `partySize ≤ autoMaxParty`, `qualify` says `fit` and the claim succeeds → the request
  is created with status `approved` (history entry `via: 'server'`), the booking with source `request`, and the
  answer is `{ reference, token, confirmed: true, booking: { date, time, partySize } }`. In every other case the
  request is created as today and the answer has `confirmed: false`; when the time is taken the answer is 409
  `NO_TABLE` with `alternatives` and nothing is written.
- Guest page of an approved table request (`GET /:slug/requests/:token`) shows the booking; `POST …/cancel`
  cancels the booking too when `now < startAt − cancellationCutoffHours` (else 409 `TOO_LATE`);
  `POST …/confirm` stamps `guestConfirmedAt`.

**Brief RS-05, "Public page"** — For kind `table` with the module on: date → party size → time chips from the
availability read (taken times dimmed, the nearest free time offered when a day is full) → area preference → name
and phone. The done page says "confirmed" or "waiting for the restaurant", with the manage link and, for a
confirmed booking, "add to calendar" (D10).

## Goals & Success Criteria
**Primary:** on the page of a restaurant with table service a guest picks a free hour from chips, sends, and reads
whether the table is confirmed; from the link the guest adds it to a calendar, confirms arrival or cancels. The
page of a business without table service is unchanged.

- [ui] `e2e/ui/670-1.spec.ts` — on `/book/<slug>` with the public API answered by the spec (a profile with
  `tableBooking`, a day with free slots, a POST that answers `confirmed: true`): pick tomorrow, tap the chip
  `20:00`, tap next, fill name and phone, tick the consent, send — the done card shows the text
  "השולחן שלכם מאושר" and a button "הוספה ליומן".
- [ui] `e2e/ui/670-2.spec.ts` — the same page with an availability answer where no slot is available and
  `next: { date, time: '19:30' }`: after picking the date the page shows "אין מקום פנוי ביום הזה" and a button
  whose text contains "19:30"; tapping it selects that date and the chip `19:30`.
- [ui] `e2e/ui/670-3.spec.ts` — the page with a profile that has no `tableBooking`: step 2 shows the time field
  `#pb-time`, no element `[data-testid="pb-times"]`, and the page made no request to `/availability`.
- [auto] `pnpm run test:ci` → exit 0, including the new cases of
  `src/app/pages/public-request/public-request.page.spec.ts` (without `tableBooking` the body sent equals the body
  of today and has no `areaKey`; with it, an unavailable chip is disabled and cannot be chosen, a change of date
  or party reads the availability again and clears a chosen hour that is no longer free, a 409 `NO_TABLE` returns
  to step 2 with the alternatives as chips, `confirmed: false` shows the waiting title),
  `src/app/pages/public-request/public-request-status/public-request-status.page.spec.ts` (the arrival button
  calls confirm and then shows "אישרתם הגעה — נתראה!"; the cancel button is shown for `canCancel: true` and a
  `TOO_LATE` answer shows the too-late line; neither is shown for a booking without the two fields) and the new
  `src/app/pages/public-request/services/booking-calendar.util.spec.ts` (the text starts with `BEGIN:VCALENDAR`,
  holds the title and a start of `20261201T200000` for `2026-12-01` `20:00`, and lasts the given minutes).
- [auto] `pnpm run build` → exit 0 and `pnpm run lint` → exit 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] Dandan books a table from his phone on the demo restaurant's page: the chips are easy to tap, a taken
  hour is clearly dimmed, and the done page reads right in Hebrew.
- [human] the screen's page with the data request failing · open the page · a readable error with a retry appears, not a blank page
  (here: the booking page with the free-hours request failing, after a date is picked — the error and the retry
  stand where the hour chips would be).

## Execution Mode
- Parallel: no — first plan of run `rs-book-ui` (670, 671, 672, 673). It appends to
  `public/assets/data/dictionary.json` and `src/app/app.config.ts` and edits `package.json` / `pnpm-lock.yaml`:
  never live together with another screen run of the program, with plan 667 (it adds `qrcode` to the same two
  package files) or with open plan 542.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/public-request/**
src/app/pages/breadcrumbs.md
src/app/app.config.ts
public/assets/data/dictionary.json
package.json
pnpm-lock.yaml
docs/brain/component-families.md
e2e/ui/670-1.spec.ts
e2e/ui/670-2.spec.ts
e2e/ui/670-3.spec.ts
docs/workflow-kit/manifest.json
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-6: preserves — the scope glob only brushes the `*ai*` pattern (a file with "availability" in its name would
  match it); the page makes no model call and holds no key.
- INV-7: preserves — the page never decides whether an hour is free: it shows what the availability read returned
  and what the server answered to the request; it runs no engine function and sends a date and an hour, never an
  epoch.

## Reuse Check

- Hour chips and area chips — family: chip — rung: 1 — why: `c-chip c-chip--toggle` radio labels in a `c-chip-group`, exactly as the kind step of this page writes them.
- "Checking" line, failed read with retry, and the empty day line — family: feedback — rung: 1 — why: the page's own loading line pattern (`pb-loading`, `aria-busy`) and a `c-btn-ghost` retry, as its load state does.
- `bookingIcs` in `booking-calendar.util.ts` — family: helpers — rung: 3 — why: a new pure helper with a spec beside it, in the shape of `wa-link.util.ts`; it lives in the page folder because only the two guest pages use it.
- Cancel question on the status page — family: modal-controller — rung: 1 — why: `ConfirmModalService.open` as the page already calls it.

## Defaults

- loading-and-error-states — applies — how: the shared loading and error pieces (the page's loading line and a retry button for the availability read)
- one-breakpoint-set — applies — how: the shared breakpoint names at the top of src/styles.scss ($break-phone-max, $break-tablet-max), used in every @media; plan 656 makes them the only set
- empty-state-on-list — exception — why: the hour chips are a form control, not a list page; a day with no hours shows its own one-line message
- app-list-container — exception — why: the plan builds no list page
- unit-dropdown-add — exception — why: the page has no unit-of-measure dropdown

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a guest, I want to see the free hours of the evening and tap one, so that I do not guess an hour and wait
  for a "no".
- As a guest, I want to read at once whether my table is confirmed, so that I know if I still need to wait for the
  restaurant.
- As a guest, I want to put the booking in my calendar, say that we are coming, or cancel, from one link, so that
  I do not need to call.
- As a restaurant owner without table service, I want my booking page to stay exactly as it is, so that nothing
  changes for my guests.

## Functional Requirements

### Must Have (P0)

**`services/public-request.service.ts`**
- [ ] `PublicProfileView` gains `tableBooking?: { areas: { key: string; name: string }[] }`.
  `PublicRequestStatus.booking` gains optional `guestConfirmed` and `canCancel`. `SendResult` success gains
  `confirmed?: boolean` and `booking?: { date: string; time: string; partySize: number }`; its failure gains
  `alternatives?: { date: string; time: string }[]` (read from the body of a 409 `NO_TABLE`).
- [ ] `availability(slug, date, partySize, area?)` → `{ ok: true; slots: { time: string; available: boolean }[];
  next?: { date: string; time: string } } | { ok: false; code: 'TOO_MANY' | 'FAILED' }` (429 → `TOO_MANY`).
- [ ] `confirm(slug, token)` → `StatusResult`, through the existing `statusCall`
  (`POST …/requests/:token/confirm`).

**The booking page (`public-request.page.ts` / `.html` / `.scss`)** — "table mode" is `tableMode_`: the profile
has `tableBooking` **and** the chosen kind is `table`. Outside table mode the page renders and sends exactly what
it does today.
- [ ] Step 2 in table mode, in this order: date → party size → hours → area → the other questions. The time field
  `#pb-time` is not rendered; the profile's `seating` question is not rendered (the area chips replace it).
- [ ] Hours: once a date is chosen the page reads the availability for the date, the party and the chosen area,
  and reads it again whenever one of the three changes (the newest read wins; an older answer that arrives late is
  ignored). While reading: the line `pb_times_loading` with `aria-busy`. The slots are a radio group of chips
  (`data-testid="pb-times"`, each chip `data-testid="pb-time-HH:mm"`), in the order the server sent them. A slot
  with `available: false` is a disabled radio with the class `pb-time--taken` (dimmed and struck through, so the
  state is not colour only) and cannot be chosen. A chosen hour that is no longer available after a new read is
  cleared.
- [ ] Hours, the other answers: an empty `slots` list → the line `pb_times_none`. Slots but none available → the
  line `pb_times_full` and, when the answer has `next`, a button (`data-testid="pb-next-free"`) with the text
  `pb_next_free` (date as `DD/MM`, and the hour); tapping it sets the date and chooses that hour after the new
  read. A failed read → the line `pb_times_failed` and a retry button (`pb_retry`); `TOO_MANY` → the line
  `pb_too_many` with no retry.
- [ ] Area: shown only when `tableBooking.areas` has two or more entries — a radio group of chips
  (`data-testid="pb-areas"`): `pb_area_any` (chosen at the start) and one chip per area with its `name` as text
  (a name the owner typed; not translated).
- [ ] `detailsValid()` in table mode needs a date and a chosen hour; a missing hour shows `rq_field_required`
  under the chips after the guest pressed next. The rule notes (`notes_`) stay as they are.
- [ ] `submit()` in table mode adds `areaKey` when an area is chosen and sends no `seating` answer.
  - `confirmed: true` → the done card shows the icon `check-circle`, the title `pb_done_confirmed_title`, the line
    `pb_done_confirmed_text` (business name, date as `DD/MM`, hour, party size from the answer's `booking`), the
    reference, the status link (`pb_status_link`), the copy button, and the button `pb_add_to_calendar`
    (`data-testid="pb-calendar"`, icon `calendar-plus`).
  - `confirmed: false` → the done card shows the title `pb_done_waiting_title` and the line
    `pb_done_waiting_text`, the reference and the actions of today; no calendar button.
  - 409 `NO_TABLE` → the page goes back to step 2 (`?step=2`), clears the chosen hour, shows the line
    `pb_time_taken` (`role="alert"`) and the alternatives as buttons (`data-testid="pb-alt"`, text `DD/MM HH:mm`);
    tapping one sets its date and chooses its hour; the availability is read again. No alternatives → only the
    line.
  - Every other error is handled as today.
- [ ] Outside table mode the done card is exactly today's (`pb_done_title`, `doneText_()`).

**The status page (`public-request-status.page.ts` / `.html`)** — additions only for an approved request whose
`booking` carries the new fields:
- [ ] `booking.status === 'confirmed'` and `guestConfirmed === false` → a primary button `pb_confirm_arrival`
  (`data-testid="pb-confirm"`); it calls `confirm`, then shows the line `pb_arrival_confirmed` in its place.
  `guestConfirmed === true` → the line from the start.
- [ ] A button `pb_add_to_calendar` (`data-testid="pb-calendar"`) while the booking is `confirmed`.
- [ ] `canCancel === true` → a ghost button `pb_cancel_booking` (`data-testid="pb-cancel-booking"`); it asks
  through `ConfirmModalService.open('pb_cancel_booking_confirm')`, calls the existing `cancel`, and applies the
  answer (the page then shows `pb_status_cancelled`). A `TOO_LATE` answer shows the line `pb_cancel_too_late` and
  hides the button. `canCancel === false` on a `confirmed` booking → the line `pb_cancel_too_late` beside the
  contact links, no button.
- [ ] A booking without the two fields (a business without table service) shows exactly today's page.

**"Add to calendar" (`services/booking-calendar.util.ts`, new)**
- [ ] `bookingIcs({ title, date, time, minutes, location? })` → the calendar text, or `null` when the library
  reports an error. It loads the package with a dynamic `import('ics')` (the page's first bundle does not grow) and
  calls `createEvent` with a local start (`startInputType: 'local'`, `startOutputType: 'local'`) built from `date`
  and `time`, `duration: { minutes }`, the title and the location.
- [ ] `downloadIcs(text)` saves it as `booking.ics` (`text/calendar`) through a temporary object URL.
- [ ] Both pages call it with the title `pb_calendar_title` (`{name}` = the business name), the booking's date and
  hour, and the location = the profile's address on the booking page (none on the status page). Minutes: the
  `table` kind's `durationMinutes` on the booking page, else 120. A `null` shows `save_failed` through
  `UserMsgService`, as `copyLink()` does.
- [ ] `ics` `3.12.1` is added to `dependencies` of the root `package.json` with `pnpm add ics@3.12.1`
  (`pnpm-lock.yaml` changes with it). No other dependency is added.

**Strings and icons**
- [ ] Dictionary keys appended to `public/assets/data/dictionary.json` (see UI/UX Notes); `CalendarPlus` is
  registered in `src/app/app.config.ts`.

**Tests and docs**
- [ ] The three e2e specs of Goals. They need no account and no seeded data: each answers the page's calls to
  `**/api/v1/public/**` with `page.route` and saves a screenshot. (The QA business has no table service and a
  spec cannot switch a module on; answering the public API in the spec keeps the check exact and repeatable.)
- [ ] The unit cases of Goals in the two existing specs and the new util spec.
- [ ] `src/app/pages/breadcrumbs.md`: the `public-request` entry names the hour chips and the calendar helper.
  `docs/brain/component-families.md`: `bookingIcs` is added under the `helpers` family as a page-local helper.

### Should Have (P1)
- [ ] The chips wrap to as many rows as needed and each is at least 44 px high on a phone; SCSS uses logical
  properties and only the shared breakpoint names.

### Nice to Have (P2)
- none

## UI/UX Notes
- Hebrew, RTL, no app header (the page is `bare`). Phone first: one column; the chips wrap.
- Behaviours the brief leaves unsaid, taken the simple way: changing the date, the party or the area keeps the
  chosen hour only if it is still free; going back to step 2 from step 3 keeps what was chosen; leaving the page
  loses the draft, as today; the calendar entry is a plain local-time event with no reminder.
- No extra confirmation dialog is added, except the cancel question the status page already asks.
- New keys in `public/assets/data/dictionary.json` (all appended):
  - `pb_times_loading`: "בודקים שעות פנויות…"
  - `pb_times_failed`: "לא הצלחנו לבדוק שעות פנויות"
  - `pb_times_none`: "אין שעות להזמנה ביום הזה"
  - `pb_times_full`: "אין מקום פנוי ביום הזה"
  - `pb_next_free`: "המועד הפנוי הקרוב: {date} בשעה {time}"
  - `pb_time_taken`: "השעה שבחרתם נתפסה בינתיים. אפשר לבחור שעה אחרת:"
  - `pb_area`: "איפה תרצו לשבת?"
  - `pb_area_any`: "לא משנה"
  - `pb_done_confirmed_title`: "השולחן שלכם מאושר"
  - `pb_done_confirmed_text`: "{name} מחכים לכם ב-{date} בשעה {time}, {party} סועדים"
  - `pb_done_waiting_title`: "הבקשה התקבלה"
  - `pb_done_waiting_text`: "{name} יאשרו את ההזמנה בהקדם"
  - `pb_add_to_calendar`: "הוספה ליומן"
  - `pb_calendar_title`: "שולחן ב{name}"
  - `pb_confirm_arrival`: "מאשרים הגעה"
  - `pb_arrival_confirmed`: "אישרתם הגעה — נתראה!"
  - `pb_cancel_booking`: "ביטול ההזמנה"
  - `pb_cancel_booking_confirm`: "לבטל את ההזמנה?"
  - `pb_cancel_too_late`: "כבר אי אפשר לבטל כאן — התקשרו למסעדה"
- Lucide icons: `calendar-plus` (new: register `CalendarPlus`), `check-circle` and `clock` (registered).

## Atomic Sub-tasks

- [ ] A1: Teach the page's service the new answers of the public door — table-booking block, availability read, confirm call, confirmed and alternatives on send — src/app/pages/public-request/services/public-request.service.ts
- [ ] A2: Add the calendar helper and its one dependency so a guest can save the booking — bookingIcs with a lazy import, downloadIcs, the spec, pnpm add ics@3.12.1 — src/app/pages/public-request/services/booking-calendar.util.ts, src/app/pages/public-request/services/booking-calendar.util.spec.ts, package.json, pnpm-lock.yaml
- [ ] A3: Show the day's hours as chips on the booking page of a restaurant with table service — table mode, the read on date, party or area change, taken hours disabled, loading, failed, empty and full states, the next free time — src/app/pages/public-request/public-request.page.ts, src/app/pages/public-request/public-request.page.html, src/app/pages/public-request/public-request.page.scss
- [ ] A4: Ask where the guest wants to sit and send it with the request — the area chips, the hidden seating question, the area key in the body — src/app/pages/public-request/public-request.page.ts, src/app/pages/public-request/public-request.page.html
- [ ] A5: Tell the guest the truth at the end: confirmed, waiting, or the hour was taken — the two done cards, the calendar button, the return to step two with alternatives — src/app/pages/public-request/public-request.page.ts, src/app/pages/public-request/public-request.page.html
- [ ] A6: Let the guest manage a confirmed booking from the link — confirm arrival, add to calendar, cancel before the cutoff, the too-late line — src/app/pages/public-request/public-request-status/public-request-status.page.ts, src/app/pages/public-request/public-request-status/public-request-status.page.html
- [ ] A7: Add the Hebrew texts and the new icon — nineteen dictionary keys appended, CalendarPlus registered — public/assets/data/dictionary.json, src/app/app.config.ts
- [ ] A8: Cover the page with unit cases, including that a business without table service is untouched — the cases of Goals in the two page specs — src/app/pages/public-request/public-request.page.spec.ts, src/app/pages/public-request/public-request-status/public-request-status.page.spec.ts
- [ ] A9: Write the three script checks of the page with the public door answered by the spec — confirmed booking, full day with the next free time, unchanged page — e2e/ui/670-1.spec.ts, e2e/ui/670-2.spec.ts, e2e/ui/670-3.spec.ts
- [ ] A10: Record the new pieces in the folder map and the registry — one entry each — src/app/pages/breadcrumbs.md, docs/brain/component-families.md

## Technical Considerations
- Dependencies: the two guest pages and their service; the public routes of plan 669. One new browser
  dependency, `ics` 3.12.1 (approved, D10).
- New files needed: `src/app/pages/public-request/services/booking-calendar.util.ts` and its spec; three e2e
  specs.
- Model changes: browser-side view types in `public-request.service.ts` only.
- Backend / API: none (plan 669 built it).
- Auth and validation: none — the page has no account; the server checks every input.
- Security surface: the page stays public and stores nothing new; area names are shown as text, never as HTML;
  the token is not logged. The calendar file is built in the browser from the booking's own date and hour.
- Data / migration: none.
- Signal flow: `date_`, `party_`, `area_` → an `effect` that calls `availability` → `slots_`, `next_`,
  `timesState_` → the chips; `time_` (existing) holds the chosen hour → `wanted_` → `submit()`.
- Project checks: the `log-query` Done-when item is in Goals; Hebrew RTL with logical CSS only; every string goes
  through `translatePipe` and the keys are listed; the new icon is named; `dictionary.json` is append-only; the
  folder map is in the scope.

## Out of Scope
- Any server change (plans 668, 685, 669).
- Changing the date or the hour of a confirmed booking by the guest (the guest cancels and books again).
- Joining the waiting list from the page, deposits, English on the guest page (brief Part 6).
- The QR code of the booking page (plan 667) and every member screen.
- The page of a business without table service.

## Critical Questions
- none

## Execution Notes
