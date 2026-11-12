import { z } from 'zod'
import {
  BUSINESS_TYPES,
  ASSISTANT_TONES,
  frontDeskProfileSchema,
  requestKindConfigSchema,
  FRONT_DESK_REQUEST_KINDS
} from './entities/front-desk-profile.schema'
import { knowledgeItemSchema } from './entities/knowledge-item.schema'
import { baselineInputSchema } from './entities/business.schema'

/**
 * Plan 556: what the intake form sends in one request. Strict: `status`, `whatsapp` and `assistant.level` are never
 * accepted. The kind entries carry only what the form sets (`enabled`, `rules`, the sitting length, the event types);
 * the template's questions stay.
 */
const intakeKindSchema = z.strictObject({
  enabled: requestKindConfigSchema.shape.enabled.optional(),
  rules: requestKindConfigSchema.shape.rules.optional(),
  defaultDurationMinutes: requestKindConfigSchema.shape.defaultDurationMinutes,
  /** Options of the `event_type` question (catering). */
  eventTypeOptions: z.array(z.string().max(80)).max(20).optional()
})

const intakeProfileSchema = frontDeskProfileSchema
  .pick({
    displayName: true,
    slug: true,
    logoUrl: true,
    phone: true,
    address: true,
    serviceArea: true,
    hours: true,
    closedDates: true
  })
  .partial()
  .extend({
    requestKinds: z.partialRecord(z.enum(FRONT_DESK_REQUEST_KINDS), intakeKindSchema).optional(),
    assistant: z
      .strictObject({
        tone: z.enum(ASSISTANT_TONES).optional(),
        greeting: frontDeskProfileSchema.shape.assistant.shape.greeting,
        handoffText: frontDeskProfileSchema.shape.assistant.shape.handoffText
      })
      .optional()
  })

const intakeItemSchema = knowledgeItemSchema
  .pick({ topic: true, question: true, answer: true, visibility: true })
  .extend({ visibility: knowledgeItemSchema.shape.visibility })

export const frontDeskIntakeSchema = z.strictObject({
  businessType: z.enum(BUSINESS_TYPES),
  profile: intakeProfileSchema,
  knowledge: z.array(intakeItemSchema).max(60),
  baseline: baselineInputSchema.optional()
})
export type FrontDeskIntake = z.infer<typeof frontDeskIntakeSchema>
