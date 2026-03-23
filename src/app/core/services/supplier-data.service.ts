import { Injectable, Signal, inject } from '@angular/core'
import { StorageService } from './async-storage.service'
import { LoggingService } from './logging.service'
import { Supplier } from '@models/supplier.model'
import { BaseEntityDataService } from './base-entity-data.service'

const ENTITY = 'KITCHEN_SUPPLIERS'

@Injectable({ providedIn: 'root' })
export class SupplierDataService extends BaseEntityDataService<Supplier> {
  /** Domain alias for the base-class signal. */
  readonly allSuppliers_: Signal<Supplier[]> = this.all_

  constructor() {
    super(ENTITY)
  }

  async getSupplierById(_id: string): Promise<Supplier> {
    return this.storage.get<Supplier>(ENTITY, _id);
  }

  async addSupplier(newSupplier: Omit<Supplier, '_id'>): Promise<Supplier> {
    const saved = await this.storage.post<Supplier>(ENTITY, newSupplier as Supplier)
    this.updateItems(suppliers => [...suppliers, saved])
    this.logging.info({ event: 'crud.supplier.create', message: 'Supplier created', context: { entityType: ENTITY, id: saved._id } })
    return saved
  }

  async updateSupplier(supplier: Supplier): Promise<Supplier> {
    const updated = await this.storage.put<Supplier>(ENTITY, supplier)
    this.updateItems(suppliers => suppliers.map(s => s._id === updated._id ? updated : s))
    this.logging.info({ event: 'crud.supplier.update', message: 'Supplier updated', context: { entityType: ENTITY, id: updated._id } })
    return updated
  }

  async removeSupplier(_id: string): Promise<void> {
    await this.storage.remove(ENTITY, _id)
    this.updateItems(suppliers => suppliers.filter(s => s._id !== _id))
    this.logging.info({ event: 'crud.supplier.delete', message: 'Supplier removed', context: { entityType: ENTITY, id: _id } })
  }
}
