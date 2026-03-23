import { Injectable, Signal, inject } from '@angular/core'
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
    return this.storage.get<VenueProfile>(ENTITY, _id);
  }

  async addVenue(newItem: Omit<VenueProfile, '_id'>): Promise<VenueProfile> {
    const now = new Date().toISOString()
    const withTimestamp = {
      ...newItem,
      created_at_: newItem.created_at_ ?? now,
    }
    const saved = await this.storage.post<VenueProfile>(ENTITY, withTimestamp as VenueProfile)
    this.updateItems(list => [...list, saved])
    this.logging.info({ event: 'crud.venue.create', message: 'Venue created', context: { entityType: ENTITY, id: saved._id } })
    return saved
  }

  async updateVenue(item: VenueProfile): Promise<VenueProfile> {
    const result = await this.storage.put<VenueProfile>(ENTITY, item)
    this.updateItems(list => list.map(v => (v._id === result._id ? result : v)))
    this.logging.info({ event: 'crud.venue.update', message: 'Venue updated', context: { entityType: ENTITY, id: result._id } })
    return result
  }

  async deleteVenue(_id: string): Promise<void> {
    const item = await this.storage.get<VenueProfile>(ENTITY, _id)
    const withDeleted = { ...item, deletedAt: Date.now() } as VenueProfile & { deletedAt: number }
    await this.storage.appendExisting(TRASH_KEY, withDeleted)
    await this.storage.remove(ENTITY, _id)
    this.updateItems(list => list.filter(v => v._id !== _id))
    this.logging.info({ event: 'crud.venue.delete', message: 'Venue deleted', context: { entityType: ENTITY, id: _id } })
  }

  async getTrashVenues(): Promise<(VenueProfile & { deletedAt: number })[]> {
    return this.storage.query<VenueProfile & { deletedAt: number }>(TRASH_KEY, 0);
  }

  async restoreVenue(_id: string): Promise<VenueProfile> {
    const trash = await this.storage.query<VenueProfile & { deletedAt: number }>(TRASH_KEY, 0);
    const found = trash.find(v => v._id === _id);
    if (!found) throw new Error(`Venue ${_id} not found in trash`);
    const { deletedAt: _, ...item } = found;
    const rest = trash.filter(v => v._id !== _id);
    await this.storage.replaceAll(TRASH_KEY, rest);
    await this.storage.appendExisting(ENTITY, item);
    this.updateItems(list => [...list, item]);
    return item;
  }
}
