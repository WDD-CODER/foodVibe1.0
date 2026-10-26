import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, signal } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { formatCoefficient, isValidCoefficient } from '../../../../core/engine/portions'
import { ClickOutSideDirective } from '@directives/click-out-side'
import { SelectOnFocusDirective } from '@directives/select-on-focus.directive'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { LoggingService } from '@services/logging.service'
import { MenuEventTypeService } from '@services/menu-event-type.service'
import { TaxonomyStore } from '@services/taxonomy-store.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { warnBeforeUnload } from '@utils/leave-warning.util'
import type { TaxonomyTermOf } from '@models/v2'

type CoefficientKind = 'eventType' | 'menuType'

/** What the user typed in one row that is not saved yet. */
interface CoefficientDraft {
  kind: CoefficientKind
  key: string
  text: string
}

/** One unsaved row, checked against the stored value. */
interface CoefficientChange extends CoefficientDraft {
  rowId: string
  value: number
  isValid: boolean
}

/** Clicks inside a popup (the leave question itself, a delete confirm) are not "leaving the card". */
const POPUP_SELECTOR = 'app-modal-shell, .c-modal-overlay'

const parseCoefficient = (text: string): number => Number(text.trim().replace(',', '.'))

/**
 * Plan 441 — the «מקדמים» card of the metadata manager: how much more people eat at each event type and
 * serving type (1 = a normal amount). Event types can be added and deleted (own ones). Shared terms are read-only
 * unless the platform admin edits them.
 * Plan 482 — typing only changes a draft; «שמור» saves every changed row (one term write each). Leaving the card,
 * the dashboard tab or the page with unsaved drafts asks first (save and leave / leave without saving / cancel).
 */
