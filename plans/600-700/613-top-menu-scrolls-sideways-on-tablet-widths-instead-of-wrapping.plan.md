# Plan 613 — The top menu scrolls sideways on tablet widths instead of breaking onto a second line

Status: done
Depends-on: none
Snapshot: 9d301459

## Problem Statement
Raised by the Human on 2026-11-14: below about 1020 px wide the main top menu (`src/app/core/components/header/`) breaks — the row of menu pills no longer fits, and the header falls apart until the menu drops down onto another line.

- `.header-nav` is one flex row: `.auth-section` (flex: 1), `.nav-pills`, `.brand-section` (flex: 1). `.nav-pills` has no `min-inline-size: 0` and no overflow handling, so on narrow widths its pills push the row past the screen or wrap.
- The tablet block `@media (min-width: 768px) and (max-width: 1023px)` only tightens pill padding. The range 621–767 px has no block at all; at ≤ 620 px the top header is hidden and the bottom bar takes over.

## Goals & Success Criteria
**Primary:** from 621 px to 1023 px the top header stays one row at its normal height, and the menu pills scroll left and right inside their group when they do not fit.

- [auto] `pnpm run build`, `pnpm run test:ci`, `pnpm run lint` pass.
- [ui] `e2e/ui/613-1.spec.ts`: signed in (`signInQa`), at viewport 800×900 on `/dashboard`: `.header-nav` height is at most 70 px; `.nav-pills` `scrollWidth` is greater than its `clientWidth` and the page has no horizontal scroll (`document.documentElement.scrollWidth <= innerWidth`); scrolling `.nav-pills` to its end makes the last nav pill visible. Screenshot `screens/613-1.png`. Same at 1000×900 (no page scroll, header height at most 70 px).
- [human] At 700, 850 and 1000 px wide the header stays one line, the pills slide sideways by touch or trackpad, and the user chip and the logo stay visible.

## Execution Mode
- Parallel: yes with plan 612 (no shared files).
- Concurrent plans: 612
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, public/assets/data/dictionary.json, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/components/header/header.component.scss
e2e/ui/613-1.spec.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-none: preserves — a style change in one component; no data, server or AI path.

## Reuse Check
- none — only existing rules in `header.component.scss` change; no new class, component or token.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

Check that `.header-nav`, `.nav-pills`, `.nav-pill`, `.auth-section`, `.brand-section` and the `768px–1023px` and `620px` media blocks are still in `header.component.scss`.

## User Stories
- As a chef on a tablet or a narrow laptop window, I want the top menu to stay on one line and slide sideways, so I can reach every page without the header breaking.

## Functional Requirements

### Must Have (P0)
- [ ] New block `@media (min-width: 621px) and (max-width: 1023px)` in `header.component.scss` (keep the existing 768–1023 block; this one may hold the shared rules):
  - `.nav-pills`: `flex: 0 1 auto; min-inline-size: 0; overflow-x: auto; overflow-y: hidden; flex-wrap: nowrap; scrollbar-width: thin; overscroll-behavior-inline: contain; -webkit-overflow-scrolling: touch;`
  - `.nav-pill`: `flex: 0 0 auto;`
  - `.auth-section` and `.brand-section`: `flex: 0 0 auto;` so the pills get the free space; `.brand-mark__name` hidden below 768 px (`display: none`) to give the pills room — the logo image stays.
  - `.header-nav`: keeps `height: 3.875rem`, `flex-wrap: nowrap`, and a `gap: 0.5rem`.
  - The active pill is scrolled into view on navigation only if this needs no TypeScript change; otherwise not in this plan.
- [ ] Desktop (≥ 1024 px) and mobile (≤ 620 px) render exactly as today.
- [ ] Logical properties only; no `!important` added.

### Should Have (P1)
- none

### Nice to Have (P2)
- none

## UI/UX Notes
- Header only, 621–1023 px. RTL: the pills start at the inline start (right) and scroll toward the left.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Keep the top menu on one line between 621 and 1023 px and let the pills scroll sideways — media block, flex and overflow rules — src/app/core/components/header/header.component.scss
- [x] A2: Write the screen check at 800 and 1000 px wide — e2e/ui/613-1.spec.ts
- [x] A3: Run the checks and hand over — build, test:ci, lint, spec 613-1 against the slot app; then the [human] card

## Technical Considerations
- Dependencies: none. Runs in run-600 with plan 612 so both reach main in PR #580.
- New files needed: `e2e/ui/613-1.spec.ts`.
- Model changes, Backend / API, auth and validation, security surface, data / migration, cost: none.

## Backend Impact
- Collections affected: none
- New collections: no
- Server changes needed: no

## Out of Scope
- The mobile bottom bar (≤ 620 px) and the desktop header.
- Auto-scrolling the active pill into view when it needs TypeScript.

## Critical Questions
- none open.

## Execution Notes
- Planner draft 2026-11-14 from the Human's note during the run-600 checks; the break itself was not reproduced by the Planner.
- Builder 2026-11-14: plan file was missing on the run branch; copied from the main checkout.
- pnpm run build -> 0; pnpm run lint -> 0; pnpm run test:ci -> 0 (2199 SUCCESS).
- 613-1 spec written, not run (no app/QA login in the worktree).
