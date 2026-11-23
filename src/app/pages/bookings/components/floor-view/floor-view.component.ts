import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked
} from '@angular/core'
import { RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'
import { LoaderComponent } from 'src/app/shared/loader/loader.component'
import { ScrollRailComponent } from 'src/app/shared/scroll-rail/scroll-rail.component'
import { FloorMapComponent, type FloorTableDetail } from 'src/app/shared/floor-map/floor-map.component'
import type { FloorTableState } from 'src/app/shared/floor-map/floor-geometry.util'
import { BookingDataService, type DayBoard } from '@services/booking-data.service'
import { FloorPlanDataService } from '@services/floor-plan-data.service'
import { FrontDeskProfileDataService } from '@services/front-desk-profile-data.service'
import { PermissionService } from '@services/permission.service'
import { TranslationService } from '@services/translation.service'
import { WaitlistDataService } from '@services/waitlist-data.service'
import type { WaitlistEntry } from '@models/waitlist-entry.model'
import { UserMsgService } from '@services/user-msg.service'
import { jerusalemDateTime, jerusalemEpoch } from '@schemas/front-desk/local-time'
import { openRangesOf } from '@schemas/front-desk/qualify'
import { tableServiceOf } from '@schemas/front-desk/table-service'
import { TableSheetComponent } from '../table-sheet/table-sheet.component'
import { NewBookingDialogComponent } from '../new-booking-dialog/new-booking-dialog.component'
import { WalkInDialogComponent } from '../walk-in-dialog/walk-in-dialog.component'
import { WaitlistDrawerComponent } from '../waitlist-drawer/waitlist-drawer.component'
import { ArrivingListComponent, type ArrivingView } from '../service-lists/arriving-list.component'
import { UnassignedListComponent, type UnassignedView } from '../service-lists/unassigned-list.component'
import {
  ARRIVING_WINDOW_MINUTES,
  arrivingNext,
  freeTablesFor,
  stripTimes,
  tableStatesAt,
  type StripTime
} from 'src/app/core/utils/table-state.util'

const DAY_MS = 86400000
const POLL_MS = 45000
const CLOCK_MS = 30000
const STRIP_STEP_MINUTES = 30

/** The six states, in legend order, with the icon each one shows beside its label. */
const LEGEND: readonly { state: FloorTableState; icon: string }[] = [
  { state: 'free', icon: 'check' },
  { state: 'reserved_soon', icon: 'clock' },
  { state: 'seated', icon: 'users' },
  { state: 'over_time', icon: 'timer' },
  { state: 'late', icon: 'alert-triangle' },
  { state: 'not_active', icon: 'ban' }
]

/**
 * Plan 671: the service screen's room — one live state per table, a strip of times, summary numbers and the owner's
 * confirm-mode switch. It reads the day from the server's clock and reloads itself; it changes no booking.
 */
@Component({
  selector: 'app-floor-view',
  standalone: true,
  imports: [
    RouterLink,
    LucideAngularModule,
    TranslatePipe,
    EmptyStateComponent,
    LoaderComponent,
    ScrollRailComponent,
    FloorMapComponent,
    TableSheetComponent,
    NewBookingDialogComponent,
    WalkInDialogComponent,
    WaitlistDrawerComponent,
    ArrivingListComponent,
    UnassignedListComponent
  ],
  templateUrl: './floor-view.component.html',
  styleUrl: './floor-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FloorViewComponent {
  private readonly bookingData = inject(BookingDataService)
  private readonly floorPlan = inject(FloorPlanDataService)
  private readonly profileData = inject(FrontDeskProfileDataService)
  private readonly permission = inject(PermissionService)
  private readonly translation = inject(TranslationService)
  private readonly userMsg = inject(UserMsgService)
  private readonly waitlistData = inject(WaitlistDataService)

  readonly date = input.required<string>()
  /** The strip time kept in the query string (`HH:mm`); null = now. */
  readonly at = input<string | null>(null)
  readonly tableTapped = output<string>()
  readonly atChange = output<string | null>()

  protected readonly legend = LEGEND
  protected readonly status_ = signal<'loading' | 'error' | 'ready'>('loading')
  protected readonly modeBusy_ = signal(false)
  /** Plan 686: the table whose sheet is open. */
  protected readonly sheetTableKey_ = signal<string | null>(null)
  /** Plan 686: the booking being moved to another table (move mode), or null. */
  protected readonly movingBookingId_ = signal<string | null>(null)
  protected readonly moveBusy_ = signal(false)
  protected readonly seatBusy_ = signal(false)
  /** Plan 672: move mode started from the "not assigned" list (the banner says whom to seat). */
  private readonly assignMode_ = signal(false)
  protected readonly newBookingOpen_ = signal(false)
  /** Plan 672: the walk-in dialog is open; `walkInTable_` is the table of the sheet it came from (or null). */
  protected readonly walkInOpen_ = signal(false)
  protected readonly walkInTable_ = signal<string | null>(null)
  protected readonly arrivedBusy_ = signal<string | null>(null)
  /** Plan 673: the waiting list's own copy for the button and the pill, and the drawer's open flag. */
  protected readonly waitlist_ = signal<WaitlistEntry[]>([])
  protected readonly waitlistOpen_ = signal(false)
  /** Plan 673: the waiting entry being seated (the pick-a-table mode is on while it is set). */
  protected readonly seating_ = signal<WaitlistEntry | null>(null)
  private waitlistSeq = 0
  private moveSeq = 0
  protected readonly board_ = signal<DayBoard | null>(null)
  private readonly receivedAt_ = signal(0)
  private readonly clockTick_ = signal(0)
  private loadSeq = 0
  private inFlight = false
  private failStreak = false

  protected readonly plan_ = this.floorPlan.plan_
  protected readonly isOwner_ = this.permission.isOwner_
  private readonly profile_ = this.profileData.profile_
  private readonly service_ = computed(() => tableServiceOf(this.profile_()))
  protected readonly mode_ = computed(() => this.service_().confirmMode)
  protected readonly hasRoom_ = computed(() => (this.plan_()?.tables.length ?? 0) > 0)

  /** The server's now: its clock at the last read plus the time that passed here since (never the device's date). */
  private readonly serverNow_ = computed(() => {
    this.clockTick_()
    const board = this.board_()
    if (!board) return 0
    return board.now + (performance.now() - this.receivedAt_())
  })
  protected readonly isToday_ = computed(() => {
    const board = this.board_()
    return !!board && jerusalemDateTime(this.serverNow_()).date === this.date()
  })

  protected readonly strip_ = computed<StripTime[]>(() => {
    const hours = this.profile_()?.hours ?? []
    return stripTimes(openRangesOf(hours, this.date()), STRIP_STEP_MINUTES)
  })
  /** The chosen strip time, or null for "now" (only on today). */
  protected readonly chosen_ = computed<string | null>(() => {
    const strip = this.strip_()
    const at = this.at()
    if (at && strip.some((s) => s.time === at)) return at
    if (this.isToday_()) return null
    return strip[0]?.time ?? null
  })
  protected readonly isLive_ = computed(() => this.isToday_() && this.chosen_() === null)
  protected readonly moment_ = computed(() => {
    if (this.isLive_()) return this.serverNow_()
    const time = this.chosen_()
    if (time === null) return jerusalemEpoch(this.date(), '12:00')
    const next = this.strip_().find((s) => s.time === time)?.nextDay
    const date = next ? jerusalemDateTime(jerusalemEpoch(this.date(), '12:00') + DAY_MS).date : this.date()
    return jerusalemEpoch(date, time)
  })

  protected readonly states_ = computed(() => {
    const plan = this.plan_()
    const board = this.board_()
    if (!plan || !board) return {}
    return tableStatesAt(plan, board.bookings, this.moment_(), {
      live: this.isLive_(),
      holdMinutes: this.service_().holdMinutes,
      walkInName: this.translation.translate('fv_walk_in')
    })
  })
  protected readonly mapStates_ = computed<Record<string, FloorTableState>>(() =>
    Object.fromEntries(Object.entries(this.states_()).map(([key, look]) => [key, look.state]))
  )
  protected readonly details_ = computed<Record<string, FloorTableDetail>>(() =>
    Object.fromEntries(
      Object.entries(this.states_()).map(([key, look]) => [
        key,
        {
          label: this.translation.translate('fv_state_' + look.state),
          ...(look.name && { name: look.name }),
          ...(look.time && { time: look.time })
        }
      ])
    )
  )
  protected readonly sheetTable_ = computed(() => {
    const key = this.sheetTableKey_()
    return key ? (this.plan_()?.tables.find((t) => t.key === key) ?? null) : null
  })
  protected readonly sheetLook_ = computed(() => {
    const key = this.sheetTableKey_()
    return (key && this.states_()[key]) || { state: 'free' as const }
  })
  private readonly movingBooking_ = computed(() => {
    const id = this.movingBookingId_()
    return id ? (this.board_()?.bookings.find((b) => b._id === id) ?? null) : null
  })
  protected readonly selectedKeys_ = computed(() => this.movingBooking_()?.tableKeys ?? [])
  /** Plan 673: a table is being picked, to move a booking or to seat a waiting party. */
  protected readonly pickMode_ = computed(() => !!this.movingBookingId_() || !!this.seating_())
  protected readonly waitingCount_ = computed(
    () => this.waitlist_().filter((e) => e.status === 'waiting' || e.status === 'notified').length
  )
  protected readonly bannerText_ = computed(() => {
    const seating = this.seating_()
    if (seating) return this.translation.translate('wl_seat_banner').replace('{name}', seating.guestName)
    return this.translation
      .translate(this.assignMode_() ? 'nb_assign_banner' : 'tsh_move_banner')
      .replace('{name}', this.movingBooking_()?.guestName || this.translation.translate('fv_walk_in'))
  })
  protected readonly arriving_ = computed<ArrivingView[]>(() => {
    const board = this.board_()
    if (!board) return []
    const moment = this.moment_()
    const live = this.isLive_()
    const plan = this.plan_()
    return arrivingNext(board.bookings, moment, ARRIVING_WINDOW_MINUTES, this.service_().holdMinutes)
      .filter((r) => live || r.booking.startAt >= moment)
      .map((row) => ({
        row,
        name: row.booking.guestName || this.translation.translate('fv_walk_in'),
        tables: (row.booking.tableKeys ?? []).map((k) => plan?.tables.find((t) => t.key === k)?.number ?? k).join(', ')
      }))
  })
  protected readonly unassigned_ = computed<UnassignedView[]>(() => {
    const board = this.board_()
    if (!board) return []
    const ids = new Set(board.unassigned)
    return board.bookings
      .filter((b) => ids.has(b._id) && b.kind === 'table' && b.status === 'confirmed' && !b.tableKeys?.length)
      .sort((a, b) => a.startAt - b.startAt)
      .map((booking) => ({ booking, name: booking.guestName || this.translation.translate('fv_walk_in') }))
  })
  protected readonly pills_ = computed(() => {
    const own = (this.board_()?.bookings ?? []).filter((b) => b.kind === 'table')
    const sum = (list: typeof own) => list.reduce((total, b) => total + b.partySize, 0)
    return {
      booked: sum(own.filter((b) => ['confirmed', 'seated', 'finished'].includes(b.status))),
      seated: sum(own.filter((b) => b.status === 'seated')),
      noShow: own.filter((b) => b.status === 'no_show').length
    }
  })

  constructor() {
    const destroyRef = inject(DestroyRef)
    effect(() => {
      const date = this.date()
      untracked(() => {
        this.endMove()
        this.sheetTableKey_.set(null)
        void this.load(date, true)
      })
    })
    effect(() => {
      this.chosen_()
      untracked(() => {
        this.endMove()
        this.sheetTableKey_.set(null)
      })
    })
    const poll = setInterval(() => void this.refresh(), POLL_MS)
    const clock = setInterval(() => this.clockTick_.update((n) => n + 1), CLOCK_MS)
    const onVisible = (): void => {
      if (!document.hidden) void this.refresh()
    }
    window.addEventListener('focus', onVisible)
    document.addEventListener('visibilitychange', onVisible)
    destroyRef.onDestroy(() => {
      clearInterval(poll)
      clearInterval(clock)
      window.removeEventListener('focus', onVisible)
      document.removeEventListener('visibilitychange', onVisible)
      this.loadSeq++
    })
  }

  protected retry(): void {
    void this.load(this.date(), true)
  }

  /** A tap on a table: in move mode it picks the target; otherwise it opens the table's sheet. */
  protected onTableTap(key: string): void {
    this.tableTapped.emit(key)
    const seating = this.seating_()
    if (seating) {
      if (freeTablesFor(this.states_(), this.plan_() ?? { tables: [] }, seating.partySize).includes(key)) {
        void this.seatEntry(seating, key)
      }
      return
    }
    if (this.movingBookingId_()) {
      void this.moveTo(key)
      return
    }
    if (this.plan_()?.tables.some((t) => t.key === key)) this.sheetTableKey_.set(key)
  }

  protected startMove(bookingId: string): void {
    this.sheetTableKey_.set(null)
    this.assignMode_.set(false)
    this.movingBookingId_.set(bookingId)
  }

  /** Plan 672: the "assign" action of a booking with no table starts the same pick-a-table mode as "move". */
  protected startAssign(bookingId: string): void {
    this.sheetTableKey_.set(null)
    this.movingBookingId_.set(bookingId)
    this.assignMode_.set(true)
  }

  protected openWaitlist(): void {
    this.endMove()
    this.waitlistOpen_.set(true)
  }

  /** "Seated" on a drawer row: the pick-a-table mode starts for that entry (the drawer has closed itself). */
  protected startSeating(entry: WaitlistEntry): void {
    this.sheetTableKey_.set(null)
    this.endMove()
    this.seating_.set(entry)
  }

  /** Seats a waiting entry on a table: from the pick-a-table mode or from a free table's sheet. */
  protected async seatEntry(entry: WaitlistEntry, key: string): Promise<void> {
    if (this.seatBusy_()) return
    const table = this.plan_()?.tables.find((t) => t.key === key)
    this.seatBusy_.set(true)
    try {
      const res = await this.waitlistData.seat(entry._id, [key])
      if (res.ok) {
        this.endMove()
        this.sheetTableKey_.set(null)
        this.userMsg.onSetSuccessMsg(
          this.translation
            .translate('wl_seated')
            .replace('{name}', entry.guestName)
            .replace('{n}', table?.number ?? key)
        )
        void this.load(this.date(), false)
      } else if (res.code === 'NO_TABLE') {
        this.userMsg.onSetErrorMsg(this.translation.translate('wlk_table_taken'))
      } else if (res.code === 'BAD_STATUS' || res.code === 'STATUS_CHANGED') {
        this.endMove()
        this.userMsg.onSetErrorMsg(this.translation.translate('bk_bad_status'))
        void this.load(this.date(), false)
      } else {
        this.endMove()
        this.userMsg.onSetErrorMsg(this.translation.translate('wl_action_failed'))
      }
    } finally {
      this.seatBusy_.set(false)
    }
  }

  protected onWaitlistChanged(): void {
    void this.loadWaitlist(this.date())
  }

  protected openNewBooking(): void {
    this.endMove()
    this.newBookingOpen_.set(true)
  }

  protected openWalkIn(tableKey: string | null): void {
    this.endMove()
    this.walkInTable_.set(tableKey)
    this.walkInOpen_.set(true)
  }

  protected closeWalkIn(): void {
    this.walkInOpen_.set(false)
    this.walkInTable_.set(null)
  }

  /** A walk-in was seated: the dialog closes itself, the sheet under it closes here and the board reloads. */
  protected onWalkInSeated(): void {
    this.sheetTableKey_.set(null)
    void this.load(this.date(), false)
  }

  protected onBookingSaved(): void {
    void this.load(this.date(), false)
  }

  /** "Arrived" on the arriving list: seats the booking, with the same answers as the table sheet. */
  protected async markArrived(bookingId: string): Promise<void> {
    if (this.arrivedBusy_()) return
    this.arrivedBusy_.set(bookingId)
    try {
      const res = await this.bookingData.setStatus(bookingId, 'seated')
      if (res.ok) void this.load(this.date(), false)
      else if (res.code === 'BAD_STATUS' || res.code === 'STATUS_CHANGED') {
        this.userMsg.onSetErrorMsg(this.translation.translate('bk_bad_status'))
        void this.load(this.date(), false)
      } else this.userMsg.onSetErrorMsg(this.translation.translate('rq_decision_failed'))
    } finally {
      this.arrivedBusy_.set(null)
    }
  }

  /** Leaves move mode without a write (Escape, the banner's cancel, a changed date or time). */
  @HostListener('document:keydown.escape')
  protected endMove(): void {
    this.moveSeq++
    this.seating_.set(null)
    this.movingBookingId_.set(null)
    this.assignMode_.set(false)
  }

  protected onSheetChanged(): void {
    void this.load(this.date(), false)
  }

  private async moveTo(key: string): Promise<void> {
    const booking = this.movingBooking_()
    const table = this.plan_()?.tables.find((t) => t.key === key)
    if (!booking || !table || !table.active || booking.tableKeys?.includes(key) || this.moveBusy_()) return
    const seq = ++this.moveSeq
    this.moveBusy_.set(true)
    try {
      const res = await this.bookingData.setTables(booking._id, [key])
      if (seq !== this.moveSeq) return
      if (res.ok) {
        this.endMove()
        this.userMsg.onSetSuccessMsg(this.translation.translate('tsh_moved'))
        void this.load(this.date(), false)
      } else if (res.code === 'NO_TABLE' || res.code === 'BAD_STATUS' || res.code === 'STATUS_CHANGED') {
        // The server's 409 answers: the table is taken for that time (or the booking changed).
        this.userMsg.onSetErrorMsg(this.translation.translate('tsh_move_refused'))
      } else {
        this.endMove()
        this.userMsg.onSetErrorMsg(this.translation.translate('rq_decision_failed'))
      }
    } finally {
      this.moveBusy_.set(false)
    }
  }

  protected choose(time: string | null): void {
    this.atChange.emit(time)
  }

  protected async toggleMode(): Promise<void> {
    if (this.modeBusy_()) return
    const next = this.mode_() === 'auto' ? 'manual' : 'auto'
    this.modeBusy_.set(true)
    try {
      const ok = await this.profileData.setConfirmMode(next)
      if (ok)
        this.userMsg.onSetSuccessMsg(
          this.translation.translate(next === 'auto' ? 'fv_mode_auto_on' : 'fv_mode_manual_on')
        )
      else this.userMsg.onSetErrorMsg(this.translation.translate('fv_mode_failed'))
    } finally {
      this.modeBusy_.set(false)
    }
  }

  /** A background reload: never while the document is hidden, and never two at once. */
  private async refresh(): Promise<void> {
    if (document.hidden || this.inFlight || this.status_() !== 'ready') return
    await this.load(this.date(), false)
  }

  /** Plan 673: reads the waiting list (today only); a failed read keeps the last list. */
  private async loadWaitlist(date: string): Promise<void> {
    if (!this.isToday_()) {
      this.waitlist_.set([])
      return
    }
    const seq = ++this.waitlistSeq
    const res = await this.waitlistData.list(date)
    if (seq === this.waitlistSeq && res.ok) this.waitlist_.set(res.entries)
  }

  private async load(date: string, first: boolean): Promise<void> {
    const seq = ++this.loadSeq
    this.inFlight = true
    if (first) {
      this.board_.set(null)
      this.status_.set('loading')
    }
    try {
      const [, , board] = await Promise.all([
        this.floorPlan.ensureLoaded(),
        this.profileData.ensureLoaded(),
        this.bookingData.dayBoard(date)
      ])
      if (seq !== this.loadSeq) return
      if (!board || this.floorPlan.loadFailed_()) throw new Error('load failed')
      this.receivedAt_.set(performance.now())
      this.board_.set(board)
      this.status_.set('ready')
      this.failStreak = false
      void this.loadWaitlist(date)
    } catch {
      if (seq !== this.loadSeq) return
      if (first || this.board_() === null) this.status_.set('error')
      else if (!this.failStreak) {
        this.failStreak = true
        this.userMsg.onSetWarningMsg(this.translation.translate('fv_refresh_failed'))
      }
    } finally {
      if (seq === this.loadSeq) this.inFlight = false
    }
  }
}
