import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  NgZone,
  computed,
  inject,
  signal,
  untracked
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import { RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { normalizePhone } from '@schemas/phone'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { PageHeaderComponent } from 'src/app/shared/page-header/page-header.component'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'
import { LoaderComponent } from 'src/app/shared/loader/loader.component'
import { FormFieldComponent } from 'src/app/shared/form-field/form-field.component'
import { ChatThreadComponent } from 'src/app/shared/chat-thread/chat-thread.component'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { ConversationDataService } from '@services/conversation-data.service'
import { PermissionService } from '@services/permission.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { UserService } from '@services/user.service'
import type { ConversationRow } from '@models/conversation.model'
import { SimulatorService, type SimJob } from './services/simulator.service'

const TEXT_MAX = 4000
const NAME_MAX = 80
const FAST_MS = 2_000
const FAST_WINDOW_MS = 30_000
const SLOW_EVERY = 5
const PHONE_QUERY = '(max-width: 767px)'
const PHONE_CHARS = /^[\d\s+-]+$/

/** The test guest the owner plays: a phone and a name, and the conversation once the first message was sent. */
interface Guest {
  phone: string
  name: string
  conversationId: string | null
}

/**
 * Plan 678: the simulator. The owner writes as a test guest in a phone-shaped chat, sees what the business answers,
 * taps its buttons, runs the reminder now and clears the test data. Nothing leaves the app.
 */
@Component({
  selector: 'app-simulator-page',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    LucideAngularModule,
    TranslatePipe,
    PageHeaderComponent,
    EmptyStateComponent,
    LoaderComponent,
    FormFieldComponent,
    ChatThreadComponent
  ],
  templateUrl: './simulator.page.html',
  styleUrl: './simulator.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SimulatorPage {
  private readonly sim = inject(SimulatorService)
  private readonly data = inject(ConversationDataService)
  private readonly permission = inject(PermissionService)
  private readonly user = inject(UserService)
  private readonly confirm = inject(ConfirmModalService)
  private readonly translation = inject(TranslationService)
  private readonly userMsg = inject(UserMsgService)
  private readonly zone = inject(NgZone)
  private readonly destroyRef = inject(DestroyRef)

  protected readonly textMax = TEXT_MAX
  protected readonly nameMax = NAME_MAX

  protected readonly allowed_ = computed(() => this.permission.isOwner_() || this.user.isPlatformAdmin_())
  protected readonly listLoaded_ = this.data.listLoaded_
  protected readonly listFailed_ = this.data.listFailed_
  protected readonly guests_ = this.data.conversations_
  protected readonly threadNow_ = this.data.threadNow_

  protected readonly guest_ = signal<Guest | null>(null)
  protected readonly newOpen_ = signal(false)
  protected readonly newName_ = signal('')
  protected readonly newPhone_ = signal('')
  protected readonly text_ = signal('')
  protected readonly busy_ = signal(false)
  protected readonly tapBusy_ = signal(false)
  protected readonly jobBusy_ = signal(false)
  protected readonly sideOpen_ = signal(true)

  private fastUntil = 0
  private tick = 0

  /** The loaded thread, only when it is the open guest's conversation. */
  protected readonly thread_ = computed(() => {
    const t = this.data.thread_()
    const id = this.guest_()?.conversationId
    return t && id && t.conversation._id === id ? t : null
  })

  protected readonly threadFailed_ = computed(() => !!this.guest_()?.conversationId && !!this.data.threadFailed_())

  protected readonly bookingId_ = computed(() => this.thread_()?.conversation.bookingId ?? null)

  protected readonly nameValid_ = computed(() => {
    const n = this.newName_().trim()
    return n.length >= 1 && n.length <= NAME_MAX
  })
  protected readonly phoneValid_ = computed(() => {
    const raw = this.newPhone_().trim()
    const digits = normalizePhone(raw)
    return PHONE_CHARS.test(raw) && digits.length >= 9 && digits.length <= 15
  })
  protected readonly canStart_ = computed(() => this.nameValid_() && this.phoneValid_())
  protected readonly canSend_ = computed(() => this.text_().trim().length > 0 && !this.busy_() && !!this.guest_())

  protected readonly windowText_ = computed(() => {
    const t = this.thread_()
    if (!t) return null
    const left = t.conversation.windowExpiresAt - this.threadNow_()
    if (left <= 0) return this.translation.translate('sim_window_closed')
    const minutes = Math.floor(left / 60_000)
    const time = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
    return this.translation.translate('sim_window_open').replace('{time}', time)
  })

  protected readonly guestLabel_ = computed(() =>
    this.translation.translate('sim_guest_label').replace('{name}', this.guest_()?.name ?? '')
  )

  constructor() {
    if (this.allowed_()) {
      void this.data.list({ test: true })
      this.startTimer()
    }
  }

  protected reloadList(): void {
    void this.data.list({ test: true })
  }

  protected choose(row: ConversationRow): void {
    this.guest_.set({ phone: row.client.phone, name: row.client.name, conversationId: row._id })
    this.text_.set('')
    this.newOpen_.set(false)
    this.sideOpen_.set(false)
    this.data.closeThread()
    void this.data.open(row._id, { peek: true })
  }

  protected openNew(): void {
    this.newOpen_.set(true)
  }

  protected cancelNew(): void {
    this.newOpen_.set(false)
  }

  protected startNew(): void {
    if (!this.canStart_()) return
    this.guest_.set({ phone: this.newPhone_().trim(), name: this.newName_().trim(), conversationId: null })
    this.text_.set('')
    this.newOpen_.set(false)
    this.sideOpen_.set(false)
    this.data.closeThread()
  }

  protected changeGuest(): void {
    this.sideOpen_.set(true)
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return
    if (typeof window !== 'undefined' && window.matchMedia?.(PHONE_QUERY).matches) return
    event.preventDefault()
    void this.send()
  }

  protected async send(): Promise<void> {
    const guest = this.guest_()
    const text = this.text_().trim()
    if (!guest || !text || this.busy_()) return
    this.busy_.set(true)
    try {
      const res = await this.sim.send(guest.phone, guest.name, text)
      if (!res.ok) {
        if (res.code === 'REAL_CLIENT') {
          this.userMsg.onSetErrorMsg(this.translation.translate('sim_real_client'))
          if (!guest.conversationId) {
            this.newName_.set(guest.name)
            this.newPhone_.set(guest.phone)
            this.newOpen_.set(true)
            this.sideOpen_.set(true)
          }
        } else {
          this.userMsg.onSetErrorMsg(this.translation.translate('sim_send_failed'))
        }
        return
      }
      this.text_.set('')
      const first = !guest.conversationId
      this.guest_.set({ ...guest, conversationId: res.conversationId })
      this.afterAction()
      await this.data.open(res.conversationId, { peek: true })
      if (first) void this.data.list({ test: true })
    } finally {
      this.busy_.set(false)
    }
  }

  protected async tap(buttonId: string): Promise<void> {
    const guest = this.guest_()
    if (!guest || this.tapBusy_()) return
    this.tapBusy_.set(true)
    try {
      const res = await this.sim.tap(guest.phone, buttonId)
      if (!res.ok) {
        this.userMsg.onSetErrorMsg(this.translation.translate('sim_send_failed'))
        return
      }
      this.afterAction()
      await this.readThread()
    } finally {
      this.tapBusy_.set(false)
    }
  }

  protected async runJob(job: SimJob): Promise<void> {
    const id = this.guest_()?.conversationId
    if (!id || !this.bookingId_() || this.jobBusy_()) return
    this.jobBusy_.set(true)
    try {
      const res = await this.sim.runJob(id, job)
      if (!res.ok) {
        this.userMsg.onSetErrorMsg(this.translation.translate('sim_job_failed'))
        return
      }
      if (!res.done) {
        this.userMsg.onSetSuccessMsg(this.translation.translate('sim_job_nothing'))
        return
      }
      this.userMsg.onSetSuccessMsg(this.translation.translate('sim_job_ran'))
      this.afterAction()
      await this.readThread()
    } finally {
      this.jobBusy_.set(false)
    }
  }

  protected async clearTestData(): Promise<void> {
    const ok = await this.confirm.open(this.translation.translate('sim_clear_confirm_text'), {
      headerKey: 'sim_clear_confirm_title',
      saveLabel: 'sim_clear',
      variant: 'danger'
    })
    if (!ok) return
    const res = await this.sim.clearTestData()
    if (!res.ok) {
      this.userMsg.onSetErrorMsg(this.translation.translate('sim_clear_failed'))
      return
    }
    this.userMsg.onSetSuccessMsg(this.translation.translate('sim_cleared'))
    this.guest_.set(null)
    this.text_.set('')
    this.sideOpen_.set(true)
    this.data.closeThread()
    await this.data.list({ test: true })
  }

  private afterAction(): void {
    this.fastUntil = Date.now() + FAST_WINDOW_MS
  }

  private readThread(): Promise<void> {
    const id = this.guest_()?.conversationId
    return id ? this.data.open(id, { peek: true }) : Promise.resolve()
  }

  /** 2 s for 30 s after each action, 10 s otherwise; stops while the document is hidden and with the page. */
  private startTimer(): void {
    if (typeof document === 'undefined') return
    const timer = this.zone.runOutsideAngular(() =>
      setInterval(() => {
        if (document.visibilityState === 'hidden') return
        this.tick++
        const fast = Date.now() < this.fastUntil
        if (fast || this.tick % SLOW_EVERY === 0) untracked(() => void this.readThread())
      }, FAST_MS)
    )
    this.destroyRef.onDestroy(() => clearInterval(timer))
  }
}
