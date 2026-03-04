import { Injectable, signal } from '@angular/core';
import { Subject, firstValueFrom } from 'rxjs';
import { Product } from '../models/product.model';

export interface QuickAddProductConfig {
  prefillName: string;
}

@Injectable({ providedIn: 'root' })
export class QuickAddProductModalService {
  private readonly resultSubject = new Subject<Product | null>();
  private readonly config_ = signal<QuickAddProductConfig | null>(null);

  readonly isOpen_ = signal(false);
  readonly config = this.config_.asReadonly();

  open(config: QuickAddProductConfig): Promise<Product | null> {
    this.config_.set(config);
    this.isOpen_.set(true);
    return firstValueFrom(this.resultSubject);
  }

  save(product: Product): void {
    this.resultSubject.next(product);
    this.close();
  }

  cancel(): void {
    this.resultSubject.next(null);
    this.close();
  }

  private close(): void {
    this.isOpen_.set(false);
    this.config_.set(null);
  }
}
