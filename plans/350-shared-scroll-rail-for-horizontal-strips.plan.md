# Plan 350 — Shared scroll rail for horizontal strips

Status: draft
Snapshot: acab8cff39fd0240f67af00439a8bd044c23889e

## Problem Statement

Horizontal scrolling strips are hand-built in several places, each slightly different:

- **Metadata jump-nav** (`metadata-manager.page.component.html:~6`, `.mm-jump-nav-row`): its own prev/next arrows with `canScrollNavPrev_` / `canScrollNavNext_` and `scrollJumpNav()` (`metadata-manager.page.component.ts:149-171`).
- **Tab-chips row** (the `.c-tab-chips` engine, `styles.scss:~887`): `overflow-x:auto` on phone, with a snap and mask but no arrows, so users can't tell there's more.
- **Menu dish row data strip** (`menu-dish-row.component.html:~81`, `.dish-data`): scroll-snap x mandatory, no affordance.
- **`.m-scroll` utility** (`styles.scss:~1756`): styles only.

Dandan asked for one professional, reusable component for every carousel-like strip in the app. The column carousel was handled in Plan 349; this one covers the scroll-based strips.

## Goals & Success Criteria

- Primary: one `app-scroll-rail` component: a horizontal scroll strip with snap, RTL-correct arrows that appear only when there's more to scroll, and an edge fade.
- Primary: metadata jump-nav, tab chips and the dish data strip use it.
- Success: the hand-rolled scroll-arrow logic in metadata-manager is deleted.

## Execution Mode

- Parallel: yes
- Concurrent plans: run after the Header plan and the Metadata plan (Plan 340; shared files). Nothing else may touch tab-chips, metadata-manager or menu-dish-row at the same time.
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/shared/scroll-rail/**
src/app/core/components/tab-chips/**
src/app/pages/metadata-manager/metadata-manager.page.component.*
src/app/pages/menu-intelligence/components/menu-dish-row/**
```

`src/styles.scss`: this plan edits the `.c-tab-chips` phone overflow rules (the scroller moves into the rail). That's an approved exception for that rule.

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch), then STOP for a go before
touching any milestone.

## User Stories

- As a chef, when a row of chips or data is wider than my screen, I want to see that there's more and scroll it with a tap or a swipe.

## Functional Requirements

### Must Have (P0)
- [ ] `src/app/shared/scroll-rail/scroll-rail.component.{ts,html,scss}` (`app-scroll-rail`):
  - Projects content into a scroller (`overflow-x:auto`, `scroll-snap-type:x proximity`, hidden scrollbar, `overscroll-behavior-x:contain`).
  - Inputs: `snap` (`'none'|'proximity'|'mandatory'`, default `proximity`), `arrows` (`'auto'|'always'|'never'`, default `auto`), `step` (px or `'page'`, default `page` = 80% of the width).
  - Arrow visibility from `canPrev_` / `canNext_` signals, updated on scroll, resize (`ResizeObserver`) and content change. RTL-safe: normalize `scrollLeft` for `dir=rtl` (negative `scrollLeft` in Chrome, Firefox and Safari).
  - Edge fade mask only on the side that can scroll.
  - Arrows are buttons with aria-labels; keyboard focusable.
- [ ] Migrations:
  - Metadata jump-nav → `<app-scroll-rail>`. Delete `canScrollNavPrev_`, `canScrollNavNext_`, `scrollJumpNav` and their arrow markup and styles.
  - Tab chips → wrap the chip list in `<app-scroll-rail snap="proximity">`. Keep `.c-tab-chips` for spacing and centering on wide screens (centered when it fits).
  - menu-dish-row `.dish-data` → `<app-scroll-rail snap="mandatory" arrows="auto">`.
- [ ] Unit spec: arrows hidden when the content fits, shown when it overflows, RTL normalization.
- [ ] Fix the tab-chips overflow bug: `.c-tab-chips` keeps `justify-content:center` while overflowing on phone, which pushes the first chip off-screen where it can't be reached. Use `justify-content: safe center` (fallback `flex-start` at ≤767px).
- [ ] Metadata jump-nav (desktop and below): restyle it on the rail so the section chips are clearly readable and the arrows are visible. It's the "options carousel" Dandan flagged as looking poor.

### Should Have (P1)
- [ ] Desktop: vertical mouse wheel over the rail scrolls horizontally only when the content overflows and the shift key isn't held.

### Nice to Have (P2)
- None.

## UI/UX Notes

- Arrow buttons: 28px circle, glass background, Lucide chevrons. Hidden with `visibility` (no layout shift).
- New dictionary keys: `scroll_prev` = "הקודם", `scroll_next` = "הבא" (only if missing).

## Atomic Sub-tasks

- [x] A1: `app-scroll-rail` component plus its spec (`src/app/shared/scroll-rail/**`).
- [x] A2: Migrate the metadata jump-nav; delete the old logic (`metadata-manager.page.component.*`).
- [x] A3: Migrate tab chips; adjust the `.c-tab-chips` rules (`core/components/tab-chips/**`, `src/styles.scss`).
- [x] A4: Migrate the dish data strip (`menu-dish-row/**`).
- [ ] A5: Build and run specs. Check at 360px and 1280px in RTL. Update the session-state file.

## Technical Considerations

- Dependencies: `TabChipsComponent`, `MetadataManagerPageComponent`, `MenuDishRowComponent`.
- New files: `shared/scroll-rail/*` plus its spec.
- Model changes: none.
- Signals-only; `inject()`; no `any`.

## Out of Scope

- The dashboard recent-activity changes strip (it's redesigned in Plan 351).
- The column carousel (Plan 349).
- Vertical scrollers (`scrollIndicators` directive stays as it is).

## Critical Questions

1. Tab chips on desktop when they fit:
   - a) Centered, no arrows (default)
   - b) Start-aligned

## Success Criteria

- [auto] `rg -n "canScrollNavPrev_|canScrollNavNext_|scrollJumpNav" src/app` → no matches.
- [auto] `npx ng test --watch=false --include=src/app/shared/scroll-rail/**/*.spec.ts --include=src/app/core/components/tab-chips/**/*.spec.ts --include=src/app/pages/metadata-manager/**/*.spec.ts` → 0 failures.
- [auto] `npm run build` → exit 0.
- [human] Phone: the metadata jump-nav shows an arrow only on the side with more content, and tapping it scrolls. The dashboard tab chips do the same when they overflow. In a menu, the dish data strip swipes and snaps, with arrows when it overflows.
- [human] Desktop: tab chips are centered with no arrows.
- [human] On a phone, the dashboard chip row scrolls and its first chip is reachable.
