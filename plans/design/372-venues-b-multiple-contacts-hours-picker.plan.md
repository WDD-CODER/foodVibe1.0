# Plan 372 — Venues B: multiple contacts and an interactive days/hours picker

Status: draft
Depends-on: 374, 537
Track: split — look in Claude Design; schema, build:schemas, old-hours parsing here
Snapshot: b776163f43fd1db42a5e0501b3a0e5c30b0bded1

## Problem Statement

Two venue fields are too limited:

- **One contact only.** A venue has a single contact: flat `contactName?` / `contactPhone?` in `VenueProfile` (`src/app/core/models/venue.model.ts`) and `shared/schemas/entities/venue.schema.ts` (L16-17). The form has two inputs (`venue-form.component.ts` `buildForm()` ~L104, `hydrateForm()` ~L124, add/update payloads ~L230-262). The detail page has one contact card with a hard-coded role `'venue_manager'` (`venue-detail.component.html` ~L61-85). Dandan wants several contacts per venue: name, phone, role.
- **Hours are free text.** Hours are a FormArray of text inputs (`days`, `time`; form html ~L84-106, ts ~L141-147, ~L183-195), stored as `operatingHours: {days: string, time: string}[]`. Dandan wants an interactive picker: day chips plus a time range. Agreed approach: structured fields added to each hours row; the `days` / `time` strings are still written (generated from the structure) so list and detail keep reading them. No old-data support: venues are test data (see Out of Scope) — an old venue that does not fit is deleted and re-entered.

The schema is strict (`z.strictObject`, enforced server-side by `server/middleware/validate.js` from `server/generated/schemas`), so every new field must be added to the schema, then `npm run build:schemas`. Usages of these fields exist only in the venue model, form, detail, schema and field map (verified by grep).

## Goals & Success Criteria

**Primary:** the form manages a list of contacts (add / remove / edit name, phone, role), and the detail page lists them all with tap-to-call.
**Primary:** each hours row is 7 day chips (א–ש) plus "from" / "to" time inputs. The display everywhere comes from `formatVenueHours` (plan 371, Venues A).
**Success:** a new venue saves with several contacts and structured hours with no validation errors. Old venues are not converted or kept working by this plan.

## Execution Mode

