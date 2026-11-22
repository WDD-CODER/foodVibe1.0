# Plan 659 — Stock count: the base-amount box opens over its own icon, on hover above phone width

Status: draft
Depends-on: 658
Snapshot: 5b82258e

## Problem Statement
Dandan checked plan 658 on 2026-11-22 (run branch `orch/mod-count-popup` at `6080ed9e`). ①, ③ and ④ passed;
② failed twice:

1. **The box opens on the wrong side.** Its height is right, but it sits away from the ⓘ icon, toward the other side
   of the screen (his screenshot: the icon is at the left of the unit, the box opens to the right of the counter).
   Traced: `.stock-count__base-pop` is a `popover="manual"` box. The browser's popover style gives it `inset: 0`. The
   page sets `inset-inline-end: auto`, which in RTL clears `left`, not `right`. So `right: 0` stays, and with both
   `left` (inline style from `placeInViewport`) and `right` set, an RTL box drops `left` and sticks to the right edge
   (`stock-count.component.scss:131-133`).
2. **Above phone width it must open on hover, not click.** Plan 655's wording: the base amount shows on hover or tap;
   only a phone opens it by tap. 658 made every width open it by click (`toggleBase_`, the ⓘ button at
   `stock-count.component.html:231-243`), and the native `title` hover text still shows as well.

## Goals & Success Criteria
**Primary:** the box opens centred over its own ⓘ icon, above or below it, by hover on tablet and desktop and by tap
on a phone.

- [auto] `pnpm run test:ci` passes, including
  `src/app/pages/inventory/components/stock-count/stock-count.component.spec.ts`: (a) in an RTL page the opened box
  has a computed `right` of `auto` and its `left` equals the value `placeInViewport` returned; (b) at tablet and desktop
  width `mouseenter` (and `focus`) on the ⓘ control opens the box and `mouseleave` (and `blur`) closes it; a click
  does not toggle it; (c) at phone width a tap opens it and a tap outside, a scroll or a second tap closes it (658's
  cases kept); (d) the ⓘ control has no `title` attribute (its `aria-label` stays).
- [auto] `pnpm run build` passes; `pnpm run lint` exits 0; `pnpm run lint:reuse` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] On `/inventory/count` at full width Dandan rests the mouse on a row's ⓘ: the box opens right above or below
  that icon, not on the other side; moving away closes it. At the narrowest width a tap opens it beside the icon.

## Execution Mode
- Parallel: no — the same file as 658.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/inventory/components/stock-count/**
src/app/pages/inventory/components/stock-count/stock-count.component.spec.ts
src/app/pages/breadcrumbs.md
docs/brain/component-families.md
docs/brain/inventory.md
docs/workflow-kit/manifest.json
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-6: preserves — no model call changes; only where a box opens and what opens it.

## Reuse Check

- the box placement — family: helpers — rung: 1 — why: the existing `placeInViewport`; only the box's inset is fixed.
- the hover open — family: helpers — rung: 1 — why: the same `basePopover_` state and placement, opened by
  mouseenter/focus instead of click above phone width.

## Defaults

- anchored-popup — applies — how: the box sits over its own ⓘ, placed by `placeInViewport`, the browser's popover
  inset cleared on both inline sides.
- one-breakpoint-set — applies — how: hover vs tap is chosen by the existing `phone_` (PHONE_QUERY) signal.
- empty-state-on-list — exception — why: no list content changes.
- loading-and-error-states — exception — why: no loading changes.
- hints-in-tooltips — exception — why: no dialog explanation is added.
- leave-and-return — exception — why: no page change.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As an owner at a laptop, I want to rest the mouse on ⓘ and see the base amount right there.
- As an owner on a phone, I want to tap ⓘ and see it beside the icon.

## Functional Requirements

### Must Have (P0)
- [ ] `.stock-count__base-pop` clears the popover inset on both inline sides (`inset-inline: auto`), so only the
  component's `top`/`left` place it, in RTL and LTR.
- [ ] Tablet and desktop: mouseenter/focus on ⓘ opens the box, mouseleave/blur closes it; click does nothing extra.
- [ ] Phone: tap opens; outside tap, scroll or second tap closes (as 658).
- [ ] The ⓘ control drops its `title` (the box replaces the native hover text); `aria-label` stays.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Make the base-amount box open over its own icon instead of the far side — clear both inline insets, the RTL case — src/app/pages/inventory/components/stock-count/**
- [ ] A2: Open the box on hover above phone width and on tap only on a phone — mouseenter/focus vs tap, drop the native title, the cases — src/app/pages/inventory/components/stock-count/**
- [ ] A3: Prove it — the Done-when commands in order — docs/brain/inventory.md

## Technical Considerations
- Dependencies: 658 (runs on `orch/mod-count-popup`, the same run branch).

## Out of Scope
- Other popovers.

## Critical Questions
- none

## Execution Notes
- decided: hover above phone width — why: Dandan, "the base unit was supposed to show the popup on hover and only in
  mobile by click".
