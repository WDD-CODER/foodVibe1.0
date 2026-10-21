# Plan 451 — Give every popup one shared shell and one controller, with Escape to close

Status: draft
Track: code
Depends-on: 450
Conflicts-with: 454, 456, 457
Snapshot: 34c560fc8db9272f41a85c57c5eb8d3407b3caed

## Problem Statement
Popups (modals) are built 21 different ways. Per `docs/mvp/reuse-audit-2026-10-20.md`: 11 have no Escape key, only 4 of 21 have `role="dialog"`, and 13 hand-written controller services come in three shapes:
- **A. RxJS `Subject` + `firstValueFrom`** (6): `add-equipment-modal`, `add-item-modal`, `quick-add-product-modal`, `quick-edit-product-modal`, `translation-key-modal`, `label-creation-modal` services.
- **B. Stored resolver** `resolve_` (3, the shape to keep): `confirm-modal`, `global-specific-modal`, `restore-choice-modal` services.
- **C. Bare `isOpen` signal, no result** (4): `auth-modal`, `ai-menu-modal`, `ai-product-modal`, `ai-recipe-modal` services.
The cards use the `.c-modal-overlay` / `.c-modal-card` engines in `src/styles.scss` but each repeats the overlay markup and click-outside handler. This plan adds one shell component and one signal-only `ModalController`, then converts the modals family by family without changing how callers use them. The only intended behaviour changes are Escape closing a modal, and dialog semantics/focus handling.

## Goals & Success Criteria
- Primary: one shell (`app-modal-shell`) and one controller class; all 13 controller services use the controller, every engine-based modal uses the shell, and Escape closes the top-most modal.
- Success:
  - [ ] [auto] `npx ng build` passes and `npx ng test --watch=false` passes (existing `global-specific-modal.component.spec.ts`, `unit-creator.component.spec.ts`, `app.component.spec.ts` keep their meaning) plus the new `modal-controller.spec.ts` and `modal-shell.component.spec.ts`.
  - [ ] [auto] `grep -rn "firstValueFrom\|new Subject" src/app/core/services/*-modal.service.ts src/app/shared/*-modal/*.service.ts` → no matches.
  - [ ] [auto] `grep -rLn "app-modal-shell" <every modal template listed in the scope>` → empty (the shell renders `role="dialog" aria-modal="true"`).
  - [ ] [auto] `git diff --numstat main -- src/app/pages/cook-view/cook-view.page.ts src/app/pages/menu-intelligence/menu-intelligence.page.ts src/app/pages/recipe-builder/recipe-builder.page.ts src/app/pages/inventory/components/product-form/product-form.component.ts src/app/pages/menu-intelligence/services/menu-export.service.ts` → no file has net added lines (callers need no edit; public `open()` signatures stay).
  - [ ] [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `deferred: local MongoDB down` per run mode).
  - [ ] [human] Smoke each touched page (list in UI/UX Notes): open each popup, press Escape — it closes with the same result as pressing Cancel; open, save and cancel work exactly as before.
  - [ ] [human] Open a confirm popup on top of another popup (e.g. delete inside an edit dialog): Escape closes only the top one.

## Execution Mode
- Parallel: no — S1/S2 create the shared files every later sub-task uses, and all share `styles.scss` / `dictionary.json`.
- Concurrent plans: 450 first; 451 does not depend on 452–457, but 452 (combobox) and 455 (form kit) edit templates of `add-item-modal`, `label-creation-modal` and `translation-key-modal` — run 451 before them or serialise via `scope-check.mjs --overlap`.
- Isolated DB: no

