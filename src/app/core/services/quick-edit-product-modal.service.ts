import { Injectable, signal } from '@angular/core';
import { Subject, firstValueFrom } from 'rxjs';
import { Product } from '@models/product.model';

export interface QuickEditProductConfig {
  product: Product;
  tier: 'invalid' | 'incomplete';
}

@Injectable({ providedIn: 'root' })
export class QuickEditProductModalService {
  private readonly resultSubject = new Subject<void>();
  private readonly config_ = signal<QuickEditProductConfig | null>(null);

  readonly isOpen_ = signal(false);
  readonly config = this.config_.asReadonly();

  open(config: QuickEditProductConfig): Promise<void> {
    this.config_.set(config);
    this.isOpen_.set(true);
    return firstValueFrom(this.resultSubject);
  }

  save(): void {
    this.resultSubject.next();
    this.close();
  }

  cancel(): void {
    this.resultSubject.next();
    this.close();
  }

  private close(): void {
    this.isOpen_.set(false);
    this.config_.set(null);
  }
}
