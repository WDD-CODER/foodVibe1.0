import { Injectable, signal } from '@angular/core'

@Injectable({ providedIn: 'root' })
export class AiRecipeModalService {
  private readonly isOpen_ = signal(false)
  readonly isOpen = this.isOpen_.asReadonly()

  open(): void {
    this.isOpen_.set(true)
  }

  close(): void {
    this.isOpen_.set(false)
  }
}
