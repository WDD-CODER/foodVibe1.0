# Gap Analysis — Old FoodVibe app vs. new Claude Design

Cross-reference of [`old-app-inventory.md`](./old-app-inventory.md) (Step 1) and [`new-design-inventory.md`](./new-design-inventory.md) (Step 2).

**Status values:** `kept` · `dropped` · `changed` · `unclear`

Nothing has been pre-filtered by importance. Minor and rarely-used functionality is listed alongside major functionality. Rows are grouped by page/area so you can triage a section at a time.

**Counts:** 485 rows — `kept` 50 · `changed` 139 · `dropped` 281 · `unclear` 15

> One thing to know before reading: the synced design is a **click-through prototype**, not production markup. Many controls exist visually but have no handler. Where a control is *drawn* but inert, the row is marked `changed` (present, behaviour undefined) rather than `kept` — the Notes column says which.

---

## A. Global shell, navigation, auth

| Feature | Page/Component | In old app | In new design | Status | Notes |
|---|---|---|---|---|---|
| RTL layout | Global | Yes — `dir="rtl"` on every page root | Yes — `dir="rtl"` on shell + cook view | kept | |
| Hebrew UI via `translatePipe` + `dictionary.json` | Global | Yes — every string is a key | No — Hebrew is hard-coded in template literals | changed | Expected for a prototype, but it means the design carries **no key names**; copy must be re-keyed during migration |
| Desktop nav pills | Header | 4 items: Dashboard, Inventory, Recipe book, Menu library | 7 items: + Venues, Suppliers, Trash | changed | Venues/Suppliers/Trash promoted from dashboard tabs to top-level nav |
| Settings destination | Header | Reached via Dashboard → Core settings tab | Reached by clicking the user chip → `#/settings` | changed | |
| Mobile hamburger drawer | Header | Yes — small-tablet drawer with close button + backdrop | Yes — `toggleSidebar()` + `#sb-scrim`, auto-closes below 900px | changed | Old breakpoint behaviour and the drawer's own auth section are not reproduced |
| **Mobile bottom tab bar** (≤620px) | Header | Yes — 4 icon+label tabs, `env(safe-area-inset-bottom)` | Not present | dropped | The design system README still documents a `3.5rem` bottom tab bar, but no markup implements it |
| **Mobile floating avatar FAB** (≤620px) | Header | Yes — tap toggles a name button that logs out | Not present | dropped | |
| Guest avatar + "Sign in" link | Header | Yes | Not present in the app prototype | dropped | `GlassComponents.TopNav` has `user`/`onAuth`/`onLogout` props, but they are unused — see next row |
| Logged-in user chip | Header | Avatar image *or* initials fallback + name | Avatar initials + **name + role line** ("המטבח בריינה") | changed | Adds a role/venue line. Loses the uploaded-image avatar path |
| **Admin crown badge** on avatar | Header | Yes — when `user.role === 'admin'` | Not present | dropped | |
| Username button = logout | Header | Yes — clicking your own name logs out | No — clicking the user chip opens Settings | changed | Arguably a fix; flagging because logout has no home in the new design |
| **Logout unsaved-changes safety** | Header | Yes — walks the route tree, navigates to `/dashboard` first so `canDeactivate` runs, **aborts logout if the guard cancels** | Not present | dropped | Subtle and easy to lose; protects against silent data loss on logout |
| Sign in / Sign up entry points | Header + auth modal | Yes — desktop link, drawer buttons, mobile FAB | Not present | dropped | |
| **Global search (⌘K)** | Header | Not present | Yes — search input with a `⌘K` hint | changed | **New capability.** Inert in the prototype; no scope defined (products? recipes? everything?) |
| **Notifications bell + unread dot** | Header | Not present | Yes | changed | **New capability.** No notification system exists in the app |
| **Help button** | Header | Not present | Yes | changed | **New capability.** No target defined |
| **Nav count badges** | Header | Not present | Yes — Inventory `7` (low stock), Recipes `3` (pending) | changed | **New capability.** Hard-coded; would need live wiring |
| Global route-loading overlay | App shell | Yes — pot loader with `loader_please_wait` | Not present | dropped | |
| Global data-reloading overlay | App shell | Yes | Not present | dropped | |
| Global toast (`user-msg`) with **undo** | App shell | Yes — typed toast, click-to-dismiss, optional undo action | Not present | dropped | The undo affordance in particular has no replacement |
| **Hero FAB** (flame) with page-registered actions | App shell | Yes — every page pushes its own quick actions; always appends chef-hat → recipe builder; lifts above the menu bar | Not present | dropped | Removes the primary "create" affordance on mobile |
| 13 service-driven global modals | App shell | Yes — all `@defer`-mounted singletons | One generic modal with 3 hard-coded kinds | changed | See §K for the per-modal breakdown |
| Confirm modal (danger/warning variants, optional third "save" button) | App shell | Yes | Not present | dropped | The three-button *Cancel / Save / Discard* shape is what makes the unsaved-changes flow work |
| `pendingChangesGuard` unsaved-changes flow | Routing | Yes — on product form, recipe builder, menu intelligence, `/cook/:id` | Not present | dropped | No design for "you have unsaved changes" anywhere |
| `authGuard` on protected routes | Routing | Yes — 12 routes | Not present | dropped | |
| Route resolvers / data prefetch | Routing | Yes — 10 resolvers | N/A (static data) | unclear | Not a design concern per se, but the new design shows no loading treatment for the gap they cover |
| Deep-link query params (`?tab=`, `?filters=`, `?lowStock=1`, `?view=history`) | Routing | Yes | Hash router with `#/name/:id` only | changed | Dashboard KPI → pre-filtered list deep-links (§B) depend on this |
| `/command-center` → `/dashboard?tab=metadata` redirect | Routing | Yes | Not present | dropped | Legacy alias; may be intentional to drop |
| Breadcrumbs | Global | Not present | Yes — on product and recipe detail (`/` separators) | changed | **New pattern.** No RTL-specific separator decision recorded |
| Page-header pattern (eyebrow + title + lede + actions) | Global | Not present — pages use a bare `h1`/`h2` | Yes — used on 8 screens | changed | **New pattern**, applied consistently |

---

## B. Dashboard

