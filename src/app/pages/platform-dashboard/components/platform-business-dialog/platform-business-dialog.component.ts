import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  signal
} from '@angular/core'
import { DatePipe } from '@angular/common'
import { HttpErrorResponse } from '@angular/common/http'
import { FormsModule } from '@angular/forms'
import { MODULE_KEYS, type ModuleKey } from '@schemas/modules-pure'
import type { PlatformHistoryRow } from '@schemas/modules'
import { TranslatePipe } from '@pipes/translation-pipe.pipe'
import { ModalShellComponent } from 'src/app/shared/modal-shell/modal-shell.component'
import { FormFieldComponent } from 'src/app/shared/form-field/form-field.component'
import { LoaderComponent } from 'src/app/shared/loader/loader.component'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'
import { DisabledWhyDirective } from 'src/app/shared/tooltip/disabled-why.directive'
import { LucideAngularModule } from 'lucide-angular'
import { NumberBoxDirective } from '@directives/number-box.directive'
import { BusinessService } from '@services/business.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { PlatformAdminService, type PlatformUpdateBody } from '@services/platform-admin.service'
import { LoggingService } from '@services/logging.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { PlatformBusinessDialogService } from './platform-business-dialog.service'

const REASON_MIN = 3
const REASON_MAX = 200

type PlatformChange = { field: string; from: string; to: string }

/** Plan 638: one stored change as a Hebrew line. Pure, so it is tested without the template. */
export function describePlatformChange(change: PlatformChange, translate: (key: string) => string): string {
  if (change.field === 'modules') {
    const before = change.from.split(',').filter(Boolean)
    const after = change.to.split(',').filter(Boolean)
    const label = (k: string): string => translate('module_' + k)
    const added = after.filter((k) => !before.includes(k)).map(label)
    const removed = before.filter((k) => !after.includes(k)).map(label)
    const parts: string[] = []
    if (added.length) parts.push(`${translate('platform_history_added')} ${added.join(', ')}`)
    if (removed.length) parts.push(`${translate('platform_history_removed')} ${removed.join(', ')}`)
    return `${translate('platform_history_field_modules')} — ${parts.join(' · ')}`
  }
  if (change.field === 'aiMonthlyTokenCap') {
    const show = (v: string): string => (v === '' ? translate('platform_ai_no_cap') : v)
    return translate('platform_history_cap_change')
      .replace('{from}', show(change.from))
      .replace('{to}', show(change.to))
  }
  if (change.field === 'learnedData') return translate('platform_history_learned_erased')
  if (change.field === 'aiPrivate') {
    return translate(change.to === 'true' ? 'platform_history_private_on' : 'platform_history_private_off')
  }
  return change.field
}

