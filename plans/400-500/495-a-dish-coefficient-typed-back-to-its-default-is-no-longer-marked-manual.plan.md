# Plan 495 — A dish coefficient typed back to its default is no longer marked manual

Status: done
Track: code
Snapshot: ea6af7b02e8012a812933a795eb15c7bf9dcd81c

## Problem Statement
QA report 2026-10-22 (`docs/mvp/qa-report-2026-10-22.md`), item 19 (check 66), Dandan's words: "dish coefficient in
the Menu Editor. Typing a value back to the exact default (without "Reset to default") still shows «שונה ידנית».
Value equal to the default → no manual-change tag/state."

As a chef, I want a dish whose coefficient I typed back to the default to count as a normal dish again, so that the
«שונה ידנית» tag only shows on dishes that really differ, and those dishes follow the event type again.

Verified in code on `mvp-qa-fixes` (`ea6af7b0`):
- The coefficient box, the «שונה ידנית» tag and «חזור לברירת מחדל» live in the dish details rail of
  `src/app/pages/menu-intelligence/components/menu-dish-row/menu-dish-row.component.html:102-130` (box :106-118, tag
  and reset button inside `@if (portionInfo()?.overridden)` at :119-129). The page feeds the row
  `[portionInfo]="menuPortions_.at(sectionIndex, itemIndex)"` (`menu-intelligence.page.html:217`).
- `menu-dish-row.component.ts:149-163` `onCoefficientInput`: any valid number is stored as the dish's override
  (`patchValue({ coefficient_override: value })`, line 162). It never compares with the default; only
  `resetCoefficient` (:171-175) stores `null`.
- `src/app/core/engine/portions.ts:53-55` `computePortions`: `overridden = override != null && override > 0` — any
  stored override is "manual", even when it equals the default. `ItemPortions` (:7) carries `portions`,
  `coefficient`, `overridden`, but not the default, so the row cannot compare.
- **Root cause:** "manual" is decided by "an override is stored", not by "the value differs from the default"; and
  typing the default stores it as an override. Report setup (check 66): «פרטי» 1.15 × «בופה» 1.1 = **1.265**, shown
  as **1.27** (`formatCoefficient`, :27-29). An override can hold at most 2 decimals (`isValidCoefficient`, :20-24), so
  the chef can only ever type the shown value 1.27 — an exact `1.27 === 1.265` check would still fail. The compare
  must be on the shown 2-decimal value.
- Form → save: `menu-portions.service.ts:130-138` reads `coefficient_override` (> 0) into the event for the engine;
  the page saves it at `menu-intelligence.page.ts:954` (`> 0` → `coefficientOverride`, else `undefined`). A `null`
  override is therefore never saved — the reset path already relies on this.
- Every other screen gets portions from the same `computePortions` (`event-plan.service.ts:18`,
  `menu-intelligence.service.ts:16`, `plan-snapshot.service.ts:32`, `menu-event-save.service.ts:31`,
  `menu-portions.service.ts:46`), so a rule there reaches the footer, shopping list, exports and the saved pricing alike.
- Earlier work: plan 441 built the box, the tag and reset (`docs/mvp/runs/441.md` cards ③/④ = checks 66/67);
  plan 470 cleaned the portion floats (`66fd8f8d`). No plan in 459–485 touched the override rule. Plan 482 (planned,
  not built) only removes spin-button CSS from `menu-dish-row.component.scss` and may add select-on-focus to number
  boxes; this plan does not touch the SCSS, and the coefficient box is `type="text"` with `appSelectOnFocus` already.

## Goals & Success Criteria
- Primary: a dish coefficient equal (at its shown 2 decimals) to the event's default is not an override — no
  «שונה ידנית» tag, no reset button, nothing stored, and the dish follows the event type again; passed check 67
  («שונה ידנית» on 1.1, reset brings it back) works exactly as before.
