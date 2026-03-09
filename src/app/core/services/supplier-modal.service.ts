import { Injectable, signal } from '@angular/core';
import { Supplier } from '@models/supplier.model';

@Injectable({ providedIn: 'root' })
export class SupplierModalService {
  private readonly isOpen_ = signal(false);
  private readonly editingSupplier_ = signal<Supplier | null>(null);

  readonly isOpen = this.isOpen_.asReadonly();
  readonly editingSupplier = this.editingSupplier_.asReadonly();

  openAdd(): void {
    this.editingSupplier_.set(null);
    this.isOpen_.set(true);
  }

  openEdit(supplier: Supplier): void {
    this.editingSupplier_.set(supplier);
    this.isOpen_.set(true);
  }

  close(): void {
    this.isOpen_.set(false);
    this.editingSupplier_.set(null);
  }
}
