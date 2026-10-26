import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core'
import { DatePipe } from '@angular/common'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { PageHeaderComponent } from 'src/app/shared/page-header/page-header.component'
import { LoaderComponent } from 'src/app/shared/loader/loader.component'
import { PlatformAdminService, type BusinessRow } from '@services/platform-admin.service'
import { LoggingService } from '@services/logging.service'
import { UserMsgService } from '@services/user-msg.service'
import { TranslationService } from '@services/translation.service'
import { formatPctInt } from 'src/app/core/engine/rounding'

export type SortKey =
  | 'name'
  | 'ownerName'
  | 'staffCount'
  | 'createdAt'
  | 'lastActivityAt'
  | 'activeDays7'
  | 'total'
  | 'active'
  | 'closed'
  | 'finished'
  | 'closeRate'
  | 'lastEventDate'
export type SortDir = 'asc' | 'desc'
export type IdleClass = '' | 'is-idle-7' | 'is-idle-14'

interface Column {
  key: SortKey
  labelKey: string
}

const DAY_MS = 86_400_000

/** Sort value of a row for one column; null means "no value" and always sorts last. */
function sortValue(row: BusinessRow, key: SortKey): string | number | null {
  switch (key) {
    case 'total':
    case 'active':
    case 'closed':
    case 'finished':
      return row.events[key]
    case 'name':
    case 'ownerName':
      return row[key]?.toLocaleLowerCase('he') ?? null
    default:
      return row[key]
  }
}

@Component({
  selector: 'app-platform-dashboard-page',
  standalone: true,
  imports: [DatePipe, LucideAngularModule, TranslatePipe, PageHeaderComponent, LoaderComponent],
  templateUrl: './platform-dashboard.page.html',
  styleUrl: './platform-dashboard.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlatformDashboardPage implements OnInit {
  // 1. INJECTED
  private readonly platformAdmin = inject(PlatformAdminService)
  private readonly logging = inject(LoggingService)
  private readonly userMsg = inject(UserMsgService)
  private readonly translation = inject(TranslationService)

  // 4. SIGNALS & CONSTANTS
  protected readonly sortKey_ = signal<SortKey>('lastActivityAt')
  protected readonly sortDir_ = signal<SortDir>('desc')
  protected readonly isLoading_ = signal(true)
  protected readonly columns: Column[] = [
    { key: 'name', labelKey: 'platform_col_business' },
    { key: 'ownerName', labelKey: 'platform_col_owner' },
    { key: 'staffCount', labelKey: 'platform_col_staff' },
    { key: 'createdAt', labelKey: 'platform_col_joined' },
    { key: 'lastActivityAt', labelKey: 'platform_col_last_activity' },
    { key: 'activeDays7', labelKey: 'platform_col_active_days_7' },
    { key: 'total', labelKey: 'platform_col_events_total' },
    { key: 'active', labelKey: 'platform_col_events_active' },
    { key: 'closed', labelKey: 'platform_col_events_closed' },
    { key: 'finished', labelKey: 'platform_col_events_finished' },
    { key: 'closeRate', labelKey: 'platform_col_close_rate' },
    { key: 'lastEventDate', labelKey: 'platform_col_last_event' }
  ]

  // 5. COMPUTED
  protected readonly rows_ = this.platformAdmin.rows_
  /** Rows ordered by the chosen column; rows without a value stay last in both directions. */
  protected readonly sortedRows_ = computed(() => {
    const key = this.sortKey_()
    const dir = this.sortDir_() === 'asc' ? 1 : -1
    return [...this.rows_()].sort((a, b) => {
      const x = sortValue(a, key)
      const y = sortValue(b, key)
      if (x === null && y === null) return 0
      if (x === null) return 1
      if (y === null) return -1
      if (x === y) return 0
      return (x < y ? -1 : 1) * dir
    })
  })
  /** Totals over the businesses that are not marked internal. */
  protected readonly totals_ = computed(() => {
    const rows = this.rows_().filter((row) => !row.internal)
    const sum = (pick: (row: BusinessRow) => number): number => rows.reduce((acc, row) => acc + pick(row), 0)
    const total = sum((row) => row.events.total)
    const active = sum((row) => row.events.active)
    const closed = sum((row) => row.events.closed)
    const finished = sum((row) => row.events.finished)
    const notClosed = total - active - finished
    return {
      businesses: rows.length,
      staff: sum((row) => row.staffCount),
      total,
      active,
      closed,
      finished,
      closeRate: closed + notClosed > 0 ? closed / (closed + notClosed) : null
    }
  })

  // 6. METHODS
  async ngOnInit(): Promise<void> {
    try {
      await this.platformAdmin.load()
    } catch (err) {
      this.logging.error({
        event: 'platform.load_failed',
        message: 'Loading the business table failed',
        context: { err: String(err) }
      })
      this.userMsg.onSetErrorMsg(this.translation.translate('save_failed'))
    } finally {
      this.isLoading_.set(false)
    }
  }

  protected sortBy(key: SortKey): void {
    if (this.sortKey_() === key) {
      this.sortDir_.update((dir) => (dir === 'asc' ? 'desc' : 'asc'))
      return
    }
    this.sortKey_.set(key)
    this.sortDir_.set('desc')
  }

  protected ariaSort(key: SortKey): 'ascending' | 'descending' | 'none' {
    if (this.sortKey_() !== key) return 'none'
    return this.sortDir_() === 'asc' ? 'ascending' : 'descending'
  }

  protected idleClass(row: BusinessRow): IdleClass {
    if (row.lastActivityAt === null) return 'is-idle-14'
    const days = (Date.now() - row.lastActivityAt) / DAY_MS
    if (days > 14) return 'is-idle-14'
    return days > 7 ? 'is-idle-7' : ''
  }

  protected rate(closeRate: number | null): string {
    return closeRate === null ? '—' : formatPctInt(closeRate * 100)
  }

  protected async toggleInternal(row: BusinessRow, event: Event): Promise<void> {
    const internal = (event.target as HTMLInputElement).checked
    try {
      await this.platformAdmin.setInternal(row._id, internal)
    } catch (err) {
      this.logging.error({
        event: 'platform.internal_failed',
        message: 'Setting the internal flag failed',
        context: { err: String(err) }
      })
      this.userMsg.onSetErrorMsg(this.translation.translate('save_failed'))
    }
  }
}
