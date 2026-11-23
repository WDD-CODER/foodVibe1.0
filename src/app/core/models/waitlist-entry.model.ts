import { WAITLIST_STATUSES } from '@schemas/entities'
import type { WaitlistEntry, WaitlistStatus } from '@schemas/entities'

/** Plan 673: one party on a day's waiting list. Mirror of shared/schemas/entities/waitlist-entry.schema.ts. */
export { WAITLIST_STATUSES }
export type { WaitlistEntry, WaitlistStatus }

/** Plan 673: the body of POST /waitlist (the server stamps the rest). */
export type NewWaitlistInput = {
  date: string
  guestName: string
  guestPhone: string
  partySize: number
  areaKey?: string
  quotedMinutes?: number
}
