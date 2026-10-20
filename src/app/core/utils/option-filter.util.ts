/**
 * Dropdown filter (add-option rule F, plan 416): options whose on-screen label contains the
 * trimmed query, case-insensitive; labels that start with it come first, the rest keep their order.
 */
export function filterOptionsByLabel<T>(options: readonly T[], query: string, labelFn: (item: T) => string): T[] {
  const q = (query ?? '').trim().toLowerCase()
  if (!q) return [...options]
  const starts: T[] = []
  const contains: T[] = []
  for (const item of options) {
    const label = (labelFn(item) ?? '').toLowerCase()
    if (label.startsWith(q)) starts.push(item)
    else if (label.includes(q)) contains.push(item)
  }
  return [...starts, ...contains]
}
