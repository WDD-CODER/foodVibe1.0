# Plan 458 — Make the code follow the hard rules again, one measured rule at a time

Status: draft
Track: code
Depends-on: 450, 451, 452, 453, 454, 455, 456, 457
Snapshot: 34c560fc8db9272f41a85c57c5eb8d3407b3caed

## Problem Statement
Code written before the rules hardened drifts from `AGENTS.md` / `_shared/tech-stack.md`. Counts on `main` before the MVP merge (re-measure in S1):
1. `.c-*` classes defined outside `src/styles.scss` — 14 component SCSS files (equipment-form, equipment-list, inventory-product-list, product-form, user-management, metadata-manager page, recipe-book-list, recipe-ingredients-table, supplier-form, supplier-list, venue-form, ai-draft-editor, confirm-modal, unit-creator).
2. `@layer` missing in 67 of 85 `.scss` files under `src/`.
3. No `ChangeDetectionStrategy.OnPush` on `cook-view.page.ts` (1306 lines) and `recipe-builder.page.ts` (1092 lines) — both growth-frozen.
4. Decorators instead of signal APIs: `@ViewChild`/`@ViewChildren` (12 files) and `@HostListener` (14 sites in 11 files, incl. 6 directives in `src/app/core/directives/`).
5. `*ngIf`/`*ngFor` in `product-form.component.html` (29 uses).
6. Selectors without the `app-` prefix: 8 components (`user-msg`, `inventory-product-list`, `product-form`, `inventory-page`, `recipe-book-list`, `add-equipment-modal`, `add-item-modal`, `translation-key-modal`, `unit-creator-modal`) and 8 attribute directives.
7. Boolean signals/fields not named `is*/has*/can*/should*` (about 66 `signal(true|false)`).
8. Public `input()`s: 171 have no trailing `_`, 2 do — the convention is undocumented.
9. Raw Hebrew in `.ts`/`.html` (about 35 files; many are legitimate canonical data, to be classified in S1).

## Goals & Success Criteria
- Primary: every listed rule is at zero violations (or, for a rule with a documented exception list, at zero unlisted violations), with no behaviour change.
- Success:
  - [ ] [auto] `docs/refactor/runs/458.md` has a baseline count per rule (S1) and a new count after each rule's sub-task; every rule row ends at `0` or `0 + N documented exceptions`.
  - [ ] [auto] `npx ng build` and `npx ng test --watch=false` pass after every sub-task (same pass count as baseline, no new skips).
  - [ ] [auto] `node scripts/scope-check.mjs --plan=458` passes; `git diff --numstat` shows net lines <= 0 for each frozen file (`product-form.component.ts`, `menu-intelligence.page.ts`, `menu-export.service.ts`, `recipe-builder.page.ts`, `cook-view.page.ts`); hotspots only gain lines.
  - [ ] [auto] `node scripts/breadcrumbs-check.mjs` passes (no files moved).
  - [ ] [human] Each touched page opens and works as before — inventory (product form, product list), equipment, suppliers, venues, recipe book, recipe builder, cook view, metadata manager, menu intelligence — and the shared dropdowns/modals (custom select, multi-select, confirm, AI modals) still open, close on Escape and focus their search box. The cards are listed in `docs/refactor/runs/458.md`.

## Execution Mode
- Parallel: no — many sub-tasks touch the same shared components and SCSS files.
- Concurrent plans: none; this plan runs last.
- Isolated DB: no

