import { NgTemplateOutlet } from '@angular/common'
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { CounterComponent } from 'src/app/shared/counter/counter.component'
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'
import { DisabledWhyDirective } from 'src/app/shared/tooltip/disabled-why.directive'
import { VoiceNoteComponent, type VoiceNoteSend } from 'src/app/shared/voice-note/voice-note.component'
import { EventPipelineService } from '@services/event-pipeline.service'
import { GeminiService, type LogisticsConfirmLine } from '@services/gemini.service'
import { LoggingService } from '@services/logging.service'
import { LogisticsItemRegistryService } from '@services/logistics-item-registry.service'
import { MenuEventDataService } from '@services/menu-event-data.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import {
  LOGISTICS_LABEL_MAX,
  LOGISTICS_TEXT_MAX,
  type LogisticsAnswerType,
  type LogisticsPhase
} from '@schemas/entities'
import type { LogisticsDraftConflict, LogisticsExtractResponse } from '@schemas/logistics/extract.schema'
import type { LogisticsAnswer } from '@models/menu-event.model'
import type { DraftAnswer } from '../event-logistics-panel.component'

type DraftStatus = 'needed' | 'not_needed' | 'client_provides'
type Provider = 'ours' | 'client'

/** One suggested answer or ad-hoc item the owner can keep, change or drop. */
interface DraftLine {
  id: string
  kind: 'answer' | 'adhoc'
  itemKey: string
  label: string
  hint?: string
  phase: LogisticsPhase
  section: string
  answerType: LogisticsAnswerType
  keep: boolean
  needed: boolean
  provider: Provider
  quantity: number
  text: string
}

interface ConflictLine {
  id: string
  conflict: LogisticsDraftConflict
  stored: LogisticsAnswer | undefined
  replace: boolean
}

const statusKey = (status: string): string =>
  status === 'client_provides' ? 'logistics_status_client_provides' : `logistics_status_${status}`

/**
 * Plan 623: turns a recorded or pasted site-visit note into a draft of checklist answers. Two steps in one block:
 * the note (`input`), then the line-by-line review (`review`). Nothing is written until the owner presses save.
 */
