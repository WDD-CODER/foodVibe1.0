import { Injectable, signal } from '@angular/core'
import { Product } from '@models/product.model'
import { ModalController } from './modal-controller'

export interface QuickEditProductConfig {
  product: Product
  tier: 'invalid' | 'incomplete'
}

@Injectable({ providedIn: 'root' })
export class QuickEditProductModalService {
  private readonly controller_ = new ModalController<void>(undefined)
  private readonly config_ = signal<QuickEditProductConfig | null>(null)

  readonly isOpen_ = this.controller_.isOpen_
  readonly config = this.config_.asReadonly()

  open(config: QuickEditProductConfig): Promise<void> {
    this.config_.set(config)
    return this.controller_.open()
  }

  save(): void {
    this.close()
  }

  cancel(): void {
    this.close()
  }

  private close(): void {
    this.controller_.close()
    this.config_.set(null)
  }
}
