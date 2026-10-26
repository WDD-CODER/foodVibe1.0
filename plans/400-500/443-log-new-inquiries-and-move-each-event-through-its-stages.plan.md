# Plan 443 — Log new inquiries and move each event through its stages

Status: done
Track: code
Snapshot: 8ffda3d2c4d8f3ab5137bfee30e9d80026d28110

## Problem Statement
Spec 09.1. Plan 442 gives every event a stage, a stage history, notes and client fields, plus the server routes
that change them — but nothing in the app shows or uses them. A chef cannot log a phone inquiry without building
a whole menu, cannot see or change where an event stands, cannot keep notes on it, and the menu library mixes
finished, lost and live events with no way to filter.

This plan adds the screens only (plan 442 owns the data, the schema and `/api/v1/events`):
1. **"פנייה חדשה"** — a short form in the menu library (name, phone, date, guests, event type, first note) that
   creates an event in "פנייה" without a menu.
2. **Stage bar** at the top of the event screen in Menu Intelligence: click a stage to move; "לא נסגר" asks for a
   reason; "הסתיים" is shown but cannot be picked; entering "הזמנות" offers "הזמנות לספקים" (plan 435).
3. **Client details** (client name, phone; deposit amount + date for the owner) inside the stage bar.
4. **Notes log** on the side of the event screen: add, edit/delete own notes, newest first.
5. **Library**: a stage chip on every card, a stage filter whose default view is "פעילים", a "ישן" tag on
   legacy events.

`menu-intelligence.page.ts` is growth-frozen (`_shared/tech-stack.md`): the page gets template wiring and
component imports only, and the plan deletes dead page code to keep the file's net line count ≤ 0.

## Goals & Success Criteria
**Primary:** a chef logs an inquiry in under a minute, sees and changes every event's stage from the event screen,
keeps notes on it, and the library opens on live events only.

Done when:
- [auto] [x] `npx ng build` passes. (evidence: docs/mvp/runs/443.md)
- [auto] [x] `npx ng test --watch=false --include='src/app/core/utils/event-stage-ui.util.spec.ts' --include='src/app/core/services/event-pipeline.service.spec.ts' --include='src/app/pages/menu-library/**/*.spec.ts' --include='src/app/pages/menu-intelligence/components/event-stage-bar/**/*.spec.ts' --include='src/app/pages/menu-intelligence/components/event-notes-log/**/*.spec.ts'`
  passes, including the new specs:
  - `event-stage-ui.util`: `selectableStages('inquiry')` excludes `finished`; `canPickNotClosed('inquiry')` and
    `canPickNotClosed('quote_sent')` → `true`, `canPickNotClosed('deposit_paid')` → `false`;
    `needsDateFor('deposit_paid', undefined)` → `true`, `needsDateFor('quote_sent', undefined)` → `false`;
    `isActiveStage('finished')` / `isActiveStage('not_closed')` → `false`, every other key → `true`;
    `stageErrorKey` maps each plan-442 code — `DATE_REQUIRED` → `stage_needs_date`, `REASON_REQUIRED` →
    `stage_reason_required`, `NOT_CLOSED_FROM_STAGE` → `stage_not_closed_from`, `USE_FINISH` → `stage_finished_hint`,
    `EVENT_FINISHED` → `event_finished_locked`, `NOTE_EMPTY` → `notes_empty_error`, `NOTE_TOO_LONG` → `notes_too_long`,
    `FORBIDDEN` → `no_permission` (plan 428's key); an unknown code → `stage_change_failed`;
  - library filter: default `stage` value is `active` and hides `finished` and `not_closed` events; `stage=all`
    shows all; `stage=quote_sent` shows only that stage;
  - notes log: notes sort newest first; edit and delete buttons render only where `note.by === current userId`;
  - not-closed dialog: "שמור" stays disabled until a reason is chosen;
  - `EventPipelineService.changeStage` sends `PUT /api/v1/events/<id>/stage` and writes the returned event into
    `MenuEventDataService` (store updated without a reload); a 400 `{ error: 'DATE_REQUIRED' }` response shows the
    `stage_needs_date` text and leaves the stored event unchanged;
  - new inquiry: the body sent to `addMenuEvent` carries no `stage`, `stageHistory` or `notes` (plan 442's generic
    POST strips `EVENT_SERVER_FIELDS` and stamps `stage: 'inquiry'`); the first note goes through
    `EventPipelineService.addNote`.
- [auto] [x] Net line count of `src/app/pages/menu-intelligence/menu-intelligence.page.ts` ≤ 0 for this plan:
  `git diff --numstat origin/mvp -- src/app/pages/menu-intelligence/menu-intelligence.page.ts` prints
  added ≤ deleted.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] Desktop `/menu-library`: click «פנייה חדשה», type name "בדיקה 443", date next month, 80 guests, a first
  note "התקשרה בבוקר" → «שמור». The card appears with the chip "פנייה"; the library is on the "פעילים" view.
