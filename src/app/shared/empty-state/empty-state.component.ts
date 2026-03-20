import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe],
  templateUrl: './empty-state.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  messageKey  = input.required<string>();
  icon        = input<string | null>(null);
  ctaLabelKey = input<string | null>(null);
  ctaDisabled = input<boolean>(false);
  ctaClick    = output<void>();
}
