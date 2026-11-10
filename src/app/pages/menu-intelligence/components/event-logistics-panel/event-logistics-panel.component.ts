import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, signal } from '@angular/core'
import { DatePipe } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component'
import { CounterComponent } from 'src/app/shared/counter/counter.component'
import { DateFieldComponent } from 'src/app/shared/date-field/date-field.component'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { EventPipelineService, type LogisticsPatch } from '@services/event-pipeline.service'
import { LogisticsItemRegistryService } from '@services/logistics-item-registry.service'
import { MenuEventDataService } from '@services/menu-event-data.service'
import { PermissionService } from '@services/permission.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { buildClientSummary } from 'src/app/core/utils/logistics-summary.util'
import {
  LOGISTICS_LABEL_MAX,
  LOGISTICS_PAYERS,
  LOGISTICS_SECTIONS,
  LOGISTICS_TEXT_MAX,
  type LogisticsAnswerStatus,
  type LogisticsAnswerType,
  type LogisticsPayer,
  type LogisticsPhase,
  type LogisticsSection
} from '@schemas/entities'
import type { LogisticsAnswer } from '@models/menu-event.model'
import type { EnvironmentType } from '@models/venue.model'

/** What one save carries per answer (the server stamps `at`, `by`, `byName`). */
export type DraftAnswer = Omit<LogisticsAnswer, 'at' | 'by' | 'byName'>

interface LogisticsRow {
  key: string
  label: string
  hint?: string
  section: LogisticsSection
  phase: LogisticsPhase
  answerType: LogisticsAnswerType
  adhoc: boolean
  answer: LogisticsAnswer | undefined
  status: LogisticsAnswerStatus
  open: boolean
}

interface LogisticsSectionView {
  section: LogisticsSection
  rows: LogisticsRow[]
  openCount: number
}

const SAVE_DELAY_MS = 600
const PHASES: readonly LogisticsPhase[] = ['intake', 'site_visit']
const ENVIRONMENTS: EnvironmentType[] = ['professional_kitchen', 'outdoor_field', 'client_home', 'popup_venue']

/**
 * Plan 522: the phone-intake and site-visit checklist of one stored event. Collapsed by default; every answer is
 * written into `pending_` and saved 600 ms after the last change through `EventPipelineService.saveLogistics`.
 */
