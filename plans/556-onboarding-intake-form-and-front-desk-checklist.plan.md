# Plan 556 — Onboarding intake form and a front desk checklist for each business type

Status: draft
Depends-on: 550, 553, 554, 567
Snapshot: 05741afd08ec936d1aec6f8d9a53631141905f93

## Problem Statement
Dandan onboards every pilot business by hand, sitting with the owner and typing in the owner's account (brief D4).
Today nothing tells him what is still missing for the front desk, and filling the profile, the knowledge base and
the "before" numbers means visiting three screens. Map row 14 (FD-10): one long, printable intake form per business
type that saves everything in one go, a checklist the server computes, and a "send a test request" button so the
owner sees the whole loop before the link goes out.

Verified on `origin/main` (5702f6d1, 2026-11-10):
- `GET /api/v1/business/setup-status` (`server/routes/business.js:124`) answers `{ pricedProducts, suppliers, recipes, events, staff }`, owner only (`assertCan(req, res, 'editSettings', { type: 'businesses' })`), counts capped at `SETUP_COUNT_CAP = 5`.
- `PUT /api/v1/business/baseline` (`business.js:100`) validates `baselineInputSchema` (`shared/schemas/entities/business.schema.ts:24`) and stores through `setBusinessBaseline`; empty = skipped (plan 431). Plan 567 widens `baselineInputSchema` (kitchen and front desk groups).
- Client: `SetupStatus` in `src/app/core/services/business.service.ts:18`, `loadSetupStatus()` at line 67; `app-setup-checklist-card` (`src/app/pages/dashboard/components/setup-checklist-card/`, 160 lines) is placed in `dashboard-overview.component.html:10`.
- `GET /api/v1/admin/businesses` (`server/routes/admin.js:77`, plan 448) builds one row per business from grouped queries; the platform page is `src/app/pages/platform-dashboard/platform-dashboard.page.*` with `PlatformAdminService` / `BusinessRow`.
- Global print rules: `src/styles.scss:1845` hides `body *` and lists the hosts that stay visible (`app-recipe-builder-page`, `app-menu-intelligence-page`).
- Reusable pieces exist: `app-hours-editor` (`src/app/shared/hours-editor/`), `app-date-field`, `app-custom-select`, `app-custom-multi-select`, `app-form-field`, `app-empty-state`, `app-page-header`, `pendingChangesGuard` (`src/app/core/guards/pending-changes.guard.ts`), `useUnsavedChanges` (`src/app/core/utils/unsaved-changes.ts`).
- Not on `main` yet, built by the plans this one depends on: `frontDeskProfiles` + `templateFor` (548), `requests` manual create (549) and approve (550), `/frontdesk/settings` and the `src/app/pages/frontdesk/` folder (553), `knowledgeItems` (554), the wider baseline (567).

## Goals & Success Criteria
**Primary:** in one sitting Dandan fills one form for a restaurant, a private chef or a catering business, saves once,
and the dashboard checklist shows exactly what is still missing; a test request runs the loop without touching the
client list or the numbers.

- [auto] `pnpm run test:server` passes, including `server/test/front-desk-intake.test.js` and `server/test/front-desk-setup.test.js`.
- [auto] Intake: one `POST /api/v1/business/front-desk-intake` creates the profile from the template of the chosen type, writes the owner fields, creates the draft knowledge items and leaves `status: 'draft'`; a second identical POST creates no new items (`front-desk-intake.test.js`).
- [auto] Intake: a knowledge item already `approved` with the same question is left unchanged and counted in `knowledge.skipped` (`front-desk-intake.test.js`).
- [auto] Intake: with no baseline field filled, the business's `baseline` is unchanged and the answer says `baseline: 'skipped'`; with one field filled it is stored like `PUT /baseline` (D15) (`front-desk-intake.test.js`).
- [auto] Intake: staff → 403; a body with `status`, `whatsapp` or `assistant.level` → 400 (strict schema); another business's profile is never touched (`front-desk-intake.test.js`).
- [auto] Checklist: a table test over restaurant, private chef, catering and other gives the expected `items` keys and `done` flags; restaurant `knowledge_hours` / `knowledge_location` are done from the profile's hours / address, not from items; the checklist never lists a baseline item (D15) (`front-desk-setup.test.js`).
- [auto] Checklist: `GET /setup-status` returns `frontDesk: { businessType: null, items: [], done: 0, total: 0 }` when the business has no profile, and the old five counts unchanged (`front-desk-setup.test.js`).
- [auto] Test request: it is stored with `test: true` and `clientId: '__test__'`, creates no client and changes no client counter; approving it sets `approved`, creates no event or booking and writes no `decisionLog` row (`front-desk-intake.test.js`) — per Critical Question 2's recommended answer.
- [auto] `GET /api/v1/admin/businesses` rows carry `frontDesk: { status, done, total }` for a business with a profile and `null` without one (`front-desk-setup.test.js`).
- [auto] `pnpm run test:ci` passes, including `front-desk-onboarding.component.spec.ts` (form sections change with the business type; the baseline group starts collapsed; save is one call) and `front-desk-checklist-card.component.spec.ts`.
- [ui] Owner opens `/frontdesk/onboarding`, picks "קייטרינג / אירועים", types a display name and a link name, clicks "שמירת הטופס" and sees the toast "הטופס נשמר" (`e2e/ui/556-1.spec.ts`).
- [ui] Owner opens `/dashboard` and sees the card "הכנת לקוחות והזמנות" with a line "{done} מתוך {total}" (`e2e/ui/556-2.spec.ts`).
- [auto] `pnpm run lint`, `pnpm --dir server run lint`, `pnpm run lint:icons` and `pnpm run build` pass.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] Dandan fills the form once for each of the three business types with made-up data and prints it: every Appendix A question has a place, the print fits A4 pages in RTL, and nothing he needs is missing.

