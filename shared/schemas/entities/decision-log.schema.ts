import { z } from 'zod'
import { baseDocShape } from '../base.schema'

/**
 * Plan 550 (C-REQUEST): one row per approve / decline / ask on a request. Ids, enums and numbers only: no name,
 * phone or free text by design, so the log can later justify automation without holding personal data.
 */
export const DECISION_ACTIONS = ['approve', 'decline', 'ask'] as const

export const decisionLogSchema = z.strictObject({
  _id: baseDocShape._id,
  schemaVersion: baseDocShape.schemaVersion,
  businessId: baseDocShape.businessId,
  createdBy: baseDocShape.createdBy,
  createdAt: baseDocShape.createdAt,
  updatedAt: baseDocShape.updatedAt,
  requestId: z.string().min(1),
  suggestion: z.enum(DECISION_ACTIONS).optional(),
  verdict: z.enum(['fit', 'borderline', 'unfit']).optional(),
  decidedAction: z.enum(DECISION_ACTIONS),
  decidedBy: z.string().min(1),
  editedFields: z.array(z.string().max(40)).max(10),
  secondsToDecision: z.number().int().min(0),
  at: z.number()
})
export type DecisionLog = z.infer<typeof decisionLogSchema>
