import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { BusinessService } from '@services/business.service'

/**
 * Plan 600 — the owner's «שיתוף דוגמאות AI» card. Plan 618: every business shares unless the platform admin marked
 * it private, so the chip is read-only — ticked unless `aiPrivate` is true — and the card calls no route.
 * Plan 620: the chip is one locked span (shared / private) with the "contact FoodVibe" tooltip; nothing to edit.
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
  /** Plan 620: shared unless the platform admin marked the business private (shared while the business loads). */
  protected readonly stateKey_ = computed(() =>
    this.businessService.business_()?.aiPrivate === true ? 'metadata_ai_state_private' : 'metadata_ai_state_shared'
  )
}
