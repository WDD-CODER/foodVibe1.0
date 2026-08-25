# 02 — Inventory Port Spec

Procedure: `.claude/commands/design-port.md` §6. Status: **Step 4 executed, Step 5 verified —
awaiting Human live visual review (§6 Step 5's Human-only check).**

- Angular path: `src/app/pages/inventory/` — `inventory.page.{ts,html,scss}` (thin `<router-outlet>`
  shell), `components/inventory-product-list/inventory-product-list.component.{ts,html,scss}` (the
  `/inventory/list` route — the screen the design actually shows), `components/product-form/
  product-form.component.{ts,html,scss}` (`/inventory/add`, `/inventory/edit/:id`),
  `services/product-ai-flow.service.ts`
- Shared engines this screen consumes (also used by Recipe Book/Suppliers/Equipment per
  `design-port.md` §7): `src/app/shared/list-shell/`, `src/app/shared/carousel-header/`,
  `src/app/shared/cell-carousel/`, `src/app/shared/selection-bar/`, `src/app/shared/empty-state/`,
  `src/app/shared/row-actions-menu/`, `src/app/shared/list-selection/`
- Design source: `.interface-design/source/Inventory.dc.html` (856 lines) + `colors_and_type.css` +
  `mobile-pass.css` (chip/checkbox/carousel mobile CSS is inlined directly in `Inventory.dc.html`'s
  own `<style>` block, not in the shared `mobile-pass.css`)

---

## Note on scope going in

The design's `Inventory.dc.html` models a comparatively simple screen: one list view, one
add/edit **modal**, ~24 hardcoded demo rows, no validation states, no nutrition data, no AI
assistance. The real Angular screen is dramatically larger: full-page product form with purchase
options (multi-unit conversion), min-stock/expiry/waste-yield fields, multi-supplier sourcing,
AI-assisted create/edit, validation-status badges, nutrition badges, and a bulk-edit selection bar.
This asymmetry is expected and is not a gap to close — see Executive Summary #3. This spec restyles
what the design *does* show; it does not invent design coverage for what the app does beyond that.

---

## Executive summary — read this first

**1. Tokens: no new gaps found.** Every token this screen uses beyond Dashboard's already-confirmed
set — `--radius-xs`, `--shadow-focus`, `--blur-modal`, `--border-row`, `--color-allergen-text`,
`--bg-warning-strong`, `--bg-warning-soft`, `--border-warning`, `--color-danger`,
`--bg-danger-subtle`, `--overlay-backdrop`, `--shadow-modal` — exists in `src/styles.scss` under the
identical name with the identical value, confirmed by direct diff against `colors_and_type.css`
(not eyeballed). Consistent with Dashboard's 100% token-match finding.

**2. The add/edit surface is not a modal in the app, and should not be rebuilt as one.** The
design's "ADD / EDIT MODAL" (`Inventory.dc.html:397-459`) is a small centered card with 7 fields:
name, category (chip buttons), unit (chip buttons), price, allergens (chip buttons), a low-stock
checkbox. The app's real equivalent, `product-form.component`, is a full routed page
(`/inventory/add`, `/inventory/edit/:id`) with far more real, load-bearing fields: purchase options
(multiple purchase units with per-unit conversion rates and optional price overrides), min-stock
level, expiry days, waste%/yield-factor (bidirectionally synced), multiple suppliers, an in-form
AI-assist button, and an inline "create a new unit" flow. **`product-form.component.ts` is on
AGENTS.md's growth-frozen list** — no new lines may be added to it; new logic goes in a new
service. Recommend: only the generic surface tokens (glass-card background/border/radius/shadow,
spacing, type) are portable between the design's modal and the app's page — see the "Add/Edit
surface" row in Inventory 3. Do not attempt to compress the real form down to the modal's 7 fields
or to restyle it as an overlay; that would be a functionality loss, which §2 of the handoff forbids.

**3. The shared mobile carousel pattern may not match the design's own final intent — a
cross-screen finding, not just this screen's.** `Inventory.dc.html`'s own `<style>` block layers
three progressive mobile passes for the row's category/allergens/supplier/unit fields
(`.inv-car-track`, lines 45-199). Pass 5 (`lines 123-148`) explicitly narrates its own intent in a
code comment: *"meta fields read inline with labels instead of hiding inside a 104px carousel"* —
i.e. pass 5 is the design **abandoning** a swipe-one-field-at-a-time carousel in favor of showing
fields inline. Pass 6 (`lines 150-199`, higher selector specificity — `.inv-row .inv-car-track`
beats pass 5's `.inv-car-track > div`, so pass 6 wins the cascade regardless of source order) goes
further: `.inv-car-track` becomes `display:grid; grid-template-columns:repeat(4,minmax(0,1fr))`,
showing category + allergens + supplier + unit **simultaneously** in a compact 4-column strip under
each mobile card — not a carousel at all in the final rendered state. Also note: `[class*="car-arrow"]
{ display:none !important }` (`line 107`, "pass 2: touch ergonomics") hides the prev/next arrow
buttons at every breakpoint — the design's own carousel-arrow JS (`carPrev`/`carNext` in the
component script, `lines 530-532`) is present but its buttons are never visible.
The app's shared `carousel-header`/`cell-carousel` engine (`src/app/shared/carousel-header/`,
`src/app/shared/cell-carousel/`) implements the **older, abandoned** pattern instead: one slide
visible at a time (`cell-carousel.component.scss:54-65`), switched via visible prev/next arrow
buttons (`carousel-header.component.scss:42-75`) plus JS swipe. Since this engine is shared by all
4 list screens (Inventory, Recipe Book, Suppliers, Equipment per `design-port.md` §7), this is not a
per-screen CSS tweak — it's a question of whether to rebuild a shared component's core interaction
model. **Flagging for a Human call, not proceeding unilaterally either direction** (§10: "you are
about to touch a second screen" doesn't strictly apply since the component is already shared
infrastructure, but rebuilding its interaction model affects 3 other future sessions, so this
deserves explicit sign-off before Step 4 touches it).

