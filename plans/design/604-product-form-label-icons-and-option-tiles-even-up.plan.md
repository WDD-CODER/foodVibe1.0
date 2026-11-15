# Plan 604 — Product form label icons and option tiles even up, recipe ingredient rows breathe, form hints wrap cleanly

Status: draft
Track: design
Depends-on: 599
Snapshot: d8b1f68494302471c8afa1da89e5ea6d3af5e8ef
## Problem Statement

The Style QA run of 2026-11-14 found small control mismatches on three pages. Each has one cause in the code:

- **Product form, oversized category icon** (V3-61c2dfc6, V3-9afbaf7c, 375 and 1366px). In
  `src/app/pages/inventory/components/product-form/product-form.component.html` the category label is
  `<label class="label-row collapsible-field__label-with-icon"><lucide-icon name="tags" class="icon-xs icon-muted">`.
  `.icon-xs` is not defined anywhere global (only inside `.collapsible-field__header`), so this icon renders at
  lucide's default 24px. The same happens to the five expanded-field label icons inside `.collapsible-field__content`.
- **Product form, uneven and orphaned option tiles** (V3-1f639271, V3-9bc9b821, 375px). The optional section rule
  `.form-container .form-section.form-section--optional { grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr)) }`
  gives two columns at 375px, so the five tiles (supplier, allergens, waste/yield, min stock, expiry) fill 2 + 2 + 1
  and the fifth sits alone. Tiles take the height of their text (one or two lines), and
  `.collapsible-field__header--btn { place-items: baseline }` pins each icon to the top corner.
  At desktop the same auto-fill gives four columns, so it is 4 + 1 there too.
- **Recipe builder, cramped ingredient row** (V6-8593bb07, 375px). In
  `recipe-ingredients-table.component.scss`, the `@container ingredients (max-width: 700px)` card puts amount, unit and
  cost in a `gap: 0.5rem` grid with 1.75rem stepper buttons and `gap: 0.125rem` between them. The cost is centred in
  columns 3–4, so it does not line up with the trash button above it in column 4.
- **Frontdesk settings, orphan word in the hint** (V3-905d7a13, 1366px). The `fd_slug_hint` text under "שם בקישור" in
  `frontdesk-settings.page.html` is rendered by the shared `app-form-field` as `.form-field__hint`. It wraps by the
  browser's greedy rule, so "תווים" sits alone on line two of a 13rem column.

This plan is written against the `origin/orch/run-597` version of `product-form.component.scss` (plan 599 moved the
mandatory-section grid out of the 620px media block). Build it after 599 merges.

## Goals & Success Criteria
**Primary:** on the product form the category icon matches the other small label icons and the five option tiles are
even, with no tile alone in a row. On a phone, the recipe ingredient row has even gaps and the cost lines up under the
trash button. Form hints wrap into balanced lines with no single word left on its own line.

Done when:
- [auto] `pnpm run build` → exit 0
- [auto] `pnpm run test:ci` → exit 0
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries
- [ui] At 375x812 on `/inventory/add` signed in, the category label's icon
  (`.form-section--mandatory .product-field > label lucide-icon svg`) has width ≤ 16 and height ≤ 16 —
  `e2e/ui/604-1.spec.ts`, screenshot `screens/604-1.png`
- [ui] At 375x812 on `/inventory/add` signed in, the five `.form-section--optional .collapsible-field__header` boxes have
  equal heights (±1px), the last one's width equals the `.form-section--optional` content width (±2px), and each
  header's `lucide-icon` vertical centre is within 2px of its header's vertical centre — `e2e/ui/604-2.spec.ts`,
  screenshot `screens/604-2.png`
- [ui] At 375x812 on `/recipe-builder` signed in, in the first `.ingredient-grid-row`: the horizontal gap between
  `.quantity-controls` and the `.col-unit app-custom-select` box is ≥ 8px, the gap between that box and `.cost-value`
  is ≥ 8px, each `.qty-btn` is ≥ 32px wide, and the left edge of `.cost-value` is within 2px of the left edge of
  `.col-actions .c-icon-btn` — `e2e/ui/604-3.spec.ts`, screenshot `screens/604-3.png`
