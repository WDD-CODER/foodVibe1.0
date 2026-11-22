# Plan 663 — The table engine: slots, turn, candidates, assign and alternatives — pure, shared, tested

Status: draft
Depends-on: 662
Snapshot: 28359b6d54b0c77e288c52702a850daef92ccf07

## Problem Statement
A restaurant on FoodVibe has no code that knows whether a party fits at a time. A person approves every table request by
looking at a list, and two parties can be approved for the same table at the same hour. The Restaurant program
(`docs/restaurant/restaurant-map.md`, plans 662–683) puts one piece of code in charge of that question: the table
engine. This plan builds it as pure functions — no database, no clock of its own — so that the server (plans 668, 669,
680) and the browser (plans 670, 671, 672) run the same implementation and always get the same answer for the same
question. Nothing calls the engine yet: this plan ships the functions, their fixtures and their tests.

Verified on `origin/main` (28359b6d, 2026-11-22):
- `shared/schemas/front-desk/` holds two files: `local-time.ts` (38 lines; `jerusalemEpoch(date, time)` line 24,
  `weekdayOf(date)` line 35, a private `wallAsUtc(epoch)` line 15 — there is no exported function that turns an epoch
  back into a Jerusalem date and time) and `qualify.ts` (153 lines; `hoursCheck` line 61, `qualify` line 78, the private
  `checkable` line 52 and `within` line 56). `hoursCheck` answers yes / no for one time and does not expose the day's
  opening ranges; with no checkable row it answers `{ ok: true, unchecked: true }`. `within` treats a `close` at or
  before `open` as running past midnight.
- `shared/schemas/entities/common.schema.ts:4` — `operatingHoursRowSchema`: `days`, `time`, optional `dayIndexes`
  (0 = Sunday), `open`, `close` (`HH:mm`). A row without the three optional fields is free text and cannot be checked.
- `shared/schemas/entities/front-desk-profile.schema.ts`: `hours` (line 62), `closedDates` (line 63, ≤ 100),
  `requestKinds` (line 64) with `rules.minPartySize`, `maxPartySize`, `minLeadHours`, `maxLeadDays` (lines 36–39) and
  `defaultDurationMinutes` (line 43). `qualify.ts:139–148` is how the lead rules are read today
  (`jerusalemEpoch(date, time) − now` against `minLeadHours × 3 600 000` and `maxLeadDays × 86 400 000`).
- `shared/schemas/tsconfig.cjs.json` includes every `.ts` under `shared/schemas` (not `*.spec.ts`) and compiles it to
  `server/generated/schemas/**`, which is git-ignored (`.gitignore:148`); `pnpm run test:server` runs
  `pnpm run build:schemas` first (`package.json:16`). The browser imports the same sources through `@schemas/*`
  (`tsconfig.json:20`).
- `server/test/qualify.test.js` (238 lines) requires `../generated/schemas/front-desk/qualify` and `local-time` and
  holds the precedent fixtures (`ALL_WEEK`, `SUN_TO_TUE`, `FREE_TEXT`, lines 16–18).
- `shared/schemas/testing/phone-vectors.ts` is the precedent of test data that a server test and a browser spec both
  read (`src/app/core/utils/client-display.util.spec.ts` imports it through `@schemas/testing/phone-vectors`).
- `docs/brain/component-families.md` has the logic family `### helpers — pure functions` (line 311) and no family for
  table availability.
- New in plan 662 (treated as existing here, never edited): `shared/schemas/entities/floor-plan.schema.ts` (the
  `FloorPlan` type of C-FLOOR) and `shared/schemas/front-desk/table-service.ts` (`TABLE_SERVICE_DEFAULTS`,
  `tableServiceOf(profile)`).
- None of these names exists in `shared/`, `server/` or `src/app/`: `table-engine`, `slotsFor`, `turnFor`,
  `dayAvailability`, `openRangesOf`, `jerusalemDateTime`.

## Goals & Success Criteria
**Primary:** `shared/schemas/front-desk/table-engine.ts` exports the six functions of C-ENGINE, the server tests and
one browser spec run them on the same fixtures, and the same question always gets the same answer.

- [auto] `pnpm run test:server` → exit 0, including the new `server/test/table-engine.test.js` and the unchanged cases
  of `server/test/qualify.test.js`.
