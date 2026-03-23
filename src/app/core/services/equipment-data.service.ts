import { Injectable, Signal, inject } from '@angular/core'
import { StorageService } from './async-storage.service'
import { LoggingService } from './logging.service'
import { Equipment } from '../models/equipment.model'
import { BaseEntityDataService } from './base-entity-data.service'

const ENTITY = 'EQUIPMENT_LIST'
const TRASH_KEY = 'TRASH_EQUIPMENT'

/** Thrown when add/update would create a duplicate equipment name. */
export const ERR_DUPLICATE_EQUIPMENT_NAME = 'DUPLICATE_EQUIPMENT_NAME'

@Injectable({ providedIn: 'root' })
export class EquipmentDataService extends BaseEntityDataService<Equipment> {
  /** Domain alias for the base-class signal. */
  readonly allEquipment_: Signal<Equipment[]> = this.all_

  constructor() {
    super(ENTITY)
  }

  async getEquipmentById(_id: string): Promise<Equipment> {
    return this.storage.get<Equipment>(ENTITY, _id);
  }

  async addEquipment(newItem: Omit<Equipment, '_id'>): Promise<Equipment> {
    const name = (newItem.name_hebrew ?? '').trim()
    if (name && this.currentItems().some(e => (e.name_hebrew ?? '').trim() === name)) {
      throw new Error(ERR_DUPLICATE_EQUIPMENT_NAME)
    }
    const now = new Date().toISOString()
    const withTimestamps = {
      ...newItem,
      created_at_: newItem.created_at_ ?? now,
      updated_at_: now,
    }
    const saved = await this.storage.post<Equipment>(ENTITY, withTimestamps as Equipment)
    this.updateItems(list => [...list, saved])
    this.logging.info({ event: 'crud.equipment.create', message: 'Equipment created', context: { entityType: ENTITY, id: saved._id } })
    return saved
  }

  async updateEquipment(item: Equipment): Promise<Equipment> {
    const name = (item.name_hebrew ?? '').trim()
    if (name && this.currentItems().some(e => e._id !== item._id && (e.name_hebrew ?? '').trim() === name)) {
      throw new Error(ERR_DUPLICATE_EQUIPMENT_NAME)
    }
    const updated = {
      ...item,
      updated_at_: new Date().toISOString(),
    }
    const result = await this.storage.put<Equipment>(ENTITY, updated)
    this.updateItems(list => list.map(e => (e._id === result._id ? result : e)))
    this.logging.info({ event: 'crud.equipment.update', message: 'Equipment updated', context: { entityType: ENTITY, id: result._id } })
    return result
  }

  async deleteEquipment(_id: string): Promise<void> {
    const item = await this.storage.get<Equipment>(ENTITY, _id)
    const withDeleted = { ...item, deletedAt: Date.now() } as Equipment & { deletedAt: number }
    await this.storage.appendExisting(TRASH_KEY, withDeleted)
    await this.storage.remove(ENTITY, _id)
    this.updateItems(list => list.filter(e => e._id !== _id))
    this.logging.info({ event: 'crud.equipment.delete', message: 'Equipment deleted', context: { entityType: ENTITY, id: _id } })
  }

  async getTrashEquipment(): Promise<(Equipment & { deletedAt: number })[]> {
    return this.storage.query<Equipment & { deletedAt: number }>(TRASH_KEY, 0);
  }

  async restoreEquipment(_id: string): Promise<Equipment> {
    const trash = await this.storage.query<Equipment & { deletedAt: number }>(TRASH_KEY, 0);
    const found = trash.find(e => e._id === _id);
    if (!found) throw new Error(`Equipment ${_id} not found in trash`);
    const { deletedAt: _, ...item } = found;
    const rest = trash.filter(e => e._id !== _id);
    await this.storage.replaceAll(TRASH_KEY, rest);
    await this.storage.appendExisting(ENTITY, item);
    this.updateItems(list => [...list, item]);
    return item;
  }
}
