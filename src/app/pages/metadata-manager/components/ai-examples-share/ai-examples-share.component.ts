import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { BusinessService } from '@services/business.service'
import { LoggingService } from '@services/logging.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'

/**
 * Plan 600 — the owner's «שיתוף דוגמאות AI» card: one toggle chip. When ticked, the platform admin may copy this
 * business's saved AI recipe examples, without the business name, into the pool every business's AI learns from.
 * Unticking deletes what was already shared (the server does it in the same request).
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
  private readonly userMsg = inject(UserMsgService)
  private readonly translation = inject(TranslationService)
  private readonly logging = inject(LoggingService)

  // 4. SIGNALS & CONSTANTS
  private readonly saving_ = signal(false)
  readonly saving = this.saving_.asReadonly()

  // 5. COMPUTED
  protected readonly checked = computed(() => this.businessService.business_()?.shareAiExamples === true)

  // 6. METHODS — Update
  /** Saves at once; a refused save flips the chip back and shows the message. */
  async onToggle(input: HTMLInputElement): Promise<void> {
    const before = this.checked()
    this.saving_.set(true)
    try {
      await this.businessService.updateShareAiExamples(input.checked)
    } catch (err: unknown) {
      input.checked = before
      this.logging.error({
        event: 'business.share_ai_examples.save_error',
        message: 'Failed to save the AI examples sharing choice',
        context: { err: String(err) }
      })
      this.userMsg.onSetErrorMsg(this.translation.translate('metadata_ai_share_error'))
    } finally {
      this.saving_.set(false)
    }
  }
}
