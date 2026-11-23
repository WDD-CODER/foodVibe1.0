import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  NgZone,
  computed,
  effect,
  inject,
  signal,
  untracked
} from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { CounterComponent } from 'src/app/shared/counter/counter.component'
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component'
import { DateFieldComponent } from 'src/app/shared/date-field/date-field.component'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'
import { FormFieldComponent } from 'src/app/shared/form-field/form-field.component'
import { TimeFieldComponent } from 'src/app/shared/time-field/time-field.component'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { waLink } from 'src/app/core/utils/wa-link.util'
import { parseReason, qualify, type Wanted } from '@schemas/front-desk/qualify'
import { WANTED_QUESTION_KEYS } from '@schemas/front-desk-templates'
import type { PublicRequestInput } from '@schemas/public/public-request.schema'
import { PublicRequestService, type PublicKindView, type PublicProfileView } from './services/public-request.service'
import { bookingIcs, downloadIcs } from './services/booking-calendar.util'
import { PublicBrandComponent } from './components/public-brand/public-brand.component'

type TimesState = 'idle' | 'loading' | 'ready' | 'failed' | 'too_many'

type PageState = 'loading' | 'ready' | 'not_found' | 'unavailable' | 'failed' | 'done'

const TIME_BOUND: readonly string[] = ['table', 'tasting', 'consultation']
/** Questions the form already shows as its own fields. */
const FIXED_KEYS: readonly string[] = ['date', 'time', 'party_size']
const WAKING_AFTER_MS = 6000
const LAST_KEY = 'fv_pb_last_'
const DEFAULT_MINUTES = 120
/** `YYYY-MM-DD` shown as `DD/MM`. */
const dayMonth = (date: string): string => date.slice(8, 10) + '/' + date.slice(5, 7)

/**
 * Plan 555 (C-PUBLIC): the public request form, `/book/:slug`. Hebrew only, no account, no app header.
 * Three steps (kind, details, contact). The step lives in the `?step=` query so browser back and the in-page back are
 * the same history. Nothing is stored; leaving the page loses the draft.
 */
