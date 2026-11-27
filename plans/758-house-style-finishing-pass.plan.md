# Plan 758 — House style: the finishing pass of plan 747 (inactive controls look and read right)

Status: draft
Depends-on: none
Track: code
Snapshot: a5bb9d20

## Problem Statement
Plan 747 round two (branch `fix/house-style-ui-feedback`, now `a5bb9d20` with main merged in) changed 113 bindings from
`[disabled]` to the `appDisabledWhy` directive (`src/app/shared/tooltip/disabled-why.directive.ts`). That directive
keeps a control reachable so its tooltip can show why it cannot be used, which means the control is **no longer natively
`:disabled`**. The finishing pass that should have cleaned up after the swap was stopped half-way on 2026-11-26 (the
day's usage ran out), and its report never arrived. Checked on `a5bb9d20` by the Planner: `ng build` exit 0, `pnpm run
lint` 0 errors, `pnpm run test:ci` 2871/2871, `kit-checks --base origin/orch/house-style-ui` ok; the product, recipe
and supplier lists already use `[ctaDisabledWhy]`; `why_at_min`, `why_at_max`, `why_voice_note_empty` exist in
`dictionary.json`; `node scripts/inventory.mjs --check` ok.

Left, and the subject of this plan:
1. SCSS rules that style a blocked control through `:disabled` no longer match the converted controls, so a blocked
   button may look active. Files with `:disabled` rules today: coefficient-manager, user-management,
   recipe-ingredients-table, recipe-workflow, recipe-builder.page, cook-view.page, dashboard-overview, product-form,
   menu-intelligence `_paper-ui` / `_toolbar`, trash.page, ai-menu-modal (and supplier-picker, recipe-book-list,
   stock-count if they style converted controls).
2. A blocked tick (checkbox) inside a toggle chip: the chip must look dimmed, and hovering or tapping the chip shows
   the reason.
3. The 151 `[disabled]=` bindings still in `src/app/**/*.html` are either a control greyed only while its own action
   runs (the default's exception) or not yet classified; nobody has listed which.

## Goals & Success Criteria
**Primary:** every control the swap converted still looks blocked when it is blocked, and the remaining bare
`[disabled]` bindings are listed and justified.

- [auto] `pnpm run build` exits 0; `pnpm run lint` exits 0.
- [auto] `pnpm run test:ci` exits 0.
- [auto] `node scripts/kit-checks.mjs --base origin/orch/house-style-finish --plan plans/758-house-style-finishing-pass.plan.md` exits 0.
- [auto] `node scripts/inventory.mjs --check` exits 0; `node scripts/breadcrumbs-check.mjs` exits 0.
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/758-house-style-finishing-pass.plan.md` → `ARCH: ok`.
- [auto] `node --test scripts/test/disabled-why-scss.test.mjs` exits 0: for every SCSS file in scope that has a
  `:disabled` selector for a control the swap converted, the same block also matches the directive's blocked state
  (its class or `aria-disabled="true"`, whichever the directive sets).
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `SKIP: no database configured`).
- [human] On «מתכונים» → a recipe → the ingredients table, signed in as a staff user without edit rights: the add and
  remove buttons look grey (not like active buttons), and hovering one shows a tooltip in Hebrew saying why.
- [human] On «ניהול» → coefficients, as a user who cannot edit: the save button looks grey and its tooltip says why.
- [human] On a page with a toggle chip whose tick is blocked (the builder names the page in Execution Notes): the chip
  looks dimmed, and hovering the chip (or tapping it on a phone) shows why.

