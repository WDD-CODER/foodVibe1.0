# Plan 558 — Privacy and go-live: erase a customer by phone, keep data only as long as needed, and the go-live docs

Status: draft
Depends-on: 550
Snapshot: 05741afd08ec936d1aec6f8d9a53631141905f93

## Problem Statement
Map row 16 (FD-12). From Wave 1a on, FoodVibe stores personal data of the businesses' customers: clients, requests and
bookings (later conversations and messages). Brief Part 2 rule 10 (Protection of Privacy Law, Amendment 13): phones
never in logs, retention and delete-by-phone specified. Nothing exists yet to erase one person on request, nothing
removes old requests and bookings, `docs/security-go-live.md` says nothing about the public door, and the pilot has no
written terms. Brief D6: the server is kept awake by an external uptime ping every 10 minutes, documented here, no code.

Verified on `origin/main` (5702f6d1, 2026-11-10):
- Scripts that write data follow plan 531's rule (done): `--target=local|atlas` required, dry run by default, `--write` to apply, Atlas also needs `--confirm-host=<host>`, `--db=<scratch>` for a local copy. Pattern: `server/scripts/release-removed-staff-names.js` (pure `planRelease` + `parseArgs` exported and unit-tested in `server/test/release-removed-staff-names.test.js`; `connect` from `server/migrations/tools/_connect.js`).
- Lazy jobs, no scheduler: `server/jobs/purge-deleted.js` (`LIVE`, `IN_TRASH`, `purgeExpired`) runs from `generic.js:367` on a Trash read (map delta 5). Plan 549 runs `expireDue(db, businessId, now)` at the start of the generic `GET /requests` (list and by id).
- `menuEvents` keep `clientId`, `clientName`, `clientPhone` (all optional, `shared/schemas/entities/menu-event.schema.ts:177-180`).
- `docs/security-go-live.md` has sections "Auth API contract", "Pre-launch checklist", "Development logging", "References"; it is listed in the kit manifest's `refs` but is not kit-owned (`docs/workflow-kit/kit-owned.json`).
- `render.yaml` lists env keys with `sync: false` (`JWT_ACCESS_SECRET`, `MONGO_URI`, `GEMINI_API_KEY`, …); `server/.env.example` exists (17 lines). The live Render service is configured by hand.
- `GET /api/v1/health` answers `{ ok: true, ts }` (`server/app.js`).
- Not on `main` yet: `phoneKey` / `mergedInto` / soft delete for clients (544), `normalizePhone` + `phoneKey` in `server/utils/client-upsert.js` (545), `requests` / `bookings` (549), approve / `decisionLog` (550), `conversations` / `messages` (560, Wave 1b).
- `docs/frontdesk/` is not on `origin/main` yet (the brief's Step 0 docs chore); this plan creates `docs/frontdesk/pilot-terms-draft.md` there either way.

## Goals & Success Criteria
**Primary:** one command erases a person from one business by phone (dry run first), old requests and bookings
disappear on their own after 24 months, and the go-live doc, env docs and the Hebrew pilot terms draft exist.

- [auto] `pnpm run test:server` passes, including `server/test/erase-client.test.js` and `server/test/retention.test.js`.
- [auto] Erase plan: for a business with a live client, a trashed duplicate, a client merged into it, requests and bookings by `clientId` and by guest phone only, and two events, `planErase` deletes every client, request and booking of that person, unsets `clientId`, `clientName` and `clientPhone` on the two events, and touches nothing of another business or of another phone (`erase-client.test.js`).
- [auto] Erase phone matching uses `phoneKey`: `052-123 4567`, `+972 52 123 4567` and `972521234567` find the same person (`erase-client.test.js`).
- [auto] Erase run: without `--write` nothing changes and the output lists counts only; with `--write` the counts are applied; the output and the log never contain the phone, a name or a token (`erase-client.test.js`).
- [auto] Erase arguments: no `--target` → error; `--target=atlas` without `--confirm-host` → error (from `_connect`); no `--business` or no `--phone` → error (`erase-client.test.js`).
- [auto] Retention: a final-status request (`approved | declined | cancelled | expired`) last changed over 730 days ago and a booking whose `startAt` is over 730 days ago are deleted; a 729-day one and a `new` request of any age stay; `decisionLog` rows stay; a missing `messages` collection is a no-op; it runs at most once per business per 24 hours (`retention.test.js`).
- [auto] The generic `GET /api/v1/data/requests` and `GET /api/v1/data/bookings` run the retention sweep for the caller's business, after `expireDue` (`retention.test.js`).
- [auto] `pnpm --dir server run lint` and `pnpm run build` pass.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] Dandan reads `docs/frontdesk/pilot-terms-draft.md` (Hebrew) and sends it to his lawyer; the five points of the brief are all in it.
- [human] Render dashboard, live service → Environment: Dandan adds `PUBLIC_BASE_URL` = the service's public `https://…onrender.com` address and saves; then he creates the uptime monitor from the new doc section (`GET <PUBLIC_BASE_URL>/api/v1/health` every 10 minutes) and sees it report "up". The four WhatsApp keys wait until Wave 1b (plan 560).

