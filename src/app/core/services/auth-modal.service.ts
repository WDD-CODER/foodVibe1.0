import { Injectable, signal } from '@angular/core'
import { ModalController } from './modal-controller'

export type AuthMode = 'sign-in' | 'sign-up'

@Injectable({ providedIn: 'root' })
export class AuthModalService {
  private readonly controller_ = new ModalController<void>(undefined)

  readonly isOpen = this.controller_.isOpen_
  readonly mode = signal<AuthMode>('sign-in')
  readonly returnUrl = signal<string | null>(null)

  open(mode: AuthMode = 'sign-in', returnUrl?: string): void {
    this.mode.set(mode)
    if (returnUrl) this.returnUrl.set(returnUrl)
    void this.controller_.open()
  }

  close(): void {
    this.controller_.close()
  }

  clearReturnUrl(): void {
    this.returnUrl.set(null)
  }
}
