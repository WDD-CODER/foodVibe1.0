---
name: Dashboard activity change tags and popover
overview: Refine the dashboard Recent Activity widget so each activity shows type, name, and one tag per changed field (price, unit, category, etc.), where clicking a tag opens a small floating panel with the old and new values.
todos:
  - id: model-activity-change
    content: Add ActivityChange interface and extend ActivityEntry with structured changes in activity-log.service
    status: pending
  - id: product-recipe-diff
    content: Compute ActivityChange[] for product and recipe/dish updates in KitchenStateService and pass to recordActivity
    status: pending
  - id: dashboard-activity-layout
    content: Refactor dashboard overview HTML/SCSS to show entity type tag, name, change tags, and action pill per activity
    status: pending
  - id: change-popover-interaction
    content: Implement clickable change tags and floating detail popover for each changed field
    status: pending
  - id: activity-translations-tests
    content: Add translation keys for change labels and extend unit tests for ActivityLogService, KitchenStateService, and dashboard overview
    status: pending
isProject: false
---

# Dashboard Recent Activity – Structured Change Tags & Popover

## Goals

- **Display layout:** For each activity row on the dashboard:
  - Show **entity type tag** (product / preparation / dish).
  - Show **entity name** as plain text.
  - Show a **set of clickable change tags**, one per changed field (e.g. price, unit, category), **only the field title** on the tag.
  - Show the **overall action** (created / updated / deleted) at the far end of the row.
- **Interaction:** When a user clicks a change tag (e.g. "price"), open a **floating panel / inline dropdown** that shows the precise old and new values for that field (e.g. `0 ₪ → 10 ₪`).
- **Data model:** Move from a single free-text `details` string to a structured representation so the UI can render tags and tooltips precisely.

## Data model & service changes

### 1. Extend `ActivityEntry` to support structured changes

- In `[src/app/core/services/activity-log.service.ts](src/app/core/services/activity-log.service.ts)`:
  - Introduce a new interface:

```ts
    export interface ActivityChange {
      /** Logical field key, e.g. 'price', 'unit', 'category', 'name' */
      field: string;
      /** Localized label key or direct label, e.g. 'price' */
      label: string;
      /** Old value (stringified for display) */
      from?: string;
      /** New value (stringified for display) */
      to?: string;
    }
    

```

- Extend `ActivityEntry`:

```ts
    export interface ActivityEntry {
      // existing fields...
      changes?: ActivityChange[]; // structured, preferred
      details?: string;          // keep temporarily for backward compat
    }
    

```

- Keep persistence format compatible: `recordActivity` should serialize both `changes` and `details` if present. Hydration should tolerate entries without `changes` and only `details`.

### 2. Compute `changes` in `KitchenStateService` for Product updates

- In `[src/app/core/services/kitchen-state.service.ts](src/app/core/services/kitchen-state.service.ts)`:
  - Replace the existing `productChangeDetails(prev, next)` string generator with a **new helper** that returns `ActivityChange[]`, e.g. `buildProductChanges(prev: Product, next: Product): ActivityChange[]`:
    - For each field of interest, add an `ActivityChange` entry **only if the value actually changed**:
      - `name_hebrew` → `{ field: 'name', label: 'activity_field_name', from, to }`
      - `buy_price_global_` → `{ field: 'price', label: 'price', from: '10 ₪', to: '35 ₪' }`
      - `base_unit_` → `{ field: 'unit', label: 'unit', from: 'GRAM', to: 'kg' }`
      - `categories_` (compare sorted join) → `{ field: 'category', label: 'category', from: 'A,B', to: 'A,B,C' }`
      - `supplierIds_` → `{ field: 'supplier', label: 'supplier', ... }`
      - `allergens_`, `min_stock_level_`, `expiry_days_default_`, `yield_factor_`, `purchase_options_` (simplified summary like "purchase options updated").
    - Use helper functions to stringify values cleanly (e.g. add currency symbol, join arrays with comma, etc.).
  - In the **update path** of `saveProduct`:
    - Compute `const changes = previous ? this.buildProductChanges(previous, product) : [];`.
    - Pass `changes` into `recordActivity`:

