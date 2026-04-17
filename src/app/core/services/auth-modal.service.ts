import { Injectable, signal } from '@angular/core'

export type AuthMode = 'sign-in' | 'sign-up'

@Injectable({ providedIn: 'root' })
export class AuthModalService {
  readonly isOpen = signal(false)
  readonly mode = signal<AuthMode>('sign-in')
  readonly returnUrl = signal<string | null>(null)

  open(mode: AuthMode = 'sign-in', returnUrl?: string): void {
    this.mode.set(mode)
    if (returnUrl) this.returnUrl.set(returnUrl)
    this.isOpen.set(true)
  }

  close(): void {
    this.isOpen.set(false)
  }

  clearReturnUrl(): void {
    this.returnUrl.set(null)
  }
}