@Component({
  selector: 'app-event-logistics-panel',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    LucideAngularModule,
    TranslatePipe,
    CustomSelectComponent,
    CounterComponent,
    DateFieldComponent
  ],
  templateUrl: './event-logistics-panel.component.html',
  styleUrl: './event-logistics-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EventLogisticsPanelComponent {
  // 1. INJECTED
  private readonly eventData = inject(MenuEventDataService)
  private readonly pipeline = inject(EventPipelineService)
  private readonly registry = inject(LogisticsItemRegistryService)
  private readonly permission = inject(PermissionService)
  private readonly confirmModal = inject(ConfirmModalService)
  private readonly userMsg = inject(UserMsgService)
  private readonly translation = inject(TranslationService)
  private readonly destroyRef = inject(DestroyRef)

  // 2. INPUTS
  readonly eventId = input<string | null>(null)

  // 4. SIGNALS & CONSTANTS
  protected readonly phases = PHASES
  protected readonly payers = LOGISTICS_PAYERS
  protected readonly statuses: LogisticsAnswerStatus[] = ['unchecked', 'needed', 'not_needed', 'client_provides']
  protected readonly environmentOptions = ENVIRONMENTS.map((value) => ({ value, label: value }))
  protected readonly textMax = LOGISTICS_TEXT_MAX
  protected readonly labelMax = LOGISTICS_LABEL_MAX
  protected readonly open_ = signal(false)
  protected readonly phase_ = signal<LogisticsPhase>('intake')
  protected readonly openOnly_ = signal(false)
  protected readonly pending_ = signal<Map<string, DraftAnswer>>(new Map())
  protected readonly envDraft_ = signal<EnvironmentType | null>(null)
  protected readonly noteOpen_ = signal<ReadonlySet<string>>(new Set())
  protected readonly addDraft_ = signal<Partial<Record<LogisticsSection, string>>>({})
  private timer: ReturnType<typeof setTimeout> | null = null

  // 5. COMPUTED
  protected readonly event_ = computed(
    () => this.eventData.allMenuEvents_().find((e) => e._id === this.eventId()) ?? null
  )
  protected readonly environment_ = computed<EnvironmentType | undefined>(
    () => this.envDraft_() ?? this.event_()?.logistics?.environmentType
  )
  protected readonly canEdit_ = computed(() => {
    const event = this.event_()
    return (
      !!event && event.stage !== 'finished' && this.permission.can('editLogistics', { type: 'menuEvents', doc: event })
    )
  })
  /** Stored answers with the unsaved drafts laid over them. */
  private readonly answers_ = computed<LogisticsAnswer[]>(() => {
    const merged = new Map<string, LogisticsAnswer>()
    for (const a of this.event_()?.siteLogistics?.answers ?? []) merged.set(a.itemKey, a)
    for (const [key, draft] of this.pending_()) {
      const stored = merged.get(key)
      merged.set(key, { ...stored, ...draft, at: stored?.at ?? 0, by: stored?.by ?? '', byName: stored?.byName ?? '' })
    }
    return [...merged.values()]
  })
  private readonly rowsByPhase_ = computed<Record<LogisticsPhase, LogisticsRow[]>>(() => ({
    intake: this.buildRows('intake'),
    site_visit: this.buildRows('site_visit')
  }))
  protected readonly openCounts_ = computed<Record<LogisticsPhase, number>>(() => {
    const rows = this.rowsByPhase_()
    return {
      intake: rows.intake.filter((r) => r.open).length,
      site_visit: rows.site_visit.filter((r) => r.open).length
    }
  })
  protected readonly totalOpen_ = computed(() => this.openCounts_().intake + this.openCounts_().site_visit)
  protected readonly openCount_ = computed(() => this.openCounts_()[this.phase_()])
  protected readonly sections_ = computed<LogisticsSectionView[]>(() => {
    const rows = this.rowsByPhase_()[this.phase_()]
    const onlyOpen = this.openOnly_()
    return LOGISTICS_SECTIONS.map((section) => {
      const inSection = rows.filter((r) => r.section === section)
      return {
        section,
        rows: onlyOpen ? inSection.filter((r) => r.open) : inSection,
        openCount: inSection.filter((r) => r.open).length
      }
    }).filter((s) => s.rows.length > 0)
  })
  protected readonly phaseDoneAt_ = computed(() => this.event_()?.siteLogistics?.phaseDone?.[this.phase_()])

  constructor() {
    void this.registry.loadSafely()
    this.destroyRef.onDestroy(() => {
      this.clearTimer()
      if (this.pending_().size) void this.flush()
    })
  }

  // 6. METHODS
  private buildRows(phase: LogisticsPhase): LogisticsRow[] {
    const answers = this.answers_()
    const items = this.registry.forPhase(phase, this.environment_())()
    const known = new Set(this.registry.items_().map((i) => i.key))
    const rows: LogisticsRow[] = items.map((item) => {
      const answer = answers.find((a) => a.itemKey === item.key)
      const status = answer?.status ?? 'unchecked'
      return {
        key: item.key,
        label: item.key,
        hint: item.hint,
        section: item.section,
        phase,
        answerType: item.answerType,
        adhoc: false,
        answer,
        status,
        open: status === 'unchecked'
      }
    })
    for (const answer of answers) {
      if (answer.phase !== phase || items.some((i) => i.key === answer.itemKey)) continue
      const adhoc = answer.itemKey.startsWith('adhoc:')
      // An item the environment filter hides keeps its answer; only an answer whose item is gone shows as a row.
      if (!adhoc && known.has(answer.itemKey)) continue
      rows.push({
        key: answer.itemKey,
        label: answer.label ?? answer.itemKey,
        section: answer.section,
        phase,
        answerType: 'text',
        adhoc,
        answer,
        status: answer.status,
        open: answer.status === 'unchecked'
      })
    }
    return rows
  }

  protected selectPhase(phase: LogisticsPhase): void {
    this.phase_.set(phase)
  }

  protected toggleOpenOnly(): void {
    this.openOnly_.update((v) => !v)
  }

  protected toggleNote(key: string): void {
    this.noteOpen_.update((s) => {
      const next = new Set(s)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  protected showNote(row: LogisticsRow): boolean {
    return row.answerType === 'text' || this.noteOpen_().has(row.key) || !!row.answer?.text
  }

  protected setStatus(row: LogisticsRow, status: LogisticsAnswerStatus): void {
    this.update(row, { status })
  }
  protected setQuantity(row: LogisticsRow, quantity: number): void {
    this.update(row, { quantity })
  }
  protected setText(row: LogisticsRow, text: string): void {
    this.update(row, { text })
  }
  protected setPayer(row: LogisticsRow, payer: LogisticsPayer): void {
    this.update(row, { payer })
  }
  protected setShowToClient(row: LogisticsRow, showToClient: boolean): void {
    this.update(row, { showToClient })
  }

  private update(row: LogisticsRow, patch: Partial<DraftAnswer>): void {
    if (!this.canEdit_()) return
    const base = this.pending_().get(row.key) ?? this.draftOf(row)
    this.pending_.update((m) => new Map(m).set(row.key, { ...base, ...patch }))
    this.schedule()
  }

  private draftOf(row: LogisticsRow): DraftAnswer {
    const a = row.answer
    const draft: DraftAnswer = {
      itemKey: row.key,
      phase: row.phase,
      section: row.section,
      status: a?.status ?? 'unchecked'
    }
    if (row.adhoc) draft.label = a?.label ?? row.label
    if (a?.quantity !== undefined) draft.quantity = a.quantity
    if (a?.text !== undefined) draft.text = a.text
    if (a?.payer !== undefined) draft.payer = a.payer
    if (a?.showToClient !== undefined) draft.showToClient = a.showToClient
    return draft
  }

  private schedule(): void {
    this.clearTimer()
    this.timer = setTimeout(() => {
      this.timer = null
      void this.flush()
    }, SAVE_DELAY_MS)
  }

  private clearTimer(): void {
    if (this.timer !== null) clearTimeout(this.timer)
    this.timer = null
  }

  private async flush(): Promise<boolean> {
    const id = this.eventId()
    const batch = new Map(this.pending_())
    if (!id || batch.size === 0) return true
    const result = await this.pipeline.saveLogistics(id, { answers: [...batch.values()] })
    if (!result.ok) {
      this.userMsg.onSetErrorMsg(this.translation.translate('logistics_save_failed'))
      return false
    }
    this.pending_.update((m) => {
      const next = new Map(m)
      for (const [key, sent] of batch) if (next.get(key) === sent) next.delete(key)
      return next
    })
    return true
  }

  private async saveNow(patch: LogisticsPatch): Promise<boolean> {
    const id = this.eventId()
    if (!id || !this.canEdit_()) return false
    const result = await this.pipeline.saveLogistics(id, patch)
    if (!result.ok) this.userMsg.onSetErrorMsg(this.translation.translate('logistics_save_failed'))
    return result.ok
  }

  protected setEnvironment(value: string): void {
    if (!ENVIRONMENTS.includes(value as EnvironmentType) || value === this.environment_()) return
    this.envDraft_.set(value as EnvironmentType)
    void this.saveNow({ environmentType: value as EnvironmentType })
  }

  protected setMeetingAt(value: string): void {
    void this.saveNow({ meetingAt: value })
  }

  protected setMeetingWith(event: Event): void {
    const value = (event.target as HTMLInputElement).value
    if (value === (this.event_()?.siteLogistics?.meetingWith ?? '')) return
    void this.saveNow({ meetingWith: value })
  }

  protected onAddInput(section: LogisticsSection, event: Event): void {
    const value = (event.target as HTMLInputElement).value
    this.addDraft_.update((d) => ({ ...d, [section]: value }))
  }

  protected addAdhoc(section: LogisticsSection): void {
    const label = (this.addDraft_()[section] ?? '').trim()
    if (!label || !this.canEdit_()) return
    const itemKey = 'adhoc:' + crypto.randomUUID()
    const draft: DraftAnswer = { itemKey, label, phase: this.phase_(), section, status: 'unchecked' }
    this.pending_.update((m) => new Map(m).set(itemKey, draft))
    this.addDraft_.update((d) => ({ ...d, [section]: '' }))
    this.schedule()
  }

  protected async phaseDone(): Promise<void> {
    if (!this.canEdit_()) return
    const phase = this.phase_()
    if (this.openCount_() > 0) {
      const phaseRows = this.rowsByPhase_()[phase]
      const labels = phaseRows.filter((r) => r.open).map((r) => r.label)
      const message = this.translation.translate('logistics_phase_done_confirm') + '\n' + labels.join(' · ')
      if (!(await this.confirmModal.open(message))) return
    }
    this.clearTimer()
    await this.flush()
    await this.saveNow({ phaseDone: { [phase]: Date.now() } })
  }

  protected reopenPhase(): void {
    void this.saveNow({ phaseDone: { [this.phase_()]: null } })
  }

  protected async copySummary(): Promise<void> {
    const text = buildClientSummary(this.answers_(), this.registry.items_(), (k) => this.translation.translate(k))
    if (!text) {
      this.userMsg.onSetWarningMsg(this.translation.translate('logistics_nothing_to_copy'))
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      this.userMsg.onSetSuccessMsg(this.translation.translate('logistics_copied'))
    } catch {
      this.userMsg.onSetErrorMsg(this.translation.translate('logistics_copy_failed'))
    }
  }
}
