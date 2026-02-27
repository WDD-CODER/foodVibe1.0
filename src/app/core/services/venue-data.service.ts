import { Injectable, signal, inject } from '@angular/core';
import { StorageService } from './async-storage.service';
import { VenueProfile } from '../models/venue.model';

const ENTITY = 'VENUE_PROFILES';
const TRASH_KEY = 'TRASH_VENUES';

@Injectable({ providedIn: 'root' })
export class VenueDataService {
  private storage = inject(StorageService);

  private venueStore_ = signal<VenueProfile[]>([]);
  readonly allVenues_ = this.venueStore_.asReadonly();

  constructor() {
    this.loadInitialData();
  }

  async reloadFromStorage(): Promise<void> {
    await this.loadInitialData();
  }

  private async loadInitialData(): Promise<void> {
    const data = await this.storage.query<VenueProfile>(ENTITY);
    this.venueStore_.set(data);
  }

  async getVenueById(_id: string): Promise<VenueProfile> {
    return this.storage.get<VenueProfile>(ENTITY, _id);
  }

  async addVenue(newItem: Omit<VenueProfile, '_id'>): Promise<VenueProfile> {
    const now = new Date().toISOString();
    const withTimestamp = {
      ...newItem,
      created_at_: newItem.created_at_ ?? now,
    };
    const saved = await this.storage.post<VenueProfile>(ENTITY, withTimestamp as VenueProfile);
    this.venueStore_.update(list => [...list, saved]);
    return saved;
  }

  async updateVenue(item: VenueProfile): Promise<VenueProfile> {
    const result = await this.storage.put<VenueProfile>(ENTITY, item);
    this.venueStore_.update(list =>
      list.map(v => (v._id === result._id ? result : v))
    );
    return result;
  }

  async deleteVenue(_id: string): Promise<void> {
    const item = await this.storage.get<VenueProfile>(ENTITY, _id);
    const withDeleted = { ...item, deletedAt: Date.now() } as VenueProfile & { deletedAt: number };
    await this.storage.appendExisting(TRASH_KEY, withDeleted);
    await this.storage.remove(ENTITY, _id);
    this.venueStore_.update(list => list.filter(v => v._id !== _id));
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
    this.venueStore_.update(list => [...list, item]);
    return item;
  }
}
