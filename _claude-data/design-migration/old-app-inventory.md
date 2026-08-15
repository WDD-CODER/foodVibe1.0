# Old App Functionality Inventory — FoodVibe 1.0

Source: live codebase at `src/app/` on branch `chore/session-save-line-refs`.
Method: read every page component TS + HTML, plus shared components and services they depend on.
Scope: what the app **does today** — no comparison to the new design.

Conventions used below:
- **Interactive** = buttons, inputs, toggles, menus, drag targets, keyboard handlers
- **States** = empty / loading / error / disabled / permission-gated / RTL-specific
- **Edge** = non-happy-path behaviour that is easy to lose in a redesign

---

## 0. Global app shell

### 0.1 Root layout (`appRoot/app.component.html`)

| Element | Behaviour |
|---|---|
| `<app-header/>` | Always rendered, top of page |
| `.app-content` + `<router-outlet>` | Page content |
| Global loader overlay | `<app-loader size="large" label="loader_please_wait" [overlay]="true">` shown when `isRouteLoading()` **or** `isDataReloading_()` |
| `<user-msg/>` | Global toast/message host |
| `<app-hero-fab/>` | Global floating action button (see 0.3) |
| `<app-auth-modal/>` | Always mounted |
| `<app-confirm-modal/>` | Always mounted (eager — used early in typical sessions) |

**Lazily mounted global modals** (each `@defer (when <service>.isOpen…)`), i.e. every one is a *global singleton modal driven by a service*, openable from anywhere:

- `unit-creator-modal` (UnitRegistryService.isCreatorOpen_)
- `translation-key-modal` (TranslationKeyModalService)
- `app-label-creation-modal` (LabelCreationModalService)
- `add-item-modal` (AddItemModalService)
- `app-quick-add-product-modal` (QuickAddProductModalService)
- `app-quick-edit-product-modal` (QuickEditProductModalService)
- `add-equipment-modal` (AddEquipmentModalService)
- `app-global-specific-modal` (GlobalSpecificModalService)
- `app-supplier-modal` (SupplierModalService)
- `app-ai-recipe-modal` (AiRecipeModalService)
- `app-ai-menu-modal` (AiMenuModalService)
- `app-ai-product-modal` (AiProductModalService)
- `app-restore-choice-modal` (RestoreChoiceModalService)

> Edge: because these are deferred, the *first* open of each has a lazy-load beat. Any redesign that inlines them changes bundle behaviour.

### 0.2 Header (`core/components/header`)

Three **separate** navigation surfaces, switched by CSS breakpoint — all three exist in the DOM simultaneously:

1. **Desktop `.nav-pills`** — Dashboard, Inventory, Recipe Book, Menu Library. `routerLinkActive="active"`.
2. **Hamburger + drawer `<ul>`** — small-tablet range. Contains a close (X) button, the same 4 links, plus a `.mobile-auth-section` with Sign in / Sign up (logged out) or Log out (logged in). Backdrop `.mobile-nav-backdrop` closes the drawer on click.
3. **Bottom tab bar `.bottom-nav`** — mobile ≤620px. Same 4 destinations, icon + label.

Auth area:
- Logged out (desktop): guest avatar icon button (`circle-user-round`) + a text "sign in" link — **both** open the auth modal in `sign-in` mode.
- Logged in (desktop): `.user-chip` with avatar image *or* initials fallback (first char of name, uppercased) + **admin crown badge** when `user.role === 'admin'` + username button that **logs out on click**.
- Mobile: separate floating avatar FAB (`.mobile-avatar-fab`, ≤620px). Tapping it toggles `mobileAvatarOpen`, revealing a name button that logs out. Logged out it is a single guest button opening sign-in.
- Header is `dir="rtl"` explicitly. Bottom nav also `dir="rtl"`.

**Logout edge case (important, easy to lose):** `logout()` first checks whether the *current* route is protected by `authGuard` (walks the router snapshot tree recursively). If so it navigates to `/dashboard` **first** so `canDeactivate` guards run; if the pending-changes guard cancels the navigation, **logout is aborted**. Only then does it call `userService.logout()`.

### 0.3 Hero FAB (`core/components/hero-fab`)