## Execution Notes
- Depends on: the MVP merge to main (branch `mvp`) and plan 450 (reuse layer: component-families registry, `@utils`/`@pipes` aliases, `reuse-lint`). Not on 452–457.
- Refactor rule: no behaviour change except Escape/ARIA/focus. Every converted service keeps its public API (`open(...)`, `isOpen_` / `isOpen`, confirm/close methods) as a thin wrapper, so no caller outside the scope is edited. Frozen files (`cook-view.page.ts`, `menu-intelligence.page.ts`, `recipe-builder.page.ts`, `product-form.component.ts`, `menu-export.service.ts`) are in no scope and may only shrink.
- Hotspots append-only: `styles.scss` and `dictionary.json` get additions only (new shell rules appended; a `close` key only if missing).
- Checkpoints (stop for the Human smoke before continuing): after S3, S4 and S6. Each sub-task is independently buildable and shippable.
- Decision ladder step 3 (extend the family): the `.c-modal-*` engines stay the styling base; the shell adds behaviour only.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/services/modal-controller.ts
src/app/core/services/modal-controller.spec.ts
src/app/core/services/add-equipment-modal.service.ts
src/app/core/services/add-item-modal.service.ts
src/app/core/services/auth-modal.service.ts
src/app/core/services/confirm-modal.service.ts
src/app/core/services/global-specific-modal.service.ts
src/app/core/services/quick-add-product-modal.service.ts
src/app/core/services/quick-edit-product-modal.service.ts
src/app/core/services/restore-choice-modal.service.ts
src/app/core/services/translation-key-modal.service.ts
src/app/core/services/breadcrumbs.md
src/app/shared/breadcrumbs.md
src/app/shared/modal-shell/modal-shell.component.ts
src/app/shared/modal-shell/modal-shell.component.html
src/app/shared/modal-shell/modal-shell.component.spec.ts
src/app/shared/modal-shell/breadcrumbs.md
src/app/shared/ai-menu-modal/ai-menu-modal.service.ts
src/app/shared/ai-menu-modal/ai-menu-modal.component.ts
src/app/shared/ai-menu-modal/ai-menu-modal.component.html
src/app/shared/ai-product-modal/ai-product-modal.service.ts
src/app/shared/ai-product-modal/ai-product-modal.component.ts
src/app/shared/ai-product-modal/ai-product-modal.component.html
src/app/shared/ai-recipe-modal/ai-recipe-modal.service.ts
src/app/shared/ai-recipe-modal/ai-recipe-modal.component.ts
src/app/shared/ai-recipe-modal/ai-recipe-modal.component.html
src/app/shared/label-creation-modal/label-creation-modal.service.ts
src/app/shared/label-creation-modal/label-creation-modal.component.ts
src/app/shared/label-creation-modal/label-creation-modal.component.html
src/app/shared/add-equipment-modal/add-equipment-modal.component.ts
src/app/shared/add-equipment-modal/add-equipment-modal.component.html
src/app/shared/add-equipment-modal/add-equipment-modal.component.scss
src/app/shared/add-item-modal/add-item-modal.component.ts
src/app/shared/add-item-modal/add-item-modal.component.html
src/app/shared/add-item-modal/add-item-modal.component.scss
src/app/shared/confirm-modal/confirm-modal.component.ts
src/app/shared/confirm-modal/confirm-modal.component.html
src/app/shared/confirm-modal/confirm-modal.component.scss
src/app/shared/global-specific-modal/global-specific-modal.component.ts
src/app/shared/global-specific-modal/global-specific-modal.component.html
src/app/shared/global-specific-modal/global-specific-modal.component.spec.ts
src/app/shared/quick-add-product-modal/quick-add-product-modal.component.ts
src/app/shared/quick-add-product-modal/quick-add-product-modal.component.html
src/app/shared/quick-add-product-modal/quick-add-product-modal.component.scss
src/app/shared/quick-edit-product-modal/quick-edit-product-modal.component.ts
src/app/shared/quick-edit-product-modal/quick-edit-product-modal.component.html
src/app/shared/quick-edit-product-modal/quick-edit-product-modal.component.scss
src/app/shared/restore-choice-modal/restore-choice-modal.component.ts
src/app/shared/restore-choice-modal/restore-choice-modal.component.html
src/app/shared/translation-key-modal/translation-key-modal.component.ts
src/app/shared/translation-key-modal/translation-key-modal.component.html
src/app/shared/translation-key-modal/translation-key-modal.component.scss
src/app/core/components/auth-modal/auth-modal.component.ts
src/app/core/components/auth-modal/auth-modal.component.html
src/app/shared/unit-creator/unit-creator.component.ts
src/app/shared/unit-creator/unit-creator.component.html
src/app/shared/unit-creator/unit-creator.component.scss
src/app/shared/unit-creator/unit-creator.component.spec.ts
src/app/pages/metadata-manager/components/unit-edit-dialog/unit-edit-dialog.component.ts
src/app/pages/metadata-manager/components/unit-edit-dialog/unit-edit-dialog.component.html
src/app/pages/menu-intelligence/components/menu-export-sheet/menu-export-sheet.component.ts
src/app/pages/menu-intelligence/components/menu-export-sheet/menu-export-sheet.component.html
src/app/shared/export-preview/export-preview.component.ts
src/app/shared/export-preview/export-preview.component.html
src/app/appRoot/app.component.html
src/app/appRoot/app.component.ts
docs/mvp/runs/451.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-1: preserves — no permission or role rule is touched.
- INV-2: preserves — no data access; `businessId` scoping is untouched.
- INV-3: preserves — no client-side cascades.
- INV-4: preserves — no schema change.

