import { ChangeDetectionStrategy, Component, effect, input, output, signal, viewChild, ElementRef } from '@angular/core'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'

@Component({
  selector: 'app-paste-ingredients-dialog',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './paste-ingredients-dialog.component.html',
  styleUrl: './paste-ingredients-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PasteIngredientsDialogComponent {
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
      setTimeout(() => this.textarea_()?.nativeElement.focus(), 0)
    })
  }

  protected onSubmit(): void {
    const text = this.text_()
    if (!text.trim()) return
    this.submitted.emit(text)
  }

  protected onClose(): void {
    this.closed.emit()
  }
}
