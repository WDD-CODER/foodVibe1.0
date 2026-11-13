import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { ActivatedRoute, Router } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { PageHeaderComponent } from 'src/app/shared/page-header/page-header.component'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'
import { BookingDataService } from '@services/booking-data.service'
import { FrontDeskBadgeService } from '@services/front-desk-badge.service'
import { FrontDeskProfileDataService } from '@services/front-desk-profile-data.service'
import { RequestDataService } from '@services/request-data.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { warnBeforeUnload } from '@utils/leave-warning.util'
import type { DeclineReason, FrontDeskRequest } from '@models/request.model'
import { RequestCardComponent, type ApproveEdit } from './components/request-card/request-card.component'
import type { DayLoadState } from './components/day-load-strip/day-load-strip.component'
import { AskDialogComponent } from './components/ask-dialog/ask-dialog.component'
import { DeclineDialogComponent } from './components/decline-dialog/decline-dialog.component'
import { NewRequestDialogComponent } from './components/new-request-dialog/new-request-dialog.component'

export type RequestsTab = 'waiting' | 'approved' | 'declined'
const TABS: readonly RequestsTab[] = ['waiting', 'approved', 'declined']
const WAITING: readonly string[] = ['new', 'qualified', 'needs_info']
const DECLINED: readonly string[] = ['declined', 'cancelled', 'expired']
const TIME_BOUND: readonly string[] = ['table', 'tasting', 'consultation']
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

const receivedAt = (r: FrontDeskRequest): number => r.statusHistory[0]?.at ?? r.createdAt
const decidedAt = (r: FrontDeskRequest): number => r.statusHistory[r.statusHistory.length - 1]?.at ?? r.updatedAt

