import { Injectable, signal } from '@angular/core'
import type { ParsedResult } from '@models/parsed-result.model'

@Injectable({ providedIn: 'root' })
export class RecipeTextImportModalService {
  readonly isOpen = signal(false)

  private onResult_: ((result: ParsedResult) => void) | null = null

  open(onResult: (result: ParsedResult) => void): void {
    this.onResult_ = onResult
    this.isOpen.set(true)
  }

  close(): void {
    this.onResult_ = null
    this.isOpen.set(false)
  }

  deliver(result: ParsedResult): void {
    this.onResult_?.(result)
    this.close()
  }
}
