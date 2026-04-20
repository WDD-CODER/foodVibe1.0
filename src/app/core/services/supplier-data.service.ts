import { Injectable, Signal } from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
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
    try {
      return this.storage.get<Supplier>(ENTITY, _id)
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.supplier.get_error', message: 'Failed to get supplier', context: { err } })
      throw err
    }
  }

  async addSupplier(newSupplier: Omit<Supplier, '_id'>): Promise<Supplier> {
    try {
      const saved = await this.storage.post<Supplier>(ENTITY, newSupplier as Supplier)
      this.updateItems(suppliers => [...suppliers, saved])
      this.logging.info({ event: 'crud.supplier.create', message: 'Supplier created', context: { entityType: ENTITY, id: saved._id } })
      return saved
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.supplier.create_error', message: 'Failed to add supplier', context: { err } })
      throw err
    }
  }

  async updateSupplier(supplier: Supplier): Promise<Supplier> {
    try {
      const updated = await this.storage.put<Supplier>(ENTITY, supplier)
      this.updateItems(suppliers => suppliers.map(s => s._id === updated._id ? updated : s))
      this.logging.info({ event: 'crud.supplier.update', message: 'Supplier updated', context: { entityType: ENTITY, id: updated._id } })
      return updated
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.supplier.update_error', message: 'Failed to update supplier', context: { err } })
      throw err
    }
  }

  async removeSupplier(_id: string): Promise<void> {
    try {
      await this.storage.remove(ENTITY, _id)
      this.updateItems(suppliers => suppliers.filter(s => s._id !== _id))
      this.logging.info({ event: 'crud.supplier.delete', message: 'Supplier removed', context: { entityType: ENTITY, id: _id } })
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.supplier.delete_error', message: 'Failed to remove supplier', context: { err } })
      throw err
    }
  }
}
