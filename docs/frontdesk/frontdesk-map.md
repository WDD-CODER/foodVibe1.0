# Front Desk plan map — approved 2026-11-10 (questions Q1–Q12 answered)


Source brief: `docs/frontdesk/frontdesk-program-brief.md` (2026-11-10; Part 3 = specs FD-nn, Part 2 = cross-cutting rules).
Technical reference for Wave 2 only: `docs/frontdesk/reference-bookings-engine.md` (the 2026-11-09 `bookings-program-brief.md`, superseded as plan of record; see "Wave 2 compatibility" below for what Wave 1 adopts from it).
Verified against origin/main SHA: `05741afd08ec936d1aec6f8d9a53631141905f93` (2026-11-09) — use as `Snapshot:`.
Assistant and messaging behaviour rules (R-01…R-21): `docs/frontdesk/assistant-behaviour-rules.md` — every plan that touches messaging, the assistant or client matching quotes the rules it implements.
Plan numbers 543–568 are assigned below (renumbered +2 on 2026-11-10: 541 and 542 were taken; old → new = n → n+2) (`node scripts/next-plan-number.mjs`). Highest ADR 0029, highest migration 0010.

**Pilot (D14):** the first pilot is a catering business, but restaurant and private chef are built and tested to the same level in Wave 1a — no business type is deferred. Decisions D1–D16: brief Part 0.5. Planning cards per plan: brief Part 4.

## Plan numbers (fixed — reference plans by NNN, never by spec id)

### Wave 1a — no external service (the pilot starts here)

| Map# | NNN | Spec | Title | Lane/slot | Depends on (must be merged) |
|---|---|---|---|---|---|
| 1 | 543 | FD-12 | Open one safe door for non-members — ADR 0030, INV-1 amendment, `publicLimiter`, empty `public.js` router + tests | wt-1 | Q1 approved |
| 2 | 544 | FD-01 | Clients become CRM records — wider schema, `phoneKey`, `doNotContact`, soft delete, `CLIENT_SERVER_FIELDS`, migration 0011, ADR 0031. Clients stay owner-only to write (Q2 = b) | wt-1 | 543 (permissions.js) |
| 3 | 545 | FD-01 | `upsertClientByPhone` — one server find-or-create used by generic POST `clients`; shared phone test vector; restore-from-Trash phone check | wt-1 | 544 |
| 3b | 566 | R-21 | Meter every AI call — `aiUsage` ledger written by `gemini-client.js`, price table, per-business and per-feature totals for the platform admin | wt-1 | 543 · before 554 |
| 4 | 546 | FD-02 | One shared `app-client-picker` replacing the two copies in `new-inquiry-dialog` and `event-stage-bar`; stage-bar client row becomes a chip | wt-2 | 544 · not with 522 |
| 5 | 547 | FD-02 | `/clients` list, add, search, filters; new nav group `frontdesk` in tab-chips + header entry | wt-2 | 546 |
| 6 | 548 | FD-04 | Front desk profile — `frontDeskProfiles` collection, templates per business type, pure `qualify()` + tests | wt-1 | 545 |
| 7 | 549 | FD-03 | Requests and bookings on the server, part 1 — collections, schemas, models, manual create, status moves | wt-1 | 545, 548 |
| 8 | 550 | FD-03 | Requests part 2 — approve creates the booking or the event inquiry, decline reasons, `GET /bookings/day`, lazy expiry, `decisionLog` | wt-1 | 549 |
| 9 | 551 | FD-02 | Client profile — one timeline (requests, bookings, events, notes); merge duplicates | wt-2 | 550, 547 |
| 10 | 552 | FD-03 | `/requests` queue and `/bookings` agenda screens; pending badge on the `frontdesk` group | wt-2 (design) | 550, 547 |
| 11 | 553 | FD-04 | `/frontdesk/settings` screen | wt-3 | 548, 547 |
| 12 | 554 | FD-05 | Knowledge base — `knowledgeItems`, `/frontdesk/knowledge`, `POST /ai/knowledge-import`, `publicFacts()` | wt-3 | 548, 566 |
| 13 | 555 | FD-08 | Public request page `/book/:slug` + guest page + `public.js` API, rendered without the app shell | wt-3 (design) | 543, 550, 553 · alone in its window |
| 14 | 556 | FD-10 | Onboarding intake form + checklist per business type (`setup-status.frontDesk`, baseline optional) + test request (1b adds the in-app test chat, R-15) | wt-3 | 553, 554, 567 |
| 15 | 557 | FD-11 | Draft / pilot / active / suspended status (platform admin) + CSV export of clients, requests, bookings | wt-3 | 555 |
| 15b | 567 | FD-14 | Optional "before" numbers — extend the baseline with kitchen and front desk estimates, all skippable | wt-3 (first) | — |
| 15c | 568 | FD-14 | Business report `/report` — measured start vs latest, monthly trend, optional baseline column, rule-based findings, printable; platform admin can open it | wt-3 | 567 |
| 16 | 558 | FD-12 | Privacy and go-live docs — `erase-client.js`, retention rules, `security-go-live.md` section, pilot terms draft (Hebrew), `render.yaml` env docs | wt-1 | 550 |
| 17 | 559 | FD-09 | Front desk numbers for the owner and the platform admin (form + manual channels); adds its block to the 568 report | wt-3 | 550, 556, 568 |

