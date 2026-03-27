import { filterOptionsByStartsWith } from "./filter-starts-with.util"

/**
 * Filters and deduplicates a list of select options.
 * - Applies script-aware "starts with" filtering via filterOptionsByStartsWith.
 * - Deduplicates by translated display label, preferring the current value when
 *   two options share the same display string.
 */
export function dedupeAndFilterOptions(
  options: { value: string; label: string }[],
  query: string,
  currentValue: string,
  translateFn: (key: string) => string
): { value: string; label: string }[] {
  const baseList = filterOptionsByStartsWith(options, query, (opt) => translateFn(opt.label))
  const deduped: { value: string; label: string }[] = []
  const seenDisplay = new Map<string, number>()
  for (const opt of baseList) {
    const display = translateFn(opt.label)
    const existingIdx = seenDisplay.get(display)
    if (existingIdx !== undefined) {
      if (opt.value === currentValue) deduped[existingIdx] = opt
    } else {
      seenDisplay.set(display, deduped.length)
      deduped.push(opt)
    }
  }
  return deduped
}
