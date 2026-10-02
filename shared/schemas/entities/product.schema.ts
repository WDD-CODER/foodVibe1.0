import { z } from 'zod'
import { baseDocShape } from '../base.schema'

export const productSchema = z.strictObject({
  ...baseDocShape,
  nameHebrew: z.string(),
  nameEnglish: z.string().optional(),
  baseUnit: z.string(),
  sources: z.array(z.strictObject({
    supplierId: z.string(),
    price: z.number(),
    addedBy: z.string().optional(),
    addedAt: z.number().optional()
  })),
  purchaseOptions: z.array(z.strictObject({
    unitSymbol: z.string(),
    conversionRate: z.number(),
    priceOverride: z.number().optional(),
    uom: z.string().optional()
  })),
  categories: z.array(z.string()),
  yieldFactor: z.number(),
  allergens: z.array(z.string()),
  minStockLevel: z.number(),
  expiryDaysDefault: z.number(),
  seeded: z.boolean().optional(),
  allergenSource: z.enum(['off', 'llm']).optional(),
  nutritionPer100g: z.strictObject({
    energyKcal: z.number().optional(),
    proteinG: z.number().optional(),
    carbsG: z.number().optional(),
    sugarsG: z.number().optional(),
    fatG: z.number().optional(),
    fiberG: z.number().optional(),
    sodiumG: z.number().optional(),
    cholesterolMg: z.number().optional()
  }).optional(),
  /** @deprecated legacy-import provenance; dropped when legacy-import scripts are archived (Phase 7) */
  legacyImport: z.boolean().optional(),
  /** @deprecated legacy-import provenance */
  legacyProductId: z.number().optional(),
  /** search helper written by seed/import */
  nameHebrewNormalized: z.string().optional(),
  _masterId: z.string().optional(),
  _userModified: z.boolean().optional(),
  _userDeleted: z.boolean().optional()
})
