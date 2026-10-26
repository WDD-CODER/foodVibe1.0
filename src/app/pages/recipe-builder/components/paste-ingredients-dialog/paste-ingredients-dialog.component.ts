import { ChangeDetectionStrategy, Component, effect, input, output, signal, viewChild, ElementRef } from '@angular/core'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { TextareaAutoGrowDirective } from '@directives/textarea-auto-grow.directive'

@Component({
  selector: 'app-paste-ingredients-dialog',
  standalone: true,
  imports: [TranslatePipe, TextareaAutoGrowDirective],
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
  private readonly overlay_ = viewChild<ElementRef<HTMLElement>>('overlay')

  constructor() {
    // The dialog is rendered inside the recipe page's ingredients card, whose backdrop-filter would make the
    // fixed overlay cover only that card. In the browser top layer it covers the whole window instead.
    effect(() => {
      const el = this.overlay_()?.nativeElement
      if (el && !el.matches(':popover-open')) el.showPopover()
    })
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