- [auto] `server/test/table-engine.test.js` "slots": on the fixture room and an all-week 12:00–23:00 profile with the
  default settings, `slotsFor` of a Tuesday returns `12:00` first, `22:00` last (last seating 60 minutes before
  closing) and 41 slots in steps of 15; with `slotMinutes: 30` it returns 21; a date in `closedDates` returns `[]`;
  a profile whose only hours row is free text returns `[]`; a Friday with the short row 12:00–15:00 returns `12:00` …
  `14:00`; with `now` two hours before 19:00 of the same day and `minLeadHours: 2` the first slot is `19:00`.
- [auto] `server/test/table-engine.test.js` "overnight": with a row 18:00–02:00 on Thursday, `slotsFor` of Thursday
  ends at `23:45` and `slotsFor` of Friday starts with `00:00` … `01:00` (the tail of Thursday's service) even when
  Friday has no row of its own; when Thursday is in `closedDates` the Friday tail is gone.
- [auto] `server/test/table-engine.test.js` "daylight saving": on 2026-03-27 and 2026-10-25 (the two change days in
  Jerusalem) every slot `s` satisfies `jerusalemDateTime(jerusalemEpoch(date, s)).time === s`, no slot repeats, and
  `assign` at 20:00 returns `endAt − startAt === turn × 60000`.
- [auto] `server/test/table-engine.test.js` "turn": with the ladder `[{ maxParty: 2, minutes: 90 }, { maxParty: 6,
  minutes: 120 }, { maxParty: 30, minutes: 150 }]`, `turnFor` returns 90, 90, 120, 150, 150 for parties of 1, 2, 5, 9
  and 13; with no stored settings it returns the profile's `requestKinds.table.defaultDurationMinutes` (120).
- [auto] `server/test/table-engine.test.js` "candidates": on the 14-table fixture, a party of 2 gets a two-seat table
  before a four-seat one; a party of 9 gets only the declared join that seats 9; a party of 13 gets `[]`; with
  `onlineOnly: true` no table or join with `online: false` is returned; a table with `active: false` is never
  returned; with `areaKey: 'outside'` and two tables of equal waste the outside one comes first; two equal tables in
  one area come in the order of their `number` (`2` before `10`).
- [auto] `server/test/table-engine.test.js` "assign": each `reason` of C-ENGINE is produced by one case — `no_plan`
  (plan `null`), `closed` (a closed date, and 03:00), `too_late` (22:30 when the last seating is 22:00), `too_soon`,
  `too_far`, `too_big` (a party of 13, and a party above `rules.maxPartySize`), `too_small` (a party of 1 in a room
  whose smallest `minSeats` is 2), `full` (every candidate held at 20:00); a free 20:00 returns `ok: true` with the
  first candidate's `tableKeys`, `startAt === jerusalemEpoch(date, '20:00')` and `endAt === startAt + turn`.
- [auto] `server/test/table-engine.test.js` "buffer": with a hold on table `t1` that ends at 20:00, `assign` at 20:00
  for the party that only fits `t1` is `ok` with `bufferMinutes: 0`; a hold that starts at 22:00 makes a 20:00
  booking with a 120-minute turn `ok` with buffer 0 and `full` with buffer 15; a hold on one table of a join makes
  the join busy.
- [auto] `server/test/table-engine.test.js` "alternatives": with 20:00 full and 19:30, 20:30 and 21:15 free,
  `alternatives` returns those three in the order 19:30, 20:30, 21:15; with the whole evening full it returns the
  same time on the next two open days (a closed date between them is skipped); it never returns more than 3 and
  never a time `assign` would refuse.
- [auto] `server/test/table-engine.test.js` "day": `dayAvailability` returns one row per slot of `slotsFor` in the
  same order, and `available` equals `assign(...).ok` for every row.
- [auto] `server/test/table-engine.test.js` "same answer": the same `Ask`, plan, profile and holds give deep-equal
  results 100 times in a row, also after the `tables` and `joins` arrays of the plan are reversed.
- [auto] `server/test/table-engine.test.js` "pure": the text of `shared/schemas/front-desk/table-engine.ts` contains
  none of `Date.now`, `new Date()`, `require(`, `mongoose`, `fetch(`, and its only imports are `./local-time`,
  `./qualify`, `./table-service` and `import type` lines.
- [auto] `server/test/qualify.test.js`: every existing case passes unchanged, and the new cases pass —
  `openRangesOf(ALL_WEEK, '2026-06-02')` is `[{ open: '12:00', close: '23:00', overnight: false }]`,
  `openRangesOf(FREE_TEXT, '2026-06-02')` is `[]`, a row 18:00–02:00 returns `overnight: true`, and a day with two
  rows returns both ordered by `open`.
- [auto] `pnpm run test:ci` → exit 0, including the new `src/app/core/utils/table-engine.spec.ts`, which imports the
  engine through `@schemas/front-desk/table-engine` and the fixtures through `@schemas/testing/table-engine-fixtures`
  and asserts the same `tableKeys` for the party of 2, 5 and 9 as the server test.
- [auto] `pnpm run build` → exit 0. `pnpm run lint` → exit 0.
- [auto] `node scripts/reuse-lint.mjs --check-registry` → exit 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.

## Execution Mode
- Parallel: no — first plan of run `rs-engine` (663, then 664). It shares no file with 664. It must not run beside
  662, which creates the two files this plan imports.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
shared/schemas/front-desk/table-engine.ts
shared/schemas/front-desk/qualify.ts
shared/schemas/front-desk/local-time.ts
shared/schemas/testing/table-engine-fixtures.ts
server/test/table-engine.test.js
server/test/qualify.test.js
src/app/core/utils/table-engine.spec.ts
src/app/core/breadcrumbs.md
docs/brain/component-families.md
docs/brain/inventory.md
docs/restaurant/restaurant-map.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-4: preserves — the engine is pure TypeScript inside `shared/schemas`; it defines no stored shape and reads the
  floor plan and the profile only through the types plan 662 wrote. No schema file is edited.
- INV-7: preserves — this plan builds the one implementation the rule names
  (`shared/schemas/front-desk/table-engine.ts`); no route confirms or offers a table here.

## Reuse Check

- `table-engine.ts` (`slotsFor`, `turnFor`, `candidates`, `assign`, `alternatives`, `dayAvailability`) — family: none — rung: 4 — why: nothing in the registry answers "is there a table"; a new logic family `table-engine` is added to `docs/brain/component-families.md` so every later plan reuses it instead of re-deriving availability
- `openRangesOf` in `qualify.ts` — family: helpers — rung: 3 — why: the opening-hours rule gains the list form the engine needs; `hoursCheck` is rewritten on top of it so the hours are read in one place
- `jerusalemDateTime` in `local-time.ts` — family: helpers — rung: 3 — why: the inverse of `jerusalemEpoch`, built on the existing private `wallAsUtc`
- `table-engine-fixtures.ts` — family: helpers — rung: 2 — why: same pattern as `shared/schemas/testing/phone-vectors.ts` (one data file read by the server test and the browser spec)

## Defaults

- empty-state-on-list — exception — why: pure functions and tests only; the plan builds no list and no screen
- app-list-container — exception — why: pure functions and tests only; the plan builds no list and no screen
- loading-and-error-states — exception — why: pure functions and tests only; the plan builds no screen
- one-breakpoint-set — exception — why: the plan writes no SCSS

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a restaurant owner, I want one rule to decide whether a party fits at a time and on which table, so that two
  parties are never promised the same table and my hosts and my booking page always say the same thing.
- As a host, I want a full hour to come with the nearest free times, so that I can offer the guest something else
  on the phone at once.
- As a guest, I want to see only times the restaurant can really seat me, so that a time I pick is not refused later.

## Functional Requirements

### Contract C-ENGINE (frozen 2026-11-22, copied verbatim from `docs/restaurant/restaurant-map.md`)

**C-ENGINE (R1; used by R6, R7, R8, R9, R10, R18)** — `shared/schemas/front-desk/table-engine.ts`, pure, built by
`build:schemas` for the server and imported by the browser through `@schemas`. No `Date.now()`, no database:
- Types: `Hold = { tableKey, startAt, endAt }` (epoch ms, `endAt` already includes the buffer),
  `Ask = { date, time, partySize, areaKey?, onlineOnly: boolean, now: number }`.
- `slotsFor(profile, date, now) → string[]` ('HH:mm'), `turnFor(service, partySize) → minutes`,
  `candidates(plan, partySize, areaKey?, onlineOnly) → Array<{ tableKeys, seats }>`,
  `assign(plan, profile, holds, ask) → { ok: true, tableKeys, startAt, endAt } | { ok: false, reason }` with
  `reason ∈ closed | too_late | too_soon | too_far | too_big | too_small | full | no_plan`,
  `alternatives(plan, profile, holdsByDate, ask) → Array<{ date, time }>` (≤ 3),
  `dayAvailability(plan, profile, holds, { date, partySize, areaKey?, onlineOnly, now }) → Array<{ time, available }>`.
- Order of candidates: fewest wasted seats (`seats.max − partySize`), then the asked area, then single tables before
  joins, then the table `number` — so the same question always gets the same answer.
- A table is busy when any of its holds overlaps `[startAt, endAt + bufferMinutes)`. A join is busy when any of its
  tables is.
- Hours come from `profile.hours` and `closedDates` through `openRangesOf(hours, date)`, a pure function R1 adds
  beside `hoursCheck` in `shared/schemas/front-desk/qualify.ts` (`hoursCheck` then uses it; delta 5); time through
  `jerusalemEpoch`. A slot whose turn would end after closing is still offered until
  `lastSeatingBeforeCloseMinutes`. A profile with no usable hours row has no slots (`assign` → `closed`).
- The settings come from `tableServiceOf(profile)` (C-TSERVICE), never from `profile.tableService` directly.

### Must Have (P0)

Helpers
- [ ] `openRangesOf(hours: OperatingHoursRow[], date: string): Array<{ open: string; close: string; overnight: boolean }>`
  in `qualify.ts`: the checkable rows (the existing `checkable`) whose `dayIndexes` include `weekdayOf(date)`, ordered
  by `open` then `close`; `overnight` is `close <= open`. It does not read `closedDates`. `hoursCheck` is rewritten to
  call it and keeps its exact answers (every existing `qualify.test.js` case stays green untouched).
- [ ] `jerusalemDateTime(epoch: number): { date: string; time: string }` in `local-time.ts`, built on `wallAsUtc`:
  the Jerusalem wall date (`YYYY-MM-DD`) and time (`HH:mm`) of an epoch. `jerusalemEpoch` and `weekdayOf` are unchanged.

The service windows of a date (internal to the engine, exported for tests as `windowsOf(profile, date)`)
- [ ] A window is `{ startAt, endAt }` in epoch ms. For a date `D`: (1) when `D` is not in `closedDates`, every range of
  `openRangesOf(hours, D)` gives a window from `jerusalemEpoch(D, open)` to `jerusalemEpoch(D, close)`, or to
  `jerusalemEpoch(D + 1 day, close)` when the range is overnight; (2) when the day before `D` is not in `closedDates`,
  every overnight range of that day gives its window too. The neighbouring dates are computed from the date string in
  UTC (no clock). `closedDates` closes the service day that starts on that date, including its tail after midnight.
- [ ] A slot belongs to the calendar date its start falls on: `slotsFor(profile, D, now)` keeps the slots whose start is
  at or after `jerusalemEpoch(D, '00:00')` and before `jerusalemEpoch(D + 1 day, '00:00')`. So `date` + `time` of a
  booking is always the real wall time of its start, and a service that runs past midnight shows its last slots under
  the next date.

`slotsFor(profile, date, now)`
- [ ] For every window: starts at the window's `startAt` and then every `slotMinutes` (epoch arithmetic, never string
  arithmetic), while `start <= window.endAt − lastSeatingBeforeCloseMinutes × 60000`.
