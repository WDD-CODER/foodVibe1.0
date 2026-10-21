import { inject, Injectable, signal } from '@angular/core'
import type { AiRecipeDraft } from '@services/ai-recipe-draft.service'
import type { AiRecipePatch } from '@services/gemini.service'
import { UserService } from '@services/user.service'
import { AuthModalService } from '@services/auth-modal.service'

export type AiModalMode = 'create' | 'edit'
/** The tab the create window opens on. 'paste' sends pasted recipe text to the server parser. */
export type AiModalInputMode = 'text' | 'image' | 'url' | 'paste'

@Injectable({ providedIn: 'root' })
export class AiRecipeModalService {
  private readonly userService = inject(UserService)
  private readonly authModal = inject(AuthModalService)

  private readonly isOpen_ = signal(false)
  private readonly mode_ = signal<AiModalMode>('create')
  private readonly initialInputMode_ = signal<AiModalInputMode>('text')
  private currentRecipe_: AiRecipeDraft | null = null
  private onPatch_: ((patch: AiRecipePatch) => void) | null = null

  readonly isOpen = this.isOpen_.asReadonly()
  readonly mode = this.mode_.asReadonly()
  readonly initialInputMode = this.initialInputMode_.asReadonly()

  open(
    mode: AiModalMode = 'create',
    currentRecipe?: AiRecipeDraft,
    onPatch?: (patch: AiRecipePatch) => void,
    inputMode: AiModalInputMode = 'text'
  ): void {
    if (!this.userService.isLoggedIn()) {
      this.authModal.open('sign-in')
      return
    }
    this.mode_.set(mode)
    this.currentRecipe_ = currentRecipe ?? null
    this.onPatch_ = onPatch ?? null
    this.initialInputMode_.set(inputMode)
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
