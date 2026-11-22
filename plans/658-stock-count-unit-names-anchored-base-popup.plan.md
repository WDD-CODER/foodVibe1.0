# Plan 658 — Stock count: unit names in Hebrew, the base amount opens beside its row on every screen

Status: draft
Depends-on: 657
Snapshot: 8aead5dffa9d84b9328d493f0f44ec6c35310ec5

## Problem Statement
Dandan checked plan 657 on 2026-11-22 (main `8aead5df`):

1. **The line shows the unit's English key.** He typed «ארגז עגבניות» and the line read «עגבניות 1 crate». He had
   added the unit himself (key `crate`, Hebrew name «ארגז»). Traced: `stock-count.component.ts:590` builds the line
   text from the raw key (`u.unit ?? u.spokenUnit`); the same raw key is printed in the conflict texts (`:730`,
   `:731`), the base amount (`:456`) and the below-minimum list (`stock-below-minimum.component.ts:31`). The unit chips
   already show the name (`choice.label | translatePipe`), so the name is known in the browser.
2. **③ The phone base-amount popup is a centered card, not a box beside its row.** 657 opens it through
   `app-modal-shell` `[light]`, with a fixed card size. Dandan: the box must be as wide as its content and place itself
   like the nutrition box — right above or below what was tapped, on the side with room. The desktop click popover
   (`toggleBase_`, `:356`) uses `placeInViewport` but with a fixed width and a guessed height
   (`BASE_POP_WIDTH`, `BASE_POP_HEIGHT`), and does not follow a scroll.
3. **The counted checkbox is sized from outside.** 657 sizes `app-list-row-checkbox` from the count page with
   `:host ::ng-deep … !important` (`stock-count.component.scss:114`). Dandan approved moving the size into the shared
   checkbox.

New product default (on 2026-11-22, PR #623): `anchored-popup` — every small floating box is as wide as its content and
opens above or below what was tapped, on the side with room, never cut off, the way the nutrition box does.

## Goals & Success Criteria
**Primary:** every unit on the count reads in Hebrew, and the base amount opens beside its row, sized to its text, on
phone, tablet and desktop alike.

- [auto] `pnpm run test:ci` passes, including
  `src/app/pages/inventory/components/stock-count/stock-count.component.spec.ts`: (a) a draft line with unit key
  `crate` and a saved name «ארגז» reads «עגבניות 1 ארגז»; a unit with no saved name falls back to the key; (b) the
  conflict texts and the base amount show the unit name; (c) at phone, tablet and desktop width a tap on the base
  amount opens the same popover, placed by `placeInViewport` from its measured size (below the row when there is room,
  above it when not), with no `app-modal-shell`; (d) a tap outside the popover or a scroll closes it; a second tap on
  the same control closes it.
- [auto] The same command,
  `src/app/pages/inventory/components/stock-count/stock-below-minimum/stock-below-minimum.component.spec.ts`: the
  below-minimum amount shows the unit name.
- [auto] The same command, `src/app/shared/list-selection/list-row-checkbox.component.spec.ts`: the checkbox box takes
  its size from a `--row-checkbox-size` custom property (default unchanged when it is not set).
- [auto] `grep -c "ng-deep" src/app/pages/inventory/components/stock-count/stock-count.component.scss` prints `0`.
- [auto] `pnpm run build` passes; `pnpm run lint` exits 0; `pnpm run lint:reuse` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] On `/inventory/count` Dandan types «ארגז עגבניות»: the line reads «עגבניות 1 ארגז». On the phone and on the
  laptop he taps a base amount on a row near the top and on a row near the bottom: a box as wide as its text opens
  right under (or over) the row, the page behind stays clear, and a tap outside or a scroll closes it.
- [human] The counted box is still bigger on the laptop than on the phone.

