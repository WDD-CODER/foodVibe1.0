import { Injectable, signal } from '@angular/core'
import { Product } from '../models/product.model'
import { ModalController } from './modal-controller'

interface QuickAddProductConfig {
  prefillName: string
}

@Injectable({ providedIn: 'root' })
export class QuickAddProductModalService {
  private readonly controller_ = new ModalController<Product | null>(null)
  private readonly config_ = signal<QuickAddProductConfig | null>(null)

  readonly isOpen_ = this.controller_.isOpen_
  readonly config = this.config_.asReadonly()

  open(config: QuickAddProductConfig): Promise<Product | null> {
    this.config_.set(config)
    return this.controller_.open()
  }

  save(product: Product): void {
    this.close(product)
  }

  cancel(): void {
    this.close(null)
  }

  private close(result: Product | null): void {
    this.controller_.close(result)
    this.config_.set(null)
  }
}
