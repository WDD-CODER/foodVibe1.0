# Plan 460 — Share popover placement, number focus, textarea growth, leave guard and modal backdrop

Status: draft
Track: code
Snapshot: b7d21fb021191304a54e3d351bb595e648d73dfa

## Problem Statement
Five shared-UI problems from the Human's validation of branch `mvp` (handoff A4–A8, `docs/mvp/review-handoff-2026-10-21.md`). Causes below were found by reading code on `mvp`; none was reproduced in a browser.
1. **A4 — the «חלקי» popover opens partly off-screen.** `partial-cost-badge.component.scss:13-52` places the popover with `position: absolute; inset-inline-start: 0` under its chip and a width of `min(22rem, 100vw - 2rem)`; nothing measures the viewport, so a chip near the left edge pushes it out. On phones it switches to `position: fixed` (scss:46-51), which is wrong whenever an ancestor has `backdrop-filter` (glass panels do; the fixed box then sizes against the panel). The nutrition popover solved this: `nutrition-badge.component.ts:104-140` (`place_`) renders in the browser top layer (`popover="manual"`) and clamps against the viewport. `row-actions-menu.component.ts:92-125` (`placeNextTo`) holds a third copy of the same idea. Fix: lift the maths into one helper and use it in both badges.
2. **A5 — number boxes.** `SelectOnFocusDirective` (`core/directives/select-on-focus.directive.ts`) only calls `select()` in a `focus` listener. Browsers place the caret on the pointer's `mouseup` right after focus, which cancels the selection (suspected, not reproduced), so a tapped value is not replaced. The directive is also missing on the coefficient boxes (`coefficient-manager.component.html` lines 22, 63, 96) and on two product-form boxes: the purchase quantity `conversionRate` (`product-form.component.html:139`) and the special price `priceOverride` (line 177).
3. **A6 — paste boxes do not grow.** A `textareaAutoGrow` directive already exists (`core/directives/textarea-auto-grow.directive.ts`, used only by `recipe-workflow.component.html:30`); it resizes on `input`/`change` only, so a programmatic value change (clearing a box, setting text after a parse) leaves the old height, and it leaves `overflow-y: auto` so an inner scrollbar can appear. The import paste box (`product-import.component.html:19`), the ingredient paste dialog (`paste-ingredients-dialog.component.html:14`) and the AI recipe window's text/paste box (`ai-recipe-modal.component.html:21`/`168`) do not use it.
4. **A7 — no reusable leave warning.** Verified: `pendingChangesGuard` (`core/guards/pending-changes.guard.ts`) already shows the confirm modal (`unsaved_changes_confirm`, `leave_without_saving`, `save_and_leave` exist in `dictionary.json`) for routes with `canDeactivate` — product form, recipe builder, venues, suppliers, equipment, menus. It is not on `inventory/import` (`app.routes.ts:73-76`) or `settings` (`app.routes.ts:213-217`), it has no spec, and nothing warns on browser reload or tab close (no `beforeunload` anywhere in `src/app`). Fix here is the API only; wiring the two pages belongs to plans 464 (import page) and 469 (opening-details form).
5. **A8 — «פנייה חדשה» backdrop is a grey rectangle.** Verified in code: `<app-new-inquiry-dialog>` is rendered inside `.menu-library-container` (`menu-library-list.component.html:198-200`, inside the root div opened at line 1), and that container has `backdrop-filter` (`menu-library-list.component.scss:26-27`). A `backdrop-filter` makes an element the containing block for `position: fixed` descendants, so `.c-modal-overlay { position: fixed; inset: 0 }` (`src/styles.scss:646-655`) covers only the container's rectangle. The shared modal shell is fine; the placement of the dialog in this template is the cause. Page ancestors checked: `menu-library.page.scss` has no filter/transform.

