# Plan 477 — Let the owner choose which event stages staff can see

Status: active
Track: code
Snapshot: feb9f3da29fafafdacf2f3f12cfd22a5791d58f6

## Problem Statement
The Human wants the owner to decide which event stages staff (cooks) see (handoff
`docs/mvp/review-handoff-2026-10-21.md`, I2; decision D11 answered: a new metadata container, same look as the other
metadata cards with chips, where the owner picks the stages staff see). The server enforces it on every read; the
client hides nothing extra by itself.

What was verified in code on `mvp` (file:line), and what was not:
- **Stages.** Eight stages, one list: `EVENT_STAGES` (`shared/schemas/entities/event-stage.ts:3`): inquiry, quote_sent,
  deposit_paid, ordering, execution, post_production, finished, not_closed. Every event has `stage` (server-written,
  plan 442; `EVENT_SERVER_FIELDS` `:19`); a new event starts in `inquiry` (`server/routes/generic.js:471-474`); legacy
  events may have no `stage` and count as `inquiry` (`server/routes/events.js:78`, `event-stage-ui.util.ts:46-48`).
  Labels: `event_stage_<stage>` (`dictionary.json:1150-1157`).
- **What staff see today: every stage.** No role-based stage filter exists anywhere on `mvp`: the generic read routes
  filter only by business (`readScope`, `generic.js:219`; `/:id` `:405-411`), and the only client stage filter is the
  menu library's «פעילים» default, which hides `finished` / `not_closed` for everyone, owner included
  (`menu-library-list.component.ts:139`, `isActiveStage`). The handoff's "cooks don't see the inquiry stage" is NOT
  supported by the code (not reproduced in a browser). So "default = today's behaviour" = **all stages** (Critical
  Question 2).
- **Every server path that returns events to a member** (all must apply the rule):
  - `GET /api/v1/data/menuEvents` (`generic.js:201-260`, filter `:219`) — the client's only list load (`MenuEventDataService`).
  - `GET /api/v1/data/menuEvents/:id` (`generic.js:405-418`) — `getMenuEventById`, used by the menu editor (`menu-intelligence.page.ts:242-245,1027-1028`).
  - `GET /api/v1/data/menuEvents/count` (`generic.js:307-330`, filter `:309`).
  - `GET /api/v1/data/menuEvents/trash` (`generic.js:353-365`, `:357`) — lists the whole business's Trash to any member.
  - `PUT /:type/:id` (`:562`), `PUT /:type/:id/restore` (`:382-400`), `DELETE /:type/:id` (`:1152-1158`), `DELETE /:type/bulk` (`:1096`, `:1108`) — return or change one event by id.
  - `server/routes/events.js` — every route (stage, notes, closing, finish, reopen, refresh-plan) loads through `loadEvent` (`:33-37`, scope `scopeOf` `:30`) and returns the event.
  - `GET /api/v1/stats/business` (`server/routes/stats.js:16-38`) — staff get the funnel (count per stage) and the upcoming-events list over all events (`business-stats.js:35-52`, `scope` spread into `$match`).
  - Not affected: `/:type/search` (menuEvents is not searchable, 403), `PUT /:type` replace-all (owner-only since plan 449), `/api/v1/admin/*` (platform admin), `business.js /setup-status` (owner-only).
- **Business settings.** One `businesses` document per business (`shared/schemas/entities/business.schema.ts:32-43`).
  `PUT /api/v1/business/settings` replaces the whole three-number `settings` object (`server/routes/business.js:45-61`,
  `setBusinessSettings` `server/services/business.js:61-63`), so a stage list inside `settings` would be wiped by the
  Settings form's next save. This plan stores it beside it as `staffVisibleStages` with its own owner-only route.
  `GET /api/v1/business` returns the document to any member (`business.js:33-42`).
