export interface AiMenuDishDraft {
  nameHebrew: string
  /** plan 580: id of a dish from the business's recipe book, set only when the AI picked from it */
  dishId?: string
  /** plan 614: recipe-book dishes the AI thinks are the same dish (server-checked ids, confidence 0–1) */
  matches?: { dishId: string; confidence: number }[]
  /** @deprecated plan 441: the AI may still send it; nothing reads it */
  predictedTakeRate?: number | null
  /** @deprecated plan 587: the server removes it; nothing reads it */
  serving_portions?: number | null
  /** @deprecated plan 587: the server removes it; nothing reads it */
  sell_price?: number | null
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
  /** plan 614: the choice preselected in the AI menu window — a recipeId or 'new' (keep as an unlinked dish) */
  defaultChoice?: string
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
  /** plan 614: the user wrote no guest count, so guestCount is 1 and the window warns */
  guestCountMissing?: boolean
  sections: MatchedSection[]
}
