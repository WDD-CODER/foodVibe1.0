import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import { FormsModule } from '@angular/forms'
import { MODULE_KEYS, type ModuleKey } from '@schemas/modules-pure'
import { TranslatePipe } from '@pipes/translation-pipe.pipe'
import { ModalShellComponent } from 'src/app/shared/modal-shell/modal-shell.component'
import { FormFieldComponent } from 'src/app/shared/form-field/form-field.component'
import { NumberBoxDirective } from '@directives/number-box.directive'
import { PlatformAdminService, type PlatformUpdateBody } from '@services/platform-admin.service'
import { LoggingService } from '@services/logging.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { PlatformBusinessDialogService } from './platform-business-dialog.service'

const REASON_MIN = 3
const REASON_MAX = 200

/** Plan 620: the platform admin sets one business's modules, monthly AI token cap and private mode, with a reason. */
@Component({
  selector: 'app-platform-business-dialog',
  standalone: true,
  imports: [FormsModule, TranslatePipe, ModalShellComponent, FormFieldComponent, NumberBoxDirective],
  templateUrl: './platform-business-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlatformBusinessDialogComponent {
  private readonly dialog = inject(PlatformBusinessDialogService)
  private readonly admin = inject(PlatformAdminService)
  private readonly logging = inject(LoggingService)
  private readonly translation = inject(TranslationService)
  private readonly userMsg = inject(UserMsgService)

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
