/** Ingredient extracted by the AI text parser. */
export interface ParsedIngredient {
  nameHebrew: string
  amount_net: number | null
  unit: string | null
}

/** Workflow step extracted by the AI text parser. */
export interface ParsedStep {
  order: number
  instruction: string
}

/**
 * AI-extracted fields for a recipe (preparation type).
 * Field names mirror the recipe-builder reactive form fields exactly.
 */
export interface ParsedRecipe {
  nameHebrew: string
  serving_portions: number | null
  labels: string[]
  ingredients: ParsedIngredient[]
  steps: ParsedStep[]
}

/**
 * AI-extracted fields for a dish (dish type).
 * Mirrors the dish-mode recipe-builder form fields.
 */
export interface ParsedDish {
  nameHebrew: string
  serving_portions: number | null
  labels: string[]
}

export type ParsedResultType = 'recipe' | 'dish'

export interface ParsedResult {
  type: ParsedResultType
  /** Confidence score 0–1 — how certain the AI is about the type classification. */
  confidence: number
  data: ParsedRecipe | ParsedDish
}
