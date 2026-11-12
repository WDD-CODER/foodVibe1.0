# Plan 553 — Front desk settings: one screen where the owner sets up how customers reach the business

Status: draft
Depends-on: 548, 547
Snapshot: 05741afd08ec936d1aec6f8d9a53631141905f93

## Problem Statement
Front Desk map row 11 (FD-04 UI). Plan 548 adds the `frontDeskProfiles` collection, the three business-type templates
and `qualify()`. Nobody can see or edit that profile yet. Dandan fills it with the owner at the onboarding sitting
(D4: in the owner's account), and the public page (555), the requests queue (552) and onboarding (556) read it. This
plan builds `/frontdesk/settings`, the one screen that creates the profile from a template and edits it.

Verified on `origin/main` (5702f6d1, 2026-11-10):
- No `src/app/pages/frontdesk/` folder and no `frontdesk/*` route. The route list in `src/app/app.routes.ts` uses flat lazy entries with `canActivate: [authGuard]` and `canDeactivate: [pendingChangesGuard]` (for example `settings`, lines ~231-237).
- `app-hours-editor` exists (`src/app/shared/hours-editor/hours-editor.component.ts`): `rows = model<HoursDraftRow[]>()`, `showMarks = input<boolean>()`; the parent saves with `draftToHours` (used by `venue-form.component.ts`).
- Unsaved-changes helper: `useUnsavedChanges` (`src/app/core/utils/unsaved-changes.ts`), leave guard `pendingChangesGuard` (`src/app/core/guards/pending-changes.guard.ts`). Server refusals: `serverFieldErrors` (`@utils/server-refusal.util`, plan 540).
- `app-edit-gate` (`src/app/shared/edit-gate/`) shows save only to someone who may save; `PermissionService` (`src/app/core/services/permission.service.ts`).
- Tab chips: `src/app/core/components/tab-chips/tab-chips.component.ts` (`CHIPS_BY_GROUP`, `GROUP_BY_PATH_PREFIX`). The `frontdesk` group and its `/frontdesk` prefix are added by plan 547 (C-NAV).
- Lucide registry: `src/app/app.config.ts` `LucideAngularModule.pick({...})` has `Copy`, `Link`, `Plus`, `Trash2`, `ChevronUp`, `ChevronDown`, `Lock`, `Clock`; it has no `Settings`.

From earlier plans in this program (verify in Step 0 when they merge): `FrontDeskProfileDataService`
(`src/app/core/services/front-desk-profile-data.service.ts`, plan 548), `templateFor(businessType)`
(`shared/schemas/front-desk-templates.ts`, plan 548), action `editFrontDesk` in `PermissionService` (plan 548), the
`frontdesk` tab group (plan 547).

## Goals & Success Criteria
**Primary:** an owner opens `/frontdesk/settings`, picks the business type once, and gets a working profile from its
template that they can edit and save, card by card, without leaving unsaved changes behind.

- [auto] `pnpm run test:ci` passes, including `frontdesk-settings.page.spec.ts` and `request-kind-card.component.spec.ts`: no profile → the type picker shows; picking `catering` + a name + a slug and saving calls `FrontDeskProfileDataService` create with `templateFor('catering')` content; a 409 `SLUG_TAKEN` shows the `fd_slug_taken` error on the slug field; more than 12 questions cannot be added (the add button is disabled at 12); `hasRealChanges()` is true after an edit and false after a save; a staff member sees every control disabled and no save button.
- [auto] `pnpm run build` passes.
- [auto] `pnpm run lint` and `pnpm run lint:icons` exit 0.
- [auto] `node scripts/reuse-lint.mjs --check-registry` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] Signed in as the QA owner with no profile, `/frontdesk/settings` shows "בחרו את סוג העסק"; after choosing "קייטרינג", typing a name and a link name and saving, the card "אירוע" is shown with its questions (`e2e/ui/553-1.spec.ts`).
- [ui] On `/frontdesk/settings`, turning off the kind "טעימה", then leaving to `/dashboard` asks "יש שינויים שלא נשמרו" before leaving (`e2e/ui/553-2.spec.ts`).
- [ui] On `/frontdesk/settings`, pressing "העתקת הקישור" shows the toast "הקישור הועתק" (`e2e/ui/553-3.spec.ts`).
- [human] Dandan fills one catering profile with a real owner's details on a phone and a laptop and says the screen is quick enough for the onboarding sitting and reads well in Hebrew.

