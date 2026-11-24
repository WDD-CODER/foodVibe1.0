import { ChangeDetectionStrategy, Component, effect, input, output, signal, viewChild, ElementRef } from '@angular/core'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { ModalShellComponent } from 'src/app/shared/modal-shell/modal-shell.component'
import { TextareaAutoGrowDirective } from '@directives/textarea-auto-grow.directive'

@Component({
  selector: 'app-paste-ingredients-dialog',
  standalone: true,
  imports: [TranslatePipe, TextareaAutoGrowDirective, ModalShellComponent],
  templateUrl: './paste-ingredients-dialog.component.html',
  styleUrl: './paste-ingredients-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PasteIngredientsDialogComponent {
  /** Plan 502: true from the first click until the dialog is closed by its parent; a second click does nothing. */
  protected readonly isSaving_ = signal(false)
  // INPUTS
  open = input(false)

  // OUTPUTS
  submitted = output<string>()
  closed = output<void>()

  // SIGNALS
  protected readonly text_ = signal('')
  private readonly textarea_ = viewChild<ElementRef<HTMLTextAreaElement>>('pasteBox')

  constructor() {
    // Every open starts empty, with the cursor in the box so Ctrl+V works at once.
    effect(() => {
      if (!this.open()) return
      this.text_.set('')
      this.isSaving_.set(false)
      setTimeout(() => this.textarea_()?.nativeElement.focus(), 0)
    })
  }

  protected onSubmit(): void {
    const text = this.text_()
    if (!text.trim() || this.isSaving_()) return
    this.isSaving_.set(true)
    this.submitted.emit(text)
  }

  protected onClose(): void {
    this.closed.emit()
  }
}
