import { Component, input } from '@angular/core';
import { ScrollIndicatorsDirective } from '../../core/directives/scroll-indicators.directive';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-scrollable-dropdown',
  standalone: true,
  imports: [LucideAngularModule, ScrollIndicatorsDirective],
  templateUrl: './scrollable-dropdown.component.html',
  styleUrl: './scrollable-dropdown.component.scss'
})
export class ScrollableDropdownComponent {
  /** Max height in px for the scrollable list. Default 240. */
  maxHeight = input<number>(240);
}