## Execution Mode
- Parallel: no — appends to `src/app/app.routes.ts`, `tab-chips.component.ts`, `src/app/app.config.ts`, `dictionary.json`, `src/styles.scss` like 547, 551, 552, 554, 555, 556 (map: serialise the merges).
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
e2e/ui/553-1..3
src/app/pages/frontdesk/frontdesk-settings/frontdesk-settings.page.spec.ts
src/app/pages/frontdesk/frontdesk-settings/components/request-kind-card/request-kind-card.component.spec.ts
e2e/ui/553-*.spec.ts
src/app/pages/frontdesk/frontdesk-settings/**
src/app/pages/frontdesk/breadcrumbs.md
src/app/pages/breadcrumbs.md
src/app/app.routes.ts
src/app/app.config.ts
src/app/core/components/tab-chips/tab-chips.component.ts
src/app/core/components/tab-chips/tab-chips.component.spec.ts
public/assets/data/dictionary.json
src/styles.scss
e2e/ui/553-1.spec.ts
e2e/ui/553-2.spec.ts
e2e/ui/553-3.spec.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves — client screen only; it saves through the existing data service (plan 548) and the generic API, which checks `editFrontDesk` on the server; no server, schema or permission file changes.

## Reuse Check

- `FrontdeskSettingsPage` (`src/app/pages/frontdesk/frontdesk-settings/frontdesk-settings.page.ts`) — family: entity-form — rung: 1 — why: uses `useUnsavedChanges` and `pendingChangesGuard` as they are.
- Business type picker (first visit) — family: form-field — rung: 1 — why: `app-form-field` + `app-custom-select` over the 4 types; fixed list, no add option.
- Slug field + copy-link button — family: form-field — rung: 1 — why: `app-form-field` + `.c-input`; copy button is a `.c-btn-ghost` with the `copy` icon.
- Hours card — family: form-field — rung: 1 — why: `app-hours-editor` as venues use it; closed dates are `app-date-field` rows with a `.c-chip--removable` per date.
- `RequestKindCardComponent` (`src/app/pages/frontdesk/frontdesk-settings/components/request-kind-card/`) — family: none — rung: 4 — why: no editor for a list of customer questions exists; page-local, one per request kind.
- Question row (label, type, options, required, up / down / remove) inside the kind card — family: form-field — rung: 1 — why: `app-form-field` + `.c-input`, `app-custom-select` for the type, `.c-chip--toggle` for required, options as `.c-chip--removable` chips plus one text input (Enter adds).
- Rules fields (party min/max, lead hours/days, minimum budget, areas, duration, expiry hours) — family: number-box — rung: 1 — why: each number is an `input[type=number]` inside `appNumberBox`; areas use the same chip input as options.
- Enable toggle per kind and section show-more — family: chip — rung: 1 — why: `.c-chip--toggle` (label > input + span) and `.c-chip--tap` with `aria-expanded`.
- Assistant card (tone, greeting, handoff text, active hours) — family: form-field — rung: 1 — why: `app-custom-select` for tone, `textarea` with `TextareaAutoGrowDirective`, `app-hours-editor` for active hours.
- Save button — family: edit-gate — rung: 1 — why: `app-edit-gate` around a `.c-btn-primary` with `isSaving_` + `aria-busy` (engine-classes saving state).
- Confirm before removing a question — family: modal-shell — rung: 1 — why: `ConfirmModalService.open`.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

Also confirm by symbol (plans 547 and 548 must be merged): `FrontDeskProfileDataService` and its create / update
method names, `templateFor`, the `editFrontDesk` action in `PermissionService`, the profile field limits in
`shared/schemas/entities/front-desk-profile.schema.ts`, and the `frontdesk` entry in `CHIPS_BY_GROUP`. Use the names
as merged; a missing one is a `conflict`.

## User Stories
- As an owner, I want to choose my business type once and get the right questions ready-made so that the setup takes minutes, not an evening.
- As an owner, I want to change which questions customers answer and which requests I take so that I stop getting requests I would never accept.
- As an owner, I want to copy my public link in one tap so that I can paste it in Instagram and my WhatsApp auto-reply.
- As a host, I want to see the opening hours and rules the owner set so that I answer callers the same way.

## Functional Requirements

### Must Have (P0)
- [ ] Contracts used (copied verbatim from `docs/frontdesk/frontdesk-map.md`):
  - **C-PROFILE (548; used by 553–557, 562)**
    - Collection `frontDeskProfiles`, one per business, owner-only write (`editFrontDesk`; in `OWNER_ONLY_TYPES`), not cloneable, `softDelete: false`.
    - Fields: `businessType` (`restaurant | private_chef | catering | other`), `slug` (`^[a-z0-9-]{3,40}$`, unique index), `displayName`, `logoUrl?`, `phone?`, `address?`, `serviceArea?`, `hours` (same row shape as `venue.operatingHours`), `closedDates?`, `requestKinds: { [kind]: { enabled, questions[≤12]{ key, label, type: text|number|date|time|choice, options?, required }, rules{ minPartySize?, maxPartySize?, minLeadHours?, maxLeadDays?, minBudgetPerGuest?, areas? }, defaultDurationMinutes?, expireAfterHours } }`, `assistant { level: 0|1|2, tone: warm|formal, greeting?, handoffText?, activeHours? }`, `status` (`draft | pilot | active | suspended`, server-owned), `whatsapp? { phoneNumberId, ownerAlertPhone?, ownerAlertOptIn }` (server-only, never sent to the browser in full).
    - `shared/schemas/front-desk-templates.ts` → `templateFor(businessType)`.
  - **C-NAV (547; used by 551–557, 561)** — Tab group `frontdesk`; chips in this order: `inbox` (1b), `requests`, `bookings`, `clients`, `knowledge`, `settings`. Path prefixes `/inbox`, `/requests`, `/bookings`, `/clients`, `/frontdesk`. Each plan appends its own chip; labels from Q9.
- [ ] Route (append to `app.routes.ts`): `{ path: 'frontdesk/settings', loadComponent: () => import('./pages/frontdesk/frontdesk-settings/frontdesk-settings.page').then(m => m.FrontdeskSettingsPage), canActivate: [authGuard], canDeactivate: [pendingChangesGuard] }` — a flat entry, so plans 554 and 556 append their own `frontdesk/*` entries without editing this one.
- [ ] Tab chip (append to the `frontdesk` group, last position per C-NAV): `{ id: 'settings', labelKey: 'fd_chip_settings', icon: 'settings', path: '/frontdesk/settings' }`. Register `Settings` in `src/app/app.config.ts`.
- [ ] **First visit (no profile for the business):** one card "בחרו את סוג העסק" with the 4 types (`fd_type_restaurant` "מסעדה / בית קפה / בר", `fd_type_private_chef` "שף פרטי", `fd_type_catering` "קייטרינג ואירועים", `fd_type_other` "אחר"), the display name (`fd_display_name` "שם העסק כפי שהלקוחות מכירים אותו") and the link name (`fd_slug` "שם בקישור", hint `fd_slug_hint` "אותיות באנגלית קטנות, ספרות ומקף, 3 עד 40 תווים"). The slug is checked against `^[a-z0-9-]{3,40}$` as the owner types (`fd_slug_invalid` "רק a-z, 0-9 ומקף, 3 עד 40 תווים"). "יצירה" (`fd_create_profile`) creates the profile with `templateFor(type)` and these three fields; the server sets `status: 'draft'`. Type `other` gets the template the server returns for `other` (plan 548). After create the page shows the full editor.
- [ ] **Type after creation:** shown read-only in the first card ("סוג העסק: קייטרינג"). Changing the type is not offered in Wave 1 (see Out of Scope).
- [ ] **Card 1 — business and link:** type (read-only), display name, slug, phone, address, service area, logo (a URL field; empty = no logo). The public link is `${location.origin}/book/<slug>` shown as text with a "העתקת הקישור" button (`fd_copy_link`) that copies it and shows the toast `fd_link_copied` "הקישור הועתק". A slug change shows the warning `fd_slug_change_warning` "קישור שכבר פורסם יפסיק לעבוד" under the field.
- [ ] **Card 2 — opening hours:** `app-hours-editor` bound to the profile `hours`; closed dates as `app-date-field` + "הוספת תאריך סגור" (`fd_add_closed_date`), each date a removable chip.
- [ ] **Cards 3–6 — one `RequestKindCardComponent` per kind** in `REQUEST_KINDS` order (`table` "שולחן", `event` "אירוע", `tasting` "טעימה", `consultation` "פגישת ייעוץ" — keys `fd_kind_table`, `fd_kind_event`, `fd_kind_tasting`, `fd_kind_consultation`). A kind missing from `requestKinds` shows as off with an empty question list. Each card:
  - Enable toggle (`fd_kind_enabled` "מקבלים בקשות מסוג זה"). Off → the card's body collapses; its data is kept.
  - Questions list (max 12): each row has label, type (`fd_qtype_text` "טקסט", `fd_qtype_number` "מספר", `fd_qtype_date` "תאריך", `fd_qtype_time` "שעה", `fd_qtype_choice` "בחירה"), options (only for choice, at least 2), required toggle (`fd_q_required` "חובה"), up / down buttons, remove (asks `fd_q_remove_confirm` "להסיר את השאלה?"). A template label is a dictionary key: the field shows the translated text; when the owner edits it, the typed Hebrew text is stored instead. A new question gets the key `custom_<n>` (the lowest free `n` in this kind). "הוספת שאלה" (`fd_add_question`) is disabled at 12 with the hint `fd_questions_max` "עד 12 שאלות".
  - Rules: min / max party size (`fd_rule_min_party` "מינימום סועדים", `fd_rule_max_party` "מקסימום סועדים"), minimum lead time in hours (`fd_rule_min_lead_hours` "התראה מינימלית (שעות)"), furthest booking in days (`fd_rule_max_lead_days` "הכי רחוק קדימה (ימים)"), minimum budget per guest (`fd_rule_min_budget` "תקציב מינימלי לסועד (₪)"), areas served as chips (`fd_rule_areas` "אזורי שירות"), duration in minutes for `table` / `tasting` / `consultation` only (`fd_rule_duration` "משך (דקות)"), and expiry in hours, required (`fd_rule_expire_hours` "בקשה שלא טופלה פגה אחרי (שעות)"). Min party > max party shows `fd_rule_party_range_invalid` "המינימום גדול מהמקסימום" and blocks save.
- [ ] **Card 7 — assistant:** level shown read-only with its meaning (`fd_assistant_level_0` "טיוטות בלבד — אתם שולחים", `fd_assistant_level_1` "עונה ואוסף פרטים, אתם מאשרים", `fd_assistant_level_2` "שמור לגל הבא") and the note `fd_assistant_level_admin` "הרמה נקבעת על ידי צוות FoodVibe" (D7); tone (`fd_tone_warm` "חם", `fd_tone_formal` "רשמי"); greeting (`fd_greeting`) and handoff text (`fd_handoff_text` "מה נאמר ללקוח כשאדם ממשיך את השיחה"); active hours: a toggle "כמו שעות הפתיחה" (`fd_active_same_as_hours`, default on, stores no `activeHours`) or an `app-hours-editor`.
- [ ] **Card 8 — status (read-only):** `fd_status_draft` "טיוטה — הקישור עוד לא פעיל", `fd_status_pilot` "פיילוט", `fd_status_active` "פעיל", `fd_status_suspended` "מושהה"; note `fd_status_admin` "הסטטוס משתנה רק על ידי צוות FoodVibe".
- [ ] **Save:** one "שמירה" button at the bottom of the page (sticky on phones), inside `app-edit-gate`, sends the whole profile without `status`, `whatsapp` or `assistant.level` (server-owned / admin-set). While saving the button is disabled with `aria-busy` and the `saving` label. Success → toast `fd_settings_saved` "ההגדרות נשמרו", the page snapshot resets. A 400 with `issues` → `serverFieldErrors` marks the fields; 409 `SLUG_TAKEN` → `fd_slug_taken` "שם הקישור תפוס — בחרו שם אחר" on the slug field; any other failure → toast `save_failed` and the edits stay on screen.
- [ ] **Leave / cancel:** leaving with unsaved edits (route change, `?tab` switch, reload, tab close) asks through `pendingChangesGuard` / `useUnsavedChanges`. There is no cancel button; "ביטול שינויים" (`fd_discard_changes`) restores the last saved profile after `ConfirmModalService.open('fd_discard_confirm')` "לבטל את כל השינויים מאז השמירה האחרונה?".
- [ ] **Staff:** the page loads read-only (every control disabled, no save, no discard) with the banner `fd_settings_owner_only` "רק בעל העסק יכול לשנות את ההגדרות". Staff without a profile see `app-empty-state` with `fd_no_profile_staff` "בעל העסק עוד לא הגדיר את דלפק הקבלה".
- [ ] **Load error:** the profile request fails → `app-empty-state` with `fd_profile_load_failed` "לא הצלחנו לטעון את ההגדרות" and a retry button (`retry`).
- [ ] Breadcrumbs: `src/app/pages/frontdesk/breadcrumbs.md` (new) lists `frontdesk-settings/`; `src/app/pages/breadcrumbs.md` gets a `frontdesk/` row.

### Should Have (P1)
- [ ] Each kind card shows a one-line summary when collapsed ("6 שאלות · 20–300 סועדים · פג אחרי 48 שעות", key `fd_kind_summary` with `{questions}`, `{range}`, `{hours}` placeholders filled by `.replace`).

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL, logical properties only, titled cards stacked in one column (phone first), max width like `/settings`. Every string above is a `general` key in `dictionary.json` with the Hebrew value given.
- Icons: `settings` (new, register `Settings`), `copy`, `link`, `plus`, `trash-2`, `chevron-up`, `chevron-down`, `lock` (read-only banner), `clock` (hours card title) — all others already registered.
- e2e: 553-1 deletes the QA business's profile through the API first (so it starts from no profile); 553-2 and 553-3 create one through the API when missing. All sign in with `signInQa` (`e2e/helpers/qa-session.ts`).
- Keyboard: Enter in an options / areas input adds the chip; Escape in that input clears it; the confirm popup handles its own Escape.
- `Track:` none — this is mostly form logic on existing families; no Claude Design handoff needed.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Add the front desk settings page, its route and its tab chip — lazy route with both guards, the settings chip, the Settings icon, page skeleton with load / error / staff states — src/app/pages/frontdesk/frontdesk-settings/**, src/app/app.routes.ts, src/app/core/components/tab-chips/tab-chips.component.ts, src/app/app.config.ts
- [x] A2: Let the owner choose the business type once and create the profile from its template — type picker, name, slug check, create, slug-taken error — src/app/pages/frontdesk/frontdesk-settings/frontdesk-settings.page.*
- [x] A3: Build the business-and-link and opening-hours cards — details fields, copy-link button and toast, hours editor, closed dates — src/app/pages/frontdesk/frontdesk-settings/**
- [x] A4: Build one card per request kind with its questions and rules — enable toggle, question rows with move and remove, 12-question limit, rules fields and range check — src/app/pages/frontdesk/frontdesk-settings/components/request-kind-card/**
- [x] A5: Build the assistant and status cards — read-only level and status, tone, greeting, handoff text, active hours — src/app/pages/frontdesk/frontdesk-settings/**
- [x] A6: Save, discard and leave safely — one save without server-owned fields, field errors from the server, discard with confirm, leave guard — src/app/pages/frontdesk/frontdesk-settings/frontdesk-settings.page.*
- [x] A7: Add every Hebrew string and the folder maps — dictionary keys listed above, breadcrumbs files — public/assets/data/dictionary.json, src/app/pages/frontdesk/breadcrumbs.md, src/app/pages/breadcrumbs.md
- [x] A8: Write the unit specs and the three screen checks, then run the full checks — page and kind-card specs, e2e/ui/553-1..3, test:ci, build, lint, lint:icons, reuse-lint --check-registry, log-query — e2e/ui/553-1.spec.ts, e2e/ui/553-2.spec.ts, e2e/ui/553-3.spec.ts

## Technical Considerations
- Dependencies: `FrontDeskProfileDataService`, `templateFor`, `editFrontDesk` (plan 548); the `frontdesk` tab group (plan 547).
- New files needed: `src/app/pages/frontdesk/frontdesk-settings/frontdesk-settings.page.{ts,html,scss,spec.ts}`, `src/app/pages/frontdesk/frontdesk-settings/components/request-kind-card/request-kind-card.component.{ts,html,scss,spec.ts}`, `src/app/pages/frontdesk/breadcrumbs.md`, the three e2e specs.
- Model changes: none (types come from plan 548's schema).
- Backend / API: none — create and save go through the generic API (`/api/v1/data/frontDeskProfiles`) via the data service.
- Auth and validation: route behind `authGuard`; the server checks `editFrontDesk` and strips server-owned fields; the client hides save for staff and validates slug, party range, the 12-question limit and choice options before sending.
- Security surface: none new. The logo is a URL the owner types; it renders only as an `<img src>` (CSP `img-src` already limits hosts).
- Data / migration: none.
- Project checks: `[auto] log-query` present; dictionary keys named with Hebrew values; icons named and registered; Reuse Check lists every control; stories written.

## Out of Scope
- Changing the business type after the profile exists (Dandan sets it at onboarding; a later plan can add "change type and re-apply template").
- A logo upload button (the field takes a URL; upload can reuse `cloudinary.service.ts` later).
- Previewing `qualify()` on sample answers.
- Setting `status` or `assistant.level` (platform admin, plan 557 and Wave 1b).
- WhatsApp fields (Wave 1b, plan 560).
- The knowledge base screen (554) and the onboarding intake form (556).

## Critical Questions
- none

## Execution Notes
- Human 2026-11-12 (batch-3 ASK 553-1): approved: src/app/core/components/tab-chips/tab-chips.component.spec.ts. Planner wrote the two bare spec names as full paths (they matched nothing in the run's test-file gate).
- Map row 11, renumbered +2 on 2026-11-10 (old 551 → 553).
- scope extended: src/app/core/components/tab-chips/tab-chips.component.spec.ts — the new `settings` chip changes its chip list and needs the Settings icon in the spec's icon pick.
- Decision: `src/app/pages/frontdesk/breadcrumbs.md` was not kept: `scripts/breadcrumbs-check.mjs` flags it as STRAY (leaf folders carry no breadcrumbs file); the `frontdesk/` row in `src/app/pages/breadcrumbs.md` documents the folder.
- Decision: the save sends `assistant.level` as loaded (not omitted): the server's schema defaults a missing level to 0 and would reset an admin-set level.
- Decision: a choice question needs 2 options except template questions whose key is in `WANTED_QUESTION_KEYS` (the catering `event_type` ships with no options).
- Decision: `fd_slug_taken` text changed to the plan's wording (only the server's messageKey used it); `fd_kind_consultation` kept as "ייעוץ" (used by plan 552).
- Decision: save is shown with `permission.can('editFrontDesk')` instead of `app-edit-gate` (the gate asks `create`, which staff may do).
- Evidence: `pnpm run build` -> exit 0; `pnpm run lint` -> exit 0 (0 errors); `pnpm run lint:icons` -> exit 0; `pnpm run lint:no-native-select` -> exit 0; `ng test --include frontdesk + tab-chips specs` -> see run below; breadcrumbs-check clean; reuse-lint --check-registry ok; kit-manifest-check ok.
- e2e/ui/553-1..3 written and listed by Playwright; not run here (the dev server on :4200 is not this worktree's build).
- Decision (Planner): staff see the screen read-only instead of a hidden chip, so `tab-chips.component.ts` stays an append-only change.
