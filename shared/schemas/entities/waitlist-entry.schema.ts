import { z } from 'zod'
import { baseDocShape, nameField } from '../base.schema'
import { floorKeyField } from './floor-plan.schema'

/** Plan 662 (C-WAIT, shape part): one party on a day's waiting list. Read through the generic API; written by plan 673's router. */
export const WAITLIST_STATUSES = ['waiting', 'notified', 'seated', 'left', 'expired'] as const
export type WaitlistStatus = (typeof WAITLIST_STATUSES)[number]

export const waitlistEntrySchema = z.strictObject({
  ...baseDocShape,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guestName: nameField,
  guestPhone: z.string().max(30),
  clientId: z.string().min(1).optional(),
  partySize: z.number().int().min(1).max(30),
  areaKey: floorKeyField.optional(),
  quotedMinutes: z.number().int().min(0).optional(),
  status: z.enum(WAITLIST_STATUSES),
  joinedAt: z.number(),
  notifiedAt: z.number().optional(),
  bookingId: z.string().min(1).optional(),
  test: z.literal(true).optional()
})
export type WaitlistEntry = z.infer<typeof waitlistEntrySchema>
