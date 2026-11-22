# Plan 373 — Venues C: tour videos (links with a visit date) and "save my current location"

Status: draft
Track: split — look in Claude Design; schema, geolocation, lat-lng here
Snapshot: b776163f43fd1db42a5e0501b3a0e5c30b0bded1

## Problem Statement

Dandan wants two additions to venues (`src/app/pages/venues/`):

- **Tour videos.** Attach video clips from site visits, each with a tour date, to a venue. Today a venue has only `photoUrl` (one image via the unsigned Cloudinary upload, `src/app/core/services/cloudinary.service.ts`). Agreed approach: store links (YouTube unlisted, Google Drive, WhatsApp, any URL) with a visit date and a note, not uploads. That avoids video size limits on phone uploads, storage cost, and the CSP change: `server/app.js` has no `media-src`, so Cloudinary video playback would be blocked.
- **Current location.** When adding a venue on site with a phone or tablet, save the current location. There are no coordinate fields today (`address?: string` only) and no geolocation or map code anywhere.

The schema is strict (`shared/schemas/entities/venue.schema.ts`, enforced by `server/middleware/validate.js`), so new fields must be added there, then `npm run build:schemas`.

## Goals & Success Criteria

- Primary: the venue form has a "סרטוני סיור" list (URL, visit date, note; add and remove). The detail page shows them newest first, each with its date, note and an "open video" button.
- Primary: the venue form has a "השתמש במיקום הנוכחי" button that stores lat/lng (+accuracy). The detail page shows "נווט" links (Google Maps and Waze) when coordinates exist.
- Success: existing venues are unaffected (both fields optional). No CSP change.

## Execution Mode

