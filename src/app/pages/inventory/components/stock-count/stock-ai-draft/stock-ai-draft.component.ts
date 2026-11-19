import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { LoaderComponent } from 'src/app/shared/loader/loader.component'
import { VoiceNoteComponent, type VoiceNoteSend } from 'src/app/shared/voice-note/voice-note.component'
import { aiCapErrorKey } from 'src/app/core/utils/ai-error.util'
import { GeminiService } from '@services/gemini.service'
import { LoggingService } from '@services/logging.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import type { StockExtractResponse } from '@schemas/ai-stock-extract.schema'

/** A suggestion for a row the person already counted differently: both amounts are shown as text. */
export interface StockAiConflict {
  productId: string
  name: string
  onSheet: string
  suggested: string
}

/** A part of the count the server could not place on a product: the words and the amount, as text. */
export interface StockAiUnmatched {
  id: number
  text: string
}

/** What the sheet gets when a count was read: the server's answer and where the words came from. */
export interface StockAiExtracted {
  answer: StockExtractResponse
  source: 'voice' | 'text'
}

/**
 * Plan 637: "count by voice or text" on the count sheet. Reads the words through the shared recorder (`app-voice-note`,
 * purpose `stock`), asks the server for a suggestion and hands it to the sheet; the sheet applies it by its own rules.
 * It also lists what was not recognised and what clashes with a row already counted.
 */
@Component({
  selector: 'app-stock-ai-draft',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe, LoaderComponent, VoiceNoteComponent],
  templateUrl: './stock-ai-draft.component.html',
  styleUrl: './stock-ai-draft.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StockAiDraftComponent {
  private readonly gemini_ = inject(GeminiService)
  private readonly userMsg_ = inject(UserMsgService)
  private readonly translation_ = inject(TranslationService)
  private readonly logging_ = inject(LoggingService)

  readonly conflicts = input<StockAiConflict[]>([])
  readonly unmatched = input<StockAiUnmatched[]>([])
  readonly disabled = input(false)
  readonly extracted = output<StockAiExtracted>()
  readonly busyChange = output<boolean>()
  readonly replace = output<string>()
  readonly keep = output<string>()
  readonly dismiss = output<number>()

  protected readonly open_ = signal(false)
  protected readonly busy_ = signal(false)
  protected readonly text_ = signal('')
  protected readonly switchLabel_ = signal('')

  protected toggle_(): void {
    this.open_.update((v) => !v)
  }

  protected async extract_(sent: VoiceNoteSend): Promise<void> {
    if (this.busy_()) return
    this.setBusy_(true)
    this.switchLabel_.set('')
    try {
      const answer = await this.gemini_.extractStockCount(sent.text, sent.fileId ?? undefined)
      this.text_.set('')
      this.open_.set(false)
      this.extracted.emit({ answer, source: sent.source })
    } catch (err) {
      this.onError_(err)
    } finally {
      this.setBusy_(false)
    }
  }

  /** The user's explicit switch to the model the server offered; they send again themselves. */
  protected switchModel_(): void {
    this.gemini_.acceptModelSwitch()
    this.switchLabel_.set('')
  }

  private setBusy_(value: boolean): void {
    this.busy_.set(value)
    this.busyChange.emit(value)
  }

  private onError_(err: unknown): void {
    const status = err instanceof HttpErrorResponse ? err.status : 0
    const capKey = aiCapErrorKey(err)
    if (capKey) {
      this.userMsg_.onSetErrorMsg(this.translation_.translate(capKey))
      return
    }
    if (this.gemini_.offerModelSwitch(err)) {
      const offer = this.gemini_.modelSwitch()
      if (offer) {
        this.switchLabel_.set(this.translation_.translate('ai_model_switch_to').replace('{model}', offer.to))
      }
      this.userMsg_.onSetErrorMsg(this.translation_.translate('ai_model_exhausted_prompt'))
      return
    }
    if (status === 413) {
      this.userMsg_.onSetErrorMsg(this.translation_.translate('stk_ai_too_many_products'))
      return
    }
    this.logging_.error({
      event: 'stock.extract.failed',
      message: 'Stock count extract failed',
      context: { status: String(status) }
    })
    this.userMsg_.onSetErrorMsg(this.translation_.translate('stk_ai_failed'))
  }
}
