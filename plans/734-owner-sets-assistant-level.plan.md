# Plan 734 — The business owner switches the assistant between drafts only and answering guests alone

Status: draft
Depends-on: none
Snapshot: d1fc1531de9fdbd137b6510dd0bca3bb3f967220

## Problem Statement
Base branch: `chore/restaurant-staging` (the restaurant code is not on `main`; the Snapshot is that branch's head).

The Human (2026-11-25): "I want the business owner to be able to toggle the level of the agent too, not only the admin."

Today only the platform admin sets `frontDeskProfiles.assistant.level` (0 = drafts for the staff, 1 = answers guests
alone, 2 = reserved). Verified on the Snapshot:
- `server/routes/admin.js:226-267` — `PUT /api/v1/admin/businesses/:id/front-desk` (plan 557, `requirePlatformAdmin`)
  sets `status`, `assistant.level` (body schema `shared/schemas/front-desk-admin.schema.ts`: `0 | 1` only) and `plan`,
  with a required `reason`, and appends `{ at, by, byName, reason, status?, assistantLevel?, plan? }` to
  `adminHistory` (`$slice: -50`).
- `server/routes/generic.js:572-574` — a client POST of a profile always stores `assistant.level: 0`;
  `:763-765` — a client PUT keeps the stored level. `PROFILE_SERVER_FIELDS` (`shared/schemas/entities/front-desk-profile.schema.ts:12`,
  `['status', 'whatsapp', 'adminHistory']`) are dropped from every client POST/PUT body by `withoutServerProfileFields`
  (`generic.js:150-153`), and the PUT merges over the stored document, so a server-owned field survives a PUT.
- `src/app/pages/frontdesk/frontdesk-settings/frontdesk-settings.page.html:269-276` — the owner's settings page shows
  the level read-only (`levelKey_()` → `fd_assistant_level_0|1|2`) under the note `fd_assistant_level_admin`
  ("הרמה נקבעת על ידי צוות FoodVibe").
- Permissions: `server/utils/permissions.js` — `editFrontDesk` is in `OWNER_ONLY_ACTIONS`; the owner may, a staff
  member is refused (`OWNER_ONLY`), a consultant with a live grant may (INV-1: a consultant may do what the owner may
  except manage the team and change the business settings). Every owner front-desk write already asks it
  (`server/routes/business.js:179` intake, `server/routes/floor-plan.js:116` confirm mode). The client mirror is
  `PermissionService.can('editFrontDesk')`, already the page's `canEdit_`.
- Precedent for a one-switch write: plan 667's `PUT /api/v1/floor-plan/confirm-mode` (`server/routes/floor-plan.js:107-128`)
  and `FrontDeskProfileDataService.setConfirmMode` (`src/app/core/services/front-desk-profile-data.service.ts:55-78`).
- `server/scripts/seed-demo-restaurant.js:120` raises the demo profile from 0 to 1 only when it has no `adminHistory`;
  with an owner switch it must also leave alone a level the owner chose.

## Goals & Success Criteria
**Primary:** on the front-desk settings page the owner switches the assistant between "רק טיוטות לצוות" (0) and
"עונה לאורחים לבד" (1), each with a one-line explanation; the server checks the role, the value and the front desk
status, keeps who changed it and when, and the platform admin keeps full control.

- [auto] `pnpm run test:server` → exit 0, including the new file `server/test/front-desk-owner-level.test.js` and the
  new case in `server/test/seed-demo-restaurant.test.js`.
- [auto] `server/test/front-desk-owner-level.test.js`: the owner of a `pilot` profile at level 0 sends
  `PUT /api/v1/business/front-desk/assistant-level` `{ level: 1 }` → 200 `{ level: 1 }`; the stored profile has
  `assistant.level: 1` and one `levelHistory` row `{ by: 'own1', byName, from: 0, to: 1 }` with a numeric `at`;
  `adminHistory` is unchanged. Then `{ level: 0 }` → 200 and a second row `{ from: 1, to: 0 }`.
- [auto] same file: a staff member → 403 `{ error: 'FORBIDDEN' }` and nothing stored changes; `{ level: 2 }`,
  `{ level: '1' }`, `{}` and `{ level: 1, extra: true }` → 400 `BAD_REQUEST_INPUT`; a business with no profile →
  404 `NO_PROFILE`; a business without the `frontdesk` module → 403 `MODULE_OFF`.
- [auto] same file: a profile in `draft` and one in `suspended` → `{ level: 1 }` answers 409 `LEVEL_LOCKED` and the
  level stays 0; on a `suspended` profile at level 1, `{ level: 0 }` → 200 (lowering is always allowed).
- [auto] same file: a stored level 2 → `{ level: 0 }` and `{ level: 1 }` answer 409 `LEVEL_RESERVED`, the level stays 2;
  the same level as stored → 200 with no new `levelHistory` row.
- [auto] same file: a client `PUT /api/v1/data/frontDeskProfiles/:id` carrying `levelHistory: []` and
  `assistant.level: 0` leaves the stored `levelHistory` and level as they were; the platform admin's
  `PUT /api/v1/admin/businesses/b1/front-desk` `{ assistantLevel: 0, reason }` still works after an owner switch and
  writes its `adminHistory` row, not a `levelHistory` row.
- [auto] same file: the captured log of a switch has one `business.assistant_level.changed` line
  `{ from: 0, to: 1 }` and no user name.
- [auto] `server/test/seed-demo-restaurant.test.js`: a demo profile at level 0 with one `levelHistory` row and no
  `adminHistory` is left at level 0.
- [auto] `pnpm run test:ci` → exit 0, including `src/app/core/services/front-desk-profile-data.service.spec.ts`
  (`setAssistantLevel(1)` sends one PUT to `/api/v1/business/front-desk/assistant-level` with `{ level: 1 }` and puts
  level 1 into `profile_`; a failed call leaves `profile_` unchanged and answers the server's error code) and
  `src/app/pages/frontdesk/frontdesk-settings/frontdesk-settings.page.spec.ts` (owner at level 0, status `pilot`: two
  choices `data-testid="assistant-level-0"` / `assistant-level-1` with their hint lines, level 1 opens the confirm and
  then calls `setAssistantLevel(1)`; status `suspended`: level 1 is disabled and `fd_assistant_level_locked` shows;
  staff: both choices disabled; stored level 2: no choices, the read-only `fd_assistant_level_2` line and
  `fd_assistant_level_admin` show).
- [auto] `pnpm exec ng build` → exit 0.
- [auto] `pnpm --dir server run lint` → exit 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] On the settings page (`http://localhost:4202/frontdesk/settings`, signed in as the demo restaurant's owner,
  front desk in pilot) the assistant card shows two choices with a one-line explanation each; the owner picks
  "עונה לאורחים לבד", confirms, sees "רמת העוזר נשמרה", reloads the page and the choice is still selected; then picks
  "רק טיוטות לצוות" and it saves without a confirm.

## Execution Mode
- Parallel: yes with plan 733 (it changes `server/services/frontdesk-turn.js`, `server/services/frontdesk-tables.js`,
  the simulator page and `docs/frontdesk/assistant-behaviour-rules.md`; this plan reads and writes none of them).
- Concurrent plans: 733
- Isolated DB: no
- Base branch: `chore/restaurant-staging`

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
shared/schemas/entities/front-desk-profile.schema.ts
server/routes/business.js
server/scripts/seed-demo-restaurant.js
server/test/front-desk-owner-level.test.js
server/test/seed-demo-restaurant.test.js
src/app/core/services/front-desk-profile-data.service.ts
src/app/core/services/front-desk-profile-data.service.spec.ts
src/app/pages/frontdesk/frontdesk-settings/frontdesk-settings.page.ts
src/app/pages/frontdesk/frontdesk-settings/frontdesk-settings.page.html
src/app/pages/frontdesk/frontdesk-settings/frontdesk-settings.page.scss
src/app/pages/frontdesk/frontdesk-settings/frontdesk-settings.page.spec.ts
public/assets/data/dictionary.json
docs/brain/component-families.md
src/app/pages/breadcrumbs.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry. `server/services/frontdesk-turn.js`,
`server/services/frontdesk-tables.js`, the simulator page (`src/app/pages/frontdesk/simulator/**`) and
`docs/frontdesk/assistant-behaviour-rules.md` are never offered: plan 733 owns them; a need there waits for 733's merge.
`server/utils/permissions.js` and `server/routes/generic.js` are not needed (the existing `editFrontDesk` action and
`PROFILE_SERVER_FIELDS` cover them); a need to change either is an INV-1 question for the Human, not an `approved:`.

## Architecture Impact

- INV-1: preserves — the new route asks the existing `assertCan(req, res, 'editFrontDesk', { type: 'frontDeskProfiles', doc: profile })` before any write, exactly like plan 667's confirm-mode switch: the owner (and, per INV-1, a consultant with a live grant and the platform admin acting in the business) may, staff get 403; the business comes from `scopeFilter(req)` (the signed token), never the request; no action, role or rule in `server/utils/permissions.js` changes. `FrontDeskProfileDataService` only adds a client call; the server still decides.
- INV-4: preserves — `levelHistory` is defined once in `shared/schemas/entities/front-desk-profile.schema.ts` and the route validates the merged profile with `checkStoredDoc('frontDeskProfiles', …)` before the write; the request body is checked by a strict shape (`level` is exactly `0` or `1`).

## Reuse Check

- `PUT /api/v1/business/front-desk/assistant-level` in `server/routes/business.js` — family: none — rung: 4 — why: a one-field owner switch beside the owner's front-desk intake route (same `requireModule('frontdesk')` + `editFrontDesk` gate); the generic data PUT keeps the level server-owned on purpose (plan 557), and the admin route needs `requirePlatformAdmin` and a reason; server routes have no registry family.
- `FrontDeskProfileDataService.setAssistantLevel(level)` — family: http — rung: 2 — why: one more method on the existing profile client, the same shape as `setConfirmMode` (one PUT through the `API` map, patch `profile_` on success).
- The two-choice level picker on the assistant card — family: chip — rung: 1 — why: the existing `.c-chip-group` with `role="radiogroup"` (as on the dashboard periods and the inbox filters); no new component or `.c-*` class.
- The confirm before answering guests alone — family: modal-controller — rung: 1 — why: the page's existing `ConfirmModalService`.
- `levelHistory` on the profile — family: entity-schemas — rung: 2 — why: a sibling of `adminHistory` in the one profile schema file, listed in `PROFILE_SERVER_FIELDS` so the generic routes keep it server-owned.

## Defaults

- loading-and-error-states — exception — why: the page's data request and its loading and error states are unchanged; the new switch only disables its choices with `aria-busy` while saving and shows one error toast on a refusal, keeping the previous choice (as the confirm-mode switch does)
- hints-in-tooltips — exception — why: the Human asked for a visible one-line explanation under each choice, so the hint is inline text, not a tooltip
- empty-state-on-list — exception — why: no list in this plan; one two-choice control on an existing card
- app-list-container — exception — why: no list in this plan; one two-choice control on an existing card
- one-breakpoint-set — applies — how: no new breakpoint; the chip group wraps inside the existing card on the page's current breakpoints

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a restaurant owner, I want to turn the assistant's answers to guests on and off myself, so that I do not have to ask FoodVibe every time I want to try it or pause it.
- As a restaurant owner, I want one plain line under each choice, so that I know what the guests will get before I switch.
- As the platform admin, I want a suspended or draft front desk to stay on drafts only and every owner switch to be recorded, so that I keep control of a business that is not ready.

## Functional Requirements

### Must Have (P0)

**Schema — `shared/schemas/entities/front-desk-profile.schema.ts`**
- [ ] `levelHistory` (optional, server-owned): `z.array(z.strictObject({ at: z.number(), by: z.string(), byName: z.string().max(80), from: z.union([z.literal(0), z.literal(1), z.literal(2)]), to: z.union([z.literal(0), z.literal(1)]) })).max(50).optional()`, with a doc comment "Plan 734: the owner's assistant level switches, newest last, at most 50".
- [ ] `PROFILE_SERVER_FIELDS` becomes `['status', 'whatsapp', 'adminHistory', 'levelHistory']`, so the generic POST/PUT drop it (no change in `server/routes/generic.js`).

**The owner's switch — `server/routes/business.js`**
- [ ] `PUT /api/v1/business/front-desk/assistant-level` with `verifyToken` and `requireModule('frontdesk')`. Body must be exactly `{ level: 0 | 1 }` (any other key, a string, 2 or a missing level → 400 `BAD_REQUEST_INPUT`).
- [ ] Loads the business's live profile through `scopeFilter(req)` + `LIVE` (none → 404 `NO_PROFILE`), then `assertCan(req, res, 'editFrontDesk', { type: 'frontDeskProfiles', doc: profile })` (staff → 403 `FORBIDDEN`).
- [ ] Stored level 2 → 409 `LEVEL_RESERVED` (only the platform admin moves a reserved level). `level: 1` while `status` is neither `pilot` nor `active` → 409 `LEVEL_LOCKED`. `level: 0` is always allowed.
- [ ] Same level as stored → 200 `{ level }` and no write. Otherwise one `updateOne({ _id, businessId }, { $set: { 'assistant.level': level, updatedAt: now }, $push: { levelHistory: { $each: [{ at: now, by, byName, from, to: level }], $slice: -50 } } })`, after `checkStoredDoc('frontDeskProfiles', merged)` on the merged document (400 on a failure). `by` / `byName` come from `actorOf(req)` (`byName` cut to 80).
- [ ] Logs `info` `business.assistant_level.changed` `{ from, to }` (no name, no user id) and answers `{ level }`; a refusal logs `info` `business.assistant_level.refused` `{ reason }`.

**Demo seed — `server/scripts/seed-demo-restaurant.js`**
- [ ] The raise filter also needs `'levelHistory.0': { $exists: false }`, so a level the owner chose is left alone.

**Client — `src/app/core/services/front-desk-profile-data.service.ts`**
- [ ] `setAssistantLevel(level: 0 | 1): Promise<{ ok: true } | { ok: false, code: string }>` — one PUT to `API.business('front-desk/assistant-level')`; on success patches `profile_` (`assistant.level`); on a failure nothing changes and it answers the server's `error` code (`'error'` when there is none); logs `crud.frontDeskProfile.assistant_level_error` with the status only, never on a 401.

**Settings page — `src/app/pages/frontdesk/frontdesk-settings/`**
- [ ] On the assistant card (Card 7) the read-only level line is replaced, for a stored level 0 or 1, by a `.c-chip-group` `role="radiogroup"` with two choices (`data-testid="assistant-level-0"` / `assistant-level-1`), each a chip with its title and, under the group, the hint of each choice on its own line:
  - level 0 — `fd_assistant_choice_0` "רק טיוטות לצוות" · `fd_assistant_choice_0_hint` "העוזר מכין טיוטת תשובה, ואתם מחליטים אם לשלוח אותה".
  - level 1 — `fd_assistant_choice_1` "עונה לאורחים לבד" · `fd_assistant_choice_1_hint` "העוזר עונה לאורחים בעצמו, ומעביר אליכם כל מה שצריך אדם".
- [ ] Choosing level 1 opens `ConfirmModalService` (`fd_assistant_level_confirm`: "מעכשיו העוזר ישלח תשובות לאורחים בלי אישור שלכם. להמשיך?"); confirmed → `setAssistantLevel(1)`. Choosing level 0 saves at once. Success → toast `fd_assistant_level_saved` "רמת העוזר נשמרה"; `LEVEL_LOCKED` → toast `fd_assistant_level_locked`; any other failure → `save_failed`.
- [ ] Level 1 is disabled, with the line `fd_assistant_level_locked` "אפשר להפעיל מענה לבד רק כשהדלפק פעיל או בפיילוט" under the group, when `status` is neither `pilot` nor `active`. Both choices are disabled when `!canEdit_()` or while the call runs (`aria-busy`).
- [ ] The note under the group becomes `fd_assistant_level_owner` "צוות FoodVibe יכול לשנות את הרמה או להשהות את הדלפק". A stored level 2 keeps today's read-only line (`fd_assistant_level_2`) and `fd_assistant_level_admin`, with no choices.
- [ ] The level switch is its own call, not part of the page's draft save; the draft builder also drops `levelHistory` (beside `adminHistory`, `frontdesk-settings.page.ts:331`), and the stored level keeps winning on a draft PUT (`generic.js:763-765`, unchanged).
- [ ] Logical CSS properties only; any new class is scoped in `frontdesk-settings.page.scss`, no `.c-*` class added.

**Dictionary — `public/assets/data/dictionary.json` (append-only)**
- [ ] New keys: `fd_assistant_choice_0`, `fd_assistant_choice_0_hint`, `fd_assistant_choice_1`, `fd_assistant_choice_1_hint`, `fd_assistant_level_confirm`, `fd_assistant_level_saved`, `fd_assistant_level_locked`, `fd_assistant_level_owner`. Existing `fd_assistant_level_*` keys stay (the admin dialog uses them).

**Docs**
- [ ] `docs/brain/component-families.md` http family: a line for `FrontDeskProfileDataService.setAssistantLevel` (plan 734). `src/app/pages/breadcrumbs.md` frontdesk row: the settings page's assistant card lets the owner switch the level (plan 734).

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL; the two chips sit in one row and wrap on a phone; the hint lines are plain text (`fs-note` size) under the group, the chosen chip is the selected chip style of `.c-chip-group`.
- Keyboard: the chips are buttons in a radiogroup with `aria-checked`; Tab reaches each, Enter/Space picks.
- Level 2 is never offered to the owner.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Keep a server-owned record of the owner's level switches on the profile — levelHistory in the profile schema and PROFILE_SERVER_FIELDS — shared/schemas/entities/front-desk-profile.schema.ts
- [ ] A2: Let the owner switch the assistant level on the server, refused for staff, a reserved level and a closed front desk — PUT /business/front-desk/assistant-level, history row, log line, route tests — server/routes/business.js, server/test/front-desk-owner-level.test.js
- [ ] A3: Stop the demo seed from overriding a level the owner chose — levelHistory guard in the raise filter and its test — server/scripts/seed-demo-restaurant.js, server/test/seed-demo-restaurant.test.js
- [ ] A4: Give the browser one call that saves the level and updates the shown profile — setAssistantLevel and its spec — src/app/core/services/front-desk-profile-data.service.ts, src/app/core/services/front-desk-profile-data.service.spec.ts
- [ ] A5: Show the owner two plain choices with a one-line explanation on the settings page — chip radiogroup, confirm for answering alone, lock line, new dictionary keys, page spec — src/app/pages/frontdesk/frontdesk-settings/frontdesk-settings.page.ts, src/app/pages/frontdesk/frontdesk-settings/frontdesk-settings.page.html, src/app/pages/frontdesk/frontdesk-settings/frontdesk-settings.page.scss, src/app/pages/frontdesk/frontdesk-settings/frontdesk-settings.page.spec.ts, public/assets/data/dictionary.json
- [ ] A6: Record the new call and the owner switch in the project maps — http family line and the frontdesk breadcrumbs row — docs/brain/component-families.md, src/app/pages/breadcrumbs.md
- [ ] A7: Run every check of this plan and hand Dandan the settings page check — test:server, test:ci, ng build, server lint, log-query; evidence into Execution Notes

## Technical Considerations
- Dependencies: `assertCan` / `editFrontDesk` (plans 427, 548), `requireModule` (plan 616), the confirm-mode switch pattern (plan 667), the admin front-desk route (plan 557).
- New files needed: `server/test/front-desk-owner-level.test.js`.
- Model changes: `levelHistory` on `frontDeskProfiles` (optional; old documents need no migration).
- Backend / API: one new route `PUT /api/v1/business/front-desk/assistant-level` → `{ level }`; errors 400 `BAD_REQUEST_INPUT`, 403 `FORBIDDEN` / `MODULE_OFF`, 404 `NO_PROFILE`, 409 `LEVEL_LOCKED` / `LEVEL_RESERVED`. The admin route is unchanged.
- Auth and validation: role by the existing `editFrontDesk`; value by a strict body check; the stored doc by `checkStoredDoc`.
- Security surface: a new owner write route on an existing permission; the business comes from the token; the log carries no name or id. Nothing changes for the public or webhook routes.
- Data / migration: none.
- Project checks: the `log-query` Done-when item; Hebrew strings through `translatePipe`; logical CSS only.
- Traps: the test business needs `modules` with `frontdesk` (see `server/test/front-desk-intake.test.js` setup) and `requireModule` caches modules for 30 s, so the `MODULE_OFF` case uses its own business id; a profile created through the generic POST starts at level 0 and `draft`, so set `status` straight in the test database before a raise; `levelHistory` must be in `PROFILE_SERVER_FIELDS` before the route test of a client PUT, or the generic PUT would let the client overwrite it; the client's `profile_` is the base-service signal, patch it with `updateItems` as `setConfirmMode` does.

## Out of Scope
- Level 2 for the owner, and any change to what levels 0 and 1 do in a turn (plan 733 owns `server/services/frontdesk-turn.js`).
- A separate admin lock flag on the level (the front desk status is the lock; see the decisions).
- Showing `levelHistory` in the platform admin dialog.
- Any change to `server/utils/permissions.js`, `server/routes/generic.js` or `server/routes/admin.js`.

## Critical Questions
- none

## Execution Notes
- behaviour: the owner's permission is the existing `editFrontDesk` action, so a consultant with a live grant and the platform admin acting in the business may switch too (INV-1: a consultant may do what the owner may except the team and the business settings); refusing consultants here would change INV-1 and is not done.
- behaviour: the admin's lock is the front desk status — the owner may raise to level 1 only when the status is `pilot` or `active`; `draft` and `suspended` refuse with `LEVEL_LOCKED`; lowering to 0 is always allowed; no separate lock flag.
- behaviour: suspending a front desk does not move the stored level; outbound already sends only for a `pilot` or `active` profile (`server/services/outbound.js:15` `LIVE_STATUSES`), the same pair this plan's lock uses.
- behaviour: a stored level 2 (set by the admin) is not changed by the owner (`LEVEL_RESERVED`) and the page shows it read-only as today.
- behaviour: owner switches go to a sibling field `levelHistory` `{ at, by, byName, from, to }`, not into `adminHistory`, because an `adminHistory` row needs a reason and the demo seed reads `adminHistory` as "the admin touched it"; the admin route keeps writing only `adminHistory`.
- behaviour: switching to the level already stored answers 200 and writes no history row.
- behaviour: raising to "עונה לאורחים לבד" asks for a confirm, lowering to "רק טיוטות לצוות" does not (the safe direction needs no question).
- behaviour: the switch saves on its own call at once, like the confirm-mode switch, not with the page's save button.
- behaviour: a dedicated route instead of the generic data PUT, because plan 557 made the generic PUT keep the stored level on purpose and the status check needs the server.