## Execution Mode
- Parallel: no — 544, 545, 548, 549, 550, 551 and 557 also edit `server/routes/generic.js`.
- Concurrent plans: none
- Isolated DB: no — the script changes data only when Dandan runs it with `--write`; tests use the in-memory database.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/breadcrumbs.md
src/app/shared/breadcrumbs.md
src/app/core/models/breadcrumbs.md
src/app/core/services/breadcrumbs.md
erase-client.test.js
retention.test.js
server/scripts/erase-client.js
server/jobs/retention.js
server/routes/generic.js
server/test/erase-client.test.js
server/test/retention.test.js
server/breadcrumbs.md
docs/security-go-live.md
docs/frontdesk/pilot-terms-draft.md
render.yaml
server/.env.example
docs/agent/standards-backend.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — the retention sweep runs only for the caller's own business inside the generic GET; the erase script is an operator tool (Dandan, on his machine) that takes one `--business` and never crosses into another business.
- INV-2: preserves — `server/jobs/retention.js` filters every query by one `businessId`; nothing touches `__master__`.
- INV-3: preserves — erase and retention are server-side (a script and a job); the client loops nothing.

## Reuse Check

- `server/scripts/erase-client.js` `planErase`, `parseArgs`, `runErase` — family: none — rung: 4 — why: a new operator script; it follows `release-removed-staff-names.js` (pure plan + args exported and tested, `connect` from `_connect.js`) and uses `normalizePhone` / `phoneKey` from `server/utils/client-upsert.js` (545) as is.
- `server/jobs/retention.js` `purgeRetained` — family: none — rung: 4 — why: the lazy pattern of `server/jobs/purge-deleted.js` (run on read, no scheduler) for a different rule; constants in one place.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

Also check by symbol that the dependencies landed: `phoneKey` and `normalizePhone` in `server/utils/client-upsert.js`
(545), `mergedInto` and soft delete on clients (544), the `expireDue` call in the generic `GET /requests` (549),
`requests` / `bookings` field names (549), `decisionLog` (550). A different name is `ok` (use it); a missing piece is a
`conflict`.

## User Stories
- As an owner, I want a customer who asks to be forgotten to be removed completely so that my business keeps the law.
- As an owner, I want old requests and bookings to be cleared on their own so that I do not keep personal data longer than I need.
- As an owner joining the pilot, I want short written terms so that I know my customers' data stays mine.
- As a chef, I want my event history and money numbers kept when a customer is erased so that my accounts stay right.

## Functional Requirements

### Must Have (P0)
- [ ] Brief FD-12 points covered (verbatim): "`docs/security-go-live.md`: new section — public endpoints, webhook verification, rate limits, data retention (`messages` 12 months then purge job; `requests`/`bookings` 24 months; `decisionLog` kept, no personal fields), delete-by-phone script `server/scripts/erase-client.js` (takes `--target`, local by default, per plan 531's rule)." "`render.yaml`: document new env vars as `sync: false` with comments (`PUBLIC_BASE_URL`, `WHATSAPP_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`); the live service is configured by hand." "Pilot terms (a one-page Hebrew text, written by the plan as a draft for Dandan's lawyer): free pilot, the business owns its customer data, the platform may use aggregated anonymised statistics, either side may stop, export on exit."
  - Plan 531's rule wins over "local by default": `--target` is required, as in every data script today.