## Execution Mode
- Parallel: no — 559 also extends `server/routes/business.js`; 532, 557, 566 and 568 also edit `server/routes/admin.js` and/or the platform dashboard page; 547–555 append to `app.routes.ts`, `app.config.ts`, `dictionary.json`, `styles.scss` (serialise merges).
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
shared/schemas/front-desk-intake.schema.ts
shared/schemas/index.ts
server/routes/business.js
server/routes/admin.js
server/routes/requests.js
shared/schemas/entities/request.schema.ts
server/services/front-desk-setup.js
server/test/front-desk-intake.test.js
server/test/front-desk-setup.test.js
src/app/core/services/business.service.ts
src/app/core/services/platform-admin.service.ts
src/app/pages/frontdesk/frontdesk-onboarding/**
src/app/pages/frontdesk/breadcrumbs.md
src/app/pages/dashboard/components/front-desk-checklist-card/**
src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.html
src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.ts
src/app/pages/platform-dashboard/platform-dashboard.page.html
src/app/pages/platform-dashboard/platform-dashboard.page.ts
src/app/pages/platform-dashboard/platform-dashboard.page.spec.ts
src/app/app.config.ts
public/assets/data/dictionary.json
e2e/ui/556-1.spec.ts
e2e/ui/556-2.spec.ts
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

- INV-1: preserves — the intake route is owner-only (`assertCan` `editFrontDesk`, 548) and scoped to the caller's business through `scopeFilter`; the admin row is read-only for a platform admin; the test-request change stays inside `requests.js`'s existing `manageRequests` check.
- INV-2: preserves — `front-desk-setup.js` reads only through `scopeFilter` / the business id the server knows; no master data is copied.
- INV-3: preserves — profile, knowledge items and baseline are written by the server in one request; the client sends one call.
- INV-4: preserves — the intake body is one strict Zod schema in `shared/schemas`; the server validates it before any write.

## Reuse Check

- `shared/schemas/front-desk-intake.schema.ts` `frontDeskIntakeSchema` — family: none — rung: 4 — why: a new request body; it is built from `.pick` of the 548 profile schema, the 554 item schema and `baselineInputSchema`, no field is redefined.
- `server/services/front-desk-setup.js` `frontDeskSetup` — family: server-auth — rung: 1 — why: uses `scopeFilter` as is; the checklist logic is new and lives in one file so setup-status and the admin row share it.
- `app-front-desk-onboarding` (page component) — family: entity-form — rung: 1 — why: uses `useUnsavedChanges` + `pendingChangesGuard` as is; fields are `app-form-field`, `app-hours-editor`, `app-date-field`, `app-custom-select`, `app-custom-multi-select`.
- `app-front-desk-checklist-card` — family: none — rung: 4 — why: same row shape as `app-setup-checklist-card` (a page-local, unregistered component) but different data and audience; copying its `SetupStep` row markup is cheaper than generalising a 160-line page component.
- Collapse control for the baseline group and the per-type sections — family: chip — rung: 1 — why: `.c-chip c-chip--tap` button with `aria-expanded` (lesson from plan 515), no native `details`.
- Print button and its print rule — family: none — rung: 4 — why: no print family exists; a plain button calling `window.print()` plus one appended `@media print` block in `src/styles.scss` that keeps this page visible, the same way recipe-builder and menu-intelligence already do.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

Also check by symbol that the dependencies landed as their contracts say: `templateFor`, `frontDeskProfileSchema`
(or the 548 name), `editFrontDesk`, `knowledgeItemSchema` (554), `requests.test`, the manual `POST /api/v1/requests`
and `POST /:id/approve` (549/550), `baselineInputSchema`'s 567 fields. A different name is `ok` (use it); a missing
piece is a `conflict`.

## User Stories
- As an owner, I want one sitting with Dandan to leave my front desk ready so that I can publish the link the same week.
- As an owner, I want to see exactly what is still missing so that I know what to finish before going live.
- As a chef running a catering business, I want the form to ask about my event types, serving styles and tastings, not about tables, so that the questions fit my work.
- As an owner, I want to send myself a test request so that I see what a customer's request looks like without adding a fake customer.

## Functional Requirements

### Must Have (P0)
- [ ] Contracts used (copied verbatim from `docs/frontdesk/frontdesk-map.md`):
  - **C-PROFILE (548; used by 553–557, 562)**
    - Collection `frontDeskProfiles`, one per business, owner-only write (`editFrontDesk`; in `OWNER_ONLY_TYPES`), not cloneable, `softDelete: false`.
    - Fields: `businessType` (`restaurant | private_chef | catering | other`), `slug` (`^[a-z0-9-]{3,40}$`, unique index), `displayName`, `logoUrl?`, `phone?`, `address?`, `serviceArea?`, `hours` (same row shape as `venue.operatingHours`), `closedDates?`, `requestKinds: { [kind]: { enabled, questions[≤12]{ key, label, type: text|number|date|time|choice, options?, required }, rules{ minPartySize?, maxPartySize?, minLeadHours?, maxLeadDays?, minBudgetPerGuest?, areas? }, defaultDurationMinutes?, expireAfterHours } }`, `assistant { level: 0|1|2, tone: warm|formal, greeting?, handoffText?, activeHours? }`, `status` (`draft | pilot | active | suspended`, server-owned), `whatsapp? { phoneNumberId, ownerAlertPhone?, ownerAlertOptIn }` (server-only, never sent to the browser in full).
    - `shared/schemas/front-desk-templates.ts` → `templateFor(businessType)`.
    - `shared/front-desk/qualify.ts` → `qualify(kindConfig, wanted, answers) → { verdict: 'fit' | 'borderline' | 'unfit', reasons: string[] }` (reasons = dictionary keys). Pure; used by server and client.
  - **C-REQUEST (excerpt)** — `requests` fields as brief FD-03, plus `test?: boolean` (556; excluded from stats). Server-owned (`REQUEST_SERVER_FIELDS`): `status`, `statusHistory`, `qualification`, `outcome`, `publicToken`, `channel`, `suggested`, `conversationId`. Approve is idempotent: a decided request → 409 `ALREADY_DECIDED`. Action `manageRequests` (any member). `decisionLog` collection (550): `{ requestId, suggestion?, verdict?, decidedAction: 'approve'|'decline'|'ask', decidedBy, editedFields[], secondsToDecision, at }` — no names or phones.
  - **C-KB (554; used by 556, 562)** — Collection `knowledgeItems` (fields as brief FD-05, plus `variations?: string[]` ≤ 5 × 200 chars — other phrasings of the question — and `source` gains `'correction'` for the inbox "fix this answer" loop, R-14); `server/services/knowledge.js` → `publicFacts(db, businessId) → { text: string, factIds: string[] }`, ≤ 6,000 characters; `POST /api/v1/ai/knowledge-import` (`aiLimiter`, ≤ 60 items, all `draft`).
  - **C-NAV (547)** — Section name (Q9): "לקוחות והזמנות"; a request is "בקשה" ("פנייה" keeps meaning an event inquiry). Path prefix `/frontdesk`.
  - Rules: R-15 (test chat — Wave 1b adds it to this page; nothing here), R-19 (**Test and non-public states send nothing:** `test: true` requests and profiles in `draft` / `suspended` never produce an outbound message to a customer.)
- [ ] **Intake body** `shared/schemas/front-desk-intake.schema.ts` (exported through `shared/schemas/index.ts`): `frontDeskIntakeSchema = z.strictObject({ businessType, profile, knowledge, baseline? })` where `profile` is `.pick` of the 548 profile schema for `displayName, slug, logoUrl, phone, address, serviceArea, hours, closedDates, requestKinds` plus `assistant: { tone, greeting?, handoffText? }` (never `level`, `status`, `whatsapp`); `knowledge` = array ≤ 60 of `{ topic, question, answer, visibility }` from the 554 item schema; `baseline` = `baselineInputSchema` (567). Strict: any other key → 400.
- [ ] **Intake route** `POST /api/v1/business/front-desk-intake` in `server/routes/business.js`, `verifyToken`, `assertCan(req, res, 'editFrontDesk', { type: 'frontDeskProfiles' })`. In order, after the whole body validates:
  1. Profile: load the caller's profile; none → create it from `templateFor(businessType)` with `status: 'draft'` (server-set). A missing slug on create → 400 `SLUG_REQUIRED`; a taken slug → 409 `SLUG_TAKEN` (548's index). Then merge the intake `profile` fields over it (`requestKinds` merged per kind: the intake sets `enabled`, `rules` and the event-type question's `options`; template questions stay). `status`, `whatsapp`, `assistant.level` are never written here.
  2. Knowledge: for each item, find a live item of this business with the same `question` text. None → create `{ …item, status: 'draft', source: 'manual' }`. A `draft` match → update its `answer`, `topic`, `visibility`. An `approved` match → leave it, count `skipped`.
  3. Baseline: only when at least one baseline field is present → store exactly as `PUT /baseline` does (reuse `setBusinessBaseline`; `filledAt` server-set). Otherwise do not touch `baseline` (D15).
  - Answer 200 `{ profileId, knowledge: { created, updated, skipped }, baseline: 'saved' | 'skipped' }`. Log `business.front_desk_intake.saved` with the counts only (no text).
- [ ] **Checklist** `server/services/front-desk-setup.js` exports `frontDeskSetup(db, businessId) → { businessType, items: [{ key, done }], done, total }` and the constants `REQUIRED_TOPICS` and `MIN_APPROVED_PER_TOPIC = 1`:
  - `profile_basics`: `displayName`, `slug`, `phone` set, and `address` or `serviceArea` set.
  - `hours`: at least one open day in `hours`.
  - `request_kinds`: at least one enabled kind, and every enabled kind has at least one question.
  - `knowledge_<topic>` for each topic in `REQUIRED_TOPICS[businessType]`: restaurant `hours, location, menu, policy`; private_chef `prices, events, dietary, policy`; catering `events, prices, policy`; other `policy`. Done when the business has ≥ `MIN_APPROVED_PER_TOPIC` live items with `status: 'approved'` and that topic — except restaurant `knowledge_hours` (done = the `hours` item) and `knowledge_location` (done = `address` set), because hours and address come from the profile and are never copied into items (FD-05).
  - `link_published`: profile `status` is `pilot` or `active` (set by the platform admin, plan 557).
  - `test_request`: a live request with `test: true` and `status: 'approved'` exists.
  - No baseline item, ever (D15). No WhatsApp item (Wave 1b adds it).
  - No profile → `{ businessType: null, items: [], done: 0, total: 0 }`.
- [ ] `GET /api/v1/business/setup-status` adds `frontDesk: await frontDeskSetup(db, req.user.businessId)`; the existing five counts are unchanged.
- [ ] `GET /api/v1/admin/businesses` rows gain `frontDesk: { status, done, total } | null`: one `frontDeskProfiles` query for all businesses, then `frontDeskSetup` only for businesses that have a profile (bounded by the profile count; a pilot has 1–3).
- [ ] **Test request (R-19)** in `server/routes/requests.js` (549/550 code), per Critical Question 2 (recommended answer):
  - `manualRequestInputSchema` (549, `shared/schemas/entities/request.schema.ts`) gains `test: z.boolean().optional()`; with `test: true` the body must carry `guestName` + `guestPhone`.
  - `POST /` with `test: true`: skip `upsertClientByPhone` and every client counter / `lastContactAt` update; store `test: true`, `clientId: '__test__'` (549's schema needs a non-empty id; `__test__` is never a real client id) and the given `guestName` / `guestPhone`; `qualify` still runs.
  - `POST /:id/approve` on a `test: true` request: move to `approved` with `statusHistory`, no `outcome`, no `menuEvents` / `bookings` doc, no `decisionLog` row; answer `{ ok: true, request, test: true }`.
  - Decline / ask on a test request: status moves as usual, no `decisionLog` row.
- [ ] **Intake page** `/frontdesk/onboarding` (append a lazy route in `src/app/app.routes.ts`, `authGuard`, `canDeactivate: [pendingChangesGuard]`; component `app-front-desk-onboarding` in `src/app/pages/frontdesk/frontdesk-onboarding/`, beside 553's `frontdesk-settings/`; one row added to `src/app/pages/frontdesk/breadcrumbs.md`). Staff see `app-empty-state` with `onboarding_owner_only`. One reactive form, built with `inject(FormBuilder)`; the business type select (`app-custom-select`, labels `fd_type_*` from 553) at the top shows the shared sections plus that type's section. On first open it fills from the existing profile and the business's draft and approved items (so a second sitting continues). Buttons: "שמירת הטופס" (one POST, toast `onboarding_saved`, the response's `skipped` count shown with `onboarding_knowledge_skipped` when > 0), "הדפסה" (`window.print()`), "שליחת בקשת בדיקה" (below).
- [ ] **Field map** (every Appendix A item; "item" = a knowledge item with the question text from the dictionary key `onboarding_q_<key>`):

  | Section | Field `<key>` | Writes to |
  | --- | --- | --- |
  | Every business — basics | `display_name`, `slug`, `logo_url`, `phone`, `address`, `service_area` | profile fields of the same name |
  | basics | `whatsapp_today` | item, topic `other`, internal |
  | hours | hours rows (`app-hours-editor`), closed dates (`app-date-field` rows) | `hours`, `closedDates` |
  | hours | `holidays_policy` | item, `policy`, public |
  | who answers today | `who_answers`, `channels_today`, `answer_hours` | one item, `other`, internal |
  | FAQ (15 rows: question, answer, topic) | free text | one item per filled row, public |
  | policies | `cancellation`, `deposits`, `minimum_order`, `accessibility`, `parking`, `children`, `pets` | item each, `policy`, public |
  | policies | `kashrut`, `allergens` | item each, `dietary`, public |
  | tone | `tone` (warm / formal), `greeting`, `handoff_text` | `assistant.tone`, `assistant.greeting`, `assistant.handoffText` |
  | tone | `never_say`, `handoff_when` | item each, `other`, internal |
  | approvals | `approver`, `alert_phone` | one item, `other`, internal (Wave 1b moves the phone to `whatsapp.ownerAlertPhone`) |
  | baseline (collapsed, optional) | the 567 fields, kitchen and front desk groups | `baseline` |
  | Restaurant | `max_party_no_call`, `sitting_minutes` | `requestKinds.table.rules.maxPartySize`, `requestKinds.table.defaultDurationMinutes` |
  | Restaurant | `seating`, `menu_link`, `price_range` | item `other` / `menu` / `prices`, public |
  | Restaurant | `busy_hours`, `quiet_hours`, `booking_today` | item each, `other`, internal |
  | Private chef | `consultation_enabled` | `requestKinds.consultation.enabled` |
  | Private chef | `min_guests`, `max_guests`, `min_budget_per_guest`, `lead_hours`, `travel_areas` (comma list) | `requestKinds.event.rules.minPartySize / maxPartySize / minBudgetPerGuest / minLeadHours / areas` (+ `serviceArea` when empty) |
  | Private chef | `services`, `equipment_on_site` | item `events`, public |
  | Private chef | `price_per_guest`, `price_includes`, `travel_fee` | item `prices`, public |
  | Private chef | `sample_menus` / `payment_terms` | item `menu` / `policy`, public |
  | Catering | `event_types` (`app-custom-multi-select` over the business's `eventType` terms) | options of the event kind's event-type question |
  | Catering | `min_guests`, `lead_days` (× 24 → hours), `areas` | `requestKinds.event.rules.minPartySize / minLeadHours / areas` |
  | Catering | `tasting_enabled` | `requestKinds.tasting.enabled` |
  | Catering | `serving_styles`, `tasting_policy`, `staff_equipment` | item `events`, public |
  | Catering | `price_by_style`, `delivery_fees` | item `prices`, public |
  | Catering | `min_order` / `payment_deposit` | item `policy`, public |
  | Catering | venues | a link to `/venues` only (no field) |
  | Other | — | only the shared sections |

  Empty fields write nothing. Appendix A item 9 (existing customer list) follows Critical Question 1.
- [ ] **Baseline group (D15):** collapsed by default (`.c-chip c-chip--tap` with `aria-expanded`), hint `onboarding_baseline_hint`, a "דלג — נמדוד מהיום" chip that clears the group; saving never fails because of it.
- [ ] **Test request button:** calls the manual `POST /api/v1/requests` with `{ kind: <first enabled kind>, test: true, guestName: translate('onboarding_test_guest'), guestPhone: <profile phone>, wanted: { date: <today + 7 days>, partySize: <the kind's minPartySize or 2> }, answers: [] }`; toast `onboarding_test_request_sent`. Disabled until a profile with an enabled kind is saved.
- [ ] **Print:** append to `src/styles.scss` one `@media print` block that keeps `app-front-desk-onboarding` and its subtree visible (the rule at line 1845 hides everything else) and lets collapsed groups print open; the component stylesheet sets A4-friendly spacing and hides the buttons in print.
- [ ] **Checklist card** `app-front-desk-checklist-card` (`src/app/pages/dashboard/components/front-desk-checklist-card/`), placed right after `<app-setup-checklist-card />` in `dashboard-overview.component.html`, owner only (`PermissionService`). Reads `frontDesk` from `loadSetupStatus()` (`SetupStatus` gains `frontDesk`). No profile → one line and a button to `/frontdesk/onboarding` (`frontdesk_setup_start`). Otherwise the title, `frontdesk_setup_progress`, and one row per item (`frontdesk_setup_<key>`), open rows linking to `/frontdesk/onboarding`, `test_request` linking to `/requests`. All done → the card hides itself.
- [ ] **Platform dashboard:** one column `platform_frontdesk_col` showing `{done}/{total}` and the status label (`fd_status_*`, 553) or "—" for `null`.
- [ ] `docs/agent/standards-backend.md` §5: one row for `POST /api/v1/business/front-desk-intake` and a note that setup-status now has `frontDesk`.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL, logical CSS properties only, one long page with titled sections (`app-page-header` + section cards); phone-width friendly because Dandan may type on a tablet beside the owner.
- Dictionary keys (Hebrew values). Reuse what 553 adds: `fd_type_restaurant|private_chef|catering|other` (type select), `fd_display_name` and `fd_slug` + `fd_slug_hint` (instead of `onboarding_q_display_name` / `onboarding_q_slug` below), `fd_status_*` (platform column), `fd_tone_warm|formal`; reuse any other identical key 548, 553 or 554 added instead of duplicating it. New keys:
  - Page: `onboarding_title` "טופס הקמה — לקוחות והזמנות", `onboarding_business_type` "סוג העסק", `onboarding_save` "שמירת הטופס", `onboarding_saved` "הטופס נשמר", `onboarding_save_failed` "שמירת הטופס נכשלה", `onboarding_print` "הדפסה", `onboarding_test_request` "שליחת בקשת בדיקה", `onboarding_test_request_sent` "בקשת בדיקה נשלחה — אפשר לראות אותה בבקשות", `onboarding_test_guest` "בקשת בדיקה", `onboarding_owner_only` "רק בעל העסק ממלא את טופס ההקמה", `onboarding_knowledge_skipped` "{{n}} תשובות כבר מאושרות ולא שונו", `onboarding_venues_link` "המקומות שאתם עובדים איתם — בעמוד המקומות".
  - Sections: `onboarding_sec_basics` "פרטי העסק", `onboarding_sec_hours` "שעות ותאריכים", `onboarding_sec_channels` "מי עונה ללקוחות היום", `onboarding_sec_faq` "שאלות שלקוחות שואלים", `onboarding_sec_policies` "מדיניות", `onboarding_sec_tone` "סגנון התשובות", `onboarding_sec_approvals` "מי מאשר בקשות", `onboarding_sec_restaurant` "פרטי המסעדה", `onboarding_sec_private_chef` "פרטי השירות", `onboarding_sec_catering` "פרטי הקייטרינג", `onboarding_sec_baseline` "מספרים מלפני FoodVibe (לא חובה)", `onboarding_baseline_hint` "הערכה של בעל העסק; אפשר לדלג ולמלא גם אחר כך", `onboarding_baseline_skip` "דלג — נמדוד מהיום".
  - Field labels / item questions `onboarding_q_<key>`: `display_name` "השם שהלקוחות מכירים", `slug` "שם הקישור (אותיות באנגלית, ספרות ומקף)", `logo_url` "קישור ללוגו", `phone` "הטלפון שהלקוחות מתקשרים אליו", `address` "כתובת", `service_area` "אזור שירות", `whatsapp_today` "מספר הווטסאפ שבשימוש היום", `holidays_policy` "מה קורה בחגים?", `who_answers` "מי עונה ללקוחות היום?", `channels_today` "באילו ערוצים?", `answer_hours` "באילו שעות?", `cancellation` "מה מדיניות הביטולים?", `deposits` "האם צריך מקדמה?", `minimum_order` "יש מינימום הזמנה או מינימום אורחים?", `kashrut` "מה הכשרות?", `allergens` "איך אתם מטפלים באלרגנים?", `accessibility` "המקום נגיש?", `parking` "יש חניה?", `children` "מתאים לילדים?", `pets` "אפשר להגיע עם בעלי חיים?", `tone` "איך לענות — חם או רשמי?", `greeting` "משפט פתיחה", `handoff_text` "מה לכתוב כשמעבירים לאדם", `never_say` "מה אסור לומר", `handoff_when` "מתי להעביר לאדם", `approver` "מי מאשר בקשות?", `alert_phone` "לאיזה טלפון לשלוח התראות?", `max_party_no_call` "הקבוצה הגדולה ביותר בלי שיחה", `sitting_minutes` "משך ישיבה רגיל (דקות)", `seating` "מקומות ישיבה — בפנים, בחוץ, בר", `menu_link` "קישור לתפריט", `price_range` "טווח מחירים", `busy_hours` "מתי מלא?", `quiet_hours` "אילו שעות רוצים למלא?", `booking_today` "איך מזמינים היום, ובכמה זה עולה?", `consultation_enabled` "לקבל בקשות לשיחת ייעוץ", `min_guests` "מינימום אורחים", `max_guests` "מקסימום אורחים", `min_budget_per_guest` "מחיר מינימלי לאורח", `lead_hours` "כמה זמן מראש צריך להזמין (שעות)", `lead_days` "כמה ימים מראש צריך להזמין", `travel_areas` "אזורי הגעה (מופרדים בפסיק)", `areas` "אזורי שירות (מופרדים בפסיק)", `services` "אילו שירותים ואיפה?", `equipment_on_site` "איזה ציוד צריך במקום?", `price_per_guest` "מחיר לאורח לפי רמת תפריט", `price_includes` "מה כלול במחיר?", `travel_fee` "דמי נסיעה", `sample_menus` "תפריטים לדוגמה", `payment_terms` "תנאי תשלום", `event_types` "סוגי האירועים שאתם עושים", `tasting_enabled` "לקבל בקשות לטעימה", `serving_styles` "סגנונות הגשה", `tasting_policy` "איך עובדת טעימה — מתי, איפה, כמה עולה, כמה אנשים?", `staff_equipment` "צוות וציוד שאפשר להוסיף", `price_by_style` "מחיר לאורח לפי סגנון הגשה", `delivery_fees` "דמי משלוח לפי אזור", `payment_deposit` "תנאי תשלום ומקדמה", `faq_question` "שאלה", `faq_answer` "תשובה", `faq_topic` "נושא".
  - Checklist: `frontdesk_setup_title` "הכנת לקוחות והזמנות", `frontdesk_setup_start` "להתחלת ההקמה", `frontdesk_setup_progress` "{{done}} מתוך {{total}}", `frontdesk_setup_profile_basics` "פרטי העסק", `frontdesk_setup_hours` "שעות פתיחה", `frontdesk_setup_request_kinds` "סוגי בקשות ושאלות", `frontdesk_setup_knowledge_hours` "מידע: שעות", `frontdesk_setup_knowledge_location` "מידע: מיקום", `frontdesk_setup_knowledge_menu` "מידע: תפריט", `frontdesk_setup_knowledge_policy` "מידע: מדיניות", `frontdesk_setup_knowledge_prices` "מידע: מחירים", `frontdesk_setup_knowledge_events` "מידע: אירועים", `frontdesk_setup_knowledge_dietary` "מידע: כשרות ואלרגנים", `frontdesk_setup_link_published` "הקישור פורסם", `frontdesk_setup_test_request` "בקשת בדיקה אושרה", `platform_frontdesk_col` "לקוחות והזמנות".
- Lucide icons: `clipboard-check` (card title, register `ClipboardCheck` in `src/app/app.config.ts`), `circle-check` and `circle` (row state; register `Circle` — `CircleCheck` is already registered), `printer` and `flask-conical` (already registered), `send` (test request; register `Send`).

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Let the server compute what the front desk still needs, per business type — the checklist service, setup-status frontDesk block, admin row — server/services/front-desk-setup.js, server/routes/business.js, server/routes/admin.js, server/test/front-desk-setup.test.js
- [ ] A2: Save the whole intake form in one request — the strict intake schema and the intake route (profile, knowledge drafts, optional baseline) — shared/schemas/front-desk-intake.schema.ts, shared/schemas/index.ts, server/routes/business.js, server/test/front-desk-intake.test.js
- [ ] A3: Make a test request that adds no customer and creates nothing when approved — the test flag on the manual body, the test branches in create, approve, decline and ask — shared/schemas/entities/request.schema.ts, server/routes/requests.js, server/test/front-desk-intake.test.js
- [ ] A4: Build the intake page with a section for each business type — route, form, field map, baseline group, print rules — src/app/pages/frontdesk/frontdesk-onboarding/**, src/app/pages/frontdesk/breadcrumbs.md, src/app/app.routes.ts, src/styles.scss
- [ ] A5: Add the test-request button and the save, print and skipped-answers messages — src/app/pages/frontdesk/frontdesk-onboarding/**
- [ ] A6: Show the checklist to the owner on the dashboard and to the platform admin — checklist card, SetupStatus type, platform column — src/app/pages/dashboard/components/front-desk-checklist-card/**, src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.html, src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.ts, src/app/core/services/business.service.ts, src/app/core/services/platform-admin.service.ts, src/app/pages/platform-dashboard/platform-dashboard.page.html, src/app/pages/platform-dashboard/platform-dashboard.page.ts
- [ ] A7: Add the words and icons the screens use — dictionary keys, icon registration — public/assets/data/dictionary.json, src/app/app.config.ts
- [ ] A8: Write the two screen checks and the backend docs row, then run every check — e2e/ui/556-1.spec.ts, e2e/ui/556-2.spec.ts, docs/agent/standards-backend.md

## Technical Considerations
- Dependencies: 548 profile schema and `templateFor`, 549/550 requests router, 553 frontdesk page folder, 554 knowledge items, 567 baseline fields.
- New files needed: `shared/schemas/front-desk-intake.schema.ts`, `server/services/front-desk-setup.js`, the onboarding component, the checklist card component, two server tests, two e2e specs.
- Model changes: `SetupStatus.frontDesk`; `BusinessRow.frontDesk`.
- Backend / API: new `POST /api/v1/business/front-desk-intake`; `GET /setup-status` gains `frontDesk`; `GET /admin/businesses` rows gain `frontDesk`; test-request branches in `requests.js`.
- Auth and validation: intake owner-only (`editFrontDesk`), strict Zod body; setup-status keeps `editSettings`; admin row behind `requirePlatformAdmin`.
- Security surface: no new public input; knowledge text is stored as plain text and shown with Angular binding only (never `innerHTML`); the intake log line carries counts, never text or phones.
- Data / migration: none (new documents only).
- Project checks: `[auto] log-query` present; `pnpm run test:server` and `pnpm run test:ci`; dictionary keys and icons named; Reuse Check filled; `[ui]` specs use `signInQa` (`e2e/helpers/qa-session.ts`).

## Out of Scope
- The in-app test chat with the assistant (R-15, Wave 1b).
- A WhatsApp checklist item and `whatsapp.ownerAlertPhone` (Wave 1b).
- Changing the profile `status` (plan 557) or the assistant level (platform admin, D7).
- Editing knowledge items one by one (the knowledge screen, plan 554) and the settings screen (plan 553).
- Importing an existing customer list, unless Critical Question 1 says otherwise.

## Critical Questions
- Q1: Appendix A item 9 says an existing customer list is "imported as clients". Nothing in Wave 1a imports clients. (a) leave it out of this plan — Dandan adds the few important clients by hand at `/clients`, and a later small plan adds a CSV import if the pilot business has a real list — recommended / (b) add a CSV upload to this form that creates clients through `upsertClientByPhone` (`source: 'manual'`) on a new owner-only server route — adds about a day of work and a privacy check. A: a (Human 2026-11-10)
- Q2: What does approving a test request create? (a) nothing — the test request becomes "approved", no event and no booking are made, no decision is logged, so the pipeline, the agenda and the numbers stay clean — recommended / (b) the real event inquiry or booking, which the owner deletes afterwards. A: a (Human 2026-11-10)

## Execution Notes
- Map row 14. Depends-on adds 550 to the map's 553, 554, 567: the test request needs the manual create (549) and approve (550) in `requests.js`, and 553 → 548 does not reach 549/550.
- `MIN_APPROVED_PER_TOPIC = 1` (the brief says "≥ N"); one constant to change after the pilot.
- Platform admin: the new admin row field is read-only and sits behind `requirePlatformAdmin`, the same pattern as plan 448.
