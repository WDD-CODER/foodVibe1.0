import { HttpErrorResponse } from '@angular/common/http'
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core'
import { FormGroup, FormsModule } from '@angular/forms'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { PageHeaderComponent } from 'src/app/shared/page-header/page-header.component'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'
import { FormFieldComponent } from 'src/app/shared/form-field/form-field.component'
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component'
import { DateFieldComponent } from 'src/app/shared/date-field/date-field.component'
import { HoursEditorComponent } from 'src/app/shared/hours-editor/hours-editor.component'
import { TextareaAutoGrowDirective } from 'src/app/core/directives/textarea-auto-grow.directive'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { FrontDeskProfileDataService } from '@services/front-desk-profile-data.service'
import { PermissionService } from '@services/permission.service'
import { StorageService } from '@services/async-storage.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { useUnsavedChanges } from '@utils/unsaved-changes'
import { refusalShownToUser, serverFieldErrors } from '@utils/server-refusal.util'
import {
  checkHoursRow,
  draftToHours,
  hoursToDraft,
  isBrokenHours,
  type HoursDraftRow
} from 'src/app/core/utils/venue-hours.util'
import {
  ASSISTANT_TONES,
  BUSINESS_TYPES,
  FRONT_DESK_REQUEST_KINDS,
  type BusinessType,
  type FrontDeskProfile,
  type RequestKindConfig
} from '@models/front-desk-profile.model'
import type { FrontDeskRequestKind } from '@schemas/entities/front-desk-profile.schema'
import {
  RequestKindCardComponent,
  choiceNeedsOptions,
  emptyKindConfig
} from './components/request-kind-card/request-kind-card.component'

export const SLUG_RE = /^[a-z0-9-]{3,40}$/
const ENTITY = 'frontDeskProfiles'
const FIELD_MAP: Record<string, string> = {
  displayName: 'displayName',
  slug: 'slug',
  phone: 'phone',
  address: 'address',
  serviceArea: 'serviceArea',
  logoUrl: 'logoUrl'
}

