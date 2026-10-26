# Plan 372 — Venues B: multiple contacts and an interactive days/hours picker

Status: draft
Track: split — look in Claude Design; schema, build:schemas, old-hours parsing here
Snapshot: b776163f43fd1db42a5e0501b3a0e5c30b0bded1

## Problem Statement

Two venue fields are too limited:

- **One contact only.** A venue has a single contact: flat `contactName?` / `contactPhone?` in `VenueProfile` (`src/app/core/models/venue.model.ts`) and `shared/schemas/entities/venue.schema.ts` (L16-17). The form has two inputs (`venue-form.component.ts` `buildForm()` ~L104, `hydrateForm()` ~L124, add/update payloads ~L230-262). The detail page has one contact card with a hard-coded role `'venue_manager'` (`venue-detail.component.html` ~L61-85). Dandan wants several contacts per venue: name, phone, role.
- **Hours are free text.** Hours are a FormArray of text inputs (`days`, `time`; form html ~L84-106, ts ~L141-147, ~L183-195), stored as `operatingHours: {days: string, time: string}[]`. Dandan wants an interactive picker: day chips plus a time range. Agreed approach: structured fields added to each hours row; the `days` / `time` strings are still written (generated from the structure) so list and detail keep reading them. No old-data support: venues are test data (see Out of Scope) — an old venue that does not fit is deleted and re-entered.

The schema is strict (`z.strictObject`, enforced server-side by `server/middleware/validate.js` from `server/generated/schemas`), so every new field must be added to the schema, then `npm run build:schemas`. Usages of these fields exist only in the venue model, form, detail, schema and field map (verified by grep).

## Goals & Success Criteria

- Primary: the form manages a list of contacts (add / remove / edit name, phone, role), and the detail page lists them all with tap-to-call.
- Primary: each hours row is 7 day chips (א–ש) plus "from" / "to" time inputs. The display everywhere comes from `formatVenueHours` (plan 371, Venues A).
- Success: a new venue saves with several contacts and structured hours with no validation errors. Old venues are not converted or kept working by this plan.

## Execution Mode

- Parallel: no. Run after plan 371 (Venues A).
- Concurrent plans: none touching `src/app/pages/venues/**` or `shared/schemas/**`
- Isolated DB: yes. Schema change; verify against stored venues before Atlas.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/venues/**
src/app/core/models/venue.model.ts
src/app/core/utils/venue-hours.util.ts
src/app/core/utils/venue-hours.util.spec.ts
src/app/shared/hours-editor/**
shared/schemas/entities/venue.schema.ts
server/test/**
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
  - Per row: 7 toggle chips (`.c-toggle-chip`, Sunday = 0 … Saturday = 6), "from" / "to" `<input type="time">`, remove-row button; plus an add-row button.
  - Validation: at least 1 day, and open < close unless the range crosses midnight (allow and show "+1").
- [ ] `venue-hours.util.ts`:
  - `toDisplay(dayIndexes, open, close)` → `{ days: 'א׳–ה׳', time: '08:00–23:00' }`, compressing consecutive days.
  - `formatVenueHours` prefers the structured fields.
  - On save, each row writes structured fields plus generated `days` / `time`.

### Should Have (P1)
- [ ] Server test: a venue with contacts and structured hours passes validation.

### Nice to Have (P2)
- [ ] Quick presets in the editor: "א׳–ה׳", "כל השבוע".

## UI/UX Notes

- Day chips show Hebrew letters (א ב ג ד ה ו ש), RTL order starting from א on the right.
- Dictionary (append): `venue_contacts` = "אנשי קשר", `venue_add_contact` = "הוסף איש קשר", `contact_role` = "תפקיד", `venue_hours_add_row` = "הוסף שעות", `venue_hours_from` = "מ-", `venue_hours_to` = "עד", `venue_manager_role` = "מנהל המקום".

## Atomic Sub-tasks

- [ ] A1: Let a venue store several contacts and structured opening hours — Schema and model additions; `build:schemas`; server validation test (`venue.schema.ts`, `venue.model.ts`, `server/test/**`).
- [ ] A2: Show opening hours in plain Hebrew — `venue-hours.util` `toDisplay` plus spec (Hebrew range forms, midnight crossing).
- [ ] A3: Add an interactive days-and-hours picker to the venue form — `HoursEditorComponent` plus spec; wire into the venue form; save structured hours and the generated strings (`shared/hours-editor/**`, `venue-form/**`).
- [ ] A4: Let the venue form add and list several contacts — Contacts FormArray, detail list (`venue-form/**`, `venue-detail/**`).
- [ ] A5: Build and test — Build, specs; add one new venue with two contacts and structured hours and check no 400s. Update session-state.

## Technical Considerations

- Dependencies: `VenueFormComponent`, `VenueDetailComponent`, `VenueListComponent` (card hours via the util), `.c-toggle-chip` (plan 339), `server/middleware/validate.js`.
- New files: `shared/hours-editor/*` plus spec.
- Model changes: additive optional fields only. Nothing removed from the schema, so stored docs stay valid.

## Out of Scope

- Any support for old venues: no migration, no parsing of old free-text hours, no read of the old single contact. Venues are test data (Human, 2026-10-26); delete one that does not fit.
- Removing the deprecated fields.

## Critical Questions

- Week order of the day chips:
  a) א (Sunday) first (default)
  b) ב (Monday) first

## Success Criteria

- [auto] `npm run build:schemas` → exit 0.
- [auto] Server tests (venue validation) → 0 failures.
- [auto] `npx ng test --watch=false --include=src/app/shared/hours-editor/**/*.spec.ts --include=src/app/core/utils/venue-hours.util.spec.ts --include=src/app/pages/venues/**/*.spec.ts` → 0 failures.
- [auto] `npm run build` → exit 0.
- [human] Add a new venue with two contacts → save → the detail page shows both with call links.
- [human] Hours: tap א–ה, 08:00–23:00 → save → the card and detail show "א׳–ה׳ · 08:00–23:00".

## Planner edit (2026-10-26)
Legacy/compat work removed on the Human's rule that only recipes and products are kept (venues, menus, users, businesses are test data): `parseLegacy`, the "היה:" hint, legacy contact hydrate, the `contactName` / `contactPhone` mirror, the legacy server test and the old-venue checks.
