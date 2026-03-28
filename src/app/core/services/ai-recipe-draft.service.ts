import { Injectable, signal } from '@angular/core'

export interface AiRecipeDraft {
  name_hebrew: string
  recipe_type: 'dish' | 'preparation'
  yield_amount: number
  yield_unit: string
  ingredients: { name: string; amount: number; unit: string }[]
  steps: string[]
}

@Injectable({ providedIn: 'root' })
export class AiRecipeDraftService {
  private readonly draft_ = signal<AiRecipeDraft | null>(null)
  readonly draft = this.draft_.asReadonly()

  set(draft: AiRecipeDraft): void {
    this.draft_.set(draft)
  }

  consume(): AiRecipeDraft | null {
    const d = this.draft_()
    this.draft_.set(null)
    return d
  }
}