- [ ] Contracts used (verbatim from `docs/frontdesk/frontdesk-map.md`, C-CONTACT excerpt): "`phoneKey` — server-derived match key = the last 9 digits of `phoneNormalized` when it has ≥ 9 digits, else all of them (`0521234567` and `972521234567` → `521234567`)"; "`server/utils/client-upsert.js` exports `normalizePhone(s)` and `upsertClientByPhone(…)` … Also exports `phoneKey(digits)`."
- [ ] **`server/scripts/erase-client.js`** — header comment with the commands; usage `node server/scripts/erase-client.js --target=local|atlas --business=<businessId> --phone=<number> [--db=<scratch>] [--write] [--confirm-host=<host>]`.
  - `parseArgs(argv)`: `--target`, `--business`, `--phone` required; `--write` flag; `--db`, `--confirm-host` passed to `connect`. Unknown argument → error.
  - `planErase({ key, clients, requests, bookings, events, conversations, messages })` (pure) → `{ deleteClients, deleteRequests, deleteBookings, deleteConversations, deleteMessages, anonymiseEvents }` (id lists):
    - clients: every client of the business (live, in Trash or merged) whose `phoneKey` equals `key`, plus every client whose `mergedInto` points at one of them (repeat until no new id).
    - requests and bookings: `clientId` in that set, or `phoneKey(normalizePhone(guestPhone)) === key`.
    - conversations: `clientId` in the set (none until Wave 1b); messages: `conversationId` in those conversations.
    - events (`menuEvents`): `clientId` in the set, or `phoneKey(normalizePhone(clientPhone)) === key` → anonymise (the event, its money and its history stay).
  - `runErase(db, { businessId, phone, write })`: loads those collections for one business (a missing collection reads as empty), calls `planErase`, and with `write` applies: `deleteMany` for clients (hard, past Trash), requests, bookings, conversations, messages; `updateMany` on events `$unset: { clientId: '', clientName: '', clientPhone: '' }`. `decisionLog` is not touched (no personal fields). Returns the counts and the anonymised event ids.
  - Output: one line per collection with the count (`would delete` / `deleted`), the event ids, and a reminder that free-text event notes may still name the person and must be checked by hand. Never prints the phone, a name or a token. Atlas: the header says to take a backup first (`node server/scripts/db-backup.js --target=atlas`).
- [ ] **`server/jobs/retention.js`** exports `RETENTION = { requestsDays: 730, bookingsDays: 730, messagesDays: 365 }` and `purgeRetained(db, businessId, now)`:
  - requests: `deleteMany({ businessId, status: { $in: ['approved','declined','cancelled','expired'] }, $expr: { $lt: [{ $ifNull: ['$updatedAt', '$createdAt'] }, now - 730 days] } })`;
  - bookings: `deleteMany({ businessId, startAt: { $lt: now - 730 days } })`;
  - messages: `deleteMany({ businessId, at: { $lt: now - 365 days } })` (a no-op until Wave 1b creates the collection);
  - never `decisionLog`, `clients` or `menuEvents`;
  - throttle: an in-memory `Map` of `businessId → last run`; a second call within 24 hours returns without a query (reset helper exported for tests);
  - logs `retention.purged` with the counts only when one is > 0.
