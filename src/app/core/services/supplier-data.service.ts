import { Injectable, signal, inject } from '@angular/core';
import { StorageService } from './async-storage.service';
import { Supplier } from '@models/supplier.model';

const ENTITY = 'KITCHEN_SUPPLIERS';

@Injectable({ providedIn: 'root' })
export class SupplierDataService {
  private storage = inject(StorageService);

  private suppliersStore_ = signal<Supplier[]>([]);
  readonly allSuppliers_ = this.suppliersStore_.asReadonly();

  constructor() {
    this.loadInitialData();
  }

  private async loadInitialData(): Promise<void> {
    const data = await this.storage.query<Supplier>(ENTITY);
    this.suppliersStore_.set(Array.isArray(data) ? data : []);
  }

  async addSupplier(newSupplier: Omit<Supplier, '_id'>): Promise<Supplier> {
    const saved = await this.storage.post<Supplier>(ENTITY, newSupplier as Supplier);
    this.suppliersStore_.update(suppliers => [...suppliers, saved]);
    return saved;
  }

  async updateSupplier(supplier: Supplier): Promise<Supplier> {
    const updated = await this.storage.put<Supplier>(ENTITY, supplier);
    this.suppliersStore_.update(suppliers =>
      suppliers.map(s => s._id === updated._id ? updated : s)
    );
    return updated;
  }

  async removeSupplier(_id: string): Promise<void> {
    await this.storage.remove(ENTITY, _id);
    this.suppliersStore_.update(suppliers => suppliers.filter(s => s._id !== _id));
  }
}