## Backend Impact
- Collections affected: none.
- New collections: no
- Server changes needed: no

## Step 0 — Reality Check
Runs after the MVP merge and whenever `scope-check.mjs --drift` reports drift. On current main, print `ok` or `conflict: <what>` per item:
- every file in the scope block exists; also run `grep -rln "c-modal-overlay" src/app` and `grep -rln "role=\"dialog\"" src/app` and report any modal the MVP added that is not in the scope (escalate with `approved: <path>`);
- shapes: `add-equipment`, `add-item`, `quick-add-product`, `quick-edit-product`, `translation-key`, `label-creation` still use `Subject` + `firstValueFrom`; `confirm`, `global-specific`, `restore-choice` still use `resolve_`; `auth` and the three `ai-*` services are still bare signals;
- each service's public members (`open`, `isOpen_` / `isOpen`, confirm/close methods) and each caller named in S3–S5;
- `AddEquipmentModalService`: no caller was found by grep at draft time — find who opens it before S4;
- `UnitRegistryService` still drives `unit-creator-modal`; `cook-view.page.ts` (~L1160) and `touch-row-selection.ts` (`LIST_KEEP_TARGETS`) still match `.c-modal-overlay` / `.c-modal-card` by selector, so the shell must keep those class names;
- a `close` / `cancel` key exists in `public/assets/data/dictionary.json`;
- the 5 frozen files have not been edited since the Snapshot.

## User Stories
- As a chef, I want Escape to close any popup, as it does elsewhere, so that I never have to reach for the mouse.
- As a chef using the keyboard, I want focus to move into the popup when it opens and return to where I was when it closes.

## Functional Requirements

### Must Have (P0)
- [ ] `ModalController<TResult>` (plain class, not a root service) in `src/app/core/services/modal-controller.ts`: `isOpen_` signal; `open(): Promise<TResult>` stores one resolver; `close(result)` resolves it and closes; a second `open()` while open resolves the first with the cancel value. No RxJS. Each existing service composes one.
- [ ] `app-modal-shell` in `src/app/shared/modal-shell/`: wraps the `.c-modal-overlay` / `.c-modal-card` engines; inputs `size` (`sm` | `md` | `fluid`), `titleKey`, `dismissible`; output `dismissed`; renders `role="dialog" aria-modal="true" aria-labelledby`; Escape (via the `host` object, not `@HostListener`) and backdrop click emit `dismissed` — top-most open shell only; focus moves into the card on open and returns to the opener on close; Tab stays inside the card.
- [ ] Each modal wires its existing cancel handler to `dismissed`, so Escape equals Cancel (confirm: the same value as its cancel button).
- [ ] While a modal is busy (AI generation, saving) Escape does nothing — same as its disabled Cancel today.

## UI/UX Notes
- Pages for the smoke check: app shell popups (auth, unit creator); Metadata manager (unit edit, add item, label creation, translation key); Equipment; Inventory (product form, AI product); Recipe builder (quick add product, global/specific, version-history restore, ingredient quick edit); Recipe book (AI recipe); Menu intelligence and Menu library (AI menu, export sheet, export preview); a confirm dialog from Trash, Suppliers and Venues.
- Look is unchanged: same classes, RTL, logical properties only. New dictionary keys: none, unless `close` is missing (append it).

