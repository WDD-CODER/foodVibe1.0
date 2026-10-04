# Plan 373 — Venues C: tour videos (links with a visit date) and "save my current location"

Status: draft
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
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/venues/**
src/app/core/models/venue.model.ts
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

- [ ] A1: Schema and model; `build:schemas`; server test (`venue.schema.ts`, `venue.model.ts`, `server/test/**`).
- [ ] A2: Videos FormArray, plus the detail list (`venue-form/**`, `venue-detail/**`).
- [ ] A3: Geolocation button and state, plus the detail navigate links.
- [ ] A4: Build, specs. Phone test over HTTPS (geolocation needs a secure context; localhost is fine). Update session-state.

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