**4. The filters aside panel is a different, already-more-capable responsive pattern than the
design's — also a cross-screen finding.** The design's aside (`Inventory.dc.html:209-251`) is a
simple `position:sticky`, `sc-if`-toggled 250px sidebar that occupies in-flow layout space whenever
open, at every viewport width down to a full-width stacked block at ≤1023px (`.inv-aside` rules,
`lines 45-65`) — it never becomes an overlay. The app's shared `list-shell` filter panel
(`src/app/shared/list-shell/list-shell.component.scss:286-507`) is grid-area-based and
similarly in-flow at desktop widths, but below 1024px it becomes a slide-in **overlay drawer** with
a backdrop, swipe-to-close, and `position:fixed` on phone — a materially more complex, already-built
responsive pattern the design doesn't specify at all. Not a value-level drift to fix; a structural
UX pattern difference shared by all 4 list screens. Recommend keeping the app's drawer (it's already
built, works, and is arguably better mobile UX than the design's stacked-block fallback) — but
flagging for Human confirmation before treating it as settled, since "match the design" is the
stated goal (§2) and this is a deliberate divergence from it.

**5. A recurring micro-label treatment is missing across at least two shared engines.** The design
consistently sets `text-transform:uppercase; letter-spacing:var(--tracking-wide)` on small
metadata-style labels (filter category headers `Inventory.dc.html:225,238`, list column headers
`lines 305-327`). The app's corresponding engines — `.c-filter-category-header`
(`styles.scss:1475-1508`) and `.c-grid-header-cell` (`styles.scss:938-953`) — set the right color
and weight but have **no `text-transform` and no `letter-spacing` at all**, and the list header
cells use `--fs-sm` (13px) where the design specifies `--fs-xs` (12px) for that role. Because both
are shared engines (used across all 4 list screens, and `.c-filter-category-header` likely beyond),
fixing this once fixes it everywhere — flagged as an engine-level fix candidate rather than a
per-screen override, see Inventory 3.

---

## Inventory 1 — Old functionality (do-not-touch)

### `inventory.page.ts` — thin shell
The routed page is just `<router-outlet>` (`inventory.page.html:1`) plus two injected signals that
appear to be **orphaned**: `isDrawerOpen_`/`selectedProductId_` (from `KitchenStateService`) and an
`onClose()` method (`inventory.page.ts:15-21`) that no other file in `src/app` ever sets to `true` or
reads for rendering (grepped project-wide). Left untouched either way — not a Human call, just
noting it so it isn't mistaken for a real feature to expose visually.

