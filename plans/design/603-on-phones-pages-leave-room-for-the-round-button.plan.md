# Plan 603 — On phones, pages leave room for the round button and list headers stop squeezing

Status: draft
Track: design
Depends-on: none
Snapshot: d8b1f68494302471c8afa1da89e5ea6d3af5e8ef
## Problem Statement

The Style QA run of 2026-11-14 at 375px found the round floating button (`app-hero-fab`, flame icon) and, on the
recipe builder, the red approve stamp (`app-approve-stamp`) sitting on top of page content, plus two list-layout
squeezes. Findings fixed here:

- V3-c5aace5e (inventory), V3-ddacbffb (suppliers): the round button covers the bottom rows' checkbox and menu.
- V6-9f55bd1d (dashboard): the last card's green action button ends up behind the bottom bar and the round button.
- V6-25ae74f4, V6-63ac059c (recipe builder, empty and filled): the round button and the stamp cover the lower edge
  of the ingredients card next to "הוסף שורה".
- V3-b82b4bdd (inventory): a divider and then a larger empty gap sit between the search field and the table card.
- V6-9e6d03ce (suppliers): the carousel column header ("מינימום הזמנה") is clipped at its left end and the dots sit
  right under it.

Root causes (read in the code, not guessed):

1. **Only the bottom bar is reserved, never the button lane above it.** At ≤620px `.app-content`
   (`src/app/appRoot/app.component.scss`) pads `3.5rem + safe area` — exactly the bar. The round button sits *above*
   the bar (`inset-block-end: calc(3.5rem + safe-area + 0.75rem)`, 3.5rem tall, so its top is 7.75rem above the
   screen bottom) and the stamp mirrors it on the other side. Nothing reserves that lane, so even at the end of the
   page the last content sits under them. Dashboard and inventory each patched this separately ("Plan 278" rules in
   `dashboard.page.scss` and `inventory.page.scss`), still short of the button's top (7rem < 7.75rem).
2. **The phone list card is sized to end at the bar, not above the button.** `list-shell.component.scss` at ≤620px
   sets `.table-area` to `100dvh − 2·space-3 − 3.5rem − safe area`, so the card's lower-left corner — where the
   checkbox and ⋮ columns are in RTL — always sits under the button.
3. **The collapsed filter panel still takes a row.** At ≤1023px the two `.scroll-arrow--panel` elements stay in the
   `panel` grid row even when `.filter-panel.collapsed` is `display: none`; the bottom one has `min-height: 1.5rem`
   plus `margin-block-end: var(--space-4)`, which is the ~40px gap between the divider and the table card.
4. **The carousel header label runs under its own arrows.** `:host(.column-carousel--header)` has
   `padding-inline: 0.25rem` and the active header slide has `padding: 0`, so the label spans the whole cell while the
   two `.cc-arrow--float` buttons (1.75rem each) are absolutely placed on its edges and cover its ends; the host has no
   gap between the label and `.cc-dots`.

One shared fix covers every page: two tokens for the phone bottom chrome, used by `.app-content` and the list shell,
replacing the per-page patches.

## Goals & Success Criteria
**Primary:** at 375px, scrolled to the end of the page, no row, card or button sits under the round button, the stamp
or the bottom bar; the list's search, divider and table card are evenly spaced; and a carousel column header shows its
whole label between its arrows with a clear gap above the dots.

Done when:
- [human] Nothing else moved: tablet and desktop (≥621px) spacing, the list card height on tablet, and the round
  button's and stamp's own positions are unchanged; the cook view still clears its bottom toolbar.
- [auto] `pnpm run build` → exit 0
- [auto] `pnpm run test:ci` → exit 0
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries
- [ui] At 375x812 on `/inventory` signed in, after scrolling the window to the bottom, the `.fab-main` box does not
  intersect the `app-list-shell .table-area` box (fab top ≥ table-area bottom) — `e2e/ui/603-1.spec.ts`, screenshot
  `screens/603-1.png`
- [ui] At 375x812 on `/inventory` signed in, the gap from the bottom of `app-list-shell .list-header` to the top of
  `.table-area` is between 8px and 20px, and differs by at most 4px from the gap between the bottom of the
  `.list-header .c-input-wrapper` and the bottom of `.list-header` — `e2e/ui/603-2.spec.ts`, screenshot
  `screens/603-2.png`
- [ui] At 375x812 on `/suppliers` signed in, in `app-column-carousel-header` the `.column-slide--active` box does not
  intersect the `.cc-arrow--prev` or `.cc-arrow--next` box, its `scrollWidth ≤ clientWidth`, and the `.cc-dots` top is
  at least 2px below its bottom — `e2e/ui/603-3.spec.ts`, screenshot `screens/603-3.png`
