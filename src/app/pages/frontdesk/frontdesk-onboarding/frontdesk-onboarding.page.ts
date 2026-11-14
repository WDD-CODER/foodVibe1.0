import { HttpErrorResponse } from '@angular/common/http'
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms'
import { RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { PageHeaderComponent } from 'src/app/shared/page-header/page-header.component'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'
import { FormFieldComponent } from 'src/app/shared/form-field/form-field.component'
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component'
import { CustomMultiSelectComponent } from 'src/app/shared/custom-multi-select/custom-multi-select.component'
import { DateFieldComponent } from 'src/app/shared/date-field/date-field.component'
import { HoursEditorComponent } from 'src/app/shared/hours-editor/hours-editor.component'
import { TextareaAutoGrowDirective } from 'src/app/core/directives/textarea-auto-grow.directive'
import { BusinessService } from '@services/business.service'
import { FrontDeskProfileDataService } from '@services/front-desk-profile-data.service'
import { KnowledgeItemDataService } from '@services/knowledge-item-data.service'
import { MenuEventTypeService } from '@services/menu-event-type.service'
import { PermissionService } from '@services/permission.service'
import { RequestDataService } from '@services/request-data.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { useUnsavedChanges } from '@utils/unsaved-changes'
import { refusalShownToUser } from '@utils/server-refusal.util'
import {
  checkHoursRow,
  draftToHours,
  hoursToDraft,
  isBrokenHours,
  type HoursDraftRow
} from 'src/app/core/utils/venue-hours.util'
import {
  ASSISTANT_TONES,
  BUSINESS_TYPES,
  type BusinessType,
  type FrontDeskProfile
} from '@models/front-desk-profile.model'
import type { FrontDeskRequestKind } from '@schemas/entities/front-desk-profile.schema'
import { KNOWLEDGE_TOPICS } from '@schemas/entities/knowledge-item.schema'
import {
  ALL_FLAG_KEYS,
  ALL_ITEM_FIELDS,
  ALL_NUMBER_KEYS,
  ALL_TEXT_KEYS,
  APPROVAL_KEYS,
  BASELINE_KEYS,
  BASELINE_LABELS,
  BASICS_ITEMS,
  BASICS_PROFILE_FIELDS,
  CHANNEL_KEYS,
  FAQ_ROWS,
  HOURS_ITEMS,
  POLICY_ITEMS,
  TONE_ITEMS,
  TYPE_FLAGS,
  TYPE_ITEMS,
  TYPE_NUMBER_FIELDS,
  TYPE_TEXT_FIELDS,
  buildIntake,
  type FaqRow,
  type ItemField
} from './onboarding-fields'

const SLUG_RE = /^[a-z0-9-]{3,40}$/
const DAY_MS = 86_400_000

/** Plan 556 (FD-10): the one long, printable intake form Dandan fills with the owner; one save writes profile, knowledge drafts and baseline. */
@Component({
  selector: 'app-front-desk-onboarding',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    NgTemplateOutlet,
    RouterLink,
    LucideAngularModule,
    TranslatePipe,
    PageHeaderComponent,
    EmptyStateComponent,
    FormFieldComponent,
    CustomSelectComponent,
    CustomMultiSelectComponent,
    DateFieldComponent,
    HoursEditorComponent,
    TextareaAutoGrowDirective
  ],
  templateUrl: './frontdesk-onboarding.page.html',
  styleUrl: './frontdesk-onboarding.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FrontDeskOnboardingComponent {
  private readonly profiles = inject(FrontDeskProfileDataService)
  private readonly knowledge = inject(KnowledgeItemDataService)
  private readonly business = inject(BusinessService)
  private readonly requests = inject(RequestDataService)
  private readonly eventTypes = inject(MenuEventTypeService)
  private readonly permission = inject(PermissionService)
  private readonly translation = inject(TranslationService)
  private readonly userMsg = inject(UserMsgService)

  protected readonly typeOptions = BUSINESS_TYPES.map((t) => ({ value: t, label: 'fd_type_' + t }))
  protected readonly toneOptions = ASSISTANT_TONES.map((t) => ({ value: t, label: 'fd_tone_' + t }))
  protected readonly topicOptions = KNOWLEDGE_TOPICS.map((t) => ({ value: t, label: 'knowledge_topic_' + t }))
  protected readonly basicsFields = BASICS_PROFILE_FIELDS
  protected readonly basicsItems: ItemField[] = BASICS_ITEMS
  protected readonly hoursItems: ItemField[] = HOURS_ITEMS
  protected readonly policyItems: ItemField[] = POLICY_ITEMS
  protected readonly toneItems: ItemField[] = TONE_ITEMS
  protected readonly channelKeys = CHANNEL_KEYS
  protected readonly approvalKeys = APPROVAL_KEYS
  protected readonly typeItems = TYPE_ITEMS
  protected readonly typeNumbers = TYPE_NUMBER_FIELDS
  protected readonly typeTexts = TYPE_TEXT_FIELDS
  protected readonly typeFlags = TYPE_FLAGS
  protected readonly baselineKeys = BASELINE_KEYS
  protected readonly baselineLabels = BASELINE_LABELS

  protected readonly isLoading_ = signal(true)
  protected readonly loadFailed_ = signal(false)
  protected readonly isSaving_ = signal(false)
  protected readonly isSendingTest_ = signal(false)
  protected readonly showErrors_ = signal(false)
  protected readonly slugTaken_ = signal(false)
  protected readonly baselineOpen_ = signal(false)

  protected readonly canEdit_ = computed(() => this.permission.can('editFrontDesk'))
  protected readonly profile_ = this.profiles.profile_

  /** One control per field: text, number, flag; plus the type, the tone, the event types and the baseline numbers. */
  protected readonly form = new FormGroup<Record<string, FormControl<unknown>>>({
    type: new FormControl<unknown>(''),
    tone: new FormControl<unknown>('warm'),
    event_types: new FormControl<unknown>([]),
    ...Object.fromEntries(ALL_TEXT_KEYS.map((k) => [k, new FormControl<unknown>('')])),
    ...Object.fromEntries(ALL_NUMBER_KEYS.map((k) => [k, new FormControl<unknown>(null)])),
    ...Object.fromEntries(ALL_FLAG_KEYS.map((k) => [k, new FormControl<unknown>(true)])),
    ...Object.fromEntries(BASELINE_KEYS.map((k) => [k, new FormControl<unknown>(null)]))
  })

  // Rows kept outside the form
  protected readonly hoursRows_ = signal<HoursDraftRow[]>([])
  protected readonly closedDates_ = signal<string[]>([])
  protected readonly newClosed_ = signal('')
  protected readonly faqRows_ = signal<FaqRow[]>(
    Array.from({ length: FAQ_ROWS }, () => ({ question: '', answer: '', topic: 'faq' }))
  )
  protected readonly faqIndexes = Array.from({ length: FAQ_ROWS }, (_, i) => i)

  private readonly unsaved_ = useUnsavedChanges({
    form: () => this.form,
    snapshot: () => this.snapshot()
  })

  protected readonly type_ = signal<BusinessType | ''>('')
  protected readonly eventTypeOptions_ = computed(() =>
    this.eventTypes.allEventTypes_().map((key) => ({ value: key, label: key }))
  )
  /** The chosen type's own fields; null for "other" (only the shared sections) or before a type is chosen. */
  protected readonly typeSection_ = computed(() => {
    const type = this.type_()
    if (!type || type === 'other') return null
    return {
      flags: TYPE_FLAGS[type],
      numbers: TYPE_NUMBER_FIELDS[type],
      texts: TYPE_TEXT_FIELDS[type],
      items: TYPE_ITEMS[type]
    }
  })
  protected readonly slugInvalid_ = computed(() => !SLUG_RE.test(String(this.slugValue_())))
  private readonly slugValue_ = signal('')

  /** The first enabled kind of the saved profile, or null: the test request needs one. */
  protected readonly testKind_ = computed<FrontDeskRequestKind | null>(() => {
    const kinds = this.profile_()?.requestKinds ?? {}
    return (Object.keys(kinds) as FrontDeskRequestKind[]).find((k) => kinds[k]?.enabled) ?? null
  })

  constructor() {
    void this.load()
    this.form.controls['type'].valueChanges.subscribe((v) => this.type_.set((v as BusinessType) || ''))
    this.form.controls['slug'].valueChanges.subscribe((v) => {
      this.slugValue_.set(String(v ?? ''))
      this.slugTaken_.set(false)
    })
    effect(() => {
      const profile = this.profile_()
      untracked(() => {
        if (profile && !this.hydrated) this.hydrate(profile)
      })
    })
  }

  private hydrated = false

  /** Route guard (`pendingChangesGuard`): unsaved edits ask before leaving. */
  hasRealChanges(): boolean {
    return this.unsaved_.hasChanges()
  }

  protected async load(): Promise<void> {
    this.isLoading_.set(true)
    this.loadFailed_.set(false)
    try {
      await Promise.all([this.profiles.ensureLoaded(), this.knowledge.ensureLoaded()])
      const profile = this.profile_()
      if (profile && !this.hydrated) this.hydrate(profile)
      else if (!profile) this.unsaved_.markSaved()
    } catch {
      this.loadFailed_.set(true)
    } finally {
      this.isLoading_.set(false)
    }
  }

  private q(key: string): string {
    return this.translation.translate('onboarding_q_' + key)
  }

  /** Fills the form from the stored profile and the business's draft and approved items, so a second sitting continues. */
  private hydrate(p: FrontDeskProfile): void {
    this.hydrated = true
    const set = (key: string, value: unknown) => this.form.controls[key]?.setValue(value, { emitEvent: true })
    set('type', p.businessType)
    set('display_name', p.displayName)
    set('slug', p.slug)
    set('logo_url', p.logoUrl ?? '')
    set('phone', p.phone ?? '')
    set('address', p.address ?? '')
    set('service_area', p.serviceArea ?? '')
    set('tone', p.assistant.tone)
    set('greeting', p.assistant.greeting ?? '')
    set('handoff_text', p.assistant.handoffText ?? '')
    this.hoursRows_.set((p.hours ?? []).map((h) => hoursToDraft(h as never)))
    this.closedDates_.set([...(p.closedDates ?? [])])
    const kinds = p.requestKinds
    set('max_party_no_call', kinds.table?.rules.maxPartySize ?? null)
    set('sitting_minutes', kinds.table?.defaultDurationMinutes ?? null)
    set('consultation_enabled', kinds.consultation?.enabled ?? true)
    set('tasting_enabled', kinds.tasting?.enabled ?? true)
    const rules = kinds.event?.rules
    set('min_guests', rules?.minPartySize ?? null)
    set('max_guests', rules?.maxPartySize ?? null)
    set('min_budget_per_guest', rules?.minBudgetPerGuest ?? null)
    set('lead_hours', rules?.minLeadHours ?? null)
    set('lead_days', rules?.minLeadHours != null ? Math.round(rules.minLeadHours / 24) : null)
    set('travel_areas', (rules?.areas ?? []).join(', '))
    set('areas', (rules?.areas ?? []).join(', '))
    set('event_types', kinds.event?.questions.find((x) => x.key === 'event_type')?.options ?? [])

    // Knowledge: a field takes the answer of the item with its question; other `faq` items fill the FAQ rows.
    const items = this.knowledge.allItems_()
    const byQuestion = new Map(items.map((i) => [i.question, i]))
    const known = new Set<string>()
    for (const f of ALL_ITEM_FIELDS) {
      const question = this.q(f.key)
      known.add(question)
      const found = byQuestion.get(question)
      if (found) set(f.key, found.answer)
    }
    for (const k of [CHANNEL_KEYS[0], APPROVAL_KEYS[0]]) known.add(this.q(k))
    const faq = items.filter((i) => !known.has(i.question)).slice(0, FAQ_ROWS)
    this.faqRows_.set(
      Array.from({ length: FAQ_ROWS }, (_, i) =>
        faq[i]
          ? { question: faq[i].question, answer: faq[i].answer, topic: faq[i].topic }
          : { question: '', answer: '', topic: 'faq' }
      )
    )
    const baseline = this.business.business_()?.baseline
    if (baseline) {
      for (const k of BASELINE_KEYS) set(k, (baseline as Record<string, unknown>)[k] ?? null)
      if (BASELINE_KEYS.some((k) => (baseline as Record<string, unknown>)[k] !== undefined))
        this.baselineOpen_.set(true)
    }
    this.unsaved_.markSaved()
  }

  private snapshot(): string {
    return JSON.stringify([this.form.getRawValue(), this.hoursRows_(), this.closedDates_(), this.faqRows_()])
  }

  // --- sections ---
  protected toggleBaseline(): void {
    this.baselineOpen_.update((v) => !v)
  }

  protected skipBaseline(): void {
    for (const k of BASELINE_KEYS) this.form.controls[k].setValue(null)
    this.baselineOpen_.set(false)
  }

  // --- hours and dates ---
  protected addClosedDate(): void {
    const date = this.newClosed_()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || this.closedDates_().includes(date) || this.closedDates_().length >= 100)
      return
    this.newClosed_.set('')
    this.closedDates_.update((list) => [...list, date].sort())
  }

  protected removeClosedDate(date: string): void {
    this.closedDates_.update((list) => list.filter((d) => d !== date))
  }

  protected setFaq(index: number, change: Partial<FaqRow>): void {
    this.faqRows_.update((rows) => rows.map((r, i) => (i === index ? { ...r, ...change } : r)))
  }

  protected hoursBroken_ = computed(() => this.hoursRows_().some((r) => isBrokenHours(checkHoursRow(r))))

  // --- save ---
  private state(type: BusinessType) {
    const raw = this.form.getRawValue()
    const rows = this.hoursRows_().filter((r) => {
      const res = checkHoursRow(r)
      return res === 'ok' || res === 'overnight'
    })
    const baseline: Record<string, unknown> = {}
    for (const k of BASELINE_KEYS) baseline[k] = raw[k]
    return {
      type,
      values: raw,
      hours: rows.map(draftToHours) as never,
      closedDates: this.closedDates_(),
      eventTypes: Array.isArray(raw['event_types']) ? (raw['event_types'] as string[]) : [],
      faq: this.faqRows_(),
      baseline,
      tone: (raw['tone'] === 'formal' ? 'formal' : 'warm') as 'warm' | 'formal'
    }
  }

  protected async save(): Promise<void> {
    const type = this.type_()
    if (!type || this.isSaving_() || !this.canEdit_()) {
      this.showErrors_.set(true)
      return
    }
    const hasProfile = !!this.profile_()
    const name = String(this.form.controls['display_name'].value ?? '').trim()
    if (this.hoursBroken_() || (!hasProfile && (!name || this.slugInvalid_()))) {
      this.showErrors_.set(true)
      return
    }
    this.isSaving_.set(true)
    try {
      const body = buildIntake(this.state(type), (key) => this.translation.translate(key))
      const res = await this.business.saveFrontDeskIntake(body)
      await Promise.all([this.profiles.reloadFromStorage(), this.knowledge.reloadFromStorage()])
      this.hydrated = false
      const profile = this.profile_()
      if (profile) this.hydrate(profile)
      this.showErrors_.set(false)
      const skipped = res.knowledge.skipped
      const saved = this.translation.translate('onboarding_saved')
      this.userMsg.onSetSuccessMsg(
        skipped > 0
          ? `${saved} — ${this.translation.translate('onboarding_knowledge_skipped').replace('{{n}}', String(skipped))}`
          : saved
      )
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 409 && err.error?.error === 'SLUG_TAKEN') {
        this.slugTaken_.set(true)
      } else if (!refusalShownToUser(err)) {
        this.userMsg.onSetErrorMsg(this.translation.translate('onboarding_save_failed'))
      }
    } finally {
      this.isSaving_.set(false)
    }
  }

  protected print(): void {
    window.print()
  }

  /** Sends one test request (nothing is added to the client list or the numbers). */
  protected async sendTestRequest(): Promise<void> {
    const profile = this.profile_()
    const kind = this.testKind_()
    if (!profile || !kind || this.isSendingTest_()) return
    this.isSendingTest_.set(true)
    try {
      const date = new Date(Date.now() + 7 * DAY_MS).toISOString().slice(0, 10)
      const partySize = profile.requestKinds[kind]?.rules.minPartySize || 2
      await this.requests.createManual({
        kind,
        test: true,
        guestName: this.translation.translate('onboarding_test_guest'),
        guestPhone: profile.phone || '0500000000',
        wanted: { date, partySize },
        answers: []
      })
      this.userMsg.onSetSuccessMsg(this.translation.translate('onboarding_test_request_sent'))
    } catch (err) {
      if (!refusalShownToUser(err)) this.userMsg.onSetErrorMsg(this.translation.translate('onboarding_save_failed'))
    } finally {
      this.isSendingTest_.set(false)
    }
  }
}
