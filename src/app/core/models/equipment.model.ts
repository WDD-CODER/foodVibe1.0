export type EquipmentCategory = 'heat_source' | 'tool' | 'container' | 'packaging' | 'infrastructure' | 'consumable'

/** Plan 624: one item per `perGuests` guests, between `minQuantity` and `maxQuantity`; `perGuests: 0` means no rule. */
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
  /** Plan 624: the loading list's quantity rule (see `ScalingRule`). */
  scalingRule?: ScalingRule
  isConsumable: boolean
  tags?: string[]
  notes?: string
  createdAt: number
  updatedAt: number
}