## Execution Mode
- Parallel: no — the same stock count files as 657.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/inventory/components/stock-count/**
src/app/pages/inventory/components/stock-count/stock-count.component.spec.ts
src/app/pages/inventory/components/stock-count/stock-below-minimum/stock-below-minimum.component.spec.ts
src/app/shared/list-selection/list-row-checkbox.component.ts
src/app/shared/list-selection/list-row-checkbox.component.scss
src/app/shared/list-selection/list-row-checkbox.component.spec.ts
src/app/shared/modal-shell/modal-shell.component.ts
src/app/shared/modal-shell/modal-shell.component.html
src/app/shared/modal-shell/modal-shell.component.spec.ts
src/app/core/utils/viewport-placement.util.ts
src/app/core/utils/viewport-placement.util.spec.ts
src/app/pages/breadcrumbs.md
src/app/shared/breadcrumbs.md
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

- INV-6: preserves — no model call changes; only how the browser shows a unit and places a box.

## Reuse Check

- the unit name — family: taxonomy — rung: 1 — why: the existing `TranslationService.translate` on the unit key,
  as the unit chips already do (`translatePipe`).
- the base-amount box on every width — family: helpers — rung: 1 — why: the existing `placeInViewport` from
  `src/app/core/utils/viewport-placement.util.ts`, measured after render and re-placed on resize, as in
  `nutrition-badge.component.ts`; no new popup piece.
- the checkbox size — family: list-page — rung: 2 — why: one `--row-checkbox-size` custom property on the existing
  `app-list-row-checkbox`, set by the count page per breakpoint.
- the base box `.stock-count__base-pop` — family: helpers — rung: 1 — why: the existing 655 popover, now sized by its
  content.

## Defaults

- anchored-popup — applies — how: the base-amount box is measured, takes its content's width (capped by the screen)
  and is placed by `placeInViewport` above or below its row on every width.
- one-breakpoint-set — applies — how: the checkbox sizes use the 656 names; no width typed.
- app-list-container — applies — how: the row stays on one line at every size.
- hints-in-tooltips — exception — why: no dialog explanation is added.
- unit-dropdown-add — exception — why: the unit dropdown is not changed.
- leave-and-return — exception — why: no page change.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As an owner, I want the count to name units the way I named them.
- As an owner, I want the base amount to pop up right next to the row I tapped, as small as its text.

## Functional Requirements

### Must Have (P0)
- [ ] One unit-name helper on the count (key → saved Hebrew name, else the key) used by the draft line text, the
  conflict texts, the base amount and the below-minimum list.
- [ ] The base-amount box: one popover on every width; measured after it renders (its real width and height), width
  `max-content` capped by the screen, placed by `placeInViewport` (prefer below), re-placed on resize; closes on an
  outside tap, a scroll and a second tap on its control; no dimming or blur.
- [ ] The phone path stops using `app-modal-shell` `[light]`. If no other template uses `light`, remove the input and
  its cases from modal-shell (a `behaviour:` note either way).
- [ ] `app-list-row-checkbox` reads `--row-checkbox-size`; the count page sets it per breakpoint; the `::ng-deep`
  rules in stock-count.component.scss are gone.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Show every unit on the count by the name the cook gave it, not its English key — one helper, the line text, conflicts, base amount, below-minimum, the cases — src/app/pages/inventory/components/stock-count/**
- [x] A2: Open the base amount right beside its row, as wide as its text, on every screen — measured placeInViewport popover, outside tap and scroll close it, phone stops using the centered card, the cases — src/app/pages/inventory/components/stock-count/**, src/app/shared/modal-shell/modal-shell.component.ts, src/app/shared/modal-shell/modal-shell.component.html, src/app/shared/modal-shell/modal-shell.component.spec.ts
- [x] A3: Let the shared row checkbox take its size from the page instead of being forced from outside — --row-checkbox-size, the count sets it per breakpoint, ng-deep removed, the cases — src/app/shared/list-selection/list-row-checkbox.component.ts, src/app/shared/list-selection/list-row-checkbox.component.scss, src/app/shared/list-selection/list-row-checkbox.component.spec.ts, src/app/pages/inventory/components/stock-count/**
- [x] A4: Prove it — the Done-when commands in order, registry and breadcrumbs updated — docs/brain/component-families.md, docs/brain/inventory.md, src/app/shared/breadcrumbs.md

## Technical Considerations
- Dependencies: 657 (on main since `ff0f7831`).
- The nutrition box (`nutrition-badge.component.ts:77-106`) is the model: measure the rendered box, then
  `placeInViewport`, re-run on scroll/resize. Here a scroll closes the box instead of moving it.

## Out of Scope
- Moving other existing popups onto the `anchored-popup` default (they are held to it when next changed).

## Critical Questions
- none

## Execution Notes
- decided: one popover for all widths — why: Dandan, "placed according to the same behavior of the nutrition" box.
- decided: the checkbox size moves into the shared checkbox now — why: Dandan approved it on 2026-11-22 and it is the
  same file as A2.
- behaviour: the base box lost its close (x) button — an outside tap, a scroll or a second tap on its control closes it — reverse: add the button back in the template
- behaviour: the base box is a `popover="manual"` (top layer) so no ancestor re-bases its fixed position (found by the above-the-control test) — reverse: drop the attribute and the showPopover call
- removes: `app-modal-shell [light]` input, its CSS hook in the shell, and the shell's light spec (no template uses it now) — reverse: git revert this plan's commit
- seen: src/styles.scss:687 — `.c-modal-overlay--light` is now unused; styles.scss is append-only for this plan, so it was left in place
