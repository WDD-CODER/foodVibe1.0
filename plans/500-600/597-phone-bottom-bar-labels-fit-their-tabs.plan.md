# Plan 597 — Phone bottom bar labels fit their tabs without colliding or clipping

Status: done
Track: design
Depends-on: none
Snapshot: afc44e92a6feab13662761f19e5456c724d13fc3

## Problem Statement

The full Style QA run of 2026-11-14 (25 pages, `.claude/styleqa/report.md` in the run's slot) found the same high-severity
defect on almost every page at 375px: the phone bottom bar (`<nav class="bottom-nav">` in
`src/app/core/components/header/header.component.html`) has six tabs (profile, dashboard, inventory, recipe book, event
menus, clients and bookings) in about 375px. Each tab is `flex: 1` with `white-space: nowrap` and no overflow handling, so:

- "ספר מתכונים" and "תפריטי אירוע" run into each other and read as one string;
- "לקוחות והזמנות" (key `frontdesk_section`) is cut off at the left screen edge;
- the waiting-count chip (`.c-chip__count`) on the clients tab drops onto a second line under the bar.

About 20 of the run's 35 high visual findings are this one defect (finding ids V6-23287705, V6-559c6765, V6-f76af51e …).

## Goals & Success Criteria
**Primary:** at 375px and 320px each bottom-bar tab label is fully inside its own tab, no two labels touch, and nothing is cut by the screen edge. the waiting-count badge sits on the clients tab's icon (top corner), never on a line of its own.

Done when:
- [human] Nothing else moved: tablet and desktop navigation (the top header) is unchanged.
- [auto] `pnpm run build` → exit 0
- [auto] `pnpm run test:ci` → exit 0
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries
- [ui] At 375x812 on `/dashboard` signed in, every `.bottom-nav` label's bounding box lies inside its tab and inside the
  viewport, and no two labels' boxes overlap — `e2e/ui/597-1.spec.ts`, screenshot `screens/597-1.png`
- [ui] At 375x812 on `/dashboard` with at least one waiting request, the clients tab's `.c-chip__count` box overlaps that
  tab's icon box and its top is above the label's top — `e2e/ui/597-2.spec.ts`, screenshot `screens/597-2.png`
- [human] On a phone (or a 375px window) the bottom bar reads cleanly on dashboard, inventory and clients: six short
  labels, the active tab in teal, the badge on the clients icon.

## Execution Mode

- Parallel: yes — no other open plan writes the header component.
- Isolated DB: no.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/components/header/header.component.html
src/app/core/components/header/header.component.scss
src/app/core/components/header/header.component.spec.ts
e2e/ui/597-1.spec.ts
e2e/ui/597-2.spec.ts
```

## Read Scope

Entire repo.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the ## Read-Write Scope above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves — a template and stylesheet change in the header plus three new dictionary keys; no server,
  schema, ownership or AI path is touched.

## Reuse Check

- none — no new component, util, pipe, service or `.c-*` class; the badge keeps the existing `.c-chip__count`, and the
  short labels are translation keys only.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch), then STOP for a go before
touching any milestone.

## User Stories

- As a chef on my phone, I want to read every tab in the bottom bar at a glance so that I tap the right section first time.

## Functional Requirements

### Must Have (P0)
- [ ] Short bottom-bar labels: three new keys in `public/assets/data/dictionary.json`, used only by the bottom bar:
  `nav_short_recipe_book` = "מתכונים", `nav_short_menu_library` = "תפריטים", `nav_short_frontdesk` = "לקוחות".
  The top header keeps `recipe_book`, `menu_library` and `frontdesk_section` as they are.
- [ ] Each bottom-bar label is a `<span class="bottom-nav__label">` with `max-inline-size: 100%`, `overflow: hidden`,
  `text-overflow: ellipsis` (a safety net for long future labels and 320px screens).
- [ ] The clients tab wraps its icon and badge in `<span class="bottom-nav__icon">` (`position: relative`); the badge is
  `position: absolute` on the icon's top inline-end corner, so it never takes a row of its own.
- [ ] Each tab keeps a 44px minimum tap target; `aria-label` on the clients tab still reads the full
  `frontdesk_section` text plus the waiting count (screen readers keep the full name).

### Should Have (P1)
- [ ] The header spec covers: the bottom bar renders the short keys; the clients tab's accessible name is the full
  section name.

## UI/UX Notes

- RTL: "inline-end" is the left side; use logical properties only.
- Font size stays `0.75rem` (`--fs-xs`, the design floor); do not shrink below it to make labels fit.

## Atomic Sub-tasks

- [x] 597-A1: Give the phone bottom bar its own short tab names so six labels fit at 375px — three nav_short_* keys, used only in .bottom-nav — public/assets/data/dictionary.json, src/app/core/components/header/header.component.html
- [x] 597-A2: Keep every bottom-bar label inside its tab and pin the waiting badge to the clients icon — .bottom-nav__label ellipsis, .bottom-nav__icon relative wrapper, absolute badge — src/app/core/components/header/header.component.html, src/app/core/components/header/header.component.scss
- [x] 597-A3: Keep the full clients section name for screen readers and cover it in the header spec — aria-label on the clients tab — src/app/core/components/header/header.component.html, src/app/core/components/header/header.component.spec.ts
- [x] 597-A4: Prove at 375px that labels never overlap or leave the screen and the badge sits on the icon — e2e/ui/597-1.spec.ts, e2e/ui/597-2.spec.ts

## Technical Considerations

- `.bottom-nav` is shown only at `max-width: 620px`; all changes stay inside that media block.
- A waiting request for 597-2: the QA user's local DB normally has one (the run showed a "2" badge); the spec skips with a
  clear message when `.c-chip__count` is absent rather than seeding data.
- Backend / API impact: none. Auth: none. Security surface: none. Data / migration: none.

## Out of Scope

- The top header at tablet and desktop widths.
- Reordering, adding or removing tabs (D58 keeps the bar as it is).
- The other Style QA findings (scroll rail, page header, icons) — separate plans.

## Critical Questions

- Short labels ("מתכונים", "תפריטים", "לקוחות") are the planner's default; the Human may prefer other wording before the
  Worker starts.

## Execution Notes
- pnpm run build -> exit 0; pnpm run lint -> exit 0 (0 errors); pnpm run test:ci -> exit 0, 2175 SUCCESS
- [ui] 597-1, 597-2 written, not run (no running app here)
- The badge's own aria-label moved onto the clients tab's aria-label (full name + waiting count); badge is aria-hidden.
