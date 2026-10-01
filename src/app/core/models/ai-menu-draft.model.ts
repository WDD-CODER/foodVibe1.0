export interface AiMenuDishDraft {
  nameHebrew: string
  predictedTakeRate: number | null
  serving_portions: number | null
  sell_price: number | null
}

export interface AiMenuSectionDraft {
  category: string
  items: AiMenuDishDraft[]
}

export interface AiMenuDraft {
  name: string
  eventType: string
  eventDate: string | null
  servingType: string
  guestCount: number
  sections: AiMenuSectionDraft[]
}

export type AiMenuPatch = Partial<AiMenuDraft>

export interface MatchedDish {
  nameHebrew: string
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
  name: string
  eventType: string
  eventDate: string | null
  servingType: string
  guestCount: number
  sections: MatchedSection[]
}
