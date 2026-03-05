import { Injectable, signal, inject } from '@angular/core';
import { StorageService } from './async-storage.service';
import { LoggingService } from './logging.service';
import type { BaselineEntry, LogisticsBaselineItem } from '../models/logistics.model';

const ENTITY = 'LOGISTICS_BASELINE_ITEMS';

@Injectable({ providedIn: 'root' })
export class LogisticsBaselineDataService {
  private storage = inject(StorageService);
  private logging = inject(LoggingService);

  private itemsStore_ = signal<LogisticsBaselineItem[]>([]);
  readonly allItems_ = this.itemsStore_.asReadonly();

  constructor() {
    this.loadInitialData();
  }

  async reloadFromStorage(): Promise<void> {
    await this.loadInitialData();
  }

  private async loadInitialData(): Promise<void> {
    const data = await this.storage.query<LogisticsBaselineItem>(ENTITY);
    this.itemsStore_.set(data);
  }

  async getById(_id: string): Promise<LogisticsBaselineItem> {
    return this.storage.get<LogisticsBaselineItem>(ENTITY, _id);
  }

  async add(entry: BaselineEntry): Promise<LogisticsBaselineItem> {
    const saved = await this.storage.post<LogisticsBaselineItem>(ENTITY, { ...entry } as LogisticsBaselineItem);
    this.itemsStore_.update(list => [...list, saved]);
    this.logging.info({
      event: 'crud.logistics_baseline.create',
      message: 'Logistics baseline item created',
      context: { entityType: ENTITY, id: saved._id }
    });
    return saved;
  }

  async update(item: LogisticsBaselineItem): Promise<LogisticsBaselineItem> {
    const updated = await this.storage.put<LogisticsBaselineItem>(ENTITY, item);
    this.itemsStore_.update(list =>
      list.map(i => (i._id === updated._id ? updated : i))
    );
    this.logging.info({
      event: 'crud.logistics_baseline.update',
      message: 'Logistics baseline item updated',
      context: { entityType: ENTITY, id: updated._id }
    });
    return updated;
  }

  async remove(_id: string): Promise<void> {
    await this.storage.remove(ENTITY, _id);
    this.itemsStore_.update(list => list.filter(i => i._id !== _id));
    this.logging.info({
      event: 'crud.logistics_baseline.delete',
      message: 'Logistics baseline item deleted',
      context: { entityType: ENTITY, id: _id }
    });
  }
}
