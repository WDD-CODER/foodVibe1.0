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

- [ ] B1: Write a test that lists SCSS `:disabled` rules for converted controls and fails when the blocked state is not matched — scripts/test/disabled-why-scss.test.mjs
- [ ] B2: Make converted controls look blocked again in every SCSS file that styles them — src/app/**/*.scss
- [ ] B3: Dim a toggle chip whose tick is blocked and show the reason on the chip — src/app/shared/**
- [ ] B4: Group the remaining bare `[disabled]` bindings with a script, convert the clear reasons in scope, list the rest — plans/758-house-style-finishing-pass.plan.md
- [ ] B5: Run every automatic check and paste the outputs under Execution Notes — plans/758-house-style-finishing-pass.plan.md

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
