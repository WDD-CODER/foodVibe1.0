import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  input,
  OnInit,
  output,
  signal,
  viewChild
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { ModalShellComponent } from 'src/app/shared/modal-shell/modal-shell.component'
import { FormFieldComponent } from 'src/app/shared/form-field/form-field.component'
import { CounterComponent } from 'src/app/shared/counter/counter.component'
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'
import { LoaderComponent } from 'src/app/shared/loader/loader.component'
import type { FloorMapPlan } from 'src/app/shared/floor-map/floor-map.component'
import { WaitlistDataService } from '@services/waitlist-data.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import type { WaitlistEntry } from '@models/waitlist-entry.model'

const CLOCK_MS = 30000
const MINUTE_MS = 60000
const PHONE_CHARS = /^[0-9+\-\s]+$/
const MIN_PHONE_DIGITS = 7
const QUOTED_MAX = 240
const NAME_MAX = 80

interface WaitRow {
  entry: WaitlistEntry
  position: number
  minutes: number
  over: boolean
  areaName: string
}

/**
 * Plan 673: the waiting list of table service. A host adds a party, sees the order and how long each one waited (from the
 * server's clock), marks "table is ready" and says "left"; "seated" hands the entry to the floor view, which picks the
 * table. The list is read here on open; the floor view reads its own copy for the button's number.
 */
