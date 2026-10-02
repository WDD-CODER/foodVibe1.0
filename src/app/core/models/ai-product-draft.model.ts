export interface AiProductDraft {
  nameHebrew: string
  baseUnit: string
  categories: string[]
  allergens: string[]
  yieldFactor: number
  minStockLevel: number
  expiryDaysDefault: number
}

export type AiProductPatch = Partial<AiProductDraft>
