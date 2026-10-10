import { Recipe } from '@models/recipe.model'
import { MAX_ALLERGEN_RECURSION } from 'src/app/core/utils/recipe-allergens.util'

/** Pure helpers for the recipe book list (plan 399) — no Angular, no injected state. */

export type SortField = 'name' | 'type' | 'cost' | 'labels' | 'allergens' | 'dateAdded' | 'dateUpdated' | 'rating'

/** Sidebar filter categories, in the order their counts are tallied (sets the sidebar order). */
export const RECIPE_FILTER_CATEGORIES = ['Type', 'Allergens', 'Labels', 'Approved', 'Station', 'Course'] as const

const CATEGORY_DISPLAY_KEYS: Record<string, string> = {
  Labels: 'labels',
  Type: 'type',
  Allergens: 'allergens',
  Approved: 'approved',
  Station: 'station',
  Course: 'course'
}

export function isRecipeDish(recipe: Recipe): boolean {
  return recipe.recipeType === 'dish' || !!(recipe.prepItems?.length || recipe.prepCategories?.length)
}

export function getAllRecipeLabels(recipe: Recipe): string[] {
  return [...new Set([...(recipe.labels ?? []), ...(recipe.autoLabels ?? [])])]
}

export function categoryDisplayKey(internalName: string): string {
  return CATEGORY_DISPLAY_KEYS[internalName] ?? internalName.toLowerCase()
}

/** Translation key (or raw value) shown for one sidebar filter option. */
export function filterOptionLabel(name: string, value: string): string {
  if (name === 'Approved') return value === 'true' ? 'approved_yes' : 'approved_no'
  if (name === 'Station' && value === '_none') return 'no_station'
  if (name === 'Course' && value === '_none') return 'no_course'
  return value
}

/**
 * The filter values one recipe carries in a sidebar category — shared by the counts and the filter pass.
 * `courseKeys`: the current dish types; a course outside them (plan 376) counts as no course.
 */
export function recipeFilterValues(
  recipe: Recipe,
  category: string,
  allergens: string[],
  courseKeys?: ReadonlySet<string>
): string[] {
  switch (category) {
    case 'Type':
      return [isRecipeDish(recipe) ? 'dish' : 'preparation']
    case 'Allergens':
      return allergens
    case 'Labels': {
      const labels = getAllRecipeLabels(recipe)
      return labels.length > 0 ? labels : ['no_label']
    }
    case 'Approved':
      return [recipe.isApproved ? 'true' : 'false']
    case 'Station':
      return [(recipe.defaultStation || '').trim() || '_none']
    case 'Course': {
      const course = (recipe.course || '').trim()
      const isKnown = !courseKeys?.size || courseKeys.has(course)
      return [course && isKnown ? course : '_none']
    }
    default:
      return []
  }
}

/** Parse YYYY-MM-DD to start of day (00:00:00.000) in local timezone. */
export function parseDateToStartOfDay(dateStr: string): number | null {
  const parts = dateStr.split('-').map(Number)
  if (parts.length !== 3 || parts.some(isNaN)) return null
  const [y, m, d] = parts
  return new Date(y, m - 1, d).getTime()
}

/** Parse YYYY-MM-DD to end of day (23:59:59.999) in local timezone. */
export function parseDateToEndOfDay(dateStr: string): number | null {
  const parts = dateStr.split('-').map(Number)
  if (parts.length !== 3 || parts.some(isNaN)) return null
  const [y, m, d] = parts
  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime()
}

/** Short Hebrew date, or '—' when missing. */
export function formatShortDate(ts: number | undefined): string {
  if (ts == null) return '—'
  return new Date(ts).toLocaleDateString('he-IL', { dateStyle: 'short' })
}

/** Short Hebrew date and time (hover tooltip), or '—' when missing. */
export function formatDateTime(ts: number | undefined): string {
  if (ts == null) return '—'
  return new Date(ts).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })
}

/** Every product id used by a recipe, following sub-recipes up to the allergen recursion limit. */
export function getRecipeProductIds(recipe: Recipe, recipesById: Map<string, Recipe>, depth = 0): Set<string> {
  if (depth >= MAX_ALLERGEN_RECURSION || !recipe?.ingredients?.length) return new Set()
  const set = new Set<string>()
  for (const ing of recipe.ingredients) {
    if (!ing.referenceId) continue
    if (ing.type === 'product') {
      set.add(ing.referenceId)
    } else if (ing.type === 'recipe') {
      const sub = recipesById.get(ing.referenceId)
      if (sub) getRecipeProductIds(sub, recipesById, depth + 1).forEach((id) => set.add(id))
    }
  }
  return set
}

export function recipeContainsAllProducts(
  recipe: Recipe,
  productIds: string[],
  recipesById: Map<string, Recipe>
): boolean {
  if (productIds.length === 0) return true
  const ids = getRecipeProductIds(recipe, recipesById)
  return productIds.every((id) => ids.has(id))
}

export interface RecipeCompareDeps {
  translate: (key: string) => string
  cost: (recipe: Recipe) => number
  allergens: (recipe: Recipe) => string[]
}

/** Ascending comparison of two recipes by one sort column. */
export function compareRecipes(a: Recipe, b: Recipe, field: SortField, deps: RecipeCompareDeps): number {
  const hebrewCompare = (x: string, y: string) => (x || '').localeCompare(y || '', 'he')
  switch (field) {
    case 'name':
      return hebrewCompare(a.nameHebrew || '', b.nameHebrew || '')
    case 'type': {
      const aType = isRecipeDish(a) ? 'dish' : 'preparation'
      const bType = isRecipeDish(b) ? 'dish' : 'preparation'
      return hebrewCompare(deps.translate(aType), deps.translate(bType))
    }
    case 'cost':
      return deps.cost(a) - deps.cost(b)
    case 'labels': {
      const aLabels = getAllRecipeLabels(a)
      const bLabels = getAllRecipeLabels(b)
      const aStr = aLabels.length > 0 ? aLabels.map((l) => deps.translate(l)).join(', ') : ''
      const bStr = bLabels.length > 0 ? bLabels.map((l) => deps.translate(l)).join(', ') : ''
      return hebrewCompare(aStr, bStr)
    }
    case 'allergens': {
      const aVal = deps.translate(deps.allergens(a)[0] ?? '')
      const bVal = deps.translate(deps.allergens(b)[0] ?? '')
      return hebrewCompare(aVal, bVal)
    }
    case 'dateAdded':
      return (a.createdAt ?? 0) - (b.createdAt ?? 0)
    case 'dateUpdated':
      return (a.updatedAt ?? 0) - (b.updatedAt ?? 0)
    case 'rating':
      return (a.rating ?? 0) - (b.rating ?? 0)
    default:
      return 0
  }
}
