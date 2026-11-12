# Plan 555 — Public request page: customers send a request from one link, without an account

Status: draft
Track: design
Depends-on: 543, 550, 553, 558
Prerequisite: plan 558 (privacy erase by phone + retention) is merged first — the public page collects customer data, so erase and retention must already exist. 558 is in run-546 (Planner reorder 2026-11-11).
Snapshot: 05741afd08ec936d1aec6f8d9a53631141905f93

## Problem Statement
Front Desk map row 13 (FD-08). This is the first channel a pilot business can use: the owner puts one link in
Instagram, Google Business Profile and the WhatsApp auto-reply, and customers send a request without an account.
Plan 543 opened the guest door (`/api/v1/public`, `publicLimiter`, `honeypot`, `newPublicToken`, `guestActor`, ADR 0030).
Plans 548–550 hold the profile, `qualify`, request creation and approve. Plan 553 lets the owner set the profile.
This plan adds the public API behind that door, the page `/book/:slug` without the app's header and tabs, and the
guest's own status page `/book/:slug/r/:token`.

Verified on `origin/main` (5702f6d1, 2026-11-10):
- Shell: `src/app/appRoot/app.component.html` renders `<app-header />`, `<app-tab-chips />` and `<app-hero-fab />` unconditionally; `AppComponent` (`src/app/appRoot/app.component.ts`) injects only services. No `LayoutModeService`.
- `src/app/app.config.ts` APP_INITIALIZERs: the dictionary load (needed by the public page) and a guest auto-login that runs only when `environment.autoLoginGuest` (false in `environment.prod.ts`, true in local / test).
- The auth interceptor adds `Authorization` only when a token exists; a signed-in member opening the public link sends it, and `public.js` ignores it (plan 543 test).
- Server request log: `server/app.js` pino-http serializer logs `{ method, url }` (lines ~102-105), so a URL with a token is written to the log. Client log: `src/app/core/services/logging.service.ts:52` sends `location.pathname`. Both would carry the read-back token.
- `server/utils/business-scope.js` exports `scopeFilter(req)`, `readScope`, `stampNew` — all read `req.user`; none fits a server-resolved business.
- `shared/schemas/tsconfig.cjs.json` builds `./**/*.ts`, so `shared/schemas/public/` reaches the server; `shared/schemas/index.ts` re-exports each module.
- Helmet keeps its default `Referrer-Policy: no-referrer` (no override in `server/app.js`), so a `wa.me` link does not leak the page path.
- `ngsw-config.json` has no `navigationUrls`; every navigation gets the cached shell.
- `server/utils/db-target.js` exports `parseTarget` (`--target=local|atlas`, plan 531).

From earlier plans (verify in Step 0): plan 543 helpers; `upsertClientByPhone` (545); `frontDeskProfiles`, `qualify`
(548); request creation, `requests` schema and routes (549, 550); `waLink` (`src/app/core/utils/wa-link.util.ts`, plan
552 — created here if 552 has not merged); `fd_kind_*` keys (553).

## Goals & Success Criteria
**Primary:** a customer opens `/book/<slug>` on a phone, sends a request in under a minute, gets a reference and a
status link, and the request appears only in that business's queue as `channel: 'public_form'`.

