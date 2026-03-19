---
name: Timestamp All Added Items
overview: Add epoch-ms `addedAt_` and `updatedAt_` timestamps so every entity tracks when it was added and when it was last updated; keep recipe-book-list "Added at" as date-only and add an "Updated at" column (date only).
---

# Timestamp All Added Items

## Scope

1. **`/add-recipe` skill** — mandate `addedAt_` (and `updatedAt_` for recipe/dish) in every JSON object written to demo files
2. **Product model + service** — add `addedAt_`, and set existing `updatedAt` on add/update
3. **Recipe/Dish** — add `updatedAt_` (epoch ms), set on create and on every update so we know when it was last changed
4. **recipe-book-list** — keep "Added at" as **date only** (no time). Add **"Updated at"** column showing date only, so we can see when each recipe/dish was last updated

### What is already covered

| Entity        | Covered by                                                                               |
| ------------- | ---------------------------------------------------------------------------------------- |
| Recipe / Dish | `addedAt_` already stamped on create; **this plan adds `updatedAt_`** on add + update     |
| Equipment     | `equipment-data.service.ts` stamps `created_at_` / `updated_at_` ISO on create            |
| Venue         | `venue-data.service.ts` stamps `created_at_` ISO on create                               |

---

## 1 — Update `/add-recipe` Skill

**File:** [.claude/skills/add-recipe/SKILL.md](.claude/skills/add-recipe/SKILL.md)

Add the following rules in **Step 4 — WRITE**:

- **Recipe/Dish object** (point 6): append `"addedAt_": Date.now()` and `"updatedAt_": Date.now()` (current epoch ms at write time) to every recipe or dish object built.
- **New products** (point 2): append `"addedAt_": Date.now()` to every new product stub written to `demo-products.json`.
- **New kitchen prep entries** (point 4): extend each newly written `preparations` entry from `{ name, category }` to `{ name, category, "addedAt_": Date.now() }`.
- **New equipment** (point 3): require `created_at_` and `updated_at_` to be the current ISO timestamp (`new Date().toISOString()`), not the placeholder used in existing demo data.
- **New labels** (point 1): append `"addedAt_": Date.now()` to every new label entry.
- **Schema Reference** section: add `addedAt_?: number`, `updatedAt_?: number` to Recipe/Dish row; add `addedAt_?: number` to Product row.

---

## 2 — Product model + service

### 2a. [src/app/core/models/product.model.ts](src/app/core/models/product.model.ts)

Add one optional field: `addedAt_?: number` (epoch ms, set once on create).

### 2b. [src/app/core/services/product-data.service.ts](src/app/core/services/product-data.service.ts)

- `normalizeProduct`: pass through `addedAt_` from raw data (alongside existing `updatedAt`)
- `addProduct`: stamp `addedAt_: Date.now()` and `updatedAt: new Date().toISOString()` before `storage.post`
- `updateProduct`: read existing entity; preserve `addedAt_`; set `updatedAt: new Date().toISOString()` before `storage.put`

---

## 3 — Recipe/Dish: add `updatedAt_`

**Model:** [src/app/core/models/recipe.model.ts](src/app/core/models/recipe.model.ts) — Add `updatedAt_?: number` (epoch ms; set on create and on every update).

**Services:** [recipe-data.service.ts](src/app/core/services/recipe-data.service.ts), [dish-data.service.ts](src/app/core/services/dish-data.service.ts)

- **addRecipe / addDish:** set both `addedAt_: Date.now()` and `updatedAt_: Date.now()` on the payload before `storage.post`.
- **updateRecipe / updateDish:** preserve `addedAt_`; set `updatedAt_: Date.now()` on the payload before `storage.put`.

**Skill:** In Step 4, when building recipe/dish objects, also set `"updatedAt_": Date.now()`.

---

## 4 — recipe-book-list display

- **Added at:** Keep **date only** — leave `formatAddedAt` as-is. No time in the list.
- **Updated at:** Add a second date column:
  - In recipe-book-list.component.ts: add `formatUpdatedAt(updatedAt: number | undefined): string` (same logic as `formatAddedAt`: "—" when null, else short date).
  - In recipe-book-list.component.html: add header cell and body cell `{{ formatUpdatedAt(recipe.updatedAt_) }}`; extend `gridTemplate` / `mobileGridTemplate` for the new column.
  - Add translation key in `dictionary.json`: `"date_updated": "עודכן בתאריך"` if missing.

---

## Files changed

- `.claude/skills/add-recipe/SKILL.md`
- `src/app/core/models/product.model.ts`
- `src/app/core/models/recipe.model.ts`
- `src/app/core/services/product-data.service.ts`
- `src/app/core/services/recipe-data.service.ts`
- `src/app/core/services/dish-data.service.ts`
- `src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.ts`
- `src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.html`
- `public/assets/data/dictionary.json` (add `date_updated` if missing)
