import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild
} from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { toSignal } from '@angular/core/rxjs-interop'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { firstValueFrom } from 'rxjs'
import { environment } from '../../../environments/environment'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { PageHeaderComponent } from 'src/app/shared/page-header/page-header.component'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'
import { LoaderComponent } from 'src/app/shared/loader/loader.component'
import { ChatThreadComponent } from 'src/app/shared/chat-thread/chat-thread.component'
import { ConversationDataService } from '@services/conversation-data.service'
import { PermissionService } from '@services/permission.service'
import { InboxBadgeService } from '@services/inbox-badge.service'
import { RequestDataService } from '@services/request-data.service'
import { TranslationService } from '@services/translation.service'
import { UserService } from '@services/user.service'
import { UserMsgService } from '@services/user-msg.service'
import { API } from '@services/http-storage.adapter'
import type { Booking } from '@models/booking.model'
import type { ConversationRow, LinkedCard } from '@models/conversation.model'
import { ReplyBoxComponent } from './components/reply-box/reply-box.component'

export type InboxFilter = 'all' | 'mine' | 'bot' | 'test'
const FILTERS: readonly InboxFilter[] = ['all', 'mine', 'bot', 'test']
const LIST_REFRESH_MS = 30_000
const THREAD_REFRESH_MS = 10_000
const TIME_ZONE = 'Asia/Jerusalem'
const dayKey = (ms: number): string => new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(new Date(ms))
const hhmm = new Intl.DateTimeFormat('he-IL', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
})
const dayShort = new Intl.DateTimeFormat('he-IL', { timeZone: TIME_ZONE, day: '2-digit', month: '2-digit' })
const REQUEST_STATUS_TAB: Record<string, string> = { approved: 'rq_tab_approved' }
const WAITING: readonly string[] = ['new', 'qualified', 'needs_info']