- [ ] Removes a start whose lead is under `rules.minLeadHours` or over `rules.maxLeadDays` of
  `profile.requestKinds.table` (the same arithmetic as `qualify.ts:139–148`; a missing rule removes nothing), and a
  start before `now`.
- [ ] Returns the `time` of `jerusalemDateTime(start)` for each, ascending by start, without repeats (on the autumn
  change day a wall time that occurs twice is listed once).
- [ ] `slotMinutes`, `lastSeatingBeforeCloseMinutes` and every other setting are read from `tableServiceOf(profile)`.

`turnFor(service, partySize)`
- [ ] `service` is the value `tableServiceOf` returns. The first ladder step whose `maxParty >= partySize` gives the
  minutes; a party above every step gets the last step's minutes.

`candidates(plan, partySize, areaKey?, onlineOnly)`
- [ ] Single tables: `active`, `minSeats <= partySize <= maxSeats`, and `online` when `onlineOnly`. Joins: every table
  of the join exists and is `active`, the join's `minSeats <= partySize <= maxSeats`, and the join's `online` when
  `onlineOnly`. The engine never builds a join that the plan does not declare.
- [ ] Each candidate is `{ tableKeys: string[], seats: { min: number, max: number } }`; a join's `tableKeys` are in the
  order of their tables' `number`.
