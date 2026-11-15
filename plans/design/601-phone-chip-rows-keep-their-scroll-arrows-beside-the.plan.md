# Plan 601 — Phone chip rows keep their scroll arrows beside the chips, never on top of them

Status: draft
Track: design
Depends-on: none
Snapshot: d8b1f68494302471c8afa1da89e5ea6d3af5e8ef
## Problem Statement

The Style QA run of 2026-11-14 found the same defect on eight pages at 375px: the chip row at the top of the page
(dashboard shortcuts, the front-desk sub-nav on bookings / requests / clients, and the dashboard-group row on trash,
venues, venue-form and platform) is cut off at the screen edge and a round chevron button sits on top of the first or
last chip, hiding its label ("אשפה", "מידע").

Finding ids: V6-7c4c92b2 (dashboard), V6-e7f49c83 (bookings), V6-ccfa41d6 (requests), V6-2e72a8d5 (clients),
V6-4219e534 (trash), V6-6c7a55b5 (venues), V6-22155513 and V6-98e5dcf2 (venue-form), V6-c8136f01 (platform — the
QA user lands on the dashboard row there).

Root cause: every one of these rows is `app-tab-chips` (`src/app/core/components/tab-chips/`), which puts the chips in
the shared `app-scroll-rail` (`src/app/shared/scroll-rail/`). The rail's arrows (`.sr-arrow`) are `position: absolute`
at the rail's inline edges (`inset-inline-start/end: calc(-1 * var(--rail-arrow-offset, 0px))`), and the scroller
(`.sr-scroller`) fills the whole rail width with no room kept for them. With the default offset of 0 the 1.75rem
arrow is painted straight over the chip at that edge, and the 24px edge fade sits under the arrow, so the half-faded
chip looks cut and covered. Fixing the rail once fixes every page.

## Goals & Success Criteria
**Primary:** at 375px, whenever a scroll-rail row overflows, each visible arrow sits in its own space beside the chips,
no chip is drawn under an arrow, and the row (arrows included) stays inside the screen.

Done when:
- [auto] `pnpm run build` → exit 0
- [auto] `pnpm run test:ci` → exit 0
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries
- [ui] At 375x812 on `/dashboard` signed in, `.c-tab-chips .sr-arrow--next` is visible, its bounding box does not
  overlap the `.c-tab-chips .sr-scroller` bounding box, and both boxes lie between x=0 and x=375 —
  `e2e/ui/601-1.spec.ts`, screenshot `screens/601-1.png`
- [ui] At 375x812 on `/bookings` signed in, after scrolling `.c-tab-chips .sr-scroller` to its far end, the
  knowledge chip (`.c-tab-chips a[href="/frontdesk/knowledge"]`) lies fully inside the `.sr-scroller` box and inside
  the viewport, and its box does not overlap `.c-tab-chips .sr-arrow--prev` — `e2e/ui/601-2.spec.ts`, screenshot
  `screens/601-2.png`
- [human] On a phone (or a 375px window) the top chip row on dashboard, bookings and venues reads cleanly: the arrow
  sits next to the chips, every chip label you can see is readable, and the row fades out before the arrow.
- [human] Nothing else moved: on desktop the chip rows look the same as before (centered, no arrows), and on a phone the
  metadata jump bar, the settings tabs, the event stage bar and the menu dish row still scroll with their arrows.

## Execution Mode

