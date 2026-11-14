import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { DatePipe } from '@angular/common'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { FormsModule } from '@angular/forms'
import { map } from 'rxjs'
import { LucideAngularModule } from 'lucide-angular'
import { ClientDataService } from '@services/client-data.service'
import { MenuEventDataService } from '@services/menu-event-data.service'
import { RequestDataService } from '@services/request-data.service'
import { BookingDataService } from '@services/booking-data.service'
import { PermissionService } from '@services/permission.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { RESERVED_CLIENT_TAGS, type Client } from '@models/client.model'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { PageHeaderComponent } from 'src/app/shared/page-header/page-header.component'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'
import { ModalShellComponent } from 'src/app/shared/modal-shell/modal-shell.component'
import { ClientFormComponent } from 'src/app/shared/client-form/client-form.component'
import { ClientPickerComponent } from 'src/app/shared/client-picker/client-picker.component'
import { NewInquiryDialogComponent } from 'src/app/shared/new-inquiry-dialog/new-inquiry-dialog.component'
import {
  CustomMultiSelectComponent,
  type CustomMultiSelectOption
} from 'src/app/shared/custom-multi-select/custom-multi-select.component'
import { stageLabelKey } from 'src/app/core/utils/event-stage-ui.util'
import { buildTimeline, clientDialDigits } from './client-profile.util'

const RESERVED_TAGS: readonly string[] = RESERVED_CLIENT_TAGS
const ADD_TAG = '__add_tag__'
const TAGS_MAX = 12
const TAG_MAX = 40
const REASON_MAX = 200

/**
 * Plan 551 (FD-02): one customer on one page. A header with call and WhatsApp, the owner details, and one timeline of
 * the requests, bookings, events and event notes of the client. Actions: new inquiry, merge a duplicate,
 * do-not-contact.
 */