### Wave 1b — infra-gated (Q4–Q6 + Meta business verification). Mapped now, drafted after the gate answers.

| Map# | NNN | Spec | Title | Lane/slot | Depends on |
|---|---|---|---|---|---|
| 18 | 560 | FD-06 | WhatsApp in/out on the server — `whatsapp-client.js`, signed webhook, `conversations` + `messages`, conversations router | wt-1 | 550, Q4, Q5, Meta setup |
| 19 | 561 | FD-06 | `/inbox` — list → thread, take over / hand back, request card | wt-2 (design) | 560, 552 |
| 20 | 562 | FD-07 | The assistant answers and collects; the server decides — `frontdesk-turn`, prompt, guardrails, eval set (30 dialogues) | wt-1 | 560, 554, Q6 · may split at drafting (L) |
| 21 | 563 | FD-07 | `request.suggested` on the card + agreement rate in `decisionLog` | wt-1 | 562 |
| 22 | 564 | FD-06 | Alert the owner on WhatsApp when a request waits (utility template, opt-in) | wt-3 | 560 |
| 23 | 565 | FD-09 | Conversation and assistant numbers on the dashboard | wt-3 | 562, 559 |

Lanes: wt-1: 543→544→545→566→548→549→550→558 ‖ 1b: 560→562→563 · wt-2: 546→547→551→552 ‖ 1b: 561 · wt-3: 567→568→553→554→555→556→557→559 ‖ 1b: 564→565.
Suggested runs: `fd-1a-data` = 543, 544, 545, 566, 548, 549, 550 · `fd-1a-ui` = 546, 547, 551, 552, 553, 554, 555, 556, 557, 558, 559 · `fd-report` = 567, 568 (independent of the rest — can run first) (wt-3 waits on 547 for the nav group) · `fd-1b` = 560–565.

