# Plan 482 — Calm number editing on desktop and an explicit Save for coefficients

Status: done
Track: code
Snapshot: ae9dc090a109e3439974ea782b428f252911e29c

## Problem Statement
Human validation of `mvp-review` on 2026-10-22, check 11 (desktop; mobile passed): editing coefficients
(«מקדמים», metadata manager) on a desktop is very bad — the browser's up/down arrows get stuck and run the number
away, saving is invisible, and clicking the box does not select its text (it does on mobile). The Human asked, for
**every number box on desktop**: (1) hide the native up/down arrows; (2) clicking the box selects all its text, like
mobile. And for the **coefficients card**: (3) no silent save on change — an explicit «שמור» button in the card;
(4) a leave warning when the user leaves the card with unsaved changes.

Verified in code on `origin/mvp-review` (`ae9dc090`):
- Coefficients: `src/app/pages/metadata-manager/components/coefficient-manager/coefficient-manager.component.{ts,html,scss}`
  (mounted at `metadata-manager.page.component.html:151`). Inputs at html:33 and :109 are `type="number"` with
  `appSelectOnFocus` and `(change)="onCoefficientChange(...)"`; ts:54-76 validates, `await taxonomy_.updateByKey(...)`
  and toasts `metadata_updated_success`.
- Runaway arrows: each arrow step fires `change` → PUT → `TaxonomyStore.update`
  (`core/services/taxonomy-store.service.ts:173-184`) replaces the term → the `@for` row re-renders under the mouse →
  Chrome loses the mouseup and keeps stepping → more saves. Self-feeding.
- Working "explicit Save + dirty" model in the same folder: `ai-model-manager.component.ts:44` `isDirty_` and html:73-76.
- Select-all: `core/directives/select-on-focus.directive.ts` (plan 460) selects on `focus` and prevents the first
  `mouseup`. On a desktop mouse click Chromium places the caret during mousedown's default action, after focus, so the
  selection is lost (number inputs also reject `setSelectionRange`). On touch it works.
- Spin arrows: `src/styles.scss` has no global rule; local copies in `shared/counter/counter.component.scss:104-106`,
  `shared/unit-creator/unit-creator.component.scss:39`, `inventory/components/product-form/product-form.component.scss:147-150, 300`,
  `recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.scss:170-173`,
  `menu-intelligence/components/menu-dish-row/menu-dish-row.component.scss:216-220, 283-288`,
  `menu-intelligence/_paper-ui.scss:158-162, 230-234, 711-716`.
- Number boxes without `appSelectOnFocus` (count): cook-view (3), equipment-form (1), equipment-list (1),
  product-form (2 of 7), product-import (2), deposit-paid-dialog (1), event-closing-dialog (3), event-stage-bar (1),
  pricing-meter (4), menu-intelligence.page (1), new-inquiry-dialog (1), baseline-tab (1), business-settings-tab (1),
  supplier-form (2), venue-form (2), ai-product-modal (3), ai-draft-editor (3), partial-cost-badge (1),
  quick-add-product-modal (4), quick-edit-product-panel (1).
- Leave checks to reuse: `core/guards/pending-changes.guard.ts` (`PendingChangesComponent`, `pendingChangesGuard`,
  `ConfirmModalService.openTernary('unsaved_changes_confirm', { saveLabel: 'leave_without_saving', saveButtonLabel: 'save_and_leave' })`),
  `core/utils/unsaved-changes.ts` (455), `core/utils/leave-warning.util.ts` `warnBeforeUnload` (460, reload/tab close).
  The metadata manager lives on route `dashboard` (`app.routes.ts:207-209`, no `canDeactivate`) and is a query-param
  tab (`dashboard.page.ts` `setTab`), so tab switches don't trigger route guards.

