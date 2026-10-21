# Plan 455 — Share one form field and one unsaved-changes check across the entity forms

Status: draft
Track: code
Depends-on: 450
Conflicts-with: 452, 453, 454, 456, 457
Snapshot: 34c560fc8db9272f41a85c57c5eb8d3407b3caed

## Problem Statement
Every entity form rebuilds the same field by hand and the same "did anything change?" check (audit 2026-10-20, family "Form field" and "Entity form behaviour"):
1. **Field shell** — `.form-group` (label + `.c-input` + `.c-field-error`) is defined four times in local SCSS: `equipment-form.component.scss`, `product-form.component.scss`, `supplier-form.component.scss`, `venue-form.component.scss` (venue adds `--full` / `--active` variants). `equipment-list.component.html` also uses one `form-group`. Supplier shows a duplicate-name error with a different class (`form-error`) than the other errors (`c-field-error`).
2. **Unsaved changes** — `hasRealChanges()` exists in five shapes (JSON snapshot compare in `venue-form` and `cook-view`; normalised snapshot in `product-form`; snapshot + AI draft + history-mode guard in `recipe-builder`; two-part compare in `menu-intelligence`), all read by `pendingChangesGuard` (`core/guards/pending-changes.guard.ts`).
3. **Duplicate-name validators** (`core/validators/item.validators.ts`) are the right shared piece; they stay and the form kit builds on them, but `duplicateNameValidator` (Product only) and `duplicateEntityNameValidator<T>` are near-copies.

This plan adds `app-form-field` and `useUnsavedChanges` in `shared/` / `core/utils/`, then moves one form at a time onto them. No behaviour changes.

## Goals & Success Criteria
- Primary: one form-field component and one unsaved-changes helper; the four local `.form-group` blocks and the five `hasRealChanges` bodies are gone.
- Success:
  - [ ] [auto] `npx ng build` passes after every sub-task.
  - [ ] [auto] `npx ng test --watch=false` passes (existing specs, incl. `venue-form.component.spec.ts`, `recipe-builder.page.spec.ts`, `item.validators.spec.ts`), plus new specs for `app-form-field` and `useUnsavedChanges`.
  - [ ] [auto] `grep -rn "\.form-group" src --include=*.scss` → no matches outside `src/styles.scss`; `grep -rn "hasRealChanges()" src --include=*.ts` shows only one-line delegations to the helper.
  - [ ] [auto] `git diff --numstat main -- <each frozen file>` → net lines (added minus removed) <= 0 for `product-form.component.ts`, `recipe-builder.page.ts`, `menu-intelligence.page.ts`, `cook-view.page.ts`.
  - [ ] [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `deferred: local MongoDB down` per run mode).
  - [ ] [human] Equipment, supplier, venue and product forms (add and edit) look the same as before: label above field, same spacing, required-name error in red under the field, supplier duplicate-name error still appears after leaving the field.
  - [ ] [human] On each of venue form, product form, recipe builder, menu intelligence and cook-view edit: change something, press back, the "unsaved changes" dialog appears; change nothing, press back, it does not.

## Execution Mode
- Parallel: no — S1–S2 create shared files; S3+ touch `src/styles.scss`-adjacent and the frozen files one at a time.
- Concurrent plans: none touching these forms (451 modal shell and 456 messages may touch `venue-form` / `product-form` — run after or rebase; do not run in parallel with them).
- Isolated DB: no