| Feature | Page/Component | In old app | In new design | Status | Notes |
|---|---|---|---|---|---|
| Dashboard as a tabbed page (5 tabs) | Dashboard | Yes — overview / metadata / venues / add-venue / trash, tab in the URL | No — tabs became top-level nav destinations | changed | The dashboard is now overview-only |
| Tab state in the URL (`?tab=`, `replaceUrl`) | Dashboard | Yes | Not applicable | dropped | |
| KPI: total products | Dashboard | Yes | Yes | kept | |
| KPI: total recipes | Dashboard | Yes | Yes | kept | |
| KPI: low stock (warning tone) | Dashboard | Yes | Yes | kept | |
| KPI: unapproved recipes (info tone) | Dashboard | Yes | Yes — plus a `/45` denominator | changed | Now shows `3/45` rather than a bare count |
| **KPI delta pills** (`+8 השבוע`, trend up/down/hold) | Dashboard | Not present | Yes on all 4 cards | changed | **New capability.** Requires week-over-week history the app does not currently compute |
| KPI sparklines | Dashboard | Yes — decorative, hard-coded paths | Yes — decorative, hard-coded paths | kept | Still decorative in both |
| KPI footer link "View inventory" / "View recipes" | Dashboard | Yes — 1–2 text links per card | Yes — a single `צפה ←` link | changed | |
| KPI card **"Add product"** secondary link | Dashboard | Yes — on the products card, disabled when logged out | Not present | dropped | |
| **Whole KPI card is clickable** | Dashboard | No — only the footer links | Yes — `onclick` on the `<article>` | changed | |
| Deep-link: low stock → `/inventory?lowStock=1` | Dashboard | Yes | Links to `#/inventory` with no filter | changed | The pre-filter is lost |
| Deep-link: unapproved → `/recipe-book?filters=Approved:false` | Dashboard | Yes | Links to `#/recipes` with no filter | changed | The pre-filter is lost |
| Greeting + daily summary lede | Dashboard | Not present | Yes — "ברוך הבא, אבי" + "4 מוצרים דורשים תשומת לב היום…" | changed | **New capability** |
| Date eyebrow ("Dashboard · Apr 18") | Dashboard | Not present | Yes | changed | **New capability** |
| Header action: "AI מתכון" | Dashboard | Not present on the dashboard (lives on the recipe book FAB) | Yes | changed | AI entry point moved to the dashboard header |
| Header action: "מוצר חדש" | Dashboard | Only as a KPI-card link | Yes — dark primary button | changed | |
| Recent activity feed | Dashboard | Yes — last 10, read live from localStorage | Yes — 4 hard-coded rows | kept | Shape preserved: avatar letter, entity tag, name, change tags, action pill |
| Activity entity avatar letter (P/R/D) | Dashboard | Yes | Yes (`P`/`D`/`P`) | kept | New design uses `Product`/`Dish`/**`Prep`** as entity labels vs old `product`/`dish`/`preparation` |
| Activity change tags `label: from → to` | Dashboard | Yes | Yes | kept | |
| **Change tag → popover** with full before/after | Dashboard | Yes — fixed-position popover anchored to the chip, click-outside close | Not present | dropped | Tags are static text in the new design |
| **Horizontal scroll buttons** on the change strip | Dashboard | Yes — mobile affordance, scrolls by 60% of width | Not present | dropped | |
| Vertical scroll indicators on the activity list | Dashboard | Yes — `scrollIndicators` + fade zones + chevrons | Not present | dropped | |
| Activity empty state (`no_recent_activity`) | Dashboard | Yes | Not present | dropped | |
| "All entities" filter chip | Dashboard | Not present | Yes — decorative chip in the section head | unclear | Reads like an entity-type filter, but there is no dropdown or handler. Intent unknown |
| Dashboard sub-header nav (Core settings / Venue list / Trash / Suppliers) | Dashboard | Yes — `c-tab-pill` row | Not present (moved to main nav) | changed | |
| Second, different dashboard header for the metadata tab (with "Back to dashboard") | Dashboard | Yes — a whole separate component | Not present | dropped | |

---

## C. Inventory list

| Feature | Page/Component | In old app | In new design | Status | Notes |
|---|---|---|---|---|---|
| Product list | Inventory | Yes — list-shell grid | Yes — HTML table | changed | Table markup instead of the CSS-grid list shell |
| Search by product name | Inventory | Yes — live filter, URL-synced (`?q=`) | Input drawn, no handler | changed | |
| Sortable columns (name / category / supplier) | Inventory | Yes — click, Enter, Space; asc↔desc; 3-state arrow icon | Not present; a generic inert "מיון" button instead | changed | Sort direction, keyboard activation and the arrow-state icon are all lost |
| Sort by date / by allergens | Inventory | Comparator exists, not wired to a header | Not present | dropped | Already dormant in the old app |
| Filter panel (collapsible aside) | Inventory | Yes — with backdrop, swipe-to-close, persisted per-list open state | Not present; a generic inert "סינון" button instead | dropped | |
| Filter: low stock | Inventory | Yes — checkbox, URL-synced | Represented as a "מלאי נמוך" tab pill (inert) | changed | |
| Filter: invalid only | Inventory | Yes | Not present | dropped | |
| Filter: incomplete only | Inventory | Yes | Not present | dropped | |
| Filter: has nutrition / missing nutrition (mutually exclusive) | Inventory | Yes | Not present | dropped | |
| Dynamic filter groups: Allergens / Category / Supplier | Inventory | Yes — built from data, collapsible, count badges, RTL chevron flip | Category only, as a static tab-pill row with counts | changed | Allergen and supplier filtering are gone; category filtering became tabs |
| "Clear filters" | Inventory | Yes — shown only when filters are active | Not present | dropped | |
| URL-synced list state (`q`, `sort`, `order`, `filters`, `lowStock`, `nutrition`) | Inventory | Yes | Not present | dropped | |
| Column: product name | Inventory | Yes | Yes | kept | |
| Column: category | Inventory | Yes | Yes — as a chip | changed | |
| Column: **current stock quantity + `(min N)`** | Inventory | Not present — the old list only shows a low-stock *badge* | Yes | changed | **New data concept.** The old model has `min_stock_level_` but no on-hand quantity |
| Column: unit | Inventory | Yes | Yes | kept | |
| Column: **cost** (separate from price) | Inventory | Not present as a distinct list column | Yes | changed | **New data concept** distinct from `buy_price_global_` |
| Column: price | Inventory | Yes — read-only, ₪, 2dp | Yes — ₪ | kept | |
| Column: supplier | Inventory | Yes | Yes | kept | |
| Column: allergens (count button + expandable pills) | Inventory | Yes | Not present | dropped | |
| Column: status pill (`תקין` / `נמוך`) | Inventory | Low-stock badge on the name cell | Dedicated status column | changed | |
| **Product SKU/code sub-line** | Inventory | Not present | Yes — uppercase id under the name | changed | **New data concept** |
| Product glyph tile (Hebrew initial) | Inventory | Not present | Yes | changed | **New visual element** |
| Nutrition badge (leaf + rich tooltip) | Inventory | Yes | Not present | dropped | The whole nutrition tooltip (macro bar, legend, per-nutrient rows, OFF attribution) has no counterpart |
| Validation badges (invalid / incomplete + per-field icon tooltip) | Inventory | Yes — `row--invalid` / `row--incomplete` row tinting | Not present | dropped | |
| Row click → edit | Inventory | Yes — with exclusions for buttons/links/allergen wrapper/checkbox | Row click → **product detail page** | changed | Different destination (detail, not edit) |
| Row keyboard activation (Enter / Space) | Inventory | Yes | Not present | dropped | |
| Row actions menu (edit / delete) | Inventory | Yes — collapses behind `more-vertical` on mobile | Not present on the list | dropped | Edit/duplicate/delete moved to the detail page |
| Per-row delete loader | Inventory | Yes | Not present | dropped | |
| Delete confirm (Hebrew, danger variant) | Inventory | Yes | Not present | dropped | |
| Selection checkboxes + select-all | Inventory | Yes | Not present | dropped | |
| Selection bar (count, clear, bulk delete) | Inventory | Yes | Not present | dropped | |
| Bulk edit (category / supplier / allergens / unit) | Inventory | Yes — two-step field → value flow | Not present | dropped | |
| Inline price edit with confirm + revert | Inventory | Handlers exist; the cell currently renders read-only | Not present | dropped | Already dormant in the old app — flagging so the decision is explicit |
| Inline unit change with price re-conversion | Inventory | Yes (`onUnitChange`) | Not present | dropped | |
| Column carousel on narrow screens | Inventory | Yes — Category/Allergens/Supplier collapse into one swipeable slot | Not present | dropped | The app's core responsive-table strategy |
| Empty-database state (`empty_inventory` + CTA) | Inventory | Yes | Not present | dropped | |
| No-results state (`no_products_match`) | Inventory | Yes — distinct from empty | Not present | dropped | |
| Logged-out disabling + `sign_in_to_use` titles | Inventory | Yes on add/edit/delete | Not present | dropped | |
| Inventory ↔ Logistics sub-nav | Inventory | Yes — inside the filter panel | Not present | dropped | Equipment has no home in the new design |
| Hero FAB: add product + AI product create | Inventory | Yes | Not present | dropped | AI product creation has no entry point in the new design |
| Header action: **"ייצוא" (export)** | Inventory | Not present on the inventory list | Yes — ghost button | changed | **New capability.** No format or scope defined |
| Header lede: live count + "updated 12 minutes ago" | Inventory | Not present | Yes | changed | **New capability** — a data-freshness indicator |

---

## D. Product detail & product form

| Feature | Page/Component | In old app | In new design | Status | Notes |
|---|---|---|---|---|---|
| **Product detail (read-only) page** | — | Not present — list goes straight to the edit form | Yes — `#/product/:id` | changed | **New screen.** Inserts a step between list and edit |
| Hero stat: current stock | Product detail | Not present | Yes | changed | Depends on the new stock-quantity concept |
| Hero stat: price | Product detail | In the form | Yes | kept | |
| Hero stat: cost | Product detail | Not present as a separate field | Yes | changed | |
| **Hero stat: margin %** | Product detail | Not present | Yes — computed `1 − cost/price` | changed | **New capability** |
| Panel: units & alternatives | Product detail | Equivalent data lives in the purchase-options FormArray | Yes — read-only summary of base unit + 1 alternative + yield % | changed | Shows only one alternative; the old model supports N purchase options |
| **Field: density** | Product detail | Not present | Shown as `—` | unclear | A new field is implied but never populated. Intent unknown |
| **Panel: "used in recipes"** | Product detail | Not present | Yes — clickable list of recipes using this product | changed | **New capability.** The reverse lookup exists in code (`getRecipeProductIds`) but is not surfaced |
| **Panel: price history chart** (30 days) | Product detail | Not present | Yes — SVG area chart | changed | **New capability.** No price history is persisted today |
| Panel: supplier summary (contact / min order / lead time) | Product detail | Data exists on the supplier entity | Yes — read-only | changed | Surfaces supplier data on the product, which is new |
| Action: edit | Product detail | Row action on the list | Yes | changed | |
| **Action: duplicate product** | Product detail | Not present for products | Yes | changed | **New capability** (recipes have a dormant duplicate; products never did) |
| Action: delete | Product detail | Row action on the list | Yes | changed | No confirm designed |
| — | — | — | — | — | — |
| **Product form** (`/inventory/add`, `/edit/:id`) | Product form | Yes — full reactive form | Only a 5-field "add product" modal | changed | The modal covers name, category, base unit, price, cost. Everything below is missing from it |
| Auto-focus the name input | Product form | Yes | Not specified | dropped | |
| Duplicate-name validation | Product form | Yes → `duplicate_product_name_error` | Not present | dropped | |
| Category as a multi-chip search dropdown | Product form | Yes — with "add new category" → translation-key modal | Native `<select>` with 3 hard-coded options | changed | Also contradicts both the old convention and the new design system README ("native `<select>` is disallowed") |
| Base unit select with "create new unit" | Product form | Yes — `NEW_UNIT` opens the unit creator; an effect writes the new unit back | Plain text input | changed | |
| **Purchase options FormArray** | Product form | Yes — unit `=` conversion `:` UOM rows, auto-computed conversion + suggested price, add/remove rows, per-row validation | Not present | dropped | One of the most intricate pieces of the old form |
| Special-purchase-price checkbox + override input | Product form | Yes | Not present | dropped | |
| Override-price blur confirm (snap-back / equality tolerance / confirm modal) | Product form | Yes | Not present | dropped | |
| Collapsible optional field: supplier | Product form | Yes — chip dropdown + "add supplier" flow; auto-collapses when empty | Not present | dropped | |
| Collapsible optional field: allergens | Product form | Yes — chip dropdown, "add new allergen" → translation-key modal | Not present | dropped | |
| Collapsible optional field: waste % ↔ yield factor (bidirectionally synced) | Product form | Yes — with helper text and a live net-cost alert | Yield % appears read-only on the detail page | changed | The *editing* of yield/waste is gone; only a display value survives |
| Collapsible optional field: min stock level | Product form | Yes | Not present | dropped | |
| Collapsible optional field: expiry days default | Product form | Yes | Not present | dropped | |
| Auto-expand optional fields that hold non-default values | Product form | Yes | Not present | dropped | Subtle affordance |
| Keyboard activation (Enter/Space) on collapsible headers | Product form | Yes | Not present | dropped | |
| Field-level validation errors + `aria-invalid` | Product form | Yes — 4 fields | `Input` component has an `error` prop; unused in the modal | changed | Capability exists in the kit, not applied |
| Global "form has errors" toast | Product form | Yes | Not present | dropped | |
| `saveAndWait()` guard integration + snapshot-diff dirty check | Product form | Yes | Not present | dropped | |
| Legacy `category_` / `is_dairy_` migration on hydrate | Product form | Yes | N/A | unclear | Data-layer concern; noting it so it is not lost in a rewrite |
| Sparkles → AI product edit, pre-seeded from the form | Product form | Yes | Not present | dropped | |
| "Back to list" + save/update button with icon+label swap | Product form | Yes | Modal Cancel / Save | changed | |

---

## E. Recipe book & recipe detail

| Feature | Page/Component | In old app | In new design | Status | Notes |
|---|---|---|---|---|---|
| Recipe list format | Recipe book | Table (list shell) | **Card grid with banner images** | changed | The single biggest visual change on this screen |
| **Recipe photo / banner image** | Recipe book | Image exists on the recipe model and in the builder header, but is not shown in the list | Yes — banner with a placeholder icon fallback | changed | Promotes an existing field to the primary visual |
| **Difficulty** | Recipe book | Not present | Yes — on the card | changed | **New data concept** |
| **Total time (minutes)** | Recipe book | Per-step labor/cook times exist; no recipe-level total | Yes — clock icon + minutes | changed | **New data concept** (derivable from step times) |
| Yield + unit on the card | Recipe book | Not on the list (only in the cost tooltip) | Yes — scale icon | changed | |
| Status: approved / pending / draft | Recipe book | Boolean `is_approved_` only | **Three states** | changed | Needs a data-model decision |
| Type column (dish / preparation) | Recipe book | Yes — sortable | Not present | dropped | The dish-vs-preparation distinction disappears from the list entirely |
| Labels column (count button → coloured chips) | Recipe book | Yes — colours from the label registry | Only a single category tag on the banner | changed | Label colours, multi-label display and auto-labels are all lost |
| Allergens column (count button → chips, recursive through sub-recipes) | Recipe book | Yes | Not present | dropped | Recursive allergen resolution is a real piece of logic behind this |
| Rating stars (inline, editable, read-only when logged out) | Recipe book | Yes | Not present on the card | dropped | Rating survives only inside the cook view |
| Cost column | Recipe book | Yes — ₪ 2dp from `RecipeCostService` | Not present on the card | dropped | Cost/portion appears on the detail page instead |
| Cost tooltip (hover **and** tap-toggle, shows yield description) | Recipe book | Yes | Not present | dropped | The dual hover/tap pattern is easy to overlook |
| Date-added column + hover tooltip showing updated date | Recipe book | Built but hidden (`hideDateColumn_ = true`) | Not present | dropped | Already dormant — flagging so the decision is explicit |
| Sortable headers (name / type / cost / rating / date) | Recipe book | Yes | Not present | dropped | |
| Expand-all toggle on the Labels and Allergens headers | Recipe book | Yes | Not present | dropped | |
| Expand-state reset on navigating back to the list | Recipe book | Yes — on every `NavigationEnd` | Not present | dropped | |
| Row action: favourite (heart) | Recipe book | Yes — per-user `favoritedBy_` | Not present | dropped | |
| Row action: **cook** → `/cook/:id` | Recipe book | Yes — available even when logged out | Moved to the recipe **detail** page as the primary button | changed | One more click to reach cook mode from the list |
| Row action: delete | Recipe book | Yes — rendered only when logged in | Not present | dropped | |
| Row click behaviour depends on auth (builder when logged in, cook view when logged out) | Recipe book | Yes | Card always opens the detail page | changed | |
| Selection + bulk delete | Recipe book | Yes | Not present | dropped | |
| Bulk edit: labels, recipe type | Recipe book | Yes | Not present | dropped | |
| Filter: favourites only (logged-in only) | Recipe book | Yes | Not present | dropped | |
| **Filter: search by ingredients** (debounced server-side, chips, recursive match) | Recipe book | Yes | Not present | dropped | A substantial, distinctive feature |
| Filter: date range + "also match by updated" + newest/oldest sort buttons | Recipe book | Yes | Not present | dropped | |
| Filter group: Type | Recipe book | Yes | Not present | dropped | |
| Filter group: **"do not include allergens"** (inverted logic) | Recipe book | Yes | Not present | dropped | The inversion is the point — worth an explicit decision |
| Filter group: Labels (with synthetic `no_label`) | Recipe book | Yes | Not present | dropped | |
| Filter group: Approved (always shows both options) | Recipe book | Yes | A "מחכים לאישור" tab pill (inert) | changed | |
| Filter group: Station (with synthetic `no_station`) | Recipe book | Yes | Not present | dropped | |
| Auto-expand filter groups that have values (for deep links) | Recipe book | Yes | Not present | dropped | |
| Category tab pills with counts | Recipe book | Not present | Yes — 6 category pills + a pending pill | changed | **New pattern**, replaces part of the filter panel |
| Empty-database state (`empty_recipe_book` + CTA) | Recipe book | Yes | Not present | dropped | |
| No-results state (`no_recipes_match`) | Recipe book | Yes | Not present | dropped | |
| Hero FAB: "add recipe with AI" | Recipe book | Yes | Moved to a header "AI מתכון" button (placeholder modal) | changed | |
| Version-history overlay | Recipe book | Markup present, **no control invokes it** | Not present | dropped | Already unreachable — explicit decision needed |
| Duplicate recipe (`copy_of` prefix, forces unapproved) | Recipe book | Implemented, **not wired to any control** | Not present | dropped | Already unreachable |
| Toggle approval from the list | Recipe book | Implemented, **not wired** | Not present | dropped | Already unreachable |
| Hide recipe / permanently delete (with its own confirm) | Recipe book | Implemented, **not wired** | Not present | dropped | Already unreachable |
| — | — | — | — | — | — |
| **Recipe detail (read-only) page** | — | Not present | Yes — `#/recipe/:id` | changed | **New screen** |
| Hero stats: yield, time, cost/portion, status | Recipe detail | Scattered across the builder header | Yes | changed | |
| Steps panel with **per-step titles** | Recipe detail | Steps have `instruction_` only — no title | Yes — bold title + body + time | changed | **New data concept** (step titles) |
| Ingredients panel with **per-ingredient prep notes** | Recipe detail | Not present | Yes — "בשלות, חתוכות לקוביות" | changed | **New data concept** |
| **Nutrition per serving** panel | Recipe detail | Not present (only per-100 g on products) | Yes — kcal / protein / fat / carbs | changed | **New capability**; requires roll-up from ingredients |
| Action: print | Recipe detail | Only inside the builder's export toolbar | Yes — ghost button | changed | |

---

## F. Recipe builder

> The entire recipe builder — the largest and most intricate screen in the product — has **no counterpart in the new design**. Every row below is `dropped` for the same reason; they are listed individually because each is a separate decision.

| Feature | Page/Component | In old app | In new design | Status | Notes |
|---|---|---|---|---|---|
| Recipe builder screen | Recipe builder | Yes (`/recipe-builder`, `/:id`) | Not present | dropped | Only a 4-field "new recipe" modal exists |
| Dish ⇄ preparation type toggle | Recipe header | Yes — reshapes the whole page | Not present | dropped | |
| Recipe image upload (click-to-upload, hover overlay, readonly variant) | Recipe header | Yes | Not present | dropped | Photos appear on cards but there is no upload UI |
| Recipe name with async cross-collection duplicate validation | Recipe header | Yes — 300 ms debounce, excludes the current record | Not present | dropped | |
| Rating stars in the header | Recipe header | Yes | Not present | dropped | |
| Primary scaling chip (amount + unit + create-unit) | Recipe header | Yes | Not present | dropped | |
| Yield-sync badge — preparation variant (`yield_sync_to_total`) | Recipe header | Yes | Not present | dropped | |
| Yield-sync badge — dish variant (`dish_reset_to_saved`) | Recipe header | Yes | Not present | dropped | Two different behaviours behind one badge |
| Secondary unit chips (add / edit / remove) | Recipe header | Yes | Not present | dropped | |
| Labels multi-select with read-only **auto-label** chips | Recipe header | Yes | Not present | dropped | |
| "Add new label" → label-creation modal from the header | Recipe header | Yes | Not present | dropped | |
| Clear-all that clears only *manual* labels | Recipe header | Yes | Not present | dropped | |
| Metrics square: cost | Recipe header | Yes | Not present | dropped | |
| Metrics square: **weight ⇄ volume toggle** (g / L / ml) | Recipe header | Yes | Not present | dropped | |
| Unconvertible-ingredients notice (icon → floating list with scroll indicators, hover + click) | Recipe header | Yes | Not present | dropped | |
| Collapsible sections with **localStorage-persisted** state (×3) | Recipe builder | Yes (`rb_col_ingredients`, `rb_col_workflow`, `rb_col_logistics`) | Not present | dropped | |
| Ingredient table with **drag-and-drop reordering** | Ingredients table | Yes — CDK drop list, grip handle, custom placeholder | Not present | dropped | |
| Inline ingredient search (products **and** recipes, type pills, keyboard nav, exclude-already-used, add-new row) | Ingredients table | Yes | Not present | dropped | |
| Re-open search by clicking a selected ingredient name | Ingredients table | Yes | Not present | dropped | |
| Row state: blocking/invalid (badge + `fix` label → quick-edit at `invalid` tier) | Ingredients table | Yes | Not present | dropped | |
| Row state: warning/incomplete (badge → quick-edit at `incomplete` tier) | Ingredients table | Yes | Not present | dropped | |
| Row state: unlinked (`⚠ unlinked_ingredient` + link badge) | Ingredients table | Yes | Not present | dropped | |
| Row state: normal (pencil edit badge) | Ingredients table | Yes | Not present | dropped | |
| Nutrition badge on product rows | Ingredients table | Yes | Not present | dropped | |
| Per-row unit select with `__add_unit__` → unit creator | Ingredients table | Yes | Not present | dropped | |
| Quantity −/+ with **unit-aware arrow-key stepping** and Enter-adds-row | Ingredients table | Yes | Not present | dropped | |
| Percent-of-total column | Ingredients table | Yes | Not present | dropped | |
| Cost column with a `pending` state | Ingredients table | Yes | Not present | dropped | |
| Inline **quick-edit product accordion** (desktop only, tier-highlighted field, own unsaved-changes overlay, "open full edit" escape) | Ingredients table | Yes | Not present | dropped | A whole sub-component |
| Auto-focus the quantity input after picking an ingredient | Ingredients table | Yes | Not present | dropped | |
| Workflow editor — **preparation variant** (numbered steps, drag-reorder, auto-grow textarea, Enter-adds-step) | Workflow | Yes | Not present | dropped | |
| Per-step **labor-time** timer (clock icon, `m:ss`, click-to-type) | Workflow | Yes | Not present | dropped | Distinct from cooking time |
| Per-step **cooking-time** timer (timer icon, `hh:mm:ss`, click-to-type) | Workflow | Yes | Not present | dropped | Feeds the cook view's countdown |
| Workflow editor — **dish variant** (flat mise-en-place: preparation search, category, quantity, unit) | Workflow | Yes | Not present | dropped | |
| Preparation search grouped by category with add-new | Workflow | Yes | Not present | dropped | |
| Logistics section: tool search with keyboard nav + add-new-tool modal | Logistics | Yes | Not present | dropped | |
| Logistics quantity counter (min 1, integer-only) | Logistics | Yes | Not present | dropped | |
| Logistics chips with `×qty` and an **unresolved** state for free-text tools | Logistics | Yes | Not present | dropped | |
| Export toolbar: recipe info (view/export) | Export | Yes | Not present | dropped | |
| Export toolbar: shopping list (view/export) | Export | Yes | Not present | dropped | |
| Export toolbar: cooking steps — preparation only | Export | Yes | Not present | dropped | |
| Export toolbar: dish checklist — dish only | Export | Yes | Not present | dropped | |
| Export toolbar: all together | Export | Yes | Not present | dropped | |
| Export toolbar: print | Export | Yes | Not present | dropped | |
| Export preview "paper" dialog (recipe-sheet layout **and** generic-sections layout) | Export preview | Yes | Not present | dropped | |
| Save gate 1: async-validation race guard | Save flow | Yes | Not present | dropped | |
| Save gate 2: composed multi-error Hebrew message (`חסרים: a; b; c`) | Save flow | Yes — enumerates every problem by name | Not present | dropped | |
| Save gate 3: blocking rows + scroll-to-first-error | Save flow | Yes | Not present | dropped | |
| Save gate 4: unlinked-ingredients confirm | Save flow | Yes | Not present | dropped | |
| Save gate 5: neto / portions confirm (different copy per type) | Save flow | Yes | Not present | dropped | |
| Save gate 6: type-change confirm (dish ⇄ preparation) | Save flow | Yes | Not present | dropped | |
| Auto-label recomputation on save | Save flow | Yes | Not present | dropped | |
| Approve stamp with unsaved-changes confirm | Approve | Yes | Cook view has a stamp toggle, but no unsaved-changes path | changed | |
| History view mode (read-only banner, disabled form, hidden sections) | Recipe builder | Yes — `?view=history&…` | Not present | dropped | |
| Hero FAB: AI edit / export / cook view | Recipe builder | Yes | Not present | dropped | |
| Snapshot-based dirty tracking captured in `afterNextRender` | Recipe builder | Yes | Not present | dropped | |

---

## G. Menu library & menu intelligence

| Feature | Page/Component | In old app | In new design | Status | Notes |
|---|---|---|---|---|---|
| Menu library as a card grid | Menu library | Yes — already a card grid | Yes | kept | One of the few screens whose format did not change |
| Card: event name | Menu library | Yes | Yes | kept | |
| Card: event type · date subtitle (`menu_no_date` fallback) | Menu library | Yes | Replaced by a **season/context line** ("קיץ 2025") | changed | Date is gone; "season" is a new concept |
| Card tag: **food cost %** | Menu library | Yes | Not present | dropped | |
| Card tag: **total revenue** (`dir="ltr"` value) | Menu library | Yes | Not present | dropped | |
| Card tag: **guest count** (`dir="ltr"` value) | Menu library | Yes | Not present | dropped | |
| Card: **item / dish count** | Menu library | Computed but not rendered | Yes — in the card footer | changed | A dormant old helper becomes visible |
| Card action: edit | Menu library | Yes — auth-gated | Not present (cards are not even clickable) | dropped | |
| Card action: clone (with loader) | Menu library | Yes | Not present | dropped | |
| Card action: delete (with loader) | Menu library | Yes | Not present | dropped | |
| Search | Menu library | Yes — URL-synced | Input drawn, inert | changed | |
| Filter: event type | Menu library | Yes | Not present | dropped | |
| Filter: serving style | Menu library | Yes | Not present | dropped | |
| Filter: date-from | Menu library | Yes — click/Enter/Space opens the native picker | Not present | dropped | |
| Sort select + direction toggle | Menu library | Yes | Not present | dropped | |
| Empty state | Menu library | Yes — icon + copy (covers both empty and no-results) | Not present | dropped | |
| Create button auth-gating | Menu library | Not gated in the old app either | Not gated | kept | |
| — | — | — | — | — | — |
| **Menu intelligence editor** | — | Yes (`/menu-intelligence`, `/:id`) | Not present | dropped | Second-largest screen after the builder; every row below is part of it |
| "Paper" menu metaphor with ornaments and `✦` dividers | Menu editor | Yes | Not present | dropped | |
| Event-type chip → search dropdown with add-new | Menu editor | Yes | Not present | dropped | |
| Serving-type select | Menu editor | Yes | Not present | dropped | |
| Menu title input (auto-focused) | Menu editor | Yes | Not present | dropped | |
| Guest-count chip input | Menu editor | Yes | Not present | dropped | |
| Date chip with formatted display over a native input | Menu editor | Yes | Not present | dropped | |
| **Date digit-buffer capture** (`DDMMYYYY` with clamping) | Menu editor | Yes | Not present | dropped | Highly specific keyboard affordance |
| **Field focus order** with Enter/Tab/Arrow navigation | Menu editor | Yes — 6-step order ending in the first section | Not present | dropped | |
| Document-level capture-phase key router into open dropdowns | Menu editor | Yes | Not present | dropped | |
| Sections: plain-text title → category search dropdown, two add-new paths | Menu editor | Yes | Not present | dropped | |
| Section remove | Menu editor | Yes | Not present | dropped | |
| Dish rows: search → select → name button + info toggle | Menu editor | Yes | Not present | dropped | |
| Dish sell-price input with auto-sizing width | Menu editor | Yes | Not present | dropped | |
| Dish metadata block driven by **menu-type field configuration** | Menu editor | Yes | Not present | dropped | Depends on the metadata manager's menu types |
| Click-to-edit inline numeric dish fields | Menu editor | Yes | Not present | dropped | |
| Read-only computed food-cost-per-portion row | Menu editor | Yes | Not present | dropped | |
| Financial footnote bar: total cost / food cost % (warning >33%) / revenue / cost per guest | Menu editor | Yes — fixed, always visible | Not present | dropped | |
| Toolbar: shopping list (view/export) | Menu editor | Yes | Not present | dropped | |
| Toolbar: checklist by dish / by category / by station (view+export each) | Menu editor | Yes — 6 controls | Not present | dropped | |
| Toolbar: print | Menu editor | Yes | Not present | dropped | |
| Toolbar: all together (view/export) | Menu editor | Yes | Not present | dropped | |
| Save with **auto-generated dated name** and de-duplication | Menu editor | Yes — `d/m/yyyy`, `(1)`, `(2)`… | Not present | dropped | |
| Hero FAB: AI menu / open toolbar; FAB lifts above the financial bar | Menu editor | Yes | Not present | dropped | |

---

## H. Equipment / logistics, venues, suppliers

| Feature | Page/Component | In old app | In new design | Status | Notes |
|---|---|---|---|---|---|
| **Equipment / logistics screen** | Equipment | Yes — dual-mounted at `/equipment` and `/inventory/equipment` | Not present anywhere | dropped | No equipment concept survives in the new design |
| Equipment list + search + sort + filters (category checkboxes, consumable radio group) | Equipment | Yes | Not present | dropped | The consumable **radio** group is the only radio-based filter in the app |
| Equipment inline edit panel (name, category, owned qty, consumable, scaling, notes) | Equipment | Yes — with closing animation and switch-while-dirty confirm | Not present | dropped | |
| Equipment scaling rule (per guests / min / max) | Equipment | Yes — in both the inline panel and the full form | Not present | dropped | |
| Equipment full form (`/equipment/add`, `/edit/:id`) | Equipment | Yes | Not present | dropped | |
| Equipment selection + bulk edit/delete | Equipment | Yes | Not present | dropped | |
| Equipment duplicate-name error + `requireAuth()` gating | Equipment | Yes | Not present | dropped | |
| Add-equipment modal (used by the builder's logistics picker) | Equipment | Yes | Not present | dropped | |
| — | — | — | — | — | — |
| Venue list | Venues | Yes — list shell | Yes — table | changed | |
| Venue: name | Venues | Yes | Yes | kept | |
| Venue: **environment type** | Venues | Yes — column + filter group | Not present | dropped | |
| Venue: **infrastructure item count** | Venues | Yes | Not present | dropped | |
| Venue: **available-infrastructure editor** (equipment rows + quantities) | Venue form | Yes — a FormArray with add/remove rows | Not present | dropped | The functional heart of the venue entity |
| Venue: notes | Venue form | Yes | Not present | dropped | |
| Venue: **city** | Venues | Not present | Yes | changed | **New field** |
| Venue: **street address** | Venues | Not present | Yes | changed | **New field** |
| Venue: **seat count** | Venues | Not present | Yes | changed | **New field** |
| Venue: **opened year** | Venues | Not present | Yes | changed | **New field** |
| Venue: **active / in-preparation status** | Venues | Not present | Yes — status pill | changed | **New field** |
| Venue search | Venues | Yes | Not present | dropped | |
| Venue environment-type filter + clear-filters | Venues | Yes | Not present | dropped | |
| Venue row click / keyboard → edit | Venues | Yes | Rows are not clickable | dropped | |
| Venue row actions (edit / delete) | Venues | Yes | Not present | dropped | |
| Venue selection + bulk | Venues | Yes | Not present | dropped | |
| Venue no-results state | Venues | Yes | Not present | dropped | |
| Venue "back to dashboard" button | Venues | Yes | Not present (nav is top-level now) | changed | |
| Venue duplicate-name validation | Venue form | Yes | Not present | dropped | |
| Venue embedded-in-dashboard mode | Venues | Yes — list + form both | Not applicable | dropped | |
| Venue page back-nav ("back to venue list") | Venues | Yes — shown only off the list route | Not applicable | dropped | |
| — | — | — | — | — | — |
| Supplier list | Suppliers | Yes — list shell | Yes — table | changed | |
| Supplier: name | Suppliers | Yes | Yes | kept | |
| Supplier: contact person | Suppliers | Yes | Yes | kept | |
| Supplier: **delivery days** (7-day checkbox array) | Suppliers | Yes — column, filter group, and form field | Not present | dropped | |
| Supplier: **minimum order** | Suppliers | Yes | Shown on the product-detail supplier panel, not the list | changed | |
| Supplier: **lead time** | Suppliers | Yes | Shown on the product-detail supplier panel, not the list | changed | |
| Supplier: **linked-product count** | Suppliers | Yes — computed | Yes — `products` count | kept | |
| Supplier: **phone number** | Suppliers | Not present | Yes | changed | **New field** |
| Supplier: **star rating** | Suppliers | Not present | Yes — star icon + numeric | changed | **New field** |
| Supplier search | Suppliers | Yes | Not present | dropped | |
| Supplier filters (delivery days, has-linked-products) | Suppliers | Yes | Not present | dropped | |
| Supplier inline edit panel | Suppliers | Yes — same pattern as equipment | Not present | dropped | |
| Supplier row actions (edit / delete) | Suppliers | Yes | A `more` glyph with **no handler** | unclear | An actions affordance is drawn but undefined |
| Supplier selection + bulk | Suppliers | Yes | Not present | dropped | |
| Supplier empty state (`empty_suppliers` + CTA) | Suppliers | Yes | Not present | dropped | |
| Supplier no-results state | Suppliers | Yes | Not present | dropped | |
| Supplier form — dual layout (modal vs page) | Suppliers | Yes — one template, two chromes | Not present | dropped | |
| Supplier duplicate-name validation | Suppliers | Yes | Not present | dropped | |
| Supplier "back to dashboard" button | Suppliers | Yes | Not present | changed | |

---

## I. Trash & version history

| Feature | Page/Component | In old app | In new design | Status | Notes |
|---|---|---|---|---|---|
| Trash screen | Trash | Yes — `/trash` (auth-gated) + a dashboard tab (not gated) | Yes — `#/trash` in the main nav | changed | The dual-mount and the auth gate both disappear |
| **Three separate sections** (Dishes → Recipes → Products, fixed order) | Trash | Yes | One unified table with a type column | changed | |
| Trashable types | Trash | Dish, Recipe, Product | Product, Recipe, **Menu**, **Supplier** | changed | Adds two types, drops the dish/preparation split |
| Item: name | Trash | Yes | Yes | kept | |
| Item: deleted-at timestamp | Trash | Yes — `he-IL` short date + time | Yes — **relative** ("לפני 2 שעות", "אתמול") | changed | |
| Item: **deleted-by** | Trash | Not present | Yes | changed | **New capability** — requires attribution on the trash record |
| Item action: restore | Trash | Yes — with `trash_confirm_restore` (warning) | Yes — button, no confirm designed | changed | |
| Item action: **dispose (permanent delete)** | Trash | Yes — with `trash_confirm_dispose` (danger) | Not present | dropped | |
| Item action: **version history** | Trash | Yes — opens the history overlay | Not present | dropped | |
| Section action: restore all | Trash | Yes — per section, shown only when non-empty | Not present | dropped | |
| Section action: dispose all | Trash | Yes — per section | Replaced by a single global **"רוקן את הפח"** | changed | Global rather than per-type; no confirm designed |
| **30-day retention policy** messaging | Trash | Not present — items are kept indefinitely | Yes — in the lede and a `.trash-note` callout | changed | **New product rule**, not just a design change |
| Explanatory callout ("trashed items are hidden but recoverable") | Trash | Not present | Yes | changed | **New capability** |
| Refresh button with pending state | Trash | Yes | Not present | dropped | |
| Loading state | Trash | Yes — medium loader | Not present | dropped | |
| Error state + `refresh_again` retry | Trash | Yes — one of the few explicit error states in the app | Not present | dropped | |
| Per-section empty state (`trash_empty`) | Trash | Yes | Not present | dropped | |
| Back-to-dashboard button | Trash | Yes | Not present (nav is top-level) | changed | |
| — | — | — | — | — | — |
| **Version history panel** | Shared | Yes — loading / error / empty / list states, view + restore per version | Not present anywhere | dropped | |
| History overlay (backdrop click closes, inner click stops propagation) | Trash + recipe book | Yes | Not present | dropped | |
| `recoverBeforeRestore` hook (un-delete before restoring an old version) | Trash | Yes | Not present | dropped | |
| Restore-choice modal (Cancel / **Add as new** / **Replace**) | Shared | Yes | Not present | dropped | |
| Restoring a version refreshes the trash list | Trash | Yes | Not present | dropped | |

---

## J. Metadata manager ("Core settings") vs. new Settings

| Feature | Page/Component | In old app | In new design | Status | Notes |
|---|---|---|---|---|---|
| Settings screen exists | Settings | Yes — as the dashboard "Core settings" tab | Yes — dedicated `#/settings` screen with a left nav | changed | Structure is completely different; see below |
| **Units & conversions registry** (add / delete / locked system units) | Metadata | Yes | Not present | dropped | |
| **Product categories registry** | Metadata | Yes | Not present | dropped | |
| **Global allergens registry** (pill pool) | Metadata | Yes | Not present | dropped | |
| **Recipe labels registry** (with colour dots) | Metadata | Yes | Not present | dropped | |
| Three-layer add flow (registry guard → English-key resolution → translation-key modal → register) | Metadata | Yes | Not present | dropped | The dictionary-registration mechanic has no design home |
| **Usage guard on delete** (blocks deletion when the value is in use, naming where) | Metadata | Yes — scans products and recipes | Not present | dropped | Real data-integrity protection |
| Locked/system unit badge (`unit_default_unremovable`) | Metadata | Yes | Not present | dropped | |
| **Menu types** card (add, rename on blur, removable field pills, edit mode with a checkbox per dish field) | Metadata | Yes | Not present | dropped | The menu editor's dish-metadata configuration depends on this |
| **Preparation categories** manager (add, double-click rename, delete) | Metadata | Yes | Not present | dropped | |
| **Section categories** manager | Metadata | Yes | Not present | dropped | |
| **User management** (admin-only, list, delete, can't-delete-self) | Metadata | Yes — with 4 distinct states | Left-nav label "צוות ומשתמשים" only | unclear | The nav entry exists; the pane is not designed |
| **Backup export to file** | Metadata | Yes | Not present | dropped | |
| **Restore from backup** (with confirm + overlay loader) | Metadata | Yes | Not present | dropped | |
| **Import from file** (hidden file input, confirm, input reset on cancel) | Metadata | Yes | Not present | dropped | |
| **Demo-data loader** (non-production only) | Metadata | Yes — `@if (!isProduction_)` | Not present | dropped | |
| Per-card empty states | Metadata | Yes — composed from prefix + title + suffix | Not present | dropped | |
| Overlay importing loader (`loader_cooking_up`) | Metadata | Yes | Not present | dropped | |
| Logged-out disabling across every metadata control | Metadata | Yes | Not present | dropped | |
| — | — | — | — | — | — |
| **Settings left nav** (7 sections) | Settings | Not present | Yes — Account / Team / Notifications / Measurement / Billing / Integrations / API | changed | **New IA.** Only Account is built |
| **Profile pane** (avatar + change photo, name, role, email, phone) | Settings | Only via the sign-up modal | Yes | changed | **New capability** — there is no profile-editing screen today |
| **Notification preferences** (4 toggles with descriptions) | Settings | Not present | Yes | changed | **New capability.** No notification system exists |
| **Currency selector** (₪ / $) | Settings | Not present — ₪ is hard-coded everywhere | Yes | changed | **New capability** with wide blast radius |
| **Weight system selector** (metric / imperial) | Settings | Not present — metric only | Yes | changed | **New capability**; interacts with the unit registry |
| Settings sections: Billing / Integrations / API | Settings | Not present | Nav labels only | unclear | Placeholders — no indication whether these are planned |

---

## K. Shared components & modals

| Feature | Page/Component | In old app | In new design | Status | Notes |
|---|---|---|---|---|---|
| **List shell** (title / search / actions / selection-bar / header / body / filters slots) | Shared | Yes — used by 5 lists | Not present; each list is a bespoke table | changed | The unifying chrome is gone; consistency now has to come from the design tokens |
| Filter panel with backdrop + **touch swipe to close** | Shared | Yes | Not present | dropped | |
| Persisted per-list panel-open preference | Shared | Yes | Not present | dropped | |
| **Selection bar** with two-step bulk edit | Shared | Yes | Not present | dropped | |
| Row checkbox + select-all + `ListSelectionState` | Shared | Yes | Not present | dropped | |
| **Column carousel** (header + cell, touch-swipe, synced index) | Shared | Yes — the responsive-table strategy on 5 lists | Not present | dropped | Nothing replaces it; the new tables have no stated narrow-screen behaviour |
| **Row actions menu** (`more-vertical` + backdrop + rect-positioned popover) | Shared | Yes | A `more` glyph on suppliers with no handler | unclear | Pattern is hinted at once, never defined |
| Empty-state component (icon + message + optional disabled CTA) | Shared | Yes — used on 3 lists | Not present | dropped | Only the cook view has an empty state |
| **Loader** (cooking-pot SVG + steam, 3 sizes, inline/overlay) | Shared | Yes — used everywhere | Not present | dropped | A distinctive brand element with no replacement |
| Confirm modal (header, message, danger/warning, optional third save button) | Shared | Yes | Not present | dropped | |
| Auth modal (tabs, ~18 error keys, password visibility toggles, image upload, dev guest button) | Shared | Yes | Not present | dropped | |
| Toast with undo | Shared | Yes | Not present | dropped | |
| Version-history panel | Shared | Yes | Not present | dropped | |
| Restore-choice modal | Shared | Yes | Not present | dropped | |
| Global-specific modal (preparation category: specific vs global) | Shared | Yes | Not present | dropped | |
| Export-preview dialog (two layouts) | Shared | Yes | Not present | dropped | |
| Export-toolbar overlay | Shared | Yes | Not present | dropped | |
| Quick-edit product panel (tier-highlighted, own unsaved overlay) | Shared | Yes | Not present | dropped | |
| Quick-add product modal (AI-fill button, Enter focus chaining) | Shared | Yes | Not present | dropped | |
| **AI recipe modal** — text / image / URL input tabs, usage meter, draft editor, warning confirm | Shared | Yes | A placeholder modal reading "content pending implementation" | changed | The AI *entry points* survive as buttons; the flow does not |
| **AI menu modal** — instruction → before/after diff → apply | Shared | Yes | Not present | dropped | |
| **AI product modal** — create draft / edit patch diff | Shared | Yes | Not present | dropped | |
| Gemini daily-usage meter (`count / 1,000` with colour status) | Shared | Yes — in all three AI modals | Not present | dropped | |
| Unit-creator modal (name `=` amount `basis`, focus chaining, live net-cost preview) | Shared | Yes — reachable from ~6 places | Not present | dropped | |
| Translation-key modal (context-aware, "continue without saving") | Shared | Yes | Not present | dropped | Without it there is no way to register new Hebrew↔English keys |
| Label-creation modal (colour palette + auto-trigger checklist) | Shared | Yes | Not present | dropped | |
| Add-item modal (generic single-field) | Shared | Yes | Not present | dropped | |
| Add-equipment modal | Shared | Yes | Not present | dropped | |
| Supplier modal (add-only wrapper) | Shared | Yes | Not present | dropped | |
| Chip-search dropdown (chips + search + keyboard highlight + add-new) | Shared | Yes — the multi-select workhorse | Not present | dropped | |
| Custom select / multi-select (type-to-filter, add-new, chip variant, clearable, readonly chips) | Shared | Yes — `ControlValueAccessor`s used everywhere | Native `<select>` in two places | changed | Directly contradicts the new design system's own README |
| Scrollable dropdown container | Shared | Yes | Not present | dropped | |
| Counter / stepper (auto-width, press-and-hold repeat, unit-aware steps) | Shared | Yes | A simple −/value/+ in the cook view only | changed | Press-and-hold, auto-width and unit-aware steps are all lost |
| Scaling chip (unit select + counter fused) | Shared | Yes | Not present | dropped | |
| Rating stars (half-star, hover preview, readonly) | Shared | Yes | Cook view only, whole stars, no half-star, no hover preview | changed | |
| Nutrition badge (leaf + macro bar + legend + per-nutrient rows + OFF attribution) | Shared | Yes | Not present | dropped | |
| Approve stamp (raster artwork, two states) | Shared | Yes | Cook view has a **text/icon button**; `GlassComponents.Stamp` still uses the artwork | unclear | Two contradictory treatments in the same synced project |
| Change popover + floating info container | Shared | Yes | Not present | dropped | |
| `clickOutside` directive behaviour | Shared | Yes — used pervasively | Only on the modal backdrop | changed | |
| `scrollIndicators` directive (fade zones + chevrons) | Shared | Yes — 5 places | Not present | dropped | |
| `SelectOnFocus` / `focusByRow` / `textareaAutoGrow` | Shared | Yes | Not present | dropped | |
| `formatQuantity` pipe | Shared | Yes | Ad-hoc `toFixed`/integer formatting in cook.js | changed | |
| Button variants | Shared | primary / ghost / danger / icon / pill | primary / ghost / **dark** / danger | changed | Adds a `dark` variant (used for the main create action on every screen) |
| Chip tones | Shared | Various ad-hoc | 5 named tones (primary / success / warning / danger / neutral) | changed | More systematic than the old app |
| Tab pills with counts | Shared | Not present | Yes — inventory and recipe book | changed | **New pattern** |
| Toggle switch | Shared | Not present (checkboxes only) | Yes — settings notifications | changed | **New component** |
| KPI card as a system component | Shared | Bespoke to the dashboard | Yes — a documented component with tone / delta / trend / sparkline / link | changed | Formalised |

---

## L. Cook view

> The one screen re-skinned feature-for-feature. Most rows are `kept`.

| Feature | Page/Component | In old app | In new design | Status | Notes |
|---|---|---|---|---|---|
| Cook view screen | Cook view | Yes — `/cook`, `/cook/:id` | Yes — `openCook(id)` overlay from the recipe detail page | changed | Becomes a modal/overlay rather than a route; no URL, no deep-link, no `canDeactivate` |
| Public access (no auth guard) | Cook view | Yes | N/A (no auth in the design) | unclear | |
| Empty state: icon + copy + recipe-book CTA + recent chips | Cook view | Yes | Yes | kept | |
| Recent chips show recipe **names** | Cook view | No — shows raw ids (a bug) | Yes — names | changed | The design fixes an existing defect |
| Auto-redirect to `lastRecipeId` on bare `/cook` | Cook view | Yes | Not present | dropped | |
| Header: recipe name | Cook view | Yes | Yes | kept | |
| Header: rating stars (readonly when logged out) | Cook view | Yes | Yes — always interactive | changed | No readonly path |
| Header: scaled cost | Cook view | Yes — shown only when > 0 | Yes | kept | |
| Header: approved badge | Cook view | Yes — `✓ מאושר` | Yes | kept | |
| Edit / Save changes / Undo changes | Cook view | Yes | Yes | kept | Save and Undo both just toggle the mode in the prototype |
| Edit-mode banner | Cook view | Yes | Yes | kept | |
| Export bar: main button + 3 label/view/download triples | Cook view | Yes | Yes | kept | Dish variant swaps the third to checklist in both |
| Export bar collapses on mouse-leave | Cook view | Yes | Not present (toggle only) | changed | |
| Multiplier chips | Cook view | Yes — from a `multiplierChips` list, translated labels | Yes — hard-coded ×0.5/×1/×2/×3/×4 | changed | |
| "Make quantity" counter with unit-aware steps | Cook view | Yes | Yes — plain −/+ | changed | Unit-aware step sizes lost |
| Yield-unit select (with create-new-unit) | Cook view | Yes | A button with no dropdown | changed | |
| Conversion badge `×factor` | Cook view | Yes — when the unit differs from the stored yield unit | Yes — when ratio ≠ 1 | changed | Slightly different trigger condition |
| Scale bar hidden in scaled view | Cook view | Yes | Yes | kept | |
| Phone pane-swap bar | Cook view | Yes — reorders panes via CSS `order` | Yes — buttons present | changed | Buttons have no handler in the prototype |
| Ingredient pane: progress badge `done/total` → "all ready" | Cook view | Yes | Yes | kept | |
| Ingredient pane: progress fill bar | Cook view | Yes | Yes | kept | |
| Ingredient row: tap to check | Cook view | Yes | Yes | kept | |
| Ingredient row: unlinked rows italic + dimmed | Cook view | Yes | Yes (applied to the *note*, not the unlinked state) | changed | The unlinked-ingredient distinction is not modelled in the design's data |
| **Per-row unit override select** (only when >1 unit available) | Cook view | Yes | Not present in view mode | dropped | |
| Per-ingredient prep notes | Cook view | Not present | Yes — inline muted note | changed | **New data concept**, consistent with the recipe detail page |
| Set-by-ingredient: scale button → inline input → Convert / Cancel | Cook view | Yes | Yes | kept | |
| Scaled-view banner + "back to full recipe" | Cook view | Yes | Yes | kept | |
| Edit mode: ingredient table (name / −-input-+ / unit / remove) | Cook view | Yes | Yes | kept | The design's ± buttons both render a `plus` icon — likely an oversight |
| Edit mode: `field-changed` row highlight | Cook view | Yes | Yes | kept | |
| Edit mode: arrow-key stepping on amounts | Cook view | Yes | Not present | dropped | |
| Step pane: `done/total` counter | Cook view | Yes | Yes | kept | |
| Step card: active state ("פעיל עכשיו" + mark-done button) | Cook view | Yes | Yes | kept | |
| Step card: done state + `↩` un-do chip | Cook view | Yes | Yes | kept | |
| Step card: pending state, tap-to-jump | Cook view | Yes | Yes | kept | |
| **Step titles** | Cook view | Not present — instruction body only | Data has titles, but the cook card renders only `body` | unclear | Titles exist in `data.js` and on the recipe detail page but are not shown on the cook card |
| Per-step countdown timer (only when the step has a configured cooking time) | Cook view | Yes | Yes | kept | |
| Timer-finished alert pill, persists on done/pending until dismissed | Cook view | Yes | Yes | kept | |
| Per-step stopwatch with play/pause, persists across states | Cook view | Yes | Yes | kept | |
| Mark-done auto-advance | Cook view | Yes — forward, then **wraps backwards** | Forward only | changed | |
| Scroll-to-active-step on advance | Cook view | Yes | Not present | dropped | |
| Completion banner | Cook view | Yes — `🎉 cooking_complete` | Yes | kept | |
| **Dish variant** (mise-en-place prep-item cards) | Cook view | Yes | `cookIsDish` hard-coded `false` — never renders | dropped | Half the cook view's cases are undesigned |
| Edit mode reuses the shared workflow editor (incl. `sortByCategory`) | Cook view | Yes | Not present | dropped | |
| Approve stamp | Cook view | Yes — raster artwork | A text/icon floating button | changed | |
| Pane scroll indicators | Cook view | Yes — both panes | Not present | dropped | |
| Unsaved-changes guard on `/cook/:id` | Cook view | Yes | Not present | dropped | |
| Keyboard: Escape closes | Cook view | N/A (it's a route) | Yes — bound twice (app.html + cook.js) | changed | |
| Keyboard: Arrow keys step through steps | Cook view | Not present | Yes — ArrowLeft = next, ArrowRight = prev (RTL-correct) | changed | **New capability** |

---

## M. Cross-cutting mechanics

| Feature | Page/Component | In old app | In new design | Status | Notes |
|---|---|---|---|---|---|
| Design tokens (colour / type / spacing / radii / shadows / motion) | Global | Yes — `styles.scss` `.c-*` engine + tokens | Yes — documented + `colors_and_type.css` + 19 specimen cards | kept | The token layer is the strongest part of the sync |
| Typeface | Global | Heebo | **Rubik + Space Grotesk** in the UI kit; README still says Heebo | unclear | The two layers disagree — a decision is needed before anything is built |
| Icon system | Global | Lucide (`lucide-angular`, lint-enforced) | README says Lucide; the kit ships two hand-rolled inline SVG sets | unclear | Same disagreement |
| "No emoji" rule | Global | Followed (stamps instead of ✅) | Stated in README, **broken** in the cook view and phone-swap bar | unclear | |
| Logical CSS properties | Global | Enforced | Used in places (`margin-inline-start`, `insetInlineEnd`) | kept | |
| `prefers-reduced-motion` clamping | Global | Yes | Documented in README | kept | Not verified in the kit's CSS (not read) |
| Focus ring token | Global | Yes — `0 0 0 3px rgba(20,184,166,0.2)` | Yes — same token, applied in `Input` | kept | |
| Min 44×44 touch targets | Global | Documented | Documented | kept | |
| URL-synced list state utility | Global | Yes — 7 serializers across 6 lists | Not present | dropped | |
| Auth gating patterns (route-blocked / disabled-with-tooltip / hidden) | Global | Yes — all three | Not present | dropped | |
| Saving state (`isSaving_` → spinner + disabled) | Global | Yes | `Button` has `disabled`; no spinner | changed | |
| Activity log (localStorage, per-field diffs) | Global | Yes | Feed is designed; the mechanism is unchanged | kept | |
| Version history / soft delete | Global | Yes | Trash is designed; version history is not | changed | |
| Auto-labels from categories/allergens | Global | Yes | Not present | dropped | |
| Unit registry + conversions + unit-aware steps | Global | Yes | Not present | dropped | |
| Gemini server-proxied AI | Global | Yes | AI buttons exist; the flow does not | changed | |
| Global error handling → structured logs + toasts | Global | Yes | Router prints raw stack traces into the page | changed | Prototype artefact, but no error design exists |
| Angular 19 conventions (standalone, signals, `inject()`, no `any`, quote style) | Global | Enforced by AGENTS.md | N/A — the design is vanilla JS + one JSX file | unclear | The JSX components are a *reference*, not something to port directly |
