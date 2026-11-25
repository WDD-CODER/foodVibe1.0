import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { TaxonomyStore } from '@services/taxonomy-store.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { DISH_RETURN_REASONS, type DishReturnReasonLine } from '@models/dish-sales-month.model'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { ModalShellComponent } from 'src/app/shared/modal-shell/modal-shell.component'
import { CounterComponent } from 'src/app/shared/counter/counter.component'
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component'

const OTHER = 'other'
const NOTE_MAX = 200
const NAME_MAX = 80
const ADD_REASON = '__add_return_reason__'

/** Plan 726: split one dish's returns by reason — the built-in reasons, the business's own, and «אחר» with a note. */
@Component({
  selector: 'app-return-reasons-dialog',
  standalone: true,
  imports: [FormsModule, TranslatePipe, ModalShellComponent, CounterComponent, CustomSelectComponent],
  templateUrl: './return-reasons-dialog.component.html',
  styleUrl: './return-reasons-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReturnReasonsDialogComponent {
  private readonly taxonomy = inject(TaxonomyStore)
  private readonly translation = inject(TranslationService)
  private readonly userMsg = inject(UserMsgService)

  readonly dishName = input.required<string>()
  /** How many of the dish came back (the reasons may not add up to more). */
  readonly returned = input.required<number>()
  /** The reasons the row holds now. */
  readonly reasons = input<readonly DishReturnReasonLine[]>([])
  /** «אישור»: the new reasons for the row (not saved until the page saves). */
  readonly confirmed = output<DishReturnReasonLine[]>()
  readonly closed = output<void>()

  protected readonly noteMax = NOTE_MAX
  protected readonly nameMax = NAME_MAX
  protected readonly addValue = ADD_REASON
  protected readonly other = OTHER

  protected readonly counts_ = signal<Record<string, number>>({})
  protected readonly note_ = signal('')
  protected readonly isAdding_ = signal(false)
  protected readonly pickValue_ = signal('')

  private initial_ = ''
  private readonly ownTerms_ = this.taxonomy.terms('dishReturnReason')

  /** The six built-in reasons, the business's own, then a stored reason whose term is gone. */
  protected readonly keys_ = computed<string[]>(() => [
    ...new Set<string>([
      ...DISH_RETURN_REASONS,
      ...this.ownTerms_().map((t) => t.key),
      ...this.reasons().map((r) => r.reason)
    ])
  ])

  protected readonly given_ = computed(() => Object.values(this.counts_()).reduce((sum, n) => sum + n, 0))
  protected readonly over_ = computed(() => this.given_() > this.returned())
  protected readonly noteMissing_ = computed(() => (this.counts_()[OTHER] ?? 0) > 0 && !this.note_().trim())
  protected readonly canConfirm_ = computed(() => !this.over_() && !this.noteMissing_())

  protected readonly hasChanges_ = computed(() => this.snapshot_() !== this.initial_)

  /** The reasons not used yet, to pick one, and the add row. */
  protected readonly addOptions_ = computed(() => [
    ...this.keys_()
      .filter((k) => !(this.counts_()[k] > 0))
      .map((k) => ({ value: k, label: this.labelKey(k) })),
    { value: ADD_REASON, label: 'add_new_return_reason' }
  ])

  constructor() {
    queueMicrotask(() => this.fill_())
  }

  private fill_(): void {
    const counts: Record<string, number> = {}
    for (const r of this.reasons()) counts[r.reason] = r.count
    this.counts_.set(counts)
    this.note_.set(this.reasons().find((r) => r.reason === OTHER)?.note ?? '')
    this.initial_ = this.snapshot_()
  }

  private snapshot_(): string {
    return JSON.stringify([this.counts_(), this.note_()])
  }

  /** Dictionary key for a built-in reason, the key itself for the business's own. */
  protected labelKey(key: string): string {
    return (DISH_RETURN_REASONS as readonly string[]).includes(key) ? `dish_return_reason_${key}` : key
  }

  protected setCount(key: string, n: number): void {
    this.counts_.update((c) => ({ ...c, [key]: n }))
  }

  protected countOf(key: string): number {
    return this.counts_()[key] ?? 0
  }

  protected titleText(): string {
    return this.translation.translate('return_reasons_title').replace('{{name}}', this.dishName())
  }

  protected givenText(): string {
    return this.translation
      .translate('return_reasons_given')
      .replace('{{given}}', String(this.given_()))
      .replace('{{returned}}', String(this.returned()))
  }

  /** Picking an unused reason gives it one return. */
  protected onPick(value: string): void {
    if (value === ADD_REASON) return
    this.pickValue_.set('')
    if (value && this.countOf(value) === 0) this.setCount(value, 1)
  }

  /** Rule W: the add saves the term first, then selects it with one return. A reason that exists is only selected. */
  protected async onAddTyped(typed: string): Promise<void> {
    const name = typed.trim().slice(0, NAME_MAX)
    if (!name || this.isAdding_()) return
    const existing = this.keys_().find((k) => k === name || this.translation.translate(this.labelKey(k)) === name)
    if (existing) {
      if (this.countOf(existing) === 0) this.setCount(existing, 1)
      return
    }
    this.isAdding_.set(true)
    try {
      const term = await this.taxonomy.add('dishReturnReason', name, {})
      this.setCount(term.key, 1)
    } catch (err) {
      this.userMsg.onSetErrorMsg(this.taxonomy.errorMessage(err) ?? this.translation.translate('server_error'))
    } finally {
      this.isAdding_.set(false)
      this.pickValue_.set('')
    }
  }

  protected confirm(): void {
    if (!this.canConfirm_()) return
    const lines = this.keys_()
      .filter((k) => this.countOf(k) > 0)
      .map((k): DishReturnReasonLine => {
        const line: DishReturnReasonLine = { reason: k, count: this.countOf(k) }
        return k === OTHER ? { ...line, note: this.note_().trim() } : line
      })
    this.confirmed.emit(lines)
  }

  protected close(): void {
    this.closed.emit()
  }
}
