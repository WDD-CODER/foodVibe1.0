# Plan 667 — Table settings card with the one-button confirm mode, and a printable QR code of the booking page

Status: draft
Depends-on: 662, 664
Snapshot: 28359b6d54b0c77e288c52702a850daef92ccf07

## Problem Statement
A restaurant that gets the `tables` module needs to tell the table engine how it works: how long a party keeps a
table, how late the last seating is, how long a late guest's table is held, and — the decision the owner makes most
often — whether a free table is confirmed to a guest at once or only after the owner approves it (brief D3: one
button). Today the front desk settings page has no such fields; plan 662 only adds the stored shape
(`tableService` on the profile) and its defaults. This plan gives the owner the card that edits those settings, a
confirm-mode switch that is saved by its own call the moment it is tapped, and — beside the public link — a QR code
of the booking page that he can print and put on the door.

Verified on `origin/main` (28359b6d, 2026-11-22):
- `src/app/pages/frontdesk/frontdesk-settings/frontdesk-settings.page.ts` (350 lines): the page keeps an editable copy
  of the profile in `draft_` (`SettingsDraft`, line 58), saves the whole profile with one Save through
  `FrontDeskProfileDataService.save` (line 322), guards unsaved edits with `useUnsavedChanges` over
  `JSON.stringify(draft_())` (line 133), blocks a save through `blocked_` (line 145) and builds the body in `toBody`
  (line 282), which spreads the stored profile minus `status`, `whatsapp`, `adminHistory` — so a stored
  `tableService` already survives a save. `canEdit_` is `permission.can('editFrontDesk')` (line 117). `publicLink_`
  is `${location.origin}/book/${slug}` (line 143). The page does not inject `ModuleService`.
- `frontdesk-settings.page.html` (298 lines): the link row is `div.fs-link` with `data-testid="public-link"` and the
  copy button (lines 164–170) inside card 1; the request kind cards are rendered by
  `@for (kind of kinds; …) <app-request-kind-card [kind] [config] (configChange) [disabled] [showErrors] />`
  (lines 218–226), followed by the assistant card (`data-testid="card-assistant"`, line 229); everything sits in
  `<fieldset class="fs-fieldset" [disabled]="!canEdit_()">`.
- `components/request-kind-card/request-kind-card.component.ts` is the pattern of a settings card: standalone,
  `OnPush`, `kind = input.required`, `config = model.required`, `FormFieldComponent`, `CustomSelectComponent`,
  `NumberBoxDirective` (`appNumberBox`), a checkbox inside `label.c-chip.c-chip--toggle` for a yes / no.
- Shared pieces: `app-counter` (`src/app/shared/counter/counter.component.ts`: `value`, `min`, `max`, `disabled`,
  `valueChange`), `app-time-field` (`src/app/shared/time-field/time-field.component.ts`: `value` model, `invalid`
  model, `inputId`), `app-custom-select`, `app-form-field` (`label`, `forId`, `hint`, `error`).
- `src/app/core/services/front-desk-profile-data.service.ts` (64 lines): `profile_`, `save(profile)` through the
  generic API; it has no single-field write and injects no `HttpClient`.
- `src/app/core/services/module.service.ts:16` — `has(keys)`; `tab-chips.component.ts` already injects it.
- Printing: `window.print()` is used as it is (`frontdesk-onboarding.page.ts:373`); `src/styles.scss:1896` hides
  `body *` with `visibility: hidden` in print, and a component makes its own block visible again.
- Icons in `src/app/app.config.ts`: `Printer`, `Plus`, `Trash2`, `Copy` are registered; `QrCode` is not.
- Dictionary: `print` ("הדפסה"), `add`, `remove`, `field_required`, `save_failed`, `fd_settings_saved` exist; no key
  starts with `fd_ts_` or `fd_qr_`.
- No QR code library is installed (root `package.json`); `qrcode` 1.5.4 (MIT) is approved (brief D10, map delta 6).
  It ships no type declarations, and its types package is not an approved dependency.
- `e2e/ui/634-1.spec.ts` is the pattern of a `[ui]` spec for a module the QA business does not have: `signInQa`, then
  `page.route` adds the module to the answer of `**/api/v1/business` and fulfils the feature's own routes.
- `server/test/requests-approve.test.js:30` seeds a `frontDeskProfiles` document straight into the test database.
- From plan 662 (existing here, never edited): `frontDeskProfileSchema.tableService` (C-TSERVICE),
  `shared/schemas/front-desk/table-service.ts` (`TABLE_SERVICE_DEFAULTS`, `tableServiceOf(profile)`), the module key
  `tables` with the dictionary name `module_tables`. From plan 664: `server/routes/floor-plan.js` with `GET /` and
  `PUT /`, and `API.floorPlan(path?)` in `src/app/core/services/http-storage.adapter.ts`.

