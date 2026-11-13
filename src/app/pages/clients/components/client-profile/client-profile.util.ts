import type { Booking } from '@models/booking.model'
import type { FrontDeskRequest } from '@models/request.model'
import type { MenuEvent } from '@models/menu-event.model'

/** Plan 551: digits for `tel:` and `wa.me`: a leading `0` becomes the Israeli country code `972`. */
export function clientDialDigits(phoneNormalized: string | undefined, phone: string): string {
  const digits = (phoneNormalized || phone || '').replace(/\D/g, '')
  return digits.startsWith('0') ? `972${digits.slice(1)}` : digits
}

export type TimelineItem =
  | { kind: 'request'; id: string; at: number; request: FrontDeskRequest }
  | { kind: 'booking'; id: string; at: number; booking: Booking }
  | { kind: 'event'; id: string; at: number; event: MenuEvent }
  | { kind: 'note'; id: string; at: number; event: MenuEvent; text: string; byName: string }

/** One list, newest first: requests, bookings and events by `createdAt`, event notes by `at`. */
export function buildTimeline(
  requests: readonly FrontDeskRequest[],
  bookings: readonly Booking[],
  events: readonly MenuEvent[]
): TimelineItem[] {
  const items: TimelineItem[] = [
    ...requests.map((request): TimelineItem => ({
      kind: 'request',
      id: request._id,
      at: request.createdAt ?? 0,
      request
    })),
    ...bookings.map((booking): TimelineItem => ({
      kind: 'booking',
      id: booking._id,
      at: booking.createdAt ?? 0,
      booking
    })),
    ...events.map((event): TimelineItem => ({ kind: 'event', id: event._id, at: event.createdAt ?? 0, event })),
    ...events.flatMap((event) =>
      (event.notes ?? []).map((n): TimelineItem => ({
        kind: 'note',
        id: `${event._id}:${n._id}`,
        at: n.at,
        event,
        text: n.text,
        byName: n.byName ?? ''
      }))
    )
  ]
  return items.sort((a, b) => b.at - a.at)
}
