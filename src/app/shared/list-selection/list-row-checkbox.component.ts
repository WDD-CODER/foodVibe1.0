import { Component, input, output, ChangeDetectionStrategy } from '@angular/core'
import { DisabledWhyDirective } from 'src/app/shared/tooltip/disabled-why.directive'

@Component({
  selector: 'app-list-row-checkbox',
  standalone: true,
  imports: [DisabledWhyDirective],
  templateUrl: './list-row-checkbox.component.html',
  styleUrl: './list-row-checkbox.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ListRowCheckboxComponent {
  readonly checked = input<boolean>(false)
  readonly disabled = input<boolean>(false)
  /** Why the box cannot be ticked (translated). With a reason it is blocked and says why in a tooltip (plan 747). */
  readonly disabledWhy = input<string | null>(null)
  readonly toggle = output<void>()

  onCheckboxClick(event: Event): void {
    event.preventDefault()
    event.stopPropagation()
    if (this.disabled() || this.disabledWhy()) return
    this.toggle.emit()
  }
}