- Parallel: no. Run after plan 372 (Venues B; same files and schema).
- Concurrent plans: none touching `src/app/pages/venues/**` or `shared/schemas/**`
- Isolated DB: yes (schema change)

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/venues/**
src/app/core/models/venue.model.ts
shared/schemas/entities/venue.schema.ts
server/test/**
src/app/core/utils/**
src/app/core/utils/date-input.util.spec.ts
src/app/core/utils/video-link.util.spec.ts
docs/brain/component-families.md
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

- As an event chef, after touring a venue I want to attach the tour videos with the date, so the team can review them later.
- As a chef standing at a new venue, I want to save its location with one tap.

## Functional Requirements

### Must Have (P0)
- [ ] Schema (additive): `videos: z.array(z.strictObject({ url: z.string(), visitDate: z.number().optional(), note: z.string().optional() })).optional()` and `location: z.strictObject({ lat: z.number(), lng: z.number(), accuracy: z.number().optional() }).optional()`. Run `npm run build:schemas`.
- [ ] Model: matching optional fields on `VenueProfile`.
- [ ] Form, videos:
  - A `videos` FormArray (URL required and validated as `https://…`; visit date `<input type="date">`, stored as epoch ms; note).
  - Add and remove rows; included in both add and update payloads.
  - Hydrated on edit.
- [ ] Detail, videos:
  - A "סרטוני סיור" section sorted by `visitDate` desc. Each card shows date (he-IL), note, source label (YouTube / Drive / WhatsApp / link, derived from the hostname) and a button "פתח סרטון" (`target="_blank" rel="noopener"`).
  - No embedding or thumbnails (no CSP change).
- [ ] Form, location:
  - A button "השתמש במיקום הנוכחי" calls `navigator.geolocation.getCurrentPosition` (`enableHighAccuracy`, ~10s timeout).
  - Show "נשמר מיקום (±{accuracy} מ׳)" plus a "נקה" link. Show errors for denied or unavailable (no crash).
  - Hidden when `navigator.geolocation` is missing.
  - Included in both payloads.
- [ ] Detail, location: when `location` exists, show "נווט" buttons: Google Maps `https://www.google.com/maps/search/?api=1&query={lat},{lng}` and Waze `https://waze.com/ul?ll={lat},{lng}&navigate=yes`.
- [ ] Both new fields are included in the plan 371 (Venues A) unsaved-changes snapshot.

### Should Have (P1)
- [ ] Server test: a venue with videos and location passes validation; an invalid location (string lat) is rejected.

### Nice to Have (P2)
- [ ] When `address` is empty and a location is saved, offer "הוסף כתובת" as a hint (no reverse geocoding).

## UI/UX Notes

- Dictionary (append): `venue_videos` = "סרטוני סיור", `venue_add_video` = "הוסף סרטון", `video_url` = "קישור לסרטון", `visit_date` = "תאריך סיור", `open_video` = "פתח סרטון", `use_current_location` = "השתמש במיקום הנוכחי", `location_saved` = "נשמר מיקום", `location_denied` = "אין הרשאת מיקום", `navigate` = "נווט".
- The location button is most useful on phone; it's shown at all widths.

## Atomic Sub-tasks

- [x] A1: Let a venue store tour video links and a saved location — Schema and model; `build:schemas`; server test (`venue.schema.ts`, `venue.model.ts`, `server/test/**`).
- [x] A2: Add tour videos with a visit date to the venue form and detail page — Videos FormArray, plus the detail list (`venue-form/**`, `venue-detail/**`).
- [x] A3: Add a "save my current location" button and navigation links — Geolocation button and state, plus the detail navigate links.
- [ ] A4: Build, test and try it on a phone over HTTPS — Build, specs. Phone test over HTTPS (geolocation needs a secure context; localhost is fine).

## Architecture Impact

- INV-4: preserves — the two new fields are defined once in `shared/schemas/entities/venue.schema.ts` and the server keeps validating every venue write against it (`server/middleware/validate.js` unchanged).
- INV-1: preserves — no route, permission or business-scope code changes; venues still save through `VenueDataService`.
- INV-6: preserves — no AI call is added or changed (the scope only matches `src/app/**/*ai*` through the `venue-detail` folder name).
- INV-none: preserves — no CSP change (links only, no embedded player), no AI call, no taxonomy term.

## Reuse Check

- Tour videos rows in the venue form — family: form-field — rung: 2 — why: the same `infra-section` / `infra-row` layout, `c-input`, `c-btn-ghost` add button and `btn-icon` remove (with the undo toast) the contacts rows use.
- `.video-edit-row`, `.video-url`, `.video-date`, `.video-note`, `.video-url-error` — family: form-field — rung: 2 — why: page-local flex sizes and the error line inside the existing `.infra-row`; no new look, no `.c-*`.
- Visit date in a video row — family: form-field — rung: 1 — why: `app-date-field` (the plan 502 date rule), bound through `[value]` / `(valueChange)` / `(invalidChange)` to the row's controls; no native date input.
- `.location-saved`, `.location-error`, `.location-btn` — family: feedback — rung: 2 — why: the saved / error line under the location button and its alignment; the waiting state is `app-loader`, as the photo upload.
- Source label on a video card — family: chip — rung: 2 — why: `.c-chip c-chip--tag c-chip--sm`.
- `.video-row` — family: engine-classes — rung: 2 — why: the detail page's own `menus-list` / `menu-row` / `menu-row-name` / `menu-row-meta` rows reused; `.video-row` only adds a gap.
- `.venue-nav` — family: engine-classes — rung: 2 — why: a flex row holding two `c-btn-ghost--sm` links under the address; no new `.c-*` class.
- Location button, "נקה", "פתח סרטון" and the Waze / Google Maps links — family: engine-classes — rung: 1 — why: `c-btn-ghost` and `c-btn-ghost--sm`.
- `isoToLocalEpoch` — family: helpers — rung: 3 — why: added to `src/app/core/utils/date-input.util.ts` beside `todayIso` (its inverse), with a spec (review round 2, `approved: src/app/core/utils/**`).
- `video-link.util` (`videoSourceKey`) — family: helpers — rung: 3 — why: a new pure helper in `src/app/core/utils/video-link.util.ts` with a spec; hostname to a translation key (review round 2).

## Defaults

- unsaved-changes-on-leave — applies — how: the venue form's existing `useUnsavedChanges` snapshot now holds the videos (form array) and the saved location; the plan 371 `pendingChangesGuard` is unchanged.
- confirm-destructive-action — exception — why: removing a video row uses the form's existing undo toast (`removeRowWithUndo_`), and "נקה" on the location only changes the unsaved form.
- empty-state-on-list — applies — how: the detail page's videos card shows "—" with no videos, like its sibling cards (`detail-empty`).
- loading-and-error-states — exception — why: no new server request; the venue pages load as before, and the one new wait (geolocation) shows `app-loader` and a message on refusal or timeout, checked by the phone item below.
- hints-in-tooltips — exception — why: no dialog and no hint text is added.
- leave-and-return — exception — why: nothing here sends the user to another page; the video links open in a new tab.
- app-list-container — exception — why: the videos list is a card inside the venue detail page, not a page list.
- one-breakpoint-set — applies — how: no new `@media`; the new rows wrap with flex inside the existing breakpoints.

## Technical Considerations

- Dependencies: `VenueFormComponent`, `VenueDetailComponent`, the guard contract from plan 371 (Venues A).
- New files: none.
- Model changes: additive optional fields.
- Geolocation requires HTTPS; prod already forces it (`upgradeInsecureRequests`).

## Out of Scope

- Uploading video files; embedded players; thumbnails.
- Maps or reverse geocoding.

## Critical Questions

- Video URL validation:
  a) Any `https://` URL (default)
  b) Only YouTube and Drive

## Success Criteria

- [auto] `npm run build:schemas` → exit 0. Server tests → 0 failures.
- [auto] `npx ng test --watch=false --include=src/app/pages/venues/**/*.spec.ts` → 0 failures.
- [auto] `npm run build` → exit 0.
- [human] Edit a venue → add 2 video links with dates → save → the detail page shows them newest first; "פתח סרטון" opens each in a new tab.
- [human] Phone, add venue on site → "השתמש במיקום הנוכחי" → allow → "נשמר מיקום (±15 מ׳)" → save → detail "נווט" opens Waze or Google Maps at that spot. Deny permission → a clear message, the form still works.
- [human] the list's page with no items · open the page · a message says the list is empty — a venue with no videos → its detail page → the "סרטוני סיור" card shows "—".

## Execution Notes

Built on `feat/373-venue-videos-location` from `origin/main` 7c8fccd, 2026-11-22.

### Drift from the snapshot (b776163, not in this clone's history; checked by symbol on main)

- All named paths exist: `src/app/pages/venues/components/venue-form/`, `venue-detail/`, `venue.schema.ts`, `venue.model.ts`, `server/middleware/validate.js`, `cloudinary.service.ts`. `server/app.js` still has no `media-src` and keeps `upgradeInsecureRequests`.
- Plans 371 and 372 landed: the form has `useUnsavedChanges` (snapshot = form + photo + hours), contacts and the `app-hours-editor`. The new fields join that snapshot (videos through the form array, the location as its own key).
- The plan says `<input type="date">`; since plan 502 every date must be `app-date-field` (reuse-lint warns on a native one), so the visit date uses `app-date-field`. Its half-typed state blocks save, as in the hours editor.
- The plan says `npm run build:schemas`; the repo runs pnpm (`pnpm run build:schemas`).
- Server tests are vitest (`server/test/*.test.js`); the new test sits next to plan 372's `venue-contacts-hours-schema.test.js`.
- The venue detail page had no spec; `venue-detail.component.spec.ts` is new (a test file, inside `venue-detail/**`). `src/testing/test-lucide-icons.ts` lacks `phone` and `play`, so that spec adds them locally rather than editing the shared file (outside scope).
- The plan's Goals lines carry no `[auto]` / `[human]` tag (`scope-check --tags` reports it); left as written, the Planner's call.
- Dictionary keys added beyond the plan's list: `video_url_invalid`, `video_source_youtube|drive|whatsapp|link`, `venue_location`, `location_accuracy` (`(±{meters} מ׳)`), `location_unavailable`, `location_address_hint` (P2), `nav_waze`, `nav_google_maps`.

### Decisions the plan did not settle

- behaviour: the visit date is optional and stored as local midnight of that day; a video without a date sorts last and shows "—" — reverse: make `visitDate` required in the row.
- behaviour: a link with spaces around it is accepted and saved trimmed; the check is `https://` + no inner spaces (Q1 = a) — reverse: tighten `HTTPS_URL` in `venue-form.component.ts`.
- behaviour: the location section sits right under the basic fields (above contacts) so it is one tap away on site — reverse: move the block in `venue-form.component.html`.
- behaviour: accuracy is rounded to whole metres; a timeout and "position unavailable" share one message (`location_unavailable`) — reverse: split the key per error code.
- behaviour: the videos card always shows on the detail page ("—" when empty, empty-state default) — reverse: wrap the section in `@if (videos_().length)`.
- behaviour: the Waze / Google Maps links sit under the address in the hero, labelled "נווט:" — reverse: move them to their own card.
- behaviour: P2 is done as a plain hint ("הוסף כתובת…") under the saved location when the address is empty; no reverse geocoding — reverse: drop the `location_address_hint` block.
- behaviour: saving a venue whose videos were all removed sends `videos: []` — reverse: send `undefined` for an empty list.
- behaviour: a new venue with no location leaves the key out; only an update sends `location: null` (review fix 1) — reverse: send null on add too.

### A4 evidence (all run from the repo root)

- `pnpm install` → exit 0 — `Done in 1.4s using pnpm v10.34.6` (warning only: ignored build scripts of 6 optional native packages).
- `pnpm run build:schemas` → exit 0 — `> tsc -p shared/schemas/tsconfig.cjs.json` (no output).
- `pnpm run build` → exit 0 — `Application bundle generation complete. [20.040 seconds]` / `Output location: /home/user/foodVibe1.0/dist/food-vibe1.0`. No warning names a venue file.
- `pnpm run lint` → exit 0 — `✖ 69 problems (0 errors, 69 warnings)`; the same 69 warnings on main without this change, none in venue files.
- `pnpm run test:server` → exit 0 — `Test Files  148 passed (148)` / `Tests  1974 passed (1974)`.
- `pnpm run test:ci` → exit 0 — `Executed 2730 of 2730 SUCCESS` / `TOTAL: 2730 SUCCESS`. Run with `CHROME_BIN` pointing at a local wrapper that adds `--no-sandbox` (the cloud container runs as root); no repo change.
- Venue specs alone (`ng test --include='src/app/pages/venues/**/*.spec.ts'`) → exit 0 — `TOTAL: 30 SUCCESS`.
- Extra checks → `lint:icons` `✓ All Lucide icons registered (113 icons in pick, 0 violations)`; `reuse-lint --diff=origin/main` `REUSE: ok`; `scope-check --diff=origin/main --plan=…` `SCOPE: ok`.
- A4 stays unticked: its phone-over-HTTPS check and the `[human]` Success Criteria wait on the Human. The third `[human]` item (empty videos card) was added because `scope-check --defaults` requires the empty-state card; `--defaults`, `--reuse`, `--arch` and `kit-checks --plan` now report ok.

