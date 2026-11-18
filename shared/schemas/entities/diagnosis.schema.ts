import { z } from 'zod'
import { baseDocShape } from '../base.schema'

/** Plan 615 (C-DIAG): a consultant's menu-and-margin diagnosis. Read through the generic API, written only by its router. */
export const DIAGNOSIS_STATUSES = ['open', 'done'] as const

export const diagnosisSchema = z.strictObject({
  ...baseDocShape,
  name: z.string().min(1).max(200),
  periodDays: z.number().int().min(30).max(365).default(60),
  menu: z.array(z.strictObject({ name: z.string().min(1).max(200), sellPrice: z.number().min(0), dishId: z.string().optional() })).max(300),
  pricesIncludeVat: z.boolean().default(true),
  vatPct: z.number().min(0).max(100).default(18),
  invoiceIds: z.array(z.string()).max(100),
  homeBusinessId: z.string().min(1),
  status: z.enum(DIAGNOSIS_STATUSES)
})
export type Diagnosis = z.infer<typeof diagnosisSchema>
