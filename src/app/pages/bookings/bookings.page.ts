import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { PageHeaderComponent } from 'src/app/shared/page-header/page-header.component'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'
import { BookingDataService } from '@services/booking-data.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { isoToDmy, todayIso } from 'src/app/core/utils/date-input.util'
import type { Booking, BookingStatus } from '@models/booking.model'

export type BookingsView = 'day' | 'week'
const VIEWS: readonly BookingsView[] = ['day', 'week']
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

interface TimeGroup {
  time: string
  bookings: Booking[]
}
interface DaySection {
  date: string
  groups: TimeGroup[]
}

/** `yyyy-mm-dd` plus `days`, worked out at noon local time so a daylight-saving change cannot move the date. */
export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + days)
  return todayIso(d)
}

/** The Sunday on or before `iso`. */
export function weekStartIso(iso: string): string {
  return addDaysIso(iso, -new Date(`${iso}T12:00:00`).getDay())
}

/** Plan 552: the agenda — a day or a week of bookings, with arrival actions. */
@Component({
  selector: 'app-bookings-page',
  standalone: true,
  imports: [RouterLink, LucideAngularModule, TranslatePipe, PageHeaderComponent, EmptyStateComponent],
  templateUrl: './bookings.page.html',
  styleUrl: './bookings.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BookingsPage {
  private readonly bookingData = inject(BookingDataService)
  private readonly confirmModal = inject(ConfirmModalService)
  private readonly translation = inject(TranslationService)
  private readonly userMsg = inject(UserMsgService)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)

  protected readonly views = VIEWS
  private readonly query_ = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap })
  protected readonly date_ = computed(() => {
    const date = this.query_().get('date')
    return date && ISO_DATE.test(date) ? date : todayIso()
  })
  protected readonly view_ = computed<BookingsView>(() => {
    const view = this.query_().get('view') as BookingsView | null
    return view && VIEWS.includes(view) ? view : 'day'
  })
  protected readonly isLoading_ = signal(true)
  protected readonly busyId_ = signal<string | null>(null)
  protected readonly isToday_ = computed(() => this.date_() === todayIso())

  protected readonly sections_ = computed<DaySection[]>(() => {
    const first = this.view_() === 'week' ? weekStartIso(this.date_()) : this.date_()
    const days = Array.from({ length: this.view_() === 'week' ? 7 : 1 }, (_, i) => addDaysIso(first, i))
    const all = this.bookingData.all_()
    return days.map((date) => {
      const rows = all.filter((b) => b.date === date).sort((a, b) => a.startAt - b.startAt)
      const groups: TimeGroup[] = []
      for (const b of rows) {
        const last = groups[groups.length - 1]
        if (last && last.time === b.time) last.bookings.push(b)
        else groups.push({ time: b.time, bookings: [b] })
      }
      return { date, groups }
    })
  })
  protected readonly isEmpty_ = computed(() => this.sections_().every((s) => s.groups.length === 0))

  constructor() {
    void this.bookingData.ensureLoaded().then(() => this.isLoading_.set(false))
  }

  protected today(): string {
    return todayIso()
  }

  protected dmy(date: string): string {
    return isoToDmy(date)
  }

  protected dayName(date: string): string {
    return new Date(`${date}T12:00:00`).toLocaleDateString('he-IL', { weekday: 'long' })
  }

  protected canNoShow(b: Booking): boolean {
    return b.status === 'confirmed' && Date.now() >= b.startAt
  }

  protected canCancel(b: Booking): boolean {
    return b.status === 'confirmed' || b.status === 'seated'
  }

  protected go(params: { date?: string; view?: BookingsView }): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { date: params.date ?? this.date_(), view: params.view ?? this.view_() }
    })
  }

  protected step(direction: 1 | -1): void {
    this.go({ date: addDaysIso(this.date_(), direction * (this.view_() === 'week' ? 7 : 1)) })
  }

  protected async setStatus(b: Booking, status: BookingStatus): Promise<void> {
    if (this.busyId_()) return
    if (status === 'cancelled') {
      const ok = await this.confirmModal.open('bk_cancel_confirm')
      if (!ok) return
    }
    this.busyId_.set(b._id)
    try {
      const res = await this.bookingData.setStatus(b._id, status)
      if (res.ok) return
      if (res.code === 'BAD_STATUS') {
        this.userMsg.onSetWarningMsg(this.translation.translate('bk_bad_status'))
        await this.bookingData.reloadFromStorage()
      } else {
        this.userMsg.onSetErrorMsg(this.translation.translate('rq_decision_failed'))
      }
    } finally {
      this.busyId_.set(null)
    }
  }
}
