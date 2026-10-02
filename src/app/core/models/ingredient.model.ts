export interface Ingredient {
  _id: string
  referenceId?: string
  type?: 'product' | 'recipe'
  amount: number
  unit: string
  note?: string
  calculatedCost?: number
  nameSnapshot?: string
}
