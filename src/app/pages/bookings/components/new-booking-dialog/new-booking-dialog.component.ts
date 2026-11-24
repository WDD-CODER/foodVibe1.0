import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { ModalShellComponent } from 'src/app/shared/modal-shell/modal-shell.component'
import { ClientPickerComponent } from 'src/app/shared/client-picker/client-picker.component'
import { FormFieldComponent } from 'src/app/shared/form-field/form-field.component'
import { DateFieldComponent } from 'src/app/shared/date-field/date-field.component'
import { CounterComponent } from 'src/app/shared/counter/counter.component'
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component'
import { LoaderComponent } from 'src/app/shared/loader/loader.component'
import { FloorMapComponent } from 'src/app/shared/floor-map/floor-map.component'
import { BookingDataService, type DayBoard } from '@services/booking-data.service'
import { FloorPlanDataService } from '@services/floor-plan-data.service'
import { FrontDeskProfileDataService } from '@services/front-desk-profile-data.service'
import { PermissionService } from '@services/permission.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { assign } from '@schemas/front-desk/table-engine'
import type { Client } from '@models/client.model'
import type { BookingAlternative, BookingSlot, NewBookingInput } from '@models/booking.model'

const NAME_MAX = 200
const NOTES_MAX = 1000
const MIN_PHONE_DIGITS = 7
const PHONE_CHARS = /^[0-9+\-\s]+$/
const DAY_MS = 86400000

/** `YYYY-MM-DD` plus `n` days, computed in UTC from the string. */
function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d) + n * DAY_MS).toISOString().slice(0, 10)
}

const dmy = (date: string): string => `${date.slice(8, 10)}/${date.slice(5, 7)}`

/**
 * Plan 672: the phone-booking dialog. The browser previews the table with the shared engine; the server assigns again
 * on save and what it answers is what is stored. A client is only ever created by the server (name and phone).
 */