/** Plan 552: the work queue — every request with what the customer wants and whether it fits, three decisions each. */
@Component({
  selector: 'app-requests-page',
  standalone: true,
  imports: [
    LucideAngularModule,
    TranslatePipe,
    PageHeaderComponent,
    EmptyStateComponent,
    RequestCardComponent,
    AskDialogComponent,
    DeclineDialogComponent,
    NewRequestDialogComponent
  ],
  templateUrl: './requests.page.html',
  styleUrl: './requests.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RequestsPage {
  private readonly requestData = inject(RequestDataService)
  private readonly bookingData = inject(BookingDataService)
  private readonly profiles = inject(FrontDeskProfileDataService)
  private readonly badge = inject(FrontDeskBadgeService)
  private readonly translation = inject(TranslationService)
  private readonly userMsg = inject(UserMsgService)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)

  protected readonly tabs = TABS
  private readonly query_ = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap })
  protected readonly tab_ = computed<RequestsTab>(() => {
    const tab = this.query_().get('tab') as RequestsTab | null
    return tab && TABS.includes(tab) ? tab : 'waiting'
  })

  protected readonly isLoading_ = signal(true)
  protected readonly busyId_ = signal<string | null>(null)
  protected readonly askFor_ = signal<FrontDeskRequest | null>(null)
  protected readonly declineFor_ = signal<FrontDeskRequest | null>(null)
  protected readonly newOpen_ = signal(false)
  private readonly dialogDirty_ = signal(false)
  private readonly days_ = signal<Record<string, DayLoadState>>({})
  private readonly requestedDays_ = new Set<string>()
  private readonly now_ = Date.now()

  private readonly all_ = this.requestData.all_

  protected readonly waiting_ = computed(() =>
    this.all_()
      .filter((r) => WAITING.includes(r.status))
      .sort((a, b) => receivedAt(a) - receivedAt(b))
  )
  protected readonly approved_ = computed(() =>
    this.all_()
      .filter((r) => r.status === 'approved' && decidedAt(r) >= this.now_ - THIRTY_DAYS_MS)
      .sort((a, b) => decidedAt(b) - decidedAt(a))
  )
  protected readonly declined_ = computed(() =>
    this.all_()
      .filter((r) => DECLINED.includes(r.status) && decidedAt(r) >= this.now_ - THIRTY_DAYS_MS)
      .sort((a, b) => decidedAt(b) - decidedAt(a))
  )
  protected readonly shown_ = computed(() => {
    const tab = this.tab_()
    return tab === 'waiting' ? this.waiting_() : tab === 'approved' ? this.approved_() : this.declined_()
  })
  protected readonly counts_ = computed(() => ({ waiting: this.waiting_().length, approved: 0, declined: 0 }))

  /** Question key → label, per request kind (for the "missing answer" reason text). */
  protected readonly labels_ = computed(() => {
    const out: Record<string, Record<string, string>> = {}
    for (const [kind, config] of Object.entries(this.profiles.profile_()?.requestKinds ?? {})) {
      out[kind] = Object.fromEntries((config?.questions ?? []).map((q) => [q.key, this.translation.translate(q.label)]))
    }
    return out
  })

  constructor() {
    void this.load()
    warnBeforeUnload(() => this.hasRealChanges())
    effect(() => {
      for (const r of this.shown_()) {
        const date = r.wanted.date
        if (!date || !TIME_BOUND.includes(r.kind) || !WAITING.includes(r.status)) continue
        this.loadDay(date)
      }
    })
  }

  /** Route guard: an open dialog with typed text asks before leaving. */
  hasRealChanges(): boolean {
    return this.dialogDirty_()
  }

  protected dayOf(r: FrontDeskRequest): DayLoadState {
    return r.wanted.date ? (this.days_()[r.wanted.date] ?? null) : null
  }

  protected setTab(tab: RequestsTab): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: { tab }, queryParamsHandling: 'merge' })
  }

  protected async openNew(): Promise<void> {
    await this.profiles.ensureLoaded()
    this.newOpen_.set(true)
  }

  protected onCreated(): void {
    this.newOpen_.set(false)
    this.dialogDirty_.set(false)
    this.userMsg.onSetSuccessMsg(this.translation.translate('rq_created'))
    this.setTab('waiting')
  }

  protected onCreateFailed(): void {
    this.userMsg.onSetErrorMsg(this.translation.translate('rq_create_failed'))
  }

  protected closeDialogs(): void {
    this.newOpen_.set(false)
    this.askFor_.set(null)
    this.declineFor_.set(null)
    this.dialogDirty_.set(false)
  }

  protected setDialogDirty(dirty: boolean): void {
    this.dialogDirty_.set(dirty)
  }

  /** Approve; edits go first as `updateWanted`, then the approve call. */
  protected async onApprove(r: FrontDeskRequest, edit: ApproveEdit): Promise<void> {
    if (this.busyId_()) return
    this.busyId_.set(r._id)
    try {
      if (edit) {
        const updated = await this.requestData.updateWanted(r._id, edit.wanted)
        if (!updated.ok) return this.onDecisionFailed(updated.code)
      }
      const res = await this.requestData.approve(r._id)
      if (!res.ok) return this.onDecisionFailed(res.code)
      this.userMsg.onSetSuccessMsg(this.translation.translate('rq_approved'))
    } finally {
      this.busyId_.set(null)
    }
  }

  protected async onAsk(note: string): Promise<void> {
    const r = this.askFor_()
    if (!r || this.busyId_()) return
    this.busyId_.set(r._id)
    try {
      const res = await this.requestData.setStatus(r._id, 'needs_info', note)
      this.closeDialogs()
      if (!res.ok) this.onDecisionFailed(res.code)
    } finally {
      this.busyId_.set(null)
    }
  }

  protected async onDecline(choice: { reason: DeclineReason; text?: string }): Promise<void> {
    const r = this.declineFor_()
    if (!r || this.busyId_()) return
    this.busyId_.set(r._id)
    try {
      const res = await this.requestData.decline(r._id, choice.reason, choice.text)
      this.closeDialogs()
      if (!res.ok) this.onDecisionFailed(res.code)
    } finally {
      this.busyId_.set(null)
    }
  }

  private onDecisionFailed(code: string | null): void {
    if (code === 'ALREADY_DECIDED') {
      this.userMsg.onSetWarningMsg(this.translation.translate('rq_already_decided'))
      void this.reload()
      return
    }
    this.userMsg.onSetErrorMsg(this.translation.translate('rq_decision_failed'))
  }

  private async reload(): Promise<void> {
    await this.badge.refresh(true)
  }

  private async load(): Promise<void> {
    await Promise.all([this.profiles.ensureLoaded(), this.badge.refresh(true)])
    this.isLoading_.set(false)
  }

  private loadDay(date: string): void {
    if (this.requestedDays_.has(date)) return
    this.requestedDays_.add(date)
    void this.bookingData.day(date).then((load) => {
      this.days_.update((d) => ({ ...d, [date]: load ?? 'failed' }))
    })
  }
}
