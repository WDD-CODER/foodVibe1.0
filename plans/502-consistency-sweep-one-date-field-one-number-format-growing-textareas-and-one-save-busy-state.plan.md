# Plan 502 — Consistency sweep: one date field, one number format, growing textareas and one save-busy state

Status: draft
Track: code
Depends-on: 501
Snapshot: 21a2ffe5464ca65b4630ac0bdd5894a160a3cb8f

## Problem Statement
Four small jobs behave differently from screen to screen. Measured against `origin/main` at b6181027 (Human brief 03 parts 2–5; re-check on arrival):
1. **Date field.** `src/app/shared/date-field/` `app-date-field` has 3 users (`deposit-paid-dialog`, `event-stage-bar`, `new-inquiry-dialog`). Native `type="date"` copies remain in `menu-intelligence.page.html:146`, `recipe-book-list.component.html:449` and `:453`, `menu-library-list.component.html:75`. The list filters may need a from / to range variant.
2. **Number display.** Rounding and formatting must come only from `src/app/core/engine/rounding.ts` / the `formatQuantity` pipe (`src/app/core/pipes/format-quantity.pipe.ts`). Templates use Angular `| number` in 16 places and `| formatQuantity` in 7. `toFixed` outside the engine: `ai-menu-modal.component.html:212`, `ai-product-modal.component.html:278`, `recipe-ingredients-table.component.ts:443` (`conversion.service.ts:48` and `export.util.ts:101` are internal maths / export — judge).
3. **Textarea auto-grow.** `src/app/core/directives/textarea-auto-grow.directive.ts` is used in 4 templates (ai-recipe-modal, product-import, recipe-workflow, paste-ingredients-dialog); 15 templates have a `<textarea>`.
4. **Save button while saving.** 7 different flag names (`isSaving_()` 39, `isLoading_()` 14, `isBusy_()` 6, `isSubmitting_()` 5, `isLoading()`, `isSubmitting()`, `isSaving()`). Save actions with no busy flag, so a double click saves twice: `partial-cost-badge`, `inline-rename-field`, `add-equipment-modal`, `quick-edit-product-modal`, `not-closed-dialog`, `deposit-paid-dialog`, `unit-edit-dialog`, `business-settings-tab`, `business-name-form`, `paste-ingredients-dialog` (verify each).

