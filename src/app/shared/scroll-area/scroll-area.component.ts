import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { ScrollIndicatorsDirective } from 'src/app/core/directives/scroll-indicators.directive'

/**
 * A block that scrolls vertically with no scrollbar and shows a small arrow at the top / bottom while there is
 * more to see (plan 742). Content is projected; `maxBlockSize` caps the height (empty = fills its parent).
 */
@Component({
  selector: 'app-scroll-area',
  standalone: true,
  imports: [LucideAngularModule, ScrollIndicatorsDirective],
  templateUrl: './scroll-area.component.html',
  styleUrl: './scroll-area.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScrollAreaComponent {
  readonly maxBlockSize = input<string>('')
}
