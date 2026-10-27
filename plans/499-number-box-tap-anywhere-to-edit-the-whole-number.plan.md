# Plan 499 — Number box: tap anywhere on it to edit the whole number

Status: draft
Track: code
Depends-on: 498
Snapshot: 21a2ffe5464ca65b4630ac0bdd5894a160a3cb8f

## Problem Statement
A box whose only content is an editable number (quantity, price, %, portions, guests, minutes, yield, stock level…) does not focus its number when the user taps the label, the unit / ₪ / % suffix or the padding. Only the narrow input itself reacts. Measured against `origin/main` at b6181027 (Human brief 02, 2026-10-26; re-check on arrival):
- `SelectOnFocusDirective` (`src/app/core/directives/select-on-focus.directive.ts`, selector `[appSelectOnFocus], input[type=number]`) selects all on focus and fixes the mouseup caret (plan 482). All 26 templates with `type="number"` import it, so the input itself is covered. What is missing is the container.
- The only container-click precedent is `onBoxClick` in the deprecated `chip-search-dropdown`.
- Containers where a tap misses the input today: `pricing-meter` (4 money / % boxes with lock icon and suffix), `product-form` `.relative-input` (buy price, waste %, yield) and the purchase-option row, `shared/counter` `.value-cell`, `cook-view` `.cv-stepper` / `.cv-amount-input` / `.cv-clock-input`, `menu-intelligence` `.guest-chip-input`, `recipe-ingredients-table` qty cell, `recipe-workflow` time cells, settings `baseline-tab` / `business-settings-tab`, `coefficient-manager`, `product-import`, `deposit-paid-dialog`, `event-closing-dialog`, `new-inquiry-dialog`, the AI modals, `quick-add-product-modal`, `quick-edit-product-panel`, `unit-creator`, `unit-edit-dialog`, `partial-cost-badge`.

