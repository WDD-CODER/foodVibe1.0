# Plan 584 — Sign-up asks the new owner to read and accept the terms, and stores the acceptance

Status: draft
Depends-on: none
Snapshot: 1742a056da003dc6e06edc20739484fe50464b28

## Problem Statement
The Human (2026-11-12) wants the pilot terms (`docs/frontdesk/pilot-terms-draft.md` v2, written in plan 558's follow-up,
on `orch/run-546` at 8a7a7e7a) accepted in the app the way the industry does it (click-wrap): at sign-up the owner
opens the terms in a popup, scrolls to the end, confirms, and only then can create the account. The acceptance must be
provable later: which version, when, from which address. Verified at 1742a056:

- Sign-up lives in `src/app/core/components/auth-modal/auth-modal.component.{ts,html}` (`isSignUp`, `onSubmit()` →
  `UserService.signup(newUser, password, businessName)` in `src/app/core/services/user.service.ts:314`, which posts to
  `POST /api/v1/auth/signup` in `server/routes/auth.js:145`). Nothing about terms exists today.
- The user document (`server/models/user.model.js`) has no terms fields; `toPublicUser` (`server/routes/auth.js:83`)
  is what login, sign-up, refresh and guest hand to the client.
- `app-modal-shell` (`src/app/shared/modal-shell/`) has `dismissible`, `size` and `titleKey` inputs; `ModalController`
  lives in `src/app/core/services/modal-controller.ts`.
- Server sign-up tests: `server/test/auth-signup-business-name.test.js`, `server/test/auth-business.test.js`,
  `server/test/business-team.test.js` post `/signup` without terms; the signup limiter allows 5 requests per app
  instance, so a new test file is its own file.
- e2e specs sign in through `signInQa` (`e2e/helpers/qa-session.ts` → `scripts/qa/lib/qa-login.mjs`).

## Goals & Success Criteria
- [auto] `pnpm run test:server` passes, including the new `server/test/auth-terms.test.js`: sign-up without
  `termsVersion` → 400 `TERMS_NOT_ACCEPTED`; with a wrong version → 400 `TERMS_NOT_ACCEPTED`; with the current version
  → 201 and the user document holds `termsAcceptedVersion` = current, `termsAcceptedAt` (a number within the last
  minute) and `termsAcceptedIp`; `POST /api/v1/auth/accept-terms` with a valid token and the current version sets the
  three fields and returns the public user with `termsAcceptedVersion`; without a token → 401; with an old version → 400.
- [auto] `pnpm run test:server` passes with the three existing sign-up test files updated to send `termsVersion`.
- [auto] `server/test/auth-terms.test.js` also checks the version guard: the SHA-256 of
  `JSON.stringify(sections)` in `public/assets/legal/terms.he.json` equals its `sectionsHash` field, so a text change
  without a new `version` + `sectionsHash` fails CI (the Human's rule: every terms change asks every user again).
- [auto] `pnpm run test:ci` passes, including `src/app/core/components/terms-modal/terms-modal.component.spec.ts`
  (the confirm button is disabled until the text box is scrolled to its end, enabled at once when the text fits
  without scrolling, emits `accepted` with the version on click) and the updated
  `src/app/core/components/auth-modal/auth-modal.component.spec.ts` (sign-up submit without accepting shows the
  `terms_required` error and calls no signup; after accepting, `signup` is called with the version).
- [auto] `pnpm run build`, `pnpm run lint`, `node scripts/reuse-lint.mjs --diff=origin/main`,
  `node scripts/breadcrumbs-check.mjs` pass.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] On `/welcome`, "הרשמה" opens the sign-up form; clicking "תנאי השימוש" opens the terms popup; "אני מסכים/ה" is
  disabled; after scrolling the text to the end it is enabled; clicking it closes the popup and the row shows
  "קראתי ואני מסכים/ה לתנאי השימוש" checked (`e2e/ui/584-1.spec.ts`; no account is created).
- [ui] A QA user signed in with `signInQa` reaches `/dashboard` with no terms popup (`e2e/ui/584-2.spec.ts`).
- [human] On a phone, the terms popup reads well in Hebrew (headings, numbered clauses, scrolls smoothly) and the
  confirm button sits at the bottom, reachable with one thumb.
- [human] An existing account that never accepted signs in and sees the terms popup with no close button; after
  "אני מסכים/ה" it does not come back on the next sign-in.