Changes from the brief's Part 4 (why):
- Brief #7 (L) split into 549 + 550: one Worker session each; schema/CRUD separate from the approve transaction.
- `decisionLog` moved from 1b (brief #19) into 550: the pilot should record every human approve/decline/ask from day one — that is the automation dataset (rule 7). 563 only adds AI suggestions.
- New 558: FD-12's retention, erase-by-phone, pilot terms and env docs had no plan in the brief map.
- 553 (settings) depends on 547 because 547 creates the `frontdesk` nav group it hangs from.
- 557 depends on 555 because `suspended` changes what the public page answers.

## Must not run at the same time (write `Parallel: no` against these)

- 566 with any plan editing `server/services/gemini-client.js` or `server/routes/ai.js`.
- 543, 544, 548, 549, 550 all edit `server/utils/permissions.js` and/or `server/constants/collections.js` — sequential in wt-1 (already the lane order).
- 544, 545 with any plan editing `shared/schemas/entities/client.schema.ts` or `server/routes/generic.js` (545 changes the generic POST for `clients`).
- 546 with 522 (open draft, edits `menu-intelligence.page.html/.ts` that hosts `event-stage-bar`) and with any plan touching `event-stage-bar/**` or `new-inquiry-dialog/**`. Run 546 after 522 merges, or confirm 522 is not running.
- 547, 551, 552, 553, 554, 555, 556 all append to `src/app/app.routes.ts`, `tab-chips.component.ts`, `app.config.ts` (icons), `dictionary.json`, `styles.scss` — append-only, serialise the merges.
- 555 edits `src/app/app.component.html` (shell `@if`) — alone in its window.
- 567, 568, 559 all edit `server/services/business-stats.js` — sequential.
- 556 and 559 both extend `server/routes/business.js` (`setup-status`, baseline) — sequential.
- `menu-intelligence.page.ts` (growth-frozen, 1007 lines) — 546 and 551 net lines ≤ 0.

## Human gates

- Q1: approved 2026-11-10. 544: ADR 0031 text (soft delete only; owner-only write stays) approved by Dandan before the plan is saved.
- 566: Dandan compares one real call's ledger row with the usage shown in Google AI Studio.
- 568: Dandan reads the printed report for a seeded business.
- 544: Atlas dry-run of migration 0011 → Dandan's go (`--write=yes --backup-dir=…`, `--confirm-host=…`).
- 555: Dandan opens `/book/<slug>` on his own phone (RTL, cold start) before the link goes to a pilot.
- 558: pilot terms draft → Dandan's lawyer; Render env vars set by hand.
- One real pilot business uses Wave 1a for one week before `fd-1b` runs.
- Wave 1b: Meta business verification done (start at map approval — long lead), one shared FoodVibe test number connected, WhatsApp env vars on Render, uptime ping set up (Q5 = a), before 560.
- Every plan's `[human]` Done-when.

## Reality Check deltas (verified at 05741afd — these override the brief)

Confirmed as written: `client.schema.ts` fields; `ACTIONS` list; `OWNER_ONLY_TYPES = {clients}`; `STAFF_READ_FIELDS.clients = ['name','phone']`; `clients` in `collections.js` `cloneable:false, softDelete:false` (`menuEvents` `softDelete:true`); no clients page/route; `clientsEnsureLoadedResolver` used on 3 menu routes; `SETTINGS_TABS` = team, business, baseline; `GET /business/setup-status`; mounts `/api/v1/{log,auth,data,events,ai,admin,business,stats,product-import}`; only job `server/jobs/purge-deleted.js`; `aiLimiter` in `server/routes/ai.js:16`; `EVENT_SERVER_FIELDS` stripped in `generic.js:91`; highest ADR 0029, migration 0010.

Deltas:
1. **Phone normalisation already exists twice, identical:** client `normalizePhone` (`src/app/core/utils/client-display.util.ts:4`, `replace(/\D/g,'')`) and server `withPhoneNormalized` inline in `server/routes/generic.js:86`; migration 0009 has its own `resolvePhone`. 545 moves the server rule into `server/utils/client-upsert.js` (`normalizePhone` + `upsertClientByPhone`), `generic.js` calls it, and a shared vector file `shared/schemas/testing/phone-vectors.ts` is used by both specs.
2. **Clients are created by the browser through the generic API**, not by `events.js`: `NewInquiryDialogComponent` → `ClientDataService.addClient()` → `POST /api/v1/data/clients` (`new-inquiry-dialog.component.ts:200`). `events.js` never touches clients. So `upsertClientByPhone` callers = generic POST `clients` (545), requests router (549), public router (555), webhook (560) — not "events".
3. **No index on `clients` at all** in `server/db.js`. A plain unique `{businessId, phoneNormalized}` index conflicts with soft delete + `mergedInto` (a trashed or merged doc keeps its phone; restore would collide). Decision for the contract: **uniqueness is enforced in `upsertClientByPhone` over live, unmerged docs**, backed by a non-unique index `{businessId, phoneNormalized}`; Trash restore of a client whose phone now belongs to a live client → 409 `PHONE_TAKEN` (offer merge). Migration 0011 reports existing duplicates (dry-run) and resolves them only by `mergedInto`, never by delete.
4. **Name clash:** the brief uses `kinds` for both `client.kinds` (diner/event_client/lead) and `frontDeskProfiles.kinds` (request templates). Renamed in the contract: client keeps `kinds`; profile field is **`requestKinds`**.
5. **Expiry and Render free tier:** there is no scheduler; `purge-deleted.js` runs lazily on Trash reads. Request expiry follows the same pattern — `expireDue(db, businessId, now)` runs on `GET /requests` and on approve/decline, not on a timer (a sleeping server would miss a timer anyway).
6. **Approve → event must reuse the generic POST path:** today an event is created by `POST /api/v1/data/menuEvents` (`stage` → `inquiry`). 550 extracts the server-side event-creation step into `server/utils/event-create.js` (`buildNewEventDoc`) so generic POST and approve share it; no second copy of the event defaults.
7. **ADR 0027 line to supersede** (ADR 0031): line 32 only (`softDelete:false`, no Trash, no delete UI). Line 24 (owner-only write) stays (Q2 = b).
12. `server/services/gemini-client.js` (498 lines) counts calls per model per day (`incrementUsage`) but records no tokens, no business and no feature; `callGemini({ body, timeoutMs, log, eventPrefix, needsVision, model })` has no caller identity — plan 566 adds it.
8. **INV-1 `Touches`** must add `server/routes/public.js`, `server/routes/webhooks-whatsapp.js`, `server/routes/requests.js`, `server/routes/bookings.js`, `server/routes/conversations.js` (543 adds the first; each later plan adds its own router).
9. **Open draft plans that matter:** 522 (event logistics panel; scope `menu-intelligence.page.html/.ts`, `app.config.ts`, `dictionary.json`, `component-families.md`) — overlaps 546 only through the page host and appends. 519–521, 523, 529, 531, 532 do not overlap. 558's `erase-client.js` follows plan 531's `--target` rule (531 is still draft — if it has not merged, 558 copies `server/utils/db-target.js` usage as it is today).
10. `menu-intelligence.page.ts` is 1007 lines (growth-frozen); `event-stage-bar.component.ts` 320, `new-inquiry-dialog.component.ts` 291 — 546 should shrink both.
11. `reference-bookings-engine.md` saved (2026-11-10). Its §5.5 says jobs run "on the same scheduler as `purge-deleted.js`" — there is no scheduler (delta 5); Wave 2 reminders need Q5's answer.

## Contracts (frozen on approval — copy verbatim into every plan that uses them)

**C-ACTOR (543; used by every router in this program)** — onboarding is typed by Dandan inside the owner's account (Q3 = a). To keep a later platform-admin "act in business" mode a one-place change: every server stamp (`createdBy`, `statusHistory[].by/byName`, `decisionLog.decidedBy`) takes its actor only from `actorOf(req)` in `server/utils/actor.js` → `{ userId, name }`; no router reads `req.user` for a stamp directly.

**C-GUEST (543; used by 555, 560)**
- Guest-originated writes enter only through `server/routes/public.js` (`/api/v1/public`) and `server/routes/webhooks-whatsapp.js` (`/api/v1/webhooks/whatsapp`). The business is resolved by the server (slug → `frontDeskProfiles`; phone-number id → profile `whatsapp.phoneNumberId`), never taken from the body.
- Stamps: `createdBy: 'public:form' | 'public:whatsapp'`, `businessId` = resolved business.
- Read-back only by an unguessable token: `publicToken` = 24 random bytes, base64url (32 chars); a token names exactly one request or booking.
- `server/middleware/rate-limit.js` exports `publicLimiter` (20 writes / 15 min per IP + slug). Honeypot field `website` → silent 201 with no write.
- Guest text is stored as plain text and never rendered as HTML.
- ADR `docs/brain/decisions/0030-guest-writes-have-one-door.md`; INV-1 rule gains one sentence and the Touches list grows (delta 8).

**C-CONTACT (544, 545; used by 549, 551, 555, 560)**
- Collection stays `clients`, TS type `Client`, UI word "לקוח / לקוחות".
- Schema additions (all optional): `kinds` (`diner | event_client | lead`, ≤ 3), `tags` (≤ 12 × 40 chars; reserved `vip`, `allergy`, `repeat_no_show`), `lifecycle` (`new | active | dormant`), `firstSeenAt`, `lastContactAt`, `counters { requests, bookings, events, noShows, conversations }`, `consent { terms?, marketing? { given, at, via } }`, `language` (`he | en | ar | ru`), `waId`, `mergedInto`.
- Also (R-01, R-02): `phoneKey` — server-derived match key = the last 9 digits of `phoneNormalized` when it has ≥ 9 digits, else all of them (`0521234567` and `972521234567` → `521234567`); `doNotContact?: { at, reason ≤ 200, via: 'guest' | 'member' }` — server-owned, set only through the dedicated clients router that 551 adds for merge (`PUT /api/v1/clients/:id/do-not-contact`) and by the assistant's removal intent (562), checked before every outbound message (560).
- `CLIENT_SERVER_FIELDS` (exported from `client.schema.ts`, stripped by generic API): `phoneNormalized`, `phoneKey`, `kinds`, `lifecycle`, `firstSeenAt`, `lastContactAt`, `counters`, `waId`, `mergedInto`, `doNotContact`.
- Canonical `source` keys written by the server: `manual`, `public_form`, `whatsapp`, `event_migration`.
- `collections.js`: `clients` → `softDelete: true`.
- Permissions (Q2 = b): `clients` stays in `OWNER_ONLY_TYPES` — only the owner creates, edits or deletes a client directly. Staff cause a client only implicitly: a manual request (`manageRequests`) runs `upsertClientByPhone` on the server. `STAFF_READ_FIELDS.clients = ['name','phone','tags','kinds']`. No new action. Switching to "staff may add clients" later is a `permissions.js` + client `PermissionService` change with no data migration — `createdBy` is already stamped on every client.
- `server/utils/client-upsert.js` exports `normalizePhone(s)` and `upsertClientByPhone(db, businessId, { name, phone, source, actor }) → { client, created: boolean }` — matches on `phoneKey` over live, unmerged docs only; uniqueness is enforced here (delta 3). Also exports `phoneKey(digits)`. Index `{ businessId: 1, phoneKey: 1 }` non-unique. Migration 0011 backfills `phoneKey` and its dry-run lists clients that collide on it.
- Restore of a client whose phone is taken → 409 `PHONE_TAKEN`.
- Migration `server/migrations/0011-clients-crm.js`; ADR `0031-clients-are-crm-records.md` supersedes ADR 0027 line 32.

**C-PICKER (546; used by 547, 551, 552)**
- `src/app/shared/client-picker/` → `app-client-picker`: inputs `selected = input<Client | null>()`, output `picked = output<Client>()`; search by name/phone (`matchesClientQuery`); add-option row (owner only, hidden for staff by `PermissionService`) creates through `ClientDataService.addClient()` (which goes through `upsertClientByPhone` on the server). Registered in `docs/brain/component-families.md`.
- `NewInquiryDialogComponent` moves to `src/app/shared/new-inquiry-dialog/` (opened from the menu library, the client profile and `/requests`).

**C-PROFILE (548; used by 553–557, 562)**
- Collection `frontDeskProfiles`, one per business, owner-only write (`editFrontDesk`; in `OWNER_ONLY_TYPES`), not cloneable, `softDelete: false`.
- Fields: `businessType` (`restaurant | private_chef | catering | other`), `slug` (`^[a-z0-9-]{3,40}$`, unique index), `displayName`, `logoUrl?`, `phone?`, `address?`, `serviceArea?`, `hours` (same row shape as `venue.operatingHours`), `closedDates?`, `requestKinds: { [kind]: { enabled, questions[≤12]{ key, label, type: text|number|date|time|choice, options?, required }, rules{ minPartySize?, maxPartySize?, minLeadHours?, maxLeadDays?, minBudgetPerGuest?, areas? }, defaultDurationMinutes?, expireAfterHours } }`, `assistant { level: 0|1|2, tone: warm|formal, greeting?, handoffText?, activeHours? }`, `status` (`draft | pilot | active | suspended`, server-owned), `whatsapp? { phoneNumberId, ownerAlertPhone?, ownerAlertOptIn }` (server-only, never sent to the browser in full).
- `shared/schemas/front-desk-templates.ts` → `templateFor(businessType)`.
- `shared/front-desk/qualify.ts` → `qualify(kindConfig, wanted, answers) → { verdict: 'fit' | 'borderline' | 'unfit', reasons: string[] }` (reasons = dictionary keys). Pure; used by server and client.

**C-REQUEST (549, 550; used by 551, 552, 555, 556, 559, 560, 562)**
- `REQUEST_KINDS = ['table','event','tasting','consultation']`, `REQUEST_STATUSES = ['new','qualified','needs_info','approved','declined','cancelled','expired']`, `REQUEST_CHANNELS = ['manual','public_form','whatsapp']`, `DECLINE_REASONS = ['full','out_of_area','below_minimum','date_taken','other']` in `shared/schemas/entities/request.schema.ts`.
- `requests` fields as brief FD-03, plus `test?: boolean` (556; excluded from stats). Server-owned (`REQUEST_SERVER_FIELDS`): `status`, `statusHistory`, `qualification`, `outcome`, `publicToken`, `channel`, `suggested`, `conversationId`.
- `bookings` (`shared/schemas/entities/booking.schema.ts`): `{ kind: 'table'|'tasting'|'consultation', status, source, date, time, startAt, endAt, durationMinutes, partySize, clientId, guestName, guestPhone, requestId?, notes?, statusHistory, publicToken }`.
  - `BOOKING_STATUSES` (Wave 1) = `['confirmed','seated','finished','no_show','cancelled']` — names taken from the reference engine so Wave 2 only *adds* `pending`, `reminded`, `guest_confirmed`. Hebrew labels stay "הגיעו" / "סיימו".
  - `BOOKING_SOURCES` = `['request','phone','walk_in','whatsapp','google','ai']`; Wave 1 writes only `request`.
  - `endAt = startAt + durationMinutes × 60000` (epoch ms; date/time stored business-local `Asia/Jerusalem`).
  - Server-owned (`BOOKING_SERVER_FIELDS`): `status`, `statusHistory`, `source`, `startAt`, `endAt`, `publicToken`.
  - Indexes: `{ businessId, startAt }`, `{ publicToken }` unique (also `requests.publicToken` unique).
- Routers: `server/routes/requests.js` at `/api/v1/requests` — `POST /` (manual), `PUT /:id/status`, `PUT /:id/wanted`, `POST /:id/approve`, `POST /:id/decline` `{ reason, text? }`; `server/routes/bookings.js` at `/api/v1/bookings` — `PUT /:id/status`, `GET /day?date=YYYY-MM-DD` → `{ bookings, coversByHour }`. Reads through the generic API.
- Booking status moves (Wave 1): `confirmed → seated → finished`; `confirmed → no_show` after `startAt`; `confirmed|seated → cancelled`; illegal → 409 `BAD_STATUS`.
- Approve is idempotent: a decided request → 409 `ALREADY_DECIDED`. `event` → `menuEvents` via `buildNewEventDoc` (delta 6), `outcome { type: 'menuEvent', id }`; other kinds → `bookings`, `outcome { type: 'booking', id }`.
- Action `manageRequests` (any member).
- `expireDue(db, businessId, now)` in `server/utils/request-expiry.js` (delta 5).
- `decisionLog` collection (550): `{ requestId, suggestion?, verdict?, decidedAction: 'approve'|'decline'|'ask', decidedBy, editedFields[], secondsToDecision, at }` — no names or phones.

**C-PUBLIC (555)**
- Client routes `/book/:slug`, `/book/:slug/r/:token`, route data `{ bare: true }`, `LayoutModeService.bare_` signal, `app.component.html` wraps header + tab-chips in `@if (!layout.bare_())`.
- API: `GET /api/v1/public/:slug`, `POST /:slug/requests`, `GET /:slug/requests/:token`, `POST /:slug/requests/:token/cancel`. Input schema `shared/schemas/public/public-request.schema.ts`.
- `ngsw-config.json` unchanged (all navigations get the cached shell — the bare route still works offline-first).

**C-KB (554; used by 556, 562)**
- Collection `knowledgeItems` (fields as brief FD-05, plus `variations?: string[]` ≤ 5 × 200 chars — other phrasings of the question — and `source` gains `'correction'` for the inbox "fix this answer" loop, R-14); `server/services/knowledge.js` → `publicFacts(db, businessId) → { text: string, factIds: string[] }`, ≤ 6,000 characters; `POST /api/v1/ai/knowledge-import` (`aiLimiter`, ≤ 60 items, all `draft`).

**C-NAV (547; used by 551–557, 561)**
- Section name (Q9): "לקוחות והזמנות"; a request is "בקשה" ("פנייה" keeps meaning an event inquiry). Public pages Hebrew only (Q7); footer "Powered by FoodVibe" on the public page and done page (Q8).
- Tab group `frontdesk`; chips in this order: `inbox` (1b), `requests`, `bookings`, `clients`, `knowledge`, `settings`. Path prefixes `/inbox`, `/requests`, `/bookings`, `/clients`, `/frontdesk`. Each plan appends its own chip; labels from Q9.

**C-AIUSAGE (566; used by 554, 559, 560, 562, 565)**
- Collection `aiUsage` (server-only, not in the generic API, `userData: false`, no soft delete), one row per model call: `{ _id, businessId | '__platform__', userId?, feature, model, ok, errorCode?, inputTokens, outputTokens, totalTokens, audioSeconds?, imageCount?, latencyMs, estCostUsd, at, day: 'YYYY-MM-DD' (Asia/Jerusalem) }`. No prompt text, no reply text, no phone.
- `feature` keys (closed list in `server/constants/ai-features.js`): existing routes `recipe_generate`, `parse_text`, `generate_from_url`, `parse_price_list`, `product_match`, `product_from_image`, `receipt_photo`; new `knowledge_import`, `frontdesk_turn`, `frontdesk_suggest`, `voice_transcribe`, `knowledge_correction`, `eval`.
- `callGemini({ …, usage: { businessId, userId?, feature } })` — `usage` is required; a call without it throws in tests. Token counts come from the response `usageMetadata`; a failed call writes a row with `ok: false`.
- `server/constants/ai-prices.js`: `{ [model]: { inputPerMTok, outputPerMTok, audioPerMinute? } }` in USD with a `pricesAsOf` date; `estCostUsd` is computed at write time from this table (the free tier still gets the paid-tier estimate — that is the number pricing needs).
- `GET /api/v1/admin/ai-usage?from&to&groupBy=business|feature|model|day` (platform admin) → totals of calls, tokens, cost. Indexes `{ businessId, day }`, `{ day, feature }`.
- Per-business daily cap (FD-07 `frontDeskUsage.aiTurns`) is read from this ledger — no second counter.

**C-CONV, C-AI (560–563)** — as brief FD-06 / FD-07, frozen when Wave 1b is drafted, with these decisions already fixed:
- **Prompt language (Q12):** the system prompt in `server/services/frontdesk-prompt.js` is English only and written from scratch; it instructs the model to reply in the customer's language (Hebrew default). The eval dialogues are Hebrew on the customer side. This overrides the brief's "Hebrew system prompt".
- **Number model (Q4 = c now, a at deployment):** `resolveBusiness({ phoneNumberId, waId, text })` in `server/services/whatsapp-routing.js`, in this order: (1) a profile whose `whatsapp.phoneNumberId` equals the receiving id (dedicated number — the deployment model); (2) on the shared FoodVibe number: the open conversation of this `waId`; (3) a request reference or business slug found in the text (the public page's `wa.me` link pre-fills it); (4) otherwise one fixed "which business?" reply, no AI call. Outbound on the shared number prefixes the business display name. Moving a business to its own number = setting `whatsapp.phoneNumberId` on its profile; no code change.
- **AI budget (Q6 = b during development):** free model chain, `assistant.level` default `0` (drafts only); level 1 is switched on per business by the platform admin. A paid key is a deployment decision taken from the 566 numbers.
- **Server awake (Q5 = a):** external uptime ping every 10 minutes; documented in 558, no code.
- **Voice notes (Q11 = b):** transcribed through `gemini-client.js` with `feature: 'voice_transcribe'` (R-13).
- Rules carried: R-02 … R-13, R-17 … R-20.

## Wave 2 compatibility (from `reference-bookings-engine.md` — what Wave 1 adopts, what it overrides)

Adopted now so Wave 2 is additive: booking status names (`seated`, `finished`), `source`, `endAt`, `{businessId,startAt}` and unique `publicToken` indexes, `publicLimiter` numbers, `LayoutModeService` + `{ bare: true }`, `publicToken` = 24 random bytes base64url, honeypot, `wa.me` guest-initiated rule.

Overridden by the Front Desk brief (the reference text is wrong for Wave 1 on these points):
- No `guests` collection — diners are `clients` with `kinds: ['diner']` (Part 2 rule 1). Reference §4.4, §5.6 `editGuests`, `STAFF_READ_FIELDS.guests` do not apply.
- No `bookingProfiles` — the profile is `frontDeskProfiles`; Wave 2 capacity/turn/policy fields go under `requestKinds.table` (reserved, not drafted now).
- No flat `guest {…}` object on bookings — snapshot fields `guestName`, `guestPhone` + `clientId` (same shape as `menuEvents`).
- Public writes create a `request`, not a confirmed booking — no channel confirms a table in Wave 1 (rule 6). The reference INV-7 "the engine decides availability" is a Wave 2 ADR.
- `createdBy: 'public:<channel>'`, not `'public:<slug>'`.
- Migration 0011 is `0011-clients-crm.js`, not `0011-bookings.js`; booking indexes are created by 549 at startup (`server/db.js`), no migration needed for a new collection.
- Event inquiries from the public page go through a request and approve (550), not straight into `menuEvents` (reference Q9 (a) is replaced by human-in-the-loop).

## Contract extensions (run)

Workers append here: `- plan NNN · <extension> · why`.
- plan 545 · clients gain the server-only field liveKey (= phoneKey while live and not merged; removed on delete and merge) with a unique partial index { businessId, liveKey }; it is in CLIENT_SERVER_FIELDS; 551's merge unsets it on the merged-away client · race-safe "one live client per phone" (Human Q1 = a)
- plan 546 · C-PICKER gains inputs inputId, variant and outputs cleared, addingChange, plus a back() method · Escape steps back one view and the dialog title follows the add view
- plan 547 · client lifecycle is computed in the browser by clientLifecycle(client, now): new = firstSeenAt within 30 days, dormant = no contact for 180 days, active = the rest; the stored lifecycle field is not read · no rule existed (Human 2026-11-10)
- plan 548 · qualify lives at shared/schemas/front-desk/qualify.ts (built by build:schemas), takes a 4th argument ctx { now?, hours?, closedDates?, kind? }, reasons may carry values as "key|a=1;b=2" (parseReason); hoursCheck(hours, date, time?) is exported; operatingHoursRowSchema / OperatingHoursRow (dayIndexes, open, close) move to shared/schemas/entities/common.schema.ts · shared/front-desk/ is not built; lead time and hours need the clock and the profile
- plan 549 · requests gain the server-owned decline { reason, text?, at, by } (in REQUEST_SERVER_FIELDS); the TS type is FrontDeskRequest; collections gain the flag routerWrites — generic writes on such a type answer 405 USE_ROUTER · 559 reads decline.reason; Request shadows the browser global
- plan 550 · request answers hold every answered question with its label as displayed · the server-written first note of an approved event is built from answers
- plan 551 · app-client-form gains client (edit mode); NewInquiryDialogComponent gains initialClient; app-client-picker gains allowAdd and exclude · edit on the profile, open the dialog pre-filled, pick a merge target
- plan 552 · waLink(phone, text?) helper: leading 0 → 972, fewer than 9 digits → no link; 555 reuses it · raw digits break wa.me links for 05x numbers
- plan 555 · request reference = first 8 characters of _id, upper case; the done page's WhatsApp text is "בקשה <ref> · <slug>"; the quick-add hero button is hidden in bare mode · 560's routing reads the reference from the text
- plan 557 · frontDeskProfiles gain adminHistory (platform-admin changes with reason); business.frontDeskPlan and assistant.level are written only by the platform-admin route (generic writes drop them) · D7 gives the level to the platform admin
- plan 566 · ai-features closed list gains recipe_patch, menu_generate, menu_patch, product_generate, product_patch, recipe_from_image (13 existing routes); eval stays reserved for 562 · C-AIUSAGE listed 7 of the 13 routes
