import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { BusinessService } from '@services/business.service'

/**
 * Plan 600 — the owner's «שיתוף דוגמאות AI» card. Plan 618: every business shares unless the platform admin marked
 * it private, so the chip is read-only — ticked unless `aiPrivate` is true — and the card calls no route.
 * Plan 620 turns it into the locked chip with its tooltip.
 */
@Component({
  selector: 'app-ai-examples-share',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe],
  templateUrl: './ai-examples-share.component.html',
  styleUrl: './ai-examples-share.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AiExamplesShareComponent {
  // 1. INJECTED
  private readonly businessService = inject(BusinessService)

  // 5. COMPUTED
  protected readonly checked = computed(() => this.businessService.business_()?.aiPrivate !== true)
}