- **Metadata containers.** Cards live in `src/app/pages/metadata-manager/components/*` as `section.manager-card.c-glass-panel`
  (e.g. `coefficient-manager.component.html:1-6`) inside `.admin-grid` of the page (`metadata-manager.page.component.html:15-165`);
  the jump bar lists them (`_allJumpSections`, page `.ts:145-158`). Toggle chips are the `.c-toggle-chip` engine
  (`src/styles.scss:1812-1830`, `label.c-toggle-chip > input[type=checkbox] + span`). Owner-only actions on the client:
  `PermissionService.can('editSettings')` (`permission.service.ts:24,39`).
- **This changes INV-1** ("Members read all of their business's items", `docs/brain/invariants.md` INV-1): staff would no
  longer read every event. Nothing in this plan is built before the Human approves (see Execution Notes).

## Goals & Success Criteria
- Primary: the owner ticks the stages staff may see; from then on a staff member gets no event in an unticked stage
  from any server route (list, open by link, count, Trash, dashboard numbers, notes / stage actions), except events he
  created himself. Owners see everything as before.
- Success:
  - [x] [auto] `npx ng build` passes.
  - [x] [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `deferred: local MongoDB down` per run mode).
  - [x] [auto] `npm --prefix server test` passes, including new `server/test/staff-event-visibility.test.js`: with `staffVisibleStages: ['ordering','execution']` on business `b1`, staff `GET /api/v1/data/menuEvents` returns only the `ordering` event and the `inquiry` event the staff member created; the owner gets all; staff `GET /api/v1/data/menuEvents/<hidden id>` → 404, owner → 200; staff `/count` counts only visible events; staff `/trash` lists no hidden event; staff `POST /api/v1/events/<hidden id>/notes` → 404 and no note stored; staff stats funnel counts no hidden event; a legacy event without `stage` is treated as `inquiry`; with no stored list staff see every event (today's behaviour); `PUT /api/v1/business/staff-visible-stages` by staff → 403 and the business unchanged, by the owner → 200 and stored, with an unknown stage → 400. Plus unit tests for `server/utils/event-visibility.js` (the Mongo filter and the in-memory check agree on the same fixtures) and an `INV-1 …` case in `server/test/invariants.test.js`.
  - [x] [auto] `npx ng test --watch=false --include=src/app/pages/metadata-manager/components/staff-stages-manager/** --include=src/app/core/services/business.service.spec.ts --include=src/app/pages/metadata-manager/metadata-manager.page.component.spec.ts` passes: the card shows the eight stage chips ticked from the stored list (all ticked when none is stored), a tick / untick saves the new list, a failed save restores the chip and shows `staff_stages_save_error`, the card is absent for staff.
  - [ ] [human] Owner side: on `/dashboard?tab=metadata` the card «שלבי אירוע שהצוות רואה» looks like the other cards and shows the eight stages as chips, all ticked. Untick «פנייה» and «הצעת מחיר נשלחה»; reload the page: they stay unticked.
  - [ ] [human] Staff side (replays I2): sign in as a staff member of the same business and open `/menu-library` with the filter «הכל»: no event in «פנייה» or «הצעת מחיר נשלחה» appears (except one you created yourself); events in other stages appear as before.
  - [ ] [human] Staff link to a hidden event: as staff, open `/menu-intelligence/<id of an event in «פנייה» the owner created>`: the message «האירוע הזה לא זמין לך» appears and you are back on the menu library.
  - [ ] [human] Owner moves an event: as owner, move a hidden «פנייה» event to «הזמנות»; as staff, reload `/menu-library`: the event now appears.

## Execution Mode
- Parallel: no — writes `server/routes/generic.js` (plan 475), `server/routes/business.js` and `src/app/core/services/business.service.ts` (plan 469), the metadata page (plan 468) and `menu-intelligence.page.ts` (plan 459).
- Concurrent plans: start after 468 and 469 merge; run before or after 475 (both write `generic.js`), not at the same time; rebase on 459 if it merged first.
- Isolated DB: no

## Execution Notes
- INV-1 change approved by the Human in chat on 2026-10-21 (`approve arch change INV-1`). Former gate, kept for the record: Nothing below runs until the Human writes `approve arch change INV-1` in chat. Then the Planner (not a Worker) replaces the `Arch-approved:` placeholder in `## Architecture Impact` with `Arch-approved: Human YYYY-MM-DD`, and sub-tasks D1–D2 write the ADR and the invariant text first. If the Human declines, this plan is parked.
- Base branch `origin/mvp`; merge back into `mvp` only, never `main`.
- MVP run mode: executed per `docs/mvp/run-mode.md` — `[human]` items become validation cards in `docs/mvp/runs/477.md`, `[auto]` items are marked `[x]` only with evidence in that file. Run mode forbids weakening an invariant; this is a change of INV-1 approved by the Human, carried by its own ADR.
- Depends on: plans 468 and 469 merged into `mvp`; the Human's `approve arch change INV-1`.
- Written by the Planner from handoff I2 with decision D11 (2026-10-21).
- `server/generated/` is git-ignored and rebuilt by `npm --prefix server test` (`pretest`), so schema changes are made only in `shared/schemas`.
- Contract extension: append the new business field `staffVisibleStages` and the route `PUT /api/v1/business/staff-visible-stages` under `## Contract extensions (run)` in `docs/mvp/mvp-map.md`, with this plan's number.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
docs/brain/decisions/0024-staff-see-events-only-in-the-stages-the-owner-chose.md
docs/brain/decisions/0026-staff-see-events-only-in-the-stages-the-owner-chose.md
docs/brain/invariants.md
shared/schemas/entities/business.schema.ts
server/utils/event-visibility.js
server/routes/generic.js
server/routes/events.js
server/routes/stats.js
server/routes/business.js
server/services/business.js
server/test/staff-event-visibility.test.js
server/test/event-visibility.test.js
server/test/invariants.test.js
src/app/core/services/business.service.ts
src/app/core/services/business.service.spec.ts
src/app/pages/metadata-manager/components/staff-stages-manager/**
src/app/pages/metadata-manager/metadata-manager.page.component.ts
src/app/pages/metadata-manager/metadata-manager.page.component.html
src/app/pages/metadata-manager/metadata-manager.page.component.spec.ts
src/app/pages/menu-intelligence/menu-intelligence.page.ts
docs/mvp/mvp-map.md
docs/mvp/runs/477.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-1: changes — ADR docs/brain/decisions/0024-staff-see-events-only-in-the-stages-the-owner-chose.md — staff read events only in the stages the owner allowed, plus events they created; every other read rule and every write rule stays. Arch-approved: Human 2026-10-21
- INV-2: preserves — still one business copy shared by owner and staff; the new filter only narrows a staff member's reads inside his own business; `server/services/business.js` gains one setter on the business document; master sync untouched.
- INV-3: preserves — scope reaches `src/app/pages/metadata-manager/**` and `server/routes/generic.js`, but no rename or cascade changes; the new card saves one field with one request.
- INV-4: preserves — the new field and the route body are Zod schemas in `shared/schemas/entities/business.schema.ts`, validated by the server.

## Backend Impact
- Collections affected: businesses (new optional field `staffVisibleStages`), menuEvents (read filter for staff only; no data change).
- New collections: no
- Server changes needed: yes — `server/utils/event-visibility.js` (new), a staff filter on every menuEvents read path in `generic.js`, `events.js`, `stats.js`; owner-only `PUT /api/v1/business/staff-visible-stages`. A dedicated route (not `/api/v1/data`) because the business document is not a generic entity (`business.schema.ts:31`).

## Step 0 — Reality Check
Runs only when `scope-check.mjs --drift` reports drift. On `origin/mvp` find: `EVENT_STAGES` in `event-stage.ts`;
`businessSchema` in `business.schema.ts`; `router.put('/settings'` in `business.js`; `setBusinessSettings` in
`server/services/business.js`; in `generic.js` the menuEvents-reachable filters at the GET list, `/count`, `/trash`,
`/:id`, PUT `/:id`, restore, DELETE `/:id`, bulk delete; `scopeOf` / `loadEvent` in `events.js`; `eventsPipeline(scope`
call in `stats.js`; `loadEvent` in `menu-intelligence.page.ts`; `_allJumpSections` in the metadata page. Print `ok` or
`conflict: <what>` per symbol.

## User Stories
- As a chef who owns the business, I want to choose which event stages my cooks see so that early inquiries and quotes stay between me and the client.
- As a cook, I want to see the events I need to work on, and the ones I logged myself, so that hidden stages never cost me my own work.
- As a chef who owns the business, I want the rule enforced by the server so that a cook cannot reach a hidden event by a link or another screen.

## Functional Requirements

### Must Have (P0)
- [x] Business field `staffVisibleStages: EventStage[]` (optional; absent = all stages). Owner-only route to set it; staff get 403.
- [x] For staff, every server route that returns or acts on events returns only events whose stage (missing stage = `inquiry`) is in the list, or that the staff member created (`createdBy`); others are "not found" (404 by id, absent in lists, not counted).
- [x] Owners and platform-admin routes are unchanged; staff writes keep C-PERM unchanged.
- [x] Owner card in the metadata manager with eight toggle chips; each change saves at once; owner-only.
- [x] The menu editor opened on a hidden event shows `event_not_available` and returns to the menu library instead of an empty form.

### Nice to Have (P1)
- [ ] None.

## UI/UX Notes
- Card: `section.manager-card.c-glass-panel` with icon `eye` (registered, `app.config.ts:39`), title `metadata_staff_stages_title`, description `metadata_staff_stages_desc`, then a `.c-toggle-chip-group` of eight `label.c-toggle-chip > input[type=checkbox] + span` in `EVENT_STAGES` order, labels `event_stage_<stage>`. No new `.c-*` class.
- Placement: after the coefficients card; jump-bar entry `{ id: 'mm-sec-staff-stages', labelKey: 'metadata_staff_stages_title' }`, shown only to the owner (filtered like the platform-admin sections).
- Saving: a chip change sends the whole new list; while saving, chips are disabled; on failure the chip flips back and the toast shows `staff_stages_save_error`.
- New dictionary keys: `metadata_staff_stages_title` = «שלבי אירוע שהצוות רואה»; `metadata_staff_stages_desc` = «אנשי הצוות רואים רק אירועים בשלבים המסומנים, וגם אירועים שהם יצרו בעצמם.»; `staff_stages_save_error` = «שמירת השלבים נכשלה»; `event_not_available` = «האירוע הזה לא זמין לך».

## Atomic Sub-tasks
- [x] D1: Record the decision that staff see events only in the stages the owner chose — after the Human's approval only; new ADR from `_TEMPLATE.md`, `supersedes: 0023-business-is-the-tenant (member read rule for events only)`, context = handoff I2 / D11, decision = the P0 rule above incl. the creator exception and the default — `docs/brain/decisions/0024-staff-see-events-only-in-the-stages-the-owner-chose.md`
- [x] D2: Update the ownership invariant to the new read rule — after the Human's approval only; INV-1 `Rule:` becomes "… Members read all of their business's items, except that staff read events only in the stages the owner allowed (`staffVisibleStages`, default all) plus events they created …"; `Source:` adds ADR 0024; `Touches:` adds `server/utils/event-visibility.js`, `server/routes/events.js`, `server/routes/stats.js`; keep the five-field shape — `docs/brain/invariants.md`
- [x] S1: Store which stages staff may see on the business — `staffVisibleStages: z.array(z.enum(EVENT_STAGES)).max(EVENT_STAGES.length).optional()` on `businessSchema`; export `staffVisibleStagesInputSchema = z.strictObject({ stages: z.array(z.enum(EVENT_STAGES)).max(EVENT_STAGES.length) })` (import from `./event-stage`) — `shared/schemas/entities/business.schema.ts`
- [x] S2: Let only the owner save that list — `setStaffVisibleStages(id, stages)` in the business service (`$set`, de-duplicated, kept in `EVENT_STAGES` order); `PUT /api/v1/business/staff-visible-stages` with `assertCan(req, res, 'editSettings', { type: 'businesses' })`, `staffVisibleStagesInputSchema` (400 on bad input), 404 when no business, reply `{ staffVisibleStages }`, log `business.staff_stages.saved` — `server/services/business.js`, `server/routes/business.js`
- [x] S3: Build the one rule that decides which events a staff member may see — new `server/utils/event-visibility.js`: `async visibleStagesFor(req)` (null for no user / non-staff / no business / no stored list, else the list via `getBusiness`); `eventFilter(stages, userId)` → `{}` for null, else `{ $or: [{ stage: { $in: stages } }, …(stages includes 'inquiry' ? [{ stage: { $exists: false } }] : []), { createdBy: userId }] }`; `isEventVisible(stages, userId, event)` (same rule in memory); `async withEventVisibility(req, type, filter)` → `filter` unchanged unless `type === 'menuEvents'` and stages non-null, else `{ $and: [filter, eventFilter(…)] }`; unit tests that the filter (run on in-memory Mongo) and `isEventVisible` agree on eight fixtures — `server/utils/event-visibility.js`, `server/test/event-visibility.test.js`
- [x] S4: Apply the rule on every generic route that reads or acts on one or many events — wrap the menuEvents filters with `withEventVisibility` at: GET list (`filter`), `/count`, `/trash` list, GET `/:id`, PUT `/:id` (`filter`, before the stored-doc lookup), PUT `/:id/restore` (both queries), DELETE `/:id` (the `existing` lookup), DELETE `/bulk` (both the authorization `find` and the `deleteMany`, so a hidden id is neither checked nor deleted) — `server/routes/generic.js`
- [x] S5: Apply the rule to every event action and to the dashboard numbers — in `loadEvent`, after the find, send the same 404 when `!isEventVisible(await visibleStagesFor(req), req.user.userId, event)`; in `stats.js` pass `await withEventVisibility(req, 'menuEvents', scopeFilter(req))` as the events `scope` (usage pipeline unchanged) — `server/routes/events.js`, `server/routes/stats.js`
- [x] S6: Prove the rule end to end by server tests — new file with business `b1` (`staffVisibleStages: ['ordering','execution']`) and events: owner `inquiry`, owner `ordering`, owner legacy without `stage`, staff-created `inquiry`, owner `quote_sent` in Trash; cases listed in Done-when (list, `/:id`, `/count`, `/trash`, notes 404, stats funnel, legacy, no stored list = all, settings route 403 / 200 / 400); add one `INV-1 staff read events only in the stages the owner allowed` case to the invariants suite — `server/test/staff-event-visibility.test.js`, `server/test/invariants.test.js`
- [x] C1: Let the app save the owner's stage choice — `BusinessService.updateStaffVisibleStages(stages: EventStage[]): Promise<void>` (PUT `staff-visible-stages` with `{ stages }`, merge the reply's `staffVisibleStages` into `business_`, throw on refusal); spec — `src/app/core/services/business.service.ts`, `src/app/core/services/business.service.spec.ts`
- [x] C2: Build the owner's card with one chip per stage — new standalone OnPush `app-staff-stages-manager` (`inject()`, signals; `checked_` = `computed` from `business_().staffVisibleStages ?? EVENT_STAGES`; `saving_` signal; toggle → new list in `EVENT_STAGES` order → `updateStaffVisibleStages`; on error `logging.error` + toast `staff_stages_save_error`, chip restored); `@layer components.staff-stages-manager` scss with logical properties only; spec per C-Done-when — `src/app/pages/metadata-manager/components/staff-stages-manager/staff-stages-manager.component.ts`, `src/app/pages/metadata-manager/components/staff-stages-manager/staff-stages-manager.component.html`, `src/app/pages/metadata-manager/components/staff-stages-manager/staff-stages-manager.component.scss`, `src/app/pages/metadata-manager/components/staff-stages-manager/staff-stages-manager.component.spec.ts`
- [x] C3: Show the card and its jump chip to the owner only — add `<app-staff-stages-manager id="mm-sec-staff-stages" />` after the coefficients card inside `@if (canEditSettings_())` (a `computed` over `PermissionService.can('editSettings')`); add the jump entry and filter it out for non-owners next to the platform-admin filter; page spec: present for owner, absent for staff — `src/app/pages/metadata-manager/metadata-manager.page.component.ts`, `src/app/pages/metadata-manager/metadata-manager.page.component.html`, `src/app/pages/metadata-manager/metadata-manager.page.component.spec.ts`
- [x] C4: Send a cook who opens a hidden event's link back to the list with a clear message — in `loadEvent`, catch an `HttpErrorResponse` with status 404 from `getMenuEventById`: toast `event_not_available`, `router.navigate(['/menu-library'])`; other errors keep today's path — `src/app/pages/menu-intelligence/menu-intelligence.page.ts`
- [x] V1: Build, run server and client tests, append the contract extension, replay the four [human] scenarios with an owner and a staff account, write the run file with evidence and the validation cards — `docs/mvp/mvp-map.md`, `docs/mvp/runs/477.md`

## Technical Considerations
- Dependencies: `EVENT_STAGES` (plan 442), `assertCan` / `editSettings` (plans 427, 429), `getBusiness` (plan 424), `.c-toggle-chip` engine, `PermissionService`. Reuse first: no new picker or modal; the card copies the coefficients card shell.
- Cost: one extra `businesses.findOne` per staff request that touches events (owners skip it). Acceptable at MVP scale; no cache (a cache would delay an owner's change).
- One rule, two forms: the Mongo filter (lists, counts, by-id lookups) and the in-memory check (`loadEvent`) live side by side in one file, with a test that they agree.
- Staff dashboard: the funnel and upcoming list count only visible events, so a cook's funnel may show 0 inquiries. Intended.
- A staff member with an event open in the editor when the owner hides its stage gets 404 on his next save; C4's message covers the reload path only. The in-flight save shows today's save error.
- Staff writes are unchanged (C-PERM): staff edit / delete only events they created, which are always visible to them under the creator exception; the by-id write filters only make hidden ids "not found" instead of "forbidden".
- Security surface: narrows staff reads; `staffVisibleStages` itself is readable by every member via `GET /api/v1/business` (it names stages, not events).
- Data / migration: none; absent field = all stages = today's behaviour.
- New code: signals, `inject()`, `input()`/`output()` if any, no `any`, single quotes / no semicolons in `.ts`, double quotes in `.html`, logical CSS, Hebrew only via dictionary keys.
- Project checks: log-query [auto]; chef-side stories; Signal flow: `BusinessService.business_` → `computed` `checked_` → chip `[checked]`; new dictionary keys listed in UI/UX Notes.

## Out of Scope
- Any export, print or preview of a recipe or a menu — plan 471, not this run.
- Per-staff-member stage lists, or hiding other item types (recipes in Cook View only is plan 476).
- Hiding money fields of visible events from staff (C-PERM already blocks writing them).
- Live push of the owner's change to a staff member's open screen (seen on next load).
- Presets such as "active only" / "closed only" — the eight chips cover them.

## Critical Questions
- Answered 2026-10-21 (Human): Q1 approved (`approve arch change INV-1`); Q2 and Q3 take the recommended answers (default all stages; staff always see events they created).
1. INV-1 · current rule: "every item belongs to exactly one business. Members read all of their business's items and nothing from another business …" · proposed change: staff read events (menuEvents) only in the stages the owner ticked (default: all stages), plus events they created themselves; owners, every other item type and every write rule stay as they are · who loses what: a cook loses sight of events in unticked stages (for example inquiries and quotes) and of their numbers on his dashboard; if the owner unticks a stage a cook is working in, the cook cannot open that event until the owner ticks it again or moves the event; the owner loses nothing. Approve with `approve arch change INV-1`.
2. Default for businesses that never set the list: the handoff says cooks don't see inquiries today, but the code shows they see every stage (no filter exists on `mvp`). Recommended: default = all stages (no change until the owner unticks something). Alternative: default = every stage except «פנייה».
3. Should a staff member always see an event he created himself, even in a hidden stage? Recommended: yes — otherwise a cook who logs a new inquiry («פנייה») sees it vanish the moment he saves it. Alternative: no exception (the owner's list is absolute).
