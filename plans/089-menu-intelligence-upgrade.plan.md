# Plan 089 — Menu Intelligence Page Upgrade

## A. Auto-name menu with date on save

**Files:** [menu-intelligence.page.ts](src/app/pages/menu-intelligence/menu-intelligence.page.ts)

Currently `name_` has `Validators.required`, so saving fails if empty. Changes:

1. Remove `Validators.required` from `name_` in the form definition (line 76).
2. In `save()` (line 598), before building the event, check if `name_` is empty. If so:
  - Format today's date as `DD/MM/YYYY` (e.g. `08/03/2026`).
  - Query `menuEventData.allMenuEvents_()` for existing names that start with that date string.
  - If none, use the date as the name. If duplicates exist, append ` (N)` where N is the next available number.
  - Patch `name_` into the form before building.
3. Add a helper `private generateDateName(): string` to encapsulate this logic.

### Timestamps (created_at_ / updated_at_)

**Files:** [menu-event.model.ts](src/app/core/models/menu-event.model.ts), [menu-intelligence.page.ts](src/app/pages/menu-intelligence/menu-intelligence.page.ts)

The model already has `created_at_?: number` but no `updated_at_`. Changes:

1. Add `updated_at_?: number` to the `MenuEvent` interface in `menu-event.model.ts`.
2. In `save()` in the page component:
  - When creating a new menu: set `created_at_: Date.now()` and `updated_at_: Date.now()` on the event before calling `addMenuEvent`.
  - When updating an existing menu: set `updated_at_: Date.now()` on the event before calling `updateMenuEvent`.

---

## B. Default event date to today on new menu

**Files:** [menu-intelligence.page.ts](src/app/pages/menu-intelligence/menu-intelligence.page.ts)

Currently `event_date_` initializes to `''` (line 78). Change the default to today's date in ISO format (`new Date().toISOString().slice(0, 10)`) so the date picker shows today when creating a new menu. No change needed for edit mode since `loadEvent` patches the saved date.

---

## C. Unified guest counter container

**Files:** [menu-intelligence.page.html](src/app/pages/menu-intelligence/menu-intelligence.page.html), [menu-intelligence.page.scss](src/app/pages/menu-intelligence/menu-intelligence.page.scss)

The current `.guest-control` (lines 103-112) has the +/- buttons and input loosely spaced. Redesign to a pill-shaped unified container:

- Wrap the three elements in a single `.counter-pill` container with subtle rounded corners and consistent inner padding.
- The minus button on the right (RTL), the number input centered, and the plus button on the left, separated by very faint inner dividers.
- Apply consistent sizing (height ~2.25rem) and remove the individual button borders.
- **Paper-blend styling:** Use colors that match the paper background -- very subtle borders (near-transparent), muted text, no strong contrast. The counter should feel embedded in the paper, not like a separate UI element. Avoid strong backgrounds or shadows; use `transparent` or near-paper-tone backgrounds. Hover states should be equally subtle.
- Use CSS layer per the project's cssLayer skill.

---

## D. Serving-portions-driven food cost and dish field improvements

This is a multi-part change across several files.

### D1. Food cost tied to serving_portions

**Concept:** `serving_portions` represents "portions per guest" (default 1.0 for dishes). The food cost formula becomes:

```
total_servings = serving_portions * guest_count
recipe_batches = total_servings / recipe_yield_amount
food_cost = recipe_batches * cost_per_batch
```

**Files:**

- [menu-intelligence.service.ts](src/app/core/services/menu-intelligence.service.ts) -- update `derivePortions` or add a new method that accepts `servingPortions` and computes: `servingPortions * guestCount`. Update `computeEventIngredientCost` to use `serving_portions_` from each item instead of `derived_portions_` when available.
- [menu-intelligence.page.ts](src/app/pages/menu-intelligence/menu-intelligence.page.ts) -- update `getAutoFoodCost` to use `serving_portions * guest_count / yield` as the multiplier. Update `selectRecipe` to set `serving_portions` default to 1 (portions-per-guest, not the recipe yield). Update `buildEventFromForm` to pass `serving_portions_` through correctly.
- [menu-event.model.ts](src/app/core/models/menu-event.model.ts) -- no structural change needed, `serving_portions_` field already exists on `MenuItemSelection`.

