# Plan 697 — A duplicate logistics question shows a clear message instead of "server error"

Status: done
Depends-on: none
Snapshot: 7c8fccd4421e7294d8b865d4750da34a5f9652c4

## Problem Statement
On `/dashboard?tab=metadata`, in the logistics questions card
(`src/app/pages/metadata-manager/components/logistics-item-manager/`), adding a question whose text already exists as a
shared question shows the generic "server error" toast. The server refuses correctly with
`409 {"error":"This term already exists for everyone"}`, but:
1. `POST /api/v1/data/taxonomyTerms` in `server/routes/generic.js` (the `masterHasTerm` check, ~line 633) sends no
   `messageKey`, so `TaxonomyStore.errorMessage()` (`src/app/core/services/taxonomy-store.service.ts:224`) returns null and
   the card falls back to `server_error`. The PUT rename path (~line 799) adds a `messageKey` only for kind `unit`.
2. The card's own duplicate check (`logistics-item-manager.component.ts` `onSubmit`) compares only against live questions
   of the draft's phase, while the server refuses a shared key in any phase (`masterHasTerm` ignores phase) and an own key
   in any phase (unique index `kind_key_user_unique`, `server/db.js:116`). So the request is sent at all.

## Goals & Success Criteria
- [auto] `pnpm run test:server` passes, including `server/test/taxonomy-terms-api.test.js` (new cases: a POST of an own
  `logisticsItem` with a shared question's key answers 409 with `messageKey: 'logistics_question_shared_taken'`; a PUT
  rename of an own `logisticsItem` onto a shared key answers 409 with the same `messageKey`).
- [auto] `pnpm run test:ci` passes, including
  `src/app/pages/metadata-manager/components/logistics-item-manager/logistics-item-manager.component.spec.ts` (new cases:
  a shared question's text, in this or the other phase, is refused with `logistics_question_shared_taken` and no call; an
  own question's text in the other phase is refused with `logistics_question_own_taken` and no call; a server 409 with a
  `messageKey` shows that message, not `server_error`).
- [auto] `pnpm run build:schemas`, `pnpm run build`, `pnpm run lint` pass.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] As an owner on `/dashboard?tab=metadata` → logistics questions card: type the text of a shared question (e.g.
  one with the lock tag) and press add. The field shows "השאלה הזאת כבר קיימת ברשימה המשותפת" under it, no toast, nothing
  is added. Switch the phase tab and try the same text: the same message.

