import { z } from 'zod'
import { baseDocShape, nameField } from '../base.schema'
import { eventLogisticsSchema } from './common.schema'
import { EVENT_STAGES, NOTE_MAX_LENGTH, NOT_CLOSED_REASONS } from './event-stage'
import { coefficientSchema } from './taxonomy-term.schema'

/** Plan 440: a copy of the event type's / serving type's name and coefficient at selection time (no decimal rule: it is a copy). */
const typeSnapshotSchema = z.strictObject({
  key: z.string(),
  name: z.string(),
  coefficient: z.number().positive()
})

/** Plan 445: a per-event override of the business profit target / safety margin (each 0 <= x < 100). */
const pctBelow100 = z.number().min(0).lt(100)

/** Plan 446 (C-SNAPSHOT): the plan as it stood when the event went into execution. Amounts are non-negative. */
const planSnapshotSchema = z.strictObject({
  at: z.number(),
  frozenAt: z.number().optional(),
  suppliers: z.array(z.strictObject({
    supplierId: z.string().nullable(),
    name: nameField,
    plannedCost: z.number().min(0)
  })).max(200),
  extraCosts: z.number().min(0),
  plannedRevenue: z.number().min(0),
  plannedProfit: z.number(),
  plannedProfitPct: z.number()
})

/** Plan 446 (C-SNAPSHOT): what was really paid. Photos are Cloudinary URLs only, at most 10 per supplier row. */
const closingSchema = z.strictObject({
  suppliers: z.array(z.strictObject({
    supplierId: z.string().nullable(),
    name: nameField,
    planned: z.number().min(0),
    actualPaid: z.number().min(0).optional(),
    arrived: z.boolean(),
    hasInvoice: z.boolean(),
    photos: z.array(z.string().url().max(500).startsWith('https://res.cloudinary.com/')).max(10)
  })).max(200),
  actualExtraCosts: z.number().min(0).optional(),
  actualRevenue: z.number().min(0).optional(),
  finishedAt: z.number().optional(),
  finishedBy: z.string().optional()
})

export const menuEventSchema = z.strictObject({
  ...baseDocShape,
  name: nameField,
  eventType: z.string(),
  eventDate: z.string().optional(),
  servingType: z.string(),
  eventTypeSnapshot: typeSnapshotSchema.optional(),
  servingTypeSnapshot: typeSnapshotSchema.optional(),
  guestCount: z.number(),
  /** @deprecated legacy since plan 440, unused */
  piecesPerPerson: z.number().optional(),
  sections: z.array(z.strictObject({
    _id: z.string(),
    name: z.string(),
    sortOrder: z.number(),
    items: z.array(z.strictObject({
      recipeId: z.string(),
      recipeType: z.enum(['dish', 'preparation']),
      /** @deprecated legacy since plan 440, unused */
      predictedTakeRate: z.number().optional(),
      derivedPortions: z.number(),
      sellPrice: z.number().optional(),
      foodCostOverride: z.number().optional(),
      /** @deprecated replaced by portionsPerDiner (plan 440); read only as a fallback */
      servingPortions: z.number().optional(),
      portionsPerDiner: z.number().min(0).optional(),
      coefficientOverride: coefficientSchema.optional()
    }))
  })),
  /** Plan 445 (money field, plan 427): the price per guest quoted to the client. Empty = computed from dish sell prices. */
  pricePerGuest: z.number().min(0).optional(),
  /** Plan 445 (money field): costs beyond food (staff, transport). */
  extraCosts: z.strictObject({
    amount: z.number().min(0),
    note: z.string().max(200).optional()
  }).optional(),
  /** Plan 445 (money field): this event's own target and margin; the business settings stay untouched. */
  targetsOverride: z.strictObject({
    profitTargetPct: pctBelow100.optional(),
    safetyMarginPct: pctBelow100.optional()
  }).optional(),
  /** Plan 445: derived cache written by the client on every save (not a money field). */
  pricing: z.strictObject({
    foodCost: z.number(),
    revenue: z.number(),
    profit: z.number(),
    profitPct: z.number().nullable(),
    partial: z.boolean(),
    computedAt: z.number()
  }).optional(),
  /** @deprecated legacy since plan 445: no longer written */
  financialTargets: z.strictObject({
    targetFoodCostPct: z.number(),
    targetRevenuePerGuest: z.number().optional()
  }).optional(),
  performanceTags: z.strictObject({
    foodCostPct: z.number(),
    primaryServingStyle: z.string()
  }).optional(),
  cuisineTags: z.array(z.string()).optional(),
  createdFromTemplateId: z.string().optional(),
  logistics: eventLogisticsSchema.optional(),
  /** Plan 442: pipeline stage; optional only so events not yet migrated still validate. Server-owned. */
  stage: z.enum(EVENT_STAGES).optional(),
  stageHistory: z.array(z.strictObject({
    stage: z.enum(EVENT_STAGES),
    at: z.number(),
    by: z.string(),
    byName: z.string(),
    reason: z.enum(NOT_CLOSED_REASONS).optional(),
    reasonText: z.string().max(NOTE_MAX_LENGTH).optional()
  })).optional(),
  closedAt: z.number().optional(),
  notClosedAt: z.number().optional(),
  notClosedReason: z.enum(NOT_CLOSED_REASONS).optional(),
  notClosedText: z.string().max(NOTE_MAX_LENGTH).optional(),
  legacy: z.boolean().optional(),
  notes: z.array(z.strictObject({
    _id: z.string(),
    text: z.string().min(1).max(NOTE_MAX_LENGTH),
    at: z.number(),
    by: z.string(),
    byName: z.string(),
    editedAt: z.number().optional()
  })).optional(),
  /** Plan 446: the planning snapshot; refreshed by saves until "ביצוע", then frozen by the server. */
  planSnapshot: planSnapshotSchema.optional(),
  /** Plan 446 (money fields): what each supplier was really paid. Server-owned (events router). */
  closing: closingSchema.optional(),
  clientName: nameField.optional(),
  clientPhone: z.string().max(30).optional(),
  deposit: z.strictObject({
    amount: z.number().min(0).optional(),
    date: z.string().optional()
  }).optional(),
  _masterId: z.string().optional(),
  _userModified: z.boolean().optional()
})
