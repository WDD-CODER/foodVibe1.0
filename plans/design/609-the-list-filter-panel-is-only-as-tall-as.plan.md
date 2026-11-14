# Plan 609 — The list filter panel is only as tall as its content

Status: draft
Track: design
Depends-on: 602, 603
Snapshot: 7c16fc4d620acf269f6d85dafccf9ac1d1e18777
## Problem Statement

The Human reported on 2026-11-14 that the filter panel of the shared list (`app-list-shell`,
`src/app/shared/list-shell/list-shell.component.scss`) is taller than its content needs, with extra space above or
below the filters, at every screen size. The cause is `.panel-content { min-height: 12.5rem; }`: a panel with only a
few filters is stretched to 200px. The Human checked in the browser that `min-height: fit-content` gives the wanted
result.

## Goals & Success Criteria
**Primary:** on every list page and at every width, the filter panel's content area is exactly its filters plus its
padding (0.5rem top, 1rem sides, 1rem bottom), with no extra empty space.

Done when:
- [auto] `pnpm run build` → exit 0
- [auto] `pnpm run test:ci` → exit 0
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries
- [ui] At 1366x768 on `/suppliers/list` signed in, with the filter panel open, the height of `.filter-panel .panel-content` equals the sum of its children's heights plus 24px of padding (±2px) — `e2e/ui/609-1.spec.ts`, screenshot `screens/609-1.png`
- [ui] At 375x812 on `/inventory/list` signed in, after opening the filter panel, the same equality holds (±2px) — `e2e/ui/609-2.spec.ts`, screenshot `screens/609-2.png`
- [human] Open the filters on the inventory, suppliers and venues lists, on a wide and a narrow window: the panel hugs its filters, with no empty band.
- [human] Nothing else moved: the panel still opens and closes with its animation, and long filter lists still scroll.

## Execution Mode

- Parallel: yes, once plans 602 and 603 are on main (both changed this stylesheet).
- Isolated DB: no.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/shared/list-shell/list-shell.component.scss
e2e/ui/609-1.spec.ts
e2e/ui/609-2.spec.ts
```

## Read Scope

Entire repo.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the ## Read-Write Scope above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch), then STOP for a go before
touching any milestone.

## Architecture Impact

- INV-none: preserves — one shared stylesheet. No server, schema, ownership or AI path is touched.

## Reuse Check

- none — a CSS-only change.

## User Stories

- As a chef filtering a list, I want the filter panel to take only the room it needs, so that more of the list stays in view.

## Functional Requirements

### Must Have (P0)
- [ ] `.panel-content`: replace `min-height: 12.5rem` with `min-block-size: fit-content`. This is the Human's tested
  fix, written as a logical property. Keep the padding and the transition.
- [ ] Check the `.filter-panel` rules around it (the phone `max-block-size: 40dvh` and the open/closed states) for any
  other fixed height that adds space:
  - a fixed `block-size` or `min-block-size` on the panel itself becomes `auto`;
  - a `max-block-size` that makes long lists scroll stays.

## Atomic Sub-tasks

- [ ] 609-A1: Let the filter panel shrink to its filters instead of a fixed 200px floor — panel-content min-block-size fit-content, no other fixed height — src/app/shared/list-shell/list-shell.component.scss
- [ ] 609-A2: Prove on desktop and phone that the panel hugs its content — e2e/ui/609-1.spec.ts, e2e/ui/609-2.spec.ts

## Technical Considerations

- Backend / API impact: none. Auth: none. Security surface: none. Data / migration: none.

## Out of Scope

- The filter components inside the panel.

## Critical Questions

none

## Execution Notes

- decision: Human 2026-11-14 — "the filter takes the height it needs for its content and padding, and that's it, on all screens".
