import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core'
import { RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { ModalShellComponent } from 'src/app/shared/modal-shell/modal-shell.component'
import type { FloorMapPlan } from 'src/app/shared/floor-map/floor-map.component'
import { BookingDataService, type DayBoard } from '@services/booking-data.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import type { Booking, BookingStatus } from '@models/booking.model'
import { nextOnTable, type TableLook } from 'src/app/core/utils/table-state.util'

type PlanTable = FloorMapPlan['tables'][number]

/** Client ids that are not a real client: no link to a client page. */
const NO_CLIENT = ['__walk_in__', '__test__']

/**
 * Plan 686: the sheet that opens from a table on the room — who is on it now, who comes next, and the actions that fit
 * the booking's status. It changes a booking only through `BookingDataService.setStatus`; the floor view reloads the
 * board on `changed` and owns move mode (`moveRequested`).
 */
@Component({
  selector: 'app-table-sheet',
  standalone: true,
  imports: [RouterLink, LucideAngularModule, TranslatePipe, ModalShellComponent],
  templateUrl: './table-sheet.component.html',
  styleUrl: './table-sheet.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TableSheetComponent {
  private readonly bookingData = inject(BookingDataService)
  private readonly confirmModal = inject(ConfirmModalService)
  private readonly translation = inject(TranslationService)
  private readonly userMsg = inject(UserMsgService)

  readonly table = input.required<PlanTable>()
  readonly board = input.required<DayBoard>()
  readonly plan = input.required<Pick<FloorMapPlan, 'tables' | 'areas'>>()
  /** The moment the view shows (the server's now when live). */
  readonly moment = input.required<number>()
  /** True when the view shows the live moment; actions are offered only then. */
  readonly live = input.required<boolean>()
  /** The table's look at the moment (its state and the booking that gives it). */
  readonly look = input.required<TableLook>()

  readonly closed = output<void>()
  readonly changed = output<void>()
  readonly moveRequested = output<string>()
  /** Plan 672: the host wants to seat a walk-in on this (free) table. */
  readonly walkInRequested = output<string>()

  protected readonly busy_ = signal(false)

  protected readonly area_ = computed(() => this.plan().areas.find((a) => a.key === this.table().areaKey)?.name ?? '')
  protected readonly seats_ = computed(() => {
    const t = this.table()
    return t.minSeats === t.maxSeats ? String(t.maxSeats) : `${t.minSeats}–${t.maxSeats}`
  })
  protected readonly title_ = computed(() =>
    this.translation.translate('tsh_title').replace('{n}', this.table().number)
  )
  protected readonly stateLabel_ = computed(() => this.translation.translate('fv_state_' + this.look().state))
  protected readonly notActive_ = computed(() => this.look().state === 'not_active')

  protected readonly now_ = computed<Booking | null>(() => {
    const id = this.look().bookingId
    return id ? (this.board().bookings.find((b) => b._id === id) ?? null) : null
  })
  protected readonly next_ = computed<Booking | null>(() =>
    nextOnTable(this.board().bookings, this.table().key, this.moment(), this.now_()?._id)
  )
  protected readonly nowName_ = computed(() => this.now_()?.guestName || this.translation.translate('fv_walk_in'))
  protected readonly nextName_ = computed(() => this.next_()?.guestName || this.translation.translate('fv_walk_in'))
  /** The numbers of all tables of a booking on a join (empty for one table). */
  protected readonly joinNumbers_ = computed(() => {
    const keys = this.now_()?.tableKeys ?? []
    if (keys.length < 2) return ''
    const tables = this.plan().tables
    return keys.map((k) => tables.find((t) => t.key === k)?.number ?? k).join(', ')
  })
  protected readonly clientId_ = computed(() => {
    const id = this.now_()?.clientId
    return id && !NO_CLIENT.includes(id) ? id : null
  })

  protected readonly canAct_ = computed(() => this.live() && !this.notActive_() && !!this.now_())
  protected readonly canSeat_ = computed(() => this.canAct_() && this.now_()?.status === 'confirmed')
  protected readonly canNoShow_ = computed(() => this.canSeat_() && this.moment() >= (this.now_()?.startAt ?? Infinity))
  protected readonly canFinish_ = computed(() => this.canAct_() && this.now_()?.status === 'seated')
  protected readonly canCancel_ = computed(() => this.canSeat_() || this.canFinish_())

  protected async act(status: BookingStatus): Promise<void> {
    const booking = this.now_()
    if (!booking || this.busy_()) return
    this.busy_.set(true)
    try {
      if (status === 'cancelled') {
        const ok = await this.confirmModal.open('bk_cancel_confirm')
        if (!ok) return
      }
      const res = await this.bookingData.setStatus(booking._id, status)
      if (res.ok) {
        this.changed.emit()
        this.closed.emit()
      } else if (res.code === 'BAD_STATUS' || res.code === 'STATUS_CHANGED') {
        this.userMsg.onSetErrorMsg(this.translation.translate('bk_bad_status'))
        this.changed.emit()
      } else {
        this.userMsg.onSetErrorMsg(this.translation.translate('rq_decision_failed'))
      }
    } finally {
      this.busy_.set(false)
    }
  }

  /** Plan 672: a free, active table can take a walk-in (offered at the live moment only). */
  protected readonly canWalkIn_ = computed(() => !this.notActive_() && !this.now_())

  protected walkIn(): void {
    if (this.busy_() || !this.live()) return
    this.walkInRequested.emit(this.table().key)
  }

  protected move(): void {
    const booking = this.now_()
    if (!booking || this.busy_()) return
    this.moveRequested.emit(booking._id)
  }
}
