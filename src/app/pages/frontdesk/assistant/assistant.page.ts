import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { PageHeaderComponent } from 'src/app/shared/page-header/page-header.component'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'
import { LoaderComponent } from 'src/app/shared/loader/loader.component'
import { ScrollRailComponent } from 'src/app/shared/scroll-rail/scroll-rail.component'
import { AssistantRunDataService } from '@services/assistant-run-data.service'
import { PermissionService } from '@services/permission.service'
import { UserService } from '@services/user.service'
import type { RunFilter } from '@models/assistant-run.model'
import { outcomeTone } from './assistant-run-view.util'
import { FlowMapComponent } from './components/flow-map/flow-map.component'
import { RunDetailComponent } from './components/run-detail/run-detail.component'
import { SettingsTableComponent } from './components/settings-table/settings-table.component'

export type AssistantTab = 'flow' | 'runs' | 'settings'

const TABS: readonly { key: AssistantTab; labelKey: string; icon: string }[] = [
  { key: 'flow', labelKey: 'asr_tab_flow', icon: 'list-checks' },
  { key: 'runs', labelKey: 'asr_tab_runs', icon: 'activity' },
  { key: 'settings', labelKey: 'asr_tab_settings', icon: 'pencil' }
]
const FILTERS: readonly RunFilter[] = ['all', 'answered', 'handover', 'fallback']
const TIME_ZONE = 'Asia/Jerusalem'
const dayKey = (ms: number): string => new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(new Date(ms))
const hhmm = new Intl.DateTimeFormat('he-IL', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
})
const dayShort = new Intl.DateTimeFormat('he-IL', { timeZone: TIME_ZONE, day: '2-digit', month: '2-digit' })

const rowTime = (ms: number): string => {
  const at = new Date(ms)
  return dayKey(ms) === dayKey(Date.now()) ? hhmm.format(at) : `${dayShort.format(at)} ${hhmm.format(at)}`
}
const seconds = (ms: number): string => (ms / 1000).toFixed(1)

/**
 * Plan 752: what the assistant did — the list with its filter chips and the test switch, and the open run step by step.
 * Plan 756 adds two tabs beside it, "how it works" and "what you can change"; the open tab is in the address
 * (`?tab=`). For the owner and the platform admin.
 */
@Component({
  selector: 'app-assistant-page',
  standalone: true,
  imports: [
    RouterLink,
    LucideAngularModule,
    TranslatePipe,
    PageHeaderComponent,
    EmptyStateComponent,
    LoaderComponent,
    ScrollRailComponent,
    RunDetailComponent,
    FlowMapComponent,
    SettingsTableComponent
  ],
  templateUrl: './assistant.page.html',
  styleUrl: './assistant.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssistantPage {
  private readonly data = inject(AssistantRunDataService)
  private readonly permission = inject(PermissionService)
  private readonly user = inject(UserService)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)

  protected readonly allowed_ = computed(() => this.permission.isOwner_() || this.user.isPlatformAdmin_())
  protected readonly isAdmin_ = computed(() => this.user.isPlatformAdmin_())
  protected readonly tabs = TABS
  protected readonly filters = FILTERS
  protected readonly filter_ = signal<RunFilter>(this.filterOnEntry())
  protected readonly testScope_ = signal(this.route.snapshot.queryParamMap.get('scope') === 'test')

  private readonly params_ = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap })
  protected readonly id_ = computed(() => this.params_().get('id'))

  private readonly query_ = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap })
  /** A run's address always shows the runs; else the tab the address names, and the runs without one. */
  protected readonly activeTab_ = computed<AssistantTab>(() => {
    if (this.id_()) return 'runs'
    const asked = this.query_().get('tab')
    return asked === 'flow' || asked === 'settings' ? asked : 'runs'
  })
  protected readonly setup_ = this.data.setup_

  protected readonly listLoaded_ = this.data.listLoaded_
  protected readonly listFailed_ = this.data.listFailed_
  protected readonly more_ = this.data.more_
  protected readonly loadingMore_ = this.data.loadingMore_
  protected readonly runLoading_ = this.data.runLoading_
  protected readonly runFailed_ = this.data.runFailed_

  protected readonly rows_ = computed(() =>
    this.data.runs_().map((row) => ({
      ...row,
      textKey: row.textHidden ? 'asr_text_hidden' : row.text ? null : 'asr_no_text',
      time: rowTime(row.startedAt),
      seconds: seconds(row.ms),
      tone: `c-chip--${outcomeTone(row.outcome)}`
    }))
  )

  /** The loaded run, only when it is the one the URL names. */
  protected readonly current_ = computed(() => {
    const run = this.data.run_()
    return run && run._id === this.id_() ? run : null
  })

  constructor() {
    effect(() => {
      const options = { filter: this.filter_(), test: this.testScope_() }
      if (!this.allowed_() || this.activeTab_() !== 'runs') return
      untracked(() => void this.data.list(options))
    })
    effect(() => {
      this.user.user_() // a user who signs in while the tab is open has no setup read yet
      if (!this.allowed_() || this.activeTab_() === 'runs') return
      untracked(() => void this.data.loadSetup())
    })
    effect(() => {
      const id = this.id_()
      const allowed = this.allowed_()
      untracked(() => {
        if (id && allowed) void this.data.open(id)
        else this.data.closeRun()
      })
    })
  }

  /** The tab travels in the address, so the browser's Back from another screen returns to it. */
  protected setTab(tab: AssistantTab): void {
    void this.router.navigate(['/frontdesk/assistant'], {
      queryParams: { tab: tab === 'runs' ? null : tab },
      queryParamsHandling: 'merge',
      replaceUrl: true
    })
  }

  protected refresh(): void {
    void this.data.list({ filter: this.filter_(), test: this.testScope_() })
  }

  protected loadMore(): void {
    void this.data.loadMore()
  }

  protected reopen(): void {
    const id = this.id_()
    if (id) void this.data.open(id)
  }

  protected setFilter(filter: RunFilter): void {
    this.filter_.set(filter)
    this.keepInUrl()
  }

  protected toggleTest(): void {
    this.testScope_.update((on) => !on)
    this.keepInUrl()
  }

  /** Opening a run is another route, so the chosen chips travel in the address (the row links preserve it). */
  private keepInUrl(): void {
    const filter = this.filter_()
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { filter: filter === 'all' ? null : filter, scope: this.testScope_() ? 'test' : null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    })
  }

  private filterOnEntry(): RunFilter {
    const asked = this.route.snapshot.queryParamMap.get('filter')
    return FILTERS.find((f) => f === asked) ?? 'all'
  }
}
