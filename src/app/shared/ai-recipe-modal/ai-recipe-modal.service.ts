import { Injectable, signal } from '@angular/core'

@Injectable({ providedIn: 'root' })
export class AiRecipeModalService {
  readonly isOpen_ = signal(false)
  private resolve_: (() => void) | null = null

  open(): Promise<void> {
    this.isOpen_.set(true)
    return new Promise(resolve => {
      this.resolve_ = resolve
    })
  }

  close(): void {
    this.resolve_?.()
    this.resolve_ = null
    this.isOpen_.set(false)
  }
}
