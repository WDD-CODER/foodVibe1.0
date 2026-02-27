import { Injectable, inject, signal } from '@angular/core';
import { StorageService } from './async-storage.service';
import { MenuEvent } from '@models/menu-event.model';

const ENTITY = 'MENU_EVENT_LIST';
const TRASH_KEY = 'TRASH_MENU_EVENTS';

@Injectable({ providedIn: 'root' })
export class MenuEventDataService {
  private readonly storage = inject(StorageService);

  private readonly eventsStore_ = signal<MenuEvent[]>([]);
  readonly allMenuEvents_ = this.eventsStore_.asReadonly();

  constructor() {
    this.loadInitialData();
  }

  async reloadFromStorage(): Promise<void> {
    await this.loadInitialData();
  }

  private async loadInitialData(): Promise<void> {
    const data = await this.storage.query<MenuEvent>(ENTITY);
    this.eventsStore_.set(data);
  }

  async getMenuEventById(_id: string): Promise<MenuEvent> {
    return this.storage.get<MenuEvent>(ENTITY, _id);
  }

  async addMenuEvent(newEvent: Omit<MenuEvent, '_id'>): Promise<MenuEvent> {
    const saved = await this.storage.post<MenuEvent>(ENTITY, newEvent as MenuEvent);
    this.eventsStore_.update(events => [...events, saved]);
    return saved;
  }

  async updateMenuEvent(event: MenuEvent): Promise<MenuEvent> {
    const updated = await this.storage.put<MenuEvent>(ENTITY, event);
    this.eventsStore_.update(events => events.map(e => (e._id === updated._id ? updated : e)));
    return updated;
  }

  async deleteMenuEvent(_id: string): Promise<void> {
    const item = await this.storage.get<MenuEvent>(ENTITY, _id);
    const withDeleted = { ...item, deletedAt: Date.now() } as MenuEvent & { deletedAt: number };
    await this.storage.appendExisting(TRASH_KEY, withDeleted);
    await this.storage.remove(ENTITY, _id);
    this.eventsStore_.update(events => events.filter(e => e._id !== _id));
  }

  async cloneMenuEventAsNew(_id: string): Promise<MenuEvent> {
    const source = await this.getMenuEventById(_id);
    const { _id: _, ...rest } = source;
    const cloned: Omit<MenuEvent, '_id'> = {
      ...rest,
      name_: `${source.name_} (Copy)`,
      created_from_template_id_: source._id,
    };
    return this.addMenuEvent(cloned);
  }
}
