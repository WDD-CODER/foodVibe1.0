import { z } from 'zod'
import { baseDocShape, nameField } from '../base.schema'
import { FRONT_DESK_REQUEST_KINDS } from './front-desk-profile.schema'

/** Plan 549 (C-REQUEST): the kinds are the front desk profile's list, re-exported so the two cannot drift. */
export const REQUEST_KINDS = FRONT_DESK_REQUEST_KINDS
export const REQUEST_STATUSES = ['new', 'qualified', 'needs_info', 'approved', 'declined', 'cancelled', 'expired'] as const
export const REQUEST_CHANNELS = ['manual', 'public_form', 'whatsapp'] as const
export const DECLINE_REASONS = ['full', 'out_of_area', 'below_minimum', 'date_taken', 'other'] as const
export const REQUEST_VIA = ['member', 'guest', 'ai', 'server'] as const
/** Fields only the server writes (`decline` is written by plan 550's decline route). */
export const REQUEST_SERVER_FIELDS = [
  'status',
  'statusHistory',
  'qualification',
  'outcome',
  'publicToken',
  'channel',
  'suggested',
  'conversationId',
  'decline'
] as const

export type RequestKind = (typeof REQUEST_KINDS)[number]
export type RequestStatus = (typeof REQUEST_STATUSES)[number]
export type RequestChannel = (typeof REQUEST_CHANNELS)[number]
export type DeclineReason = (typeof DECLINE_REASONS)[number]
export type RequestVia = (typeof REQUEST_VIA)[number]

const kind = z.enum(REQUEST_KINDS)
const status = z.enum(REQUEST_STATUSES)
const via = z.enum(REQUEST_VIA)

export const wantedSchema = z.strictObject({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  partySize: z.number().int().min(1).max(5000).optional(),
  eventTypeKey: z.string().max(80).optional(),
  budgetPerGuest: z.number().min(0).optional(),
  location: z.string().max(200).optional()
})

export const requestAnswersSchema = z
  .array(z.strictObject({ questionKey: z.string().max(60), label: z.string().max(120), value: z.string().max(500) }))
  .max(30)

export const requestSchema = z.strictObject({
  ...baseDocShape,
  kind,
  status,
  channel: z.enum(REQUEST_CHANNELS),
  clientId: z.string().min(1),
  guestName: nameField,
  guestPhone: z.string().max(30),
  wanted: wantedSchema,
  answers: requestAnswersSchema,
  qualification: z
    .strictObject({
      verdict: z.enum(['fit', 'borderline', 'unfit']),
      reasons: z.array(z.string().max(80)).max(8),
      by: z.enum(['rules', 'ai', 'member'])
    })
    .optional(),
  statusHistory: z
    .array(
      z.strictObject({
        status,
        at: z.number(),
        by: z.string().min(1),
        byName: z.string().max(200),
        via,
        note: z.string().max(500).optional()
      })
    )
    .min(1),
  outcome: z.strictObject({ type: z.enum(['booking', 'menuEvent']), id: z.string() }).optional(),
  publicToken: z.string().min(16),
  conversationId: z.string().optional(),
  suggested: z
    .strictObject({ action: z.enum(['approve', 'decline', 'ask']), text: z.string().max(600).optional(), at: z.number() })
    .optional(),
  test: z.boolean().optional(),
  decline: z
    .strictObject({
      reason: z.enum(DECLINE_REASONS),
      text: z.string().max(500).optional(),
      at: z.number(),
      by: z.string().min(1)
    })
    .optional()
})
export type FrontDeskRequest = z.infer<typeof requestSchema>

/** What a member sends to record a phone request: an existing client, or a name and a phone. */
export const manualRequestInputSchema = z
  .strictObject({
    kind,
    clientId: z.string().optional(),
    guestName: nameField.min(1).optional(),
    guestPhone: z.string().min(7).max(30).optional(),
    wanted: wantedSchema,
    answers: requestAnswersSchema.default([]),
    /** Plan 556: a test request (onboarding): no client is made or touched; needs a name and a phone. */
    test: z.boolean().optional()
  })
  .refine((v) => !!v.clientId || (!!v.guestName && !!v.guestPhone), {
    message: 'clientId, or guestName and guestPhone, is required',
    path: ['clientId']
  })
  .refine((v) => !v.test || (!!v.guestName && !!v.guestPhone), {
    message: 'a test request needs guestName and guestPhone',
    path: ['guestName']
  })
export type ManualRequestInput = z.infer<typeof manualRequestInputSchema>
