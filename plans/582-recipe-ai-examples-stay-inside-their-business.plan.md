# Plan 582 — Recipe AI examples stay inside their business

Status: draft
Depends-on: 580
Snapshot: d4e904bb

## Problem Statement
Found by the Planner on 2026-11-11 (todo B6) while reviewing plan 580's menu-shot leak (B5).

- `POST /api/v1/ai/shots` (`server/routes/ai.js:1496`) saves a recipe example (prompt + draft) into the `GEMINI_SHOTS` collection with `saveShot` (line 177). The document has no `businessId`: `{ prompt, draft, status, source, warnings, userId, createdAt }`.
- `getApprovedShots` (line 203) reads the 50 newest approved shots of **every** business, and `selectShots` puts the closest few into the prompt of `POST /generate` (line 327) and the URL import (line 1473). One business's recipe text and dish names therefore reach another business's Gemini prompt. That breaks INV-1 (every item belongs to exactly one business, and nothing is read from another business).
- `saveShot` also prunes globally: one busy business can push every other business's examples out of the 50-shot cap.

Plan 580 fixes the same leak for menu examples (`GEMINI_MENU_SHOTS`, A5). This plan applies the same fix to recipe examples.

## Goals & Success Criteria
**Primary:** a business's recipe AI calls use only that business's own approved examples, and saving an example never removes another business's examples.

- [auto] `server/test/ai-shots.test.js` (new): business A saves an approved shot whose prompt is "SHOT-A-ONLY"; a `POST /api/v1/ai/generate` call by business B sends a Gemini body (the stubbed `fetch` call) without "SHOT-A-ONLY"; the same call by business A sends a body with it; a seeded approved shot with no `businessId` is sent to neither.
- [auto] `server/test/ai-shots.test.js`: the URL import (`POST /api/v1/ai/generate-from-url`, page fetch stubbed) by business B also sends no "SHOT-A-ONLY".
- [auto] `server/test/ai-shots.test.js`: with 50 shots of business A seeded, one new shot saved by business B leaves all 50 of A in place, and a 51st shot saved by A removes only A's oldest one.
- [auto] `server/test/ai-shots.test.js`: a saved shot document has `businessId` equal to the caller's business.
- [auto] `pnpm run test:server` passes.
- [auto] `pnpm --dir server run lint` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.

## Execution Mode
- Parallel: no — edits `server/routes/ai.js`, which plans 580 and 554 also edit; runs after 580 (the `scopeFilter(req)` pattern for shots lands there first) and not together with 554.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/routes/ai.js
server/test/ai-shots.test.js
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-1: preserves — restores it for recipe examples: `getApprovedShots` reads only the caller's business (`scopeFilter(req)` from `server/utils/business-scope.js`) and `saveShot` stamps `businessId`, so one business's prompts and dish names no longer reach another's prompt. No new write path; `server/routes/ai.js` is not in INV-1's Touches list.
- INV-6: preserves — every Gemini call still goes through `server/routes/ai.js` and `callGemini`; only the examples put into the prompt change.
- INV-2: preserves — the scoped read uses `server/utils/business-scope.js`, as the invariant requires.

## Reuse Check
- `scopeFilter(req)` (`server/utils/business-scope.js`) — reused for the read filter and the stamped `businessId`.
- The shape plan 580 A5 gives `getApprovedMenuShots(req)` — mirrored for `getApprovedShots(req)`; no new helper.
- Test harness: the `supertest` + stubbed `fetch` setup of `server/test/ai-usage.test.js` — reused in the new test file.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

Plan 580 edits `server/routes/ai.js` before this plan: check by symbol that `getApprovedShots`, `saveShot`, `selectShots` and `POST /shots` are still there.

## User Stories
- As an owner, I want my recipe AI examples used only for my business, so my recipes never show up in another business's AI answers.

## Functional Requirements

### Must Have (P0)
- [ ] `saveShot(prompt, draft, status, source, userId)` becomes `saveShot(req, { prompt, draft, status, source })`: the inserted document adds `businessId: scopeFilter(req).businessId` and keeps `userId` (from `req.user.userId`).
- [ ] Pruning counts and deletes per business: `countDocuments(scopeFilter(req))` and the oldest docs found with the same filter; `SHOTS_CAP` (50) is now per business.
- [ ] `getApprovedShots(req, limit = SHOTS_CAP)` reads `{ status: 'approved', ...scopeFilter(req) }`; both callers (`POST /generate`, `POST /generate-from-url`) pass `req`.
- [ ] The comment block above `SHOTS_COLLECTION` says the pool is per business, and the document shape lists `businessId`.

### Should Have (P1)
- none.

### Nice to Have (P2)
- none.

## UI/UX Notes
- none: no screen changes. `src/app/core/services/gemini-shots.service.ts` keeps calling `POST /api/v1/ai/shots` unchanged.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Stamp and prune recipe examples per business — `saveShot(req, …)` with `businessId`, per-business count and pruning, `POST /shots` passes `req` — server/routes/ai.js
- [x] A2: Read only the caller's own approved examples — `getApprovedShots(req, limit)` with `scopeFilter(req)`; both callers pass `req`; comment block updated — server/routes/ai.js
- [x] A3: Test the scope, the prune and the stamp — the four `[auto]` cases above — server/test/ai-shots.test.js
- [x] A4: Run test:server, the server lint and log-query, and paste the output lines under Execution Notes

## Technical Considerations
- Dependencies: plan 580 (same file; its menu-shot fix is the model for this one).
- New files needed: `server/test/ai-shots.test.js`.
- Model changes: `GEMINI_SHOTS` documents gain `businessId`.
- Backend / API: no endpoint, request or response changes.
- Auth and validation: unchanged (`verifyToken`, `aiLimiter`, the injection screen on approved shots).
- Security surface: smaller — prompts carry only the caller's own examples.
- Data / migration: none. Old `GEMINI_SHOTS` documents have no `businessId`, so no one reads them after this plan; they are left in place (pruning never reaches them, since it filters by business).
- Cost: none.

## Backend Impact
- Collections affected: `GEMINI_SHOTS` (new docs gain `businessId`; reads and pruning filtered by business).
- New collections: no
- Server changes needed: yes — `server/routes/ai.js` only.

## Out of Scope
- Deleting or migrating the old unscoped `GEMINI_SHOTS` documents.
- Menu examples (`GEMINI_MENU_SHOTS`) — plan 580.
- Any screen change, and a review screen for shots.

## Critical Questions
- none open. Fixing B6 in its own small plan, with the same fix as B5: Human, 2026-11-11.

## Execution Notes
- Planner draft 2026-11-11 from todo item B6; checked against `origin/main` at d4e904bb.
- Seen while drafting: `POST /shots` passes `req.user._id` as `userId`, while the other routes use `req.user.userId`. P0 switches to `req.user.userId`; the test checks the stamped `businessId` only.
- Evidence: pnpm run test:server -> exit 0 (ai-shots.test.js 4 passed); pnpm --dir server run lint -> exit 0 (0 errors); log-query -> SKIP: no database configured.
