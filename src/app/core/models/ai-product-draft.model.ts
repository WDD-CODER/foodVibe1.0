export interface AiProductDraft {
  name_hebrew: string
  base_unit_: string
  categories_: string[]
  allergens_: string[]
  yield_factor_: number
  min_stock_level_: number
  expiry_days_default_: number
}

export type AiProductPatch = Partial<AiProductDraft>
