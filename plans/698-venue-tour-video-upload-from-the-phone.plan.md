# Plan 698 — Upload a tour video from the phone, straight onto the venue page

Status: draft
Depends-on: 373
Track: code
Snapshot: e40c4787

## Problem Statement
Todo V1 (Dandan, 2026-11-23, grading PR #638): "I want to be able to load from the phone a video of the tour — the
user can do it from his phone and just tap a button and add the video." Plan 373 (merged #638, 0df51a40) stores
tour videos as links only (`venue.videos[]`: `url`, `visitDate`, `note`); uploads were left out for file size,
storage cost and the CSP.

Verified on `origin/main` e40c4787:
- `src/app/core/services/cloudinary.service.ts` uploads only images: `POST https://api.cloudinary.com/v1_1/<cloud>/image/upload`
  with the unsigned preset `environment.cloudinaryUploadPreset`, and returns `secure_url`.
- The CSP in `server/app.js:55-63` already allows it: `connectSrc` has `https://api.cloudinary.com`, `mediaSrc` has
  `https://res.cloudinary.com`. **No CSP change is needed.**
- The venue page's «סרטוני סיור» card (`venue-detail.component.html`, about line 179) lists `venue.videos` newest first
  with «פתח סרטון» (new tab) and shows «אין עדיין סרטונים» when empty. `videoSourceKey` in
  `src/app/core/utils/video-link.util.ts` labels a link by host (YouTube / Drive / WhatsApp / link).
- `VenueDataService.updateVenue(venue)` saves the whole venue (PUT, plan 373 review fix: `location: null` clears).

## Goals & Success Criteria
**Primary:** on the venue page, one tap on «העלה סרטון סיור» opens the phone's camera or gallery; the chosen video
uploads with a progress bar and appears at the top of «סרטוני סיור», dated today, saved at once.

- [auto] `pnpm run build` exits 0; `pnpm run lint` exits 0; `pnpm run lint:icons` exits 0.
- [auto] `pnpm run test:ci` exits 0, including `src/app/core/services/cloudinary.service.spec.ts` (A1) and `src/app/pages/venues/components/venue-detail/venue-detail.component.spec.ts` (A4).
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/698-venue-tour-video-upload-from-the-phone.plan.md` → `ARCH: ok`; `node scripts/scope-check.mjs --reuse --plan=plans/698-venue-tour-video-upload-from-the-phone.plan.md` exits 0.
- [auto] `node scripts/breadcrumbs-check.mjs` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `SKIP: no database configured`).
- [human] On a phone (or the PC), on a venue page, tap «העלה סרטון סיור», pick or record a short video: a progress bar runs, then the video is first in «סרטוני סיור» with today's date and the chip «הועלה»; «פתח סרטון» plays it in a new tab; after a reload it is still there.
- [human] A video over 100 MB is refused before any upload with «הסרטון גדול מדי (עד 100MB)», and the venue is unchanged.

## Execution Mode
- Parallel: yes — no open plan writes these files (Restaurant plans 663–689 touch no venue or Cloudinary file).
- Concurrent plans: any that do not touch `src/app/pages/venues/**` or `cloudinary.service.ts`.
- Isolated DB: no — writes only the existing `venue.videos` field.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/services/cloudinary.service.ts
src/app/core/services/cloudinary.service.spec.ts
src/app/core/utils/video-link.util.ts
src/app/core/utils/video-link.util.spec.ts
src/app/pages/venues/**
src/app/pages/venues/components/venue-detail/venue-detail.component.spec.ts
src/app/core/services/breadcrumbs.md
src/app/pages/breadcrumbs.md
docs/brain/component-families.md
src/app/pages/dashboard/dashboard.page.spec.ts
docs/workflow-kit/manifest.json
```

## Read Scope

Entire repo.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-4: preserves — no schema change: an uploaded video is one more `venue.videos[]` row (`url` = the Cloudinary
  `secure_url`), validated by the existing `shared/schemas/entities/venue.schema.ts` on the PUT.
- INV-1: preserves — the venue is saved through `VenueDataService.updateVenue`; no route, permission or scope change.
- INV-6: preserves — no AI call is added or changed (the scope matches `src/app/**/*ai*` only through the `venue-detail` folder name).
- INV-none: preserves — no CSP change (`server/app.js` already allows `api.cloudinary.com` for connect and
  `res.cloudinary.com` for media); no AI call; no new collection.

## Reuse Check
- none — no new component, util, pipe, service or `.c-*` class: `CloudinaryService` gains `uploadVideo(file)` beside `upload(file)` (same unsigned preset, `/video/upload`; no second upload path), `videoSourceKey` in `src/app/core/utils/video-link.util.ts` gains one host, and the venue page reuses `.c-btn-ghost` and `app-loader`.

## Defaults

- confirm-destructive-action — exception — why: nothing is removed; removing a video stays in the venue form (plan 373).
- empty-state-on-list — applies — how: the card keeps «אין עדיין סרטונים» when empty, now with the upload button under it.
- loading-and-error-states — applies — how: a progress bar with the percent while uploading; a refusal (too big, upload failed, save failed) shows its own message and leaves the venue unchanged.
- unsaved-changes-on-leave — exception — why: the upload saves the venue at once; there is no unsaved draft. Leaving mid-upload cancels it (the request is unsubscribed on destroy) and saves nothing.
- hints-in-tooltips — exception — why: no hint text.
- leave-and-return — exception — why: the user stays on the venue page.
- app-list-container — exception — why: the videos list is a card inside the venue page, not a page list.
- one-breakpoint-set — applies — how: no new `@media`.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef touring a venue, I want to film the space and add the clip to the venue with one tap, so the team sees it later without me copying links.

## Functional Requirements

### Must Have (P0)
- [ ] **`CloudinaryService.uploadVideo(file: File): Observable<VideoUploadEvent>`** — `POST https://api.cloudinary.com/v1_1/${cloud}/video/upload`, same `upload_preset`, `reportProgress: true`, `observe: 'events'`. Emits `{ kind: 'progress', percent }` (0–100, rounded) and finally `{ kind: 'done', url: secure_url }`. The existing image `upload` is unchanged.
- [ ] **Size limit:** files over `100 * 1024 * 1024` bytes are refused before any request with `video_too_big` («הסרטון גדול מדי (עד 100MB)») — the Cloudinary free tier's video upload cap. A file whose `type` does not start with `video/` → `video_not_video` («הקובץ שנבחר אינו סרטון»).
- [ ] **Venue page button:** in the «סרטוני סיור» card header (inline end), a `.c-btn-ghost` «העלה סרטון סיור» (`venue_upload_video`, icon `upload`) that clicks a hidden `<input type="file" accept="video/*">` (no `capture`, so the phone offers camera or gallery). Same rule as the page's existing «עריכה» button (`venue-detail.component.html:10-17`): disabled with the `sign_in_to_use` title while `!isLoggedIn()`.
- [ ] **Upload flow** (`VenueDetailComponent`): `uploading_` signal with the percent; while uploading the button is disabled and a progress bar with «מעלה… N%» (`venue_video_uploading`) shows in the card. On `done`: `venueData.updateVenue({ ...venue, videos: [{ url, visitDate: <today, local midnight via isoToLocalEpoch(todayIso())> }, ...(venue.videos ?? [])] })`; toast `venue_video_added` («הסרטון נוסף»). Upload error → `venue_video_upload_failed` («העלאת הסרטון נכשלה. נסו שוב.»); save error → the venue data service's own message; the venue stays as it was in both. The request is unsubscribed when the component is destroyed (`takeUntilDestroyed`).
- [ ] **Source chip:** `videoSourceKey` returns `video_source_upload` («הועלה») for a `res.cloudinary.com` URL.

### Should Have (P1)
- [ ] `src/app/core/services/breadcrumbs.md`: the Cloudinary line names `uploadVideo`. `src/app/pages/breadcrumbs.md`: the venues line names the upload button.

### Nice to Have (P2)
- [ ] none.

## UI/UX Notes
- RTL; logical properties only. The progress bar sits under the card header, full card width.
- Dictionary keys (append-only, `general`): `venue_upload_video` ("העלה סרטון סיור"), `venue_video_uploading`
  ("מעלה… {{percent}}%"), `venue_video_added` ("הסרטון נוסף"), `venue_video_upload_failed`
  ("העלאת הסרטון נכשלה. נסו שוב."), `video_too_big` ("הסרטון גדול מדי (עד 100MB)"), `video_not_video`
  ("הקובץ שנבחר אינו סרטון"), `video_source_upload` ("הועלה").
- Icon `upload` is already registered (`src/app/app.config.ts:22`); the venue-detail spec adds it to its own icon pick, as plan 373 did for `phone` and `play`.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Let the app upload a video to Cloudinary with progress — `uploadVideo` with progress events, the size and type checks as a pure exported `checkVideoFile(file)`; spec with `HttpTestingController` (endpoint, preset, progress percent, done url, refusals without a request) — src/app/core/services/cloudinary.service.ts, src/app/core/services/cloudinary.service.spec.ts
- [ ] A2: Label an uploaded video as uploaded — `res.cloudinary.com` → `video_source_upload`, with a spec case — src/app/core/utils/video-link.util.ts, src/app/core/utils/video-link.util.spec.ts
- [ ] A3: Add the one-tap upload button and progress to the venue page — button + hidden file input in the videos card header, `uploading_` progress bar, save on done, the three messages — src/app/pages/venues/components/venue-detail/**
- [ ] A4: Prove the venue page flow with unit tests — a picked video uploads, then `updateVenue` gets it first with today's date; too big and not-a-video never call the service; an upload error leaves the venue unchanged; the button is disabled while signed out — src/app/pages/venues/components/venue-detail/venue-detail.component.spec.ts
- [ ] A5: Add the Hebrew words — the keys of UI/UX Notes — public/assets/data/dictionary.json
- [ ] A6: Record the upload in the maps and run every `[auto]` check — paste outputs under Execution Notes — src/app/core/services/breadcrumbs.md, src/app/pages/breadcrumbs.md

## What happens when
- The Cloudinary preset refuses videos (a 400 naming the preset or the resource type): the upload shows
  `venue_video_upload_failed`; the builder records it under Execution Notes as `seen:` and the Human's card says so —
  the fix is a Cloudinary dashboard setting (Human), not code.
- The phone goes offline mid-upload: the request errors → `venue_video_upload_failed`, nothing saved.
- Two uploads in a row: the button is disabled until the first finishes.
- The user leaves the page mid-upload: the request is cancelled; nothing is saved.

## Technical Considerations
- Dependencies: plan 373 (`venue.videos`, the videos card, `video-link.util.ts`, `isoToLocalEpoch` / `todayIso` in
  `date-input.util.ts`); `CloudinaryService`; `VenueDataService.updateVenue`; `UserMsgService` for toasts.
- New files needed: `src/app/core/services/cloudinary.service.spec.ts` if it does not exist.
- Model changes: none. Backend / API: none. Data / migration: none. CSP: none (verified above).
- Cost: Cloudinary free tier (25 monthly credits); a 100 MB cap per video keeps one upload well inside it. No paid tier.
- Security: the upload is the same unsigned preset the photos use; the URL stored is Cloudinary's `secure_url`; the
  link opens with `rel="noopener"` as today.

## Out of Scope
- Uploading from the venue edit form (the form keeps links; the page button saves at once).
- Trimming, compressing or embedding a player; thumbnails.
- Deleting the file from Cloudinary when a video row is removed.

## Critical Questions
- none — Dandan asked for it (todo V1, 2026-11-23); the choices above are the Planner's defaults, and anything they do
  not settle is a `behaviour:` decision for him to grade.

## Execution Notes
- Planner 2026-11-23: written from todo V1 (PR #638 grading). Checked on main e40c4787: CSP already allows
  Cloudinary connect and media; the image upload path and the plan 373 videos card are in place.
