import { BOOKING_KINDS, BOOKING_SOURCES, BOOKING_STATUSES } from '@schemas/entities'
import type { Booking, BookingKind, BookingSource, BookingStatus } from '@schemas/entities'

/** Plan 549: a booking (table, tasting, consultation). Mirror of shared/schemas/entities/booking.schema.ts. */
export { BOOKING_KINDS, BOOKING_SOURCES, BOOKING_STATUSES }
export type { Booking, BookingKind, BookingSource, BookingStatus }

/** Plan 685: one start time of a day and whether a table is free for the party (GET /bookings/availability). */
export type BookingSlot = { time: string; available: boolean }
/** Plan 685: another date and time the party could be seated at, answered with a 409 NO_TABLE. */
export type BookingAlternative = { date: string; time: string }
/** Plan 685: the time range one table is held for one booking (the day read answers these). */
export type TableHoldRange = { tableKey: string; bookingId: string; startAt: number; endAt: number }
/** Plan 685: the body of POST /bookings (a phone booking): an existing client or a new guest. */
export type NewBookingInput = {
  clientId?: string
  guest?: { name: string; phone: string }
  date: string
  time: string
  partySize: number
  areaKey?: string
  tableKeys?: string[]
  notes?: string
}
/** Plan 685: the body of POST /bookings/walk-in. */
export type WalkInInput = { partySize: number; tableKeys: string[]; guest?: { name: string; phone: string } }
/** Plan 685: the body of PUT /bookings/:id/when. */
export type BookingWhenChange = { date?: string; time?: string; partySize?: number; tableKeys?: string[] }
