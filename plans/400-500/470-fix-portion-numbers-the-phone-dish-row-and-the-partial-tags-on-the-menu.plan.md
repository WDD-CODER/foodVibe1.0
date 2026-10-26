# Plan 470 — Fix portion numbers, the phone dish row and the partial tags on the menu

Status: done
Track: code
Snapshot: b7d21fb021191304a54e3d351bb595e648d73dfa

## Problem Statement
Plan 467 covers F1–F3 of the menu section of the review handoff (`docs/mvp/review-handoff-2026-10-21.md`); this plan covers F4–F6 on `/menu-intelligence/:id`. The section had too many sub-issues for one plan, so it is split: 467 (F1–F3) and 470 (F4–F6).
1. **F4 — portions show `110.00000000000001`.** The «מנות לאירוע» field of a dish row shows a float tail.
2. **F5 — dish info icon unreachable on a phone.** The ₪0 sell-price badge sits on top of the dish name and the ⓘ icon cannot be tapped.
3. **F6 — «חלקי» stays on revenue, profit and minimum price after the missing product was priced.**

**Verified in code (mvp, b7d21fb):**
- F4: `computePortions` (`src/app/core/engine/portions.ts:45-64`) is the one place portions are computed (plan 440). For dishes and per-unit preparations it already calls `roundPortions` (`rounding.ts:10-12`: drop float noise at 6 decimals, then `Math.ceil`); its spec covers `1.1 * 1.1 * 100 → 121` and a 1.1 override → 110. So a dish can NOT show 110.00000000000001 from that path. The float survives only in the other branch: a weight or volume preparation (`kg`, `liter`, `gram`, `ml` yield) returns `raw` untouched (`portions.ts:57`, `: raw`), and the dish row prints it as is (`menu-dish-row.component.html:153` via `getDerivedPortions()`, `menu-dish-row.component.ts:133-135`). The same unrounded value feeds the prep-line quantity in `event-plan.engine.ts` (`rawPortions` for non-dishes). Rounding those UP to whole numbers would be wrong (5.2 kg of sauce is not 6 kg), so only the float is cleaned there — see Critical Question 1 (decision D6). `rounding.ts` / `portions.ts` have no change since the Human's run (`git log`: last touched by plan 440 and 447).
- F5: the phone fix is already written but loses the cascade. In `menu-dish-row.component.scss` the `@media (max-width: 768px)` block (lines 86-111) sets `position: static` on `.dish-remove` and `.dish-sell-price`, but the base rules `.dish-remove { position: absolute … }` (line 148) and `.dish-sell-price { position: absolute; inset-inline-end: 2.25rem }` (line 292) come AFTER it with the same specificity, so they win on phones. The price badge floats over the centred name, and the info button (`.dish-meta-toggle`, absolutely placed at `inset-inline-start: 100%` of the name, lines 52-58) sits inside `.dish-name-meta-wrap { overflow: hidden }` (line 32), so a long name pushes it out of the box and clips it.
- F6: the Human's guess (partial only because the customer price is ₪0.00) is NOT how the code works. `computeEventPricing` (`event-pricing.ts:73-107`) copies one flag, `partial: plan.partial`, to the whole result; `PricingMeterComponent.partial_()` (`pricing-meter.component.ts:60`) puts the «חלקי» tag on revenue, profit per guest, profit % and minimum price (`pricing-meter.component.html:127,136,143,165`), but the total-cost badge is `app-partial-cost-badge [missing]="plan().missing"` (line 122), which depends on a different list. `plan.partial` is `dishCosts.some(partial) || errors.length > 0 || missing.length > 0` (`event-plan.engine.ts:341`). So once the priced product leaves `missing`, the cost badge goes while `partial` stays true if the plan still has an engine error (`no_yield`, `no_conversion`, `no_ingredients`, `cycle`) or an ingredient line with no unit conversion — neither appears in `missing`, and the screen never shows `plan.errors` (the `engine_error_*` keys are used only by the shopping list, `shopping-list-table.util.ts:75`). All numbers come from the same `result_()`, so they do refresh together; the bug is a tag with no visible reason. Also, revenue is `sellPrice × portions` and never depends on product prices, so «חלקי» on revenue is wrong in every case.