- Parallel: yes — no open plan or the unmerged `orch/run-597` branch writes the scroll rail.
- Isolated DB: no.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/shared/scroll-rail/scroll-rail.component.ts
src/app/shared/scroll-rail/scroll-rail.component.scss
src/app/shared/scroll-rail/scroll-rail.component.spec.ts
e2e/ui/601-1.spec.ts
e2e/ui/601-2.spec.ts
```

## Read Scope

Entire repo.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the ## Read-Write Scope above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-6: preserves — no AI call; "scroll-rail" only matches the `*ai*` glob by its name
- INV-none: preserves — a layout change inside the shared scroll-rail component (one host class, its stylesheet and
  spec); no server, schema, ownership, taxonomy or AI path is touched, and no invariant `Touches` glob matches.

## Reuse Check

- none — no new component, util, pipe, service or `.c-*` class; the fix lives inside the existing `app-scroll-rail`
  (the horizontal-strip family), so every rail in the app gets it.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch), then STOP for a go before
touching any milestone.

## User Stories

- As a chef on my phone, I want to read every chip in the row at the top of the page and see clearly that there is
  more to scroll, so that I can reach trash, info or venues without guessing what is under the arrow.

## Functional Requirements

### Must Have (P0)
- [ ] `scroll-rail.component.ts`: add `protected readonly overflowing = computed(() => this.canPrev_() || this.canNext_())`
  and bind it on the host: `host: { class: 'scroll-rail', '[class.is-overflowing]': 'overflowing()' }`. No other logic
  changes (`update()`, `scrollByStep()`, `centerChild()`, `onWheel()`, the fade signals stay as they are).
- [ ] `scroll-rail.component.scss`, on `:host`, add two private custom properties:
  `--sr-arrow-size: 1.75rem;` and
  `--sr-arrow-room: max(0px, calc(var(--sr-arrow-size) + var(--rail-arrow-gap, 0.25rem) - var(--rail-arrow-offset, 0px)));`
  Do not declare a default for `--rail-arrow-offset` on `:host` (consumers such as `.mm-jump-nav` set it on the same
  element).
- [ ] Add `:host(.is-overflowing) { padding-inline: var(--sr-arrow-room); }` — when the row overflows, room for one
  arrow is kept on both inline sides (a hidden arrow keeps its room, so nothing jumps while scrolling; the room only
  changes when the row starts or stops overflowing, i.e. on resize or content change).
- [ ] `.sr-arrow`: use `inline-size: var(--sr-arrow-size); block-size: var(--sr-arrow-size);` instead of the literal
  `1.75rem`. Keep `position: absolute` and the existing `inset-inline-start/end: calc(-1 * var(--rail-arrow-offset, 0px))`
  on `.sr-arrow--prev` / `.sr-arrow--next` — an absolute child is placed against the host's padding box, so with
  offset 0 the arrow now sits inside the new padding, beside the scroller.
- [ ] The rail where an arrow sits outside the bar (`.mm-jump-nav`, `--rail-arrow-offset: 2.25rem` above 430px)
  gets `--sr-arrow-room` = 0 (the `max(0px, …)`), so the metadata jump bar is unchanged there; at ≤430px (offset 0)
  it gains the same room as every other rail.
- [ ] The edge fade (`--sr-fade-left/right`, 24px) stays inside `.sr-scroller`, so the chip that runs off the scroller
  fades out next to the arrow instead of under it.
- [ ] Logical properties only (`padding-inline`, `inline-size`, `block-size`, `inset-inline-*`).

### Should Have (P1)
- [ ] `scroll-rail.component.spec.ts`: add two cases to the existing host (300px wrapper): with 2 items the host has no
  `is-overflowing` class; with 8 items (after `refresh()`) the host has `is-overflowing` and the `.sr-arrow--next`
  bounding rect does not intersect the `.sr-scroller` bounding rect (RTL; next arrow is on the left).

## UI/UX Notes

- RTL: the "next" arrow is on the left (inline-end), the "prev" arrow on the right (inline-start); the room is
  symmetric, so direction needs no special case.
- At the start of an overflowing row the first chip begins one arrow's width (≈2rem) in from the edge, because the
  hidden "prev" arrow keeps its room. That is deliberate: it stops the row jumping sideways when the first scroll
  reveals the "prev" arrow.
- Desktop rows that fit never get `is-overflowing`, so they stay centered (`safe center`) exactly as today.

## Atomic Sub-tasks

- [x] 601-A1: Mark a scroll rail as overflowing so its stylesheet can keep room for the arrows — is-overflowing host class from canPrev_/canNext_ — src/app/shared/scroll-rail/scroll-rail.component.ts
- [x] 601-A2: Keep an arrow's width free on each side of an overflowing rail so no chip sits under an arrow — --sr-arrow-size, --sr-arrow-room, :host(.is-overflowing) padding-inline — src/app/shared/scroll-rail/scroll-rail.component.scss
- [x] 601-A3: Cover the overflowing class and the arrow-beside-not-over geometry in the rail's unit test — two new cases — src/app/shared/scroll-rail/scroll-rail.component.spec.ts
- [x] 601-A4: Prove at 375px on dashboard and bookings that arrows sit beside the chips and the last chip is readable — e2e/ui/601-1.spec.ts, e2e/ui/601-2.spec.ts

## Technical Considerations

- Consumers of the rail: `tab-chips` (all eight findings), `metadata-manager` jump nav, `settings` tabs,
  `event-stage-bar`, `menu-dish-row`. All use `arrows="auto"` (the default); none uses `arrows="always"`, so the
  overflow class matches exactly when arrows can appear.
- No oscillation: room is added only when the content already overflows, and adding room only narrows the scroller,
  so the row can never stop overflowing because of it.
- `tab-chips`'s `scrollChipIntoView` (`inline: 'nearest'`) now lands the tapped chip inside the scroller box, clear of
  the arrows, with no change to that component.
- e2e 601-2: scroll to the end with `scroller.evaluate(el => { el.scrollLeft = -el.scrollWidth })` (RTL), then wait for
  `.sr-arrow--next` to get `is-hidden` before measuring. Specs sign in with `signInQa` from `e2e/helpers/qa-session.ts`
  and use `test.use({ viewport: { width: 375, height: 812 } })`, like `e2e/ui/586-1.spec.ts`.
- Overlap with the unmerged `orch/run-597` branch: none — it does not touch `src/app/shared/scroll-rail/**` or
  `tab-chips`.
- Backend / API impact: none. Auth: none. Security surface: none. Data / migration: none.

## Out of Scope

- The phone bottom bar (plan 597) and the hero button (plan 598).
- Changing which chips a row shows, their order, or their labels.
- Making rows wrap instead of scroll.
- `arrows="always"` behaviour (no consumer uses it).

## Critical Questions

none

## Execution Notes
- pnpm run build → exit 0; pnpm run lint → exit 0; pnpm run test:ci → exit 0 (2176 SUCCESS)
- [ui] 601-1, 601-2: written, not run