## Execution Notes
- Depends on: the MVP merge to main (branch `mvp`); plan 450 (reuse layer: registry `docs/brain/component-families.md`, `@utils` alias, `reuse-lint`). Independent of 451–457.
- Run the Reuse Check first (ladder in `docs/agent/standards-*.md` once 450 lands): this is rung 3/4 — a new family in `shared/` with justification (CSS-only family today, no component).
- Convert one form per sub-task; each is independently buildable and leaves the others untouched. Checkpoints (stop, show the Human the [human] smoke): S3 (first form on the new field), S6 (first form on the new helper), S10 (final).
- Frozen files (`product-form.component.ts`, `recipe-builder.page.ts`, `menu-intelligence.page.ts`, `cook-view.page.ts`) may only shrink. Convert them last (S7–S9); if a conversion would grow one, stop and use `approved:` escalation instead of adding lines.
- Equipment and supplier forms have no `hasRealChanges` and no `pendingChangesGuard` today — do NOT add one (behaviour change).

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/shared/form-field/form-field.component.ts
src/app/shared/form-field/form-field.component.html
src/app/shared/form-field/form-field.component.scss
src/app/shared/form-field/form-field.component.spec.ts
src/app/shared/breadcrumbs.md
src/app/core/utils/unsaved-changes.ts
src/app/core/utils/unsaved-changes.spec.ts
src/app/core/utils/breadcrumbs.md
src/app/core/guards/pending-changes.guard.ts
src/app/core/validators/item.validators.ts
src/app/core/validators/item.validators.spec.ts
src/app/pages/equipment/components/equipment-form/equipment-form.component.ts
src/app/pages/equipment/components/equipment-form/equipment-form.component.html
src/app/pages/equipment/components/equipment-form/equipment-form.component.scss
src/app/pages/equipment/components/equipment-list/equipment-list.component.html
src/app/pages/equipment/components/equipment-list/equipment-list.component.scss
src/app/pages/suppliers/components/supplier-form/supplier-form.component.ts
src/app/pages/suppliers/components/supplier-form/supplier-form.component.html
src/app/pages/suppliers/components/supplier-form/supplier-form.component.scss
src/app/pages/venues/components/venue-form/venue-form.component.ts
src/app/pages/venues/components/venue-form/venue-form.component.html
src/app/pages/venues/components/venue-form/venue-form.component.scss
src/app/pages/venues/components/venue-form/venue-form.component.spec.ts
src/app/pages/inventory/components/product-form/product-form.component.ts
src/app/pages/inventory/components/product-form/product-form.component.html
src/app/pages/inventory/components/product-form/product-form.component.scss
src/app/pages/cook-view/cook-view.page.ts
src/app/pages/menu-intelligence/menu-intelligence.page.ts
src/app/pages/recipe-builder/recipe-builder.page.ts
src/app/pages/recipe-builder/recipe-builder.page.spec.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-1: preserves — no permission or role logic touched.
- INV-2: preserves — no data scoping touched.
- INV-3: preserves — no client-side cascades added; the helper only compares form snapshots.
- INV-4: preserves — no schema or persisted-field change.
- ADR: none needed — a shared component and a helper follow existing rules. Add a `docs/brain/` capture only if S10 finds a surprising trap.

## Backend Impact
- Collections affected: none
- New collections: no
- Server changes needed: no

## Step 0 — Reality Check
The MVP changed many files. Before S1, on current `main` find each symbol and print `ok` or `conflict: <what>` per line (a `conflict` stops that sub-task until the Human replies):
- `.form-group` in the four form SCSS files plus `equipment-list.component.html` (count and variants, incl. `form-group--full`, `--active`, `.scaling-box`).
- `hasRealChanges` in `pending-changes.guard.ts`, `venue-form`, `cook-view.page.ts`, `product-form.component.ts`, `menu-intelligence.page.ts`, `recipe-builder.page.ts` (and any new implementation the MVP added — list it and add a sub-task or note it Out of Scope).
- `initialSnapshot_`, `initialFormSnapshot_`, `initialRecipeSnapshot_`, `savedSnapshot_`, `workflowSnapshot_`, `unsavedAiDraft_`, `saveAndWait` still exist with the same meaning.
- `duplicateNameValidator`, `duplicateEntityNameValidator` and their callers (`product-form`, `recipe-builder`, `supplier-form`, `venue-form`).
- `.c-input`, `.c-input-wrapper`, `.c-input-stack`, `.c-field-error`, `.c-input--invalid` in `src/styles.scss`; `form-error` class used by `supplier-form.component.html`.
- Whether any form added by the MVP (e.g. business, team, onboarding) also defines `.form-group` or `hasRealChanges`: list as extra call-sites.

## User Stories
- As a chef, I want every form to show fields, errors and the "leave without saving?" prompt the same way so that I never wonder what a form will do.
- As a developer, I want one field component and one unsaved-changes helper so that a new form is a few lines.

## Functional Requirements

### Must Have (P0)
- [ ] `app-form-field` (selector `app-form-field`, standalone, OnPush, `input()`s): `label` (translation key), `forId`, `error` (translation key or null), `hint` (optional key), `layout: 'default' | 'full'`. Projects the control (`<ng-content />`). Renders `<label for>` + content + `<span class="c-field-error" role="alert">` when `error` is set. Uses the existing `.c-input` / `.c-input-wrapper` / `.c-input-stack` / `.c-field-error` classes; defines no new `.c-*` class.
- [ ] `useUnsavedChanges({ form, extra?, snapshot? })` in `core/utils/unsaved-changes.ts`: signal-based, returns `{ markSaved(), hasChanges(): boolean, reset() }`. Default snapshot is `JSON.stringify(form.getRawValue())`; callers pass `snapshot` for normalised forms (product, recipe) and `extra` for non-form state (photo, AI draft, history mode). Components keep `hasRealChanges()` as a one-line delegation so `PendingChangesComponent` and `pendingChangesGuard` keep working unchanged.
- [ ] Converted forms render identically and keep every id, `formControlName`, error condition and validator.
- [ ] `duplicateNameValidator` becomes a thin wrapper over `duplicateEntityNameValidator` (same results, same `{ duplicateName: true }` error); `item.validators.spec.ts` passes unchanged.

### Should Have (P1)
- [ ] Supplier duplicate-name error uses the same error slot as the required error (shows `c-field-error` styling instead of `form-error`) — only if Step 0 shows the two classes render the same; otherwise keep it and note it.