@Component({
  selector: 'app-coefficient-manager',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe, SelectOnFocusDirective, ClickOutSideDirective],
  templateUrl: './coefficient-manager.component.html',
  styleUrl: './coefficient-manager.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CoefficientManagerComponent {
  // 1. INJECTED
  private readonly taxonomy_ = inject(TaxonomyStore)
  private readonly eventTypeService_ = inject(MenuEventTypeService)
  private readonly confirmModal_ = inject(ConfirmModalService)
  private readonly userMsg_ = inject(UserMsgService)
  private readonly translation_ = inject(TranslationService)
  private readonly logging_ = inject(LoggingService)
  private readonly host_ = inject<ElementRef<HTMLElement>>(ElementRef)

  // 4. SIGNALS & CONSTANTS
  protected readonly eventTypes_ = this.taxonomy_.terms('eventType')
  protected readonly servingTypes_ = this.taxonomy_.terms('menuType')
  protected readonly formatCoefficient = formatCoefficient

  /** The add row's refused value and the message key why. */
  protected readonly invalid_ = signal<{
    row: 'new'
    key: 'coefficient_invalid' | 'metadata_event_type_exists'
  } | null>(null)
  /** Unsaved typed values by row id (`${kind}:${key}`). */
  private readonly drafts_ = signal<Record<string, CoefficientDraft>>({})
  private readonly isSaving_ = signal(false)
  protected readonly isSaving = this.isSaving_.asReadonly()
  /** The open leave question, shared by every way of leaving so only one popup shows. */
  private leavePrompt_: Promise<boolean> | null = null

  // 5. COMPUTED
  protected readonly invalidRowId = computed(() => this.invalid_()?.row ?? null)
  /** Drafts that differ from the stored value (or can't be read as a number). */
  private readonly changes = computed<CoefficientChange[]>(() =>
    Object.entries(this.drafts_()).flatMap(([rowId, draft]) => {
      const term = this.taxonomy_.find(draft.kind, draft.key)
      if (!term) return []
      const value = parseCoefficient(draft.text)
      const isValid = draft.text.trim() !== '' && isValidCoefficient(value)
      if (isValid && value === (term.coefficient ?? 1)) return []
      return [{ ...draft, rowId, value, isValid }]
    })
  )
  protected readonly isDirty = computed(() => this.changes().length > 0)
  protected readonly canSave = computed(
    () => this.isDirty() && !this.isSaving_() && this.changes().every((c) => c.isValid)
  )
  private readonly invalidRows = computed(
    () =>
      new Set(
        this.changes()
          .filter((c) => !c.isValid)
          .map((c) => c.rowId)
      )
  )

  constructor() {
    warnBeforeUnload(() => this.isDirty())
  }

  // 6. METHODS — Create
  async onAddEventType(nameInput: HTMLInputElement, coefficientInput: HTMLInputElement): Promise<void> {
    const name = nameInput.value.trim()
    if (!name) return
    const value = parseCoefficient(coefficientInput.value)
    if (!isValidCoefficient(value)) {
      this.invalid_.set({ row: 'new', key: 'coefficient_invalid' })
      return
    }
    if (this.taxonomy_.find('eventType', name)) {
      this.invalid_.set({ row: 'new', key: 'metadata_event_type_exists' })
      return
    }
    this.invalid_.set(null)
    try {
      if (!(await this.eventTypeService_.addEventType(name, value))) {
        this.userMsg_.onSetErrorMsg(this.translation_.translate('server_error'))
        return
      }
      nameInput.value = ''
      coefficientInput.value = '1'
      this.userMsg_.onSetSuccessMsg(this.translation_.translate('metadata_updated_success'))
    } catch (err) {
      this.reportError('add', err)
    }
  }

  // Read
  /** Own terms are always editable; shared ones only by the platform admin (the server decides again). */
  canEdit(term: TaxonomyTermOf<CoefficientKind>): boolean {
    return this.taxonomy_.canEdit(term)
  }

  rowId(kind: CoefficientKind, term: TaxonomyTermOf<CoefficientKind>): string {
    return `${kind}:${term.key}`
  }

  isRowInvalid(rowId: string): boolean {
    return this.invalidRows().has(rowId)
  }

  /** For `pendingChangesGuard` (via the metadata page and the dashboard). */
  hasRealChanges(): boolean {
    return this.isDirty()
  }

  // Delete
  async onDeleteEventType(term: TaxonomyTermOf<'eventType'>): Promise<void> {
    const message = `${this.translation_.translate('confirm_delete')} "${this.translation_.translate(term.key)}"`
    if (!(await this.confirmModal_.open(message, { variant: 'warning' }))) return
    try {
      await this.taxonomy_.removeByKey('eventType', term.key)
      this.dropDraft(this.rowId('eventType', term))
      this.userMsg_.onSetSuccessMsg(this.translation_.translate('metadata_updated_success'))
    } catch (err) {
      this.reportError('remove', err)
    }
  }

  // Update
  /** Typing only keeps a draft; nothing is saved until «שמור». */
  onDraftInput(kind: CoefficientKind, term: TaxonomyTermOf<CoefficientKind>, text: string): void {
    const rowId = this.rowId(kind, term)
    const value = parseCoefficient(text)
    if (text.trim() !== '' && isValidCoefficient(value) && value === (term.coefficient ?? 1)) {
      this.dropDraft(rowId)
      return
    }
    this.drafts_.update((drafts) => ({ ...drafts, [rowId]: { kind, key: term.key, text } }))
  }

  /** Saves every changed row, one term write each; one success message when all went through. */
  async onSave(): Promise<boolean> {
    if (!this.canSave()) return false
    this.isSaving_.set(true)
    try {
      for (const change of this.changes()) {
        try {
          await this.taxonomy_.updateByKey(change.kind, change.key, { coefficient: change.value })
        } catch (err) {
          this.reportError('update', err)
          return false
        }
        this.dropDraft(change.rowId)
      }
      this.userMsg_.onSetSuccessMsg(this.translation_.translate('metadata_updated_success'))
      return true
    } finally {
      this.isSaving_.set(false)
    }
  }

  /** Forgets the drafts and puts the stored values back in the boxes. */
  onDiscard(): void {
    this.drafts_.set({})
    const boxes = this.host_.nativeElement.querySelectorAll<HTMLInputElement>('input[data-coef-row]')
    for (const box of Array.from(boxes)) {
      const [kind, ...rest] = (box.dataset['coefRow'] ?? '').split(':')
      const term = this.taxonomy_.find(kind as CoefficientKind, rest.join(':'))
      if (term) box.value = formatCoefficient(term.coefficient ?? 1)
    }
  }

  /**
   * Asks before leaving with unsaved drafts: true = go on (saved or dropped), false = stay.
   * The card's click-outside and the route guard can both ask for one click; they share one popup.
   */
  confirmLeave(): Promise<boolean> {
    if (!this.isDirty()) return Promise.resolve(true)
    this.leavePrompt_ ??= this.askLeave().finally(() => {
      this.leavePrompt_ = null
    })
    return this.leavePrompt_
  }

  // UI handlers
  onClickOutside(target: HTMLElement): void {
    if (!this.isDirty() || this.isSaving_()) return
    if (target.closest(POPUP_SELECTOR)) return
    void this.confirmLeave()
  }

  private async askLeave(): Promise<boolean> {
    const result = await this.confirmModal_.openTernary('unsaved_changes_confirm', {
      variant: 'warning',
      saveLabel: 'leave_without_saving',
      saveButtonLabel: 'save_and_leave'
    })
    if (result === 'cancel') return false
    if (result === 'save') return this.onSave()
    this.onDiscard()
    return true
  }

  private dropDraft(rowId: string): void {
    if (!(rowId in this.drafts_())) return
    this.drafts_.update((drafts) => {
      const next = { ...drafts }
      delete next[rowId]
      return next
    })
  }

  /** A read-only or in-use refusal comes from the store as a ready message; anything else is logged. */
  private reportError(what: 'add' | 'update' | 'remove', err: unknown): void {
    const known = this.taxonomy_.errorMessage(err)
    if (known) {
      this.userMsg_.onSetErrorMsg(known)
      return
    }
    this.logging_.error({
      event: `crud.coefficients.${what}_error`,
      message: `Failed to ${what} coefficient`,
      context: { err }
    })
    this.userMsg_.onSetErrorMsg(this.translation_.translate('server_error'))
  }
}
