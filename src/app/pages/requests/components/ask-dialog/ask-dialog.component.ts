import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { ModalShellComponent } from 'src/app/shared/modal-shell/modal-shell.component'
import { waLink } from 'src/app/core/utils/wa-link.util'

export const ASK_NOTE_MAX = 300

/** Plan 552: "what is missing?" — one required note, plus the guest's call and WhatsApp links as a convenience. */
@Component({
  selector: 'app-ask-dialog',
  standalone: true,
  imports: [FormsModule, TranslatePipe, ModalShellComponent],
  templateUrl: './ask-dialog.component.html',
  styleUrl: './ask-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AskDialogComponent {
  readonly phone = input('')
  readonly saved = output<string>()
  readonly closed = output<void>()
  readonly dirtyChange = output<boolean>()

  protected readonly noteMax = ASK_NOTE_MAX
  protected readonly note_ = signal('')
  protected readonly touched_ = signal(false)
  protected readonly dirty_ = computed(() => this.note_().trim().length > 0)
  protected readonly wa_ = computed(() => waLink(this.phone()))

  protected onNote(value: string): void {
    this.note_.set(value)
    this.dirtyChange.emit(value.trim().length > 0)
  }

  protected onSave(): void {
    this.touched_.set(true)
    const note = this.note_().trim()
    if (!note) return
    this.dirtyChange.emit(false)
    this.saved.emit(note)
  }

  protected onClose(): void {
    this.dirtyChange.emit(false)
    this.closed.emit()
  }
}
