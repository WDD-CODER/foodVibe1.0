import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core'
import { DatePipe } from '@angular/common'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'
import { PlatformAdminService } from '@services/platform-admin.service'
import { UserMsgService } from '@services/user-msg.service'
import { LoggingService } from '@services/logging.service'
import { TranslationService } from '@services/translation.service'
import { formatPctInt } from 'src/app/core/engine/rounding'
import type { AiShotRow } from '@models/ai-shot.model'

/**
 * Plan 600: the platform admin sees the saved recipe AI examples of businesses that opted in («מועמדים»),
 * moves the good ones into the shared pool every business's AI learns from, and removes bad ones from it.
 */
@Component({
  selector: 'app-platform-ai-shots',
  standalone: true,
  imports: [DatePipe, TranslatePipe, EmptyStateComponent],
  templateUrl: './platform-ai-shots.component.html',
  styleUrl: './platform-ai-shots.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlatformAiShotsComponent implements OnInit {
  // 1. INJECTED
  private readonly platformAdmin = inject(PlatformAdminService)
  private readonly userMsg = inject(UserMsgService)
  private readonly logging = inject(LoggingService)
  private readonly translation = inject(TranslationService)

  // 4. SIGNALS & CONSTANTS
  protected readonly isLoading_ = signal(true)
  protected readonly candidates_ = signal<AiShotRow[]>([])
  protected readonly shared_ = signal<AiShotRow[]>([])

  // 6. METHODS
  async ngOnInit(): Promise<void> {
    await this.reload()
    this.isLoading_.set(false)
  }

  /** The kept share as a whole percent; «—» when the example has none. */
  protected keptLabel(row: AiShotRow): string {
    return row.keptRatio === null ? '—' : formatPctInt(row.keptRatio * 100)
  }

  protected async promote(row: AiShotRow): Promise<void> {
    await this.act('platform.ai_shot_promote_failed', () => this.platformAdmin.promoteAiShot(row._id))
  }

  protected async remove(row: AiShotRow): Promise<void> {
    await this.act('platform.ai_shot_remove_failed', () => this.platformAdmin.removeSharedAiShot(row._id))
  }

  /** Runs one change, then reloads both lists; a refusal shows the error and reloads too (the lists may have moved). */
  private async act(event: string, run: () => Promise<unknown>): Promise<void> {
    try {
      await run()
    } catch (err) {
      this.logging.error({ event, message: 'Changing the shared AI examples failed', context: { err: String(err) } })
      this.userMsg.onSetErrorMsg(this.translation.translate('platform_ai_shots_error'))
    }
    await this.reload()
  }

  private async reload(): Promise<void> {
    try {
      const report = await this.platformAdmin.getAiShots()
      this.candidates_.set(report.candidates)
      this.shared_.set(report.shared)
    } catch (err) {
      this.logging.error({
        event: 'platform.ai_shots_load_failed',
        message: 'Loading the AI examples failed',
        context: { err: String(err) }
      })
      this.userMsg.onSetErrorMsg(this.translation.translate('platform_ai_shots_error'))
    }
  }
}
