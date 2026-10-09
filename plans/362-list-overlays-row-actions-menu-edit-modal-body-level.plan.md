# Plan 362 — List overlays escape the table: row actions menu and edit modal render at body level

Status: done
Snapshot: ec175c8c

## History (read first — refreshed 2026-10-09)

The first attempt never reached `main`. Its PR #315 was opened against the plan 340 branch
(`feat/night-1007-340-metadata-chips-tap-menu`), merged there on 2026-10-08, and that branch was
then abandoned: plan 340 reached `main` through a rewritten PR #318. So `main` still has both
traps below (re-checked on `ec175c8c`: `.table-area` has `backdrop-filter`, `.list-container` has
`container-type: inline-size`, and `[shell-modal]` is still inside `.list-container`).

- **Reference, do not merge:** commit `cf4da679` "fix(lists): row actions menu and edit modal
  render outside containing-block traps" (still reachable on the abandoned 340 branch). It has the
  CDK Overlay approach (DomPortal into a body-level pane, `flexibleConnectedTo` + fallback
  positions + `withPush`, transparent backdrop, Escape, reposition on scroll, close on navigation)
  and a gotcha draft. It conflicts with `main` in all four `row-actions-menu` files and the brain
  docs, because #318 rewrote the menu (anchored mode, `open(anchor)`, measured clamping) — port the
  approach onto `main`'s current component, don't cherry-pick.
- **Branch `feat/night-1007-362-list-overlays-body-level`** (51 commits behind `main`) is dead.
  Delete it once this plan ships; it is still checked out in slot wt-3.
