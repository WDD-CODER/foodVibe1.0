export interface Ingredient {
  _id: string
  referenceId?: string
  type?: 'product' | 'recipe'
  amount: number
  unit: string
  note?: string
  calculatedCost?: number
  nameSnapshot?: string
  /** Plan 536: the supplier this line is bought from; absent = automatic = cheapest. Owner-only. */
  supplierId?: string
}