### D2. Sell price always visible next to dish name (all menu types)

**Files:** [menu-intelligence.page.html](src/app/pages/menu-intelligence/menu-intelligence.page.html), [menu-intelligence.page.scss](src/app/pages/menu-intelligence/menu-intelligence.page.scss), [menu-intelligence.page.ts](src/app/pages/menu-intelligence/menu-intelligence.page.ts)

- For **all** menu types, render a compact inline `sell_price` input between the dish name and the trash icon (closer to trash), inside the `.dish-header` row (around line 180-188).
- The input should be small, inline, always editable, styled to look like a price tag (currency prefix), blending with the paper aesthetic.
- Remove `sell_price` from the expandable `dish-data` fields to avoid duplication (since it's now always visible in the header row).

### D3. Footer showing all financial metrics

**Files:** [menu-intelligence.page.html](src/app/pages/menu-intelligence/menu-intelligence.page.html), [menu-intelligence.page.ts](src/app/pages/menu-intelligence/menu-intelligence.page.ts), [menu-intelligence.page.scss](src/app/pages/menu-intelligence/menu-intelligence.page.scss)

The footer (lines 254-263) currently shows total cost and food cost %. Enhance it to show four metrics:

1. **Total food cost (currency)** -- already exists (`eventCost_()`)
2. **Food cost %** -- already exists (`foodCostPct_()`), but currently returns 0 because `target_revenue_per_guest_` is not set. Compute revenue as sum of `sell_price * serving_portions * guest_count` across all items.
3. **Total revenue (currency)** -- new computed signal summing all `sell_price * serving_portions * guest_count`.
4. **Cost per guest (currency)** -- `eventCost_() / guest_count`.

Update `computeFoodCostPct` in `menu-intelligence.service.ts` to support revenue calculation (sum of sell prices) instead of only relying on `target_revenue_per_guest_`.

Add dictionary keys for new labels: `menu_total_revenue`, `menu_cost_per_guest`.

---

## E. Collapsible toolbar with floating FAB

**Files:** [menu-intelligence.page.html](src/app/pages/menu-intelligence/menu-intelligence.page.html), [menu-intelligence.page.scss](src/app/pages/menu-intelligence/menu-intelligence.page.scss), [menu-intelligence.page.ts](src/app/pages/menu-intelligence/menu-intelligence.page.ts)

### E1. Collapse the toolbar by default

- Add a signal `toolbarOpen_ = signal(false)`.
- Wrap the existing `.editor-toolbar` in a conditional: only render (or show via class) when `toolbarOpen_()` is true.
- When open, it should be `position: fixed; top: 0; left: 0; right: 0; z-index: 200` with a frosted glass background, and include a close button that sets `toolbarOpen_(false)`.

### E2. Menu-page FAB (opposite side of hero-fab)

- Handle inline in menu-intelligence page (no separate component needed since it's page-specific).
- Position: `fixed; bottom: 0.75rem; right: 0.75rem` (opposite of hero-fab which is `left: 0.75rem`).
- Same animation pattern as hero-fab: main button with pop-up action buttons on hover.
- Two action buttons that pop up:
  1. **Open toolbar** -- opens the toolbar overlay (sets `toolbarOpen_(true)`)
  2. **Go back** -- navigates back to menu-library
- Main button icon: `settings` or `menu` lucide icon.

### E3. Adjust hero-fab offset

The existing hero-fab already has an `above-bar` class when on menu-intelligence. Since both FABs are on opposite sides (left vs right), no conflict expected, but verify spacing.

---

## Dictionary additions

Add to [dictionary.json](public/assets/data/dictionary.json):

- `menu_total_revenue`: "הכנסה כוללת"
- `menu_cost_per_guest`: "עלות לאורח"
- `menu_toolbar_open`: "פתח סרגל כלים"
- `close`: "סגור" (if not already present)