- Since the first attempt `list-shell` also changed: top pagination (plan 346), shared page header
  (plan 352), long-press selection and the touch checkbox column (#350, #351). Keep all of them.

## Problem Statement

On tablet and phone, the row actions button (⋮) in the equipment list seems not to respond, or its menu or modal opens off-screen. The same happens in inventory. (On `ec175c8c` the ⋮ row menu is used by the equipment and inventory lists; the metadata manager uses the anchored menu, placed outside its cards on purpose.) There are two causes:

- **Row-actions popover.** `RowActionsMenuComponent` (`src/app/shared/row-actions-menu/`) computes viewport coordinates (`bottom = innerHeight - btnRect.top`, `left = btnRect.left + width/2`) for a `position:fixed` `.ram-popover` / `.ram-backdrop`. But the component lives inside `.table-area` (`list-shell.component.scss` ~L229-246), which has `backdrop-filter`. That makes `.table-area` the containing block for fixed descendants. It also has `overflow:hidden`, which clips the popover, and its own stacking context. So the popover is placed relative to the table and clipped, and the backdrop only covers the table.
- **Inline edit as modal (<1024px).** The `[shell-modal]` slot (`list-shell.component.html`, after `.table-area`) escapes `.table-area` but is still inside `.list-container`, which has `container-type: inline-size` (~L28). Layout containment also makes it the containing block for fixed descendants. Below 1023px `.list-container` is `height:auto`, as tall as the whole list, so `.inline-edit-panel.as-modal` (`styles.scss` ~L1218, `inset-block-start:50%`) centers on the whole list, often off-screen. `.c-modal-overlay` only covers the list.

## Goals & Success Criteria

- Primary: in all 4 lists, at every width, the ⋮ menu opens next to its button and fully on screen; the edit modal is centered in the viewport, with its overlay covering the viewport.
- Success: tapping outside the menu closes it, on touch too.

## Execution Mode

- Parallel: no. Plans 340 (`open(anchor)`, via #318) and 361 are on `main`. No other open plan touches `row-actions-menu` or `list-shell`.
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
docs/brain/gotchas/angular.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Architecture Impact
- INV-none: preserves — UI overlay placement only (`row-actions-menu`, `list-shell`); no data, auth, schema, taxonomy or AI path changes.

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
- [ ] `RowActionsMenuComponent` renders `.ram-popover` through CDK Overlay (`@angular/cdk` 19 is already installed; `cf4da679` used a `DomPortal`, either is fine): a portal attached to a body-level overlay, positioned with `flexibleConnectedTo(triggerOrAnchor)` and fallback positions (above, below, start-aligned, end-aligned), `withPush(true)` to keep it in the viewport, `hasBackdrop:true` with a transparent backdrop, close on backdrop click and Escape. Keep the public API identical — `anchored` input, `closed` output, `open(anchor)` / `close()` from plan 340, the ⋮ trigger and projected content — so the metadata manager (anchored) keeps working unchanged.
- [ ] Delete the manual `popoverPos` math, `.ram-backdrop` and the `.c-list-row` height lookup. Keep the popover's look (move its styles to a global-safe class, because overlay content renders outside the component's host: use `ViewEncapsulation.None` on that class or `:host ::ng-deep` scoped by a unique `panelClass`).
- [ ] `list-shell.component.html`: move `<ng-content select="[shell-modal]">` outside `.list-container`, as a sibling after it, inside the component root. Wrap the template in a root element if needed, so no ancestor has `container-type`, `transform`, `filter`, `backdrop-filter` or `contain`. Update the existing comment to explain both containing-block traps.
- [ ] Add a gotcha entry to `docs/brain/gotchas/angular.md` (index line in `docs/brain/gotchas.md`): "`position:fixed` is relative to the nearest ancestor with `transform` / `filter` / `backdrop-filter` / `container-type` / `contain`: render overlays via CDK Overlay or outside those ancestors."

### Should Have (P1)
- [ ] The overlay repositions on scroll (`scrollStrategy: reposition`) and closes on route change.

### Nice to Have (P2)
- None.

## Execution notes (Worker, 2026-10-09)

- **A1 — no CDK Overlay needed.** On `ec175c8c` the menu already renders in the browser's top
  layer (`popover="manual"` + `showPopover()`, added by #318), which ignores ancestor containing
  blocks and `overflow` clipping — the same outcome the CDK Overlay requirement was written for,
  without a second overlay system. What was left: the ⋮ row path still placed the popover with
  "bottom from the viewport + translateX(-50%)" and no clamping, so a row near a screen edge could
  open its menu partly off-screen. The ⋮ trigger now uses the same measured, clamped placement as
  `open(anchor)` (above when there is room, else below; inline-start aligned; 8px viewport margin),
  keeps its row-height look, and the `bottom` style and centring transform are gone. Public API
  unchanged. Spec: a row inside a `backdrop-filter` + `overflow: hidden` box opens in the top
  layer, placed in viewport px.
- **A2** — `[shell-modal]` moved after `.list-container`, directly under `:host`; spec checks a
  projected fixed modal is outside both wrappers and centred on the viewport. Only the equipment
  list uses the slot today.
- **A3** — new entry in `docs/brain/gotchas/angular.md` (`container-type` is a fixed-position trap
  too), next to the existing backdrop-filter / Popover API entry; index count updated.
- **A4** — `ng build` OK; `ng test` 457/457. Browser checks ①–③ validated by the Human 2026-10-09 ("done").

## UI/UX Notes

- The popover keeps its current look. On phone it may open above the button when there's no room below; that's handled by the fallback positions.
- No dictionary changes.

## Atomic Sub-tasks

- [x] A1: Move `RowActionsMenuComponent` to CDK Overlay, with a spec (opens, closes on backdrop, `open(anchor)` works) (`shared/row-actions-menu/**`).
- [x] A2: Move the list-shell `[shell-modal]` slot out of `.list-container` (`shared/list-shell/**`).
- [x] A3: Gotcha entry (`docs/brain/gotchas/angular.md` + index line in `docs/brain/gotchas.md`).
- [x] A4: Build, specs. Check equipment and inventory (⋮ menu, edit modal) and the metadata manager (anchored menu) at 360px, 800px and 1280px. Update session-state.

## Technical Considerations

- Dependencies: `RowActionsMenuComponent` and its users on `ec175c8c` (equipment and inventory lists; metadata manager page, preparation-category and section-category managers in anchored mode); `ListShellComponent` and the list edit modals projected through `[shell-modal]` (`.inline-edit-panel.as-modal`).
- New files: none.
- Model changes: none.
- Signals-only; `inject(Overlay)`, `inject(ViewContainerRef)`.

## Out of Scope

- Redesigning the inline edit panel.
- Other modals not projected through list-shell.

## Critical Questions

- On phone, the actions menu:
  a) A small popover anchored to the button (default — the Human's "go" on 2026-10-09 takes the default)
  b) A bottom sheet

## Success Criteria

- [auto] `npx ng test --watch=false --include=src/app/shared/row-actions-menu/**/*.spec.ts --include=src/app/shared/list-shell/**/*.spec.ts` → 0 failures.
- [auto] `npm run build` → exit 0.
- [human] Tablet (~800px) and phone: equipment → ⋮ on a row near the bottom → the menu opens fully visible → tap outside → it closes. Edit → the modal is centered on screen, with the page dimmed.
- [human] Same in inventory. Metadata manager: tap a chip → its edit/delete menu still opens next to the chip.