/** The editable copy of a profile; hours are picker rows until saved. */
export interface SettingsDraft {
  displayName: string
  slug: string
  phone: string
  address: string
  serviceArea: string
  logoUrl: string
  hoursRows: HoursDraftRow[]
  closedDates: string[]
  kinds: Record<FrontDeskRequestKind, RequestKindConfig>
  tone: (typeof ASSISTANT_TONES)[number]
  greeting: string
  handoffText: string
  activeSame: boolean
  activeRows: HoursDraftRow[]
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

/** Plan 553: the one screen where the owner sets up the front desk profile (type, link, hours, kinds, assistant). */
@Component({
  selector: 'app-frontdesk-settings-page',
  standalone: true,
  imports: [
    FormsModule,
    LucideAngularModule,
    TranslatePipe,
    PageHeaderComponent,
    EmptyStateComponent,
    FormFieldComponent,
    CustomSelectComponent,
    DateFieldComponent,
    HoursEditorComponent,
    TextareaAutoGrowDirective,
    RequestKindCardComponent
  ],
  templateUrl: './frontdesk-settings.page.html',
  styleUrl: './frontdesk-settings.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FrontdeskSettingsPage {
  private readonly profiles = inject(FrontDeskProfileDataService)
  private readonly permission = inject(PermissionService)
  private readonly storage = inject(StorageService)
  private readonly translation = inject(TranslationService)
  private readonly userMsg = inject(UserMsgService)
  private readonly confirm = inject(ConfirmModalService)

  protected readonly kinds = FRONT_DESK_REQUEST_KINDS
  protected readonly tones = ASSISTANT_TONES
  protected readonly typeOptions = BUSINESS_TYPES.map((t) => ({ value: t, label: 'fd_type_' + t }))
  protected readonly toneOptions = ASSISTANT_TONES.map((t) => ({ value: t, label: 'fd_tone_' + t }))

  protected readonly isLoading_ = signal(true)
  protected readonly loadFailed_ = signal(false)
  protected readonly profile_ = this.profiles.profile_
  protected readonly canEdit_ = computed(() => this.permission.can('editFrontDesk'))
  protected readonly draft_ = signal<SettingsDraft | null>(null)

  // first visit
  protected readonly newType_ = signal<BusinessType | ''>('')
  protected readonly newName_ = signal('')
  protected readonly newSlug_ = signal('')
  protected readonly isCreating_ = signal(false)
  protected readonly createTried_ = signal(false)
  protected readonly createSlugTaken_ = signal(false)

  // editor
  protected readonly isSaving_ = signal(false)
  protected readonly showErrors_ = signal(false)
  protected readonly slugTaken_ = signal(false)
  protected readonly serverErrors_ = signal<Record<string, string>>({})

  private readonly guardForm_ = new FormGroup({})
  private readonly unsaved_ = useUnsavedChanges({
    form: () => this.guardForm_,
    snapshot: () => JSON.stringify(this.draft_())
  })

  protected readonly typeKey_ = computed(() => 'fd_type_' + (this.profile_()?.businessType ?? 'other'))
  protected readonly statusKey_ = computed(() => 'fd_status_' + (this.profile_()?.status ?? 'draft'))
  protected readonly levelKey_ = computed(() => 'fd_assistant_level_' + (this.profile_()?.assistant.level ?? 0))
  protected readonly slugInvalid_ = computed(() => !SLUG_RE.test(this.draft_()?.slug ?? ''))
  protected readonly newSlugInvalid_ = computed(() => !SLUG_RE.test(this.newSlug_()))
  protected readonly publicLink_ = computed(() => `${location.origin}/book/${this.draft_()?.slug ?? ''}`)

  /** Anything that blocks a save: the slug, the name, a party range, a bad question, a broken hours row. */
  protected readonly blocked_ = computed(() => {
    const d = this.draft_()
    if (!d) return false
    if (this.slugInvalid_() || !d.displayName.trim()) return true
    if (d.hoursRows.some((r) => isBrokenHours(checkHoursRow(r)))) return true
    if (!d.activeSame && d.activeRows.some((r) => isBrokenHours(checkHoursRow(r)))) return true
    return this.kinds.some((k) => {
      const c = d.kinds[k]
      if (!c.enabled) return false
      const { minPartySize: min, maxPartySize: max } = c.rules
      if (min != null && max != null && min > max) return true
      return c.questions.some((q) => !q.label.trim() || choiceNeedsOptions(q))
    })
  })

  constructor() {
    void this.load()
    effect(() => {
      const profile = this.profile_()
      untracked(() => {
        if (profile && !this.draft_()) this.resetDraft(profile)
      })
    })
  }

  /** Route guard (`pendingChangesGuard`): unsaved edits ask before leaving. */
  hasRealChanges(): boolean {
    return this.unsaved_.hasChanges()
  }

  protected async load(): Promise<void> {
    this.isLoading_.set(true)
    this.loadFailed_.set(false)
    await this.profiles.ensureLoaded()
    if (!this.profile_()) {
      // The service keeps a failed load quiet; one direct read tells "no profile yet" from "could not load".
      try {
        const rows = await this.storage.query<FrontDeskProfile>(ENTITY)
        if (rows.length) await this.profiles.reloadFromStorage()
      } catch {
        this.loadFailed_.set(true)
      }
    }
    this.isLoading_.set(false)
  }

  private toDraft(p: FrontDeskProfile): SettingsDraft {
    const kinds = {} as Record<FrontDeskRequestKind, RequestKindConfig>
    for (const k of FRONT_DESK_REQUEST_KINDS) kinds[k] = clone(p.requestKinds[k] ?? emptyKindConfig())
    return {
      displayName: p.displayName,
      slug: p.slug,
      phone: p.phone ?? '',
      address: p.address ?? '',
      serviceArea: p.serviceArea ?? '',
      logoUrl: p.logoUrl ?? '',
      hoursRows: (p.hours ?? []).map((h) => hoursToDraft(h as never)),
      closedDates: [...(p.closedDates ?? [])],
      kinds,
      tone: p.assistant.tone,
      greeting: p.assistant.greeting ?? '',
      handoffText: p.assistant.handoffText ?? '',
      activeSame: !p.assistant.activeHours,
      activeRows: (p.assistant.activeHours ?? []).map((h) => hoursToDraft(h as never))
    }
  }

  private resetDraft(p: FrontDeskProfile): void {
    this.draft_.set(this.toDraft(p))
    this.unsaved_.markSaved()
    this.showErrors_.set(false)
    this.slugTaken_.set(false)
    this.serverErrors_.set({})
  }

  protected patch(change: Partial<SettingsDraft>): void {
    this.draft_.update((d) => (d ? { ...d, ...change } : d))
    if ('slug' in change) this.slugTaken_.set(false)
    this.serverErrors_.set({})
  }

  protected setKind(kind: FrontDeskRequestKind, config: RequestKindConfig): void {
    this.draft_.update((d) => (d ? { ...d, kinds: { ...d.kinds, [kind]: config } } : d))
  }

  protected fieldError(key: string): string | null {
    return this.serverErrors_()[key] ?? null
  }

  // --- first visit ---
  protected async create(): Promise<void> {
    this.createTried_.set(true)
    const type = this.newType_()
    if (!type || !this.newName_().trim() || this.newSlugInvalid_() || this.isCreating_()) return
    this.isCreating_.set(true)
    this.createSlugTaken_.set(false)
    try {
      await this.profiles.createFromTemplate(type, this.newSlug_(), this.newName_().trim())
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 409 && err.error?.error === 'SLUG_TAKEN') {
        this.createSlugTaken_.set(true)
      } else if (!refusalShownToUser(err)) {
        this.userMsg.onSetErrorMsg(this.translation.translate('save_failed'))
      }
    } finally {
      this.isCreating_.set(false)
    }
  }

  // --- link ---
  protected async copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.publicLink_())
      this.userMsg.onSetSuccessMsg(this.translation.translate('fd_link_copied'))
    } catch {
      this.userMsg.onSetErrorMsg(this.translation.translate('save_failed'))
    }
  }

  // --- closed dates ---
  protected readonly newClosed_ = signal('')

  protected addClosedDate(): void {
    const date = this.newClosed_()
    const d = this.draft_()
    if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(date) || d.closedDates.includes(date) || d.closedDates.length >= 100) return
    this.newClosed_.set('')
    this.patch({ closedDates: [...d.closedDates, date].sort() })
  }

  protected removeClosedDate(date: string): void {
    const d = this.draft_()
    if (d) this.patch({ closedDates: d.closedDates.filter((x) => x !== date) })
  }

  // --- save / discard ---
  private toBody(p: FrontDeskProfile, d: SettingsDraft): FrontDeskProfile {
    const rows = (list: HoursDraftRow[]) =>
      list
        .filter((r) => {
          const res = checkHoursRow(r)
          return res === 'ok' || res === 'overnight'
        })
        .map(draftToHours)
    const text = (v: string) => v.trim() || undefined
    const { status: _status, whatsapp: _whatsapp, ...base } = p
    const assistant: FrontDeskProfile['assistant'] = {
      level: p.assistant.level,
      tone: d.tone,
      ...(text(d.greeting) && { greeting: text(d.greeting) }),
      ...(text(d.handoffText) && { handoffText: text(d.handoffText) }),
      ...(!d.activeSame && { activeHours: rows(d.activeRows) as never })
    }
    const kinds: FrontDeskProfile['requestKinds'] = {}
    for (const k of FRONT_DESK_REQUEST_KINDS) {
      const c = d.kinds[k]
      // A kind that was never set up and is still off stays out of the profile.
      if (c.enabled || c.questions.length || p.requestKinds[k]) kinds[k] = c
    }
    return {
      ...base,
      displayName: d.displayName.trim(),
      slug: d.slug,
      phone: text(d.phone),
      address: text(d.address),
      serviceArea: text(d.serviceArea),
      logoUrl: text(d.logoUrl),
      hours: rows(d.hoursRows) as never,
      closedDates: d.closedDates,
      requestKinds: kinds,
      assistant
    } as unknown as FrontDeskProfile
  }

  protected async save(): Promise<void> {
    const p = this.profile_()
    const d = this.draft_()
    if (!p || !d || this.isSaving_() || !this.canEdit_()) return
    if (this.blocked_()) {
      this.showErrors_.set(true)
      return
    }
    this.isSaving_.set(true)
    try {
      const saved = await this.profiles.save(this.toBody(p, d))
      this.resetDraft(saved)
      this.userMsg.onSetSuccessMsg(this.translation.translate('fd_settings_saved'))
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 409 && err.error?.error === 'SLUG_TAKEN') {
        this.slugTaken_.set(true)
      } else {
        this.serverErrors_.set(serverFieldErrors(err, FIELD_MAP))
        if (!refusalShownToUser(err)) this.userMsg.onSetErrorMsg(this.translation.translate('save_failed'))
      }
    } finally {
      this.isSaving_.set(false)
    }
  }

  protected async discard(): Promise<void> {
    const p = this.profile_()
    if (!p || !(await this.confirm.open('fd_discard_confirm'))) return
    this.resetDraft(p)
  }
}