- [human] Phone width, same page: the «פנייה חדשה» FAB action opens the same form; it fits the screen without
  side scrolling and saves.
- [human] Open "בדיקה 443" (`/menu-intelligence/<its id>`): the stage bar shows "פנייה" as current. Click "הצעת
  מחיר נשלחה", then "מקדמה שולמה", type a deposit of 2,000 → open «היסטוריית שלבים»: two moves, each with date,
  time and your name.
- [human] On an event in "פנייה" click «לא נסגר» → «שמור» is disabled until you pick "מחיר"; after saving, back
  in `/menu-library` the event is gone from "פעילים" and shows under the stage filter "לא נסגר".
- [human] "הסתיים" in the stage bar cannot be clicked.
- [human] Add three notes → newest on top, each with your name and the date. Sign in as another user of the same
  business: that user sees the notes but no edit or delete buttons on yours.
- [human] Move an event to "הזמנות" → the app asks whether to open «הזמנות לספקים»; «כן» opens it.
- [human] Phone width, event screen: the stage bar scrolls sideways inside itself (the page does not), and the
  notes log sits below the menu paper.
- [human] An event with no date: moving to "מקדמה שולמה" is refused with "יש להזין תאריך אירוע לפני מעבר ל"מקדמה
  שולמה"".

## Execution Mode
- Parallel: no against 434 and 435 (both edit `menu-intelligence.page.ts`); no against 441, 442, 444, 445, 446
  (same page — they run in sequence in lane wt-3 anyway).
- Concurrent plans: none required. Lane wt-1 plans (426–432, 448) share no file with this scope — confirm with
  `node scripts/scope-check.mjs --overlap --plan=<this file>` at take time.
- Isolated DB: no — no data is reshaped; events are created through the normal API.

## Execution Notes
- Depends on: plan 442 merged (stage fields, `/api/v1/events` router, server-side stage history and notes).
- Depends on: plan 428 merged (client `PermissionService` used to hide the owner-only deposit fields and to lock
  the stage bar for staff on events they did not create). Not in the approved map's list for 443 — added here
  because 443 calls `PermissionService.can()`; lane wt-1 reaches 428 well before wt-3 reaches 443.
- Soft dependency (not blocking): plan 435 for the "הזמנות" → «הזמנות לספקים» offer. 435 adds the page signal
  `supplierOrdersEvent_` and the lazy `<app-supplier-orders [event]>` block; the stage bar only emits an
  `openSupplierOrders` output and the page template sets that signal exactly as 435's pill-row button does (template
  only, no `.ts` growth). If 435 is not merged, skip the offer (spec: "only if 04.2 merged") and log it as a
  decision in the run file — no other step depends on it.
