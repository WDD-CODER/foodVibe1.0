import { Injectable, Signal, inject } from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import { StorageService } from './async-storage.service'
import { LoggingService } from './logging.service'
import { VenueProfile } from '../models/venue.model'
import { BaseEntityDataService } from './base-entity-data.service'

const ENTITY = 'VENUE_PROFILES'
const TRASH_KEY = 'TRASH_VENUES'

@Injectable({ providedIn: 'root' })
export class VenueDataService extends BaseEntityDataService<VenueProfile> {
  /** Domain alias for the base-class signal. */
  readonly allVenues_: Signal<VenueProfile[]> = this.all_

  constructor() {
    super(ENTITY)
  }

  async getVenueById(_id: string): Promise<VenueProfile> {
    try {
      return this.storage.get<VenueProfile>(ENTITY, _id);
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.venue.get_error', message: 'Failed to get venue', context: { err } })
      throw err
    }
  }

  async addVenue(newItem: Omit<VenueProfile, '_id'>): Promise<VenueProfile> {
    try {
      const now = new Date().toISOString()
      const withTimestamp = {
        ...newItem,
        created_at_: newItem.created_at_ ?? now,
      }
      const saved = await this.storage.post<VenueProfile>(ENTITY, withTimestamp as VenueProfile)
      this.updateItems(list => [...list, saved])
      this.logging.info({ event: 'crud.venue.create', message: 'Venue created', context: { entityType: ENTITY, id: saved._id } })
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
      this.updateItems(list => list.map(v => (v._id === result._id ? result : v)))
      this.logging.info({ event: 'crud.venue.update', message: 'Venue updated', context: { entityType: ENTITY, id: result._id } })
      return result
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.venue.update_error', message: 'Failed to update venue', context: { err } })
      throw err
    }
  }

  async deleteVenue(_id: string): Promise<void> {
    try {
      const item = await this.storage.get<VenueProfile>(ENTITY, _id)
      const withDeleted = { ...item, deletedAt: Date.now() } as VenueProfile & { deletedAt: number }
      await this.storage.appendExisting(TRASH_KEY, withDeleted)
      await this.storage.remove(ENTITY, _id)
      this.updateItems(list => list.filter(v => v._id !== _id))
      this.logging.info({ event: 'crud.venue.delete', message: 'Venue deleted', context: { entityType: ENTITY, id: _id } })
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.venue.delete_error', message: 'Failed to delete venue', context: { err } })
      throw err
    }
  }

  async getTrashVenues(): Promise<(VenueProfile & { deletedAt: number })[]> {
    try {
      return this.storage.query<VenueProfile & { deletedAt: number }>(TRASH_KEY, 0);
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.venue.getTrash_error', message: 'Failed to get trash venues', context: { err } })
      throw err
    }
  }

  async restoreVenue(_id: string): Promise<VenueProfile> {
    try {
      const trash = await this.storage.query<VenueProfile & { deletedAt: number }>(TRASH_KEY, 0);
      const found = trash.find(v => v._id === _id);
      if (!found) throw new Error(`Venue ${_id} not found in trash`);
      const { deletedAt: _, ...item } = found;
      const rest = trash.filter(v => v._id !== _id);
      await this.storage.replaceAll(TRASH_KEY, rest);
      await this.storage.appendExisting(ENTITY, item);
      this.updateItems(list => [...list, item]);
      return item;
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.venue.restore_error', message: 'Failed to restore venue', context: { err } })
      throw err
    }
  }
}
