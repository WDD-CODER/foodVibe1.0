import { Injectable, signal } from '@angular/core'
import type { AiRecipeDraft } from '@services/ai-recipe-draft.service'
import type { AiRecipePatch } from '@services/gemini.service'

export type AiModalMode = 'create' | 'edit'

@Injectable({ providedIn: 'root' })
export class AiRecipeModalService {
  private readonly isOpen_ = signal(false)
  private readonly mode_ = signal<AiModalMode>('create')
  private currentRecipe_: AiRecipeDraft | null = null
  private onPatch_: ((patch: AiRecipePatch) => void) | null = null

  readonly isOpen = this.isOpen_.asReadonly()
  readonly mode = this.mode_.asReadonly()

  open(mode: AiModalMode = 'create', currentRecipe?: AiRecipeDraft, onPatch?: (patch: AiRecipePatch) => void): void {
    this.mode_.set(mode)
    this.currentRecipe_ = currentRecipe ?? null
    this.onPatch_ = onPatch ?? null
    this.isOpen_.set(true)
  }

  getEditContext(): AiRecipeDraft | null {
    return this.currentRecipe_
  }

  deliverPatch(patch: AiRecipePatch): void {
    this.onPatch_?.(patch)
    this.close()
  }

  close(): void {
    this.isOpen_.set(false)
    this.currentRecipe_ = null
    this.onPatch_ = null
  }
}