- [auto] `pnpm run test:server` passes, including `server/test/public-requests.test.js`: a POST to an active profile's slug creates one request for that business only (`channel: 'public_form'`, `createdBy: 'public:form'`, `businessId` from the slug even when the body carries another `businessId` — the strict schema rejects the extra key with 400); a client is found or created by phone; the response is 201 `{ reference, token }` with a 32-char token; a second business's member cannot read it through `/api/v1/data/requests`; a draft or suspended profile answers `{ available: false }` on GET and 403 `NOT_AVAILABLE` on POST; an unknown slug answers 404 `NOT_FOUND`; a disabled kind → 400 `KIND_DISABLED`; a choice answer outside its options → 400 with `issues`; a missing required answer → the request is stored as `needs_info`; `website` filled → 201 and nothing written; the 21st POST in 15 minutes from one IP to one slug → 429.
- [auto] Token routes (same test file): `GET /:slug/requests/:token` returns only that request; a token of slug A used under slug B → 404; a malformed token → 404 without a database read; cancel moves `new | qualified | needs_info` to `cancelled` with a `statusHistory` entry `via: 'guest'`, and a decided request → 409 `ALREADY_DECIDED`.
- [auto] No phone and no token in logs: `server/test/public-requests.test.js` captures the request log (`server/test/helpers/log-capture.js`) and finds neither the guest phone digits nor the token after a POST, a GET by token and a cancel; `logging.service.spec.ts` shows `/book/x/r/<token>` sent as `/book/x/r/:token`.
- [auto] `pnpm run test:ci` passes, including `layout-mode.service.spec.ts`, `public-request.page.spec.ts`, `public-request-status.page.spec.ts` and `app.component.spec.ts`: on a route with `{ bare: true }` the header, tab chips and hero button are not rendered; on `/dashboard` they are.
- [auto] `pnpm run build` passes and the initial bundle warning budget (570 kB) is not newly crossed; the public pages are lazy chunks.
- [auto] `pnpm run lint`, `pnpm run lint:icons`, `pnpm run lint:no-native-select` and `pnpm --dir server run lint` exit 0.
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/design/555-public-request-page.plan.md` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] Signed out, `/book/<qa-slug>` shows the business name, no app header; choosing "טעימה", filling a date, 10 guests, a name, a phone and the consent box and pressing "שליחת הבקשה" shows "הבקשה נשלחה" with a reference (`e2e/ui/555-1.spec.ts`).
- [ui] Opening the status link from that done page shows "ממתינה לאישור"; pressing "ביטול הבקשה" and confirming shows "הבקשה בוטלה" (`e2e/ui/555-2.spec.ts`).
- [ui] Signed in as the QA owner after 555-1, `/requests` shows the request with the tag "טופס באתר" (`e2e/ui/555-3.spec.ts`).
- [human] Dandan opens `/book/<slug>` on his own phone after the server slept (cold start), sends a request, and says the page reads well in Hebrew RTL, looks like the business and not like FoodVibe, and shows "Powered by FoodVibe" at the bottom.

## Execution Mode
- Parallel: no — alone in its window: edits `src/app/appRoot/app.component.html` / `.ts` (shell) and appends to `src/app/app.routes.ts`, `dictionary.json`, `src/styles.scss`, `src/app/app.config.ts` (map).
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/shared/breadcrumbs.md
src/app/core/models/breadcrumbs.md
src/app/core/services/breadcrumbs.md
e2e/ui/555-1..3
server/test/helpers/log-capture.js
logging.service.spec.ts
layout-mode.service.spec.ts
public-request.page.spec.ts
public-request-status.page.spec.ts
app.component.spec.ts
e2e/ui/555-*.spec.ts
server/routes/public.js
server/routes/requests.js
server/utils/request-create.js
server/utils/public-profile.js
server/utils/business-scope.js
server/utils/redact-url.js
server/app.js
server/scripts/set-front-desk-status.js
server/test/public-requests.test.js
server/test/redact-url.test.js
server/test/business-scope-util.test.js
server/breadcrumbs.md
shared/schemas/public/**
shared/schemas/index.ts
src/app/pages/public-request/**
src/app/pages/breadcrumbs.md
src/app/core/services/layout-mode.service.ts
src/app/core/services/layout-mode.service.spec.ts
src/app/core/services/logging.service.ts
src/app/core/services/logging.service.spec.ts
src/app/core/services/http-storage.adapter.ts
src/app/core/utils/wa-link.util.ts
src/app/core/utils/wa-link.util.spec.ts
src/app/appRoot/app.component.html
src/app/appRoot/app.component.ts
src/app/appRoot/app.component.spec.ts
src/app/app.routes.ts
src/app/app.config.ts
public/assets/data/dictionary.json
src/styles.scss
docs/agent/standards-backend.md
docs/brain/component-families.md
e2e/ui/555-1.spec.ts
e2e/ui/555-2.spec.ts
e2e/ui/555-3.spec.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — guest writes enter only through `server/routes/public.js` as ADR 0030 (plan 543) allows: the business comes from the slug on the server, `createdBy: 'public:form'` from `guestActor('form')`, read-back only by the request's own token; no member route changes behaviour, and `requests.js` changes only by moving its create logic into a shared helper.
- INV-2: preserves — every public query is scoped with the new `guestScope(businessId)` from `server/utils/business-scope.js`, so business scoping still has one home.
- INV-4: preserves — the public input is a strict Zod schema in `shared/schemas/public/public-request.schema.ts`; the request itself is still validated against the plan 549 request schema before it is written.

## Reuse Check

- `public-request.schema.ts` (`shared/schemas/public/`) — family: none — rung: 4 — why: first input schema for a non-member; strict, server and page share it.
- `guestScope(businessId)` in `server/utils/business-scope.js` — family: server-auth — rung: 3 — why: extends the one scoping file for a business the server resolved, instead of a hand-built `{ businessId }` in the router.
- `server/utils/public-profile.js` (`loadPublicProfile`, `publicView`) — family: none — rung: 4 — why: the one place that decides which profile fields a stranger may see.
- `server/utils/request-create.js` (`createRequest`) — family: none — rung: 4 — why: one request-creation path for the manual route and the public route (moved out of `requests.js`, where plan 549 writes it inline), so stamps, qualify and counters cannot drift.
- `server/utils/redact-url.js` (`redactUrl`) — family: none — rung: 4 — why: masks read-back tokens in logged URLs; no redaction helper exists.
- `server/scripts/set-front-desk-status.js` — family: none — rung: 4 — why: bridges to plan 557's admin switch (Critical Question 1).
- `LayoutModeService` (`src/app/core/services/layout-mode.service.ts`) — family: kitchen-state — rung: 4 — why: one root signal `bare_` from the route data; no layout signal exists.
- `PublicRequestPage` and its steps (`src/app/pages/public-request/`) — family: form-field — rung: 1 — why: `app-form-field`, `.c-input`, `app-date-field`, `app-time-field`, `app-counter`, `app-custom-select` for choice questions, `.c-chip--toggle` for the kind picker, `.c-btn-primary` submit with `isSaving_` + `aria-busy`.
- Consent box — family: chip — rung: 1 — why: `.c-chip--toggle` (label > input + span) holding the consent text.
- `PublicRequestStatusPage` (`src/app/pages/public-request/public-request-status/`) — family: empty-state — rung: 1 — why: status card on tokens; `app-empty-state` for not-found and not-available; cancel asks through `ConfirmModalService`.
- `PublicRequestService` (`src/app/pages/public-request/services/public-request.service.ts`) — family: http — rung: 3 — why: page-scoped client for `API.public` in the one `API` map.
- `waLink` (`src/app/core/utils/wa-link.util.ts`) — family: helpers — rung: 1 — why: from plan 552; created here with the same contract if 552 has not merged.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

Also confirm by symbol (plans 543, 545, 548, 549, 550, 553 must be merged): `publicLimiter`, `honeypot`,
`newPublicToken`, `isPublicTokenShape`, `guestActor`; `upsertClientByPhone` and the shape of its `actor` argument
(if it takes `{ userId, name }` only, pass `{ userId: guestActor('form'), name: '' }` and note it); the profile
schema, its `slug` index and the status default on create; `qualify`; where plan 549 builds a new request (a helper
→ reuse it and skip the move; inline in `requests.js` → A2 moves it); the request `answers` shape; `fd_kind_*` keys;
`waLink`. A name that differs is used as merged; a missing one is a `conflict`.

## User Stories
- As an owner, I want one link that customers can use to ask for a table, a tasting, a consultation or an event so that I stop losing them between calls.
- As an owner, I want each request to arrive with the answers I need and a fit verdict so that I decide without calling back to ask the basics.
- As a customer, I want to send a request from my phone in a minute and see later whether it was approved so that I don't have to chase the business.
- As an owner, I want strangers to reach only my request form and nothing else of my data so that the public link is safe.

## Functional Requirements

### Must Have (P0)
- [ ] Contracts used (copied verbatim from `docs/frontdesk/frontdesk-map.md`):
  - **C-PUBLIC (555)**
    - Client routes `/book/:slug`, `/book/:slug/r/:token`, route data `{ bare: true }`, `LayoutModeService.bare_` signal, `app.component.html` wraps header + tab-chips in `@if (!layout.bare_())`.
    - API: `GET /api/v1/public/:slug`, `POST /:slug/requests`, `GET /:slug/requests/:token`, `POST /:slug/requests/:token/cancel`. Input schema `shared/schemas/public/public-request.schema.ts`.
    - `ngsw-config.json` unchanged (all navigations get the cached shell — the bare route still works offline-first).
  - **C-GUEST (543; used by 555, 560)**
    - Guest-originated writes enter only through `server/routes/public.js` (`/api/v1/public`) and `server/routes/webhooks-whatsapp.js` (`/api/v1/webhooks/whatsapp`). The business is resolved by the server (slug → `frontDeskProfiles`; phone-number id → profile `whatsapp.phoneNumberId`), never taken from the body.
    - Stamps: `createdBy: 'public:form' | 'public:whatsapp'`, `businessId` = resolved business.
    - Read-back only by an unguessable token: `publicToken` = 24 random bytes, base64url (32 chars); a token names exactly one request or booking.
    - `server/middleware/rate-limit.js` exports `publicLimiter` (20 writes / 15 min per IP + slug). Honeypot field `website` → silent 201 with no write.
    - Guest text is stored as plain text and never rendered as HTML.
  - **C-NAV** (part used): Public pages Hebrew only (Q7); footer "Powered by FoodVibe" on the public page and done page (Q8).
  - Brief D9 (Hebrew only, "Powered by FoodVibe"), D13 (no other project named anywhere), R-10 (a request outside hours or rules is answered with the allowed window), R-19 (draft / suspended profiles send nothing).
- [ ] **Input schema** `shared/schemas/public/public-request.schema.ts` (+ `shared/schemas/index.ts` export): `publicRequestSchema = z.strictObject({ kind: z.enum(REQUEST_KINDS), guestName: nameField.min(2), guestPhone: z.string().min(7).max(30), wanted: <the plan 549 wanted schema>, answers: z.array(z.strictObject({ questionKey: z.string().max(60), value: z.string().max(500) })).max(30), consentTerms: z.literal(true), website: z.string().max(200).optional() })`. Labels for answers are taken from the profile on the server, never from the guest.
- [ ] **`guestScope(businessId)`** in `server/utils/business-scope.js` → `{ businessId }`; throws on an empty id or `__master__`. Every query in `public.js` uses it (test in `business-scope-util.test.js`).
- [ ] **`server/utils/public-profile.js`:** `loadPublicProfile(db, slug)` → the profile with that `slug` (lower-case match) or `null`; `isPublic(profile)` → `status` is `pilot` or `active`; `publicView(profile)` → `{ available: true, displayName, logoUrl?, phone?, address?, serviceArea?, hours, closedDates?, kinds: [{ kind, questions, rules: { minPartySize?, maxPartySize?, minLeadHours?, maxLeadDays? }, durationMinutes? }] }` for enabled kinds only — never `businessId`, `whatsapp`, `assistant`, `status`, `minBudgetPerGuest`, `areas` or any `_id`.
- [ ] **`server/utils/request-create.js`:** `createRequest(db, businessId, profile, input, { channel, actor, via })` → `{ request, client }` is the body of plan 549's manual `POST /api/v1/requests` after its input check, moved here unchanged: client by `clientId` or `upsertClientByPhone`, `qualify(profile.requestKinds[kind] …, wanted, answers, { now, hours, closedDates, kind })`, status `needs_info` when a reason starts with `fd_reason_missing_answer` else `qualified`, `publicToken`, the first `statusHistory` entry, `stampNew`-equivalent stamps, `checkStoredDoc`, insert, then `counters.requests` + `lastContactAt` (+ `kinds: ['lead']` when empty) on the client. For a guest call the stamps come from the arguments (`createdBy: actor`, `businessId` from the profile) because there is no `req.user`. `requests.js`'s `POST /` calls it with `{ channel: 'manual', actor: actorOf(req), via: 'member' }`; every test in `server/test/requests-router.test.js` must pass unchanged. If plan 549 already has such a helper, reuse it and skip the move.
- [ ] **Answer check (public route only)** in `public.js` before `createRequest`: an unknown `questionKey` → 400 `UNKNOWN_QUESTION`; `number` / `date` / `time` / `choice` values checked by type (a choice value must be one of `options`) → 400 with `issues`; each stored answer gets the profile's `label` (the guest never sends one). Missing required answers are not refused: `qualify` turns them into `needs_info`, the same as a manual request.
- [ ] **Routes in `server/routes/public.js`** (all on `/api/v1/public`, after plan 543's `/health`, before its JSON 404):
  - `GET /:slug` → 404 `NOT_FOUND` (no profile) · 200 `{ available: false, displayName }` (draft or suspended) · 200 `publicView(profile)`.
  - `POST /:slug/requests` with `publicLimiter`, then `honeypot`, then `publicRequestSchema` (400 + `issues` on failure) → profile not found 404, not public 403 `NOT_AVAILABLE`, kind not enabled 400 `KIND_DISABLED` → `createRequest(db, profile.businessId, body, { channel: 'public_form', actor: guestActor('form'), via: 'guest' })`; the client gets `consent.terms = Date.now()` and `source: 'public_form'` when it is created; response 201 `{ reference, token }`.
  - `GET /:slug/requests/:token` → `isPublicTokenShape` fails → 404 (no read); a request with that token in that business → 200 `{ reference, kind, status, wanted, guestName, createdAt, displayName, phone?, booking? }` where `booking` is `{ date, time, partySize, status }` when the outcome is a booking, and `eventOpened: true` when it is an event; no guest phone, no answers, no decline text in the reply.
  - `POST /:slug/requests/:token/cancel` with `publicLimiter` → `new | qualified | needs_info` → `cancelled` through a conditional update (`statusHistory` entry `{ status: 'cancelled', by: 'public:form', via: 'guest' }`); any other status → 409 `ALREADY_DECIDED`; returns the same shape as GET.
  - `reference` = the first 8 characters of the request `_id`, upper case, without dashes (no new field).
- [ ] **No phone, no token in logs:** `server/utils/redact-url.js` `redactUrl(url)` replaces the token segment of `/api/v1/public/<slug>/requests/<token>[/cancel]` and of `/book/<slug>/r/<token>` with `:token`; `server/app.js`'s pino-http `req` serializer uses it. `logging.service.ts` applies the same masking to `location.pathname` before sending. `public.js` logs events with the request id and the slug only.
- [ ] **Status bridge until plan 557:** `server/scripts/set-front-desk-status.js --slug=<slug> --status=draft|pilot|active|suspended [--target=local|atlas]` (local by default, `parseTarget`) sets one profile's status and prints `FRONT_DESK_STATUS: <slug> <old> → <new>`. The e2e specs run it for the QA profile (`pilot`) in their setup (subject to Critical Question 1).
- [ ] **Shell:** `LayoutModeService` (root) exposes `bare_` = the deepest active route's `data.bare === true`, updated on `NavigationEnd`. `app.component.html` wraps `<app-header />`, `<app-tab-chips />` and `<app-hero-fab />` in `@if (!layout.bare_())` (the hero button is the app's quick-add and must not appear to a customer); the loader, toasts and confirm popup stay.
- [ ] **Routes** (append): `{ path: 'book/:slug', loadComponent: () => import('./pages/public-request/public-request.page').then(m => m.PublicRequestPage), data: { bare: true } }` and `{ path: 'book/:slug/r/:token', loadComponent: … PublicRequestStatusPage, data: { bare: true } }`, both before the `**` redirect, no guard, no resolver.
- [ ] **`/book/:slug` page** (Hebrew only, phone first, the business's logo and name at the top, the app's primary token as the one accent):
  - Loading: `pb_loading` "טוען…"; after 6 s the line `pb_waking` "מעירים את השרת — עוד כמה שניות" (Render free tier cold start).
  - Not found → `app-empty-state` `pb_not_found` "הדף לא נמצא". Not available → `pb_not_available` "{name} לא מקבלים בקשות דרך הדף הזה כרגע" (+ the business phone as a `tel:` link when present). Network failure → `pb_load_failed` "לא הצלחנו לטעון את הדף" + retry.
  - Step 1, kind (only when more than one kind is enabled): one large toggle per kind with its `fd_kind_*` label.
  - Step 2, details: date (`app-date-field`), time for `table` / `tasting` / `consultation`, party (`app-counter`, bounded by `minPartySize` / `maxPartySize` when set), then the kind's questions in profile order (required marked `*`). Before moving on, the page runs `qualify` (shared, plan 548) and, when it returns reasons, shows them as a note with the allowed window (R-10), for example "אנחנו מקבלים הזמנות לעד 300 סועדים" — the guest may change the details or still send (Critical Question 2).
  - Step 3, contact: name (`pb_name` "שם מלא"), phone (`pb_phone` "טלפון"), consent (`pb_consent` "אני מאשר/ת ל-{name} לשמור את הפרטים כדי לחזור אליי לגבי הבקשה", required), the hidden honeypot field `website` (visually hidden, `aria-hidden="true"`, `tabindex="-1"`, `autocomplete="off"`).
  - Back goes one step back and keeps what was typed; leaving the page loses the draft (no account, nothing stored); browser back between steps uses the same history as the in-page back.
  - Submit "שליחת הבקשה" (`pb_submit`), disabled while sending with `aria-busy`. 400 → field errors from `issues` (`serverFieldErrors`); 403 → the not-available state; 429 → `pb_too_many` "נשלחו הרבה בקשות מהמכשיר הזה — נסו שוב בעוד כמה דקות"; other → `pb_send_failed` "הבקשה לא נשלחה — נסו שוב" and the form keeps its values.
  - Done: `pb_done_title` "הבקשה נשלחה", `pb_done_text` "{name} יחזרו אליכם בהקדם", the reference (`pb_reference` "מספר בקשה: {ref}"), the status link `pb_status_link` "מעקב אחרי הבקשה" (+ copy button, toast `fd_link_copied`), and when the profile has a phone, `pb_whatsapp` "להמשיך בוואטסאפ" → `waLink(phone, 'בקשה ' + ref + ' · ' + slug)`.
  - Footer on every state: `pb_powered_by` "Powered by FoodVibe" (D9).
- [ ] **`/book/:slug/r/:token` page:** the business name and logo, the reference, the kind and wanted line, and the status for the guest: `pb_status_waiting` "ממתינה לאישור" (`new`, `qualified`, `needs_info`), `pb_status_approved` "הבקשה אושרה" (+ booking date, time, party; or `pb_status_event_opened` "{name} יחזרו אליכם לתאם את האירוע"), `pb_status_declined` (wording per Critical Question 3), `pb_status_cancelled` "הבקשה בוטלה", `pb_status_expired` "הבקשה פגה — אפשר לשלוח בקשה חדשה" (+ link to `/book/:slug`). Waiting → "ביטול הבקשה" (`pb_cancel`) asks `pb_cancel_confirm` "לבטל את הבקשה?" then calls cancel; 409 → reload the status. Approved → `pb_change_contact` "לשינוי או ביטול צרו קשר עם העסק" with the phone / WhatsApp links. Not found → `pb_request_not_found` "לא מצאנו את הבקשה". Footer as above.
- [ ] `docs/agent/standards-backend.md` §5: one row per public route with its limiter and error codes; `server/breadcrumbs.md`: the new utils and the script; `src/app/pages/breadcrumbs.md`: `public-request/`; `docs/brain/component-families.md`: `LayoutModeService` noted under `kitchen-state`, `PublicRequestService` under `http` users.

### Should Have (P1)
- [ ] The done page remembers the last token per slug in `localStorage` (try/catch, per-viewer convenience only) so that reopening `/book/:slug` shows "הבקשה האחרונה שלך" (`pb_last_request`) with the status link.

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- `Track: design`: the page must look like the business (logo, name, calm layout), phone first, large touch targets. A Claude Design handoff goes through `/design-port`; until then build on the engines in the Reuse Check.
- Hebrew RTL, logical properties only; all strings are `general` keys with the Hebrew values above. Placeholders (`{name}`, `{ref}`) are filled with `.replace`.
- Icons: `check-circle` (done), `phone`, `message-circle`, `copy`, `chevron-right` (back, RTL) — all registered; no new icon.
- Guest text (name, answers) is shown with interpolation only, never `[innerHTML]`.
- e2e: specs set the QA profile to `pilot` with `server/scripts/set-front-desk-status.js` (local target) in `beforeAll`, use a fixed test slug, and clean up the requests they create through the owner API.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Define what a stranger may send and which profile fields they may see — public input schema, guest scope, public profile view — shared/schemas/public/**, shared/schemas/index.ts, server/utils/business-scope.js, server/utils/public-profile.js, server/test/business-scope-util.test.js
- [x] A2: Give manual and public requests one creation path — reuse or move plan 549's create logic with stamps passed in, manual route tests unchanged — server/utils/request-create.js, server/routes/requests.js
- [x] A3: Add the four public routes behind the limiter and honeypot — profile view, answer check, send, read by token, cancel by token, error codes — server/routes/public.js, server/test/public-requests.test.js
- [x] A4: Keep phone numbers and tokens out of every log — URL masking on the server and in the browser log, log capture tests — server/utils/redact-url.js, server/app.js, server/test/redact-url.test.js, src/app/core/services/logging.service.ts, src/app/core/services/logging.service.spec.ts
- [x] A5: Let the pilot profile go live before the admin switch exists — status script with a local default target — server/scripts/set-front-desk-status.js
- [x] A6: Show public pages without the app's header, tabs and quick-add button — layout signal from route data, shell wrap, specs — src/app/core/services/layout-mode.service.ts, src/app/core/services/layout-mode.service.spec.ts, src/app/appRoot/app.component.html, src/app/appRoot/app.component.ts, src/app/appRoot/app.component.spec.ts
- [x] A7: Build the request form in three steps with a done page — kind, details with the rule note, contact and consent, send, errors, reference, status link, WhatsApp link, footer — src/app/pages/public-request/**, src/app/core/services/http-storage.adapter.ts, src/app/core/utils/wa-link.util.ts, src/app/app.routes.ts
- [x] A8: Build the guest's own status page with cancel — status wording, booking details, cancel with confirm, not found — src/app/pages/public-request/public-request-status/**
- [x] A9: Add every Hebrew string and record the new routes and pieces — dictionary keys, backend standards rows, breadcrumbs, families — public/assets/data/dictionary.json, docs/agent/standards-backend.md, server/breadcrumbs.md, src/app/pages/breadcrumbs.md, docs/brain/component-families.md
- [x] A10: Write the screen checks and run the full checks — e2e/ui/555-1..3, test:server, test:ci, build, lint, server lint, lint:icons, lint:no-native-select, scope-check --arch, log-query — e2e/ui/555-1.spec.ts, e2e/ui/555-2.spec.ts, e2e/ui/555-3.spec.ts

## Technical Considerations
- Dependencies: plan 543 (door, limiter, honeypot, token, actor), 545 (`upsertClientByPhone`), 548 (profile, `qualify`), 549 / 550 (request schema, create, approve outcome), 553 (`fd_kind_*` keys, a real profile).
- New files needed: listed in the scope block (schema, three server utils, the status script, two server tests, the layout service, the two public pages and their service, three e2e specs).
- Model changes: none in stored shapes; `reference` is derived from `_id`.
- Backend / API: four routes under `/api/v1/public` (C-PUBLIC). `requests.js` changes only if its create logic moves to `request-create.js`.
- Auth and validation: no member token is read; the business comes from the slug; strict Zod input; answers checked against the profile; `publicLimiter` on both write routes; honeypot on send; token shape check before any read.
- Security surface: a new unauthenticated write. Guards: rate limit per IP + slug, honeypot, strict schema with no `businessId`, token = 192 random bits, tokens and phones masked in server and client logs, `Referrer-Policy: no-referrer` (helmet default) so links out do not carry the token, guest text never rendered as HTML, the public view hides budget rules, areas and every internal field.
- Data / migration: none (new documents in plan 549's `requests` collection).
- Project checks: `[auto] log-query` present; dictionary keys named with Hebrew values; no new icons; Reuse Check filled; `lint:no-native-select` because the form adds pickers; `test:server` for the routes.

## Out of Scope
- The platform-admin status switch and the "suspended" banner for members (plan 557).
- Owner notifications outside the app (Wave 1b, plan 564); the in-app badge is plan 552.
- English or other languages on the public page (D9).
- A colour or theme per business (the profile has no colour field in Wave 1).
- Cancelling or changing an approved booking from the guest page (the guest contacts the business).
- The WhatsApp webhook (plan 560).

## Critical Questions
- Q1: How does a profile become public before plan 557 adds the platform-admin status switch? (a) a server script `set-front-desk-status.js` (local by default, `--target=atlas` for the pilot) that Dandan runs, and the e2e specs use — recommended / (b) treat `draft` as public until 557 merges, and 557 makes `draft` private / (c) move the status switch into this plan. A: (Human, 2026-11-10) a
- Q2: When the details break a rule (too many guests, too soon, a closed day), what does the form do? (a) show the allowed window (R-10) and still let the customer send; the request arrives as "לא מתאים" with its reasons — recommended / (b) block sending until the details fit. A: (Human, 2026-11-10) a
- Q3: What does a customer see on the status page when the request is declined? (a) "{name} לא יכולים לקבל את הבקשה הזאת" plus the reason for `full`, `date_taken`, `out_of_area`, `below_minimum` (never the member's free text; nothing for `other`) — recommended / (b) only the generic sentence, never a reason. A: (Human, 2026-11-10) a

## Execution Notes
- Map row 13, renumbered +2 on 2026-11-10 (old 553 → 555).
- Contract extension for the map (to add under "Contract extensions (run)"): plan 555 · request `reference` = first 8 characters of the request `_id`, upper case, no dashes; the done page's WhatsApp text is `בקשה <reference> · <slug>` · why: plan 560's `resolveBusiness` step 3 reads a reference or slug from that text.
- Contract extension: plan 555 · `app.component.html` also hides `<app-hero-fab />` in bare mode · why: it is the app's quick-add button and must not show to a customer.

### Builder evidence (round 0)
- `pnpm run test:server` → exit 0, 98 files / 1256 tests passed (incl. `public-requests.test.js` 20 tests, `redact-url.test.js`, `business-scope-util.test.js`, `requests-router.test.js` unchanged).
- `pnpm run test:ci` → exit 0, 2123 of 2123 SUCCESS (incl. layout-mode, public-request, public-request-status, app.component, logging specs).
- `pnpm run build` → exit 0; initial total 585.61 kB (budget warning at 570 kB shown; not compared with the base build — added to the initial bundle only `LayoutModeService` and a few lines in `logging.service.ts`); the public pages are lazy chunks.
- `pnpm run lint` / `lint:icons` / `lint:no-native-select` / `pnpm --dir server run lint` → exit 0 (0 errors).
- kit-manifest-check, override-check, plan-ledger-check, breadcrumbs-check, `scope-check --arch` → ok; `log-query` → SKIP (no database configured).
- e2e `e2e/ui/555-1..3.spec.ts` written and listed by `playwright test --list`; not run by the builder (the dev servers on 3000/4200 are not this worktree's).
- Decisions: the done page and the status page hide nothing extra; the QA specs enable the `tasting` kind on the QA profile if it is off and set it to `pilot` with the new script.
