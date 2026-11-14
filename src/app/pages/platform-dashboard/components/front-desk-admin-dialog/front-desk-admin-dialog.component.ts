import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import { FormsModule } from '@angular/forms'
import { TranslatePipe } from '@pipes/translation-pipe.pipe'
import { ModalShellComponent } from 'src/app/shared/modal-shell/modal-shell.component'
import { FormFieldComponent } from 'src/app/shared/form-field/form-field.component'
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component'
import { PlatformAdminService, type FrontDeskAdminBody } from '@services/platform-admin.service'
import { LoggingService } from '@services/logging.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { FrontDeskAdminDialogService } from './front-desk-admin-dialog.service'

const STATUSES = ['draft', 'pilot', 'active', 'suspended'] as const
const REASON_MAX = 200

/** Plan 557: the platform admin sets one business's front desk status, assistant level and plan, with a reason. */
@Component({
  selector: 'app-front-desk-admin-dialog',
  standalone: true,
  imports: [FormsModule, TranslatePipe, ModalShellComponent, FormFieldComponent, CustomSelectComponent],
  templateUrl: './front-desk-admin-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FrontDeskAdminDialogComponent {
  private readonly dialog = inject(FrontDeskAdminDialogService)
  private readonly admin = inject(PlatformAdminService)
  private readonly logging = inject(LoggingService)
  private readonly translation = inject(TranslationService)
  private readonly userMsg = inject(UserMsgService)

  protected readonly target = this.dialog.current_
  protected readonly statusOptions = STATUSES.map((s) => ({ value: s, label: 'fd_status_' + s }))
  protected readonly levelOptions = [
    { value: '', label: 'platform_fd_plan_keep' },
    { value: '0', label: 'fd_assistant_level_0' },
    { value: '1', label: 'fd_assistant_level_1' }
  ]
  protected readonly planOptions = [
    { value: '', label: 'platform_fd_plan_keep' },
    { value: 'pilot', label: 'platform_fd_plan_pilot' },
    { value: 'basic', label: 'platform_fd_plan_basic' },
    { value: 'pro', label: 'platform_fd_plan_pro' }
  ]
  protected readonly reasonMax = REASON_MAX

  protected readonly status_ = signal<string>(this.dialog.current_()?.status ?? 'draft')
  protected readonly level_ = signal<string>('')
  protected readonly plan_ = signal<string>('')
  protected readonly reason_ = signal('')
  protected readonly isSaving_ = signal(false)
  protected readonly reasonError_ = signal<string | null>(null)
  protected readonly tried_ = signal(false)

  /** Only what differs from the stored status, and a level or plan the admin chose, is sent (the row does not carry the level). */
  private readonly body_ = computed<Omit<FrontDeskAdminBody, 'reason'>>(() => {
    const t = this.dialog.current_()
    const body: Omit<FrontDeskAdminBody, 'reason'> = {}
    if (t && this.status_() !== t.status) body.status = this.status_() as FrontDeskAdminBody['status']
    if (this.level_() !== '') body.assistantLevel = Number(this.level_()) as 0 | 1
    if (this.plan_()) body.plan = this.plan_() as FrontDeskAdminBody['plan']
    return body
  })
  protected readonly hasChange_ = computed(() => Object.keys(this.body_()).length > 0)
  protected readonly reasonMissing_ = computed(() => !this.reason_().trim())

  protected cancel(): void {
    this.dialog.close(false)
  }

  protected async save(): Promise<void> {
    const t = this.dialog.current_()
    if (!t || this.isSaving_()) return
    this.tried_.set(true)
    if (this.reasonMissing_() || !this.hasChange_()) return
    this.isSaving_.set(true)
    this.reasonError_.set(null)
    try {
      await this.admin.updateFrontDesk(t.businessId, { ...this.body_(), reason: this.reason_().trim() })
      this.userMsg.onSetSuccessMsg(this.translation.translate('platform_fd_saved'))
      this.dialog.close(true)
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 400) {
        this.reasonError_.set('field_required')
      } else {
        this.logging.error({
          event: 'platform.front_desk_failed',
          message: 'Saving the front desk state failed',
          context: { err: String(err) }
        })
        this.userMsg.onSetErrorMsg(this.translation.translate('save_failed'))
      }
    } finally {
      this.isSaving_.set(false)
    }
  }
}
