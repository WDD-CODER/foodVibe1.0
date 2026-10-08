# Plan 362 — List overlays escape the table: row actions menu and edit modal render at body level

Status: draft
Snapshot: b776163f43fd1db42a5e0501b3a0e5c30b0bded1

## Problem Statement

On tablet and phone, the row actions button (⋮) in the equipment list seems not to respond, or its menu or modal opens off-screen. The same happens in inventory, suppliers and recipe-book. There are two causes:

- **Row-actions popover.** `RowActionsMenuComponent` (`src/app/shared/row-actions-menu/`) computes viewport coordinates (`bottom = innerHeight - btnRect.top`, `left = btnRect.left + width/2`) for a `position:fixed` `.ram-popover` / `.ram-backdrop`. But the component lives inside `.table-area` (`list-shell.component.scss` ~L229-246), which has `backdrop-filter`. That makes `.table-area` the containing block for fixed descendants. It also has `overflow:hidden`, which clips the popover, and its own stacking context. So the popover is placed relative to the table and clipped, and the backdrop only covers the table.
- **Inline edit as modal (<1024px).** The `[shell-modal]` slot (`list-shell.component.html`, after `.table-area`) escapes `.table-area` but is still inside `.list-container`, which has `container-type: inline-size` (~L28). Layout containment also makes it the containing block for fixed descendants. Below 1023px `.list-container` is `height:auto`, as tall as the whole list, so `.inline-edit-panel.as-modal` (`styles.scss` ~L1218, `inset-block-start:50%`) centers on the whole list, often off-screen. `.c-modal-overlay` only covers the list.

## Goals & Success Criteria

- Primary: in all 4 lists, at every width, the ⋮ menu opens next to its button and fully on screen; the edit modal is centered in the viewport, with its overlay covering the viewport.
- Success: tapping outside the menu closes it, on touch too.

## Execution Mode

- Parallel: no. Run after plan 340 (it adds `open(anchor)` to `RowActionsMenuComponent`) and after plan 361 (Lists quick fixes, list-shell).
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/shared/row-actions-menu/**
src/app/shared/list-shell/**
docs/brain/gotchas.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the ## Read-Write Scope above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch), then STOP for a go before
touching any milestone.

## User Stories

As a chef on a tablet, I want the row actions menu and the edit window to open where I can see and use them.

## Functional Requirements

### Must Have (P0)
- [x] `RowActionsMenuComponent` renders `.ram-popover` through CDK Overlay (`@angular/cdk` 19 is already installed): a `TemplatePortal` attached to a body-level overlay, positioned with `flexibleConnectedTo(triggerOrAnchor)` and fallback positions (above, below, start-aligned, end-aligned), `withPush(true)` to keep it in the viewport, `hasBackdrop:true` with a transparent backdrop, close on backdrop click and Escape. Keep the public API identical, including `open(anchor)` / `close()` from plan 340, plus the ⋮ trigger and projected content.
- [x] Delete the manual `popoverPos` math, `.ram-backdrop` and the `.c-list-row` height lookup. Keep the popover's look (move its styles to a global-safe class, because overlay content renders outside the component's host: use `ViewEncapsulation.None` on that class or `:host ::ng-deep` scoped by a unique `panelClass`).
- [x] `list-shell.component.html`: move `<ng-content select="[shell-modal]">` outside `.list-container`, as a sibling after it, inside the component root. Wrap the template in a root element if needed, so no ancestor has `container-type`, `transform`, `filter`, `backdrop-filter` or `contain`. Update the existing comment to explain both containing-block traps.
- [x] Add a gotcha entry to `docs/brain/gotchas.md`: "`position:fixed` is relative to the nearest ancestor with `transform` / `filter` / `backdrop-filter` / `container-type` / `contain`: render overlays via CDK Overlay or outside those ancestors."

### Should Have (P1)
- [x] The overlay repositions on scroll (`scrollStrategy: reposition`) and closes on route change.

### Nice to Have (P2)
- None.

## UI/UX Notes

- The popover keeps its current look. On phone it may open above the button when there's no room below; that's handled by the fallback positions.
- No dictionary changes.

## Atomic Sub-tasks

- [x] A1: Move `RowActionsMenuComponent` to CDK Overlay, with a spec (opens, closes on backdrop, `open(anchor)` works) (`shared/row-actions-menu/**`).
- [x] A2: Move the list-shell `[shell-modal]` slot out of `.list-container` (`shared/list-shell/**`).
- [x] A3: Gotcha entry (`docs/brain/gotchas.md`).
- [ ] A4: Build, specs. Check inventory, recipe-book, suppliers and equipment at 360px, 800px and 1280px. Update session-state.

## Technical Considerations

- Dependencies: `RowActionsMenuComponent` and its users (inventory, recipe-book, suppliers, equipment, and metadata after plan 340); `ListShellComponent` and the 4 list modals (`.inline-edit-panel.as-modal`).
- New files: none.
- Model changes: none.
- Signals-only; `inject(Overlay)`, `inject(ViewContainerRef)`.

## Out of Scope

- Redesigning the inline edit panel.
- Other modals not projected through list-shell.

## Critical Questions

- On phone, the actions menu:
  a) A small popover anchored to the button (default)
  b) A bottom sheet

## Success Criteria

- [auto] `npx ng test --watch=false --include=src/app/shared/row-actions-menu/**/*.spec.ts --include=src/app/shared/list-shell/**/*.spec.ts` → 0 failures.
- [auto] `npm run build` → exit 0.
- [human] Tablet (~800px) and phone: equipment → ⋮ on a row near the bottom → the menu opens fully visible → tap outside → it closes. Edit → the modal is centered on screen, with the page dimmed.
- [human] Same in inventory, suppliers and recipe-book.
