import { Injectable, signal } from '@angular/core'
import type { ModuleKey } from '@schemas/modules-pure'
import { ModalController } from '@services/modal-controller'

/** What the dialog opens on: one business's row. */
export interface PlatformBusinessTarget {
  businessId: string
  name: string
  modules: ModuleKey[]
  aiPrivate: boolean
  aiMonthlyTokenCap: number | null
  aiTokensThisMonth: number
}

/** Plan 620: opens the platform admin's modules / AI cap / private dialog; resolves `true` when a change was saved. */
@Injectable({ providedIn: 'root' })
export class PlatformBusinessDialogService {
  private readonly controller_ = new ModalController<boolean>(false)
  private readonly target_ = signal<PlatformBusinessTarget | null>(null)

  readonly isOpen_ = this.controller_.isOpen_
  readonly current_ = this.target_.asReadonly()

  open(target: PlatformBusinessTarget): Promise<boolean> {
    this.target_.set(target)
    return this.controller_.open()
  }

  close(saved = false): void {
    this.controller_.close(saved)
  }
}