- [ ] **Generic hook** (`server/routes/generic.js`): in the `GET` list and by-id path for `requests` (right after 549's `expireDue` call) and for `bookings`, `await purgeRetained(db, req.user.businessId, Date.now())` when the caller has a business. No other change in `generic.js`.
- [ ] **`docs/security-go-live.md`** — new section "Front desk: public door and customer data" before "References":
  - Public endpoints: `/api/v1/public` (plans 543, 555): no member token, `publicLimiter` 20 writes / 15 min per IP + slug, honeypot field `website`, read-back only by a 32-character token, guest text stored as plain text and never rendered as HTML.
  - Webhook (plan 560, before it goes live): `GET` verify token, `POST` checked with `X-Hub-Signature-256` HMAC over the raw body with `WHATSAPP_APP_SECRET`, idempotent on the provider message id.
  - Rate limits table: data writes 300 / 15 min, AI 20 / 15 min per user, public writes 20 / 15 min per IP + slug.
  - Retention table: `requests` (final status) and `bookings` 24 months, `messages` 12 months (lazy, `server/jobs/retention.js`), `decisionLog` kept (no personal fields), clients kept until erased, Trash purged after 30 days.
  - Erase by phone: the dry-run and `--write` commands for local and Atlas, the backup step, and the hand check of event notes.
  - Logging: phones, names and tokens never in logs.
  - Keeping the server awake (D6): an external free uptime monitor calls `GET <PUBLIC_BASE_URL>/api/v1/health` every 10 minutes; step-by-step setup; why (the free tier sleeps and a sleeping server misses webhooks and makes the public page slow).
- [ ] **`render.yaml`**: four commented `- key: … sync: false` entries — `PUBLIC_BASE_URL` (the service's public https address; used for links the server builds), `WHATSAPP_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN` (Wave 1b, plan 560; set by hand in the dashboard). `server/.env.example`: the same four names with empty values and one comment line each. No value anywhere.
- [ ] **`docs/frontdesk/pilot-terms-draft.md`** (Hebrew, one page, marked "טיוטה לעורך דין — לא לחתימה"): the free pilot and its length is set per business; the business owns its customers' data and FoodVibe processes it only to run the service; FoodVibe may use aggregated, anonymised statistics with no names or phones; either side may stop at any time with notice; on exit the owner gets a CSV export of clients, requests and bookings and the data is erased on request; contact for privacy requests. Written as FoodVibe's own text (brief D13: no reference to any other company or project).
- [ ] `docs/agent/standards-backend.md`: a short "Retention and erase" note under §3 (new personal-data collections join `server/jobs/retention.js` and `erase-client.js`). `server/breadcrumbs.md`: rows for `jobs/retention.js` and `scripts/erase-client.js`.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- No UI. No dictionary keys, no icons. The pilot terms are Hebrew prose in a docs file, not app strings.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Work out everything to erase for one person in one business, without touching anything yet — planErase and parseArgs with unit tests — server/scripts/erase-client.js, server/test/erase-client.test.js
- [ ] A2: Run the erase as a dry run by default and apply it only with the write flag — runErase, connect, counts-only output, integration test on the in-memory database — server/scripts/erase-client.js, server/test/erase-client.test.js
- [ ] A3: Clear old requests, bookings and messages on their own when the lists are read — the retention job, its throttle and the generic read hook — server/jobs/retention.js, server/routes/generic.js, server/test/retention.test.js
- [ ] A4: Write the go-live section on the public door, limits, retention, erase and keeping the server awake — docs/security-go-live.md
- [ ] A5: Document the new environment settings without any value — render.yaml, server/.env.example
- [ ] A6: Draft the one-page Hebrew pilot terms for the lawyer — docs/frontdesk/pilot-terms-draft.md
- [ ] A7: Record the new job and script in the backend docs and the server map, then run every check — docs/agent/standards-backend.md, server/breadcrumbs.md

## Technical Considerations
- Dependencies: 544 (`phoneKey`, `mergedInto`, soft delete), 545 (`normalizePhone`, `phoneKey`), 549 (`requests`, `bookings`, `expireDue` call site), 550 (`decisionLog`); Wave 1b collections are read if present.
- New files needed: `server/scripts/erase-client.js`, `server/jobs/retention.js`, two server tests, `docs/frontdesk/pilot-terms-draft.md`.
- Model changes: none.
- Backend / API: no new route; the generic `GET` for `requests` and `bookings` also runs the retention sweep.
- Auth and validation: the script runs only on Dandan's machine with explicit `--target`, `--business`, `--phone`; Atlas needs `--confirm-host`; dry run by default.
- Security surface: hard deletes (erase, retention) are irreversible — dry run first, backup before Atlas; the script output and logs never carry personal data; env docs carry names only, never values.
- Data / migration: no migration; deletes happen only by the 24-month rule or an explicit erase.
- Project checks: `[auto] log-query` present; `pnpm run test:server`; no UI so no dictionary keys or icons; Reuse Check filled.

## Out of Scope
- The WhatsApp webhook and its signature code (plan 560) — this plan only documents the rule.
- A screen for erase requests or an automatic "forget me" from the public page.
- Scrubbing free-text event notes (reported for a hand check).
- Setting the env vars on Render and creating the uptime monitor (Dandan, `[human]`).
- Legal review of the terms (Dandan's lawyer).

## Critical Questions
- none

## Execution Notes
- Map row 16. Erase removes clients, requests, bookings, conversations and messages, and anonymises events (keeps the event, its money and history; drops `clientId`, `clientName`, `clientPhone`). This reads the brief's "removes or anonymises" so the kitchen's accounts stay whole.
- Retention counts a request from its last change and only once it is final, so an open request is never cleared under the owner's feet.