- [ ] Order: `seats.max − partySize` ascending; then a candidate in the asked area before the others (an `areaKey`
  that names no area changes nothing: the area is a preference, never a filter); then single tables before joins;
  then by the `number` of the first table, compared as numbers when both are whole numbers and as plain strings
  otherwise; then by `tableKeys[0]`. A `null` plan returns `[]`.

`assign(plan, profile, holds, ask)` — the first rule that fails gives the reason
- [ ] `no_plan`: the plan is `null` or has no active table.
- [ ] `closed`: `ask.date` + `ask.time` is inside no window of that date, or is not one of the window's slot starts.
- [ ] `too_late`: it is a slot start of a window but after the last seating.
- [ ] `too_soon` / `too_far`: the lead rules, or a start before `ask.now`.
- [ ] `too_big`: `partySize` is above `rules.maxPartySize`, or above the `seats.max` of every table and join the caller
  may use. `too_small`: under `rules.minPartySize`, or under the `seats.min` of every one of them.
- [ ] `full`: there are candidates and every one is busy. Otherwise `{ ok: true, tableKeys, startAt, endAt }` of the
  first free candidate, with `startAt = jerusalemEpoch(date, time)` and `endAt = startAt + turnFor(...) × 60000`
  (without the buffer).
- [ ] Busy: a candidate is busy when a hold of any of its tables satisfies
  `hold.startAt < endAt + bufferMinutes × 60000 && hold.endAt > startAt`.

