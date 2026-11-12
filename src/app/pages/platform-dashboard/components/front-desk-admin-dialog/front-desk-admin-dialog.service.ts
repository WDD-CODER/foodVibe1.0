import { Injectable, signal } from '@angular/core'
import { ModalController } from '@services/modal-controller'

/** What the dialog opens on: one business's current front desk state. */
export interface FrontDeskAdminTarget {
  businessId: string
  name: string
  status: 'draft' | 'pilot' | 'active' | 'suspended'
}

/** Plan 557: opens the platform admin's front desk dialog; resolves `true` when a change was saved. */
@Injectable({ providedIn: 'root' })
export class FrontDeskAdminDialogService {
  private readonly controller_ = new ModalController<boolean>(false)
  private readonly target_ = signal<FrontDeskAdminTarget | null>(null)

  readonly isOpen_ = this.controller_.isOpen_
  readonly current_ = this.target_.asReadonly()

  open(target: FrontDeskAdminTarget): Promise<boolean> {
    this.target_.set(target)
    return this.controller_.open()
  }

  close(saved = false): void {
    this.controller_.close(saved)
  }
}
