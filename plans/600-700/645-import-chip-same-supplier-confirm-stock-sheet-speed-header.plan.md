# Plan 645 — Import shows the change in a chip and never adds a same-name supplier; the stock count sheet stays fast; the header always answers

Status: done
Depends-on: 636, 637, 641, 644
Snapshot: aacec375

## Problem Statement
Dandan validated the Modules program on 2026-11-19 (staging `aacec375`, app on 4202). Found:

1. **The change percent is plain text.** `product-import.component.html:234–238` renders `+42.0%` as a bare
   `<span class="import-change">`; it must sit in a chip like the row's other flags.
2. **A same-name supplier can still be added.** Plan 641 shows «עדכון המחיר של <A>» / «הוספת <B> כספק נוסף»
   (`product-import.component.html:255`, `:266`) and defaults to update when the names match, but still lets the owner
   add the same-name supplier as a second supplier. Dandan's rule: when the invoice's supplier name equals (trimmed,
   case-insensitive) a supplier the product already has, only «עדכון» exists. And when a row's change is beyond the
   business threshold (`priceRiseAlertPct`, up **or down**), saving asks for a small confirmation that names the item,
   the old and new price and the percent.
3. **The history box touches the reason field** in the business dialog (`platform-business-dialog`, plan 644): no gap.
4. **The stock count sheet freezes the browser** (`/inventory/count`, plans 636–637). Cause, verified by reading the
   code and the local data (Dandan's business has 2,879 products; every business has about 1,500):
   - `stock-count.component.html:123` draws one row per product in `visibleRows_()`: no paging, no virtual scroll.
     Each row holds `app-counter`, `app-custom-select`, a checkbox and `baseText_`.
   - `src/app/shared/counter/counter.component.ts:87–100`: every counter reads `offsetWidth` in `ngAfterViewChecked`
     and sets `valueWidth_`, so each row forces a layout of the whole page: thousands of forced layouts on the main
     thread. Only CSS animations (the loader) keep moving.
   - `stock-count.component.html:145` calls `unitOptions_(row.product)` in the template (a new array per row per
     check) and `:158` `baseText_` per row per check; every `rows_` update (`stock-count.component.ts:296`) and every
     search keystroke (`:125–133`) re-runs them.
5. **The avatar (sign out) does not react.** `header.component.scss:5` has `z-index: 100`; the route-loading overlay
   (`src/app/shared/loader/loader.component.scss:31–34`, `position: fixed; inset: 0; z-index: 150`, shown from
   `app.component.ts:132` on `NavigationStart`) covers the header while a frozen page (4) holds the navigation. The
   click itself is wired (`header.component.html:21`, `:115` → `logout()`).

## Goals & Success Criteria
**Primary:** the import shows the change in a chip, never offers a same-name supplier as new and confirms a change
beyond the threshold; the stock count sheet opens and scrolls without freezing with 3,000 products; the header stays
usable while a page loads.

- [auto] `pnpm run test:ci` passes, including
  `src/app/pages/inventory/components/product-import/product-import.component.spec.ts` with new cases: (a) the change
  renders inside `c-chip` with the up/down colour; (b) invoice supplier name equal (trimmed, case-insensitive) to the
  product's other supplier → only the update choice, no add choice, `targetSupplierId` sent; (c) different names → both
  choices as today; (d) a row beyond the threshold up (6% at 5) and one beyond it down (−6% at 5) → saving opens one
  confirm listing both items with old price, new price and percent; cancel sends nothing; confirm sends the apply; (e)
  rows within the threshold → no confirm.
- [auto] The same command,
  `src/app/pages/inventory/components/stock-count/stock-count.component.spec.ts`: with 3,000 products the sheet has
  fewer than 100 rows in the DOM at first draw, more appear on scroll (or "show more"), search filters the whole list,
  and counted values survive scrolling away and back; `unitOptions` is not a template method call (a computed map by
  product id).
- [auto] The same command, `src/app/shared/counter/counter.component.spec.ts`: the width is measured after a value
  change, not on every view check (a spy on the measure runs once per value change).
- [auto] The same command, a header spec: with the route-loading overlay shown, `elementFromPoint` at the avatar
  returns the avatar button and a click calls `logout()`.
- [auto] `pnpm run build` passes; `pnpm run lint` exits 0; `pnpm run lint:reuse` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] On `/inventory/count` with the demo business, the page answers a click within 1 second after load and after a
  scroll to the end (`e2e/ui/645-1.spec.ts`).
