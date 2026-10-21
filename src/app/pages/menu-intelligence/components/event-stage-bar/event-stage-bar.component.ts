import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core'
import { DatePipe } from '@angular/common'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import {
  EVENT_STAGE_ORDER,
  canPickNotClosed,
  needsDateFor,
  stageLabelKey
} from 'src/app/core/utils/event-stage-ui.util'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { EventPipelineService } from '@services/event-pipeline.service'
import { MenuEventDataService } from '@services/menu-event-data.service'
import { PermissionService } from '@services/permission.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import type { EventStage, MenuEvent } from '@models/menu-event.model'
import { NotClosedAnswer, NotClosedDialogComponent } from '../not-closed-dialog/not-closed-dialog.component'

const PHONE_PATTERN = /^[0-9+\-\s()]{7,20}$/

/**
 * Plan 443: the stage bar at the top of the event screen. Click a stage to move the event; "לא נסגר" asks why
 * "הסתיים" is shown but never picked here (plan 446 finishes an event). Also holds the client details
 * (name, phone, and the deposit for whoever may see money edits) and the stage history.
 * The server decides every move (plan 442); this component only hides or locks what the user may not do.
 */
@Component({
  selector: 'app-event-stage-bar',
  standalone: true,
  imports: [DatePipe, LucideAngularModule, TranslatePipe, NotClosedDialogComponent],
  templateUrl: './event-stage-bar.component.html',
  styleUrl: './event-stage-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EventStageBarComponent {
  // 1. INJECTED
  private readonly eventData = inject(MenuEventDataService)
  private readonly pipeline = inject(EventPipelineService)
  private readonly permission = inject(PermissionService)
  private readonly confirmModal = inject(ConfirmModalService)
  private readonly userMsg = inject(UserMsgService)
  private readonly translation = inject(TranslationService)

  // 2. INPUTS
  readonly eventId = input<string | null>(null)
  /** True once the supplier-orders screen exists (plan 435); only then is the "open supplier orders" offer made. */
  readonly supplierOrdersAvailable = input(false)

  // 3. OUTPUTS
  readonly openSupplierOrders = output<void>()

  // 4. SIGNALS & CONSTANTS
  protected readonly flowStages: readonly EventStage[] = EVENT_STAGE_ORDER.filter((stage) => stage !== 'not_closed')
  protected readonly stageLabelKey = stageLabelKey
  protected readonly notClosedDialogOpen_ = signal(false)
  protected readonly detailsOpen_ = signal(false)
  protected readonly historyOpen_ = signal(false)
  protected readonly phoneInvalid_ = signal(false)
  protected readonly busy_ = signal(false)

  // 5. COMPUTED
  protected readonly event_ = computed(
    () => this.eventData.allMenuEvents_().find((e) => e._id === this.eventId()) ?? null
  )
  protected readonly current_ = computed<EventStage>(() => this.event_()?.stage ?? 'inquiry')
  protected readonly currentIndex_ = computed(() => this.flowStages.indexOf(this.current_()))
  protected readonly canChangeStage_ = computed(() => this.can('changeStage'))
  protected readonly canEdit_ = computed(() => this.can('edit'))
  protected readonly canEditMoney_ = computed(() => this.can('editMoney'))
  protected readonly history_ = computed(() => [...(this.event_()?.stageHistory ?? [])].sort((a, b) => b.at - a.at))
  protected readonly detailsSummary_ = computed(() => {
    const event = this.event_()
    return [event?.clientName, event?.clientPhone].filter(Boolean).join(' · ')
  })

  // 6. METHODS
  /** Moves the event to `stage` after the checks the screen can make itself; the server has the last word. */
  protected async pick(stage: EventStage): Promise<void> {
    const event = this.event_()
    if (!event || this.busy_()) return
    if (stage === 'finished') return this.showError('stage_finished_hint')
    if (!this.canChangeStage_()) return this.showError('stage_not_allowed')
    if (stage === this.current_()) return
    if (stage === 'not_closed') {
      if (!canPickNotClosed(this.current_())) return this.showError('stage_not_closed_from')
      this.notClosedDialogOpen_.set(true)
      return
    }
    if (needsDateFor(stage, event.eventDate)) return this.showError('stage_needs_date')
    await this.move(event, { stage })
  }

  protected async onNotClosed(answer: NotClosedAnswer): Promise<void> {
    const event = this.event_()
    this.notClosedDialogOpen_.set(false)
    if (!event) return
    await this.move(event, { stage: 'not_closed', reason: answer.reason, reasonText: answer.reasonText })
  }

  protected onClientNameChange(value: string): void {
    const event = this.event_()
    const clientName = value.trim()
    if (!event || clientName === (event.clientName ?? '')) return
    void this.saveFields(event, { clientName })
  }

  protected onClientPhoneChange(value: string): void {
    const event = this.event_()
    const clientPhone = value.trim()
    if (!event) return
    this.phoneInvalid_.set(clientPhone !== '' && !PHONE_PATTERN.test(clientPhone))
    if (this.phoneInvalid_() || clientPhone === (event.clientPhone ?? '')) return
    void this.saveFields(event, { clientPhone })
  }

  protected onDepositAmountChange(value: string): void {
    const event = this.event_()
    if (!event) return
    const amount = value.trim() === '' ? undefined : Number(value)
    if (amount !== undefined && (!Number.isFinite(amount) || amount < 0)) return
    if (amount === event.deposit?.amount) return
    void this.saveFields(event, { deposit: this.depositWith(event, { amount }) })
  }

  protected onDepositDateChange(value: string): void {
    const event = this.event_()
    if (!event) return
    const date = value || undefined
    if (date === event.deposit?.date) return
    void this.saveFields(event, { deposit: this.depositWith(event, { date }) })
  }

  protected toggleDetails(): void {
    this.detailsOpen_.update((open) => !open)
  }

  protected toggleHistory(): void {
    this.historyOpen_.update((open) => !open)
  }

  /** True when the user may do `action` on this event (the server decides again). */
  private can(action: 'changeStage' | 'edit' | 'editMoney'): boolean {
    const event = this.event_()
    return !!event && this.permission.can(action, { type: 'menuEvents', doc: event })
  }

  private async move(event: MenuEvent, change: Parameters<EventPipelineService['changeStage']>[1]): Promise<void> {
    this.busy_.set(true)
    const result = await this.pipeline.changeStage(event._id, change)
    this.busy_.set(false)
    if (!result.ok) return
    this.userMsg.onSetSuccessMsg(this.translation.translate('stage_changed'))
    if (change.stage === 'ordering' && this.supplierOrdersAvailable()) {
      if (await this.confirmModal.open('open_supplier_orders_prompt', { saveLabel: 'yes' }))
        this.openSupplierOrders.emit()
    }
  }

  private depositWith(event: MenuEvent, part: { amount?: number; date?: string }): { amount?: number; date?: string } {
    const next = { ...event.deposit, ...part }
    return Object.fromEntries(Object.entries(next).filter(([, v]) => v !== undefined))
  }

  private async saveFields(event: MenuEvent, fields: Partial<MenuEvent>): Promise<void> {
    try {
      await this.eventData.updateMenuEvent({ ...event, ...fields })
    } catch (err) {
      // A 403 already got the "no permission" toast from the interceptor.
      if ((err as { status?: number }).status !== 403) this.showError('server_error')
    }
  }

  private showError(key: string): void {
    this.userMsg.onSetErrorMsg(this.translation.translate(key))
  }
}