## Atomic Sub-tasks
- [ ] S1: Add the signal-only `ModalController` with a stored resolver and its unit spec (open resolves on close; reopen cancels the first; no RxJS) — `src/app/core/services/modal-controller.ts`, `src/app/core/services/modal-controller.spec.ts`
- [ ] S2: Add `app-modal-shell` (engines, role/aria, Escape for the top-most only via a small signal stack in `modal-controller.ts`, focus in/restore/trap, `size` input) with a spec; append any missing shell rules to the hotspot; breadcrumbs — `src/app/shared/modal-shell/modal-shell.component.ts`, `src/app/shared/modal-shell/modal-shell.component.html`, `src/app/shared/modal-shell/modal-shell.component.spec.ts`, `src/app/shared/modal-shell/breadcrumbs.md`, `src/app/shared/breadcrumbs.md`, `src/app/core/services/breadcrumbs.md`, `src/app/core/services/modal-controller.ts`, `src/styles.scss`
- [ ] S3: Convert shape B (already resolver-based, lowest risk): `confirm-modal` (16 callers, untouched), `global-specific-modal` (caller `recipe-workflow`), `restore-choice-modal` (caller `version-history-panel`). CHECKPOINT, Human smoke — `src/app/core/services/confirm-modal.service.ts`, `src/app/core/services/global-specific-modal.service.ts`, `src/app/core/services/restore-choice-modal.service.ts`, `src/app/shared/confirm-modal/confirm-modal.component.ts`, `src/app/shared/confirm-modal/confirm-modal.component.html`, `src/app/shared/confirm-modal/confirm-modal.component.scss`, `src/app/shared/global-specific-modal/global-specific-modal.component.ts`, `src/app/shared/global-specific-modal/global-specific-modal.component.html`, `src/app/shared/global-specific-modal/global-specific-modal.component.spec.ts`, `src/app/shared/restore-choice-modal/restore-choice-modal.component.ts`, `src/app/shared/restore-choice-modal/restore-choice-modal.component.html`
- [ ] S4: Convert shape A (drop `Subject` / `firstValueFrom`): `add-item-modal` (callers `menu-intelligence.page`, `metadata-manager.page.component`, `preparation-search`), `add-equipment-modal`, `quick-add-product-modal` (`ingredient-search`), `quick-edit-product-modal` (`recipe-ingredients-table`), `translation-key-modal` (5 callers), `label-creation-modal` (`metadata-manager.page`, `recipe-header`). CHECKPOINT, Human smoke — `src/app/core/services/add-item-modal.service.ts`, `src/app/core/services/add-equipment-modal.service.ts`, `src/app/core/services/quick-add-product-modal.service.ts`, `src/app/core/services/quick-edit-product-modal.service.ts`, `src/app/core/services/translation-key-modal.service.ts`, `src/app/shared/label-creation-modal/label-creation-modal.service.ts`, `src/app/shared/add-item-modal/add-item-modal.component.ts`, `src/app/shared/add-item-modal/add-item-modal.component.html`, `src/app/shared/add-item-modal/add-item-modal.component.scss`, `src/app/shared/add-equipment-modal/add-equipment-modal.component.ts`, `src/app/shared/add-equipment-modal/add-equipment-modal.component.html`, `src/app/shared/add-equipment-modal/add-equipment-modal.component.scss`, `src/app/shared/quick-add-product-modal/quick-add-product-modal.component.ts`, `src/app/shared/quick-add-product-modal/quick-add-product-modal.component.html`, `src/app/shared/quick-add-product-modal/quick-add-product-modal.component.scss`, `src/app/shared/quick-edit-product-modal/quick-edit-product-modal.component.ts`, `src/app/shared/quick-edit-product-modal/quick-edit-product-modal.component.html`, `src/app/shared/quick-edit-product-modal/quick-edit-product-modal.component.scss`, `src/app/shared/translation-key-modal/translation-key-modal.component.ts`, `src/app/shared/translation-key-modal/translation-key-modal.component.html`, `src/app/shared/translation-key-modal/translation-key-modal.component.scss`, `src/app/shared/label-creation-modal/label-creation-modal.component.ts`, `src/app/shared/label-creation-modal/label-creation-modal.component.html`
- [ ] S5: Convert shape C (bare signals): `auth-modal` (8 callers incl. guard and interceptor — keep `isOpen` and `open()` signatures), `ai-menu-modal` (`menu-intelligence.page`, `menu-library.page`), `ai-product-modal` (`inventory-product-list`, `product-form`), `ai-recipe-modal` (`recipe-book-list`); Escape ignored while generating — `src/app/core/services/auth-modal.service.ts`, `src/app/core/components/auth-modal/auth-modal.component.ts`, `src/app/core/components/auth-modal/auth-modal.component.html`, `src/app/shared/ai-menu-modal/ai-menu-modal.service.ts`, `src/app/shared/ai-menu-modal/ai-menu-modal.component.ts`, `src/app/shared/ai-menu-modal/ai-menu-modal.component.html`, `src/app/shared/ai-product-modal/ai-product-modal.service.ts`, `src/app/shared/ai-product-modal/ai-product-modal.component.ts`, `src/app/shared/ai-product-modal/ai-product-modal.component.html`, `src/app/shared/ai-recipe-modal/ai-recipe-modal.service.ts`, `src/app/shared/ai-recipe-modal/ai-recipe-modal.component.ts`, `src/app/shared/ai-recipe-modal/ai-recipe-modal.component.html`
- [ ] S6: Move the dialogs without a controller onto the shell (no service change): `unit-creator-modal` (driven by `UnitRegistryService`), `unit-edit-dialog`, `menu-export-sheet`, `export-preview` (the last two already have `role="dialog"` — it now comes from the shell only). CHECKPOINT, Human smoke — `src/app/shared/unit-creator/unit-creator.component.ts`, `src/app/shared/unit-creator/unit-creator.component.html`, `src/app/shared/unit-creator/unit-creator.component.scss`, `src/app/shared/unit-creator/unit-creator.component.spec.ts`, `src/app/pages/metadata-manager/components/unit-edit-dialog/unit-edit-dialog.component.ts`, `src/app/pages/metadata-manager/components/unit-edit-dialog/unit-edit-dialog.component.html`, `src/app/pages/menu-intelligence/components/menu-export-sheet/menu-export-sheet.component.ts`, `src/app/pages/menu-intelligence/components/menu-export-sheet/menu-export-sheet.component.html`, `src/app/shared/export-preview/export-preview.component.ts`, `src/app/shared/export-preview/export-preview.component.html`
- [ ] S7: Tidy the modal block of `app.component` only if the conversions allow it; run `ng build`, tests, the grep checks, `log-query` and the frozen-file numstat; write the run file with the validation cards — `src/app/appRoot/app.component.html`, `src/app/appRoot/app.component.ts`, `docs/mvp/runs/451.md`