/** Plan 620: the platform admin sets one business's modules, monthly AI token cap and private mode, with a reason. */
@Component({
  selector: 'app-platform-business-dialog',
  standalone: true,
  imports: [
    FormsModule,
    DatePipe,
    TranslatePipe,
    ModalShellComponent,
    FormFieldComponent,
    NumberBoxDirective,
    LoaderComponent,
    EmptyStateComponent,
    LucideAngularModule,
    DisabledWhyDirective
  ],
  templateUrl: './platform-business-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlatformBusinessDialogComponent {
  private readonly dialog = inject(PlatformBusinessDialogService)
  private readonly admin = inject(PlatformAdminService)
  private readonly business = inject(BusinessService)
  private readonly logging = inject(LoggingService)
  private readonly translation = inject(TranslationService)
  private readonly userMsg = inject(UserMsgService)
  private readonly confirmModal = inject(ConfirmModalService)
  private readonly host = inject(ElementRef<HTMLElement>)
  private readonly injector = inject(Injector)

  protected readonly target = this.dialog.current_
  protected readonly moduleKeys = MODULE_KEYS
  protected readonly reasonMax = REASON_MAX

  protected readonly modules_ = signal<ModuleKey[]>([...(this.dialog.current_()?.modules ?? [])])
  protected readonly cap_ = signal<string>(String(this.dialog.current_()?.aiMonthlyTokenCap ?? ''))
  protected readonly private_ = signal<boolean>(this.dialog.current_()?.aiPrivate ?? false)
  protected readonly reason_ = signal('')
  protected readonly isSaving_ = signal(false)
  protected readonly reasonError_ = signal<string | null>(null)
  protected readonly tried_ = signal(false)
  protected readonly isHistoryOpen_ = signal(false)
  /** `null` = loading. */
  protected readonly history_ = signal<PlatformHistoryRow[] | null>(null)
  protected readonly historyFailed_ = signal(false)
  private historyToken_ = 0
  protected readonly isEraseOpen_ = signal(false)
  protected readonly eraseReason_ = signal('')
  protected readonly isErasing_ = signal(false)
  protected readonly eraseDone_ = signal<string | null>(null)
  protected readonly eraseFailed_ = signal(false)
  protected readonly eraseReasonMissing_ = computed(() => this.eraseReason_().trim().length < 1)

  /** The cap as typed: `null` when emptied, `NaN` when it is not a whole number of 0 or more. */
  private readonly capValue_ = computed<number | null>(() => {
    const text = this.cap_().trim()
    if (text === '') return null
    return /^\d+$/.test(text) ? Number(text) : Number.NaN
  })
  protected readonly capInvalid_ = computed(() => Number.isNaN(this.capValue_()))
  protected readonly reasonMissing_ = computed(() => this.reason_().trim().length < REASON_MIN)

  /** Only what differs from the row is sent. */
  private readonly body_ = computed<Omit<PlatformUpdateBody, 'reason'>>(() => {
    const t = this.dialog.current_()
    const body: Omit<PlatformUpdateBody, 'reason'> = {}
    if (!t) return body
    const chosen = MODULE_KEYS.filter((key) => this.modules_().includes(key))
    const before = MODULE_KEYS.filter((key) => t.modules.includes(key))
    if (chosen.join() !== before.join()) body.modules = chosen
    const cap = this.capValue_()
    if (cap === null ? t.aiMonthlyTokenCap !== null : !Number.isNaN(cap) && cap !== t.aiMonthlyTokenCap) {
      body.aiMonthlyTokenCap = cap
    }
    if (this.private_() !== t.aiPrivate) body.aiPrivate = this.private_()
    return body
  })
  protected readonly hasChange_ = computed(() => Object.keys(this.body_()).length > 0 || this.capInvalid_())

  protected isOn(key: ModuleKey): boolean {
    return this.modules_().includes(key)
  }

  /** Logistics lives on an event: it is disabled while `events` is off. */
  protected isDisabled(key: ModuleKey): boolean {
    return key === 'event_logistics' && !this.isOn('events')
  }

  protected toggleModule(key: ModuleKey, on: boolean): void {
    this.modules_.update((list) => {
      const next = on ? [...list, key] : list.filter((k) => k !== key)
      return key === 'events' && !on ? next.filter((k) => k !== 'event_logistics') : next
    })
  }

  protected toggleHistory(): void {
    if (this.isHistoryOpen_()) {
      this.closeHistory()
      return
    }
    this.openHistory()
  }

  protected openHistory(): void {
    this.isHistoryOpen_.set(true)
    this.history_.set(null)
    this.historyFailed_.set(false)
    void this.loadHistory_()
    afterNextRender(() => this.focusTestId_('biz-history-close'), { injector: this.injector })
  }

  protected closeHistory(): void {
    this.historyToken_++
    this.isHistoryOpen_.set(false)
    afterNextRender(() => this.focusTestId_('biz-history-open'), { injector: this.injector })
  }

  private focusTestId_(id: string): void {
    ;(this.host.nativeElement as HTMLElement).querySelector<HTMLElement>(`[data-testid="${id}"]`)?.focus()
  }

  private async loadHistory_(): Promise<void> {
    const t = this.dialog.current_()
    if (!t) return
    const token = ++this.historyToken_
    try {
      const rows = await this.admin.getPlatformHistory(t.businessId)
      if (token === this.historyToken_) this.history_.set(rows)
    } catch (err) {
      if (token !== this.historyToken_) return
      this.historyFailed_.set(true)
      this.logging.error({
        event: 'platform.history_load_failed',
        message: 'Loading the platform change history failed',
        context: { businessId: t.businessId, err: String(err) }
      })
    }
  }

  protected describeChange(change: PlatformChange): string {
    return describePlatformChange(change, (key) => this.translation.translate(key))
  }

  /** A row written before plan 638 has no values: its field labels only. */
  protected oldFieldLabels(row: PlatformHistoryRow): string {
    return row.changed.map((f) => this.translation.translate('platform_history_field_' + f)).join(', ')
  }

  /** Plan 639: shows the reason field for the explicit erase of what was learned from the business. */
  protected toggleErase(): void {
    this.isEraseOpen_.update((open) => !open)
    this.eraseFailed_.set(false)
  }

  /** Plan 639: asks once more, then erases; the history panel, when open, is read again. */
  protected async confirmErase(): Promise<void> {
    const t = this.dialog.current_()
    if (!t || this.isErasing_() || this.eraseReasonMissing_()) return
    const message = this.translation.translate('platform_erase_confirm').replace('{name}', t.name)
    if (!(await this.confirmModal.open(message, { variant: 'danger', saveLabel: 'remove' }))) return
    this.isErasing_.set(true)
    this.eraseFailed_.set(false)
    this.eraseDone_.set(null)
    try {
      const counts = await this.admin.eraseLearnedData(t.businessId, this.eraseReason_().trim())
      const total = Object.values(counts).reduce((sum, n) => sum + n, 0)
      this.eraseDone_.set(this.translation.translate('platform_erase_done').replace('{count}', String(total)))
      this.eraseReason_.set('')
      this.isEraseOpen_.set(false)
      if (this.isHistoryOpen_()) void this.loadHistory_()
    } catch (err) {
      this.eraseFailed_.set(true)
      this.logging.error({
        event: 'platform.erase_learned_failed',
        message: 'Erasing what was learned from a business failed',
        context: { businessId: t.businessId, err: String(err) }
      })
    } finally {
      this.isErasing_.set(false)
    }
  }

  protected cancel(): void {
    if (this.isSaving_()) return
    this.dialog.close(false)
  }

  protected async save(): Promise<void> {
    const t = this.dialog.current_()
    if (!t || this.isSaving_()) return
    this.tried_.set(true)
    if (this.reasonMissing_() || this.capInvalid_() || !this.hasChange_()) return
    this.isSaving_.set(true)
    this.reasonError_.set(null)
    try {
      await this.admin.updatePlatform(t.businessId, { ...this.body_(), reason: this.reason_().trim() })
      this.userMsg.onSetSuccessMsg(this.translation.translate('platform_fd_saved'))
      // Plan 646: the business the admin is working in shows its new modules at once, with no page reload.
      if (this.business.business_()?._id === t.businessId) this.business.reload()
      this.dialog.close(true)
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 400) {
        this.reasonError_.set('field_required')
      } else {
        this.logging.error({
          event: 'platform.business_update_failed',
          message: 'Saving the business modules and AI settings failed',
          context: { err: String(err) }
        })
        this.userMsg.onSetErrorMsg(this.translation.translate('save_failed'))
      }
    } finally {
      this.isSaving_.set(false)
    }
  }
}
