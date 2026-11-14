import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component'
import { ClientDataService } from '@services/client-data.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { CLIENT_TYPES, type Client, type ClientType } from '@models/client.model'
import { isValidClientPhone } from 'src/app/core/utils/event-stage-ui.util'

const NAME_MAX = 200

/**
 * Plan 546: the add-client fields (name, phone, "עוד פרטים"), shared by the client picker and any other "add client".
 * It holds no modal shell: the host frames it. Saving goes through ClientDataService.addClient().
 */
@Component({
  selector: 'app-client-form',
  standalone: true,
  imports: [FormsModule, TranslatePipe, CustomSelectComponent],
  templateUrl: './client-form.component.html',
  styleUrl: './client-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClientFormComponent {
  // 1. INJECTED
  private readonly host_ = inject<ElementRef<HTMLElement>>(ElementRef)
  private readonly injector = inject(Injector)
  private readonly clientData = inject(ClientDataService)
  private readonly userMsg = inject(UserMsgService)
  private readonly translation = inject(TranslationService)

  // 2. INPUTS
  readonly initialName = input('')
  readonly initialPhone = input('')
  /** Plan 551: with a client the form edits it (pre-filled, saved through updateClient) instead of adding one. */
  readonly client = input<Client | null>(null)

  // 3. OUTPUTS
  readonly saved = output<Client>()
  readonly cancelled = output<void>()

  // 4. SIGNALS & CONSTANTS
  protected readonly nameMax = NAME_MAX
  protected readonly clientTypeOptions = CLIENT_TYPES.map((value) => ({ value, label: 'client_type_' + value }))
  protected readonly nameEdit_ = signal<string | null>(null)
  protected readonly typeEdit_ = signal<ClientType | null>(null)
  protected readonly companyEdit_ = signal<string | null>(null)
  protected readonly emailEdit_ = signal<string | null>(null)
  protected readonly sourceEdit_ = signal<string | null>(null)
  protected readonly notesEdit_ = signal<string | null>(null)
  protected readonly phoneEdit_ = signal<string | null>(null)
  protected readonly isSaving_ = signal(false)
  protected readonly moreEdit_ = signal<boolean | null>(null)
  protected readonly isTouched_ = signal(false)

  // 5. COMPUTED
  /** The more-details block is open from the start when editing a client. */
  protected readonly isMoreOpen_ = computed(() => this.moreEdit_() ?? this.client() !== null)
  protected readonly name_ = computed(() => this.nameEdit_() ?? this.client()?.name ?? this.initialName())
  protected readonly phone_ = computed(() => this.phoneEdit_() ?? this.client()?.phone ?? this.initialPhone())
  protected readonly clientType_ = computed<ClientType>(
    () => this.typeEdit_() ?? this.client()?.clientType ?? 'private'
  )
  protected readonly companyName_ = computed(() => this.companyEdit_() ?? this.client()?.companyName ?? '')
  protected readonly email_ = computed(() => this.emailEdit_() ?? this.client()?.email ?? '')
  protected readonly source_ = computed(() => this.sourceEdit_() ?? this.client()?.source ?? '')
  protected readonly notes_ = computed(() => this.notesEdit_() ?? this.client()?.notes ?? '')
  protected readonly nameValid_ = computed(
    () => this.name_().trim().length > 0 && this.name_().trim().length <= NAME_MAX
  )
  /** A client needs a phone (the client schema requires it), so empty is not valid here. */
  protected readonly phoneValid_ = computed(() => this.phone_().trim() !== '' && isValidClientPhone(this.phone_()))

  constructor() {
    this.focus('#client-form-name')
  }

  // 6. METHODS
  protected onNameEnter(e: Event): void {
    e.preventDefault()
    this.host_.nativeElement.querySelector<HTMLInputElement>('#client-form-phone')?.focus()
  }

  protected onPhoneEnter(e: Event): void {
    e.preventDefault()
    void this.onSave()
  }

  protected async onSave(): Promise<void> {
    this.isTouched_.set(true)
    if (!this.nameValid_() || !this.phoneValid_() || this.isSaving_()) return
    this.isSaving_.set(true)
    try {
      const editing = this.client()
      const saved = editing
        ? await this.clientData.updateClient({ ...editing, ...this.buildBody() })
        : await this.clientData.addClient(this.buildBody())
      this.saved.emit(saved)
    } catch (err) {
      // A 403 already got the "no permission" toast from the interceptor.
      if ((err as { status?: number }).status !== 403)
        this.userMsg.onSetErrorMsg(this.translation.translate('server_error'))
    } finally {
      this.isSaving_.set(false)
    }
  }

  private buildBody(): Omit<Client, '_id' | 'phoneNormalized'> {
    const companyName = this.companyName_().trim()
    const email = this.email_().trim()
    const source = this.source_().trim()
    const notes = this.notes_().trim()
    return {
      name: this.name_().trim(),
      phone: this.phone_().trim(),
      clientType: this.clientType_(),
      // Editing: a cleared field is sent as an empty string so it is cleared; adding leaves an empty one out.
      ...(this.client() || companyName ? { companyName } : {}),
      ...(this.client() || email ? { email } : {}),
      ...(this.client() || source ? { source } : {}),
      ...(this.client() || notes ? { notes } : {})
    }
  }

  private focus(selector: string): void {
    afterNextRender(() => this.host_.nativeElement.querySelector<HTMLInputElement>(selector)?.focus(), {
      injector: this.injector
    })
  }
}