### Review round 1 (PR #638, returned to Worker)

- Fix 1 (major), clearing a saved location did not persist: the venue PUT (`server/routes/generic.js:819`) only `$set`s the keys it is sent, so dropping `location` kept the stored spot. Now `location` is `.nullable().optional()` in `venue.schema.ts`, `VenueProfile.location` is `VenueLocation | null`, and the form's update payload sends `location: null` after "נקה". The detail page's `navLinks_` and the form's hydrate already read null as "no location" (`!loc`, `?? null`); a detail spec now covers it. New server tests in `server/test/venue-videos-location-schema.test.js`: a PUT with `location: null`, then a GET, returns no location; a PUT without the key keeps the stored one. The form spec now expects `null` on update and no key on add.
- Fix 2 (helpers into `src/app/core/utils/**`): the Human chose "leave them", so scope was not widened. `isoToLocalEpoch` (`venue-form.component.ts`) and `videoSourceKey` (`venue-detail.component.ts`) stay file-private, one use each. Move them if a second user appears.
- Noted, not fixed (outside this plan): `photoUrl` has the same pattern. `photoUrl: this.photoUrl_() ?? undefined` means a removed photo would not clear on update, but the form has no remove-photo control today.

### A4 evidence, review round 1 (re-run after the fix)

- `pnpm install` → exit 0 — `Done in 5.3s using pnpm v10.34.6`.
- `pnpm run build:schemas` → exit 0 — `> tsc -p shared/schemas/tsconfig.cjs.json` (no output).
- `pnpm run build` → exit 0 — `Application bundle generation complete. [17.387 seconds]`; no warning names a venue file.
- `pnpm run lint` → exit 0 — `✖ 69 problems (0 errors, 69 warnings)` (unchanged from main; none in venue files).
- `pnpm run test:server` → exit 0 — `Test Files  148 passed (148)` / `Tests  1976 passed (1976)` (+2 route tests).
- `pnpm run test:ci` → exit 0 — `TOTAL: 2732 SUCCESS` (+2 specs), with the same local `--no-sandbox` Chrome wrapper.