- Parallel: no. Run after plan 371 (Venues A, closed) and plan 374 (Planner order 2026-11-05; same form), and plan 537 (time pickers and hours-row checks; same form).
- Concurrent plans: none touching `src/app/pages/venues/**` or `shared/schemas/**`
- Isolated DB: yes. Schema change; verify against stored venues before Atlas.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/venues/**
src/app/core/models/venue.model.ts
src/app/core/utils/venue-hours.util.ts
src/app/core/utils/venue-hours.util.spec.ts
src/app/shared/hours-editor/**
src/app/shared/hours-editor/hours-editor.component.spec.ts
src/app/pages/venues/components/venue-form/venue-form.component.spec.ts
shared/schemas/entities/venue.schema.ts
server/test/**
src/app/shared/breadcrumbs.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the ## Read-Write Scope above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch), then STOP for a go before
touching any milestone.

## User Stories

- As an event chef, I want to store every contact person at a venue with their role.
- As a user, I want to set opening days and hours by tapping, not typing.

## Functional Requirements

### Must Have (P0)
- [ ] Schema (`venue.schema.ts`, additive only):
  - `contacts: z.array(z.strictObject({ name: z.string(), phone: z.string().optional(), role: z.string().optional() })).optional()`
  - hours item: `z.strictObject({ days: z.string(), time: z.string(), dayIndexes: z.array(z.number().int().min(0).max(6)).optional(), open: z.string().regex(/^\d{2}:\d{2}$/).optional(), close: z.string().regex(/^\d{2}:\d{2}$/).optional() })`
  - Keep `contactName` / `contactPhone`. Run `npm run build:schemas`.
  - The field map needs no change (v1→v2 only).
- [ ] Model: add the matching optional fields. `contactName` / `contactPhone` stay in the schema untouched, unused by the new form.
- [ ] Contacts in the form:
  - A `contacts` FormArray (name required, phone, role).
  - Add-contact button; remove per row.
  - Hydrate from `contacts` only (no read of `contactName` / `contactPhone`, no mirror on save).
  - Both add and update payloads.
- [ ] Detail page: list all contacts (initials avatar, name, role, `tel:` link). Remove the hard-coded `'venue_manager'` role.
- [ ] New `HoursEditorComponent` (`src/app/shared/hours-editor/`), with signal inputs and outputs, `ControlValueAccessor` or `model()`:
  - Per row: 7 toggle chips (`.c-chip--toggle`, Sunday = 0 … Saturday = 6), "from" / "to" `app-time-field` (plan 537; no native time input), remove-row button; plus an add-row button.
  - Validation: row checks come from `checkHoursRow` (plan 537): extend its `missing_days` rule to read `dayIndexes` (at least 1 chip) instead of the free-text days; `same_time` stays broken; `overnight` (close < open) is valid and shows 537's "+1" marker (`venue_hours_next_day`). Empty rows are dropped on save, broken rows block save — as 537.
- [ ] `venue-hours.util.ts`:
  - `toDisplay(dayIndexes, open, close)` → `{ days: 'א׳–ה׳', time: '08:00–23:00' }`, compressing consecutive days.
  - `formatVenueHours` prefers the structured fields.
  - On save, each row writes structured fields plus generated `days` / `time`; `time` is built with 537's `formatTimeRange(open, close)` (en dash, `18:00–02:00` for overnight). Hydrate structured `open` / `close` first, fall back to 537's `parseTimeRange(time)`. No second time parser.

### Should Have (P1)
- [ ] Server test: a venue with contacts and structured hours passes validation.

### Nice to Have (P2)
- [ ] Quick presets in the editor: "א׳–ה׳", "כל השבוע".

## UI/UX Notes

- Day chips show Hebrew letters (א ב ג ד ה ו ש), RTL order starting from א on the right.
- Dictionary (append): `venue_contacts` = "אנשי קשר", `venue_add_contact` = "הוסף איש קשר", `contact_role` = "תפקיד", `venue_hours_add_row` = "הוסף שעות", `venue_manager_role` = "מנהל המקום". `venue_hours_from` / `venue_hours_to` and the row-error keys (`venue_hours_missing_days`, `venue_hours_missing_time`, `venue_hours_same_time`, `venue_hours_next_day`, `time_invalid`) come from plan 537 — no new error keys.

## Reuse Check

- `HoursEditorComponent` (`src/app/shared/hours-editor/`) — family: none — rung: 4 — why: no shared piece edits a list of day-chip + time-range rows.
- Time inputs in the editor — family: form-field — rung: 1 — why: `app-time-field` from plan 537 as is.
- `toDisplay` in `venue-hours.util.ts` — family: helpers — rung: 3 — why: extends the helper file 537 extended.

## Atomic Sub-tasks

- [x] A1: Let a venue store several contacts and structured opening hours — Schema and model additions; `build:schemas`; server validation test (`venue.schema.ts`, `venue.model.ts`, `server/test/**`).
- [x] A2: Show opening hours in plain Hebrew — `venue-hours.util` `toDisplay` plus spec (Hebrew range forms, midnight crossing).
- [x] A3: Add an interactive days-and-hours picker to the venue form — `HoursEditorComponent` plus spec, using `app-time-field` and `checkHoursRow`; move 537's row wiring (marks, message line, drop-empty) from the venue form into the editor without changing behaviour; wire into the venue form; save structured hours and the generated strings (`shared/hours-editor/**`, `venue-form/**`).
- [x] A4: Let the venue form add and list several contacts — Contacts FormArray, detail list (`venue-form/**`, `venue-detail/**`).
- [x] A5: Build and test — Build, specs; add one new venue with two contacts and structured hours and check no 400s.

## Technical Considerations

- Dependencies: `VenueFormComponent`, `VenueDetailComponent`, `VenueListComponent` (card hours via the util), `.c-chip--toggle` (plan 457, replaced `.c-toggle-chip`), `server/middleware/validate.js`.
- New files: `shared/hours-editor/*` plus spec.
- Model changes: additive optional fields only. Nothing removed from the schema, so stored docs stay valid.

## Out of Scope

- Any support for old venues: no migration, no parsing of old free-text hours, no read of the old single contact. Venues are test data (Human, 2026-10-26); delete one that does not fit.
- Removing the deprecated fields.

## Critical Questions

- Settled (Human 2026-11-08, via 537): overnight hours allowed with "+1"; equal open and close times are broken.
- Week order of the day chips:
  a) א (Sunday) first (default)
  b) ב (Monday) first

## Success Criteria

- [auto] `npm run build:schemas` → exit 0.
- [auto] Server tests (venue validation) → 0 failures.
- [auto] `pnpm run test:ci` → 0 failures, including the specs under `src/app/shared/hours-editor/`, `src/app/core/utils/venue-hours.util.spec.ts` and `src/app/pages/venues/`.
- [auto] `npm run build` → exit 0.
- [auto] `pnpm run test:ci` → exit 0 (also covers 537's time-field spec).
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] Hours: tap ה, 18:00 → 02:00 → "+1" shows → save → no red field.
- [human] Add a new venue with two contacts → save → the detail page shows both with call links.
- [human] Hours: tap א–ה, 08:00–23:00 → save → the card and detail show "א׳–ה׳ · 08:00–23:00".

## Planner edit (2026-10-26)
Legacy/compat work removed on the Human's rule that only recipes and products are kept (venues, menus, users, businesses are test data): `parseLegacy`, the "היה:" hint, legacy contact hydrate, the `contactName` / `contactPhone` mirror, the legacy server test and the old-venue checks.
- Planner review 2026-11-07: added the `Depends-on:` header the v2.1.0 readiness lint requires, matching the 2026-11-05 order in `.claude/todo.md` (374 → 372; 373 parked).
- Planner review 2026-11-08: reuse plan 537's time field, row checks, time helpers and keys; Depends-on 537; Reuse Check, spec scope and test:ci/log-query Done-when added. Refresh Snapshot after 537 merges.

## Execution Notes

- Step 0: `scope-check --drift` reported drift only from plan 537 / 540 landing after the snapshot (the plan expects this); symbols checked (checkHoursRow, formatTimeRange, parseTimeRange, app-time-field) exist as the plan describes.
- `npm run build:schemas` -> exit 0. `pnpm --dir server run test` -> 69 files, 829 passed (incl. server/test/venue-contacts-hours-schema.test.js).
- `pnpm run build` -> exit 0. `pnpm run lint` -> 0 errors. `pnpm run lint:icons` -> 0 violations.
- `pnpm run test:ci` -> TOTAL: 1831 SUCCESS (first run had one failing new spec of mine, fixed).
- breadcrumbs row added for hours-editor/ (file now in scope); `node scripts/breadcrumbs-check.mjs` -> OK.
- A5 left unticked: the manual add-a-venue check is the [human] items; covered by form specs.
- Overnight rows show "+1 <venue_hours_next_day>" in the editor as the plan says (539 had removed it from the card only).
