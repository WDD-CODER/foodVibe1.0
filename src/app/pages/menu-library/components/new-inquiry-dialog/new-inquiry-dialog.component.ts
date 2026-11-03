import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  output,
  signal
} from '@angular/core'
import { TextareaAutoGrowDirective } from 'src/app/core/directives/textarea-auto-grow.directive'
import { FormsModule } from '@angular/forms'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component'
import { DateFieldComponent } from 'src/app/shared/date-field/date-field.component'
import { ModalShellComponent } from 'src/app/shared/modal-shell/modal-shell.component'
import {
  SearchAddPick,
  SearchComboboxComponent,
  SearchPick
} from 'src/app/shared/search-combobox/search-combobox.component'
import { ClientDataService } from '@services/client-data.service'
import { PermissionService } from '@services/permission.service'
import { clientLabel, matchesClientQuery } from 'src/app/core/utils/client-display.util'
import { CLIENT_TYPES, type Client, type ClientType } from '@models/client.model'
import { EventPipelineService } from '@services/event-pipeline.service'
import { EventTypeSnapshotService } from '@services/event-type-snapshot.service'
import { MenuEventDataService } from '@services/menu-event-data.service'
import { MenuEventTypeService } from '@services/menu-event-type.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { NOTE_MAX_LENGTH } from '@schemas/entities'
import { isValidClientPhone } from 'src/app/core/utils/event-stage-ui.util'
import type { MenuEvent } from '@models/menu-event.model'
import { SelectOnFocusDirective } from '@directives/select-on-focus.directive'
import { NumberBoxDirective } from '@directives/number-box.directive'

const NAME_MAX = 200
const NOTE_MAX = NOTE_MAX_LENGTH

/**
 * Plan 443: "פנייה חדשה", a short form that logs a phone inquiry without building a menu.
 * The new event carries no stage, history or notes: the server starts it in "פנייה" (plan 442); the first
 * note goes through the notes route. Escape or a click outside cancels.
 */