@Component({
  selector: 'app-logistics-note-draft',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    FormsModule,
    TranslatePipe,
    CounterComponent,
    CustomSelectComponent,
    EmptyStateComponent,
    VoiceNoteComponent,
    DisabledWhyDirective
  ],
  templateUrl: './logistics-note-draft.component.html',
  styleUrl: './logistics-note-draft.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LogisticsNoteDraftComponent {
  // 1. INJECTED
  private readonly gemini = inject(GeminiService)
  private readonly pipeline = inject(EventPipelineService)
  private readonly eventData = inject(MenuEventDataService)
  protected readonly registry = inject(LogisticsItemRegistryService)
  private readonly userMsg = inject(UserMsgService)
  private readonly translation = inject(TranslationService)
  private readonly logging = inject(LoggingService)

  // 2. INPUTS / OUTPUTS
  readonly eventId = input.required<string>()
  readonly phase = input.required<LogisticsPhase>()
  readonly done = output<void>()

  // 4. SIGNALS & CONSTANTS
  protected readonly textMax = LOGISTICS_TEXT_MAX
  protected readonly labelMax = LOGISTICS_LABEL_MAX
  protected readonly step_ = signal<'input' | 'review'>('input')
  protected readonly text_ = signal('')
  protected readonly isExtracting_ = signal(false)
  protected readonly isSaving_ = signal(false)
  protected readonly lines_ = signal<DraftLine[]>([])
  protected readonly conflicts_ = signal<ConflictLine[]>([])
  protected readonly unanswered_ = signal<string[]>([])
  private draftId: string | null = null
  private draftPhase: LogisticsPhase = 'intake'

  // 5. COMPUTED
  protected readonly answerLines_ = computed(() => this.lines_().filter((l) => l.kind === 'answer'))
  protected readonly adhocLines_ = computed(() => this.lines_().filter((l) => l.kind === 'adhoc'))
  protected readonly isEmpty_ = computed(() => this.lines_().length === 0 && this.conflicts_().length === 0)
  protected readonly keptCount_ = computed(
    () => this.lines_().filter((l) => this.isKept(l)).length + this.conflicts_().filter((c) => c.replace).length
  )
  protected readonly sectionOptions_ = computed(() =>
    this.registry.sections_().map((value) => ({ value, label: this.registry.sectionLabel(value) }))
  )

  // 6. METHODS
  protected isKept(line: DraftLine): boolean {
    return line.keep && (line.kind === 'answer' || !!line.label.trim())
  }

  protected async extract(note: VoiceNoteSend): Promise<void> {
    if (this.isExtracting_()) return
    const phase = this.phase()
    this.isExtracting_.set(true)
    try {
      const draft = await this.gemini.extractLogistics({
        eventId: this.eventId(),
        phase,
        text: note.text,
        ...(note.fileId && { fileId: note.fileId })
      })
      this.draftPhase = phase
      this.open(draft)
    } catch (err) {
      const e = err as { status?: number; error?: { error?: string } }
      let key = 'logistics_notes_failed'
      if (e.error?.error === 'ai_monthly_cap_reached') key = 'ai_monthly_cap_reached'
      else if (e.status === 429) key = 'ai_daily_limit_reached_all'
      this.userMsg.onSetErrorMsg(this.translation.translate(key))
      this.logging.error({
        event: 'logistics_notes.extract_failed',
        message: 'Logistics notes extraction failed',
        context: { status: String(e.status ?? '') }
      })
    } finally {
      this.isExtracting_.set(false)
    }
  }

  private open(draft: LogisticsExtractResponse): void {
    this.draftId = draft.draftId
    const all = this.registry.allItems_()
    const eventAnswers =
      this.eventData.allMenuEvents_().find((e) => e._id === this.eventId())?.siteLogistics?.answers ?? []
    const termOf = (key: string) =>
      all.find((t) => t.key === key && !t.foldedAt && !(t.removedAt && t.removedAt > 0)) ??
      all.find((t) => t.key === key)
    const lines: DraftLine[] = draft.answers.map((a, i) => {
      const term = termOf(a.itemKey)
      return {
        id: `a${i}`,
        kind: 'answer',
        itemKey: a.itemKey,
        label: a.itemKey,
        hint: term?.hint,
        phase: a.phase,
        section: a.section,
        answerType: term?.answerType ?? 'text',
        keep: true,
        needed: a.status !== 'not_needed',
        provider: a.status === 'client_provides' ? 'client' : 'ours',
        quantity: a.quantity ?? 0,
        text: a.text ?? ''
      }
    })
    draft.adhoc.forEach((a, i) =>
      lines.push({
        id: `x${i}`,
        kind: 'adhoc',
        itemKey: '',
        label: a.label,
        phase: this.draftPhase,
        section: a.section,
        answerType: 'text',
        keep: !!a.label.trim(),
        needed: a.status !== 'not_needed',
        provider: a.status === 'client_provides' ? 'client' : 'ours',
        quantity: a.quantity ?? 0,
        text: a.text ?? ''
      })
    )
    this.lines_.set(lines)
    this.conflicts_.set(
      draft.conflicts.map((c, i) => ({
        id: `c${i}`,
        conflict: c,
        stored: eventAnswers.find((a) => a.itemKey === c.itemKey),
        replace: false
      }))
    )
    this.unanswered_.set(draft.unanswered)
    this.step_.set('review')
  }

  protected patchLine(id: string, patch: Partial<DraftLine>): void {
    this.lines_.update((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }

  protected setLabel(line: DraftLine, label: string): void {
    this.patchLine(line.id, { label, ...(label.trim() ? {} : { keep: false }) })
  }

  protected setReplace(id: string, replace: boolean): void {
    this.conflicts_.update((cs) => cs.map((c) => (c.id === id ? { ...c, replace } : c)))
  }

  /** The status, quantity and note of an answer in words, for a conflict row. */
  protected describe(status: string, quantity?: number, text?: string): string {
    const parts = [this.translation.translate(statusKey(status))]
    if (quantity !== undefined) parts.push(String(quantity))
    if (text) parts.push(text)
    return parts.join(' · ')
  }

  protected cancel(): void {
    this.draftId = null
    this.lines_.set([])
    this.conflicts_.set([])
    this.unanswered_.set([])
    this.step_.set('input')
  }

  private draftStatusOf(l: DraftLine): DraftStatus {
    if (!l.needed) return 'not_needed'
    return l.provider === 'client' ? 'client_provides' : 'needed'
  }

  private lineAnswer(l: DraftLine): DraftAnswer {
    const isQuantity = l.answerType === 'quantity'
    const text = l.text.trim()
    return {
      itemKey: l.kind === 'adhoc' ? 'adhoc:' + crypto.randomUUID() : l.itemKey,
      ...(l.kind === 'adhoc' && { label: l.label.trim() }),
      phase: l.phase,
      section: l.section,
      status: l.needed ? 'needed' : 'not_needed',
      ...(l.needed && { payer: l.provider }),
      ...(l.needed && isQuantity && { quantity: l.quantity }),
      ...(text && { text })
    }
  }

  private conflictAnswer(c: ConflictLine): DraftAnswer {
    const s = c.stored
    const sug = c.conflict.suggested
    const base: DraftAnswer = {
      itemKey: c.conflict.itemKey,
      phase: s?.phase ?? this.draftPhase,
      section: s?.section ?? 'other',
      status: s?.status ?? 'unchecked',
      ...(s?.label !== undefined && { label: s.label }),
      ...(s?.quantity !== undefined && { quantity: s.quantity }),
      ...(s?.text !== undefined && { text: s.text }),
      ...(s?.payer !== undefined && { payer: s.payer }),
      ...(s?.showToClient !== undefined && { showToClient: s.showToClient })
    }
    const payer = s?.payer === 'ours' || s?.payer === 'chef' || s?.payer === 'quoted' ? s.payer : 'ours'
    return {
      ...base,
      ...(sug.status === 'not_needed' && { status: 'not_needed' as const }),
      ...(sug.status === 'needed' && { status: 'needed' as const, payer }),
      ...(sug.status === 'client_provides' && { status: 'needed' as const, payer: 'client' as const }),
      ...(sug.quantity !== undefined && { quantity: sug.quantity }),
      ...(sug.text !== undefined && { text: sug.text })
    }
  }

  protected async save(): Promise<void> {
    if (this.isSaving_() || this.keptCount_() === 0) return
    const kept = this.lines_().filter((l) => this.isKept(l))
    const replaced = this.conflicts_().filter((c) => c.replace)
    const answers: DraftAnswer[] = [
      ...kept.map((l) => this.lineAnswer(l)),
      ...replaced.map((c) => this.conflictAnswer(c))
    ]
    const saved: LogisticsConfirmLine[] = [
      ...kept.map((l) => {
        const text = l.text.trim()
        const status = this.draftStatusOf(l)
        return {
          ...(l.kind === 'adhoc' ? { label: l.label.trim() } : { itemKey: l.itemKey }),
          status,
          ...(l.needed && l.answerType === 'quantity' && { quantity: l.quantity }),
          ...(text && { text })
        }
      }),
      ...replaced.map((c) => ({
        itemKey: c.conflict.itemKey,
        status: c.conflict.suggested.status,
        ...(c.conflict.suggested.quantity !== undefined && { quantity: c.conflict.suggested.quantity }),
        ...(c.conflict.suggested.text !== undefined && { text: c.conflict.suggested.text })
      }))
    ]
    this.isSaving_.set(true)
    try {
      const result = await this.pipeline.saveLogistics(this.eventId(), { answers })
      if (!result.ok) return
    } finally {
      this.isSaving_.set(false)
    }
    const draftId = this.draftId
    if (draftId) {
      this.gemini.confirmLogisticsDraft(draftId, saved).catch((err: { status?: number }) =>
        this.logging.warn({
          event: 'logistics_notes.confirm_failed',
          message: 'Confirming the logistics draft failed',
          context: { status: String(err?.status ?? '') }
        })
      )
    }
    this.userMsg.onSetSuccessMsg(this.translation.translate('logistics_draft_saved'))
    this.text_.set('')
    this.cancel()
    this.done.emit()
  }
}
