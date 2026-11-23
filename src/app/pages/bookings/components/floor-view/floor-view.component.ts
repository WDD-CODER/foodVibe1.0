import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
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
import { UserMsgService } from '@services/user-msg.service'
import { jerusalemDateTime, jerusalemEpoch } from '@schemas/front-desk/local-time'
import { openRangesOf } from '@schemas/front-desk/qualify'
import { tableServiceOf } from '@schemas/front-desk/table-service'
import { stripTimes, tableStatesAt, type StripTime } from 'src/app/core/utils/table-state.util'

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
    FloorMapComponent
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

  readonly date = input.required<string>()
  /** The strip time kept in the query string (`HH:mm`); null = now. */
  readonly at = input<string | null>(null)
  readonly tableTapped = output<string>()
  readonly atChange = output<string | null>()

  protected readonly legend = LEGEND
  protected readonly status_ = signal<'loading' | 'error' | 'ready'>('loading')
  protected readonly modeBusy_ = signal(false)
  private readonly board_ = signal<DayBoard | null>(null)
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
  private readonly moment_ = computed(() => {
    if (this.isLive_()) return this.serverNow_()
    const time = this.chosen_()
    if (time === null) return jerusalemEpoch(this.date(), '12:00')
    const next = this.strip_().find((s) => s.time === time)?.nextDay
    const date = next ? jerusalemDateTime(jerusalemEpoch(this.date(), '12:00') + DAY_MS).date : this.date()
    return jerusalemEpoch(date, time)
  })

  private readonly states_ = computed(() => {
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
      untracked(() => void this.load(date, true))
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