## Goals & Success Criteria
- Primary: floating panels stay inside the screen through one shared helper; number boxes select their value when tapped; paste boxes grow with their text; a reusable leave warning exists with tests; the inquiry modal covers the whole page.
- Success:
  - [ ] [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `deferred: local MongoDB down` per run mode).
  - [ ] [auto] `npx ng build` passes.
  - [ ] [auto] `npx ng test --watch=false` passes for these specs, new or extended: `viewport-placement.util.spec.ts` (flips above/below, clamps left/right/top/bottom, caps height, anchor centre for the arrow), `partial-cost-badge.component.spec.ts` (popover in the top layer, `style.left`/`top` inside the viewport for a chip at the left edge), `nutrition-badge.component.spec.ts` (still green after using the helper), `select-on-focus.directive.spec.ts` (focus selects; the next `mouseup` is default-prevented once; number inputs do not throw), new `textarea-auto-grow.directive.spec.ts` (height follows `scrollHeight` after input and after a programmatic value change; `overflow-y` hidden), new `pending-changes.guard.spec.ts` (no changes → true without a modal; dirty → modal; confirm → true; cancel → false; ternary save path), new `leave-warning.util.spec.ts` (`beforeunload` prevented only while dirty, listener removed on destroy), and `menu-library-list.component.spec.ts` (opening the inquiry renders `app-new-inquiry-dialog` outside `.menu-library-container`).
  - [ ] [auto] `git diff --numstat origin/mvp -- src/app/pages/inventory/components/product-form/product-form.component.ts` shows no change (the product form class is growth-frozen; this plan edits only its template).
  - [ ] [human] Open a recipe that has an unlinked ingredient (shows «חלקי»), narrow the window to about 400 px or put the chip at the far left of a row, tap «חלקי» → the whole popover is on screen, none of it cut off at the left or right edge; do the same at desktop width.
  - [ ] [human] In Settings → metadata → «מקדמים», tap a coefficient box that shows 1.5 and type 2 → the box now reads 2 (not 1.52); the same on the product form: add a purchase unit, tap the quantity box holding 5 and type 7 → it reads 7; tick «מחיר רכישה מיוחד» and do the same in the price box. Check once on a phone.
  - [ ] [human] On `/inventory/import` paste a list of 25 lines → the box becomes as tall as the text with no scrollbar inside it; press Clear/replace the text with 2 lines → it shrinks. Do the same in the recipe builder «הדבק מצרכים» and in the AI recipe window's «הדבק מתכון» tab.
  - [ ] [human] In the menu library on a desktop browser press «פנייה חדשה» → the blurred backdrop covers the entire window (header, side areas, everything), the page behind does not move or resize, and the form sits centred on top. Close it with Escape or a click outside.

## Execution Mode
- Parallel: no for the files below that other plans also own (see overlap list in Execution Notes).
- Concurrent plans: 461 (product form template), 464 (import page), 466 (partial-cost popover contents), 467 (menu library/editor), 468 (metadata manager) all edit files named here.
- Isolated DB: no

