import { Injectable, signal } from '@angular/core'

type ConfirmModalVariant = 'default' | 'danger' | 'warning'
export type ConfirmModalResult = 'cancel' | 'confirm' | 'save'

export interface ConfirmModalOptions {
  /** Translation key for the confirm/save button. Derived from title if omitted. */
  saveLabel?: string
  /** Translation key for context (e.g. add_supplier, approve_category). Used to derive saveLabel. */
  title?: string
  /** Visual variant: danger (red) for permanent delete, warning (yellow/amber) for restore. */
  variant?: ConfirmModalVariant
}

export interface TernaryModalOptions extends ConfirmModalOptions {
  /** Translation key for the "save and go" button. */
  saveButtonLabel?: string
}

@Injectable({ providedIn: 'root' })
export class ConfirmModalService {
  private readonly isOpen_ = signal(false)
  private readonly message_ = signal('')
  private readonly saveLabel_ = signal('save')
  private readonly variant_ = signal<ConfirmModalVariant>('default')
  private readonly showSaveButton_ = signal(false)
  private readonly saveButtonLabel_ = signal('save')

  /** Internal resolver — accepts both boolean (legacy) and string (ternary). */
  private resolve_: ((value: ConfirmModalResult | boolean) => void) | null = null

  readonly isOpen = this.isOpen_.asReadonly()
  readonly message = this.message_.asReadonly()
  readonly saveLabel = this.saveLabel_.asReadonly()
  readonly variant = this.variant_.asReadonly()
  readonly showSaveButton = this.showSaveButton_.asReadonly()
  readonly saveButtonLabel = this.saveButtonLabel_.asReadonly()

  /**
   * Binary confirm: returns true (confirm) or false (cancel).
   * Backward-compatible — all existing callers work unchanged.
   */
  open(message: string, options?: ConfirmModalOptions): Promise<boolean> {
    this.message_.set(message)
    const label = this.resolveSaveLabel(options)
    this.saveLabel_.set(label)
    this.variant_.set(options?.variant ?? 'default')
    this.showSaveButton_.set(false)
    this.isOpen_.set(true)
    return new Promise(resolve => {
      this.resolve_ = (val) => resolve(typeof val === 'boolean' ? val : val === 'confirm')
    })
  }

  /**
   * Ternary confirm: returns 'cancel' | 'confirm' | 'save'.
   * Used when we want Cancel + Save & Leave + Leave without saving.
   */
  openTernary(message: string, options?: TernaryModalOptions): Promise<ConfirmModalResult> {
    this.message_.set(message)
    const label = this.resolveSaveLabel(options)
    this.saveLabel_.set(label)
    this.variant_.set(options?.variant ?? 'default')
    this.showSaveButton_.set(true)
    this.saveButtonLabel_.set(options?.saveButtonLabel ?? 'save')
    this.isOpen_.set(true)
    return new Promise(resolve => {
      this.resolve_ = (val) => {
        if (typeof val === 'boolean') {
          resolve(val ? 'confirm' : 'cancel')
        } else {
          resolve(val)
        }
      }
    })
  }

  /**
   * Choose an outcome. Accepts:
   * - boolean (legacy compat): true → 'confirm', false → 'cancel'
   * - ConfirmModalResult string: 'cancel' | 'confirm' | 'save'
   */
  choose(value: boolean | ConfirmModalResult): void {
    if (typeof value === 'boolean') {
      this.resolve_?.(value ? 'confirm' : 'cancel')
    } else {
      this.resolve_?.(value)
    }
    this.resolve_ = null
    this.isOpen_.set(false)
    this.message_.set('')
    this.saveLabel_.set('save')
    this.variant_.set('default')
    this.showSaveButton_.set(false)
    this.saveButtonLabel_.set('save')
  }

  private resolveSaveLabel(options?: ConfirmModalOptions): string {
    if (options?.saveLabel) return options.saveLabel
    const title = options?.title
    if (!title) return 'save'
    if (title.startsWith('approve_')) return `save_approved_${title.slice(8)}`
    if (title.startsWith('add_')) return `save_${title.slice(4)}`
    return 'save'
  }
}
