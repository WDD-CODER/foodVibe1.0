import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { FormFieldComponent } from 'src/app/shared/form-field/form-field.component'
import { BusinessService } from '@services/business.service'
import { LoggingService } from '@services/logging.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { NAME_MAX_LENGTH } from '@schemas/base.schema'

/** The owner's business-name field with its own save button (plan 472). */
@Component({
  selector: 'app-business-name-form',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, FormFieldComponent],
  templateUrl: './business-name-form.component.html',
  styleUrl: './business-name-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BusinessNameFormComponent {
  private readonly fb = inject(NonNullableFormBuilder)
  private readonly businessService = inject(BusinessService)
  private readonly userMsg = inject(UserMsgService)
  private readonly translation = inject(TranslationService)
  private readonly logging = inject(LoggingService)

  protected readonly maxLength = NAME_MAX_LENGTH
  readonly form = this.fb.group({
    name: this.fb.control('', [Validators.required, Validators.maxLength(NAME_MAX_LENGTH)])
  })
  protected readonly isSaving_ = signal(false)
  private readonly value_ = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() })

  private readonly stored_ = computed(() => this.businessService.business_()?.name ?? '')
  private readonly trimmed_ = computed(() => this.value_().name?.trim() ?? '')

  /** Error key shown under the box, or null. */
  protected readonly errorKey_ = computed<string | null>(() => {
    this.value_()
    const control = this.form.controls.name
    if (!control.dirty && !control.touched) return null
    if (!this.trimmed_()) return 'business_name_required'
    if (this.trimmed_().length > NAME_MAX_LENGTH) return 'business_name_too_long'
    return null
  })

  /** Save is allowed only for a non-empty, in-range name that differs from the stored one. */
  protected readonly canSave = computed(() => {
    const name = this.trimmed_()
    return !this.isSaving_() && !!name && name.length <= NAME_MAX_LENGTH && name !== this.stored_()
  })

  constructor() {
    // Show the stored name once the business is loaded, unless the owner has already started typing.
    effect(() => {
      const stored = this.stored_()
      untracked(() => {
        if (!this.form.dirty) this.form.reset({ name: stored })
      })
    })
  }

  async save(): Promise<void> {
    if (!this.canSave()) return
    this.isSaving_.set(true)
    try {
      await this.businessService.updateName(this.trimmed_())
      this.form.reset({ name: this.stored_() })
      this.userMsg.onSetSuccessMsg(this.translation.translate('business_name_saved'))
    } catch (err) {
      const status = (err as { status?: number }).status
      // A 403 already got the "no permission" toast from the interceptor.
      if (status === 400) {
        this.logging.warn('Business name refused as invalid', { status })
        this.userMsg.onSetErrorMsg(this.translation.translate('settings_invalid'))
      } else if (status !== 403) {
        this.logging.error('Business name could not be saved', { status })
        this.userMsg.onSetErrorMsg(this.translation.translate('save_failed'))
      }
    } finally {
      this.isSaving_.set(false)
    }
  }
}
