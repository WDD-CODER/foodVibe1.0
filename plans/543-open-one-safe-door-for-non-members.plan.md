# Plan 543 — Open one safe door for people who are not members of a business

Status: draft
Depends-on: none
Snapshot: 05741afd08ec936d1aec6f8d9a53631141905f93

## Problem Statement
The Front Desk program (`docs/frontdesk/frontdesk-map.md`, map row 1) lets a business's customers send requests
from a public page (plan 555) and later from WhatsApp (plan 560). Today the server has no way in for someone who is
not a member: every write goes through `verifyToken` and `server/utils/permissions.js`, and INV-1 says so. The Human
approved the change (`approve arch change INV-1`, 2026-11-10, brief Part 0.5 D1). This plan opens exactly one door,
with its lock, before any feature walks through it: an ADR and the INV-1 amendment, a public router that does nothing
yet, the public rate limiter, the honeypot, the read-back token, and one place that names the actor of every stamp.

Verified on `origin/main` (5702f6d1, 2026-11-10):
- `server/app.js` mounts `/api/v1/{log,auth,data,events,ai,admin,business,stats,product-import}`; `express.json({ limit: '2mb' })` at line 189 runs before the routers; `app.set('trust proxy', 1)` at line 24; the `/api/` 404 JSON fallback is `app.get('*')` (GET only).
- `server/middleware/rate-limit.js` exports `createRateLimiter` and `userOrIpKey` (plan 528, IPv6-safe through `ipKeyGenerator`). Test pattern: `server/test/rate-limit-key.test.js`.
- `recordUsage` (plan 430) runs only from inside `verifyToken` (`server/middleware/auth.js:48`).
- `actorOf` exists once, inline: `server/routes/events.js:31` → `{ userId: req.user.userId, name: req.user.name ?? '' }`.
- No `server/routes/public.js`, no `server/utils/actor.js`, no `server/utils/public-token.js`. Highest ADR 0029.

## Goals & Success Criteria
**Primary:** the server has one mounted public router that never reads a member token, a tested public limiter keyed by
IP + slug, a tested honeypot and token helper, one `actorOf`, and INV-1 + ADR 0030 that say all of this.

