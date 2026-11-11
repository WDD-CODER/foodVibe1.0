import type { LogisticsAnswer } from '@models/menu-event.model'
import type { LogisticsItemTerm } from '../services/logistics-item-registry.service'

/** Plan 579: an answer the customer must bring: needed and "באחריות הלקוח" (payer `client`, or the old status `client_provides`). */
export function isClientProvided(a: Pick<LogisticsAnswer, 'status' | 'payer'>): boolean {
  return a.status === 'client_provides' || (a.status === 'needed' && a.payer === 'client')
}

/**
 * Plan 579: the Hebrew text the chef pastes into a quote — what the client must bring, grouped by section in the
 * event's section order (`sections` carry the heading text). The caller leaves out answers hidden on the event.
 */
export function buildClientSummary(
  answers: LogisticsAnswer[],
  items: LogisticsItemTerm[],
  sections: { key: string; label: string }[]
): string {
  const shown = answers.filter(isClientProvided)
  const known = new Set(sections.map((s) => s.key))
  const order = [
    ...sections,
    ...[...new Set(shown.map((a) => a.section))].filter((k) => !known.has(k)).map((k) => ({ key: k, label: k }))
  ]
  const groups: string[] = []
  for (const section of order) {
    const lines = shown
      .filter((a) => a.section === section.key)
      .map((a) => {
        const label = a.label ?? items.find((i) => i.key === a.itemKey)?.key ?? a.itemKey
        const parts = [label]
        if (a.quantity !== undefined) parts.push(String(a.quantity))
        if (a.text) parts.push(a.text)
        return `• ${parts.join(' · ')}`
      })
    if (lines.length) groups.push([section.label, ...lines].join('\n'))
  }
  return groups.join('\n\n')
}

/** Items with no answer yet, or whose answer is still `unchecked`. */
export function openItems(items: LogisticsItemTerm[], answers: LogisticsAnswer[]): LogisticsItemTerm[] {
  return items.filter((i) => {
    const answer = answers.find((a) => a.itemKey === i.key)
    return !answer || answer.status === 'unchecked'
  })
}
