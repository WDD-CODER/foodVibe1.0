import { z } from 'zod'
import { baseDocShape, nameField } from '../base.schema'
import { floorKeyField } from './floor-plan.schema'

/** Plan 549 (C-REQUEST): a booking is the calendar record of an approved table, tasting or consultation. */
export const BOOKING_KINDS = ['table', 'tasting', 'consultation'] as const
export const BOOKING_STATUSES = ['confirmed', 'seated', 'finished', 'no_show', 'cancelled'] as const
export const BOOKING_SOURCES = ['request', 'phone', 'walk_in', 'whatsapp', 'google', 'ai'] as const
/** Fields only the server writes. Plan 662 (C-BOOK2): the eight table-service fields after `publicToken`. */
export const BOOKING_SERVER_FIELDS = [
  'status',
  'statusHistory',
  'source',
  'startAt',
  'endAt',
  'publicToken',
  'tableKeys',
  'areaKey',
  'seatedAt',
  'finishedAt',
  'remindedAt',
  'guestConfirmedAt',
  'override',
  'test'
] as const

export type BookingKind = (typeof BOOKING_KINDS)[number]
export type BookingStatus = (typeof BOOKING_STATUSES)[number]
export type BookingSource = (typeof BOOKING_SOURCES)[number]

export const bookingSchema = z
  .strictObject({
    ...baseDocShape,
    kind: z.enum(BOOKING_KINDS),
    status: z.enum(BOOKING_STATUSES),
    source: z.enum(BOOKING_SOURCES),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    time: z.string().regex(/^\d{2}:\d{2}$/),
    startAt: z.number(),
    endAt: z.number(),
    durationMinutes: z.number().int().min(5).max(1440),
    partySize: z.number().int().min(1).max(5000),
    clientId: z.string().min(1),
    guestName: nameField,
    guestPhone: z.string().max(30),
    requestId: z.string().optional(),
    notes: z.string().max(1000).optional(),
    statusHistory: z
      .array(
        z.strictObject({
          status: z.enum(BOOKING_STATUSES),
          at: z.number(),
          by: z.string().min(1),
          byName: z.string().max(200),
          via: z.enum(['member', 'guest', 'server']),
          note: z.string().max(500).optional()
        })
      )
      .min(1),
    publicToken: z.string().min(16),
    // Plan 662 (C-BOOK2): table service, all optional and server-written.
    tableKeys: z.array(floorKeyField).min(1).max(4).optional(),
    areaKey: floorKeyField.optional(),
    seatedAt: z.number().optional(),
    finishedAt: z.number().optional(),
    remindedAt: z.number().optional(),
    guestConfirmedAt: z.number().optional(),
    override: z.literal(true).optional(),
    test: z.literal(true).optional()
  })
  .refine((b) => b.endAt === b.startAt + b.durationMinutes * 60000, {
    message: 'endAt must be startAt + durationMinutes',
    path: ['endAt']
  })
export type Booking = z.infer<typeof bookingSchema>