## Goals & Success Criteria
- Primary: one date field, one number-format rule, auto-growing multi-line boxes, and one name and one behaviour for "saving": the save button is disabled with a busy label while saving and enabled again on error.
- Success:
  - [ ] [auto] `grep -rn 'type="date"' src/app --include=*.html` → only `shared/date-field/`.
  - [ ] [auto] `grep -rn "toFixed(" src/app --include=*.html` → no matches.
  - [ ] [auto] Specs pass for: a save button ignores a second click while saving and recovers on error; the date field range variant (if added); `npx ng test --watch=false --browsers=ChromeHeadless` green.
  - [ ] [auto] `node scripts/reuse-lint.mjs --check-registry` exits 0, and `--diff=origin/main` warns on a fixture native `type="date"`.
  - [ ] [auto] `npx ng build` passes; `node scripts/scope-check.mjs --arch --plan=<this plan>` and `--reuse --plan=<this plan>` exit 0; `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
  - [ ] [human] Business settings: double-click Save → one save, the button shows busy while it runs.
  - [ ] [human] Recipe book list: the date filter looks and works like the date field in the event dialogs.
  - [ ] [human] A notes box grows as you type on any screen that has one.

## Execution Mode
- Parallel: no — four items touch the same dialogs and lists.
- Concurrent plans: none (last plan of the batch)
- Isolated DB: no

## Execution Notes
- Source: Human briefs 00 + 03 parts 2–5 (verified against `origin/main` b6181027). `main` is now 21a2ffe5: re-check every claim before editing. This is plan 03b; delete-vs-undo is plan 501. If the four items do not fit one Worker session, stop after the finished items, say which are left, and offer a follow-up plan — never leave a half-done item.
- Run order of the batch: 498 → 499 → 500 → 501 → 502, one at a time.
- Number display: the Worker decides which of `| number` and `| formatQuantity` is the rule for quantity, money and percent, records the decision in Execution Notes, and moves the rest. Anything that changes a displayed value (rounding) must be flagged as a `behaviour:` decision.
- Textarea: consider the same selector trick as select-on-focus (a `textarea` selector) so it cannot be forgotten; list any textarea that must stay fixed-height.
- Save button: a shared directive or a `.c-btn` state is a candidate. `.c-*` engine classes live in `src/styles.scss` only (append-only).
- Hebrew RTL, logical CSS properties only; any new text goes through the dictionary.

## Reuse Check
- Native date inputs replaced by the date field — family: form-field — rung: 1 — why: use `app-date-field` as is where one date is picked
- From / to range variant for the list filters — family: form-field — rung: 2 — why: extend `app-date-field` only if the filters need it
- Number rounding and display — family: helpers — rung: 1 — why: `core/engine/rounding.ts` and `formatQuantity` as they are
- Textarea growing everywhere — family: form-field — rung: 2 — why: extend the existing `textarea-auto-grow` directive's selector
- One saving state for save buttons — family: engine-classes — rung: 2 — why: a button state in `src/styles.scss` plus one signal name; registered as part of the family

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/shared/date-field/**
src/app/core/directives/textarea-auto-grow.directive.ts
src/app/core/directives/textarea-auto-grow.directive.spec.ts
src/app/core/pipes/format-quantity.pipe.ts
src/app/core/pipes/format-quantity.pipe.spec.ts
src/app/core/engine/rounding.ts
src/app/core/engine/rounding.spec.ts
src/app/pages/menu-intelligence/menu-intelligence.page.html
src/app/pages/menu-intelligence/menu-intelligence.page.ts
src/app/pages/menu-intelligence/components/deposit-paid-dialog/**
src/app/pages/menu-intelligence/components/not-closed-dialog/**
src/app/pages/menu-intelligence/components/event-stage-bar/**
src/app/pages/menu-library/components/menu-library-list/**
src/app/pages/menu-library/components/new-inquiry-dialog/**
src/app/pages/recipe-book/components/recipe-book-list/**
src/app/pages/recipe-builder/components/recipe-ingredients-table/**
src/app/pages/recipe-builder/components/paste-ingredients-dialog/**
src/app/pages/recipe-builder/components/recipe-workflow/**
src/app/pages/settings/components/business-settings-tab/**
src/app/pages/settings/components/business-name-form/**
src/app/pages/metadata-manager/components/unit-edit-dialog/**
src/app/shared/ai-menu-modal/**
src/app/shared/ai-product-modal/**
src/app/shared/ai-recipe-modal/**
src/app/shared/partial-cost-badge/**
src/app/shared/inline-rename-field/**
src/app/shared/add-equipment-modal/**
src/app/shared/quick-edit-product-modal/**
src/app/pages/inventory/components/product-import/**
src/styles.scss
scripts/lib/registry-families.mjs
scripts/test/reuse-lint.test.mjs
scripts/test/fixtures/reuse/**
docs/brain/component-families.md
src/app/shared/breadcrumbs.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-1: preserves — client-side screens only, no permission or write-route file is touched.
- INV-2: preserves — no tenancy or master-data change.
- INV-3: preserves — no cascades added or moved.
- INV-4: preserves — no schema change.
- INV-5: preserves — no taxonomy change.
- INV-6: preserves — the AI modals only change number display and the saving state; no AI call path changes.

## Atomic Sub-tasks

- [ ] C1: Check the four lists in the Problem Statement against today's code and record the real ones — native dates, `| number` and `toFixed` uses, textareas, save buttons without a busy flag — this plan file
- [ ] C2: Replace the native date inputs with the shared date field and add a from / to variant only if the list filters need it — recipe-book-list, menu-library-list, menu-intelligence page — src/app/shared/date-field/**, the page folders in scope
- [ ] C3: Show numbers through one rule: pick the pipe for quantity, money and percent, move the other uses onto it and remove `toFixed` in templates — record the rule and any value that changes — src/app/shared/ai-menu-modal/**, src/app/shared/ai-product-modal/**, src/app/pages/recipe-builder/components/recipe-ingredients-table/**
- [ ] C4: Make every multi-line free-text box grow as the user types, and list the ones that stay fixed — extend the directive's selector so it cannot be forgotten — src/app/core/directives/textarea-auto-grow.directive.ts, the templates in scope
- [ ] C5: Give every save button one saving state: disabled with a busy label while it runs, enabled again on error — one signal name and one button state; fix the ten screens without a flag — src/styles.scss, the dialogs and tabs in scope
- [ ] C6: Warn when a native date input, a template `toFixed` or a bare textarea is added, and register the families — `reuse-lint` rules with fixtures; update the `form-field` and `engine-classes` families — scripts/lib/registry-families.mjs, scripts/test/reuse-lint.test.mjs, docs/brain/component-families.md
- [ ] C7: Add specs for the double-click save guard and run the full checks — `ng build`, headless `ng test`, the two greps, reuse-lint, scope-check, log-query; paste the output in Execution Notes — the spec files in scope

## Done when
- [ ] [auto] Every `[auto]` item under Success Criteria passes (output pasted in the Worker's report).
- [ ] [human] The three `[human]` items under Success Criteria pass.
