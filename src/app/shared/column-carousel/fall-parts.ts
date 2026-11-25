import type { FallColumnDirective } from './fall-column.directive'

/** One thing a header or row renders in measured mode: a column as its own cell, or the switching column. */
export type FallPart =
  | { kind: 'own'; key: string; col: FallColumnDirective }
  | { kind: 'carousel'; key: string; active: FallColumnDirective | null }

/**
 * Lays the fall columns out in list order: each column that did not fall is its own cell; the switching
 * column sits where the first fallen column was and shows the active fallen one (plan 745).
 */
export function buildFallParts(
  falls: readonly FallColumnDirective[],
  collapsed: readonly string[],
  index: number
): FallPart[] {
  const activeId = collapsed[index]
  const parts: FallPart[] = []
  let placed = false
  for (const col of falls) {
    if (!collapsed.includes(col.id())) {
      parts.push({ kind: 'own', key: col.id(), col })
    } else if (!placed) {
      placed = true
      parts.push({ kind: 'carousel', key: '__carousel', active: falls.find((f) => f.id() === activeId) ?? null })
    }
  }
  return parts
}