- Success:
  - [x] [auto] `npx ng build` passes.
  - [x] [auto] `npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/core/engine/**/*.spec.ts' --include='src/app/pages/menu-intelligence/**/*.spec.ts' --include='src/app/core/services/menu-intelligence.service.spec.ts'` → all SUCCESS, covering:
    (a) `isDefaultCoefficient(1.27, 1.265)` → true, `(1.26, 1.265)` → false, `(1.1, 1.1)` → true, `(1.32, 1.2 * 1.1)` → true;
    (b) `computePortions` private 1.15 × buffet 1.1, 100 guests, override 1.27 → `overridden: false`, coefficient ≈ 1.265, portions 127, `defaultCoefficient` ≈ 1.265; override 1.1 → `overridden: true`, 110, `defaultCoefficient` ≈ 1.265 (existing 1.1 / wedding tests unchanged);
    (c) dish row with `portionInfo` default 1.265: typing `1.27` stores `coefficient_override` `null` and shows no `coefficient_manual`; typing `1.1` stores 1.1 (existing test); from an override of 1.1, typing `1.27` stores `null`; the reset test, the `1.111` and `0` tests unchanged;
    (d) `MenuPortionsService.at()` with override 1.1 equals `{ portions: 110, coefficient: 1.1, overridden: true, defaultCoefficient: ≈1.265 }`; with override 1.27 → `overridden: false`.
  - [ ] [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
  - [ ] [human] Desktop 1440 px replay of check 66 (cards ①–③ below): typing the default back removes the tag and the reset button, the dish follows a new event type, and the tag stays gone after save + reopen.
  - [ ] [human] Desktop 1440 px replay of passed check 67 (card ④): 1.1 is still manual, the other dish follows «חתונה», reset still works.

### Validation cards (builder copies these into `docs/mvp/runs/495.md` `## Human checks`, with the slot's real port)
Role: the local **owner** account from `C:\coding projects\Cursor\mvp-review-evidence\accounts.json`, desktop 1440 px.

SETUP (once, before card ①): `/menu-intelligence` (new menu). Name it `בדיקה 495`; event type «פרטי», serving type
«בופה», guests 100. Give the first category any name, add any dish to it (leave 1 portion per diner) and a second
dish. Click the small info icon next to the first dish's name to open its details. «מקדם המנה» shows 1.27 and
«מנות לאירוע: 127». (The throwaway menu `בדיקה 495` may stay; no other menu is changed.)

▸ Menu Editor — `/menu-intelligence` (new menu `בדיקה 495`, owner, desktop 1440 px)   (checks ①–②)
① Typing the default back clears «שונה ידנית»
   DO      in the first dish's «מקדם המנה» type `1.1`, click outside; then click the box again (the whole value is selected) and type `1.27`, click outside
   SEE ✓   after `1.1`: tag «שונה ידנית», button «חזור לברירת מחדל», «מנות לאירוע: 110»; after `1.27`: the box shows 1.27, «מנות לאירוע: 127», and neither «שונה ידנית» nor «חזור לברירת מחדל» is shown
   FAIL ✗  «שונה ידנית» or «חזור לברירת מחדל» still shows after typing 1.27, or the portions are not 127
② The dish follows the event type again
   DO      from ①, change the event type to «חתונה»
   SEE ✓   the first dish shows «מקדם המנה» 1.32 and «מנות לאירוע: 132», the same as the second dish, with no «שונה ידנית»
   FAIL ✗  the first dish stays 1.27 / 127, or «שונה ידנית» shows

▸ Saved menu — `/menu-intelligence/<id of «בדיקה 495»>` (opened from the menu library card)   (checks ③–④)
③ Still a normal dish after saving and opening again
   DO      from ②, press save (the app moves to the menu library); open the card «בדיקה 495»; click the info icon next to the first dish's name
   SEE ✓   the first dish shows 1.32 and «מנות לאירוע: 132», with no «שונה ידנית» and no «חזור לברירת מחדל»
   FAIL ✗  «שונה ידנית» shows, or the first dish shows 1.27 / 127
④ A real change is still manual and reset still works (passed check 67)
   DO      in the reopened menu set the event type back to «פרטי»; on the first dish type `1.1`; change the event type to «חתונה»; press «חזור לברירת מחדל» on the first dish
   SEE ✓   after `1.1`: 110 and «שונה ידנית»; after «חתונה»: the second dish shows 1.32 / 132 while the first stays 1.1 / 110 with the tag; after the reset the first shows 1.32 / 132 and the tag is gone
   FAIL ✗  any number differs, the tag is missing on 1.1, the first dish moves with «חתונה», or the tag stays after reset

## Execution Mode
- Parallel: yes — owns `core/engine/portions.ts` for this run. The dish row is shared: plan 481 (built on
  `origin/feat/481-deleted-ingredient-row`, not merged) changes `menu-dish-row.component.spec.ts` and `.scss`; plan
  487 (scope: dish-row `.ts`/`.html`/`.scss`/`.spec.ts`) hides money fields for staff; plan 482 may touch the dish-row
  `.html`/`.scss`. This plan changes only `onCoefficientInput` and the coefficient specs, so a conflict is textual:
  on merge keep both sides (481's/487's tests and staff guards plus this plan's coefficient tests).
- Isolated DB: no (the cards create one throwaway menu `בדיקה 495`).

## Execution Notes
- Base branch `origin/mvp-qa-fixes`; run mode `docs/mvp/run-mode-qa-fixes.md` (then review-fixes, then review).
- Matching rule (Planner decision): "equal to the default" = `formatCoefficient(value) === formatCoefficient(default)`,
  i.e. the 2-decimal value the box shows. Why: an override can't hold 3 decimals, so 1.265 can only be typed as 1.27.
  When equal, the engine uses the default itself (1.265), so the portions are exactly a non-overridden dish's.
- One rule, one place: `isDefaultCoefficient` lives in `portions.ts`; the engine uses it for `overridden`, the dish
  row uses it to store `null`. Engine side covers menus saved before this fix (Dandan's QA menus with a typed 1.27
  stop showing the tag on open); row side keeps the stored state clean so the dish follows later event-type changes.
- Known edge, accepted: a dish with a real override (e.g. 1.2) whose event type later changes so the default becomes
  1.2 shows no tag while equal (same numbers either way); the stored 1.2 stays, so switching the type again shows it
  as manual. Matches the report's rule "value equal to the default → no manual tag".
- Known edge, accepted (old data): a menu saved before this fix with a typed default (e.g. 1.27 on «פרטי»×«בופה»)
  opens with no tag and the default's numbers, but its stored 1.27 is loaded into the form (`menu-intelligence.page.ts:880`)
  and saved back (`:954`); if the chef later changes that menu's event type, the dish shows 1.27 «שונה ידנית» again.
  Cleaning it would mean editing the page's load/save (out of this plan's files and shared with plans 493/494/496) or
  dirtying the form on open; the chef clears it once with «חזור לברירת מחדל». Every menu where the default is typed
  after this fix stores nothing.
- Typing is per keystroke (`(input)`): typing `1.27` passes through `1`, `1.`, `1.2` (each stored as an override for a
  moment) and ends at `null` on `1.27`; the box keeps the typed text until blur, so this is invisible.
- No UI, SCSS or dictionary change: the tag and reset button already hide on `overridden: false`.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, `.claude/sessions/**`, `.worktree-*`.

```scope
src/app/core/engine/portions.ts
src/app/core/engine/portions.spec.ts
src/app/pages/menu-intelligence/components/menu-dish-row/menu-dish-row.component.ts
src/app/pages/menu-intelligence/components/menu-dish-row/menu-dish-row.component.spec.ts
src/app/pages/menu-intelligence/services/menu-portions.service.spec.ts
docs/mvp/mvp-map.md
docs/mvp/runs/495.md
```

## Read Scope
Entire repo.

## Escalation Protocol
Writing outside the scope block: log path + change + why under `## Decisions` in `docs/mvp/runs/495.md`, add it to
the scope block, continue (run mode: you work alone). Never change `server/**`, `shared/schemas/**` or the page files
(`menu-intelligence.page.*`) for this plan.

## Architecture Impact
- INV-none: preserves — client-only change to the portions engine and one dish-row component; no ownership,
  tenancy, schema, taxonomy, server or AI path is touched (no `Touches` glob of INV-1…INV-6 is in scope).

## Backend Impact
- None. No API, schema, migration or data change; a `null` override is already dropped on save
  (`menu-intelligence.page.ts:954`). Security surface: none. Data: menus saved earlier with an override equal to the
  default keep that stored number; the engine now treats it as the default (no migration needed).

## Reuse Check
- Default-coefficient compare helper `isDefaultCoefficient` — family: event-plan — rung: 3 — why: extends the
  portions engine `src/app/core/engine/portions.ts` next to `formatCoefficient` / `isValidCoefficient`; no new file
- `defaultCoefficient` field on `ItemPortions` — family: event-plan — rung: 3 — why: the engine already computes the
  fallback (`portions.ts:49`); exposing it lets the row compare without a new input or service

## Step 0 — Reality Check
Find `ItemPortions`, `defaultCoefficient`, `formatCoefficient`, `isValidCoefficient`, `computePortions` and the
`overridden` line in `portions.ts`; `onCoefficientInput`, `resetCoefficient`, `portionInfo` in
`menu-dish-row.component.ts`; `@if (portionInfo()?.overridden)` in its html; the `toEqual({ portions: 110 ...` line in
`menu-portions.service.spec.ts`; `coefficientOverride` at `menu-intelligence.page.ts:954`. Print `ok` /
`conflict: <what>` in `docs/mvp/runs/495.md`.

## Atomic Sub-tasks
- [x] T1: Let the engine tell a typed default from a real change and pass the default on — add `export function isDefaultCoefficient(value: number, fallback: number): boolean` (`formatCoefficient(value) === formatCoefficient(fallback)`); `ItemPortions` gains `defaultCoefficient: number`; in `computePortions` `overridden = override != null && override > 0 && !isDefaultCoefficient(override, fallback)`, `coefficient = overridden ? override : fallback`, set `defaultCoefficient: fallback` on every item — src/app/core/engine/portions.ts
- [x] T2: Typing the default coefficient on a dish stores no override — in `onCoefficientInput`, after the valid check: when `portionInfo()` is set and `isDefaultCoefficient(value, portionInfo().defaultCoefficient)`, `patchValue({ coefficient_override: null })`, else store `value` as today; blank and invalid paths unchanged — src/app/pages/menu-intelligence/components/menu-dish-row/menu-dish-row.component.ts
- [x] T3: Cover the rule in the engine, the dish row and the menu portions service — cases (a)–(d) in Done-when; add `defaultCoefficient` to the existing `portionInfo` objects in the dish-row spec and to the `toEqual` in the service spec — src/app/core/engine/portions.spec.ts, src/app/pages/menu-intelligence/components/menu-dish-row/menu-dish-row.component.spec.ts, src/app/pages/menu-intelligence/services/menu-portions.service.spec.ts
- [x] T4: Note the new field and rule in the portions contract so later plans read it — C-PORTIONS lines: `ItemPortions` adds `defaultCoefficient`; an override equal to the default at 2 decimals is not an override (plan 495) — docs/mvp/mvp-map.md
- [x] V1: Build, run the specs and the log check, replay cards ①–④ in the browser and write the run file — docs/mvp/runs/495.md

## Out of Scope
- Clearing stored overrides in saved events (no migration; the engine reads them as the default), on load or on
  save (`menu-intelligence.page.ts` is not touched) — see the old-data edge in Execution Notes.
- The coefficients settings card (`/dashboard?tab=metadata`) — plan 482.
- Any look change of the coefficient box, tag or reset button; spin buttons and select-all (plan 482).
- Event-type and serving-type default coefficients themselves.

## Architect + PM review (always)

```
ARCHITECT + PM REVIEW
no gaps
```

Checked: every named file/symbol exists on `ea6af7b0` (`isDefaultCoefficient` and `ItemPortions.defaultCoefficient`
are new); scope covers every written file and nothing more; Done-when has `[auto]` build/test/log items and `[human]`
replays of check 66 and passed check 67; Out of Scope written; backend/auth/security/data marked none; smallest fix
(one helper + one field + one branch, no UI change); no hotspot or dictionary edit; `ng build` + log-query items present
per `docs/agent/plan-checks.md`; Reuse Check rows name the `event-plan` family.

### Independent review (2026-10-24, plan reviewer)
```
ARCHITECT + PM REVIEW
- Card ② said "save, then reload the page", but save() navigates to /menu-library (menu-intelligence.page.ts:806) → split into ② (follows «חתונה») and ③ (save → open «בדיקה 495» from the library), passed check 67 is now ④; Done-when and V1 renumbered
- SETUP did not name the first category; save() blocks on a section without a name (menu-form.util.ts:22) → SETUP names it
- Execution Mode claimed sole ownership of menu-dish-row.component.ts; plans 481 (built branch: dish-row spec/scss) and 487 (dish-row ts/html/scss/spec) share it → overlap named, keep-both merge rule written
- Old saved menus with a typed default keep the stored number and become manual again after a later event-type change → written as an accepted edge (page load/save out of files) in Execution Notes and Out of Scope
```
Verified on `ea6af7b0`: `portions.ts:7, 27-29, 49, 53-55`; `menu-dish-row.component.ts:149-175`; html `:106-129`;
page `.html:217`, `.ts:880, 954`; `menu-portions.service.ts:131-137`; dictionary `dish_coefficient`/`coefficient_manual`/
`coefficient_reset`/`event_portions`; seed «פרטי» 1.15 / «חתונה» 1.2 (`server/migrations/0007-coefficients.js:38`).
Closed events read the stored `planSnapshot` (plan 446), so passed check 96 is not moved by the engine rule. No
role, server, RTL or dictionary surface.
