import { z } from 'zod'
import { baseDocShape, nameField } from '../base.schema'

/** Plan 724: one dish of a restaurant's standing menu. Owner-only; a dish leaves the menu by `active: false`. */
export const DISH_COST_SOURCES = ['recipe', 'product', 'typed', 'units'] as const
export type DishCostSource = (typeof DISH_COST_SOURCES)[number]

const SOURCE_FIELDS = ['recipeId', 'productId', 'productAmount', 'productUnit', 'typedCost'] as const
const FIELDS_OF: Record<DishCostSource, readonly string[]> = {
  recipe: ['recipeId'],
  product: ['productId', 'productAmount', 'productUnit'],
  typed: ['typedCost'],
  units: []
}

export const menuDishSchema = z
  .strictObject({
    ...baseDocShape,
    name: nameField.trim().min(1),
    course: z.string().min(1).optional(),
    priceWithVat: z.number().min(0).max(100000).optional(),
    costSource: z.enum(DISH_COST_SOURCES),
    recipeId: z.string().min(1).optional(),
    productId: z.string().min(1).optional(),
    productAmount: z.number().gt(0).optional(),
    productUnit: z.string().min(1).max(40).optional(),
    typedCost: z.number().min(0).max(100000).optional(),
    active: z.boolean().default(true),
    note: z.string().max(200).optional()
  })
  .superRefine((dish, ctx) => {
    const wanted = FIELDS_OF[dish.costSource]
    for (const field of SOURCE_FIELDS) {
      const present = dish[field] !== undefined
      if (wanted.includes(field) && !present) ctx.addIssue({ code: 'custom', path: [field], message: `required for ${dish.costSource}` })
      if (!wanted.includes(field) && present) ctx.addIssue({ code: 'custom', path: [field], message: `not allowed for ${dish.costSource}` })
    }
  })
export type MenuDish = z.infer<typeof menuDishSchema>
