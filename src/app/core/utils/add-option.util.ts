/**
 * Add-option rule for dropdowns (plans 398/400):
 * one add option; typed new name → `הוסף "<typed>"`, otherwise the generic `add_new_<thing>` key
 * matching by the label shown on screen; after the add, select the key that was actually stored.
 */

/** What the add option shows: the typed new name, or the generic "add new <thing>" key. */
export type AddOptionLabel = { kind: 'typed'; text: string } | { kind: 'generic'; key: string }

/** Neutral generic key for shared selects whose caller passes none. */
export const DEFAULT_ADD_NEW_LABEL_KEY = 'add_new_item'

function norm(s: string): string {
  return (s ?? '').trim().toLowerCase()
}

/** Option whose on-screen label (via `labelFn`) equals the trimmed typed text, case-insensitive; else undefined. */
export function findOptionByLabel<T>(typed: string, options: readonly T[], labelFn: (opt: T) => string): T | undefined {
  const q = norm(typed)
  if (!q) return undefined
  return options.find((o) => norm(labelFn(o)) === q)
}

/** Typed text that isn't an existing option → `typed`; nothing typed or an exact match → `generic`. */
export function addOptionLabel<T>(
  typed: string,
  options: readonly T[],
  labelFn: (opt: T) => string,
  genericKey: string
): AddOptionLabel {
  const text = (typed ?? '').trim()
  if (text && !findOptionByLabel(text, options, labelFn)) return { kind: 'typed', text }
  return { kind: 'generic', key: genericKey || DEFAULT_ADD_NEW_LABEL_KEY }
}

/**
 * The key that was stored by an add: an option matching the typed text (by key or label),
 * else the one key that is new since `beforeKeys`. `null` when nothing was added (cancelled).
 */
export function resolveAddedKey(
  beforeKeys: readonly string[],
  afterKeys: readonly string[],
  typed: string,
  labelFn: (key: string) => string
): string | null {
  const before = new Set(beforeKeys)
  const added = afterKeys.filter((k) => !before.has(k))
  if (!added.length) return null
  const q = norm(typed)
  if (q) {
    const match = added.find((k) => norm(k) === q || norm(labelFn(k)) === q)
    if (match) return match
  }
  return added[0]
}

/** Shows the success message after an add window saved (rule M): `"<name>" נוסף` (`item_added_named`). */
export function notifyItemAdded(
  userMsg: { onSetSuccessMsg: (txt: string) => void },
  translate: (key: string) => string,
  name: string
): void {
  const label = (name ?? '').trim()
  if (!label) return
  userMsg.onSetSuccessMsg(translate('item_added_named').replace('{name}', label))
}