`alternatives(plan, profile, holdsByDate, ask)`
- [ ] `holdsByDate` is `Record<string, Hold[]>` keyed by date; a missing date means no holds. Overlap is by epoch, so a
  caller may pass the same list under several dates.
- [ ] First the free slot starts of `ask.date` within 90 minutes before or after the asked time, nearest first, the
  earlier one first when two are equally near; then, while fewer than three were found, the asked time on the next
  dates that have a window for it, looking at most 14 dates ahead and taking at most two of them. Every entry is one
  `assign` would accept for the same party, area and `onlineOnly`. Never more than three; the asked time itself is
  never returned.

`dayAvailability(plan, profile, holds, { date, partySize, areaKey?, onlineOnly, now })`
- [ ] One `{ time, available }` per slot of `slotsFor(profile, date, now)`, in that order; `available` is
  `assign(...).ok`.

Fixtures and tests
- [ ] `shared/schemas/testing/table-engine-fixtures.ts`: `ROOM` — a `FloorPlan` with three areas (`inside`,
  `outside`, `bar`), 14 tables (numbers `1`–`14`; seats from a two-seat bar stool to an eight-seat table; one table
  with `active: false`; two with `online: false`; no single table seats 9) and two joins (one of two inside tables
  that seats 7–10 and is online, one of two outside tables that seats 6–8 and is not online); `profileWith(overrides)`
  — a valid `FrontDeskProfile` open all week 12:00–23:00 with the restaurant template's `table` kind; `FRIDAY_SHORT`,
  `THURSDAY_OVERNIGHT` and `FREE_TEXT_HOURS` hours rows; `LADDER`. Table and area keys match `^[a-z0-9]{6,12}$`.
- [ ] `server/test/table-engine.test.js` with the blocks named in Goals; it first parses `ROOM` with
  `floorPlanSchema` and the profile with `frontDeskProfileSchema`, so a fixture that drifts from the schemas fails.
- [ ] `src/app/core/utils/table-engine.spec.ts`: the browser-side proof that the import through `@schemas` works.

