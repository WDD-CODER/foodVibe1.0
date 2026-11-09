import { LOGISTICS_SECTIONS } from '@schemas/entities'
import type { LogisticsAnswer } from '@models/menu-event.model'
import type { LogisticsItemTerm } from '../services/logistics-item-registry.service'

/** Plan 521: the Hebrew text the chef pastes into a quote — only ticked answers shown to the client, grouped by section. */
export function buildClientSummary(
  answers: LogisticsAnswer[],
  items: LogisticsItemTerm[],
  t: (key: string) => string
): string {
  const shown = answers.filter((a) => a.showToClient === true && a.status !== 'unchecked')
  const groups: string[] = []
  for (const section of LOGISTICS_SECTIONS) {
    const lines = shown
      .filter((a) => a.section === section)
      .map((a) => {
        const label = a.label ?? items.find((i) => i.key === a.itemKey)?.key ?? a.itemKey
        const parts = [`${label}: ${t(`logistics_status_${a.status}`)}`]
        if (a.quantity !== undefined) parts.push(String(a.quantity))
        if (a.text) parts.push(a.text)
        return `• ${parts.join(' · ')}`
      })
    if (lines.length) groups.push([t(`logistics_section_${section}`), ...lines].join('\n'))
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