## UI/UX Notes
- No visual change. Spacing stays `gap: 0.25rem` column, label 0.875rem / weight 500 (taken from the current `.form-group`). Logical CSS properties only. No new dictionary keys; existing keys (`name`, `field_name_required`, `duplicate_supplier_name`, ...) are reused.

## Atomic Sub-tasks
- [ ] S1: Run Step 0 and print ok/conflict per symbol; write the findings into the session state — no files
- [ ] S2: Build `app-form-field` with spec (label link, error shown/hidden, `full` layout) and add it to `shared/breadcrumbs.md` — `src/app/shared/form-field/form-field.component.ts`, `src/app/shared/form-field/form-field.component.html`, `src/app/shared/form-field/form-field.component.scss`, `src/app/shared/form-field/form-field.component.spec.ts`, `src/app/shared/breadcrumbs.md`
- [ ] S3 (checkpoint): Convert the equipment form (simplest: 5 groups, no hasRealChanges) and the one `form-group` in the equipment list; delete the local `.form-group` SCSS — `src/app/pages/equipment/components/equipment-form/equipment-form.component.ts`, `src/app/pages/equipment/components/equipment-form/equipment-form.component.html`, `src/app/pages/equipment/components/equipment-form/equipment-form.component.scss`, `src/app/pages/equipment/components/equipment-list/equipment-list.component.html`, `src/app/pages/equipment/components/equipment-list/equipment-list.component.scss`
- [ ] S4: Convert the supplier form, keeping `duplicateEntityNameValidator` and the duplicate-name message — `src/app/pages/suppliers/components/supplier-form/supplier-form.component.ts`, `src/app/pages/suppliers/components/supplier-form/supplier-form.component.html`, `src/app/pages/suppliers/components/supplier-form/supplier-form.component.scss`
- [ ] S5: Build `useUnsavedChanges` with spec (unchanged = false, edit = true, `markSaved` = false, `extra` forces true) and add to `core/utils/breadcrumbs.md` — `src/app/core/utils/unsaved-changes.ts`, `src/app/core/utils/unsaved-changes.spec.ts`, `src/app/core/utils/breadcrumbs.md`
- [ ] S6 (checkpoint): Convert the venue form to both kit pieces (fields incl. `--full` / `--active`, photo as `extra`); existing spec must pass — `src/app/pages/venues/components/venue-form/venue-form.component.ts`, `src/app/pages/venues/components/venue-form/venue-form.component.html`, `src/app/pages/venues/components/venue-form/venue-form.component.scss`, `src/app/pages/venues/components/venue-form/venue-form.component.spec.ts`
- [ ] S7: Convert cook-view's `hasRealChanges` and its `savedSnapshot_` handling; net lines <= 0 — `src/app/pages/cook-view/cook-view.page.ts`
- [ ] S8: Convert menu-intelligence's `hasRealChanges` (workflow array + recipe compare); net lines <= 0 — `src/app/pages/menu-intelligence/menu-intelligence.page.ts`
- [ ] S9: Convert product-form (12 `form-group` blocks incl. `.scaling-box`, normalised snapshot via `snapshot` option) and recipe-builder (`hasRealChanges` with AI draft + history mode via `extra`); both files net lines <= 0; keep `duplicateNameValidator` callers working — `src/app/pages/inventory/components/product-form/product-form.component.ts`, `src/app/pages/inventory/components/product-form/product-form.component.html`, `src/app/pages/inventory/components/product-form/product-form.component.scss`, `src/app/pages/recipe-builder/recipe-builder.page.ts`, `src/app/pages/recipe-builder/recipe-builder.page.spec.ts`
- [ ] S10 (checkpoint): Make `duplicateNameValidator` delegate to `duplicateEntityNameValidator`; tidy the guard's doc comment to name the helper; run the Done-when greps, `ng build`, tests, log-query; write the validation cards — `src/app/core/validators/item.validators.ts`, `src/app/core/validators/item.validators.spec.ts`, `src/app/core/guards/pending-changes.guard.ts`

## Technical Considerations
- Dependencies: `ReactiveFormsModule`, `translatePipe`, `pendingChangesGuard`; `@utils` alias from plan 450 if it landed, else the existing relative/`src/app/core` import style.
- New files: the four `form-field` files and two `unsaved-changes` files listed in scope only.
- Component class order follows `.claude/skills/angularComponentStructure/SKILL.md`; SCSS edits follow `.claude/skills/cssLayer/SKILL.md`; run `node scripts/breadcrumbs-check.mjs` after S2/S5.
- Projecting `app-custom-select` and `textarea` through `ng-content` must keep `[class.c-input--invalid]` and `aria-invalid` on the control itself (they stay in the form's template).
- Model/API/data: none. Project checks: log-query [auto]; chef-side stories; no new dictionary keys.

## Out of Scope
- Adding unsaved-changes protection to equipment/supplier forms; new validators; redesigning form layout.
- Search-picker, modal, list, message or chip convergence (plans 451–457); the `.c-*` rule sweep (458).
- Other `form-group`-like markup outside the five files found in Step 0 unless S1 lists it as a call-site.

## Critical Questions
None.
