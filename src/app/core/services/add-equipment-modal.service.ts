import { Injectable, signal } from '@angular/core'
import { EquipmentCategory } from '../models/equipment.model'
import { ModalController } from './modal-controller'

interface AddEquipmentResult {
  name: string
  category: EquipmentCategory
}

@Injectable({ providedIn: 'root' })
export class AddEquipmentModalService {
  private readonly controller_ = new ModalController<AddEquipmentResult | null>(null)

  private readonly initialName_ = signal('')
  readonly isOpen_ = this.controller_.isOpen_
  /** Initial name to pre-fill when opening (e.g. from logistics search). */
  readonly initialName = this.initialName_.asReadonly()

  open(initialName?: string): Promise<AddEquipmentResult | null> {
    this.initialName_.set(initialName?.trim() ?? '')
    return this.controller_.open()
  }

  save(result: AddEquipmentResult): void {
    this.close(result)
  }

  cancel(): void {
    this.close(null)
  }

  private close(result: AddEquipmentResult | null): void {
    this.controller_.close(result)
    this.initialName_.set('')
  }
}
