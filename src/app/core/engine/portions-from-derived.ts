import type { MenuEvent } from '@models/menu-event.model'

/** Item key → the stored `derivedPortions` (missing → 0). Plan 441 swaps this for `computePortions`. */
export function portionsFromDerived(event: Pick<MenuEvent, 'sections'>): Map<string, number> {
  const out = new Map<string, number>()
  for (const section of event.sections ?? []) {
    ;(section.items ?? []).forEach((item, i) => {
      out.set(`${section._id}|${i}`, item.derivedPortions ?? 0)
    })
  }
  return out
}