## Execution Notes
- Base branch `origin/mvp`; merge back into `mvp` only, never `main`. Executed unattended per `docs/mvp/run-mode.md`; [human] items become validation cards in `docs/mvp/runs/460.md`.
- Depends on: 459 (dropdown fixes; none of its files overlap — order only keeps the review simple). Plans 461, 464, 466, 467, 468 and 469 should start after this one merges: 461 edits `product-form.component.html` rows this plan touches in two attributes; 464 edits `product-import.component.html/.ts` (this plan adds one attribute and one import there); 466 changes what the popover lists inside `partial-cost-badge/` and must use the placement from sub-task P2; 467 edits `menu-library-list.component.html`; 468 edits `coefficient-manager.component.html`; 469 wires `pendingChangesGuard` + `warnBeforeUnload` onto the opening-details form and 464 onto the import page.
- This plan provides the guard API only (spec for `pendingChangesGuard`, the `warnBeforeUnload` helper, a documented `hasRealChanges()` contract). It adds no `canDeactivate` entry to `app.routes.ts` and does not change the import or settings pages' logic.
- `product-form.component.ts` is growth-frozen and already imports `SelectOnFocusDirective` (lines 47 and 94), so only the template changes.
- Main has unrelated plans 450–458 (popup shell, search box, chip engine); they are not on `mvp` and this plan does not depend on them.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/utils/viewport-placement.util.ts
src/app/core/utils/viewport-placement.util.spec.ts
src/app/core/utils/leave-warning.util.ts
src/app/core/utils/leave-warning.util.spec.ts
src/app/core/guards/pending-changes.guard.ts
src/app/core/guards/pending-changes.guard.spec.ts
src/app/core/directives/select-on-focus.directive.ts
src/app/core/directives/select-on-focus.directive.spec.ts
src/app/core/directives/textarea-auto-grow.directive.ts
src/app/core/directives/textarea-auto-grow.directive.spec.ts
src/app/shared/nutrition-badge/**
src/app/shared/partial-cost-badge/**
src/app/shared/ai-recipe-modal/ai-recipe-modal.component.html
src/app/shared/ai-recipe-modal/ai-recipe-modal.component.ts
src/app/pages/metadata-manager/components/coefficient-manager/coefficient-manager.component.html
src/app/pages/metadata-manager/components/coefficient-manager/coefficient-manager.component.ts
src/app/pages/inventory/components/product-form/product-form.component.html
src/app/pages/inventory/components/product-import/product-import.component.html
src/app/pages/inventory/components/product-import/product-import.component.ts
src/app/pages/recipe-builder/components/paste-ingredients-dialog/paste-ingredients-dialog.component.html
src/app/pages/recipe-builder/components/paste-ingredients-dialog/paste-ingredients-dialog.component.ts
src/app/pages/menu-library/components/menu-library-list/menu-library-list.component.html
src/app/pages/menu-library/components/menu-library-list/menu-library-list.component.spec.ts
docs/mvp/runs/460.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-3: preserves — `coefficient-manager` gets only an input attribute and an import; no rename, cascade or write logic changes.
- INV-6: preserves — `ai-recipe-modal` gets one textarea attribute and an import; its calls to `server/routes/ai.js` are untouched and no AI call is added.
- INV-none for the rest: preserves — presentation and client guards only; no data, permission, schema or taxonomy path is touched.

## Backend Impact
- Collections affected: none
- New collections: no
- Server changes needed: no

## Step 0 — Reality Check
Runs only when `scope-check.mjs --drift` reports drift. On `origin/mvp` find: `place_` in `nutrition-badge.component.ts`; `.partial-popover` in `partial-cost-badge.component.scss`; `SelectOnFocusDirective`; `textarea[textareaAutoGrow]`; `pendingChangesGuard`; `<app-new-inquiry-dialog` in `menu-library-list.component.html`; `backdrop-filter` on `.menu-library-container`. Print `ok` or `conflict: <what>` per symbol.

## User Stories
- As a chef, I want every popover to open fully on screen so that I can read and use it on my phone.
- As a chef, I want a tapped quantity or price to be replaced by what I type so that I do not end up with 1.52.
- As a chef pasting a long list, I want the box to grow with it so that I can see all of it without scrolling inside the box.
- As a chef, I want a warning before I leave a page with typed work so that I never lose it by accident.
- As a chef, I want the new-inquiry window to dim and blur the whole page so that it clearly sits on top.

## Functional Requirements

### Must Have (P0)
- [ ] One helper decides where a floating panel goes (above/below, clamped to the viewport, capped height, anchor centre) and both the nutrition and the «חלקי» popover use it.
- [ ] The «חלקי» popover renders in the browser top layer, so ancestors with `backdrop-filter`, `transform` or `overflow` cannot shift or clip it.
- [ ] Tapping or tabbing into the named number boxes selects their whole value and the following mouse release does not undo it.
- [ ] The import paste box, the ingredient paste box and the AI recipe text/paste box grow to fit their text with no inner scrollbar, and shrink again.
- [ ] A `pendingChangesGuard` spec and a `warnBeforeUnload` helper exist, documented for the two future users.
- [ ] The inquiry dialog's backdrop covers the whole window.

### Nice to Have (P1)
- [ ] None.

## UI/UX Notes
- The «חלקי» popover keeps its look; on phones it keeps the bottom-sheet look (full width minus `--space-4` margins) — in the top layer `position: fixed` is now measured against the viewport.
- The helper keeps `nutrition-badge` behaviour exactly (prefer above, flip below only when above cannot fit and below is roomier, `GAP`/`MARGIN` 8 px, min height 80 px).
- No new dictionary keys; the guard reuses `unsaved_changes_confirm`, `leave_without_saving`, `save_and_leave`.

## Atomic Sub-tasks
- [ ] P1: Add one shared function that places a floating panel inside the screen — pure function taking the anchor rectangle, the panel size, the viewport size and a preferred side, returning top, left, flipped side, capped height and the anchor centre; copy the arithmetic of `place_` in the nutrition badge and add a spec for flip, clamp on all four edges, tall panel cap, and zero-size anchor — `src/app/core/utils/viewport-placement.util.ts`, `src/app/core/utils/viewport-placement.util.spec.ts`
- [ ] P2: Make the nutrition popover use the shared placement so there is a single copy — replace the arithmetic inside `place_` with a call to the helper, keep the effect, scroll/resize listeners, arrow variable and scroll hints as they are; existing specs must stay green — `src/app/shared/nutrition-badge/nutrition-badge.component.ts`
- [ ] P3: Stop the «חלקי» popover opening off-screen — render the popover with `popover="manual"` (top layer) like the nutrition badge, `showPopover()` when it opens, position it with the helper in an effect that also listens to scroll and resize (capture), honour the existing `placement` input as the preferred side, and on phones keep the full-width bottom sheet by leaving the inline position unset and the fixed-position CSS in place; remove the absolute positioning that is no longer used; add spec cases for a chip at the left edge and at the right edge — `src/app/shared/partial-cost-badge/partial-cost-badge.component.ts`, `src/app/shared/partial-cost-badge/partial-cost-badge.component.html`, `src/app/shared/partial-cost-badge/partial-cost-badge.component.scss`, `src/app/shared/partial-cost-badge/partial-cost-badge.component.spec.ts`
- [ ] P4: Make a tapped number box select its whole value for real — in the select-on-focus directive switch to `inject(ElementRef)`, select on focus (use `select()`, then `setSelectionRange(0, length)` only for text-like types, inside try/catch because number inputs throw), and prevent default on the first `mouseup` after a focus so the browser does not drop the selection; spec both behaviours — `src/app/core/directives/select-on-focus.directive.ts`, `src/app/core/directives/select-on-focus.directive.spec.ts`
- [ ] P5: Apply the number-box behaviour to the coefficient boxes — add `SelectOnFocus` to the three coefficient inputs (event type rows, the new-row box, serving type rows) and add the directive to the component imports; the new-row box keeps its starting value 1 (a neutral multiplier, not a quantity) — `src/app/pages/metadata-manager/components/coefficient-manager/coefficient-manager.component.html`, `src/app/pages/metadata-manager/components/coefficient-manager/coefficient-manager.component.ts`
- [ ] P6: Apply the number-box behaviour to the purchase quantity and special price boxes — add `SelectOnFocus` to the `conversionRate` input (line ~139) and the `priceOverride` input (line ~177); template only, the directive is already imported by the component; do not touch the layout of the row (plan 461 owns it) — `src/app/pages/inventory/components/product-form/product-form.component.html`
- [ ] P7: Make the shared auto-grow directive follow every change and never scroll inside — rewrite it with `inject(ElementRef)`, resize on input, on `focus`, on window resize and after view checks when the value changed (covers `[value]` and `ngModel` writes), set `overflow-y: hidden`, keep the 40 px minimum; its one existing user (recipe workflow notes) must look the same; add a new spec — `src/app/core/directives/textarea-auto-grow.directive.ts`, `src/app/core/directives/textarea-auto-grow.directive.spec.ts`
- [ ] P8: Let the import paste box grow with its text — add `textareaAutoGrow` to the `#import-text` textarea and the directive to the component imports; plan 464 owns the rest of this page — `src/app/pages/inventory/components/product-import/product-import.component.html`, `src/app/pages/inventory/components/product-import/product-import.component.ts`
- [ ] P9: Let the ingredient paste box and the recipe paste box grow too — add `textareaAutoGrow` to the textarea in the ingredient paste dialog, and to the text/paste textarea of the AI recipe window (keep its `scrollIndicators`; with growth the indicators simply never show), importing the directive in both components — `src/app/pages/recipe-builder/components/paste-ingredients-dialog/paste-ingredients-dialog.component.html`, `src/app/pages/recipe-builder/components/paste-ingredients-dialog/paste-ingredients-dialog.component.ts`, `src/app/shared/ai-recipe-modal/ai-recipe-modal.component.html`, `src/app/shared/ai-recipe-modal/ai-recipe-modal.component.ts`
- [ ] P10: Cover the existing leave guard with tests and document how a page opts in — new spec using `TestBed.runInInjectionContext` and a spy `ConfirmModalService` for: not dirty → true, `isSubmitted` → true, disabled form → true, dirty binary modal (confirm/cancel), dirty with `saveAndWait` (save succeeds, save fails stays, leave, cancel); extend the `PendingChangesComponent` comment so a form-less page opts in by implementing only `hasRealChanges()` — `src/app/core/guards/pending-changes.guard.ts`, `src/app/core/guards/pending-changes.guard.spec.ts`
- [ ] P11: Add a reload/close-tab warning the pages can switch on — `warnBeforeUnload(isDirty: () => boolean)` called in an injection context: adds a `beforeunload` listener that calls `preventDefault()` and sets `returnValue` only while dirty, and removes itself through `DestroyRef`; spec with a dirty flag and a destroyed fixture — `src/app/core/utils/leave-warning.util.ts`, `src/app/core/utils/leave-warning.util.spec.ts`
- [ ] P12: Make the inquiry window's backdrop cover the whole page — move the `@if (inquiryOpen_())` block with `<app-new-inquiry-dialog>` out of `.menu-library-container` so it is a sibling after it (the component host has no filter), keep the same inputs and outputs; add a spec that opening the dialog renders it outside `.menu-library-container`; leave other modals and the shared overlay engine alone — `src/app/pages/menu-library/components/menu-library-list/menu-library-list.component.html`, `src/app/pages/menu-library/components/menu-library-list/menu-library-list.component.spec.ts`
- [ ] P13: Build, run the specs, write the run file with the validation cards and the list of other modals found inside a `backdrop-filter` container — `npx ng build`, the `ng test` run, `git diff --numstat` for the frozen product-form class, then cards for: popover on screen, number replace, paste growth, backdrop; under Decisions list every `c-modal-overlay` template that sits inside a `backdrop-filter` ancestor (grep, no edits) — `docs/mvp/runs/460.md`

## Technical Considerations
- Dependencies: `ConfirmModalService` (`@services/confirm-modal.service`), the `unsaved_changes_confirm` family of keys, Angular `DestroyRef`.
- New files: `viewport-placement.util.ts`, `leave-warning.util.ts` and four specs (all under `core/`), plus the run file. Helpers go in `core/utils/` with a spec as `docs/mvp/run-mode.md` requires.
- `row-actions-menu.component.ts` (`placeNextTo`, RTL start-aligned) is the third copy of placement code. It aligns to the anchor's inline-start instead of centring, so moving it needs a second mode in the helper; left out to keep this plan small, listed in Out of Scope.
- `popover="manual"` and the top layer are already in use (`nutrition-badge`, `row-actions-menu`), so there is no new browser-support risk.
- The guard (`CanDeactivateFn`) runs only for router navigation; `warnBeforeUnload` covers reload and tab close. A tab switch inside one route (settings tabs) is not a navigation: plan 469 must call the confirm itself for tab changes.
- Directive style: new code uses `inject()` and host bindings, not constructor injection or `@HostListener` (`docs/mvp/run-mode.md`).
- Project checks: log-query [auto]; chef-side stories; no new dictionary keys.

## Out of Scope
- Wiring `pendingChangesGuard` / `warnBeforeUnload` onto `inventory/import` (plan 464) or the opening-details form (plan 469); no change to `app.routes.ts`.
- Making `row-actions-menu` use the helper; any other popover.
- "Start empty, not 0" for number boxes: the new-unit window's `0` start belongs to plan 461 (B3); coefficient boxes keep 1 on purpose.
- Moving other modals that sit inside `backdrop-filter` containers (only listed in the run file).
- What the «חלקי» popover lists or does per row (plan 466).
- Making every `<textarea>` in the app grow (notes boxes, AI prompt boxes other than the recipe window).

## Critical Questions
None.
