# Plan 537 — Venue opening hours: tap-to-pick times, empty rows dropped, broken rows marked and blocking save

Status: draft
Depends-on: 374
Track: code — no Claude Design step; the time field copies the look of `app-date-field`
Snapshot: 1e6f0f9ca6c8c910809b2653a39d43c45e7ae544

## Problem Statement

The opening-hours section of the venue form (`/venues/add`, `/venues/edit/:id`,
`src/app/pages/venues/components/venue-form/`) is two free-text boxes per row:

- `venue-form.component.html` L81-94: `<input type="text" formControlName="days">` and
  `<input type="text" formControlName="time">`, placeholders "ימים" / "שעות". There is no picker: clicking the
  "שעות" box only puts a cursor in it, and the chef must type a range like `08:00–23:00` by hand. No `type="time"`
  exists anywhere in `src/app`, and no shared time piece exists (`docs/brain/component-families.md`).
- `venue-form.component.ts` `addHoursRow()` L216-223 and `hydrateForm()` L172-181 put `Validators.required` on both
  boxes. `persist_()` L264-280 runs `validateForm_()` (checks only the name), then
  `if (this.venueForm_.invalid) return false` — so **one empty or half-filled hours row blocks save with no message
  and no red field**. The chef clicks "שמור" and nothing happens.
- `saveVenue_()` L291-293 already filters rows missing `days` or `time`, but that code is never reached for such rows
  because of the silent block above.

Stored shape (unchanged by this plan): `operatingHours?: { days: string; time: string }[]`
(`shared/schemas/entities/venue.schema.ts` L18, `src/app/core/models/venue.model.ts` L10-13). The card and detail page
read the two strings through `formatVenueHours` / `formatVenueHoursLines` (`src/app/core/utils/venue-hours.util.ts`).

Plan 374 (branch `orch/run-374b`, 651f0d85, not on main) rewrites the infrastructure section of the same four
venue-form files (`ts`, `html`, `scss`, `spec.ts`): grouped rows, `infraRow_()`, `regroupRows_()`, `hasRowsIn()`, a
`setup(venue, equipment)` spec helper. It does not touch the hours section, but it edits the same files and the same
`hydrateForm()` method, so this plan builds on top of it.

## Goals & Success Criteria

**Primary:** each hours row has "from" and "to" time fields that open a time picker on click (desktop) or tap
(phone); an empty row is dropped on save; a broken row is marked red with a message and blocks save until it is
fixed or removed.

- [auto] `pnpm run test:ci` exits 0, including `time-field.component.spec.ts`, `time-input.util.spec.ts`,
  `venue-hours.util.spec.ts` and `venue-form.component.spec.ts` (A1-A4).
- [auto] `npx ng test --watch=false --browsers=ChromeHeadless --include=src/app/shared/time-field/time-field.component.spec.ts --include=src/app/core/utils/time-input.util.spec.ts --include=src/app/core/utils/venue-hours.util.spec.ts --include=src/app/pages/venues/components/venue-form/venue-form.component.spec.ts` → 0 failures.
- [auto] `pnpm run build` exits 0.
- [auto] `node scripts/reuse-lint.mjs --check-registry` exits 0.
- [auto] `node scripts/reuse-lint.mjs --diff=origin/main` prints no `family-styled-from-outside` line for
  `venue-form.component.scss`.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `SKIP: no database configured`).