## Technical Considerations
- Dependencies: `.c-modal-*` engines in `src/styles.scss` (~L646–710), `translatePipe`, `inject()`, `input()` / `output()`, signals only, trailing underscore on private state.
- Escape/focus: `host: { '(document:keydown.escape)': ... }` (no `@HostListener`); a signal stack makes a confirm popup over another popup take Escape first.
- `@defer (when x.isOpen_())` blocks in `app.component.html` stay; controllers expose the same signal names.
- New files: `modal-controller.ts`, `modal-shell/*` and specs. Model changes: none. Backend / API: none.
- Auth: `auth-modal` keeps its guard/interceptor contract; a dismissed auth popup resolves as today's close does.
- Security surface: none. Data / migration: none.
- Project checks: log-query [auto]; chef-side stories; no new translations beyond a possible `close` key. No ADR needed (applies the audit's ladder); if the Human wants one it is `0024` or later.

## Out of Scope
- Search combobox (452), form kit and unsaved-change prompts (455), chip engine (457), rule sweep (458, including `.c-*` classes defined in component SCSS).
- Redesigning modal looks, animations, z-index changes.
- Page-level inline panels and overlays (equipment-list side panel, venue/recipe selection overlays).
- Editing any frozen file or caller — wrappers keep their APIs.

## Critical Questions
1. Should Escape on a modal with typed, unsaved input close it silently (recommended: yes, same as backdrop click today) or ask first? Unsaved-change prompts belong to plan 455.
2. Should the AI/saving popups ignore Escape while busy (recommended) or cancel the request?