## Execution Mode
- Parallel: no — one plan.
- Concurrent plans: none in this run.
- Isolated DB: no — nothing is stored.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/**/*.scss
src/app/shared/**
src/app/pages/**/*.html
src/app/pages/**/*.component.ts
src/app/pages/**/*.component.spec.ts
src/app/**/breadcrumbs.md
scripts/test/disabled-why-scss.test.mjs
docs/agent/house-style.md
docs/brain/component-families.md
docs/brain/inventory.md
_shared/debt-baseline.json
src/app/pages/dashboard/dashboard.page.spec.ts
src/app/pages/frontdesk/frontdesk-settings/frontdesk-settings.page.spec.ts
src/app/pages/platform-dashboard/platform-dashboard.page.spec.ts
src/app/pages/recipe-book/recipe-book.page.spec.ts
src/app/pages/settings/settings.page.spec.ts
docs/workflow-kit/manifest.json
```

## Read Scope

Entire repo.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-none: preserves — styling and template classes only; no route, guard, permission, stored data, AI call or CSP
  change. Blocked actions stay blocked by the directive exactly as plan 747 built it.
- INV-3: preserves — the scope reaches metadata-manager templates and styles only; no write path or cross-document
  logic changes.
- INV-6: preserves — the scope reaches `*ai*` component styles and templates (ai-menu-modal) only; no AI call changes.

## Reuse Check
- none — styles follow the existing `appDisabledWhy` directive and `.is-disabled` engine class in `src/styles.scss`; no
  new component, util, service or `.c-*` class.

## Defaults

- disabled-explains-why — applies — how: the appDisabledWhy directive (src/app/shared/tooltip/); this plan makes the
  converted controls look blocked again and lists the remaining bare `[disabled]` bindings.
- confirm-destructive-action — exception — why: no new action.
- empty-state-on-list — exception — why: no list.
- loading-and-error-states — exception — why: no data request.
- unsaved-changes-on-leave — exception — why: no form behaviour changes.
- hints-in-tooltips — applies — how: the reason shows in the shared tooltip (`.c-tooltip`).
- leave-and-return — exception — why: no navigation.
- app-list-container — exception — why: no list.
- one-breakpoint-set — exception — why: no new breakpoint.
- anchored-popup — exception — why: no popup.
- unit-dropdown-add — exception — why: no dropdown.
- row-action-icons — exception — why: no row action added.
- live-summary — exception — why: no summary box.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a staff member, I want a button I cannot use to look unusable and tell me why, so I do not keep pressing it.

## Functional Requirements
- Read `src/app/shared/tooltip/disabled-why.directive.ts` first to see exactly which class or attribute it sets on a
  blocked control; style against that, never against `:disabled` alone.
- For each SCSS `:disabled` rule in scope: when its control was converted to `appDisabledWhy`, extend the selector so
  the blocked state matches too (for example `&:disabled, &.is-disabled`). Leave rules for controls that are still
  natively disabled.
- Toggle chip with a blocked tick: dim the chip itself (the existing `.is-disabled` look) and put the reason on the
  chip so hovering or tapping the chip shows it.
- Classify the 151 remaining `[disabled]=` bindings **with a script, not by reading every file**: a short node script
  (write it to the session scratch, not the repo) greps the templates, groups each condition (own action running:
  `saving`, `sending`, `loading`, `busy`, `isSubmitting`…, versus a reason), and prints the groups. Paste the grouped
  list under Execution Notes. Convert only bindings the script marks as a clear reason **and** that are in files
  already in scope; list the rest for the Planner.

## UI/UX Notes
- Blocked look: the same dimming the app uses today for `.is-disabled` (`src/styles.scss`); no new colour.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] B1: Write a test that lists SCSS `:disabled` rules for converted controls and fails when the blocked state is not matched — scripts/test/disabled-why-scss.test.mjs
- [x] B2: Make converted controls look blocked again in every SCSS file that styles them — src/app/**/*.scss
- [x] B3: Dim a toggle chip whose tick is blocked and show the reason on the chip — src/app/shared/**
- [x] B4: Group the remaining bare `[disabled]` bindings with a script, convert the clear reasons in scope, list the rest — plans/758-house-style-finishing-pass.plan.md
- [x] B5: Run every automatic check and paste the outputs under Execution Notes — plans/758-house-style-finishing-pass.plan.md

## What happens when
- A control is blocked for its own running action (saving): stays a bare `[disabled]` with no tooltip — the default's
  exception.
- A control's SCSS rule is shared by converted and native controls: the extended selector covers both.

## Technical Considerations
- The run branch `orch/house-style-finish` is `fix/house-style-ui-feedback` at `a5bb9d20` (plans 743–747 + main).
  When this plan lands, the Planner fast-forwards `orch/house-style-ui` to it.
- Do not run browser checks; the Human checks the cards.
- Model changes: none. Backend / API: none. Data / migration: none. Security: none.

## Out of Scope
- Giving reasons to the new biz-numbers pages (`/restaurant-menu`, `/restaurant-menu/sales`, `/monthly-plan`); they
  reach main later and get their own pass.
- Any change to the directive's behaviour.

## Critical Questions
- none

## Execution Notes

### B1 — the test
- `scripts/test/disabled-why-scss.test.mjs` (manifest entry added). It reads every template with `[appDisabledWhy]` and
  the component's stylesheet and fails when (1) a `:disabled` rule on such a control has no twin for
  `[aria-disabled='true']` / `.is-disabled`, (2) a `:hover:not(:disabled)` look also reaches a blocked control,
  (3) a rule outside `@layer` sets `cursor` or `opacity` and no blocked rule sets it again.
- Before the fixes: `node --test scripts/test/disabled-why-scss.test.mjs` → exit 1, 12 findings in 7 stylesheets.
  After: exit 0, `pass 4, fail 0`.

### B2 — what still looked usable
- The wip commits had already covered most `:disabled` rules. Fixed here: menu-library-list `.action-btn` (a blocked
  edit / clone / delete button looked fully active, also on hover — it now has the `.c-icon-btn.is-disabled` values),
  recipe-book-list favorite mark, cook-view `.cv-chip` cursor, dashboard-overview `.link-btn` cursor, rating-stars
  cursor, date-field and time-field touch picker cursor.
- Left as native `:disabled` (their controls are still natively disabled): product-form, menu-intelligence
  `_paper-ui` / `_toolbar`, trash.page, ai-menu-modal textarea, export-toolbar-overlay.

### B3 — blocked tick inside a toggle chip
- Already in the branch at `a5bb9d20`, no change needed: `src/styles.scss` `.c-chip--toggle:has(> input.is-disabled)`
  dims the chip; `disabled-why.directive.ts` `applyLabel_()` shows the reason on chip hover, and a tap passes to the
  input, which shows it. Covered by `disabled-why.directive.spec.ts` ("a checkbox inside a label (a toggle chip)") and
  by the last case of the new node test.
- Page for the third [human] card: `/dashboard?tab=metadata` → «סוגי תפריט (Menu Types)», signed in as a user who is
  not an admin, on a shared menu type (lock icon): its field chips are dimmed; hover or tap says why.

### Notes for the [human] cards
- Card 1 cannot be seen as written: the ingredients table has no edit-rights block on add / remove. The only blocked
  controls there are the minus button at 0 («כמות») and the supplier picker without money rights.
  `recipe-ingredients-table.component.html` (`.col-actions` trash button, `.qty-btn.plus`) and
  `recipe-builder.page.html` `.add-row-btn` carry no reason. Not added: this plan changes no permission behaviour.
- Card 2: for a user who cannot edit, the coefficient boxes are blocked, so nothing changes and the save button's
  tooltip reads «אין שינויים לשמור» (`saveWhy_`), not a permission text.

### B4 — the remaining bare `[disabled]` bindings
- Script in the session scratch (not in the repo). Result: every one of the 151 is native-disabled only while an action
  runs, or is a shared control's pass-through of its caller's flag. No binding is a clear reason, so none was converted
  and there is nothing for the Planner to convert. The `busy` flags behind the names were checked in the `.ts` files
  (plain signals / inputs set around a running request).
- Groups (file paths are under `src/app/`, without the `.page.html` / `.component.html` ending):

```text
[disabled]= occurrences in src/app templates: 151; parsed on a tag: 151