@Component({
  selector: 'app-new-booking-dialog',
  standalone: true,
  imports: [
    FormsModule,
    LucideAngularModule,
    TranslatePipe,
    ModalShellComponent,
    ClientPickerComponent,
    FormFieldComponent,
    DateFieldComponent,
    CounterComponent,
    CustomSelectComponent,
    LoaderComponent,
    FloorMapComponent
  ],
  templateUrl: './new-booking-dialog.component.html',
  styleUrl: './new-booking-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NewBookingDialogComponent {
  private readonly bookingData = inject(BookingDataService)
  private readonly floorPlan = inject(FloorPlanDataService)
  private readonly profileData = inject(FrontDeskProfileDataService)
  private readonly permission = inject(PermissionService)
  private readonly translation = inject(TranslationService)
  private readonly userMsg = inject(UserMsgService)

  /** The date the service screen shows; the dialog starts on it. */
  readonly date = input.required<string>()
  readonly closed = output<void>()
  /** Emitted after a successful save, before `closed`. */
  readonly saved = output<void>()

  protected readonly nameMax = NAME_MAX
  protected readonly notesMax = NOTES_MAX
  protected readonly isOwner_ = this.permission.isOwner_
  protected readonly plan_ = this.floorPlan.plan_

  protected readonly client_ = signal<Client | null>(null)
  protected readonly name_ = signal('')
  protected readonly phone_ = signal('')
  protected readonly date_ = signal('')
  protected readonly party_ = signal(2)
  protected readonly area_ = signal('')
  protected readonly time_ = signal('')
  protected readonly notes_ = signal('')
  /** The owner's tapped table instead of the engine's offer. */
  private readonly override_ = signal<string | null>(null)

  protected readonly slotsStatus_ = signal<'loading' | 'failed' | 'ready'>('loading')
  protected readonly slots_ = signal<BookingSlot[]>([])
  private readonly board_ = signal<DayBoard | null>(null)
  protected readonly isSaving_ = signal(false)
  protected readonly saveFailed_ = signal(false)
  protected readonly noTable_ = signal(false)
  protected readonly alternatives_ = signal<BookingAlternative[]>([])
  private loadSeq = 0

  protected readonly areaOptions_ = computed(() => [
    { value: '', label: this.translation.translate('nb_area_any') },
    ...[...(this.plan_()?.areas ?? [])].sort((a, b) => a.order - b.order).map((a) => ({ value: a.key, label: a.name }))
  ])

  protected readonly phoneValid_ = computed(
    () => PHONE_CHARS.test(this.phone_().trim()) && this.phone_().replace(/\D/g, '').length >= MIN_PHONE_DIGITS
  )
  protected readonly clientValid_ = computed(() => !!this.client_() || (!!this.name_().trim() && this.phoneValid_()))
  protected readonly valid_ = computed(
    () => this.clientValid_() && !!this.date_() && this.party_() >= 1 && !!this.time_()
  )
  protected readonly dirty_ = computed(
    () =>
      !!this.client_() || !!this.name_().trim() || !!this.phone_().trim() || !!this.notes_().trim() || !!this.time_()
  )

  /** The engine's answer for the chosen time (null until a time is chosen and the plan is there). */
  private readonly offer_ = computed(() => {
    const plan = this.plan_()
    const profile = this.profileData.profile_()
    const time = this.time_()
    if (!plan || !profile || !time || !this.date_()) return null
    const board = this.board_()
    return assign(plan, profile, board?.holds ?? [], {
      date: this.date_(),
      time,
      partySize: this.party_(),
      ...(this.area_() && { areaKey: this.area_() }),
      onlineOnly: false,
      now: board?.now ?? Date.now()
    })
  })
  protected readonly offeredKeys_ = computed(() => {
    const offer = this.offer_()
    return offer && offer.ok ? offer.tableKeys : []
  })
  /** The tables the small map marks: the owner's pick, else the engine's offer. */
  protected readonly selectedKeys_ = computed(() => {
    const own = this.override_()
    return own ? [own] : this.offeredKeys_()
  })
  protected readonly hasOffer_ = computed(() => this.selectedKeys_().length > 0)
  protected readonly showNoOffer_ = computed(() => (!!this.offer_() && !this.offeredKeys_().length) || this.noTable_())
  protected readonly offeredLine_ = computed(() =>
    this.translation.translate('nb_offered').replace('{n}', this.numbersOf(this.selectedKeys_()))
  )
  protected readonly altChips_ = computed(() => this.alternatives_().map((a) => ({ ...a, label: this.altLabel(a) })))

  constructor() {
    // The dialog starts on the view's date; later changes of the input do not move a date the host already chose.
    let started = false
    effect(() => {
      const initial = this.date()
      untracked(() => {
        if (started) return
        started = true
        this.date_.set(initial)
      })
    })
    effect(() => {
      const date = this.date_()
      const party = this.party_()
      const area = this.area_()
      untracked(() => void this.loadSlots(date, party, area))
    })
  }

  protected retry(): void {
    void this.loadSlots(this.date_(), this.party_(), this.area_())
  }

  protected setDate(value: string): void {
    this.date_.set(value)
    this.resetAnswer()
  }

  protected setParty(value: number): void {
    this.party_.set(Math.max(1, Math.round(value)))
    this.resetAnswer()
  }

  protected setArea(value: string): void {
    this.area_.set(value)
    this.resetAnswer()
  }

  protected setTime(time: string): void {
    this.time_.set(time)
    this.override_.set(null)
    this.noTable_.set(false)
    this.alternatives_.set([])
    this.saveFailed_.set(false)
  }

  /** An owner's tap on a table: it replaces the offer; a tap on it again goes back to the offer. */
  protected onMapTap(key: string): void {
    if (!this.isOwner_() || this.isSaving_() || !this.time_()) return
    this.override_.update((current) => (current === key ? null : key))
    this.noTable_.set(false)
  }

  protected pickAlternative(a: BookingAlternative): void {
    this.date_.set(a.date)
    this.time_.set(a.time)
    this.override_.set(null)
    this.noTable_.set(false)
    this.alternatives_.set([])
  }

  protected async onSave(): Promise<void> {
    if (!this.valid_() || this.isSaving_()) return
    this.saveFailed_.set(false)
    const client = this.client_()
    const area = this.area_()
    const notes = this.notes_().trim()
    const override = this.override_()
    const input: NewBookingInput = {
      ...(client ? { clientId: client._id } : { guest: { name: this.name_().trim(), phone: this.phone_().trim() } }),
      date: this.date_(),
      time: this.time_(),
      partySize: this.party_(),
      ...(area && { areaKey: area }),
      ...(notes && { notes }),
      ...(this.isOwner_() && override && { tableKeys: [override] })
    }
    this.isSaving_.set(true)
    try {
      const res = await this.bookingData.create(input)
      if (res.ok) {
        const numbers = this.numbersOf(res.booking.tableKeys ?? [])
        const onOther = this.date_() !== this.date()
        this.userMsg.onSetSuccessMsg(
          this.translation
            .translate(onOther ? 'nb_saved_on' : 'nb_saved')
            .replace('{date}', dmy(this.date_()))
            .replace('{n}', numbers)
        )
        this.saved.emit()
        this.closed.emit()
      } else if (res.code === 'NO_TABLE') {
        this.noTable_.set(true)
        this.alternatives_.set(res.alternatives ?? [])
      } else {
        this.saveFailed_.set(true)
        this.userMsg.onSetErrorMsg(this.translation.translate('nb_save_failed'))
      }
    } finally {
      this.isSaving_.set(false)
    }
  }

  protected onClose(): void {
    this.closed.emit()
  }

  /** A changed date, party or area drops what depended on them; the effect reloads the chips. */
  private resetAnswer(): void {
    this.override_.set(null)
    this.noTable_.set(false)
    this.alternatives_.set([])
  }

  private numbersOf(keys: readonly string[]): string {
    const tables = this.plan_()?.tables ?? []
    return keys.map((k) => tables.find((t) => t.key === k)?.number ?? k).join(', ')
  }

  private altLabel(a: BookingAlternative): string {
    if (a.date === this.date_()) return a.time
    const day = a.date === addDays(this.date_(), 1) ? this.translation.translate('nb_tomorrow') : dmy(a.date)
    return `${day} ${a.time}`
  }

  private async loadSlots(date: string, party: number, area: string): Promise<void> {
    const seq = ++this.loadSeq
    if (!date || party < 1) return
    this.slotsStatus_.set('loading')
    await Promise.all([this.floorPlan.ensureLoaded(), this.profileData.ensureLoaded()])
    const [slots, board] = await Promise.all([
      this.bookingData.availability(date, party, area || undefined),
      this.bookingData.dayBoard(date)
    ])
    if (seq !== this.loadSeq) return
    this.board_.set(board)
    if (!slots) {
      this.slots_.set([])
      this.slotsStatus_.set('failed')
      return
    }
    this.slots_.set(slots)
    this.slotsStatus_.set('ready')
    const chosen = this.time_()
    if (chosen && !slots.some((s) => s.time === chosen && s.available)) this.time_.set('')
  }
}
