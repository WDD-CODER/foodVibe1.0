import { Injectable, signal } from '@angular/core'
import { ModalController } from './modal-controller'

export interface AddItemConfig {
  title: string
  label: string
  placeholder?: string
  saveLabel: string
  /** Prefill for the name field — the name the user typed in the dropdown (add-option rule W). */
  initialValue?: string
}

@Injectable({ providedIn: 'root' })
export class AddItemModalService {
  private readonly controller_ = new ModalController<string | null>(null)
  private readonly config_ = signal<AddItemConfig | null>(null)

  readonly isOpen_ = this.controller_.isOpen_
  readonly config = this.config_.asReadonly()

  open(config: AddItemConfig): Promise<string | null> {
    this.config_.set(config)
    return this.controller_.open()
  }

  save(value: string): void {
    const trimmed = value.trim()
    if (!trimmed) return
    this.close(trimmed)
  }

  cancel(): void {
    this.close(null)
  }

  private close(result: string | null): void {
    this.controller_.close(result)
    this.config_.set(null)
  }
}
