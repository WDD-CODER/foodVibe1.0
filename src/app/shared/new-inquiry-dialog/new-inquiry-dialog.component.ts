import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  output,
  signal,
  viewChild
} from '@angular/core'
import { TextareaAutoGrowDirective } from 'src/app/core/directives/textarea-auto-grow.directive'
import { FormsModule } from '@angular/forms'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component'
import { DateFieldComponent } from 'src/app/shared/date-field/date-field.component'
import { ModalShellComponent } from 'src/app/shared/modal-shell/modal-shell.component'
import { ClientPickerComponent } from 'src/app/shared/client-picker/client-picker.component'
import type { Client } from '@models/client.model'
import { EventPipelineService } from '@services/event-pipeline.service'
import { EventTypeSnapshotService } from '@services/event-type-snapshot.service'
import { MenuEventDataService } from '@services/menu-event-data.service'
import { MenuEventTypeService } from '@services/menu-event-type.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { NOTE_MAX_LENGTH } from '@schemas/entities'
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
    ClientPickerComponent
  ],
  templateUrl: './new-inquiry-dialog.component.html',
  styleUrl: './new-inquiry-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NewInquiryDialogComponent {
  // 1. INJECTED
  private readonly host_ = inject<ElementRef<HTMLElement>>(ElementRef)
  private readonly picker_ = viewChild(ClientPickerComponent)
  private readonly eventData = inject(MenuEventDataService)
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
  protected readonly selectedClient_ = signal<Client | null>(null)
  /** True while the picker shows its add-client view: the title changes and the inquiry fields hide. */
  protected readonly adding_ = signal(false)
  protected readonly eventName_ = signal('')
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
  /** A new client is saved in the add-client view first, so the inquiry only needs a selected client. */
  protected readonly clientValid_ = computed(() => this.selectedClient_() !== null)
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
  /** Escape, the backdrop or the shell's close button: one step back, and only the last step closes the dialog. */
  protected onDismissed(): void {
    if (this.picker_()?.back()) return
    this.cancelled.emit()
  }

  protected async onSave(): Promise<void> {
    this.isTouched_.set(true)
    if (!this.valid_() || this.isSaving_()) return
    this.isSaving_.set(true)
    try {
      const client = this.selectedClient_()
      if (!client) return
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
  private buildBody(client: Client): Omit<MenuEvent, '_id'> {
    const now = Date.now()
    const name = this.eventName_().trim() || client.name
    const phone = client.phone
    const guests = this.guests_().trim()
    const eventType = this.eventType_()
    const eventTypeSnapshot = this.snapshots.snapshotFor('eventType', eventType)
    return {
      name,
      clientId: client._id,
      clientName: client.name,
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