- [human] see "How the Human checks it" below (7 checks on `/venues/add` and the venue's edit/detail pages, one on a phone).

## Execution Mode
- Parallel: no — same four venue-form files as 374 (before) and 372 (after).
- Concurrent plans: none touching `src/app/pages/venues/**` or `src/app/core/utils/venue-hours.util.ts`.
- Isolated DB: no — no schema or stored-data change.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/shared/time-field/**
src/app/shared/time-field/time-field.component.spec.ts
src/app/core/utils/time-input.util.ts
src/app/core/utils/time-input.util.spec.ts
src/app/core/utils/venue-hours.util.ts
src/app/core/utils/venue-hours.util.spec.ts
src/app/pages/venues/components/venue-form/**
src/app/pages/venues/components/venue-form/venue-form.component.spec.ts
docs/brain/component-families.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves — client-only form change; the stored `{ days, time }` shape and `venue.schema.ts` are untouched
  (INV-4 still validates every write), no server, taxonomy, ownership or AI code is in scope.

## Reuse Check

- `app-time-field` (`src/app/shared/time-field/`, new) — family: form-field — rung: 3 — why: no time piece exists; a sibling of `app-date-field` with the same text-plus-hidden-native-picker pattern (a native time input draws AM/PM on an English phone, same reason plan 467 hid the native date input).
- `formatTimeDigits` / `parseHm` (`src/app/core/utils/time-input.util.ts`, new) — family: helpers — rung: 3 — why: pure helpers beside `date-input.util.ts`; never page-local.
- `parseTimeRange` / `formatTimeRange` / `checkHoursRow` (added to `src/app/core/utils/venue-hours.util.ts`) — family: helpers — rung: 3 — why: extends the existing venue-hours helper file that 372 also extends.
- Row error line and red fields — family: form-field — rung: 1 — why: `.c-field-error` and `.c-input--invalid` from `src/styles.scss` as is; no new `.c-*` class. No other control is added: "add row", trash and undo stay as they are.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten). Expected drift: plan 374's merge into the venue-form
files — `ok` when `hydrateForm()`, `addHoursRow()`, `removeHoursRow()`, `validateForm_()`, `persist_()` and
`saveVenue_()` still exist.

## User Stories
- As a chef, I want to pick opening times from a time picker so that I don't have to type a time range by hand.
- As a chef, I want an empty hours row I added by mistake to just disappear on save so that it doesn't stop me.
- As a chef, I want a half-filled or wrong hours row shown in red with the reason so that I know why save is blocked
  and what to fix.

## Functional Requirements

### Must Have (P0)
- [ ] Each hours row: the days box stays free text (plan 372 replaces it with day chips); the single "שעות" text box
  is replaced by two `app-time-field`s, "from" (`open`) and "to" (`close`).
- [ ] Time field behaviour (copies `app-date-field`):
  - Text input `dir="ltr"`, placeholder `hh:mm`, `maxlength="5"`, `inputmode="numeric"` on desktop. Typing digits
    inserts the colon: `0830` → `08:30`, `830` stays `830` (half-typed).
  - Desktop: a click on the field opens the browser's time picker (`showPicker()` on a hidden `type="time"`); typing
    still works. Browsers without `showPicker` for time (Firefox desktop): typing only.
  - Touch (`(pointer: coarse)`): the hidden native time input covers the field, so a tap opens the phone's own time
    picker; the text input is display-only.
  - `value` is `HH:MM` (24-hour, `00:00`-`23:59`) or `''`. A half-typed or impossible time (`8`, `25:00`) leaves
    `value` `''` and, when the user leaves the field, sets `invalid` and shows "שעה לא תקינה" under it.
  - New input `flagged` (boolean): the parent marks the field red (`c-input--invalid`, `aria-invalid="true"`) without
    the field's own message — used for row errors.
  - Escape: the text field has no Escape handler (value kept); Escape inside the open native picker closes the picker
    and keeps the previous value (browser behaviour).
- [ ] Row check (`checkHoursRow({ days, open, close, openInvalid, closeInvalid })` in `venue-hours.util.ts`), first
  match wins:
  1. days blank (whitespace counts as blank) and open `''` and close `''` and neither half-typed → `empty`.
  2. days blank → `missing_days` (days box red).
  3. open or close half-typed → `time_invalid` (that field red; its own message shows, no row message).
  4. open `''` or close `''` → `missing_time` (each empty time field red).
  5. close = open → `same_time` (both time fields red).
  6. close < open (string compare of `HH:MM`) → `overnight`: valid, the venue closes the next day (Human 2026-11-08).
     The form shows "+1" right after the "to" field (aria-label / title `venue_hours_next_day` = "למחרת"); the same
     marker 372 shows in its editor, so 372 reuses it.
  7. otherwise `ok`.
- [ ] Save (`persist_()`), for add, edit and the leave-guard's "save and leave" (`saveAndWait()`):
  - Rows `empty` are dropped from the payload; no mark, no message. They also disappear from the form after a
    successful save (the page leaves anyway).
  - Any row not `ok`, `overnight` or `empty` → save is blocked: toast "יש לתקן את השדות המסומנים" (`form_has_errors`, existing), the
    row's fields go red and one message line (`.c-field-error`, `role="alert"`) shows under that row; nothing is sent
    to the server; the page does not leave (the leave-guard stays on the page).
  - Marks appear only after the first blocked save (`hoursSubmitAttempted_` signal); from then on they update on
    every change, so a fixed or removed row loses its mark at once. Removing a row with the trash button removes its
    mark; the existing undo puts the row and its mark back.
  - Hours rows no longer carry `Validators.required`, so the silent `venueForm_.invalid` block cannot come from hours
    rows any more.
  - An `ok` or `overnight` row is saved as `{ days: days.trim(), time: formatTimeRange(open, close) }` → `08:00–23:00` (en dash, no
    spaces; the format in `venue.model.ts` L8-9).
- [ ] Load (`hydrateForm()`): each stored row → `{ days, open, close }` with `parseTimeRange(time)`, which accepts
  `H:MM` or `HH:MM` on each side and `-`, `–` or `—` with optional spaces between. A `time` that does not parse loads
  as open `''` / close `''`, so the row is `missing_time` and blocks save until the chef picks times or removes it —
  the old text is never silently overwritten.
- [ ] Keyboard: Tab order in a row is days → from → to → trash. Enter in any field submits the form (existing
  `ngSubmit`) and runs the same checks.
- [ ] Cancel ("ביטול") runs no row check: it leaves as today, and the leave-guard asks only if something changed.

### Should Have (P1)
- [ ] Registry: `docs/brain/component-families.md` → form-field family gets a "Times (plan 537)" bullet naming
  `app-time-field`, styled only from inside its component.

### Nice to Have (P2)
- none

## UI/UX Notes
- Row layout (RTL): days box, then "from" and "to" side by side, then trash; wraps on a phone. Sizing lives in a page
  wrapper class (`.hours-times`) and in the time field's own `:host` — never a page rule that names `app-time-field`
  (reuse-lint `family-styled-from-outside`).
- Each time field has an aria-label from `venue_hours_from` / `venue_hours_to` (372's keys and wording); no visible label (the row keeps today's
  placeholder style).
- Dictionary (append-only, `public/assets/data/dictionary.json`), none exist today:
  - `time_invalid` = "שעה לא תקינה"
  - `venue_hours_from` = "מ-" (372's wording; 372 drops its own copy)
  - `venue_hours_to` = "עד" (372's wording; 372 drops its own copy)
  - `venue_hours_missing_days` = "חסרים ימים"
  - `venue_hours_missing_time` = "חסרה שעת פתיחה או סגירה"
  - `venue_hours_same_time` = "שעת הפתיחה ושעת הסגירה זהות"
  - `venue_hours_next_day` = "למחרת" (aria-label / title of the "+1" marker)
  - Existing, reused: `form_has_errors`, `days`, `line_removed`, `add_row`, `operating_hours`.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Add time helpers that turn typed digits into a clean 24-hour time — `formatTimeDigits(raw)` (digits only,
  max 4, colon after 2) and `parseHm(text)` (`^([01]\d|2[0-3]):[0-5]\d$` → the text, else `null`), with specs:
  `0830`→`08:30`, `2400`→`24:00` and `parseHm('24:00')`→`null`, `parseHm('8:30')`→`null` —
  `src/app/core/utils/time-input.util.ts` (new), `src/app/core/utils/time-input.util.spec.ts` (new).
- [ ] A2: Add the shared time field the chef can click or tap to pick a time — `TimeFieldComponent`
  (`app-time-field`): standalone, OnPush, `model()` for `value` and `invalid`, `input()` for `inputId`,
  `ariaLabelKey`, `disabled`, `flagged`, `output()` `committed`; same structure as
  `src/app/shared/date-field/date-field.component.ts` with `type="time"` as the hidden picker; own `@layer
  components.time-field` SCSS plus the unlayered picker reset (same R2 exception as date-field). Spec: digits set
  `value`; leaving half-typed sets `invalid` and shows `time_invalid`; a pick sets `value` and clears `invalid`; desktop
  click calls `showPicker`; `flagged` adds `c-input--invalid` without the message —
  `src/app/shared/time-field/time-field.component.{ts,html,scss}` (new),
  `src/app/shared/time-field/time-field.component.spec.ts` (new).
- [ ] A3: Teach the venue-hours helpers to read, write and check an hours row — `parseTimeRange`, `formatTimeRange`,
  `checkHoursRow` (rules in P0) in `src/app/core/utils/venue-hours.util.ts`; spec cases: `08:00–23:00`,
  `8:00 - 23:00`, `08:00—23:00` parse; `ערב` → `null`; each of the seven results of `checkHoursRow`, including equal
  times → `same_time`, `18:00`/`02:00` → `overnight`, `formatTimeRange('18:00','02:00')` → `18:00–02:00` —
  `src/app/core/utils/venue-hours.util.spec.ts`.
- [ ] A4: Put the time pickers and row checks into the venue form — in `venue-form.component.ts`: hours rows become
  `{ days, open, close }` FormGroups with no validators (`hoursRow_()` helper used by `addHoursRow()` and
  `hydrateForm()`); `hoursSubmitAttempted_` signal; `hoursErrors_` signal (row index → result) refreshed by
  `validateForm_()` and, after the first attempt, on `venueForm_.valueChanges` (`takeUntilDestroyed`);
  `validateForm_()` returns false when any row is broken; `saveVenue_()` drops `empty` rows and writes
  `formatTimeRange`. Half-typed state: each time field's `invalid` is kept per row (`openInvalid` / `closeInvalid`
  controls, UI only, never sent — same idea as 374's `group` control). In `venue-form.component.html`: replace the
  `time` text input with two `app-time-field`s bound `[value]` / `(valueChange)` → `setValue` + `markAsDirty`,
  `[flagged]`, `[ariaLabelKey]`; red days box; the row message line. In `venue-form.component.scss`: `.hours-times`
  wrapper. Spec (`venue-form.component.spec.ts`, keep 374's tests): (1) an added empty row → save → `addVenue`
  called with `operatingHours: []`; (2) days + open only → save blocked, `addVenue` not called, error toast, row
  result `missing_time`; (3) open `18:00`, close `18:00` → blocked, `same_time`; (3b) open `18:00`, close `02:00` → saved as `18:00–02:00` and the "+1" marker is rendered; (4) valid row → payload
  `{ days: 'א׳–ה׳', time: '08:00–23:00' }`; (5) edit a venue with `time: '08:00–23:00'` → open/close hydrated; with
  `time: 'ערב'` → blocked until removed; (6) removing the broken row → save goes through —
  `src/app/pages/venues/components/venue-form/venue-form.component.{ts,html,scss}`,
  `src/app/pages/venues/components/venue-form/venue-form.component.spec.ts`.
- [ ] A5: Register the time field and add the Hebrew texts — form-field family bullet in
  `docs/brain/component-families.md`; the seven dictionary keys in `public/assets/data/dictionary.json` (append only).
- [ ] A6: Build and check — `pnpm run build`, `pnpm run test:ci`, `node scripts/reuse-lint.mjs --check-registry`,
  `node scripts/reuse-lint.mjs --diff=origin/main`, `node scripts/log-query.mjs --since=plan-start --level=error`;
  then hand over the cards below.

## How the Human checks it

All on `/venues/add` (slot dev server, `ng serve -c local`):
1. Click "מ-" in a new hours row → a time picker opens; pick 08:00, then "עד" → 23:00 → the row shows
   `08:00` and `23:00`.
2. Type a name, add an hours row and leave it empty → "שמור" → the venue is saved and the list opens; open it again
   for edit → no empty hours row.
3. Days "א׳–ה׳" and only "מ-" 10:00 → "שמור" → the page stays, "עד" is red, under the row: "חסרה שעת פתיחה או
   סגירה", toast "יש לתקן את השדות המסומנים".
4. Change to 18:00 – 18:00 → "שמור" → both times red, "שעת הפתיחה ושעת הסגירה זהות"; delete the row with
   the trash button → "שמור" → saved.
7. Edit the venue, add a row "ה׳", 18:00 → 02:00 → "+1" shows right after 02:00 → "שמור" → saved, no red field; the
   detail page shows "ה׳ · 18:00–02:00".
5. On the saved venue's detail page the hours read "א׳–ה׳ · 08:00–23:00".
6. On a phone (or Chrome device mode): tap "מ-" → the phone's own time picker opens.

## Technical Considerations
- Dependencies: `VenueFormComponent` (after 374), `formatVenueHours` / `formatVenueHoursLines` (unchanged, still read
  `days` / `time`), `useUnsavedChanges` (snapshot uses `getRawValue()`, so the new row shape compares correctly),
  `pendingChangesGuard` (`saveAndWait()` false → stays on page).
- New files: `src/app/shared/time-field/*` (4), `src/app/core/utils/time-input.util.ts` + spec.
- Model changes: none. The form row adds UI-only `open`, `close`, `openInvalid`, `closeInvalid`; the payload keeps
  `{ days, time }`.
- Backend / API: none.
- Auth and validation: none new; the server schema already accepts `{ days, time }`.
- Security surface: none.
- Data / migration: none. Venues already saved: their rows always have both strings (today's save drops rows missing
  either), so none load as `empty`. A row whose `time` parses loads into the pickers unchanged; a row whose `time`
  does not parse loads with empty times and blocks save on edit until fixed or removed — nothing is rewritten unless
  the chef edits and saves. Venues are test data (Human rule 2026-10-26).
- Project checks: log-query Done-when present; dictionary keys listed; logical CSS only; no new Lucide icon.
- Plan 372 follow-on: 372 should reuse `app-time-field`, `checkHoursRow` and these dictionary keys instead of a raw
  `<input type="time">` and its own `venue_hours_from` / `venue_hours_to` values, and add `Depends-on: 537`.

## Out of Scope
- Day chips and structured `dayIndexes` / `open` / `close` fields in the schema (plan 372).
- "+1" on the venue card and detail page (they show the stored `18:00–02:00` as is; 372's `formatVenueHours` work).
- The same silent block on an empty infrastructure row (`equipmentId` has `Validators.required`, `persist_()` returns
  false with no message) — a separate fix.
- A reuse-lint rule warning on a new native `type="time"` input.
- Showing the time field on the dev catalog page (plan 535).

## Critical Questions
- Q: A venue that closes after midnight (18:00 → 02:00): a) blocked as "end before start" · b) allowed now, "+1"
  shown next to the end time. A: b) — Human 2026-11-08. Equal start and end stays broken.

## Execution Notes