## running (84)
- `isSaving_()`: pages/cook-view/cook-view:238, pages/cook-view/cook-view:835, pages/cook-view/cook-view:848 <app-approve-stamp>, pages/dashboard/components/opening-details-banner/opening-details-banner:17, pages/equipment/components/equipment-form/equipment-form:78, pages/frontdesk/frontdesk-onboarding/frontdesk-onboarding:293, pages/frontdesk/frontdesk-settings/frontdesk-settings:322, pages/frontdesk/frontdesk-settings/frontdesk-settings:329, pages/inventory/components/product-form/product-form:428, pages/inventory/components/product-import/product-import:134 <app-invoice-header-strip>, pages/inventory/components/product-import/product-import:180 <input>, pages/inventory/components/product-import/product-import:205 <app-custom-select>, pages/inventory/components/product-import/product-import:218 <input>, pages/inventory/components/product-import/product-import:253 <input>, pages/inventory/components/product-import/product-import:265 <input>, pages/inventory/components/product-import/product-import:285 <input>, pages/inventory/components/product-import/product-import:298 <input>, pages/inventory/components/product-import/product-import:316 <app-custom-select>, pages/inventory/components/product-import/product-import:357, pages/menu-intelligence/menu-intelligence:6, pages/metadata-manager/components/ai-model-manager/ai-model-manager:87, pages/metadata-manager/components/ai-model-manager/ai-model-manager:91, pages/platform-dashboard/components/front-desk-admin-dialog/front-desk-admin-dialog:44, pages/platform-dashboard/components/grant-access-dialog/grant-access-dialog:21, pages/platform-dashboard/components/platform-business-dialog/platform-business-dialog:57 <input>, pages/platform-dashboard/components/platform-business-dialog/platform-business-dialog:168, pages/public-request/public-request:220, pages/recipe-builder/recipe-builder:425, pages/recipe-builder/recipe-builder:436 <app-approve-stamp>, pages/requests/components/new-request-dialog/new-request-dialog:194, pages/settings/components/baseline-tab/baseline-tab:88, pages/settings/components/team-tab/team-tab:42, pages/suppliers/components/supplier-form/supplier-form:52, pages/venues/components/venue-form/venue-form:262, shared/client-form/client-form:102, shared/new-inquiry-dialog/new-inquiry-dialog:86
- `status_() === 'sending'`: shared/ai-menu-modal/ai-menu-modal:39 <textarea>, shared/ai-menu-modal/ai-menu-modal:119 <textarea>, shared/ai-product-modal/ai-product-modal:43 <textarea>, shared/ai-product-modal/ai-product-modal:123, shared/ai-product-modal/ai-product-modal:135, shared/ai-product-modal/ai-product-modal:151 <textarea>, shared/ai-product-modal/ai-product-modal:164 <input>, shared/ai-product-modal/ai-product-modal:190 <input>, shared/ai-recipe-modal/ai-recipe-modal:35 <textarea>
- `isBusy_()`: pages/clients/components/client-profile/client-profile:79, pages/diagnosis/components/diagnosis-workspace/diagnosis-workspace:18, pages/frontdesk/knowledge/knowledge:217, pages/menu-intelligence/components/event-closing-dialog/event-closing-dialog:15, pages/menu-intelligence/components/event-closing-dialog/event-closing-dialog:239, pages/menu-intelligence/components/event-closing-dialog/event-closing-dialog:244, pages/menu-intelligence/components/event-closing-dialog/event-closing-dialog:257
- `busyId_() === b._id`: pages/bookings/bookings:78, pages/bookings/bookings:89, pages/bookings/bookings:100, pages/bookings/bookings:111
- `busy()`: pages/requests/components/request-card/request-card:122, pages/requests/components/request-card/request-card:133, pages/requests/components/request-card/request-card:145, pages/requests/components/request-card/request-card:157
- `busy_() !== null`: pages/frontdesk/frontdesk-settings/components/data-export-card/data-export-card:13, pages/frontdesk/frontdesk-settings/components/data-export-card/data-export-card:23, pages/frontdesk/frontdesk-settings/components/data-export-card/data-export-card:33
- `isParsing_() || isSaving_()`: pages/inventory/components/product-import/product-import:37 <textarea>, pages/inventory/components/product-import/product-import:76, pages/inventory/components/product-import/product-import:86
- `saving()`: pages/metadata-manager/components/logistics-item-manager/logistics-item-manager:224, pages/metadata-manager/components/staff-stages-manager/staff-stages-manager:15 <input>
- `isSubmitting_()`: shared/quick-add-product-modal/quick-add-product-modal:187, shared/quick-edit-product-panel/quick-edit-product-panel:139
- `isSwitching_()`: core/components/acting-banner/acting-banner:14
- `isUploadingImage_()`: core/components/auth-modal/auth-modal:236 <input>
- `isSubmitting() || isUploadingImage_()`: core/components/auth-modal/auth-modal:278
- `isReading_()`: pages/diagnosis/components/diag-menu/diag-menu:43 <textarea>
- `isCreating_()`: pages/frontdesk/frontdesk-settings/frontdesk-settings:67
- `isImporting_()`: pages/frontdesk/knowledge/knowledge:270
- `busy_()`: pages/inventory/components/stock-count/stock-ai-draft/stock-ai-draft:24 <app-voice-note>
- `saving_()`: pages/inventory/components/stock-count/stock-count:154 <app-stock-ai-draft>
- `isUploading(view.key)`: pages/menu-intelligence/components/event-closing-dialog/event-closing-dialog:139 <input>
- `isSaving()`: pages/metadata-manager/components/coefficient-manager/coefficient-manager:125
- `isSaving_() || isErasing_()`: pages/platform-dashboard/components/platform-business-dialog/platform-business-dialog:71
- `isCancelling_()`: pages/public-request/public-request-status/public-request-status:51
- `isLoading()`: pages/trash/trash:3
- `isLocating_()`: pages/venues/components/venue-form/venue-form:68