## Goals & Success Criteria
- Primary: tap or click anywhere on a number box — including its label, suffix and padding — focuses the number and selects all of it, so the next keystroke replaces it. Same on phone and desktop. Out of scope: boxes that mix free text and numbers (a notes field with a number in it).
- Success:
  - [ ] [auto] A directive spec passes: pointerdown on the container focuses and selects the input; pointerdown on an inner button does not; a disabled or locked input is not focused. `npx ng test --watch=false --browsers=ChromeHeadless` green.
  - [ ] [auto] `node scripts/reuse-lint.mjs --diff=origin/main` reports no new number-box copy, and warns on a fixture number input outside a number box; `node scripts/reuse-lint.mjs --check-registry` exits 0.
  - [ ] [auto] `npx ng build` passes; `node scripts/scope-check.mjs --arch --plan=<this plan>` and `--reuse --plan=<this plan>` exit 0; `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
  - [ ] [human] Phone width: tap the ₪ sign of the price per guest in the pricing meter → the whole number is selected; typing replaces it. Same on the % suffix of waste in the product form.
  - [ ] [human] Recipe builder: tap the unit label next to an ingredient quantity → the number is selected; pressing Enter still moves to the next row.

## Execution Mode
- Parallel: no — one shared directive, then a sweep of the containers.
- Concurrent plans: none (500–502 depend on this plan)
- Isolated DB: no

## Execution Notes
- Source: Human briefs 00 + 02 (verified against `origin/main` b6181027). `main` is now 21a2ffe5: re-check every claim before editing. Brief 02 suggested splitting number box and stepper; this plan is the number box (02a), plan 500 is the stepper (02b).
- Run order of the batch: 498 → 499 → 500 → 501 → 502, one at a time.
- Design direction (the Worker picks one and uses it everywhere): a container directive (e.g. `[appNumberBox]`) that on `pointerdown` on a non-interactive part of the box focuses the inner input (the existing directive then selects). A plain `<label>` wrapper is an alternative where markup allows. It must not steal taps from buttons inside the box (stepper +/−, clear X, lock tooltip).
- Disabled / locked boxes (`pricing-meter` `canEditMoney_()` false, `edit-gate`) must not focus.
- Inventory first: list every container in Execution Notes (A1) before wiring; the list above is a start.
- Risks: `type="number"` refuses `setSelectionRange` — the existing directive handles it, do not regress plan 482. RTL: the suffix position flips; the hit area must still be the whole box. `appFocusByRow` (Enter to next row) in the recipe tables must keep working after the wrap.
- Hebrew RTL and logical CSS properties only; any new text goes through the dictionary.

## Reuse Check
- Number box container behaviour — family: none — rung: 4 — why: no shared piece focuses a number from a tap on its container; registered as the new family `number-box` in `docs/brain/component-families.md`
- Select-all on focus — family: form-field — rung: 1 — why: keep `SelectOnFocusDirective` as is
- Fixture rule for a number input outside a number box — family: helpers — rung: 2 — why: one data entry in `scripts/lib/registry-families.mjs`

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/directives/number-box.directive.ts
src/app/core/directives/number-box.directive.spec.ts
src/app/core/directives/select-on-focus.directive.ts
src/app/core/directives/select-on-focus.directive.spec.ts
src/app/shared/counter/**
src/app/pages/menu-intelligence/components/pricing-meter/**
src/app/pages/menu-intelligence/menu-intelligence.page.html
src/app/pages/menu-intelligence/menu-intelligence.page.scss
src/app/pages/menu-intelligence/components/deposit-paid-dialog/**
src/app/pages/menu-intelligence/components/event-closing-dialog/**
src/app/pages/menu-library/components/new-inquiry-dialog/**
src/app/pages/inventory/components/product-form/**
src/app/pages/inventory/components/product-import/**
src/app/pages/cook-view/cook-view.page.html
src/app/pages/cook-view/cook-view.page.scss
src/app/pages/recipe-builder/components/recipe-ingredients-table/**
src/app/pages/recipe-builder/components/recipe-workflow/**
src/app/pages/settings/components/baseline-tab/**
src/app/pages/settings/components/business-settings-tab/**
src/app/pages/metadata-manager/components/coefficient-manager/**
src/app/pages/metadata-manager/components/unit-edit-dialog/**
src/app/shared/ai-recipe-modal/**
src/app/shared/ai-product-modal/**
src/app/shared/ai-menu-modal/**
src/app/shared/quick-add-product-modal/**
src/app/shared/quick-edit-product-panel/**
src/app/shared/unit-creator/**
src/app/shared/partial-cost-badge/**
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
- INV-6: preserves — the AI modals only get a wrapper around number fields; no AI call path changes.

## Atomic Sub-tasks

- [ ] N1: List every number box where a tap misses the number today and record the list — reality check of the containers named in the Problem Statement, plus any the brief missed — this plan file
- [ ] N2: Build one shared "tap the box, edit the whole number" behaviour that ignores buttons inside the box and disabled boxes — container directive (or label wrapper) next to the select-all directive, with its spec — src/app/core/directives/number-box.directive.ts, src/app/core/directives/number-box.directive.spec.ts
- [ ] N3: Make the pricing meter and the counter value cell use it, including the lock-icon and suffix cases — pricing-meter, shared/counter — src/app/pages/menu-intelligence/components/pricing-meter/**, src/app/shared/counter/**
- [ ] N4: Make the product form and the purchase-option row use it — buy price, waste %, yield, purchase options — src/app/pages/inventory/components/product-form/**, src/app/pages/inventory/components/product-import/**
- [ ] N5: Make the recipe builder quantity and time cells use it without breaking Enter-to-next-row — recipe-ingredients-table, recipe-workflow — src/app/pages/recipe-builder/components/**
- [ ] N6: Make the cook-view amount and clock boxes and the menu guest chip use it — src/app/pages/cook-view/cook-view.page.html, src/app/pages/menu-intelligence/menu-intelligence.page.html
- [ ] N7: Make the settings, metadata, event dialogs and AI / quick-add / unit modals' number boxes use it — the remaining containers from N1 — the folders in scope
- [ ] N8: Warn when a number input is added outside a number box, and register the family — `reuse-lint` rule with fixtures; new `number-box` family with its remaining copies — scripts/lib/registry-families.mjs, scripts/test/reuse-lint.test.mjs, docs/brain/component-families.md
- [ ] N9: Run the full checks and paste the output — `ng build`, headless `ng test`, reuse-lint, scope-check, log-query — Execution Notes

## Done when
- [ ] [auto] Every `[auto]` item under Success Criteria passes (output pasted in the Worker's report).
- [ ] [human] The two `[human]` items under Success Criteria pass.
