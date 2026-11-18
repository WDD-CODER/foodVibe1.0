import type { LogisticsPhase } from '../entities/event-logistics'

/** Plan 622 (C-LOGX): structural shape, so a Mongo document and the browser's `LogisticsItemTerm` both fit. */
export type VisibleItemTerm = {
  key: string
  phase: LogisticsPhase
  environments?: readonly string[]
  removedAt?: number
  foldedAt?: number
  createdBy: string
  createdAt: number
}

export interface VisibleItemsInput<T extends VisibleItemTerm> {
  /** master ∪ the business's own `logisticsItem` terms, in the store's order */
  terms: readonly T[]
  hiddenLogisticsKeys: readonly { key: string; at: number }[]
  /** no value = now */
  eventCreatedAt?: number
  phase: LogisticsPhase
  environment?: string
  /** `event.siteLogistics.hiddenKeys`, taken out when given */
  eventHiddenKeys?: readonly string[]
}

const MASTER = '__master__'
const isRemoved = (t: VisibleItemTerm): boolean => (t.removedAt ?? 0) > 0

/**
 * The questions an event shows (plan 579 date rule, moved out of `LogisticsItemRegistryService.forEvent`).
 * Pure: no Angular, Node or database. The order of `terms` is kept.
 */
export function visibleLogisticsItems<T extends VisibleItemTerm>(input: VisibleItemsInput<T>): T[] {
  const { terms, hiddenLogisticsKeys, eventCreatedAt, phase, environment, eventHiddenKeys } = input
  const at = eventCreatedAt ?? Date.now()
  const hidden = new Map<string, number>(hiddenLogisticsKeys.map((e) => [e.key, e.at]))
  const byKey = new Map<string, T[]>()
  for (const t of terms) byKey.set(t.key, [...(byKey.get(t.key) ?? []), t])
  const rows: T[] = []
  for (const [key, group] of byKey) {
    const real = group.filter((t) => !t.foldedAt)
    const removed = real.filter(isRemoved).sort((a, b) => (b.removedAt ?? 0) - (a.removedAt ?? 0))
    const row = real.find((t) => !isRemoved(t)) ?? removed[0]
    if (!row) continue
    const start = Math.min(...group.map((t) => (t.createdBy === MASTER ? 0 : t.createdAt)))
    const hideAt = hidden.get(key)
    const ends = [...removed.map((t) => t.removedAt as number), ...(hideAt !== undefined ? [hideAt] : [])]
    const end = ends.length ? Math.min(...ends) : undefined
    const matches = row.phase === phase && (!row.environments?.length || !environment || row.environments.includes(environment))
    if (start <= at && (end === undefined || at < end) && matches) rows.push(row)
  }
  const skip = eventHiddenKeys?.length ? new Set(eventHiddenKeys) : null
  return rows
    .filter((r) => !skip || !skip.has(r.key))
    .sort((a, b) => terms.indexOf(a) - terms.indexOf(b))
}
