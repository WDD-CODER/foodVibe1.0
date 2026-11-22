import { inject, Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { firstValueFrom, Observable } from 'rxjs'
import { environment } from '../../../environments/environment'
import { API } from './http-storage.adapter'
import { BaseEntityDataService } from './base-entity-data.service'
import type {
  Booking,
  BookingAlternative,
  BookingSlot,
  BookingStatus,
  BookingWhenChange,
  NewBookingInput,
  TableHoldRange,
  WalkInInput
} from '@models/booking.model'

const BOOKINGS_URL = `${environment.apiUrl}${API.bookings}`

/** What one day holds (plan 550): its non-cancelled bookings by start time, and the covers per start hour ("19": 10). */
export type DayLoad = {
  bookings: Booking[]
  coversByHour: Record<string, number>
  /** Plan 685: with `tables` on — the held ranges, the booking ids with no table, and the server's clock. */
  holds?: TableHoldRange[]
  unassigned?: string[]
  now?: number
}

/** The stored booking (already in the store), or the server's error code (null when there was none). */
export type BookingResult =
  | { ok: true; booking: Booking }
  | { ok: false; code: string | null; reason?: string; alternatives?: BookingAlternative[] }

/**
 * Plan 549: bookings. Reads come through the generic API; every status move goes to `API.bookings`, which stamps the
 * actor and the history. Error codes (BAD_STATUS, STATUS_CHANGED ...) are returned as codes.
 */
@Injectable({ providedIn: 'root' })
export class BookingDataService extends BaseEntityDataService<Booking> {
  private readonly http = inject(HttpClient)

  constructor() {
    super('bookings', false, {
      errorEvent: 'crud.bookings.hydrate_error',
      errorMessage: 'Failed to load the bookings',
      clearOnReload: true
    })
  }

  /** Plan 550: the day's bookings and covers per hour, shown beside a request being approved. Not kept in the store. */
  async day(date: string): Promise<DayLoad | null> {
    try {
      return await firstValueFrom(this.http.get<DayLoad>(`${BOOKINGS_URL}/day`, { params: { date } }))
    } catch (err) {
      const status = (err as { status?: number }).status
      this.logging[status !== undefined && status >= 400 && status < 500 ? 'warn' : 'error']({
        event: 'bookings.day_failed',
        message: 'Booking day load failed',
        context: { status: String(status ?? '') }
      })
      return null
    }
  }

  /** Plan 550: puts a booking the server created (an approved request) into the store. */
  addServerCreated(booking: Booking): void {
    this.updateItems((items) => (items.some((b) => b._id === booking._id) ? items : [...items, booking]))
  }

  /** Plan 685: the day's start times with whether a table is free for the party. Not kept in the store. */
  async availability(date: string, partySize: number, area?: string): Promise<BookingSlot[] | null> {
    try {
      const params: Record<string, string> = { date, partySize: String(partySize), ...(area && { area }) }
      const res = await firstValueFrom(
        this.http.get<{ slots: BookingSlot[] }>(`${BOOKINGS_URL}/availability`, { params })
      )
      return res.slots
    } catch (err) {
      const status = (err as { status?: number }).status
      this.logging[status !== undefined && status >= 400 && status < 500 ? 'warn' : 'error']({
        event: 'bookings.availability_failed',
        message: 'Booking availability load failed',
        context: { status: String(status ?? '') }
      })
      return null
    }
  }

  /** Plan 685: a phone booking on a held table. */
  create(input: NewBookingInput): Promise<BookingResult> {
    return this.run('create', () => this.http.post<Booking>(BOOKINGS_URL, input))
  }

  /** Plan 685: seats a party now on the chosen tables. */
  walkIn(input: WalkInInput): Promise<BookingResult> {
    return this.run('walk_in', () => this.http.post<Booking>(`${BOOKINGS_URL}/walk-in`, input))
  }

  /** Plan 685: moves a booking to other tables. */
  setTables(id: string, tableKeys: string[]): Promise<BookingResult> {
    return this.run('tables', () => this.http.put<Booking>(`${BOOKINGS_URL}/${id}/tables`, { tableKeys }))
  }

  /** Plan 685: changes a booking's date, time, party or tables. */
  setWhen(id: string, change: BookingWhenChange): Promise<BookingResult> {
    return this.run('when', () => this.http.put<Booking>(`${BOOKINGS_URL}/${id}/when`, change))
  }

  setStatus(id: string, status: BookingStatus, note?: string): Promise<BookingResult> {
    return this.run('status', () =>
      this.http.put<Booking>(`${BOOKINGS_URL}/${id}/status`, note ? { status, note } : { status })
    )
  }

  private async run(name: string, call: () => Observable<Booking>): Promise<BookingResult> {
    try {
      const saved = await firstValueFrom(call())
      this.updateItems((items) =>
        items.some((b) => b._id === saved._id) ? items.map((b) => (b._id === saved._id ? saved : b)) : [...items, saved]
      )
      return { ok: true, booking: saved }
    } catch (err) {
      const status = (err as { status?: number }).status
      const body = (err as { error?: { error?: string; reason?: string; alternatives?: BookingAlternative[] } }).error
      const code = body?.error ?? null
      const refused = status !== undefined && status >= 400 && status < 500
      this.logging[refused ? 'warn' : 'error']({
        event: `bookings.${name}_${refused ? 'refused' : 'failed'}`,
        message: 'Booking call failed',
        context: { status: String(status ?? ''), code: code ?? '' }
      })
      return {
        ok: false,
        code,
        ...(body?.reason !== undefined && { reason: body.reason }),
        ...(body?.alternatives !== undefined && { alternatives: body.alternatives })
      }
    }
  }
}