## Execution Mode
Orchestrator run or a Worker slot. Auth path: the checker's security review runs (`server/routes/auth.js`).

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, public/assets/data/dictionary.json, src/app/app.routes.ts` — add to them, never rewrite or
remove an existing entry without escalating).

```scope
public/assets/legal/terms.he.json
server/routes/auth.js
server/models/user.model.js
server/utils/terms-version.js
server/test/auth-terms.test.js
server/test/auth-signup-business-name.test.js
server/test/auth-business.test.js
server/test/business-team.test.js
server/breadcrumbs.md
src/app/core/models/user.model.ts
src/app/core/models/terms.model.ts
src/app/core/services/user.service.ts
src/app/core/services/user.service.spec.ts
src/app/core/services/terms.service.ts
src/app/core/services/terms.service.spec.ts
src/app/core/components/terms-modal/**
src/app/core/components/terms-gate/**
src/app/core/components/auth-modal/auth-modal.component.ts
src/app/core/components/auth-modal/auth-modal.component.html
src/app/core/components/auth-modal/auth-modal.component.scss
src/app/core/components/auth-modal/auth-modal.component.spec.ts
src/app/appRoot/app.component.ts
src/app/appRoot/app.component.html
src/app/core/components/breadcrumbs.md
src/app/core/services/breadcrumbs.md
scripts/qa/lib/qa-login.mjs
e2e/helpers/qa-session.ts
e2e/ui/584-1.spec.ts
e2e/ui/584-2.spec.ts
docs/agent/standards-backend.md
docs/frontdesk/pilot-terms-draft.md
```

## Read Scope
`docs/frontdesk/pilot-terms-draft.md`, `src/app/shared/modal-shell/**`, `src/app/core/services/modal-controller.ts`,
`docs/agent/standards-security.md`, `docs/agent/standards-angular.md`, `docs/brain/component-families.md`.

## Escalation Protocol
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-none: preserves — the terms fields live on the user document and are written only by `server/routes/auth.js`
  (sign-up and the new accept route, both for the signed-in user's own record); no business data, no generic route,
  no schema package, no taxonomy and no AI call is touched.

## Reuse Check
- `TermsModalComponent` (`src/app/core/components/terms-modal/`) — family: modal-shell — rung: 1 — why: built inside
  `app-modal-shell` with `.c-modal-body` / `.c-modal-actions`; no hand-drawn overlay.
- `TermsGateComponent` (`src/app/core/components/terms-gate/`) — family: modal-shell — rung: 1 — why: only decides
  when to show `app-terms-modal` with `dismissible=false`; no own frame.
- `TermsService` (`src/app/core/services/terms.service.ts`) — family: none — rung: 4 — why: loads the one terms file and
  posts the acceptance; no existing service owns legal text.
- `server/utils/terms-version.js` — family: none — rung: 4 — why: reads the current version from the same JSON file the app
  shows, so the server and the app can never disagree on the version.
- The acceptance row's checkbox — family: none — rung: 4 — why: no registry family covers a form checkbox; a plain `<input type="checkbox">` styled by the
  existing form engine classes, disabled (filled only by the popup).

## Step 0 — Reality Check
Run `git fetch origin`; confirm the files in the Problem Statement still match; confirm
`docs/frontdesk/pilot-terms-draft.md` v2 is on the base branch. It is on `orch/run-546` (8a7a7e7a), not yet on `main`:
on a base without it, take the text with `git show origin/orch/run-546:docs/frontdesk/pilot-terms-draft.md` and write
the JSON from it; do not create or edit the docs file in that case (it arrives with run-546's merge) — add the note line
of P0 #1 only when the file is on the base.

## User Stories
- As a business owner signing up, I want to read the terms in a clear popup before I agree, so I know what I accept.
- As Dandan, I want every account's acceptance stored with version, time and address, so I can prove it in a dispute.
- As Dandan, when the lawyer changes the terms, I want every user to accept the new version once (Q1).

## Functional Requirements

### Must Have (P0)
1. **One terms file.** `public/assets/legal/terms.he.json`: `{ "version": "2026-11-v2", "title": "...",
   "updated": "2026-11-12", "sectionsHash": "<sha256 hex of JSON.stringify(sections)>", "sections": [{ "heading":
   "...", "paragraphs": ["..."] }] }`, the text of
   `docs/frontdesk/pilot-terms-draft.md` v2 without the lawyer note at the top and without the "טיוטה" line. Plain
   strings only (no HTML); rendered with text bindings, never `innerHTML`. `docs/frontdesk/pilot-terms-draft.md` gets
   one line at its top: the app shows `public/assets/legal/terms.he.json`; change both together and bump `version`.
2. **Server version.** `server/utils/terms-version.js` exports `currentTermsVersion()`, read once from
   `../../public/assets/legal/terms.he.json` (cached).
3. **Sign-up requires acceptance.** `POST /signup` reads `termsVersion` from the body; if it is not
   `currentTermsVersion()` → 400 `{ error: 'TERMS_NOT_ACCEPTED' }` before any other write. On success the user is
   created with `termsAcceptedVersion`, `termsAcceptedAt: Date.now()`, `termsAcceptedIp: req.ip`.
4. **Accept route.** `POST /api/v1/auth/accept-terms` (existing auth middleware, signed-in user only, the refresh
   limiter's settings): body `{ termsVersion }`; not current → 400 `TERMS_NOT_ACCEPTED`; else sets the three fields on
   `req.user`'s own document and returns `{ user: toPublicUser(updated) }`.
5. **Public user.** `toPublicUser` adds `termsAcceptedVersion` (or `null`). `User` in `src/app/core/models/user.model.ts`
   gets `termsAcceptedVersion?: string | null`. The IP and time are never sent to the client.
6. **Model.** `server/models/user.model.js`: `termsAcceptedVersion: { type: String, default: null }`,
   `termsAcceptedAt: { type: Number, default: null }`, `termsAcceptedIp: { type: String, default: null }`.
7. **Terms popup.** `TermsModalComponent` (`app-terms-modal`): inputs `dismissible` (default true); output
   `accepted` (the version) and `closed`. Inside `app-modal-shell` (size `lg`, sheet on phones as other popups do):
   title, "updated" date, the sections as `<h3>` + `<p>`, in a scrolling `.c-modal-body`. A footer
   (`.c-modal-actions`) with "אני מסכים/ה" (primary) and, when dismissible, "סגור". The button is disabled until the
   body is scrolled to within 8px of its end, or at once when the body does not overflow; a hint under it reads
   "יש לגלול עד סוף התנאים". Escape and "סגור" close without accepting (one step back: back to the form).
8. **Sign-up row.** In the sign-up form, before the submit button: a disabled checkbox + the text "קראתי ואני מסכים/ה
   ל" + a link-button "תנאי השימוש" that opens the popup. Accepting checks the box and stores the version in the
   component; it stays checked if the user switches tabs and back. Submit while unchecked → error key
   `terms_required` ("יש לקרוא ולאשר את תנאי השימוש"), no request. `UserService.signup(newUser, password,
   businessName, termsVersion)` sends `termsVersion`; the server error `TERMS_NOT_ACCEPTED` maps to `terms_required`.
9. **Existing users and every terms change (Q1 = a).** `TermsGateComponent` (`app-terms-gate`, placed once in `app.component.html`): when a
   signed-in, non-guest user's `termsAcceptedVersion` differs from the file's `version`, it shows `app-terms-modal`
   with `dismissible=false` — for an account that never accepted and for every account after each new
   `version`, even one that accepted an older version; accepting posts `accept-terms`, updates the stored user and hides it. A failed post shows
   the existing error toast and keeps the popup. Guests (the dev auto-guest and `/cook/:id` guests) never see it.
10. **QA accounts.** `scripts/qa/lib/qa-login.mjs` (used by `signInQa`) posts `accept-terms` with the current version
    right after login when the returned user's `termsAcceptedVersion` is not current, so no e2e spec meets the popup.
11. **Dictionary.** New keys (Hebrew values above): `terms_link`, `terms_accept_row`, `terms_accept`,
    `terms_scroll_hint`, `terms_required`, `terms_updated_on`, `terms_close`.

### Should Have (P1)
- `docs/agent/standards-backend.md`: one row for the three user terms fields and the accept route, and the rule:
  any change to `public/assets/legal/terms.he.json` text needs a new `version` and `sectionsHash`; every user then
  accepts again at the next sign-in.

### Nice to Have (P2)
- none.

## UI/UX Notes
- RTL, logical properties. Body text 1rem with 1.6 line height; numbered clause text as written in the source.
- Lesson (plan 515): Escape goes one step back — popup → form; it never closes the whole auth modal from the popup.
- The checkbox is read-only to the user: only the popup's button checks it (a checked box must mean "read to the end").

## Atomic Sub-tasks
- [x] A1: Terms file + server version reader — `public/assets/legal/terms.he.json`, `server/utils/terms-version.js`, note line in `docs/frontdesk/pilot-terms-draft.md`
- [x] A2: Model fields, `toPublicUser`, sign-up check, accept route — `server/models/user.model.js`, `server/routes/auth.js`
- [x] A3: Server tests — new `server/test/auth-terms.test.js`; add `termsVersion` to the three existing sign-up test files
- [x] A4: Client model + service — `src/app/core/models/user.model.ts`, `src/app/core/models/terms.model.ts`, `src/app/core/services/terms.service.ts` (+ spec), `UserService.signup` gets `termsVersion` and the error map (+ spec)
- [x] A5: Terms popup — `src/app/core/components/terms-modal/**` (+ spec), dictionary keys
- [x] A6: Sign-up row — `auth-modal.component.{ts,html,scss,spec.ts}`
- [x] A7: Gate for existing users and every new version — `src/app/core/components/terms-gate/**` (+ spec: shows for null, shows for an older version, hides for the current one, never for a guest), `src/app/appRoot/app.component.{ts,html}`
- [x] A8: QA login accepts the terms — `scripts/qa/lib/qa-login.mjs`, `e2e/helpers/qa-session.ts` only if its types change
- [x] A9: Screen checks and every gate check — `e2e/ui/584-1.spec.ts`, `e2e/ui/584-2.spec.ts`; breadcrumbs rows for the new folders; standards-backend row

## What happens when
- The user closes the popup without accepting → back on the form, box unchecked.
- The terms file fails to load → the popup shows the existing load-error message and the button stays disabled;
  sign-up cannot be submitted (fail closed).
- The server's version changed between page load and submit → 400 `TERMS_NOT_ACCEPTED` → `terms_required`, the box is
  unchecked, the user opens the popup again (it reloads the file).
- A user signs in on two devices → the gate shows on each until one accepts; the other's next refresh hides it.

## Technical Considerations
- `req.ip` behind Render's proxy: use what `app.set('trust proxy', …)` already gives; record as-is.
- The JSON is served by Angular from `public/`; the server reads the same file from the repo (Render builds from the
  repo root), so one edit changes both.
- No migration: existing users have `termsAcceptedVersion` missing → `null` → the gate (Q1 = a) asks them once.

## Out of Scope
- The lawyer's final text (swap the JSON and bump `version` later).
- A public `/terms` page, a privacy-policy page, cookie banners.
- Staff members added by an owner (they do not sign up; the owner accepts for the business).
- Showing or exporting acceptances in the platform dashboard.

## Critical Questions
- Q1 (answered 2026-11-12): a — existing accounts accept at their next sign-in, and every user accepts again after each
  terms change, even one who accepted an older version.

## Open questions for the Human
- none.

## Execution Notes
- Human 2026-11-12: Q1 = a, and "each time there is an update to the terms it sends this to all users even if they had
  one before" → P0 #9 (version compare) + the `sectionsHash` guard in CI + the standards-backend rule.
- Step 0: `docs/frontdesk/pilot-terms-draft.md` is not on the base; JSON generated from `origin/orch/run-546:docs/frontdesk/pilot-terms-draft.md` (v2), docs file left untouched, no note line added.
- Evidence: `pnpm run test:server` -> exit 0, 87 files / 1131 tests passed (incl. auth-terms.test.js); `pnpm run build` -> exit 0; `pnpm run lint` -> 0 errors; `pnpm run test:ci` -> exit 0, TOTAL 1943 SUCCESS; reuse-lint, breadcrumbs-check, override-check, lint:icons, lint:no-native-select, plan-ledger-check, kit-manifest-check, scope-check -> ok; log-query -> SKIP (no database configured).
- Decision: `src/app/core/models/terms.model.ts` not created; the Terms types live in `terms.service.ts` (breadcrumbs-check needs models/breadcrumbs.md for a new models file, which is outside the scope).
- e2e/ui/584-1 and 584-2 written, not run here (no dev servers in the build worktree).
