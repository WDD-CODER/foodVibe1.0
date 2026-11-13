import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core'
import { DatePipe } from '@angular/common'
import { RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { TranslationService } from '@services/translation.service'
import { FormFieldComponent } from 'src/app/shared/form-field/form-field.component'
import { DateFieldComponent } from 'src/app/shared/date-field/date-field.component'
import { TimeFieldComponent } from 'src/app/shared/time-field/time-field.component'
import { CounterComponent } from 'src/app/shared/counter/counter.component'
import { isoToDmy } from 'src/app/core/utils/date-input.util'
import { waLink } from 'src/app/core/utils/wa-link.util'
import { DayLoadStripComponent, type DayLoadState } from '../day-load-strip/day-load-strip.component'
import type { FrontDeskRequest } from '@models/request.model'

/** What the card sends up when "אישור" is pressed: the edited values, or `null` when nothing was changed. */
export type ApproveEdit = { wanted: FrontDeskRequest['wanted'] } | null

const OPEN_STATUSES: readonly string[] = ['new', 'qualified', 'needs_info']
const TIME_BOUND_KINDS: readonly string[] = ['table', 'tasting', 'consultation']

/** Plan 552: one customer request — what they want, whether it fits, and the three decisions. One card for all kinds. */
@Component({
  selector: 'app-request-card',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    LucideAngularModule,
    TranslatePipe,
    FormFieldComponent,
    DateFieldComponent,
    TimeFieldComponent,
    CounterComponent,
    DayLoadStripComponent
  ],
  templateUrl: './request-card.component.html',
  styleUrl: './request-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RequestCardComponent {
  private readonly translation = inject(TranslationService)

  readonly request = input.required<FrontDeskRequest>()
  readonly dayLoad = input<DayLoadState>(null)
  /** Question key → label (from the profile), for the "missing answer" reason. */
  readonly questionLabels = input<Record<string, string>>({})
  /** True while a decision on this card runs: the three buttons are disabled. */
  readonly busy = input(false)

  readonly approve = output<ApproveEdit>()
  readonly ask = output<void>()
  readonly decline = output<void>()

  protected readonly editing_ = signal(false)
  protected readonly editDate_ = signal('')
  protected readonly editTime_ = signal('')
  protected readonly editParty_ = signal(1)

  protected readonly isOpen_ = computed(() => OPEN_STATUSES.includes(this.request().status))
  protected readonly isTimeBound_ = computed(() => TIME_BOUND_KINDS.includes(this.request().kind))
  protected readonly showDayStrip_ = computed(
    () => this.isTimeBound_() && !!this.request().wanted.date && this.isOpen_()
  )
  protected readonly telHref_ = computed(() => `tel:${this.request().guestPhone}`)
  protected readonly waHref_ = computed(() => waLink(this.request().guestPhone))
  protected readonly receivedAt_ = computed(() => this.request().statusHistory[0]?.at ?? this.request().createdAt)
  protected readonly askNote_ = computed(() => {
    const history = this.request().statusHistory
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].status === 'needs_info') return history[i].note ?? ''
    }
    return ''
  })

  protected readonly wantedParts_ = computed(() => {
    const w = this.request().wanted
    const parts: string[] = []
    if (w.date) parts.push(isoToDmy(w.date))
    if (w.time) parts.push(w.time)
    if (w.partySize) parts.push(`${w.partySize} ${this.translation.translate('rq_party_unit')}`)
    if (w.eventTypeKey) parts.push(this.translation.translate(w.eventTypeKey))
    if (w.budgetPerGuest !== undefined) parts.push(`₪${w.budgetPerGuest} ${this.translation.translate('rq_per_guest')}`)
    if (w.location) parts.push(w.location)
    return parts
  })

  protected readonly verdict_ = computed(() => {
    const q = this.request().qualification
    if (!q) return null
    const tone = q.verdict === 'fit' ? 'green' : q.verdict === 'borderline' ? 'amber' : 'red'
    return { tone, labelKey: `rq_verdict_${q.verdict}`, reasons: q.reasons.map((r) => this.reasonText(r)) }
  })

  protected readonly declineLine_ = computed(() => {
    const d = this.request().decline
    if (!d) return ''
    const reason = this.translation.translate(`rq_reason_${d.reason}`)
    return d.text ? `${reason} — ${d.text}` : reason
  })

  protected readonly bookingDate_ = computed(() => this.request().wanted.date ?? '')

  protected startEdit(): void {
    const w = this.request().wanted
    this.editDate_.set(w.date ?? '')
    this.editTime_.set(w.time ?? '')
    this.editParty_.set(w.partySize ?? 1)
    this.editing_.set(true)
  }

  protected cancelEdit(): void {
    this.editing_.set(false)
  }

  protected onApprove(): void {
    if (!this.editing_()) {
      this.approve.emit(null)
      return
    }
    const w = this.request().wanted
    const wanted: FrontDeskRequest['wanted'] = { ...w }
    if (this.editDate_()) wanted.date = this.editDate_()
    else delete wanted.date
    if (this.editTime_()) wanted.time = this.editTime_()
    else delete wanted.time
    if (w.partySize !== undefined || this.editParty_() !== 1) wanted.partySize = this.editParty_()
    const changed = wanted.date !== w.date || wanted.time !== w.time || wanted.partySize !== w.partySize
    this.editing_.set(false)
    this.approve.emit(changed ? { wanted } : null)
  }

  /** `key|name=value|…` → the dictionary text with its `{name}` placeholders filled in. */
  private reasonText(raw: string): string {
    const [key, ...pairs] = raw.split('|')
    let text = this.translation.translate(key)
    for (const pair of pairs) {
      const at = pair.indexOf('=')
      if (at < 0) continue
      const name = pair.slice(0, at)
      const value = pair.slice(at + 1)
      const shown = name === 'q' ? (this.questionLabels()[value] ?? value) : value
      text = text.replace(`{${name}}`, shown)
    }
    return text
  }
}
