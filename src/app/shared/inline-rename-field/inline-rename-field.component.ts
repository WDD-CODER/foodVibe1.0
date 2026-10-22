import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  viewChild
} from '@angular/core'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'

/**
 * Plan 468 — one inline rename field with explicit Save and Cancel buttons. Enter saves, Escape
 * cancels, and leaving the field does nothing (on a phone, closing the keyboard counts as a blur,
 * which used to save by accident). The parent decides what saving means (confirm, server call).
 */
@Component({
  selector: 'app-inline-rename-field',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './inline-rename-field.component.html',
  styleUrl: './inline-rename-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InlineRenameFieldComponent {
  /** Text the field opens with (selected, so typing replaces it). */
  readonly value = input.required<string>()
  /** Dictionary key of the field's accessible name. */
  readonly ariaLabelKey = input('edit')

  /** The trimmed text, on Save or Enter. */
  readonly saved = output<string>()
  readonly cancelled = output<void>()

  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field')

  constructor() {
    afterNextRender(() => {
      const el = this.field().nativeElement
      el.focus()
      el.select()
    })
  }

  protected onSave(): void {
    this.saved.emit(this.field().nativeElement.value.trim())
  }

  protected onCancel(): void {
    this.cancelled.emit()
  }
}