@Component({
  selector: 'app-waitlist-drawer',
  standalone: true,
  imports: [
    FormsModule,
    LucideAngularModule,
    TranslatePipe,
    ModalShellComponent,
    FormFieldComponent,
    CounterComponent,
    CustomSelectComponent,
    EmptyStateComponent,
    LoaderComponent
  ],
  templateUrl: './waitlist-drawer.component.html',
  styleUrl: './waitlist-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WaitlistDrawerComponent implements OnInit {
  private readonly waitlist = inject(WaitlistDataService)
  private readonly translation = inject(TranslationService)
  private readonly userMsg = inject(UserMsgService)

  /** Today's date (`YYYY-MM-DD`): the list's day and the day a new party is added for. */
  readonly date = input.required<string>()
  readonly plan = input.required<Pick<FloorMapPlan, 'areas'>>()
  readonly closed = output<void>()
  /** "Seated" on a row: the floor view starts the pick-a-table mode for this entry. */
  readonly seatRequested = output<WaitlistEntry>()
  /** The list changed here (an add, a told, a left): the floor view reloads its own copy. */
  readonly changed = output<void>()

  protected readonly nameMax = NAME_MAX
  protected readonly quotedMax = QUOTED_MAX
  protected readonly status_ = signal<'loading' | 'error' | 'ready'>('loading')
  protected readonly entries_ = signal<WaitlistEntry[]>([])
  protected readonly busy_ = signal<string | null>(null)
  protected readonly adding_ = signal(false)
  protected readonly todayOpen_ = signal(false)
  protected readonly name_ = signal('')
  protected readonly phone_ = signal('')
  protected readonly party_ = signal(2)
  protected readonly area_ = signal('')
  protected readonly quoted_ = signal<number | null>(null)
  private readonly serverNow_ = signal(0)
  private readonly receivedAt_ = signal(0)
  private readonly clockTick_ = signal(0)
  private readonly nameInput_ = viewChild<ElementRef<HTMLInputElement>>('nameInput')
  private loadSeq = 0

  protected readonly areaOptions_ = computed(() => [
    { value: '', label: this.translation.translate('wl_area_any') },
    ...this.plan().areas.map((a) => ({ value: a.key, label: a.name }))
  ])
  protected readonly phoneValid_ = computed(() => {
    const phone = this.phone_().trim()
    return !phone || (PHONE_CHARS.test(phone) && phone.replace(/\D/g, '').length >= MIN_PHONE_DIGITS)
  })
  protected readonly canAdd_ = computed(
    () => !!this.name_().trim() && this.party_() >= 1 && this.party_() <= 30 && this.phoneValid_() && !this.adding_()
  )

  /** The waiting and told parties in joinedAt order, with the minutes each has waited at the server's now. */
  protected readonly rows_ = computed<WaitRow[]>(() => {
    this.clockTick_()
    const now = this.serverNow_() + (performance.now() - this.receivedAt_())
    const areas = this.plan().areas
    return this.entries_()
      .filter((e) => e.status === 'waiting' || e.status === 'notified')
      .sort((a, b) => a.joinedAt - b.joinedAt)
      .map((entry, i) => {
        const minutes = Math.max(0, Math.floor((now - entry.joinedAt) / MINUTE_MS))
        return {
          entry,
          position: i + 1,
          minutes,
          over: entry.quotedMinutes !== undefined && minutes > entry.quotedMinutes,
          areaName: areas.find((a) => a.key === entry.areaKey)?.name ?? ''
        }
      })
  })
  protected readonly ended_ = computed(() =>
    this.entries_()
      .filter((e) => e.status === 'seated' || e.status === 'left')
      .sort((a, b) => a.joinedAt - b.joinedAt)
  )

  constructor() {
    const clock = setInterval(() => this.clockTick_.update((n) => n + 1), CLOCK_MS)
    inject(DestroyRef).onDestroy(() => {
      clearInterval(clock)
      this.loadSeq++
    })
  }

  ngOnInit(): void {
    void this.load(true)
  }

  protected retry(): void {
    void this.load(true)
  }

  protected waitedText(minutes: number): string {
    return this.translation.translate('wl_waited').replace('{n}', String(minutes))
  }

  protected setParty(value: number): void {
    this.party_.set(Math.min(30, Math.max(1, Math.round(value))))
  }

  /** Quoted minutes: digits only, 0–240; anything else leaves it unset. */
  protected setQuoted(value: string | null): void {
    const digits = (value ?? '').replace(/\D/g, '')
    this.quoted_.set(digits ? Math.min(QUOTED_MAX, Number(digits)) : null)
  }

  protected async add(): Promise<void> {
    if (!this.canAdd_()) return
    this.adding_.set(true)
    try {
      const quoted = this.quoted_()
      const res = await this.waitlist.add({
        date: this.date(),
        guestName: this.name_().trim(),
        guestPhone: this.phone_().trim(),
        partySize: this.party_(),
        ...(this.area_() && { areaKey: this.area_() }),
        ...(quoted !== null && { quotedMinutes: quoted })
      })
      if (!res.ok) {
        this.userMsg.onSetErrorMsg(this.translation.translate('wl_add_failed'))
        return
      }
      this.entries_.update((list) => [...list, res.entry])
      this.name_.set('')
      this.phone_.set('')
      this.party_.set(2)
      this.area_.set('')
      this.quoted_.set(null)
      this.changed.emit()
      this.nameInput_()?.nativeElement.focus()
    } finally {
      this.adding_.set(false)
    }
  }

  protected async notify(entry: WaitlistEntry): Promise<void> {
    await this.act(entry, () => this.waitlist.notify(entry._id))
  }

  protected async left(entry: WaitlistEntry): Promise<void> {
    await this.act(entry, () => this.waitlist.left(entry._id))
  }

  protected seat(entry: WaitlistEntry): void {
    if (this.busy_()) return
    this.seatRequested.emit(entry)
    this.closed.emit()
  }

  protected toggleToday(): void {
    this.todayOpen_.update((open) => !open)
  }

  private async act(entry: WaitlistEntry, call: () => ReturnType<WaitlistDataService['notify']>): Promise<void> {
    if (this.busy_()) return
    this.busy_.set(entry._id)
    try {
      const res = await call()
      if (res.ok) {
        this.entries_.update((list) => list.map((e) => (e._id === entry._id ? res.entry : e)))
        this.changed.emit()
      } else if (res.code === 'BAD_STATUS' || res.code === 'STATUS_CHANGED') {
        this.userMsg.onSetErrorMsg(this.translation.translate('bk_bad_status'))
        await this.load(false)
        this.changed.emit()
      } else {
        this.userMsg.onSetErrorMsg(this.translation.translate('wl_action_failed'))
      }
    } finally {
      this.busy_.set(null)
    }
  }

  private async load(first: boolean): Promise<void> {
    const seq = ++this.loadSeq
    if (first) this.status_.set('loading')
    const res = await this.waitlist.list(this.date())
    if (seq !== this.loadSeq) return
    if (res.ok) {
      this.entries_.set(res.entries)
      this.serverNow_.set(res.now)
      this.receivedAt_.set(performance.now())
      this.status_.set('ready')
    } else if (first) {
      this.status_.set('error')
    }
  }
}