- Fixed floating flame button; `toggle()` expands a radial/stack of `.fab-action` buttons.
- Actions are **page-registered** via `HeroFabService.setPageActions()` — each page pushes its own quick actions on `ngOnInit` and clears them on `ngOnDestroy`. Empty when no page registered any.
- Always appends a **chef-hat action → `/recipe-builder`**, *except* when already on recipe-builder.
- Positional variant: `.above-bar` class when the URL contains `menu-intelligence` (lifts FAB above that page's bottom bar).
- Running any action auto-collapses the FAB.

### 0.4 Routing / guards / resolvers (`app.routes.ts`)

| Route | Guards | Resolvers |
|---|---|---|
| `/equipment` (+ `list`, `add`, `edit/:id`) | `authGuard` on add/edit | `equipmentEnsureLoadedResolver`; `equipmentResolver` on edit |
| `/venues` (+ `list`, `add`, `edit/:id`) | `authGuard` on add/edit | `venuesEnsureLoaded`; `venueResolver`, `equipmentEnsureLoaded` on add/edit |
| `/inventory` (+ `list`, `add`, `edit/:id`, `equipment`, `equipment/add`, `equipment/edit/:id`) | `authGuard` + `pendingChangesGuard` on product add/edit; `authGuard` on equipment add/edit | `productResolver`, `equipmentEnsureLoaded`, `equipmentResolver` |
| `/recipe-builder`, `/recipe-builder/:id` | `authGuard` + `pendingChangesGuard` | `recipeResolver`, `equipmentEnsureLoaded`, `preparationsEnsureLoaded`, `kitchenDataEnsureLoaded` |
| `/recipe-book` | — | `kitchenDataEnsureLoaded` |
| `/menu-library` | — | `menuEventsEnsureLoaded` |
| `/menu-intelligence`, `/menu-intelligence/:id` | `authGuard` + `pendingChangesGuard` | `menuEventsEnsureLoaded`, `menuSectionCategoriesEnsureLoaded` |
| `/cook`, `/cook/:id` | `pendingChangesGuard` on `/cook/:id` only — **no authGuard** | `recipeResolver`, `kitchenDataEnsureLoaded` |
| `/suppliers` (+ `list`, `add`, `edit/:id`) | `authGuard` on add/edit | `supplierResolver` |
| `/dashboard` | — | — |
| `/trash` | `authGuard` | — |
| `/command-center` | redirect → `/dashboard?tab=metadata` | — |
| `/` | redirect → `/dashboard` | — |

> Edge: `/inventory/equipment*` duplicates the `/equipment*` routes — equipment is reachable from two places with different chrome.

---

## 1. Dashboard (`/dashboard`)

Tabbed page; **tab is a URL query param** (`?tab=metadata|venues|add-venue|trash`, absent = overview) and set with `replaceUrl: true`. Tabs render entirely different feature components.

### 1.1 Overview tab (`dashboard-overview`)

**Header nav pills** (`c-tab-pill`): Core settings → metadata tab; Venue list → venues tab; Trash → trash tab; Suppliers → navigates to `/suppliers` (leaves the dashboard).

**KPI cards** (4):

| Card | Value source | Footer actions |
|---|---|---|
| Total products | `kitchenState.products_().length` | "View inventory" → `/inventory`; "Add product" → `/inventory/add` — **disabled when logged out**, with `sign_in_to_use` title |
| Total recipes | `recipes_().length` | "View recipes" → `/recipe-book`; decorative inline SVG sparkline |
| Low stock (`warning` variant) | `lowStockProducts_().length` | "View inventory" → `/inventory?lowStock=1`; sparkline |
| Unapproved recipes (`info` variant) | recipes where `!is_approved_` | "View recipes" → `/recipe-book?filters=Approved:false`; sparkline |

> The two deep-links pre-seed list filters via query params — the target lists read them back through `useListState`.

**Recent activity feed**:
- Reads the **last 10 entries straight from localStorage** on every change detection (`getRecentEntriesFromStorage(10)`), deliberately not the in-memory cache. `activityLog.syncFromStorage()` runs in the constructor.
- Each row: entity avatar letter (`P` product / `R` recipe / `D` dish), entity-type tag, entity name, horizontally scrollable list of **change chips** (`label: from → to`), and an action tag (`activity_<action>`).
- Change chips are buttons that toggle a **fixed-position change popover** (`app-change-popover`) anchored to the chip's bounding rect; clicking the same chip again closes it; clicking outside closes it *unless* the click was on another change tag.
- Left/right **scroll buttons** per row scroll the change strip by `max(120px, 60% of width)` with smooth behaviour (mobile affordance).
- Vertical scroll affordances: `scrollIndicators` directive plus top/bottom scroll zones and chevron indicators.
- **Empty state**: `no_recent_activity` copy.

### 1.2 Metadata tab

Renders `app-dashboard-header` (a *different* header component from the overview one) + `app-metadata-manager`. That header swaps the "Core settings" pill for a **"Back to dashboard"** button with an `arrow-right` icon (RTL back direction), and keeps Venue list / Suppliers / Trash buttons.

### 1.3 Venues tab

`app-venue-list` with `[embeddedInDashboard]="true"`; its "add venue" click switches to the `add-venue` tab instead of routing.

### 1.4 Add-venue tab

`app-venue-form` with `[embeddedInDashboard]="true"`; `saved` and `cancel` both return to the venues tab.

### 1.5 Trash tab

`app-trash-page` embedded — the same component as the standalone `/trash` route, but reachable here **without** the `authGuard` that protects `/trash`.

---

## 2. Inventory — product list (`/inventory`, `/inventory/list`)

Built on the shared `app-list-shell` (title / search / selection-bar / actions / table-header / table-body / filters slots), `dir="rtl"`, with distinct desktop and mobile grid templates
(`2fr 1fr 1fr 1fr minmax(48px,0.8fr) 0.8fr 80px auto` vs `2fr 1fr 0.8fr 0.8fr 40px 28px`).

### 2.1 Interactive elements

- **Search input** with magnifier icon and visually-hidden label; filters on `name_hebrew` (lowercased contains).
- **Add product** primary button — **disabled when logged out** (`sign_in_to_use` tooltip).
- **Sortable headers**: Product (name), Category, Supplier — click *or* Enter *or* Space; repeated click flips asc/desc; icon cycles `arrow-up-down` → `arrow-up` → `arrow-down`. Sort fields available in code: `name | category | allergens | supplier | date` (`date` and `allergens` sorts exist in the comparator but only name/category/supplier are wired to headers).
- **Allergens header** does *not* sort — it toggles "expand all allergens" across every row.
- **Carousel header + cell carousel**: on narrow viewports Category / Allergens / Supplier collapse into a single swipeable column; the header index and every row's cell index stay in sync via `carouselHeaderIndex_`.
- **Row click** → edit product, *except* when the click landed on a button, link, `.allergen-btn-wrapper`, or the row checkbox; and when selection mode is active a row click **toggles selection instead of navigating**.
- **Keyboard**: Enter / Space on a row opens edit.
- **Per-row action menu** (`app-row-actions-menu`): Edit (pencil) and Delete (trash) — both disabled when logged out.
- **Row checkbox** + **header select-all** checkbox (checked only when the filtered set is non-empty and fully selected).
- **Selection bar** (`app-selection-bar`) with bulk delete and **bulk edit** across four fields: Category, Supplier, Allergens (multi) and Unit (single).
- **Allergen pill button** per row: shows count + shield icon, toggles an expanded pill grid; `clickOutside` closes it; opening one clears "expand all".
- **Nutrition badge** rendered inline after the name when `nutrition_per_100g` exists.
- **Left nav inside the filter panel**: "Product list" (`/inventory/list`) vs "Logistics" (`/inventory/equipment`).
- **Filter panel toggle** — persisted per list via `useResponsivePanelState('inventory')` (responsive default + user preference).

### 2.2 Filters

Static toggles: Low stock, **Invalid only**, **Incomplete only**, **Has nutrition**, **Missing nutrition** (the two nutrition filters are mutually exclusive — selecting one clears the other; clicking the active one resets to `all`).
Dynamic filter categories built from the data itself: **Allergens**, **Category**, **Supplier** (supplier options render supplier names, not ids). Each category is collapsible, shows a **count badge** of selected options, and chevron direction flips (`chevron-down` / `chevron-left` — RTL-aware).
`Clear filters` button appears only when something is active.

### 2.3 URL state

`useListState('inventory', …)` syncs to the URL: `q`, `sort`, `order`, `filters` (encoded record), `lowStock`, `nutrition`.
> Note: `showInvalidOnly_` and `showIncompleteOnly_` are **not** URL-synced — they reset on reload. This is existing behaviour, not necessarily intentional.

### 2.4 Validation status surface

`getProductValidationStatus()` classifies each product as `valid | incomplete | invalid`. The row gets `row--invalid` / `row--incomplete` classes, and a badge (`alert-circle` / `alert-triangle`) whose hover tooltip lists **each missing field as a chip with a per-field icon** (`VALIDATION_FIELD_ICONS`).

### 2.5 Inline editing

- **Inline price edit**: focus captures the original value; on blur, if the value moved by ≥0.001, a **confirm modal** (`save_price_confirm`, save button labelled `save_price`) gates the write; declining **restores the original value into the input**. Saving converts the per-display-unit price back to `buy_price_global_` and rewrites *every* entry in `sources_`; if there are no sources it creates one with an empty `supplierId`. A per-row saving spinner (`savingPriceId_`) shows during the write.
  > In the current template the price cell is rendered read-only (`col-price-readonly`) — the inline-edit handlers exist and are reachable from code but the input is not currently wired in the list markup.
- **Inline unit change** (`onUnitChange`): recalculates the price using the product's `purchase_options_` conversion rate when present, else the UnitRegistry conversion ratio, then rewrites all sources.

### 2.6 States

- **Empty database**: `app-empty-state` with `empty_inventory`, package icon, and an `add_first_product` CTA that is **disabled when logged out**.
- **Filtered-to-nothing**: plain `no_products_match` copy (a *different* state from empty database).
- **Deleting**: per-row inline small loader replaces the delete button.
- **Delete confirm**: Hebrew confirm text, `danger` variant. Bulk delete confirms with the count (`למחוק N מוצרים?`).
- **Logged out**: add / edit / delete / add-first all disabled with `sign_in_to_use` titles; browsing and filtering stay fully available.

### 2.7 Hero FAB actions registered by this page

`add_product` (plus icon) → `/inventory/add`; `ai_product_create_new` (sparkles) → AI product modal in `create` mode. On AI create the draft is saved via `productData_.addProduct()` and the user is routed to `/inventory/edit/<newId>`; **`purchase_options_` is deliberately dropped** from the AI draft because AI unit symbols don't map to UnitRegistry keys.

---

## 3. Product form (`/inventory/add`, `/inventory/edit/:id`)

Reactive form, `dir="rtl"`. Also usable as an embedded component via `initialProduct_` input.

### 3.1 Header
- Title switches: `add_product_inventory_title` + subtitle (create) vs `edit_product_title: <name>` (edit).
- **Sparkles icon button** → opens the AI product modal in `edit` mode, pre-seeded with a snapshot of the current form (name, base unit, categories, allergens, yield factor, min stock, expiry days); the returned patch is applied by `productAiFlow_.applyPatch()`.

### 3.2 Mandatory section
| Field | Control | Notes |
|---|---|---|
| Product name | text, **auto-focused on view init** (`setTimeout(…, 0)`) | `duplicateNameValidator` → `duplicate_product_name_error`; required → `field_name_required` |
| Category | `app-chip-search-dropdown` multi-chip, tags icon | "Add new category" always shown; picking `NEW_CATEGORY` opens the **translation-key modal** to register a Hebrew↔English key |
| Buy price | number + ₪ prefix, `SelectOnFocus` | required (≥0) → `field_price_required` |
| Base unit | `app-custom-select`, type-to-filter | `NEW_UNIT` option opens the **unit-creator modal**; on close an effect writes the newly created unit back into the field |

### 3.3 Purchase options (FormArray)
Repeating row: **unit symbol select** `=` **conversion rate number** `:` **UOM select** + special-price block + delete button.
- "Add purchase unit" ghost button appends a row.
- Choosing a unit symbol auto-computes `conversion_rate_` from the UnitRegistry ratio (`unitFactor / baseFactor`), auto-fills `uom` with the current base unit, and auto-suggests `price_override_` via `ConversionService.getSuggestedPurchasePrice()`. Selecting the empty/`NEW_UNIT` value clears conversion, uom and price.
- Changing conversion rate re-derives the suggested price **unless the user has confirmed a manual override** for that row.
- **"Special purchase price" checkbox** reveals the override price input. Unchecking clears the override to 0 so the unchecked state persists across saves.
- **Override blur confirm**: on blur, an empty/NaN value snaps back to the conventional price; a value equal to the conventional one (±0.0001) is treated as non-override; a genuinely different value pops a confirm modal (`save_price_confirm`, title `save_price`) — declining reverts to the conventional price.
- Row-level invalid styling (`row-invalid`, `field-error` per input) and an inline error row `purchase_unit_details_invalid` with alert icon, shown when dirty or after submit.
- Creating a unit *from inside a row* (via `unitAdded$`) patches unit symbol, uom, conversion rate **and** suggested price at once, and marks the form dirty.

### 3.4 Optional section — five collapsible fields
Supplier, Allergens, Waste/Yield, Min stock level, Expiry days default. Each renders as:
- a compact **header button** (icon + label, keyboard-activatable with Enter and Space) when collapsed, and
- an expanded content block that **auto-collapses on click-outside if left empty/default** (`onSupplierBlur`, `onAllergensBlur`, `onWasteYieldBlur`, `onMinStockBlur`, `onExpiryDaysBlur`) — clicking the header itself is exempted so it doesn't fight the toggle.

Field detail:
- **Supplier** — chip-search dropdown over supplier ids, displayed via supplier name; "Add supplier" opens the add-supplier flow.
- **Allergens** — chip-search dropdown, warning-coloured shield icon, `all_allergens_selected` no-options label, "add new allergen" routes through the translation-key modal (Hebrew label → English key).
- **Waste / Yield** — two linked numeric fields: `waste_percent_` (0–99, % suffix) and `yield_factor_` (step 0.001). They are **bidirectionally synced** (`setupWasteLogic`): editing either recomputes the other. Each has helper text. A **cost-impact alert** appears when buy price > 0 showing `netUnitCost_` formatted to 2 decimals with ₪.
- **Min stock level** / **Expiry days default** — plain number inputs, min 0.

**Auto-expansion on hydrate**: when editing, each optional field opens automatically if it holds a non-default value (min stock > 0, expiry > 0, yield factor ≠ 1 ±0.001, any allergen, any supplier).

### 3.5 Save / cancel / guard behaviour
- Footer: "Back to list" (arrow-right, RTL back) and submit button whose icon/label swap between `save`/`update_product` and `plus`/`save_product`; disabled while saving, with an inline small loader.
- `validateForm_()` produces a `validationErrors_` record driving `c-input--invalid`, `aria-invalid`, and per-field `c-field-error` messages. Failing validation marks all controls touched and raises a global error toast (`form_has_errors`).
- On save, every category is registered into `MetadataRegistryService`, `show_special_price_` is stripped from purchase options, and `sources_` is rebuilt from the flat price + supplier ids (preserving `addedBy`/`addedAt` of existing sources; falling back to a single blank-supplier source when a price exists but no supplier).
- **`saveAndWait()` is the pendingChangesGuard hook** — the guard can save from its own dialog and only proceeds on success.
- **`hasRealChanges()`** compares a normalised form snapshot against the initial one, so the unsaved-changes prompt doesn't fire on no-op edits.
- **Legacy data migration on hydrate**: old `category_` string and `is_dairy_` boolean are folded into `categories_`.
- **`getValuesNeedingTranslation()` / `removeValuesNeedingTranslation()`** — the form can report and strip values that have no translation key yet.

---

## 4. Equipment / Logistics (`/equipment/*` and `/inventory/equipment*`)

**Dual mounting**: the same list and form components render under two routes. `isUnderInventory` (derived from the URL) changes the page title (`logistics` vs `equipment_list`), the base path used by every navigation, the panel-preference context (`inventory` vs `equipment`), and whether the inventory/logistics sub-nav is rendered inside the filter panel.

`/equipment` (standalone) adds its own top nav with "Equipment list" / "Add equipment" links; `/inventory/equipment` does not.

### 4.1 List
- Search, sortable Name / Category / Owned columns (Consumable column is display-only), carousel header + cell carousel for Category / Owned / Consumable.
- Add-equipment primary button, disabled when logged out.
- Selection checkboxes, select-all, selection bar with **bulk delete** and **bulk edit** on Category and Is-consumable.
- Row actions menu: edit, delete (per-row deleting loader).
- Filters: Category checkboxes (from a fixed `EquipmentCategory` list) and a **radio group** for consumable — All / Yes / No (note: radios, unlike every other filter in the app which uses checkboxes).
- `clear_filters` shown only when filters are active.
- URL state: `q`, `sort`, `order`, `categories` (string set), `consumable` (nullable boolean).
- Empty result: `no_equipment_match`. **There is no dedicated empty-database state here** (unlike inventory/suppliers).

### 4.2 Inline edit panel (distinctive)
Clicking a row (or Enter/Space) expands an **inline edit panel underneath the row** rather than navigating:
- Fields: name, category (custom-select with `__add_new__` → add-new-category flow), owned quantity, is-consumable + scaling-enabled checkboxes, notes textarea.
- When scaling is enabled a **scaling-rule sub-section** appears: per guests, min quantity, max quantity (max optional, `—` placeholder).
- Cancel / Save; save disabled while invalid or saving; inline loader on save.
- **Close animation**: `closingId_` keeps the panel mounted with a `.closing` class for 200 ms before unmount.
- **Switching rows while dirty** prompts `unsaved_changes_confirm` (warning variant, save label) and saves first if accepted.
- `clickOutside` on the panel cancels the edit.
- Clicking the row again toggles the panel closed.
- Opening edit or deleting goes through `requireAuthService.requireAuth()` — logged-out users get the auth prompt rather than a silent no-op.
- Duplicate name errors surface as `duplicate_equipment_name`; other save failures as `save_failed`.

### 4.3 Standalone form (`/equipment/add`, `/equipment/edit/:id`)
Full-page version of the same fields (name, category, owned quantity, is-consumable, notes, scaling rule) with `validationErrors_` messaging, cancel + save (loader while saving). Name input is `#nameInput` (focused on init).

---

## 5. Suppliers (`/suppliers/*`)

### 5.1 List
- List shell with search, **"Dashboard" back button in the `shell-back-btn` slot**, add-supplier primary button (auth-gated).
- Columns: Name, then carousel group (Contact person, Delivery days, Min order), then Lead time, **Linked products count** (computed by counting products that reference the supplier), actions, select.
- Delivery days render through `deliveryDaysDisplay()`.
- Selection + bulk delete + bulk edit.
- **Inline edit panel** (same pattern as equipment): name, contact person, min order, lead time, and a **7-checkbox delivery-days FormArray**. Cancel/Save with loader, closing animation, click-outside handling.
- Filters: 7 delivery-day checkboxes + a "has linked products" toggle. `clear_filters` when active.
- **Empty database**: `app-empty-state` with `empty_suppliers`, truck icon, add-supplier CTA (disabled when logged out). Filtered-to-nothing: `no_suppliers_match`.

### 5.2 Form (`/suppliers/add`, `/suppliers/edit/:id`)
Renders **two entirely different layouts** from one template based on `embeddedInDashboard()`:
- Embedded: `h3` + `c-modal-body` / `c-modal-actions` (modal chrome).
- Standalone: `h2` header + `form-body` / `c-form-actions` page chrome, `dir="rtl"`.
Both contain name (duplicate-name validation → `duplicate_supplier_name`, required → `field_name_required`), contact person, delivery-days checkbox array, min order, lead time, and cancel/save with saving loader.

---

## 6. Venues (`/venues/*` and dashboard "venues" / "add-venue" tabs)

### 6.1 Page nav
`venues.page.html` renders a nav **only when not on the list route**: a "back to venue list" button (arrow-right) plus the configured nav links.

### 6.2 List
- Search, "Dashboard" back button, add-venue primary button (auth-gated).
- Columns: Name; carousel group (Environment type, **Infrastructure item count**); actions; select.
- Selection + bulk delete + bulk edit.
- Filters: Environment-type checkboxes; `clear_filters` when active.
- Row click / Enter / Space → edit.
- Empty result: `no_venues_match` (no dedicated empty-database state).
- `embeddedInDashboard` input changes the add-click into a tab switch instead of a route change.

### 6.3 Form
- Name (duplicate validation → `duplicate_venue_name`), environment type (custom-select, type-to-filter), notes textarea.
- **Available infrastructure FormArray**: repeating rows of *equipment select* (type-to-filter, `translateLabels=false` — equipment names are user data, not dictionary keys) + *available quantity* number + row delete. "Add row" ghost button.
- Cancel / Save with saving loader.
- `embeddedInDashboard` emits `saved` / `cancel` instead of routing.

---

## 7. Trash (`/trash` and dashboard "trash" tab)

- Header: "Dashboard" back button, `trash` title, **Refresh button** that shows `pending` while loading and is disabled during load.
- **Loading state**: medium loader with `loader_loading`.
- **Error state**: error paragraph with the thrown message (Hebrew fallback `שגיאה בטעינת האשפה`) plus a `refresh_again` retry button. This is one of the few pages with an explicit error state.
- **Three independent sections in fixed order: Dishes → Recipes → Products.** Each has:
  - "Recover all" and "Dispose all" section buttons — rendered **only when that section is non-empty**.
  - Per-item row: name, `trash_deleted_at: <he-IL short date + short time>`, and three buttons — **History**, Recover, Dispose.
  - Per-section empty copy `trash_empty`.
- **Confirm modals differ by action**: `trash_confirm_restore` (warning, save label `trash_recover` / `trash_recover_all`) vs `trash_confirm_dispose` / `trash_confirm_dispose_all` (danger, `trash_dispose` / `trash_dispose_all`).
- **Version-history overlay**: History opens a full-screen overlay hosting `app-version-history-panel` for that entity. Backdrop click closes; inner click is stopped from propagating. The panel is given a `recoverBeforeRestore` callback so restoring an old *version* of a deleted entity first un-deletes it. `restored` closes the overlay **and refreshes** the trash list.

---

## 8. Metadata manager / "Core settings" (`/dashboard?tab=metadata`, also `/command-center`)

A `dir="rtl"` grid of **manager cards**. A full-screen overlay loader (`loader_cooking_up`) covers the page while importing/restoring.

### 8.1 Generic manager cards (one shared `ng-template`, four instances)
Units & conversions (scale icon), Product categories (tag), Global allergens (alert-triangle), Recipe labels (tags).

Each card has:
- Title + coloured icon, an **add input** (Enter submits) and an **Add** button (disabled logged out, `sign_in_to_use` title).
- A list rendered in **three different shapes by type**: `allergen-pool` of pills, `label-pool` of pills (each with a **colour dot**), or a plain `list-stack`.
- Per-item delete button (`x` at 14px for allergens, `trash-2` at 16px otherwise).
- **System units are undeletable**: they show a lock badge with the `unit_default_unremovable` title instead of a delete button.
- Per-card **empty state** composed from `metadata_no_items_prefix` + title + `metadata_no_items_suffix`.

**Add flow (three guard layers)** — easy to lose:
1. *Registry guard* — the Hebrew label is compared against the translated labels already in that registry; a duplicate raises `הערך "X" כבר קיים ברשימה הזו.`
2. *English-key guard* — the app tries to resolve an existing English key (`resolveCategory` / `resolveAllergen` / `resolveUnit`). Only when nothing resolves does it open the **translation-key modal** to capture a Hebrew↔English pair, then writes it into the dictionary.
3. *Execution* — registers into the correct service, clears the input, and shows a success toast (`הנתונים נשמרו בהצלחה`) or an error toast (`שגיאה בסנכרון הנתונים`).

**Delete flow (usage guard)** — before deleting, the app scans real data for usage:
- unit → any product's `base_unit_` or any purchase option's `unit_symbol_`
- allergen → any product's `allergens_`
- category → any product's `categories_`
- label → any recipe's `labels_` **or** `autoLabels_`

If in use, deletion is **blocked** with a Hebrew message naming the item and where it is used (`במלאי` for product-scoped types, `במתכונים` for labels). Otherwise it deletes and toasts success/failure.

**Labels are special**: "Add" on the labels card opens the **label-creation modal** which returns a key, a **colour**, and **auto-trigger** rules; the dictionary is updated and the label registered with colour + triggers.

### 8.2 Menu types card
- "Add menu type" button (auth-gated) → `add-item-modal`.
- Per row, **display mode**: an editable text input holding the key (rename on blur; Enter blurs), a row of **removable field pills** (each pill click removes that dish field from the menu type), an edit (pencil) button and a delete button — all auth-gated.
- **Edit mode**: shows the key as static text plus a **checkbox per `ALL_DISH_FIELDS`** entry, with Save / Cancel.
- Empty state: `metadata_no_menu_types`.

### 8.3 Preparation-category manager (sub-card)
Add input + button; list rows where the label supports **double-click to rename** *and* a pencil button; rename commits on blur (Enter blurs), with `autofocus` on the inline input. Delete per row. Empty: `metadata_no_prep_categories`.

### 8.4 Section-category manager (sub-card)
Same shape as 8.3 but keyed on raw names rather than translation keys. Empty: `metadata_no_section_categories`.

### 8.5 User management (sub-card) — permission-gated
Four mutually exclusive states:
1. **Not admin** → lock icon + `גישה למנהלים בלבד` (admins only).
2. **Loading** → `טוען...`
3. **No users** → `אין משתמשים רשומים`
4. **List** → name + email per row with a delete button that is **disabled for your own account**, titled `לא ניתן למחוק את עצמך`.

### 8.6 Demo data card — **non-production only**
Rendered only when `!isProduction_`. "Load demo data" with a warning confirm (`load_demo_data_confirm`), then the overlay importing loader.

### 8.7 Backup & restore card
Three actions, each auth-gated and each behind its own warning confirm:
- **Export** → `backupService.exportAllToFile()` (no confirm).
- **Restore from backup** → confirm `backup_restore_confirm` → overlay loader.
- **Import** → a **hidden file input** (`accept=".json,application/json"`) triggered by the visible button; confirm `backup_import_confirm`; the input value is cleared both on cancel and after import.

---

## 9. Recipe book (`/recipe-book`)

List shell over `kitchenState.visibleRecipes_()`. Covers both dishes and preparations.

### 9.1 Columns and grid
Two grid templates depending on `hideDateColumn_()` (**currently hard-coded `true`** — the "date added" column and its sort are built but hidden; the signal comment says set it to false to show it again).
Columns: Name, Type (dish/preparation), carousel group (Labels, Allergens, [Date added], Rating), Cost, Actions, Select.

### 9.2 Sorting
Name, Type, Cost, Rating, Date-added (hidden) — all with click/Enter/Space and asc↔desc toggling. The Labels and Allergens headers **toggle expand-all** for that chip column instead of sorting.

### 9.3 Row cells
- **Labels cell**: count button with tag icon; expanding shows chips **coloured per label** (`getLabelColor`). Whole wrapper is keyboard-focusable and stops propagation so it doesn't trigger the row click.
- **Allergens cell**: count button with shield icon; expanded chips. Allergens are computed **recursively through sub-recipes** (`MAX_ALLERGEN_RECURSION` depth limit).
- **Rating cell**: `app-rating-stars`, **read-only when logged out**, writes on change.
- **Cost cell**: `₪` + 2-decimal cost from `RecipeCostService`. Has a **tooltip on hover *and* a separate tap-toggle for touch** — the tooltip is a fixed-position element anchored to the cell rect showing `price_for <yield description>`; tap-toggle closes on click-outside.
- **Date cell** (when un-hidden): hover tooltip showing `date_updated: <date + time>`.
- Both expand states reset automatically on every `NavigationEnd` back onto `/recipe-book`.

### 9.4 Row actions
Favourite (heart, filled when favourited by the current user, disabled logged out), **Cook** (→ `/cook/:id`, available logged out), Delete (only rendered when logged in; shows an inline loader while removing).

### 9.5 Row click behaviour (permission-dependent)
Clicking a row: ignored on buttons/links/cost cell/label wrapper/allergen wrapper/checkbox; toggles selection in selection mode; otherwise **navigates to the recipe builder when logged in, but to the cook view when logged out**.

### 9.6 Filters panel
- **Favourites-only toggle** — rendered **only when logged in**.
- **Ingredient search block**: a debounced (`INGREDIENT_SEARCH_DEBOUNCE_MS`) **server-side prefix search** (`productData.searchProducts`, min length + result limit, stale requests cancelled via `switchMap`), rendered in an `app-scrollable-dropdown` with a `no_ingredients_found` row. Selected products become removable chips plus a "clear" button. Recipes are then filtered to those containing **all** selected products, resolved **recursively through sub-recipes**.
- **Date filter category** (collapsible, count badge when a range is set): "Sort newest first" / "Sort oldest first" buttons, `date_from` / `date_to` native date inputs, and a **"also match by updated date"** checkbox that widens the range test to `created OR updated`.
- **Dynamic categories** built from the data: **Type**, **Allergens**, **Labels**, **Approved**, **Station**.
  - The Allergens category is relabelled **`do_not_include_allergens` and inverts its logic** — selecting allergens *excludes* recipes that contain them.
  - Labels adds a synthetic **`no_label`** option for unlabelled recipes.
  - Approved always renders **both** `approved_yes` / `approved_no` options even if the data has only one, so URL-driven filters show their selected state.
  - Station adds a synthetic **`no_station`** option.
- Categories with values are **auto-expanded via an effect**, so deep-links such as `?filters=Approved:false` (from the dashboard KPI card) land with the panel already open on the right group.

### 9.7 Selection / bulk
Select-all + per-row checkboxes, bulk delete (count confirm `למחוק N מתכונים?`), bulk edit on **Labels** (multi) and **Recipe type** (dish/preparation, single).

### 9.8 States
- **Empty database**: `app-empty-state` with `empty_recipe_book`, book-open icon, `add_first_recipe` CTA (disabled logged out).
- **Filtered-to-nothing**: `no_recipes_match`.
- Deleting: inline loader in place of the delete button.
- Logged-out: add button disabled, favourite disabled, delete hidden entirely, rating read-only, row click routes to cook.

### 9.9 Hero FAB
Registers a single action: `add_recipe_ai` (sparkles) → AI recipe modal.

### 9.10 Built but not currently reachable from the template
These exist in the component and work, but no control in `recipe-book-list.component.html` invokes them today:
- `openHistory()` / the **version-history overlay** (the overlay markup *is* in the template, driven by `historyFor_`, but nothing sets it)
- `onDuplicateRecipe()` (with `copy_of` prefix + forced `is_approved_ = false`) and `duplicatingId_`
- `onToggleApproval()`
- `onDeleteRecipe()` (a second delete path alongside the wired `onRemoveRecipe()`), `onHideRecipe()`, `onPermanentlyDeleteRecipe()` (with its own `מחיקה קבועה — לא ניתן לשחזר` confirm)
- `deletingId_`, `isAdmin_`
> Flagging these so the redesign decision is explicit: they are either dead code to drop or features whose entry points were already lost.

---

## 10. Recipe builder (`/recipe-builder`, `/recipe-builder/:id`)

The largest screen in the app. One form covers **two different entity shapes** — `preparation` and `dish` — and the whole page reshapes based on `recipe_type`.

### 10.1 Page-level modes
- **History view mode** — entered via query params `?view=history&entityType=recipe|dish&entityId=…&versionAt=…`. Loads that version snapshot, patches the form, **disables the entire form**, shows a `history_view_only_banner` with a "back to list" button, and **hides**: the add-row button, the logistics section, the save footer, and the approve stamp. Missing versions raise `גרסה לא נמצאה`.
- **New-dish mode** — `?type=dish` seeds `recipe_type: 'dish'`, `serving_portions: 1`, one yield conversion of `1 dish`, and one prep-item row.
- **AI draft mode** — `aiFlow_.applyPendingDraft()` can pre-fill a brand-new recipe from an AI draft handed over by the AI recipe modal.

### 10.2 Header block (`app-recipe-header`)
- **Image square**: click-to-upload (`accept="image/*"`) over a placeholder; camera prompt icon when empty; hover overlay; the file input is **removed entirely in readonly mode**.
- **Type toggle button** — flips dish ↔ preparation, with a `dish-mode` visual variant.
- **Recipe name input** — placeholder switches by type; async **duplicate-name validation across dishes *and* preparations combined** (300 ms debounce, excludes the record being edited so a type change isn't falsely blocked); error copy differs by type (`duplicate_dish_name` / `duplicate_recipe_name`); plus a required-field error.
- **Rating stars** (md size, readonly in history mode).
- **Scaling dock**:
  - A **primary scaling chip** (amount + unit + unit options + create-unit) with `minAmount` 1 for dishes, 0 for preparations.
  - A **yield-sync badge** (refresh icon) that appears in two different situations: for preparations when the manual yield differs from the computed total (`yield_sync_to_total`), and for dishes when portions were manually overridden and a saved value exists (`dish_reset_to_saved`).
  - A **plus button** to add secondary unit chips; each secondary chip has its own amount, unit options, create-unit and remove.
  - Field-level errors for `yield_amount` / `yield_unit`.
- **Labels**: `app-custom-multi-select` in chip variant, searchable, with **read-only auto-label chips** mixed in (`autoLabels`), an `__add_label__` option that opens the label-creation flow, and a clear-all that only clears *manual* labels.
- **Metrics square**: Cost (₪, 2dp) and a **weight/volume toggle** — clicking switches between bruto weight in g and volume (L when ≥1, otherwise ml). When some ingredients can't be converted, an **alert-circle notice icon** appears; clicking it opens a floating panel listing the unconvertible ingredient names with scroll indicators; it opens on hover-zone enter and closes on leave or click-outside.

### 10.3 Ingredients section ("ingredients_index")
Collapsible card — **collapse state persists in `localStorage` (`rb_col_ingredients`)**. Clicking a collapsed card expands it; the header, its chevron button, Enter and Space all toggle.

Table grid: drag handle · Ingredient · Unit · Quantity · Percent · Cost (+ hidden actions column header).

- **Drag-and-drop reordering** via CDK drop list with a custom placeholder and a `grip-vertical` handle.
- **Ingredient cell** has two modes: an inline **search component** while empty (or while re-editing) and a **selected-item display** otherwise. Clicking the name (or Enter) re-opens the search pre-filled with the current name.
- **Ingredient search** (`app-ingredient-search`): debounced search over products **and** recipes, results show a type pill (`recipe` / `product`), full keyboard support (arrow highlight, Enter, Tab, per-item keydown), an "add new" row with a custom image icon, `excludeNames` so already-used ingredients don't reappear, and a cancel path.
- **Four row states**, each with its own badge and click action:
  | State | Class | Badge | Click action |
  |---|---|---|---|
  | Blocking / invalid | `incomplete-row` | `alert-circle` + `fix` label, title `product_incomplete_hint` | opens the quick-edit panel at tier `invalid`, or re-opens search if no product resolved |
  | Warning / incomplete | `warning-row` | `alert-triangle`, title `product_warning_hint` | quick-edit at tier `incomplete` |
  | Unlinked | `unlinked-row` | `link` icon, title `unlinked_ingredient_hint`; the name renders as `⚠ unlinked_ingredient` | link-resolution flow |
  | Normal linked | — | pencil `edit-badge` | quick-edit at tier `incomplete` |
- **Nutrition badge** shown inline for product rows that have `nutrition_per_100g`.
- **Clear (×) button** resets the row to an empty ingredient with unit `gram`.
- **Unit select**: chip variant, type-to-filter, `__add_unit__` opens the unit creator (pre-seeded with the row's existing symbols), row-scoped focus directive.
- **Quantity**: minus / number input / plus. The minus button disables at ≤0. **ArrowUp / ArrowDown step the value** using `quantityIncrement`/`quantityDecrement` with unit-aware step sizes (integer-only steps when the row uses a purchase unit). **Enter adds a new ingredient row.** `SelectOnFocus` selects the value on focus.
- **Percent column**: each row's share of total weight.
- **Cost column**: `pending` text when the cost is still null, otherwise `₪` + 2dp; a `is-zero` class when zero.
- **Quick-edit accordion**: for desktop only (`!isMobile_()`), an inline `app-quick-edit-product-panel` expands under the row with the chosen tier, a closing animation, click-outside cancel, and an "open full edit" escape hatch that navigates to the product form.
- After picking an item the quantity input for that row is **auto-focused**.
- An "Add row" button under the table (hidden in history mode).

### 10.4 Workflow section — **two completely different tables**
Collapsible, persisted in `localStorage` (`rb_col_workflow`). Title switches: `prep_list_mise_en_place` (dish) vs `prep_workflow` (preparation).

**Preparation variant — numbered cooking steps:**
- Columns: drag · `#` · Instruction · Labor time · actions.
- Drag-and-drop reordering; auto-numbered step badge.
- **Auto-growing textarea** (`textareaAutoGrow`) with `SelectOnFocus`; **Enter inside the instruction adds the next step**.
- **Two independent timers per step**, each behind its own toggle button with `timer-active` / `timer-has-value` styling:
  - clock icon → **labor time** (minutes, `m:ss` clock format, described in code as admin analytics)
  - timer icon → **cooking time** (seconds, `hh:mm:ss` format)
  Each opens a row with −/+ counter buttons and a **click-to-edit text field** that accepts a typed clock string and commits on blur or Enter.
- Delete step button; "Add prep stage" button.

**Dish variant — flat mise-en-place list:**
- Columns: drag · Preparation · Preparation category · Quantity · Unit · actions.
- **Preparation search** (`app-preparation-search`): results **grouped by category** with category headers and per-result category pills, scoped by the row's selected category, plus an "add" option that creates the preparation directly.
- Selected preparation displays as a chip with a clear (×) button; clicking the name (or Enter/Space) re-opens the search pre-filled.
- Category select with `__add_new__`; quantity `app-counter`; unit select with `__add_unit__`.
- Delete row; "Add preparation" button.

### 10.5 Logistics section (hidden in history mode)
Collapsible, persisted in `localStorage` (`rb_col_logistics`).
- **Tool search input** with its own dropdown: arrow-key highlighting, Enter to select, an always-present **"add new tool"** row (with the custom add image) that opens the add-equipment modal.
- **Quantity `app-counter`** (min 1, integer only).
- **Add button**, disabled until a tool is selected or something is typed.
- Added tools render as **removable chips** showing name × quantity. Chips for tools that couldn't be resolved to an equipment record get a `logistics-chip--unresolved` class and fall back to the free-text name.
- Dropdown closes on click-outside; the highlighted item is scrolled into view.

### 10.6 Export toolbar (opened from the hero FAB)
`app-export-toolbar-overlay` with **five entries, each a two-step "View / Export" split**:
1. `export_recipe_info` (table icon)
2. `export_shopping_list` (cart icon)
3. `export_cooking_steps` (clipboard) — **preparation only**
4. `export_checklist` (clipboard) — **dish only**
5. `export_all_together` (package icon)
Plus a direct **Print** button (`window.print()`).

Each entry opens a small popover with **View** (eye) and **Export** (download). "View" renders `app-export-preview` with the built payload, which itself offers Export and Print buttons and a close action. Export quantity is derived from the form: `serving_portions` for dishes, first yield conversion amount for preparations, minimum 1.
All export overlays are force-closed on `ngOnDestroy` and on any `NavigationStart` that leaves `/recipe-builder`.

### 10.7 Save flow — five sequential gates
1. **Async-validation race guard**: if the form is `PENDING`, save is refused with `validating_please_wait`.
2. **Form validity**: on failure, marks all touched and shows a **composed Hebrew error string** built by `getRecipeValidationError_()` — it enumerates every problem (duplicate name, missing name, no ingredients at all, per-ingredient missing/zero quantity naming each ingredient, missing/invalid dish portions, and for dishes per-preparation missing quantity or unit), joined as `חסרים: a; b; c`.
3. **Blocking ingredient rows**: sets `blockingIngredientsError_`, shows the inline `blocking_ingredients_error` paragraph in the footer, and **smooth-scrolls the first `.incomplete-row` into view**.
4. **Unlinked ingredients confirm**: `save_with_unlinked_ingredients` / `save_anyway`.
5. **Neto / portions confirm**: when the yield was manually overridden and not yet confirmed — different message and header for dishes (`dish_portions_confirm_*`) vs preparations (`neto_confirm_*`).
6. **Type-change confirm** (edit only): switching dish ↔ preparation raises a warning confirm with type-specific header/message.

On success: auto-labels are recomputed and stored; if navigating, the form resets and the user goes to `/recipe-book`; if saving in place (approve-stamp path), the new `_id` is adopted, the dirty snapshot and initial type are refreshed, `savedPortions_` updates, and an `approval_success` / `unapproval_success` toast fires.

### 10.8 Approve stamp
`app-approve-stamp` floating control (hidden in history mode, disabled while saving). Toggling it when there are **unsaved changes** first asks `approve_stamp_unsaved_confirm` / `save_changes`; on an existing recipe it saves in place afterwards; on a brand-new recipe it just flips the local flag.

### 10.9 Hero FAB actions
`ai_recipe_edit` (sparkles) → AI edit modal; `export` (printer) → opens the export toolbar (deferred a tick so the opening click isn't read as click-outside); and, only when editing an existing recipe, `cook_view` (cooking-pot) → `/cook/:id`.

### 10.10 Dirty tracking
`hasRealChanges()` diffs a normalised snapshot. The **initial snapshot is captured in `afterNextRender`**, deliberately after child effects (the header auto-syncing yield from ingredient metrics) have run — otherwise the guard fires false positives. `saveAndWait()` is the `pendingChangesGuard` hook. `isSubmitted` is reset in `ngOnInit` because Angular reuses the component instance across `recipe-builder/:id` navigations; the same reuse is why the recipe-type revalidation subscription is explicitly torn down and re-created.

---

## 11. Menu library (`/menu-library`)

**Not** built on the list shell — this one is a **card grid**, `dir="rtl"`.

- **Action bar**: title, search input, "New event" primary button. Note: unlike every other list, the create button here is **not** auth-gated.
- **Filters bar** (inline, always visible — no collapsible panel): Event type select, Serving style select, a **"date from" single date input** wrapped in a click/Enter/Space target that opens the native picker, and a **sort select + sort-order toggle button** whose label reflects the current direction.
- URL state via `useListState('menu-library', …)`.
- **Event card** (clickable, Enter/Space activated):
  - Title = event name; subtitle = `event_type · event_date` with a `menu_no_date` fallback.
  - Three tags: **Food cost %**, **Total revenue** (value wrapped `dir="ltr"`), **Guests** (also `dir="ltr"`).
  - Actions row (propagation stopped): Edit (pencil), **Clone** (copy icon, per-card loader while cloning), Delete (per-card loader while deleting) — all three disabled when logged out.
- **Empty state**: book-open icon at 48px + `menu_empty_library`. There is **no separate "no results" state** — the same empty state covers both an empty library and a filtered-to-nothing list.
- Helper displays exist for section count and dish count (`getSectionCount`, `getDishCount`) but are **not rendered on the card** today.

---

## 12. Menu intelligence — menu editor (`/menu-intelligence`, `/menu-intelligence/:id`)

A "printed menu paper" metaphor: a pill toolbar on top, a paper sheet in the middle, and a fixed financial bar at the bottom. Heavy keyboard-driven authoring.

### 12.1 Pill toolbar (`.no-print`)
- **🛒 Shopping** — popover with View / Export.
- **📋 Checklist** — a dropdown with **three groupings**, each with its own View and Export icon buttons: `by_dish`, `by_category`, `by_station`.
- **🖨 Print** (hard-coded Hebrew label `הדפסה`).
- **📦 All** — popover with View / Export.
- **Save pill** — disabled while saving, swaps label to `saving` with an inline loader.
All popovers close on click-outside, and every export overlay is force-closed on destroy or on navigation away from `/menu-intelligence`.

### 12.2 The paper
- Ornaments top and bottom, an `✦` divider under the meta block, and `✦` dividers between sections.
- **Event-type chip**: renders as plain text until clicked, then swaps to a **search input + dropdown** with arrow-key highlighting and an "add new event type" row (custom add image icon) that opens the add-item modal.
- **Serving-type select** next to it, separated by a `·`.
- **Menu title input** styled as the menu heading (Hebrew placeholder `שם האירוע...`).
- **Meta line**: a guests number input inside a chip, `·`, then a **date chip** that shows a formatted date (or `menu_no_date`) and hides a native date input behind it.

### 12.3 Keyboard authoring model (a major, easy-to-lose feature)
- A **field focus order** (`FOCUS_ORDER`: `name_` → `event_type_` → `serving_type_` → `guest_count_` → `event_date_` → `section_0`). Enter / Tab / ArrowDown move forward, ArrowUp moves back; landing on `section_0` auto-opens the first section's category search and focuses it.
- On `event_type_`, Enter / Tab / ArrowDown / **Space** all open the dropdown instead of moving on.
- **Date field digit capture**: typing digits into the date chip fills a buffer as `DDMMYYYY`; at 8 digits it clamps day 1–31, month 1–12, year 1900–2100 and patches an ISO date. Backspace pops the buffer.
- A **document-level keydown listener in capture phase** intercepts ArrowDown / ArrowUp / Enter and routes them to whichever managed dropdown is open (event type, section category, dish search) — with an explicit bail-out when the user is typing in a text field that is *not* inside one of those dropdowns.
- Menu name is **auto-focused** on view init.
- Highlighted dropdown items are scrolled into view.

### 12.4 Sections
- Section title renders as **plain text** until clicked, then becomes a **search input with dropdown** over section categories, with highlight index, **two different "add" rows** (add the typed value directly, and open the full add-category modal), and click-outside close.
- Section remove button (`.no-print`).
- "+ Add dish" per section and "+ Add section" at the bottom (both `.no-print`).

### 12.5 Dish rows (`app-menu-dish-row`)
- **Unselected**: a dish search input with a dropdown of matching recipes, a `no_recipes_match` empty row, and click-outside clearing.
- **Selected**: dish name as a button (click re-opens the search), an **info/chevron toggle** for the metadata block, a **sell-price input** with a ₪ prefix and **auto-sizing width based on the value**, and a remove button.
- **Metadata block** (expanded): renders **only the fields the active menu type declares** (`activeMenuTypeFields_`) — this is the dashboard's "menu types" configuration driving the editor. Each field is a click-to-edit inline number input (auto-width, `SelectOnFocus`, commit on blur or Enter) unless it is read-only. `food_cost_money` is always computed. A permanent read-only row shows **food cost per portion**.
- Dedicated keydown handlers for the sell-price and for each dish field enable arrow/enter navigation between rows and fields.

### 12.6 Financial footnote (fixed bar, `.no-print`)
Four live metrics: **Total cost** (₪, 2dp), **Food cost %** (shows `—` until there is revenue; turns `fin-value--warning` above 33%), **Total revenue**, **Cost per guest**.

### 12.7 Save
- Invalid form → mark all touched + `Please fill all required fields`.
- **Auto-naming**: an empty menu name is replaced by today's date `d/m/yyyy`, de-duplicated as `d/m/yyyy (1)`, `(2)`, … against existing menu names.
- Derived portions are hydrated before persisting; create vs update by `editingId_`; success toast then navigate to `/menu-library`.
- `hasRealChanges()` compares against `savedSnapshot_` for the pending-changes guard.

### 12.8 Hero FAB
`ai_menu_open` (sparkles) → AI menu modal; `menu_toolbar_open` (printer) → opens the toolbar. The FAB also gets an `above-bar` position on this route so it clears the financial bar.

---

## 13. Cook view (`/cook`, `/cook/:id`)

Kitchen-facing "focus mode". Publicly accessible — **no authGuard**.

### 13.1 Empty state (`/cook` with no recipe)
Utensils icon at 48px, `pick_recipe_to_cook`, a primary link to the recipe book, and — when there is history — a **"recent recipes" chip row** linking to `/cook/:id`.
> Edge: the recent chips currently render the **raw recipe id** as the chip label, not the recipe name.
> Edge: landing on `/cook` with a stored `lastRecipeId` **auto-redirects** to that recipe.

### 13.2 Header bar
Recipe name, rating stars (read-only when logged out), scaled cost (₪, 0dp, only when > 0), and a `✓ מאושר` approved badge.
Actions: **Edit** (auth-gated) or, in edit mode, **Save changes** / **Undo changes**.
**Export bar**: a main "Export" button that expands a strip of label + View + Download triples — Recipe info, Shopping list, and then either **Checklist** (dish) or **Cooking steps** (preparation). Collapses on mouse-leave.

### 13.3 Scale bar
- **Multiplier chips** (a fixed `multiplierChips` list) with an active/pressed state — hidden in edit mode.
- **"Make quantity"** counter with unit-aware steps, plus a **yield-unit select** (choosing "new unit" opens the unit creator).
- A **conversion badge** `×factor` appears whenever the selected unit differs from the recipe's stored yield unit.
- The whole scale bar is **hidden while in scaled-by-ingredient view**.

### 13.4 Scale-by-ingredient (distinctive)
Any ingredient row has a **scale button**. Pressing it turns the row into an inline amount input with **Convert** and **Cancel**. Confirming rescales the entire recipe so that ingredient hits the entered amount, and the page enters **scaled view**: a banner reads `scaled_to <amount> <unit> <name>` with a **"back to full recipe"** button.

### 13.5 Phone pane swap
A two-button bar (`🧪 Ingredients` / `⏱ Steps`) that reorders the two panes via CSS `order`, so either pane can be first on a phone.

### 13.6 Ingredient pane
- Header with flask icon, a **progress badge** `done/total` that switches to `all_ingredients_ready` when complete, and a **progress fill bar**.
- **View mode**: each row is a `role="checkbox"` line — check circle, name (unlinked ingredients render *italic and dimmed*), amount through `formatQuantity`, and a **per-row unit override select** (only rendered when the row has more than one available unit; otherwise plain text). Clicking the row toggles checked.
- **Edit mode**: a proper ingredient table with name / −-input-+ amount / unit select + remove button. Changed rows get a `field-changed` class. Arrow keys step the amount with unit-aware sizes.
- Scroll indicator chevrons top and bottom.

### 13.7 Step pane
- Header with timer icon and a `done/total` counter.
- **Edit mode** reuses the shared `app-recipe-workflow` editor (including a `sortByCategory` output that the recipe builder doesn't wire up).
- **View mode — dish**: prep items as cards in three visual states — **active** (green head, `פעיל עכשיו` label, "mark step done" button), **done** (✓, done label, an `↩` chip to un-do), **pending**. Empty: `no_preparations_defined`.
- **View mode — preparation**: instruction step cards in the same three states, plus per-step tools on the active card:
  - **Countdown timer** — rendered **only when the step has a configured `cooking_time_secs_`**; shows a live `timerDisplay_`, pauses/cancels on click. When it finishes, a **timer-alert pill** (`timer_done ✕`) sticks to that step card (visible on both done and pending cards) until dismissed.
  - **Stopwatch** — startable on any active step, with play/pause toggling; a running stopwatch keeps showing as a pill on that card even after the step is marked done or while it is pending.
  - Empty: `no_steps_defined`.
- **Tap a pending step card** to make it active.
- **`markStepDone` advances intelligently**: it looks for the next undone step *after* the current one, then wraps around to look *before* it, and scrolls the newly active step into view; if everything is done it scrolls back to the first.
- **Completion banner**: `🎉 cooking_complete` when every step is done.

### 13.8 Edit mode
Entering edit mode swaps both panes to editors. Save persists; **Undo** reverts. `hasRealChanges()` backs the `pendingChangesGuard` on `/cook/:id`.

### 13.9 Approve stamp
The same `app-approve-stamp` as the recipe builder, wired to the recipe's approval state.

### 13.10 Lifecycle
Loading a recipe resets active step, done set, checked ingredients, peek state, cancels any timer, sets the selected unit from the recipe and the target quantity from `yield_amount_`, and records the recipe as last-viewed. All intervals and timeouts are cleared on destroy.

---

## 14. Shared components (reused across pages)

### 14.1 `app-list-shell` — the list chrome used by Inventory, Equipment, Suppliers, Venues, Recipe Book
Content-projection slots: `shell-back-btn`, `shell-title`, `shell-search`, `shell-actions`, `shell-selection-bar`, `shell-table-header`, `shell-table-body`, `shell-filters`.
- Configurable **desktop and mobile CSS grid templates**, and an optional `dir`.
- **Filter panel**: collapsible aside with a hamburger open button (shown only when closed), a `circle-x` close button (shown only when open), a **backdrop that closes it on click**, and **touch swipe handlers** (`onPanelTouchStart` / `onPanelTouchEnd`) so it can be swiped closed on mobile.
- Panel open/closed state is owned by each page via `useResponsivePanelState(context)` — a **per-list, responsive, persisted preference**.

### 14.2 `app-selection-bar` — bulk actions
Renders only in selection mode, with a slide-in/out animation. Shows selected count + `items_selected`, a Clear button, a Delete button, and — when the page supplies `editableFields` — a **two-step bulk-edit flow**: first a "change field" select, then a value select for that field (with optional add-new and type-to-filter), plus a cancel that returns to step one.

### 14.3 `app-list-row-checkbox` / `ListSelectionState`
Checkbox rendered as a keyboard-activatable div (Enter/Space). The shared state object provides `selectionMode()`, `selectedIds()`, `toggle`, `toggleSelectAll`, `allSelected`, `isSelected`, `clear`. Selection mode is what makes row clicks toggle instead of navigate across every list.

### 14.4 `app-carousel-header` + `app-cell-carousel` — the responsive column carousel
On narrow screens several table columns collapse into one swipeable slot. The header shows the current column's label plus prev/next chevron arrows; each row's cell carousel responds to **touch swipe** and mirrors the header's active index. This is the app's core responsive-table strategy and appears on five lists.

### 14.5 `app-row-actions-menu`
Collapses per-row action buttons behind a `more-vertical` trigger on small screens, with a **backdrop** and a **fixed-position popover whose coordinates are computed from the trigger's rect** (bottom / left / min-height).

### 14.6 `app-empty-state`
Icon (48px) + translated message + optional CTA button with a `ctaDisabled` input — the pattern used for logged-out CTAs. Used by Inventory, Suppliers and Recipe Book only.

### 14.7 `app-loader`
A hand-drawn **cooking-pot SVG with three animated steam wisps**. Sizes small / medium / large, `inline` and `overlay` modes, and an optional translated label (suppressed at `small`). Used everywhere: route loading, saving buttons, per-row deletes, imports.

### 14.8 `app-confirm-modal` + `ConfirmModalService`
A single global confirm. Supports: optional header key, message key, `danger` / `warning` variants that restyle the card and the confirm button, a configurable confirm label, and **an optional third "save" button** — which is what lets the pending-changes flow offer *Cancel / Save / Discard* in one dialog. Overlay click cancels. Returns a promise.

### 14.9 `app-auth-modal`
Tabbed **Sign in / Sign up** in one card.
- Sign in: username + password.
- Sign up adds: email, confirm password, and a **profile image upload** with preview, a spinner state while uploading, and a soft `image_upload_failed` warning that doesn't block signup.
- **Password visibility toggles** (eye / eye-off) on both password fields.
- Per-field blur validation with a **large enumerated error-key set** rendered inline: `name_required`, `username_taken`, `username_too_short`, `username_too_long`, `username_invalid_chars`, `user_not_found`, `account_locked`, `rate_limited`, `server_error`, `email_required`, `email_invalid`, `email_taken`, `password_required`, `password_too_short`, `password_needs_letter_and_number`, `password_matches_username`, `password_contains_email`, `passwords_do_not_match`.
- Typing in any field clears the current error.
- **Dev-only "Guest (Dev)" button** (`@if (isDev)`) that logs in as a guest.
- Submit disabled while submitting or uploading; label swaps to `saving`.

### 14.10 `user-msg` — global toast
Type-classed toast (success / error / …), click-to-dismiss, and an optional **Undo button** carrying an undo callback.

### 14.11 `app-version-history-panel`
Loading / error / empty (`history_no_versions`) / list states. Each version row shows its timestamp, a change-count summary, and **View version** and **Restore** actions. Supports an injected `recoverBeforeRestore` hook (used by Trash). Restoring routes through the **restore-choice modal**.

### 14.12 `app-restore-choice-modal`
Three-way choice on restoring a version: Cancel / **Add as new** / **Replace** (the replace button is visually distinct).

### 14.13 `app-global-specific-modal`
Three-way choice when a preparation's category changes: Cancel / **Add as specific** / **Change globally**, with the preparation name and `old → new` category shown.

### 14.14 `app-export-preview`
A full-screen "paper" preview dialog with ornaments, a title/subtitle, and **two distinct layouts**: a structured *recipe sheet* (date + name header, yield block, ingredient tables, preparation instructions, prep time) or a generic *sections* layout (exported-at line + section tables with optional header rows). Optional summary rows at the bottom. Footer: Close / Print / **Export to Excel**. Overlay click closes.

### 14.15 `app-export-toolbar-overlay`
Glass toolbar host used by the recipe builder; emits a close request on outside interaction.

### 14.16 `app-quick-edit-product-panel`
Inline mini-form for fixing a product without leaving the recipe builder: name, base unit, buy price, category, and **supplier checkboxes** (with a `no_suppliers` empty state). A `tier` input (`invalid` / `incomplete`) **highlights the specific field that needs attention**. Enter chains focus name → price → save. Has its own **in-panel unsaved-changes overlay** offering "leave without saving" vs "save". Also offers `edit →` to jump to the full product form. Emits saved / cancelled / openFullEdit.

### 14.17 `app-quick-add-product-modal`
Fast product creation with a **sparkles AI-fill button** next to the name (disabled until a name is typed, spinner while loading, `ai_product_error` on failure), a base-unit select with add-new, price, and Enter-driven focus advancement between fields. Escape closes.

### 14.18 AI modals (recipe / menu / product) — shared shape
All three share: overlay + close X, a **Gemini usage bar showing `count / 1,000` with a colour status**, a prompt textarea (`dir="auto"`), a status bar with sending / done / error states and a translated error key, and a **generate → preview → apply** two-phase flow with "generate again".
- **`app-ai-recipe-modal`** is the richest: create mode has **three input modes as tabs — text, image upload (with preview), and URL** — each with a clear-input button and mode-specific enable rules for the generate button; edit mode sends a free-text instruction and previews the result as a **checklist of patch summary lines**. Create mode can also require an explicit **warning confirmation** before accepting a draft, and renders an editable **`app-ai-draft-editor`** so the user can adjust the AI output before saving. It also has a scroll-indicator-wrapped textarea.
- **`app-ai-menu-modal`** and **`app-ai-product-modal`** preview patches as a **before → after diff list**, with an `אין שינויים זוהו` empty case. The product modal's create mode renders an editable draft before applying.

### 14.19 `app-unit-creator-modal`
Creates a unit as a formula: **name `=` amount `<basis unit>`**. Enter/Tab chain focus name → amount → basis-unit select. Shows an inline error region and a **live net-cost preview** (`₪ netUnitCost × amount`) when a cost context exists. Save disabled until name, positive amount and basis unit are all present. Exposes a `unitAdded$` stream that callers (the product form, ingredient rows) subscribe to in order to patch themselves.

### 14.20 `app-translation-key-modal`
Captures a **Hebrew label ↔ English key** pair. Context-aware (`category` / `allergen` / `unit` / `generic`) — the title, first-field label, placeholder and save label all change. In `generic` context it adds a hint line and a **"continue without saving"** escape. Inline validation error on the key. Enter saves.

### 14.21 `app-label-creation-modal`
Hebrew label + English key + a **colour swatch palette** (selected swatch shows a ✓) + a **checklist of auto-trigger sources** (built from existing categories/allergens; empty-state text when there are none).

### 14.22 `add-item-modal`
Generic single-field modal configured with title / label / placeholder / save label; Enter saves; save disabled while empty.

### 14.23 `add-equipment-modal`
Name + category select (with add-new); Enter saves.

### 14.24 `app-supplier-modal`
Add-only wrapper that renders `app-supplier-form` in its embedded (modal) layout. Editing suppliers is deliberately inline in the list, not here.

### 14.25 `app-chip-search-dropdown`
The multi-select used for categories, allergens and suppliers: selected values as removable chips inline with the search input, a filtered dropdown with **keyboard highlight navigation**, an always-or-conditionally shown **"add new"** row with a custom image icon, a configurable `noOptionsLabel`, a `displayFn` for label resolution, and a configurable chip class.

### 14.26 `app-custom-select` / `app-custom-multi-select`
The app's select primitives. Support `typeToFilter`, `addNewValue` (an option that triggers a creation flow), `translateLabels`, `compact`, `chip` variant, `maxHeight`, `triggerId`, `clearable` + `cleared` output, and `readonlyChips` (used for auto-labels). They are `ControlValueAccessor`s so they work with both reactive forms and `ngModel`.

### 14.27 `app-scrollable-dropdown`
Shared dropdown container with a `maxHeight` and scroll affordances; used by every search dropdown in the app.

### 14.28 `app-counter`
Number stepper with −/+ buttons, an **auto-width input sized by a mirror span**, press-and-hold repeat on mouse-down, unit-aware step sizes (`integerOnly` → 1, unit-specific → 0.01, otherwise 0.001), min/max disabling, and Enter handling.

### 14.29 `app-scaling-chip`
A unit select + counter fused into one chip, in `primary` and `secondary` variants, with an optional remove button and a `createUnit` output.

### 14.30 `app-rating-stars`
Half-star aware (`full` / `half` / `empty` per star), hover preview with mouse-leave reset, `readonly` mode disabling every star, and `sm` / `md` size classes.

### 14.31 `app-nutrition-badge`
A leaf icon coloured by the dominant macro. Hover **or click** opens a rich tooltip: a "100 גר׳" header, a **stacked macro bar**, a four-macro icon legend with percentages (including a **custom hand-drawn "FAT" droplet SVG**), a divider, per-nutrient rows with icons, values and Hebrew units (`קק"ל`, `מג`, g), and an `Open Food Facts · per 100g` attribution note. Flips above/below the anchor as space allows.

### 14.32 `app-approve-stamp`
An **image-based rubber stamp** toggle (two artwork files: approved / not approved), with `stamped` and `disabled` classes and translated aria-label/title (`approve_recipe` / `unapprove_recipe`).

### 14.33 `app-change-popover` + `app-floating-info-container`
Fixed-position popover anchored by explicit top/left, closing on click-outside, showing a change's label and `from → to` values. The floating container is the shared glass surface (with a `scrollAxis` input) used by popovers.

---

## 15. Cross-cutting mechanics (behaviour that isn't owned by any one screen)

| Mechanic | Where it lives | What it does |
|---|---|---|
| **Hebrew RTL** | `dir="rtl"` set explicitly on nearly every page/modal root; logical CSS properties throughout | Back arrows use `arrow-right`; collapse chevrons use `chevron-left` for "closed"; numeric values are sometimes force-wrapped in `dir="ltr"` (menu-library tags) |
| **Translation** | `TranslationService` + `translatePipe` + `dictionary.json` | Every user-visible string is a key. Values entered by users get a Hebrew↔English key registered through the translation-key modal |
| **URL-synced list state** | `list-state.util.ts` (`useListState`) with `StringParam`, `NullableStringParam`, `BooleanParam`, `NullableBooleanParam`, `FilterRecordParam`, `StringArrayParam`, `StringSetParam` | Search, sort, order and filters live in the query string on Inventory, Equipment, Suppliers, Venues, Recipe Book and Menu Library — so list views are linkable and the dashboard KPI cards can deep-link into pre-filtered lists |
| **Panel preference** | `panel-preference.util.ts` (`useResponsivePanelState`) | Per-list filter-panel open state, responsive default + persistence |
| **Unsaved-changes guard** | `pendingChangesGuard` + each page's `hasRealChanges()` / `saveAndWait()` | Snapshot-diff based (not just `form.dirty`), and the confirm dialog can **save from within the guard** |
| **Auth gating** | `authGuard`, `RequireAuthService.requireAuth()`, and `isLoggedIn()` in templates | Three distinct patterns coexist: route blocked, action opens the auth modal, or control rendered **disabled with a `sign_in_to_use` title**. Some controls are hidden entirely when logged out (recipe-book delete) |
| **Saving state** | `saving-state.util.ts` | Drives every `isSaving_()` spinner and disabled submit |
| **Activity log** | `ActivityLogService` (localStorage-backed) | Feeds the dashboard recent-activity list with per-field `from → to` changes |
| **Version history** | `VersionHistoryService` | Snapshots per entity; surfaced in Trash and (markup-only) in Recipe Book; the recipe builder can render a read-only historical version |
| **Soft delete / trash** | `TrashService` | Deletes are recoverable; permanent disposal is a separate, danger-variant action |
| **Auto-labels** | `recipeFormService_.computeAutoLabels()` + label auto-triggers | Labels can be derived from categories/allergens and render as **read-only chips** the user can't remove manually |
| **Unit registry & conversions** | `UnitRegistryService`, `ConversionService`, `quantity-step.util.ts` | Unit-aware increment/decrement step sizes, conversion ratios, and a global "create a unit mid-flow" affordance available from ~6 different places |
| **Directives** | `clickOutside`, `SelectOnFocus`, `focusByRow`, `textareaAutoGrow`, `scrollIndicators` | Click-outside closing is used pervasively; `scrollIndicators` adds the chevron/fade scroll affordances seen on the dashboard activity list, cook-view panes, AI textareas and the metrics notice |
| **Pipes** | `translatePipe`, `formatQuantity` | `formatQuantity` renders cook-view and export amounts |
| **Gemini proxying** | `server/routes/ai.js` via `GeminiService` | All AI calls are server-proxied; the per-day usage counter (`/1,000`) is shown in all three AI modals |
| **Global error handling** | `global-error.handler.ts`, `LoggingService` | Errors are logged with structured events and surfaced as toasts |

---

## 16. Quick index of every distinct screen state

For the gap analysis, these are the states a redesign has to account for:

- **Route loading** (global overlay loader) and **data reloading** (same overlay)
- **Per-page loading** (trash), **per-row loading** (deleting, saving price, cloning), **per-button loading** (saving)
- **Empty database** — Inventory, Suppliers, Recipe Book (rich empty state with CTA); Menu Library (icon + copy, no CTA); Cook view (icon + copy + CTA + recent chips); Trash (per-section copy); Metadata cards (per-card copy); Equipment/Venues (**none — only the no-match message**)
- **Filtered-to-nothing** — a *separate* message from empty database on Inventory, Suppliers, Recipe Book, Equipment, Venues; **absent** on Menu Library
- **Error** — Trash load error with retry, version-history panel error, AI modal error with retry, auth field errors, form validation errors (field-level + composed global toast)
- **Permission-gated** — route-blocked, disabled-with-tooltip, hidden-entirely, admin-only (user management), dev-only (guest login, demo data)
- **Read-only** — recipe-builder history view, cook-view rating when logged out, recipe-book rating when logged out, locked system units
- **Selection mode** — changes row-click semantics on five lists
- **Scaled view** — cook view when scaled by an ingredient
- **Edit mode** — cook view; inline-edit panels on Equipment and Suppliers
- **Collapsed/expanded** — three recipe-builder sections (persisted), filter panels (persisted), collapsible product-form fields, expandable chip cells, dish metadata blocks
- **Mobile-specific** — bottom tab bar, mobile drawer, mobile avatar FAB, column carousels, phone pane swap, row action menus, touch-swipe filter panel, tap-toggle tooltips (cost cell), quick-edit accordion suppressed on mobile