```ts
      this.activityLogService.recordActivity({
        action: 'updated',
        entityType: 'product',
        entityId: product._id,
        entityName: product.name_hebrew,
        changes,
      });
      

```

- For **create** and **delete** product actions, keep `changes` empty or only add one generic change if you want (e.g. `{ field: 'created', label: 'created' }`), since there is no prior state. - keep empty  will be best!

### 3. Compute `changes` for Recipe / Dish updates

- Still in `KitchenStateService`, replace `recipeChangeDetails` with `buildRecipeChanges(prev: Recipe, next: Recipe): ActivityChange[]`:
  - Track key aspects at a summary level (to avoid extremely long diffs):
    - Name changes.
    - Ingredient count changed.
    - Step count changed.
    - Yield (amount/unit) changed.
    - Prep items count (for dishes) changed.
  - For each changed aspect, push one `ActivityChange` with a clear label (`'activity_field_yield'`, `'activity_field_ingredients_count'`, etc.) and from/to values.
  - In the **update** path of `saveRecipe`, compute `changes` and pass them in `recordActivity` similarly to products.

### 4. Backward compatibility / migration

- When hydrating entries in `ActivityLogService`:
  - If `changes` is present, use it directly.
  - If `changes` is missing but `details` (old string) exists, fall back to rendering `details` as a **single tag** or attempt a simple best-effort parse into `ActivityChange[]` (optional).
- New events will all use `changes`; `details` can eventually be removed once old logs are no longer needed.

## UI & interaction changes

### 5. Card layout for each activity

- In `[src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.html](src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.html)`:
  - Ensure each **activity card** has this structure:

```html
    <div class="activity-item" *ngFor="let item of getRecentActivity(); trackBy: trackByActivityId">
     <span class="entity-type-tag" [attr.data-entity]="item.entityType">
        {{ (item.entityType === 'product'
          ? 'product'
          : item.entityType === 'dish'
            ? 'dish'
            : 'preparation') | translatePipe }}
      </span>
 <span class="activity-name">
        {{ item.entityName }}
      </span>

      
      <span class="activity-type" [attr.data-action]="item.action">
        {{ ('activity_' + item.action) | translatePipe }}
      </span>
    </div>
    

```



  



- This satisfies:
  - **Entity type tag** (different colors for product/preparation/dish).
  - **Entity name** in plain text.
  - **Action tag** (created/updated/deleted) at the end of the row.

### 6. Change tags section per activity

- Inside each `activity-item`, render the changes row using any remaining horizontal space between the name and the activity-type pill:

```html
    <div class="activity-item" *ngFor="let item of getRecentActivity(); trackBy: trackByActivityId">
      <!-- type + name omitted for brevity -->

      <div class="activity-changes">
        <button
          type="button"
          class="change-tag"
          *ngFor="let change of item.changes || []"
          (click)="toggleChangePopover(item.id, change.field)"
        >
          {{ change.label | translatePipe }}
        </button>
      </div>

      <span class="activity-type" [attr.data-action]="item.action">
        {{ ('activity_' + item.action) | translatePipe }}
      </span>
    </div>
  

```

- `.activity-changes` will be a flex container that uses whatever free space is left in the row and scrolls horizontally if there are many tags.

### 7. Floating detail panel on tag click

- In `DashboardOverviewComponent` TS:
  - Track the currently open popover, e.g.:

```ts
    private openChange_ = signal<{ activityId: string; field: string } | null>(null);

    protected toggleChangePopover(activityId: string, field: string): void {
      const current = this.openChange_();
      if (current && current.activityId === activityId && current.field === field) {
        this.openChange_.set(null);
      } else {
        this.openChange_.set({ activityId, field });
      }
    }

    protected isChangeOpen(activityId: string, field: string): boolean {
      const current = this.openChange_();
      return !!current && current.activityId === activityId && current.field === field;
    }

    protected getChange(activity: ActivityEntry, field: string): ActivityChange | undefined {
      return activity.changes?.find(c => c.field === field);
    }
    

```