## Goals & Success Criteria
- Primary: number boxes on desktop are calm and select-all on click; coefficients save only on «שמור», and leaving with unsaved changes asks first.
- Success:
  - [x] [auto] `npx ng build` passes.
  - [x] [auto] `npx ng test --watch=false` for the changed specs passes: select-on-focus directive selects all after a real mousedown→focus→mouseup order (desktop) and after focus alone (touch); coefficient manager does NOT call `updateByKey` on input/change, enables «שמור» only when a value changed and is valid, saves all changed values on «שמור» and shows the success message once; leaving with changes opens the ternary confirm (save and leave / leave without saving / stay).
  - [x] [auto] One global rule in `src/styles.scss` hides number spin buttons app-wide (`::-webkit-inner-spin-button`/`outer` + `appearance: textfield`); the local copies listed above are removed; `grep -rn "inner-spin-button" src/app` → empty.
  - [x] [auto] Every `input[type=number]` in `src/app/**/*.html` has select-on-focus (the directive's selector covers `input[type=number]`, or the attribute is added) — command + count in the run file.
  - [ ] [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or deferred).
  - [ ] [human] Desktop replay: `/dashboard?tab=metadata` → «מקדמים». No up/down arrows on the number boxes. Click a coefficient: its whole value is selected; type 1.25: nothing is saved yet and a «שמור» button becomes active in the card. Click «שמור»: one success message, the value stays 1.25 after a page reload.
  - [ ] [human] Leave warning replay: change a coefficient, don't save, then (a) click another card on the page, (b) switch to another dashboard tab, (c) click a menu link to another page. Each time a warning asks to save, leave without saving, or stay; «הישאר» keeps your change in the box.
  - [ ] [human] App-wide spot check on desktop: in the product form and a recipe's ingredient quantity, the number boxes have no arrows and clicking selects the whole number.

## Execution Mode
- Parallel: no — conflicts with plan 480 (metadata manager page); run after 480 merges.
- Isolated DB: no

## Execution Notes
- Base branch `origin/mvp-review-fixes`; run mode `docs/mvp/run-mode-review-fixes.md`.
- Leave-warning design (Planner decision): (a) clicking outside the coefficients card while dirty → ternary confirm
  (reuse `ConfirmModalService.openTernary` with the `unsaved_changes_confirm` keys); (b) `DashboardPage.setTab` asks
  the same when the active tab reports unsaved changes (a small `hasRealChanges()` contract the metadata page forwards
  from the coefficient card); (c) route leave → add `canDeactivate: [pendingChangesGuard]` to the existing `dashboard`
  route entry, with `DashboardPage` implementing `PendingChangesComponent` — this edit of an existing `app.routes.ts`
  entry is approved by the Planner for this plan; (d) reload/tab close → `warnBeforeUnload`.
- Mobile behaviour must stay as validated (check 11 mobile passed).

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, `.claude/sessions/**`, `.worktree-*`, and the
append-only hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts` — the
`dashboard` route's `canDeactivate` is explicitly allowed).

```scope
src/app/pages/metadata-manager/components/coefficient-manager/**
src/app/pages/metadata-manager/metadata-manager.page.component.ts
src/app/pages/metadata-manager/metadata-manager.page.component.html
src/app/pages/metadata-manager/metadata-manager.page.component.spec.ts
src/app/pages/dashboard/**
src/app/core/directives/select-on-focus.directive.ts
src/app/core/directives/select-on-focus.directive.spec.ts
src/app/core/guards/pending-changes.guard.ts
src/app/**/*.html
src/app/**/*.scss
src/app/**/*.component.ts
docs/mvp/runs/482.md
src/app/core/guards/pending-changes.guard.spec.ts
src/app/pages/cook-view/cook-view.page.ts
src/app/pages/menu-intelligence/menu-intelligence.page.ts
```
The broad `**/*.html|scss|component.ts` lines are only for (1) removing the local spin-button copies and (2) adding
select-on-focus to number boxes (attribute + import). No other change in those files.

## Read Scope
Entire repo.

## Escalation Protocol
Writing outside the scope block: log path + change + why under `## Decisions`, add it to the scope block, continue.

## Architecture Impact
- INV-1: preserves — same `canEdit(term)` permission on coefficients.
- INV-2, INV-4, INV-5: preserves — no tenancy, schema or taxonomy-kind change.
- INV-3: preserves — coefficients still save through the same `taxonomy_.updateByKey` / server path; only WHEN the save runs changes (on Save instead of on change).
- INV-6: preserves — no AI call; number boxes in AI modals only get spin hiding and select-all.

## Backend Impact
- None. Saving many changed coefficients = one `updateByKey` per changed term, in sequence.

## Step 0 — Reality Check
Find `onCoefficientChange`, `appSelectOnFocus` selector, `pendingChangesGuard`, `PendingChangesComponent`,
`warnBeforeUnload`, `setTab` in `dashboard.page.ts`, the `dashboard` route. Print `ok` / `conflict: <what>`.

## Atomic Sub-tasks
- [x] G1: Global spin-button hiding in `src/styles.scss` (append, unlayered or in the base layer per cssLayer skill); remove the local copies listed above.
- [x] G2: Desktop select-all — fix `SelectOnFocusDirective` so a mouse click selects all (re-select on the first `mouseup` after a fresh focus, or in a rAF after focus), keep touch behaviour; widen its selector to also match `input[type=number]` (preferred over editing ~20 templates) — or add the attribute where the selector can't reach; spec for real event order.
- [x] G3: Coefficients — drafts in a signal map; inputs update the draft only (no save on input/change); «שמור» button in the card (`c-btn-primary`, disabled until dirty and valid, busy while saving) saving changed terms, one success toast; «ביטול» resets drafts (`c-btn-ghost--sm`); a small "unsaved changes" hint like ai-model-manager.
- [x] G4: Leave warning — card click-outside + dashboard tab switch + `canDeactivate` on the dashboard route + `warnBeforeUnload`, all through the existing confirm keys (see Execution Notes).
- [x] G5: Specs (see Done-when).
- [x] V1: Build, tests, desktop browser replay (and a 375 px check that mobile still selects and saves only on «שמור»), write `docs/mvp/runs/482.md`.

## Out of Scope
- Explicit-save for other number screens (only the coefficients card changes its save model).
- Counter component behaviour beyond spin hiding and select-all.
