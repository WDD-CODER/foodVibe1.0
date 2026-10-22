import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
  viewChild
} from '@angular/core'
import { DatePipe } from '@angular/common'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import {
  EVENT_STAGE_ORDER,
  canPickNotClosed,
  isValidClientPhone,
  needsDateFor,
  stageLabelKey
} from 'src/app/core/utils/event-stage-ui.util'
import { snapshotOnStageChange } from 'src/app/core/engine/plan-snapshot'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { EventPipelineService } from '@services/event-pipeline.service'
import { MenuEventDataService } from '@services/menu-event-data.service'
import { PermissionService } from '@services/permission.service'
import { PlanSnapshotService } from '@services/plan-snapshot.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { DateFieldComponent } from 'src/app/shared/date-field/date-field.component'
import { ScrollRailComponent } from 'src/app/shared/scroll-rail/scroll-rail.component'
import type { EventStage, MenuEvent } from '@models/menu-event.model'
import { NotClosedAnswer, NotClosedDialogComponent } from '../not-closed-dialog/not-closed-dialog.component'
import { EventClosingDialogComponent } from '../event-closing-dialog/event-closing-dialog.component'
import { DepositPaidAnswer, DepositPaidDialogComponent } from '../deposit-paid-dialog/deposit-paid-dialog.component'

/**
 * Plan 443: the stage bar at the top of the event screen. Click a stage to move the event; "לא נסגר" asks why
 * "הסתיים" is shown but never picked here (plan 446 finishes an event in the closing dialog, which this bar hosts). Also holds the client details
 * (name, phone, and the deposit for whoever may see money edits) and the stage history.
 * The server decides every move (plan 442); this component only hides or locks what the user may not do.
 */
