export type EquipmentCategory = 'heat_source' | 'tool' | 'container' | 'packaging' | 'infrastructure' | 'consumable'

/** @deprecated Plan 338 — no longer edited in the UI. Kept so stored docs still type-check and save. */
export interface ScalingRule {
  perGuests: number
  minQuantity: number
  maxQuantity?: number
}

export interface Equipment {
  _id: string
  nameHebrew: string
  category: EquipmentCategory
  ownedQuantity: number
  /** @deprecated Plan 338 — UI removed; preserved on edit via the original-doc spread. */
  scalingRule?: ScalingRule
  isConsumable: boolean
  tags?: string[]
  notes?: string
  createdAt: number
  updatedAt: number
}
