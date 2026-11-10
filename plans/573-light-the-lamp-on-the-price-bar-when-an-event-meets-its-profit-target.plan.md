# Plan 573 — Light the lamp on the price bar when an event meets its profit target, and line up its numbers

Status: draft
Depends-on: 572
Snapshot: 4ba8887cc16eb5c1c3d3ccd4a0bbb9b63cb6c3c9

## Problem Statement
The Pass theme (approved by Dandan 2026-11-10) has one signature: an amber line that marks the thing that is ready to
go out. Plan 572 adds the line (`.c-pass-line`) and the shared class for exact-looking digits (`.c-num`), and uses
neither. The first place a chef decides "this is ready" is the event's price bar: the price meets the profit target or
it does not. Today that bar shows the verdict only as a small green or red label, and its numbers shift width as the
digits change.

Verified on `origin/main` (4ba8887c, 2026-11-10):
- `src/app/pages/menu-intelligence/components/pricing-meter/pricing-meter.component.html`: the bar's numbers are six `<span class="fin-value" dir="ltr">` elements inside `.meter-numbers` (food cost, revenue, profit per guest, profit %, the "—" fallback has no `dir`, minimum price); the phone sheet's summary has `<span class="summary-price" dir="ltr">` and `<span class="summary-pct" dir="ltr">`. The profit % value is `<span class="fin-value" dir="ltr">{{ profitPct_() }}</span>` right after the label `'profit_pct' | translatePipe`.
- The verdict already exists in the component: `hasProfitPct_()` and `result_().meetsTarget` (`src/app/core/engine/event-pricing.ts:89` `meetsTarget = profitPct !== null && profitPct >= target`).
- `pricing-meter.component.scss` `.fin-value` sets colour, size and weight only; no tabular digits.
- `src/app/pages/menu-intelligence/components/pricing-meter/pricing-meter.component.spec.ts` has the cases `'green verdict when the price meets the target'` (line 71) and `'red verdict with the shortfall per guest when the price is too low'` (line 78), built with the file's `create(ev, plan)` helper.
- `src/app/pages/dashboard/components/business-performance/business-performance.component.scss:101` already sets `font-variant-numeric: tabular-nums` on `.perf-card__value`; the dashboard needs no change.
- The staff view renders nothing of the meter (`@if (!isMoneyHidden_())`, plan 487); this plan changes nothing about who sees money.

## Goals & Success Criteria
**Primary:** on the event screen, the profit % carries the amber line exactly when the price meets the target, and
every number of the price bar keeps its width while digits change.

- [auto] `pnpm run test:ci` passes, including three new cases in `src/app/pages/menu-intelligence/components/pricing-meter/pricing-meter.component.spec.ts`: (1) when the price meets the target, the profit % `.fin-value` has the class `c-pass-line`; (2) when the price is too low, no element in the component has the class `c-pass-line`; (3) every `.fin-value` that has `dir="ltr"` has the class `c-num`.
- [auto] `pnpm run build` passes.
- [auto] `pnpm run lint` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] On an event whose price meets the target, the profit % in the price bar has a clear amber line under it; lowering the price below the target removes the line at once.
- [human] Typing a price does not make the numbers in the bar jump sideways.

## Execution Mode
- Parallel: no — plan 570 and any plan that edits the pricing meter touch the same component.
- Concurrent plans: none that edit `src/app/pages/menu-intelligence/components/pricing-meter/**`.
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/menu-intelligence/components/pricing-meter/pricing-meter.component.html
src/app/pages/menu-intelligence/components/pricing-meter/pricing-meter.component.spec.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves — two class bindings in one template; the money rules (INV-1: staff never see or change money) are untouched because the `@if (!isMoneyHidden_())` wrapper and the form are not edited.

## Reuse Check

- none — uses the engine classes `.c-num` and `.c-pass-line` from plan 572 as they are (rung 1); no new piece.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef pricing an event, I want one clear sign that the price is ready to send so that I do not have to read every number again.

## Functional Requirements

### Must Have (P0)
- [ ] `pricing-meter.component.html`: add the class `c-num` to every `<span class="fin-value" dir="ltr">` in `.meter-numbers` (food cost, revenue, profit per guest, profit %, minimum price) and to `.summary-price` and `.summary-pct`. Write it as a second class in the `class` attribute (`class="fin-value c-num"`); the existing `[class.fin-value--bad]` binding stays.
- [ ] `pricing-meter.component.html`: on the profit % value (`{{ profitPct_() }}` under the `profit_pct` label) and on `.summary-pct`, add `[class.c-pass-line]="hasProfitPct_() && result_().meetsTarget"`.
- [ ] No change to the `.ts` or `.scss` file: both classes are global engines from `src/styles.scss`.
- [ ] `src/app/pages/menu-intelligence/components/pricing-meter/pricing-meter.component.spec.ts`: add the three cases named in the Done-when list, using the same event and plan values the cases at lines 71 and 78 use. Find the profit % value as the `.fin-value` inside the `.fin-metric` whose `.fin-label` holds the `profit_pct` text (or the key itself when the spec stubs translation).

### Should Have (P1)
- none

### Nice to Have (P2)
- none

## UI/UX Notes
- RTL: the numbers keep `dir="ltr"`; the line is a block-end border, so it needs no mirroring.
- No dictionary keys and no icons.

## Atomic Sub-tasks

- [ ] A1: Keep every number of the price bar at a fixed width while digits change — the shared digits class on seven number elements — src/app/pages/menu-intelligence/components/pricing-meter/pricing-meter.component.html
- [ ] A2: Show the amber ready line under the profit percent only when the price meets the target — one class binding on the bar value and one on the phone sheet summary — src/app/pages/menu-intelligence/components/pricing-meter/pricing-meter.component.html
- [ ] A3: Test that the line appears on target, disappears below it, and the digits class is on every number — three cases — src/app/pages/menu-intelligence/components/pricing-meter/pricing-meter.component.spec.ts
- [ ] A4: Run build, lint, the unit tests and the log query, and paste the output lines under Execution Notes

## Technical Considerations
- Dependencies: `.c-num` and `.c-pass-line` (plan 572). If plan 572 is not merged the classes do nothing and the tests still pass, but the line is not visible: that is why `Depends-on: 572`.
- New files needed: none
- Model changes: none
- Backend / API: none
- Auth and validation: none — the money-hidden rule for staff is not touched.
- Security surface: none
- Data / migration: none
- Project checks: log-query item present; no dictionary keys; no icons; no `.scss` edit.

## Out of Scope
- The lamp on other screens (approved recipe, sent supplier order, the event closing dialog). Each gets its own small plan after this one is validated.
- Any change to how the target or the verdict is computed.

## Critical Questions
- none

## Execution Notes
