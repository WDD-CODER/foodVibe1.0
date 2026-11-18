/** Plan 624 (C-LOAD): one pure function builds the loading list of an event from equipment rules and logistics answers. */

export type LoadingRow = {
  key: string
  label: string
  source: 'equipment' | 'logistics'
  quantity: number
  owned?: number
  shortage?: number
  section?: string
}

export interface LoadingEquipment {
  _id: string
  nameHebrew: string
  ownedQuantity: number
  scalingRule?: { perGuests: number; minQuantity: number; maxQuantity?: number }
  deletedAt?: number
}

export interface LoadingAnswer {
  itemKey: string
  label?: string
  section: string
  status: string
  payer?: string
  quantity?: number
}

export interface LoadingListInput {
  equipment: readonly LoadingEquipment[]
  guestCount: number
  answers: readonly LoadingAnswer[]
}

/** Equipment rows first (a rule with perGuests > 0), then the answers "needed" that the business brings. Input order kept. */
export function buildLoadingList({ equipment, guestCount, answers }: LoadingListInput): LoadingRow[] {
  const guests = Number.isFinite(guestCount) && guestCount > 0 ? guestCount : 0
  const rows: LoadingRow[] = []
  for (const e of equipment) {
    const rule = e.scalingRule
    if (e.deletedAt || !rule || !(rule.perGuests > 0)) continue
    const quantity = Math.min(Math.max(Math.ceil(guests / rule.perGuests), rule.minQuantity), rule.maxQuantity ?? Infinity)
    if (quantity <= 0) continue
    rows.push({
      key: 'eq:' + e._id,
      label: e.nameHebrew,
      source: 'equipment',
      quantity,
      owned: e.ownedQuantity,
      shortage: Math.max(0, quantity - e.ownedQuantity),
    })
  }
  for (const a of answers) {
    if (a.status !== 'needed' || (a.payer !== 'ours' && a.payer !== 'chef')) continue
    rows.push({
      key: a.itemKey,
      label: a.label ?? a.itemKey,
      source: 'logistics',
      quantity: a.quantity !== undefined && a.quantity > 0 ? a.quantity : 1,
      section: a.section,
    })
  }
  return rows
}
