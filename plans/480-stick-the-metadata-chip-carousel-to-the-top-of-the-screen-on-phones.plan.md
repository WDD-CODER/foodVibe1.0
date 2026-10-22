# Plan 480 — Stick the metadata chip carousel to the top of the screen on phones

Status: active
Track: code
Snapshot: ae9dc090a109e3439974ea782b428f252911e29c

## Problem Statement
Human validation of `mvp-review` on 2026-10-22, check 8, `/dashboard?tab=metadata`. Corrected by the Human the same
day: **the scroll behaviour is right** (tap a chip → its section scrolls to the top, the chip glides to the middle of
the carousel). The only problem is on phones: there the app header is no longer at the top (it became the bottom tab
bar), but the carousel still sticks at the old header height, so there is an empty gap between the top of the screen
and the carousel, and sections stop below that gap.

Verified in code on `origin/mvp-review` (`ae9dc090`):
- `src/app/pages/metadata-manager/metadata-manager.page.component.scss:18-28`, inside `@media (max-width: 1023px)`:
  `.mm-jump-nav-row { position: sticky; inset-block-start: 3.875rem; … }`, and `.admin-grid > * { scroll-margin-block-start: 8rem }`
  (same file) — both assume the top header.
- `src/app/core/components/header/header.component.scss:364-388`: at `@media (max-width: 620px)` the whole top bar is
  hidden and a fixed bottom nav (`.bottom-nav`, `bottom: 0`) replaces it. Between 621 and 1023 px (tablet) the top
  header (3.875rem) is still there.

## Goals & Success Criteria
- Primary: on phones (≤ 620 px) the carousel sticks flush to the top of the screen and a tapped section lands right
  under it; tablet and desktop unchanged.
- Success:
  - [ ] [auto] `npx ng build` passes.
  - [ ] [auto] `npx ng test --watch=false --include=src/app/pages/metadata-manager/metadata-manager.page.component.spec.ts` passes (behaviour unchanged).
  - [ ] [human] Phone replay (375 px): open `/dashboard?tab=metadata`, scroll down a little. The chip carousel sits at the very top of the screen with no empty gap above it. Tap a chip (e.g. «תחנות עבודה»): its section scrolls up and its title sits right under the carousel, not hidden behind it and with no big gap; the chip glides to the middle as before.
  - [ ] [human] Tablet sanity (800 px wide): the carousel still sticks just under the top header, not behind it.

## Execution Mode
- Parallel: no — same page as plan 482; run 480 first.
- Isolated DB: no

## Execution Notes
- Base branch `origin/mvp-review-fixes`; run mode `docs/mvp/run-mode-review-fixes.md`.
- Do NOT change `jumpTo`, `centerChild` or the scroll logic — the Human approved it.
- Use the header's own phone breakpoint (620 px); if the project has a shared breakpoint token / mixin for it, use that.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, `.claude/sessions/**`, `.worktree-*`, and the
append-only hotspots.

```scope
src/app/pages/metadata-manager/metadata-manager.page.component.scss
src/app/pages/metadata-manager/metadata-manager.page.component.spec.ts
docs/mvp/runs/480.md
```

## Read Scope
Entire repo.

## Escalation Protocol
Writing outside the scope block: log path + change + why under `## Decisions`, add it to the scope block, continue.

## Architecture Impact
- INV-1, INV-2, INV-4, INV-5: preserves — styling only.
- INV-3: preserves — no write path change.
- INV-6: preserves — no AI call.

## Backend Impact
- None.

## Step 0 — Reality Check
Find `.mm-jump-nav-row` sticky rule and `scroll-margin-block-start` in the page scss; find the 620 px phone block in
`header.component.scss`. Print `ok` / `conflict: <what>`.

## Atomic Sub-tasks
- [ ] E1: At ≤ 620 px set the carousel's sticky offset to 0 (respect `env(safe-area-inset-top)`), and the sections' `scroll-margin-block-start` to the carousel's height plus a small gap; keep 3.875rem / 8rem for 621–1023 px — `metadata-manager.page.component.scss`
- [ ] V1: Build, tests, browser replay at 375 px and 800 px, write `docs/mvp/runs/480.md`.

## Out of Scope
- The scroll / glide logic, header layout, anything else on the metadata page.