@Component({
  selector: 'app-event-stage-bar',
  standalone: true,
  imports: [
    DatePipe,
    LucideAngularModule,
    TranslatePipe,
    ScrollRailComponent,
    DateFieldComponent,
    NotClosedDialogComponent,
    EventClosingDialogComponent,
    DepositPaidDialogComponent
  ],
  templateUrl: './event-stage-bar.component.html',
  styleUrl: './event-stage-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EventStageBarComponent {
  // 1. INJECTED
  private readonly eventData = inject(MenuEventDataService)
  private readonly pipeline = inject(EventPipelineService)
  private readonly permission = inject(PermissionService)
  private readonly snapshots = inject(PlanSnapshotService)
  private readonly confirmModal = inject(ConfirmModalService)
  private readonly userMsg = inject(UserMsgService)
  private readonly translation = inject(TranslationService)
  private readonly injector = inject(Injector)
  private readonly host_ = inject<ElementRef<HTMLElement>>(ElementRef)
  private readonly rail_ = viewChild(ScrollRailComponent)

  // 2. INPUTS
  readonly eventId = input<string | null>(null)
  /** True once the supplier-orders screen exists (plan 435); only then is the "open supplier orders" offer made. */
  readonly supplierOrdersAvailable = input(false)

  // 3. OUTPUTS
  readonly openSupplierOrders = output<void>()

  // 4. SIGNALS & CONSTANTS
  protected readonly flowStages: readonly EventStage[] = EVENT_STAGE_ORDER.filter((stage) => stage !== 'not_closed')
  protected readonly stageLabelKey = stageLabelKey
  protected readonly isNotClosedDialogOpen_ = signal(false)
  protected readonly isDepositDialogOpen_ = signal(false)
  protected readonly isClosingOpen_ = signal(false)
  protected readonly isDetailsOpen_ = signal(false)
  protected readonly isHistoryOpen_ = signal(false)
  protected readonly isPhoneInvalid_ = signal(false)
  protected readonly isBusy_ = signal(false)

  // 5. COMPUTED
  protected readonly event_ = computed(
    () => this.eventData.allMenuEvents_().find((e) => e._id === this.eventId()) ?? null
  )
  protected readonly current_ = computed<EventStage>(() => this.event_()?.stage ?? 'inquiry')
  protected readonly currentIndex_ = computed(() => this.flowStages.indexOf(this.current_()))
  protected readonly canChangeStage_ = computed(() => this.can('changeStage'))
  protected readonly canEdit_ = computed(() => this.can('edit'))
  protected readonly canEditMoney_ = computed(() => this.can('editMoney'))
  /** «סגירת אירוע» is offered from "ביצוע" on (a finished event too: to look at it, or to reopen it). */
  protected readonly canOpenClosing_ = computed(() =>
    ['execution', 'post_production', 'finished'].includes(this.current_())
  )
  protected readonly history_ = computed(() => [...(this.event_()?.stageHistory ?? [])].sort((a, b) => b.at - a.at))
  protected readonly detailsSummary_ = computed(() => {
    const event = this.event_()
    return [event?.clientName, event?.clientPhone].filter(Boolean).join(' · ')
  })

  constructor() {
    // On a phone the rail scrolls: bring the current stage to the middle when the screen opens and when the stage changes.
    effect(() => {
      const rail = this.rail_()
      this.current_()
      if (!rail) return
      afterNextRender(
        () => {
          const pill = this.host_.nativeElement.querySelector<HTMLElement>('.stage-pill.is-current')
          if (pill) rail.centerChild(pill)
        },
        { injector: this.injector }
      )
    })
  }

  // 6. METHODS
  /** Moves the event to `stage` after the checks the screen can make itself; the server has the last word. */
  protected async pick(stage: EventStage): Promise<void> {
    const event = this.event_()
    if (!event || this.isBusy_()) return
    if (stage === 'finished') return this.showError('stage_finished_hint')
    if (!this.canChangeStage_()) return this.showError('stage_not_allowed')
    if (stage === this.current_()) return
    if (stage === 'not_closed') {
      if (!canPickNotClosed(this.current_())) return this.showError('stage_not_closed_from')
      this.isNotClosedDialogOpen_.set(true)
      return
    }
    if (needsDateFor(stage, event.eventDate)) return this.showError('stage_needs_date')
    if (stage === 'deposit_paid' && this.canEditMoney_()) {
      // Plan 467: the owner says what was paid first; staff (no money edit) move straight through.
      this.isDepositDialogOpen_.set(true)
      return
    }
    await this.move(event, { stage })
  }

  /** Moves the stage first; only when that worked is the deposit saved (a refused move saves nothing). */
  protected async onDepositPaid(answer: DepositPaidAnswer): Promise<void> {
    const event = this.event_()
    this.isDepositDialogOpen_.set(false)
    if (!event) return
    if (!(await this.move(event, { stage: 'deposit_paid' }))) return
    const latest = this.event_() ?? event
    await this.saveFields(latest, { deposit: this.depositWith(latest, { date: answer.date, amount: answer.amount }) })
  }

  protected async onNotClosed(answer: NotClosedAnswer): Promise<void> {
    const event = this.event_()
    this.isNotClosedDialogOpen_.set(false)
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
    this.isPhoneInvalid_.set(!isValidClientPhone(clientPhone))
    if (this.isPhoneInvalid_() || clientPhone === (event.clientPhone ?? '')) return
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

  protected openClosing(): void {
    this.isClosingOpen_.set(true)
  }

  protected toggleDetails(): void {
    this.isDetailsOpen_.update((open) => !open)
  }

  protected toggleHistory(): void {
    this.isHistoryOpen_.update((open) => !open)
  }

  /** True when the user may do `action` on this event (the server decides again). */
  private can(action: 'changeStage' | 'edit' | 'editMoney'): boolean {
    const event = this.event_()
    return !!event && this.permission.can(action, { type: 'menuEvents', doc: event })
  }

  private async move(event: MenuEvent, change: Parameters<EventPipelineService['changeStage']>[1]): Promise<boolean> {
    this.isBusy_.set(true)
    // Plan 446: entering "הזמנות" / "ביצוע" / "פוסט-פרודקשן" stores or freezes the planning snapshot (the server applies the same rule).
    const withSnapshot =
      snapshotOnStageChange(change.stage, event.planSnapshot) === 'none'
        ? change
        : { ...change, planSnapshot: this.snapshots.buildFor(event) }
    const result = await this.pipeline.changeStage(event._id, withSnapshot)
    this.isBusy_.set(false)
    if (!result.ok) return false
    this.userMsg.onSetSuccessMsg(this.translation.translate('stage_changed'))
    if (change.stage === 'post_production') this.isClosingOpen_.set(true)
    if (change.stage === 'ordering' && this.supplierOrdersAvailable()) {
      if (await this.confirmModal.open('open_supplier_orders_prompt', { saveLabel: 'yes' }))
        this.openSupplierOrders.emit()
    }
    return true
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
