# Plan 481 — Show deleted ingredients as a clear row in the partial-cost window

Status: active
Track: code
Snapshot: ae9dc090a109e3439974ea782b428f252911e29c

## Problem Statement
Human validation of `mvp-review` on 2026-10-22, check 10 (failed): on the menu page, a dish whose recipe uses a product
that was deleted from inventory shows a «חלקי» (partial) tag. Clicking it gives a broken layout: the icon disappears
and the text is dumped in the footer instead of a structured row. Wanted (plan 466): a row with a «נמחק» tag and the
exact text «המוצר נמחק. הסירו אותו מהמתכון או בחרו מוצר אחר.», and no action button.

What the code shows on `origin/mvp-review` (`ae9dc090`), and what is NOT yet known:
- `src/app/shared/partial-cost-badge/partial-cost-badge.component.html` already branches per row: head with name +
  tag (35-42, deleted tag `line_status_deleted` at 39-40), unpriced (46-74), unlinked (75-96), and the final `@else`
  (97-99) `<span class="partial-note">{{ 'partial_deleted_note' }}</span>`. `.partial-tag`
  (`partial-cost-badge.component.scss:115`) is plain amber text, not a pill; there is no per-row icon.
- Rows are built in `partial-cost-badge.component.ts:102-124`; data from `src/app/core/services/recipe-cost.service.ts:131`
  (`{ kind: 'deleted', productId, name: name || ref }` — with no `nameSnapshot` the raw id is shown as the name) and
  `src/app/core/engine/event-plan.engine.ts:211-221, 304-307`.
- Used in `menu-dish-row.component.html:29` (dish row) and `pricing-meter.component.html:122` (fixed footer meter,
  `placement="above"`). The meter also prints partial reasons as text (`pricing-meter.component.ts:67-77`, html 172-179).
- Screenshots `C:\coding projects\Cursor\mvp-review-evidence\466\r2-3-deleted-row-in-menu.png` and `r3-3-…png` show
  two layout faults that likely match the report: in the dish row the «₪0 ⚠ חלקי» chip is drawn under/over the
  absolutely-positioned trash and sell price (`menu-dish-row.component.scss:120, 253`; phone rules from 470 at
  337-390 only below 768 px) — "the icon disappears"; and the popover (top layer, `placeInViewport` ts 292-315) runs
  into the fixed pricing-meter footer, and below 768 px it is a bottom sheet over the footer — "text in the footer".
- NOT verified: which of these the Human saw. The builder MUST reproduce first (desktop and 375 px, dish low and high
  on the page, from the dish row and from the footer meter) and write what it saw before fixing.

## Goals & Success Criteria
- Primary: clicking «חלקי» on a dish with a deleted product shows a clean, readable row: icon, name, red «נמחק» pill,
  the exact note, no button — never hidden behind the footer, never overlapping the dish row's icons.
- Success:
  - [ ] [auto] `npx ng build` passes.
  - [ ] [auto] `npx ng test --watch=false --include=src/app/shared/partial-cost-badge/partial-cost-badge.component.spec.ts --include=src/app/pages/menu-intelligence/components/menu-dish-row/menu-dish-row.component.spec.ts` passes; spec: a deleted row renders an icon, a `נמחק` pill, the `partial_deleted_note` text, and no button; a deleted row with no name shows a readable fallback, not a raw id.
  - [ ] [auto] Reproduction notes (what broke, where, screenshots) written in `docs/mvp/runs/481.md` before the fix.
  - [ ] [human] Replay: make a recipe with a product, put it in a menu, delete that product from inventory, open the menu. On the dish row tap «חלקי»: the window shows a row with an icon, the product name, a red «נמחק» pill and the text «המוצר נמחק. הסירו אותו מהמתכון או בחרו מוצר אחר.», and no button. Nothing is hidden behind the bottom total bar. The dish row's own icons (trash, price) are still visible and not overlapping the «חלקי» tag. Do it on a desktop and on a phone.

## Execution Mode
- Parallel: yes — partial-cost-badge, menu-dish-row and pricing-meter only.
- Isolated DB: no

## Execution Notes
- Base branch `origin/mvp-review-fixes`; run mode `docs/mvp/run-mode-review-fixes.md`.
- Tags use the `.c-chip` engine (`c-chip--red` for «נמחק», amber for unlinked/unpriced) — no page-local chip colours (plan 457).
- Load `.claude/skills/cssLayer/SKILL.md` before SCSS edits (watch the unlayered-reset trap found in plan 479).

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, `.claude/sessions/**`, `.worktree-*`, and the
append-only hotspots.

```scope
src/app/shared/partial-cost-badge/**
src/app/pages/menu-intelligence/components/menu-dish-row/**
src/app/pages/menu-intelligence/components/pricing-meter/**
docs/mvp/runs/481.md
```

## Read Scope
Entire repo.

## Escalation Protocol
Writing outside the scope block: log path + change + why under `## Decisions`, add it to the scope block, continue.

## Architecture Impact
- INV-1..INV-6: preserves — display only; no cost-calculation change.

## Backend Impact
- None.

## Step 0 — Reality Check
Find `rows_`, `placeInViewport`, `partial_deleted_note`, `.partial-tag`, `.dish-remove`, `.dish-sell-price`,
`partialReasons_`. Print `ok` / `conflict: <what>`.

## Atomic Sub-tasks
- [ ] D0: Reproduce in the browser (desktop + 375 px; from the dish row and from the footer meter; dish near the bottom of the page) and write what broke in `docs/mvp/runs/481.md`.
- [ ] D1: Structured rows — every row gets a small Lucide icon per kind (deleted: e.g. `trash-2`/`circle-x`; unlinked: `link-2-off`; unpriced: `tag`), name, and its tag as a `.c-chip` pill (`--red` for deleted); the deleted row shows the note under the name and no button; readable name fallback when only an id is known — `partial-cost-badge.component.html/.ts/.scss` (+ icon registration if the project registers Lucide icons centrally; log it)
- [ ] D2: Keep the window clear of the footer — on desktop flip above / cap height and scroll inside when the space below is smaller than the window; the phone bottom sheet sits above the fixed pricing-meter bar (or the bar hides while it is open) — `partial-cost-badge.component.ts/.scss`, `pricing-meter` if needed
- [ ] D3: Dish row — reserve space so the «חלקי» chip, sell price and trash never overlap on desktop (stop overlaying them absolutely, or pad the row end) — `menu-dish-row.component.scss`
- [ ] D4: Specs (see Done-when).
- [ ] V1: Build, tests, browser replay on desktop and 375 px, write `docs/mvp/runs/481.md`.

## Out of Scope
- Adding a fix action for deleted products (466 decided: no button). Cost engine changes.
