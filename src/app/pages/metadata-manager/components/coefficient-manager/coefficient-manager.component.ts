import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { formatCoefficient, isValidCoefficient } from '../../../../core/engine/portions'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { LoggingService } from '@services/logging.service'
import { MenuEventTypeService } from '@services/menu-event-type.service'
import { TaxonomyStore } from '@services/taxonomy-store.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import type { TaxonomyTermOf } from '@models/v2'

type CoefficientKind = 'eventType' | 'menuType'

/**
 * Plan 441 — the «מקדמים» card of the metadata manager: how much more people eat at each event type and
 * serving type (1 = a normal amount). Event types can be added and deleted (own ones); a coefficient is saved
 * with one term write when the field is left. Shared terms are read-only unless the platform admin edits them.
 */
@Component({
  selector: 'app-coefficient-manager',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe],
  templateUrl: './coefficient-manager.component.html',
  styleUrl: './coefficient-manager.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CoefficientManagerComponent {
  private readonly taxonomy_ = inject(TaxonomyStore)
  private readonly eventTypeService_ = inject(MenuEventTypeService)
  private readonly confirmModal_ = inject(ConfirmModalService)
  private readonly userMsg_ = inject(UserMsgService)
  private readonly translation_ = inject(TranslationService)
  private readonly logging_ = inject(LoggingService)

  protected readonly eventTypes_ = this.taxonomy_.terms('eventType')
  protected readonly servingTypes_ = this.taxonomy_.terms('menuType')
  protected readonly formatCoefficient = formatCoefficient

  /** `${kind}:${key}` of the row whose typed value was refused, or 'new' for the add row. */
  protected readonly invalidRow_ = signal<string | null>(null)

  /** Own terms are always editable; shared ones only by the platform admin (the server decides again). */
  canEdit(term: TaxonomyTermOf<CoefficientKind>): boolean {
    return this.taxonomy_.canEdit(term)
  }

  /** Saves a changed coefficient; a refused value puts the stored one back and shows the message. */
  async onCoefficientChange(
    kind: CoefficientKind,
    term: TaxonomyTermOf<CoefficientKind>,
    input: HTMLInputElement
  ): Promise<void> {
    const rowId = `${kind}:${term.key}`
    const stored = term.coefficient ?? 1
    const value = Number(input.value.trim().replace(',', '.'))
    if (!isValidCoefficient(value)) {
      this.invalidRow_.set(rowId)
      input.value = formatCoefficient(stored)
      return
    }
    this.invalidRow_.set(null)
    if (value === stored) return
    try {
      await this.taxonomy_.updateByKey(kind, term.key, { coefficient: value })
      this.userMsg_.onSetSuccessMsg(this.translation_.translate('metadata_updated_success'))
    } catch (err) {
      input.value = formatCoefficient(stored)
      this.reportError('update', err)
    }
  }

  async onAddEventType(nameInput: HTMLInputElement, coefficientInput: HTMLInputElement): Promise<void> {
    const name = nameInput.value.trim()
    if (!name) return
    const value = Number(coefficientInput.value.trim().replace(',', '.'))
    if (!isValidCoefficient(value) || this.taxonomy_.find('eventType', name)) {
      this.invalidRow_.set('new')
      return
    }
    this.invalidRow_.set(null)
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

  async onDeleteEventType(term: TaxonomyTermOf<'eventType'>): Promise<void> {
    const message = `${this.translation_.translate('confirm_delete')} "${this.translation_.translate(term.key)}"`
    if (!(await this.confirmModal_.open(message, { variant: 'warning' }))) return
    try {
      await this.taxonomy_.removeByKey('eventType', term.key)
      this.userMsg_.onSetSuccessMsg(this.translation_.translate('metadata_updated_success'))
    } catch (err) {
      this.reportError('remove', err)
    }
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
