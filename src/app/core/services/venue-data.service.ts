import { Injectable, Signal, inject } from '@angular/core'
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http'
import { firstValueFrom } from 'rxjs'
import { VenueProfile } from '../models/venue.model'
import { BaseEntityDataService } from './base-entity-data.service'
import { environment } from '../../../environments/environment'

const ENTITY = 'venues'
/** Plan 373 (Human 2026-11-23): the server turns a saved spot into a street address (OpenStreetMap). */
const REVERSE_GEOCODE_URL = `${environment.apiUrl}/api/v1/geocode/reverse`

@Injectable({ providedIn: 'root' })
export class VenueDataService extends BaseEntityDataService<VenueProfile> {
  /** Domain alias for the base-class signal. */
  readonly allVenues_: Signal<VenueProfile[]> = this.all_
  private readonly http_ = inject(HttpClient)

  constructor() {
    super(ENTITY, false)
  }

  /** Plan 373: the street address of a spot, or null when none is found or the lookup fails (never throws). */
  async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    try {
      const params = new HttpParams().set('lat', String(lat)).set('lng', String(lng))
      const res = await firstValueFrom(this.http_.get<{ address: string | null }>(REVERSE_GEOCODE_URL, { params }))
      return typeof res?.address === 'string' && res.address.trim() ? res.address.trim() : null
    } catch (err) {
      this.logging.warn({ event: 'venue.reverse_geocode_failed', message: 'Address lookup failed', context: { err } })
      return null
    }
  }

  async getVenueById(_id: string): Promise<VenueProfile> {
    try {
      return this.storage.get<VenueProfile>(ENTITY, _id)
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.venue.get_error', message: 'Failed to get venue', context: { err } })
      throw err
    }
  }

  async addVenue(newItem: Omit<VenueProfile, '_id'>): Promise<VenueProfile> {
    try {
      const now = Date.now()
      const withTimestamp = {
        ...newItem,
        createdAt: newItem.createdAt ?? now
      }
      const saved = await this.storage.post<VenueProfile>(ENTITY, withTimestamp as VenueProfile)
      this.updateItems((list) => [...list, saved])
      this.logging.info({
        event: 'crud.venue.create',
        message: 'Venue created',
        context: { entityType: ENTITY, id: saved._id }
      })
      return saved
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.venue.create_error', message: 'Failed to add venue', context: { err } })
      throw err
    }
  }

  async updateVenue(item: VenueProfile): Promise<VenueProfile> {
    try {
      const result = await this.storage.put<VenueProfile>(ENTITY, item)
      this.updateItems((list) => list.map((v) => (v._id === result._id ? result : v)))
      this.logging.info({
        event: 'crud.venue.update',
        message: 'Venue updated',
        context: { entityType: ENTITY, id: result._id }
      })
      return result
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.venue.update_error', message: 'Failed to update venue', context: { err } })
      throw err
    }
  }

  async deleteVenue(_id: string): Promise<void> {
    try {
      // Plan 407: the server stamps deletedAt; the item now sits in Trash.
      await this.storage.remove(ENTITY, _id)
      this.updateItems((list) => list.filter((v) => v._id !== _id))
      this.logging.info({
        event: 'crud.venue.delete',
        message: 'Venue deleted',
        context: { entityType: ENTITY, id: _id }
      })
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.venue.delete_error', message: 'Failed to delete venue', context: { err } })
      throw err
    }
  }
}