### `inventory-product-list.component.ts` — signals / computed
| item | file:line | what it holds |
|---|---|---|
| `activeFilters_` (`signal<Record<string,string[]>>`) | `:109` | category/allergen/supplier filter selections |
| `searchQuery_` (`signal<string>`) | `:110` | free-text search |
| `sortBy_` / `sortOrder_` (`signal`) | `:111-112` | `'name'\|'category'\|'allergens'\|'supplier'\|'date'` / `'asc'\|'desc'` — **no `'price'` case exists** (see Inventory 2 #3) |
| `isPanelOpen_` (from `useResponsivePanelState('inventory')`) | `:113,157-159` | filter-panel open state, persisted per-page |
| `collapsedFilterCategories_` (`signal<Set<string>>`) | `:117` | which filter groups are collapsed (empty = all expanded, matches design) |
| `allergenPopoverProductId_` / `allergenExpandAll_` (`signal`) | `:118-119` | per-row allergen popover / expand-all toggle |
| `lowStockOnly_` / `showInvalidOnly_` / `showIncompleteOnly_` (`signal<boolean>`) | `:120-122` | filter toggles |
| `nutritionFilter_` (`signal<'all'\|'has'\|'missing'>`) | `:123` | nutrition-data filter — **no design counterpart at all** |
| `deletingId_` / `savingPriceId_` (`signal<string\|null>`) | `:124-125` | per-row in-flight delete/price-save spinners |
| `carouselHeaderIndex_` (`signal<number>`) | `:126` | shared index driving both `carousel-header` and `cell-carousel` |
| `selection` (`new ListSelectionState()`) | `:127` | row multi-select state |
| `editableFields_` (`computed`) | `:129-154` | bulk-edit field defs: `categories_`, `supplierIds_`, `allergens_`, `base_unit_` — **no design counterpart** (design's bulk bar is delete-only, `Inventory.dc.html:277-286`) |
| `filterOptionCounts_` / `filterCategories_` (`computed`) | `:207-224` | catalog-only vs. filters-only two-pass count computation (perf-motivated split, comment at `:204-206`) |
| `isEmptyList_` / `filteredProducts_` / `filteredProductIds_` (`computed`) | `:256-322` | filter→search→sort pipeline |
| `displayRows_` (`computed`) | `:329-341` | precomputed per-row values (validation status, category display, supplier names, price/unit) — comment cites "plan 303 M2", perf-motivated |
| `hasActiveFilters_` (`computed`) | `:452-459` | drives the "clear filters" button |

No `linkedSignal`, no `model()`.

### `inventory-product-list.component.ts` — inject() services
| service | file:line | used for |
|---|---|---|
| `KitchenStateService` | `:93` | `products_()`, `suppliers_()`, `suppliersById_()`, `saveProduct()`, `deleteProduct()` |
| `ActivatedRoute` / `Router` | `:94-95` | `useListState` deep-link binding, row navigation |
| `HeroFabService` | `:96` | page actions: "add_product" + "ai_product_create_new" (`ngOnInit`, `:171-179`) |
| `TranslationService` | `:97` | Hebrew label lookups for sort compare + category display |
| `ConfirmModalService` | `:98` | delete / bulk-delete confirm (shared modal, cross-screen) |
| `EquipmentDataService` | `:99` | injected; not directly called in the lines read for this spec |
| `UserMsgService` | `:100` | error toasts (e.g. duplicate category) |
| `UnitRegistryService` | `:101` | unit key list |
| `UserService` (`isLoggedIn`) | `:102` | gates Add/Edit/Delete actions when logged out |
| `MetadataRegistryService` | `:103` | category/allergen registries |
| `ProductDataService` | `:104` | `addProduct()` for AI-created products |
| `AiProductModalService` | `:105` | opens the AI create-product modal |

### Keyboard / focus
`(keydown.enter)` / `(keydown.space)` with `role="button"`/`role="columnheader"` on sortable
headers and filter-category toggles (`html:50-96,290-304`) — accessible activation, do-not-touch.
`ClickOutSideDirective` closes the allergen popover (`html:180`, `closeAllergenView`,
`ts:387-392`).

### scrollIntoView
None under `inventory/` (grep-confirmed).

### Deep-link query params (`useListState('inventory', …)`, `ts:161-168`)
| param | signal | serializer |
|---|---|---|
| `q` | `searchQuery_` | `StringParam` |
| `sort` | `sortBy_` | `NullableStringParam` |
| `order` | `sortOrder_` | `StringParam` |
| `filters` | `activeFilters_` | `FilterRecordParam` |
| `lowStock` | `lowStockOnly_` | `BooleanParam` |
| `nutrition` | `nutritionFilter_` | `StringParam` |

This is also the KPI-tile deep-link target from the Dashboard spec (`?lowStock=1`) — confirmed
still read correctly by `lowStockOnly_`'s `BooleanParam` binding.

### Empty / loading / error / disabled / permission / RTL / validation states
| item | file:line | condition | renders |
|---|---|---|---|
| RTL | `html:6` | always | `[dir]="'rtl'"` passed into `app-list-shell` |
| Empty (no products at all) | `html:111-118` | `isEmptyList_()` | `app-empty-state` (icon `package`, CTA `add_first_product`, disabled when logged out) |
| Empty (filtered to nothing) | `html:119-121` | else | `no_products_match` text |
| Disabled/permission | `html:39-45,213-214,226-227` | `!isLoggedIn()` | Add/Edit/Delete buttons disabled + `sign_in_to_use` tooltip |
| Validation badges (`row--invalid`/`row--incomplete`) | `html:126-165`, `scss:234-374` | `getProductValidationStatus()` | icon + hover tooltip listing missing fields — **no design counterpart anywhere in `Inventory.dc.html`** |
| Nutrition badge | `html:167-169` | `row.product.nutrition_per_100g` | `app-nutrition-badge` — **no design counterpart** |
| No full-list loading state | — | — | `LoaderComponent` is imported but only used per-row (delete-in-progress spinner, `html:219`); no skeleton/loading state wraps the whole list (see Inventory 2 #6) |
| No error state | — | — | none exists today |

### `product-form.component.ts` — growth-frozen, do-not-touch in full
**This file is on AGENTS.md's growth-frozen list — no new lines, ever; new logic goes in a new
service.** Real, load-bearing logic that must survive this session untouched: reactive form with
`duplicateNameValidator` (`:356-379`); bidirectional waste%⇄yield-factor sync (`:382-406`);
`purchaseOptions_` `FormArray` with per-row unit-conversion suggestion, price-override confirm flow,
and a `WeakMap`-tracked override-confirmed state (`:663-799`); an `effect()` that round-trips the
shared unit-creator modal back into either the base-unit field or a specific purchase-option row
(`:267-297,299-352`); `pendingChangesGuard` support via `hasRealChanges()` /
`getValuesNeedingTranslation()` / `removeValuesNeedingTranslation()` (`:597-661`, consumed by a
route guard outside this component); AI-assist integration (`openAiProductModal`,
`ProductAiFlowService`, provided per-component at `:82`); inline "add new category/allergen/supplier"
flows via `TranslationKeyModalService`/`AddSupplierFlowService` (`:420-490`); autofocus on the name
input via `ViewChild` + `ngAfterViewInit` (`:89,263-265`). Collapsible optional fields
(`expandedMinStock_`/`ExpiryDays_`/`WasteYield_`/`Allergens_`/`Supplier_`, `:182-248`) each
auto-collapse on blur if left at their default value. None of this may be restructured, only
restyled at the CSS/markup level, and even that restyling must not require adding lines to this
specific `.ts` file.

---

## Inventory 2 — New functionality from the design (classified)

| # | Interaction | Design ref | Tag | Notes |
|---|---|---|---|---|
| 1 | Filters aside open/close | `Inventory.dc.html:209-251` (`sc-if value="{{panelOpen}}"`) | — | Already built (`isPanelOpen_`/`useResponsivePanelState`) — not new. Structural pattern differs (Executive Summary #4), not a new-vs-missing question. |
| 2 | Column sort: name / category / supplier | `dc.html:305-320` | — | Already built and wired (`setSort`, `sortIconFor_`) — not new. |
| 3 | Column sort: price | `dc.html:322-326` | **`deferred`** | The design shows a sortable price column with up/down carets. The app's `SortField` union (`inventory-product-list.component.ts:62`) has no `'price'` member, `compareProducts()` (`:343-365`) has no `'price'` case, and the price header cell in the template (`html:97-99`) has no `c-sortable-header` class or click handler at all — price sorting doesn't exist in the app today. Adding it is a real TS change (`SortField` union + a `compareProducts` case + template wiring), out of scope for a visual-only restyle and not Human-approved as `specified` — logging for later, not building. |
| 4 | Search | `dc.html:266-269` | — | Already built — not new. |
| 5 | Bulk select + delete + clear-selection | `dc.html:277-286` | — | Already built via `app-selection-bar`. App's bar additionally offers bulk-edit (category/supplier/allergen/unit) with no design counterpart at all (Inventory 1) — that portion has nothing to restyle against. |
| 6 | Loading skeleton (6 shimmer rows) | `dc.html:288-300` | **`deferred`** | Same reasoning as Dashboard's #2/#3 — no loading signal is surfaced by `KitchenStateService` to this component today (Inventory 1 confirms no loading state exists). Real UI, tokens/literals all present in the design source for whenever this is un-deferred. |
| 7 | Per-row allergen chip + popover | `dc.html:350-373` | — | Already built (`toggleAllergenPopover`, `allergen-btn`/`allergen-expanded`) — not new. |
| 8 | Low-stock warning icon + tooltip | `dc.html:341-345` | — | Already built (`isLowStock`, `.low-stock-badge`) — not new. Design uses a circular icon badge next to the name; app uses a small text pill (`low-stock-badge`) instead — a real shape/treatment difference, see Inventory 3. |
| 9 | Mobile category/allergens/supplier carousel | `dc.html` mobile passes, `lines 45-199` | — | Already built (`carousel-header`/`cell-carousel`), but implements a different interaction model than the design's own final (pass-6) intent — Executive Summary #3. Not proceeding either direction without a Human call. |
| 10 | Add/Edit as a centered modal | `dc.html:397-459` | — | Not applicable — app's real add/edit surface is a full page, already built, far richer than the modal shown. Do not compress or rebuild as a modal (Executive Summary #2). |
| 11 | Delete confirm card (single + bulk) | `dc.html:462-475` | — | Already built via the shared `ConfirmModalService` — a cross-screen component not owned by this screen, like Dashboard's toast finding. Not this session's surface to restyle. |
| 12 | Bottom-center save/delete toast | `dc.html:477-483` | — | Not found in these three files — likely the same shared toast service flagged in the Dashboard spec. Cross-screen, not this session's concern. |
| 13 | Validation badges (invalid/incomplete) + tooltips | — (app-only) | — | Real app feature, **no design counterpart anywhere in `Inventory.dc.html`** — nothing to restyle against, do-not-touch. |
| 14 | Nutrition badge | — (app-only) | — | Same as #13 — no design counterpart, do-not-touch. |
| 15 | AI-assisted product create/edit | — (app-only) | — | Same as #13 — no design counterpart, do-not-touch. |

No row was promoted to `specified` — nothing in this batch met the bar (a Human-named, confirmed-absent
behavior like Dashboard's scroll-into-view calibration case). #3 and #6 are real, defined, absent
behaviors, correctly `deferred` rather than built unilaterally.

---

## Inventory 3 — Visual spec (design value vs. current app value → engine/token)

All quoted design values are verbatim from `.interface-design/source/Inventory.dc.html` and
`colors_and_type.css`, cited by line. All "current app" values are verbatim from the `.scss`/`.html`
files under `src/app/pages/inventory/` and the shared engines in `src/styles.scss` /
`src/app/shared/list-shell/`, cited by line.

### Toolbar

| Element | Design (exact) | Current app | Maps to | Notes |
|---|---|---|---|---|
| Panel toggle button | `width/height:38px; background:var(--bg-glass); border:1px solid var(--border-default); border-radius:var(--radius-md); color:var(--color-text-muted)` (`dc.html:257`), **always visible**, toggles open↔closed | `.open-panel-btn` (`list-shell.component.scss:119-145`): `width/height:2.5rem(=40px); min-block/inline-size:44px` (larger than design's 38px due to the 44px tap-target floor), same bg/border/radius/color tokens | direct match on tokens, size drift only | **Behavior differs, not just size**: app's button only renders `@if (!isPanelOpen())` (`list-shell.component.html:3-7`) — closing happens via a separate small "×" icon inside the panel (`.panel-toggle-icon`, opacity 0 until hover, `scss:334-369`). Design's single toggle button stays visible and flips state both ways. Needs a call: keep the app's two-affordance model (already built) or add a close state to the same toolbar button to match the design's one-button toggle? |
| `<h1>`/page title | `font-size:var(--fs-xl)(24px); font-weight:var(--fw-bold); letter-spacing:var(--tracking-tight)(negative/tight); color:var(--color-text-main)` (`dc.html:262`) | `<h2 class="page-title">` — `.page-title{font-size:1.25rem(20px); font-weight:700; letter-spacing:0.02em(positive/wide); color:var(--color-text-main)}` (`inventory-product-list.component.scss:6-16`) | rebuild from tokens: `--fs-xl`/`--fw-bold`/`--tracking-tight` | Real, opposite-direction drift: app's title is smaller (20px vs 24px) **and** tracked wide+positive where the design wants tight+negative. Also `<h2>` not `<h1>` — app-wide heading-level convention, not this screen's call to change alone. |
| Subtitle / result count | `margin:2px 0 0; font-size:var(--fs-sm); color:var(--color-text-muted)` (`dc.html:263`) | `.list-result-count`: `font-size:var(--fs-sm); color:var(--color-text-muted)` (`list-shell.component.scss:94-100`) | exact match on the tokens present | `margin` not verified, low severity. |
| Search input | `display:flex; gap:var(--space-2); background:var(--bg-glass); border:1px solid var(--border-default); border-radius:var(--radius-md); padding:0 var(--space-3); height:38px; min-width:220px; backdrop-filter:var(--blur-glass)` (`dc.html:266`) | `.c-input-wrapper` (`styles.scss:409-424`): `gap:0.5rem(=--space-2); padding-inline:0.75rem(=--space-3); padding-block:0.5rem; background:var(--bg-glass); border:1px solid var(--border-default); border-radius:var(--radius-md); backdrop-filter:var(--blur-glass)` | already close match | No explicit `height:38px`/`min-width:220px` in the engine (layout-only, low severity) — visually near-identical otherwise. |
| Add-product button | `linear-gradient(180deg, var(--color-primary), var(--color-primary-hover)); border-radius:var(--radius-full)(pill); box-shadow:var(--shadow-glow); height:38px` (`dc.html:271`) | `.c-btn-primary` (`styles.scss:301-342`): gradient `var(--color-primary-light) → var(--color-primary)` (different stops), `border-radius:var(--radius-md)` (not pill), layered `inset+glow` box-shadow (not just `--shadow-glow`) | `.c-btn-primary` engine, needs correction | **Same drift already found and fixed on Dashboard's KPI footer/nav buttons — this is app-wide, not Inventory-specific.** Recommend fixing the shared `.c-btn-primary` engine once (affects every screen) rather than a one-off override here — flagging as a cross-screen engine fix, needs Human sign-off since it changes every button using this class app-wide. |

### Filters aside

| Element | Design (exact) | Current app | Maps to | Notes |
|---|---|---|---|---|
| Panel surface | `background:var(--bg-glass); backdrop-filter:var(--blur-glass); border:1px solid var(--border-glass); border-radius:var(--radius-lg); box-shadow:var(--shadow-glass); padding:var(--space-4); width:250px; position:sticky` (`dc.html:210-211`) | `.filter-panel` (`list-shell.component.scss:287-332`): `background:var(--bg-glass-strong)` (design: `--bg-glass`, one step denser), `border-inline-start:3px solid var(--color-primary)` (**not in design at all** — a colored accent edge), `border-radius:0 var(--radius-lg) var(--radius-lg) 0` (design: all 4 corners), width `220px` (design: `250px`), no `box-shadow:var(--shadow-glass)` in the base rule (relies on drawer-mode `--shadow-modal` only at ≤1024px) | `.c-glass-panel`-style tokens exist; current rule diverges on several values at once | Same "reuse vs. exact fidelity" choice as Dashboard's activity panel (Divergence #5 pre-clears reusing glass surfaces at a different alpha) — but the colored left-accent border and asymmetric radius are decorative additions with no design counterpart, on top of the token drift. Needs a call. |
| "סינון" heading | `font-size:var(--fs-md); font-weight:var(--fw-semibold); color:var(--color-text-main)` (`dc.html:213`) | `.panel-heading` (`list-shell.component.scss:381-387`): `font-size:var(--fs-md); font-weight:var(--fw-semibold); color:var(--color-text-main)` | exact match | — |
| Filter category label ("קטגוריה"/"אלרגנים") | `font-size:var(--fs-xs); font-weight:var(--fw-semibold); color:var(--color-text-muted); text-transform:uppercase; letter-spacing:var(--tracking-wide)` (`dc.html:225,238`) | `.c-filter-category-header` (`styles.scss:1475-1508`): `font-size:0.8125rem(=--fs-sm, one step larger); font-weight:600; color:var(--color-text-muted)` — **no `text-transform`, no `letter-spacing`** | rebuild from tokens: `--fs-xs`/`--fw-semibold`/`--color-text-muted` + add `text-transform:uppercase; letter-spacing:var(--tracking-wide)` | Engine-level fix (Executive Summary #5) — affects every screen using `.c-filter-category-header`, not just Inventory. App's version is also an interactive collapse/expand button with a chevron (`styles.scss:1502-1507`) — real, useful, no design counterpart (design's groups are always-expanded) — keep it, just correct the label typography. |
| Filter option row | `padding:5px 0`; label `font-size:var(--fs-sm); color:var(--color-text-secondary)`; count `font-size:var(--fs-xs); color:var(--color-text-muted-light)` (`dc.html:227-233`) | `.c-filter-option` (`styles.scss:1550-1635`): `padding:0.25rem 0.375rem`(tighter, both axes); label uses `color:var(--color-text-muted)` (design wants the less-muted `--color-text-secondary`); `.c-filter-option-count` uses `color:var(--color-text-muted)` (design wants the lighter `--color-text-muted-light`) | `--fs-sm`/`--fs-xs`/`--color-text-secondary`/`--color-text-muted-light` (all exist) | Two related token swaps, same direction (app one step darker/more-muted than the design wants on both the label and the count). |
| Checkbox | 24×24px custom checkbox, checked = filled `--color-primary` + white check mark (`dc.html:21-43`, page-global style) | `.c-filter-option input[type=checkbox]` (`styles.scss:1569-1601`): 16×16px (`1rem`), SVG-background checkmark on `:checked`, `box-shadow:0 0 0 2px var(--color-primary-soft)` ring | design's exact size (24×24) not currently used anywhere in the app's filter checkboxes | This is a page-global choice in the design (used identically in filters, the modal, and bulk-select-all) — not an Inventory-specific override. Needs a call: adopt 24×24 everywhere `.c-filter-option`'s checkbox appears (cross-screen), or keep the app's existing 16×16 (already meets the 44px tap-target rule via padding, `mobile-pass` rules). |

### List — header row & body rows (desktop)

| Element | Design (exact) | Current app | Maps to | Notes |
|---|---|---|---|---|
| Header row | `padding:var(--space-3) var(--space-4); gap:var(--space-2); border-bottom:1px solid var(--border-default); background:var(--bg-muted)` (`dc.html:304`) | `.c-grid-header-cell` (`styles.scss:938-953`): `padding-inline:0.75rem(=--space-3, both axes — design differentiates block vs inline); background:var(--bg-glass)` (design: `--bg-muted`, a different token entirely); `border-block-end:1px solid var(--border-default)` (match) | `--bg-muted` swap + inline/block padding split | Background-token mismatch (`--bg-glass` vs `--bg-muted`) is a real color drift, not just a spacing one. |
| Header cell label | `font-size:var(--fs-xs); font-weight:var(--fw-semibold); color:var(--color-text-muted); text-transform:uppercase; letter-spacing:var(--tracking-wide)` (`dc.html:305-327`) | `.c-grid-header-cell`: `font-size:0.8125rem(=--fs-sm, one step larger); font-weight:600(match); color:var(--color-text-muted)(match)` — **no `text-transform`, no `letter-spacing`** | rebuild from tokens, add uppercase+wide-tracking | Same engine-level fix as the filter category header (Executive Summary #5) — one CSS change fixes both instances and every other screen reusing `.c-grid-header-cell`. |
| Body row / cell | `padding:var(--space-3) var(--space-4); border-bottom:1px solid var(--border-row)` (row-level, JS `rowStyle`, `ts:724`); container supplies `background:var(--bg-glass)` (`dc.html:302`) | `.c-list-body-cell` (`styles.scss:959-971`): `padding-inline:0.75rem; padding-block:0.625rem; background:var(--bg-glass)(match, applied per-cell instead of per-container — equivalent result); border-block-end:1px solid var(--border-row)(match)` | already close match | Padding-inline should be `--space-4` (16px) per design vs. app's `--space-3` (12px) — same inline/block split gap as the header row above. |
| Low-stock indicator | Circular icon badge, `20×20px`, `background:var(--bg-warning); color:var(--text-warning)`, warning-triangle icon, `cursor:help` tooltip (`dc.html:341-345`) | `.low-stock-badge` (`inventory-product-list.component.scss:60-73`): text pill, `background:var(--bg-warning); color:var(--text-warning)`(tokens match) but shape is a small rounded-rect label reading "low_stock", not a circular icon badge | tokens match; shape/content differ | Real shape/content difference: design uses a wordless circular icon+tooltip next to the name; app uses a small text pill inline before the name. Needs a call — icon-badge (exact fidelity) vs. keep the text pill (arguably more scannable, already built). |
| Row hover | not shown in the static export (design has no `:hover` rule on `.inv-row`) | `.product-grid-row:hover .c-icon-btn { opacity:1 }` (`inventory-product-list.component.scss:30-32`) — reveals action icons on hover | n/a | Not a conflict — same reasoning as Dashboard's card hover-lift: idiomatic addition the static export simply doesn't show, not forbidden by it. |
| Edit/Delete icon buttons | `30×30px`, `background:none`, `border-radius:var(--radius-sm)`, muted/danger `color` (`dc.html:378-384`) | `.c-icon-btn` (`styles.scss:740-789`): `36×36px` (`2.25rem`), `44×44px` on mobile, `opacity:0.7` at rest, scale+rotate on hover | tokens/shape match; size larger | Design's buttons are smaller (30px) and always full-opacity; app's are larger (accessibility tap-target reasoning, `styles.scss:769-773`) and dimmed at rest. Likely intentional a11y choice already made app-wide — flag, don't assume reduce below 44px on touch. |

### Bulk selection bar (delete/clear portion only — see Inventory 1 for the app-only bulk-edit portion)

| Element | Design (exact) | Current app | Notes |
|---|---|---|---|
| Bar surface | `background:var(--color-primary-soft); border:1px solid var(--border-focus); border-radius:var(--radius-md); padding:var(--space-3) var(--space-4)` (`dc.html:278`) | Not read in this pass — `selection-bar.component.scss` not opened for this spec | **Not verified — Step-4-time check needed**, same caveat style as the Dashboard spec's footer-link note. |
| Delete button | `border:1px solid rgba(220,38,38,0.3); color:var(--color-danger)` outline-style (`dc.html:280`) | Not verified this pass | Same caveat. |

### Empty state

| Element | Design (exact) | Current app | Maps to | Notes |
|---|---|---|---|---|
| No-products-at-all | design has no dedicated empty-state markup in `Inventory.dc.html` (only `isEmpty` → a one-line centered text message, `dc.html:333-335`: `padding:var(--space-12) var(--space-4); text-align:center; color:var(--color-text-muted); font-size:var(--fs-sm)`) | `app-empty-state` with icon `package` + CTA (`inventory-product-list.component.html:111-118`) | `.c-empty-state`/`.c-empty-state__icon`/`.c-empty-state__msg` (`styles.scss:1152-1172`) — same engine flagged in the Dashboard spec | App's empty state (icon + CTA) is richer than the design's plain text line — not a gap, the design simply doesn't specify this state in detail. Reuse the existing engine, no action needed beyond confirming token colors match (`--color-text-secondary` engine default vs design's `--color-text-muted` — same drift the Dashboard spec already flagged for this shared engine). |
| Filtered-to-nothing | `לא נמצאו מוצרים התואמים לחיפוש`, same styling as above (`dc.html:334`) | `no_products_match` plain text (`html:120`) | n/a | Matches design's intent (plain text line), styling not independently verified this pass. |

### Add/Edit surface — tokens only (see Executive Summary #2 — not a modal, do not rebuild as one)

| Element | Design modal (exact) | App's real page | Maps to | Notes |
|---|---|---|---|---|
| Card surface | `background:var(--bg-glass-strong); backdrop-filter:var(--blur-modal); border:1px solid var(--border-glass); border-radius:var(--radius-xl); box-shadow:var(--shadow-modal)` (`dc.html:399`) | `.form-container` (`product-form.component.scss:23-33`): `background:var(--bg-glass-strong)(match); border:1px solid var(--border-glass)(match); border-radius:var(--radius-xl)(match); box-shadow:var(--shadow-glass)` (design wants `--shadow-modal`, a heavier shadow — real drift); `backdrop-filter:var(--blur-glass)` (design wants `--blur-modal`, a stronger blur — real drift) | `--shadow-modal`/`--blur-modal` swap | Two small, real token swaps on an otherwise-matching surface. Low severity given the page-vs-modal structural difference already accepted (Executive Summary #2) — fixing these two tokens is a safe, isolated, in-scope change (CSS-only, no field/logic changes). |
| Field label | `font-size:var(--fs-xs); font-weight:var(--fw-semibold); color:var(--color-text-muted); text-transform:uppercase; letter-spacing:var(--tracking-wide)` (`dc.html:408,416,426`, etc.) | `.form-group label` (`product-form.component.scss:127-138`): `font-size:0.875rem(=--fs-base, two steps larger); font-weight:600(≈--fw-semibold); color:var(--color-text-secondary)` (design wants `--color-text-muted`) — **no `text-transform`, no `letter-spacing`** | rebuild from tokens | Same recurring uppercase/tracking gap as Executive Summary #5, now a third instance (filter headers, list headers, form field labels) — strengthens the case for treating this as one systemic fix rather than three separate ones. |

---

## Unmapped — needs a Human call

Nothing on this screen fails to resolve to an existing token or engine — every design value used
here already exists in `src/styles.scss`/`colors_and_type.css` under some name. Every item below is
a choice between already-existing options, not a missing value:

1. Panel-toggle button: one always-visible toggle (design) vs. the app's existing open-button +
   separate in-panel close-icon (two affordances)?
2. Page title: correct to `--fs-xl`/`--tracking-tight` (currently smaller + oppositely tracked)?
3. `.c-btn-primary` engine: fix gradient stops/pill-radius/shadow app-wide (affects every screen),
   or override locally just for this "Add Product" button?
4. Filters aside surface: adopt the design's plain 4-corner-radius glass panel, or keep the app's
   colored left-accent-border treatment (decorative addition, no design counterpart)?
5. Filter category header + list header cell + form field label: add
   `text-transform:uppercase; letter-spacing:var(--tracking-wide)` to `.c-filter-category-header`
   and `.c-grid-header-cell` (engine-level, cross-screen) — bless the systemic fix?
6. Checkbox size: adopt the design's 24×24px everywhere `.c-filter-option` appears, or keep the
   app's existing 16×16px?
7. List header row background: `--bg-muted` (design) vs. current `--bg-glass`?
8. Low-stock indicator: circular icon+tooltip (design) vs. keep the current text pill?
9. Add/Edit surface: correct `--shadow-modal`/`--blur-modal` (isolated, safe token fix) — bless
   as in-scope despite the broader page-vs-modal structural difference being out of scope?
10. **Cross-screen, larger than a single "needs a call":** the shared mobile carousel pattern
    (Executive Summary #3) and the shared filter-panel overlay-drawer pattern (Executive Summary #4)
    — both affect `list-shell`/`carousel-header`/`cell-carousel`, consumed by 3 other future
    sessions. Recommend deciding these before Recipe Book/Suppliers/Equipment sessions rather than
    re-litigating per screen.

None of these block writing code in the "value doesn't exist" sense — they're fidelity/reuse
judgment calls, consistent with "never improvise a value."

---

## Stop-condition check (§10)

- Design source missing/uncommitted — no, verified present and committed.
- Visual value with no token/engine match — no, see "Unmapped" section above (zero true unmapped values).
- A design row looks `specified` but wasn't confirmed — no; no row was tagged `specified` this
  session (Inventory 2 #3 and #6 are real-but-`deferred`, not promoted).
- Design markup requiring deletion/rewrite of existing TS logic — no; every change identified above
  is CSS/markup-level. `product-form.component.ts`'s growth-freeze is explicitly respected — no
  proposed change touches it.
- Screen has no design counterpart — no, `Inventory.dc.html` exists and was read in full.
- About to touch a second screen — no, Inventory only (the shared `list-shell`/`carousel-header`/
  `cell-carousel` engines are flagged for Human sign-off precisely *because* touching them affects
  other screens — not touched in this spec).
- Treating `v1/`/`screenshots/`/reference-only docs as authority — no, none were read as authority.

**No stop conditions triggered. Proceeding is blocked only on Human approval per Step 3, not on any
missing information — with the exception of Unmapped items #10, which the Human may want to resolve
before, rather than during, Step 4 given their cross-screen scope.**

---

## Await approval

Per §6 Step 3: **no code will be written until the Human replies with an explicit validation word**
(`done`, `verified`, `approved`, `LGTM for this job`, etc. — see `docs/agent/job-validation.md`).
Silence, "thanks," or a green build do not count.

If approved as-is, Step 4 will restyle in place using the resolutions above, defaulting to the
"exact design fidelity" option on every "needs a call" item unless the Human specifies otherwise in
their reply — except items #1 and #10, where "exact design fidelity" would mean discarding an
already-built, more-capable app pattern (two-affordance panel toggle; drawer-overlay filter panel;
single-slide carousel) for a simpler one the design's own later CSS passes partly abandon anyway
(#10's carousel case). Please state explicitly how you want #1 and #10 resolved — the default for
those two is "keep the app's existing pattern, no change" rather than "match the design exactly."

---

## Step 4 — Execute (done, 2026-08-24)

Approved by Human reply, all 10 "needs a call" items resolved as follows: **1 → design; 2 → design;
3 → every screen (engine-level); 4 → Human's call, resolved as design (see below); 5 → yes; 6 → keep
today's app value, no change; 7 → yes; 8 → keep today's app value, no change; 9 → yes; 10a → keep
today's swipe carousel, no change; 10b → rebuild to design.** All changes restyle-in-place (no
markup replaced with the design's own markup, no TS logic removed; `product-form.component.ts`'s
growth-freeze fully respected — only its `.scss` was touched):

- **`src/app/shared/list-shell/list-shell.component.html/.scss/.ts`** (shared by Inventory, Recipe
  Book, Suppliers, Equipment — items #1, #4, #10b): panel toggle collapsed to the design's single
  always-visible button (`.open-panel-btn` now unconditional; removed the separate in-panel
  `circle-x` close button and its `panel-toggle-icon` CSS). Filter panel rebuilt to match the
  design's always-in-flow aside: dropped the overlay-drawer pattern entirely (no more
  `position:fixed`/`position:absolute`, no backdrop element, no slide-in `transform`, no
  swipe-to-close — removed `onPanelTouchStart`/`onPanelTouchEnd` from the `.ts` since they only
  served the drawer) — replaced with a design-matching two-state layout: desktop grid-area panel
  (unchanged mechanism, corrected surface — see below), and ≤1023px (design's own breakpoint,
  `$panel-overlay-break` updated from 1024px→1023px) the panel now stacks full-width in-flow between
  the toolbar and the table (`grid-template-areas: 'header' 'selbar' 'panel' 'table'`), matching
  `Inventory.dc.html`'s `.inv-aside{position:static;width:100%}` mobile rule. Panel surface corrected
  to the design's exact tokens (item #4, resolved as exact design fidelity to stay consistent with
  the #10b rebuild): `background:var(--bg-glass)` (was `--bg-glass-strong`), plain
  `border:1px solid var(--border-glass)` on all 4 sides (dropped the decorative 3px colored
  left-accent border), symmetric `border-radius:var(--radius-lg)` (was 0 on two corners), width
  `250px` (was `220px`, design's exact value). Added a real `column-gap:var(--space-5)` between the
  panel and the table (design's `.inv-main-layout{gap:var(--space-5)}`) and removed the now-unneeded
  "flatten the touching edge" desktop radius hack, since the two surfaces are visually separate now,
  not touching.
- **`src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.scss`**
  (item #2): `.page-title` → `font-size:var(--fs-xl); font-weight:var(--fw-bold);
  letter-spacing:var(--tracking-tight)` (was `1.25rem`/`700`/`0.02em`).
- **`src/styles.scss`** (items #3, #5, #7 — engine-level, affects every screen using these classes):
  `.c-btn-primary` → gradient stops corrected to `var(--color-primary) → var(--color-primary-hover)`,
  `border-radius:var(--radius-full)` (pill, was `--radius-md`), `box-shadow:var(--shadow-glow)`
  (was a 4-layer inset/glow shadow). `.c-grid-header-cell` → `padding-inline:var(--space-4)` (was
  `--space-3`), `background:var(--bg-muted)` (was `--bg-glass`), `font-size:var(--fs-xs)` (was
  `--fs-sm`), added `text-transform:uppercase; letter-spacing:var(--tracking-wide)`.
  `.c-filter-category-header` → `font-size:var(--fs-xs)` (was `--fs-sm`), added
  `text-transform:uppercase; letter-spacing:var(--tracking-wide)`.
- **`src/app/pages/inventory/components/product-form/product-form.component.scss`** (item #9, plus
  item #5's third instance): `.form-container` → `box-shadow:var(--shadow-modal)` (was
  `--shadow-glass`), `backdrop-filter:var(--blur-modal)` (was `--blur-glass`). `.form-group label` →
  `font-size:var(--fs-xs); font-weight:var(--fw-semibold); color:var(--color-text-muted)` (was
  `0.875rem`/`600`/`--color-text-secondary`), added `text-transform:uppercase;
  letter-spacing:var(--tracking-wide)`.

**Not changed (per explicit "keep today's" resolution):** filter/list checkbox size (item #6, stays
16px), low-stock indicator (item #8, stays the text pill), the mobile carousel component (item #10a,
`carousel-header`/`cell-carousel` untouched).
**Not touched (out of scope, no Human resolution requested):** the bulk-selection-bar surface tokens
and the "Unmapped" items #4's alternative resolution weren't re-litigated once #4 was folded into
#10b's rebuild; `product-form.component.ts` — zero lines added or removed, growth-freeze intact.

### Step 5 — Verify

- `ng build --configuration production` — **0 errors**, output complete. Pre-existing warnings only
  (the same `venue-detail`/`venue-list` nullish-coalescing warnings, initial bundle budget,
  `cook-view.page.scss` budget, `exceljs` CJS notice already present before this session) — none
  introduced by this change.
- `ng test --watch=false --browsers=ChromeHeadless` (full suite) — **312/312 SUCCESS**, 0 failures,
  including `equipment-list.component.spec.ts` (a second, independent consumer of `list-shell` beyond
  Inventory) and all `inventory-product-list`/`product-form` specs.
- `eslint` on every touched `.ts` file (`list-shell.component.ts`) — 0 errors.
- Inventory 1 re-read against the current code: every signal/computed, every injected service, the
  full `useListState` deep-link param set (`q`/`sort`/`order`/`filters`/`lowStock`/`nutrition`), the
  disabled/`isLoggedIn` gates, RTL, and the validation/nutrition/AI-assist app-only features are all
  still present and untouched — confirmed by direct re-read, not diff-absence alone.
  `product-form.component.ts` has zero added/removed lines (growth-freeze respected).
- **Cross-screen impact confirmed intentional, not accidental**: `list-shell` is also consumed live
  today by `supplier-list`, `recipe-book-list`, and `equipment-list` (grep-confirmed before Step 4,
  §Executive Summary #3/#4) — all three now inherit the single-toggle button and the rebuilt
  in-flow filter panel ahead of their own `/design-port` sessions. This is expected and desired (the
  engine is shared infrastructure per `design-port.md` §7), and the full test suite covers
  `equipment-list.component.spec.ts` as a second consumer — but their own port-specs should note this
  piece is already done when their sessions come up, the same way Metadata Manager's registry note
  already does for its jump-nav.
- Live visual comparison at 1280px/390px is performed by the Human, not by Claude Code, per §6
  Step 5 — reporting readiness for Human review, not attempting browser-based self-validation.

### Step 4 — Follow-up fixes from Human tablet-width review (2026-08-24)

Human caught three real bugs/gaps in the first pass, all in the same `list-shell` rebuild:

1. **Page couldn't scroll past the filter panel on tablet.** Root cause: the ≤1023px block kept
   `max-height:90dvh` on `.list-container` plus a `1fr` table row, which trapped scrolling inside the
   table's own internal scrollbar instead of letting the page scroll. Fixed: removed the height cap,
   changed the table row to `auto`, and set `.table-body{overflow-y:visible}` at this breakpoint —
   the card now grows to its full content height and the page scrolls normally
   (`list-shell.component.scss`).
2. **Filter options should pack densely, not one per row.** Added a new engine variant,
   `.c-filter-options--dense` (CSS grid, `grid-template-columns:repeat(auto-fill,minmax(0,max-content));
   grid-auto-flow:dense`), and applied it to Inventory's category/allergen option lists
   (`inventory-product-list.component.html`) — short items (most allergens) now sit side by side,
   shrinking the panel's height. `.c-filter-options`/`--inline` (used elsewhere, e.g. Suppliers)
   untouched.
3. **Filter toggle button still read as the old app's hamburger-menu affordance, not the design's
   filter icon.** Swapped `menu` → `sliders-vertical` (new Lucide icon, registered in `app.config.ts`
   + `test-lucide-icons.ts` + two specs with their own local icon subsets —
   `equipment-list.component.spec.ts`, `recipe-book.page.spec.ts` — that don't consume the shared
   `TEST_LUCIDE_ICONS` map), corrected the button to the design's exact `38×38px` (was `40px`/`44px`
   min), size-16 icon, with the 44px tap-target floor now applied only at ≤767px matching the design's
   own touch-ergonomics pass rather than unconditionally.

Re-verified: `ng build --configuration production` — 0 errors, same pre-existing warnings only.
`ng test --watch=false --browsers=ChromeHeadless` — **311/311 SUCCESS** (the 3 icon-provider failures
from the first `sliders-vertical` registration pass are fixed and re-confirmed green).

### Step 4 — Second follow-up (2026-08-24)

Human reported `.c-filter-options--dense` (fix #2 above) was too cramped to read. Root cause: CSS
Grid with `auto-fill`/`max-content` tracks shares column widths across all rows at a given column
index — short and long labels landing in the same track got squeezed to a common width, clipping
text. Replaced with `display:flex; flex-wrap:wrap` — every option now sizes to its own natural
width and simply wraps to the next line, no shared-track squeeze (`src/styles.scss`). Re-verified
`ng build --configuration production` — 0 errors, same pre-existing warnings only.
