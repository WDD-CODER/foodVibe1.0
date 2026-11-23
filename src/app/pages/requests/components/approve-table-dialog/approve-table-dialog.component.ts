import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked
} from '@angular/core'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { ModalShellComponent } from 'src/app/shared/modal-shell/modal-shell.component'
import { FloorMapComponent } from 'src/app/shared/floor-map/floor-map.component'
import type { FloorTableState } from 'src/app/shared/floor-map/floor-geometry.util'
import { BookingDataService, type DayBoard } from '@services/booking-data.service'
import { FloorPlanDataService } from '@services/floor-plan-data.service'
import { FrontDeskProfileDataService } from '@services/front-desk-profile-data.service'
import { PermissionService } from '@services/permission.service'
import { jerusalemEpoch } from '@schemas/front-desk/local-time'
import { tableServiceOf } from '@schemas/front-desk/table-service'
import type { BookingAlternative } from '@models/booking.model'
import type { FrontDeskRequest } from '@models/request.model'
import { freeTablesFor, tableStatesAt } from 'src/app/core/utils/table-state.util'

/** What the host chose to approve with: another date and time, or one table (owner only). */
export type ApproveChoice = { date: string; time: string } | { tableKeys: string[] }

const dmy = (date: string): string => `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`

/**
 * Plan 672: shown when approving a table request answered 409 NO_TABLE. It offers the server's alternatives as chips
 * and, for the owner only, the tables that are free at the asked time. It approves nothing itself: the page does.
 */
@Component({
  selector: 'app-approve-table-dialog',
  standalone: true,
  imports: [TranslatePipe, ModalShellComponent, FloorMapComponent],
  templateUrl: './approve-table-dialog.component.html',
  styleUrl: './approve-table-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ApproveTableDialogComponent {
  private readonly bookingData = inject(BookingDataService)
  private readonly floorPlan = inject(FloorPlanDataService)
  private readonly profileData = inject(FrontDeskProfileDataService)
  private readonly permission = inject(PermissionService)

  readonly request = input.required<FrontDeskRequest>()
  readonly alternatives = input<BookingAlternative[]>([])
  /** True while the page's approve call runs. */
  readonly busy = input(false)
  readonly chosen = output<ApproveChoice>()
  readonly closed = output<void>()

  protected readonly isOwner_ = this.permission.isOwner_
  protected readonly plan_ = this.floorPlan.plan_
  private readonly board_ = signal<DayBoard | null>(null)

  protected readonly asked_ = computed(() => {
    const w = this.request().wanted
    return { date: w.date ?? '', time: w.time ?? '', party: w.partySize ?? 0 }
  })
  protected readonly askedLine_ = computed(() => {
    const a = this.asked_()
    return [a.date ? dmy(a.date) : '', a.time, a.party ? String(a.party) : ''].filter(Boolean).join(' · ')
  })
  protected readonly altChips_ = computed(() =>
    this.alternatives().map((a) => ({
      ...a,
      label: a.date === this.asked_().date ? a.time : `${dmy(a.date)} ${a.time}`
    }))
  )
  protected readonly freeKeys_ = computed(() => {
    const plan = this.plan_()
    const board = this.board_()
    const a = this.asked_()
    if (!plan || !board || !a.date || !a.time) return []
    const states = tableStatesAt(plan, board.bookings, jerusalemEpoch(a.date, a.time), {
      live: false,
      holdMinutes: tableServiceOf(this.profileData.profile_()).holdMinutes
    })
    return freeTablesFor(states, plan, a.party)
  })
  protected readonly mapStates_ = computed<Record<string, FloorTableState>>(() => {
    const free = this.freeKeys_()
    return Object.fromEntries(
      (this.plan_()?.tables ?? []).map((t) => [t.key, free.includes(t.key) ? 'free' : 'not_active'])
    )
  })
  protected readonly showMap_ = computed(() => this.isOwner_() && !!this.plan_() && this.freeKeys_().length > 0)
  protected readonly nothing_ = computed(() => this.altChips_().length === 0 && !this.showMap_())

  constructor() {
    // The owner's map needs the day's bookings; the date of the request does not change while the dialog is open.
    effect(() => {
      const date = this.asked_().date
      untracked(() => void this.loadBoard(date))
    })
  }

  protected pickTime(a: BookingAlternative): void {
    if (!this.busy()) this.chosen.emit({ date: a.date, time: a.time })
  }

  protected onMapTap(key: string): void {
    if (this.busy() || !this.isOwner_() || !this.freeKeys_().includes(key)) return
    this.chosen.emit({ tableKeys: [key] })
  }

  private async loadBoard(date: string): Promise<void> {
    if (!this.isOwner_() || !date) return
    await this.floorPlan.ensureLoaded()
    this.board_.set(await this.bookingData.dayBoard(date))
  }
}
