# Plan 263 — Favorites Button on Recipe-Book List

## Context
Users need a way to mark recipes as personal favorites for quick retrieval. The feature adds a heart icon button to each row in the recipe-book list (the primary recipe view), persists favorites per-user in MongoDB by extending the Recipe model (consistent with the existing `hiddenBy` per-user pattern), and adds a "Favorites only" toggle to the filter sidebar.

## Answers confirmed
- Target view: recipe-book list rows (not a card grid)
- Persistence: `favoritedBy_?: string[]` on Recipe model (like `hiddenBy`)
- Filter: "Favorites only" toggle in the filter sidebar

## Backend Impact
- Collections affected: `RECIPE_LIST`, `DISH_LIST`
- New collections: No
- Server changes needed: No — adding a new optional field to an existing schema-less entity; generic PUT route handles it automatically

---

## Atomic Sub-tasks

### 1 — Recipe model: add `favoritedBy_` field
**File:** `src/app/core/models/recipe.model.ts`

Add after the `hiddenBy` field:
```typescript
/** List of user _ids who have favorited this recipe/dish */
favoritedBy_?: string[];
```

### 2 — Register `Heart` Lucide icon
**File:** `src/app/app.config.ts`

- Add `import { Heart } from 'lucide-angular';` alongside existing imports (line ~5–30)
- Add `Heart` to the `LucideAngularModule.pick({ ... })` object (line ~103–180)

### 3 — Translation keys
**File:** `public/assets/data/dictionary.json`

Check file format first (app uses flat string keys like `'search'`, `'recipe_book'`). Add 4 keys:
```json
"favorites": "מועדפים",
"show_favorites_only": "הצג רק מועדפים",
"add_to_favorites": "הוסף למועדפים",
"remove_from_favorites": "הסר ממועדפים"
```

### 4 — Component TS: state + logic
**File:** `src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.ts`

a. Add signal (alongside existing signals):
```typescript
protected showFavoritesOnly_ = signal<boolean>(false);
```

b. Add to `useListState(...)` params array:
```typescript
{ urlParam: 'favorites', signal: this.showFavoritesOnly_, serializer: BooleanParam },
```

c. Add computed helper (after `isEmptyList_`):
```typescript
protected isFavoritedByCurrentUser_(recipe: Recipe): boolean {
  const uid = this.currentUserId_();
  if (!uid) return false;
  return (recipe.favoritedBy_ ?? []).includes(uid);
}
```

d. Add action method (after `onToggleApproval`):
```typescript
protected onToggleFavorite(recipe: Recipe): void {
  const uid = this.currentUserId_();
  if (!uid) return;
  const current = recipe.favoritedBy_ ?? [];
  const updated: Recipe = {
    ...recipe,
    favoritedBy_: current.includes(uid)
      ? current.filter(id => id !== uid)
      : [...current, uid],
  };
  this.kitchenState.saveRecipe(updated).subscribe();
}
```

e. In `filteredRecipes_` computed, add filter after the date-range block and before the sort block:
```typescript
if (this.showFavoritesOnly_()) {
  const uid = this.currentUserId_();
  recipes = uid ? recipes.filter(r => (r.favoritedBy_ ?? []).includes(uid)) : [];
}
```

f. Update `hasActiveFilters_` computed to include the favorites toggle:
```typescript
protected hasActiveFilters_ = computed(() =>
  Object.values(this.activeFilters_()).some(arr => arr.length > 0) ||
  this.dateFrom_() != null ||
  this.dateTo_() != null ||
  this.showFavoritesOnly_()
);
```

g. Update `clearAllFilters()` to reset favorites:
```typescript
this.showFavoritesOnly_.set(false);
```

### 5 — Template: favorite button in actions column
**File:** `src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.html`

In the `<div class="c-col-actions c-list-body-cell">` block, add the heart button **before** the cook button:
```html
<button type="button"
  class="c-icon-btn favorite-btn"
  [class.is-favorited]="isFavoritedByCurrentUser_(recipe)"
  (click)="onToggleFavorite(recipe); $event.stopPropagation()"
  [attr.aria-label]="(isFavoritedByCurrentUser_(recipe) ? 'remove_from_favorites' : 'add_to_favorites') | translatePipe"
  [disabled]="!isLoggedIn()">
  <lucide-icon name="heart" [size]="18"></lucide-icon>
</button>
```

### 6 — Template: "Favorites only" toggle in filter sidebar
**File:** `src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.html`

Add at the top of `<ng-container shell-filters>` (before `.search-section`):
```html
@if (isLoggedIn()) {
  <div class="c-filter-category favorites-filter-category">
    <label class="c-filter-option">
      <input type="checkbox"
        [checked]="showFavoritesOnly_()"
        (change)="showFavoritesOnly_.set(!showFavoritesOnly_())" />
      <span>{{ 'show_favorites_only' | translatePipe }}</span>
    </label>
  </div>
}
```

### 7 — SCSS: favorite button styles
**File:** `src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.scss`

Add within the existing `@layer` block:
```scss
.favorite-btn {
  color: var(--color-text-subtle, #94a3b8);
  transition: color 0.15s ease, opacity 0.15s ease;

  &.is-favorited {
    color: #e11d48;
    opacity: 1;
  }

  &:hover:not(.is-favorited) {
    color: #e11d48;
  }
}
```

---

## Files Modified Summary
| File | Change |
|---|---|
| `src/app/core/models/recipe.model.ts` | +1 field: `favoritedBy_` |
| `src/app/app.config.ts` | register `Heart` icon |
| `public/assets/data/dictionary.json` | +4 translation keys |
| `recipe-book-list.component.ts` | signal + computed + method + filter logic |
| `recipe-book-list.component.html` | heart button + favorites filter checkbox |
| `recipe-book-list.component.scss` | `.favorite-btn` styles |

---

## Verification
1. Start dev server (`ng serve`)
2. Navigate to `/recipe-book`
3. Log in — heart icon appears in the actions column of each row
4. Click heart on a recipe → icon turns red; click again → reverts
5. Open filter panel → "Show favorites only" checkbox visible
6. Check it → list filters to only favorited recipes; URL contains `?favorites=true`
7. Log out — heart buttons are disabled (no-op)
8. `ng build` — zero errors
