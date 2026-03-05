import { Injectable, signal } from '@angular/core';

export type AuthMode = 'sign-in' | 'sign-up';

@Injectable({ providedIn: 'root' })
export class AuthModalService {
  readonly isOpen = signal(false);
  readonly mode = signal<AuthMode>('sign-in');

  open(mode: AuthMode = 'sign-in'): void {
    this.mode.set(mode);
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }
}