@Component({
  selector: 'app-new-inquiry-dialog',
  standalone: true,
  imports: [
    TextareaAutoGrowDirective,
    NumberBoxDirective,
    FormsModule,
    TranslatePipe,
    CustomSelectComponent,
    DateFieldComponent,
    SelectOnFocusDirective,
    ModalShellComponent,
    SearchComboboxComponent
  ],
  templateUrl: './new-inquiry-dialog.component.html',
  styleUrl: './new-inquiry-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NewInquiryDialogComponent {
  // 1. INJECTED
  private readonly host_ = inject<ElementRef<HTMLElement>>(ElementRef)
  private readonly eventData = inject(MenuEventDataService)
  private readonly clientData = inject(ClientDataService)
  private readonly permission = inject(PermissionService)
  private readonly pipeline = inject(EventPipelineService)
  private readonly eventTypes = inject(MenuEventTypeService)
  private readonly snapshots = inject(EventTypeSnapshotService)
  private readonly userMsg = inject(UserMsgService)
  private readonly translation = inject(TranslationService)

  // 3. OUTPUTS
  readonly saved = output<MenuEvent>()
  readonly cancelled = output<void>()

  // 4. SIGNALS & CONSTANTS
  protected readonly nameMax = NAME_MAX
  protected readonly noteMax = NOTE_MAX
  protected readonly clientTypeOptions = CLIENT_TYPES.map((value) => ({ value, label: 'client_type_' + value }))
  protected readonly query_ = signal('')
  protected readonly selectedClient_ = signal<Client | null>(null)
  protected readonly isNewClientBranch_ = signal(false)
  protected readonly clientType_ = signal<ClientType>('private')
  protected readonly companyName_ = signal('')
  protected readonly email_ = signal('')
  protected readonly source_ = signal('')
  protected readonly clientNotes_ = signal('')
  protected readonly name_ = signal('')
  protected readonly phone_ = signal('')
  protected readonly date_ = signal('')
  protected readonly dateInvalid_ = signal(false)
  protected readonly guests_ = signal('')
  protected readonly eventType_ = signal('')
  protected readonly note_ = signal('')
  protected readonly isSaving_ = signal(false)
  protected readonly isTouched_ = signal(false)

  // 5. COMPUTED
  protected readonly eventTypeOptions_ = computed(() =>
    this.eventTypes.allEventTypes_().map((key) => ({ value: key, label: key }))
  )
  protected readonly canCreateClient_ = computed(() => this.permission.isOwner_())
  /** Clients matching the typed text; the combobox gets them already filtered (its own filter is off). */
  protected readonly clientOptions_ = computed(() =>
    this.clientData.allClients_().filter((c) => matchesClientQuery(c, this.query_()))
  )
  protected readonly nameValid_ = computed(
    () => this.name_().trim().length > 0 && this.name_().trim().length <= NAME_MAX
  )
  /** A client needs a phone (the client schema requires it), so empty is not valid here. */
  protected readonly phoneValid_ = computed(() => this.phone_().trim() !== '' && isValidClientPhone(this.phone_()))
  protected readonly clientValid_ = computed(
    () =>
      this.selectedClient_() !== null ||
      (this.canCreateClient_() && this.isNewClientBranch_() && this.nameValid_() && this.phoneValid_())
  )
  protected readonly guestsValid_ = computed(() => {
    const raw = this.guests_().trim()
    return raw === '' || (/^\d+$/.test(raw) && Number(raw) <= 100000)
  })
  protected readonly noteValid_ = computed(() => this.note_().length <= NOTE_MAX)
  protected readonly valid_ = computed(
    () => this.clientValid_() && this.guestsValid_() && this.noteValid_() && !this.dateInvalid_()
  )

  constructor() {
    afterNextRender(() => this.host_.nativeElement.querySelector<HTMLInputElement>('#inquiry-client')?.focus())
  }

  // 6. METHODS
  protected readonly labelOf = (c: Client): string =>
    clientLabel(c, this.countFor(c), this.translation.translate('client_events_count'))
  protected readonly keyOf = (c: Client): string => c._id

  /** How many events already belong to this client. */
  protected countFor(c: Client): number {
    return this.eventData.allMenuEvents_().filter((e) => e.clientId === c._id).length
  }

  protected onPicked(pick: SearchPick<Client>): void {
    this.selectedClient_.set(pick.option)
  }

  protected onChangeClient(): void {
    this.selectedClient_.set(null)
    this.query_.set('')
  }

  protected onAddChosen(pick: SearchAddPick): void {
    if (!this.canCreateClient_()) return
    const typed = pick.typed.trim()
    // What was typed fills the matching field so the owner does not retype it.
    if (typed && /^[0-9+\-\s()]+$/.test(typed)) this.phone_.set(typed)
    else if (typed) this.name_.set(typed.slice(0, NAME_MAX))
    this.isNewClientBranch_.set(true)
  }

  protected onBackToSearch(): void {
    this.isNewClientBranch_.set(false)
  }

  protected async onSave(): Promise<void> {
    this.isTouched_.set(true)
    if (!this.valid_() || this.isSaving_()) return
    this.isSaving_.set(true)
    try {
      const client = this.selectedClient_() ?? (await this.clientData.addClient(this.buildClientBody()))
      const created = await this.eventData.addMenuEvent(this.buildBody(client))
      const note = this.note_().trim()
      // The event is already saved: a refused first note shows its own message and does not undo the inquiry.
      if (note) await this.pipeline.addNote(created._id, note)
      this.userMsg.onSetSuccessMsg(this.translation.translate('new_inquiry_saved'))
      this.saved.emit(created)
    } catch (err) {
      // A 403 already got the "no permission" toast from the interceptor.
      if ((err as { status?: number }).status !== 403)
        this.userMsg.onSetErrorMsg(this.translation.translate('server_error'))
    } finally {
      this.isSaving_.set(false)
    }
  }

  /** The event as the library creates it: no stage, history or notes (the server owns them). */
  private buildClientBody(): Omit<Client, '_id' | 'phoneNormalized'> {
    const companyName = this.companyName_().trim()
    const email = this.email_().trim()
    const source = this.source_().trim()
    const notes = this.clientNotes_().trim()
    return {
      name: this.name_().trim(),
      phone: this.phone_().trim(),
      clientType: this.clientType_(),
      ...(companyName && { companyName }),
      ...(email && { email }),
      ...(source && { source }),
      ...(notes && { notes })
    }
  }

  private buildBody(client: Client): Omit<MenuEvent, '_id'> {
    const now = Date.now()
    const name = client.name
    const phone = client.phone
    const guests = this.guests_().trim()
    const eventType = this.eventType_()
    const eventTypeSnapshot = this.snapshots.snapshotFor('eventType', eventType)
    return {
      name,
      clientId: client._id,
      clientName: name,
      ...(phone && { clientPhone: phone }),
      ...(this.date_() && { eventDate: this.date_() }),
      guestCount: guests ? Number(guests) : 0,
      eventType,
      ...(eventTypeSnapshot && { eventTypeSnapshot }),
      servingType: '',
      sections: [],
      createdAt: now,
      updatedAt: now
    }
  }
}
