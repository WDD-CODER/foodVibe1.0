import { Component, input } from '@angular/core';
import { ScrollIndicatorsDirective } from '../../core/directives/scroll-indicators.directive';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-floating-info-container',
  standalone: true,
  imports: [LucideAngularModule, ScrollIndicatorsDirective],
  templateUrl: './floating-info-container.component.html',
  styleUrl: './floating-info-container.component.scss',
})
export class FloatingInfoContainerComponent {
  /** 'vertical' = scrollable area with arrow indicators; 'none' = no scroll wrapper. */
  scrollAxis = input<'vertical' | 'none'>('vertical');
  /** Max height (px) for the scrollable area when scrollAxis is 'vertical'. */
  maxHeight = input<number>(240);
}
