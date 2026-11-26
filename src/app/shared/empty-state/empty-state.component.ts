import { ChangeDetectionStrategy, Component, input, output } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { DisabledWhyDirective } from 'src/app/shared/tooltip/disabled-why.directive'

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe, DisabledWhyDirective],
  templateUrl: './empty-state.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmptyStateComponent {
  messageKey = input.required<string>()
  icon = input<string | null>(null)
  ctaLabelKey = input<string | null>(null)
  ctaDisabled = input<boolean>(false)
  /** Why the button cannot be used (translated); the button stays reachable and says it. `null` = no reason. */
  ctaDisabledWhy = input<string | null>(null)
  ctaClick = output<void>()
}
