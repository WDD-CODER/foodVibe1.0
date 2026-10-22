import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { EVENT_STAGE_ORDER, stageLabelKey } from '@utils/event-stage-ui.util'
import { BusinessService } from '@services/business.service'
import { LoggingService } from '@services/logging.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import type { EventStage } from '@models/menu-event.model'

/**
 * Plan 477 — the owner's «שלבי אירוע שהצוות רואה» card: one toggle chip per event stage. Staff read only the
 * events in the ticked stages (plus the ones they created); the server enforces it. Each change saves at once.
 */
@Component({
  selector: 'app-staff-stages-manager',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe],
  templateUrl: './staff-stages-manager.component.html',
  styleUrl: './staff-stages-manager.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StaffStagesManagerComponent {
  // 1. INJECTED
  private readonly businessService = inject(BusinessService)
  private readonly userMsg = inject(UserMsgService)
  private readonly translation = inject(TranslationService)
  private readonly logging = inject(LoggingService)

  // 4. SIGNALS & CONSTANTS
  protected readonly stages = EVENT_STAGE_ORDER
  protected readonly stageLabelKey = stageLabelKey
  private readonly saving_ = signal(false)
  readonly saving = this.saving_.asReadonly()

  // 5. COMPUTED
  /** The stored list; a business that never chose sees every stage ticked (today's behaviour). */
  protected readonly checked = computed(
    () => new Set<EventStage>(this.businessService.business_()?.staffVisibleStages ?? EVENT_STAGE_ORDER)
  )

  // 6. METHODS — Update
  /** Sends the whole new list in pipeline order; a refused save flips the chip back and shows the message. */
  async onToggle(stage: EventStage, input: HTMLInputElement): Promise<void> {
    const current = this.checked()
    const next = this.stages.filter((s) => (s === stage ? input.checked : current.has(s)))
    this.saving_.set(true)
    try {
      await this.businessService.updateStaffVisibleStages(next)
    } catch (err: unknown) {
      input.checked = current.has(stage)
      this.logging.error({
        event: 'business.staff_stages.save_error',
        message: 'Failed to save the stages staff may see',
        context: { err: String(err) }
      })
      this.userMsg.onSetErrorMsg(this.translation.translate('staff_stages_save_error'))
    } finally {
      this.saving_.set(false)
    }
  }
}
