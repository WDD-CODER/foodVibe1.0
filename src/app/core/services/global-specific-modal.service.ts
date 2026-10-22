import { Injectable, signal } from '@angular/core'
import { ModalController } from './modal-controller'

export interface GlobalSpecificModalConfig {
  preparationName: string
  mainCategory: string
  newCategory: string
}

type GlobalSpecificChoice = 'global' | 'specific' | null

@Injectable({ providedIn: 'root' })
export class GlobalSpecificModalService {
  private readonly controller_ = new ModalController<GlobalSpecificChoice>(null)
  private readonly config_ = signal<GlobalSpecificModalConfig | null>(null)

  readonly isOpen = this.controller_.isOpen_
  readonly config = this.config_.asReadonly()

  open(config: GlobalSpecificModalConfig): Promise<GlobalSpecificChoice> {
    this.config_.set(config)
    return this.controller_.open()
  }

  choose(choice: GlobalSpecificChoice): void {
    this.controller_.close(choice)
    this.config_.set(null)
  }
}