- [ui] At 1366x768 on `/frontdesk/settings` signed in (QA business with no profile, the type picker shows), the
  `fd_slug_hint` `.form-field__hint` text spans at most 2 lines, and with a DOM Range over its text the last line box is
  at least 40% as wide as the first — `e2e/ui/604-4.spec.ts`, screenshot `screens/604-4.png`
- [human] On a phone (or a 375px window), the product form's category label looks like the other labels, and the
  option tiles look like a tidy, even set. On the recipe builder, the ingredient card reads as one neat row under the
  search. On the frontdesk settings page, the link-name hint reads as two even lines.
- [human] Nothing else moved: the product form's name, price, unit and purchase-unit rows look the same, the recipe
  builder's desktop ingredient table (wider than 700px) looks the same, and other form hints look the same apart from
  more even line breaks.

## Execution Mode

- Parallel: yes. It writes no file that plan 604 (menu library + requests, draft-D2) writes. It must start after 599
  merges, because 599 changes `product-form.component.scss`.
- Isolated DB: no.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/inventory/components/product-form/product-form.component.html
src/app/pages/inventory/components/product-form/product-form.component.scss
src/app/pages/inventory/components/product-form/product-form.component.spec.ts
src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.scss
src/app/shared/form-field/form-field.component.scss
src/app/shared/form-field/form-field.component.spec.ts
e2e/ui/604-1.spec.ts
e2e/ui/604-2.spec.ts
e2e/ui/604-3.spec.ts
e2e/ui/604-4.spec.ts
```

## Read Scope

Entire repo.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the ## Read-Write Scope above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves — template and stylesheet changes in two page components and one shared component's stylesheet.
  No server, schema, ownership, tenancy or AI path is touched, and no scope path matches an invariant's `Touches` glob
  (none contains "ai").

## Reuse Check

- none — no new component, util, pipe, service or `.c-*` class. Icons use lucide's existing `[size]` input (the pattern
  used across `src/app`), and the hint change is one property on the existing form-field family
  (`docs/brain/component-families.md` → form-field).

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch), then STOP for a go before
touching any milestone.

## User Stories

- As a chef adding a product on my phone, I want the form's labels and option tiles to look like one tidy set, so the
  form feels finished and I can find the option I need.
- As a chef building a recipe on my phone, I want each ingredient card's amount, unit and cost spaced evenly, so I can
  tap the stepper without hitting the unit.
- As a business owner setting up the front desk, I want the hint under a field to read as clean lines.

## Functional Requirements

### Must Have (P0)
- [ ] **Category icon size** — `product-form.component.html`: on the category label's
  `<lucide-icon name="tags" class="icon-xs icon-muted">` add `[size]="16"`. Add `[size]="16"` the same way to the five
  label icons inside `.collapsible-field__content` (`truck`, `shield-alert`, `flask-conical`, `package`,
  `calendar-clock` in `label.collapsible-field__label-with-icon` / `div.collapsible-field__label-with-icon`). Leave the
  collapsed-header icons, the purchase "plus" button icon and the error-row icon as they are.
- [ ] **Even option tiles** — `product-form.component.scss`, appended at the end of the file (after 599's blocks):
  - `.form-container .collapsible-field .collapsible-field__header` gets `flex: 1 1 auto`, `min-block-size: 4rem`,
    `align-items: center`, `text-wrap: balance`. `.collapsible-field__header--btn` changes `place-items: baseline` to
    `align-items: center`. Edit that rule in place; it is the cause of the icon sitting at the top.
  - `.form-container .form-section.form-section--optional > .product-field.collapsible-field` gets `display: flex`,
    `flex-direction: column` so the header fills the stretched grid cell.
  - Above 768px, `.form-container .form-section.form-section--optional` gets
    `grid-template-columns: repeat(5, minmax(0, 1fr))` (five tiles, one row).
  - At `max-width: 768px` (declare `$break-mobile: 768px; // mirrors src/styles.scss` at the top of the file if it is
    not there), the same selector gets `grid-template-columns: repeat(2, minmax(0, 1fr))` and
    `> .product-field:last-child:nth-child(odd) { grid-column: 1 / -1; }`.
  - An expanded field still keeps its cell width and grows downward. Do not add `grid-auto-rows: 1fr`, because it would
    make every row as tall as an open field.
