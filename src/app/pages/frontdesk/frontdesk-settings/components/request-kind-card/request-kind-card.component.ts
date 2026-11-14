import { ChangeDetectionStrategy, Component, computed, inject, input, model, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { FormFieldComponent } from 'src/app/shared/form-field/form-field.component'
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component'
import { NumberBoxDirective } from '@directives/number-box.directive'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { TranslationService } from '@services/translation.service'
import { QUESTION_TYPES, type RequestKindConfig } from '@models/front-desk-profile.model'
import type { FrontDeskQuestion, FrontDeskRequestKind } from '@schemas/entities/front-desk-profile.schema'
import { WANTED_QUESTION_KEYS } from '@schemas/front-desk-templates'

export const MAX_QUESTIONS = 12
const DURATION_KINDS: readonly FrontDeskRequestKind[] = ['table', 'tasting', 'consultation']
type RuleKey = 'minPartySize' | 'maxPartySize' | 'minLeadHours' | 'maxLeadDays' | 'minBudgetPerGuest'

/** A kind that is missing from the profile shows as off with no questions. */
export function emptyKindConfig(): RequestKindConfig {
  return { enabled: false, questions: [], rules: {}, expireAfterHours: 24 }
}

/**
 * A choice question needs two options, except a template one whose answer fills a request field (the event type
 * comes from the business's own event types, so the template ships it without options).
 */
export function choiceNeedsOptions(q: FrontDeskQuestion): boolean {
  return q.type === 'choice' && !(q.key in WANTED_QUESTION_KEYS) && (q.options?.length ?? 0) < 2
}

/** `custom_<n>` with the lowest free n among this kind's questions. */
export function nextCustomKey(questions: readonly FrontDeskQuestion[]): string {
  const used = new Set(questions.map((q) => q.key))
  let n = 1
  while (used.has('custom_' + n)) n++
  return 'custom_' + n
}

/** Plan 553: one request kind of the front desk profile — enable toggle, up to 12 questions, the rules. */
@Component({
  selector: 'app-request-kind-card',
  standalone: true,
  imports: [
    FormsModule,
    LucideAngularModule,
    TranslatePipe,
    FormFieldComponent,
    CustomSelectComponent,
    NumberBoxDirective
  ],
  templateUrl: './request-kind-card.component.html',
  styleUrl: './request-kind-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RequestKindCardComponent {
  private readonly confirm = inject(ConfirmModalService)
  private readonly translation = inject(TranslationService)

  readonly kind = input.required<FrontDeskRequestKind>()
  readonly config = model.required<RequestKindConfig>()
  readonly disabled = input(false)
  /** Show the field errors (after a blocked save). */
  readonly showErrors = input(false)

  protected readonly typeOptions = QUESTION_TYPES.map((t) => ({ value: t, label: 'fd_qtype_' + t }))
  protected readonly areaDraft_ = signal('')
  protected readonly optionDrafts_ = signal<Record<string, string>>({})

  protected readonly hasDuration_ = computed(() => DURATION_KINDS.includes(this.kind()))
  protected readonly atMax_ = computed(() => this.config().questions.length >= MAX_QUESTIONS)
  protected readonly partyRangeInvalid_ = computed(() => {
    const { minPartySize, maxPartySize } = this.config().rules
    return minPartySize != null && maxPartySize != null && minPartySize > maxPartySize
  })
  protected readonly summary_ = computed(() => {
    const c = this.config()
    const { minPartySize: min, maxPartySize: max } = c.rules
    const range = min != null && max != null ? `${min}–${max}` : min != null ? `${min}+` : max != null ? `≤${max}` : '—'
    return this.translation
      .translate('fd_kind_summary')
      .replace('{questions}', String(c.questions.length))
      .replace('{range}', range)
      .replace('{hours}', String(c.expireAfterHours))
  })

  protected labelText_(q: FrontDeskQuestion): string {
    return this.translation.translate(q.label)
  }

  protected optionText_(option: string): string {
    return this.translation.translate(option)
  }

  protected isBadChoice_(q: FrontDeskQuestion): boolean {
    return choiceNeedsOptions(q)
  }

  protected setEnabled_(enabled: boolean): void {
    this.config.update((c) => ({ ...c, enabled }))
  }

  private numberOf_(event: Event): number | undefined {
    const raw = (event.target as HTMLInputElement).value
    const value = raw === '' ? undefined : Number(raw)
    return value === undefined || Number.isNaN(value) ? undefined : value
  }

  protected setRule_(key: RuleKey, event: Event): void {
    const value = this.numberOf_(event)
    this.config.update((c) => {
      const rules = { ...c.rules }
      if (value === undefined) delete rules[key]
      else rules[key] = value
      return { ...c, rules }
    })
  }

  protected setDuration_(event: Event): void {
    const value = this.numberOf_(event)
    this.config.update((c) => {
      const { defaultDurationMinutes: _old, ...rest } = c
      return value === undefined ? rest : { ...rest, defaultDurationMinutes: value }
    })
  }

  protected setExpire_(event: Event): void {
    const value = this.numberOf_(event)
    if (value !== undefined) this.config.update((c) => ({ ...c, expireAfterHours: value }))
  }

  // --- areas ---
  protected addArea_(): void {
    const text = this.areaDraft_().trim()
    if (!text) return
    this.areaDraft_.set('')
    this.config.update((c) => {
      const areas = c.rules.areas ?? []
      return areas.includes(text) || areas.length >= 30 ? c : { ...c, rules: { ...c.rules, areas: [...areas, text] } }
    })
  }

  protected removeArea_(index: number): void {
    this.config.update((c) => {
      const areas = (c.rules.areas ?? []).filter((_, i) => i !== index)
      const rules = { ...c.rules }
      if (areas.length) rules.areas = areas
      else delete rules.areas
      return { ...c, rules }
    })
  }

  // --- questions ---
  private patchQuestion_(index: number, change: Partial<FrontDeskQuestion>): void {
    this.config.update((c) => ({
      ...c,
      questions: c.questions.map((q, i) => (i === index ? { ...q, ...change } : q))
    }))
  }

  protected addQuestion_(): void {
    if (this.atMax_()) return
    this.config.update((c) => ({
      ...c,
      questions: [...c.questions, { key: nextCustomKey(c.questions), label: '', type: 'text', required: false }]
    }))
  }

  protected setLabel_(index: number, event: Event): void {
    this.patchQuestion_(index, { label: (event.target as HTMLInputElement).value })
  }

  protected setType_(index: number, type: string): void {
    const q = this.config().questions[index]
    if (!q || q.type === type) return
    const next = type as FrontDeskQuestion['type']
    const { options, ...rest } = q
    const changed: FrontDeskQuestion = { ...rest, type: next, ...(next === 'choice' ? { options: options ?? [] } : {}) }
    this.config.update((c) => ({ ...c, questions: c.questions.map((x, i) => (i === index ? changed : x)) }))
  }

  protected setRequired_(index: number, required: boolean): void {
    this.patchQuestion_(index, { required })
  }

  protected move_(index: number, by: -1 | 1): void {
    const to = index + by
    this.config.update((c) => {
      if (to < 0 || to >= c.questions.length) return c
      const questions = [...c.questions]
      ;[questions[index], questions[to]] = [questions[to], questions[index]]
      return { ...c, questions }
    })
  }

  protected async remove_(index: number): Promise<void> {
    if (!(await this.confirm.open('fd_q_remove_confirm'))) return
    this.config.update((c) => ({ ...c, questions: c.questions.filter((_, i) => i !== index) }))
  }

  // --- options of a choice question ---
  protected optionDraft_(key: string): string {
    return this.optionDrafts_()[key] ?? ''
  }

  protected setOptionDraft_(key: string, value: string): void {
    this.optionDrafts_.update((d) => ({ ...d, [key]: value }))
  }

  protected addOption_(index: number): void {
    const q = this.config().questions[index]
    if (!q) return
    const text = this.optionDraft_(q.key).trim()
    if (!text) return
    this.setOptionDraft_(q.key, '')
    const options = q.options ?? []
    if (options.length >= 20 || options.some((o) => this.optionText_(o) === text)) return
    this.patchQuestion_(index, { options: [...options, text] })
  }

  protected removeOption_(index: number, optionIndex: number): void {
    const q = this.config().questions[index]
    if (!q) return
    this.patchQuestion_(index, { options: (q.options ?? []).filter((_, i) => i !== optionIndex) })
  }
}