## Execution Mode
Single agent on `fix/697-logistics-duplicate-message` from `origin/main`; PR to `main`, not merged by the agent.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, public/assets/data/dictionary.json, src/app/app.routes.ts` — add to them, never rewrite or
remove an existing entry without escalating).

```scope
server/routes/generic.js
server/test/taxonomy-terms-api.test.js
src/app/pages/metadata-manager/components/logistics-item-manager/logistics-item-manager.component.ts
src/app/pages/metadata-manager/components/logistics-item-manager/logistics-item-manager.component.spec.ts
plans/697-logistics-duplicate-question-clear-message.plan.md
```

## Read Scope
`src/app/core/services/taxonomy-store.service.ts`, `src/app/core/services/logistics-item-registry.service.ts`,
`server/db.js`.

## Escalation Protocol
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-1: preserves — who may write which term is unchanged; the 409 body only gains a `messageKey`.
- INV-2: preserves — the clash lookups (`masterHasTerm`, same-business check) and their scope are unchanged.
- INV-3: preserves — the server still decides and refuses the clash in the same single request; it only adds a
  `messageKey` to the existing 409 body. No re-key or cascade changes.
- INV-5: preserves — terms stay in `taxonomyTerms`; the card reads them through the existing registry; no new store.

## Reuse Check
- none — no new component, util, pipe, service or `.c-*` class: a small server lookup map, two dictionary keys, and a
  wider match in the card's existing duplicate check; the toast path reuses `TaxonomyStore.errorMessage()` (plan 475).

## Step 0 — Reality Check
Confirmed on 7c8fccd4: POST 409 at `server/routes/generic.js:633-635` has no `messageKey`; PUT at `:797-802` sets one
only for `unit`; the card's check at `logistics-item-manager.component.ts` filters `t.phase === draft.phase`.

## User Stories
- As a chef, I want to be told plainly that a question already exists in the shared list, so that I don't think the app
  broke and don't try again.

## Functional Requirements

### Must Have (P0)
1. Server: one map `MASTER_CLASH_MESSAGE = { unit: 'unit_name_taken', logisticsItem: 'logistics_question_shared_taken' }`
   used by the POST `masterHasTerm` 409 and the PUT rename `masterHasTerm` 409. The PUT same-business clash
   (`TERM_KEY_TAKEN`) keeps today's unit-only `messageKey`.
2. Dictionary (append-only): `logistics_question_shared_taken` = "השאלה הזאת כבר קיימת ברשימה המשותפת",
   `logistics_question_own_taken` = "השאלה הזאת כבר קיימת אצלך בשלב אחר".
3. Card: the duplicate check runs against every live question (`registry.items_()`, shared and own, every phase, hidden
   shared ones included), excluding the one being edited. Shared match → `logistics_question_shared_taken`; own match in
   the same phase → `metadata_logistics_duplicate` (unchanged); own match in the other phase →
   `logistics_question_own_taken`. No call is made.
4. The existing toast path (`fail()` → `taxonomy.errorMessage(err)`) now shows the server's message for a clash the card
   could not see (e.g. a shared question removed for everybody, which `masterHasTerm` still matches).

### Should Have (P1)
- none.

### Nice to Have (P2)
- none.

## UI/UX Notes
- The message appears in the field's existing inline error slot (`[error]="error()"`), RTL, no new UI.

## Atomic Sub-tasks
- [x] A1: Make the server name a shared-question clash so the card can show a readable message — MASTER_CLASH_MESSAGE map on POST and PUT rename — server/routes/generic.js
- [x] A2: Add the two Hebrew messages for a question that already exists — public/assets/data/dictionary.json
- [x] A3: Stop the card from sending a question that already exists in any phase — onSubmit duplicate check — src/app/pages/metadata-manager/components/logistics-item-manager/logistics-item-manager.component.ts
- [x] A4: Test the server answer and the card's refusal — server/test/taxonomy-terms-api.test.js, src/app/pages/metadata-manager/components/logistics-item-manager/logistics-item-manager.component.spec.ts

## What happens when
- The text matches a shared question the business hid → still refused as shared (the server would refuse it too).
- The text matches a shared question the admin removed for everybody → the card does not see it; the server answers 409
  with `logistics_question_shared_taken` and the toast shows that message.
- Editing a question and keeping its own text → not a duplicate (its own id is skipped).
- The admin adds a shared question whose text a shared one already has → refused by the card with the shared message.

## Technical Considerations
- `unit` on POST: the same map line gives a unit POST onto a master unit key `unit_name_taken` too (before: no
  `messageKey`). Other kinds keep no `messageKey`.

## Out of Scope
- An own question re-added in another phase while a removed own copy with the same key exists (unique index clash on
  POST, generic message) — unchanged.
- Other cards' duplicate checks.

## Critical Questions
- none.

## Open questions for the Human
- none.

## Execution Notes
- behaviour: an own question's text in the other phase gets a new message "השאלה הזאת כבר קיימת אצלך בשלב אחר" rather
  than the phase-specific "שאלה כזו כבר קיימת בשלב הזה" — reverse: reuse `metadata_logistics_duplicate` for both.
- behaviour: a shared match wins over an own match when both exist (shared message shown) — reverse: check own first.
- behaviour: `unit` POST onto a master unit key now also carries `unit_name_taken` (same map line) — reverse: limit the
  POST lookup to `logisticsItem`.
- The existing spec case "refuses a duplicate of the shared key in the same phase" expected `metadata_logistics_duplicate`;
  it now expects `logistics_question_shared_taken` (the point of this plan).
- Environment (cloud container, 2026-11-22): `server/` and `scripts/` dependencies were not installed by the root
  `pnpm install` — ran `pnpm install` in `server/` and `npm ci` in `scripts/` (the write guard needs `picomatch`).
  `test:ci` needed `CHROME_BIN` pointing at a scratchpad wrapper that adds `--no-sandbox` (Chrome refuses to run as root
  otherwise; first run exit 1 "Running as root without --no-sandbox is not supported"). No repo file changed for this.

### Step 3 evidence (branch `fix/697-logistics-duplicate-message`)
- `pnpm install` → exit 0 — `Done in 1.3s using pnpm v10.34.6`
- `pnpm run build:schemas` → exit 0 — `> tsc -p shared/schemas/tsconfig.cjs.json`
- `pnpm run build` → exit 0 — `Output location: /home/user/foodVibe1.0/dist/food-vibe1.0`
- `pnpm run lint` → exit 0 — `✖ 69 problems (0 errors, 69 warnings)` (none in files this plan touched)
- `pnpm run test:server` → exit 0 — `Test Files  147 passed (147)` / `Tests  1974 passed (1974)`
- `pnpm run test:ci` → exit 0 — `Executed 2722 of 2722 SUCCESS (33.351 secs / 25.729 secs)` / `TOTAL: 2722 SUCCESS`
- `node scripts/log-query.mjs --since=plan-start --level=error` → exit 0 — `SKIP: no database configured`
- Plan gates: `scope-check --arch` → `ARCH: ok INV-1, INV-2, INV-3, INV-5`; `--reuse` → `REUSE: ok none`;
  `--tags` → `DONE_WHEN_TAGS: ok`; `--deps` → `DEPENDS_ON: ok (none)`; `--tests` → `SCOPE_TESTS: ok`.
- The `[human]` item is open: it waits on the Human.
