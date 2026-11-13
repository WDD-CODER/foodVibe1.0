import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { RouterLink } from '@angular/router'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { ModalShellComponent } from 'src/app/shared/modal-shell/modal-shell.component'
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component'
import { ClientPickerComponent } from 'src/app/shared/client-picker/client-picker.component'
import { FormFieldComponent } from 'src/app/shared/form-field/form-field.component'
import { DateFieldComponent } from 'src/app/shared/date-field/date-field.component'
import { TimeFieldComponent } from 'src/app/shared/time-field/time-field.component'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'
import { FrontDeskProfileDataService } from '@services/front-desk-profile-data.service'
import { PermissionService } from '@services/permission.service'
import { RequestDataService } from '@services/request-data.service'
import { TranslationService } from '@services/translation.service'
import { WANTED_QUESTION_KEYS } from '@schemas/front-desk-templates'
import { REQUEST_KINDS, type FrontDeskRequest, type ManualRequestInput, type RequestKind } from '@models/request.model'
import type { Client } from '@models/client.model'

const TIME_BOUND: readonly string[] = ['table', 'tasting', 'consultation']
const FIXED_KEYS: readonly string[] = ['date', 'time', 'party_size', 'budget_per_guest', 'location']
const NAME_MAX = 200

/** Plan 552: type a phone request into the queue. Owner picks a client; staff type a name and phone (D2). */
@Component({
  selector: 'app-new-request-dialog',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    TranslatePipe,
    ModalShellComponent,
    CustomSelectComponent,
    ClientPickerComponent,
    FormFieldComponent,
    DateFieldComponent,
    TimeFieldComponent,
    EmptyStateComponent
  ],
  templateUrl: './new-request-dialog.component.html',
  styleUrl: './new-request-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NewRequestDialogComponent {
  private readonly requests = inject(RequestDataService)
  private readonly profiles = inject(FrontDeskProfileDataService)
  private readonly permission = inject(PermissionService)
  private readonly translation = inject(TranslationService)

  readonly created = output<FrontDeskRequest>()
  readonly failed = output<void>()
  readonly closed = output<void>()
  readonly dirtyChange = output<boolean>()

  protected readonly nameMax = NAME_MAX
  protected readonly isOwner_ = this.permission.isOwner_
  protected readonly profile_ = this.profiles.profile_
  /** True once the profile is missing (before opening) or the server answered 409 NO_PROFILE. */
  protected readonly noProfile_ = signal(false)

  protected readonly kind_ = signal<RequestKind | ''>('')
  protected readonly client_ = signal<Client | null>(null)
  protected readonly picking_ = signal(false)
  protected readonly name_ = signal('')
  protected readonly phone_ = signal('')
  protected readonly date_ = signal('')
  protected readonly time_ = signal('')
  protected readonly party_ = signal<number | null>(null)
  protected readonly budget_ = signal<number | null>(null)
  protected readonly location_ = signal('')
  protected readonly answers_ = signal<Record<string, string>>({})
  protected readonly touched_ = signal(false)
  protected readonly isSaving_ = signal(false)
  protected readonly saveFailed_ = signal(false)

  protected readonly kindOptions_ = computed(() => {
    const kinds = this.profile_()?.requestKinds ?? {}
    return REQUEST_KINDS.filter((k) => kinds[k]?.enabled).map((k) => ({ value: k, label: `fd_kind_${k}` }))
  })
  protected readonly questions_ = computed(() => {
    const kind = this.kind_()
    return kind ? (this.profile_()?.requestKinds[kind]?.questions ?? []) : []
  })
  protected readonly extraQuestions_ = computed(() =>
    this.questions_()
      .filter((q) => !FIXED_KEYS.includes(q.key))
      .map((q) => ({
        key: q.key,
        label: this.translation.translate(q.label),
        type: q.type,
        required: q.required,
        options: (q.options ?? []).map((o) => ({ value: this.translation.translate(o), label: o }))
      }))
  )
  protected readonly timeBound_ = computed(() => TIME_BOUND.includes(this.kind_()))
  protected readonly isEvent_ = computed(() => this.kind_() === 'event')
  protected readonly hasParty_ = computed(() => !!this.kind_() && this.kind_() !== 'consultation')

  protected readonly dirty_ = computed(
    () =>
      this.kind_() !== '' ||
      !!this.client_() ||
      !!this.name_().trim() ||
      !!this.phone_().trim() ||
      !!this.date_() ||
      !!this.location_().trim() ||
      Object.values(this.answers_()).some((v) => v.trim())
  )

  constructor() {
    if (!this.profiles.profile_()) this.noProfile_.set(true)
  }

  protected isRequired(key: string): boolean {
    return this.questions_().some((q) => q.key === key && q.required)
  }

  protected clientValid_(): boolean {
    return this.isOwner_() ? !!this.client_() : !!this.name_().trim() && this.phone_().replace(/\D/g, '').length >= 7
  }

  protected missing(key: string, value: unknown): boolean {
    return this.touched_() && this.isRequired(key) && (value === null || value === '' || value === undefined)
  }

  protected setAnswer(key: string, value: string): void {
    this.answers_.update((a) => ({ ...a, [key]: value }))
    this.dirtyChange.emit(true)
  }

  protected touch(): void {
    this.dirtyChange.emit(this.dirty_())
  }

  protected formValid_(): boolean {
    if (!this.kind_() || !this.clientValid_()) return false
    const filled: Record<string, unknown> = {
      date: this.date_(),
      time: this.time_(),
      party_size: this.party_(),
      budget_per_guest: this.budget_(),
      location: this.location_().trim()
    }
    for (const [key, value] of Object.entries(filled)) {
      if (this.isRequired(key) && (value === null || value === '')) return false
    }
    return this.extraQuestions_().every((q) => !q.required || !!(this.answers_()[q.key] ?? '').trim())
  }

  protected async onSave(): Promise<void> {
    this.touched_.set(true)
    this.saveFailed_.set(false)
    const kind = this.kind_()
    if (!kind || !this.formValid_() || this.isSaving_()) return
    const wanted: ManualRequestInput['wanted'] = {}
    if (this.date_()) wanted.date = this.date_()
    if (this.time_() && this.timeBound_()) wanted.time = this.time_()
    const party = this.party_()
    if (party !== null && this.hasParty_()) wanted.partySize = Math.max(1, Math.round(party))
    const budget = this.budget_()
    if (budget !== null && this.isEvent_()) wanted.budgetPerGuest = Math.max(0, budget)
    if (this.location_().trim() && this.isEvent_()) wanted.location = this.location_().trim()
    const answers: ManualRequestInput['answers'] = []
    for (const q of this.extraQuestions_()) {
      const value = (this.answers_()[q.key] ?? '').trim()
      if (!value) continue
      const wantedField = (WANTED_QUESTION_KEYS as Record<string, string>)[q.key]
      if (wantedField === 'eventTypeKey') wanted.eventTypeKey = value
      else answers.push({ questionKey: q.key, label: q.label, value })
    }
    const input: ManualRequestInput = this.isOwner_()
      ? { kind, clientId: this.client_()!._id, wanted, answers }
      : { kind, guestName: this.name_().trim(), guestPhone: this.phone_().trim(), wanted, answers }
    this.isSaving_.set(true)
    const res = await this.requests.createManual(input)
    this.isSaving_.set(false)
    if (res.ok) {
      this.dirtyChange.emit(false)
      this.created.emit(res.request)
      return
    }
    if (res.code === 'NO_PROFILE') {
      this.noProfile_.set(true)
      return
    }
    this.saveFailed_.set(true)
    this.failed.emit()
  }

  protected onClose(): void {
    this.dirtyChange.emit(false)
    this.closed.emit()
  }
}
