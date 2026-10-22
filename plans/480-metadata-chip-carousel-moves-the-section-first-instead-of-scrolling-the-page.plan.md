# Plan 480 — Metadata chip carousel moves the section first instead of scrolling the page

Status: active
Track: code
Snapshot: ae9dc090a109e3439974ea782b428f252911e29c

## Problem Statement
Human validation of `mvp-review` on 2026-10-22, check 8, phone only, `/dashboard?tab=metadata`: on a phone the app
header sits at the bottom. Tapping a category chip scrolls the whole page down to that section, so the chip carousel
is left above, out of view. The Human wants the earlier behaviour back: **no page scroll**; the tapped section's
container becomes the first item in the list, right under the carousel.

Verified in code on `origin/mvp-review` (`ae9dc090`):
- `src/app/pages/metadata-manager/metadata-manager.page.component.ts:169-183` `jumpTo(id, chip)` sets
  `activeSectionId_`, calls `document.getElementById(id)?.scrollIntoView({ block: 'start' })` (181, the page scroll) and
  `jumpRail()?.centerChild(chip)` (182).
- Plan 468 (`eb348446`) replaced the earlier logic: `frontSectionId_` + `bringToFront(id)` + `isFront(id)` +
  `orderFor(id)` (0 for the front section, natural index + 1 otherwise) driving `[style.order]` on every section.
- 468 also added, inside `@media (max-width:1023px)` in `metadata-manager.page.component.scss`, a sticky
  `.mm-jump-nav-row` at `inset-block-start: 3.875rem` (assumes a top header — wrong on phones where the header is at the
  bottom) and `.admin-grid > * { scroll-margin-block-start: 8rem }`.
- `src/app/shared/scroll-rail/scroll-rail.component.ts:115-118` `centerChild()` uses
  `el.scrollIntoView({ inline: 'center', block: 'nearest' })`, which can also move the page vertically.
- Section ids needing `[style.order]` (template lines): unit 23, category 35, allergen 47, label 59, course 72,
  menu-type 83, coefficients 151, staff-stages 153 (new in 477, behind `@if`, already in `_allJumpSections`),
  preparation 155, section 156, station 157, user 159, ai-models 160.

## Goals & Success Criteria
- Primary: tapping a chip never scrolls the page; the tapped section becomes the first card under the carousel.
- Success:
  - [ ] [auto] `npx ng build` passes.
  - [ ] [auto] `npx ng test --watch=false --include=src/app/pages/metadata-manager/metadata-manager.page.component.spec.ts --include=src/app/shared/scroll-rail/scroll-rail.component.spec.ts` passes, with specs flipped: tapping a chip sets that section's `style.order` to 0 and the others to their natural order; no section `scrollIntoView` is called; the tapped chip is `active`; `centerChild` moves only the rail's horizontal scroll (window `scrollY` unchanged).
  - [ ] [human] Replay on a phone (375 px): open `/dashboard?tab=metadata`, scroll to the top, tap a chip far along the carousel (e.g. «תחנות עבודה»). The page does not scroll; that section is now the first card right under the carousel; the carousel stays where it was and the tapped chip is highlighted (and slides toward the middle of the carousel). Tap another chip: same.
  - [ ] [human] Desktop sanity (1440 px): the metadata page looks as before (no chip bar on wide screens, normal card order).

## Execution Mode
- Parallel: no — conflicts with plan 482 (both edit `src/app/pages/metadata-manager/**`); run 480 first, 482 after it merges.
- Isolated DB: no

## Execution Notes
- Base branch `origin/mvp-review-fixes`; run mode `docs/mvp/run-mode-review-fixes.md`.
- This reverses the Human's 2026-10-21 choice in plan 468 G3 (scroll + sticky bar). The Human's 2026-10-22 decision wins.
- Keep the plan-468 Save/Cancel rename (G2), gutters (G1) and users card (G4) untouched.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, `.claude/sessions/**`, `.worktree-*`, and the
append-only hotspots.

```scope
src/app/pages/metadata-manager/metadata-manager.page.component.ts
src/app/pages/metadata-manager/metadata-manager.page.component.html
src/app/pages/metadata-manager/metadata-manager.page.component.scss
src/app/pages/metadata-manager/metadata-manager.page.component.spec.ts
src/app/shared/scroll-rail/**
docs/mvp/runs/480.md
```

## Read Scope
Entire repo.

## Escalation Protocol
Writing outside the scope block: log path + change + why under `## Decisions`, add it to the scope block, continue.

## Architecture Impact
- INV-1, INV-2, INV-4, INV-5: preserves — client layout only.
- INV-3: preserves — no write path changes; only how sections are ordered on screen.
- INV-6: preserves — no AI call added or moved (the AI-models card is only reordered).

## Backend Impact
- None.

## Step 0 — Reality Check
Find `jumpTo`, `activeSectionId_`, `jumpRail`, `centerChild`, `.mm-jump-nav-row` sticky rule and the `scroll-margin`
rule. Print `ok` / `conflict: <what>`.

## Atomic Sub-tasks
- [ ] E1: Restore "bring to front" — replace the page scroll in `jumpTo` with the old ordering (`activeSectionId_` drives `orderFor(id)`: 0 for the active section, natural index + 1 otherwise) and put `[style.order]="orderFor('mm-sec-…')"` back on every section listed above, including staff-stages — page `.ts` / `.html`
- [ ] E2: Keep the chip glide without moving the page — change `ScrollRailComponent.centerChild` to set the rail scroller's horizontal scroll (RTL-safe: compute from `getBoundingClientRect` of rail and child, `scrollBy({ left, behavior })`, `auto` when reduced motion) instead of `scrollIntoView` — `src/app/shared/scroll-rail/scroll-rail.component.ts` + spec. Check the other users of `centerChild` (plan 467 event stage bar) still work.
- [ ] E3: Remove the 468 sticky offset and `scroll-margin` rules that assume a top header — page `.scss`
- [ ] E4: Flip the page specs (no `scrollIntoView`; `style.order` assertions) — page spec
- [ ] V1: Build, tests, browser replay at 375 px and 1440 px, write `docs/mvp/runs/480.md`.

## Out of Scope
- Header position on phones; any other metadata card change.
