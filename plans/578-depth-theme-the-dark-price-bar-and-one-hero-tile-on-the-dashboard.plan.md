# Plan 578 — Depth theme: the dark price bar and one hero tile on the dashboard

Status: draft
Depends-on: 573, 577
Snapshot: 5e9247bc3ed5ed2beeb061d926550d87998f5227

## Problem Statement
The Depth direction Dandan chose on 2026-11-11 has two signature pieces that tokens alone cannot give (plan 577 does
the tokens): the event's price bar as a dark teal bar that floats over the page, and one large dark tile on the
dashboard that leads the eye, with the other tiles smaller. Today the price bar is a pale glass strip, and the
dashboard's five performance cards are all the same size and weight.

Verified on `orch/pass-theme` after merging `origin/main` (2026-11-11):
- `src/app/pages/menu-intelligence/components/pricing-meter/pricing-meter.component.scss`: `.pricing-meter` (the fixed bar) has `background: var(--bg-glass-strong)`, `border-block-start: 1px solid var(--border-default)`, `box-shadow: var(--shadow-nav)`, `backdrop-filter: var(--blur-glass)`. Inside it: `.fin-label` (`color: var(--color-text-muted)`), `.fin-value` (`color: var(--color-text-main)`), `.fin-value--bad` and `.verdict.bad` (`var(--color-danger)`), `.verdict.ok` (`var(--color-success-emphasis)`), `.margin-hint` (`var(--color-text-secondary)`), `.partial-reasons` (`var(--text-warning)`), `.targets-toggle`. The same `#meterBody` template is also rendered inside the phone sheet (`<app-modal-shell [sheet]="true">` → `.sheet-body`), which is a light surface, so dark-bar colours must apply only under `.pricing-meter`.
- Plan 573 put `c-num` on the numbers and `[class.c-pass-line]` on the profit %; plan 577 adds the tokens `--bg-bar`, `--border-bar`, `--color-on-bar`, `--color-on-bar-muted`, `--color-on-bar-bad`.
- `src/app/pages/dashboard/components/business-performance/business-performance.component.html`: `<article class="perf-card c-glass-panel" [attr.data-testid]="'stat-' + card.key">` inside `<div class="perf__cards">`, one per card; keys in order: `inquiries`, `closed`, `revenue`, `accuracy`, `usage` (`business-performance.component.ts:69-107`). Inside: `.perf-card__icon`, `.perf-card__label`, `.perf-card__value`, `.perf-card__note`, `.perf-card__change` (`.is-good` / `.is-bad`).
- `business-performance.component.scss`: `.perf__cards` is `grid-template-columns: repeat(5, minmax(0, 1fr))` and `repeat(3, …)` at `max-width: $break-desktop`; `.perf-card` sets padding only.
- `business-performance.component.spec.ts` has the case `'asks for 30 days first and shows five cards'` (line 102).

## Goals & Success Criteria
**Primary:** the price bar reads as a dark teal bar with light text and the amber line, and the dashboard's revenue
card is one large dark tile ahead of four smaller white ones.

- [auto] `pnpm run test:ci` passes, including two new cases in `src/app/pages/dashboard/components/business-performance/business-performance.component.spec.ts`: the card `[data-testid="stat-revenue"]` has the class `perf-card--hero`; no other `.perf-card` has it.
- [auto] `pnpm run build` passes, with no new `anyComponentStyle` budget warning for the two component style files.
- [auto] `pnpm run lint` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] On an event screen (laptop width) the price bar is dark teal, every label and number on it is easy to read, the amber line shows under the profit % when the price meets the target, and the input boxes on the bar are still clearly boxes.
- [human] On a phone, the pricing sheet (opened with the coins button) is still light and readable.
- [human] On the dashboard the revenue card is the large dark tile and comes first; the other four are smaller and white; on a phone the cards stack and nothing is cut.

## Execution Mode
- Parallel: no — plan 573 and plan 570 touch the same price bar; plan 577 must be merged first.
- Concurrent plans: none that edit the pricing meter or the business-performance component.
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/menu-intelligence/components/pricing-meter/pricing-meter.component.scss
src/app/pages/dashboard/components/business-performance/business-performance.component.html
src/app/pages/dashboard/components/business-performance/business-performance.component.scss
src/app/pages/dashboard/components/business-performance/business-performance.component.spec.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves — two component style files and one class binding; who sees money (INV-1) is untouched: the `@if (!isMoneyHidden_())` wrapper of the price bar and the owner check of the performance card are not edited.

## Reuse Check

- none — no new component, util, pipe, service or `.c-*` class; the styles use the tokens of plan 577.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef pricing an event, I want the price bar to stand apart from the menu so that the money is always the clearest thing on the screen.
- As an owner opening the dashboard, I want the month's revenue to be the first thing I see.

## Functional Requirements

