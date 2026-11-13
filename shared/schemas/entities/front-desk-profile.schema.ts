import { z } from 'zod'
import { baseDocShape, nameField } from '../base.schema'
import { operatingHoursRowSchema } from './common.schema'

export const BUSINESS_TYPES = ['restaurant', 'private_chef', 'catering', 'other'] as const
export const FRONT_DESK_STATUSES = ['draft', 'pilot', 'active', 'suspended'] as const
export const QUESTION_TYPES = ['text', 'number', 'date', 'time', 'choice'] as const
export const ASSISTANT_TONES = ['warm', 'formal'] as const
/** The request kinds a front desk takes; plan 549's `REQUEST_KINDS` re-exports this list. */
export const FRONT_DESK_REQUEST_KINDS = ['table', 'event', 'tasting', 'consultation'] as const
/** Plan 548: fields only the server writes; the generic data API drops them from every profile write. */
export const PROFILE_SERVER_FIELDS = ['status', 'whatsapp', 'adminHistory'] as const

export const FRONT_DESK_PLANS = ['pilot', 'basic', 'pro'] as const
export type FrontDeskPlan = (typeof FRONT_DESK_PLANS)[number]

export type BusinessType = (typeof BUSINESS_TYPES)[number]
export type FrontDeskStatus = (typeof FRONT_DESK_STATUSES)[number]
export type QuestionType = (typeof QUESTION_TYPES)[number]
export type AssistantTone = (typeof ASSISTANT_TONES)[number]
export type FrontDeskRequestKind = (typeof FRONT_DESK_REQUEST_KINDS)[number]


export const questionSchema = z.strictObject({
  key: z.string().regex(/^[a-z0-9_]{1,40}$/),
  label: z.string().max(120),
  type: z.enum(QUESTION_TYPES),
  options: z.array(z.string().max(80)).max(20).optional(),
  required: z.boolean()
})

export const requestKindConfigSchema = z.strictObject({
  enabled: z.boolean(),
  questions: z.array(questionSchema).max(12),
  rules: z.strictObject({
    minPartySize: z.number().int().min(0).optional(),
    maxPartySize: z.number().int().min(0).optional(),
    minLeadHours: z.number().min(0).optional(),
    maxLeadDays: z.number().min(0).optional(),
    minBudgetPerGuest: z.number().min(0).optional(),
    areas: z.array(z.string().max(80)).max(30).optional()
  }),
  defaultDurationMinutes: z.number().int().min(15).max(1440).optional(),
  expireAfterHours: z.number().int().min(1).max(720)
})
export type RequestKindConfig = z.infer<typeof requestKindConfigSchema>
export type FrontDeskQuestion = z.infer<typeof questionSchema>

/**
 * Plan 548 (C-PROFILE): one front desk profile per business. Owner-only to write; `status` and `whatsapp` are
 * server-owned (`PROFILE_SERVER_FIELDS`); `whatsapp.phoneNumberId` is never sent to the browser.
 */
export const frontDeskProfileSchema = z.strictObject({
  ...baseDocShape,
  businessType: z.enum(BUSINESS_TYPES),
  slug: z.string().regex(/^[a-z0-9-]{3,40}$/),
  displayName: nameField,
  logoUrl: z.string().max(500).optional(),
  phone: z.string().max(30).optional(),
  address: z.string().max(200).optional(),
  serviceArea: z.string().max(200).optional(),
  hours: z.array(operatingHoursRowSchema),
  closedDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(100).optional(),
  requestKinds: z.partialRecord(z.enum(FRONT_DESK_REQUEST_KINDS), requestKindConfigSchema),
  assistant: z.strictObject({
    level: z.union([z.literal(0), z.literal(1), z.literal(2)]).default(0),
    tone: z.enum(ASSISTANT_TONES),
    greeting: z.string().max(400).optional(),
    handoffText: z.string().max(400).optional(),
    activeHours: z.array(operatingHoursRowSchema).optional()
  }),
  status: z.enum(FRONT_DESK_STATUSES).default('draft'),
  whatsapp: z.strictObject({
    phoneNumberId: z.string().max(100),
    ownerAlertPhone: z.string().max(30).optional(),
    ownerAlertOptIn: z.boolean()
  }).optional(),
  /** Plan 557: the platform admin's changes with their reasons; server-owned, newest last, at most 50. */
  adminHistory: z.array(z.strictObject({
    at: z.number(),
    by: z.string(),
    byName: z.string().max(80),
    status: z.enum(FRONT_DESK_STATUSES).optional(),
    assistantLevel: z.union([z.literal(0), z.literal(1)]).optional(),
    plan: z.enum(FRONT_DESK_PLANS).optional(),
    reason: z.string().min(1).max(200)
  })).max(50).optional()
})
export type FrontDeskProfile = z.infer<typeof frontDeskProfileSchema>