## running + reason already shown (44)
- `isSaving_()`: pages/diagnosis/components/diag-menu/diag-menu:148, pages/diagnosis/diagnosis:25, pages/menu-intelligence/components/deposit-paid-dialog/deposit-paid-dialog:43, pages/menu-intelligence/components/event-logistics-panel/logistics-note-draft/logistics-note-draft:122, pages/menu-intelligence/components/not-closed-dialog/not-closed-dialog:46, pages/menu-intelligence/components/supplier-orders/supplier-orders:62, pages/menu-intelligence/components/supplier-orders/supplier-orders:80, pages/metadata-manager/components/ai-model-manager/ai-model-manager:80, pages/metadata-manager/components/unit-edit-dialog/unit-edit-dialog:52, pages/platform-dashboard/components/front-desk-admin-dialog/front-desk-admin-dialog:51, pages/platform-dashboard/components/grant-access-dialog/grant-access-dialog:28, pages/platform-dashboard/components/platform-business-dialog/platform-business-dialog:25 <input>, pages/platform-dashboard/components/platform-business-dialog/platform-business-dialog:175, pages/recipe-builder/components/paste-ingredients-dialog/paste-ingredients-dialog:32, pages/settings/components/baseline-tab/baseline-tab:82, pages/settings/components/business-name-form/business-name-form:31, pages/settings/components/business-settings-tab/business-settings-tab:33, shared/inline-rename-field/inline-rename-field:18, shared/unit-creator/unit-creator:76
- `isBusy_()`: pages/clients/components/client-profile/client-profile:267, pages/frontdesk/knowledge/knowledge:59, pages/frontdesk/knowledge/knowledge:70, pages/menu-intelligence/components/event-notes-log/event-notes-log:23, pages/menu-intelligence/components/event-notes-log/event-notes-log:81
- `isLoading_()`: shared/ai-menu-modal/ai-menu-modal:69, shared/ai-menu-modal/ai-menu-modal:149, shared/ai-product-modal/ai-product-modal:73, shared/ai-product-modal/ai-product-modal:225, shared/ai-recipe-modal/ai-recipe-modal:296
- `busy()`: core/components/terms-modal/terms-modal:25
- `isReading_()`: pages/diagnosis/components/diag-menu/diag-menu:52
- `isSavingEdit_()`: pages/equipment/components/equipment-list/equipment-list:289
- `isSendingTest_()`: pages/frontdesk/frontdesk-onboarding/frontdesk-onboarding:306
- `isImporting_()`: pages/frontdesk/knowledge/knowledge:277
- `isParsing_() || isSaving_()`: pages/inventory/components/product-import/product-import:96
- `saveBusy_()`: pages/inventory/components/product-import/product-import:374
- `saving_() || aiBusy_()`: pages/inventory/components/stock-count/stock-count:44
- `isPending(row.key)`: pages/menu-intelligence/components/loading-list/loading-list:51 <input>
- `isSaving()`: pages/metadata-manager/components/coefficient-manager/coefficient-manager:132
- `isErasing_()`: pages/platform-dashboard/components/platform-business-dialog/platform-business-dialog:94
- `uploading_() !== null`: pages/venues/components/venue-detail/venue-detail:186
- `status_() === 'sending'`: shared/ai-recipe-modal/ai-recipe-modal:89
- `savingKey_() !== null`: shared/partial-cost-badge/partial-cost-badge:70
- `isAiLoading_()`: shared/quick-add-product-modal/quick-add-product-modal:41

