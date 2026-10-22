import { z } from 'zod'
import { nameField } from '../base.schema'
import { EVENT_STAGES } from './event-stage'

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
  estProfitPct: z.number().gt(-100).lt(100).optional()
})

/** The stored baseline: the input plus the time the server saved it. An empty baseline (only `filledAt`) means "skipped". */
export const businessBaselineSchema = baselineInputSchema.extend({ filledAt: z.number() })

export type BaselineInput = z.infer<typeof baselineInputSchema>
export type BusinessBaseline = z.infer<typeof businessBaselineSchema>

/** Plan 477: the event stages staff may see. Absent on the business = every stage. */
const staffVisibleStagesField = z.array(z.enum(EVENT_STAGES)).max(EVENT_STAGES.length)

/** Plan 477: body of `PUT /api/v1/business/staff-visible-stages` (owner only). */
export const staffVisibleStagesInputSchema = z.strictObject({ stages: staffVisibleStagesField })

export type StaffVisibleStagesInput = z.infer<typeof staffVisibleStagesInputSchema>

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
  staffVisibleStages: staffVisibleStagesField.optional()
})

export type Business = z.infer<typeof businessSchema>
