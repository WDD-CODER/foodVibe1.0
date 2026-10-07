# Plan 368 — Product form responsive on mobile and tablet

Status: draft
Snapshot: b776163f43fd1db42a5e0501b3a0e5c30b0bded1

## Problem Statement

Editing a product on phone or tablet is unusable (`src/app/pages/inventory/components/product-form/`).

**Root cause:** both `@media` blocks in `product-form.component.scss` (`@media (max-width: 900px)` ~L405 and `@media (max-width: 768px)` ~L426) are nested inside `.form-container { … }` (which closes ~L444). They compile to selectors that never match, e.g. `.form-container .form-container .form-section` and `.form-container .product-form-container`. So the single-column layout, reduced padding and max-width reset never apply.

What actually renders:

- `:host` padding `--space-6` + `.form-container` padding `--space-8`, leaving about 248px of content at 360px.
- `.form-section`: `repeat(auto-fit, minmax(120px, 1fr))` (~L59). At about 800px the optional section becomes 5 columns of about 124px, so an expanded collapsible field (allergens chip dropdown, waste/yield) is crushed.
- `.scaling-row` (~L266): a 5-column grid `minmax(90px,9rem) auto minmax(90px,1fr) minmax(auto,12rem) min-content`.
- `.two-col-grid` (~L475): fixed `1fr 1fr`.
- `.form-actions` buttons: `min-width:10rem` each with no wrap, so they overflow at 360px.
- Leftover unused selectors: `.product-info`, `.grid-2`.

## Goals & Success Criteria

- Primary: the product form is fully usable at 360px (one column, nothing overflowing horizontally) and at about 800px (two columns where it helps, expanded fields at full width).
- Success: no horizontal scroll in the product form at any width from 320px to 1280px. Desktop looks as today.

## Execution Mode

- Parallel: yes
- Concurrent plans: none touching `src/app/pages/inventory/components/product-form/**`. Run after plan 342 (form checkboxes) and plan 364 (Search fields part 2).
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/inventory/components/product-form/**
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the ## Read-Write Scope above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch), then STOP for a go before
touching any milestone.

## User Stories

As a chef receiving goods, I want to add and edit products on my phone or tablet without sideways scrolling or squeezed fields.

## Functional Requirements

### Must Have (P0)
- [ ] Move both `@media` blocks to top level (or rewrite their selectors) so they target the real elements: `:host`, `.product-form-container`, `.form-container`, `.form-section`.
- [ ] ≤900px:
  - `.form-section` → `repeat(2, minmax(0, 1fr))`.
  - An expanded `.collapsible-field` → `grid-column: 1 / -1`.
  - `.scaling-row` → a 2-row layout (unit + qty on row 1; price + override + delete on row 2) via `grid-template-areas`.
- [ ] ≤768px:
  - `.form-section` → `1fr`.
  - `:host` padding → `--space-3`; `.form-container` padding → `--space-4`.
  - `.two-col-grid` → `1fr`.
  - `.scaling-row` → stacked, with full-width selects.
  - `.form-actions` → `flex-wrap: wrap`, buttons `flex: 1 1 auto; min-width: 0`, primary first.
- [ ] `.override-input` (fixed 85px) → `min-inline-size: 5rem; inline-size: 100%` within its cell on phone.
- [ ] Delete the dead `.product-info` and `.grid-2` rules.

### Should Have (P1)
- [ ] Tap targets: inputs, selects and chip pickers are at least 44px tall at ≤768px.

### Nice to Have (P2)
- None.

## UI/UX Notes

- RTL: logical properties only.
- No markup changes unless `grid-template-areas` needs a wrapper. Prefer CSS-only.
- No dictionary changes.

## Atomic Sub-tasks

- [x] A1: Un-nest the media blocks; verify they apply (DevTools computed styles) (`product-form.component.scss`).
- [x] A2: ≤900px tablet layout, including collapsible full width and the scaling row in 2 rows.
- [x] A3: ≤768px phone layout, including padding, actions wrap and the override input.
- [ ] A4: Remove dead rules. Build, specs. Check at 360, 414, 800 and 1280px with an expanded allergens field and a product with 2 purchase options. Update session-state.

## Technical Considerations

- Dependencies: `ProductFormComponent` (SCSS mostly), `ChipSearchDropdownComponent`, `CustomSelectComponent` (rendered inside, unchanged).
- New files: none.
- Model changes: none.

## Out of Scope

- Product form behavior or validation.
- The AI product modal.

## Critical Questions

- Tablet (769–900px) layout:
  a) 2 columns, expanded fields full width (default)
  b) 1 column like phone

## Success Criteria

- [auto] `npx ng test --watch=false --include=src/app/pages/inventory/components/product-form/**/*.spec.ts` → 0 failures.
- [auto] `npm run build` → exit 0.
- [human] Phone (360px): edit a product → one column, buttons wrap and fit, scaling rows stacked, allergens dropdown usable, no sideways scroll.
- [human] Tablet (~800px): 2 columns; opening allergens or waste/yield spans full width and is readable.
- [human] Desktop: looks the same as before.