- Must not run at the same time as: 434, 435, 441, 442, 444, 445, 446 (`menu-intelligence.page.ts`).
- Frozen-file budget: the page gains 2 import lines + 2 `imports: []` entries; the plan deletes the unused
  `goBack()` (4 lines, no caller in the page template today) to stay ≤ 0. If an earlier plan already deleted it,
  delete another member that has no reference in the page template or any other file (Step 0 lists candidates;
  `getServingTypeLabel` is reserved for plan 444's budget) or stop and escalate.
- Server-owned fields: never send `stage`, `stageHistory`, `closedAt`, `notClosed*`, `notes` or `legacy` through the
  generic data API (plan 442 strips `EVENT_SERVER_FIELDS` there); every stage and note write goes through
  `/api/v1/events`. Client name, phone and deposit are ordinary fields saved with the generic PUT.
- MVP run mode: executed unattended into branch `mvp` per `docs/mvp/run-mode.md` — Atlas steps are rehearsed on a
  scratch copy and deferred to the final gate; [human] items become validation cards in `docs/mvp/runs/<NNN>.md`.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/utils/event-stage-ui.util.ts
src/app/core/utils/event-stage-ui.util.spec.ts
src/app/core/services/event-pipeline.service.ts
src/app/core/services/event-pipeline.service.spec.ts
src/app/core/services/menu-event-data.service.ts
src/app/pages/menu-library/menu-library.page.ts
src/app/pages/menu-library/components/menu-library-list/**
src/app/pages/menu-library/components/new-inquiry-dialog/**
src/app/pages/menu-intelligence/components/event-stage-bar/**
src/app/pages/menu-intelligence/components/event-notes-log/**
src/app/pages/menu-intelligence/components/not-closed-dialog/**
src/app/pages/menu-intelligence/menu-intelligence.page.html
src/app/pages/menu-intelligence/menu-intelligence.page.scss
src/app/pages/menu-intelligence/menu-intelligence.page.ts
src/app/app.config.ts
public/assets/data/dictionary.json
src/app/core/breadcrumbs.md
src/app/core/services/breadcrumbs.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — every stage, note and deposit write goes through plan 442's `/api/v1/events` routes, which
  scope by business and authorize through `server/utils/permissions.js` (ADR 0023 rule as rewritten by plan 424);
  the client only hides buttons by the same rules (`PermissionService.can`). `menu-event-data.service.ts` gains a
  store-update method only; its CRUD paths are unchanged.
- INV-2: preserves — no change to how business data is scoped or to master data; events stay business items.
- INV-none for the rest: no schema, no server code, no taxonomy, no AI.

## Step 0 — Reality Check

Runs when `scope-check.mjs --drift` reports drift (it will: 434, 435, 441 and 442 change these files). Check by
symbol and print `ok` or `conflict: <what>`:
- Plan 442: `EVENT_STAGES` in `shared/schemas/entities/event-stage.ts`; `stage`, `stageHistory`, `notes`,
  `clientName`, `clientPhone`, `deposit`, `legacy`, `notClosedReason` in `menu-event.schema.ts`; the routes `PUT
  /:id/stage`, `POST /:id/notes`, `PUT /:id/notes/:noteId`, `DELETE /:id/notes/:noteId` in
  `server/routes/events.js` and what each returns (expected: the updated event); that `POST /api/v1/data/menuEvents`
  strips `EVENT_SERVER_FIELDS` and sets `stage: 'inquiry'` + the first history entry on the server; the error
  bodies `{ error: <code> }` with the codes `DATE_REQUIRED`, `REASON_REQUIRED`, `NOT_CLOSED_FROM_STAGE`,
  `USE_FINISH`, `EVENT_FINISHED`, `NOTE_EMPTY`, `NOTE_TOO_LONG` (442 sends no `messageKey` except C-PERM's
  `FORBIDDEN` / `no_permission`). Plan 442 S2 adds every C-STAGES field to `src/app/core/models/menu-event.model.ts`
  — a missing field is a `conflict` (offer `approved:` for that file); 442 adds no dictionary keys, so every
  `event_stage_*` key is added here.
- Plan 435: page signal `supplierOrdersEvent_`, `getCurrentMenuForExport` (made protected by 435) and the pill-row
  «הזמנות לספקים» button's click expression in `menu-intelligence.page.html` — the stage bar's
  `(openSupplierOrders)` binding repeats that expression.
- Plan 428: `PermissionService.can(action, ctx)` in `src/app/core/services/permission.service.ts`; the
  `no_permission` dictionary key.
- `MenuEventDataService.addMenuEvent`: whether it keeps the server's POST response (with `stage: 'inquiry'`) in the
  store; if it keeps the client object, the new-inquiry dialog passes the response through `applyServerEvent`.
- `UserService.user_()` id field: it must equal the token's `userId` that plan 442 writes into `note.by`.
- Page: `editingId_`, the `imports: []` array, `goBack()`, `.pill-row`, `.paper-outer` in
  `menu-intelligence.page.*`. Frozen-budget candidates if `goBack` is gone:
  `onViewMenuInfo`, `onExportMenuInfo` (grep that each has no caller first; `getServingTypeLabel` is plan 444's).
- Library: `useListState('menu-library', …)`, `filteredEvents_`, `article.event-card` in
  `menu-library-list.component.*`; HeroFab actions in `menu-library.page.ts` `ngOnInit`.

## User Stories
- As a chef, I want to log a phone inquiry in a few fields so that no lead is lost before I build a menu.
- As a chef, I want to see and change an event's stage at the top of its screen so that I always know where it
  stands.
- As a chef, I want to record why an inquiry did not close so that I learn why I lose events.
- As a chef, I want a notes log on each event so that my team sees what the client said and when.
- As a chef, I want the menu library to open on live events only so that finished and lost events don't clutter it.

## Functional Requirements

### Must Have (P0)
- [x] "פנייה חדשה" short form: name (required, ≤ 200), client phone (optional), date (optional), guests
  (whole number ≥ 0), event type (from the event-type list), first note (optional, ≤ 2,000) → event created in
  "פנייה", no menu; the first note is saved through the notes route.
- [x] Stage bar on the event screen with the 7 stages in order plus "לא נסגר"; click moves forward, backward or
  skips; "הסתיים" never selectable; "לא נסגר" only from "פנייה" or "הצעת מחיר נשלחה" and only with a reason.
- [x] Moving to "מקדמה שולמה" or later without an event date is refused with a message.
- [x] Stage changes allowed for the owner and for the event's creator; others see the bar read-only.
- [x] Entering "הזמנות" offers to open «הזמנות לספקים» (plan 435); wired after plan 435 merged (see docs/mvp/runs/443.md Decisions).
- [x] Stage history visible from the bar: stage, date-time, who, reason.
- [x] Client name and phone editable on the event screen; deposit amount + date editable only by the owner
  (`editMoney`), visible to all.
- [x] Notes log: add in any stage; newest first with date and author name; edit/delete own notes only; ≤ 2,000
  characters.
- [x] Library: stage chip on each card; stage filter (`פעילים` default, `הכל`, each stage); "ישן" tag on legacy
  events; filter value kept in the URL (`?stage=`).
- [x] `/menu-library?new=inquiry` opens the "פנייה חדשה" form (used by plan 447's empty-dashboard link).

### Should Have (P1)
- [x] The library's "פנייה חדשה" also sits in the page-header actions next to the existing «תפריט חדש» button.

### Nice to Have (P2)
- [ ] none.

## UI/UX Notes
- RTL; logical CSS properties only; reuse `c-*` engines (`c-btn-primary`, `c-toggle-chip`, `c-input-wrapper`).
  Run the `cssLayer` skill before any `.scss` edit.
- Stage bar: one row of pill buttons (`event-stage-bar`), current stage filled, past stages outlined, "הסתיים"
  greyed with `aria-disabled="true"`; "לא נסגר" as a separate outlined danger pill at the row's end. On phones the
  row is `overflow-x: auto` inside its own box. Below it, a collapsible "פרטי לקוח" line (client name · phone ·
  deposit) and an «היסטוריית שלבים» toggle. Placed in the page template directly above `.paper-outer`, shown only
  when `editingId_()` is set (a new, unsaved menu has no stage yet).
- Notes log: a side column next to the paper on desktop (≥ 1024 px), below the paper on smaller screens. Layout
  via the page's `.scss` (grid on `.menu-editor-shell`) — page `.scss` is not frozen.
- Not-closed dialog and new-inquiry form reuse the shared modal shell pattern from `src/app/shared/confirm-modal/`
  (`docs/agent/standards-angular.md` → Shared modals). Dialogs close on Escape; first field focused.
- Library card: stage chip as the first tag in `.card-tags`; "ישן" as a muted tag.
- Icons: `message-square` (notes title) — register `MessageSquare` in `src/app/app.config.ts`. Already registered
  and reused: `file-plus`, `phone`, `calendar-clock`, `pencil`, `trash-2`, `x`, `check`, `chevron-left`.
- New `dictionary.json` keys (append to `general`; skip any plan 442 already added):

| key | Hebrew |
|---|---|
| `event_stage_inquiry` | פנייה |
| `event_stage_quote_sent` | הצעת מחיר נשלחה |
| `event_stage_deposit_paid` | מקדמה שולמה |
| `event_stage_ordering` | הזמנות |
| `event_stage_execution` | ביצוע |
| `event_stage_post_production` | פוסט-פרודקשן |
| `event_stage_finished` | הסתיים |
| `event_stage_not_closed` | לא נסגר |
| `new_inquiry` | פנייה חדשה |
| `new_inquiry_name` | שם הלקוח / האירוע |
| `client_name` | שם לקוח |
| `client_phone` | טלפון לקוח |
| `client_phone_invalid` | מספר טלפון לא תקין |
| `client_details` | פרטי לקוח |
| `first_note` | הערה ראשונה |
| `new_inquiry_saved` | הפנייה נשמרה |
| `deposit_amount` | סכום מקדמה |
| `deposit_date` | תאריך מקדמה |
| `stage_filter` | שלב |
| `stage_filter_active` | פעילים |
| `stage_filter_all` | הכל |
| `event_legacy` | ישן |
| `stage_history` | היסטוריית שלבים |
| `stage_changed` | השלב עודכן |
| `stage_needs_date` | יש להזין תאריך אירוע לפני מעבר ל"מקדמה שולמה" |
| `stage_not_allowed` | רק הבעלים או מי שיצר את האירוע יכולים לשנות שלב |
| `stage_finished_hint` | "הסתיים" נקבע רק דרך "סיים אירוע" |
| `not_closed_title` | למה האירוע לא נסגר? |
| `not_closed_reason_price` | מחיר |
| `not_closed_reason_date_taken` | תאריך תפוס |
| `not_closed_reason_no_reply` | הלקוח לא חזר |
| `not_closed_reason_other` | אחר |
| `not_closed_text` | פרטים נוספים (לא חובה) |
| `open_supplier_orders_prompt` | האירוע עבר ל"הזמנות". לפתוח את "הזמנות לספקים"? |
| `notes_title` | הערות |
| `notes_add` | הוסף הערה |
| `notes_placeholder` | כתבו הערה… |
| `notes_too_long` | עד 2,000 תווים |
| `notes_empty` | אין הערות עדיין |
| `notes_edited` | נערך |
| `notes_confirm_delete` | למחוק את ההערה? |
| `notes_empty_error` | אי אפשר לשמור הערה ריקה |
| `stage_reason_required` | יש לבחור סיבה |
| `stage_not_closed_from` | "לא נסגר" אפשרי רק מ"פנייה" או מ"הצעת מחיר נשלחה" |
| `stage_change_failed` | שינוי השלב נכשל – נסו שוב |
| `event_finished_locked` | האירוע הסתיים – הנתונים נעולים |

(`event_finished_locked` is reused by plan 446; `no_permission` comes from plan 428.)

## Atomic Sub-tasks
- [x] A1: Put the stage rules the screens need in one small tested helper — selectableStages, canPickNotClosed, needsDateFor, isActiveStage, stageLabelKey, stageErrorKey (reads EVENT_STAGES, NOT_CLOSED_FROM, CLOSED_FROM_INDEX from plan 442's event-stage.ts; error-code map per Done-when) + spec — src/app/core/utils/event-stage-ui.util.ts, src/app/core/utils/event-stage-ui.util.spec.ts
- [x] A2: Add one client service for stage moves and notes that keeps the event list in sync — EventPipelineService.changeStage/addNote/editNote/deleteNote over `${environment.apiUrl}/api/v1/events/...`, each writes the returned event via new MenuEventDataService.applyServerEvent(event); an error body's `error` code is returned for stageErrorKey + spec — src/app/core/services/event-pipeline.service.ts, src/app/core/services/event-pipeline.service.spec.ts, src/app/core/services/menu-event-data.service.ts
- [x] A3: Let a chef log a new inquiry from the library in a short form — NewInquiryDialogComponent (fields and limits per P0; eventType options from MetadataRegistryService event-type terms; save = MenuEventDataService.addMenuEvent({ name, clientName: name, clientPhone, eventDate, guestCount, eventType, servingType: '', sections: [], createdAt, updatedAt }) — no stage, stageHistory or notes in the body (plan 442's POST stamps inquiry); keep the server's returned event in the store (applyServerEvent when addMenuEvent does not) — then EventPipelineService.addNote when a first note was typed; toast new_inquiry_saved; stays on the library); open it from a new HeroFab action (labelKey new_inquiry, icon file-plus) in MenuLibraryPage.ngOnInit, a header button, and ?new=inquiry — src/app/pages/menu-library/components/new-inquiry-dialog/**, src/app/pages/menu-library/menu-library.page.ts, src/app/pages/menu-library/components/menu-library-list/**
- [x] A4: Show each event's stage on its library card and open the library on live events only — stage chip + "ישן" tag in the card template; stageFilter_ signal ('active' default, 'all', or a stage key) added to useListState as urlParam stage; filteredEvents_ applies it with isActiveStage; a stage select in .filters-bar + spec — src/app/pages/menu-library/components/menu-library-list/**
- [x] A5: Ask why an event did not close before marking it lost — NotClosedDialogComponent: four reason radios (price, date_taken, no_reply, other), optional text ≤ 500, «שמור» disabled until a reason; emits { reason, reasonText } or cancel + spec — src/app/pages/menu-intelligence/components/not-closed-dialog/**
- [x] A6: Add the stage bar at the top of the event screen with client details and stage history — EventStageBarComponent, input eventId (reads the event from MenuEventDataService.allMenuEvents_ like VenueLinkChipComponent); click → needsDateFor check → EventPipelineService.changeStage; "לא נסגר" opens NotClosedDialog; locked when !PermissionService.can('changeStage', { type: 'menuEvents', doc }); client name/phone saved on blur via MenuEventDataService.updateMenuEvent with only those fields changed; deposit amount/date disabled unless can('editMoney', …); on entering ordering, ConfirmModalService.open('open_supplier_orders_prompt') → «כן» emits output openSupplierOrders (only when plan 435 is merged); refused moves show t(stageErrorKey(code)) + spec — src/app/pages/menu-intelligence/components/event-stage-bar/**
- [x] A7: Add the notes log beside the menu so the team shares what the client said — EventNotesLogComponent, input eventId; textarea with 2,000-char counter, «הוסף הערה»; list newest first with byName and date (and נערך when editedAt); edit/delete only when note.by === UserService.user_()?._id; delete asks notes_confirm_delete + spec — src/app/pages/menu-intelligence/components/event-notes-log/**
- [x] A8: Wire the stage bar and notes log into the event screen without growing the frozen page — template: <event-stage-bar [eventId]="editingId_()" (openSupplierOrders)="<the same expression as 435's pill-row button>"> above .paper-outer and <event-notes-log [eventId]="editingId_()"> beside it, both inside @if (editingId_()); page .scss grid for the side column; page .ts: 2 imports + 2 imports[] entries, delete goBack() (or another verified-unused member) so net lines ≤ 0 — src/app/pages/menu-intelligence/menu-intelligence.page.html, src/app/pages/menu-intelligence/menu-intelligence.page.scss, src/app/pages/menu-intelligence/menu-intelligence.page.ts
- [x] A9: Add the new Hebrew labels and the notes icon — dictionary keys from UI/UX Notes (append, skip existing), MessageSquare in LucideAngularModule.pick — public/assets/data/dictionary.json, src/app/app.config.ts
- [x] A10: Build, test, check the frozen-page budget and the error log, then hand over the checks — ng build, the Done-when ng test command, git diff --numstat, log-query; start the slot servers and give the Human the [human] cards — this plan file

## Technical Considerations
- Dependencies: `MenuEventDataService`, `MetadataRegistryService` (event-type terms), `ConfirmModalService`,
  `UserService.user_`, `PermissionService` (428), `HeroFabService`, `useListState`.
- New files needed: `event-stage-ui.util.ts` (+spec), `event-pipeline.service.ts` (+spec), components
  `new-inquiry-dialog`, `event-stage-bar`, `event-notes-log`, `not-closed-dialog`.
- Model changes: none — plan 442 S2 adds every C-STAGES field to the client `MenuEvent` model (Step 0 checks).
- Backend / API: none new. Uses plan 442's `/api/v1/events/:id/stage` and `/notes` routes and the generic
  `POST/PUT /api/v1/data/menuEvents` (a PUT is a `$set` merge on the server, so the page's normal save never wipes
  stage, notes or client fields).
- Auth and validation: the server (442 + 427) decides; the client hides/locks by `PermissionService.can`.
  Client-side limits: name ≤ 200, note ≤ 2,000, reason text ≤ 500, phone `^[0-9+\-\s()]{7,20}$`.
- Security surface: new free-text inputs (notes, phone) rendered with Angular interpolation only (no
  `innerHTML`).
- Data / migration: none.
- Lazy loading: all new components are imported by the lazy-loaded `menu-library` and `menu-intelligence` routes —
  no initial-bundle growth (plan 419).
- Project checks: log-query Done-when item; chef-side stories; dictionary keys listed; RTL logical CSS; Lucide icon
  registered; `[human]` checks on phone and desktop.

## Backend Impact
- Collections affected: `menuEvents` (read; written through plan 442's routes and the existing generic route).
- New collections: no.
- Server changes needed: no.

## Contracts (verbatim from the approved map)

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

## Out of Scope
- The stage data, schema, migration 0008 and server routes (plan 442).
- The planning snapshot and the closing dialog opened on entering "פוסט-פרודקשן"; "סיים אירוע" / "פתח מחדש"
  (plan 446). This plan leaves the stage bar's "הסתיים" pill disabled with `stage_finished_hint`.
- The dashboard funnel and the "closed" counting (plan 447).
- Showing events in the Trash page; reminders; a separate customer entity; payment processing.

## Critical Questions
None — all product rules are fixed by spec 09.1 and the Part 4 decisions.
