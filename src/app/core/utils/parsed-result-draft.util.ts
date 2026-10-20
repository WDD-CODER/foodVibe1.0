import type { AiRecipeDraft } from '@services/ai-recipe-draft.service'
import type { ParsedResult } from '@models/parsed-result.model'

/**
 * Turns a `parse-text` result into the same draft the AI recipe uses.
 * Returns null when nothing usable was found (no ingredients and no steps).
 */
export function parsedResultToDraft(result: ParsedResult | null | undefined): AiRecipeDraft | null {
  if (!result?.data) return null
  const data = result.data as {
    nameHebrew?: string
    serving_portions?: number | null
    ingredients?: { nameHebrew?: string; amount_net?: number | null; unit?: string | null }[]
    steps?: { order?: number; instruction?: string }[]
  }
  const ingredients = (data.ingredients ?? [])
    .filter((i) => !!i?.nameHebrew?.trim())
    .map((i) => ({
      name: (i.nameHebrew as string).trim(),
      amount: i.amount_net ?? 0,
      unit: i.unit ?? 'unit'
    }))
  const steps = [...(data.steps ?? [])]
    .filter((s) => !!s?.instruction?.trim())
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((s) => (s.instruction as string).trim())
  if (ingredients.length === 0 && steps.length === 0) return null
  return {
    nameHebrew: (data.nameHebrew ?? '').trim(),
    recipe_type: result.type === 'dish' ? 'dish' : 'preparation',
    yield_amount: data.serving_portions ?? 1,
    yield_unit: 'portion',
    ingredients,
    steps
  }
}