### Review round 2 (fix 2 done, branch merged with main)

- Fix 2 now done on the Human's `approved: src/app/core/utils/**` (the round 1 "leave them" is superseded). `isoToLocalEpoch` moved to `src/app/core/utils/date-input.util.ts` beside `todayIso`, and `videoSourceKey` to a new `src/app/core/utils/video-link.util.ts` (typed `VideoSourceKey`). Each has a spec: `date-input.util.spec.ts` (+3 cases) and `video-link.util.spec.ts` (4 cases, including a look-alike host). Neither component keeps a local copy.
- The Reuse Check rows are now rung 3 (helpers), so `kit-checks` needs the registry to name them. On the Human's `approved: docs/brain/component-families.md` I appended one line under `### helpers`. `kit-checks --plan` → `KIT_CHECKS: ok (6 checks)`.
- `git fetch origin` + `git merge origin/main` (c452d70, 17 commits). One conflict, in `public/assets/data/dictionary.json`: both sides appended to the end of `general`. Resolved by keeping both, main's `export_*` keys first and this plan's keys after; the JSON parses and nothing else conflicted.
- `pnpm run build` → exit 0 — `Application bundle generation complete. [15.106 seconds]`.
- `pnpm run test:ci` → exit 0 — `TOTAL: 2765 SUCCESS` (main's new specs + this round's util specs).
- **Open, needs the Planner on main:** `ci-scope-check` (the CI "rules" step "Plan scope") still fails with `SCOPE: test-out` for `src/app/core/utils/date-input.util.spec.ts` and `video-link.util.spec.ts`. By design it reads a plan's test lines from main's copy, so a Worker's own scope edit cannot approve its own tests. The fix is for the Planner to commit this plan's scope block to main with `src/app/core/utils/**`, the two spec paths and `docs/brain/component-families.md`. I did not try to get around the check.