/** Plan 677: the inbox — the guests' conversations, one thread, take over / hand back, the linked card and the reply box. */
@Component({
  selector: 'app-inbox-page',
  standalone: true,
  imports: [
    LucideAngularModule,
    RouterLink,
    TranslatePipe,
    PageHeaderComponent,
    EmptyStateComponent,
    LoaderComponent,
    ChatThreadComponent,
    ReplyBoxComponent
  ],
  templateUrl: './inbox.page.html',
  styleUrl: './inbox.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InboxPage {
  private readonly data = inject(ConversationDataService)
  private readonly badge = inject(InboxBadgeService)
  private readonly requests = inject(RequestDataService)
  private readonly user = inject(UserService)
  private readonly permission = inject(PermissionService)
  /** Plan 678: the simulator link is for the owner and a platform admin only. */
  protected readonly canSimulate_ = computed(() => this.permission.isOwner_() || this.user.isPlatformAdmin_())
  private readonly translation = inject(TranslationService)
  private readonly userMsg = inject(UserMsgService)
  private readonly http = inject(HttpClient)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly destroyRef = inject(DestroyRef)
  private readonly zone = inject(NgZone)

  protected readonly filters = FILTERS
  protected readonly filter_ = signal<InboxFilter>('all')
  private readonly params_ = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap })
  protected readonly id_ = computed(() => this.params_().get('id'))
  protected readonly thread_ = this.data.thread_
  protected readonly threadNow_ = this.data.threadNow_
  protected readonly threadFailed_ = this.data.threadFailed_
  protected readonly listFailed_ = this.data.listFailed_
  protected readonly listLoaded_ = this.data.listLoaded_
  protected readonly threadLoading_ = signal(false)
  protected readonly actionBusy_ = signal(false)
  private readonly drafts_ = signal<Record<string, string>>({})
  private readonly booking_ = signal<Booking | null>(null)
  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller')
  private stickToBottom = true

  private readonly meId_ = computed(() => this.user.user_()?._id ?? '')

  protected readonly rows_ = computed<ConversationRow[]>(() => {
    const me = this.meId_()
    const filter = this.filter_()
    return this.data
      .conversations_()
      .filter((c) => {
        if (filter === 'mine') return c.status === 'human' && c.assignedTo === me
        if (filter === 'bot') return c.status === 'bot'
        if (filter === 'test') return c.test === true
        return true
      })
      .sort((a, b) => (b.unread > 0 ? 1 : 0) - (a.unread > 0 ? 1 : 0) || b.lastMessageAt - a.lastMessageAt)
  })

  /** The loaded thread, only when it is the one the URL names (a thread of another id is still loading). */
  protected readonly current_ = computed(() => {
    const t = this.thread_()
    return t && t.conversation._id === this.id_() ? t : null
  })
  protected readonly hasRows_ = computed(() => this.data.conversations_().length > 0)
  protected readonly row_ = computed(() => this.data.conversations_().find((c) => c._id === this.id_()) ?? null)

  protected readonly windowLeft_ = computed(() => {
    const c = this.thread_()?.conversation
    if (!c) return null
    const left = c.windowExpiresAt - this.threadNow_()
    if (left <= 0) return null
    const minutes = Math.floor(left / 60_000)
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
  })

  protected readonly windowText_ = computed(() => {
    const left = this.windowLeft_()
    return left === null
      ? this.translation.translate('ibx_window_closed')
      : this.translation.translate('ibx_window_open').replace('{time}', left)
  })

  protected readonly card_ = computed<LinkedCard | null>(() => {
    const c = this.thread_()?.conversation
    if (!c) return null
    const b = this.booking_()
    if (c.bookingId && b && b._id === c.bookingId) {
      return {
        type: 'booking',
        titleKey: 'ibx_linked_booking',
        date: b.date,
        time: b.time,
        partySize: b.partySize,
        statusKey: 'bk_status_' + b.status,
        link: '/bookings',
        queryParams: { date: b.date }
      }
    }
    const r = c.requestId ? this.requests.all_().find((x) => x._id === c.requestId) : undefined
    if (!r) return null
    return {
      type: 'request',
      titleKey: 'ibx_linked_request',
      kindKey: 'fd_kind_' + r.kind,
      date: r.wanted.date,
      time: r.wanted.time,
      partySize: r.wanted.partySize,
      statusKey: WAITING.includes(r.status) ? 'rq_tab_waiting' : (REQUEST_STATUS_TAB[r.status] ?? 'rq_tab_declined'),
      link: '/requests'
    }
  })

  protected readonly draft_ = computed(() => this.drafts_()[this.id_() ?? ''] ?? '')

  constructor() {
    void this.badge.refresh(true)
    void this.requests.ensureLoaded()

    effect(() => {
      const id = this.id_()
      untracked(() => {
        this.stickToBottom = true
        this.booking_.set(null)
        if (id) void this.openThread(id)
        else this.data.closeThread()
      })
    })

    effect(() => {
      const bookingId = this.thread_()?.conversation.bookingId
      untracked(() => {
        if (bookingId) void this.loadBooking(bookingId)
      })
    })

    effect(() => {
      void this.thread_()?.messages.length
      untracked(() => setTimeout(() => this.scrollDown(), 0))
    })

    this.startTimers()
  }

  protected setFilter(filter: InboxFilter): void {
    if (this.filter_() === filter) return
    const wasTest = this.filter_() === 'test'
    this.filter_.set(filter)
    if (wasTest || filter === 'test') void this.data.list({ test: filter === 'test' })
  }

  protected reloadList(): void {
    void this.data.list({ test: this.filter_() === 'test' })
  }

  protected reloadThread(): void {
    const id = this.id_()
    if (id) void this.openThread(id)
  }

  protected holderKey(row: { status: string; assignedTo?: string }): string {
    if (row.status === 'bot') return 'ibx_holder_bot'
    return row.assignedTo && row.assignedTo === this.meId_() ? 'ibx_holder_me' : 'ibx_holder_team'
  }

  protected nameOf(row: { client?: { name?: string; phone?: string } | null; waId?: string }): string {
    return row.client?.name?.trim() || row.client?.phone || row.waId || ''
  }

  protected timeOf(ms: number): string {
    const now = this.data.now_() || Date.now()
    return dayKey(ms) === dayKey(now) ? hhmm.format(new Date(ms)) : dayShort.format(new Date(ms))
  }

  protected previewOf(row: ConversationRow): string {
    return row.last?.text ?? ''
  }

  protected onDraft(value: string): void {
    const id = this.id_()
    if (id) this.drafts_.update((d) => ({ ...d, [id]: value }))
  }

  protected onScroll(): void {
    const el = this.scroller()?.nativeElement
    if (el) this.stickToBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40
  }

  protected async handBack(): Promise<void> {
    await this.runAction(this.data.handBack(this.id_() ?? ''))
  }

  protected async closeConversation(): Promise<void> {
    const res = await this.runAction(this.data.close(this.id_() ?? ''))
    if (res) await this.router.navigate(['/inbox'])
  }

  protected actionFailed(): void {
    this.userMsg.onSetErrorMsg(this.translation.translate('ibx_action_failed'))
    this.reloadThread()
  }

  protected closedMeanwhile(): void {
    this.userMsg.onSetErrorMsg(this.translation.translate('ibx_closed_meanwhile'))
    void this.router.navigate(['/inbox'])
    this.reloadList()
  }

  private async runAction(move: Promise<{ ok: boolean; code?: string | null }>): Promise<boolean> {
    this.actionBusy_.set(true)
    const res = await move
    this.actionBusy_.set(false)
    if (!res.ok) this.actionFailed()
    return res.ok
  }

  private async openThread(id: string): Promise<void> {
    this.threadLoading_.set(this.thread_()?.conversation._id !== id)
    await this.data.open(id)
    this.threadLoading_.set(false)
  }

  private async loadBooking(id: string): Promise<void> {
    if (this.booking_()?._id === id) return
    try {
      const b = await firstValueFrom(
        this.http.get<Booking>(`${environment.apiUrl}${API.data('bookings')}/${encodeURIComponent(id)}`)
      )
      this.booking_.set(b && b._id === id ? b : null)
    } catch {
      this.booking_.set(null)
    }
  }

  private scrollDown(): void {
    const el = this.scroller()?.nativeElement
    if (el && this.stickToBottom) el.scrollTop = el.scrollHeight
  }

  private startTimers(): void {
    if (typeof document === 'undefined') return
    const visible = (): boolean => document.visibilityState !== 'hidden'
    const refreshList = (): void => {
      if (visible()) this.reloadList()
    }
    const refreshThread = (): void => {
      const id = this.id_()
      if (visible() && id) void this.data.open(id)
    }
    // Outside the zone: a repeating timer inside it would keep the app "unstable" for ever.
    const [listTimer, threadTimer] = this.zone.runOutsideAngular(() => [
      setInterval(refreshList, LIST_REFRESH_MS),
      setInterval(refreshThread, THREAD_REFRESH_MS)
    ])
    const onWake = (): void => {
      if (!visible()) return
      refreshList()
      refreshThread()
    }
    document.addEventListener('visibilitychange', onWake)
    window.addEventListener('focus', onWake)
    this.destroyRef.onDestroy(() => {
      clearInterval(listTimer)
      clearInterval(threadTimer)
      document.removeEventListener('visibilitychange', onWake)
      window.removeEventListener('focus', onWake)
    })
  }
}
