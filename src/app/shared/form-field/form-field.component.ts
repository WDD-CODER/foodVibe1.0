import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'

/**
 * One label + control + error slot for the entity forms (plan 455).
 * The control stays in the form's own template (project it with content), so `formControlName`,
 * `[class.c-input--invalid]` and `aria-invalid` stay on the control itself.
 */
@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './form-field.component.html',
  styleUrl: './form-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.form-field--full]': "layout() === 'full'",
    '[class.form-field--caps]': "labelStyle() === 'caps'"
  }
})
export class FormFieldComponent {
  /** Translation key of the label. */
  label = input.required<string>()
  /** Id of the projected control (links the label to it). */
  forId = input<string | null>(null)
  /** Translation key of the error to show under the control, or null. */
  error = input<string | null>(null)
  /** Optional translation key of a hint under the control. */
  hint = input<string | null>(null)
  /** `full` spans every column when the field sits in a grid. */
  layout = input<'default' | 'full'>('default')
  /** `caps` is the small upper-case label the product form uses. */
  labelStyle = input<'default' | 'caps'>('default')
}