@Component({
  selector: 'app-client-profile',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    LucideAngularModule,
    TranslatePipe,
    PageHeaderComponent,
    EmptyStateComponent,
    ModalShellComponent,
    ClientFormComponent,
    ClientPickerComponent,
    NewInquiryDialogComponent,
    CustomMultiSelectComponent
  ],
  templateUrl: './client-profile.component.html',
  styleUrl: './client-profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClientProfileComponent {
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly clientData = inject(ClientDataService)
  private readonly eventData = inject(MenuEventDataService)
  private readonly requestData = inject(RequestDataService)
  private readonly bookingData = inject(BookingDataService)
  private readonly permission = inject(PermissionService)
  private readonly translation = inject(TranslationService)
  private readonly userMsg = inject(UserMsgService)
  private readonly confirmModal = inject(ConfirmModalService)

  protected readonly isOwner_ = this.permission.isOwner_
  protected readonly canCreateEvent_ = computed(() => this.permission.can('create', { type: 'menuEvents' }))
  protected readonly stageLabelKey = stageLabelKey

  private readonly id_ = toSignal(this.route.paramMap.pipe(map((p) => p.get('id') ?? '')), { initialValue: '' })

  protected readonly isEditOpen_ = signal(false)
  protected readonly isInquiryOpen_ = signal(false)
  protected readonly isMergeOpen_ = signal(false)
  protected readonly isReasonOpen_ = signal(false)
  protected readonly isDetailsOpen_ = signal(false)
  protected readonly isBusy_ = signal(false)
  protected readonly reason_ = signal('')
  protected readonly reasonMax = REASON_MAX
  protected readonly addTagValue = ADD_TAG

  protected readonly client_ = computed<Client | null>(
    () => this.clientData.allClients_().find((c) => c._id === this.id_()) ?? null
  )
  /** A merged client is shown only as a pointer to the client it went into. */
  protected readonly isMerged_ = computed(() => !!this.client_()?.mergedInto)
  protected readonly canEditClient_ = computed(() => this.permission.can('edit', { type: 'clients' }))
  protected readonly excludeIds_ = computed(() => [this.id_()])

  protected readonly digits_ = computed(() => {
    const c = this.client_()
    return c ? clientDialDigits(c.phoneNormalized, c.phone) : ''
  })
  protected readonly telHref_ = computed(() => `tel:+${this.digits_()}`)
  protected readonly waHref_ = computed(() => `https://wa.me/${this.digits_()}`)

  protected readonly timeline_ = computed(() => {
    const id = this.id_()
    return buildTimeline(
      this.requestData.all_().filter((r) => r.clientId === id),
      this.bookingData.all_().filter((b) => b.clientId === id),
      this.eventData.allMenuEvents_().filter((e) => e.clientId === id)
    )
  })

  /** Reserved tags, every tag in use, and the add row for the tags editor. */
  protected readonly tagOptions_ = computed<CustomMultiSelectOption[]>(() => {
    const used = new Set<string>(RESERVED_CLIENT_TAGS)
    for (const c of this.clientData.allClients_()) for (const t of c.tags ?? []) used.add(t)
    const options = [...used].map((t) => ({ value: t, label: this.tagLabel(t) }))
    return [...options, { value: ADD_TAG, label: 'client_tag_add' }]
  })

  constructor() {
    void this.requestData.ensureLoaded()
    void this.bookingData.ensureLoaded()
  }

  protected tagLabel(tag: string): string {
    return RESERVED_TAGS.includes(tag) ? this.translation.translate('client_tag_' + tag) || tag : tag
  }

  protected tagTone(tag: string): 'amber' | 'red' | null {
    if (tag === 'vip') return 'amber'
    if (tag === 'allergy' || tag === 'repeat_no_show') return 'red'
    return null
  }

  // --- edit details
  protected onEdited(): void {
    this.isEditOpen_.set(false)
    this.userMsg.onSetSuccessMsg(this.translation.translate('client_saved'))
  }

  protected async onTagsChange(tags: string[]): Promise<void> {
    const client = this.client_()
    if (!client || !this.canEditClient_()) return
    const next = tags.filter((t) => t !== ADD_TAG).slice(0, TAGS_MAX)
    if (JSON.stringify(next) === JSON.stringify(client.tags ?? [])) return
    await this.saveTags(client, next)
  }

  protected async onTagAdded(typed: string): Promise<void> {
    const client = this.client_()
    const tag = typed.trim().slice(0, TAG_MAX)
    if (!client || !tag || !this.canEditClient_()) return
    const tags = client.tags ?? []
    if (tags.includes(tag) || tags.length >= TAGS_MAX) return
    await this.saveTags(client, [...tags, tag])
  }

  private async saveTags(client: Client, tags: string[]): Promise<void> {
    try {
      await this.clientData.updateClient({ ...client, tags })
    } catch {
      this.userMsg.onSetErrorMsg(this.translation.translate('server_error'))
    }
  }

  // --- new inquiry
  protected onInquirySaved(): void {
    this.isInquiryOpen_.set(false)
  }

  // --- merge
  protected async onMergePicked(target: Client): Promise<void> {
    const client = this.client_()
    if (!client || this.isBusy_()) return
    this.isMergeOpen_.set(false)
    const confirmed = await this.confirmModal.open('client_merge_confirm', { saveLabel: 'client_merge' })
    if (!confirmed) return
    this.isBusy_.set(true)
    try {
      const merged = await this.clientData.mergeClient(client._id, target._id)
      this.userMsg.onSetSuccessMsg(this.translation.translate('client_merged'))
      await this.router.navigate(['/clients', merged._id])
    } catch (err) {
      if ((err as { status?: number }).status !== 403)
        this.userMsg.onSetErrorMsg(this.translation.translate('server_error'))
    } finally {
      this.isBusy_.set(false)
    }
  }

  // --- do not contact
  protected openReason(): void {
    this.reason_.set('')
    this.isReasonOpen_.set(true)
  }

  protected async onReasonSave(): Promise<void> {
    const client = this.client_()
    const reason = this.reason_().trim()
    if (!client || !reason || this.isBusy_()) return
    this.isBusy_.set(true)
    try {
      await this.clientData.setDoNotContact(client._id, true, reason)
      this.isReasonOpen_.set(false)
      this.userMsg.onSetSuccessMsg(this.translation.translate('client_do_not_contact_set'))
    } catch (err) {
      if ((err as { status?: number }).status !== 403)
        this.userMsg.onSetErrorMsg(this.translation.translate('server_error'))
    } finally {
      this.isBusy_.set(false)
    }
  }

  protected async clearDoNotContact(): Promise<void> {
    const client = this.client_()
    if (!client || !this.isOwner_() || this.isBusy_()) return
    this.isBusy_.set(true)
    try {
      await this.clientData.setDoNotContact(client._id, false)
    } catch (err) {
      if ((err as { status?: number }).status !== 403)
        this.userMsg.onSetErrorMsg(this.translation.translate('server_error'))
    } finally {
      this.isBusy_.set(false)
    }
  }
}
