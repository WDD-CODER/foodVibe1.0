import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component'
import { FormFieldComponent } from 'src/app/shared/form-field/form-field.component'
import { ModalShellComponent } from 'src/app/shared/modal-shell/modal-shell.component'
import { ConversationDataService } from '@services/conversation-data.service'
import { TranslationService } from '@services/translation.service'

const ANSWER_MAX = 1200
const COUNTER_FROM = 1000

/**
 * Plan 682 (R-14): a member types the right answer to a wrong assistant message and says what was wrong; the server
 * drafts a knowledge item for the owner. Nothing is sent to the guest.
 */
@Component({
  selector: 'app-fix-answer-dialog',
  standalone: true,
  imports: [FormsModule, TranslatePipe, ModalShellComponent, FormFieldComponent, CustomSelectComponent],
  templateUrl: './fix-answer-dialog.component.html',
  styleUrl: './fix-answer-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FixAnswerDialogComponent {
  private readonly data = inject(ConversationDataService)
  private readonly translation = inject(TranslationService)

  readonly conversationId = input.required<string>()
  readonly messageId = input.required<string>()
  /** The wrong assistant message, quoted on top. */
  readonly quote = input('')
  readonly closed = output<void>()
  /** The draft was stored; `drafted` is false when the model was unavailable. */
  readonly saved = output<boolean>()

  protected readonly answerMax = ANSWER_MAX
  protected readonly issueOptions = [
    { value: 'wrong_info', label: 'ibx_fix_wrong_info' },
    { value: 'missing_info', label: 'ibx_fix_missing_info' },
    { value: 'outdated', label: 'ibx_fix_outdated' },
    { value: 'misunderstood', label: 'ibx_fix_misunderstood' },
    { value: 'other', label: 'ibx_fix_other' }
  ]
  protected readonly answer_ = signal('')
  protected readonly issue_ = signal('')
  protected readonly busy_ = signal(false)
  protected readonly failed_ = signal(false)

  protected readonly hasChanges_ = computed(() => this.answer_().trim().length > 0)
  protected readonly counter_ = computed(() =>
    this.answer_().length >= COUNTER_FROM ? `${this.answer_().length}/${ANSWER_MAX}` : null
  )
  protected readonly canSave_ = computed(() => {
    const n = this.answer_().trim().length
    return !this.busy_() && n >= 1 && n <= ANSWER_MAX && this.issue_() !== ''
  })
  protected readonly hint_ = computed(() => this.translation.translate('ibx_fix_issue_hint'))

  protected async save(): Promise<void> {
    if (!this.canSave_()) return
    this.busy_.set(true)
    this.failed_.set(false)
    const res = await this.data.fixAnswer(this.conversationId(), this.messageId(), this.answer_().trim(), this.issue_())
    this.busy_.set(false)
    if (res.ok) this.saved.emit(res.drafted)
    else this.failed_.set(true)
  }
}