## Goals & Success Criteria
**Primary:** the owner of a restaurant with `tables` sets every table setting on the front desk settings page,
switches between "confirmed at once" and "I approve every booking" with one tap that is stored at once, and prints a
QR code of his booking page; a business without `tables` sees the page exactly as today.

- [auto] `pnpm run test:server` → exit 0, including the new `server/test/floor-plan-confirm-mode.test.js`.
- [auto] `server/test/floor-plan-confirm-mode.test.js`: the owner's `PUT /api/v1/floor-plan/confirm-mode
  { confirmMode: 'auto' }` on a profile with no `tableService` answers 200 `{ confirmMode: 'auto' }` and the stored
  profile then holds a full `tableService` equal to `tableServiceOf(profileBefore)` with `confirmMode: 'auto'`; on a
  profile with stored settings only `confirmMode` and `updatedAt` change (the ladder, `slotMinutes` and the eight
  other fields are equal before and after); a staff token gets 403 and nothing changes; a business with
  `['frontdesk']` only gets 403 `{ error: 'MODULE_OFF', module: 'tables' }`; `{ confirmMode: 'maybe' }` and an empty
  body get 400 `{ error: 'BAD_REQUEST_INPUT' }`; a business with no profile gets 404 `{ error: 'NO_PROFILE' }`;
  another business's profile is never touched; the stored profile still passes `frontDeskProfileSchema`.
- [auto] `pnpm run test:ci` → exit 0, including:
  `src/app/pages/frontdesk/frontdesk-settings/components/table-service-card/table-service-card.component.spec.ts` —
  the card shows the ten
  defaults for an input built from `tableServiceOf({})`, emits the changed value for each field, adds a ladder step
  up to six and removes down to one, and `tableServiceErrors` returns `fd_ts_ladder_order` for a ladder that is not
  ascending by `maxParty` and `fd_ts_out_of_range` for `holdMinutes: 4`, `bufferMinutes: 31`, a step of 20 minutes
  and `cancellationCutoffHours: 73`;
  `src/app/pages/frontdesk/frontdesk-settings/frontdesk-settings.page.spec.ts` — without `tables` the page renders no
  `table-service-card` and no `booking-qr`, and its save body has no `tableService` key for a profile that had none;
  with `tables` the save body carries `tableService` with the edited fields and the profile's current `confirmMode`;
  `src/app/core/services/front-desk-profile-data.service.spec.ts` — `setConfirmMode('auto')` sends one `PUT` to
  `/api/v1/floor-plan/confirm-mode` and puts `tableService.confirmMode: 'auto'` into `profile_`; a failed call leaves
  `profile_` unchanged and returns `false`; `src/app/shared/qr-code/qr-code.component.spec.ts` — the component renders an `img` whose `src`
  starts with `data:image/png` for a value and nothing for an empty value.
- [ui] On `/frontdesk/settings`, signed in as the QA owner with the `tables` module and a restaurant profile answered
  by the spec's fixtures, the card "הגדרות שולחנות" shows the switch reading "אני מאשר כל הזמנה"; the owner taps it, it
  reads "שולחן פנוי מאושר מיד", and after a reload it still reads "שולחן פנוי מאושר מיד" (`e2e/ui/667-1.spec.ts`; the
  spec fulfils `**/api/v1/business` with `tables` added, `**/api/v1/data/frontDeskProfiles**` from a fixture it keeps
  in memory, and `**/api/v1/floor-plan/confirm-mode` by storing the mode in that fixture; screenshot
  `screens/667-1.png`).
- [ui] On the same page the block beside the public link shows a QR image and the button "הדפסת קוד QR"
  (`e2e/ui/667-2.spec.ts`: `[data-testid="booking-qr"] img` is visible and its `src` starts with `data:image/png`;
  screenshot `screens/667-2.png`).
- [auto] `pnpm run build` → exit 0 with no new budget error. `pnpm run lint` → exit 0. `pnpm --dir server run lint` →
  exit 0.
- [auto] `node scripts/reuse-lint.mjs --check-registry` → exit 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] Dandan opens the settings of the demo restaurant on a phone and on a laptop: the table settings card reads
  clearly in Hebrew, the switch says which mode is on without explanation, and the printed QR page shows only the
  restaurant's name, the code and the link.
- [human] the screen's page with the data request failing · open the page · a readable error with a retry appears, not a blank page

## Execution Mode
- Parallel: no — a screen plan of run `rs-floor-ui` (665, 666, 667, one at a time): it appends to
  `public/assets/data/dictionary.json` and `src/app/app.config.ts`, which every screen plan of the program edits. It
  must not run beside 664 (same router file) or beside open plan 542 (both edit `package.json` and `pnpm-lock.yaml`).
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/routes/floor-plan.js
server/test/floor-plan-confirm-mode.test.js
server/breadcrumbs.md
src/app/pages/frontdesk/frontdesk-settings/frontdesk-settings.page.ts
src/app/pages/frontdesk/frontdesk-settings/frontdesk-settings.page.html
src/app/pages/frontdesk/frontdesk-settings/frontdesk-settings.page.scss
src/app/pages/frontdesk/frontdesk-settings/frontdesk-settings.page.spec.ts
src/app/pages/frontdesk/frontdesk-settings/components/table-service-card/**
src/app/pages/frontdesk/frontdesk-settings/components/table-service-card/table-service-card.component.spec.ts
src/app/pages/breadcrumbs.md
src/app/shared/qr-code/**
src/app/shared/qr-code/qr-code.component.spec.ts
src/app/shared/breadcrumbs.md
src/app/core/services/front-desk-profile-data.service.ts
src/app/core/services/front-desk-profile-data.service.spec.ts
src/app/core/services/breadcrumbs.md
src/app/app.config.ts
public/assets/data/dictionary.json
package.json
pnpm-lock.yaml
angular.json
e2e/ui/667-1.spec.ts
e2e/ui/667-2.spec.ts
screens/667-*.png
docs/brain/component-families.md
docs/brain/inventory.md
docs/restaurant/restaurant-map.md
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

- INV-1: preserves — the confirm-mode route changes one field of the profile of the business in the token
  (`scopeFilter`), only for the owner or a consultant (`assertCan(… 'editFrontDesk' …)`); the profile service only
  gains a call to that route; staff still cannot write the profile.
- INV-4: preserves — no schema is edited; the route validates the whole profile with
  `checkStoredDoc('frontDeskProfiles', …)` before it writes, and the card saves through the existing profile write.
- INV-7: preserves — the switch only stores which mode the business is in; no table is confirmed, offered or moved
  by this plan, and the routes that act on the mode (plans 668, 669) still ask the engine.

## Reuse Check

- `table-service-card` (`app-table-service-card`, `TableServiceCardComponent`) — family: form-field — rung: 1 — why: a settings card built from `app-form-field`, `app-counter`, `app-custom-select`, `app-time-field`, `appNumberBox` and the `c-chip--toggle` checkbox, the way `app-request-kind-card` is; no new control
- `tableServiceErrors` (pure function in the card's folder) — family: helpers — rung: 1 — why: a page-local validity check like `choiceNeedsOptions` of the request kind card
- Confirm-mode switch (a checkbox in `label.c-chip.c-chip--toggle` with `role="switch"`) — family: chip — rung: 1 — why: the existing toggle chip; the label text names the mode that is on
- `FrontDeskProfileDataService.setConfirmMode` — family: http — rung: 2 — why: one more call on the existing profile service through `API.floorPlan('confirm-mode')`; plan 671 reuses it from the service screen
- `qr-code` (`app-qr-code`, `QrCodeComponent`) — family: none — rung: 4 — why: nothing in the registry draws a QR code; built once in `src/app/shared/qr-code/` as the new family `qr-code` so the booking page link and later links (waiting list, brief Part 6) share it
- Page-local layout classes (`.ts-card`, `.ts-title`, `.ts-mode`, `.ts-note`, `.ts-body`, `.ts-grid`, `.ts-ladder`, `.ts-ladder-row`, `.ts-ladder-cell`, `.ts-ladder-label`, `.ts-number` in the card; `.fs-qr`, `.fs-qr-side`, `.fs-qr-print`, `.fs-qr-print-name`, `.fs-qr-print-link` on the page; `.qr-img` in `app-qr-code`) — family: engine-classes — rung: 1 — why: only layout (grid, gap, size) around the shared pieces; no `.c-*` class is defined
- The number fields of the card use `app-counter` (family: stepper) — rung: 1 — why: it already clamps to a min and max, so no second number box is copied
- Ladder add / remove buttons — family: engine-classes — rung: 1 — why: `c-btn-ghost` buttons with the registered `plus` and `trash-2` icons, as the request kind card's question rows

## Defaults

- empty-state-on-list — exception — why: the plan adds a settings card and a QR block; the turn ladder is a list that is never empty (one step is the minimum)
- app-list-container — exception — why: no list page is built; the ladder is a group of form rows inside a card
- hints-in-tooltips — exception — why: the card sits on a page, not in a dialog; its explanations use the hint line of app-form-field like the page's other cards
- loading-and-error-states — applies — how: the shared loading and error pieces
- one-breakpoint-set — applies — how: the shared breakpoint names at the top of src/styles.scss ($break-phone-max, $break-tablet-max), used in every @media; plan 656 makes them the only set

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a restaurant owner, I want one switch that says whether a free table is confirmed to a guest at once or waits
  for me, so that on a busy night I can take control back with one tap and give it away again the next morning.
- As a restaurant owner, I want to set how long a party keeps a table, how late I seat, and how long I hold a late
  guest's table, so that the times my guests are offered match how my restaurant really runs.
- As a restaurant owner, I want to print a QR code of my booking page, so that a guest at the door can book the
  next visit from his phone.
- As a host, I do not see or change these settings; I only work with their result.

## Functional Requirements

### Contract C-TSERVICE (frozen 2026-11-22, copied verbatim from `docs/restaurant/restaurant-map.md`)

**C-TSERVICE (R0 schema, R5 screen; used by R1, R6, R7, R9, R14, R18)**
- `frontDeskProfile.tableService?: { confirmMode: 'auto' | 'manual' (default 'manual'), autoMaxParty: int 1–30
  (default 6), slotMinutes: 15 | 30 (default 15), turnMinutes: [{ maxParty: int, minutes: int 30–360 }] (1–6,
  ascending by maxParty), lastSeatingBeforeCloseMinutes: int 0–180 (default 60), bufferMinutes: int 0–30
  (default 0), holdMinutes: int 5–60 (default 15), autoNoShow: boolean (default false), reminderHour: 'HH:mm'
  (default '10:00'), cancellationCutoffHours: int 0–72 (default 3) }`. Owner-written through the existing profile
  write (the generic API). Nothing fills defaults on read: `tableServiceOf(profile)` in
  `shared/schemas/front-desk/table-service.ts` (pure, R0) returns the stored value over `TABLE_SERVICE_DEFAULTS`
  (default ladder: one step, `{ maxParty: 30, minutes: requestKinds.table.defaultDurationMinutes ?? 120 }`), and the
  server and the browser read the settings only through it (delta 4).
- `PUT /api/v1/floor-plan/confirm-mode { confirmMode }` (owner) changes only that one field — the one-button
  switch of D3, used by the settings card and the service screen.
- Party limits and lead times stay where they are: `requestKinds.table.rules`.

### Contract C-TABLES (the parts this plan implements, copied verbatim)

- Server: `requireModule('tables')` on `/api/v1/floor-plan/**`, `/api/v1/waitlist/**` and on the table routes of
  `/api/v1/bookings` named in C-BOOK2.
- Browser: route guard `moduleGuard(['tables'])` on `/frontdesk/floor-plan`; the floor view, the table settings
  card and the waiting list are hidden without the module.

### Must Have (P0)

The route — `server/routes/floor-plan.js` (one route added after the two of plan 664; nothing of them changes)
- [ ] `PUT /confirm-mode` — `verifyToken`, `requireModule('tables')`, body `{ confirmMode }` where the value must be
  `'auto'` or `'manual'` (else 400 `{ error: 'BAD_REQUEST_INPUT' }`). It loads the business's live profile
  (`frontDeskProfiles`, `scopeFilter(req)`, `LIVE`); none → 404 `{ error: 'NO_PROFILE' }`. Then
  `assertCan(req, res, 'editFrontDesk', { type: 'frontDeskProfiles', doc: profile })`.
- [ ] It writes `tableService = { ...tableServiceOf(profile), confirmMode }` and `updatedAt = now` — the whole
  settings object, so a profile that had none gets the defaults it was already running on and stays valid — after
  `checkStoredDoc('frontDeskProfiles', { ...profile, tableService, updatedAt })` passed (400 `Validation failed`
  otherwise). The write is one `updateOne` by `_id` and `businessId` with `$set` of those two fields only. The answer
  is 200 `{ confirmMode }`. Log `floor_plan.confirm_mode.changed` with `{ to }` only.

The card — `src/app/pages/frontdesk/frontdesk-settings/components/table-service-card/` (new: `.ts`, `.html`, `.scss`,
`.spec.ts`)
- [ ] `app-table-service-card`: standalone, `OnPush`, signals only. Inputs: `service = model.required<TableServiceDraft>()`
  (`TableServiceDraft` = the nine fields of C-TSERVICE without `confirmMode`), `confirmMode =
  input.required<'auto' | 'manual'>()`, `switching = input(false)`, `disabled = input(false)`, `showErrors =
  input(false)`; output `confirmModeChange` (the mode asked for). Root element `section.c-glass-card` with
  `data-testid="table-service-card"` and the title `fd_ts_title`.
- [ ] The switch, first in the card: one checkbox in `label.c-chip.c-chip--toggle` with `role="switch"`,
  `data-testid="confirm-mode-switch"`, checked when the mode is `auto`; its visible text is `fd_ts_mode_auto` when on
  and `fd_ts_mode_manual` when off, and one line under it explains the mode that is on (`fd_ts_mode_auto_note` /
  `fd_ts_mode_manual_note`). A tap emits `confirmModeChange`; while `switching` is true the switch is disabled and
  `aria-busy`. No confirmation dialog.
- [ ] The fields, each an `app-form-field` with its label key, in this order:
  `autoMaxParty` — `app-counter` 1–30, shown only while the mode is `auto` (`fd_ts_auto_max_party`);
  `slotMinutes` — `app-custom-select` with the two options 15 and 30 (`fd_ts_slot`, options `fd_ts_slot_15`,
  `fd_ts_slot_30`);
  the turn ladder (`fd_ts_ladder`) — one row per step: "up to" `maxParty` (a number box, 1–30) and `minutes` (a
  number box, 30–360, step 15), a remove button (`trash-2`, `aria-label` `remove`) hidden when one step is left, and
  under the rows an add button (`plus`, text `fd_ts_ladder_add`) hidden at six steps; a new step starts at the last
  step's `maxParty + 2` (capped at 30) and the last step's minutes;
  `lastSeatingBeforeCloseMinutes` — number box 0–180 (`fd_ts_last_seating`);
  `bufferMinutes` — number box 0–30 (`fd_ts_buffer`);
  `holdMinutes` — number box 5–60 (`fd_ts_hold`);
  `autoNoShow` — a `c-chip--toggle` checkbox (`fd_ts_auto_no_show`);
  `reminderHour` — `app-time-field` (`fd_ts_reminder_hour`);
  `cancellationCutoffHours` — number box 0–72 (`fd_ts_cutoff`).
  Every number field carries `data-testid="ts-<fieldName>"`; ladder rows carry `data-testid="ts-ladder-row"`.
- [ ] `tableServiceErrors(draft): Record<string, string>` (exported from the card's `.ts`): `fd_ts_out_of_range` for a
  number outside its C-TSERVICE range or not whole, `fd_ts_ladder_order` on the ladder when `maxParty` is not
  strictly ascending, `fd_ts_bad_time` for a `reminderHour` that is not `HH:mm`. With `showErrors` the card shows the
  message under the field (`app-form-field [error]`). One explanation line per field is given through
  `app-form-field`'s `hint`, as the page's other cards do.
- [ ] Phone (≤ 767 px): the fields stack in one column; ladder rows stay on one line each. Only the shared breakpoint
  names are used, logical CSS properties only, no `.c-*` class is defined in the component's SCSS.

The page — `frontdesk-settings.page.ts` / `.html` / `.scss` / `.spec.ts`
- [ ] The page injects `ModuleService`; `hasTables_ = computed(() => modules.has('tables'))`. The card is rendered
  between the request kind cards and the assistant card, inside the existing `fieldset`, only when `hasTables_()`.
- [ ] `SettingsDraft` gains `tableService: TableServiceDraft`, filled in `toDraft` from `tableServiceOf(p)` (without
  `confirmMode`), so the existing unsaved-changes guard and Discard cover the card with no new code path.
  `blocked_` is also true when `hasTables_()` and `tableServiceErrors(d.tableService)` is not empty.
- [ ] `toBody`: when `hasTables_()`, the body carries `tableService: { ...d.tableService, confirmMode:
  tableServiceOf(p).confirmMode }`; without the module the body is exactly today's (a stored `tableService` rides
  along untouched in `base`, a profile that had none gets none).
- [ ] The switch is saved by its own call and is not part of the draft: `(confirmModeChange)` calls
  `profiles.setConfirmMode(mode)`; while it runs `switching_` is true; on success the card shows the new mode (it
  reads `tableServiceOf(profile_()).confirmMode`) and the success toast `fd_ts_mode_saved`; on failure the switch
  returns to the stored mode and the error toast `save_failed` shows, unless the refusal was already shown
  (`refusalShownToUser`). Tapping the switch never marks the page as having unsaved changes and never saves the
  other fields. Staff see the card read-only (the `fieldset` is disabled) and the switch is disabled for them.
- [ ] The QR block, inside card 1 right after `div.fs-link`, only when `hasTables_()`: `div.fs-qr` with
  `data-testid="booking-qr"` holding `<app-qr-code [value]="publicLink_()" [size]="160" altKey="fd_qr_alt" />`, the
  line `fd_qr_note`, and the button `c-btn-ghost` `data-testid="print-qr"` (icon `printer`, text `fd_qr_print`) that
  calls `window.print()`. The code follows the slug field as it is typed; while the slug is invalid the block shows
  nothing but the note `fd_qr_after_save`.
- [ ] Print: in `@media print` the page makes only a print block visible (`.fs-qr-print`: the business's display
  name, the QR at 60 mm, the link text in `dir="ltr"`), fixed at the top of the sheet; everything else stays hidden
  by the global print rule. The print block is in the template only when `hasTables_()`.

The profile service — `front-desk-profile-data.service.ts` (+ spec)
- [ ] `setConfirmMode(mode: 'auto' | 'manual'): Promise<boolean>` — `PUT environment.apiUrl +
  API.floorPlan('confirm-mode')` with `{ confirmMode: mode }` through `HttpClient` (injected with `inject()`); on 200
  it replaces the profile in the store with `{ ...p, tableService: { ...tableServiceOf(p), confirmMode } }` and
  returns `true`; on a failure it logs `crud.frontDeskProfile.confirm_mode_error` (not for a 401) with the status
  only, leaves the store as it was and returns `false`.

The QR piece — `src/app/shared/qr-code/` (new: `qr-code.component.ts`, `.html`, `.scss`, `.spec.ts`, `qrcode.d.ts`)
- [ ] `app-qr-code`: standalone, `OnPush`; inputs `value = input.required<string>()`, `size = input(160)` (CSS
  pixels), `altKey = input('')`. An `effect` turns `value` into a PNG data URL with the library's `toDataURL(value,
  { margin: 1, width: size × 2, errorCorrectionLevel: 'M' })` and keeps it in a signal; the template is one
  `<img [src] [alt] [width] [height]>` and nothing while there is no value or no image yet. A value that changes
  while an image is being made never shows a stale code (the last value wins). A failure logs
  `qr.render_failed` once and shows nothing.
- [ ] The library is loaded with a dynamic `import('qrcode')` inside the component, so it lands in its own lazy chunk
  and not in the first bundle. `qrcode.d.ts` declares the module with the one function used
  (`toDataURL(text: string, options?: { margin?: number; width?: number; errorCorrectionLevel?: 'L' | 'M' | 'Q' |
  'H' }): Promise<string>`); no types package is added.
- [ ] `package.json` (root) gains `"qrcode": "1.5.4"` under `dependencies` and `pnpm-lock.yaml` is updated by
  `pnpm install`; no other dependency changes. When the build prints the CommonJS warning for `qrcode`, add it to
  `allowedCommonJsDependencies` of the build options in `angular.json`; otherwise `angular.json` is not touched.

Texts, icons, registry
- [ ] `public/assets/data/dictionary.json` (append only), key → Hebrew value:
  `fd_ts_title` "הגדרות שולחנות" · `fd_ts_mode_auto` "שולחן פנוי מאושר מיד" · `fd_ts_mode_manual` "אני מאשר כל הזמנה" ·
  `fd_ts_mode_auto_note` "אורח שמזמין שולחן פנוי מקבל אישור מיד, בלי לחכות לך" ·
  `fd_ts_mode_manual_note` "כל הזמנה מחכה לאישור שלך לפני שהאורח מקבל תשובה" · `fd_ts_mode_saved` "מצב האישור עודכן" ·
  `fd_ts_auto_max_party` "עד כמה סועדים מאשרים אוטומטית" · `fd_ts_slot` "מרווח בין שעות הזמנה" ·
  `fd_ts_slot_15` "כל 15 דקות" · `fd_ts_slot_30` "כל 30 דקות" · `fd_ts_ladder` "כמה זמן שולחן תפוס" ·
  `fd_ts_ladder_up_to` "עד סועדים" · `fd_ts_ladder_minutes` "דקות" · `fd_ts_ladder_add` "הוספת מדרגה" ·
  `fd_ts_ladder_hint` "קבוצה גדולה יושבת יותר זמן: לכל גודל קבוצה משך משלו" ·
  `fd_ts_last_seating` "הושבה אחרונה לפני הסגירה (דקות)" · `fd_ts_buffer` "הפסקה בין קבוצות (דקות)" ·
  `fd_ts_hold` "כמה דקות שומרים שולחן לאורח מאחר" · `fd_ts_auto_no_show` "לסמן לבד אורח שלא הגיע" ·
  `fd_ts_auto_no_show_hint` "כבוי: אורח מאחר רק מסומן על המסך, והשולחן נשאר שלו עד שתחליטו" ·
  `fd_ts_reminder_hour` "שעת התזכורת ביום ההזמנה" · `fd_ts_cutoff` "עד כמה שעות לפני אפשר לבטל" ·
  `fd_ts_out_of_range` "המספר מחוץ לטווח המותר" · `fd_ts_ladder_order` "המדרגות צריכות לעלות לפי גודל הקבוצה" ·
  `fd_ts_bad_time` "שעה לא תקינה" · `fd_qr_alt` "קוד QR לעמוד ההזמנות" · `fd_qr_note` "סריקה פותחת את עמוד ההזמנות שלך" ·
  `fd_qr_print` "הדפסת קוד QR" · `fd_qr_after_save` "הקוד יופיע אחרי שהקישור תקין".
- [ ] `src/app/app.config.ts`: register the Lucide icon `QrCode` (used as `qr-code` in the QR block's heading line);
  `Printer`, `Plus`, `Trash2` are already registered.
- [ ] `docs/brain/component-families.md`: the new UI family `### qr-code — a QR image of a link` (Use: `app-qr-code`;
  When: any link a person scans — never a second library call); the `http` family gains the
  `FrontDeskProfileDataService.setConfirmMode` line. `docs/brain/inventory.md` gains the `qr-code` line.
  `src/app/shared/breadcrumbs.md`, `src/app/pages/breadcrumbs.md`, `src/app/core/services/breadcrumbs.md` and
  `server/breadcrumbs.md` are updated for the new folder, card, method and route.
- [ ] `docs/restaurant/restaurant-map.md` "Contract extensions (run)": one line — the confirm-mode route answers
  `{ confirmMode }`, writes the whole `tableService` over the defaults, and answers 404 `NO_PROFILE`.

### Should Have (P1)
- [ ] The card's spec checks that with `disabled` every control of the card, the switch included, is disabled.

### Nice to Have (P2)
- none

## UI/UX Notes
- Hebrew RTL; logical CSS properties only; the card looks like the request kind cards (`c-glass-card`, the same
  title size and grid). The switch is the first thing in the card and reads as a sentence about the mode that is on.
- The card sits between the last request kind card and the assistant card. The QR block sits under the link row of
  the first card, the image at the inline start, the note and the print button beside it; under 768 px they stack.
- No confirmation dialog on the switch, on removing a ladder step or on printing (brief rule 15).
- Dictionary keys and icons: listed under "Texts, icons, registry".
- States: the page's own loading and failed-load states are unchanged; the card is rendered only inside the loaded
  editor, so it needs no state of its own. A failed switch shows the existing `save_failed` toast.

## Atomic Sub-tasks

- [x] A1: Let the owner change only the confirm mode with one server call — the confirm-mode route after the two floor plan routes: input check, profile load, owner check, whole settings object over the defaults, stored-document check, one update; its test file — server/routes/floor-plan.js, server/test/floor-plan-confirm-mode.test.js, server/breadcrumbs.md
- [x] A2: Give the profile service the one call both the settings card and the service screen will use — setConfirmMode through the floor plan path, store patched on success, false on failure; spec cases — src/app/core/services/front-desk-profile-data.service.ts, src/app/core/services/front-desk-profile-data.service.spec.ts, src/app/core/services/breadcrumbs.md
- [x] A3: Build the table settings card with the switch, the nine fields and the turn ladder — the component, its validity function, the ladder add and remove rules, phone layout; its spec — src/app/pages/frontdesk/frontdesk-settings/components/table-service-card/**, src/app/pages/breadcrumbs.md
- [x] A4: Put the card on the settings page for businesses that have table service — module check, draft field, save body, blocked rule, the switch saved by its own call with its toasts; page spec cases with and without the module — src/app/pages/frontdesk/frontdesk-settings/frontdesk-settings.page.ts, src/app/pages/frontdesk/frontdesk-settings/frontdesk-settings.page.html, src/app/pages/frontdesk/frontdesk-settings/frontdesk-settings.page.scss, src/app/pages/frontdesk/frontdesk-settings/frontdesk-settings.page.spec.ts
- [x] A5: Add the shared QR image piece and its one approved library — the dependency, the lazy import, the type declaration, the component and its spec, the registry family — package.json, pnpm-lock.yaml, angular.json, src/app/shared/qr-code/**, src/app/shared/breadcrumbs.md, docs/brain/component-families.md, docs/brain/inventory.md
- [x] A6: Show the booking page's QR code beside the public link and make it printable — the QR block, the print button, the print-only block with name, code and link, the print rules — src/app/pages/frontdesk/frontdesk-settings/frontdesk-settings.page.html, src/app/pages/frontdesk/frontdesk-settings/frontdesk-settings.page.scss, src/app/pages/frontdesk/frontdesk-settings/frontdesk-settings.page.ts
- [x] A7: Add the Hebrew texts and the icon, and record the route's answer in the map — the dictionary keys listed in the plan, the QrCode icon, the extension line — public/assets/data/dictionary.json, src/app/app.config.ts, docs/restaurant/restaurant-map.md
- [x] A8: Prove the switch and the QR code in the running app — two short screen checks with fixture routes for the module, the profile and the confirm-mode call, each saving a screenshot — e2e/ui/667-1.spec.ts, e2e/ui/667-2.spec.ts

## Technical Considerations
- Dependencies: `FrontdeskSettingsPage`, `FrontDeskProfileDataService`, `ModuleService`, `tableServiceOf` /
  `TABLE_SERVICE_DEFAULTS` (plan 662), the floor plan router and `API.floorPlan` (plan 664), `app-counter`,
  `app-custom-select`, `app-time-field`, `app-form-field`, `appNumberBox`. New package: `qrcode` 1.5.4 (approved, D10).
- New files needed: the card folder (four files), `src/app/shared/qr-code/` (five files),
  `server/test/floor-plan-confirm-mode.test.js`, `e2e/ui/667-1.spec.ts`, `e2e/ui/667-2.spec.ts`.
- Model changes: none to a stored shape (`tableService` exists since plan 662); `SettingsDraft` gains one field.
- Backend / API: `PUT /api/v1/floor-plan/confirm-mode { confirmMode: 'auto' | 'manual' }` → 200 `{ confirmMode }` |
  400 `BAD_REQUEST_INPUT` | 400 `Validation failed` | 403 `MODULE_OFF` / `OWNER_ONLY` | 404 `NO_PROFILE`. The nine other
  settings are saved by the existing generic profile write (`PUT /api/v1/data/frontDeskProfiles`), which validates
  them against `frontDeskProfileSchema`. A dedicated route for the mode because it must change one field without
  sending — or overwriting — the rest of the profile.
- Auth and validation: token; module `tables`; owner or consultant (`editFrontDesk`); the value is one of two
  literals; the whole profile is validated before the write. The browser's checks (`tableServiceErrors`) are a
  convenience; the server's schema is the gate.
- Security surface: one new write route, inside the existing rate limiter of the router; no new input reaches a log;
  the QR code is drawn in the browser from the public link — nothing is sent to an outside service.
- Data / migration: none. A profile gains a stored `tableService` the first time the owner flips the switch or saves
  the page with the module on.
- Project checks: `[auto] log-query` present; every dictionary key named with its Hebrew value; the one new icon
  named with its registration state; Hebrew RTL and logical CSS; Reuse Check lists every control; `[ui]` specs under
  `e2e/ui/` with `signInQa`; hotspots append-only; folder maps of `server/`, `core/services`, `src/app/shared/` and
  `src/app/pages/` in scope.
- Traps: the page's Save sends the whole profile — it must send the store's current `confirmMode`, or a save after a
  switch would undo the switch; the `fieldset[disabled]` disables the switch for staff, so the card must not
  re-enable it; `toDataURL` is asynchronous — tests wait for the image.

## Out of Scope
- The floor plan editor and map (plans 665, 666); what the confirm mode does to a booking (plans 668, 669); the mode
  switch on the service screen (plan 671 reuses `setConfirmMode`); reminders, late flags and no-shows acting on these
  settings (plans 671, 676).
- Party limits and lead times: they stay in the request kind card (`requestKinds.table.rules`).
- A QR code for anything but the booking page; downloading the code as a file; a QR code for a business without
  `tables`.
- Editing any file plan 662 owns (schemas, registries, mounts).

## Critical Questions
- none

## Execution Notes
- behaviour: the QR block is shown only to a business with `tables` (brief RS-04 places it with the table settings;
  default A3: nothing of this program reaches a business that was not given it).
- behaviour: the switch is stored at once and is not part of the page's unsaved changes; the other nine fields are
  saved with the page's one Save button, like every other card of the page.
- behaviour: the confirm-mode route stores the whole settings object over the defaults the first time, so the stored
  profile is complete from then on.
- behaviour: `autoMaxParty` is shown only while the mode is `auto`; its stored value is kept while hidden.
- scope extended: none. Reuse Check rows renamed/extended in this plan file (bare stems `table-service-card`, `qr-code`,
  the page-local layout classes, `app-counter`) so `kit-checks` finds them.
- decision: every number field of the card (and the ladder's) is an `app-counter` (1–30, 0–180 …, ladder minutes step 15),
  not a raw `input[type=number]`: it clamps to the range and avoids a copy of the number-box markup (kit-checks debt).
  `data-testid="ts-<field>"` sits on the `app-counter` host.
- decision: the print rules that make `.fs-qr-print` visible live in `src/styles.scss` (append-only hotspot) because
  the global `body *` rule must be beaten for the child `app-qr-code` image, which the page's scoped SCSS cannot reach.
- decision: a failed switch call shows `save_failed` always (the service swallows the error and returns `false`, so
  `refusalShownToUser` cannot be asked there).
- Evidence: `pnpm run build` → 0 (no new budget error; `allowedCommonJsDependencies` gained `qrcode`, `dijkstrajs`);
  `pnpm run lint` → 0; `pnpm run test:ci` → 0, TOTAL 2801 SUCCESS; `pnpm run test:server` → 0 (floor-plan-confirm-mode:
  7 passed); `kit-checks` → ok (6 checks); `kit-manifest-check` → ok; override / ledger / breadcrumbs / reuse-registry /
  log-query / lint:icons / lint:no-native-select → 0.
- `[ui]` items 667-1 and 667-2: written, not run (`e2e/ui/667-1.spec.ts`, `e2e/ui/667-2.spec.ts`).
