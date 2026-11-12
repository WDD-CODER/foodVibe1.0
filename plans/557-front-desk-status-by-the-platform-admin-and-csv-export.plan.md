# Plan 557 — The platform admin moves a front desk between draft, pilot, active and suspended; the owner exports clients, requests and bookings

Status: draft
Depends-on: 555, 556
Snapshot: 05741afd08ec936d1aec6f8d9a53631141905f93

## Problem Statement
Map row 15 (FD-11). A pilot business's front desk starts in `draft` (plan 548 sets it; the public page answers "not
available", plan 555). Nobody can move it to `pilot` yet: `status` is server-owned and no route writes it. Brief D7
also says the assistant level is switched on per business by the platform admin, and plan 553 shows the level
read-only pointing here. When a business stops, its owner must keep every record and be able to take it away ("can I
take my customers with me?"). This plan adds the one platform-admin route that sets status, assistant level and the
reserved plan field, with a reason kept on the profile; a banner for members of a suspended business; and a CSV export
of clients, requests and bookings for the owner. No billing.

Verified on `origin/main` (5702f6d1, 2026-11-10):
- `server/routes/admin.js`: `GET /businesses` (line 77, plan 448) and `PUT /businesses/:id/internal` (line 134) behind `verifyToken, requirePlatformAdmin`; the internal-flag route is the pattern for a platform-admin write into one business.
- `shared/schemas/entities/business.schema.ts:46` `businessSchema` is a `z.strictObject` (adding `frontDeskPlan` needs a schema line).
- Client: `src/app/pages/platform-dashboard/platform-dashboard.page.*` with `PlatformAdminService` / `BusinessRow` (`src/app/core/services/platform-admin.service.ts`); popups go through `ModalController` (`src/app/core/services/modal-controller.ts`, family modal-controller) and `app-modal-shell`.
- Downloads: only `downloadWorkbook` in `src/app/core/services/excel-workbook.util.ts` (Blob + object URL, xlsx); no CSV helper anywhere in `src/app` or `server/`.
- Not on `main` yet: `frontDeskProfiles` with `PROFILE_SERVER_FIELDS = ['status','whatsapp']` and the generic strip/keep step (548), `fd_status_*` and `fd_assistant_level_*` keys and `src/app/pages/frontdesk/frontdesk-settings/` (553), the public "not available" answer for a draft profile (555), the `frontDesk` field on admin rows (556), `RequestDataService` / `BookingDataService` (549), client `kinds` / `counters` / `doNotContact` (544).
- Gap found in 548's draft: `assistant.level` is not in `PROFILE_SERVER_FIELDS`, so an owner's generic PUT could raise it. This plan closes it (the platform admin is the only writer, D7).

## Goals & Success Criteria
**Primary:** the platform admin moves a business's front desk to `pilot`, `active` or `suspended` and sets its
assistant level, with a reason kept on the profile; a suspended business's public page says "not available" while
its members keep every record and can download it.

- [auto] `pnpm run test:server` passes, including `server/test/front-desk-status.test.js`.
- [auto] A platform admin's `PUT /api/v1/admin/businesses/:id/front-desk` `{ status: 'pilot', reason }` sets the profile's `status` and appends one `adminHistory` row `{ at, by, byName, status, reason }`; `{ assistantLevel: 1, reason }` sets `assistant.level`; `{ plan: 'pilot', reason }` sets `business.frontDeskPlan` (`front-desk-status.test.js`).
- [auto] The route refuses: a business owner who is not a platform admin → 403; no `reason` or a reason over 200 characters → 400; `assistantLevel: 2` → 400; none of `status` / `assistantLevel` / `plan` → 400; unknown business → 404; a business with no profile → 404 `{ error: 'NO_PROFILE' }` (`front-desk-status.test.js`).
- [auto] An owner's generic `PUT /api/v1/data/frontDeskProfiles/:id` cannot change `status`, `assistant.level` or `adminHistory`; a generic POST stores `assistant.level: 0` (`front-desk-status.test.js`).
- [auto] After `suspended`, `GET /api/v1/public/<slug>` answers 200 `{ available: false, displayName }` and `POST /api/v1/public/<slug>/requests` answers 403 `NOT_AVAILABLE` (plan 555's answers for a draft profile) and nothing is written; the owner's `GET /api/v1/data/clients`, `requests` and `bookings` still answer 200 with the records (`front-desk-status.test.js`).
- [auto] `pnpm run test:ci` passes, including `src/app/core/utils/csv.util.spec.ts` (header row, quotes and commas, line breaks inside a cell, a UTF-8 BOM first, Hebrew kept, a cell starting with `=`, `+`, `-` or `@` prefixed with `'`), `data-export-card.component.spec.ts`, `front-desk-status-banner.component.spec.ts` and `front-desk-admin-dialog.component.spec.ts`.
- [ui] Owner opens `/frontdesk/settings`, clicks "ייצוא לקוחות (CSV)" and a file named `clients-<YYYY-MM-DD>.csv` downloads (`e2e/ui/557-1.spec.ts`).
- [auto] `pnpm run lint`, `pnpm --dir server run lint`, `pnpm run lint:icons` and `pnpm run build` pass.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] On `/platform` Dandan moves a test business to "פיילוט" with a reason, then to "מושהה": the row shows each status, the owner sees the suspended banner, and `/book/<slug>` says the page is not available.
- [human] Dandan opens the three CSV files in Excel: Hebrew reads correctly, one row per record, and the columns are the ones listed in this plan.

## Execution Mode
- Parallel: no — 532, 556, 559, 566 and 568 also edit `server/routes/admin.js` and/or the platform dashboard page; 544, 545, 548, 549 and 551 edit `server/routes/generic.js`; 567 edits `business.schema.ts`; 553 owns `frontdesk-settings/**`; 547–556 append to `app.config.ts`, `dictionary.json`.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/breadcrumbs.md
src/app/pages/breadcrumbs.md
src/app/shared/breadcrumbs.md
src/app/core/models/breadcrumbs.md
src/app/core/services/breadcrumbs.md
front-desk-status.test.js
data-export-card.component.spec.ts
front-desk-status-banner.component.spec.ts
front-desk-admin-dialog.component.spec.ts
shared/schemas/front-desk-admin.schema.ts
shared/schemas/index.ts
shared/schemas/entities/front-desk-profile.schema.ts
shared/schemas/entities/business.schema.ts
server/routes/admin.js
server/routes/generic.js
server/test/front-desk-status.test.js
src/app/core/utils/csv.util.ts
src/app/core/utils/csv.util.spec.ts
src/app/core/services/platform-admin.service.ts
src/app/pages/platform-dashboard/platform-dashboard.page.html
src/app/pages/platform-dashboard/platform-dashboard.page.ts
src/app/pages/platform-dashboard/platform-dashboard.page.spec.ts
src/app/pages/platform-dashboard/components/front-desk-admin-dialog/**
src/app/pages/frontdesk/frontdesk-settings/**
src/app/pages/frontdesk/breadcrumbs.md
src/app/shared/front-desk-status-banner/**
src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.html
src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.ts
src/app/app.config.ts
public/assets/data/dictionary.json
docs/brain/component-families.md
docs/agent/standards-backend.md
e2e/ui/557-1.spec.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — only a platform admin (`requirePlatformAdmin`) writes `status`, `assistant.level`, `adminHistory` and `business.frontDeskPlan`, the same way plan 448's `internal` flag is written; members never can (generic strip/keep); the export reads only the caller's own business through the existing generic API.
- INV-2: preserves — the admin route addresses one business by id; nothing is copied between businesses or from `__master__`.
- INV-3: preserves — no cross-document cascade; the admin route writes one profile and, with `plan`, one business doc in the same request; the generic change only keeps two stored fields on profile writes.
- INV-4: preserves — the admin body is a strict Zod schema in `shared/schemas`; the profile and business schemas gain the new fields so every stored document still validates.

## Reuse Check

- `shared/schemas/front-desk-admin.schema.ts` `frontDeskAdminUpdateSchema` — family: none — rung: 4 — why: a new request body; values come from `FRONT_DESK_STATUSES` (548), nothing redefined.
- `src/app/core/utils/csv.util.ts` `toCsv`, `downloadCsv` — family: helpers — rung: 3 — why: a pure helper in `src/app/core/utils/` with a spec, as the family asks; the download step mirrors `downloadWorkbook` (Blob + object URL) for text.
- `app-data-export-card` (in `frontdesk-settings/components/`) — family: none — rung: 4 — why: one card with three buttons; it reads the existing data services, no new service.
- `app-front-desk-status-banner` (`src/app/shared/front-desk-status-banner/`) — family: feedback — rung: 3 — why: a persistent notice shown on two pages, so it is shared; text from the dictionary like every feedback piece; registered in `docs/brain/component-families.md` under feedback.
- `app-front-desk-admin-dialog` + its `ModalController` service — family: modal-controller — rung: 1 — why: `ModalController<Result>` and `app-modal-shell` as is; fields are `app-custom-select` and a `textarea` in `app-form-field`.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

Also check by symbol that the dependencies landed: `PROFILE_SERVER_FIELDS` and the profile strip/keep step in
`generic.js` (548), `fd_status_*` / `fd_assistant_level_*` keys and the `frontdesk-settings` folder (553), the
public "not available" answer (555), `BusinessRow.frontDesk` (556), `RequestDataService` / `BookingDataService`
(549). A different name is `ok` (use it); a missing piece is a `conflict`.

## User Stories
- As the platform admin, I want to move a pilot business from draft to pilot, and suspend it when needed, with the reason written down, so that I know later why each change happened.
- As the platform admin, I want to switch the assistant from drafts-only to answering for one business so that I turn on autonomy only where it was earned.
- As an owner, I want to download my clients, requests and bookings at any time so that my customers stay mine even if I stop using FoodVibe.
- As a chef on a suspended front desk, I want a clear notice that the public link is off so that I am not surprised that no requests come in.

## Functional Requirements

### Must Have (P0)
- [ ] Contracts used (copied verbatim from `docs/frontdesk/frontdesk-map.md`):
  - **C-PROFILE (548; used by 553–557, 562)**
    - Collection `frontDeskProfiles`, one per business, owner-only write (`editFrontDesk`; in `OWNER_ONLY_TYPES`), not cloneable, `softDelete: false`.
    - Fields: `businessType` (`restaurant | private_chef | catering | other`), `slug` (`^[a-z0-9-]{3,40}$`, unique index), `displayName`, `logoUrl?`, `phone?`, `address?`, `serviceArea?`, `hours` (same row shape as `venue.operatingHours`), `closedDates?`, `requestKinds: { [kind]: { enabled, questions[≤12]{ key, label, type: text|number|date|time|choice, options?, required }, rules{ minPartySize?, maxPartySize?, minLeadHours?, maxLeadDays?, minBudgetPerGuest?, areas? }, defaultDurationMinutes?, expireAfterHours } }`, `assistant { level: 0|1|2, tone: warm|formal, greeting?, handoffText?, activeHours? }`, `status` (`draft | pilot | active | suspended`, server-owned), `whatsapp? { phoneNumberId, ownerAlertPhone?, ownerAlertOptIn }` (server-only, never sent to the browser in full).
  - **C-ACTOR (543)** — every server stamp (`createdBy`, `statusHistory[].by/byName`, `decisionLog.decidedBy`) takes its actor only from `actorOf(req)` in `server/utils/actor.js` → `{ userId, name }`; no router reads `req.user` for a stamp directly.
  - **C-PUBLIC (555, excerpt)** — API: `GET /api/v1/public/:slug`, `POST /:slug/requests`, `GET /:slug/requests/:token`, `POST /:slug/requests/:token/cancel`.
  - Brief FD-11 (verbatim): "`suspended`: the public page answers "not available", the webhook stores inbound messages but the assistant is silent and members get a banner; **all data stays readable and exportable** by the owner (CSV export of clients, requests, bookings — also the answer to "can I take my customers with me?")." "Field `business.frontDeskPlan: 'pilot' | 'basic' | 'pro'` is reserved (server-written) so Wave 2 features can check it."
  - Rule R-19: **Test and non-public states send nothing:** `test: true` requests and profiles in `draft` / `suspended` never produce an outbound message to a customer. (Wave 1a sends nothing; plan 560 adds the send guard.)
- [ ] **Contract extension** (the Planner appends it to the map's "Contract extensions (run)" list): `- plan 557 · frontDeskProfiles.adminHistory: [{ at, by, byName, status?, assistantLevel?, plan?, reason }] ≤ 50, server-owned; business.frontDeskPlan written only by the admin route · the reason for every platform-admin change must be kept with the data, not only in logs`.
- [ ] **Schemas:** `front-desk-profile.schema.ts` gains `adminHistory` (optional array ≤ 50 of `z.strictObject({ at: z.number(), by: z.string(), byName: z.string().max(80), status: FRONT_DESK_STATUSES enum optional, assistantLevel: 0|1 optional, plan: 'pilot'|'basic'|'pro' optional, reason: z.string().min(1).max(200) })`) and `PROFILE_SERVER_FIELDS` gains `'adminHistory'`; `business.schema.ts` gains `frontDeskPlan: z.enum(['pilot','basic','pro']).optional()` with a comment "server-written by the platform admin (plan 557)". New `shared/schemas/front-desk-admin.schema.ts` `frontDeskAdminUpdateSchema = z.strictObject({ status?, assistantLevel?: z.union([z.literal(0), z.literal(1)]), plan?, reason: z.string().trim().min(1).max(200) })` refined to need at least one of the three; exported through `shared/schemas/index.ts`.
- [ ] **Generic strip/keep** (`server/routes/generic.js`, in 548's profile step, no second mechanism): on PUT keep the stored `assistant.level` and `adminHistory` (as 548 keeps `status`); on POST force `assistant.level: 0` and drop `adminHistory`.
- [ ] **Admin route** `PUT /api/v1/admin/businesses/:id/front-desk` in `server/routes/admin.js`, `verifyToken, requirePlatformAdmin`: validate the body (400 with `issues` like the other routes); business missing → 404 `{ error: 'Business not found' }`; no profile for it → 404 `{ error: 'NO_PROFILE' }`. One `updateOne` on the profile: `$set` `status` / `assistant.level` / `updatedAt` for the fields given, `$push` `adminHistory` `{ $each: [row], $slice: -50 }` with `by` / `byName` from `actorOf(req)`; when `plan` is given, `$set` `frontDeskPlan` on the business doc. Answer `{ ok: true, status, assistantLevel, plan }`. Log `admin.front_desk.updated` with the business id and the changed fields, never the reason text.
- [ ] **Suspended = not available:** no new public code — 555 already answers "not available" for `draft`; this plan's test pins the same for `suspended`, and that nothing is written.
- [ ] **Platform dashboard:** each row with a profile shows its status (`fd_status_*`) and assistant level (`fd_assistant_level_*`) and a "שינוי" button (`pencil` icon) that opens `app-front-desk-admin-dialog`: status select, level select (0 / 1), plan select (פיילוט / בסיסי / מקצועי, optional), required reason; save → `PlatformAdminService.updateFrontDesk(id, body)` → toast `platform_fd_saved` and the row reloads; a 400 marks the reason field (`serverFieldErrors`); other errors → toast `save_failed`. Escape closes the dialog (one step back).
- [ ] **Banner:** `app-front-desk-status-banner` reads `FrontDeskProfileDataService.profile_()` (548) and shows `fd_suspended_banner` only when `status === 'suspended'`; placed at the top of `dashboard-overview.component.html` and of the `/frontdesk/settings` page; nothing for other statuses.
- [ ] **CSV helper** `src/app/core/utils/csv.util.ts`: `toCsv(columns: { header: string, value: (row: T) => string | number | null | undefined }[], rows: T[]) → string` (RFC 4180 quoting, `\r\n` rows, UTF-8 BOM `﻿` first, a cell whose text starts with `=`, `+`, `-` or `@` gets a leading `'`); `downloadCsv(text, fileName)` (Blob `text/csv;charset=utf-8` + object URL, revoked after the click).
- [ ] **Export card** `app-data-export-card` in `src/app/pages/frontdesk/frontdesk-settings/components/data-export-card/`, owner only (`PermissionService`), placed as the last card of `/frontdesk/settings`: three buttons; each loads through the existing data service (`ClientDataService`, `RequestDataService`, `BookingDataService`), builds the CSV with Hebrew headers from the dictionary, and downloads `clients-<YYYY-MM-DD>.csv`, `requests-<YYYY-MM-DD>.csv`, `bookings-<YYYY-MM-DD>.csv` (today, Asia/Jerusalem). Failure → toast `fd_export_failed`. Columns (live records only, as the generic API returns them):
  - clients: name, phone, email, client type, company name, kinds (joined with `, `), tags, source, first seen (date), last contact (date), requests, bookings, events, no-shows, do-not-contact (כן / empty), marketing consent (כן / לא / empty), notes.
  - requests (rows with `test: true` left out): created (date and time), kind, status, channel, guest name, guest phone, wanted date, wanted time, party size, event type, budget per guest, location, verdict, answers (`label: value` joined with ` | `), outcome (אירוע / הזמנה / empty).
  - bookings: date, time, kind, status, source, guest name, guest phone, party size, duration (minutes), notes.
  Enum values are written with their existing dictionary labels (548/549/553 keys), not raw keys.
- [ ] `docs/agent/standards-backend.md` §5: one row for `PUT /api/v1/admin/businesses/:id/front-desk`. `docs/brain/component-families.md`: the banner under feedback, the CSV helper under helpers. `src/app/pages/frontdesk/breadcrumbs.md`: the export card row.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL; logical CSS properties only; the dialog follows the existing `app-modal-shell` popups; the banner is one line with an icon, amber tone.
- Dictionary keys (Hebrew values; reuse `fd_status_*`, `fd_assistant_level_0` / `_1`, `save_failed` from earlier plans):
  - `fd_suspended_banner` "לקוחות והזמנות מושהה — הקישור הציבורי לא פעיל. כל הנתונים נשארים זמינים לצפייה ולייצוא."
  - `fd_export_title` "ייצוא נתונים", `fd_export_hint` "הנתונים שלכם — אפשר להוריד אותם בכל זמן", `fd_export_clients` "ייצוא לקוחות (CSV)", `fd_export_requests` "ייצוא בקשות (CSV)", `fd_export_bookings` "ייצוא הזמנות (CSV)", `fd_export_failed` "הייצוא נכשל, נסו שוב".
  - CSV headers `fd_csv_<column>`: `name` "שם", `phone` "טלפון", `email` "אימייל", `client_type` "סוג לקוח", `company` "חברה", `kinds` "סוגים", `tags` "תגיות", `source` "מקור", `first_seen` "פעם ראשונה", `last_contact` "קשר אחרון", `requests` "בקשות", `bookings` "הזמנות", `events` "אירועים", `no_shows` "לא הגיעו", `do_not_contact` "לא ליצור קשר", `marketing` "הסכמה לדיוור", `notes` "הערות", `created` "נוצר", `kind` "סוג", `status` "סטטוס", `channel` "ערוץ", `guest_name` "שם הלקוח", `guest_phone` "טלפון הלקוח", `date` "תאריך", `time` "שעה", `party_size` "מספר אורחים", `event_type` "סוג אירוע", `budget` "תקציב לאורח", `location` "מקום", `verdict` "התאמה", `answers` "תשובות", `outcome` "נוצר מזה", `duration` "משך (דקות)", `yes` "כן", `no` "לא", `outcome_event` "אירוע", `outcome_booking` "הזמנה".
  - Platform: `platform_fd_edit` "שינוי", `platform_fd_dialog_title` "לקוחות והזמנות — סטטוס ועוזר", `platform_fd_status` "סטטוס", `platform_fd_level` "רמת העוזר", `platform_fd_plan` "מסלול", `platform_fd_plan_pilot` "פיילוט", `platform_fd_plan_basic` "בסיסי", `platform_fd_plan_pro` "מקצועי", `platform_fd_reason` "סיבה (חובה)", `platform_fd_saved` "השינוי נשמר".
- Lucide icons: `download` and `pencil` (already registered), `circle-pause` for the banner (register `CirclePause` in `src/app/app.config.ts`).

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Let the profile and business keep the admin's changes and reasons — adminHistory, frontDeskPlan, the admin body schema, level and history kept on owner writes — shared/schemas/entities/front-desk-profile.schema.ts, shared/schemas/entities/business.schema.ts, shared/schemas/front-desk-admin.schema.ts, shared/schemas/index.ts, server/routes/generic.js
- [x] A2: Give the platform admin one route to set status, assistant level and plan with a reason — server/routes/admin.js
- [x] A3: Test the route, the owner-write guard and that a suspended page is closed but its data still readable — server/test/front-desk-status.test.js
- [x] A4: Let the platform admin change a business's front desk from the platform page — row status and level, the dialog and its service call — src/app/pages/platform-dashboard/platform-dashboard.page.html, src/app/pages/platform-dashboard/platform-dashboard.page.ts, src/app/pages/platform-dashboard/platform-dashboard.page.spec.ts, src/app/pages/platform-dashboard/components/front-desk-admin-dialog/**, src/app/core/services/platform-admin.service.ts
- [x] A5: Tell members when their front desk is suspended — the shared banner on the dashboard and the settings page — src/app/shared/front-desk-status-banner/**, src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.html, src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.ts, src/app/pages/frontdesk/frontdesk-settings/**
- [x] A6: Let the owner download clients, requests and bookings as files Excel opens in Hebrew — CSV helper and the export card — src/app/core/utils/csv.util.ts, src/app/core/utils/csv.util.spec.ts, src/app/pages/frontdesk/frontdesk-settings/**
- [x] A7: Add the words, icon, registry and docs rows, the download check, and run every check — public/assets/data/dictionary.json, src/app/app.config.ts, docs/brain/component-families.md, docs/agent/standards-backend.md, src/app/pages/frontdesk/breadcrumbs.md, e2e/ui/557-1.spec.ts

## Technical Considerations
- Dependencies: 548 profile schema and strip/keep step, 549 data services, 553 settings page and keys, 555 public "not available", 556 admin row `frontDesk`.
- New files needed: `shared/schemas/front-desk-admin.schema.ts`, `server/test/front-desk-status.test.js`, `src/app/core/utils/csv.util.ts` + spec, the dialog, banner and export card components, `e2e/ui/557-1.spec.ts`.
- Model changes: profile `adminHistory`; business `frontDeskPlan`; `BusinessRow.frontDesk.assistantLevel`.
- Backend / API: new `PUT /api/v1/admin/businesses/:id/front-desk`; generic POST/PUT for profiles keeps `assistant.level` and `adminHistory`. The export uses only existing generic reads.
- Auth and validation: platform admin only (`requirePlatformAdmin`), strict Zod body, reason required; export buttons owner-only on screen, and the generic API already scopes reads to the caller's business.
- Security surface: CSV formula injection guarded in `toCsv`; the export runs in the owner's browser and is never stored on the server; the reason text is kept on the profile, not in logs.
- Data / migration: none (new optional fields).
- Project checks: `[auto] log-query` present; `pnpm run test:server` and `pnpm run test:ci`; dictionary keys and icon named; Reuse Check filled; the `[ui]` spec signs in with `signInQa`.

## Out of Scope
- Payments, invoices, plan limits or any billing screen (brief FD-11).
- The webhook storing messages while suspended, and the outbound send guard (Wave 1b, plans 560 and 562).
- A server-side export endpoint or a scheduled export.
- Exporting events, menus or the kitchen data (they stay in the app; the brief asks for clients, requests and bookings).

## Critical Questions
- none

## Execution Notes
- Map row 15. Depends-on adds 556 to the map's 555: the platform row's `frontDesk` field comes from 556, and the wt-3 lane already runs 556 before 557.
- Plan 555's bridge script `server/scripts/set-front-desk-status.js` stays (e2e setup and local use); the admin route is the in-app way and the only one that keeps a reason.
- Assistant level is set here because brief D7 gives it to the platform admin and plan 553 shows it read-only pointing to this plan.
- Platform admin and INV-1: the write is a platform-admin route into one named business, the pattern of `PUT /admin/businesses/:id/internal` (plan 448); members can never write these fields.

### Builder evidence (round 0)
- `pnpm run build` -> exit 0; `pnpm run lint` / `lint:icons` / `lint:no-native-select` -> exit 0 (0 errors).
- `pnpm run test:server` -> exit 0, 102 files, 1328 tests (incl. `front-desk-status.test.js`).
- `pnpm run test:ci` -> exit 0, 2161 SUCCESS (incl. csv.util, data-export-card, front-desk-status-banner, front-desk-admin-dialog specs).
- breadcrumbs-check, override-check, plan-ledger-check, kit-manifest-check -> exit 0; log-query -> exit 0 (no database configured, skipped).
- `e2e/ui/557-1.spec.ts` written; not run here (needs the running app and QA login); the gate reruns it.
- Not done as written: the row's assistant level (see below); `src/app/pages/frontdesk/breadcrumbs.md` (breadcrumbs-check flags a file outside the seams; the rows went into `src/app/pages/breadcrumbs.md` instead).
- `server/routes/admin.js` list rows are unchanged: `server/test/front-desk-setup.test.js:126` and `server/test/admin-businesses.test.js` pin the exact row shape and are outside the scope, so the table does not show the assistant level; the dialog's level select starts on "ללא שינוי".

### Builder evidence (round 2, fresh builder)
- Round 1 failed only the scope check: `src/app/core/breadcrumbs.md` and `test-results/.last-run.json` were outside the scope. Re-applied the round-0 implementation (5900cfc) from the base f69a1d4 without those two files; `utils/` is already named in core's breadcrumbs, so the csv.util line is not needed (breadcrumbs-check -> exit 0). The Playwright artifact `test-results/.last-run.json` is not committed.
- scope-check --diff=origin/orch/batch-5 -> exit 0, `SCOPE: ok`; kit-manifest-check -> ok, 0 unclassified.
- `pnpm run build`, `pnpm run lint`, `pnpm --dir server run lint`, `lint:icons`, `lint:no-native-select` -> exit 0.
- `pnpm run test:server` -> exit 0, 102 files, 1328 passed; `pnpm run test:ci` -> exit 0, 2161 SUCCESS.
- override-check, plan-ledger-check, breadcrumbs-check -> exit 0; log-query -> exit 0 (no database configured, skipped).
- `e2e/ui/557-1.spec.ts`: not run here; per the Human's answer to ask 557-1, the gate's rerun is the evidence.

### Builder evidence (resume after ask 557-2)
- Per the Human's answer to ask 557-2: `e2e/ui/557-1.spec.ts` is written, not run (needs the running app and the QA login); `npx playwright test e2e/ui/557-1.spec.ts --list` -> exit 0, 1 test listed (compiles). It signs in with `signInQa` and clears profiles in `finally`. The Planner runs it against the served batch branch.
- `pnpm run build`, `pnpm run lint` (0 errors), `pnpm --dir server run lint`, `lint:icons`, `lint:no-native-select` -> exit 0.
- `pnpm run test:ci` -> exit 0, 2161 SUCCESS; `pnpm run test:server` -> exit 0, 102 files, 1328 passed.
- kit-manifest-check -> ok, 0 unclassified; scope-check --diff=origin/orch/batch-5 -> `SCOPE: ok`; override-check, plan-ledger-check, breadcrumbs-check, ci-scope-check -> exit 0; log-query -> exit 0 (no database configured, skipped).
