/**
 * Filters options by "starts with" + script (Hebrew vs Latin).
 * - Hebrew input → only options whose display starts with the query (no case change).
 * - Latin input → only options that contain Latin script and display starts with query (case-insensitive).
 * - Mixed/other → case-insensitive starts with.
 */
export function filterOptionsByStartsWith<T>(
  options: T[],
  query: string,
  getDisplayLabel: (item: T) => string
): T[] {
  const raw = query.trim();
  if (!raw) return options;
  const qLower = raw.toLowerCase();
  const isHebrew = /[\u0590-\u05FF]/.test(raw);
  const isLatin = /[a-zA-Z]/.test(raw);
  return options.filter((item) => {
    const display = getDisplayLabel(item);
    if (isHebrew) return display.startsWith(raw);
    if (isLatin) return /[a-zA-Z]/.test(display) && display.toLowerCase().startsWith(qLower);
    return display.toLowerCase().startsWith(qLower);
  });
}
