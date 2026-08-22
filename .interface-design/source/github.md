repo: WDD-CODER/foodVibe1.0
branch: main
path: src/app/pages/inventory, public/assets/data (reference)

## Last sync
date: 2026-08-19T00:00:00Z

### Updated in this project (latest)
- Mobile card system (≤767px only, desktop/tablet CSS untouched): Inventory, Recipe Book, Suppliers and Equipment rows became fixed-layout cards — name top line, price/cost beside it, checkbox top-left, parameters evenly spread with centred headers over fixed-height value bands, delete bottom-left / edit bottom-right
- Checkbox footprint cut from 44px to 26px app-wide via one rule in mobile-pass.css; chip-internal micro buttons (metadata colour dots, pill closes, count badges) exempted from the 44px floor
- Dashboard: sub-nav chips became a snapping scroll carousel with edge fade; KPI cards halved in height (label right, number left, footer below)
- Recipe Builder ingredients: three-row layout (name + delete top-left, cost + percentage, unit + quantity); Trash action buttons squared and centred; Venues photo inset inside the card radius
- Menu Intelligence deliberately excluded from the mobile pass (keeping the earlier design)

### Screen map (this sync)
| Screen | Repo source |
|---|---|
| mobile-pass.css, shell.js + 12 screens | src/styles.scss (tokens, .c-glass-* engine); src/app/core/components/header/** |

### Prior sync
date: 2026-08-17T00:00:00Z

### Updated in this project (latest)
- Standardized the checkbox/radio pattern app-wide (24px, glass border, teal fill, white check, press scale 0.97, teal focus ring) after approving it on Suppliers — applied to all 13 screens
- Filter panels moved to tablet-only rules (768–1023px): full-width single-line groups with space-between spread; desktop reverted to the 250px sidebar
- All list headers share one baseline (align-items: center + fixed line-height); column values centred under their headers on every screen
- Food Composer seal logo locked and adopted: assets/fc-mark.svg, fc-seal.svg, fc-mark-kitchen.svg, fc-seal-ink.svg, fc-favicon.svg, embedded in shell.js and Brand Assets.dc.html

### Screen map (this sync)
| Screen | Repo source |
|---|---|
| All 13 screens + shell.js | src/styles.scss (.c-glass-* engine, tokens); src/app/core/components/header/** |

### Prior sync
date: 2026-08-14T00:00:00Z

### Updated in this project
- Built shell.js from core/components/header + hero-fab: one <app-shell> web component (4-tab nav, chip rows, mobile bottom tab bar, hero FAB with the repo's flame/rotate/page-action logic, Lucide, focus rings, reduced motion, dark Kitchen theme)
- Converted all 13 screens onto the shell; breakpoints collapsed from 9 values to 479/767/1023; 44px touch minimums; Cook View promoted to Kitchen mode with 56px controls
- Brand replaced: the design system raster (assets/food-compos-logo.png) is no longer referenced — the app now uses the new Food Composer seal drawn in-project as assets/fc-seal.svg, fc-mark.svg, fc-mark-kitchen.svg, fc-seal-ink.svg, fc-favicon.svg, served by shell.js
- States pass: loading / empty / error on all 13 screens with a viewState tweak per screen; motion system + 24px checkboxes; Kitchen mode states covered
- Inventory gained a loading skeleton + required-field error as the reference state pattern; v1 copies of every screen kept in v1/

### Screen map (this sync)
| Screen | Repo source |
|---|---|
| shell.js | src/app/core/components/header/**, src/app/core/components/hero-fab/**, src/app/core/services/hero-fab.service.ts |

### Prior sync
date: 2026-08-13T19:55:54Z

### Updated in this project (latest)
- Read core/components/hero-fab/** and core/services/hero-fab.service.ts to recreate the real hero FAB logic (flame toggle, 45° rotate, per-page registered actions, always-present chef-hat shortcut, above-bar variant on menu-intelligence)
- Built "Hero FAB options.dc.html": three interactive skins of that FAB for selection
- Built "Refactor Master Plan.dc.html": measured audit of all 13 screens at 390/768/1440 + 5-pass execution plan + validation list

### Screen map (this sync)
| Screen | Repo source |
|---|---|
| Hero FAB options.dc.html | src/app/core/components/hero-fab/hero-fab.component.html, .scss, .ts; src/app/core/services/hero-fab.service.ts |

### Prior sync
date: 2026-08-12T14:40:00Z

- Built Trash.dc.html: dishes/recipes/products sections, per-item restore & permanent delete, restore-all/dispose-all per section, version-history modal, warning/danger confirm dialogs
- Added "אשפה" nav link to all existing pages

## Screen map (latest)
| Screen | Repo source |
|---|---|
| Trash.dc.html | src/app/pages/trash/trash.page.html, .ts, .scss |

### Prior sync
date: 2026-08-12T06:22:00Z

- Built MetadataManager.dc.html (card grid: categories, allergens, units, event types, serving styles, labels — add/rename/delete, lock badge on system units, color-cycle on labels)
- Added "מטא-דאטה" nav link to all existing pages
- Built MenuLibrary.dc.html (menu event library: search, filters, sort, clone/delete)
- Added "ספריית תפריטים" nav link to all existing pages

## Screen map
| Screen | Repo source |
|---|---|
| MetadataManager.dc.html | src/app/pages/metadata-manager/metadata-manager.page.component.html, .ts, .scss |
| MenuLibrary.dc.html | src/app/pages/menu-library/** |c
date: 2026-08-09T11:12:23Z

### Updated in this project (latest)
- Added Equipment screen (Equipment.dc.html): equipment list with category/consumable filters, search, sort, add/edit modal with optional per-guest scaling rule, bulk select/delete; added "ציוד" nav link across all screens
- Added Suppliers screen (Suppliers.dc.html): supplier list with delivery-day filters, linked-products-only filter, search, sort, add/edit modal, bulk select/delete; added "ספקים" nav link across all screens
- Added Menu Intelligence screen (MenuIntelligence.dc.html): printed-paper-style event menu builder — event type/serving type chips, editable sections with recipe search per dish, sell price + food-cost/profit breakdown, sticky financial footer (total cost, food cost %, revenue, cost per guest)
- RecipeBuilder: restored secondary yield units (add a "+" chip to define an extra output, e.g. primary 4 מנות + secondary 2 יח׳) and made the primary yield unit itself selectable via dropdown

## Screen map
| Project screen | Repo source |
|---|---|
| Inventory.dc.html | src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.html, .ts; public/assets/data/demo-products.json |
| Dashboard.dc.html | src/app/pages/dashboard/dashboard.page.html, .ts; src/app/pages/dashboard/components/dashboard-overview/*, dashboard-header/* |
| RecipeBook.dc.html | src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.html, .ts |
| RecipeBuilder.dc.html | src/app/pages/recipe-builder/recipe-builder.page.html; recipe-header, recipe-ingredients-table, recipe-workflow components; assets/stamp-approved.png, stamp-not-approved.png |
| MenuIntelligence.dc.html | src/app/pages/menu-intelligence/menu-intelligence.page.html; components/menu-dish-row/menu-dish-row.component.html |
| Suppliers.dc.html | src/app/pages/suppliers/suppliers.page.html; components/supplier-list/supplier-list.component.html, .ts; components/supplier-form/supplier-form.component.html, .ts |
| Equipment.dc.html | src/app/pages/equipment/equipment.page.html; components/equipment-list/equipment-list.component.html, .ts; components/equipment-form/equipment-form.component.html, .ts |

### Updated in this project
- Redesigned Inventory / product list screen (Inventory.dc.html) using the foodCo Liquid Glass system
- Redesigned Dashboard screen (Dashboard.dc.html): KPI cards + recent activity feed
- Redesigned Recipe Book screen (RecipeBook.dc.html): sortable/filterable recipe table, labels & allergen chips, ratings, favorites
- Redesigned Recipe Builder screen (RecipeBuilder.dc.html): header (photo, type toggle, rating, yield, labels), ingredients table with picker, dish prep-list / preparation instructions modes, approve stamp, save bar
- All screens cross-linked via the shared top nav

## Screen map
| Project screen | Repo source |
|---|---|
| Inventory.dc.html | src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.html, .ts; public/assets/data/demo-products.json |
| Dashboard.dc.html | src/app/pages/dashboard/dashboard.page.html, .ts; src/app/pages/dashboard/components/dashboard-overview/*, dashboard-header/* |
| RecipeBook.dc.html | src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.html, .ts |
| RecipeBuilder.dc.html | src/app/pages/recipe-builder/recipe-builder.page.html; recipe-header, recipe-ingredients-table, recipe-workflow components; assets/stamp-approved.png, stamp-not-approved.png |