@Component({
  selector: 'app-public-request-page',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    LucideAngularModule,
    TranslatePipe,
    CounterComponent,
    CustomSelectComponent,
    DateFieldComponent,
    TimeFieldComponent,
    EmptyStateComponent,
    FormFieldComponent,
    PublicBrandComponent
  ],
  providers: [PublicRequestService],
  templateUrl: './public-request.page.html',
  styleUrl: './public-request.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PublicRequestPage {
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly api = inject(PublicRequestService)
  private readonly translation = inject(TranslationService)
  private readonly userMsg = inject(UserMsgService)
  private readonly destroyRef = inject(DestroyRef)
  private readonly zone = inject(NgZone)

  protected readonly slug = this.route.snapshot.paramMap.get('slug') ?? ''
  protected readonly state_ = signal<PageState>('loading')
  protected readonly waking_ = signal(false)
  protected readonly profile_ = signal<PublicProfileView | null>(null)
  protected readonly unavailableName_ = signal('')
  private readonly queryStep_ = signal(1)
  /** The highest step the guest has reached: a deep link to a later step starts at step 1. */
  private readonly reached_ = signal(1)

  protected readonly kind_ = signal<string>('')
  protected readonly date_ = signal('')
  protected readonly time_ = signal('')
  protected readonly party_ = signal(2)
  protected readonly answers_ = signal<Record<string, string>>({})
  protected readonly name_ = signal('')
  protected readonly phone_ = signal('')
  protected readonly consent_ = signal(false)
  protected readonly website_ = signal('')
  protected readonly touched_ = signal(false)
  protected readonly isSaving_ = signal(false)
  protected readonly sendError_ = signal<'' | 'too_many' | 'failed'>('')
  protected readonly fieldErrors_ = signal<Record<string, boolean>>({})
  protected readonly reference_ = signal('')
  protected readonly token_ = signal('')
  protected readonly last_ = signal<{ token: string; reference: string } | null>(null)

  // Plan 670: table mode (hours as chips, area, confirmed or waiting).
  protected readonly area_ = signal('')
  protected readonly slots_ = signal<{ time: string; available: boolean }[]>([])
  protected readonly next_ = signal<{ date: string; time: string } | null>(null)
  protected readonly timesState_ = signal<TimesState>('idle')
  protected readonly alternatives_ = signal<{ date: string; time: string }[]>([])
  protected readonly timeTaken_ = signal(false)
  protected readonly confirmed_ = signal(false)
  protected readonly booking_ = signal<{ date: string; time: string; partySize: number } | null>(null)
  private readonly retry_ = signal(0)
  private readonly pendingTime_ = signal('')
  private readSeq = 0

  protected readonly phoneDigits_ = computed(() => this.phone_().replace(/\D/g, '').length)
  protected readonly step_ = computed(() => {
    const kinds = this.profile_()?.kinds ?? []
    const first = kinds.length > 1 ? 1 : 2
    return Math.min(Math.max(this.queryStep_(), first), this.reached_())
  })
  protected readonly hasKindStep_ = computed(() => (this.profile_()?.kinds.length ?? 0) > 1)
  protected readonly kindView_ = computed<PublicKindView | null>(
    () => this.profile_()?.kinds.find((k) => k.kind === this.kind_()) ?? null
  )
  protected readonly timeBound_ = computed(() => TIME_BOUND.includes(this.kind_()))
  protected readonly tableMode_ = computed(() => !!this.profile_()?.tableBooking && this.kind_() === 'table')
  protected readonly areas_ = computed(() => this.profile_()?.tableBooking?.areas ?? [])
  protected readonly anyFree_ = computed(() => this.slots_().some((s) => s.available))
  protected readonly nextFreeText_ = computed(() => {
    const n = this.next_()
    return n
      ? this.translation.translate('pb_next_free').replace('{date}', dayMonth(n.date)).replace('{time}', n.time)
      : ''
  })
  protected readonly hasParty_ = computed(() => !!this.kind_() && this.kind_() !== 'consultation')
  protected readonly partyMin_ = computed(() => Math.max(1, this.kindView_()?.rules.minPartySize ?? 1))
  protected readonly partyMax_ = computed(() => this.kindView_()?.rules.maxPartySize || undefined)
  protected readonly extraQuestions_ = computed(() =>
    (this.kindView_()?.questions ?? [])
      .filter((q) => !FIXED_KEYS.includes(q.key) && !(this.tableMode_() && q.key === 'seating'))
      .map((q) => ({
        ...q,
        text: this.translation.translate(q.label),
        choices: (q.options ?? []).map((o) => ({ value: o, label: o }))
      }))
  )
  protected readonly isRequired = (key: string): boolean =>
    !!this.kindView_()?.questions.some((q) => q.key === key && q.required)

  protected readonly wanted_ = computed<Wanted>(() => {
    const wanted: Wanted = {}
    if (this.date_()) wanted.date = this.date_()
    if (this.time_() && this.timeBound_()) wanted.time = this.time_()
    if (this.hasParty_()) wanted.partySize = this.party_()
    for (const q of this.extraQuestions_()) {
      const value = (this.answers_()[q.key] ?? '').trim()
      const field = (WANTED_QUESTION_KEYS as Record<string, keyof Wanted>)[q.key]
      if (!value || !field) continue
      if (field === 'budgetPerGuest') wanted.budgetPerGuest = Number(value)
      else if (field === 'eventTypeKey' || field === 'location') wanted[field] = value
    }
    return wanted
  })

  /** Reasons the details break a rule (R-10): shown as a note; the guest may still send (Q2). */
  protected readonly notes_ = computed(() => {
    const profile = this.profile_()
    const view = this.kindView_()
    if (!profile || !view || this.step_() !== 2) return []
    const answers = Object.fromEntries(Object.entries(this.answers_()).filter(([, v]) => v.trim()))
    const result = qualify(
      {
        enabled: true,
        questions: view.questions,
        rules: view.rules,
        expireAfterHours: 24
      },
      this.wanted_(),
      answers,
      { now: Date.now(), hours: profile.hours, closedDates: profile.closedDates, kind: view.kind }
    )
    return result.reasons.filter((r) => !r.startsWith('fd_reason_missing_answer')).map((r) => this.reasonText(r))
  })

  protected readonly statusLink_ = computed(() => `/book/${this.slug}/r/${this.token_()}`)
  protected readonly fullStatusLink_ = computed(() => `${location.origin}${this.statusLink_()}`)
  protected readonly whatsappLink_ = computed(() =>
    waLink(this.profile_()?.phone, `בקשה ${this.reference_()} · ${this.slug}`)
  )
  protected readonly telLink_ = computed(() => {
    const phone = this.profile_()?.phone
    return phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : null
  })
  protected readonly unavailableText_ = computed(() =>
    this.translation.translate('pb_not_available').replace('{name}', this.unavailableName_())
  )
  protected readonly consentText_ = computed(() =>
    this.translation.translate('pb_consent').replace('{name}', this.profile_()?.displayName ?? '')
  )
  protected readonly doneConfirmedText_ = computed(() => {
    const b = this.booking_()
    return this.translation
      .translate('pb_done_confirmed_text')
      .replace('{name}', this.profile_()?.displayName ?? '')
      .replace('{date}', b ? dayMonth(b.date) : '')
      .replace('{time}', b?.time ?? '')
      .replace('{party}', String(b?.partySize ?? ''))
  })
  protected readonly doneWaitingText_ = computed(() =>
    this.translation.translate('pb_done_waiting_text').replace('{name}', this.profile_()?.displayName ?? '')
  )
  protected readonly doneText_ = computed(() =>
    this.translation.translate('pb_done_text').replace('{name}', this.profile_()?.displayName ?? '')
  )
  protected readonly referenceText_ = computed(() =>
    this.translation.translate('pb_reference').replace('{ref}', this.reference_())
  )

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((q) => {
      const step = Number(q.get('step'))
      this.queryStep_.set(Number.isInteger(step) && step >= 1 && step <= 3 ? step : 1)
    })
    // Outside the zone: a pending 6 s timer must not hold the app unstable (tests wait for stability).
    const timer = this.zone.runOutsideAngular(() => setTimeout(() => this.waking_.set(true), WAKING_AFTER_MS))
    this.destroyRef.onDestroy(() => clearTimeout(timer))
    effect(() => {
      const on = this.tableMode_()
      const date = this.date_()
      const party = this.party_()
      const area = this.area_()
      this.retry_()
      if (!on || !date) {
        untracked(() => this.clearTimes())
        return
      }
      untracked(() => void this.readTimes(date, party, area))
    })
    void this.load()
  }

  private clearTimes(): void {
    this.readSeq++
    this.slots_.set([])
    this.next_.set(null)
    this.timesState_.set('idle')
  }

  /** The newest read wins: an older answer that arrives late is ignored. */
  private async readTimes(date: string, party: number, area: string): Promise<void> {
    const seq = ++this.readSeq
    this.timesState_.set('loading')
    const res = await this.api.availability(this.slug, date, party, area || undefined)
    if (seq !== this.readSeq) return
    if (!res.ok) {
      this.slots_.set([])
      this.next_.set(null)
      this.timesState_.set(res.code === 'TOO_MANY' ? 'too_many' : 'failed')
      return
    }
    this.slots_.set(res.slots)
    this.next_.set(res.next ?? null)
    const free = (t: string) => res.slots.some((s) => s.time === t && s.available)
    const pending = this.pendingTime_()
    if (pending) {
      this.pendingTime_.set('')
      if (free(pending)) this.time_.set(pending)
    }
    if (this.time_() && !free(this.time_())) this.time_.set('')
    this.timesState_.set('ready')
  }

  protected reloadTimes(): void {
    this.retry_.update((n) => n + 1)
  }

  protected pickTime(time: string): void {
    this.time_.set(time)
    this.timeTaken_.set(false)
    this.alternatives_.set([])
  }

  /** The nearest free time (or an alternative): set its date, choose its hour after the next read. */
  protected pickDay(day: { date: string; time: string }): void {
    this.pendingTime_.set(day.time)
    this.timeTaken_.set(false)
    this.alternatives_.set([])
    this.date_.set(day.date)
    this.reloadTimes()
  }

  protected dayMonth(date: string): string {
    return dayMonth(date)
  }

  protected async addToCalendar(): Promise<void> {
    const b = this.booking_()
    if (!b) return
    const name = this.profile_()?.displayName ?? ''
    const text = await bookingIcs({
      title: this.translation.translate('pb_calendar_title').replace('{name}', name),
      date: b.date,
      time: b.time,
      minutes: this.kindView_()?.durationMinutes ?? DEFAULT_MINUTES,
      location: this.profile_()?.address
    })
    if (text) downloadIcs(text)
    else this.userMsg.onSetErrorMsg(this.translation.translate('save_failed'))
  }

  protected async load(): Promise<void> {
    this.state_.set('loading')
    const res = await this.api.loadProfile(this.slug)
    this.waking_.set(false)
    if (res.state === 'ready') {
      this.profile_.set(res.profile)
      if (res.profile.kinds.length === 1) this.kind_.set(res.profile.kinds[0].kind)
      this.party_.set(Math.max(2, this.partyMin_()))
      this.last_.set(this.readLast())
      this.state_.set(res.profile.kinds.length ? 'ready' : 'unavailable')
      this.unavailableName_.set(res.profile.displayName)
      if (!this.hasKindStep_()) this.reached_.set(2)
      return
    }
    if (res.state === 'unavailable') this.unavailableName_.set(res.displayName)
    this.state_.set(res.state)
  }

  protected setKind(kind: string): void {
    this.kind_.set(kind)
    this.party_.set(Math.max(this.party_(), this.partyMin_()))
  }

  protected answerOf(key: string): string {
    return this.answers_()[key] ?? ''
  }

  protected setAnswer(key: string, value: string): void {
    this.answers_.update((a) => ({ ...a, [key]: value }))
  }

  protected kindLabel(kind: string): string {
    return `fd_kind_${kind}`
  }

  protected missing(key: string, value: unknown): boolean {
    return this.touched_() && this.isRequired(key) && (value === '' || value === null || value === undefined)
  }

  protected detailsValid(): boolean {
    if (!this.kind_()) return false
    if (this.isRequired('date') && !this.date_()) return false
    if (this.tableMode_()) {
      if (!this.date_() || !this.time_()) return false
    } else if (this.timeBound_() && this.isRequired('time') && !this.time_()) return false
    return this.extraQuestions_().every((q) => !q.required || !!(this.answers_()[q.key] ?? '').trim())
  }

  protected contactValid(): boolean {
    return this.name_().trim().length >= 2 && this.phone_().replace(/\D/g, '').length >= 7 && this.consent_()
  }

  protected goNext(): void {
    this.touched_.set(true)
    const step = this.step_()
    if (step === 1 && !this.kind_()) return
    if (step === 2 && !this.detailsValid()) return
    this.touched_.set(false)
    const next = step + 1
    this.reached_.update((r) => Math.max(r, next))
    void this.router.navigate([], { relativeTo: this.route, queryParams: { step: next } })
  }

  /** Back goes one step in the browser history, so the browser's back button does the same. */
  protected goBack(): void {
    history.back()
  }

  protected async submit(): Promise<void> {
    this.touched_.set(true)
    this.sendError_.set('')
    this.fieldErrors_.set({})
    if (this.isSaving_() || !this.contactValid()) return
    const view = this.kindView_()
    if (!view) return
    const wanted = this.wanted_()
    const answers = this.extraQuestions_()
      .filter((q) => !(q.key in WANTED_QUESTION_KEYS))
      .map((q) => ({ questionKey: q.key, value: (this.answers_()[q.key] ?? '').trim() }))
      .filter((a) => a.value)
    const input: PublicRequestInput = {
      kind: view.kind,
      guestName: this.name_().trim(),
      guestPhone: this.phone_().trim(),
      wanted,
      answers,
      ...(this.tableMode_() && this.area_() && { areaKey: this.area_() }),
      consentTerms: true,
      ...(this.website_() && { website: this.website_() })
    }
    this.isSaving_.set(true)
    const res = await this.api.send(this.slug, input)
    this.isSaving_.set(false)
    if (res.ok) {
      this.reference_.set(res.reference)
      this.token_.set(res.token)
      this.writeLast(res.token, res.reference)
      this.confirmed_.set(!!res.confirmed)
      this.booking_.set(res.booking ?? null)
      this.state_.set('done')
      return
    }
    if (res.code === 'NO_TABLE' && this.tableMode_()) {
      this.time_.set('')
      this.alternatives_.set(res.alternatives ?? [])
      this.timeTaken_.set(true)
      this.reloadTimes()
      void this.router.navigate([], { relativeTo: this.route, queryParams: { step: 2 } })
      return
    }
    if (res.code === 'NOT_AVAILABLE') {
      this.unavailableName_.set(this.profile_()?.displayName ?? '')
      this.state_.set('unavailable')
    } else if (res.code === 'TOO_MANY') {
      this.sendError_.set('too_many')
    } else if (res.code === 'BAD_REQUEST_INPUT' && res.issues.length) {
      this.fieldErrors_.set(Object.fromEntries(res.issues.map((i) => [i.path.split('.')[0], true])))
    } else {
      this.sendError_.set('failed')
    }
  }

  protected async copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.fullStatusLink_())
      this.userMsg.onSetSuccessMsg(this.translation.translate('fd_link_copied'))
    } catch {
      this.userMsg.onSetErrorMsg(this.translation.translate('save_failed'))
    }
  }

  private reasonText(reason: string): string {
    const { key, params } = parseReason(reason)
    let text = this.translation.translate(key)
    for (const [name, value] of Object.entries(params)) {
      const shown =
        name === 'days'
          ? value
              .split(',')
              .map((d) => this.dayName(Number(d)))
              .join(', ')
          : value
      text = text.replace(`{${name}}`, shown)
    }
    return text
  }

  /** Day index 0 = Sunday (the profile's `dayIndexes`). */
  private dayName(index: number): string {
    return new Date(2023, 0, 1 + index).toLocaleDateString('he-IL', { weekday: 'long' })
  }

  private readLast(): { token: string; reference: string } | null {
    try {
      const raw = localStorage.getItem(LAST_KEY + this.slug)
      const parsed = raw ? (JSON.parse(raw) as { token?: unknown; reference?: unknown }) : null
      return parsed && typeof parsed.token === 'string' && typeof parsed.reference === 'string'
        ? { token: parsed.token, reference: parsed.reference }
        : null
    } catch {
      return null
    }
  }

  private writeLast(token: string, reference: string): void {
    try {
      localStorage.setItem(LAST_KEY + this.slug, JSON.stringify({ token, reference }))
    } catch {
      /* per-viewer convenience only */
    }
  }
}