## pass (17)
- `disabled() && !disabledWhy()`: shared/approve-stamp/approve-stamp:6, shared/counter/counter:6, shared/counter/counter:37, shared/date-field/date-field:18 <input>, shared/date-field/date-field:34 <input>, shared/list-selection/list-row-checkbox:13 <input>, shared/time-field/time-field:17 <input>, shared/time-field/time-field:33 <input>, shared/voice-note/voice-note:8 <textarea>, shared/voice-note/voice-note:24, shared/voice-note/voice-note:52, shared/voice-note/voice-note:61
- `!canEdit() && !disabledWhy()`: shared/supplier-picker/supplier-picker:24, shared/supplier-picker/supplier-picker:44
- `ctaDisabled() && !ctaDisabledWhy()`: shared/empty-state/empty-state:10
- `readonly() && !disabledWhy()`: shared/rating-stars/rating-stars:16
- `!canSend() && !disabledWhy() && !emptyIdle_()`: shared/voice-note/voice-note:83

## input (5)
- `disabled()`: pages/inventory/components/product-import/invoice-header-strip/invoice-header-strip:11 <app-custom-select>, pages/inventory/components/product-import/invoice-header-strip/invoice-header-strip:22 <app-date-field>, pages/inventory/components/product-import/invoice-header-strip/invoice-header-strip:35 <input>
- `disabled`: shared/custom-multi-select/custom-multi-select:30, shared/custom-select/custom-select:57

