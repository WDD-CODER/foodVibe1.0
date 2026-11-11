# Plan 548 — Give every business one front desk profile, with a template per business type and the fit rules

Status: done
Depends-on: 545
Snapshot: 05741afd08ec936d1aec6f8d9a53631141905f93

## Problem Statement
The Front Desk program (`docs/frontdesk/frontdesk-map.md`, map row 6, spec FD-04) needs one configuration per
business: what kind of business it is, its public link name, its hours, which request kinds it takes with which
questions and which limits, and the assistant settings. The public page (555), the settings screen (553), the knowledge
base (554), onboarding (556) and later the assistant (562) all read it. The fit rules ("stop wasting time on
irrelevant customers") run without any AI: a pure function that every request goes through (549, 555).

Verified on `origin/main` (5702f6d1, 2026-11-10):
- `build:schemas` = `tsc -p shared/schemas/tsconfig.cjs.json` with `rootDir: "."` and `include: ["./**/*.ts"]` inside `shared/schemas/`, output `server/generated/schemas`. A file under `shared/front-desk/` (outside `shared/schemas/`) is **not** built, so the server could not require it. This plan places the pure code at `shared/schemas/front-desk/` (see Execution Notes: contract path adjusted). The client imports it through the `@schemas/*` path (`tsconfig.json` → `shared/schemas/*`), as `src/app/core/engine/plan-snapshot.ts` already does for `snapshotActionOnStage`.
- Client unit specs run only from `src/**/*.spec.ts` (`tsconfig.spec.json`); pure shared code is tested from the server side (`server/test/*.test.js` against `server/generated/schemas`), like `server/utils/closing-rules.js` uses `snapshotActionOnStage`.
- `shared/schemas/entities/index.ts` `SCHEMA_BY_COLLECTION` drives the server's write validation (`server/middleware/validate.js` `checkStoredDoc` → `server/utils/schema-check.js`).
- `server/utils/permissions.js`: `ACTIONS` (11 incl. `editLogistics`), `OWNER_ONLY_ACTIONS`, `OWNER_ONLY_TYPES = new Set(['clients'])`. Client mirror: `src/app/core/services/permission.service.ts` (`PermissionAction`, `OWNER_ONLY_ACTIONS`).
- `server/constants/collections.js` `COLLECTIONS`; `server/test/cross-business.test.js` requires a `BODY` entry for every `ALL_USER_ENTITY_TYPES` member ("covers every type of ALL_USER_ENTITY_TYPES").
- Opening-hours row shape lives inline in `shared/schemas/entities/venue.schema.ts` `operatingHours` (`{ days, time, dayIndexes?, open?, close? }`).
- The generic POST maps a duplicate-key error to 409 `{ error: 'Entity already exists' }` (`server/routes/generic.js` catch of `err.code === 11000`).
- `TranslationService.translate(key)` returns the key itself when no entry exists, so an owner-typed Hebrew label renders as typed.
- Dictionary sections: new keys go in `general` of `public/assets/data/dictionary.json`.
- Plan 544 adds the "strip server-owned fields on generic POST/PUT" step for `clients` (`CLIENT_SERVER_FIELDS`); this plan follows the same pattern for profiles.

## Goals & Success Criteria
**Primary:** a business owner has exactly one front desk profile, created from the template of their business type,
validated by the shared schema, and every request can be checked against it by one pure, tested function.

- [auto] `pnpm run test:server` passes, including `server/test/front-desk-profile.test.js`, `server/test/qualify.test.js`, `server/test/cross-business.test.js` and `server/test/permissions.test.js`.
- [auto] `server/test/qualify.test.js` holds a table test of at least 20 rows covering restaurant `table`, private chef `consultation` and `event`, catering `event` and `tasting`: each row gives `kindConfig`, `wanted`, `answers`, `ctx` and the exact expected `{ verdict, reasons }`.
- [auto] R-10: a `table` request outside the opening hours returns `unfit` with the reason `fd_reason_outside_hours|open=12:00;close=23:00` (the allowed window), and a request too soon returns `fd_reason_too_soon|hours=48` (`server/test/qualify.test.js`).
- [auto] Each of the 4 templates (`restaurant`, `private_chef`, `catering`, `other`), with `slug` and `displayName` filled, passes `frontDeskProfileSchema`, and every question `label` and option in them is a key present in `dictionary.json` `general` (`server/test/qualify.test.js`).
- [auto] Owner `POST /api/v1/data/frontDeskProfiles` → 201 with `status: 'draft'` even when the body sends `status: 'active'`; a later generic `PUT` sending `status` or `whatsapp` leaves both as stored (`server/test/front-desk-profile.test.js`).
- [auto] Staff `POST`, `PUT` and `DELETE` on `frontDeskProfiles` → 403, nothing stored (`server/test/front-desk-profile.test.js`).
- [auto] A second profile in the same business → 409 `{ error: 'PROFILE_EXISTS' }`; a slug another business uses → 409 `{ error: 'SLUG_TAKEN' }`; slug `AB` or `has space` → 400 (`server/test/front-desk-profile.test.js`).
- [auto] No read of a profile (owner or staff, list or by id) returns `whatsapp.phoneNumberId` (`server/test/front-desk-profile.test.js`).
- [auto] `src/app/core/services/permission.service.spec.ts`: staff `can('editFrontDesk')` is false, owner true — `pnpm run test:ci` passes.
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/548-front-desk-profile-per-business-with-templates-and-qualification.plan.md` exits 0.
- [auto] `pnpm --dir server run lint` exits 0 and `pnpm run build` passes.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] Dandan reads the three templates' Hebrew questions and starting limits (rendered list in the plan's Execution Notes after A3) and says they fit a catering business, a private chef and a restaurant.

## Execution Mode
- Parallel: no — 543, 544, 548, 549, 550 all edit `server/utils/permissions.js` and/or `server/constants/collections.js` (map: sequential in wt-1).
- Concurrent plans: none in its lane. UI plans append to `dictionary.json` too (append-only; serialise merges).
- Isolated DB: no — a new collection, no migration (indexes are created at startup in `server/db.js`).

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
shared/schemas/entities/front-desk-profile.schema.ts
shared/schemas/entities/common.schema.ts
shared/schemas/entities/venue.schema.ts
shared/schemas/entities/index.ts
shared/schemas/front-desk-templates.ts
shared/schemas/front-desk/**
shared/schemas/index.ts
server/constants/collections.js
server/utils/permissions.js
server/routes/generic.js
server/db.js
server/test/front-desk-profile.test.js
server/test/qualify.test.js
server/test/cross-business.test.js
server/test/permissions.test.js
src/app/core/models/front-desk-profile.model.ts
src/app/core/services/front-desk-profile-data.service.ts
src/app/core/services/front-desk-profile-data.service.spec.ts
src/app/core/services/permission.service.ts
src/app/core/services/permission.service.spec.ts
public/assets/data/dictionary.json
docs/agent/standards-backend.md
src/app/core/services/breadcrumbs.md
src/app/core/models/breadcrumbs.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — profiles are business-scoped through the generic API (`scopeFilter`, `stampNew`); writes are owner-only through `OWNER_ONLY_TYPES` and the new owner-only action `editFrontDesk`; staff read, never write.
- INV-2: preserves — `frontDeskProfiles` is not cloneable (no `_masterId`), so no master copy and no sync; every query stays business-scoped through `server/utils/business-scope.js`.
- INV-3: preserves — the generic API changes one profile document per request; no cross-document cascade.
- INV-4: preserves — the profile shape is one Zod schema in `shared/schemas`, registered in `SCHEMA_BY_COLLECTION`, so the server validates every write; templates and `qualify` are shared code the server builds through `build:schemas`.

## Reuse Check

- `frontDeskProfileSchema` (`shared/schemas/entities/front-desk-profile.schema.ts`) — family: none — rung: 4 — why: a new entity; follows `standards-backend.md` §3 like `client.schema.ts`.
- `operatingHoursRowSchema` (`shared/schemas/entities/common.schema.ts`) — family: none — rung: 4 — why: schemas have no registry family; extracted from the inline row in `venue.schema.ts` so venues and profiles share one hours shape (contract: "same row shape as `venue.operatingHours`").
- `templateFor` (`shared/schemas/front-desk-templates.ts`) — family: none — rung: 4 — why: no template mechanism exists; pure data.
- `qualify`, `parseReason`, `hoursCheck` (`shared/schemas/front-desk/qualify.ts`) — family: none — rung: 4 — why: no rule engine exists; pure function shared by server and client.
- `jerusalemEpoch` (`shared/schemas/front-desk/local-time.ts`) — family: none — rung: 4 — why: server `jerusalemDate` (`server/middleware/usage.js`) formats a date only; nothing turns a local date + time into an epoch, which lead-time rules and bookings (550) need.
- `FrontDeskProfileDataService` — family: entity-data-service — rung: 1 — why: extends the existing `BaseEntityDataService` as is, like `ClientDataService`.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As an owner of a catering business, I want my front desk to start from questions that fit catering so that onboarding takes minutes, not an afternoon.
- As an owner, I want every request checked against my limits (guests, budget, notice, area, hours) so that I stop spending time on customers I cannot serve.
- As a host, I want to see why a request does not fit, with the allowed window, so that I can answer the customer at once.

## Functional Requirements

### Must Have (P0)
- [ ] Contract copied verbatim from `docs/frontdesk/frontdesk-map.md` (frozen):
  **C-PROFILE (548; used by 553–557, 562)**
  - Collection `frontDeskProfiles`, one per business, owner-only write (`editFrontDesk`; in `OWNER_ONLY_TYPES`), not cloneable, `softDelete: false`.
  - Fields: `businessType` (`restaurant | private_chef | catering | other`), `slug` (`^[a-z0-9-]{3,40}$`, unique index), `displayName`, `logoUrl?`, `phone?`, `address?`, `serviceArea?`, `hours` (same row shape as `venue.operatingHours`), `closedDates?`, `requestKinds: { [kind]: { enabled, questions[≤12]{ key, label, type: text|number|date|time|choice, options?, required }, rules{ minPartySize?, maxPartySize?, minLeadHours?, maxLeadDays?, minBudgetPerGuest?, areas? }, defaultDurationMinutes?, expireAfterHours } }`, `assistant { level: 0|1|2, tone: warm|formal, greeting?, handoffText?, activeHours? }`, `status` (`draft | pilot | active | suspended`, server-owned), `whatsapp? { phoneNumberId, ownerAlertPhone?, ownerAlertOptIn }` (server-only, never sent to the browser in full).
  - `shared/schemas/front-desk-templates.ts` → `templateFor(businessType)`.
  - `shared/front-desk/qualify.ts` → `qualify(kindConfig, wanted, answers) → { verdict: 'fit' | 'borderline' | 'unfit', reasons: string[] }` (reasons = dictionary keys). Pure; used by server and client.
- [ ] Schema `shared/schemas/entities/front-desk-profile.schema.ts`: exports `BUSINESS_TYPES = ['restaurant','private_chef','catering','other']`, `FRONT_DESK_STATUSES = ['draft','pilot','active','suspended']`, `QUESTION_TYPES = ['text','number','date','time','choice']`, `ASSISTANT_TONES = ['warm','formal']`, `PROFILE_SERVER_FIELDS = ['status','whatsapp']`, `requestKindConfigSchema`, `frontDeskProfileSchema` (`z.strictObject({ ...baseDocShape, … })`). Limits: `displayName` = `nameField`; `logoUrl` ≤ 500; `phone` ≤ 30; `address`, `serviceArea` ≤ 200; `closedDates` ≤ 100 × `YYYY-MM-DD`; `requestKinds` keys = the request kinds `table | event | tasting | consultation` (use `z.record(z.enum([...]), requestKindConfigSchema)` — the enum is defined here as `FRONT_DESK_REQUEST_KINDS` and plan 549's `REQUEST_KINDS` must equal it; 549 imports it); question `key` `^[a-z0-9_]{1,40}$`, `label` ≤ 120, `options` ≤ 20 × 80; `rules.areas` ≤ 30 × 80; `expireAfterHours` int 1–720; `defaultDurationMinutes` int 15–1440; `assistant.greeting`, `handoffText` ≤ 400; `assistant.level` default `0` (D7); `status` default `'draft'`. Exported type `FrontDeskProfile`, registered as `frontDeskProfiles` in `SCHEMA_BY_COLLECTION` and re-exported from `shared/schemas/entities/index.ts`.
- [ ] `shared/schemas/entities/common.schema.ts` gains and exports `operatingHoursRowSchema` and its type `OperatingHoursRow` (the exact row now inline in `venue.schema.ts`: `{ days, time, dayIndexes?: 0–6[], open?: 'HH:mm', close?: 'HH:mm' }` — plan 559 relies on this name and location); `venue.schema.ts` uses it (`operatingHours: z.array(operatingHoursRowSchema).optional()`) with no shape change. The profile uses it for `hours` and `assistant.activeHours`.
- [ ] Templates `shared/schemas/front-desk-templates.ts`: `templateFor(businessType)` returns a fresh profile body without `slug`, `displayName` and base fields (`status: 'draft'`, `assistant: { level: 0, tone: 'warm' }`, `hours: []`). Also exports `WANTED_QUESTION_KEYS = { date: 'date', time: 'time', party_size: 'partySize', event_type: 'eventTypeKey', budget_per_guest: 'budgetPerGuest', location: 'location' }` — a question whose key is listed fills that `wanted` field; any other question goes to `answers` (used by 549, 552, 555). Labels and options are dictionary keys. Starting values (the owner edits them in 553; Dandan checks them in the `[human]` item):
  - `restaurant` → `table` enabled: `date` (date, required, `fd_q_date`), `time` (time, required, `fd_q_time`), `party_size` (number, required, `fd_q_party_size`), `seating` (choice `fd_opt_inside | fd_opt_outside | fd_opt_bar`, `fd_q_seating`), `occasion` (text, `fd_q_occasion`); rules `{ maxPartySize: 12, minLeadHours: 2, maxLeadDays: 60 }`; `defaultDurationMinutes: 120`; `expireAfterHours: 4`.
  - `private_chef` → `consultation` enabled: `date`, `time` (required), `topic` (text, `fd_q_topic`); rules `{ minLeadHours: 24, maxLeadDays: 90 }`; `defaultDurationMinutes: 30`; `expireAfterHours: 24`. `event` enabled: `date` (required), `party_size` (number, required, `fd_q_guests`), `location` (text, required, `fd_q_location`), `kitchen_on_site` (choice `fd_opt_yes | fd_opt_no`, `fd_q_kitchen_on_site`), `dietary` (text, `fd_q_dietary`), `budget_per_guest` (number, `fd_q_budget_per_guest`); rules `{ minPartySize: 2, maxPartySize: 40, minLeadHours: 72, maxLeadDays: 365 }`; `expireAfterHours: 48`.
  - `catering` → `event` enabled: `date` (required), `party_size` (number, required, `fd_q_guests`), `event_type` (choice, required, `fd_q_event_type`, `options: []` — the screens fill the options from the business's `eventType` taxonomy terms, 553/555), `location` (text, `fd_q_venue`), `serving_style` (choice `fd_opt_buffet | fd_opt_plated | fd_opt_cocktail`, `fd_q_serving_style`), `budget_per_guest` (number, `fd_q_budget_per_guest`); rules `{ minPartySize: 30, minLeadHours: 336, maxLeadDays: 540 }`; `expireAfterHours: 72`. `tasting` enabled: `date`, `time` (required), `party_size` (number, required, `fd_q_people`); rules `{ maxPartySize: 6, minLeadHours: 48, maxLeadDays: 120 }`; `defaultDurationMinutes: 60`; `expireAfterHours: 48`.
  - `other` → `consultation` enabled with the private-chef consultation questions and rules.
- [ ] `shared/schemas/front-desk/local-time.ts`: `jerusalemEpoch(date: 'YYYY-MM-DD', time: 'HH:mm') → number` (epoch ms of that wall time in `Asia/Jerusalem`, DST-correct through `Intl.DateTimeFormat`), and `weekdayOf(date) → 0–6` (Sunday = 0, from the calendar date, no time zone).
- [ ] `shared/schemas/front-desk/qualify.ts`: `qualify(kindConfig, wanted, answers, ctx = {})` with `ctx: { now?: number, hours?: OperatingHoursRow[], closedDates?: string[], kind?: RequestKind }` (the 4th argument is an additive extension — see Execution Notes). Pure, no I/O, deterministic order. Reasons are `<dictionary key>` or `<dictionary key>|<name>=<value>[;<name>=<value>]`, each ≤ 80 chars, at most 8 (extra ones dropped after the 8th, in the order below). `parseReason(reason) → { key, params }` is exported for the screens. Checks, in this order:
  1. `kindConfig.enabled` false → `unfit`, `fd_reason_kind_disabled`.
  2. Each `required` question with no value (a `WANTED_QUESTION_KEYS` question is read from `wanted`, others from `answers` by `questionKey`) → `fd_reason_missing_answer|q=<key>`.
  3. `partySize` < `minPartySize` → `fd_reason_party_too_small|min=<n>`; > `maxPartySize` → `fd_reason_party_too_large|max=<n>`.
  4. `budgetPerGuest` < `minBudgetPerGuest` → `fd_reason_budget_low|min=<n>`.
  5. `areas` set and `location` given: no area is a case-insensitive substring of `location` → `fd_reason_out_of_area`.
  6. `date` in `ctx.closedDates` → `fd_reason_closed_date`.
  7. Kinds `table | tasting | consultation` only (an `event` happens at the customer's place and time): rows of `ctx.hours` that carry `dayIndexes` + `open` + `close` are checked — no row for the date's weekday → `fd_reason_closed_day|days=<sorted open dayIndexes, comma-joined>`; a `time` outside every row of that weekday → `fd_reason_outside_hours|open=<HH:mm>;close=<HH:mm>` (the first matching row). Rows without those fields are not checked (free-text hours).
  8. With `ctx.now`: start = `jerusalemEpoch(date, time ?? '12:00')`; start − now < `minLeadHours` → `fd_reason_too_soon|hours=<n>`; start − now > `maxLeadDays` → `fd_reason_too_far|days=<n>`.
  The hours check of step 7 is its own exported pure function, reused by later plans (559 reads it for "after hours"): `hoursCheck(hours: OperatingHoursRow[], date: string, time?: string) → { ok: true } | { ok: false, reason: 'closed_day', openDays: number[] } | { ok: false, reason: 'outside_hours', open: string, close: string } | { ok: true, unchecked: true }` (`unchecked` when no row carries `dayIndexes` + `open` + `close`). `qualify` step 7 calls it and turns the result into the two reasons above.
  Verdict: `unfit` when check 1, 5, 6, 7 or 8 gave a reason, or check 3 / 4 missed its limit by more than 10 % (e.g. 45 guests for a max of 40); otherwise `borderline` when any reason exists (missing answers, or a party size / budget within 10 % of its limit, e.g. 42 for 40); no reason → `fit`. A rule whose input is missing is skipped (only the `required` check reports missing data).
- [ ] Collection: `server/constants/collections.js` entry `{ name: 'frontDeskProfiles', userData: true, cloneable: false, backup: true, searchable: false, softDelete: false }` with a one-line comment (plan 548, C-PROFILE). `docs/agent/standards-backend.md` §1 registry row.
- [ ] Permissions: `server/utils/permissions.js` adds `editFrontDesk` to `ACTIONS` and `OWNER_ONLY_ACTIONS`, and `frontDeskProfiles` to `OWNER_ONLY_TYPES`; the client mirror `permission.service.ts` adds `'editFrontDesk'` to `PermissionAction` and `OWNER_ONLY_ACTIONS` (and fixes its "10 actions" comment).
- [ ] Generic API (`server/routes/generic.js`), same pattern 544 uses for `CLIENT_SERVER_FIELDS`:
  - POST `frontDeskProfiles`: strip `PROFILE_SERVER_FIELDS` from the body, set `status: 'draft'`; before insert, a live profile of the business already exists → 409 `{ error: 'PROFILE_EXISTS' }`; a duplicate-key error on the slug index → 409 `{ error: 'SLUG_TAKEN', messageKey: 'fd_slug_taken' }`.
  - PUT: `status` and `whatsapp` keep their stored values; a slug clash → 409 `SLUG_TAKEN`.
  - Every read (list, by id): projection excludes `whatsapp.phoneNumberId` for every caller (merged with the staff projection).
- [ ] Indexes (`server/db.js`): `frontDeskProfiles` `{ slug: 1 }` unique (`name: 'frontdesk_slug_unique'`) and `{ businessId: 1 }` unique (`name: 'frontdesk_business_unique'`).
- [ ] Client: `src/app/core/models/front-desk-profile.model.ts` re-exports the schema's constants and the `FrontDeskProfile` type (pattern: `client.model.ts`); `src/app/core/services/front-desk-profile-data.service.ts` `FrontDeskProfileDataService extends BaseEntityDataService<FrontDeskProfile>` (entity `frontDeskProfiles`, deferred load, `errorEvent: 'crud.frontDeskProfiles.hydrate_error'`) with `profile_` (computed: the business's one profile or `null`), `createFromTemplate(businessType, slug, displayName)` (posts `templateFor(type)` + the two fields) and `save(profile)`.
- [ ] Tests: `server/test/front-desk-profile.test.js` (owner create, status forced to draft, PUT keeps `status`/`whatsapp`, staff 403 ×3, `PROFILE_EXISTS`, `SLUG_TAKEN` across businesses, bad slug 400, no `phoneNumberId` in reads); `server/test/qualify.test.js` (≥ 20-row table, R-10 window reasons, templates validate, labels are dictionary keys, `jerusalemEpoch` on a winter and a summer date); `server/test/cross-business.test.js` `BODY.frontDeskProfiles`; `server/test/permissions.test.js` (`editFrontDesk` owner-only, `frontDeskProfiles` owner-only type); `front-desk-profile-data.service.spec.ts` (`profile_` and `createFromTemplate` body); `permission.service.spec.ts`.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- No screen in this plan (the settings screen is 553). The template questions and the qualification reasons need their Hebrew now, because the stored templates and reasons are dictionary keys.
- Dictionary keys (`general`, append-only): `fd_q_date` "תאריך", `fd_q_time` "שעה", `fd_q_party_size` "מספר סועדים", `fd_q_guests` "מספר אורחים", `fd_q_people` "מספר משתתפים", `fd_q_seating` "העדפת ישיבה", `fd_opt_inside` "בפנים", `fd_opt_outside` "בחוץ", `fd_opt_bar` "בר", `fd_q_occasion` "יש סיבה למסיבה?", `fd_q_topic` "במה נוכל לעזור?", `fd_q_location` "איפה יתקיים האירוע?", `fd_q_kitchen_on_site` "יש מטבח במקום?", `fd_opt_yes` "כן", `fd_opt_no` "לא", `fd_q_dietary` "העדפות ומגבלות תזונה", `fd_q_budget_per_guest` "תקציב לאורח (₪)", `fd_q_event_type` "סוג האירוע", `fd_q_venue` "מקום האירוע (אולם או כתובת)", `fd_q_serving_style` "סגנון הגשה", `fd_opt_buffet` "מזנון", `fd_opt_plated` "הגשה לשולחן", `fd_opt_cocktail` "קוקטייל", `fd_reason_kind_disabled` "סוג הבקשה הזה לא זמין כרגע", `fd_reason_missing_answer` "חסר: {q}", `fd_reason_party_too_small` "פחות מהמינימום — לפחות {min}", `fd_reason_party_too_large` "יותר מהמקסימום — עד {max}", `fd_reason_budget_low` "תקציב נמוך מהמינימום — לפחות {min} ₪ לאורח", `fd_reason_out_of_area` "מחוץ לאזור השירות", `fd_reason_closed_date` "העסק סגור בתאריך הזה", `fd_reason_closed_day` "העסק סגור ביום הזה — פתוח בימים: {days}", `fd_reason_outside_hours` "מחוץ לשעות הפעילות — {open}–{close}", `fd_reason_too_soon` "מוקדם מדי — צריך לפחות {hours} שעות מראש", `fd_reason_too_far` "רחוק מדי — עד {days} ימים מראש", `fd_slug_taken` "השם הזה לקישור כבר תפוס".
- Icons: none.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Define the front desk profile shape once and share the opening-hours row with venues — schema, constants, hours row extracted, registry entry, types — shared/schemas/entities/front-desk-profile.schema.ts, shared/schemas/entities/common.schema.ts, shared/schemas/entities/venue.schema.ts, shared/schemas/entities/index.ts
- [x] A2: Write the pure fit rules and the local-time helper, with a table test of twenty or more cases — qualify, parseReason, hoursCheck, jerusalemEpoch, weekdayOf — shared/schemas/front-desk/qualify.ts, shared/schemas/front-desk/local-time.ts, server/test/qualify.test.js
- [x] A3: Add the starting templates for restaurant, private chef, catering and other, with their Hebrew labels — templateFor, WANTED_QUESTION_KEYS, dictionary keys; paste the rendered Hebrew question list into Execution Notes for Dandan — shared/schemas/front-desk-templates.ts, shared/schemas/index.ts, public/assets/data/dictionary.json
- [x] A4: Store profiles: one per business, owner-only, status and WhatsApp id kept by the server — collection entry, editFrontDesk, OWNER_ONLY_TYPES, generic strip and keep, 409 codes, read projection, indexes — server/constants/collections.js, server/utils/permissions.js, server/routes/generic.js, server/db.js
- [x] A5: Test the stored profile end to end and keep tenant isolation covered — server/test/front-desk-profile.test.js, server/test/cross-business.test.js, server/test/permissions.test.js
- [x] A6: Give the app a profile data service and the new permission in its mirror — model, data service + spec, permission service + spec — src/app/core/models/front-desk-profile.model.ts, src/app/core/services/front-desk-profile-data.service.ts, src/app/core/services/front-desk-profile-data.service.spec.ts, src/app/core/services/permission.service.ts, src/app/core/services/permission.service.spec.ts
- [x] A7: Record the new collection and run every check — standards-backend §1 row; test:server, test:ci, server lint, build, scope-check --arch, log-query — docs/agent/standards-backend.md

## Technical Considerations
- Dependencies: generic API, permissions, the schema package build; plan 544's server-field strip in `generic.js` (follow its pattern, do not add a second mechanism).
- New files needed: `front-desk-profile.schema.ts`, `front-desk-templates.ts`, `front-desk/qualify.ts`, `front-desk/local-time.ts`, the two server tests, the client model, data service and spec.
- Model changes: new `FrontDeskProfile`; `Venue.operatingHours` keeps its shape through the shared row schema.
- Backend / API: no new route; `frontDeskProfiles` through `/api/v1/data/:type` with new 409 codes `PROFILE_EXISTS`, `SLUG_TAKEN`.
- Auth and validation: owner-only writes (type + action); Zod validates every write; `status` and `whatsapp` cannot be set by any browser write in this plan (557 sets status through an admin route, 560/564 set `whatsapp`).
- Security surface: `whatsapp.phoneNumberId` (the business-routing id) never leaves the server; the slug becomes public in 555 — the regex keeps it URL-safe.
- Data / migration: none (new collection, startup indexes).
- Project checks: log-query item, Reuse Check, dictionary keys named, no icons, stories written.

## Out of Scope
- The settings screen, the public link copy button and the event-type options filled from taxonomy (553).
- Public reads of a profile by slug (555), status changes by the platform admin (557), WhatsApp fields being set (560, 564).
- Requests and their use of `qualify` (549).
- AI: none in this plan.

## Critical Questions
- none

## Execution Notes
- Contract path adjusted: C-PROFILE says `shared/front-desk/qualify.ts`; `build:schemas` builds only `shared/schemas/**` (rootDir), so the file is `shared/schemas/front-desk/qualify.ts`. Signature kept; one optional 4th argument `ctx` added (lead-time and hours rules need the current time and the profile's hours, which `kindConfig` does not carry). Reason format `key|name=value;…` carries R-10's allowed window. For the map's "Contract extensions (run)": `- plan 548 · qualify lives at shared/schemas/front-desk/qualify.ts; 4th arg ctx { now?, hours?, closedDates?, kind? }; reasons may carry params "key|a=1;b=2" (parseReason) · build:schemas rootDir + R-10`.
- `FRONT_DESK_REQUEST_KINDS` is defined here (the profile needs the kind keys first); plan 549's `REQUEST_KINDS` re-exports it so the two lists cannot drift.
- `whatsapp` read rule: only `phoneNumberId` is hidden on reads (it routes inbound messages to a business); `ownerAlertPhone` / `ownerAlertOptIn` stay readable by members so 553/564 can show them. Writes of the whole `whatsapp` block stay server-only here.
- Verdict rule (fit / borderline / unfit with the 10 % margin) and the starting limits are this plan's defaults; the owner changes limits per business in 553. Dandan's `[human]` check covers the Hebrew and the numbers.
- Evidence (builder, round 0): `pnpm run build:schemas` -> 0; `pnpm run build` -> 0; `pnpm run lint` -> 0 (0 errors); `pnpm run test:server` -> 0, 80 files / 1025 tests pass (incl. front-desk-profile, qualify (36-row table), cross-business, permissions); `pnpm run test:ci` -> 0, 1892 of 1892 SUCCESS; `pnpm --dir server run lint` -> 0; scope-check --arch, kit-manifest-check, override-check, lint:icons, lint:no-native-select, plan-ledger-check, ci-scope-check, log-query -> 0.
- Indexes are partial on `slug` (string): a raw fixture doc without a slug (server/test/admin-business.test.js inserts two docs per business into every user-data collection) would otherwise break startup; every real profile has a slug (schema-required).
- `requestKinds` uses `z.partialRecord` (zod 4: `z.record(enum)` is exhaustive and would demand all four kinds).
- `breadcrumbs-check` reports `not mentioned: front-desk-profile-data.service.ts` and `front-desk-profile.model.ts` (src/app/core/services/breadcrumbs.md and src/app/core/models/breadcrumbs.md are outside the scope).
- Rendered templates for Dandan ([human] item): restaurant / table: תאריך*, שעה*, מספר סועדים*, העדפת ישיבה (בפנים/בחוץ/בר), יש סיבה למסיבה?; עד 12 סועדים, 2 שעות מראש, עד 60 יום, 120 דק', תוקף 4 שעות. private_chef / consultation (also `other`): תאריך*, שעה*, במה נוכל לעזור?; 24 שעות מראש, עד 90 יום, 30 דק', תוקף 24 שעות; event: תאריך*, מספר אורחים*, איפה יתקיים האירוע?*, יש מטבח במקום? (כן/לא), העדפות ומגבלות תזונה, תקציב לאורח (₪); 2-40 אורחים, 72 שעות מראש, עד 365 יום, תוקף 48 שעות. catering / event: תאריך*, מספר אורחים*, סוג האירוע* (מהטקסונומיה), מקום האירוע (אולם או כתובת), סגנון הגשה (מזנון/הגשה לשולחן/קוקטייל), תקציב לאורח (₪); מינימום 30 אורחים, 336 שעות מראש, עד 540 יום, תוקף 72 שעות; tasting: תאריך*, שעה*, מספר משתתפים*; עד 6, 48 שעות מראש, עד 120 יום, 60 דק', תוקף 48 שעות. (* = חובה)
