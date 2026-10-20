import { z } from 'zod'
import { baseDocShape, nameField } from '../base.schema'
import { dishLogisticsSchema, ingredientSchema } from './common.schema'

export const recipeSchema = z.strictObject({
  ...baseDocShape,
  nameHebrew: nameField,
  ingredients: z.array(ingredientSchema),
  steps: z.array(z.strictObject({
    order: z.number(),
    instruction: z.string(),
    laborTimeMinutes: z.number(),
    cookingTimeSecs: z.number().optional(),
    /** @deprecated old name seen on 4 Atlas recipes; kept so no step data is lost (rename vs convert is a later call) */
    cookingTimeMinutes: z.number().optional(),
    videoUrl: z.string().optional()
  })),
  yieldAmount: z.number(),
  yieldUnit: z.string(),
  yieldConversions: z.array(z.strictObject({ amount: z.number(), unit: z.string() })).optional(),
  defaultStation: z.string(),
  isApproved: z.boolean(),
  versionHistory: z.array(z.string()).optional(),
  prepItems: z.array(z.strictObject({
    preparationName: z.string(),
    categoryName: z.string(),
    mainCategoryName: z.string().optional(),
    quantity: z.number(),
    unit: z.string()
  })).optional(),
  prepCategories: z.array(z.strictObject({
    categoryName: z.string(),
    items: z.array(z.strictObject({
      itemName: z.string(),
      unit: z.string(),
      quantity: z.number().optional(),
      categoryName: z.string().optional()
    }))
  })).optional(),
  logistics: dishLogisticsSchema.optional(),
  labels: z.array(z.string()).optional(),
  course: z.string().optional(),
  autoLabels: z.array(z.string()).optional(),
  /** The owner's favorite mark on their own copy (plan 407); never pushed to master. */
  favorite: z.boolean().optional(),
  imageUrl: z.string().optional(),
  rating: z.number().optional(),
  netoConfirmed: z.boolean().optional(),
  /** @deprecated legacy-import provenance */
  legacyImport: z.boolean().optional(),
  /** @deprecated legacy-import provenance */
  legacyRecipeNo: z.number().optional(),
  _masterId: z.string().optional(),
  _userModified: z.boolean().optional()
})
