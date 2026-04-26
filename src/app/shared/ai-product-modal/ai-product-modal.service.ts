import { inject, Injectable, signal } from '@angular/core'
import { UserService } from '@services/user.service'
import { AuthModalService } from '@services/auth-modal.service'
import type { AiProductDraft, AiProductPatch } from '@models/ai-product-draft.model'

export type AiProductModalMode = 'create' | 'edit'

@Injectable({ providedIn: 'root' })
export class AiProductModalService {
  private readonly userService_ = inject(UserService)
  private readonly authModal_ = inject(AuthModalService)

  private readonly isOpen_ = signal(false)
  private readonly mode_ = signal<AiProductModalMode>('create')
  private currentProduct_: AiProductDraft | null = null
  private onResult_: ((draft: AiProductDraft) => void) | null = null
  private onPatch_: ((patch: AiProductPatch) => void) | null = null

  readonly isOpen = this.isOpen_.asReadonly()
  readonly mode = this.mode_.asReadonly()

  open(
    mode: AiProductModalMode,
    currentProduct?: AiProductDraft,
    onResult?: (draft: AiProductDraft) => void,
    onPatch?: (patch: AiProductPatch) => void,
  ): void {
    if (!this.userService_.isLoggedIn()) {
      this.authModal_.open('sign-in')
      return
    }
    this.mode_.set(mode)
    this.currentProduct_ = currentProduct ?? null
    this.onResult_ = onResult ?? null
    this.onPatch_ = onPatch ?? null
    this.isOpen_.set(true)
  }

  getEditContext(): AiProductDraft | null {
    return this.currentProduct_
  }

  deliverResult(draft: AiProductDraft): void {
    this.onResult_?.(draft)
    this.close()
  }

  deliverPatch(patch: AiProductPatch): void {
    this.onPatch_?.(patch)
    this.close()
  }

  close(): void {
    this.isOpen_.set(false)
    this.currentProduct_ = null
    this.onResult_ = null
    this.onPatch_ = null
  }
}
