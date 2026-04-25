export interface AiMenuDishDraft {
  name_hebrew: string
  predicted_take_rate_: number | null
  serving_portions: number | null
  sell_price: number | null
}

export interface AiMenuSectionDraft {
  category: string
  items: AiMenuDishDraft[]
}

export interface AiMenuDraft {
  name_: string
  event_type_: string
  event_date_: string | null
  serving_type_: string
  guest_count_: number
  sections_: AiMenuSectionDraft[]
}

export type AiMenuPatch = Partial<AiMenuDraft>

export interface MatchedDish {
  name_hebrew: string
  status: 'matched' | 'ambiguous' | 'unmatched'
  recipeId: string | null
  candidates: Array<{ recipeId: string; name: string; confidence: number }>
  predictedTakeRate?: number | null
  servingPortions?: number | null
  sellPrice?: number | null
}

export interface MatchedSection {
  category: string
  items: MatchedDish[]
}

export interface MatchedMenu {
  name_: string
  event_type_: string
  event_date_: string | null
  serving_type_: string
  guest_count_: number
  sections: MatchedSection[]
}