### Must Have (P0)
- [ ] `pricing-meter.component.scss`, rule `.pricing-meter`: `background: var(--bg-bar);`, `color: var(--color-on-bar);`, `border-block-start: 1px solid var(--border-bar);`, `box-shadow: var(--shadow-card);`; keep `backdrop-filter: var(--blur-glass)` and the position, size and padding lines.
- [ ] `pricing-meter.component.scss`: add rules nested under `.pricing-meter` only (so the phone sheet keeps its light colours): `.fin-label { color: var(--color-on-bar-muted); }` · `.fin-value { color: var(--color-on-bar); }` · `.fin-value--bad, .verdict.bad { color: var(--color-on-bar-bad); }` · `.verdict.ok { color: var(--color-primary-light); }` · `.margin-hint { color: var(--color-on-bar-muted); }` · `.partial-reasons { color: var(--color-lamp); }` · `.targets-toggle { background: var(--bg-pure); }` · `.field-error { color: var(--color-on-bar-bad); }`. The input boxes keep their own engine look (`.c-input-wrapper`, white when focused); set `.meter-field .c-input-wrapper { background: var(--bg-pure); }` under `.pricing-meter` so they stay light boxes on the dark bar, and keep `input { color: var(--color-text-main); }`.
- [ ] No change to `pricing-meter.component.html` or `.ts`.
- [ ] `business-performance.component.html`: on the `<article class="perf-card c-glass-panel" …>` add `[class.perf-card--hero]="card.key === 'revenue'"`. Nothing else in the template changes.
- [ ] `business-performance.component.scss`:
  - `.perf__cards`: `grid-template-columns: repeat(6, minmax(0, 1fr));` on the widest layout (the 3-column rule at `max-width: $break-desktop` and any narrower rule stay as they are).
  - new `.perf-card.perf-card--hero` (two classes, so it wins over `.c-glass-panel`): `order: -1; grid-column: span 2; justify-content: space-between; background: var(--color-primary-hover); color: var(--color-on-bar); border-color: transparent; box-shadow: var(--shadow-card); padding-block: var(--space-5); padding-inline: var(--space-6);` and inside it `.perf-card__label { color: var(--color-on-bar-muted); }` · `.perf-card__value { color: var(--color-on-bar); font-size: var(--fs-3xl); }` · `.perf-card__note { color: var(--color-on-bar-muted); }` · `.perf-card__icon { background: var(--border-bar); color: var(--color-on-bar); }` · `.perf-card__change.is-good { color: var(--color-primary-light); }` · `.perf-card__change.is-bad { color: var(--color-on-bar-bad); }`.
  - at the width where `.perf__cards` becomes one column (if such a rule exists in the file), the hero is `grid-column: auto`.
  - five-group property order, tokens and logical properties only (`.claude/skills/cssLayer/SKILL.md`).
- [ ] `business-performance.component.spec.ts`: add the two cases named in the Done-when list next to the case at line 102, using that case's setup.

### Should Have (P1)
- none

### Nice to Have (P2)
- none

## UI/UX Notes
- RTL: `order: -1` puts the hero first in reading order (at the right in Hebrew).
- No dictionary keys and no icons.
- White on `--color-primary-hover` (`#115e59`) has a contrast of about 7.6:1; `--color-on-bar-muted` (`#cfe9e5`) on it about 6:1.

## Atomic Sub-tasks

- [ ] A1: Make the price bar a dark teal bar with light text that stays readable — bar surface and the colours of everything on it, scoped so the phone sheet stays light — src/app/pages/menu-intelligence/components/pricing-meter/pricing-meter.component.scss
- [ ] A2: Make the month's revenue the one large dark tile that leads the dashboard — one class binding, the six-column grid and the hero rules — src/app/pages/dashboard/components/business-performance/business-performance.component.html, src/app/pages/dashboard/components/business-performance/business-performance.component.scss
- [ ] A3: Test that only the revenue card is the hero — two cases — src/app/pages/dashboard/components/business-performance/business-performance.component.spec.ts
- [ ] A4: Run build, lint, the unit tests and the log query, and paste the output lines under Execution Notes

## Technical Considerations
- Dependencies: tokens `--bg-bar`, `--border-bar`, `--color-on-bar`, `--color-on-bar-muted`, `--color-on-bar-bad` (plan 577); `--color-lamp`, `--color-primary-light`, `--color-primary-hover` (existing).
- New files needed: none
- Model changes: none
- Backend / API: none
- Auth and validation: none
- Security surface: none
- Data / migration: none
- Project checks: log-query item present; no keys, no icons; logical properties; no `.c-*` class defined in a component file.

## Out of Scope
- Changing the price bar's position, height or its phone button (plan 570's clearance stays valid).
- The other dashboard cards (products, recipes, low stock) and the setup checklist.
- A hero tile on other screens.

## Critical Questions
- none

## Execution Notes
- Planner 2026-11-11: design source is the canvas board "ליטוש 2 · עומק", chosen by the Human in chat.