Registry
- [ ] `docs/brain/component-families.md`: a new logic family `### table-engine — is there a table, which one, and what
  else` (Status, Use with the six functions and `openRangesOf` / `jerusalemDateTime`, When: "any code that offers,
  confirms or moves a table — never a second calculation", Known copies: none). `docs/brain/inventory.md` gains its
  line. `src/app/core/breadcrumbs.md` names the new spec under `utils/`.
- [ ] `docs/restaurant/restaurant-map.md` "Contract extensions (run)": one line for `windowsOf`, `jerusalemDateTime`
  and the rule "a slot belongs to the calendar date its start falls on".

### Should Have (P1)
- [ ] Every exported function has a one-line doc comment that says what it answers and that it is pure.

### Nice to Have (P2)
- none

## UI/UX Notes
- No UI is built and no key is added to `public/assets/data/dictionary.json`. The `reason` values are English keys;
  the plans that show them (670, 671, 672, 680) add their Hebrew texts.

## Atomic Sub-tasks

- [ ] A1: Give the hours rule a list form and the clock an inverse, so the engine can walk a day — openRangesOf beside hoursCheck (hoursCheck now calls it, answers unchanged) and jerusalemDateTime on wallAsUtc; new cases in the hours test — shared/schemas/front-desk/qualify.ts, shared/schemas/front-desk/local-time.ts, server/test/qualify.test.js
- [ ] A2: Write the shared room and profile fixtures both test sides read — ROOM (14 tables, three areas, two joins), profileWith, the hours rows and the ladder, parsed by the real schemas in the test — shared/schemas/testing/table-engine-fixtures.ts
- [ ] A3: Build the day's bookable start times and the turn length — windowsOf, slotsFor (lead rules, last seating, overnight tail, daylight-saving days), turnFor; tests "slots", "overnight", "daylight saving", "turn" — shared/schemas/front-desk/table-engine.ts, server/test/table-engine.test.js
- [ ] A4: Decide which tables fit a party and whether one is free at a time — candidates with the fixed order, assign with its eight reasons and the buffer rule; tests "candidates", "assign", "buffer", "same answer" — shared/schemas/front-desk/table-engine.ts, server/test/table-engine.test.js
- [ ] A5: Offer other times when the asked one is taken, and the whole day at a glance — alternatives (±90 minutes, then the next two open days) and dayAvailability; tests "alternatives", "day", "pure" — shared/schemas/front-desk/table-engine.ts, server/test/table-engine.test.js
- [ ] A6: Prove the browser runs the same engine and register it as a family — one spec through the schemas alias, the table-engine family entry, inventory line, folder map, the map's extension line — src/app/core/utils/table-engine.spec.ts, docs/brain/component-families.md, docs/brain/inventory.md, src/app/core/breadcrumbs.md, docs/restaurant/restaurant-map.md

## Technical Considerations
- Dependencies: `shared/schemas/front-desk/qualify.ts` (`hoursCheck` is rewritten on `openRangesOf`; `qualify` is not
  touched), `local-time.ts`; the types `FloorPlan` and `FrontDeskProfile` and the function `tableServiceOf` from plan
  662, imported with `import type` where only the type is needed so the browser bundle does not pull zod for the engine.
- New files needed: `shared/schemas/front-desk/table-engine.ts`, `shared/schemas/testing/table-engine-fixtures.ts`,
  `server/test/table-engine.test.js`, `src/app/core/utils/table-engine.spec.ts`.
- Model changes: none (no stored shape).
- Backend / API: none — no route calls the engine in this plan.
- Auth and validation: none.
- Security surface: none — pure functions over data the caller already holds.
- Data / migration: none.
- Project checks: `[auto] log-query` present; no dictionary key and no icon (no UI); Reuse Check filled and the
  registry updated in the same branch; no hotspot is edited; the folder map of `src/app/core/` is in scope.
- Traps: arithmetic only in epoch ms; a wall time that does not exist on the spring change day never appears because
  slots are built from epochs; `server/generated/schemas` is build output — never edit or commit it.

## Out of Scope
- Any route, hold, booking write or screen (plans 664–674); the `tableHolds` collection and `holdsOf` (plan 668).
- Changing `qualify` or any schema file; the Hebrew texts of the reasons.
- Guests' own waiting list, deposits, sections, several layouts.

## Critical Questions
- none

## Execution Notes
- behaviour: a slot after midnight is listed under the calendar date it starts on (so `date` + `time` is the real
  start), and a closed date closes the whole service day that starts on it — the simplest rule that keeps
  `jerusalemEpoch(date, time)` true for every booking.
- behaviour: the asked area is a preference, never a filter (C-ENGINE's order puts it second).
- behaviour: `alternatives` looks at most 14 dates ahead for "the next two open days".