- [ ] **Recipe ingredient card spacing** — `recipe-ingredients-table.component.scss`, inside the existing
  `@container ingredients (max-width: 700px)` block's `.ingredient-grid-row`:
  - `grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr) 2.75rem;` and replace `gap: 0.5rem` with
    `column-gap: var(--space-3); row-gap: var(--space-2);`
  - `.col-quantity { justify-content: flex-start; }` (its start edge lines up with the search box above).
  - `.col-cost { justify-content: flex-end; gap: var(--space-2); }` keeps `grid-column: 3 / -1`, so the price ends
    under the trash button in column 4.
  - `.quantity-controls { gap: 0.25rem; }` and `.quantity-controls .qty-btn { inline-size: 2rem; block-size: 2rem; }`
    (from 0.125rem / 1.75rem).
  - Leave the desktop grid (`$ingredients-grid-template`) and the rules outside the container query untouched.
- [ ] **Balanced hints** — `src/app/shared/form-field/form-field.component.scss`: in `.form-field__hint` (inside the
  existing `@layer components.form-field`) add `text-wrap: balance;`. Every form hint benefits, so the fix lives in the
  shared component and not in a frontdesk-only rule.

### Should Have (P1)
- [ ] `product-form.component.spec.ts`: the category label's `lucide-icon` renders an `svg` with `width="16"`.
- [ ] `form-field.component.spec.ts`: with `hint` set, `.form-field__hint` renders the translated hint (existing
  coverage stays green; add one if missing).

## UI/UX Notes

- RTL: "inline-end" is the left side. Use logical properties only (`inline-size`, `min-block-size`, `column-gap`).
- Keep the tiles' existing border, background and radius. Only size and alignment change.
- 16px matches the 1rem the collapsed-header icons already get.

## Atomic Sub-tasks

- [x] 604-A1: Shrink the product form's category and field label icons to match the other small icons — [size]="16" on the tags icon and the five expanded-label icons — src/app/pages/inventory/components/product-form/product-form.component.html, src/app/pages/inventory/components/product-form/product-form.component.spec.ts
- [x] 604-A2: Make the five product option tiles even, icons centred, none alone on its row — header min-block-size 4rem + align-items center; 5 cols above 768px, 2 cols with odd last tile spanning below — src/app/pages/inventory/components/product-form/product-form.component.scss
- [x] 604-A3: Space the phone ingredient card evenly and line the cost up under the trash button — container-query grid columns, column-gap, stepper 2rem, cost flex-end — src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.scss
- [x] 604-A4: Balance the line breaks of form hints so no single word sits alone — text-wrap: balance on .form-field__hint — src/app/shared/form-field/form-field.component.scss, src/app/shared/form-field/form-field.component.spec.ts
- [x] 604-A5: Prove the icon size, tile evenness, ingredient spacing and hint wrap in the running app — e2e/ui/604-1.spec.ts, e2e/ui/604-2.spec.ts, e2e/ui/604-3.spec.ts, e2e/ui/604-4.spec.ts

## Technical Considerations

- `product-form.component.scss` on `main` differs from `origin/orch/run-597` (plan 599). Rebase on main after 599 merges
  and append the new rules after 599's `.form-section--mandatory` block. Do not touch that block.
- The optional-section base rule sits inside `.form-container { … }` and compiles to three classes. It beats the
  `.form-container .form-section` media rules, so the new rules must use the same three-class selector and come later
  in the file.
- `/recipe-builder` (new recipe) opens with one empty ingredient row; 604-3 uses it, so no data is needed.
- `/frontdesk/settings` shows the type picker only when the QA business has no front-desk profile (the Style QA run
  saw it). 604-4 skips with a clear message when `#fd-new-slug` is absent, rather than deleting data.
- Specs sign in with `signInQa` from `e2e/helpers/qa-session.ts` (see `e2e/ui/586-1.spec.ts`).
- Backend / API impact: none. Auth: none. Security surface: none. Data / migration: none.

## Out of Scope

- The mandatory section grid (plan 599) and the purchase-unit rows.
- The recipe header's yield stepper and the desktop ingredient table.
- The frontdesk settings layout beyond the hint (field widths, the create button).
- Menu library and requests findings (plan 604, draft-D2).

## Critical Questions

none

## Execution Notes
- pnpm run build -> 0; pnpm run lint -> 0 (0 errors); pnpm run test:ci -> 0, 2191 SUCCESS; log-query -> 0 (no database configured, skipped)
- [ui] 604-1..604-4: written, not run
