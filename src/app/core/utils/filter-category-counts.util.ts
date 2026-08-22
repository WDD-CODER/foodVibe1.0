/**
 * Shared two-layer filter-sidebar builder.
 *
 * Splits "tally per-option counts from the catalog" from "attach checked_ state
 * from the active filters" into separate pure functions so a caller can put each
 * behind its own computed() — the count pass only depends on the catalog (recipes/
 * products), the checked-state pass only depends on activeFilters_(). Without the
 * split, a single computed() that reads both ends up re-scanning the entire catalog
 * on every filter-checkbox toggle, not just when the catalog itself changes.
 */

export type FilterOptionCounts = Record<string, Map<string, number>>

export interface FilterCategoryOption {
  label: string
  value: string
  count: number
  color: string | null
  checked_: boolean
}

export interface FilterCategoryDef {
  name: string
  displayKey: string
  options: FilterCategoryOption[]
}

/** Tally per-option counts across `items`. `bucket` reports each (category, value) pair an item contributes via `bump`. */
export function buildFilterOptionCounts<T>(
  items: readonly T[],
  bucket: (item: T, bump: (categoryName: string, value: string) => void) => void
): FilterOptionCounts {
  const categories: FilterOptionCounts = {}
  const bump = (name: string, value: string): void => {
    if (!categories[name]) categories[name] = new Map()
    categories[name].set(value, (categories[name].get(value) ?? 0) + 1)
  }
  items.forEach((item) => bucket(item, bump))
  return categories
}

/** Attach checked_ state (from activeFilters_) and display metadata to pre-built counts — cheap, bounded by option count, not catalog size. */
export function attachFilterCheckedState(
  counts: FilterOptionCounts,
  filters: Record<string, string[]>,
  displayKeyFn: (categoryName: string) => string,
  labelFn: (categoryName: string, value: string) => string,
  colorFn?: (categoryName: string, value: string) => string | null
): FilterCategoryDef[] {
  return Object.keys(counts).map((name) => ({
    name,
    displayKey: displayKeyFn(name),
    options: Array.from(counts[name].entries()).map(([value, count]) => ({
      label: labelFn(name, value),
      value,
      count,
      color: colorFn ? colorFn(name, value) : null,
      checked_: (filters[name] || []).includes(value)
    }))
  }))
}
