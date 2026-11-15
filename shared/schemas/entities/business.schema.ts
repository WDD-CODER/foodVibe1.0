import { z } from 'zod'
import { nameField } from '../base.schema'
import { EVENT_STAGES } from './event-stage'
import { LOGISTICS_LABEL_MAX } from './event-logistics'

/** Plan 429: the three numbers that belong to the business. Defaults apply on read when a business has none stored. */
export const BUSINESS_SETTINGS_DEFAULTS = { profitTargetPct: 25, safetyMarginPct: 10, overrunThresholdPct: 10 } as const

export const businessSettingsSchema = z.strictObject({
  /** Spec 03.2: a target of 100% or more is an error. */
  profitTargetPct: z.number().min(0).lt(100),
  safetyMarginPct: z.number().min(0).lt(100),
  /** 0 would flag every supplier. */
  overrunThresholdPct: z.number().gt(0).max(100)
})

export type BusinessSettings = z.infer<typeof businessSettingsSchema>

/** Plan 472: the owner renames the business. Trimmed, 1–200 characters. */
export const businessNameInputSchema = z.strictObject({ name: nameField.trim().min(1) })

export type BusinessNameInput = z.infer<typeof businessNameInputSchema>

/** Plan 431: how the business ran before FoodVibe (monthly averages of the last 3 months). Every number is optional. */
export const baselineInputSchema = z.strictObject({
  inquiriesPerMonth: z.number().min(0).optional(),
  eventsClosedPerMonth: z.number().min(0).optional(),
  avgRevenuePerEvent: z.number().min(0).optional(),
  estProfitPct: z.number().gt(-100).lt(100).optional(),
  // Plan 567: optional owner estimates of the kitchen (never required).
  foodCostPct: z.number().min(0).max(100).optional(),
  hoursPerWeekOrdering: z.number().min(0).max(168).optional(),
  hoursPerWeekQuotes: z.number().min(0).max(168).optional(),
  wastePct: z.number().min(0).max(100).optional(),
  supplierOverrunPct: z.number().gt(-100).lt(100).optional(),
  // Plan 567: optional owner estimates of the front desk (never required).
  phoneInquiriesPerDay: z.number().min(0).optional(),
  messagesPerDay: z.number().min(0).optional(),
  avgResponseMinutes: z.number().min(0).optional(),
  hostHoursPerWeek: z.number().min(0).max(168).optional(),
  noShowsPerWeek: z.number().min(0).optional(),
  missedInquiriesPerWeek: z.number().min(0).optional()
})

/** Plan 567: the four numbers the dashboard cards compare. */
export const BASELINE_CARD_FIELDS = ['inquiriesPerMonth', 'eventsClosedPerMonth', 'avgRevenuePerEvent', 'estProfitPct'] as const
/** Plan 567: the optional kitchen estimates. */
export const BASELINE_KITCHEN_FIELDS = ['foodCostPct', 'hoursPerWeekOrdering', 'hoursPerWeekQuotes', 'wastePct', 'supplierOverrunPct'] as const
/** Plan 567: the optional front desk estimates. */
export const BASELINE_FRONTDESK_FIELDS = [
  'phoneInquiriesPerDay',
  'messagesPerDay',
  'avgResponseMinutes',
  'hostHoursPerWeek',
  'noShowsPerWeek',
  'missedInquiriesPerWeek'
] as const

/** The stored baseline: the input plus the time the server saved it. An empty baseline (only `filledAt`) means "skipped". */
export const businessBaselineSchema = baselineInputSchema.extend({ filledAt: z.number() })

export type BaselineInput = z.infer<typeof baselineInputSchema>
export type BusinessBaseline = z.infer<typeof businessBaselineSchema>

/** Plan 477: the event stages staff may see. Absent on the business = every stage. */
const staffVisibleStagesField = z.array(z.enum(EVENT_STAGES)).max(EVENT_STAGES.length)

/** Plan 477: body of `PUT /api/v1/business/staff-visible-stages` (owner only). */
export const staffVisibleStagesInputSchema = z.strictObject({ stages: staffVisibleStagesField })

export type StaffVisibleStagesInput = z.infer<typeof staffVisibleStagesInputSchema>

/** Plan 579: the owner's whole list of hidden logistics keys. */
export const logisticsHiddenInputSchema = z.strictObject({ keys: z.array(z.string().min(1).max(LOGISTICS_LABEL_MAX)).max(300) })
export type LogisticsHiddenInput = z.infer<typeof logisticsHiddenInputSchema>

/** Plan 600: body of `PUT /api/v1/business/share-ai-examples` (owner only). */
export const shareAiExamplesInputSchema = z.strictObject({ share: z.boolean() })
export type ShareAiExamplesInput = z.infer<typeof shareAiExamplesInputSchema>

/** Plan 424: one document per business (the tenant). Lives in the `businesses` collection, not the generic data pipe. */
export const businessSchema = z.strictObject({
  _id: z.string().min(1),
  name: nameField.min(1),
  ownerId: z.string().min(1),
  createdAt: z.number(),
  internal: z.boolean(),
  lastSyncedMasterVersion: z.number().int().min(0),
  /** Plan 429: absent on older documents; reads fill the defaults. */
  settings: businessSettingsSchema.optional(),
  /** Plan 431: absent until the owner fills or skips the opening details. */
  baseline: businessBaselineSchema.optional(),
  /** Plan 477: stages staff may see (events they created always stay visible). Absent = every stage. */
  staffVisibleStages: staffVisibleStagesField.optional(),
  /** Plan 579: shared logistics questions this business hid, with the time it hid them. */
  hiddenLogisticsKeys: z.array(z.strictObject({ key: z.string().min(1).max(LOGISTICS_LABEL_MAX), at: z.number() })).max(300).optional(),
  /** Plan 600: the owner lets the platform admin copy its saved AI recipe examples, anonymously, into the shared pool. Absent = off. */
  shareAiExamples: z.boolean().optional(),
  /** Server-written by the platform admin (plan 557); reserved so later features can check it. */
  frontDeskPlan: z.enum(['pilot', 'basic', 'pro']).optional()
})

export type Business = z.infer<typeof businessSchema>
