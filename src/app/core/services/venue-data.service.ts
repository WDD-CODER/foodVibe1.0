import { Injectable, Signal } from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import { VenueProfile } from '../models/venue.model'
import { BaseEntityDataService } from './base-entity-data.service'

const ENTITY = 'venues'

@Injectable({ providedIn: 'root' })
export class VenueDataService extends BaseEntityDataService<VenueProfile> {
  /** Domain alias for the base-class signal. */
  readonly allVenues_: Signal<VenueProfile[]> = this.all_

  constructor() {
    super(ENTITY, false)
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
