import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { BusinessService } from '@services/business.service'
import { TranslationService } from '@services/translation.service'

/**
 * Plan 600 — the owner's «שיתוף דוגמאות AI» card. Plans 618 and 620: every business shares unless the platform admin
 * marked it private, so the card shows one locked chip (shared / private) and calls no route.
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
  private readonly translation = inject(TranslationService)

  // 5. COMPUTED
  protected readonly stateKey_ = computed(() =>
    this.businessService.business_()?.aiPrivate === true ? 'metadata_ai_state_private' : 'metadata_ai_state_shared'
  )
  protected readonly tooltip_ = computed(() => this.translation.translate('metadata_ai_private_tooltip'))
  protected readonly label_ = computed(() => `${this.translation.translate(this.stateKey_())} — ${this.tooltip_()}`)
}
