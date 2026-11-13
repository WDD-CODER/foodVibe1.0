import { ChangeDetectionStrategy, Component, computed, output, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { ModalShellComponent } from 'src/app/shared/modal-shell/modal-shell.component'
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component'
import { DECLINE_REASONS, type DeclineReason } from '@models/request.model'

export const DECLINE_TEXT_MAX = 300

/** Plan 552: the decline reason (fixed list, no add option) and an optional text (required for `other`). */
@Component({
  selector: 'app-decline-dialog',
  standalone: true,
  imports: [FormsModule, TranslatePipe, ModalShellComponent, CustomSelectComponent],
  templateUrl: './decline-dialog.component.html',
  styleUrl: './decline-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeclineDialogComponent {
  readonly declined = output<{ reason: DeclineReason; text?: string }>()
  readonly closed = output<void>()
  readonly dirtyChange = output<boolean>()

  protected readonly textMax = DECLINE_TEXT_MAX
  protected readonly options = DECLINE_REASONS.map((r) => ({ value: r, label: `rq_reason_${r}` }))
  protected readonly reason_ = signal<DeclineReason | ''>('')
  protected readonly text_ = signal('')
  protected readonly touched_ = signal(false)
  protected readonly dirty_ = computed(() => this.reason_() !== '' || this.text_().trim().length > 0)
  protected readonly textMissing_ = computed(() => this.reason_() === 'other' && !this.text_().trim())

  protected onReason(value: string): void {
    this.reason_.set(value as DeclineReason)
    this.dirtyChange.emit(true)
  }

  protected onText(value: string): void {
    this.text_.set(value)
    this.dirtyChange.emit(true)
  }

  protected onSubmit(): void {
    this.touched_.set(true)
    const reason = this.reason_()
    if (!reason || this.textMissing_()) return
    const text = this.text_().trim()
    this.dirtyChange.emit(false)
    this.declined.emit(text ? { reason, text } : { reason })
  }

  protected onClose(): void {
    this.dirtyChange.emit(false)
    this.closed.emit()
  }
}
