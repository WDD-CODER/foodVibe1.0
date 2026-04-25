import { inject, Injectable, signal } from '@angular/core'
import { UserService } from '@services/user.service'
import { AuthModalService } from '@services/auth-modal.service'
import type { AiMenuDraft, AiMenuPatch, MatchedMenu } from '@models/ai-menu-draft.model'

export type AiMenuModalMode = 'create' | 'edit'

@Injectable({ providedIn: 'root' })
export class AiMenuModalService {
  private readonly userService_ = inject(UserService)
  private readonly authModal_ = inject(AuthModalService)

  private readonly isOpen_ = signal(false)
  private readonly mode_ = signal<AiMenuModalMode>('create')
  private currentMenu_: AiMenuDraft | null = null
  private onResult_: ((result: MatchedMenu, resolutions: Map<string, string | 'skip'>) => void) | null = null
  private onPatch_: ((patch: AiMenuPatch) => void) | null = null

  readonly isOpen = this.isOpen_.asReadonly()
  readonly mode = this.mode_.asReadonly()

  open(
    mode: AiMenuModalMode,
    currentMenu?: AiMenuDraft,
    onResult?: (result: MatchedMenu, resolutions: Map<string, string | 'skip'>) => void,
    onPatch?: (patch: AiMenuPatch) => void,
  ): void {
    if (!this.userService_.isLoggedIn()) {
      this.authModal_.open('sign-in')
      return
    }
    this.mode_.set(mode)
    this.currentMenu_ = currentMenu ?? null
    this.onResult_ = onResult ?? null
    this.onPatch_ = onPatch ?? null
    this.isOpen_.set(true)
  }

  getEditContext(): AiMenuDraft | null {
    return this.currentMenu_
  }

  deliverResult(result: MatchedMenu, resolutions: Map<string, string | 'skip'>): void {
    this.onResult_?.(result, resolutions)
    this.close()
  }

  deliverPatch(patch: AiMenuPatch): void {
    this.onPatch_?.(patch)
    this.close()
  }

  close(): void {
    this.isOpen_.set(false)
    this.currentMenu_ = null
    this.onResult_ = null
    this.onPatch_ = null
  }
}
