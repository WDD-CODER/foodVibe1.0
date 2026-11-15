import { Injectable, signal } from '@angular/core'

export interface AiRecipeDraft {
  nameHebrew: string
  recipe_type: 'dish' | 'preparation'
  yield_amount: number
  yield_unit: string
  ingredients: { name: string; amount: number; unit: string }[]
  steps: string[]
  equipment?: { name: string; quantity: number }[]
}

@Injectable({ providedIn: 'root' })
export class AiRecipeDraftService {
  private readonly draft_ = signal<AiRecipeDraft | null>(null)
  readonly draft = this.draft_.asReadonly()
  /** Plan 600: the key of the pending example saved when the cook continued; confirmed once the recipe is saved. */
  private readonly shotKey_ = signal<string | null>(null)

  set(draft: AiRecipeDraft, shotKey?: string): void {
    this.draft_.set(draft)
    this.shotKey_.set(shotKey ?? null)
  }

  /** Returns and clears the pending example key (null when the draft has none). */
  consumeShotKey(): string | null {
    const key = this.shotKey_()
    this.shotKey_.set(null)
    return key
  }

  consume(): AiRecipeDraft | null {
    const d = this.draft_()
    this.draft_.set(null)
    return d
  }
}