- [ui] At 375x812 on `/dashboard` signed in, after scrolling the window to the bottom, the last visible `button` inside
  `.dashboard-content` ends above both the `.fab-main` top and the `.bottom-nav` top — `e2e/ui/603-4.spec.ts`,
  screenshot `screens/603-4.png`
- [ui] At 375x812 on `/recipe-builder` signed in (new, empty recipe), after scrolling the window to the bottom, the
  last `.section-card` ends above both the `.fab-main` top and the `.approve-stamp` top — `e2e/ui/603-5.spec.ts`,
  screenshot `screens/603-5.png`
- [human] On a phone (or a 375px window), scroll to the end of inventory, suppliers, dashboard and the recipe builder:
  the round button and the stamp float over empty background, nothing important hides behind them, and the supplier
  column header reads in full between its arrows.

## Execution Mode

- Parallel: yes — the open run branch `orch/run-597` (plans 597–599) writes the header, the hero-fab component, the
  product form and the inventory product list; this plan writes none of those files.
- Isolated DB: no.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/styles.scss
src/app/appRoot/app.component.scss
src/app/shared/list-shell/list-shell.component.scss
src/app/shared/column-carousel/column-carousel.component.scss
src/app/pages/dashboard/dashboard.page.scss
src/app/pages/inventory/inventory.page.scss
e2e/ui/603-1.spec.ts
e2e/ui/603-2.spec.ts
e2e/ui/603-3.spec.ts
e2e/ui/603-4.spec.ts
e2e/ui/603-5.spec.ts
```

## Read Scope

Entire repo.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the ## Read-Write Scope above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves — stylesheet-only changes (two new CSS custom properties, layout padding and sizes); no
  server, schema, ownership, taxonomy or AI path is touched, and no invariant's `Touches` glob matches a file in scope.

## Reuse Check

- none — no new component, util, pipe, service or `.c-*` class. The two new tokens (`--bottom-bar-h`, `--fab-lane`)
  are design tokens next to the existing `:root` ones in `src/styles.scss`; they replace four hard-coded copies of
  `3.5rem + env(safe-area-inset-bottom)` rather than adding a new family member.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch), then STOP for a go before
touching any milestone.

## User Stories

- As a chef on my phone, I want to reach and tap the last row, card or "add row" link without the round button or the
  stamp in the way, so that I never have to guess what is hidden under them.
- As a chef browsing suppliers on my phone, I want to read the column name in full, so that I know which value I'm
  looking at.

## Functional Requirements

### Must Have (P0)
- [ ] **Phone chrome tokens** — append to the end of `src/styles.scss`:
  ```scss
  // Phone bottom chrome (≤620px): the fixed tab bar, and the lane above it where the round
  // button (hero-fab) and the approve stamp float (3.5rem button + 0.75rem gap + 0.5rem air).
  @media (max-width: 620px) {
    :root {
      --bottom-bar-h: calc(3.5rem + env(safe-area-inset-bottom, 0px));
      --fab-lane: 4.75rem;
    }
  }
  ```
  Do not change `hero-fab.component.scss` or `approve-stamp.component.scss` (their positions stay as they are).
- [ ] **Shared page reservation** — in `src/app/appRoot/app.component.scss`, inside the existing ≤620px block, change
  `.app-content`'s `padding-block-end` to `calc(var(--bottom-bar-h) + var(--fab-lane))`. Update the comment above it to
  say it reserves the tab bar and the round-button lane.
- [ ] **Remove the per-page duplicates** this replaces (they would now double the space):
  - `src/app/pages/dashboard/dashboard.page.scss`: delete the `/* Plan 278 — bottom nav occlusion */` media block that
    sets `.dashboard-content { padding-block-end: calc(3.5rem + …) }`.
  - `src/app/pages/inventory/inventory.page.scss`: delete the `/* Plan 278 — bottom nav occlusion */` media rule that
    sets the `:host` `padding-block-end`; keep `display: block; min-height: 100%`.
- [ ] **List card ends above the button lane** — in `src/app/shared/list-shell/list-shell.component.scss`, in the
  `@media (max-width: 620px)` block (comment "≤620px the fixed bottom tab bar …"), change `.table-area`'s
  `block-size` to `calc(100dvh - 2 * var(--space-3) - var(--bottom-bar-h) - var(--fab-lane))` and update the comment
  to "≤620px the fixed tab bar and the round-button lane above it cover the screen's lower edge; the card ends above
  both, so no row is ever under the button once the card fills the screen." This applies to every list-shell page
  (inventory, suppliers, equipment, clients, recipe book, venues).
- [ ] **No empty panel row when the filters are closed** — in `list-shell.component.scss`, inside the existing
  `@media (max-width: #{$panel-overlay-break})` block, add:
  ```scss
  .list-container:has(> .filter-panel.collapsed) > .scroll-arrow--panel {
    display: none;
  }

  .list-header {
    margin-block-end: 1rem; // same as its padding-block-end: search · 1rem · divider · 1rem · card
  }
  ```
  (≥1024px is untouched: there the panel and the table share one row, so the arrows cost no height.)
- [ ] **Carousel header label sits between its arrows** — in
  `src/app/shared/column-carousel/column-carousel.component.scss`, inside `@media (max-width: $cc-break)`:
  - `:host(.column-carousel--header)`: `padding-inline: 1.25rem` (was `0.25rem`) and add `row-gap: 0.25rem`.
  - `.cc-arrow--float`: `inline-size: 1.25rem` (was `1.75rem`); keep `block-size: 1.75rem` and the `::before` 2rem tap
    area, so the touch target does not shrink.
  - Add, after the active-slide rule:
    ```scss
    :host(.column-carousel--header) ::ng-deep .column-slide.column-slide--active {
      display: -webkit-box !important;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow: hidden;

      white-space: normal;
      overflow-wrap: anywhere;
      text-align: center;
      text-wrap: balance;
      line-height: 1.2;
    }
    ```
    (Long labels such as "מינימום הזמנה" wrap to two centred lines instead of running under the arrows; a third line is
    cut with an ellipsis.) The cell carousel (`--cell`) rules are unchanged.

### Should Have (P1)
- [ ] Each e2e spec signs in with `signInQa(context)` from `e2e/helpers/qa-session.ts`, sets
  `test.use({ viewport: { width: 375, height: 812 } })`, and scrolls with
  `page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))` before measuring (603-1, 603-4,
  603-5). Follow `e2e/ui/586-1.spec.ts` for shape. 603-5 opens `/recipe-builder` with no id (empty recipe).

## UI/UX Notes

- RTL: the round button is at inline-end (left), the stamp is physically bottom-right; logical properties only in new
  rules.
- The list card gets 4.75rem shorter on phones; rows still scroll inside it. This is the intended trade: one row less on
  screen, none ever hidden.
- Do not hide or move the round button or the stamp; plan 598 (run-597) separately hides the button on add/edit forms.

## Atomic Sub-tasks

- [ ] 603-A1: Add phone tokens for the bottom bar and the round-button lane above it — --bottom-bar-h, --fab-lane in a ≤620px :root block — src/styles.scss
- [ ] 603-A2: Reserve the bar plus the button lane under every page and drop per-page copies — .app-content padding; delete Plan 278 rules — src/app/appRoot/app.component.scss, src/app/pages/dashboard/dashboard.page.scss, src/app/pages/inventory/inventory.page.scss
- [ ] 603-A3: End the phone list card above the round button so no row sits under it — .table-area block-size at ≤620px — src/app/shared/list-shell/list-shell.component.scss
- [ ] 603-A4: Remove the empty gap a closed filter panel leaves above the list card — hide .scroll-arrow--panel when collapsed, .list-header margin — src/app/shared/list-shell/list-shell.component.scss
- [ ] 603-A5: Keep carousel column names between the arrows and clear of the dots — header padding, row-gap, narrower arrows, 2-line clamp — src/app/shared/column-carousel/column-carousel.component.scss
- [ ] 603-A6: Prove on a 375px phone that nothing sits under the button and headers read cleanly — e2e/ui/603-1.spec.ts … e2e/ui/603-5.spec.ts

## Technical Considerations

- `env(safe-area-inset-bottom)` lives inside `--bottom-bar-h`, so every user of the token keeps the notch handling.
- `:has()` is already used in `list-shell.component.scss`; no new browser floor.
- `display: -webkit-box` + `-webkit-line-clamp` must carry `!important` on `display` only because the existing
  active-slide rule sets `display: flex !important`; the new rule comes after it with a higher specificity.
- Pages with their own extra bottom space (cook view `padding-block-end: 9.375rem`, product import's 4.25rem
  clearance) get 4.75rem more at ≤620px; this is harmless and out of scope.
- Backend / API impact: none. Auth: none. Security surface: none. Data / migration: none.

## Out of Scope

- V6-2cc653b4 (inventory columns hidden behind a column carousel): the carousel is the intended phone layout (plan 349)
  and the price column width is already widened by plan 599 (run-597, `inventory-product-list` files). This plan only
  improves the carousel header's readability.
- Moving, resizing or hiding the round button or the stamp (hero-fab / approve-stamp components; plan 598 owns the
  hero-fab files).
- The bottom bar's own labels (plan 597).
- Tablet and desktop layouts.

## Critical Questions

none

## Execution Notes