## Execution Notes
- Depends on: the MVP merge to main (branch `mvp`), then plans 450–457 (reuse layer, modal shell, search combobox, list kit, data-service base, form kit, messages, chip engine) all merged. Several of those plans rewrite files named below (modals, custom-select, product-form, list SCSS), so a rule may already be at zero on arrival — mark that sub-task done with the measured count as evidence.
- Pure refactor: no behaviour, markup output or look changes. Only `.c-*` rules are *moved*, never edited.
- One rule per sub-task, one commit per sub-task; build + tests after each. Never convert two families in one commit.
- Frozen files may only shrink: any line a conversion adds must be paid for in the same file (dead code, an unused import, a removed decorator import).
- Counts come from `node scripts/reuse-lint.mjs` (plan 450) where it covers a rule, otherwise from the exact grep recorded in the run file's "How measured" column — the grep never changes between baseline and later runs.
- A rule is only done at zero; if a sub-task cannot reach zero without leaving scope, record the remainder as `blocked: <path>` and use the Escalation Protocol.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
docs/refactor/runs/458.md
docs/agent/conventions.md
scripts/rule-sweep-count.mjs
src/app/pages/equipment/components/equipment-form/equipment-form.component.scss
src/app/pages/equipment/components/equipment-form/equipment-form.component.ts
src/app/pages/equipment/components/equipment-list/equipment-list.component.scss
src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.scss
src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.ts
src/app/pages/inventory/components/product-form/product-form.component.scss
src/app/pages/inventory/components/product-form/product-form.component.html
src/app/pages/inventory/components/product-form/product-form.component.ts
src/app/pages/inventory/inventory.page.ts
src/app/pages/inventory/inventory.page.html
src/app/pages/metadata-manager/components/user-management/user-management.component.scss
src/app/pages/metadata-manager/metadata-manager.page.component.scss
src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.scss
src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.ts
src/app/pages/recipe-book/recipe-book.page.html
src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.scss
src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.ts
src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.ts
src/app/pages/recipe-builder/recipe-builder.page.ts
src/app/pages/cook-view/cook-view.page.ts
src/app/pages/suppliers/components/supplier-form/supplier-form.component.scss
src/app/pages/suppliers/components/supplier-list/supplier-list.component.scss
src/app/pages/venues/components/venue-form/venue-form.component.scss
src/app/pages/menu-intelligence/components/menu-export-sheet/menu-export-sheet.component.ts
src/app/shared/ai-recipe-modal/ai-draft-editor/ai-draft-editor.component.scss
src/app/shared/confirm-modal/confirm-modal.component.scss
src/app/shared/unit-creator/unit-creator.component.scss
src/app/shared/unit-creator/unit-creator.component.ts
src/app/shared/add-equipment-modal/add-equipment-modal.component.ts
src/app/shared/add-item-modal/add-item-modal.component.ts
src/app/shared/translation-key-modal/translation-key-modal.component.ts
src/app/shared/ai-menu-modal/ai-menu-modal.component.ts
src/app/shared/ai-product-modal/ai-product-modal.component.ts
src/app/shared/chip-search-dropdown/chip-search-dropdown.component.ts
src/app/shared/counter/counter.component.ts
src/app/shared/custom-multi-select/custom-multi-select.component.ts
src/app/shared/custom-select/custom-select.component.ts
src/app/shared/export-preview/export-preview.component.ts
src/app/shared/nutrition-badge/nutrition-badge.component.ts
src/app/shared/row-actions-menu/row-actions-menu.component.ts
src/app/shared/scaling-chip/scaling-chip.component.ts
src/app/core/directives/*.ts
src/app/core/components/user-msg/user-msg.component.ts
src/app/appRoot/app.component.html
```

`**/*.scss` files that only lack `@layer` (S4) and the files holding boolean names (S8) or raw Hebrew (S9) are listed per sub-task by S1 in `docs/refactor/runs/458.md`; the Worker adds each one to this scope block with an `approved: <path>` reply before touching it (Escalation Protocol), never a glob.

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-1: preserves — no permission or write-route change; `src/app/core/services/*-data.service.ts` is not touched.
- INV-2: preserves — no tenancy or master-data change.
- INV-3: preserves — no cascades added or moved.
- INV-4: preserves — no schema change.

## Backend Impact
- Collections affected: none
- New collections: no
- Server changes needed: no

## Step 0 — Reality Check
Runs first, before S1, because the MVP and plans 450–457 changed many files. For every file and symbol this plan names, check it on current `main` and print `ok` or `conflict: <what>` per line: each path in the scope block (exists? renamed/deleted by 450–457?); `reuse-lint.mjs` and its rule names; the `.c-*` count per SCSS file; `ChangeDetectionStrategy` in `cook-view.page.ts` / `recipe-builder.page.ts`; each `@ViewChild`/`@ViewChildren`/`@HostListener` site; the `*ngIf`/`*ngFor` uses in `product-form.component.html`; each non-`app-` selector and its template call-sites (grep `<selector` and `[attr]` across `src/**/*.html` and `.ts` `imports`); `docs/agent/conventions.md`. Plans 451–456 may have replaced components (modals, custom-select) — those rows become `ok: gone` and drop out. A `conflict` stops the run until the plan is amended.

## User Stories
- As a developer, I want the rules in AGENTS.md to be true of the code so that the next plan can copy any existing file as a pattern without copying a violation.
- As a chef, I want nothing to look or behave differently after this clean-up.

## Functional Requirements

### Must Have (P0)
- [ ] Per-rule baseline and after-count recorded in `docs/refactor/runs/458.md`.
- [ ] Rules 1, 2, 4, 5, 6 reach zero; rules 7 and 9 reach zero unlisted violations; rule 8 documented; rule 3 decided (S5).
### Should Have (P1)
- [ ] `scripts/rule-sweep-count.mjs` prints all counts in one table so later plans can re-run it (skipped if `reuse-lint.mjs` already does).

## UI/UX Notes
- No visual change. Every touched page gets a [human] smoke card (same screens as before, same clicks). Moving `.c-*` blocks into `styles.scss` must keep specificity: place them inside the existing `@layer` order used there.

## Atomic Sub-tasks
Checkpoints (build + tests + run-file row, then pause for the Human's `continue`): after S1, S3, S5, S7, S10.
- [ ] S1: Step 0, then record the baseline for all 9 rules in a table (rule · how measured · file list · count); classify each Hebrew hit as `bug` / `canonical data (keep)` / `comment`; add `scripts/rule-sweep-count.mjs` only if `reuse-lint.mjs` lacks a rule — `docs/refactor/runs/458.md`, `scripts/rule-sweep-count.mjs`
- [ ] S2: Move the `.c-*` rule blocks out of the 14 component SCSS files into `src/styles.scss` (append-only, one commented block per source file; if a class already exists there, delete the duplicate and keep the existing one); component keeps its own local classes — the 14 component `.scss` files listed in Problem 1, `src/styles.scss`, `docs/refactor/runs/458.md`
- [ ] S3: Wrap the remaining component SCSS in the project layer (`@layer`, same layer name the compliant files use — read `.claude/skills/cssLayer/SKILL.md` first), in batches of 10 files, building after each batch; compare a before/after screenshot of one page per batch — the SCSS files named by S1 (added via `approved:`), `docs/refactor/runs/458.md`
- [ ] S4: Replace `@ViewChild`/`@ViewChildren` with `viewChild()`/`viewChildren()` (reads become `ref()?.nativeElement`; `QueryList` iteration becomes array iteration) — `equipment-form.component.ts`, `product-form.component.ts`, `recipe-ingredients-table.component.ts`, `recipe-workflow.component.ts`, `chip-search-dropdown.component.ts`, `counter.component.ts`, `custom-multi-select.component.ts`, `custom-select.component.ts`, `scaling-chip.component.ts`, `docs/refactor/runs/458.md`
- [ ] S5: Replace `@HostListener` with `host: {}` bindings or `fromEvent` + `takeUntilDestroyed` where the listener is on `document`/`window` (Escape in the four modals/preview/row-actions menu, outside-click in nutrition-badge and `click-out-side.ts`, scroll/resize in `scroll-indicators.directive.ts`, `cook-view.page.ts` lines ~928 and ~1153) — the files in Problem 4, `src/app/core/directives/*.ts`, `docs/refactor/runs/458.md`
- [ ] S6: Convert `*ngIf`/`*ngFor`/`*ngSwitch` in the product form template to `@if/@for/@switch` (every `@for` gets a `track`; keep `else` branches identical), drop now-unused `NgIf/NgFor` imports so the file does not grow — `product-form.component.html`, `product-form.component.ts`, `docs/refactor/runs/458.md`
- [ ] S7: Add `app-` to the 9 component selectors and `app` prefixed names to the 8 attribute directives, updating every template call-site found in Step 0 (known: `appRoot/app.component.html`, `inventory.page.html`, `recipe-book.page.html`; modals opened from code need no template edit) — the selector files in Problem 6, `src/app/core/directives/*.ts`, `inventory.page.html`, `recipe-book.page.html`, `app.component.html`, `docs/refactor/runs/458.md`
- [ ] S8: Rename non-`is/has/can/should` boolean signals and fields found by S1, with their template uses, one file per commit; skip public `input()` names that a parent binds unless every parent is in scope — files from S1 (added via `approved:`), `docs/refactor/runs/458.md`
- [ ] S9: Document the input naming convention in `docs/agent/conventions.md`: private state keeps the trailing `_`; public `input()`/`output()`/`model()` names are the plain API name (171 of 173 today already follow this); fix the 2 outliers only if they have a single binding site — `docs/agent/conventions.md`, `docs/refactor/runs/458.md`
- [ ] S10: Raw Hebrew: for each S1 `bug` row, replace the string with a `translatePipe` / `TranslationService` key and append the key to `public/assets/data/dictionary.json` (append-only; Hebrew value is the old string verbatim); `canonical data (keep)` rows stay and are listed as the exception list in the run file — files from S1 (added via `approved:`), `public/assets/data/dictionary.json`, `docs/refactor/runs/458.md`
- [ ] S11: OnPush on `cook-view.page.ts` and `recipe-builder.page.ts`: first count what the change adds (import + `changeDetection` = +2 lines each) and what can be deleted in the same file to pay for it; if the file can end at net <= 0 and all reads in the template are signals, add OnPush, run the page's spec, and record it; if not, do NOT add it — record `blocked: frozen-file growth` and raise Critical Question 1 — `cook-view.page.ts`, `recipe-builder.page.ts`, `docs/refactor/runs/458.md`
- [ ] S12: Final pass: re-run every rule's measure, fill the "after" column, build, run all tests, write the validation cards for the touched pages — `docs/refactor/runs/458.md`

## Technical Considerations
- Dependencies: `scripts/reuse-lint.mjs` (plan 450), `scripts/scope-check.mjs`, `.claude/skills/cssLayer/SKILL.md`, `.claude/skills/angularComponentStructure/SKILL.md`.
- New files needed: `docs/refactor/runs/458.md`; optionally `scripts/rule-sweep-count.mjs`.
- Model changes: none. Backend / API: none. Auth and validation: none. Data / migration: none.
- Risk: `viewChild()` returns `undefined` until the view renders — code that read a decorator field in `ngOnInit` or in an effect before render must move to `afterNextRender` or an `effect`. Selector renames break any `imports: []` entry or `createComponent` string lookup — Step 0 greps both.
- Risk: OnPush on the two big pages can hide updates from plain (non-signal) fields; this is why S11 is last and checkpointed.
- Security surface: none.
- Project checks: log-query [auto] (`node scripts/log-query.mjs --since=plan-start --level=error` → no entries); breadcrumbs unchanged; dictionary keys append-only; no new `any`.

## Out of Scope
- Fixing duplicated code or merging component families (plans 450–457).
- Splitting or shrinking the frozen files beyond what the conversions need.
- Renaming public `input()` names or bulk-adding `_` to them.
- Hebrew in `dictionary.json`, specs, comments, and canonical data values.

## Critical Questions
1. Frozen-file conflict: the rule "OnPush everywhere" needs +2 lines in `cook-view.page.ts` and `recipe-builder.page.ts`, which are growth-frozen. Recommended: allow it only when paid for by deleting dead lines in the same file (S11); otherwise skip and leave both pages as the two documented exceptions. This is a frozen-file exception, not an INV-1..4 change, so no `Arch-approved:` is involved.
