import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { waLink } from 'src/app/core/utils/wa-link.util'
import { PublicRequestService, type PublicRequestStatus, type StatusResult } from '../services/public-request.service'
import { PublicBrandComponent } from '../components/public-brand/public-brand.component'

type PageState = 'loading' | 'ready' | 'not_found' | 'failed'

const WAITING: readonly string[] = ['new', 'qualified', 'needs_info']

/**
 * Plan 555 (C-PUBLIC): the guest's own status page, `/book/:slug/r/:token`. The token is the only key; the page shows
 * the status, never the phone or the answers. A waiting request can be cancelled after a confirm.
 */
@Component({
  selector: 'app-public-request-status-page',
  standalone: true,
  imports: [RouterLink, LucideAngularModule, TranslatePipe, EmptyStateComponent, PublicBrandComponent],
  providers: [PublicRequestService],
  templateUrl: './public-request-status.page.html',
  styleUrl: '../public-request.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PublicRequestStatusPage {
  private readonly route = inject(ActivatedRoute)
  private readonly api = inject(PublicRequestService)
  private readonly confirm = inject(ConfirmModalService)
  private readonly translation = inject(TranslationService)
  private readonly userMsg = inject(UserMsgService)

  protected readonly slug = this.route.snapshot.paramMap.get('slug') ?? ''
  private readonly token = this.route.snapshot.paramMap.get('token') ?? ''
  protected readonly state_ = signal<PageState>('loading')
  protected readonly status_ = signal<PublicRequestStatus | null>(null)
  protected readonly isCancelling_ = signal(false)

  protected readonly waiting_ = computed(() => WAITING.includes(this.status_()?.status ?? ''))
  protected readonly wantedLine_ = computed(() => {
    const s = this.status_()
    if (!s) return ''
    const kind = this.translation.translate(`fd_kind_${s.kind}`)
    const wanted = s.wanted
    const party = wanted.partySize ? `${wanted.partySize} ${this.translation.translate('fd_q_party_size')}` : ''
    return [kind, wanted.date, wanted.time, party].filter(Boolean).join(' · ')
  })
  protected readonly bookingLine_ = computed(() => {
    const b = this.status_()?.booking
    return b ? `${b.date} · ${b.time} · ${b.partySize} ${this.translation.translate('fd_q_party_size')}` : ''
  })
  protected readonly referenceText_ = computed(() =>
    this.translation.translate('pb_reference').replace('{ref}', this.status_()?.reference ?? '')
  )
  protected readonly declinedText_ = computed(() =>
    this.translation.translate('pb_status_declined').replace('{name}', this.status_()?.displayName ?? '')
  )
  protected readonly eventText_ = computed(() =>
    this.translation.translate('pb_status_event_opened').replace('{name}', this.status_()?.displayName ?? '')
  )
  protected readonly phone_ = computed(() => this.status_()?.phone ?? null)
  protected readonly telLink_ = computed(() => {
    const phone = this.phone_()
    return phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : null
  })
  protected readonly whatsappLink_ = computed(() => {
    const s = this.status_()
    return s ? waLink(s.phone, `בקשה ${s.reference} · ${this.slug}`) : null
  })

  constructor() {
    void this.load()
  }

  protected async load(): Promise<void> {
    this.state_.set('loading')
    this.apply(await this.api.getStatus(this.slug, this.token))
  }

  protected async cancel(): Promise<void> {
    if (this.isCancelling_() || !(await this.confirm.open('pb_cancel_confirm'))) return
    this.isCancelling_.set(true)
    const res = await this.api.cancel(this.slug, this.token)
    this.isCancelling_.set(false)
    if (res.ok) {
      this.apply(res)
    } else if (res.code === 'ALREADY_DECIDED') {
      await this.load()
    } else if (res.code === 'NOT_FOUND') {
      this.state_.set('not_found')
    } else {
      this.userMsg.onSetErrorMsg(this.translation.translate('pb_send_failed'))
    }
  }

  private apply(res: StatusResult): void {
    if (res.ok) {
      this.status_.set(res.status)
      this.state_.set('ready')
    } else {
      this.state_.set(res.code === 'NOT_FOUND' ? 'not_found' : 'failed')
    }
  }
}
