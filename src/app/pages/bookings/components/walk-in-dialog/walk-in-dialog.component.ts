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
import { FormFieldComponent } from 'src/app/shared/form-field/form-field.component'
import { CounterComponent } from 'src/app/shared/counter/counter.component'
import { FloorMapComponent, type FloorMapPlan } from 'src/app/shared/floor-map/floor-map.component'
import type { FloorTableState } from 'src/app/shared/floor-map/floor-geometry.util'
import { BookingDataService } from '@services/booking-data.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import type { WalkInInput } from '@models/booking.model'
import { freeTablesFor, type TableLook } from 'src/app/core/utils/table-state.util'

const NAME_MAX = 200
const MIN_PHONE_DIGITS = 7
const PHONE_CHARS = /^[0-9+\-\s]+$/

/**
 * Plan 672: seats a party that walks in, now. Opened from a free table's sheet (`tableKey` set) or from the bar's
 * button (the host taps one free table that fits). Guest details are optional; a walk-in without them stores no client.
 */
@Component({
  selector: 'app-walk-in-dialog',
  standalone: true,
  imports: [
    FormsModule,
    LucideAngularModule,
    TranslatePipe,
    ModalShellComponent,
    FormFieldComponent,
    CounterComponent,
    FloorMapComponent
  ],
  templateUrl: './walk-in-dialog.component.html',
  styleUrl: './walk-in-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WalkInDialogComponent {
  private readonly bookingData = inject(BookingDataService)
  private readonly translation = inject(TranslationService)
  private readonly userMsg = inject(UserMsgService)

  /** The table of the sheet the dialog was opened from; null when opened from the bar's button. */
  readonly tableKey = input<string | null>(null)
  readonly plan = input.required<FloorMapPlan>()
  /** The live look of each table now (the floor view's states). */
  readonly states = input.required<Record<string, Pick<TableLook, 'state'>>>()
  readonly closed = output<void>()
  /** Emitted after a successful seating, before `closed`. */
  readonly seated = output<void>()

  protected readonly nameMax = NAME_MAX
  protected readonly party_ = signal(2)
  private readonly picked_ = signal<string | null>(null)
  protected readonly detailsOpen_ = signal(false)
  protected readonly name_ = signal('')
  protected readonly phone_ = signal('')
  protected readonly isSaving_ = signal(false)
  protected readonly saveFailed_ = signal(false)
  protected readonly taken_ = signal(false)

  protected readonly fixedTable_ = computed(() => {
    const key = this.tableKey()
    return key ? (this.plan().tables.find((t) => t.key === key) ?? null) : null
  })
  protected readonly fits_ = computed(() => freeTablesFor(this.states(), this.plan(), this.party_()))
  /** Fitting tables show as free and tappable, the rest as dimmed. */
  protected readonly mapStates_ = computed<Record<string, FloorTableState>>(() => {
    const fits = this.fits_()
    return Object.fromEntries(this.plan().tables.map((t) => [t.key, fits.includes(t.key) ? 'free' : 'not_active']))
  })
  protected readonly chosenKey_ = computed(() => this.fixedTable_()?.key ?? this.picked_())
  protected readonly selectedKeys_ = computed(() => {
    const key = this.chosenKey_()
    return key ? [key] : []
  })
  protected readonly noFree_ = computed(() => !this.fixedTable_() && this.fits_().length === 0)
  protected readonly phoneValid_ = computed(
    () => PHONE_CHARS.test(this.phone_().trim()) && this.phone_().replace(/\D/g, '').length >= MIN_PHONE_DIGITS
  )
  /** Both or neither. */
  protected readonly guestValid_ = computed(() => {
    const named = !!this.name_().trim()
    const phoned = !!this.phone_().trim()
    return (!named && !phoned) || (named && this.phoneValid_())
  })
  protected readonly valid_ = computed(() => !!this.chosenKey_() && this.party_() >= 1 && this.guestValid_())
  protected readonly dirty_ = computed(() => !!this.name_().trim() || !!this.phone_().trim())
  protected readonly tableLine_ = computed(() => {
    const t = this.fixedTable_()
    return t ? this.translation.translate('tsh_title').replace('{n}', t.number) : ''
  })

  constructor() {
    // A picked table that no longer fits a changed party is dropped.
    effect(() => {
      const fits = this.fits_()
      untracked(() => {
        const key = this.picked_()
        if (key && !fits.includes(key)) this.picked_.set(null)
      })
    })
  }

  protected setParty(value: number): void {
    this.party_.set(Math.max(1, Math.round(value)))
    this.taken_.set(false)
  }

  protected onMapTap(key: string): void {
    if (this.isSaving_() || !this.fits_().includes(key)) return
    this.picked_.update((current) => (current === key ? null : key))
    this.taken_.set(false)
  }

  protected toggleDetails(): void {
    this.detailsOpen_.update((open) => !open)
  }

  protected async onSeat(): Promise<void> {
    const key = this.chosenKey_()
    if (!key || !this.valid_() || this.isSaving_()) return
    this.saveFailed_.set(false)
    this.taken_.set(false)
    const name = this.name_().trim()
    const input: WalkInInput = {
      partySize: this.party_(),
      tableKeys: [key],
      ...(name && { guest: { name, phone: this.phone_().trim() } })
    }
    this.isSaving_.set(true)
    try {
      const res = await this.bookingData.walkIn(input)
      if (res.ok) {
        const number = this.plan().tables.find((t) => t.key === key)?.number ?? key
        this.userMsg.onSetSuccessMsg(this.translation.translate('wlk_seated').replace('{n}', number))
        this.seated.emit()
        this.closed.emit()
      } else if (res.code === 'NO_TABLE') {
        this.taken_.set(true)
        this.userMsg.onSetErrorMsg(this.translation.translate('wlk_table_taken'))
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
}