## reason already shown (appDisabledWhy beside it) (1)
- `disabled() && !open_()`: pages/inventory/components/stock-count/stock-ai-draft/stock-ai-draft:7
```

### B5 — automatic checks (on commit 049d07f2; the node checks rerun after the last commit)
- `node scripts/orch-state.mjs prepare --missing server/generated/schemas --script build:schemas --pm pnpm` → `PREPARE: ok`
- `pnpm run build` → exit 0 (budget warnings only)
- `pnpm run lint` → exit 0, `0 errors, 69 warnings`
- `pnpm run test:ci` → exit 0, `TOTAL: 2871 SUCCESS`
- `kit-manifest-check` (main copy) → exit 0, `453 classified, 0 unclassified`
- scope check (the gate's `scopeCheck`, and `scripts/scope-check.mjs --diff`) → exit 0, `SCOPE: ok`
- `kit-checks` / `inventory --check` → first exit 1 (`inventory-stale`: two defaults added by the main merge were not in
  `docs/brain/inventory.md`); regenerated with `node scripts/inventory.mjs`, then rerun.
- `override-check`, `lint:icons`, `lint:no-native-select`, `plan-ledger-check`, `breadcrumbs-check` → exit 0
- `ci-scope-check --checkout-branch` → exit 0 (`skipped`, branch is not read in this folder)
- `scope-check --arch` → `ARCH: ok INV-none, INV-3, INV-6`
- `node --test scripts/test/disabled-why-scss.test.mjs` → exit 0, `pass 4, fail 0`
- `log-query --since=plan-start --level=error` → `SKIP: no database configured`