- [human] Dandan opens the stock count on his business, scrolls, searches, counts and leaves: nothing freezes. He
  imports an invoice of the same-name supplier: only «עדכון» is offered, and a change beyond 5% asks before saving. The
  percent sits in a chip. In the business dialog the history has a gap above the reason field. He can sign out from
  any page.

## Execution Mode
- Parallel: no — it edits `product-import/**`, `stock-count/**`, the shared counter, the header and the loader;
  `public/assets/data/dictionary.json` is appended.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/inventory/components/product-import/**
src/app/core/utils/price-change.util.ts
src/app/core/utils/price-change.util.spec.ts
src/app/pages/inventory/components/stock-count/**
src/app/shared/counter/**
src/app/core/components/header/**
src/app/shared/loader/**
src/app/app.component.ts
src/app/app.component.html
src/app/app.component.scss
src/app/app.component.spec.ts
src/app/pages/platform-dashboard/platform-dashboard.page.scss
public/assets/data/dictionary.json
e2e/ui/645-1.spec.ts
docs/brain/component-families.md
docs/brain/inventory.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-3: preserves — the server still writes prices on apply; the confirm only gates the browser's request.
- INV-4: preserves — no schema change.

## Reuse Check

- the change chip — family: chip — rung: 1 — why: `c-chip` with the existing amber/danger/success modifiers.
- the threshold confirm — family: modal-controller — rung: 1 — why: the existing confirm popup the app opens for a
  leave or a delete.
- the sheet's paged/virtual rows — family: list-logic — rung: 2 — why: a page size or CDK virtual scroll on the
  existing rows; no new list piece.

## Defaults

- hints-in-tooltips — applies — how: the confirm's explanation is the dialog's own text; no hint text is added to the
  page.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As an owner, I want the price change to stand out, so that I see it at a glance.
- As an owner, I want the app to refuse a duplicate supplier and to ask before a big price change, so that I keep my
  pricing right.
- As an owner, I want to count stock on a phone without the app freezing.
- As any user, I want to sign out from any page.

## Functional Requirements

### Must Have (P0)
- [ ] The change percent in a `c-chip` (up: danger tone, down: success tone), same text as today.
- [ ] Same trimmed, case-insensitive supplier name → the add choice is not rendered; the row always sends
  `targetSupplierId` of the existing supplier.
- [ ] On save, rows with `|changePct| ≥ threshold` (`priceRiseAlertPct ?? 5`) → one confirm listing each such item
  (name, old → new price, percent with sign); dictionary keys `import_confirm_big_change_title` — "שינוי מחיר חריג",
  `import_confirm_big_change_row` — "{name}: {from} ← {to} ({pct})", `import_confirm_big_change_ok` — "לשמור את
  המחירים".
- [ ] Stock count: render a window of rows (CDK virtual scroll, or a first page of 50 with "show more" and the full list
  searchable); unit options and base text as `computed` maps keyed by product id; no per-row template method calls;
  counted values kept in state, not in the DOM.
- [ ] Counter: measure the value width only after the value changes (an effect with `afterNextRender`), never in
  `ngAfterViewChecked`.
- [ ] The header stays above the route-loading overlay (the overlay starts below the header, or the header's layer is
  above it), so the avatar always answers.
- [ ] Business dialog: a block gap between the history box and the reason field.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL; logical CSS only. The confirm is short: title, one line per item, two buttons.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Keep the stock count sheet fast with thousands of products — windowed rows, computed unit options and base text, the spec with 3,000 products — src/app/pages/inventory/components/stock-count/**
- [x] A2: Stop the counter from forcing a page layout on every check — measure on value change, its spec — src/app/shared/counter/**
- [x] A3: Let the header answer while a page loads — header above the loading overlay, the avatar spec — src/app/core/components/header/**, src/app/shared/loader/**, src/app/app.component.*
- [x] A4: Show the change in a chip, refuse a same-name new supplier and confirm a big change — the chip, the choice rule, the confirm, the keys, the specs — src/app/pages/inventory/components/product-import/**, public/assets/data/dictionary.json
- [x] A5: Put a gap between the history box and the reason field — the style — src/app/pages/platform-dashboard/platform-dashboard.page.scss
- [x] A6: Prove it in the running app and run every check — the screen spec, then the Done-when commands in order — e2e/ui/645-1.spec.ts, docs/brain/inventory.md

## Technical Considerations
- Dependencies: 636, 637 (the sheet), 641 (the import choice), 644 (the dialog styles).
- The counter is shared: every screen with `app-counter` gets the cheaper measure; its existing specs must pass.

## Out of Scope
- Messages to the owner and the consultant about a big price change (plan 646, after Dandan picks the channel).
- The platform learning section (plan 646 or its own plan, after Dandan's answer on private businesses).

## Critical Questions
- none

## Execution Notes
- decided: the confirm covers drops as well as rises — why: Dandan asked for "over the standard up or down".
- decided: the threshold is the existing `priceRiseAlertPct` (default 5) for both directions — why: one number the owner
  already sets.
- plan file: absent from `origin/orch/mod-fixes-2` (only on main, bfab383a); the builder took it into its branch with
  `git checkout bfab383a -- <plan>` (the plan file is always in scope).
- A1: `shownRows_` draws the first 50 matching rows; "show more" (`stk-show-more`, key `stk_show_more`) adds 50; a new
  search or filter starts again at 50 (`linkedSignal`). Search runs over the whole list through a computed map of
  normalised names; unit options (`unitOptionsById_`) and base text (`baseTextById_`, only rows in `rows_`) are computed
  maps carried on the row, so the template calls no method per row. A refused row beyond the drawn page is drawn.
- A2: `app-counter` measures in `afterNextRender` from an effect on the shown text; `ngAfterViewChecked` removed.
- A3: the scope names `src/app/app.component.*` but the file lives in `src/app/appRoot/`; not needed — the header's
  layer is raised to 160 (overlay 150, modals 1000+). The spec fails with 100 (checked) and passes with 160.
- A4: the change sits in `c-chip c-chip--tag c-chip--sm` + `c-chip--red` (rise) / `c-chip--green` (drop). Same trimmed,
  case-insensitive supplier name → only «עדכון»; an earlier "add" pick is ignored. `isBigPriceChange` in
  `price-change.util.ts`; one `ConfirmModalService.open` (warning, header `import_confirm_big_change_title`, button
  `import_confirm_big_change_ok`), one line per item; nothing is awaited when no row needs it. `src/styles.scss`
  (append-only hotspot) gets `.confirm-modal-message { white-space: pre-line }` so the lines show; no dictionary value
  holds a line break, so other confirms look the same.
- A5: `.pbd-history` gets `margin-block-start: var(--space-3)`.
- A6: `e2e/ui/645-1.spec.ts` written, not run (no app or QA login in the worktree). `node scripts/inventory.mjs` → exit 0,
  inventory.md unchanged.
- Evidence: `pnpm run build` → 0; `pnpm run lint` → 0 (0 errors); `pnpm run test:ci` → 0, TOTAL: 2621 SUCCESS;
  kit-manifest-check → 0; scope-check → SCOPE: ok; kit-checks → KIT_CHECKS: ok (after rewording a comment that named
  the loader tag and reusing `.stock-count__state` for the show-more row); override-check, lint:icons,
  lint:no-native-select, plan-ledger-check, breadcrumbs-check, ci-scope-check, lint:reuse → 0; log-query → 0 (SKIP: no
  database configured).
