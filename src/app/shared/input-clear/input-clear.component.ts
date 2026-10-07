import { ChangeDetectionStrategy, Component, input, output } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'

/**
 * One-tap clear (X) for a search field (plan 363). Place it right after the `<input>` inside
 * a `.c-input-wrapper`. Always rendered so it can fade/scale out; keeps a fixed slot so the
 * input never jumps. `mousedown` is prevented so tapping it never blurs the field — the host
 * keeps focus and any results panel bound to focus/blur stays consistent.
 */
@Component({
  selector: 'app-input-clear',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe],
  templateUrl: './input-clear.component.html',
  styleUrl: './input-clear.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InputClearComponent {
  readonly visible = input(false)
  readonly clear = output<void>()

  protected onClick(): void {
    if (this.visible()) this.clear.emit()
  }
}
