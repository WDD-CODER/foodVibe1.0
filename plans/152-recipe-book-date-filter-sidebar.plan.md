# Recipe Book Sidebar: Date Filtering

## Scope
- **Target**: Recipe book list sidebar only ([recipe-book-list](src/app/pages/recipe-book/components/recipe-book-list/)).
- **Data**: Recipe model already has `addedAt_` and `updatedAt_` (epoch ms) in [recipe.model.ts](src/app/core/models/recipe.model.ts).

## 1. State and URL persistence
- New signals: `dateFrom_`, `dateTo_` (string | null, YYYY-MM-DD), `dateField_` ('created' | 'updated').
- Use existing `NullableStringParam` for dateFrom/dateTo; StringParam for dateField (URL: dateField=created|updated).
- useListState: add three descriptors (dateFrom, dateTo, dateField).
- hasActiveFilters_: include when dateFrom or dateTo set. clearAllFilters(): clear dateFrom_, dateTo_, dateField_ = 'created'.

## 2. Filtering logic
- In filteredRecipes_, after category/search filters: if dateFrom/dateTo set, filter by (dateField === 'updated' ? updatedAt_ : addedAt_) in [startOfFromDay, endOfToDay] (local timezone).
- Helper: parse YYYY-MM-DD to start/end of day epoch ms.

## 3. Sort by date
- Extend SortField: add 'dateUpdated'. compareRecipes case 'dateUpdated': (a.updatedAt_ ?? 0) - (b.updatedAt_ ?? 0).
- Sidebar: "Newest first" / "Oldest first" (set sortBy dateAdded/dateUpdated, order desc/asc). Checkbox "Use updated time for range" (dateField_).

## 4. Sidebar UI
- New collapsible section "Date": From/To date inputs, checkbox "Use updated time for range", sort buttons Newest first / Oldest first.
- Expand "Date" when dateFrom or dateTo set (effect).
- SCSS: cssLayer-compliant, reuse filter section classes.

## 5. Translations
- date_filter, date_from, date_to, use_updated_time, sort_newest_first, sort_oldest_first (dictionary.json).

## Files
- recipe-book-list.component.ts (signals, useListState, filteredRecipes_, compareRecipes, clearAllFilters, hasActiveFilters_, expand effect, SortField).
- recipe-book-list.component.html (Date section in shell-filters).
- recipe-book-list.component.scss (date input styles).
- list-state.util.ts (only if new serializer needed; NullableStringParam / StringParam suffice).
- public/assets/data/dictionary.json (new keys).