- In the template, inside each `activity-changes` block, add the floating panel markup:

```html
      <div
        class="change-popover"
        *ngIf="isChangeOpen(item.id, change.field)"
      >
        <div class="change-popover-row" *ngIf="getChange(item, change.field) as c">
          <span class="change-label">{{ c.label | translatePipe }}</span>
          <span class="change-from">{{ c.from }}</span>
          <span class="change-arrow">→</span>
          <span class="change-to">{{ c.to }}</span>
        </div>
      </div>
  

```

- Style the popover in `[dashboard-overview.component.scss](src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.scss)` as an **absolutely-positioned floating container** anchored under the tag:
  - `.change-tag` as `position: relative`.
  - `.change-popover` as `position: absolute; top: 100%; inset-inline-start: 0; z-index: 10; background: white; border-radius; box-shadow; padding;`.
  - Ensure it works in RTL (use logical properties like `inset-inline-start`).

### 8. Styling refinements

- Adjust `.activity-item` and `.activity-changes` in SCSS to visually group the elements as a single activity block:
  - Slight extra margin between different activities.
  - Indent/align `activity-changes` within the same row and ensure the tags scroll horizontally if needed.
- Keep typography small but readable; ensure tags wrap or scroll appropriately on small screens.

## Translations & labels

### 9. Add translation keys for change labels

- In `[public/assets/data/dictionary.json](public/assets/data/dictionary.json)` add under `general` or an `activity` section:
  - `activity_field_name`: "שם"
  - `activity_field_price`: "מחיר"
  - `activity_field_unit`: "יחידה"
  - `activity_field_category`: "קטגוריה"
  - `activity_field_supplier`: "ספק"
  - `activity_field_allergens`: "אלרגנים"
  - `activity_field_min_stock`: "מלאי מינימלי"
  - `activity_field_expiry_days`: "ימי תוקף"
  - `activity_field_yield_factor`: "פקטור יבול"
  - `activity_field_purchase_options`: "יחידות רכש"
  - Similar keys for recipe/dish aspects: `activity_field_ingredients_count`, `activity_field_steps_count`, `activity_field_yield`, `activity_field_prep_items`.
- Use these keys in `ActivityChange.label` so the same labels are reused across UI.

## Testing

### 10. Unit tests

- **ActivityLogService**:
  - Verify `changes` is persisted and hydrated correctly.
  - Test `getRecentEntriesFromStorage` returns sorted and sliced list.
- **KitchenStateService**:
  - Extend product and recipe update tests to assert `recordActivity` is called with the correct `changes` array (including at least one field change with correct from/to values).
- **DashboardOverviewComponent**:
  - Add tests that:
    - `getRecentActivity()` returns the parsed data from a mocked `ActivityLogService.getRecentEntriesFromStorage`.
    - Change tags (`item.changes`) render one tag per changed field.
    - `toggleChangePopover` opens/closes the correct popover for a given activity/field.

## Summary of main files to touch

- **Model & service:**
  - `[src/app/core/services/activity-log.service.ts](src/app/core/services/activity-log.service.ts)` – add `ActivityChange`, extend `ActivityEntry`, add `getRecentEntriesFromStorage`.
  - `[src/app/core/services/kitchen-state.service.ts](src/app/core/services/kitchen-state.service.ts)` – compute structured `changes` for product/recipe updates.
- **Dashboard UI:**
  - `[src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.ts](src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.ts)` – add helpers for recent activity, change tags, and popover state.
  - `[src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.html](src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.html)` – implement new layout: separate entity type tag, name, change tags inside the row, and popover.
  - `[src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.scss](src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.scss)` – style activity rows, entity tags, change tags, and floating detail panel.
- **Translations:**
  - `[public/assets/data/dictionary.json](public/assets/data/dictionary.json)` – add change field label keys.

This plan will give you a Recent Activity widget where each activity clearly shows **what type it is**, **what entity**, **which fields changed** (as clickable tags), and, on click, a precise **old vs new** value for each change in a compact floating detail panel.

