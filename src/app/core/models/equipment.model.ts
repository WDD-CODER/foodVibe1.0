export type EquipmentCategory = 'heat_source' | 'tool' | 'container' | 'packaging' | 'infrastructure' | 'consumable'

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
  scalingRule?: ScalingRule
  isConsumable: boolean
  tags?: string[]
  notes?: string
  createdAt: number
  updatedAt: number
}