- [auto] `pnpm run test:server` passes, including the new tests in `server/test/public-router.test.js`, `server/test/public-guard.test.js` and the new `INV-1 guest door …` cases in `server/test/invariants.test.js`.
- [auto] Limiter: on a test app, 20 `POST /:slug/x` from one IP answer 201, the 21st answers 429; a different slug from the same IP still answers 201; `GET` requests are not counted; no `ERR_ERL_KEY_GEN_IPV6` is logged (`server/test/public-guard.test.js`).
- [auto] Token: `newPublicToken()` returns 32 characters matching `^[A-Za-z0-9_-]{32}$`, and 10,000 draws are all different (`server/test/public-guard.test.js`).
- [auto] Honeypot: a body with a non-empty `website` answers 201 `{ ok: true }` and the next handler never runs; an empty or missing `website` passes through (`server/test/public-guard.test.js`).
- [auto] `GET /api/v1/public/health` answers 200 `{ ok: true }` with `Cache-Control: no-store`, with and without a member's `Authorization` header; with the header, no usage record is written (`server/test/public-router.test.js`).
- [auto] `POST /api/v1/public/anything` with no token answers 404 `{ error: 'NOT_FOUND' }` (JSON, not 401, not HTML) (`server/test/public-router.test.js`).
- [auto] Every existing `INV-1 …` test in `server/test/invariants.test.js` still passes, and `server/test/events-router.test.js` passes unchanged after `events.js` imports `actorOf`.
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/543-open-one-safe-door-for-non-members.plan.md` exits 0.
- [auto] `pnpm --dir server run lint` exits 0.
- [auto] `pnpm run build` passes.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] Dandan reads ADR 0030 and the new INV-1 sentence in `docs/brain/invariants.md` and confirms they say what he approved on 2026-11-10 (D1).

## Execution Mode
- Parallel: yes — no open plan writes these files (overlap search 2026-11-10; run-522 = 522, 523, 532 touches none of them).
- Concurrent plans: 522, 523, 532 (running as `run-522`).
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/test/events-router.test.js
server/routes/public.js
server/app.js
server/middleware/rate-limit.js
server/middleware/honeypot.js
server/utils/actor.js
server/utils/public-token.js
server/routes/events.js
server/test/public-router.test.js
server/test/public-guard.test.js
server/test/invariants.test.js
server/breadcrumbs.md
docs/brain/decisions/0030-guest-writes-have-one-door.md
docs/brain/invariants.md
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

- INV-1: changes — ADR docs/brain/decisions/0030-guest-writes-have-one-door.md — Arch-approved: Human 2026-11-10

## Reuse Check

- `server/utils/actor.js` `actorOf` — family: none — rung: 4 — why: server util, not a UI family; it moves the one inline copy in `events.js:31` to a shared file so every new router stamps the same way (C-ACTOR).
- `server/middleware/rate-limit.js` `publicLimiter` + `ipAndSlugKey` — family: none — rung: 4 — why: built with the existing `createRateLimiter` and `ipKeyGenerator` (plan 456, plan 528); only the key and budget are new.
- `server/middleware/honeypot.js` `honeypot` — family: none — rung: 4 — why: no honeypot exists; server middleware, no UI family applies.
- `server/utils/public-token.js` `newPublicToken`, `isPublicTokenShape` — family: none — rung: 4 — why: no token helper exists; `node:crypto` only.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As an owner, I want my customers to be able to send me a request without an account so that I stop losing leads that never call.
- As an owner, I want a stranger's message to land only in my business and to touch nothing else so that the public link cannot harm my data.
- As a chef, I want every change on an event or a request to show who made it, the same way everywhere, so that I can trust the history.

## Functional Requirements

### Must Have (P0)
- [ ] Contracts copied verbatim from `docs/frontdesk/frontdesk-map.md` (frozen; do not rename anything):
  - **C-ACTOR (543; used by every router in this program)** — onboarding is typed by Dandan inside the owner's account (Q3 = a). To keep a later platform-admin "act in business" mode a one-place change: every server stamp (`createdBy`, `statusHistory[].by/byName`, `decisionLog.decidedBy`) takes its actor only from `actorOf(req)` in `server/utils/actor.js` → `{ userId, name }`; no router reads `req.user` for a stamp directly.
  - **C-GUEST (543; used by 555, 560)**
    - Guest-originated writes enter only through `server/routes/public.js` (`/api/v1/public`) and `server/routes/webhooks-whatsapp.js` (`/api/v1/webhooks/whatsapp`). The business is resolved by the server (slug → `frontDeskProfiles`; phone-number id → profile `whatsapp.phoneNumberId`), never taken from the body.
    - Stamps: `createdBy: 'public:form' | 'public:whatsapp'`, `businessId` = resolved business.
    - Read-back only by an unguessable token: `publicToken` = 24 random bytes, base64url (32 chars); a token names exactly one request or booking.
    - `server/middleware/rate-limit.js` exports `publicLimiter` (20 writes / 15 min per IP + slug). Honeypot field `website` → silent 201 with no write.
    - Guest text is stored as plain text and never rendered as HTML.
    - ADR `docs/brain/decisions/0030-guest-writes-have-one-door.md`; INV-1 rule gains one sentence and the Touches list grows (delta 8).
- [ ] `server/utils/actor.js` exports `actorOf(req)` → `{ userId: req.user.userId, name: req.user.name ?? '' }` and `guestActor(channel)` → `'public:form'` for `'form'`, `'public:whatsapp'` for `'whatsapp'`; any other channel throws `Error('unknown guest channel')`. `events.js` deletes its inline `actorOf` (line 31) and imports this one; no other change in `events.js`.
- [ ] `server/middleware/rate-limit.js` adds `ipAndSlugKey(req)` → `` `${ipKeyGenerator(req.ip)}|${req.params?.slug ?? ''}` `` and `publicLimiter` = `createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20, message: 'Too many requests', keyGenerator: ipAndSlugKey, skip: req => req.method === 'GET' || req.method === 'HEAD' })`. One shared instance (one store), exported beside `createRateLimiter` and `userOrIpKey`. Callers put it on the route itself (`router.post('/:slug/requests', publicLimiter, …)`) so `req.params.slug` is set.
- [ ] `server/middleware/honeypot.js` exports `honeypot` — when `req.body?.website` is a non-empty string it answers 201 `{ ok: true }` and does not call `next()`; otherwise `next()`. It never logs the body.
- [ ] `server/utils/public-token.js` exports `newPublicToken()` → `crypto.randomBytes(24).toString('base64url')` and `isPublicTokenShape(s)` → `typeof s === 'string' && /^[A-Za-z0-9_-]{32}$/.test(s)` (used later by token routes to answer 404 before any database read).
- [ ] `server/routes/public.js`: an Express `Router()` with no business routes yet. A router-level middleware sets `Cache-Control: no-store`. One probe `GET /health` → 200 `{ ok: true }`. A last `router.use((_req, res) => res.status(404).json({ error: 'NOT_FOUND' }))` so any other method or path under the prefix answers JSON 404. The file never imports `../middleware/auth` and never reads `req.user`. A header comment states the C-GUEST rules in plain words for the plans that add routes here (555).
- [ ] `server/app.js`: `const publicRouter = require('./routes/public')` and `app.use('/api/v1/public', publicRouter)` placed **after** `app.use(express.json(...))` and `cookieParser()` (line 189–190) and beside the other routers — not behind `verifyToken`, so `recordUsage` never runs for it.
- [ ] `docs/brain/decisions/0030-guest-writes-have-one-door.md` (frontmatter `status: accepted`, `date: 2026-11-10`, `review-by: 2027-05-10`; sections Context, Decision, Rejected, Consequences, Review — the shape of ADR 0029). Decision = the C-GUEST bullets. Rejected: guest writes through `/api/v1/data` with an anonymous role; a guest account per customer; trusting a `businessId` sent by the page. Consequences: every later public route adds its own limiter and input schema in the same plan (rule from `docs/frontdesk/assistant-behaviour-rules.md`: no public route without its rate limit in the plan that adds it); the read-back token is a bearer secret and is never logged. Written as FoodVibe's own rule (brief D13: no reference to any other project).
- [ ] `docs/brain/invariants.md` INV-1: append to the Rule line one sentence — "A non-member writes only through `server/routes/public.js` and `server/routes/webhooks-whatsapp.js`: the server resolves the business (never from the request), stamps `createdBy: 'public:<channel>'`, and lets the guest read back only what its own unguessable token names (ADR 0030)." Source line gains `ADR 0030 (plan 543)`. Touches gains `` `server/routes/public.js` `` and `` `server/utils/actor.js` `` (the other routers are added by the plans that create them, map delta 8).
- [ ] `server/test/invariants.test.js`: new `describe('INV-1 guest door', …)` with two cases — `INV-1 guest door: public.js never reads a member token` (reads `server/routes/public.js` as text and asserts it contains none of `verifyToken`, `verifyAccessToken`, `decodeAccessToken`, `req.user`, `recordUsage`); `INV-1 guest door: a member token gives nothing extra on /api/v1/public` (same response for `/health` with and without a valid owner token).
- [ ] `docs/agent/standards-backend.md` §5: one row `GET | /api/v1/public/health | none | Plan 543: public router probe; the public door for non-members (ADR 0030, C-GUEST). No member token is read under /api/v1/public.` and one sentence under the table naming `publicLimiter`, `honeypot` and `newPublicToken` as the required parts of every later public write route.
- [ ] `server/breadcrumbs.md`: one row `routes/public.js` — "Public door for non-members at `/api/v1/public` (plan 543, ADR 0030) — no member token".

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- No UI in this plan. No dictionary keys, no icons.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Give every server stamp one source for who did it — actorOf and guestActor in a shared file; events.js imports it instead of its own copy — server/utils/actor.js, server/routes/events.js
- [ ] A2: Add the public rate limiter, the honeypot and the read-back token helper — ipAndSlugKey + publicLimiter, honeypot middleware, newPublicToken + isPublicTokenShape — server/middleware/rate-limit.js, server/middleware/honeypot.js, server/utils/public-token.js
- [ ] A3: Test the limiter, honeypot and token on a small test app — 20 then 429, other slug free, GET not counted, no IPv6 key error; honeypot 201 with no next; 32 chars, 10,000 unique — server/test/public-guard.test.js
- [ ] A4: Mount an empty public router that never reads a member token — GET /health probe, no-store, JSON 404 for the rest, mounted after the JSON parser — server/routes/public.js, server/app.js, server/test/public-router.test.js
- [ ] A5: Write the guest-door rule down where the gate reads it — ADR 0030, the INV-1 sentence, Source and Touches, and the two INV-1 guest door tests — docs/brain/decisions/0030-guest-writes-have-one-door.md, docs/brain/invariants.md, server/test/invariants.test.js
- [ ] A6: Record the new route in the backend docs and the server map — the §5 row and limiter sentence, the breadcrumbs row — docs/agent/standards-backend.md, server/breadcrumbs.md
- [ ] A7: Run the full checks and hand Dandan the ADR to read — test:server, server lint, build, scope-check --arch, log-query; then the [human] card for ADR 0030

## Technical Considerations
- Dependencies: `server/app.js` mount order; `server/routes/events.js` (one import line swapped for the inline `actorOf`).
- New files needed: `server/routes/public.js`, `server/middleware/honeypot.js`, `server/utils/actor.js`, `server/utils/public-token.js`, `server/test/public-router.test.js`, `server/test/public-guard.test.js`, `docs/brain/decisions/0030-guest-writes-have-one-door.md`.
- Model changes: none.
- Backend / API: new prefix `/api/v1/public` with only `GET /health`; no write route yet (plan 555 adds them).
- Auth and validation: no token is read under `/api/v1/public`; the business will be resolved by the server from the slug (plan 555). `publicLimiter` keys on IP (IPv6 /56 through `ipKeyGenerator`, `trust proxy` 1 already set) plus slug.
- Security surface: a new unauthenticated prefix. Today it exposes only a probe. The honeypot never logs the body; the token is a bearer secret and must never appear in logs (later plans log a request id, never the token). The 2 MB global JSON limit applies; plan 555 narrows the input with its Zod schema.
- Data / migration: none.
- Project checks: `[auto] log-query` item present; `pnpm run test:server` is the test gate; no dictionary keys or icons (no UI); Reuse Check filled.

## Out of Scope
- Any public write route, the public input schema, slug lookup and `frontDeskProfiles` (plans 548, 555).
- The WhatsApp webhook router and its signature check (plan 560).
- Moving other routers' `req.user` stamps to `actorOf` beyond `events.js` (each new Front Desk router uses it from the start; `generic.js` keeps its own stamping).
- The "act in business" platform-admin mode (D4: prepared for, not built).
- `docs/security-go-live.md` public-endpoint section, retention and `render.yaml` env docs (plan 558).

## Critical Questions
- none

## Execution Notes
- Plan number: map row 1, renumbered +2 on 2026-11-10 (old 541 → 543; 541 and 542 were taken). Brief revision 2 Part 0.5 D1 is the arch approval; the Human's `approve arch change INV-1` was given in chat on 2026-11-10 (map line 3).
- Snapshot kept as the map's verification SHA `05741afd`; facts above re-checked on `origin/main` 5702f6d1.
