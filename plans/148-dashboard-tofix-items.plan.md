# Dashboard fixes (toFix.md lines 97-118)

## Overview

Diagnose and fix the four dashboard items from toFix.md: align Add Product button style, unify dashboard section headers, add clickable "view unapproved" on the unapproved recipes KPI, and add clickable "view low stock" on the low stock KPI. Update toFix.md as needed (items remain unmarked).

## Implementation

### 1. Align Add Product button with other quick-actions

- In dashboard-overview.component.html, remove the `primary` class from the first button so it uses only `class="qa-btn"`.

### 2. Unify dashboard section headers

- Make in-dashboard section titles (Overview title, Core settings header, Venues list title, Recent activity) feel like one system: lighter section title style in dashboard-overview, metadata-manager `.header-section`, and consistent list-shell title when embedded. Use @layer and tokens per cssLayer skill.

### 3. Unapproved recipes KPI – link to Recipe Book filtered by unapproved

- Add `goToRecipeBookUnapproved()` in dashboard-overview.component.ts: navigate to `/recipe-book` with `queryParams: { filters: 'Approved:false' }`.
- Add a `.kpi-actions` block with a link-btn on the unapproved KPI card calling that method.

### 4. Low stock KPI – link to Inventory with low-stock filter

- In inventory-product-list.component.ts: inject ActivatedRoute; in ngOnInit read `lowStock=1` and set `lowStockOnly_.set(true)`.
- Add `goToInventoryLowStock()` in dashboard-overview.component.ts: navigate to `/inventory` with `queryParams: { lowStock: '1' }`.
- Add `.kpi-actions` with link-btn on the low stock KPI card.

### 5. toFix.md

- Update dashboard section as needed; keep items unmarked (no checkmarks).
