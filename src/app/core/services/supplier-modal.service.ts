import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SupplierModalService {
  private readonly isOpen_ = signal(false);

  readonly isOpen = this.isOpen_.asReadonly();

  openAdd(): void {
    this.isOpen_.set(true);
  }

  close(): void {
    this.isOpen_.set(false);
  }
}
