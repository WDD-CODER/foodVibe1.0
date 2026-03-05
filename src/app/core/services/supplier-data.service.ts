import { Injectable, signal, inject } from '@angular/core'
import { StorageService } from './async-storage.service'
import { LoggingService } from './logging.service'
import { Supplier } from '@models/supplier.model'

const ENTITY = 'KITCHEN_SUPPLIERS'

@Injectable({ providedIn: 'root' })
export class SupplierDataService {
  private storage = inject(StorageService)
  private logging = inject(LoggingService)

  private suppliersStore_ = signal<Supplier[]>([]);
  readonly allSuppliers_ = this.suppliersStore_.asReadonly();

  constructor() {
    this.loadInitialData();
  }

  /** Re-read from storage and refresh the signal. Used by demo loader after replacing data. */
  async reloadFromStorage(): Promise<void> {
    await this.loadInitialData();
  }

  private async loadInitialData(): Promise<void> {
    const data = await this.storage.query<Supplier>(ENTITY);
    this.suppliersStore_.set(Array.isArray(data) ? data : []);
  }

  async getSupplierById(_id: string): Promise<Supplier> {
    return this.storage.get<Supplier>(ENTITY, _id);
  }

  async addSupplier(newSupplier: Omit<Supplier, '_id'>): Promise<Supplier> {
    const saved = await this.storage.post<Supplier>(ENTITY, newSupplier as Supplier)
    this.suppliersStore_.update(suppliers => [...suppliers, saved])
    this.logging.info({ event: 'crud.supplier.create', message: 'Supplier created', context: { entityType: ENTITY, id: saved._id } })
    return saved
  }

  async updateSupplier(supplier: Supplier): Promise<Supplier> {
    const updated = await this.storage.put<Supplier>(ENTITY, supplier)
    this.suppliersStore_.update(suppliers =>
      suppliers.map(s => s._id === updated._id ? updated : s)
    )
    this.logging.info({ event: 'crud.supplier.update', message: 'Supplier updated', context: { entityType: ENTITY, id: updated._id } })
    return updated
  }

  async removeSupplier(_id: string): Promise<void> {
    await this.storage.remove(ENTITY, _id)
    this.suppliersStore_.update(suppliers => suppliers.filter(s => s._id !== _id))
    this.logging.info({ event: 'crud.supplier.delete', message: 'Supplier removed', context: { entityType: ENTITY, id: _id } })
  }
}
