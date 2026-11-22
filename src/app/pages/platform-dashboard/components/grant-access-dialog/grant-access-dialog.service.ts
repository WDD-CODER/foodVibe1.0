import { Injectable, signal } from '@angular/core'
import { ModalController } from '@services/modal-controller'

/** What the dialog opens on: the business a consultant is given access to. */
export interface GrantAccessTarget {
  businessId: string
  name: string
}

/** Plan 632: opens the platform admin's "give a consultant access" dialog; resolves `true` when access was given. */
@Injectable({ providedIn: 'root' })
export class GrantAccessDialogService {
  private readonly controller_ = new ModalController<boolean>(false)
  private readonly target_ = signal<GrantAccessTarget | null>(null)

  readonly isOpen_ = this.controller_.isOpen_
  readonly current_ = this.target_.asReadonly()

  open(target: GrantAccessTarget): Promise<boolean> {
    this.target_.set(target)
    return this.controller_.open()
  }

  close(given = false): void {
    this.controller_.close(given)
  }
}