**Not verified (no browser, no data of the Human's menu):** which engine error the Human's menu had; the plan shows the cause on screen, so the next validation names it. The F5 overlap is read from the CSS cascade, not seen on a phone.

## Goals & Success Criteria
- Primary: portions never show float noise, the dish name and ⓘ icon are reachable on a phone, and «חלקי» appears only on cost-based numbers and always says why.
- Success:
  - [x] [auto] `npx ng test --watch=false --include='**/rounding.spec.ts' --include='**/portions.spec.ts' --include='**/menu-dish-row*.spec.ts' --include='**/pricing-meter*.spec.ts'` passes, including: a kg preparation with 1 portion per diner, 100 guests, coefficient 1.1 → `portions` is exactly `110` (`toBe(110)`); 0.07 × 100 → exactly `7`; a dish with a 1.1 override and 100 guests → `110`; a dish row given `portions: 110.00000000000001` shows `110`; a plan with an engine error and an empty `missing` list shows the reason and no «חלקי» on revenue.
  - [x] [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `deferred: local MongoDB down` per run mode).
  - [x] [auto] `npx ng build` passes.
  - [ ] [human] Open a menu with 100 guests whose event type × serving type gives coefficient 1.1 and add a preparation made in kg: «מנות לאירוע» shows `110`, not `110.00000000000001`. A normal dish with the same coefficient shows `110` too.
  - [ ] [human] On a phone width, open a menu with a dish whose name is long and whose price is ₪0: the name shows on one line with «…» at the end, the ⓘ icon next to it can be tapped and opens the dish details, and the ₪ price and the trash icon sit on the row's far side without covering the name.
  - [ ] [human] Replay: on a menu whose total shows «חלקי», price the missing product from the chip. If «חלקי» is gone from the total cost, it is also gone from profit per guest, profit % and minimum price, or a line under the numbers names what is still missing. «חלקי» never appears next to «סה"כ הכנסות».
  - [ ] [human] On a menu with guests but every dish price at ₪0 and no price per guest typed, the revenue shows ₪0.00 with the tag «לא הוגדר מחיר ללקוח».

## Execution Mode
- Parallel: no — one worker, files listed below.
- Concurrent plans: 467 (same event screen, different files: stage bar, inquiry dialog, shared date field). No shared file.
- Isolated DB: no

## Execution Notes
- Base branch `origin/mvp`; merge back into `mvp` only, never `main`. Executed per `docs/mvp/run-mode.md` — [human] items become validation cards in `docs/mvp/runs/470.md`.
- Depends on: none. Overlap risk: plan 466 (partial-cost popover, E3) also works in the partial badge (`src/app/shared/partial-cost-badge/`); this plan does NOT edit that folder — it only reads `plan().missing`. If 466 changes the badge's input names, rebase onto it.
- Main has unrelated plans 450–458 (popup shell, search box, form field, chip engine); they are NOT on `mvp`. Do not use them.
- `menu-intelligence.page.ts` is growth-frozen and is not touched here.
- Handoff decision D6 (portions rounding) is open: this plan carries the recommended answer as an assumption (Critical Question 1); the run file logs it.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/engine/rounding.ts
src/app/core/engine/rounding.spec.ts
src/app/core/engine/portions.ts
src/app/core/engine/portions.spec.ts
src/app/pages/menu-intelligence/components/menu-dish-row/**
src/app/pages/menu-intelligence/components/pricing-meter/**
docs/mvp/runs/470.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-none: preserves — the scope reaches no invariant `Touches` glob (engine, dish row and pricing meter are client display and pure math; no server, schema, permission or taxonomy code).

## Backend Impact
- Collections affected: none.
- New collections: no
- Server changes needed: no. Events saved earlier keep their stored `derivedPortions`; the dish row reads live values, exports already round (`roundExportNumber`).

## Step 0 — Reality Check
Runs only when `scope-check.mjs --drift` reports drift. On `origin/mvp` find: `computePortions` and `isPortionUnitItem` in `portions.ts`, `roundPortions` in `rounding.ts`, `.dish-remove` / `.dish-sell-price` / `.dish-meta-toggle` in the dish row stylesheet, and `partial_` in `pricing-meter.component.ts`. Print `ok` or `conflict: <what>` per symbol.

## User Stories
- As a chef, I want portions shown as clean numbers so that I can read and print them without decimals like 110.00000000000001.
- As a chef on my phone, I want to read the dish name and tap its info icon so that I can see and edit the dish details.
- As a chef, I want «חלקי» only where a missing cost really affects the number, and a reason when it stays, so that I know what to fix.

## Functional Requirements

### Must Have (P0)
- [ ] Portions of every kind of item are free of float noise (6 decimals) in the engine; the dish row shows at most 2 decimals.
- [ ] On phones the dish name, ⓘ icon, ₪ price and delete button sit side by side without overlap.
- [ ] «חלקי» is shown on cost-based numbers only; when the plan is partial but no product is missing, the engine's reasons are listed.

### Nice to Have (P1)
- [ ] Revenue shows «לא הוגדר מחיר ללקוח» when it is zero for lack of prices.

## UI/UX Notes
- RTL; logical CSS only (`inline-size`, `margin-inline-start`, `inset-inline-*`); no physical `left/right/width`.
- Reasons line sits under the metrics in `pricing-meter`, small muted text with the amber `partial-tag` colour; one reason per line.
- New dictionary keys (append to `public/assets/data/dictionary.json`): `partial_reason_title` «למה החישוב חלקי:», `revenue_not_set` «לא הוגדר מחיר ללקוח». Existing keys reused: `partial_total`, `engine_error_cycle`, `engine_error_no_yield`, `engine_error_no_conversion`, `engine_error_no_ingredients`, `line_status_no_conversion`.

## Atomic Sub-tasks

### Milestone 1 — F4: clean portion numbers
- [x] V1: Add one helper that drops float noise from a number — export `cleanFloat(n, decimals = 6)` from `rounding.ts` built on the existing private `roundTo` (so there is still one rounding implementation); spec: `cleanFloat(1.1 * 100)` is exactly `110`, `cleanFloat(0.07 * 100)` is exactly `7`, `cleanFloat(5.2)` stays `5.2` — `src/app/core/engine/rounding.ts`, `src/app/core/engine/rounding.spec.ts`
- [x] V2: Clean the weight and volume portions the same way dish portions are cleaned — in `computePortions` the non-portion branch becomes `cleanFloat(raw)` (dishes and per-unit preparations keep `roundPortions`, whole and rounded up); update the doc comment; specs: kg preparation 1 per diner × 100 guests × 1.1 → `toBe(110)`, 0.07 per diner × 100 → `toBe(7)`, dish override 1.1 → `toBe(110)`, and the existing 121 and 127 cases still pass — `src/app/core/engine/portions.ts`, `src/app/core/engine/portions.spec.ts`
- [x] V3: Show portions in the dish row without float tails — the «מנות לאירוע» value prints `cleanFloat(getDerivedPortions(), 2)` through a small `portionsText_` computed; cost maths keeps the exact `getDerivedPortions()`; spec: `portionInfo` of `110.00000000000001` shows `110`, `5.25` shows `5.25` — `src/app/pages/menu-intelligence/components/menu-dish-row/menu-dish-row.component.ts`, `src/app/pages/menu-intelligence/components/menu-dish-row/menu-dish-row.component.html`, `src/app/pages/menu-intelligence/components/menu-dish-row/menu-dish-row.component.spec.ts`

### Milestone 2 — F5: dish row on a phone
- [x] V4: Make the dish name, info icon, price and delete button fit one phone row — in the dish row stylesheet move the `@media (max-width: 768px)` block to the END of the file so its `position: static` overrides win over the base `.dish-remove` and `.dish-sell-price` rules (the verified cause); on phones make `.dish-name-meta-wrap` start-aligned with `flex: 1 1 0; min-inline-size: 0`, `.dish-name-meta-inner` an `inline-flex` with a small gap, the name `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`, and `.dish-meta-toggle` in the flow (`position: static; transform: none; margin-inline-start: 0; flex: 0 0 auto`) with a 2rem tap size; desktop rules stay as they are — `src/app/pages/menu-intelligence/components/menu-dish-row/menu-dish-row.component.scss`

### Milestone 3 — F6: «חלקי» that explains itself
- [x] V5: Stop showing «חלקי» next to revenue, which never depends on product prices — remove the tag from the revenue metric; when `result_().revenue` is 0 and `event().guestCount > 0` show the `revenue_not_set` tag there instead; keep «חלקי» on profit per guest, profit % and minimum price per guest; update the existing spec "marks every number partial" to expect those three and none on revenue — `src/app/pages/menu-intelligence/components/pricing-meter/pricing-meter.component.html`, `src/app/pages/menu-intelligence/components/pricing-meter/pricing-meter.component.ts`, `src/app/pages/menu-intelligence/components/pricing-meter/pricing-meter.component.spec.ts`
- [x] V6: Say why the total is partial when no product is missing — new computed `partialReasons_` in `pricing-meter` = `plan().errors` mapped to `engine_error_<kind>` with `{name}` filled, plus each `plan().rawLines` entry with status `no_conversion` mapped to `line_status_no_conversion` + its name; render it under the numbers (title `partial_reason_title`, one line each) only when `partial_()` is true and `plan().missing` is empty (otherwise the cost badge popover is the explanation); specs: error + empty missing → reason shown, missing present → no reason list, not partial → nothing — `src/app/pages/menu-intelligence/components/pricing-meter/pricing-meter.component.ts`, `src/app/pages/menu-intelligence/components/pricing-meter/pricing-meter.component.html`, `src/app/pages/menu-intelligence/components/pricing-meter/pricing-meter.component.scss`, `src/app/pages/menu-intelligence/components/pricing-meter/pricing-meter.component.spec.ts`
- [x] V7: Build, run the checks, write the run file with the validation cards — `npx ng build`, the specs in Done-when, `log-query`; one card per [human] item above — `docs/mvp/runs/470.md`

## Technical Considerations
- Dependencies: `roundPortions`, `formatMoney` and `computeEventPricing` stay as they are; `EventPlan.errors` and `rawLines[].status` already exist (`event-plan.types.ts`).
- New files needed: none.
- Model changes: none.
- Backend / API: none.
- Auth and validation: none.
- Data / migration: none.
- Frozen files: none touched (`menu-intelligence.page.ts` stays untouched).
- Project checks: log-query [auto]; chef-side stories; two dictionary keys; logical CSS only.

## Out of Scope
- Any export, print or preview of a recipe or a menu (export-preview, export toolbar, export services, Excel) — plan 471, not this run.
- Changing which costs make a plan partial (`event-plan.engine.ts` is not touched), the partial popover itself (plan 466), choosing a supplier price (D5).
- Rounding weight or volume preparations up to whole numbers (see Critical Question 1).
- The metadata/info panel contents of a dish, desktop layout of the dish row, and print layouts.
- Cleaning `derivedPortions` already stored on saved events (they are recomputed on the next save).

## Critical Questions
- Answered 2026-10-21 (Human): every recommended answer below is accepted; build to it. D6 answered by the Human: at most 2 decimals on screen, as recommended.
1. D6 — portions rounding: **dishes and per-unit items are whole numbers rounded up after the float is cleaned (already so); weight and volume preparations keep their decimals (up to 2 on screen) because rounding 5.2 kg up to 6 kg overbuys (recommended)** · round every item up to a whole number. What did «מינימום 10 אחרי הנקודה» mean — a minimum of 10 decimals kept, or something else? The plan assumes it meant "clean the float" and keeps 6 decimals in the engine.
2. F6 — when revenue is ₪0 because no dish price and no price per guest is set: **show the tag «לא הוגדר מחיר ללקוח» (recommended)** · show nothing special.
3. F6 — if the reasons line is not enough and the Human's menu still shows «חלקי» with nothing listed after validation, the cause is outside the engine's errors; the next step would be a new plan with that menu's data.
